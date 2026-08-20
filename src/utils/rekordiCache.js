// Client-side TTL cache for App.jsx's refreshRekordiData(), which otherwise
// fires 6 parallel Firestore calls (worst case ~121 document reads) on every
// single page load - see CHANGELOG.md's read-quota entry. Rekordi standings
// don't need to be near-real-time, so a page load within the TTL window
// reuses the last fetch instead of hitting Firestore again.

const REKORDI_CACHE_KEY = 'triviabong_rekordi_cache';
const REKORDI_CACHE_TTL_MS = 15 * 60 * 1000;

/** Returns the cached rekordiData if present and still within TTL, else null. */
export const loadCachedRekordi = () => {
    try {
        const saved = localStorage.getItem(REKORDI_CACHE_KEY);
        if (!saved) return null;
        const { data, storedAt } = JSON.parse(saved);
        if (!data || typeof storedAt !== 'number') return null;
        if (Date.now() - storedAt > REKORDI_CACHE_TTL_MS) return null;
        return data;
    } catch (err) {
        console.error('Error loading cached Rekordi data:', err);
        return null;
    }
};

/** Stores a freshly-fetched rekordiData object with the current timestamp. */
export const saveCachedRekordi = (data) => {
    try {
        localStorage.setItem(REKORDI_CACHE_KEY, JSON.stringify({ data, storedAt: Date.now() }));
    } catch (err) {
        console.error('Error saving cached Rekordi data:', err);
    }
};
