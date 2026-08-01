import geografija from './categories/geografija.json';
import povijest from './categories/povijest.json';
import glazba from './categories/glazba.json';
import sport from './categories/sport.json';
import znanost from './categories/znanost_i_tehnologija.json';
import opca_znanje from './categories/opca_znanje.json';
import pop_kultura from './categories/pop_kultura.json';
import knjizevnost from './categories/knjizevnost_i_umjetnost.json';

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

// Internal Alias Lookup Map
// Maps alternate keys, file names, or diacritic variations to the primary categoryPack key
const CATEGORY_ALIASES = {
    // Znanost variations
    znanost: 'znanost',
    znanost_i_tehnologija: 'znanost',
    science: 'znanost',

    // Književnost & Umjetnost variations
    knjizevnost: 'knjizevnost',
    knjizevnost_i_umjetnost: 'knjizevnost',
    umjetnost: 'knjizevnost',
    art: 'knjizevnost',

    // Opće znanje variations
    opca_znanje: 'opca_znanje',
    opce_znanje: 'opca_znanje',
    općeznanje: 'opca_znanje',
    opceznanje: 'opca_znanje',
    general_knowledge: 'opca_znanje',

    // Pop kultura variations
    pop_kultura: 'pop_kultura',
    popkultura: 'pop_kultura',
    pop_culture: 'pop_kultura',

    // Standard direct mappings
    geografija: 'geografija',
    geography: 'geografija',
    povijest: 'povijest',
    history: 'povijest',
    glazba: 'glazba',
    music: 'glazba',
    sport: 'sport',
};

/**
 * Resolves any category slug/alias and returns the matching question deck.
 * @param {string} categoryKey - The category key requested by the app (e.g. 'znanost' or 'znanost_i_tehnologija')
 */
export const getQuestionsByCategory = (categoryKey) => {
    if (!categoryKey) return [];

    // Normalize input string (lowercase and trim spaces)
    const normalizedKey = String(categoryKey).toLowerCase().trim();

    // Resolve alias to target pack key, defaulting to the raw normalized key if not explicitly aliased
    const targetPackKey = CATEGORY_ALIASES[normalizedKey] || normalizedKey;

    return categoryPacks[targetPackKey] || [];
};

/**
 * Returns a list of primary unique category keys
 */
export const getAllCategories = () => {
    return Object.keys(categoryPacks);
};

/**
 * Combines and returns all questions from all loaded category packs
 */
export const getAllQuestions = () => {
    return Object.values(categoryPacks).flat();
};