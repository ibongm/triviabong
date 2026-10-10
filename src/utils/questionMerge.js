// Shared question validation/merge logic for the admin question-upload
// feature. Plain JS with no React/Firebase imports so it can be required
// unchanged by both src/components/AdminPanel.jsx (client-side preview) and
// api/questions.js (the Vercel serverless function that actually commits the
// merged file) - the two must never drift into validating differently.
// Explicit .js extension required: this file is loaded directly by Node's
// strict ESM resolver in the Vercel serverless function (api/questions.js),
// which - unlike Vite's bundler for the browser build - does not auto-resolve
// extensionless relative imports.
import { resolveCategoryKey } from '../data/categoryKeys.js';
import { isDifficultyLevel } from './difficulty.js';

// id prefix convention already used in each src/data/categories/*.json file.
export const ID_PREFIXES = {
    geografija: 'hr_geo_',
    povijest: 'hr_hist_',
    glazba: 'hr_mus_',
    sport: 'hr_sport_',
    znanost: 'hr_sci_',
    opca_znanje: 'hr_gen_',
    pop_kultura: 'hr_pop_',
    knjizevnost: 'hr_art_',
};

// Pack key -> filename under src/data/categories/. Most match the pack key
// directly; znanost and knjizevnost don't (they keep their original,
// longer filenames).
export const CATEGORY_FILES = {
    geografija: 'geografija.json',
    povijest: 'povijest.json',
    glazba: 'glazba.json',
    sport: 'sport.json',
    znanost: 'znanost_i_tehnologija.json',
    opca_znanje: 'opca_znanje.json',
    pop_kultura: 'pop_kultura.json',
    knjizevnost: 'knjizevnost_i_umjetnost.json',
};

export const normalizeText = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Today's date in Europe/Zagreb as "YYYY-MM-DD" - the same calendar the
 * Daily Challenge uses. Stamped onto every newly merged question as
 * `addedOn`, which dailySeed.js reads so a question added today can't
 * change today's Daily Challenge set. Plain Intl, no app imports, so the
 * serverless function and the Node generator script can use it too.
 * @param {Date} [now]
 */
export const getZagrebDateKey = (now = new Date()) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zagreb' }).format(now);

/**
 * Normalized-text index over any number of question arrays - lets callers
 * that can see the whole bank (the generator script) dedupe across
 * categories, not just within the target file.
 * @param {...object[]} packs
 * @returns {Set<string>}
 */
export const buildQuestionTextIndex = (...packs) => {
    const index = new Set();
    for (const pack of packs) {
        for (const q of pack || []) index.add(normalizeText(q?.question));
    }
    return index;
};

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

// Answer explanations (engagement plan Phase 2): optional, 1-2 sentences
// shown after the answer is revealed. Capped so it fits under the answer
// buttons on a phone without scrolling. Mirrored by the
// questionSubmissions rule in firestore.rules - keep the two equal.
export const EXPLANATION_MAX_LENGTH = 220;

/**
 * Validates a single question entry against the shape used across
 * src/data/categories/*.json: { question, correct_answer, incorrect_answers[3] }.
 * Shared by validateQuestions (bulk upload) and editQuestionById (single-
 * question edit) so both paths enforce identical rules.
 * @param {unknown} entry
 * @returns {{ valid: boolean, reason?: string }}
 */
export const validateEntry = (entry) => {
    if (!entry || typeof entry !== 'object') {
        return { valid: false, reason: 'Stavka nije objekt.' };
    }
    if (!isNonEmptyString(entry.question)) {
        return { valid: false, reason: 'Nedostaje ili je prazno polje "question".' };
    }
    if (!isNonEmptyString(entry.correct_answer)) {
        return { valid: false, reason: 'Nedostaje ili je prazno polje "correct_answer".' };
    }
    if (!Array.isArray(entry.incorrect_answers) || entry.incorrect_answers.length !== 3) {
        return { valid: false, reason: 'Polje "incorrect_answers" mora biti niz s točno 3 elementa.' };
    }
    if (!entry.incorrect_answers.every(isNonEmptyString)) {
        return { valid: false, reason: 'Svi odgovori u "incorrect_answers" moraju biti neprazan tekst.' };
    }
    const allAnswers = [entry.correct_answer, ...entry.incorrect_answers].map(normalizeText);
    if (new Set(allAnswers).size !== allAnswers.length) {
        return { valid: false, reason: 'Točan i netočni odgovori se preklapaju (duplikat unutar iste stavke).' };
    }
    if (entry.explanation !== undefined && entry.explanation !== null) {
        if (!isNonEmptyString(entry.explanation)) {
            return { valid: false, reason: 'Polje "explanation" mora biti neprazan tekst (ili ga izostavi).' };
        }
        if (entry.explanation.trim().length > EXPLANATION_MAX_LENGTH) {
            return { valid: false, reason: `Objašnjenje smije imati najviše ${EXPLANATION_MAX_LENGTH} znakova.` };
        }
    }
    if (entry.difficulty !== undefined && entry.difficulty !== null && !isDifficultyLevel(entry.difficulty)) {
        return { valid: false, reason: 'Polje "difficulty" mora biti "easy", "medium" ili "hard" (ili ga izostavi).' };
    }
    return { valid: true };
};

