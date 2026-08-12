import { describe, it, expect } from 'vitest';
import { validateEntry, validateQuestions, detectCategory, mergeQuestions, removeQuestionById, editQuestionById } from './questionMerge';

const validEntry = () => ({
    question: 'Koji je glavni grad Hrvatske?',
    correct_answer: 'Zagreb',
    incorrect_answers: ['Split', 'Rijeka', 'Osijek'],
});

describe('validateEntry', () => {
    it('accepts a well-formed entry', () => {
        expect(validateEntry(validEntry())).toEqual({ valid: true });
    });

    it('rejects a non-object', () => {
        expect(validateEntry(null).valid).toBe(false);
        expect(validateEntry('string').valid).toBe(false);
    });

    it('rejects a missing or empty question', () => {
        expect(validateEntry({ ...validEntry(), question: '' }).valid).toBe(false);
        expect(validateEntry({ ...validEntry(), question: undefined }).valid).toBe(false);
    });

    it('rejects a missing or empty correct_answer', () => {
        expect(validateEntry({ ...validEntry(), correct_answer: '  ' }).valid).toBe(false);
    });

    it('rejects incorrect_answers that are not exactly 3 entries', () => {
        expect(validateEntry({ ...validEntry(), incorrect_answers: ['a', 'b'] }).valid).toBe(false);
        expect(validateEntry({ ...validEntry(), incorrect_answers: ['a', 'b', 'c', 'd'] }).valid).toBe(false);
        expect(validateEntry({ ...validEntry(), incorrect_answers: 'not-an-array' }).valid).toBe(false);
    });

    it('rejects an empty string among incorrect_answers', () => {
        expect(validateEntry({ ...validEntry(), incorrect_answers: ['a', '', 'c'] }).valid).toBe(false);
    });

    it('rejects a duplicate answer (correct answer repeated in incorrect_answers)', () => {
        expect(validateEntry({ ...validEntry(), incorrect_answers: ['Zagreb', 'Split', 'Rijeka'] }).valid).toBe(false);
    });

    it('detects duplicate answers case/whitespace-insensitively', () => {
        expect(validateEntry({ ...validEntry(), incorrect_answers: ['  ZAGREB  ', 'Split', 'Rijeka'] }).valid).toBe(false);
    });
});

describe('validateQuestions', () => {
    it('rejects non-array input wholesale', () => {
        const result = validateQuestions({ not: 'an array' });
        expect(result.valid).toEqual([]);
        expect(result.errors).toHaveLength(1);
    });

    it('separates valid entries from invalid ones, preserving order and index', () => {
        const entries = [validEntry(), { question: '' }, validEntry()];
        const result = validateQuestions(entries);
        expect(result.valid).toHaveLength(2);
        expect(result.errors).toEqual([{ index: 1, reason: expect.any(String) }]);
    });

    it('handles an empty array', () => {
        expect(validateQuestions([])).toEqual({ valid: [], errors: [] });
    });
});

describe('detectCategory', () => {
    it('detects from a unanimous category field on the entries', () => {
        const entries = [{ category: 'sport' }, { category: 'Sport' }];
        expect(detectCategory(entries, 'whatever.json')).toBe('sport');
    });

    it('falls back to the filename when entries have no category field', () => {
        expect(detectCategory([{ question: 'x' }], 'sport.json')).toBe('sport');
    });

    it('resolves aliased category names via resolveCategoryKey', () => {
        expect(detectCategory([], 'science.json')).toBe('znanost');
        expect(detectCategory([{ category: 'science' }], 'ignored.json')).toBe('znanost');
    });

    it('refuses to guess when entries disagree on category', () => {
        const entries = [{ category: 'sport' }, { category: 'glazba' }];
        expect(detectCategory(entries, 'whatever.json')).toBeNull();
    });

    it('returns null for an unrecognized category/filename', () => {
        expect(detectCategory([], 'not_a_real_category.json')).toBeNull();
    });
});

