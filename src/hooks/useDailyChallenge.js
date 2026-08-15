import { useEffect, useRef, useState } from 'react';
import { getDailyAttemptStatus, getDailyMeta, getDailyLeaderboard } from '../services/firebase';
import { getZagrebDateString } from '../utils/achievements';
import { DAILY_CHALLENGE_TOP3_COINS } from '../constants/gameBalance';

// Daily Challenge state/effects, extracted out of App.jsx. Deliberately
// does NOT own startDailyChallengeAttempt/submitDaily/launchDailyChallengeRound
// or the round-start/save-score orchestration that reaches into them - those
// stay in App.jsx (see its own comments) since they're shared crossroads
// functions (resetRoundState, saveScore) that also serve the non-daily path,
// not daily-only state. This hook only owns the state itself and the
// straightforward, self-contained effects that keep it in sync; App.jsx
// still calls the returned setters directly from those shared functions -
// same "lift state, hand back setters" style as useGameRound/useOneVsOne.
export function useDailyChallenge(currentUser, gameState) {
    // dailyChallengeMode gates the shared PLAYING/GAMEOVER/VICTORY render
    // blocks and save-score effect toward the daily submission path instead
    // of the normal per-category one (selectedCategory stays null throughout
    // a daily round). One free attempt per Zagreb calendar day -
    // dailyDateKey is captured at round start and carried through to
    // submitDailyScore at round end. dailyAttemptStatus powers the lobby's
    // "already played today" state; dailySubmitResult is the post-round rank.
    const [dailyChallengeMode, setDailyChallengeMode] = useState(false);
    const [dailyDateKey, setDailyDateKey] = useState(null);
    const [dailyAttemptStatus, setDailyAttemptStatus] = useState(null);
    const [dailySubmitResult, setDailySubmitResult] = useState(null);
    const [dailyLeaderboard, setDailyLeaderboard] = useState([]);
    // Separate from jokerMessage/showJokerMessage - that one only renders
    // inside the PLAYING screen, but a blocked daily attempt (cap reached,
    // insufficient coins) is discovered from the LOBBY, before a round starts.
    const [dailyLobbyMessage, setDailyLobbyMessage] = useState(null);
    // "You won yesterday's Daily Challenge" banner - checked once per login
    // against dailyMeta/{yesterday}, which only api/daily-challenge-payout.js
    // (Admin SDK) ever writes. Dismissal is tracked in localStorage (keyed by
    // date+uid) rather than any Firestore write, since it's purely cosmetic -
    // no server needs to know a player has seen their own win announcement.
    const [dailyWinAnnouncement, setDailyWinAnnouncement] = useState(null);
    const dailyLobbyMessageTimer = useRef(null);
    const showDailyLobbyMessage = (text) => {
        clearTimeout(dailyLobbyMessageTimer.current);
        setDailyLobbyMessage(text);
        dailyLobbyMessageTimer.current = setTimeout(() => setDailyLobbyMessage(null), 3000);
    };
    useEffect(() => () => clearTimeout(dailyLobbyMessageTimer.current), []);

    // Refreshes the lobby's Daily Challenge card (attempts used / next cost)
    // whenever a signed-in player is looking at it - including right after
    // returning from a round, so the card reflects the attempt that was just
    // consumed without needing a page reload.
    useEffect(() => {
        if (!currentUser || gameState !== 'LOBBY') return;
        let cancelled = false;
        (async () => {
            const status = await getDailyAttemptStatus(currentUser.uid, getZagrebDateString());
            if (!cancelled) setDailyAttemptStatus(status);
        })();
        return () => { cancelled = true; };
    }, [currentUser, gameState]);

    // Pure Y-M-D calendar-string arithmetic, deliberately not going back
    // through Intl/timeZone conversion (that's already done once to produce
    // dateKey) - avoids any risk of a double timezone shift landing on the
    // wrong day.
    const getYesterdayDateKey = (dateKey) => {
        const [y, m, d] = dateKey.split('-').map(Number);
        const dt = new Date(Date.UTC(y, m - 1, d));
        dt.setUTCDate(dt.getUTCDate() - 1);
        return dt.toISOString().slice(0, 10);
    };

    useEffect(() => {
        if (!currentUser) return;
        let cancelled = false;
        (async () => {
            const yesterday = getYesterdayDateKey(getZagrebDateString());
            const ackKey = `triviabong_daily_win_ack_${yesterday}_${currentUser.uid}`;
            if (localStorage.getItem(ackKey)) return;

            const meta = await getDailyMeta(yesterday);
            if (cancelled || !meta?.payoutProcessed) return;

            // "Won" means rank 1 specifically - meta.winners now covers all
            // 3 payout tiers (see api/daily-challenge-payout.js), but this
            // banner's copy ("Osvojio/la si...") is a 1st-place announcement.
            const won = (meta.winners || []).some(w => w.uid === currentUser.uid && w.rank === 1);
            if (won) {
                const streakAward = (meta.winStreakAwards || []).find(w => w.uid === currentUser.uid);
                const prize = DAILY_CHALLENGE_TOP3_COINS[1] + (streakAward?.streakCoins || 0);
                setDailyWinAnnouncement({ date: yesterday, prize });
            }
        })();
        return () => { cancelled = true; };
    }, [currentUser]);

    const dismissDailyWinAnnouncement = () => {
        if (dailyWinAnnouncement && currentUser) {
            localStorage.setItem(`triviabong_daily_win_ack_${dailyWinAnnouncement.date}_${currentUser.uid}`, '1');
        }
        setDailyWinAnnouncement(null);
    };

    // Refreshes the Rekordi "Dnevni izazov" board whenever the lobby is
    // visible - public read, no sign-in required to view. Kept as its own
    // dailyLeaderboard state (not folded into rekordiData) since rekordiData
    // is only ever fetched once on mount elsewhere; this one needs to reflect
    // live standings (locked design decision) and stay correct across a
    // Zagreb midnight rollover without a page reload.
    useEffect(() => {
        if (gameState !== 'LOBBY') return;
        let cancelled = false;
        (async () => {
            const board = await getDailyLeaderboard(getZagrebDateString(), 10);
            if (!cancelled) setDailyLeaderboard(board);
        })();
        return () => { cancelled = true; };
    }, [gameState]);

    return {
        dailyChallengeMode,
        setDailyChallengeMode,
        dailyDateKey,
        setDailyDateKey,
        dailyAttemptStatus,
        setDailyAttemptStatus,
        dailySubmitResult,
        setDailySubmitResult,
        dailyLeaderboard,
        setDailyLeaderboard,
        dailyLobbyMessage,
        showDailyLobbyMessage,
        dailyWinAnnouncement,
        dismissDailyWinAnnouncement,
    };
}
