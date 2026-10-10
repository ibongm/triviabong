import { describe, it, expect } from 'vitest';
import {
    weekKeyForDateKey, weekKeyFor, weekStartDateKey, weekEndDateKey, addWeeks, weeksBetween,
    isValidWeekKey, zagrebMidnightMs, msUntilWeekEnd, formatWeekCountdown,
    seasonEndWeek, seasonForWeek, nextSeasonAfter, zagrebDateKey,
} from './periods.js';
import { SEASONS } from '../constants/seasons.js';

describe('weekKeyForDateKey', () => {
    it('keys an ordinary date', () => {
        expect(weekKeyForDateKey('2026-10-10')).toBe('2026-W41'); // Saturday
        expect(weekKeyForDateKey('2026-10-05')).toBe('2026-W41'); // Monday of the same week
        expect(weekKeyForDateKey('2026-10-11')).toBe('2026-W41'); // Sunday of the same week
        expect(weekKeyForDateKey('2026-10-12')).toBe('2026-W42');
    });

    it('handles year boundaries (ISO week-year, 52/53 -> 1)', () => {
        // 2026 starts on a Thursday, so it has 53 weeks and Jan 1-3 2027 are still in it.
        expect(weekKeyForDateKey('2026-12-31')).toBe('2026-W53');
        expect(weekKeyForDateKey('2027-01-01')).toBe('2026-W53');
        expect(weekKeyForDateKey('2027-01-03')).toBe('2026-W53');
        expect(weekKeyForDateKey('2027-01-04')).toBe('2027-W01');
        // Early days of January that belong to the previous ISO year:
        expect(weekKeyForDateKey('2025-12-29')).toBe('2026-W01');
        expect(weekKeyForDateKey('2024-12-30')).toBe('2025-W01');
        expect(weekKeyForDateKey('2021-01-03')).toBe('2020-W53');
        expect(weekKeyForDateKey('2025-12-28')).toBe('2025-W52');
    });

    it('handles leap years', () => {
        expect(weekKeyForDateKey('2024-02-29')).toBe('2024-W09');
        expect(weekKeyForDateKey('2024-12-31')).toBe('2025-W01');
    });
});

describe('weekKeyFor (Zagreb calendar, DST-safe)', () => {
    it('rolls over at Zagreb midnight in winter (CET, UTC+1)', () => {
        // Sun 2026-01-04 22:59 UTC = 23:59 Zagreb -> still W01; 23:00 UTC = Mon 00:00 Zagreb -> W02.
        expect(weekKeyFor(new Date('2026-01-04T22:59:00Z'))).toBe('2026-W01');
        expect(weekKeyFor(new Date('2026-01-04T23:00:00Z'))).toBe('2026-W02');
    });

    it('rolls over at Zagreb midnight in summer (CEST, UTC+2)', () => {
        // Sun 2026-07-12 21:59 UTC = 23:59 Zagreb; 22:00 UTC = Mon 00:00 Zagreb.
        const before = weekKeyFor(new Date('2026-07-12T21:59:00Z'));
        const after = weekKeyFor(new Date('2026-07-12T22:00:00Z'));
        expect(before).toBe('2026-W28');
        expect(after).toBe('2026-W29');
    });

    it('is correct across the DST switch weekends', () => {
        // CET -> CEST on Sun 2026-03-29; Zagreb Monday starts 22:00 UTC the day before.
        expect(weekKeyFor(new Date('2026-03-29T21:59:00Z'))).toBe('2026-W13');
        expect(weekKeyFor(new Date('2026-03-29T22:00:00Z'))).toBe('2026-W14');
        // CEST -> CET on Sun 2026-10-25; Monday 2026-10-26 starts 23:00 UTC.
        expect(weekKeyFor(new Date('2026-10-25T22:59:00Z'))).toBe('2026-W43');
        expect(weekKeyFor(new Date('2026-10-25T23:00:00Z'))).toBe('2026-W44');
    });
});

