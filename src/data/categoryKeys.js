// Category key resolution, with no JSON imports so this can be shared with
// api/questions.js (a Vercel serverless function) without pulling ~500KB of
// question data into its bundle. questionsLoader.js is the only place that
// actually holds the question packs.

// Internal Alias Lookup Map
// Maps alternate keys, file names, or diacritic variations to the primary categoryPack key
export const CATEGORY_ALIASES = {
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
 * Resolves any category slug/alias/filename variant to its primary pack key.
 * @param {string} input
 * @returns {string} the normalized/aliased key (unchanged if no alias matches)
 */
export const resolveCategoryKey = (input) => {
    if (!input) return '';
    const normalizedKey = String(input).toLowerCase().trim();
    return CATEGORY_ALIASES[normalizedKey] || normalizedKey;
};
