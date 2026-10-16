import { describe, it, expect } from 'vitest';
import {
    normalizeProgress,
    getUnaudited,
    selectNextBatch,
    recordRun,
    refreshCompletion,
} from './auditProgress.js';

const questions = (n) => Array.from({ length: n }, (_, i) => ({ id: `q${i + 1}` }));

describe('auditProgress', () => {
    it('normalizes missing or malformed progress to an empty one', () => {
        expect(normalizeProgress(null).categories).toEqual({});
        expect(normalizeProgress({ categories: { a: { auditedIds: 'nope' } } }).categories.a.auditedIds).toEqual([]);
    });

    it('selects unaudited questions in file order, capped by max', () => {
        const all = questions(10);
        const progress = recordRun(null, 'a', { runId: 1, date: '2026-10-16', auditedIds: ['q1', 'q2', 'q3'] }, all);
        expect(selectNextBatch(all, progress, 'a', 4).map((q) => q.id)).toEqual(['q4', 'q5', 'q6', 'q7']);
        expect(selectNextBatch(all, progress, 'a', 0)).toHaveLength(7);
        expect(selectNextBatch(all, progress, 'other', 2).map((q) => q.id)).toEqual(['q1', 'q2']);
    });

    it('does not mark ids from failed batches as audited', () => {
        const all = questions(6);
        const progress = recordRun(
            null,
            'a',
            { runId: 1, date: '2026-10-16', auditedIds: ['q1', 'q2'], failedBatches: 1 },
            all
        );
        expect(getUnaudited(all, progress, 'a').map((q) => q.id)).toEqual(['q3', 'q4', 'q5', 'q6']);
        expect(progress.categories.a.complete).toBe(false);
        expect(progress.categories.a.runs[0].failedBatches).toBe(1);
    });

    it('is keyed by id, so added questions are picked up and removed ones are ignored', () => {
        const all = questions(3);
        const progress = recordRun(null, 'a', { runId: 1, date: '2026-10-16', auditedIds: ['q1', 'q2', 'q3'] }, all);
        expect(progress.categories.a.complete).toBe(true);

        const grown = [{ id: 'q0' }, ...all.filter((q) => q.id !== 'q2'), { id: 'q9' }];
        expect(getUnaudited(grown, progress, 'a').map((q) => q.id)).toEqual(['q0', 'q9']);
        expect(refreshCompletion(progress, 'a', grown).categories.a.complete).toBe(false);
        expect(refreshCompletion(progress, 'a', all).categories.a.complete).toBe(true);
    });

    it('appends runs and never repeats an id across two runs', () => {
        const all = questions(5);
        let progress = recordRun(null, 'a', { runId: 1, date: '2026-10-16', auditedIds: ['q1', 'q2'], modifiedIds: ['q2'] }, all);
        const second = selectNextBatch(all, progress, 'a', 2).map((q) => q.id);
        expect(second).toEqual(['q3', 'q4']);
        progress = recordRun(progress, 'a', { runId: 2, date: '2026-10-17', auditedIds: second }, all);
        expect(progress.categories.a.auditedIds).toEqual(['q1', 'q2', 'q3', 'q4']);
        expect(progress.categories.a.runs.map((r) => r.runId)).toEqual(['1', '2']);
        expect(progress.categories.a.runs[0].modifiedIds).toEqual(['q2']);
    });
});
