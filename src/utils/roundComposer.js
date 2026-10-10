// Builds a round's question list with a difficulty curve (engagement plan
// Phase 3): by default 3 easy, 4 medium, 3 hard, ordered easy -> hard, so a
// round opens gently and ends with the questions that decide the score.
// Pure - no React/Firebase imports.
//
// Questions without a tier count as 'medium' (see difficulty.js), so before
// any difficulty data exists this is a plain uniform random pick of `count`
// questions - the same distribution as the old `shuffle().slice()`, just
// with the (all-medium) order kept shuffled.
//
// If a tier has fewer questions than its quota the shortfall is filled with
// uniformly random questions from whatever is left, so a small or lopsided
// pool still yields a full round.
import { shuffleArray } from './questionUtils.js';
import { DIFFICULTY_LEVELS, effectiveTier } from './difficulty.js';

export const DEFAULT_CURVE = Object.freeze({ easy: 3, medium: 4, hard: 3 });

const TIER_ORDER = Object.fromEntries(DIFFICULTY_LEVELS.map((t, i) => [t, i]));

/**
 * @param {object[]} pool - candidate questions (each with an `id`)
 * @param {{ count?: number, curve?: {easy:number,medium:number,hard:number}, rand?: () => number }} [options]
 *   `curve` quotas are scaled to `count` when they don't add up to it.
 * @returns {object[]} up to `count` questions, easy -> hard
 */
export const composeRound = (pool, options = {}) => {
    const count = options.count ?? 10;
    const rand = options.rand ?? Math.random;
    const curve = options.curve ?? DEFAULT_CURVE;

    const candidates = shuffleArray(pool.filter(Boolean), rand);
    if (candidates.length <= count) {
        return orderByTier(candidates);
    }

    const quotaTotal = DIFFICULTY_LEVELS.reduce((sum, t) => sum + (curve[t] || 0), 0) || 1;
    const quota = {};
    let assigned = 0;
    for (const t of DIFFICULTY_LEVELS) {
        quota[t] = Math.floor(((curve[t] || 0) / quotaTotal) * count);
        assigned += quota[t];
    }
    // Rounding leftovers go to medium, the tier that is never short in
    // practice (it also holds every untiered question).
    quota.medium += count - assigned;

    const picked = [];
    const rest = [];
    const taken = { easy: 0, medium: 0, hard: 0 };
    for (const q of candidates) {
        const tier = effectiveTier(q);
        if (taken[tier] < quota[tier]) {
            taken[tier] += 1;
            picked.push(q);
        } else {
            rest.push(q);
        }
    }
    // `candidates` is already shuffled, so `rest` is too.
    picked.push(...rest.slice(0, count - picked.length));

    return orderByTier(picked);
};

// Easy -> hard. The input is already shuffled, and Array.prototype.sort is
// stable, so order inside each tier stays uniformly random.
const orderByTier = (questions) => (
    [...questions].sort((a, b) => TIER_ORDER[effectiveTier(a)] - TIER_ORDER[effectiveTier(b)])
);
