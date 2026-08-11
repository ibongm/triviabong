// src/services/matches.js - Plan B (1v1 live invite). Parallel to
// services/firebase.js rather than folded into it, since this is a
// self-contained subsystem (invites + matches + match history) with its
// own naming conventions (matchId/inviteId) distinct from the rest of the
// app's Firestore access.
import {
    doc,
    setDoc,
    getDoc,
    getDocs,
    addDoc,
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    updateDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { pickMatchQuestionIds } from '../utils/matchQuestions';

// Exported so App.jsx's sender-side waiting UI can drive its own countdown/
// auto-expiry timer off the exact same value used to compute expiresAt here.
export const INVITE_TIMEOUT_MS = 60000;

/**
 * Sends a 1v1 invite from the caller to toUid for the given category.
 * Returns the new invite's id, or null on failure.
 */
export const sendMatchInvite = async (fromUid, fromDisplayName, toUid, category) => {
    if (!fromUid || !toUid || fromUid === toUid) return null;
    try {
        const inviteRef = await addDoc(collection(db, 'matchInvites'), {
            fromUid,
            fromDisplayName: (fromDisplayName || 'Igrač').slice(0, 20),
            toUid,
            category,
            status: 'pending',
            createdAt: serverTimestamp(),
            expiresAt: new Date(Date.now() + INVITE_TIMEOUT_MS),
        });
        return inviteRef.id;
    } catch (error) {
        console.error('Error sending match invite:', error);
        return null;
    }
};

/**
 * Live-subscribes to pending invites addressed to uid (the "someone wants
 * to play" modal trigger). Returns the unsubscribe function.
 */
export const subscribeToIncomingInvites = (uid, callback) => {
    const invitesRef = collection(db, 'matchInvites');
    const q = query(invitesRef, where('toUid', '==', uid), where('status', '==', 'pending'));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
        console.error('Error subscribing to incoming invites:', error);
    });
};

/**
 * Live-subscribes to ONE invite the caller sent, so the sender's client can
 * detect an accept (and create the match) or a decline, without polling.
 */
export const subscribeToSentInvite = (inviteId, callback) => {
    return onSnapshot(doc(db, 'matchInvites', inviteId), (snap) => {
        callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    }, (error) => {
        console.error('Error subscribing to sent invite:', error);
    });
};

export const acceptMatchInvite = async (inviteId) => {
    try {
        await updateDoc(doc(db, 'matchInvites', inviteId), { status: 'accepted' });
        return true;
    } catch (error) {
        console.error('Error accepting match invite:', error);
        return false;
    }
};

export const declineMatchInvite = async (inviteId) => {
    try {
        await updateDoc(doc(db, 'matchInvites', inviteId), { status: 'declined' });
        return true;
    } catch (error) {
        console.error('Error declining match invite:', error);
        return false;
    }
};

// Called by the SENDER's client only (see firestore.rules - only fromUid
// may mark their own invite expired) after INVITE_TIMEOUT_MS with no
// response. There's no server to enforce the timeout itself (see Plan B
// §6) - this is a client-detected, client-written expiry.
export const expireMatchInvite = async (inviteId) => {
    try {
        await updateDoc(doc(db, 'matchInvites', inviteId), { status: 'expired' });
        return true;
    } catch (error) {
        console.error('Error expiring match invite:', error);
        return false;
    }
};

/**
 * Creates the match doc once an invite has been accepted - called by the
 * HOST (fromUid/player1) only, since firestore.rules requires the creator
 * to be player1Uid and validates the referenced invite server-side. Picks
 * the 11 question ids (10 + sudden-death reserve) once here so both
 * clients see the identical set - see utils/matchQuestions.js.
 */
