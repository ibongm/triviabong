import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS, getVisibleAchievements, SVI_SMO_MI_MARIJA_ID } from './achievements';

describe('getVisibleAchievements', () => {
    it('excludes the hidden achievement when it has not been earned', () => {
        const visible = getVisibleAchievements({});
        expect(visible.find((a) => a.id === SVI_SMO_MI_MARIJA_ID)).toBeUndefined();
        expect(visible.length).toBe(ACHIEVEMENTS.length - 1);
    });

    it('includes the hidden achievement once it has been earned', () => {
        const visible = getVisibleAchievements({ [SVI_SMO_MI_MARIJA_ID]: '2026-01-01' });
        expect(visible.find((a) => a.id === SVI_SMO_MI_MARIJA_ID)).toBeDefined();
        expect(visible.length).toBe(ACHIEVEMENTS.length);
    });

    it('never hides a non-hidden achievement', () => {
        const visible = getVisibleAchievements({});
        const nonHidden = ACHIEVEMENTS.filter((a) => !a.hidden);
        expect(visible.length).toBe(nonHidden.length);
    });
});
