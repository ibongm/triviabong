import geografija from './categories/geografija.json';
import povijest from './categories/povijest.json';
import glazba from './categories/glazba.json';
import sport from './categories/sport.json';
import znanost from './categories/znanost_i_tehnologija.json';
import opca_znanje from './categories/opca_znanje.json';
import pop_kultura from './categories/pop_kultura.json';
import knjizevnost from './categories/knjizevnost_i_umjetnost.json';
import { resolveCategoryKey } from './categoryKeys.js';

// Primary category storage mapping
const categoryPacks = {
    geografija: Array.isArray(geografija) ? geografija : [],
    povijest: Array.isArray(povijest) ? povijest : [],
    glazba: Array.isArray(glazba) ? glazba : [],
    sport: Array.isArray(sport) ? sport : [],
    znanost: Array.isArray(znanost) ? znanost : [],
    opca_znanje: Array.isArray(opca_znanje) ? opca_znanje : [],
    pop_kultura: Array.isArray(pop_kultura) ? pop_kultura : [],
    knjizevnost: Array.isArray(knjizevnost) ? knjizevnost : [],
};

// Opće znanje is an aggregate pool - it plays questions from every category
// (including its own), so questions added anywhere enrich it automatically.
const AGGREGATE_CATEGORIES = new Set(['opca_znanje']);

/**
 * Resolves any category slug/alias and returns the matching question deck.
 * @param {string} categoryKey - The category key requested by the app (e.g. 'znanost' or 'znanost_i_tehnologija')
 */
export const getQuestionsByCategory = (categoryKey) => {
    if (!categoryKey) return [];

    const targetPackKey = resolveCategoryKey(categoryKey);

    if (AGGREGATE_CATEGORIES.has(targetPackKey)) {
        return getAllQuestions();
    }

    return categoryPacks[targetPackKey] || [];
};

/**
 * Returns a list of primary unique category keys
 */
export const getAllCategories = () => {
    return Object.keys(categoryPacks);
};

/**
 * Returns a category's own question pack, bypassing aggregate categories
 * (e.g. Opće znanje). Gameplay should always use getQuestionsByCategory -
 * this exists for tooling (the admin question-upload preview) that needs to
 * know what's actually stored in a single category's file.
 */
export const getRawCategoryQuestions = (categoryKey) => {
    if (!categoryKey) return [];
    const targetPackKey = resolveCategoryKey(categoryKey);
    return categoryPacks[targetPackKey] || [];
};

export const getAllQuestions = () => {
    const all = Object.values(categoryPacks).flat();
    const seen = new Set();
    return all.filter(q => {
        if (!q || !q.question) return false;
        const normalized = q.question.toLowerCase().trim();
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
    });
};