describe('mergeQuestions', () => {
    const existing = [
        { id: 'hr_sport_1', category: 'sport', question: 'Postojeće pitanje?', correct_answer: 'A', incorrect_answers: ['B', 'C', 'D'] },
        { id: 'hr_sport_5', category: 'sport', question: 'Drugo pitanje?', correct_answer: 'A', incorrect_answers: ['B', 'C', 'D'] },
    ];

    it('throws on an unknown pack key', () => {
        expect(() => mergeQuestions(existing, [], 'not_a_category')).toThrow();
    });

    it('appends new entries, assigning ids that continue past the highest existing number', () => {
        const incoming = [{ question: 'Novo pitanje?', correct_answer: 'X', incorrect_answers: ['Y', 'Z', 'W'] }];
        const { merged, added, skipped } = mergeQuestions(existing, incoming, 'sport');
        expect(added).toBe(1);
        expect(skipped).toBe(0);
        expect(merged).toHaveLength(3);
        expect(merged[2].id).toBe('hr_sport_6'); // continues past existing max (5), not existing.length (2)
        expect(merged[2].category).toBe('sport');
    });

    it('never deletes or overwrites - skips an entry whose provided id already exists', () => {
        const incoming = [{ id: 'hr_sport_1', question: 'Neki drugi tekst?', correct_answer: 'X', incorrect_answers: ['Y', 'Z', 'W'] }];
        const { merged, added, skipped } = mergeQuestions(existing, incoming, 'sport');
        expect(added).toBe(0);
        expect(skipped).toBe(1);
        expect(merged).toHaveLength(2);
        expect(merged[0].correct_answer).toBe('A'); // untouched
    });

    it('skips an entry whose normalized question text already exists, even with a new id', () => {
        const incoming = [{ question: '  POSTOJEĆE   pitanje?  ', correct_answer: 'X', incorrect_answers: ['Y', 'Z', 'W'] }];
        const { added, skipped } = mergeQuestions(existing, incoming, 'sport');
        expect(added).toBe(0);
        expect(skipped).toBe(1);
    });

    it('re-running the same upload against an already-merged pack is a no-op', () => {
        const incoming = [{ question: 'Novo pitanje?', correct_answer: 'X', incorrect_answers: ['Y', 'Z', 'W'] }];
        const first = mergeQuestions(existing, incoming, 'sport');
        const second = mergeQuestions(first.merged, incoming, 'sport');
        expect(second.added).toBe(0);
        expect(second.skipped).toBe(1);
        expect(second.merged).toHaveLength(3);
    });

    it('handles an empty existing pack (nextNum starts at 1)', () => {
        const incoming = [{ question: 'Prvo pitanje?', correct_answer: 'X', incorrect_answers: ['Y', 'Z', 'W'] }];
        const { merged } = mergeQuestions([], incoming, 'sport');
        expect(merged[0].id).toBe('hr_sport_1');
    });
});

describe('removeQuestionById', () => {
    const existing = [
        { id: 'hr_sport_1', question: 'A' },
        { id: 'hr_sport_2', question: 'B' },
    ];

    it('removes the matching entry', () => {
        const { merged, removed } = removeQuestionById(existing, 'hr_sport_1');
        expect(removed).toBe(true);
        expect(merged).toHaveLength(1);
        expect(merged[0].id).toBe('hr_sport_2');
    });

    it('reports removed:false and leaves the array untouched when the id is not found', () => {
        const { merged, removed } = removeQuestionById(existing, 'does_not_exist');
        expect(removed).toBe(false);
        expect(merged).toHaveLength(2);
    });
});

describe('editQuestionById', () => {
    const existing = [
        { id: 'hr_sport_1', category: 'sport', question: 'Prvo pitanje?', correct_answer: 'A', incorrect_answers: ['B', 'C', 'D'] },
        { id: 'hr_sport_2', category: 'sport', question: 'Drugo pitanje?', correct_answer: 'A', incorrect_answers: ['B', 'C', 'D'] },
    ];

    it('edits question/answers while keeping id and category immutable', () => {
        const { merged, edited } = editQuestionById(existing, 'hr_sport_1', {
            question: 'Izmijenjeno pitanje?',
            correct_answer: 'X',
            incorrect_answers: ['Y', 'Z', 'W'],
        });
        expect(edited).toBe(true);
        expect(merged[0].id).toBe('hr_sport_1');
        expect(merged[0].category).toBe('sport');
        expect(merged[0].question).toBe('Izmijenjeno pitanje?');
    });

    it('rejects when the id does not exist', () => {
        const { edited, reason } = editQuestionById(existing, 'missing_id', validEntry());
        expect(edited).toBe(false);
        expect(reason).toBeTruthy();
    });

    it('rejects an edit that would produce an invalid entry', () => {
        const { edited } = editQuestionById(existing, 'hr_sport_1', { question: '', correct_answer: 'X', incorrect_answers: ['Y', 'Z', 'W'] });
        expect(edited).toBe(false);
    });

    it('rejects an edit that would collide with another question in the same pack', () => {
        const { edited, reason } = editQuestionById(existing, 'hr_sport_1', {
            question: 'Drugo pitanje?', // matches hr_sport_2's text
            correct_answer: 'X',
            incorrect_answers: ['Y', 'Z', 'W'],
        });
        expect(edited).toBe(false);
        expect(reason).toBeTruthy();
    });

    it('allows an edit that keeps the same question text (self-collision is fine)', () => {
        const { edited } = editQuestionById(existing, 'hr_sport_1', {
            question: 'Prvo pitanje?',
            correct_answer: 'Novo tocno',
            incorrect_answers: ['B', 'C', 'D'],
        });
        expect(edited).toBe(true);
    });
});
