import { describe, it, expect } from 'vitest';
import { addDaysToDateKey, getYesterdayZagrebDateKey, isAuthorizedCron } from '../../api/daily-challenge-payout.js';

describe('addDaysToDateKey', () => {
    it('handles standard day subtractions', () => {
        expect(addDaysToDateKey('2026-08-16', -1)).toBe('2026-08-15');
        expect(addDaysToDateKey('2026-08-16', 1)).toBe('2026-08-17');
    });

    it('handles month boundaries (non-leap year)', () => {
        expect(addDaysToDateKey('2026-03-01', -1)).toBe('2026-02-28');
    });

    it('handles leap year leap day (February 29)', () => {
        expect(addDaysToDateKey('2024-03-01', -1)).toBe('2024-02-29');
    });

    it('handles year rollover boundary', () => {
        expect(addDaysToDateKey('2026-01-01', -1)).toBe('2025-12-31');
    });
});

describe('getYesterdayZagrebDateKey', () => {
    it('computes yesterday correctly for winter time (CET, UTC+1)', () => {
        // 2026-01-15 23:10 UTC -> 2026-01-16 00:10 in Zagreb -> yesterday is 2026-01-15
        const winterCronTime = new Date('2026-01-15T23:10:00Z');
        expect(getYesterdayZagrebDateKey(winterCronTime)).toBe('2026-01-15');
    });

    it('computes yesterday correctly for summer time (CEST, UTC+2)', () => {
        // 2026-07-15 23:10 UTC -> 2026-07-16 01:10 in Zagreb -> yesterday is 2026-07-15
        const summerCronTime = new Date('2026-07-15T23:10:00Z');
        expect(getYesterdayZagrebDateKey(summerCronTime)).toBe('2026-07-15');
    });

    it('computes yesterday across month boundary in Zagreb', () => {
        // 2026-02-28 23:10 UTC -> 2026-03-01 00:10 in Zagreb -> yesterday is 2026-02-28
        const monthBoundaryCronTime = new Date('2026-02-28T23:10:00Z');
        expect(getYesterdayZagrebDateKey(monthBoundaryCronTime)).toBe('2026-02-28');
    });
});

describe('isAuthorizedCron', () => {
    it('accepts the exact bearer secret', () => {
        expect(isAuthorizedCron('Bearer s3cret', 's3cret')).toBe(true);
    });

    it('rejects a wrong secret of the same length', () => {
        expect(isAuthorizedCron('Bearer s3creX', 's3cret')).toBe(false);
    });

    it('rejects a different-length header without throwing', () => {
        expect(isAuthorizedCron('Bearer s3cret-and-more', 's3cret')).toBe(false);
        expect(isAuthorizedCron('', 's3cret')).toBe(false);
        expect(isAuthorizedCron(undefined, 's3cret')).toBe(false);
    });

    it('never authorizes when the secret is unset', () => {
        expect(isAuthorizedCron('Bearer ', '')).toBe(false);
        expect(isAuthorizedCron('Bearer undefined', undefined)).toBe(false);
    });
});
