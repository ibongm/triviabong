import { describe, it, expect } from 'vitest';
import { applyOneVsOneWin } from './oneVsOneReward';
import { DEFAULT_GLOBAL_STATS } from '../constants/defaultGlobalStats';
import { ONE_VS_ONE_WIN_XP, ONE_VS_ONE_WIN_COINS } from '../constants/gameBalance';
import { xpForLevel } from './leveling';
import { sanitizeProgress } from './duelProgress';

describe('applyOneVsOneWin', () => {
    it('adds the 1v1 win xp, coins and win counter', () => {
        const prev = { ...DEFAULT_GLOBAL_STATS, xp: 0, level: 1, coins: 10, total1v1Wins: 2 };
        const next = applyOneVsOneWin(prev);
        expect(next.xp).toBe(ONE_VS_ONE_WIN_XP);
        expect(next.total1v1Wins).toBe(3);
        expect(next.coins).toBeGreaterThanOrEqual(10 + ONE_VS_ONE_WIN_COINS);
    });
    it('does not mutate its input and never lowers the level', () => {
        const prev = { ...DEFAULT_GLOBAL_STATS, xp: 0, level: 7, coins: 0 };
        const snapshot = JSON.stringify(prev);
        const next = applyOneVsOneWin(prev);
        expect(JSON.stringify(prev)).toBe(snapshot);
        expect(next.level).toBeGreaterThanOrEqual(7);
    });
    it('pays level-up coins when the win crosses a level boundary', () => {
        const prev = { ...DEFAULT_GLOBAL_STATS, xp: xpForLevel(2) - 1, level: 1, coins: 0 };
        const next = applyOneVsOneWin(prev);
        expect(next.level).toBe(2);
        expect(next.coins).toBeGreaterThan(ONE_VS_ONE_WIN_COINS);
    });
});

describe('sanitizeProgress', () => {
    it('keeps well-formed entries, caps at 10, rejects non-arrays', () => {
        expect(sanitizeProgress(null)).toEqual([]);
        expect(sanitizeProgress('x')).toEqual([]);
        expect(sanitizeProgress(Array.from({ length: 14 }, () => ({ c: true, t: 1000 })))).toHaveLength(10);
        expect(sanitizeProgress([{ c: 'yes', t: 'abc' }])).toEqual([{ c: false, t: 0 }]);
    });
});
