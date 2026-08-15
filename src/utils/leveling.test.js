import { describe, it, expect } from 'vitest';
import { xpForLevel, computeLevelFromXp, getCoinsForLevelUp } from './leveling';

describe('xpForLevel', () => {
    it('level 1 always costs 0 XP', () => {
        expect(xpForLevel(1)).toBe(0);
        expect(xpForLevel(0)).toBe(0);
    });

    it('matches the 25 * (level-1)^2 curve', () => {
        expect(xpForLevel(2)).toBe(25);
        expect(xpForLevel(10)).toBe(2025);
        expect(xpForLevel(50)).toBe(60025);
    });
});

describe('computeLevelFromXp', () => {
    it('starts at level 1 with no XP', () => {
        expect(computeLevelFromXp(0)).toBe(1);
        expect(computeLevelFromXp(undefined)).toBe(1);
    });

    it('is exact at a level boundary, not one past it', () => {
        expect(computeLevelFromXp(24)).toBe(1);
        expect(computeLevelFromXp(25)).toBe(2);
        expect(computeLevelFromXp(26)).toBe(2);
    });

    it('stays consistent with xpForLevel across a wider range', () => {
        for (let level = 1; level <= 15; level++) {
            expect(computeLevelFromXp(xpForLevel(level))).toBe(level);
        }
    });
});

describe('getCoinsForLevelUp', () => {
    it('pays a flat 3 coins for the early-tier levels 1-5', () => {
        expect(getCoinsForLevelUp(1)).toBe(3);
        expect(getCoinsForLevelUp(5)).toBe(3);
    });

    it('pays 5 + level for level 6+', () => {
        expect(getCoinsForLevelUp(6)).toBe(11);
        expect(getCoinsForLevelUp(9)).toBe(14);
    });

    it('adds a 25-coin bonus every 10th level', () => {
        expect(getCoinsForLevelUp(10)).toBe(5 + 10 + 25);
        expect(getCoinsForLevelUp(20)).toBe(5 + 20 + 25);
    });
});