export const createMatch = async (invite) => {
    if (!invite?.id) return null;
    try {
        const questionIds = pickMatchQuestionIds(invite.category);
        // matchInvites only stores fromDisplayName (see firestore.rules) -
        // look the invitee's name up from the public, canonical
        // publicProfiles/{uid} rather than adding it to the invite schema.
        let player2DisplayName = 'Igrač';
        try {
            const toProfileSnap = await getDoc(doc(db, 'publicProfiles', invite.toUid));
            if (toProfileSnap.exists()) {
                player2DisplayName = toProfileSnap.data().displayName || 'Igrač';
            }
        } catch {
            // Safe fallback if public profile snapshot is not available yet
        }
        const matchRef = await addDoc(collection(db, 'matches'), {
            player1Uid: invite.fromUid,
            player2Uid: invite.toUid,
            player1DisplayName: invite.fromDisplayName,
            player2DisplayName: (player2DisplayName || 'Igrač').slice(0, 20),
            category: invite.category,
            questionIds,
            status: 'waiting_ready',
            currentQuestionIndex: 0,
            questionStartedAt: null,
            player1Answer: null,
            player2Answer: null,
            player1Score: 0,
            player2Score: 0,
            player1Correct: 0,
            player2Correct: 0,
            countdownStartedAt: null,
            lastActivityAt: serverTimestamp(),
            player1HeartbeatAt: serverTimestamp(),
            player2HeartbeatAt: serverTimestamp(),
            winnerUid: null,
            createdAt: serverTimestamp(),
            inviteId: invite.id,
        });
        return matchRef.id;
    } catch (error) {
        console.error('Error creating match:', error);
        return null;
    }
};

// Used by the INVITEE's client only: after accepting, they don't create the
// match themselves (only the host/player1 does, per firestore.rules), so
// they wait for one to appear referencing the invite they just accepted.
// Filters on BOTH inviteId AND player2Uid - not redundant: firestore.rules'
// matches/{matchId} read check is `player1Uid == me || player2Uid == me`,
// and Firestore's list-query rule evaluation rejects the ENTIRE query with
// "Missing or insufficient permissions" if the query isn't constrained on
// at least one field the rule actually checks, even when every document
// that could ever match would obviously pass the rule (verified live
// against production - filtering on inviteId alone fails, adding
// player2Uid fixes it).
export const subscribeToMatchByInviteId = (inviteId, myUid, callback) => {
    const matchesRef = collection(db, 'matches');
    const q = query(matchesRef, where('inviteId', '==', inviteId), where('player2Uid', '==', myUid));
    return onSnapshot(q, (snapshot) => {
        const first = snapshot.docs[0];
        callback(first ? { id: first.id, ...first.data() } : null);
    }, (error) => {
        console.error('Error subscribing to match by invite id:', error);
    });
};

export const subscribeToMatch = (matchId, callback) => {
    return onSnapshot(doc(db, 'matches', matchId), (snap) => {
        callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    }, (error) => {
        console.error('Error subscribing to match:', error);
    });
};