/**
 * Validates a raw parsed-JSON upload (an array of entries - see
 * validateEntry for the per-entry rules).
 * @param {unknown} raw - result of JSON.parse on the uploaded file
 * @returns {{ valid: object[], errors: { index: number, reason: string }[] }}
 *   `valid` holds only the entries that passed every check, in original order.
 */
export const validateQuestions = (raw) => {
    if (!Array.isArray(raw)) {
        return { valid: [], errors: [{ index: -1, reason: 'Datoteka mora sadržavati JSON niz (array) pitanja.' }] };
    }

    const valid = [];
    const errors = [];

    raw.forEach((entry, index) => {
        const result = validateEntry(entry);
        if (result.valid) {
            valid.push(entry);
        } else {
            errors.push({ index, reason: result.reason });
        }
    });

    return { valid, errors };
};

/**
 * Determines which category pack a set of (already-validated) entries
 * belongs to, from their `category` field, falling back to the filename.
 * @param {object[]} entries
 * @param {string} filename - the uploaded file's name, e.g. "sport.json"
 * @returns {string|null} a key of ID_PREFIXES/CATEGORY_FILES, or null if the
 *   entries mix categories or resolve to something the app doesn't know.
 */
export const detectCategory = (entries, filename) => {
    const fromEntries = new Set(
        entries.map((e) => resolveCategoryKey(e.category)).filter(Boolean)
    );

    let candidate;
    if (fromEntries.size === 1) {
        candidate = [...fromEntries][0];
    } else if (fromEntries.size === 0) {
        const stem = String(filename || '').replace(/\.json$/i, '');
        candidate = resolveCategoryKey(stem);
    } else {
        // Entries disagree on category - ambiguous, refuse to guess.
        return null;
    }

    return candidate && ID_PREFIXES[candidate] ? candidate : null;
};

/**
 * Merges validated incoming entries into an existing category pack.
 * Never removes or overwrites existing questions - only appends. An entry is
 * skipped (not an error) if its provided id already exists in the pack, or
 * its question text matches an existing question after normalizing
 * (lowercase, collapsed whitespace, trimmed). Re-running the same upload
 * against an already-merged pack is therefore a no-op.
 * @param {object[]} existing - the category's current question array
 * @param {object[]} incoming - validated entries (see validateQuestions)
 * @param {string} packKey - a key of ID_PREFIXES, e.g. 'sport'
 * @param {{ addedOn?: string, otherQuestionTexts?: Set<string> }} [options]
 *   `addedOn` - date stamped on each added question (defaults to today in
 *   Zagreb, see getZagrebDateKey). `otherQuestionTexts` - normalized texts
 *   from OTHER categories (see buildQuestionTextIndex); an incoming entry
 *   matching one is skipped like an in-pack duplicate. Callers that only
 *   hold the target file (api/questions.js) simply omit it.
 * @returns {{ merged: object[], added: number, skipped: number }}
 */
export const mergeQuestions = (existing, incoming, packKey, options = {}) => {
    const prefix = ID_PREFIXES[packKey];
    if (!prefix) {
        throw new Error(`Unknown category pack key: ${packKey}`);
    }
    const addedOn = options.addedOn || getZagrebDateKey();

    const seenIds = new Set(existing.map((q) => q.id));
    const seenText = new Set(existing.map((q) => normalizeText(q.question)));
    for (const t of options.otherQuestionTexts || []) seenText.add(t);

    let nextNum = existing.reduce((max, q) => {
        const match = String(q.id || '').match(/([0-9]+)$/);
        const num = match ? parseInt(match[1], 10) : 0;
        return Math.max(max, num);
    }, 0) + 1;

    const added = [];
    let skipped = 0;

    for (const entry of incoming) {
        const normalizedText = normalizeText(entry.question);
        const providedId = entry.id;
        if ((providedId && seenIds.has(providedId)) || seenText.has(normalizedText)) {
            skipped += 1;
            continue;
        }

        const newId = `${prefix}${nextNum}`;
        nextNum += 1;

        const newEntry = {
            id: newId,
            category: packKey,
            question: entry.question,
            correct_answer: entry.correct_answer,
            incorrect_answers: entry.incorrect_answers,
            ...(isNonEmptyString(entry.explanation) ? { explanation: entry.explanation.trim() } : {}),
            // A tier supplied with an upload/generator run is only ever a
            // guess; 'stats' is written solely by scripts/compute-difficulty.mjs.
            ...(isDifficultyLevel(entry.difficulty) ? { difficulty: entry.difficulty, difficultySource: 'guess' } : {}),
            addedOn,
        };

        added.push(newEntry);
        seenIds.add(newId);
        seenText.add(normalizedText);
    }

    return { merged: [...existing, ...added], added: added.length, skipped };
};

