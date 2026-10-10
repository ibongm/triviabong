import { describe, it, expect } from 'vitest';
import {
    insertTopScore, weeklyFields, applyRoundToWeekly, scoresFromWeeklyDoc,
    seasonTotalFromWeeks, applyWeeklyTotalToSeason, planPeriodWrites,
    rankFromHigherCount, groupIntoTiers, seasonBadgesFor, badgeLabel, bestBadgePerSeason,
} from './periodBoards.js';
import { SEASONS } from '../constants/seasons.js';

describe('insertTopScore', () => {
    it('fills empty slots first (fewer than 5 rounds)', () => {
        let scores = [0, 0, 0, 0, 0];
        for (const s of [300, 900, 500]) scores = insertTopScore(scores, s).scores;
        expect(scores).toEqual([900, 500, 300, 0, 0]);
    });

    it('accepts a score that beats the 5th best and drops the old 5th', () => {
        const r = insertTopScore([900, 800, 700, 600, 500], 650);
        expect(r.changed).toBe(true);
        expect(r.scores).toEqual([900, 800, 700, 650, 600]);
    });

    it('rejects a score that does not beat the 5th best', () => {
        const r = insertTopScore([900, 800, 700, 600, 500], 400);
        expect(r.changed).toBe(false);
        expect(r.scores).toEqual([900, 800, 700, 600, 500]);
    });

    it('ties with the 5th best change nothing; ties higher up are inserted', () => {
        expect(insertTopScore([900, 800, 700, 600, 500], 500).changed).toBe(false);
        expect(insertTopScore([900, 800, 700, 600, 500], 800).scores).toEqual([900, 800, 800, 700, 600]);
    });

    it('ignores zero, negative, fractional and non-numeric scores', () => {
        for (const bad of [0, -5, 12.5, NaN, null, undefined, '700']) {
            expect(insertTopScore([0, 0, 0, 0, 0], bad).changed).toBe(false);
        }
    });

    it('normalizes an unsorted or short input', () => {
        expect(insertTopScore([100, 300], 200).scores).toEqual([300, 200, 100, 0, 0]);
    });
});

describe('weekly doc', () => {
    it('sums the five slots into total', () => {
        expect(weeklyFields([900, 800, 700, 0, 0])).toEqual({ s1: 900, s2: 800, s3: 700, s4: 0, s5: 0, total: 2400 });
    });

    it('creates a first-round doc with a single non-zero slot', () => {
        const r = applyRoundToWeekly(null, 1234);
        expect(r.changed).toBe(true);
        expect(r.fields).toEqual({ s1: 1234, s2: 0, s3: 0, s4: 0, s5: 0, total: 1234 });
    });

    it('reads a stored doc back sorted', () => {
        expect(scoresFromWeeklyDoc({ s1: 5, s2: 9, s3: 0 })).toEqual([9, 5, 0, 0, 0]);
    });

    it('every accepted insertion obeys the interleaving the rules check', () => {
        // firestore.rules accepts an update iff n1 >= o1, o_i <= n_i <= o_{i-1}
        // (i = 2..5) and total grows by 0..10000. Any real insertion must satisfy it.
        let seed = 7;
        const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
        for (let run = 0; run < 200; run += 1) {
            let doc = null;
            for (let round = 0; round < 12; round += 1) {
                const score = Math.floor(rand() * 10001);
                const before = scoresFromWeeklyDoc(doc);
                const r = applyRoundToWeekly(doc, score);
                if (!r.changed) continue;
                const after = WEEKLY(r.fields);
                expect(after[0]).toBeGreaterThanOrEqual(before[0]);
                for (let i = 1; i < 5; i += 1) {
                    expect(after[i]).toBeGreaterThanOrEqual(before[i]);
                    expect(after[i]).toBeLessThanOrEqual(before[i - 1]);
                }
                const growth = r.fields.total - before.reduce((a, b) => a + b, 0);
                expect(growth).toBeGreaterThan(0);
                expect(growth).toBeLessThanOrEqual(10000);
                doc = r.fields;
            }
        }
    });
});
const WEEKLY = (f) => [f.s1, f.s2, f.s3, f.s4, f.s5];

