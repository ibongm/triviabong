import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadCachedAdminSection, saveCachedAdminSection, clearCachedAdminSection } from './adminSectionCache';

// Minimal in-memory localStorage stub. The unit suite runs in node with no
// jsdom (see CLAUDE.md), and the only browser API this module touches is
// localStorage's getItem/setItem/removeItem - so a stub keeps this a pure
// logic test (TTL math, key namespacing, malformed-input handling) rather
// than pulling in a DOM environment.
const makeStorage = () => {
    const store = new Map();
    return {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        raw: store,
    };
};

let storage;

beforeEach(() => {
    storage = makeStorage();
    globalThis.localStorage = storage;
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete globalThis.localStorage;
});

describe('adminSectionCache round-trip', () => {
    it('returns null for a key that was never written', () => {
        expect(loadCachedAdminSection('players.totalTimeByUid')).toBeNull();
    });

    it('reads back what it stored', () => {
        const totals = { daily: { abc: 30 }, weekly: { abc: 120 }, all: { abc: 900 } };
        saveCachedAdminSection('players.totalTimeByUid', totals);
        expect(loadCachedAdminSection('players.totalTimeByUid')).toEqual(totals);
    });

    it('keeps sections isolated from each other', () => {
        saveCachedAdminSection('overview', { popularity: ['a'] });
        saveCachedAdminSection('players.totalTimeByUid', { daily: {} });
        expect(loadCachedAdminSection('overview')).toEqual({ popularity: ['a'] });
        expect(loadCachedAdminSection('players.totalTimeByUid')).toEqual({ daily: {} });
    });

    it('namespaces its localStorage keys so it cannot collide with other app state', () => {
        saveCachedAdminSection('overview', { popularity: [] });
        const keys = [...storage.raw.keys()];
        expect(keys).toEqual(['triviabong_admin_cache_overview']);
    });

    it('clear removes only the targeted section', () => {
        saveCachedAdminSection('overview', { popularity: [] });
        saveCachedAdminSection('players.totalTimeByUid', { daily: {} });
        clearCachedAdminSection('overview');
        expect(loadCachedAdminSection('overview')).toBeNull();
        expect(loadCachedAdminSection('players.totalTimeByUid')).toEqual({ daily: {} });
    });
});

describe('adminSectionCache TTL', () => {
    it('serves an entry that is still inside the 15-minute window', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-08-22T02:00:00Z'));
        saveCachedAdminSection('overview', { popularity: ['a'] });
        vi.setSystemTime(new Date('2026-08-22T02:14:00Z'));
        expect(loadCachedAdminSection('overview')).toEqual({ popularity: ['a'] });
    });

    it('drops an entry once the 15-minute window has passed', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-08-22T02:00:00Z'));
        saveCachedAdminSection('overview', { popularity: ['a'] });
        vi.setSystemTime(new Date('2026-08-22T02:16:00Z'));
        expect(loadCachedAdminSection('overview')).toBeNull();
    });
});

describe('adminSectionCache malformed input', () => {
    it('returns null rather than throwing on unparseable JSON', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        storage.setItem('triviabong_admin_cache_overview', 'not json{');
        expect(loadCachedAdminSection('overview')).toBeNull();
    });

    it('returns null when the stored envelope has no numeric storedAt', () => {
        storage.setItem('triviabong_admin_cache_overview', JSON.stringify({ data: { a: 1 } }));
        expect(loadCachedAdminSection('overview')).toBeNull();
    });

    it('survives a localStorage that throws (private mode, blocked site data)', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        globalThis.localStorage = {
            getItem: () => { throw new Error('denied'); },
            setItem: () => { throw new Error('denied'); },
            removeItem: () => { throw new Error('denied'); },
        };
        expect(() => saveCachedAdminSection('overview', { a: 1 })).not.toThrow();
        expect(loadCachedAdminSection('overview')).toBeNull();
        expect(() => clearCachedAdminSection('overview')).not.toThrow();
    });
});

// Guards the trap documented in adminSectionCache.js's header and at the
// AdminPlayers call site: this cache JSON-serializes, and a Firestore
// Timestamp does not survive that. It comes back as a plain
// { seconds, nanoseconds } object with no toMillis/toDate methods, which the
// admin components' shared toMillis() helper then reads as 0 - silently
// sorting and rendering the affected column as empty rather than failing
// loudly. Callers must normalize timestamps to millis before caching.
describe('adminSectionCache serialization contract', () => {
    const toMillis = (value) => {
        if (!value) return 0;
        if (typeof value.toMillis === 'function') return value.toMillis();
        if (typeof value.toDate === 'function') return value.toDate().getTime();
        return new Date(value).getTime() || 0;
    };

    it('strips the methods off a Firestore-Timestamp-like value, breaking toMillis', () => {
        const timestamp = { seconds: 1787000000, nanoseconds: 0, toMillis: () => 1787000000000 };
        expect(toMillis(timestamp)).toBe(1787000000000);

        saveCachedAdminSection('players.users', [{ uid: 'a', lastLogin: timestamp }]);
        const [restored] = loadCachedAdminSection('players.users');

        expect(typeof restored.lastLogin.toMillis).toBe('undefined');
        expect(toMillis(restored.lastLogin)).toBe(0);
    });

    it('round-trips a timestamp that was normalized to millis before caching', () => {
        saveCachedAdminSection('players.users', [{ uid: 'a', lastLogin: 1787000000000 }]);
        const [restored] = loadCachedAdminSection('players.users');
        expect(toMillis(restored.lastLogin)).toBe(1787000000000);
    });
});
