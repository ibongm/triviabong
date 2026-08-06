// Shared between the player-facing report modal and the admin Reports
// queue so labels can't drift between the two. Ids must match
// firestore.rules' `reports/{reportId}` reason enum exactly.
export const REPORT_REASONS = [
    { id: 'wrong_answer', labelHr: 'Odgovor je pogrešno označen' },
    { id: 'unclear', labelHr: 'Nejasno formulirano' },
    { id: 'typo', labelHr: 'Tipfeler' },
    { id: 'offensive', labelHr: 'Neprimjereno' },
    { id: 'other', labelHr: 'Ostalo' },
];

export const reportReasonLabel = (id) => REPORT_REASONS.find((r) => r.id === id)?.labelHr || id;
