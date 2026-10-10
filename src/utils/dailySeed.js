import { getAllQuestions } from '../data/questionsLoader.js';
import { QUESTIONS_PER_ROUND } from '../constants/gameBalance.js';

// Deterministic string -> 32-bit int hash (djb2 variant), used to turn the
// Zagreb calendar-date key into a PRNG seed.
const hashStringToSeed = (str) => {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
    }
    return hash >>> 0;
};

// Not cryptographically secure: the inputs are a public date string and
// public question ids, and this file ships in the client bundle, so a
// determined player could compute future days' question sets in advance.
// That's an accepted tradeoff (see DailyChallenge plan, "non-goals")
// matching this project's existing trust model, not an oversight.

// murmur3's 32-bit finalizer. djb2 alone maps near-identical inputs
// ("2026-10-10|hr_geo_1" vs "...|hr_geo_2") to near-identical outputs, so
// ranking by raw djb2 would pick runs of adjacent ids; this avalanches it.
const fmix32 = (h) => {
    let x = h >>> 0;
    x ^= x >>> 16;
    x = Math.imul(x, 0x85ebca6b);
    x ^= x >>> 13;
    x = Math.imul(x, 0xc2b2ae35);
    x ^= x >>> 16;
    return x >>> 0;
};

const rankKey = (dateKey, id) => fmix32(hashStringToSeed(`${dateKey}|${id}`));

// A question is eligible for a date only if it existed before that date.
// `addedOn` ("YYYY-MM-DD", Zagreb) is stamped on new questions by the
// generator and the admin upload; questions without it predate the field
// and are always eligible. ISO date strings compare correctly as strings.
export const isEligibleForDate = (question, dateKey) =>
    !question?.addedOn || question.addedOn < dateKey;

/**
 * Pure selection step behind getDailyChallengeQuestions - exported for
 * tests. Ranks every eligible question by a per-question hash of
 * (dateKey, id) and takes the `count` lowest.
 *
 * Why not shuffle the whole pool (the previous approach): the shuffle's
 * output depends on the pool's LENGTH, so every question added anywhere -
 * the generator workflow commits several times a day, each one an
 * auto-deploy - silently swapped the whole day's set. Players before and
 * after a deploy got different questions yet shared one leaderboard and
 * one payout. Here a question's rank depends only on its own id and the
 * date, and questions added today are ineligible today, so today's set
 * can't change mid-day. Result order is the hash order, so it's stable too.
 */
export const selectDailyQuestions = (pool, dateKey, count = QUESTIONS_PER_ROUND) => {
    const ranked = [];
    const seen = new Set();
    for (const q of pool || []) {
        if (!q?.id || seen.has(q.id) || !isEligibleForDate(q, dateKey)) continue;
        seen.add(q.id);
        ranked.push({ q, key: rankKey(dateKey, q.id) });
    }
    ranked.sort((a, b) => (a.key - b.key) || (a.q.id < b.q.id ? -1 : a.q.id > b.q.id ? 1 : 0));
    return ranked.slice(0, count).map((r) => r.q);
};

/**
 * Returns the same QUESTIONS_PER_ROUND questions, in the same order, for
 * every caller on a given Zagreb calendar date (dateKey, "YYYY-MM-DD"),
 * regardless of questions added later that day - see selectDailyQuestions.
 * Async because getAllQuestions() lazy-loads the question JSON on first call
 * (see questionsLoader.js).
 */
export const getDailyChallengeQuestions = async (dateKey) => {
    const pool = await getAllQuestions();
    return selectDailyQuestions(pool, dateKey, QUESTIONS_PER_ROUND);
};
