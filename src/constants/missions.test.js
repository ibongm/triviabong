import { describe, it, expect } from 'vitest';
import { weekdayOfDateKey, getMissionsForDateKey, WEEKLY_MISSION_SCHEDULE } from './missions';

describe('weekdayOfDateKey', () => {
    it('returns the calendar weekday of a YYYY-MM-DD string', () => {
        expect(weekdayOfDateKey('2026-10-10')).toBe(6); // Saturday
        expect(weekdayOfDateKey('2026-10-11')).toBe(0); // Sunday
        expect(weekdayOfDateKey('2026-10-12')).toBe(1); // Monday
    });

    it('handles DST change days and year boundaries', () => {
        expect(weekdayOfDateKey('2026-03-29')).toBe(0); // EU DST starts (Sunday)
        expect(weekdayOfDateKey('2026-10-25')).toBe(0); // EU DST ends (Sunday)
        expect(weekdayOfDateKey('2026-12-31')).toBe(4); // Thursday
        expect(weekdayOfDateKey('2027-01-01')).toBe(5); // Friday
    });
});

describe('getMissionsForDateKey', () => {
    it('returns the schedule entry for that weekday', () => {
        expect(getMissionsForDateKey('2026-10-12')).toBe(WEEKLY_MISSION_SCHEDULE[1]);
        expect(getMissionsForDateKey('2026-10-11')).toBe(WEEKLY_MISSION_SCHEDULE[0]);
    });

    it('has three slots for every day of the week', () => {
        for (let day = 0; day < 7; day++) {
            const set = WEEKLY_MISSION_SCHEDULE[day];
            expect(set.slot1 && set.slot2 && set.slot3).toBeTruthy();
        }
    });
});
