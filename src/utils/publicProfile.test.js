import { describe, it, expect } from 'vitest';
import { sanitizeDisplayName, buildPublicProfileFields, MAX_DISPLAY_NAME_LENGTH, MAX_ACHIEVEMENT_COUNT } from './publicProfile';

describe('sanitizeDisplayName', () => {
    it('prefers displayName when present', () => {
        expect(sanitizeDisplayName({ displayName: 'Ivan', email: 'ivan@example.com' })).toBe('Ivan');
    });

    it('falls back to the email local-part when displayName is missing', () => {
        expect(sanitizeDisplayName({ email: 'ivan.marevic@example.com' })).toBe('ivan.marevic');
    });

    it('falls back to Igrač when nothing usable is present', () => {
        expect(sanitizeDisplayName({})).toBe('Igrač');
        expect(sanitizeDisplayName(null)).toBe('Igrač');
        expect(sanitizeDisplayName({ displayName: '   ' })).toBe('Igrač');
    });

    it('trims whitespace', () => {
        expect(sanitizeDisplayName({ displayName: '  Ivan  ' })).toBe('Ivan');
    });

    it('clamps to MAX_DISPLAY_NAME_LENGTH so long values never reach a rule that would reject them', () => {
        const long = 'a'.repeat(MAX_DISPLAY_NAME_LENGTH + 15);
        const result = sanitizeDisplayName({ displayName: long });
        expect(result.length).toBe(MAX_DISPLAY_NAME_LENGTH);
    });
});

describe('buildPublicProfileFields', () => {
    it('clamps missing numeric fields to their floor', () => {
        const fields = buildPublicProfileFields({});
        expect(fields).toEqual({
            displayName: 'Igrač',
            level: 1,
            xp: 0,
            maxStreak: 0,
            dayStreak: 0,
            achievementCount: 0,
        });
    });

    it('floors fractional admin-entered values rather than rejecting them', () => {
        const fields = buildPublicProfileFields({ level: 2.9, xp: 15.5 });
        expect(fields.level).toBe(2);
        expect(fields.xp).toBe(15);
    });

    it('falls back to the floor for out-of-range or non-numeric values', () => {
        const fields = buildPublicProfileFields({ level: -3, xp: 'not-a-number' });
        expect(fields.level).toBe(1); // level floor is 1
        expect(fields.xp).toBe(0); // xp floor is 0
    });

    it('counts unlockedAchievements keys and caps at MAX_ACHIEVEMENT_COUNT', () => {
        const manyAchievements = Object.fromEntries(
            Array.from({ length: MAX_ACHIEVEMENT_COUNT + 20 }, (_, i) => [`ach_${i}`, '2026-01-01'])
        );
        const fields = buildPublicProfileFields({ unlockedAchievements: manyAchievements });
        expect(fields.achievementCount).toBe(MAX_ACHIEVEMENT_COUNT);
    });

    it('counts a normal number of unlocked achievements exactly', () => {
        const fields = buildPublicProfileFields({ unlockedAchievements: { a: '1', b: '2', c: '3' } });
        expect(fields.achievementCount).toBe(3);
    });
});
