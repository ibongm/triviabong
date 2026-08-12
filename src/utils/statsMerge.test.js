import { describe, it, expect } from 'vitest';
import { mergeMonotonicStats } from './statsMerge';

describe('mergeMonotonicStats', () => {
    it('returns current (or {}) when incoming is missing/invalid', () => {
        expect(mergeMonotonicStats({ level: 5 }, null)).toEqual({ level: 5 });
        expect(mergeMonotonicStats(undefined, null)).toEqual({});
        expect(mergeMonotonicStats({ level: 5 }, 'not-an-object')).toEqual({ level: 5 });
    });

    it('takes the max of each monotonic numeric field, never regressing', () => {
        const current = { level: 5, xp: 300, coins: 10, totalGames: 20 };
        const incoming = { level: 3, xp: 999, coins: 2, totalGames: 20 };
        const merged = mergeMonotonicStats(current, incoming);
        expect(merged.level).toBe(5);
        expect(merged.xp).toBe(999);
        expect(merged.coins).toBe(10);
        expect(merged.totalGames).toBe(20);
    });

    it('treats a missing/non-numeric field as 0, not as skipping the max', () => {
        const merged = mergeMonotonicStats({ maxStreak: 7 }, { maxStreak: 'oops' });
        expect(merged.maxStreak).toBe(7);
    });

    it('unions unlockedAchievements dictionaries, incoming winning on key overlap', () => {
        const current = { unlockedAchievements: { first_blood: '2026-01-01', on_fire: '2026-01-01' } };
        const incoming = { unlockedAchievements: { on_fire: '2026-01-02', perfectionist: '2026-01-02' } };
        const merged = mergeMonotonicStats(current, incoming);
        expect(merged.unlockedAchievements).toEqual({
            first_blood: '2026-01-01',
            on_fire: '2026-01-02',
            perfectionist: '2026-01-02',
        });
    });

    it('merges per-category stats with max on answered/correct/games, union of categories', () => {
        const current = { categoryStats: { sport: { answered: 10, correct: 8, games: 2 } } };
        const incoming = {
            categoryStats: {
                sport: { answered: 5, correct: 12, games: 1 },
                glazba: { answered: 3, correct: 3, games: 1 },
            },
        };
        const merged = mergeMonotonicStats(current, incoming);
        expect(merged.categoryStats).toEqual({
            sport: { answered: 10, correct: 12, games: 2 },
            glazba: { answered: 3, correct: 3, games: 1 },
        });
    });

    it('does not touch categoryStats when neither side has any', () => {
        const merged = mergeMonotonicStats({ level: 1 }, { level: 2 });
        expect(merged.categoryStats).toBeUndefined();
    });
});
