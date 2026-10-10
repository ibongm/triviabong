// Pure async-duel logic (engagement plan Phase 4). No React/Firebase imports:
// the service layer, the hook, the screen and the tests all share it.
//
// An async duel is 10 questions answered by each player at a different time.
// Each player's run is stored as a list of answers `{ c, t }` (c = correct?,
// t = ms spent on that question, capped at the 20 s timer) and everything else
// (score, correct count, total time) is DERIVED from that list by the
// functions below, so a finished run and an abandoned-then-finalized run are
// scored by exactly one code path.
import { QUESTION_TIME_SECONDS, QUESTIONS_PER_ROUND } from '../constants/gameBalance.js';
import { computeDuelAnswerScore } from './gameLogic.js';

export const DUEL_QUESTION_COUNT = QUESTIONS_PER_ROUND; // 10, same as live 1v1
export const DUEL_TTL_MS = 48 * 60 * 60 * 1000;
export const MAX_OPEN_DUELS_AS_CHALLENGER = 5;
// A run left `in_progress` this long is finalized with what was answered
// (unanswered = wrong) the next time its owner opens the app.
export const ABANDONED_RUN_MS = 10 * 60 * 1000;
export const ANY_CATEGORY = 'any';
// Mirrors firestore.rules' result caps - keep equal (rulesCaps.test.js).
export const MAX_DUEL_SCORE = 10000;
export const MAX_DUEL_TOTAL_TIME_MS = 200000;

const QUESTION_MS = QUESTION_TIME_SECONDS * 1000;

const clampMs = (t) => Math.max(0, Math.min(QUESTION_MS, Math.round(Number(t) || 0)));

/** Whole seconds left on the 20 s timer after spending `ms` on a question. */
export const secondsLeftFromMs = (ms) => Math.max(0, QUESTION_TIME_SECONDS - Math.ceil(clampMs(ms) / 1000));

/**
 * Pads a (possibly partial) answer list to the full question count with
 * wrong answers that used the whole timer, and normalizes each entry.
 * @param {{ c: boolean, t: number }[]} answers
 * @param {number} [total]
 */
export const padAnswers = (answers, total = DUEL_QUESTION_COUNT) => {
    const out = (Array.isArray(answers) ? answers : []).slice(0, total).map((a) => ({ c: a?.c === true, t: clampMs(a?.t) }));
    while (out.length < total) out.push({ c: false, t: QUESTION_MS });
    return out;
};

/**
 * Score, correct count and total time for a full answer list. Streak resets on
 * a wrong answer, exactly like live 1v1.
 * @returns {{ score: number, correct: number, totalTimeMs: number }}
 */
export const scoreRun = (answers) => {
    let score = 0;
    let correct = 0;
    let streak = 0;
    let totalTimeMs = 0;
    for (const a of padAnswers(answers)) {
        totalTimeMs += a.t;
        if (a.c) {
            score += computeDuelAnswerScore(secondsLeftFromMs(a.t), streak);
            streak += 1;
            correct += 1;
        } else {
            streak = 0;
        }
    }
    return { score, correct, totalTimeMs };
};

/**
 * Winner of two finished runs: higher score; on a tie the lower total time;
 * an exact tie on both is a draw. Mirrors the expectedWinner() function in
 * firestore.rules, which rejects a parent update that disagrees.
 * @param {{ uid: string, score: number, totalTimeMs: number }} a
 * @param {{ uid: string, score: number, totalTimeMs: number }} b
 * @returns {{ winnerUid: string|null, result: 'win'|'draw', loserUid: string|null }}
 */
export const decideWinner = (a, b) => {
    if (a.score !== b.score) {
        const first = a.score > b.score;
        return { winnerUid: first ? a.uid : b.uid, loserUid: first ? b.uid : a.uid, result: 'win' };
    }
    if (a.totalTimeMs !== b.totalTimeMs) {
        const first = a.totalTimeMs < b.totalTimeMs;
        return { winnerUid: first ? a.uid : b.uid, loserUid: first ? b.uid : a.uid, result: 'win' };
    }
    return { winnerUid: null, loserUid: null, result: 'draw' };
};

const toMillis = (v) => {
    if (v == null) return null;
    if (typeof v === 'number') return v;
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (v instanceof Date) return v.getTime();
    return null;
};

export const isDuelExpired = (duel, nowMs) => {
    const exp = toMillis(duel?.expiresAt);
    return exp != null && nowMs > exp;
};

/** An `in_progress` run old enough to be finalized as abandoned. */
export const isAbandonedRun = (result, nowMs) => {
    if (!result || result.state !== 'in_progress') return false;
    const started = toMillis(result.startedAt);
    return started != null && nowMs - started > ABANDONED_RUN_MS;
};

/**
 * Where a duel stands for ME - drives the inbox grouping and the lobby badge.
 * Never exposes the other player's score (callers only have my own result).
 *
 *   'waiting_for_opponent'  I'm done (or the duel is an open random one); they haven't played
 *   'my_turn'               it's my move and I haven't started
 *   'resume'                I started but didn't finish (in_progress, not yet abandoned)
 *   'finalize'              my run is abandoned and should be finalized
 *   'reconcile'             both sides done but the parent isn't `complete` yet
 *   'complete'              finished - show the result
 *   'expired'               nobody finished in time
 *
 * @param {object} duel
 * @param {object|null} myResult - my results/{uid} doc, or null if none yet
 * @param {number} nowMs
 * @param {{ opponentDone?: boolean }} [extra] - set when the other result is
 *   known to be `done` (only knowable once I'm done myself, see the rules)
 */
export const deriveDuelState = (duel, myResult, nowMs, extra = {}) => {
    if (!duel) return 'expired';
    if (duel.status === 'complete') return 'complete';
    if (duel.status === 'expired' || duel.status === 'cancelled') return 'expired';
    if (isDuelExpired(duel, nowMs) && myResult?.state !== 'done') return 'expired';

    if (myResult?.state === 'done') {
        if (extra.opponentDone) return 'reconcile';
        return isDuelExpired(duel, nowMs) ? 'expired' : 'waiting_for_opponent';
    }
    if (myResult?.state === 'in_progress') {
        return isAbandonedRun(myResult, nowMs) ? 'finalize' : 'resume';
    }
    // No run of mine yet (including my own freshly created random duel).
    return 'my_turn';
};

/**
 * Inbox rows for the lobby badge: direct duels addressed to me that I haven't
 * started and that are still alive. Challenger name and category only.
 */
export const countPendingChallenges = (duels, myUid, myResultsByDuel, nowMs) => (
    duels.filter((d) => (
        d.opponentUid === myUid
        && d.status === 'awaiting_opponent'
        && !isDuelExpired(d, nowMs)
        && !myResultsByDuel[d.id]
    )).length
);

/** Challenger-side limit: duels I started that are still undecided and alive. */
export const countOpenAsChallenger = (duels, myUid, nowMs) => (
    duels.filter((d) => (
        d.challengerUid === myUid
        && (d.status === 'open' || d.status === 'awaiting_opponent')
        && !isDuelExpired(d, nowMs)
    )).length
);

/** What the matchHistory entry / mission events need once a duel resolves. */
export const myOutcome = (duel, myUid) => {
    if (duel.winnerUid === myUid) return 'win';
    if (duel.winnerUid == null) return 'draw';
    return 'loss';
};
