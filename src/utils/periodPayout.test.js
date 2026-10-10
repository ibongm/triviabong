import { describe, it, expect } from 'vitest';
import * as api from '../../api/daily-challenge-payout.js';
import * as periods from './periods.js';
import { groupIntoTiers, seasonBadgesFor } from './periodBoards.js';
import { SEASONS, WEEKLY_TOP3_COINS, WEEKLY_TOP3_XP, SEASON_TOP_BADGE_COUNT } from '../constants/seasons.js';

// The cron can't import from src/, so it carries inlined copies of the week /
// season / tier logic. These tests pin the copies to the originals.

describe('cron copies match src/utils/periods.js', () => {
    it('weekKeyForDateKey / weekStartDateKey / addWeeks agree for ten years of days', () => {
        let dateKey = '2024-01-01';
        for (let i = 0; i < 3650; i += 1) {
            expect(api.weekKeyForDateKey(dateKey)).toBe(periods.weekKeyForDateKey(dateKey));
            dateKey = periods.addDays(dateKey, 1);
        }
        let week = '2024-W01';
        for (let i = 0; i < 520; i += 1) {
            expect(api.weekStartDateKey(week)).toBe(periods.weekStartDateKey(week));
            expect(api.addWeeks(week, 3)).toBe(periods.addWeeks(week, 3));
            expect(api.addWeeks(week, -2)).toBe(periods.addWeeks(week, -2));
            week = periods.addWeeks(week, 1);
        }
    });

    it('SEASONS and the season end week agree', () => {
        expect(api.SEASONS).toEqual(SEASONS);
        for (const season of SEASONS) {
            expect(api.seasonEndWeek(season)).toBe(periods.seasonEndWeek(season));
        }
    });

    it('reward constants agree', () => {
        expect(api.SEASON_TOP_BADGE_COUNT).toBe(SEASON_TOP_BADGE_COUNT);
        expect(api.WEEKLY_TOP3_COINS).toEqual(WEEKLY_TOP3_COINS);
        expect(api.WEEKLY_TOP3_XP).toEqual(WEEKLY_TOP3_XP);
        const plan = api.planWeeklyPayout([{ uid: 'a', total: 3 }, { uid: 'b', total: 2 }, { uid: 'c', total: 1 }]);
        for (const rank of [1, 2, 3]) {
            const award = plan.awards[rank - 1];
            expect(award.coins).toBe(WEEKLY_TOP3_COINS[rank]);
            expect(award.xp).toBe(WEEKLY_TOP3_XP[rank]);
        }
    });

    it('tier grouping and season badges agree on random boards', () => {
        let seed = 42;
        const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
        for (let run = 0; run < 100; run += 1) {
            const n = Math.floor(rand() * 30);
            const rows = Array.from({ length: n }, (_, i) => ({ uid: `u${i}`, total: Math.floor(rand() * 6) * 100 }))
                .sort((a, b) => b.total - a.total);
            const a = api.groupIntoTiers(rows).map((t) => [t.rank, t.value, t.players.map((p) => p.uid)]);
            const b = groupIntoTiers(rows).map((t) => [t.rank, t.value, t.players.map((p) => p.uid)]);
            expect(a).toEqual(b);
            expect(api.planSeasonBadges('s1', rows)).toEqual(seasonBadgesFor('s1', rows));
        }
    });
});

describe('lastEndedWeek', () => {
    it('on a Sunday run it is the week that just ended', () => {
        expect(api.lastEndedWeek('2026-10-11')).toBe('2026-W41'); // Sunday
    });
    it('on later days it still points at the same finished week (catch-up)', () => {
        expect(api.lastEndedWeek('2026-10-12')).toBe('2026-W41'); // Monday
        expect(api.lastEndedWeek('2026-10-17')).toBe('2026-W41'); // Saturday
        expect(api.lastEndedWeek('2026-10-18')).toBe('2026-W42'); // next Sunday
    });
    it('crosses the year boundary', () => {
        expect(api.lastEndedWeek('2027-01-03')).toBe('2026-W53'); // Sunday
        expect(api.lastEndedWeek('2027-01-04')).toBe('2026-W53'); // Monday of 2027-W01
    });
});

