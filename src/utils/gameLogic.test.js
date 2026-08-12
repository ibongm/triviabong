import { describe, it, expect, vi, afterEach } from 'vitest';
import { applyAnswer } from './gameLogic';
import { DEFAULT_GLOBAL_STATS } from '../constants/defaultGlobalStats';
import { XP_PER_CORRECT_ANSWER, COIN_STREAK_BONUS_INTERVAL, COIN_STREAK_BONUS_AMOUNT, COIN_LEVEL_UP_BONUS, COIN_PER_ROUND_COMPLETE, COIN_PERFECT_ROUND_BONUS, PERFECT_ROUND_XP_BONUS } from '../constants/gameBalance';

afterEach(() => vi.useRealTimers());

describe('applyAnswer START_ROUND', () => {
    it('increments totalGames and updates the day streak', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-05T10:00:00'));
        const { stats } = applyAnswer(DEFAULT_GLOBAL_STATS, {}, { type: 'START_ROUND' });
        expect(stats.totalGames).toBe((DEFAULT_GLOBAL_STATS.totalGames || 0) + 1);
        expect(stats.dayStreak).toBe(1);
        expect(stats.lastPlayedDate).toBe('2026-03-05');
    });
});

describe('applyAnswer ANSWER', () => {
    it('a correct answer grants XP and increments totalCorrect/totalAnswered', () => {
        const stats = { ...DEFAULT_GLOBAL_STATS, xp: 0, level: 1, unlockedAchievements: {} };
        const { stats: next } = applyAnswer(stats, {}, {
            type: 'ANSWER', isCorrect: true, pointsEarned: 150, category: 'sport', newStreak: 1,
        });
        expect(next.xp).toBe(XP_PER_CORRECT_ANSWER);
        expect(next.totalCorrect).toBe(1);
        expect(next.totalAnswered).toBe(1);
        expect(next.totalScore).toBe(150);
        expect(next.categoryStats.sport).toEqual({ total: 1, correct: 1 });
    });

    it('a wrong answer increments totalAnswered but not totalCorrect or xp', () => {
        const stats = { ...DEFAULT_GLOBAL_STATS, xp: 5, unlockedAchievements: {} };
        const { stats: next } = applyAnswer(stats, {}, {
            type: 'ANSWER', isCorrect: false, category: 'sport', newStreak: 0,
        });
        expect(next.xp).toBe(5);
        expect(next.totalAnswered).toBe(1);
        expect(next.totalCorrect).toBe(0);
    });

    it('awards a streak-interval coin bonus exactly on the interval, not off by one', () => {
        const stats = { ...DEFAULT_GLOBAL_STATS, coins: 0, xp: 0, level: 1, unlockedAchievements: {} };
        const onInterval = applyAnswer(stats, {}, {
            type: 'ANSWER', isCorrect: true, newStreak: COIN_STREAK_BONUS_INTERVAL,
        }).stats;
        expect(onInterval.coins).toBe(COIN_STREAK_BONUS_AMOUNT);

        const offInterval = applyAnswer(stats, {}, {
            type: 'ANSWER', isCorrect: true, newStreak: COIN_STREAK_BONUS_INTERVAL - 1,
        }).stats;
        expect(offInterval.coins).toBe(0);
    });

    it('awards a level-up coin bonus and a LEVEL_UP event only when xp crosses a level boundary', () => {
        const stats = { ...DEFAULT_GLOBAL_STATS, coins: 0, xp: 19, level: 1, unlockedAchievements: {} };
        const { stats: next, events } = applyAnswer(stats, {}, { type: 'ANSWER', isCorrect: true, newStreak: 1 });
        expect(next.xp).toBe(20);
        expect(next.level).toBe(2);
        expect(next.coins).toBe(COIN_LEVEL_UP_BONUS);
        expect(events).toContainEqual({ type: 'LEVEL_UP', level: 2 });
    });

    it('level never decreases even if xp math would suggest otherwise (Math.max guard)', () => {
        const stats = { ...DEFAULT_GLOBAL_STATS, xp: 500, level: 10, unlockedAchievements: {} };
        const { stats: next } = applyAnswer(stats, {}, { type: 'ANSWER', isCorrect: true, newStreak: 1 });
        expect(next.level).toBe(10);
    });

    it('accumulates per-category totals across repeated calls', () => {
        let stats = { ...DEFAULT_GLOBAL_STATS, categoryStats: {}, unlockedAchievements: {} };
        stats = applyAnswer(stats, {}, { type: 'ANSWER', isCorrect: true, category: 'glazba', newStreak: 1 }).stats;
        stats = applyAnswer(stats, {}, { type: 'ANSWER', isCorrect: false, category: 'glazba', newStreak: 0 }).stats;
        expect(stats.categoryStats.glazba).toEqual({ total: 2, correct: 1 });
    });
});

describe('applyAnswer ROUND_END', () => {
    it('a perfect round grants the perfect-round XP bonus and coin bonus', () => {
        const stats = { ...DEFAULT_GLOBAL_STATS, xp: 0, level: 1, coins: 0, unlockedAchievements: {} };
        const { stats: next } = applyAnswer(stats, {}, { type: 'ROUND_END', isPerfect: true, finalScore: 1000 });
        expect(next.xp).toBe(PERFECT_ROUND_XP_BONUS);
        expect(next.coins).toBe(COIN_PER_ROUND_COMPLETE + COIN_PERFECT_ROUND_BONUS);
    });

    it('a non-perfect round only grants the base completion coin', () => {
        const stats = { ...DEFAULT_GLOBAL_STATS, xp: 0, coins: 0, unlockedAchievements: {} };
        const { stats: next } = applyAnswer(stats, {}, { type: 'ROUND_END', isPerfect: false, finalScore: 100 });
        expect(next.xp).toBe(0);
        expect(next.coins).toBe(COIN_PER_ROUND_COMPLETE);
    });

    it('tracks consecutivePerfectRounds, resetting to 0 on a non-perfect round', () => {
        let stats = { ...DEFAULT_GLOBAL_STATS, consecutivePerfectRounds: 2, unlockedAchievements: {} };
        stats = applyAnswer(stats, {}, { type: 'ROUND_END', isPerfect: true, finalScore: 100 }).stats;
        expect(stats.consecutivePerfectRounds).toBe(3);
        stats = applyAnswer(stats, {}, { type: 'ROUND_END', isPerfect: false, finalScore: 100 }).stats;
        expect(stats.consecutivePerfectRounds).toBe(0);
    });
});

describe('applyAnswer USE_JOKER', () => {
    it('deducts the joker cost from coins', () => {
        const stats = { ...DEFAULT_GLOBAL_STATS, coins: 10, unlockedAchievements: {} };
        const { stats: next } = applyAnswer(stats, {}, { type: 'USE_JOKER', cost: 3, jokersUsedAfter: {} });
        expect(next.coins).toBe(7);
    });

    it('never lets coins go negative', () => {
        const stats = { ...DEFAULT_GLOBAL_STATS, coins: 2, unlockedAchievements: {} };
        const { stats: next } = applyAnswer(stats, {}, { type: 'USE_JOKER', cost: 5, jokersUsedAfter: {} });
        expect(next.coins).toBe(0);
    });
});

describe('applyAnswer default/unknown action', () => {
    it('returns stats unchanged for an unrecognized action type', () => {
        const stats = { ...DEFAULT_GLOBAL_STATS, coins: 5 };
        const { stats: next, events } = applyAnswer(stats, {}, { type: 'NOT_A_REAL_ACTION' });
        expect(next).toEqual(stats);
        expect(events).toEqual([]);
    });
});
