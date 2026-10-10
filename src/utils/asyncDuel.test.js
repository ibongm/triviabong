import { describe, it, expect } from 'vitest';
import {
    padAnswers, scoreRun, secondsLeftFromMs, decideWinner, deriveDuelState, isAbandonedRun, isDuelExpired,
    countPendingChallenges, countOpenAsChallenger, myOutcome,
    ABANDONED_RUN_MS, DUEL_TTL_MS, MAX_DUEL_SCORE, MAX_DUEL_TOTAL_TIME_MS,
} from './asyncDuel';
import { computeDuelAnswerScore } from './gameLogic';

const run = (flags, t = 5000) => flags.map((c) => ({ c, t }));

describe('secondsLeftFromMs', () => {
    it('maps time spent to the integer seconds left on the 20 s timer', () => {
        expect(secondsLeftFromMs(0)).toBe(20);
        expect(secondsLeftFromMs(1)).toBe(19);
        expect(secondsLeftFromMs(5000)).toBe(15);
        expect(secondsLeftFromMs(19999)).toBe(0);
        expect(secondsLeftFromMs(20000)).toBe(0);
        expect(secondsLeftFromMs(999999)).toBe(0);
        expect(secondsLeftFromMs(-5)).toBe(20);
    });
});

describe('padAnswers', () => {
    it('pads a partial run with wrong, full-timer answers', () => {
        const out = padAnswers([{ c: true, t: 3000 }]);
        expect(out).toHaveLength(10);
        expect(out[0]).toEqual({ c: true, t: 3000 });
        expect(out.slice(1).every((a) => a.c === false && a.t === 20000)).toBe(true);
    });
    it('truncates an over-long list and sanitizes entries', () => {
        const out = padAnswers(Array.from({ length: 14 }, () => ({ c: 'yes', t: 'x' })));
        expect(out).toHaveLength(10);
        expect(out[0]).toEqual({ c: false, t: 0 });
    });
});

describe('scoreRun', () => {
    it('scores a perfect run with the live-1v1 formula and an unbroken streak', () => {
        const { score, correct, totalTimeMs } = scoreRun(run(Array(10).fill(true), 0));
        let expected = 0;
        for (let i = 0; i < 10; i++) expected += computeDuelAnswerScore(20, i);
        expect(score).toBe(expected);
        expect(correct).toBe(10);
        expect(totalTimeMs).toBe(0);
    });

    it('resets the streak on a wrong answer', () => {
        const { score, correct } = scoreRun(run([true, true, false, true, ...Array(6).fill(false)], 0));
        expect(correct).toBe(3);
        expect(score).toBe(computeDuelAnswerScore(20, 0) + computeDuelAnswerScore(20, 1) + computeDuelAnswerScore(20, 0));
    });

    it('treats an empty or partial run as all-wrong beyond what was answered', () => {
        expect(scoreRun([])).toEqual({ score: 0, correct: 0, totalTimeMs: 200000 });
        const partial = scoreRun([{ c: true, t: 2000 }]);
        expect(partial.correct).toBe(1);
        expect(partial.totalTimeMs).toBe(2000 + 9 * 20000);
    });

    it('stays inside the rules caps for any possible run', () => {
        const best = scoreRun(run(Array(10).fill(true), 0));
        expect(best.score).toBeLessThanOrEqual(MAX_DUEL_SCORE);
        expect(scoreRun([]).totalTimeMs).toBeLessThanOrEqual(MAX_DUEL_TOTAL_TIME_MS);
    });

    it('is deterministic - a finalized abandoned run equals a normally finished one with the same answers', () => {
        const answered = [{ c: true, t: 4000 }, { c: false, t: 7000 }];
        const finishedNormally = [...answered, ...Array.from({ length: 8 }, () => ({ c: false, t: 20000 }))];
        expect(scoreRun(answered)).toEqual(scoreRun(finishedNormally));
    });
});

describe('decideWinner', () => {
    const a = { uid: 'A', score: 1000, totalTimeMs: 80000 };
    const b = { uid: 'B', score: 900, totalTimeMs: 50000 };
    it('higher score wins regardless of time', () => {
        expect(decideWinner(a, b)).toEqual({ winnerUid: 'A', loserUid: 'B', result: 'win' });
        expect(decideWinner(b, a)).toEqual({ winnerUid: 'A', loserUid: 'B', result: 'win' });
    });
    it('breaks a score tie with the lower total time', () => {
        expect(decideWinner({ ...a, score: 900 }, b).winnerUid).toBe('B');
        expect(decideWinner(b, { ...a, score: 900 }).winnerUid).toBe('B');
    });
    it('is a draw only on an exact tie of score and time', () => {
        expect(decideWinner({ ...a, score: 5, totalTimeMs: 7 }, { ...b, score: 5, totalTimeMs: 7 })).toEqual({ winnerUid: null, loserUid: null, result: 'draw' });
    });
});

