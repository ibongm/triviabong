import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMatchQuestionOptions, isMatchAnswerCorrect, pickMatchQuestionIds } from './matchQuestions';

// Fabricated question - deliberately doesn't touch questionsLoader.js (and
// its 1.8MB of bundled JSON), since getMatchQuestionOptions/
// isMatchAnswerCorrect only need a question-shaped object, not the real pool.
const question = {
    id: 'test_q_1',
    correct_answer: 'Correct',
    incorrect_answers: ['Wrong A', 'Wrong B', 'Wrong C'],
};

describe('getMatchQuestionOptions', () => {
    it('is deterministic for the same (matchId, question) pair', () => {
        const a = getMatchQuestionOptions('match-1', question);
        const b = getMatchQuestionOptions('match-1', question);
        expect(a).toEqual(b);
    });

    it('produces a different order for a different matchId (the fairness guarantee)', () => {
        // Not guaranteed for every possible id, but true for this fixture -
        // if this ever flakes, it's a real signal the seeding broke.
        const forMatchA = getMatchQuestionOptions('match-a', question);
        const forMatchB = getMatchQuestionOptions('match-b', question);
        expect(forMatchA).not.toEqual(forMatchB);
    });

    it('always contains exactly the same 4 options, just reordered', () => {
        const options = getMatchQuestionOptions('any-match', question);
        expect(options.sort()).toEqual(
            [question.correct_answer, ...question.incorrect_answers].sort()
        );
    });

    it('returns an empty array for a missing question', () => {
        expect(getMatchQuestionOptions('match-1', null)).toEqual([]);
    });
});

describe('isMatchAnswerCorrect', () => {
    it('identifies the correct option regardless of where the seeded shuffle placed it', () => {
        const options = getMatchQuestionOptions('match-1', question);
        const correctIndex = options.indexOf(question.correct_answer);
        expect(isMatchAnswerCorrect('match-1', question, correctIndex)).toBe(true);
    });

    it('rejects a wrong option index', () => {
        const options = getMatchQuestionOptions('match-1', question);
        const wrongIndex = options.indexOf('Wrong A');
        expect(isMatchAnswerCorrect('match-1', question, wrongIndex)).toBe(false);
    });

    it('returns false for a missing question or null optionIndex', () => {
        expect(isMatchAnswerCorrect('match-1', null, 0)).toBe(false);
        expect(isMatchAnswerCorrect('match-1', question, null)).toBe(false);
    });
});

// pickMatchQuestionIds reaches into questionsLoader (which lazily imports the
// real ~5,900-question JSON), so the loader is mocked to keep this a pure
// logic test with a pool small enough to assert on exactly.
const pools = vi.hoisted(() => ({ category: [], all: [] }));
vi.mock('../data/questionsLoader', () => ({
    getQuestionsByCategory: async () => pools.category,
    getAllQuestions: async () => pools.all,
}));

const q = (id, category) => ({ id, category });

describe('pickMatchQuestionIds', () => {
    beforeEach(() => {
        // 30 in-category questions, plus a wider pool that also contains them.
        pools.category = Array.from({ length: 30 }, (_, i) => q(`geo_${i}`, 'geografija'));
        pools.all = [
            ...pools.category,
            ...Array.from({ length: 200 }, (_, i) => q(`hist_${i}`, 'povijest')),
        ];
    });

    it('picks 11 questions', async () => {
        expect(await pickMatchQuestionIds('geografija')).toHaveLength(11);
    });

    it('takes them ALL from the chosen category when it has enough', async () => {
        // The regression: the category pool used to be concatenated with the
        // full set and shuffled together, so most picks came from elsewhere.
        for (let run = 0; run < 20; run++) {
            const ids = await pickMatchQuestionIds('geografija');
            expect(ids.every(id => id.startsWith('geo_'))).toBe(true);
        }
    });

    it('never repeats a question within one match', async () => {
        for (let run = 0; run < 20; run++) {
            const ids = await pickMatchQuestionIds('geografija');
            expect(new Set(ids).size).toBe(ids.length);
        }
    });

    it('varies between matches rather than returning a fixed slice', async () => {
        const seen = new Set();
        for (let run = 0; run < 15; run++) {
            seen.add((await pickMatchQuestionIds('geografija')).join(','));
        }
        expect(seen.size).toBeGreaterThan(1);
    });

    it('tops up from the wider pool when the category is short', async () => {
        pools.category = [q('geo_0', 'geografija'), q('geo_1', 'geografija')];
        const ids = await pickMatchQuestionIds('geografija');
        expect(ids).toHaveLength(11);
        expect(ids).toEqual(expect.arrayContaining(['geo_0', 'geo_1']));
        expect(new Set(ids).size).toBe(11);
    });

    it('does not duplicate a category question when topping up', async () => {
        // geo_0/geo_1 also live in the fallback pool, so a naive top-up would
        // pick them a second time.
        pools.category = [q('geo_0', 'geografija'), q('geo_1', 'geografija')];
        for (let run = 0; run < 20; run++) {
            const ids = await pickMatchQuestionIds('geografija');
            expect(new Set(ids).size).toBe(ids.length);
        }
    });

    it('returns what it can when both pools are tiny', async () => {
        pools.category = [q('geo_0', 'geografija')];
        pools.all = [q('geo_0', 'geografija'), q('hist_0', 'povijest')];
        const ids = await pickMatchQuestionIds('geografija');
        expect(ids.sort()).toEqual(['geo_0', 'hist_0']);
    });

    it('skips malformed entries with no id', async () => {
        pools.category = [q('geo_0', 'geografija'), null, { category: 'x' }];
        pools.all = [q('geo_0', 'geografija'), q('hist_0', 'povijest')];
        const ids = await pickMatchQuestionIds('geografija');
        expect(ids).not.toContain(undefined);
        expect(ids).toContain('geo_0');
    });
});
