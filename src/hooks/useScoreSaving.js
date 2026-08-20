import { useEffect, useState } from 'react';
import { sanitizeDisplayName } from '../utils/publicProfile';
import { sound } from '../utils/sound';
import { QUESTIONS_PER_ROUND, DAILY_CHALLENGE_PARTICIPATION_XP } from '../constants/gameBalance';
import { computeLevelFromXp, getCoinsForLevelUp } from '../utils/leveling';
import {
    saveScoreToFirestore,
    getLeaderboardFromFirestore,
    getPlayerBestScoreForCategory,
    submitDailyScore,
    getDailyLeaderboard,
} from '../services/firebase';

// Score-saving state/logic, extracted out of App.jsx: scoreSaved/isSaving/
// autoSaveFailed/roundHighlight, saveScore (+ its daily-mode dispatch to
// submitDaily), handleSaveScore, and the sign-in auto-save effect.
//
// Takes an options object rather than positional primitives - the first
// hook in this codebase to do so (useGameRound/useOneVsOne/useDailyChallenge
// all take a handful of positional args) - because this hook genuinely
// depends on this many independent pieces of App.jsx's round/daily/auth
// state, and a 12-positional-argument signature would be far harder to
// call correctly than a named options bag.
export function useScoreSaving({
    gameState,
    currentUser,
    dailyChallengeMode,
    score,
    selectedCategory,
    roundStartTime,
    correctInRound,
    dailyDateKey,
    nickname,
    leaderboards,
    setLeaderboards,
    refreshRekordiData,
    setDailyLeaderboard,
    setDailySubmitResult,
    recordDailyComplete,
    setGlobalStats,
}) {
    const [scoreSaved, setScoreSaved] = useState(false);
    // Post-round personal-best/rank context for a normal (non-daily) round -
    // mirrors dailySubmitResult's shape/intent (see useDailyChallenge.js).
    const [roundHighlight, setRoundHighlight] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [autoSaveFailed, setAutoSaveFailed] = useState(false);

    // Daily Challenge submission requires sign-in (locked design decision -
    // launchDailyChallengeRound already gates entry on currentUser, so
    // dailyChallengeMode is only ever true here for a signed-in player), and
    // writes to dailyLeaderboards/{date}/scores/{uid} instead of the normal
    // per-category leaderboards collection - see submitDailyScore's rules-side
    // upsert-on-improvement logic in firestore.rules.
    const submitDaily = async () => {
        setIsSaving(true);
        try {
            const success = await submitDailyScore(
                currentUser.uid, dailyDateKey, sanitizeDisplayName(currentUser), score
            );
            if (!success) throw new Error('Daily score submit failed');
            setScoreSaved(true);
            sound.playClick();
            // Participation XP - top-3 placement coins/XP are paid separately
            // by api/daily-challenge-payout.js once the day rolls over, since
            // rank isn't final until every player's attempt is in.
            setGlobalStats(prev => {
                const newXp = (prev.xp || 0) + DAILY_CHALLENGE_PARTICIPATION_XP;
                const prevLevel = prev.level || 1;
                const newLevel = Math.max(prevLevel, computeLevelFromXp(newXp));
                const levelCoins = newLevel > prevLevel ? getCoinsForLevelUp(newLevel) : 0;
                return { ...prev, xp: newXp, level: newLevel, coins: (prev.coins || 0) + levelCoins };
            });
            const board = await getDailyLeaderboard(dailyDateKey, 50);
            setDailyLeaderboard(board);
            const rankIdx = board.findIndex(entry => entry.uid === currentUser.uid);
            setDailySubmitResult({ rank: rankIdx >= 0 ? rankIdx + 1 : null, isTop: rankIdx === 0 });
            recordDailyComplete?.({ accuracy: Math.round((correctInRound / QUESTIONS_PER_ROUND) * 100) });
        } catch (err) {
            console.error('Failed to submit daily score:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const saveScore = async (entryName) => {
        if (!entryName || scoreSaved || isSaving) return;
        if (dailyChallengeMode) {
            await submitDaily();
            return;
        }
        setIsSaving(true);

        const catKey = selectedCategory || 'opca_znanje';

        const previousLeaderboards = leaderboards;
        setLeaderboards(prev => {
            const currentList = prev[catKey] || [];
            const newList = [...currentList, { name: entryName, score, date: new Date().toLocaleDateString() }]
                .sort((a, b) => b.score - a.score)
                .slice(0, 10);
            return { ...prev, [catKey]: newList };
        });

        try {
            const elapsedMs = roundStartTime ? Date.now() - roundStartTime : null;
            const isPerfect = correctInRound === QUESTIONS_PER_ROUND;
            // Captured BEFORE the save so it reflects the player's prior best, not
            // the round just played - null means either signed out or no prior
            // score in this category, both of which should count as a new best.
            const previousBest = currentUser?.uid ? await getPlayerBestScoreForCategory(currentUser.uid, catKey) : null;
            const success = await saveScoreToFirestore(catKey, entryName, score, currentUser?.uid || null, elapsedMs, isPerfect);
            if (!success) throw new Error('Firestore save failed');
            setScoreSaved(true);
            sound.playClick();
            refreshRekordiData(true); // bypass the cache so the just-saved score shows up now
            if (currentUser?.uid) {
                const isNewPersonalBest = previousBest === null || score > previousBest;
                const board = await getLeaderboardFromFirestore(catKey);
                const rankIdx = board.findIndex(entry => entry.uid === currentUser.uid && entry.score === score);
                setRoundHighlight({ isNewPersonalBest, rank: rankIdx >= 0 ? rankIdx + 1 : null });
            }
        } catch (err) {
            if (previousLeaderboards) {
                setLeaderboards(previousLeaderboards);
            }
            console.error('Failed to save score:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveScore = (e) => {
        e.preventDefault();
        saveScore(nickname.trim()).catch(() => {});
    };

    // Signed-in players already have a displayName - skip the manual nickname
    // form and save automatically once a round ends. Only anonymous play still
    // shows the form (the player has no account-derived name to fall back to).
    useEffect(() => {
        if ((gameState === 'GAMEOVER' || gameState === 'VICTORY') && currentUser && !scoreSaved) {
            (async () => {
                try {
                    await saveScore(sanitizeDisplayName(currentUser));
                } catch {
                    setAutoSaveFailed(true);
                }
            })();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameState, currentUser, scoreSaved]);

    return {
        scoreSaved,
        setScoreSaved,
        roundHighlight,
        setRoundHighlight,
        isSaving,
        autoSaveFailed,
        setAutoSaveFailed,
        saveScore,
        handleSaveScore,
    };
}
