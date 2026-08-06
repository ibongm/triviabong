// Achievement evaluation logic - kept separate from the static catalog
// (constants/achievements.js) so content and trigger rules can be reviewed
// independently. evaluateAchievements is called from several different
// points in App.jsx (per-answer, per-joker-use, round-end, round-start),
// each building a small ctx object with only the fields it actually has at
// that moment - a predicate that needs an absent field naturally evaluates
// false there (numeric comparisons against `undefined` are NaN-comparisons
// in JS, always false; `undefined === true` is also false), so there's no
// need for per-predicate presence guards.
import { ACHIEVEMENTS, SVI_SMO_MI_MARIJA_ID } from '../constants/achievements';
import { CATEGORY_META } from '../data/categoryMeta';

const MIN_ANSWERED_FOR_MASTERY = 10;
const CATEGORY_MASTERY_CORRECT_THRESHOLD = 50;
const MASTERY_ACCURACY_THRESHOLD = 0.8;

const categoryCorrect = (stats, key) => stats.categoryStats?.[key]?.correct || 0;

const isJackOfAllTrades = (stats) => Object.keys(CATEGORY_META).every((key) => {
    const cat = stats.categoryStats?.[key];
    return cat && cat.total >= MIN_ANSWERED_FOR_MASTERY && (cat.correct / cat.total) >= MASTERY_ACCURACY_THRESHOLD;
});

// Matches the stem, not the phrase "Harry Potter": Croatian declines the
// surname (Pottera / Potteru / "o Harryju Potteru"), and the literal phrase
// appears in only 1 of the 7 questions that mention him - matching the full
// phrase would miss the other 6. Verified zero false positives across all
// 3542 bundled questions. A future upload about a different Potter (Beatrix,
// Dennis) would unlock it spuriously; tightening the match would break the
// declension cases, and a spurious secret trophy is the cheaper failure.
const HARRY_POTTER_NEEDLE = 'potter';

/**
 * True if a question mentions Harry Potter anywhere a player could read it.
 * Tolerates both the bundled snake_case shape and the camelCase/options
 * shapes App.jsx's getQuestionOptions/checkIsCorrect already accept, so it
 * can't silently stop matching if a question ever reaches it pre-normalized.
 */
export const mentionsHarryPotter = (question) => {
    if (!question) return false;
    const parts = [
        question.question,
        question.correct_answer,
        question.correctAnswer,
        ...(Array.isArray(question.incorrect_answers) ? question.incorrect_answers : []),
        ...(Array.isArray(question.incorrectAnswers) ? question.incorrectAnswers : []),
        ...(Array.isArray(question.options) ? question.options : []),
    ];
    return parts.some((p) => typeof p === 'string' && p.toLowerCase().includes(HARRY_POTTER_NEEDLE));
};

export const ACHIEVEMENT_CHECKS = {
    first_blood: (stats) => stats.totalCorrect >= 1,
    category_explorer: (stats) => Object.keys(stats.categoryStats || {}).length >= 8,
    night_owl: (stats, ctx) => ctx.hour >= 0 && ctx.hour < 5,
    early_bird: (stats, ctx) => ctx.hour < 7,
    profile_complete: (stats, ctx) => ctx.isSignedIn === true,

    lightning_reflexes: (stats, ctx) => ctx.timeLeft > 18,
    buzzer_beater: (stats, ctx) => ctx.timeLeft <= 1,
    speed_demon: (stats, ctx) => ctx.roundElapsedMs < 30000 && ctx.isPerfect === true,
    no_rush: (stats, ctx) => ctx.timeLeft < 5,
    sonic_speed: (stats, ctx) => ctx.fastAnswerStreak >= 5,

    on_fire: (stats, ctx) => ctx.newStreak >= 5,
    unstoppable: (stats, ctx) => ctx.newStreak >= 10,
    daily_habit: (stats) => stats.dayStreak >= 3,
    weekly_warrior: (stats) => stats.dayStreak >= 7,
    monthly_master: (stats) => stats.dayStreak >= 30,

    perfectionist: (stats, ctx) => ctx.isPerfect === true,
    high_roller: (stats, ctx) => ctx.finalScore > 5000,
    century_club: (stats) => stats.totalCorrect >= 100,
    trivia_legend: (stats) => stats.totalCorrect >= 1000,
    flawless_victory: (stats) => stats.consecutivePerfectRounds >= 3,

    life_saver: (stats, ctx) => ctx.isLifeSaverHit === true,
    purist: (stats, ctx) => ctx.isVictory === true && ctx.noJokersUsed === true,
    close_call: (stats, ctx) => ctx.isVictory === true && ctx.skipUsedAtLastLife === true,
    tactician: (stats, ctx) => ctx.allJokersUsedThisRound === true,
    living_dangerously: (stats, ctx) => ctx.isLivingDangerously === true,

    geographer: (stats) => categoryCorrect(stats, 'geografija') >= CATEGORY_MASTERY_CORRECT_THRESHOLD,
    history_buff: (stats) => categoryCorrect(stats, 'povijest') >= CATEGORY_MASTERY_CORRECT_THRESHOLD,
    science_whiz: (stats) => categoryCorrect(stats, 'znanost') >= CATEGORY_MASTERY_CORRECT_THRESHOLD,
    pop_culture_icon: (stats) => categoryCorrect(stats, 'pop_kultura') >= CATEGORY_MASTERY_CORRECT_THRESHOLD,
    jack_of_all_trades: (stats) => isJackOfAllTrades(stats),

    // Only ever true from handleAnswer's correct branch, which is the only
    // caller that puts isPotterQuestion in ctx. App.jsx decides separately
    // (before the state updater) whether to fire the celebration - the two
    // conditions must stay equivalent, so change both together.
    [SVI_SMO_MI_MARIJA_ID]: (stats, ctx) => ctx.isPotterQuestion === true,
};

