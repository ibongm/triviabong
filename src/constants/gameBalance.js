// Single source of truth for every game-balance number - imported by
// App.jsx (gameplay logic) and GuideModal.jsx (the in-app "how to play"
// guide), so the guide's copy can never drift from what actually happens
// during play. The leveling curve lives in utils/leveling.js and starting
// coins come from constants/defaultGlobalStats.js - both are still
// single-purpose files, so they aren't duplicated here.

export const MAX_LIVES = 3;
export const QUESTIONS_PER_ROUND = 10;
export const QUESTION_TIME_SECONDS = 20;
export const PLUS_TEN_SECONDS = 10;

export const BASE_SCORE = 100;
export const SPEED_BONUS_PER_SECOND = 10;
export const STREAK_MULTIPLIER_STEP = 0.2;

// XP: flat per correct answer, plus a bonus for a flawless round (all
// QUESTIONS_PER_ROUND answered correctly - no wrong answers, timeouts, or
// skips).
export const XP_PER_CORRECT_ANSWER = 1;
export const PERFECT_ROUND_XP_BONUS = 3;

// Coins: deliberately no flat per-answer income - only these four sources.
export const COIN_STREAK_BONUS_INTERVAL = 5;
export const COIN_STREAK_BONUS_AMOUNT = 1;
export const COIN_PER_ROUND_COMPLETE = 1;
export const COIN_PERFECT_ROUND_BONUS = 2;
export const COIN_LEVEL_UP_BONUS = 3;

export const JOKER_COSTS = { fiftyFifty: 3, plusTen: 2, skip: 5 };
