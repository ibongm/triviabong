import { useEffect, useRef, useState } from 'react';
import { sanitizeDisplayName } from '../utils/publicProfile';
import { evaluateAchievements, mergeUnlockedAchievements } from '../utils/achievements';
import { ONE_VS_ONE_WIN_XP, ONE_VS_ONE_WIN_COINS } from '../constants/gameBalance';
import { computeLevelFromXp, getCoinsForLevelUp } from '../utils/leveling';
import { filterOnlinePlayers } from '../components/OnlinePlayersList';
import { subscribeToOnlinePlayers } from '../services/firebase';
import {
    sendMatchInvite,
    subscribeToIncomingInvites,
    subscribeToSentInvite,
    subscribeToMatchByInviteId,
    createMatch,
    writeMatchHistoryEntry,
    expireMatchInvite,
    INVITE_TIMEOUT_MS,
} from '../services/matches';

// Plan B: 1v1 live invite state, extracted out of App.jsx. Deliberately
// takes setGlobalStats directly (App.jsx's raw setState, mirroring
// useGameRound's "lift the state, hand back setters" style used elsewhere
// in this codebase) rather than an onWin callback - the win-path stat
// update is a self-contained functional updater with no other App.jsx
// dependency, so a callback indirection would add nothing.
export function useOneVsOne(currentUser, setGlobalStats, recordMatchComplete, gameState) {
    // The match currently being played, if any - non-null switches the main
    // render area over to <MatchView>, a fully separate tree from the normal
    // gameState machine (see Plan B - a new top-level mode, not woven into
    // the existing single-player state machine).
    const [activeMatchId, setActiveMatchId] = useState(null);

    // The single onSnapshot subscription for the whole `presence` collection,
    // shared by both the lobby's "1v1 Dvoboj" CTA subtitle (which only needs
    // a count) and OnlinePlayersList (which needs the full list, passed down
    // as a prop). Scoped strictly to Lobby mode (gameState === 'LOBBY' and
    // !activeMatchId) so that active quiz rounds and 1v1 matches don't incur
    // fan-out read costs for online presence updates.
    const [onlinePlayers, setOnlinePlayers] = useState(null);
    // Count is derived inside the snapshot callback (an event handler, not
    // render) rather than from `onlinePlayers` at render time, specifically
    // so `Date.now()` isn't called during render (React's purity rule).
    const [onlinePlayersCount, setOnlinePlayersCount] = useState(0);
    useEffect(() => {
        if (!currentUser?.uid || gameState !== 'LOBBY' || activeMatchId) return undefined;
        const unsubscribe = subscribeToOnlinePlayers((players) => {
            setOnlinePlayers(players);
            setOnlinePlayersCount(filterOnlinePlayers(players, currentUser.uid, Date.now()).length);
        });
        return () => {
            unsubscribe();
            setOnlinePlayers(null);
            setOnlinePlayersCount(0);
        };
    }, [currentUser?.uid, gameState, activeMatchId]);

    // Pending invites addressed to ME (shows MatchInviteModal for the oldest).
    const [incomingInvites, setIncomingInvites] = useState([]);
    // The invite I just SENT, while waiting for the other player to respond -
    // only the sender needs this (to detect 'accepted' and create the match).
    const [sentInvite, setSentInvite] = useState(null);
    // Guards against creating the match doc twice if subscribeToSentInvite
    // fires more than once for the same accepted invite (e.g. a reconnect).
    const matchCreatedForInviteRef = useRef(null);

    useEffect(() => {
        if (!currentUser?.uid) return;
        const unsubscribe = subscribeToIncomingInvites(currentUser.uid, setIncomingInvites);
        // On sign-out (or switching accounts), drop whatever the previous
        // subscription had loaded rather than leaving a stale invite visible -
        // done in the cleanup, not the effect body, since a cleanup function is
        // exactly where an external subscription is meant to be torn down.
        return () => {
            unsubscribe();
            setIncomingInvites([]);
        };
    }, [currentUser?.uid]);

    // Sender side: watch the invite I sent. Once it's accepted, create the
    // match (only the host/player1 may, per firestore.rules) and switch into
    // it. If declined/expired, just clear it so the "waiting" UI clears too.
    useEffect(() => {
        if (!sentInvite?.id) return;
        const unsubscribe = subscribeToSentInvite(sentInvite.id, async (invite) => {
            if (!invite) return;
            if (invite.status === 'accepted' && matchCreatedForInviteRef.current !== invite.id) {
                let matchId = await createMatch(invite);
                if (!matchId) {
                    await new Promise(r => setTimeout(r, 500));
                    matchId = await createMatch(invite);
                }
                if (matchId) {
                    matchCreatedForInviteRef.current = invite.id;
                    setActiveMatchId(matchId);
                    setSentInvite(null);
                } else {
                    console.error('Failed to create match for accepted invite:', invite);
                }
            } else if (invite.status === 'declined' || invite.status === 'expired') {
                setSentInvite(null);
            }
        });
        // Client-detected timeout (see expireMatchInvite's own comment - there's
        // no server to enforce this, matches.js's INVITE_TIMEOUT_MS is purely a
        // convention both the invite doc's expiresAt and this timer agree on).
        // Only the sender's own client ever calls this for its own invite.
        const timeoutId = setTimeout(() => {
            expireMatchInvite(sentInvite.id);
            setSentInvite(null);
        }, INVITE_TIMEOUT_MS);
        return () => {
            unsubscribe();
            clearTimeout(timeoutId);
        };
    }, [sentInvite?.id]);

    // Invitee side: after I accept, wait for the host's client to create the
    // match doc referencing the invite I just accepted (see MatchInviteModal).
    const [acceptedInviteId, setAcceptedInviteId] = useState(null);
    useEffect(() => {
        if (!acceptedInviteId || !currentUser?.uid) return;
        const unsubscribe = subscribeToMatchByInviteId(acceptedInviteId, currentUser.uid, (match) => {
            if (match) {
                setActiveMatchId(match.id);
                setAcceptedInviteId(null);
            }
        });
        return unsubscribe;
    }, [acceptedInviteId, currentUser?.uid]);

    const handleSendInvite = async (toUid, category, toDisplayName) => {
        if (!currentUser?.uid) return;
        const inviteId = await sendMatchInvite(currentUser.uid, sanitizeDisplayName(currentUser), toUid, category);
        if (inviteId) {
            setSentInvite({ id: inviteId, fromUid: currentUser.uid, toUid, toDisplayName, category });
            matchCreatedForInviteRef.current = null;
        }
    };

    const cancelSentInvite = () => {
        if (!sentInvite?.id) return;
        expireMatchInvite(sentInvite.id);
        setSentInvite(null);
    };

    const handleMatchOver = ({ result, myScore, opponentScore, opponentUid, opponentDisplayName, category, forfeited, accuracy }) => {
        if (!currentUser?.uid) return;
        writeMatchHistoryEntry(currentUser.uid, activeMatchId, {
            opponentUid, opponentDisplayName, result, myScore, opponentScore, category, forfeited: forfeited || false,
        });
        if (result === 'win') {
            setGlobalStats(prev => {
                const newXp = (prev.xp || 0) + ONE_VS_ONE_WIN_XP;
                const prevLevel = prev.level || 1;
                const newLevel = Math.max(prevLevel, computeLevelFromXp(newXp));
                const leveledUp = newLevel > prevLevel;
                const levelCoins = leveledUp ? getCoinsForLevelUp(newLevel) : 0;

                const next = {
                    ...prev,
                    total1v1Wins: (prev.total1v1Wins || 0) + 1,
                    xp: newXp,
                    level: newLevel,
                    coins: (prev.coins || 0) + ONE_VS_ONE_WIN_COINS + levelCoins,
                };
                // App.jsx's level-up toast picks this up via its
                // globalStats.level watcher - no separate event needed here,
                // unlike gameLogic.js's reducer shape.
                const newlyUnlocked = evaluateAchievements(next, {});
                next.unlockedAchievements = mergeUnlockedAchievements(next, newlyUnlocked);
                return next;
            });
        }
        recordMatchComplete?.({ won: result === 'win', accuracy });
    };

    return {
        onlinePlayers,
        onlinePlayersCount,
        incomingInvites,
        sentInvite,
        activeMatchId,
        setActiveMatchId,
        acceptedInviteId,
        setAcceptedInviteId,
        handleSendInvite,
        cancelSentInvite,
        handleMatchOver,
    };
}
