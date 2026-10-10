// Question difficulty tiers (engagement plan Phase 3). Pure logic, no
// React/Firebase imports, so the browser, the Node scripts and the tests all
// share it.
//
// A question may carry:
//   difficulty          'easy' | 'medium' | 'hard'
//   difficultyAccuracy  0..1, share of players who answered it correctly
//   difficultySource    'stats' (measured from questionStats) | 'guess'
//                       (the generator's / an uploader's estimate)
// All three are optional - an untiered question is treated as 'medium' by
// the round composer, which with no tier data at all degrades to the old
// uniformly-random behaviour.

export const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];
export const DIFFICULTY_SOURCES = ['stats', 'guess'];

// Fewer attempts than this and the percentage is noise (one lucky streak of
// 5 players is not "easy"). Chosen so a question needs roughly 15 plays
// before it is measured at all.
export const MIN_ATTEMPTS = 15;

// Tier edges on correct-answer share. A random guess is 25%, so anything
// under SUSPECT_ACCURACY with enough attempts is worse than guessing - the
// signature of a wrong answer key or an ambiguous question, reported for a
// human to look at rather than merely tagged "hard".
export const EASY_MIN_ACCURACY = 0.75;
export const HARD_MAX_ACCURACY = 0.45;
export const SUSPECT_ACCURACY = 0.15;

// Accuracy changes smaller than this (with an unchanged tier) are not
// rewritten, so a weekly recompute doesn't produce a noisy diff - and a
// Vercel redeploy - for 6,000 questions whose stats barely moved.
export const ACCURACY_REWRITE_THRESHOLD = 0.03;

export const isDifficultyLevel = (v) => DIFFICULTY_LEVELS.includes(v);

/**
 * @param {number} accuracy - correct / total, 0..1
 * @returns {'easy'|'medium'|'hard'}
 */
export const tierFromAccuracy = (accuracy) => {
    if (accuracy >= EASY_MIN_ACCURACY) return 'easy';
    if (accuracy < HARD_MAX_ACCURACY) return 'hard';
    return 'medium';
};

/** The tier a question counts as when composing a round. */
export const effectiveTier = (question) => (
    isDifficultyLevel(question?.difficulty) ? question.difficulty : 'medium'
);

/**
 * Measured accuracy as a whole percent for the reveal line, or null when the
 * number isn't a measurement (a generator guess, or no data yet).
 */
export const measuredAccuracyPercent = (question) => {
    if (question?.difficultySource !== 'stats') return null;
    const a = question.difficultyAccuracy;
    if (typeof a !== 'number' || !Number.isFinite(a) || a < 0 || a > 1) return null;
    return Math.round(a * 100);
};

/**
 * Applies measured stats to a category pack.
 * Only questions with at least `minAttempts` attempts are touched; everything
 * else (including unmeasured generator guesses) is returned as is. Fields the
 * function doesn't own (addedOn, explanation, ...) are preserved.
 *
 * @param {object[]} pack
 * @param {Record<string, { total: number, correct: number }>} statsById
 * @param {{ minAttempts?: number }} [options]
 * @returns {{ pack: object[], changed: number, measured: number,
 *   suspects: { id: string, question: string, correct_answer: string, accuracy: number, total: number }[] }}
 */
export const applyDifficultyFromStats = (pack, statsById, options = {}) => {
    const minAttempts = options.minAttempts ?? MIN_ATTEMPTS;
    let changed = 0;
    let measured = 0;
    const suspects = [];

    const next = pack.map((q) => {
        const s = statsById[q.id];
        const total = Number(s?.total);
        const correct = Number(s?.correct);
        if (!s || !Number.isFinite(total) || !Number.isFinite(correct) || total < minAttempts || correct > total || correct < 0) {
            return q;
        }
        measured += 1;
        const accuracy = Math.round((correct / total) * 100) / 100;
        const tier = tierFromAccuracy(correct / total);
        if (correct / total < SUSPECT_ACCURACY) {
            suspects.push({ id: q.id, question: q.question, correct_answer: q.correct_answer, accuracy, total });
        }

        const sameTier = q.difficulty === tier && q.difficultySource === 'stats';
        if (sameTier && typeof q.difficultyAccuracy === 'number'
            && Math.abs(q.difficultyAccuracy - accuracy) < ACCURACY_REWRITE_THRESHOLD) {
            return q;
        }
        changed += 1;
        return { ...q, difficulty: tier, difficultyAccuracy: accuracy, difficultySource: 'stats' };
    });

    return { pack: next, changed, measured, suspects };
};
