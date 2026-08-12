import { PRIMARY_CATEGORIES, resolveCategoryKey } from './categoryKeys.js';

// Opće znanje is an aggregate pool - it plays questions from every category
// (including its own), so questions added anywhere enrich it automatically.
const AGGREGATE_CATEGORIES = new Set(['opca_znanje']);

/**
 * Returns the list of primary category keys. Deliberately sourced from
 * categoryKeys.js (label/icon metadata) rather than from the loaded JSON
 * packs below - the lobby/category-grid only ever needs these 8 key
 * strings, never question content, so keeping this synchronous and
 * JSON-free means the lobby can render before a single byte of question
 * data has loaded. Order matches categoryKeys.js's PRIMARY_CATEGORIES,
 * which matches the original hardcoded pack order.
 */
export const getAllCategories = () => PRIMARY_CATEGORIES.map((c) => c.key);

// One dynamic import() per category pack, grouped into a single
// "questions-data" chunk by vite.config.js's manualChunks rule - so this
// stays one lazily-fetched network request instead of 8, while still never
// loading until something actually calls one of the async functions below
// (round start, daily challenge, 1v1 match creation/render - see each
// call site's own comment for why it's safe to await there).
const CATEGORY_FILE_LOADERS = {
    geografija: () => import('./categories/geografija.json'),
    povijest: () => import('./categories/povijest.json'),
    glazba: () => import('./categories/glazba.json'),
    sport: () => import('./categories/sport.json'),
    znanost: () => import('./categories/znanost_i_tehnologija.json'),
    opca_znanje: () => import('./categories/opca_znanje.json'),
    pop_kultura: () => import('./categories/pop_kultura.json'),
    knjizevnost: () => import('./categories/knjizevnost_i_umjetnost.json'),
};

// Cached as a single module-level promise (not per-category) - every real
// consumer eventually needs the whole set anyway: getQuestionsByCategory
// falls through to getAllQuestions() for the aggregate category, and
// matchQuestions.js's pickMatchQuestionIds always needs both the target
// category AND the full pool as a fallback. So there's no genuine
// per-category laziness win to chase, only a "load once, keep everywhere"
// one.
let packsPromise = null;
const loadPacks = () => {
    if (!packsPromise) {
        packsPromise = Promise.all(
            Object.entries(CATEGORY_FILE_LOADERS).map(([key, loadPack]) =>
                loadPack().then((mod) => [key, Array.isArray(mod.default) ? mod.default : []])
            )
        ).then((entries) => Object.fromEntries(entries));
    }
    return packsPromise;
};

// getAllQuestions() flattens+dedupes ~1500 questions - memoized so the 4
// call sites across the app don't each redo that work on every call.
let allQuestionsCache = null;
const dedupeQuestions = (packs) => {
    if (allQuestionsCache) return allQuestionsCache;
    const all = Object.values(packs).flat();
    const seen = new Set();
    allQuestionsCache = all.filter((q) => {
        if (!q || !q.question) return false;
        const normalized = q.question.toLowerCase().trim();
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
    });
    return allQuestionsCache;
};

/**
 * Resolves any category slug/alias and returns the matching question deck.
 * Async - triggers the lazy load on first call.
 * @param {string} categoryKey - The category key requested by the app (e.g. 'znanost' or 'znanost_i_tehnologija')
 */
export const getQuestionsByCategory = async (categoryKey) => {
    if (!categoryKey) return [];

    const targetPackKey = resolveCategoryKey(categoryKey);

    if (AGGREGATE_CATEGORIES.has(targetPackKey)) {
        return getAllQuestions();
    }

    const packs = await loadPacks();
    return packs[targetPackKey] || [];
};

/**
 * Returns a category's own question pack, bypassing aggregate categories
 * (e.g. Opće znanje). Gameplay should always use getQuestionsByCategory -
 * this exists for tooling (the admin question-upload preview) that needs to
 * know what's actually stored in a single category's file.
 */
export const getRawCategoryQuestions = async (categoryKey) => {
    if (!categoryKey) return [];
    const targetPackKey = resolveCategoryKey(categoryKey);
    const packs = await loadPacks();
    return packs[targetPackKey] || [];
};

export const getAllQuestions = async () => {
    const packs = await loadPacks();
    return dedupeQuestions(packs);
};

/**
 * Returns every category's raw pack at once, keyed by category key -
 * { geografija: [...], povijest: [...], ... }. For admin tooling only
 * (AdminQuestions/AdminOverview/AdminReports), which genuinely needs every
 * category's contents up front (counts across all categories, id->text
 * lookups) rather than one category at a time.
 */
export const getAllCategoryPacks = async () => loadPacks();
