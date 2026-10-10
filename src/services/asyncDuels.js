// Async duels (engagement plan Phase 4) - a self-contained subsystem parallel
// to services/matches.js, deliberately NOT folded into it: live 1v1 stays
// exactly as it was. Data model, status flow and the rules that protect it
// are documented in the asyncDuels block of firestore.rules; the pure logic
// (scoring, winner, inbox state) lives in utils/asyncDuel.js.
//
// No onSnapshot anywhere in here (quota): everything is a bounded one-shot
// fetch, run on lobby entry / tab return / explicit refresh by the hook.
import {
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    addDoc,
    collection,
    query,
    where,
    orderBy,
    limit,
    runTransaction,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { getQuestionsByCategory, getAllQuestions } from '../data/questionsLoader';
import { composeRound } from '../utils/roundComposer';
import {
    DUEL_QUESTION_COUNT,
    DUEL_TTL_MS,
    ANY_CATEGORY,
    isDuelExpired,
    scoreRun,
    padAnswers,
    decideWinner,
} from '../utils/asyncDuel';

const cleanName = (name) => String(name || 'Igrač').trim().slice(0, 20) || 'Igrač';

/**
 * Ten question ids for a new duel, picked ONCE by the challenger (so both
 * players get identical questions) with the same difficulty curve as a solo
 * round. 'any' draws from the whole bank.
 */
export const pickDuelQuestionIds = async (category) => {
    const pool = category === ANY_CATEGORY
        ? await getAllQuestions()
        : await getQuestionsByCategory(category);
    return composeRound(pool.filter((q) => q && q.id), { count: DUEL_QUESTION_COUNT }).map((q) => q.id);
};

const baseDuel = (me, category, questionIds) => ({
    challengerUid: me.uid,
    challengerName: cleanName(me.name),
    category,
    questionIds,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + DUEL_TTL_MS),
});

/** Challenge a specific player. Returns the new duel id, or null on failure. */
export const createDirectDuel = async (me, opponent, category) => {
    if (!me?.uid || !opponent?.uid || me.uid === opponent.uid) return null;
    try {
        const questionIds = await pickDuelQuestionIds(category);
        if (questionIds.length !== DUEL_QUESTION_COUNT) return null;
        const ref = await addDoc(collection(db, 'asyncDuels'), {
            ...baseDuel(me, category, questionIds),
            mode: 'direct',
            opponentUid: opponent.uid,
            opponentName: cleanName(opponent.name),
            status: 'awaiting_opponent',
        });
        return ref.id;
    } catch (error) {
        console.error('Error creating async duel:', error);
        return null;
    }
};

/** Opens an unclaimed random duel in the pool. Returns its id, or null. */
export const createRandomDuel = async (me, category) => {
    if (!me?.uid) return null;
    try {
        const questionIds = await pickDuelQuestionIds(category);
        if (questionIds.length !== DUEL_QUESTION_COUNT) return null;
        const ref = await addDoc(collection(db, 'asyncDuels'), {
            ...baseDuel(me, category, questionIds),
            mode: 'random',
            opponentUid: null,
            opponentName: null,
            status: 'open',
        });
        return ref.id;
    } catch (error) {
        console.error('Error opening random duel:', error);
        return null;
    }
};

/**
 * Claims the oldest open random duel in `category`'s pool that isn't mine, in
 * a transaction (two players racing for it: exactly one wins, the loser moves
 * on to the next candidate). Returns { duelId } or null when nothing was
 * claimable. Needs the (mode, status, category, createdAt) composite index.
 */
export const claimRandomDuel = async (me, category) => {
    if (!me?.uid) return null;
    let candidates;
    try {
        const snap = await getDocs(query(
            collection(db, 'asyncDuels'),
            where('mode', '==', 'random'),
            where('status', '==', 'open'),
            where('category', '==', category),
            orderBy('createdAt'),
            limit(3),
        ));
        candidates = snap.docs.filter((d) => d.data().challengerUid !== me.uid && !isDuelExpired(d.data(), Date.now()));
    } catch (error) {
        console.error('Error querying the random duel pool:', error);
        return null;
    }

    for (const candidate of candidates) {
        try {
            const claimed = await runTransaction(db, async (tx) => {
                const fresh = await tx.get(candidate.ref);
                const data = fresh.data();
                if (!fresh.exists() || data.status !== 'open' || data.opponentUid != null || isDuelExpired(data, Date.now())) return false;
                tx.update(candidate.ref, { opponentUid: me.uid, opponentName: cleanName(me.name), status: 'awaiting_opponent' });
                return true;
            });
            if (claimed) return { duelId: candidate.id };
        } catch (error) {
            // Lost the race (or rules said no) - try the next candidate.
            console.warn('Could not claim random duel', candidate.id, error?.code || error);
        }
    }
    return null;
};

const duelRef = (duelId) => doc(db, 'asyncDuels', duelId);
const resultRef = (duelId, uid) => doc(db, 'asyncDuels', duelId, 'results', uid);

