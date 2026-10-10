import { ONE_VS_ONE_WIN_XP, ONE_VS_ONE_WIN_COINS } from '../constants/gameBalance.js';
import { computeLevelFromXp, getCoinsForLevelUp } from './leveling.js';
import { evaluateAchievements, mergeUnlockedAchievements } from './achievements.js';

/**
 * Stats update for a 1v1 win - the same one useOneVsOne.js applies for a live
 * match (+ONE_VS_ONE_WIN_XP, +ONE_VS_ONE_WIN_COINS, total1v1Wins, level-up
 * coins, achievements), as a pure function so async duels (decision D7: they
 * count as 1v1 wins) can apply it without touching the live-1v1 hook. If the
 * win reward ever changes, change it in BOTH places.
 * @param {object} prev - globalStats
 * @returns {object} next globalStats
 */
export const applyOneVsOneWin = (prev) => {
    const newXp = (prev.xp || 0) + ONE_VS_ONE_WIN_XP;
    const prevLevel = prev.level || 1;
    const newLevel = Math.max(prevLevel, computeLevelFromXp(newXp));
    const levelCoins = newLevel > prevLevel ? getCoinsForLevelUp(newLevel) : 0;
    const next = {
        ...prev,
        total1v1Wins: (prev.total1v1Wins || 0) + 1,
        xp: newXp,
        level: newLevel,
        coins: (prev.coins || 0) + ONE_VS_ONE_WIN_COINS + levelCoins,
    };
    const newlyUnlocked = evaluateAchievements(next, {});
    next.unlockedAchievements = mergeUnlockedAchievements(next, newlyUnlocked);
    return next;
};
