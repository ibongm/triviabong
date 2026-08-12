import { describe, it, expect } from 'vitest';
import { resolveCategoryKey, PRIMARY_CATEGORIES, CATEGORY_META } from './categoryKeys';

describe('resolveCategoryKey', () => {
    it('resolves known aliases to their primary key', () => {
        expect(resolveCategoryKey('science')).toBe('znanost');
        expect(resolveCategoryKey('znanost_i_tehnologija')).toBe('znanost');
        expect(resolveCategoryKey('knjizevnost_i_umjetnost')).toBe('knjizevnost');
        expect(resolveCategoryKey('general_knowledge')).toBe('opca_znanje');
    });

    it('is case-insensitive and trims whitespace', () => {
        expect(resolveCategoryKey('  SCIENCE  ')).toBe('znanost');
        expect(resolveCategoryKey('Geography')).toBe('geografija');
    });

    it('passes through an already-primary key unchanged', () => {
        expect(resolveCategoryKey('sport')).toBe('sport');
    });

    it('passes through an unrecognized key unchanged rather than throwing', () => {
        expect(resolveCategoryKey('nepoznato')).toBe('nepoznato');
    });

    it('returns an empty string for falsy input', () => {
        expect(resolveCategoryKey('')).toBe('');
        expect(resolveCategoryKey(null)).toBe('');
        expect(resolveCategoryKey(undefined)).toBe('');
    });
});

describe('CATEGORY_META', () => {
    it('has one entry per primary category, keyed by its key', () => {
        expect(Object.keys(CATEGORY_META).sort()).toEqual(PRIMARY_CATEGORIES.map((c) => c.key).sort());
    });

    it('every entry carries a label and icon', () => {
        for (const cat of PRIMARY_CATEGORIES) {
            expect(CATEGORY_META[cat.key].label).toBe(cat.label);
            expect(CATEGORY_META[cat.key].icon).toBeDefined();
        }
    });
});
