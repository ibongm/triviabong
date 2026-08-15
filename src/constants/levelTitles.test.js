import { describe, it, expect } from 'vitest';
import { LEVEL_TITLES, MAX_TITLED_LEVEL, getTitleForLevel } from './levelTitles';

describe('LEVEL_TITLES', () => {
    it('has exactly 50 titles', () => {
        expect(LEVEL_TITLES).toHaveLength(50);
        expect(MAX_TITLED_LEVEL).toBe(50);
    });

    it('every title is a non-empty string', () => {
        for (const title of LEVEL_TITLES) {
            expect(typeof title).toBe('string');
            expect(title.length).toBeGreaterThan(0);
        }
    });
});

describe('getTitleForLevel', () => {
    it('maps level 1 to the first title and level 50 to the last', () => {
        expect(getTitleForLevel(1)).toBe('Slučajni Prolaznik');
        expect(getTitleForLevel(50)).toBe('Trivia Bong');
    });

    it('clamps below 1 and above 50', () => {
        expect(getTitleForLevel(0)).toBe(LEVEL_TITLES[0]);
        expect(getTitleForLevel(999)).toBe(LEVEL_TITLES[49]);
    });
});
