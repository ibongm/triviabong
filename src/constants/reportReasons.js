// Shared between the player-facing report modal and the admin Reports
// queue so labels can't drift between the two. Ids must match
// firestore.rules' `reports/{reportId}` reason enum exactly.
export const REPORT_REASONS = [
    { id: 'wrong_answer', labelHr: 'Odgovor je pogrešno označen' },
    { id: 'unclear', labelHr: 'Nejasno formulirano' },
    { id: 'typo', labelHr: 'Tipfeler' },
    { id: 'offensive', labelHr: 'Neprimjereno' },
    // Only offered for questions that have an explanation (and only while
    // FEATURES.EXPLANATIONS is on) - see availableReportReasons below.
    { id: 'wrong_explanation', labelHr: 'Objašnjenje je netočno', requiresExplanation: true },
    { id: 'other', labelHr: 'Ostalo' },
];

/**
 * Reasons the player-facing modal offers for this question.
 * @param {object} question
 * @param {boolean} explanationsOn - FEATURES.EXPLANATIONS
 */
export const availableReportReasons = (question, explanationsOn) =>
    REPORT_REASONS.filter((r) => !r.requiresExplanation || (explanationsOn && !!question?.explanation));

export const reportReasonLabel = (id) => REPORT_REASONS.find((r) => r.id === id)?.labelHr || id;
