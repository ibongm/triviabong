// Pure aggregation logic for the admin Pregled/Overview content-insights
// tables - no Firebase/React imports, mirrors sessionStats.js's separation.
// Aggregates at READ time over every questionAttempts/gameResults doc
// (fetched via getAllQuestionAttempts/getAllGameResults), consistent with
// the beta-scale "no precomputed counters" design used throughout this
// feature set.

/**
 * Per-question accuracy, sorted worst-first (ascending accuracy) so the
 * most likely-bad questions surface at the top. `attempts` is the raw
 * questionAttempts doc list; `questionText` is an id -> question-string
 * lookup (built from the raw per-category files, not getAllQuestions(),
 * so a question doesn't go missing just because another category happens
 * to share its exact wording after normalization).
 */
export const summarizeQuestionAccuracy = (attempts, questionText = {}) => {
    const byQuestion = {};
    for (const a of attempts || []) {
        if (!a.questionId) continue;
        const entry = byQuestion[a.questionId] || { questionId: a.questionId, categoryId: a.categoryId, totalAttempts: 0, correctCount: 0 };
        entry.totalAttempts += 1;
        if (a.correct) entry.correctCount += 1;
        byQuestion[a.questionId] = entry;
    }
    return Object.values(byQuestion)
        .map((entry) => ({
            ...entry,
            question: questionText[entry.questionId] || entry.questionId,
            accuracy: entry.totalAttempts > 0 ? entry.correctCount / entry.totalAttempts : 0,
        }))
        .sort((a, b) => a.accuracy - b.accuracy);
};

/**
 * Plays/avg-score/win-rate per category (which category deck players
 * chose - gameResults.category - not which category a question belongs
 * to), sorted most-played first.
 */
export const summarizeCategoryPopularity = (gameResults) => {
    const byCategory = {};
    for (const r of gameResults || []) {
        if (!r.category) continue;
        const entry = byCategory[r.category] || { category: r.category, plays: 0, totalScore: 0, victories: 0 };
        entry.plays += 1;
        entry.totalScore += typeof r.score === 'number' ? r.score : 0;
        if (r.outcome === 'VICTORY') entry.victories += 1;
        byCategory[r.category] = entry;
    }
    return Object.values(byCategory)
        .map((entry) => ({
            ...entry,
            avgScore: entry.plays > 0 ? Math.round(entry.totalScore / entry.plays) : 0,
            winRate: entry.plays > 0 ? entry.victories / entry.plays : 0,
        }))
        .sort((a, b) => b.plays - a.plays);
};