/**
 * Returns the ids of achievements that are newly satisfied by `stats`/`ctx`
 * and not already present in stats.unlockedAchievements. Call inside the
 * same functional state updater that produced the fields being checked, not
 * a later/separate one - see the App.jsx wiring notes for why.
 */
export const evaluateAchievements = (stats, ctx = {}) => {
    const unlocked = stats.unlockedAchievements || {};
    const newlyUnlocked = [];
    for (const { id } of ACHIEVEMENTS) {
        if (unlocked[id]) continue;
        const check = ACHIEVEMENT_CHECKS[id];
        if (check && check(stats, ctx)) {
            newlyUnlocked.push(id);
        }
    }
    return newlyUnlocked;
};

/**
 * Returns the ids of currently-unlocked achievements that no longer satisfy
 * their condition given `stats` - used by the admin-panel full-sync edit
 * path (AdminPlayers.jsx) to revoke trophies an edit dropped below
 * threshold. ONLY considers `statOnly` achievements (see the flag's comment
 * in constants/achievements.js) - the rest need momentary gameplay context
 * (time of day, that round's elapsed time, which jokers were used, an
 * in-progress streak) that a static stat snapshot can't reconstruct, so
 * re-checking them here with an empty ctx would always evaluate false and
 * revoke them regardless of whether they're still earned. Never call this
 * against the full ACHIEVEMENTS list without that filter.
 */
export const revokeStaleAchievements = (stats) => {
    const unlocked = stats.unlockedAchievements || {};
    const toRevoke = [];
    for (const { id, statOnly } of ACHIEVEMENTS) {
        if (!statOnly || !unlocked[id]) continue;
        const check = ACHIEVEMENT_CHECKS[id];
        if (check && !check(stats, {})) {
            toRevoke.push(id);
        }
    }
    return toRevoke;
};

/** Stamps each newly-unlocked id with the current time; does not mutate. */
export const mergeUnlockedAchievements = (stats, newIds) => {
    if (!newIds || newIds.length === 0) return stats.unlockedAchievements || {};
    const now = new Date().toISOString();
    const merged = { ...(stats.unlockedAchievements || {}) };
    for (const id of newIds) {
        merged[id] = now;
    }
    return merged;
};

// --- Day-streak helpers ---
// Calendar-date strings (YYYY-MM-DD, local time) diffed via Date.UTC, never
// raw millisecond subtraction of real Date objects - the latter is DST-unsafe
// since a local "day" isn't always exactly 86,400,000ms.
export const getLocalDateString = (date = new Date()) => date.toLocaleDateString('en-CA');

const parseLocalDateString = (s) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
};

export const daysBetweenLocalDates = (a, b) => {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((parseLocalDateString(b) - parseLocalDateString(a)) / msPerDay);
};

/**
 * Computes the {dayStreak, lastPlayedDate} transition for a round starting
 * "now". Same-day replay is a no-op (streak unchanged); a gap of exactly one
 * day increments; anything else (a gap of 2+, or negative from a clock
 * rolled backward) resets to 1. Call at round start, mirroring how
 * totalGames already counts at round start regardless of outcome.
 */
export const computeDayStreakUpdate = (stats) => {
    const today = getLocalDateString();
    const last = stats.lastPlayedDate;

    if (!last) {
        return { dayStreak: 1, lastPlayedDate: today };
    }
    const diff = daysBetweenLocalDates(last, today);
    if (diff === 0) {
        return { dayStreak: stats.dayStreak || 1, lastPlayedDate: today };
    }
    if (diff === 1) {
        return { dayStreak: (stats.dayStreak || 0) + 1, lastPlayedDate: today };
    }
    return { dayStreak: 1, lastPlayedDate: today };
};
