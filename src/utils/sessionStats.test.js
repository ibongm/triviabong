import { describe, it, expect } from 'vitest';
import {
    totalSessionSeconds,
    summarizeSessionsByPeriod,
    sumSessionsByUid,
    formatDuration,
    summarizePlayTimeByUid,
    playTimeDayKey,
    stalePlayTimeDayKeys,
    PLAY_TIME_DAYS_KEPT,
    playTimeDelta,
    buildPlayTimeFromSessions,
} from './sessionStats';

// Fixed "now": Wednesday 2026-08-19 12:00 local time - ISO week starts Monday 2026-08-17.
const NOW = new Date(2026, 7, 19, 12, 0, 0);

const session = (uid, startedAt, seconds) => ({
    uid,
    startedAt,
    gameStateSeconds: { PLAYING: seconds },
});

describe('totalSessionSeconds', () => {
    it('sums every gameState bucket', () => {
        const s = { gameStateSeconds: { LOBBY: 10, PLAYING: 90, GAMEOVER: 5 } };
        expect(totalSessionSeconds(s)).toBe(105);
    });

    it('is 0 for a session with no buckets', () => {
        expect(totalSessionSeconds({})).toBe(0);
    });
});

describe('sumSessionsByUid', () => {
    const sessions = [
        session('alice', new Date(2026, 7, 19, 9, 0, 0), 60), // today
        session('alice', new Date(2026, 7, 17, 9, 0, 0), 120), // earlier this ISO week, not today
        session('alice', new Date(2026, 6, 1, 9, 0, 0), 300), // long ago, not this week
        session('bob', new Date(2026, 7, 19, 8, 0, 0), 30), // today
    ];

    it('defaults to all-time when no period is given (backward compatible)', () => {
        expect(sumSessionsByUid(sessions)).toEqual({ alice: 480, bob: 30 });
    });

    it('scopes to daily', () => {
        expect(sumSessionsByUid(sessions, 'daily', NOW)).toEqual({ alice: 60, bob: 30 });
    });

    it('scopes to weekly (ISO, Monday start)', () => {
        expect(sumSessionsByUid(sessions, 'weekly', NOW)).toEqual({ alice: 180, bob: 30 });
    });

    it('daily <= weekly <= all-time for the same player, matching summarizeSessionsByPeriod', () => {
        const aliceSessions = sessions.filter((s) => s.uid === 'alice');
        const daily = sumSessionsByUid(sessions, 'daily', NOW).alice;
        const weekly = sumSessionsByUid(sessions, 'weekly', NOW).alice;
        const all = sumSessionsByUid(sessions, 'all', NOW).alice;

        expect(daily).toBeLessThanOrEqual(weekly);
        expect(weekly).toBeLessThanOrEqual(all);
        expect(daily).toBe(summarizeSessionsByPeriod(aliceSessions, 'daily', NOW));
        expect(weekly).toBe(summarizeSessionsByPeriod(aliceSessions, 'weekly', NOW));
        expect(all).toBe(summarizeSessionsByPeriod(aliceSessions, 'all', NOW));
    });

    it('ignores sessions with no uid', () => {
        expect(sumSessionsByUid([{ startedAt: NOW, gameStateSeconds: { PLAYING: 10 } }])).toEqual({});
    });
});

describe('formatDuration', () => {
    it('formats hours and minutes', () => {
        expect(formatDuration(66360)).toBe('18 h 26 min');
    });

    it('formats minutes only', () => {
        expect(formatDuration(120)).toBe('2 min');
    });

    it('formats sub-minute as "Manje od minute"', () => {
        expect(formatDuration(30)).toBe('Manje od minute');
        expect(formatDuration(0)).toBe('Manje od minute');
    });
});

// playTime counters on users/{uid} - the zero-extra-read replacement for the
// getAllSessions() scan that used to power the admin Danas/Tjedan/Ukupno
// columns. NOW is Wednesday 2026-08-19; the ISO week starts Monday 2026-08-17.
describe('playTimeDayKey', () => {
    it('formats a local calendar date, zero-padded', () => {
        expect(playTimeDayKey(new Date(2026, 7, 9))).toBe('2026-08-09');
        expect(playTimeDayKey(new Date(2026, 11, 25))).toBe('2026-12-25');
    });

    it('sorts lexicographically in chronological order', () => {
        const keys = [new Date(2026, 7, 9), new Date(2026, 6, 31), new Date(2026, 11, 1)]
            .map(playTimeDayKey);
        expect([...keys].sort()).toEqual(['2026-07-31', '2026-08-09', '2026-12-01']);
    });
});

