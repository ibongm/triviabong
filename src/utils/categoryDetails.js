import { HelpCircle } from 'lucide-react';
import { resolveCategoryKey } from '../data/categoryKeys';
import { CATEGORY_META } from '../data/categoryMeta';

// Resolve a category key to its display metadata (label + icon).
//
// Goes through the same alias map getQuestionsByCategory uses, so a question's
// raw `category` field (which can be an alias spelling, e.g. legacy data using
// the filename-style "znanost_i_tehnologija" instead of the canonical pack key
// "znanost") still finds its CATEGORY_META entry instead of falling through to
// the raw-string fallback below.
//
// Prefer this over indexing CATEGORY_META directly: a bare
// `CATEGORY_META[key]?.label || key` skips alias resolution, so an alias key
// renders as a raw underscored string rather than its real label.
export const getCategoryDetails = (catKey) => {
    const resolvedKey = resolveCategoryKey(catKey);
    return CATEGORY_META[resolvedKey] || {
        label: catKey ? catKey.replace(/_/g, ' ') : 'Kategorija',
        icon: HelpCircle
    };
};

// Label-only convenience for the places that render a name but no icon.
export const getCategoryLabel = (catKey) => getCategoryDetails(catKey).label;
