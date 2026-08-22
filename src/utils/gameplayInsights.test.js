import { describe, it, expect } from 'vitest';
import {
    summarizeQuestionAccuracy,
    summarizeCategoryPopularity,
    summarizeQuestionAccuracyFromStats,
    summarizeCategoryPopularityFromStats,
} from './gameplayInsights';

const TEXT = { q1: 'Prvo pitanje', q2: 'Drugo pitanje' };

describe('summarizeQuestionAccuracyFromStats', () => {
    it('maps counter docs into the same shape the raw path produces', () => {
        const [row] = summarizeQuestionAccuracyFromStats(
            [{ questionId: 'q1', categoryId: 'geografija', total: 4, correct: 1, wrong: 3 }],
            TEXT,
        );
        expect(row).toEqual({
            questionId: 'q1',
            categoryId: 'geografija',
            totalAttempts: 4,
            correctCount: 1,
            question: 'Prvo pitanje',
            accuracy: 0.25,
        });
    });

    it('sorts worst-accuracy first', () => {
        const rows = summarizeQuestionAccuracyFromStats([
            { questionId: 'q1', categoryId: 'a', total: 2, correct: 2, wrong: 0 },
            { questionId: 'q2', categoryId: 'a', total: 2, correct: 0, wrong: 2 },
        ], TEXT);
        expect(rows.map((r) => r.questionId)).toEqual(['q2', 'q1']);
    });

    it('falls back to the id when the question text is unknown', () => {
        const [row] = summarizeQuestionAccuracyFromStats(
            [{ questionId: 'missing', categoryId: 'a', total: 1, correct: 0, wrong: 1 }],
            TEXT,
        );
        expect(row.question).toBe('missing');
    });

    it('drops zero-attempt counters instead of rendering them as 0%', () => {
        const rows = summarizeQuestionAccuracyFromStats(
            [{ questionId: 'q1', categoryId: 'a', total: 0, correct: 0, wrong: 0 }],
            TEXT,
        );
        expect(rows).toEqual([]);
    });

    it('handles missing/empty input without throwing', () => {
        expect(summarizeQuestionAccuracyFromStats(undefined)).toEqual([]);
        expect(summarizeQuestionAccuracyFromStats([null, {}])).toEqual([]);
    });
});

describe('summarizeCategoryPopularityFromStats', () => {
    it('derives avgScore and winRate from the counters', () => {
        const [row] = summarizeCategoryPopularityFromStats([
            { category: 'sport', plays: 4, totalScore: 1000, victories: 1 },
        ]);
        expect(row).toEqual({
            category: 'sport',
            plays: 4,
            totalScore: 1000,
            victories: 1,
            avgScore: 250,
            winRate: 0.25,
        });
    });

    it('sorts most-played first', () => {
        const rows = summarizeCategoryPopularityFromStats([
            { category: 'a', plays: 1, totalScore: 0, victories: 0 },
            { category: 'b', plays: 9, totalScore: 0, victories: 0 },
        ]);
        expect(rows.map((r) => r.category)).toEqual(['b', 'a']);
    });

    it('drops zero-play counters', () => {
        expect(summarizeCategoryPopularityFromStats([{ category: 'a', plays: 0 }])).toEqual([]);
    });
});

// The counter path and the raw path feed the same AdminOverview tables, and
// the admin-only recompute rebuilds the counters from the raw rows - so if
// these two ever disagree, a rebuild would silently change what the admin
// sees. Pin them to the same output for the same underlying events.
describe('counter path agrees with the raw path', () => {
    it('produces identical accuracy rows for equivalent input', () => {
        const attempts = [
            { questionId: 'q1', categoryId: 'geografija', correct: true },
            { questionId: 'q1', categoryId: 'geografija', correct: false },
            { questionId: 'q2', categoryId: 'sport', correct: false },
        ];
        const stats = [
            { questionId: 'q1', categoryId: 'geografija', total: 2, correct: 1, wrong: 1 },
            { questionId: 'q2', categoryId: 'sport', total: 1, correct: 0, wrong: 1 },
        ];
        expect(summarizeQuestionAccuracyFromStats(stats, TEXT))
            .toEqual(summarizeQuestionAccuracy(attempts, TEXT));
    });

    it('produces identical popularity rows for equivalent input', () => {
        const results = [
            { category: 'sport', score: 300, outcome: 'VICTORY' },
            { category: 'sport', score: 100, outcome: 'GAMEOVER' },
        ];
        const stats = [{ category: 'sport', plays: 2, totalScore: 400, victories: 1 }];
        expect(summarizeCategoryPopularityFromStats(stats))
            .toEqual(summarizeCategoryPopularity(results));
    });
});