describe('season roll-up', () => {
    it('sums the best five weekly totals', () => {
        const weeks = { a: 100, b: 700, c: 300, d: 500, e: 200, f: 900, g: 50 };
        expect(seasonTotalFromWeeks(weeks)).toBe(900 + 700 + 500 + 300 + 200);
        expect(seasonTotalFromWeeks({})).toBe(0);
        expect(seasonTotalFromWeeks(null)).toBe(0);
    });

    it('adds a new week and raises an existing one, never lowers', () => {
        let r = applyWeeklyTotalToSeason(null, '2026-W44', 800);
        expect(r).toEqual({ changed: true, weeks: { '2026-W44': 800 }, total: 800 });
        r = applyWeeklyTotalToSeason({ weeks: r.weeks }, '2026-W44', 1200);
        expect(r).toEqual({ changed: true, weeks: { '2026-W44': 1200 }, total: 1200 });
        r = applyWeeklyTotalToSeason({ weeks: r.weeks }, '2026-W44', 900);
        expect(r.changed).toBe(false);
        expect(r.total).toBe(1200);
    });

    it('a sixth week only counts if it beats the weakest of the best five', () => {
        const weeks = { w1: 500, w2: 500, w3: 500, w4: 500, w5: 500 };
        const r = applyWeeklyTotalToSeason({ weeks }, 'w6', 400);
        expect(r.changed).toBe(true); // stored (it may matter later)...
        expect(r.total).toBe(2500); // ...but the total does not move
        expect(applyWeeklyTotalToSeason({ weeks }, 'w6', 600).total).toBe(2600);
    });
});

describe('planPeriodWrites', () => {
    const base = { weekKey: '2026-W44', season: SEASONS[0] };

    it('plans weekly + season on a first round', () => {
        const p = planPeriodWrites({ ...base, weeklyDoc: null, seasonDoc: null, score: 1500 });
        expect(p.weekly.total).toBe(1500);
        expect(p.season).toEqual({ weeks: { '2026-W44': 1500 }, total: 1500 });
    });

    it('writes nothing for a round that does not qualify', () => {
        const weeklyDoc = { s1: 900, s2: 800, s3: 700, s4: 600, s5: 500, total: 3500 };
        const p = planPeriodWrites({ ...base, weeklyDoc, seasonDoc: { weeks: { '2026-W44': 3500 }, total: 3500 }, score: 300 });
        expect(p).toEqual({ weekly: null, season: null });
    });

    it('skips the season part outside a season', () => {
        const p = planPeriodWrites({ weekKey: '2026-W41', season: null, weeklyDoc: null, seasonDoc: null, score: 700 });
        expect(p.weekly.total).toBe(700);
        expect(p.season).toBeNull();
    });
});

describe('podium and badges', () => {
    const rows = [
        { uid: 'a', total: 900 }, { uid: 'b', total: 900 }, { uid: 'c', total: 700 },
        { uid: 'd', total: 500 }, { uid: 'e', total: 400 }, { uid: 'z', total: 0 },
    ];

    it('groups ties into one tier and caps at three tiers', () => {
        const tiers = groupIntoTiers(rows);
        expect(tiers.map((t) => [t.rank, t.value, t.players.map((p) => p.uid)])).toEqual([
            [1, 900, ['a', 'b']], [2, 700, ['c']], [3, 500, ['d']],
        ]);
    });

    it('never ranks zero-total rows', () => {
        expect(groupIntoTiers([{ uid: 'z', total: 0 }])).toEqual([]);
    });

    it('computes rank from a higher-count', () => {
        expect(rankFromHigherCount(0)).toBe(1);
        expect(rankFromHigherCount(6)).toBe(7);
        expect(rankFromHigherCount(-1)).toBeNull();
        expect(rankFromHigherCount(undefined)).toBeNull();
    });

    it('awards medals by tier and top10 to the first ten positions', () => {
        const b = seasonBadgesFor('s1', rows);
        expect(b.a).toEqual(['s1_gold', 's1_top10']);
        expect(b.b).toEqual(['s1_gold', 's1_top10']);
        expect(b.c).toEqual(['s1_silver', 's1_top10']);
        expect(b.d).toEqual(['s1_bronze', 's1_top10']);
        expect(b.e).toEqual(['s1_top10']);
        expect(b.z).toBeUndefined();
    });

    it('top10 includes players tied with the 10th', () => {
        const many = Array.from({ length: 12 }, (_, i) => ({ uid: `u${i}`, total: 1000 - (i >= 9 ? 90 : i * 5) }));
        // u9, u10, u11 all tie at 910; u9 is 10th -> all three get top10.
        const b = seasonBadgesFor('s1', many);
        expect(b.u9).toContain('s1_top10');
        expect(b.u10).toContain('s1_top10');
        expect(b.u11).toContain('s1_top10');
    });

    it('labels badges and rejects unknown ones', () => {
        expect(badgeLabel('s1_gold', SEASONS)).toBe('🥇 Sezona 1');
        expect(badgeLabel('s1_top10', SEASONS)).toBe('🏅 Sezona 1 · Top 10');
        expect(badgeLabel('s9_gold', SEASONS)).toBeNull();
        expect(badgeLabel('nonsense', SEASONS)).toBeNull();
    });

    it('keeps only the best badge per season', () => {
        expect(bestBadgePerSeason(['s1_top10', 's1_gold', 's2_bronze', 's2_top10', 'junk'])).toEqual(['s1_gold', 's2_bronze']);
    });
});
