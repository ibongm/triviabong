import { describe, it, expect } from 'vitest';
import {
    LEAGUE_CODE_ALPHABET, LEAGUE_CODE_LENGTH, generateLeagueCode, generateUnusedLeagueCode,
    normalizeLeagueCode, isValidLeagueCode, parseLeaguePath, buildLeagueLink,
    sanitizeLeagueName, sanitizeLeagueEmoji, LEAGUE_EMOJIS, LEAGUE_NAME_MAX,
    chunk, pickNewOwner, planLeave, canJoinMoreLeagues, MAX_LEAGUES_PER_PLAYER,
    buildWeeklyTable, buildDailyRanking, lastWeekWinners, formatLastPlayed, defaultRandomInt,
} from './league.js';

const ts = (ms) => ({ toMillis: () => ms });

describe('league codes', () => {
    it('alphabet has 32 unambiguous characters', () => {
        expect(LEAGUE_CODE_ALPHABET).toHaveLength(32);
        expect(new Set(LEAGUE_CODE_ALPHABET).size).toBe(32);
        for (const bad of ['0', 'O', '1', 'I']) expect(LEAGUE_CODE_ALPHABET).not.toContain(bad);
    });

    it('generates 6-character codes from the alphabet, always valid', () => {
        for (let i = 0; i < 500; i += 1) {
            const code = generateLeagueCode();
            expect(code).toHaveLength(LEAGUE_CODE_LENGTH);
            expect(isValidLeagueCode(code)).toBe(true);
        }
    });

    it('uses every position of the alphabet with a deterministic source', () => {
        let n = 0;
        const code = generateLeagueCode(() => n++);
        expect(code).toBe(LEAGUE_CODE_ALPHABET.slice(0, 6));
    });

    it('default random source stays in range', () => {
        for (let i = 0; i < 1000; i += 1) {
            const v = defaultRandomInt(32);
            expect(Number.isInteger(v) && v >= 0 && v < 32).toBe(true);
        }
    });

    it('retries on collision and gives up after maxAttempts', async () => {
        const seen = [];
        let call = 0;
        const code = await generateUnusedLeagueCode(async (c) => { seen.push(c); call += 1; return call < 3; });
        expect(seen).toHaveLength(3);
        expect(code).toBe(seen[2]);
        expect(await generateUnusedLeagueCode(async () => true, { maxAttempts: 3 })).toBeNull();
    });

    it('normalizes pasted input', () => {
        expect(normalizeLeagueCode(' abc-234 ')).toBe('ABC234');
        expect(normalizeLeagueCode(null)).toBe('');
        expect(isValidLeagueCode('ABC234')).toBe(true);
        expect(isValidLeagueCode('ABC23')).toBe(false);
        expect(isValidLeagueCode('ABC230')).toBe(false); // 0 is not in the alphabet
        expect(isValidLeagueCode('abc234')).toBe(false); // canonical form is uppercase
    });
});

describe('link parsing', () => {
    it('extracts a code from /liga/CODE', () => {
        expect(parseLeaguePath('/liga/ABC234')).toBe('ABC234');
        expect(parseLeaguePath('/liga/abc234/')).toBe('ABC234');
        expect(parseLeaguePath('/LIGA/ABC234')).toBe('ABC234');
    });
    it('rejects everything else', () => {
        for (const p of ['/', '/admin', '/liga', '/liga/', '/liga/ABC23', '/liga/ABC2345', '/liga/ABC230', '/liga/ABC234/extra', '/x/liga/ABC234', null, undefined]) {
            expect(parseLeaguePath(p)).toBeNull();
        }
    });
    it('builds a link', () => {
        expect(buildLeagueLink('https://triviabong.vercel.app/', 'ABC234')).toBe('https://triviabong.vercel.app/liga/ABC234');
        expect(parseLeaguePath(new URL(buildLeagueLink('https://x.test', 'ABC234')).pathname)).toBe('ABC234');
    });
});

describe('sanitizing', () => {
    it('trims, collapses spaces and caps the name by characters', () => {
        expect(sanitizeLeagueName('  Moja   liga  ')).toBe('Moja liga');
        expect(sanitizeLeagueName('x'.repeat(100))).toHaveLength(LEAGUE_NAME_MAX);
        expect(sanitizeLeagueName(null)).toBe('');
        // surrogate pairs count once
        const emojiName = sanitizeLeagueName('😀'.repeat(40));
        expect(emojiName.length).toBeLessThanOrEqual(LEAGUE_NAME_MAX);
        expect(Array.from(emojiName)).toHaveLength(15);
        expect(emojiName).toBe('😀'.repeat(15)); // no half pairs
    });
    it('only accepts picker emojis', () => {
        expect(sanitizeLeagueEmoji('🦁')).toBe('🦁');
        expect(sanitizeLeagueEmoji('<script>')).toBe(LEAGUE_EMOJIS[0]);
        expect(sanitizeLeagueEmoji(undefined)).toBe(LEAGUE_EMOJIS[0]);
    });
    it('every picker emoji fits the 8-character rules cap', () => {
        for (const e of LEAGUE_EMOJIS) expect(e.length).toBeLessThanOrEqual(8);
    });
});

