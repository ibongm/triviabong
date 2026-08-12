import { HelpCircle } from 'lucide-react';
import { resolveCategoryKey } from '../data/categoryKeys';
import { CATEGORY_META } from '../data/categoryMeta';

// Moved out of App.jsx (originally module-level consts/helpers there) so
// the LOBBY/LEADERBOARD/PLAYING screen components can share them without
// each needing App.jsx itself as a dependency - pure, no component state.

export const DEFAULT_CATEGORY_COLOR = { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', hoverBorder: 'hover:border-amber-500/50', groupHoverText: 'group-hover:text-amber-400' };

export const getCategoryDetails = (catKey) => {
    const resolvedKey = resolveCategoryKey(catKey);
    return CATEGORY_META[resolvedKey] || {
        label: catKey ? catKey.replace(/_/g, ' ') : 'Kategorija',
        icon: HelpCircle,
        color: DEFAULT_CATEGORY_COLOR
    };
};

export const checkIsCorrect = (q, option) => {
    if (!q || option === undefined) return false;
    const correct = String(q.correct_answer || q.correctAnswer || '').trim().toLowerCase();
    return String(option).trim().toLowerCase() === correct;
};
