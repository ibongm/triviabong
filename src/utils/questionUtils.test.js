import { describe, it, expect } from 'vitest';
import { shuffleArray, getQuestionOptions } from './questionUtils';

describe('shuffleArray', () => {
    it('returns a permutation and leaves the input untouched', () => {
        const input = [1, 2, 3, 4, 5];
        const out = shuffleArray(input);
        expect(input).toEqual([1, 2, 3, 4, 5]);
        expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
    });

    it('handles empty and single-item arrays', () => {
        expect(shuffleArray([])).toEqual([]);
        expect(shuffleArray(['a'])).toEqual(['a']);
    });

    it('is deterministic with a supplied PRNG', () => {
        const seq = () => { let i = 0; const v = [0.1, 0.7, 0.3, 0.9]; return () => v[i++ % v.length]; };
        expect(shuffleArray(['a', 'b', 'c', 'd'], seq())).toEqual(shuffleArray(['a', 'b', 'c', 'd'], seq()));
    });

    it('places the first item (the correct answer) uniformly across 4 positions', () => {
        // Regression guard for the old sort(() => Math.random() - 0.5), which
        // put the first item at position 0 ~36% and position 3 ~31% of the time.
        const runs = 40000;
        const counts = [0, 0, 0, 0];
        for (let i = 0; i < runs; i++) {
            counts[shuffleArray(['correct', 'w1', 'w2', 'w3']).indexOf('correct')] += 1;
        }
        for (const c of counts) {
            const share = c / runs;
            expect(share).toBeGreaterThan(0.23);
            expect(share).toBeLessThan(0.27);
        }
    });
});

describe('getQuestionOptions', () => {
    it('puts the correct answer first, followed by the incorrect ones', () => {
        expect(getQuestionOptions({ correct_answer: 'A', incorrect_answers: ['B', 'C', 'D'] })).toEqual(['A', 'B', 'C', 'D']);
    });
    it('returns [] for a missing question', () => {
        expect(getQuestionOptions(null)).toEqual([]);
    });
});
