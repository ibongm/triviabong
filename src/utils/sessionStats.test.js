import { describe, it, expect } from 'vitest';
import { totalSessionSeconds, summarizeSessionsByPeriod, sumSessionsByUid, formatDuration } from './sessionStats';

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
