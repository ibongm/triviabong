import { describe, it, expect } from 'vitest';
import { composeRound } from './roundComposer';
import { effectiveTier } from './difficulty';

const mulberry = (seed) => () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
};

const make = (tier, n, prefix = tier) => Array.from({ length: n }, (_, i) => ({ id: `${prefix}_${i}`, ...(tier ? { difficulty: tier } : {}) }));
const counts = (qs) => qs.reduce((acc, q) => ({ ...acc, [effectiveTier(q)]: (acc[effectiveTier(q)] || 0) + 1 }), {});

describe('composeRound', () => {
    const pool = [...make('easy', 40), ...make('medium', 40), ...make('hard', 40)];

    it('follows the 3/4/3 curve, ordered easy -> hard', () => {
        for (let seed = 1; seed <= 30; seed++) {
            const round = composeRound(pool, { rand: mulberry(seed) });
            expect(round).toHaveLength(10);
            expect(counts(round)).toEqual({ easy: 3, medium: 4, hard: 3 });
            const order = round.map((q) => ['easy', 'medium', 'hard'].indexOf(effectiveTier(q)));
            expect(order).toEqual([...order].sort((a, b) => a - b));
        }
    });

    it('never repeats a question and only uses pool members', () => {
        const ids = new Set(pool.map((q) => q.id));
        for (let seed = 1; seed <= 30; seed++) {
            const round = composeRound(pool, { rand: mulberry(seed) });
            expect(new Set(round.map((q) => q.id)).size).toBe(10);
            expect(round.every((q) => ids.has(q.id))).toBe(true);
        }
    });

    it('varies between rounds', () => {
        const a = composeRound(pool, { rand: mulberry(1) }).map((q) => q.id).join();
        const b = composeRound(pool, { rand: mulberry(2) }).map((q) => q.id).join();
        expect(a).not.toBe(b);
    });

    it('with no tier data at all, is a plain random pick of 10', () => {
        const untiered = make(null, 200, 'u');
        const round = composeRound(untiered, { rand: mulberry(7) });
        expect(round).toHaveLength(10);
        expect(new Set(round.map((q) => q.id)).size).toBe(10);
        // Not sorted by id: the order stays shuffled.
        expect(round.map((q) => q.id)).not.toEqual([...round.map((q) => q.id)].sort());
    });

    it('fills a short tier from the other tiers instead of returning a short round', () => {
        const lopsided = [...make('easy', 1), ...make('medium', 50), ...make('hard', 0)];
        const round = composeRound(lopsided, { rand: mulberry(3) });
        expect(round).toHaveLength(10);
        expect(counts(round).easy).toBe(1);
    });

    it('returns everything (ordered) when the pool is no bigger than the round', () => {
        const small = [...make('hard', 2), ...make('easy', 3)];
        const round = composeRound(small, { rand: mulberry(5) });
        expect(round).toHaveLength(5);
        expect(round.slice(0, 3).every((q) => q.difficulty === 'easy')).toBe(true);
    });

    it('honours a custom count', () => {
        expect(composeRound(pool, { count: 5, rand: mulberry(9) })).toHaveLength(5);
        expect(composeRound(pool, { count: 11, rand: mulberry(9) })).toHaveLength(11);
    });

    it('does not mutate the pool and skips falsy entries', () => {
        const withHoles = [null, ...pool.slice(0, 20), undefined];
        const copy = [...withHoles];
        const round = composeRound(withHoles, { rand: mulberry(4) });
        expect(withHoles).toEqual(copy);
        expect(round.every(Boolean)).toBe(true);
    });
});
