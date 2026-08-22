// Pure aggregation logic for the admin Pregled/Overview content-insights
// tables - no Firebase/React imports, mirrors sessionStats.js's separation.
//
// Two paths into the same output shape:
//   - summarizeQuestionAccuracy / summarizeCategoryPopularity fold the RAW
//     questionAttempts/gameResults docs. Unbounded (one doc per question ever
//     answered / game ever played), so these are no longer on the admin read
//     path - they now serve only the admin-only recompute* rebuilds.
//   - *FromStats below read the maintained questionStats/categoryStats
//     counters instead. The caller fetches only the top ~100 questions by
//     wrong-answer count (getWorstQuestionStats) plus the 8 category docs, so
//     the admin read cost is fixed no matter how much the game is played.
//     Note the counter collection itself is bounded only by the number of
//     distinct questions answered - 5,949 questions exist, so reading it whole
//     was ~2,900 reads in practice; hence the top-N query rather than a scan.
// Both emit identical field names so AdminOverview's tables are agnostic to
// which one produced them. See CHANGELOG's 2026-08-22 Phase 2 entry.

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

/**
 * Same output as summarizeQuestionAccuracy, but from maintained
 * questionStats/{questionId} counter docs ({ categoryId, total, correct,
 * wrong }) rather than raw attempt rows. Questions with total === 0 are
 * dropped rather than shown as 0% - a counter doc can exist at zero after a
 * recompute over an empty range, and "0% correct, 0 attempts" would read as a
 * broken question rather than an unplayed one.
 */
export const summarizeQuestionAccuracyFromStats = (stats, questionText = {}) =>
    (stats || [])
        .filter((s) => s && s.questionId && (s.total || 0) > 0)
        .map((s) => ({
            questionId: s.questionId,
            categoryId: s.categoryId,
            totalAttempts: s.total,
            correctCount: s.correct || 0,
            question: questionText[s.questionId] || s.questionId,
            accuracy: (s.correct || 0) / s.total,
        }))
        .sort((a, b) => a.accuracy - b.accuracy);

/**
 * Same output as summarizeCategoryPopularity, but from maintained
 * categoryStats/{categoryId} counter docs ({ plays, totalScore, victories }).
 * The doc id is the category key, so callers pass it through as `category` to
 * match the raw-path field name the table renders.
 */
export const summarizeCategoryPopularityFromStats = (stats) =>
    (stats || [])
        .filter((s) => s && s.category && (s.plays || 0) > 0)
        .map((s) => ({
            category: s.category,
            plays: s.plays,
            totalScore: s.totalScore || 0,
            victories: s.victories || 0,
            avgScore: Math.round((s.totalScore || 0) / s.plays),
            winRate: (s.victories || 0) / s.plays,
        }))
        .sort((a, b) => b.plays - a.plays);