describe('summarizePlayTimeByUid', () => {
    const users = [
        {
            uid: 'a',
            playTime: {
                total: 5000,
                days: { '2026-08-19': 100, '2026-08-18': 200, '2026-08-17': 300, '2026-08-16': 400 },
            },
        },
        { uid: 'b', playTime: { total: 60, days: { '2026-08-19': 60 } } },
        { uid: 'c' },
    ];

    it('reads today from the matching day bucket', () => {
        const { daily } = summarizePlayTimeByUid(users, NOW);
        expect(daily).toEqual({ a: 100, b: 60, c: 0 });
    });

    it('sums only days inside the ISO week, excluding the preceding Sunday', () => {
        const { weekly } = summarizePlayTimeByUid(users, NOW);
        // 2026-08-16 is the Sunday before the week start and must not count.
        expect(weekly.a).toBe(600);
        expect(weekly.b).toBe(60);
    });

    it('takes all-time from the running total, not the retained buckets', () => {
        const { all } = summarizePlayTimeByUid(users, NOW);
        expect(all.a).toBe(5000);
    });

    it('keeps daily <= weekly <= all', () => {
        const { daily, weekly, all } = summarizePlayTimeByUid(users, NOW);
        for (const uid of ['a', 'b', 'c']) {
            expect(daily[uid]).toBeLessThanOrEqual(weekly[uid]);
            expect(weekly[uid]).toBeLessThanOrEqual(all[uid]);
        }
    });

    it('treats a user with no playTime as zero rather than throwing', () => {
        const { daily, weekly, all } = summarizePlayTimeByUid([{ uid: 'c' }], NOW);
        expect([daily.c, weekly.c, all.c]).toEqual([0, 0, 0]);
    });

    it('ignores negative or non-numeric bucket values', () => {
        const { daily, all } = summarizePlayTimeByUid(
            [{ uid: 'x', playTime: { total: -5, days: { '2026-08-19': 'lots' } } }],
            NOW,
        );
        expect(daily.x).toBe(0);
        expect(all.x).toBe(0);
    });

    it('skips entries with no uid and handles empty input', () => {
        expect(summarizePlayTimeByUid([{ playTime: { total: 1 } }], NOW).all).toEqual({});
        expect(summarizePlayTimeByUid(undefined, NOW).all).toEqual({});
    });
});

describe('stalePlayTimeDayKeys', () => {
    it('keeps the retention window and returns only what falls outside it', () => {
        const days = {};
        for (let i = 0; i < 20; i++) {
            days[playTimeDayKey(new Date(NOW.getTime() - i * 86400000))] = 60;
        }
        const stale = stalePlayTimeDayKeys(days, NOW);
        expect(Object.keys(days).length - stale.length).toBe(PLAY_TIME_DAYS_KEPT);
        expect(stale).not.toContain(playTimeDayKey(NOW));
    });

    it('returns nothing when every bucket is inside the window', () => {
        const days = { '2026-08-19': 60, '2026-08-18': 60 };
        expect(stalePlayTimeDayKeys(days, NOW)).toEqual([]);
    });

    it('handles a missing map', () => {
        expect(stalePlayTimeDayKeys(undefined, NOW)).toEqual([]);
    });
});

