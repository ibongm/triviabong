// Single source of truth for the game's leveling curve. Level is derived
// from lifetime xp (+50 per correct answer - see App.jsx's handleAnswer)
// and is only recomputed automatically at the moment xp increases from
// gameplay - never on login/read - so an admin's manual level override in
// AdminPanel survives until the player's own xp naturally overtakes it.
export const XP_PER_LEVEL = 500; // 10 correct answers per level

export const computeLevelFromXp = (xp) => Math.floor((xp || 0) / XP_PER_LEVEL) + 1;
