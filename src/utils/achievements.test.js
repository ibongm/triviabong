import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    mentionsHarryPotter,
    evaluateAchievements,
    revokeStaleAchievements,
    mergeUnlockedAchievements,
    getZagrebDateString,
    daysBetweenLocalDates,
    computeDayStreakUpdate,
} from './achievements';

describe('mentionsHarryPotter', () => {
    it('matches the declined stem across question/answer fields', () => {
        expect(mentionsHarryPotter({ question: 'Tko je napisao o Harryju Potteru?' })).toBe(true);
        expect(mentionsHarryPotter({ correct_answer: 'J.K. Rowling (Harry Potter)' })).toBe(true);
        expect(mentionsHarryPotter({ incorrect_answers: ['Nešto', 'Pottera'] })).toBe(true);
    });

    it('is case-insensitive', () => {
        expect(mentionsHarryPotter({ question: 'POTTER' })).toBe(true);
    });

    it('returns false for unrelated questions or missing input', () => {
        expect(mentionsHarryPotter({ question: 'Koji je glavni grad Francuske?' })).toBe(false);
        expect(mentionsHarryPotter(null)).toBe(false);
        expect(mentionsHarryPotter({})).toBe(false);
    });
});

describe('evaluateAchievements', () => {
    it('unlocks a satisfied achievement not yet in unlockedAchievements', () => {
        const stats = { totalCorrect: 1, unlockedAchievements: {} };
        const unlocked = evaluateAchievements(stats, {});
        expect(unlocked).toContain('first_blood');
    });

    it('never re-unlocks an already-unlocked achievement', () => {
        const stats = { totalCorrect: 1, unlockedAchievements: { first_blood: '2026-01-01' } };
        const unlocked = evaluateAchievements(stats, {});
        expect(unlocked).not.toContain('first_blood');
    });

    it('absent ctx fields evaluate false rather than throwing', () => {
        const stats = { unlockedAchievements: {} };
        expect(() => evaluateAchievements(stats, {})).not.toThrow();
        const unlocked = evaluateAchievements(stats, {});
        expect(unlocked).not.toContain('night_owl');
    });
});

describe('revokeStaleAchievements', () => {
    it('revokes a statOnly achievement whose condition no longer holds', () => {
        const stats = {
            totalCorrect: 0,
            unlockedAchievements: { first_blood: '2026-01-01' },
        };
        expect(revokeStaleAchievements(stats)).toContain('first_blood');
    });

    it('never revokes a non-statOnly achievement, even if it would fail a re-check', () => {
        const stats = {
            unlockedAchievements: { night_owl: '2026-01-01' }, // needs ctx.hour, absent here
        };
        expect(revokeStaleAchievements(stats)).not.toContain('night_owl');
    });

    it('does not revoke an achievement that still holds', () => {
        const stats = { totalCorrect: 5, unlockedAchievements: { first_blood: '2026-01-01' } };
        expect(revokeStaleAchievements(stats)).not.toContain('first_blood');
    });
});

describe('mergeUnlockedAchievements', () => {
    it('stamps each new id with the current time without mutating existing entries', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-01T12:00:00Z'));
        const stats = { unlockedAchievements: { first_blood: '2025-01-01T00:00:00.000Z' } };
        const merged = mergeUnlockedAchievements(stats, ['on_fire']);
        expect(merged.first_blood).toBe('2025-01-01T00:00:00.000Z');
        expect(merged.on_fire).toBe('2026-03-01T12:00:00.000Z');
        vi.useRealTimers();
    });

    it('returns the existing dict unchanged when there is nothing new', () => {
        const stats = { unlockedAchievements: { first_blood: 'x' } };
        expect(mergeUnlockedAchievements(stats, [])).toBe(stats.unlockedAchievements);
    });
});

describe('getZagrebDateString', () => {
    it('formats an injected date as YYYY-MM-DD in the Zagreb timezone', () => {
        // 23:30 UTC on 2026-06-30 is past midnight in Zagreb (UTC+2 in summer).
        const result = getZagrebDateString(new Date('2026-06-30T23:30:00Z'));
        expect(result).toBe('2026-07-01');
    });
});

describe('daysBetweenLocalDates', () => {
    it('computes whole-day differences via UTC, DST-safely', () => {
        expect(daysBetweenLocalDates('2026-03-01', '2026-03-02')).toBe(1);
        expect(daysBetweenLocalDates('2026-03-01', '2026-03-01')).toBe(0);
        expect(daysBetweenLocalDates('2026-03-01', '2026-02-28')).toBe(-1);
    });
});

describe('computeDayStreakUpdate', () => {
    afterEach(() => vi.useRealTimers());

    it('starts a fresh streak at 1 when there is no lastPlayedDate', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-05T10:00:00'));
        const { dayStreak, lastPlayedDate } = computeDayStreakUpdate({});
        expect(dayStreak).toBe(1);
        expect(lastPlayedDate).toBe('2026-03-05');
    });

    it('is a no-op on a same-day replay', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-05T18:00:00'));
        const { dayStreak, lastPlayedDate } = computeDayStreakUpdate({ dayStreak: 4, lastPlayedDate: '2026-03-05' });
        expect(dayStreak).toBe(4);
        expect(lastPlayedDate).toBe('2026-03-05');
    });

    it('increments the streak on a consecutive-day gap', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-06T09:00:00'));
        const { dayStreak } = computeDayStreakUpdate({ dayStreak: 4, lastPlayedDate: '2026-03-05' });
        expect(dayStreak).toBe(5);
    });

    it('resets to 1 on a gap of more than one day', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-10T09:00:00'));
        const { dayStreak } = computeDayStreakUpdate({ dayStreak: 4, lastPlayedDate: '2026-03-05' });
        expect(dayStreak).toBe(1);
    });

    it('resets to 1 if the clock appears to have moved backward', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-01T09:00:00'));
        const { dayStreak } = computeDayStreakUpdate({ dayStreak: 4, lastPlayedDate: '2026-03-05' });
        expect(dayStreak).toBe(1);
    });
});
