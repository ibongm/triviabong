import { describe, it, expect } from 'vitest';
import { getMatchQuestionOptions, isMatchAnswerCorrect } from './matchQuestions';

// Fabricated question - deliberately doesn't touch questionsLoader.js (and
// its 1.8MB of bundled JSON), since getMatchQuestionOptions/
// isMatchAnswerCorrect only need a question-shaped object, not the real pool.
const question = {
    id: 'test_q_1',
    correct_answer: 'Correct',
    incorrect_answers: ['Wrong A', 'Wrong B', 'Wrong C'],
};

describe('getMatchQuestionOptions', () => {
    it('is deterministic for the same (matchId, question) pair', () => {
        const a = getMatchQuestionOptions('match-1', question);
        const b = getMatchQuestionOptions('match-1', question);
        expect(a).toEqual(b);
    });

    it('produces a different order for a different matchId (the fairness guarantee)', () => {
        // Not guaranteed for every possible id, but true for this fixture -
        // if this ever flakes, it's a real signal the seeding broke.
        const forMatchA = getMatchQuestionOptions('match-a', question);
        const forMatchB = getMatchQuestionOptions('match-b', question);
        expect(forMatchA).not.toEqual(forMatchB);
    });

    it('always contains exactly the same 4 options, just reordered', () => {
        const options = getMatchQuestionOptions('any-match', question);
        expect(options.sort()).toEqual(
            [question.correct_answer, ...question.incorrect_answers].sort()
        );
    });

    it('returns an empty array for a missing question', () => {
        expect(getMatchQuestionOptions('match-1', null)).toEqual([]);
    });
});

describe('isMatchAnswerCorrect', () => {
    it('identifies the correct option regardless of where the seeded shuffle placed it', () => {
        const options = getMatchQuestionOptions('match-1', question);
        const correctIndex = options.indexOf(question.correct_answer);
        expect(isMatchAnswerCorrect('match-1', question, correctIndex)).toBe(true);
    });

    it('rejects a wrong option index', () => {
        const options = getMatchQuestionOptions('match-1', question);
        const wrongIndex = options.indexOf('Wrong A');
        expect(isMatchAnswerCorrect('match-1', question, wrongIndex)).toBe(false);
    });

    it('returns false for a missing question or null optionIndex', () => {
        expect(isMatchAnswerCorrect('match-1', null, 0)).toBe(false);
        expect(isMatchAnswerCorrect('match-1', question, null)).toBe(false);
    });
});