/**
 * Removes a single question by id from a category pack.
 * @param {object[]} existing - the category's current question array
 * @param {string} id
 * @returns {{ merged: object[], removed: boolean }} `removed` is false if no
 *   entry had that id (caller should treat that as "not found", not commit).
 */
export const removeQuestionById = (existing, id) => {
    const merged = existing.filter((q) => q.id !== id);
    return { merged, removed: merged.length !== existing.length };
};

/**
 * Edits a single question's text/answers in place. The id and category are
 * immutable - only question/correct_answer/incorrect_answers can change.
 * Every other field already on the entry (addedOn, and later explanation/
 * difficulty) is carried over untouched - rebuilding the object from the
 * five core fields would silently strip them on every admin edit.
 * Rejects the edit (rather than committing a broken or duplicate entry) if
 * the resulting shape is invalid, or if it would exactly match another
 * question already in the pack.
 * @param {object[]} existing - the category's current question array
 * @param {string} id
 * @param {{ question: string, correct_answer: string, incorrect_answers: string[], explanation?: string }} updatedFields
 * @returns {{ merged: object[], edited: boolean, reason?: string }}
 */
export const editQuestionById = (existing, id, updatedFields) => {
    const index = existing.findIndex((q) => q.id === id);
    if (index === -1) {
        return { merged: existing, edited: false, reason: 'Pitanje s tim ID-om nije pronađeno.' };
    }

    const candidate = {
        question: updatedFields.question,
        correct_answer: updatedFields.correct_answer,
        incorrect_answers: updatedFields.incorrect_answers,
    };
    // `explanation` is optional in an edit: absent = leave as is, empty
    // string = remove it, text = set it (validated like everything else).
    const touchesExplanation = Object.prototype.hasOwnProperty.call(updatedFields, 'explanation');
    const newExplanation = touchesExplanation ? String(updatedFields.explanation ?? '').trim() : null;
    if (touchesExplanation && newExplanation) candidate.explanation = newExplanation;

    const result = validateEntry(candidate);
    if (!result.valid) {
        return { merged: existing, edited: false, reason: result.reason };
    }

    const normalizedText = normalizeText(candidate.question);
    const collidesWithOther = existing.some(
        (q, i) => i !== index && normalizeText(q.question) === normalizedText
    );
    if (collidesWithOther) {
        return { merged: existing, edited: false, reason: 'Drugo pitanje u istoj kategoriji već ima isti tekst.' };
    }

    const merged = [...existing];
    const next = {
        ...existing[index],
        id: existing[index].id,
        category: existing[index].category,
        question: candidate.question,
        correct_answer: candidate.correct_answer,
        incorrect_answers: candidate.incorrect_answers,
    };
    if (touchesExplanation) {
        if (newExplanation) next.explanation = newExplanation;
        else delete next.explanation;
    }
    merged[index] = next;

    return { merged, edited: true };
};

/**
 * Applies reviewed explanations ({ id, explanation }[]) to one category pack.
 * Used by scripts/apply-explanations.mjs after Bong has reviewed a backfill
 * file. Never overwrites an existing explanation unless `force` is set, and
 * skips (with a reason) anything invalid, so a bad line can't break a pack.
 * @param {object[]} pack - the category's question array (not mutated)
 * @param {{ id: string, explanation: string }[]} entries
 * @param {{ force?: boolean }} [options]
 * @returns {{ merged: object[], applied: string[], skipped: { id: string, reason: string }[] }}
 */
export const applyExplanationsToPack = (pack, entries, options = {}) => {
    const byId = new Map(pack.map((q, i) => [q.id, i]));
    const merged = [...pack];
    const applied = [];
    const skipped = [];
    for (const entry of entries || []) {
        const id = entry?.id;
        const text = typeof entry?.explanation === 'string' ? entry.explanation.trim() : '';
        if (!byId.has(id)) continue; // belongs to another pack
        const idx = byId.get(id);
        if (!text) { skipped.push({ id, reason: 'empty' }); continue; }
        if (text.length > EXPLANATION_MAX_LENGTH) { skipped.push({ id, reason: `too long (${text.length})` }); continue; }
        if (merged[idx].explanation && !options.force) { skipped.push({ id, reason: 'already has one' }); continue; }
        merged[idx] = { ...merged[idx], explanation: text };
        applied.push(id);
    }
    return { merged, applied, skipped };
};
