// Simple in-memory cache for AdminPanel's per-section Firestore reads.
// AdminPanel.jsx unmounts/remounts each section on every tab switch (by
// design - see its own comment), which meant every tab revisit within the
// same admin session re-ran its full getAllX() collection scan from
// scratch - the single biggest driver of avoidable admin-panel read volume
// (see CHANGELOG.md's Firestore-quota reduction pass). Module-level (not
// React state) so cached data survives a section's unmount without having
// to lift state up into AdminPanel and thread it through every subcomponent's
// props - each admin section already owns its own local state shape, this
// only saves it from being re-fetched.
const cache = new Map();

export const getCachedAdminData = (key) => cache.get(key) ?? null;

export const setCachedAdminData = (key, data) => {
    cache.set(key, data);
};

// Used by an explicit "Refresh" action - admin data (new reports, new
// submissions) does change during a session, so the cache is a "skip
// redundant re-fetches" optimization, not a permanent stale-forever cache.
export const clearCachedAdminData = (key) => {
    cache.delete(key);
};
