// Shared question validation/merge logic for the admin question-upload
// feature. Plain JS with no React/Firebase imports so it can be required
// unchanged by both src/components/AdminPanel.jsx (client-side preview) and
// api/questions.js (the Vercel serverless function that actually commits the
// merged file) - the two must never drift into validating differently.
import { resolveCategoryKey } from '../data/categoryKeys';

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

const normalizeText = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

/**
 * Validates a raw parsed-JSON upload against the question shape used across
 * src/data/categories/*.json: { question, correct_answer, incorrect_answers[3] }.
 * @param {unknown} raw - result of JSON.parse on the uploaded file
 * @returns {{ valid: object[], errors: { index: number, reason: string }[] }}
 *   `valid` holds only the entries that passed every check, in original order.
 */
export const validateQuestions = (raw) => {
    const errors = [];

    if (!Array.isArray(raw)) {
        return { valid: [], errors: [{ index: -1, reason: 'Datoteka mora sadržavati JSON niz (array) pitanja.' }] };
    }

    const valid = [];

    raw.forEach((entry, index) => {
        if (!entry || typeof entry !== 'object') {
            errors.push({ index, reason: 'Stavka nije objekt.' });
            return;
        }
        if (!isNonEmptyString(entry.question)) {
            errors.push({ index, reason: 'Nedostaje ili je prazno polje "question".' });
            return;
        }
        if (!isNonEmptyString(entry.correct_answer)) {
            errors.push({ index, reason: 'Nedostaje ili je prazno polje "correct_answer".' });
            return;
        }
        if (!Array.isArray(entry.incorrect_answers) || entry.incorrect_answers.length !== 3) {
            errors.push({ index, reason: 'Polje "incorrect_answers" mora biti niz s točno 3 elementa.' });
            return;
        }
        if (!entry.incorrect_answers.every(isNonEmptyString)) {
            errors.push({ index, reason: 'Svi odgovori u "incorrect_answers" moraju biti neprazan tekst.' });
            return;
        }
        const allAnswers = [entry.correct_answer, ...entry.incorrect_answers].map(normalizeText);
        if (new Set(allAnswers).size !== allAnswers.length) {
            errors.push({ index, reason: 'Točan i netočni odgovori se preklapaju (duplikat unutar iste stavke).' });
            return;
        }

        valid.push(entry);
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
 * @returns {{ merged: object[], added: number, skipped: number }}
 */
export const mergeQuestions = (existing, incoming, packKey) => {
    const prefix = ID_PREFIXES[packKey];
    if (!prefix) {
        throw new Error(`Unknown category pack key: ${packKey}`);
    }

    const seenIds = new Set(existing.map((q) => q.id));
    const seenText = new Set(existing.map((q) => normalizeText(q.question)));

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
        };

        added.push(newEntry);
        seenIds.add(newId);
        seenText.add(normalizedText);
    }

    return { merged: [...existing, ...added], added: added.length, skipped };
};
