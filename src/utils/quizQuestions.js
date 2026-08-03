// Pure helpers for reading a question object and its answer options.
//
// Question JSON has drifted across sources over time, so these tolerate both
// the snake_case shape the bundled category files use (correct_answer /
// incorrect_answers) and the camelCase one some older data used.

export const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5);

export const getQuestionOptions = (q) => {
    if (!q) return [];
    if (Array.isArray(q.options)) return q.options;
    const correct = q.correct_answer || q.correctAnswer;
    const incorrects = q.incorrect_answers || q.incorrectAnswers || [];
    if (correct !== undefined) {
        return [correct, ...incorrects];
    }
    return [];
};

export const checkIsCorrect = (q, option) => {
    if (!q || option === undefined) return false;
    const correct = String(q.correct_answer || q.correctAnswer || '').trim().toLowerCase();
    return String(option).trim().toLowerCase() === correct;
};
