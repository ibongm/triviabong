import { Globe, Trophy, History, BookOpen, Music, Brain, Sparkles, Atom } from 'lucide-react';

export const PRIMARY_CATEGORIES = [
    { key: 'geografija', label: 'Geografija', icon: Globe },
    { key: 'povijest', label: 'Povijest', icon: History },
    { key: 'glazba', label: 'Glazba', icon: Music },
    { key: 'sport', label: 'Sport', icon: Trophy },
    { key: 'znanost', label: 'Znanost i Tehnologija', icon: Atom },
    { key: 'opca_znanje', label: 'Opće znanje', icon: Brain },
    { key: 'pop_kultura', label: 'Pop kultura', icon: Sparkles },
    { key: 'knjizevnost', label: 'Književnost i Umjetnost', icon: BookOpen },
];

export const CATEGORY_META = PRIMARY_CATEGORIES.reduce((acc, cat) => {
    acc[cat.key] = { label: cat.label, icon: cat.icon };
    return acc;
}, {});

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
