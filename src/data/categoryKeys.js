import { Globe, Trophy, History, BookOpen, Music, Brain, Sparkles, Atom } from 'lucide-react';

// Per-category color token (icon chip bg/border/text, plus the card's hover
// border/chevron color) so the lobby grid and in-quiz header aren't all
// identical amber - opca_znanje keeps amber since it's the featured/
// aggregate category and already reads as "primary" via its distinct lobby
// card treatment (see App.jsx's LOBBY featured card).
//
// Every class string here is written out in full (never built with template
// literals/concatenation at render time) - Tailwind's build-time scanner
// only picks up class names that appear as literal substrings in source
// files, so a runtime-constructed `hover:${x}` string would silently never
// make it into the generated CSS.
const COLOR = {
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', hoverBorder: 'hover:border-blue-500/50', groupHoverText: 'group-hover:text-blue-400' },
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', hoverBorder: 'hover:border-orange-500/50', groupHoverText: 'group-hover:text-orange-400' },
    pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/20', text: 'text-pink-400', hoverBorder: 'hover:border-pink-500/50', groupHoverText: 'group-hover:text-pink-400' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', hoverBorder: 'hover:border-emerald-500/50', groupHoverText: 'group-hover:text-emerald-400' },
    cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', hoverBorder: 'hover:border-cyan-500/50', groupHoverText: 'group-hover:text-cyan-400' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', hoverBorder: 'hover:border-amber-500/50', groupHoverText: 'group-hover:text-amber-400' },
    rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', hoverBorder: 'hover:border-rose-500/50', groupHoverText: 'group-hover:text-rose-400' },
    indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400', hoverBorder: 'hover:border-indigo-500/50', groupHoverText: 'group-hover:text-indigo-400' },
};

export const PRIMARY_CATEGORIES = [
    { key: 'geografija', label: 'Geografija', icon: Globe, color: COLOR.blue },
    { key: 'povijest', label: 'Povijest', icon: History, color: COLOR.orange },
    { key: 'glazba', label: 'Glazba', icon: Music, color: COLOR.pink },
    { key: 'sport', label: 'Sport', icon: Trophy, color: COLOR.emerald },
    { key: 'znanost', label: 'Znanost i Tehnologija', icon: Atom, color: COLOR.cyan },
    { key: 'opca_znanje', label: 'Opće znanje', icon: Brain, color: COLOR.amber },
    { key: 'pop_kultura', label: 'Pop kultura', icon: Sparkles, color: COLOR.rose },
    { key: 'knjizevnost', label: 'Književnost i Umjetnost', icon: BookOpen, color: COLOR.indigo },
];

export const CATEGORY_META = PRIMARY_CATEGORIES.reduce((acc, cat) => {
    acc[cat.key] = { label: cat.label, icon: cat.icon, color: cat.color };
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
