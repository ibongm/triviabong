// localStorage TTL cache for the Admin Panel's per-section Firestore reads,
// keyed per section. Companion to adminDataCache.js, which does the same job
// for a different lifetime: that one is a module-level Map covering
// tab-switch reuse *within* one page load (AdminPanel unmounts/remounts each
// section on every tab switch), this one survives a full page reload.
//
// The reload gap is the one that actually costs quota. On 2026-08-22 a single
// admin session - play a round, open the panel, browse the tabs, refresh -
// drove a 6,474-read spike (13% of the Spark plan's 50k/day) in ~2 minutes,
// because the reload wiped adminDataCache and every section re-ran its full
// collection scan from scratch. Cloud Monitoring's read_ops_count broke the
// spike down as 100% QUERY-type reads, i.e. collection scans, with LOOKUP
// flat. Same failure shape as the two 45k/46k spikes in CHANGELOG's
// 2026-08-20 entries.
//
// Cache the *computed, bounded* result per section, never the raw collection
// arrays - questionAttempts/gameResults/sessions grow forever with play while
// the summaries derived from them do not. Anything stored here is
// JSON-serialized, so it must survive that round-trip: Firestore Timestamp
// objects do NOT (they come back as plain { seconds, nanoseconds } and every
// toMillis() helper in the admin components then reads them as 0). Normalize
// timestamps to millis before caching, or don't cache that dataset.
//
// Same shape as rekordiCache.js, which solves this class of problem for the
// public Rekordi boards.

const CACHE_PREFIX = 'triviabong_admin_cache_';
const CACHE_TTL_MS = 15 * 60 * 1000;

const storageKey = (key) => `${CACHE_PREFIX}${key}`;

/** Returns the cached value for `key` if present and still within TTL, else null. */
export const loadCachedAdminSection = (key) => {
    try {
        const saved = localStorage.getItem(storageKey(key));
        if (!saved) return null;
        const { data, storedAt } = JSON.parse(saved);
        if (!data || typeof storedAt !== 'number') return null;
        if (Date.now() - storedAt > CACHE_TTL_MS) return null;
        return data;
    } catch (err) {
        console.error(`Error loading cached admin section "${key}":`, err);
        return null;
    }
};

/** Stores a freshly-computed summary for `key` with the current timestamp. */
export const saveCachedAdminSection = (key, data) => {
    try {
        localStorage.setItem(storageKey(key), JSON.stringify({ data, storedAt: Date.now() }));
    } catch (err) {
        console.error(`Error saving cached admin section "${key}":`, err);
    }
};

/**
 * Drops the persisted entry for `key`. Used by the explicit "🔄 Osvježi"
 * actions, which must reach Firestore even on a cache hit - the admin clicks
 * it precisely when they want to see something the cache can't know about.
 */
export const clearCachedAdminSection = (key) => {
    try {
        localStorage.removeItem(storageKey(key));
    } catch (err) {
        console.error(`Error clearing cached admin section "${key}":`, err);
    }
};
