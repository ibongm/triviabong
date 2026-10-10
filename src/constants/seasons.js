// Season calendar for the seasonal leaderboard (engagement plan Phase 5).
//
// A season is `weekCount` consecutive ISO weeks (Zagreb calendar, see
// utils/periods.js) beginning at `startWeek`. Decision D6: 8 weeks, starting
// on a Monday shortly after Phase 5 ships. Season 1 is provisional - it is
// the Monday 2026-10-26 (2026-W44) through Sunday 2026-12-20 (2026-W51).
// If the launch slips, edit `startWeek` here AND in the inlined copy in
// api/daily-challenge-payout.js (a unit test fails if they disagree).
//
// Weeks outside every season simply have no season board; the weekly board
// is unaffected. To add a season, append an entry - never reuse an id, the
// id is the Firestore document key (seasonBoards/{id}) and the badge prefix
// (e.g. "s1_gold").
export const SEASONS = Object.freeze([
    Object.freeze({ id: 's1', name: 'Sezona 1', startWeek: '2026-W44', weekCount: 8 }),
]);

// How many of a player's best rounds (per week) and best weeks (per season)
// count towards the ranking - decision D3.
export const BEST_ROUNDS_PER_WEEK = 5;
export const BEST_WEEKS_PER_SEASON = 5;

// Weekly podium payout (decision D10). Mirrored inline in
// api/daily-challenge-payout.js - keep in sync (a test pins the mirror).
export const WEEKLY_TOP3_COINS = Object.freeze({ 1: 30, 2: 15, 3: 10 });
export const WEEKLY_TOP3_XP = Object.freeze({ 1: 30, 2: 15, 3: 10 });

// A season's board lists this many leaders; the same number is the "Top 10"
// badge cut-off.
export const SEASON_TOP_BADGE_COUNT = 10;

// Upper bound on weeks stored in one seasonBoards player doc - the rules cap
// the `weeks` map at this size. Must stay >= every season's weekCount (a test
// enforces it).
export const MAX_SEASON_WEEKS_STORED = 12;
