// Client-side TTL cache for AdminOverview's computed insights (category
// popularity, question accuracy). Caches the *summarized* output, not the
// raw questionAttempts/gameResults arrays - the summary is bounded by the
// number of questions/categories (fixed, small), while the raw collections
// grow forever with every game played, so this stays cheap even as those
// collections do not. See CHANGELOG.md's 2026-08-20 admin-overview entry.
// Same shape as rekordiCache.js, which solves the same class of problem for
// the public Rekordi boards.

const ADMIN_OVERVIEW_CACHE_KEY = 'triviabong_admin_overview_cache';
const ADMIN_OVERVIEW_CACHE_TTL_MS = 15 * 60 * 1000;

/** Returns the cached { popularity, accuracy } if present and still within TTL, else null. */
export const loadCachedAdminOverview = () => {
    try {
        const saved = localStorage.getItem(ADMIN_OVERVIEW_CACHE_KEY);
        if (!saved) return null;
        const { data, storedAt } = JSON.parse(saved);
        if (!data || typeof storedAt !== 'number') return null;
        if (Date.now() - storedAt > ADMIN_OVERVIEW_CACHE_TTL_MS) return null;
        return data;
    } catch (err) {
        console.error('Error loading cached admin overview data:', err);
        return null;
    }
};

/** Stores a freshly-computed { popularity, accuracy } summary with the current timestamp. */
export const saveCachedAdminOverview = (data) => {
    try {
        localStorage.setItem(ADMIN_OVERVIEW_CACHE_KEY, JSON.stringify({ data, storedAt: Date.now() }));
    } catch (err) {
        console.error('Error saving cached admin overview data:', err);
    }
};
