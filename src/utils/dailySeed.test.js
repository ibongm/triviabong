import { describe, it, expect } from 'vitest';
import { selectDailyQuestions, isEligibleForDate } from './dailySeed';

// Fabricated pool - the selection step is pure, so these tests never touch
// questionsLoader.js or the bundled JSON.
const makePool = (n, prefix = 'hr_test', extra = {}) =>
    Array.from({ length: n }, (_, i) => ({ id: `${prefix}_${i + 1}`, question: `Q${i + 1}`, ...extra }));

const ids = (qs) => qs.map((q) => q.id);

describe('selectDailyQuestions', () => {
    const pool = makePool(500);

    it('returns 10 distinct questions by default', () => {
        const picked = selectDailyQuestions(pool, '2026-10-10');
        expect(picked).toHaveLength(10);
        expect(new Set(ids(picked)).size).toBe(10);
    });

    it('is deterministic for the same date and pool', () => {
        expect(ids(selectDailyQuestions(pool, '2026-10-10'))).toEqual(ids(selectDailyQuestions(pool, '2026-10-10')));
    });

    it('does not depend on pool order', () => {
        const reversed = [...pool].reverse();
        expect(ids(selectDailyQuestions(reversed, '2026-10-10'))).toEqual(ids(selectDailyQuestions(pool, '2026-10-10')));
    });

    it('gives different sets on different dates', () => {
        const a = ids(selectDailyQuestions(pool, '2026-10-10'));
        const b = ids(selectDailyQuestions(pool, '2026-10-11'));
        expect(a).not.toEqual(b);
    });

    it('keeps the day\'s set unchanged when questions are added that same day (the bug this fixes)', () => {
        const before = ids(selectDailyQuestions(pool, '2026-10-10'));
        const added = makePool(200, 'hr_new', { addedOn: '2026-10-10' });
        const after = ids(selectDailyQuestions([...pool, ...added], '2026-10-10'));
        expect(after).toEqual(before);
    });

    it('never picks questions added on a later date', () => {
        const future = makePool(1000, 'hr_future', { addedOn: '2026-12-01' });
        const picked = selectDailyQuestions([...makePool(20), ...future], '2026-10-10');
        expect(picked.every((q) => !q.addedOn)).toBe(true);
    });

    it('lets yesterday\'s additions compete from the next day on', () => {
        const added = makePool(5000, 'hr_new', { addedOn: '2026-10-09' });
        const picked = selectDailyQuestions([...pool, ...added], '2026-10-10');
        // 5000 of 5500 eligible questions are new; with a uniform hash the
        // chance that none of the 10 is new is ~(1/11)^10 - effectively zero.
        expect(picked.some((q) => q.addedOn === '2026-10-09')).toBe(true);
    });

    it('removing an unpicked question leaves the set unchanged', () => {
        const picked = ids(selectDailyQuestions(pool, '2026-10-10'));
        const victim = pool.find((q) => !picked.includes(q.id));
        const smaller = pool.filter((q) => q !== victim);
        expect(ids(selectDailyQuestions(smaller, '2026-10-10'))).toEqual(picked);
    });

    it('ignores duplicate ids and entries without an id', () => {
        const messy = [...makePool(15), ...makePool(15), { question: 'no id' }, null];
        const picked = selectDailyQuestions(messy, '2026-10-10');
        expect(picked).toHaveLength(10);
        expect(new Set(ids(picked)).size).toBe(10);
    });

    it('returns everything eligible when the pool is smaller than the count', () => {
        expect(selectDailyQuestions(makePool(4), '2026-10-10')).toHaveLength(4);
    });

    it('spreads picks across the pool rather than clustering on adjacent ids', () => {
        // Guards the fmix32 finalizer: raw djb2 on "date|prefix_N" would rank
        // neighbouring ids together.
        const nums = ids(selectDailyQuestions(pool, '2026-10-10')).map((id) => Number(id.split('_').pop())).sort((a, b) => a - b);
        expect(nums[nums.length - 1] - nums[0]).toBeGreaterThan(100);
    });
});

describe('isEligibleForDate', () => {
    it('treats questions without addedOn as always eligible', () => {
        expect(isEligibleForDate({ id: 'a' }, '2026-10-10')).toBe(true);
    });
    it('excludes questions added on the same date or later', () => {
        expect(isEligibleForDate({ id: 'a', addedOn: '2026-10-10' }, '2026-10-10')).toBe(false);
        expect(isEligibleForDate({ id: 'a', addedOn: '2026-10-11' }, '2026-10-10')).toBe(false);
    });
    it('includes questions added before the date', () => {
        expect(isEligibleForDate({ id: 'a', addedOn: '2026-10-09' }, '2026-10-10')).toBe(true);
    });
});