describe('week arithmetic', () => {
    it('finds Monday and Sunday of a week', () => {
        expect(weekStartDateKey('2026-W41')).toBe('2026-10-05');
        expect(weekEndDateKey('2026-W41')).toBe('2026-10-11');
        expect(weekStartDateKey('2026-W01')).toBe('2025-12-29');
        expect(weekStartDateKey('2027-W01')).toBe('2027-01-04');
        expect(weekStartDateKey('2026-W53')).toBe('2026-12-28');
    });

    it('round-trips every week of several years', () => {
        for (let year = 2020; year <= 2032; year += 1) {
            let key = `${year}-W01`;
            for (let i = 0; i < 53; i += 1) {
                expect(weekKeyForDateKey(weekStartDateKey(key))).toBe(key);
                expect(weekKeyForDateKey(weekEndDateKey(key))).toBe(key);
                key = addWeeks(key, 1);
                if (key.startsWith(`${year + 1}-`)) break;
            }
        }
    });

    it('adds weeks across year boundaries (52/53 -> 1)', () => {
        expect(addWeeks('2026-W52', 1)).toBe('2026-W53');
        expect(addWeeks('2026-W53', 1)).toBe('2027-W01');
        expect(addWeeks('2025-W52', 1)).toBe('2026-W01'); // 2025 has 52 weeks
        expect(addWeeks('2027-W01', -1)).toBe('2026-W53');
        expect(addWeeks('2026-W44', 7)).toBe('2026-W51');
    });

    it('counts weeks between two keys', () => {
        expect(weeksBetween('2026-W44', '2026-W51')).toBe(7);
        expect(weeksBetween('2026-W53', '2027-W02')).toBe(2);
        expect(weeksBetween('2027-W02', '2026-W53')).toBe(-2);
        expect(weeksBetween('2026-W41', '2026-W41')).toBe(0);
    });

    it('validates week keys', () => {
        expect(isValidWeekKey('2026-W41')).toBe(true);
        expect(isValidWeekKey('2026-W53')).toBe(true);
        expect(isValidWeekKey('2025-W53')).toBe(false); // 2025 has only 52 weeks
        expect(isValidWeekKey('2026-W00')).toBe(false);
        expect(isValidWeekKey('2026-W54')).toBe(false);
        expect(isValidWeekKey('2026-41')).toBe(false);
        expect(isValidWeekKey(null)).toBe(false);
    });
});

describe('zagrebMidnightMs / msUntilWeekEnd', () => {
    it('finds the instant a Zagreb day starts, in winter and summer', () => {
        expect(new Date(zagrebMidnightMs('2026-01-05')).toISOString()).toBe('2026-01-04T23:00:00.000Z');
        expect(new Date(zagrebMidnightMs('2026-07-13')).toISOString()).toBe('2026-07-12T22:00:00.000Z');
        // The day after each DST switch:
        expect(new Date(zagrebMidnightMs('2026-03-30')).toISOString()).toBe('2026-03-29T22:00:00.000Z');
        expect(new Date(zagrebMidnightMs('2026-10-26')).toISOString()).toBe('2026-10-25T23:00:00.000Z');
    });

    it('counts down to next Monday 00:00 Zagreb', () => {
        const now = Date.parse('2026-10-10T10:00:00Z'); // Saturday 12:00 CEST
        // Remaining: Sat 12:00 -> Mon 00:00 = 36h (no DST switch in between).
        expect(msUntilWeekEnd(now)).toBe(36 * 3600 * 1000);
    });

    it('is exact across a DST change inside the countdown', () => {
        // Sat 2026-10-24 12:00 CEST (10:00Z). Clocks go back Sun 03:00 -> 02:00,
        // so the week ends 37 real hours later, not 36.
        const now = Date.parse('2026-10-24T10:00:00Z');
        expect(msUntilWeekEnd(now)).toBe(37 * 3600 * 1000);
    });

    it('formats countdowns', () => {
        expect(formatWeekCountdown((2 * 24 + 14) * 3600 * 1000)).toBe('2d 14h');
        expect(formatWeekCountdown(5 * 3600 * 1000 + 7 * 60000)).toBe('5h 7m');
        expect(formatWeekCountdown(90 * 1000)).toBe('1m');
        expect(formatWeekCountdown(-5)).toBe('0m');
    });
});

describe('seasons', () => {
    const s1 = SEASONS[0];

    it('season 1 is 8 Monday-aligned weeks', () => {
        expect(s1.id).toBe('s1');
        expect(s1.weekCount).toBe(8);
        expect(weekStartDateKey(s1.startWeek)).toBe('2026-10-26');
        expect(seasonEndWeek(s1)).toBe('2026-W51');
        expect(weekEndDateKey(seasonEndWeek(s1))).toBe('2026-12-20');
    });

    it('maps weeks to seasons', () => {
        expect(seasonForWeek('2026-W43', SEASONS)).toBeNull();
        expect(seasonForWeek('2026-W44', SEASONS)?.id).toBe('s1');
        expect(seasonForWeek('2026-W51', SEASONS)?.id).toBe('s1');
        expect(seasonForWeek('2026-W52', SEASONS)).toBeNull();
    });

    it('spans a year boundary', () => {
        const winter = { id: 'x', name: 'X', startWeek: '2026-W51', weekCount: 4 };
        expect(seasonEndWeek(winter)).toBe('2027-W01');
        expect(seasonForWeek('2026-W53', [winter])?.id).toBe('x');
        expect(seasonForWeek('2027-W01', [winter])?.id).toBe('x');
        expect(seasonForWeek('2027-W02', [winter])).toBeNull();
    });

    it('finds the next upcoming season', () => {
        expect(nextSeasonAfter('2026-W41', SEASONS)?.id).toBe('s1');
        expect(nextSeasonAfter('2026-W44', SEASONS)).toBeNull();
    });

    it('zagrebDateKey formats an instant', () => {
        expect(zagrebDateKey(new Date('2026-07-12T22:30:00Z'))).toBe('2026-07-13');
    });
});