describe('planWeeklyPayout', () => {
    it('pays the podium and every tie in a tier in full', () => {
        const plan = api.planWeeklyPayout([
            { uid: 'a', name: 'A', total: 5000 }, { uid: 'b', name: 'B', total: 5000 },
            { uid: 'c', name: 'C', total: 4000 }, { uid: 'd', name: 'D', total: 3000 },
            { uid: 'e', name: 'E', total: 2000 },
        ]);
        expect(plan.tiers).toEqual([
            { rank: 1, total: 5000, count: 2 }, { rank: 2, total: 4000, count: 1 }, { rank: 3, total: 3000, count: 1 },
        ]);
        expect(plan.awards).toEqual([
            { uid: 'a', coins: 30, xp: 30 }, { uid: 'b', coins: 30, xp: 30 },
            { uid: 'c', coins: 15, xp: 15 }, { uid: 'd', coins: 10, xp: 10 },
        ]);
    });

    it('pays nobody on an empty or all-zero board', () => {
        expect(api.planWeeklyPayout([]).awards).toEqual([]);
        expect(api.planWeeklyPayout([{ uid: 'z', total: 0 }]).awards).toEqual([]);
    });
});

// --- A tiny in-memory stand-in for the slice of the Admin SDK the payout uses.
const makeFakeDb = (store) => {
    const sets = [];
    const docRef = (path) => ({
        path,
        collection: (name) => collectionRef(`${path}/${name}`),
        get: async () => snapOf(path),
    });
    const snapOf = (path) => ({ exists: store.has(path), data: () => store.get(path), id: path.split('/').pop() });
    const collectionRef = (path) => ({
        doc: (id) => docRef(`${path}/${id}`),
        orderBy: (field) => ({
            limit: (n) => ({
                __query: true,
                run: () => {
                    const docs = [...store.keys()]
                        .filter((k) => k.startsWith(`${path}/`) && !k.slice(path.length + 1).includes('/'))
                        .map((k) => ({ id: k.split('/').pop(), data: () => store.get(k) }))
                        .sort((a, b) => b.data()[field] - a.data()[field])
                        .slice(0, n);
                    return { empty: docs.length === 0, docs };
                },
            }),
        }),
    });
    const db = {
        collection: (name) => collectionRef(name),
        runTransaction: async (fn) => {
            const pending = [];
            const tx = {
                get: async (target) => (target.__query ? target.run() : target.get()),
                set: (ref, data) => pending.push({ path: ref.path, data }),
            };
            const out = await fn(tx);
            pending.forEach((w) => { store.set(w.path, w.data); sets.push(w.path); });
            return out;
        },
    };
    return { db, sets };
};

describe('payoutWeek idempotency', () => {
    const seed = () => new Map([
        ['weeklyBoards/2026-W41/players/a', { name: 'A', total: 5000 }],
        ['weeklyBoards/2026-W41/players/b', { name: 'B', total: 4000 }],
        ['weeklyBoards/2026-W41/players/c', { name: 'C', total: 3000 }],
        ['weeklyBoards/2026-W41/players/d', { name: 'D', total: 100 }],
    ]);

    it('pays the podium once and records paidAt', async () => {
        const store = seed();
        const { db, sets } = makeFakeDb(store);
        const out = await api.payoutWeek(db, '2026-W41');
        expect(out).toEqual({ weekKey: '2026-W41', alreadyPaid: false, winners: 3 });
        expect(sets.filter((p) => p.startsWith('users/')).sort()).toEqual(['users/a', 'users/b', 'users/c']);
        const meta = store.get('weeklyBoards/2026-W41');
        expect(meta.paidAt).toBeTruthy();
        expect(meta.winners.map((w) => [w.uid, w.rank])).toEqual([['a', 1], ['b', 2], ['c', 3]]);
    });

    it('a second run (re-run, or the daily catch-up) pays nobody again', async () => {
        const store = seed();
        const { db, sets } = makeFakeDb(store);
        await api.payoutWeek(db, '2026-W41');
        const writesAfterFirst = sets.length;
        const again = await api.payoutWeek(db, '2026-W41');
        expect(again).toEqual({ weekKey: '2026-W41', alreadyPaid: true });
        expect(sets.length).toBe(writesAfterFirst);
    });

    it('an empty week is still marked paid so it is not re-read forever', async () => {
        const store = new Map();
        const { db, sets } = makeFakeDb(store);
        const out = await api.payoutWeek(db, '2026-W40');
        expect(out.winners).toBe(0);
        expect(sets).toEqual(['weeklyBoards/2026-W40']);
    });

    it('runPeriodPayouts never throws, even when the database does', async () => {
        const broken = { collection: () => { throw new Error('quota exceeded'); } };
        const result = await api.runPeriodPayouts(broken, '2026-10-11');
        expect(result.error).toMatch(/quota/);
        expect(result.weekKey).toBe('2026-W41');
    });
});
