// Single source of truth for the game's leveling curve. Level is derived
// from lifetime xp (+1 per correct answer only, since the economy rebalance
// - see constants/gameBalance.js and App.jsx's handleAnswer) and is only
// recomputed automatically at the moment xp increases from gameplay - never
// on login/read - so an admin's manual level override in AdminPanel survives
// until the player's own xp naturally overtakes it.
//
// Economy rebalance (2026-08): replaced the old tiered-multiplier curve with
// a single quadratic formula (25 * (level-1)^2), so xpForLevel(2) = 25,
// xpForLevel(10) = 2025, xpForLevel(50) = 60025. See statsStore.js's v1->v2
// migration for how existing players' xp/level are handled across this
// change.
export const xpForLevel = (level) => {
    if (level <= 1) return 0;
    return 25 * Math.pow(level - 1, 2);
};

// Linear search rather than a closed-form inverse: levels stay small enough
// (grows ~sqrt(xp)) that a loop is trivially cheap and can't drift out of
// sync with xpForLevel, since it's driven directly by that function rather
// than a second formula mirroring it.
export const computeLevelFromXp = (xp) => {
    const safeXp = xp || 0;
    let level = 1;
    while (xpForLevel(level + 1) <= safeXp) {
        level += 1;
    }
    return level;
};

// Level-up coin reward, called once when `newLevel` is the level just
// reached. Levels 1-5 ("the Hook"): flat 3 coins for rapid early progression.
// Level 6+: 5 + level, so the reward keeps pace with the steepening XP cost.
// Every 10th level pays an extra 25-coin milestone bonus.
export const getCoinsForLevelUp = (newLevel) => {
    const base = newLevel <= 5 ? 3 : 5 + newLevel;
    return base + (newLevel % 10 === 0 ? 25 : 0);
};
