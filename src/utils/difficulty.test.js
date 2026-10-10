import { describe, it, expect } from 'vitest';
import {
    tierFromAccuracy,
    effectiveTier,
    measuredAccuracyPercent,
    applyDifficultyFromStats,
    MIN_ATTEMPTS,
} from './difficulty';

describe('tierFromAccuracy', () => {
    it('puts the edges where documented', () => {
        expect(tierFromAccuracy(0.75)).toBe('easy');
        expect(tierFromAccuracy(0.7499)).toBe('medium');
        expect(tierFromAccuracy(0.45)).toBe('medium');
        expect(tierFromAccuracy(0.4499)).toBe('hard');
        expect(tierFromAccuracy(0)).toBe('hard');
        expect(tierFromAccuracy(1)).toBe('easy');
    });
});

describe('effectiveTier / measuredAccuracyPercent', () => {
    it('treats untiered or invalid tiers as medium', () => {
        expect(effectiveTier({})).toBe('medium');
        expect(effectiveTier({ difficulty: 'impossible' })).toBe('medium');
        expect(effectiveTier({ difficulty: 'hard' })).toBe('hard');
    });
    it('only reports a percentage for measured accuracy', () => {
        expect(measuredAccuracyPercent({ difficultySource: 'stats', difficultyAccuracy: 0.624 })).toBe(62);
        expect(measuredAccuracyPercent({ difficultySource: 'guess', difficultyAccuracy: 0.6 })).toBeNull();
        expect(measuredAccuracyPercent({ difficultySource: 'stats' })).toBeNull();
        expect(measuredAccuracyPercent({ difficultySource: 'stats', difficultyAccuracy: 1.4 })).toBeNull();
        expect(measuredAccuracyPercent(null)).toBeNull();
    });
});

describe('applyDifficultyFromStats', () => {
    const pack = [
        { id: 'a', question: 'A?', correct_answer: 'x', addedOn: '2026-10-01', explanation: 'because' },
        { id: 'b', question: 'B?', correct_answer: 'y', difficulty: 'easy', difficultySource: 'guess' },
        { id: 'c', question: 'C?', correct_answer: 'z' },
        { id: 'd', question: 'D?', correct_answer: 'w' },
    ];
    const stats = {
        a: { total: 20, correct: 18 }, // 90% -> easy
        b: { total: 40, correct: 10 }, // 25% -> hard, replaces the guess
        c: { total: MIN_ATTEMPTS - 1, correct: 1 }, // too few attempts
        // d has no stats
    };

    it('tiers measured questions, leaves the rest alone, keeps unknown fields', () => {
        const { pack: next, changed, measured } = applyDifficultyFromStats(pack, stats);
        expect(measured).toBe(2);
        expect(changed).toBe(2);
        expect(next[0]).toMatchObject({ difficulty: 'easy', difficultyAccuracy: 0.9, difficultySource: 'stats', addedOn: '2026-10-01', explanation: 'because' });
        expect(next[1]).toMatchObject({ difficulty: 'hard', difficultyAccuracy: 0.25, difficultySource: 'stats' });
        expect(next[2]).toBe(pack[2]);
        expect(next[3]).toBe(pack[3]);
    });

    it('does not mutate the input pack', () => {
        const snapshot = JSON.stringify(pack);
        applyDifficultyFromStats(pack, stats);
        expect(JSON.stringify(pack)).toBe(snapshot);
    });

    it('flags questions under 15% correct as suspects, not merely hard', () => {
        const { suspects } = applyDifficultyFromStats(pack, { a: { total: 30, correct: 3 } });
        expect(suspects).toHaveLength(1);
        expect(suspects[0]).toMatchObject({ id: 'a', accuracy: 0.1, total: 30 });
    });

    it('is idempotent and ignores tiny accuracy drift with an unchanged tier', () => {
        const first = applyDifficultyFromStats(pack, stats).pack;
        const again = applyDifficultyFromStats(first, stats);
        expect(again.changed).toBe(0);
        expect(again.pack[0]).toBe(first[0]);
        // 90% -> 91%: same tier, drift < 3 points: untouched.
        const drift = applyDifficultyFromStats(first, { a: { total: 100, correct: 91 } });
        expect(drift.changed).toBe(0);
        // 90% -> 80%: same tier but a real move: rewritten.
        const moved = applyDifficultyFromStats(first, { a: { total: 100, correct: 80 } });
        expect(moved.changed).toBe(1);
        expect(moved.pack[0].difficultyAccuracy).toBe(0.8);
    });

    it('rewrites when the tier changes even if accuracy barely moved', () => {
        const first = applyDifficultyFromStats(pack, { a: { total: 100, correct: 76 } }).pack; // easy
        const next = applyDifficultyFromStats(first, { a: { total: 100, correct: 74 } });
        expect(next.pack[0].difficulty).toBe('medium');
    });

    it('ignores corrupt counters', () => {
        const { measured } = applyDifficultyFromStats(pack, {
            a: { total: 20, correct: 25 },
            b: { total: NaN, correct: 3 },
            c: { total: 20, correct: -1 },
        });
        expect(measured).toBe(0);
    });
});
