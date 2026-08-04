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