describe('chunking and limits', () => {
    it('splits 50 members into two documentId() in-queries of <= 30', () => {
        const parts = chunk(Array.from({ length: 50 }, (_, i) => `u${i}`));
        expect(parts.map((p) => p.length)).toEqual([30, 20]);
        expect(chunk([])).toEqual([]);
    });
    it('caps leagues per player', () => {
        expect(canJoinMoreLeagues(MAX_LEAGUES_PER_PLAYER - 1)).toBe(true);
        expect(canJoinMoreLeagues(MAX_LEAGUES_PER_PLAYER)).toBe(false);
    });
});

describe('ownership', () => {
    const members = [
        { uid: 'owner', joinedAt: ts(1000) },
        { uid: 'late', joinedAt: ts(5000) },
        { uid: 'early', joinedAt: ts(2000) },
        { uid: 'also-early', joinedAt: ts(2000) },
    ];
    it('hands over to the longest-standing member, uid as tiebreak', () => {
        expect(pickNewOwner(members, 'owner')).toBe('also-early');
        expect(pickNewOwner([{ uid: 'owner', joinedAt: ts(1) }], 'owner')).toBeNull();
    });
    it('plans what leaving does', () => {
        const league = { ownerUid: 'owner' };
        expect(planLeave({ league, members, uid: 'late' })).toEqual({ kind: 'leave' });
        expect(planLeave({ league, members, uid: 'owner' })).toEqual({ kind: 'transfer_and_leave', newOwnerUid: 'also-early' });
        expect(planLeave({ league, members: [{ uid: 'owner' }], uid: 'owner' })).toEqual({ kind: 'delete_league' });
    });
});

describe('weekly table', () => {
    const members = [
        { uid: 'a', name: 'Ana', joinedAt: ts(1) },
        { uid: 'b', name: 'Boris', joinedAt: ts(2) },
        { uid: 'c', name: 'Cvita', joinedAt: ts(3) },
        { uid: 'd', name: 'Dino', joinedAt: ts(4) },
        { uid: 'e', name: 'Eva', joinedAt: ts(5) },
    ];
    const weekly = {
        a: { total: 3000, name: 'Ana', updatedAt: ts(111) },
        b: { total: 5000, name: 'Boris K.' },
        c: { total: 3000, name: 'Cvita' },
        d: { total: 0 },
        // e has no doc at all
    };

    it('ranks players by total, sharing ranks on ties', () => {
        const rows = buildWeeklyTable(members, weekly);
        expect(rows.slice(0, 3).map((r) => [r.uid, r.rank, r.total])).toEqual([['b', 1, 5000], ['a', 2, 3000], ['c', 2, 3000]]);
    });

    it('puts members without a score at the bottom with no rank, in join order', () => {
        const rows = buildWeeklyTable(members, weekly);
        expect(rows.slice(3).map((r) => [r.uid, r.rank, r.total])).toEqual([['d', null, 0], ['e', null, 0]]);
    });

    it('prefers the name on the weekly doc and keeps last-played', () => {
        const rows = buildWeeklyTable(members, weekly);
        expect(rows.find((r) => r.uid === 'b').name).toBe('Boris K.');
        expect(rows.find((r) => r.uid === 'a').lastPlayedMs).toBe(111);
    });

    it('works for an empty league and for nobody having played', () => {
        expect(buildWeeklyTable([], {})).toEqual([]);
        expect(buildWeeklyTable(members, {}).every((r) => r.rank === null && r.total === 0)).toBe(true);
    });

    it('ignores junk totals', () => {
        const rows = buildWeeklyTable(members, { a: { total: 'lots' }, b: { total: -5 }, c: { total: NaN } });
        expect(rows.every((r) => r.total === 0)).toBe(true);
    });
});

describe('daily ranking and last week', () => {
    const members = [{ uid: 'a', name: 'Ana' }, { uid: 'b', name: 'Boris' }, { uid: 'c', name: 'Cvita' }];

    it('lists only members who played, best first', () => {
        const rows = buildDailyRanking(members, { a: { score: 1200, name: 'Ana' }, c: { score: 2400 } });
        expect(rows.map((r) => [r.uid, r.rank, r.score])).toEqual([['c', 1, 2400], ['a', 2, 1200]]);
    });

    it('crowns last week\'s top player, ties all', () => {
        expect(lastWeekWinners(members, { a: { total: 900 }, b: { total: 1500 }, c: { total: 400 } })).toEqual(['b']);
        expect(lastWeekWinners(members, { a: { total: 900 }, b: { total: 900 } })).toEqual(['a', 'b']);
        expect(lastWeekWinners(members, {})).toEqual([]);
        expect(lastWeekWinners(members, { a: { total: 0 } })).toEqual([]);
    });
});

describe('formatLastPlayed', () => {
    const now = 10 * 24 * 3600 * 1000;
    it('formats ranges', () => {
        expect(formatLastPlayed(0, now)).toBeNull();
        expect(formatLastPlayed(now - 30 * 1000, now)).toBe('upravo');
        expect(formatLastPlayed(now - 25 * 60000, now)).toBe('prije 25 min');
        expect(formatLastPlayed(now - 5 * 3600000, now)).toBe('prije 5 h');
        expect(formatLastPlayed(now - 3 * 24 * 3600000, now)).toBe('prije 3 d');
    });
});
