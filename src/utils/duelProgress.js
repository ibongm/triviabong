// Device-local bookkeeping for async duels (engagement plan Phase 4). Answers
// are held locally while a run is in progress - there are deliberately no
// per-question Firestore writes - so a reload mid-run can resume, and an
// abandoned run can be finalized with what was answered. Every storage
// access is wrapped: storage can be unavailable or throw (private windows,
// blocked site data), and the duel must still be playable without it.
import { DUEL_QUESTION_COUNT, padAnswers } from './asyncDuel.js';

const RUN_PREFIX = 'triviabong_duel_run_';
const CLAIMED_KEY = 'triviabong_duel_claimed';
const MAX_CLAIMED_CACHE = 100;

const storage = () => {
    try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
};

/** Answers saved so far for a run: at most DUEL_QUESTION_COUNT well-formed entries. */
export const sanitizeProgress = (raw) => {
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, DUEL_QUESTION_COUNT).map((a) => ({ c: a?.c === true, t: Number(a?.t) || 0 }));
};

export const loadRunProgress = (duelId) => {
    const s = storage();
    if (!s) return [];
    try { return sanitizeProgress(JSON.parse(s.getItem(RUN_PREFIX + duelId))); } catch { return []; }
};

export const saveRunProgress = (duelId, answers) => {
    const s = storage();
    if (!s) return;
    try { s.setItem(RUN_PREFIX + duelId, JSON.stringify(sanitizeProgress(answers))); } catch { /* best effort */ }
};

export const clearRunProgress = (duelId) => {
    const s = storage();
    if (!s) return;
    try { s.removeItem(RUN_PREFIX + duelId); } catch { /* best effort */ }
};

/** Whole-run answers for finalizing: what was saved, padded with wrong answers. */
export const finalAnswersFor = (duelId) => padAnswers(loadRunProgress(duelId));

// Duels whose reward this device has already seen as claimed - lets the inbox
// refresh skip re-reading their result docs. Only an optimization: the
// authoritative flag is rewardClaimed on the result doc.
export const loadClaimedIds = () => {
    const s = storage();
    if (!s) return new Set();
    try {
        const arr = JSON.parse(s.getItem(CLAIMED_KEY));
        return new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []);
    } catch { return new Set(); }
};

export const rememberClaimed = (duelId) => {
    const s = storage();
    if (!s) return;
    try {
        const ids = [...loadClaimedIds(), duelId].slice(-MAX_CLAIMED_CACHE);
        s.setItem(CLAIMED_KEY, JSON.stringify(ids));
    } catch { /* best effort */ }
};