describe('time helpers', () => {
    const now = 1_000_000_000_000;
    it('isDuelExpired compares against expiresAt (millis, Date or Timestamp-like)', () => {
        expect(isDuelExpired({ expiresAt: now - 1 }, now)).toBe(true);
        expect(isDuelExpired({ expiresAt: now + 1 }, now)).toBe(false);
        expect(isDuelExpired({ expiresAt: { toMillis: () => now - 5 } }, now)).toBe(true);
        expect(isDuelExpired({ expiresAt: new Date(now + 5) }, now)).toBe(false);
        expect(isDuelExpired({}, now)).toBe(false);
    });
    it('isAbandonedRun needs an in_progress run older than ABANDONED_RUN_MS', () => {
        expect(isAbandonedRun({ state: 'in_progress', startedAt: now - ABANDONED_RUN_MS - 1 }, now)).toBe(true);
        expect(isAbandonedRun({ state: 'in_progress', startedAt: now - ABANDONED_RUN_MS + 1000 }, now)).toBe(false);
        expect(isAbandonedRun({ state: 'done', startedAt: 0 }, now)).toBe(false);
        expect(isAbandonedRun(null, now)).toBe(false);
    });
});

describe('deriveDuelState', () => {
    const now = 1_000_000_000_000;
    const live = (over = {}) => ({ id: 'd', status: 'awaiting_opponent', challengerUid: 'A', opponentUid: 'B', expiresAt: now + DUEL_TTL_MS, ...over });

    it('my_turn when I have no run yet', () => {
        expect(deriveDuelState(live(), null, now)).toBe('my_turn');
        expect(deriveDuelState(live({ status: 'open', opponentUid: null }), null, now)).toBe('my_turn');
    });
    it('resume vs finalize for an unfinished run', () => {
        expect(deriveDuelState(live(), { state: 'in_progress', startedAt: now - 1000 }, now)).toBe('resume');
        expect(deriveDuelState(live(), { state: 'in_progress', startedAt: now - ABANDONED_RUN_MS - 1 }, now)).toBe('finalize');
    });
    it('waiting_for_opponent once I am done, reconcile if they are done too', () => {
        expect(deriveDuelState(live(), { state: 'done' }, now)).toBe('waiting_for_opponent');
        expect(deriveDuelState(live(), { state: 'done' }, now, { opponentDone: true })).toBe('reconcile');
    });
    it('complete and expired are terminal', () => {
        expect(deriveDuelState(live({ status: 'complete' }), { state: 'done' }, now)).toBe('complete');
        expect(deriveDuelState(live({ status: 'expired' }), null, now)).toBe('expired');
        expect(deriveDuelState(live({ status: 'cancelled' }), null, now)).toBe('expired');
    });
    it('a duel past expiresAt that I never played counts as expired', () => {
        expect(deriveDuelState(live({ expiresAt: now - 1 }), null, now)).toBe('expired');
        expect(deriveDuelState(live({ expiresAt: now - 1 }), { state: 'done' }, now)).toBe('expired');
    });
});

describe('inbox counters', () => {
    const now = 1_000_000_000_000;
    const d = (over) => ({ id: 'x', status: 'awaiting_opponent', challengerUid: 'A', opponentUid: 'ME', expiresAt: now + 1000, ...over });

    it('counts only live direct duels addressed to me that I have not started', () => {
        const duels = [
            d({ id: '1' }),
            d({ id: '2', status: 'complete' }),
            d({ id: '3', expiresAt: now - 1 }),
            d({ id: '4', opponentUid: 'SOMEONE' }),
            d({ id: '5' }),
        ];
        expect(countPendingChallenges(duels, 'ME', { 5: { state: 'in_progress' } }, now)).toBe(1);
    });
    it('counts my undecided, unexpired duels as challenger against the limit', () => {
        const duels = [
            d({ id: '1', challengerUid: 'ME', opponentUid: 'B' }),
            d({ id: '2', challengerUid: 'ME', status: 'open', opponentUid: null }),
            d({ id: '3', challengerUid: 'ME', status: 'complete' }),
            d({ id: '4', challengerUid: 'ME', expiresAt: now - 1 }),
            d({ id: '5', challengerUid: 'OTHER' }),
        ];
        expect(countOpenAsChallenger(duels, 'ME', now)).toBe(2);
    });
});

describe('myOutcome', () => {
    it('maps winnerUid to win / loss / draw', () => {
        expect(myOutcome({ winnerUid: 'ME' }, 'ME')).toBe('win');
        expect(myOutcome({ winnerUid: 'B' }, 'ME')).toBe('loss');
        expect(myOutcome({ winnerUid: null }, 'ME')).toBe('draw');
    });
});
