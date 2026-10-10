import { CATEGORY_META } from '../data/categoryMeta.js';

/** Display label for a duel's category; 'any' is the any-category pool (D8). */
export const categoryLabelFor = (category) => (
    category === 'any' ? 'Bilo koja kategorija' : (CATEGORY_META[category]?.label || category)
);
