import { describe, it, expect } from 'vitest';
import { xpForLevel, computeLevelFromXp } from './leveling';

describe('xpForLevel', () => {
    it('level 1 always costs 0 XP', () => {
        expect(xpForLevel(1)).toBe(0);
        expect(xpForLevel(0)).toBe(0);
    });

    it('uses the early-tier multiplier for levels 2-4', () => {
        expect(xpForLevel(2)).toBe(20);
        expect(xpForLevel(3)).toBe(60);
        expect(xpForLevel(4)).toBe(120);
    });

    it('steepens at the late-tier boundary (level 5+)', () => {
        expect(xpForLevel(5)).toBe(300);
        expect(xpForLevel(6)).toBe(450);
        expect(xpForLevel(10)).toBe(1350);
    });
});

describe('computeLevelFromXp', () => {
    it('starts at level 1 with no XP', () => {
        expect(computeLevelFromXp(0)).toBe(1);
        expect(computeLevelFromXp(undefined)).toBe(1);
    });

    it('is exact at a level boundary, not one past it', () => {
        expect(computeLevelFromXp(19)).toBe(1);
        expect(computeLevelFromXp(20)).toBe(2);
        expect(computeLevelFromXp(21)).toBe(2);
    });

    it('crosses the tier-5 boundary correctly', () => {
        expect(computeLevelFromXp(299)).toBe(4);
        expect(computeLevelFromXp(300)).toBe(5);
    });

    it('stays consistent with xpForLevel across a wider range', () => {
        for (let level = 1; level <= 15; level++) {
            expect(computeLevelFromXp(xpForLevel(level))).toBe(level);
        }
    });
});
