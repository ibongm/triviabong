// Canonical shape + defaults for a brand-new player's stats.
// - App.jsx: initial useState() value, and the reset applied when a
//   just-authenticated account has no existing Firestore doc (so a new
//   account never inherits a previous account's in-memory/localStorage
//   stats - see the auth listener in App.jsx).
// - firebase.js: fallback defaults when writing to Firestore.
export const DEFAULT_GLOBAL_STATS = {
  level: 1,
  xp: 0,
  coins: 15,
  totalGames: 0,
  totalAnswered: 0,
  totalCorrect: 0,
  maxStreak: 0,
  totalScore: 0,
  categoryStats: {},
};