export const getDuel = async (duelId) => {
    try {
        const snap = await getDoc(duelRef(duelId));
        return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch (error) {
        console.error('Error reading duel:', error);
        return null;
    }
};

/** A player's own result doc (or, once I'm done, the other player's). */
export const getResult = async (duelId, uid) => {
    try {
        const snap = await getDoc(resultRef(duelId, uid));
        return snap.exists() ? snap.data() : null;
    } catch (error) {
        // Permission-denied is the normal answer for "the other player's
        // result before I've finished" - not worth a console.error.
        if (error?.code !== 'permission-denied') console.error('Error reading duel result:', error);
        return null;
    }
};

/**
 * My duels, newest first: those I challenged and those addressed to me, merged
 * by id. Bounded (limitN per side). Plus MY result doc for each still-live
 * duel, which the inbox needs to tell "your turn" from "resume".
 * @returns {Promise<{ duels: object[], myResults: Record<string, object> }>}
 */
export const fetchMyDuels = async (uid, limitN = 15) => {
    if (!uid) return { duels: [], myResults: {} };
    try {
        const [asChallenger, asOpponent] = await Promise.all([
            getDocs(query(collection(db, 'asyncDuels'), where('challengerUid', '==', uid), orderBy('createdAt', 'desc'), limit(limitN))),
            getDocs(query(collection(db, 'asyncDuels'), where('opponentUid', '==', uid), orderBy('createdAt', 'desc'), limit(limitN))),
        ]);
        const byId = new Map();
        for (const d of [...asChallenger.docs, ...asOpponent.docs]) byId.set(d.id, { id: d.id, ...d.data() });
        const duels = [...byId.values()].sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));

        const live = duels.filter((d) => d.status === 'open' || d.status === 'awaiting_opponent');
        const entries = await Promise.all(live.map(async (d) => [d.id, await getResult(d.id, uid)]));
        const myResults = Object.fromEntries(entries.filter(([, r]) => r));
        return { duels, myResults };
    } catch (error) {
        console.error('Error fetching my duels:', error);
        return { duels: [], myResults: {} };
    }
};

/**
 * Starts MY run: creates my result doc as `in_progress` BEFORE the first
 * question is shown, so leaving the screen still consumes the attempt (same
 * idea as the Daily Challenge). If a run already exists (a resume after a
 * reload) it is returned instead of created. Returns { ok, result }.
 */
export const startRun = async (duelId, uid) => {
    try {
        const existing = await getDoc(resultRef(duelId, uid));
        if (existing.exists()) return { ok: true, result: existing.data(), resumed: true };
        await setDoc(resultRef(duelId, uid), {
            state: 'in_progress',
            startedAt: serverTimestamp(),
            score: 0,
            correct: 0,
            totalTimeMs: 0,
            answers: [],
            rewardClaimed: false,
        });
        const created = await getDoc(resultRef(duelId, uid));
        return { ok: true, result: created.data(), resumed: false };
    } catch (error) {
        console.error('Error starting duel run:', error);
        return { ok: false, result: null };
    }
};

/**
 * Finishes MY run from the answers held locally (a partial list is padded with
 * wrong answers - this is also how an abandoned run is finalized), then, if
 * the other player is already done, completes the duel.
 *
 * Two steps on purpose: the rules only let me READ the other player's result
 * once my own is `done`, so I can't know the winner until step 1 has landed.
 * If the app dies between the steps the duel is merely un-reconciled;
 * reconcileDuel() on the next fetch finishes the job.
 * @returns {Promise<{ ok: boolean, run?: object, duel?: object|null }>}
 */
export const finishRun = async (duel, uid, answers) => {
    const padded = padAnswers(answers);
    const run = scoreRun(padded);
    try {
        await updateDoc(resultRef(duel.id, uid), {
            state: 'done',
            finishedAt: serverTimestamp(),
            score: run.score,
            correct: run.correct,
            totalTimeMs: run.totalTimeMs,
            answers: padded,
        });
    } catch (error) {
        console.error('Error finishing duel run:', error);
        return { ok: false };
    }
    const updated = await reconcileDuel(duel, uid);
    return { ok: true, run, duel: updated };
};

/**
 * If both runs are `done` but the parent isn't `complete`, writes the winner.
 * Safe to call any time and from either player: a lost race (the other client
 * completed first) just re-reads the parent. Returns the up-to-date duel.
 */
export const reconcileDuel = async (duel, myUid) => {
    if (duel.status === 'complete' || duel.status === 'expired') return duel;
    const otherUid = duel.challengerUid === myUid ? duel.opponentUid : duel.challengerUid;
    if (!otherUid) return duel;
    try {
        const [mine, theirs] = await Promise.all([getResult(duel.id, myUid), getResult(duel.id, otherUid)]);
        if (mine?.state !== 'done' || theirs?.state !== 'done') return duel;

        const challengerIsMe = duel.challengerUid === myUid;
        const a = { uid: duel.challengerUid, ...(challengerIsMe ? mine : theirs) };
        const b = { uid: duel.opponentUid, ...(challengerIsMe ? theirs : mine) };
        const { winnerUid } = decideWinner(a, b);
        try {
            await updateDoc(duelRef(duel.id), { status: 'complete', winnerUid, completedAt: serverTimestamp() });
        } catch (error) {
            // Most likely the other player completed it first.
            if (error?.code !== 'permission-denied') console.error('Error completing duel:', error);
        }
        return (await getDuel(duel.id)) || duel;
    } catch (error) {
        console.error('Error reconciling duel:', error);
        return duel;
    }
};

/** Marks an undecided duel past its expiry as expired (no winner, no rewards). */
export const expireDuel = async (duelId) => {
    try {
        await updateDoc(duelRef(duelId), { status: 'expired' });
        return true;
    } catch (error) {
        if (error?.code !== 'permission-denied') console.error('Error expiring duel:', error);
        return false;
    }
};

/**
 * Sets my `rewardClaimed` flag. The caller credits the reward ONLY if this
 * returns true - flag first, credit second, so a crash in between loses a
 * reward rather than duplicating one. The rules allow false -> true once.
 */
export const markRewardClaimed = async (duelId, uid) => {
    try {
        await updateDoc(resultRef(duelId, uid), { rewardClaimed: true });
        return true;
    } catch (error) {
        if (error?.code !== 'permission-denied') console.error('Error claiming duel reward:', error);
        return false;
    }
};
