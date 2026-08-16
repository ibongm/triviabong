import { describe, it, expect, vi, afterEach } from 'vitest';
import { applyAnswer } from './gameLogic';
import { DEFAULT_GLOBAL_STATS } from '../constants/defaultGlobalStats';
import { XP_PER_CORRECT_ANSWER, COIN_STREAK_MILESTONES } from '../constants/gameBalance';
import { getCoinsForLevelUp } from './leveling';
import { getTitleForLevel } from '../constants/levelTitles';
import { ACHIEVEMENTS } from '../constants/achievements';

afterEach(() => vi.useRealTimers());

// Pre-unlocked so evaluateAchievements (called internally by applyAnswer)
// never fires a real achievement mid-test - achievements now pay real
// xp/coins (see gameLogic.js's applyAchievementRewards), and several checks
// here would otherwise spuriously trigger off these tests' fixture values
// (e.g. first_blood on any totalCorrect >= 1, lightning_reflexes on the
// default 20s timeLeft, early_bird on the real wall-clock hour) and pollute
// the exact xp/coin assertions below.
const ALL_ACHIEVEMENTS_UNLOCKED = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, true]));

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
        const stats = { ...DEFAULT_GLOBAL_STATS, xp: 0, level: 1, unlockedAchievements: ALL_ACHIEVEMENTS_UNLOCKED };
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
        const stats = { ...DEFAULT_GLOBAL_STATS, xp: 5, unlockedAchievements: ALL_ACHIEVEMENTS_UNLOCKED };
        const { stats: next } = applyAnswer(stats, {}, {
            type: 'ANSWER', isCorrect: false, category: 'sport', newStreak: 0,
        });
        expect(next.xp).toBe(5);
        expect(next.totalAnswered).toBe(1);
        expect(next.totalCorrect).toBe(0);
    });

    it('a question timeout (timeLeft: 0) behaves as an incorrect answer without granting xp or incrementing totalCorrect', () => {
        const stats = { ...DEFAULT_GLOBAL_STATS, xp: 10, totalAnswered: 3, totalCorrect: 2, unlockedAchievements: ALL_ACHIEVEMENTS_UNLOCKED };
        const { stats: next } = applyAnswer(stats, {}, {
            type: 'ANSWER', isCorrect: false, category: 'film', timeLeft: 0, newStreak: 0,
        });
        expect(next.xp).toBe(10);
        expect(next.totalAnswered).toBe(4);
        expect(next.totalCorrect).toBe(2);
        expect(next.categoryStats.film).toEqual({ total: 1, correct: 0 });
    });

    it('awards a streak-milestone coin bonus exactly at 3/5/10, not off by one', () => {
        const stats = { ...DEFAULT_GLOBAL_STATS, coins: 0, xp: 0, level: 1, unlockedAchievements: ALL_ACHIEVEMENTS_UNLOCKED };
        const onMilestone = applyAnswer(stats, {}, {
            type: 'ANSWER', isCorrect: true, newStreak: 3,
        }).stats;
        expect(onMilestone.coins).toBe(COIN_STREAK_MILESTONES[3]);

        const offMilestone = applyAnswer(stats, {}, {
            type: 'ANSWER', isCorrect: true, newStreak: 4,
        }).stats;
        expect(offMilestone.coins).toBe(0);
    });

    it('awards a level-up coin bonus and a LEVEL_UP event (with title) only when xp crosses a level boundary', () => {
        const stats = { ...DEFAULT_GLOBAL_STATS, coins: 0, xp: 24, level: 1, unlockedAchievements: ALL_ACHIEVEMENTS_UNLOCKED };
        const { stats: next, events } = applyAnswer(stats, {}, { type: 'ANSWER', isCorrect: true, newStreak: 1 });
        expect(next.xp).toBe(25);
        expect(next.level).toBe(2);
        expect(next.coins).toBe(getCoinsForLevelUp(2));
        expect(events).toContainEqual({ type: 'LEVEL_UP', level: 2, coins: getCoinsForLevelUp(2), title: getTitleForLevel(2) });
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
    it('grants no direct xp/coin income - round-completion/perfect-round payouts were cut', () => {
        const stats = { ...DEFAULT_GLOBAL_STATS, xp: 0, level: 1, coins: 0, unlockedAchievements: ALL_ACHIEVEMENTS_UNLOCKED };
        const { stats: next } = applyAnswer(stats, {}, { type: 'ROUND_END', isPerfect: true, finalScore: 1000 });
        expect(next.xp).toBe(0);
        expect(next.coins).toBe(0);
    });

    it('still awards a level-up coin bonus if xp already crossed a boundary going in', () => {
        const stats = { ...DEFAULT_GLOBAL_STATS, xp: 25, level: 1, coins: 0, unlockedAchievements: ALL_ACHIEVEMENTS_UNLOCKED };
        const { stats: next, events } = applyAnswer(stats, {}, { type: 'ROUND_END', isPerfect: false, finalScore: 100 });
        expect(next.level).toBe(2);
        expect(next.coins).toBe(getCoinsForLevelUp(2));
        expect(events).toContainEqual({ type: 'LEVEL_UP', level: 2, coins: getCoinsForLevelUp(2), title: getTitleForLevel(2) });
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