export const getMatch = async (matchId) => {
    try {
        const snap = await getDoc(doc(db, 'matches', matchId));
        return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch (error) {
        console.error('Error fetching match:', error);
        return null;
    }
};

// First client whose Spreman click reaches Firestore "wins" this transition
// (firestore.rules only allows waiting_ready -> countdown, never a re-set) -
// same first-write-wins pattern as setMatchQuestionStarted below, so both
// players' 5s pre-match countdowns anchor to the same countdownStartedAt
// server timestamp instead of each client's own click time.
export const setMatchCountdownStarted = async (matchId) => {
    try {
        await updateDoc(doc(db, 'matches', matchId), {
            status: 'countdown',
            countdownStartedAt: serverTimestamp(),
            lastActivityAt: serverTimestamp(),
        });
    } catch {
        // Expected/benign if the opponent's client already made this
        // transition first.
    }
};

export const startMatch = async (matchId) => {
    try {
        await updateDoc(doc(db, 'matches', matchId), {
            status: 'question_active',
            lastActivityAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error starting match:', error);
    }
};

// First client to call this "wins" the write (firestore.rules only allows
// null -> set, never an overwrite) - see Plan B §6 on this being a
// deliberate, rules-resolved race rather than a server-arbitrated one.
export const setMatchQuestionStarted = async (matchId) => {
    try {
        await updateDoc(doc(db, 'matches', matchId), {
            questionStartedAt: serverTimestamp(),
            lastActivityAt: serverTimestamp(),
        });
    } catch {
        // Expected/benign in the common case: the opponent's client won the
        // race and already set it - not a real failure.
    }
};

// Submits the answer AND (when correct) the updated running score/correct-
// count in ONE atomic write - score/correctCount are optional, passed only
// when the answer was correct. This MUST be a single write, not two
// sequential ones: reveal only waits on both players' Answer fields being
// set, so a separate later score write can race behind a reveal/finish
// transition and get rejected once the match goes terminal, silently
// leaving a stale score for that question - caught live via
// two-player-match-check.mjs's simultaneous-play run (two browser contexts
// disagreed on the final score until this was fixed). Self-reported score
// is the same trust model as the existing solo leaderboard (client-
// computed, rules only bound the damage - see firestore.rules' comment).
export const submitMatchAnswer = async (matchId, isPlayer1, optionIndex, scoreUpdate = null) => {
    try {
        const payload = {
            [isPlayer1 ? 'player1Answer' : 'player2Answer']: {
                optionIndex,
                answeredAt: serverTimestamp(),
            },
            lastActivityAt: serverTimestamp(),
        };
        if (scoreUpdate) {
            payload[isPlayer1 ? 'player1Score' : 'player2Score'] = scoreUpdate.score;
            payload[isPlayer1 ? 'player1Correct' : 'player2Correct'] = scoreUpdate.correctCount;
        }
        await updateDoc(doc(db, 'matches', matchId), payload);
        return true;
    } catch {
        // Expected/benign in the same way as revealMatchQuestion/
        // advanceMatchQuestion/finishMatch below: if the opponent's answer
        // already ended the question (or the whole match) by the time this
        // write reaches Firestore, rules correctly reject it rather than
        // let a stale answer land - not a real failure, just this client
        // losing an inherent, unavoidable race against a concurrently
        // active opponent. Confirmed benign via two-player-match-check.mjs.
        return false;
    }
};

export const revealMatchQuestion = async (matchId) => {
    try {
        await updateDoc(doc(db, 'matches', matchId), {
            status: 'reveal',
            lastActivityAt: serverTimestamp(),
        });
    } catch {
        // Benign if the opponent's client already made this transition.
    }
};

export const advanceMatchQuestion = async (matchId, nextIndex) => {
    try {
        await updateDoc(doc(db, 'matches', matchId), {
            status: 'question_active',
            currentQuestionIndex: nextIndex,
            questionStartedAt: null,
            player1Answer: null,
            player2Answer: null,
            lastActivityAt: serverTimestamp(),
        });
    } catch {
        // Benign if the opponent's client already made this transition.
    }
};

export const finishMatch = async (matchId, winnerUid) => {
    try {
        await updateDoc(doc(db, 'matches', matchId), {
            status: 'match_over',
            winnerUid,
            lastActivityAt: serverTimestamp(),
        });
    } catch {
        // Benign if the opponent's client already made this transition.
    }
};

// winnerUid must be the OPPONENT's uid, never the caller's own - enforced
// both here and (authoritatively) by firestore.rules. reason distinguishes
// a deliberate quit ('manual', the "Napusti dvoboj" button) from a stale-
// heartbeat auto-forfeit ('timeout'), so the surviving player's screen can
// show different copy instead of identical text for both cases.
export const forfeitMatch = async (matchId, opponentUid, reason = 'manual') => {
    try {
        await updateDoc(doc(db, 'matches', matchId), {
            status: 'forfeited',
            winnerUid: opponentUid,
            forfeitReason: reason,
            lastActivityAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error forfeiting match:', error);
    }
};

// Refreshes ONLY the caller's own per-player heartbeat field (see
// firestore.rules - each participant may only ever touch their own). This
// is what the opponent's client actually reads for forfeit detection -
// see the general lastActivityAt heartbeat's comment for why a shared
// field alone can't be used for that.
export const heartbeatMatch = async (matchId, isPlayer1) => {
    try {
        await updateDoc(doc(db, 'matches', matchId), {
            [isPlayer1 ? 'player1HeartbeatAt' : 'player2HeartbeatAt']: serverTimestamp(),
        });
    } catch {
        // Non-critical - a missed heartbeat just risks a false-positive
        // forfeit read by the opponent, not a broken match.
    }
};

/**
 * Writes the caller's own match-history entry (see firestore.rules -
 * owner-only, immutable). Called by BOTH clients independently at
 * match_over, each writing their own perspective (their score first,
 * opponent's second) rather than one shared doc.
 */
export const writeMatchHistoryEntry = async (uid, matchId, entry) => {
    if (!uid) return;
    try {
        await setDoc(doc(db, 'matchHistory', uid, 'entries', matchId), {
            ...entry,
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error writing match history entry:', error);
    }
};

/**
 * Fetches the caller's own past 1v1 results, most recent first (owner-only
 * read - see firestore.rules). Used by MatchHistoryList inside StatsModal.
 */
export const getMatchHistory = async (uid, limitN = 20) => {
    if (!uid) return [];
    try {
        const entriesRef = collection(db, 'matchHistory', uid, 'entries');
        const q = query(entriesRef, orderBy('createdAt', 'desc'), limit(limitN));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
        console.error('Error fetching match history:', error);
        return [];
    }
};