// Guards the increment/cumulative mismatch: session docs hold cumulative
// totals, playTime is increment-based, so a heartbeat must send only the new
// seconds. Sending the cumulative figure would re-add the whole session every
// 90s - the same inflation class as the flush bug fixed in a56f6a8.
describe('playTimeDelta', () => {
    it('sends the whole elapsed total on the first write', () => {
        expect(playTimeDelta({ LOBBY: 30, PLAYING: 60 }, 0)).toEqual({ elapsed: 90, delta: 90 });
    });

    it('sends only what is new on subsequent writes', () => {
        expect(playTimeDelta({ LOBBY: 30, PLAYING: 120 }, 90)).toEqual({ elapsed: 150, delta: 60 });
    });

    it('sends nothing when no time has accrued since the last write', () => {
        expect(playTimeDelta({ LOBBY: 30, PLAYING: 60 }, 90).delta).toBe(0);
    });

    it('never sends a negative delta if the session counters reset', () => {
        expect(playTimeDelta({ LOBBY: 10 }, 500).delta).toBe(0);
    });

    it('accumulating repeated heartbeats equals the final elapsed total', () => {
        const snapshots = [{ LOBBY: 30 }, { LOBBY: 60 }, { LOBBY: 60, PLAYING: 45 }];
        let written = 0;
        let sent = 0;
        for (const snap of snapshots) {
            const { elapsed, delta } = playTimeDelta(snap, written);
            sent += delta;
            written = elapsed;
        }
        expect(sent).toBe(105);
        expect(written).toBe(105);
    });

    it('ignores non-numeric and negative buckets', () => {
        expect(playTimeDelta({ LOBBY: 'x', PLAYING: -20, VICTORY: 10 }, 0))
            .toEqual({ elapsed: 10, delta: 10 });
    });

    it('handles a missing map', () => {
        expect(playTimeDelta(undefined, 0)).toEqual({ elapsed: 0, delta: 0 });
    });
});

// One-off repair path: the playTime counters started at zero when they
// shipped, so the admin list read ~0 for everyone until rebuilt from the
// sessions collection, which had the history all along.
describe('buildPlayTimeFromSessions', () => {
    const s = (uid, startedAt, seconds) => ({
        uid, startedAt, gameStateSeconds: { PLAYING: seconds },
    });

    it('sums every session into total, regardless of age', () => {
        const out = buildPlayTimeFromSessions([
            s('a', new Date(2026, 7, 19), 100),
            s('a', new Date(2025, 0, 1), 900),
        ], NOW);
        expect(out.a.total).toBe(1000);
    });

    it('keeps only in-window day buckets while total stays all-time', () => {
        const out = buildPlayTimeFromSessions([
            s('a', new Date(2026, 7, 19), 100),
            s('a', new Date(2025, 0, 1), 900),
        ], NOW);
        expect(out.a.days).toEqual({ '2026-08-19': 100 });
        expect(out.a.total).toBe(1000);
    });

    it('merges multiple sessions on the same day into one bucket', () => {
        const out = buildPlayTimeFromSessions([
            s('a', new Date(2026, 7, 19, 9), 60),
            s('a', new Date(2026, 7, 19, 20), 30),
        ], NOW);
        expect(out.a.days['2026-08-19']).toBe(90);
        expect(out.a.total).toBe(90);
    });

    it('separates players', () => {
        const out = buildPlayTimeFromSessions([
            s('a', new Date(2026, 7, 19), 60),
            s('b', new Date(2026, 7, 19), 120),
        ], NOW);
        expect(out.a.total).toBe(60);
        expect(out.b.total).toBe(120);
    });

    it('skips sessions with no uid or no recorded time', () => {
        const out = buildPlayTimeFromSessions([
            { startedAt: new Date(2026, 7, 19), gameStateSeconds: { PLAYING: 60 } },
            s('a', new Date(2026, 7, 19), 0),
        ], NOW);
        expect(out).toEqual({});
    });

    it('still counts time toward total when startedAt is missing', () => {
        const out = buildPlayTimeFromSessions([
            { uid: 'a', gameStateSeconds: { PLAYING: 45 } },
        ], NOW);
        expect(out.a.total).toBe(45);
        expect(out.a.days).toEqual({});
    });

    it('produces buckets summarizePlayTimeByUid can read back correctly', () => {
        const rebuilt = buildPlayTimeFromSessions([
            s('a', new Date(2026, 7, 19), 100),  // today
            s('a', new Date(2026, 7, 17), 200),  // Monday, same ISO week
            s('a', new Date(2026, 7, 16), 400),  // Sunday before - outside week
            s('a', new Date(2025, 0, 1), 900),   // ancient, total only
        ], NOW);
        const { daily, weekly, all } = summarizePlayTimeByUid(
            [{ uid: 'a', playTime: rebuilt.a }], NOW,
        );
        expect(daily.a).toBe(100);
        expect(weekly.a).toBe(300);
        expect(all.a).toBe(1600);
    });

    it('handles empty input', () => {
        expect(buildPlayTimeFromSessions([], NOW)).toEqual({});
        expect(buildPlayTimeFromSessions(undefined, NOW)).toEqual({});
    });
});
