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

// mulberry32 - small, well-known seeded PRNG. Not cryptographically secure:
// the seed is derived from a public date string and this file ships in the
// client bundle, so a determined player could compute future days' question
// sets in advance. That's an accepted tradeoff (see DailyChallenge plan,
// "non-goals") matching this project's existing trust model, not an oversight.
const mulberry32 = (seed) => {
    let t = seed;
    return () => {
        t |= 0;
        t = (t + 0x6D2B79F5) | 0;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
};

// Deterministic Fisher-Yates using a supplied PRNG, so the same seed always
// produces the same order (unlike questionUtils.js's Math.random()-based shuffleArray).
const seededShuffle = (array, rand) => {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
};

/**
 * Returns the same QUESTIONS_PER_ROUND questions, in the same order, for
 * every caller on a given Zagreb calendar date (dateKey, "YYYY-MM-DD").
 * Pure - relies only on getAllQuestions()'s stable array order.
 */
export const getDailyChallengeQuestions = (dateKey) => {
    const pool = getAllQuestions();
    const rand = mulberry32(hashStringToSeed(dateKey));
    return seededShuffle(pool, rand).slice(0, QUESTIONS_PER_ROUND);
};
