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

// XP: flat per correct answer only. Round-completion/perfect-round XP was
// cut in the economy rebalance (2026-08) - see gameLogic.js's ROUND_END case.
export const XP_PER_CORRECT_ANSWER = 1;

// Coins: deliberately no flat per-answer or per-round-completion income -
// only streak milestones, level-ups (leveling.js's getCoinsForLevelUp),
// achievements, and mode-specific payouts (Daily Challenge, 1v1, community
// questions) below.
export const JOKER_COSTS = { fiftyFifty: 15, plusTen: 10, skip: 30 };

// Streak coin milestones (per round, fires once when streak hits that value
// - see gameLogic.js's ANSWER case).
export const COIN_STREAK_MILESTONES = { 3: 1, 5: 2, 10: 3 };

// Daily Challenge: same QUESTIONS_PER_ROUND questions for every player each
// Zagreb calendar day. Exactly one free attempt/day - no escalating cost,
// no replay.
export const DAILY_CHALLENGE_PARTICIPATION_XP = 3;
export const DAILY_CHALLENGE_TOP3_COINS = { 1: 20, 2: 10, 3: 5 };
export const DAILY_CHALLENGE_TOP3_XP = { 1: 30, 2: 15, 3: 10 };
export const DAILY_CHALLENGE_WIN_STREAK_COINS = { 1: 1, 2: 3, 3: 5, 4: 10, 5: 20, 6: 25, 7: 50 };
export const DAILY_CHALLENGE_WEEKLY_MOST_WINS_COINS = 30;

// 1v1
export const ONE_VS_ONE_WIN_XP = 15;
export const ONE_VS_ONE_WIN_COINS = 3;

// Achievements
export const ACHIEVEMENT_NORMAL_XP = 5;
export const ACHIEVEMENT_NORMAL_COINS = 5;
export const ACHIEVEMENT_HIDDEN_XP = 10;
export const ACHIEVEMENT_HIDDEN_COINS = 10;

// Community questions
export const COMMUNITY_QUESTION_APPROVED_XP = 25;
export const COMMUNITY_QUESTION_APPROVED_COINS = 5;
