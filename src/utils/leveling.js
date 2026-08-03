// Single source of truth for the game's leveling curve. Level is derived
// from lifetime xp (+1 per correct answer, +3 more for a flawless round -
// see constants/gameBalance.js and App.jsx's handleAnswer/applyRoundEndRewards)
// and is only recomputed automatically at the moment xp increases from
// gameplay - never on login/read - so an admin's manual level override in
// AdminPanel survives until the player's own xp naturally overtakes it.
//
// The curve is tiered rather than flat: levels 2-4 cost BASE_LEVEL_XP_STEP * 2
// per step, level 5 and beyond cost BASE_LEVEL_XP_STEP * 3 per step, so the
// climb steepens noticeably right at level 5 instead of merely growing
// gradually - early levels stay quick, later ones take real grinding.
export const BASE_LEVEL_XP_STEP = 10;
export const EARLY_TIER_MULTIPLIER = 2; // levels 2-4
export const LATE_TIER_MULTIPLIER = 3; // level 5+
export const LATE_TIER_START_LEVEL = 5;

// Cumulative XP required to REACH `level` (level 1 is always 0).
export const xpForLevel = (level) => {
    if (level <= 1) return 0;
    const multiplier = level < LATE_TIER_START_LEVEL ? EARLY_TIER_MULTIPLIER : LATE_TIER_MULTIPLIER;
    return (multiplier * BASE_LEVEL_XP_STEP * level * (level - 1)) / 2;
};

// Linear search rather than a closed-form inverse: the tiered multiplier
// makes a single quadratic formula error-prone right at the tier boundary,
// and levels stay small enough (grows ~sqrt(xp)) that a loop is trivially
// cheap and can't drift out of sync with xpForLevel, since it's driven
// directly by that function rather than a second formula mirroring it.
export const computeLevelFromXp = (xp) => {
    const safeXp = xp || 0;
    let level = 1;
    while (xpForLevel(level + 1) <= safeXp) {
        level += 1;
    }
    return level;
};
