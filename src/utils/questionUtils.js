/**
 * Uniform Fisher-Yates shuffle (returns a new array; the input is untouched).
 *
 * Replaces the previous `[...array].sort(() => Math.random() - 0.5)`, which is
 * not a uniform shuffle: with V8's sort, a 4-item array came out heavily
 * biased toward keeping the first and last items at the ends. Because
 * getQuestionOptions() puts the correct answer first, the correct answer
 * landed in position A ~36% and position D ~31% of the time (vs 25%) - a
 * pattern regular players could learn to exploit.
 * @template T
 * @param {T[]} array
 * @param {() => number} [rand] - PRNG returning [0, 1); defaults to Math.random
 * @returns {T[]}
 */
export const shuffleArray = (array, rand = Math.random) => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

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
