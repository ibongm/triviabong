import { describe, it, expect } from 'vitest';
import { getCategoryDetails, checkIsCorrect, DEFAULT_CATEGORY_COLOR } from './categoryDisplay';

describe('getCategoryDetails', () => {
    it('resolves a known category key to its metadata', () => {
        const details = getCategoryDetails('sport');
        expect(details.label).toBe('Sport');
        expect(details.icon).toBeDefined();
    });

    it('resolves an alias to the same metadata as its primary key', () => {
        expect(getCategoryDetails('science')).toEqual(getCategoryDetails('znanost'));
    });

    it('falls back to a humanized label + default color for an unrecognized key', () => {
        const details = getCategoryDetails('nepoznata_kategorija');
        expect(details.label).toBe('nepoznata kategorija');
        expect(details.color).toBe(DEFAULT_CATEGORY_COLOR);
    });

    it('falls back to a generic label when no key is given', () => {
        expect(getCategoryDetails(null).label).toBe('Kategorija');
    });
});

describe('checkIsCorrect', () => {
    it('matches case/whitespace-insensitively against correct_answer', () => {
        expect(checkIsCorrect({ correct_answer: 'Zagreb' }, '  zagreb  ')).toBe(true);
        expect(checkIsCorrect({ correct_answer: 'Zagreb' }, 'Split')).toBe(false);
    });

    it('falls back to correctAnswer (camelCase) when correct_answer is absent', () => {
        expect(checkIsCorrect({ correctAnswer: 'Zagreb' }, 'Zagreb')).toBe(true);
    });

    it('returns false for missing question or undefined option', () => {
        expect(checkIsCorrect(null, 'Zagreb')).toBe(false);
        expect(checkIsCorrect({ correct_answer: 'Zagreb' }, undefined)).toBe(false);
    });
});
