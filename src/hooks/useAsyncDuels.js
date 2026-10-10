import { useCallback, useEffect, useRef, useState } from 'react';
import { sanitizeDisplayName } from '../utils/publicProfile';
import { resolveMatchQuestions } from '../utils/matchQuestions';
import { writeMatchHistoryEntry } from '../services/matches';
import {
    createDirectDuel,
    createRandomDuel,
    claimRandomDuel,
    fetchMyDuels,
    getResult,
    getDuel,
    startRun,
    finishRun,
    reconcileDuel,
    expireDuel,
    markRewardClaimed,
} from '../services/asyncDuels';
import {
    DUEL_QUESTION_COUNT,
    MAX_OPEN_DUELS_AS_CHALLENGER,
    countOpenAsChallenger,
    countPendingChallenges,
    deriveDuelState,
    myOutcome,
} from '../utils/asyncDuel';
import {
    loadRunProgress,
    saveRunProgress,
    clearRunProgress,
    finalAnswersFor,
    loadClaimedIds,
    rememberClaimed,
} from '../utils/duelProgress';
import { applyOneVsOneWin } from '../utils/oneVsOneReward';

// Re-fetching the inbox more often than this on tab return/lobby entry just
// burns quota; the "Osvježi" button bypasses it.
const MIN_REFRESH_INTERVAL_MS = 30000;
// A run restarted this soon after it began, with nothing answered, is treated
// as a reload during the first question rather than as an abandoned run.
const RELOAD_GRACE_MS = 25000;

const otherUidOf = (duel, myUid) => (duel.challengerUid === myUid ? duel.opponentUid : duel.challengerUid);
const otherNameOf = (duel, myUid) => (duel.challengerUid === myUid ? duel.opponentName : duel.challengerName);
const startedAtMs = (result) => result?.startedAt?.toMillis?.() ?? null;

/**
 * Async duels (engagement plan Phase 4): inbox, create/claim, play, finish,
 * rewards. Separate from useOneVsOne on purpose (live 1v1 is untouched), and
 * listener-free: everything is a bounded one-shot fetch, run on lobby entry,
 * tab return, or an explicit refresh. Inert unless `enabled`.
 *
 * Same "lift state, hand back raw setters" convention as the other hooks:
 * App.jsx passes setGlobalStats / setGameState and the mission recorders.
 */
export function useAsyncDuels({
    currentUser,
    enabled,
    gameState,
    setGameState,
    setGlobalStats,
    recordAsyncDuelPlayed,
    recordAsyncDuelResolved,
}) {
    const uid = currentUser?.uid || null;
    const active_ = enabled && !!uid;

    const [duels, setDuels] = useState([]);
    const [myResults, setMyResults] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [busy, setBusy] = useState(false);
    // The run being played: { duel, questions, answers, startIndex }.
    const [activeDuel, setActiveDuel] = useState(null);
    // The end-of-run / review screen: { duel, myResult, opponentResult, questions, justFinished }.
    const [summary, setSummary] = useState(null);
    // Wall-clock time of the last fetch. Derived values below (pending
    // challenges, expiry) are computed from this rather than calling
    // Date.now() during render.
    const [asOf, setAsOf] = useState(0);

    const lastFetchRef = useRef(0);
    const inFlightRef = useRef(false);
    const claimingRef = useRef(new Set());
    const nowMs = () => Date.now();

    const myName = currentUser ? sanitizeDisplayName(currentUser) : 'Igrač';

    // Credits the outcome of a COMPLETE duel once per player. Flag first, credit
    // second (see markRewardClaimed): a crash in between loses a reward instead
    // of duplicating one.
    const claimReward = useCallback(async (duel, myResult) => {
        if (!uid || claimingRef.current.has(duel.id)) return;
        claimingRef.current.add(duel.id);
        try {
            if (myResult?.rewardClaimed) { rememberClaimed(duel.id); return; }
            const ok = await markRewardClaimed(duel.id, uid);
            if (!ok) return;
            rememberClaimed(duel.id);

            const outcome = myOutcome(duel, uid);
            const opponentUid = otherUidOf(duel, uid);
            const opponentResult = await getResult(duel.id, opponentUid);
            writeMatchHistoryEntry(uid, duel.id, {
                opponentUid,
                opponentDisplayName: (otherNameOf(duel, uid) || 'Igrač').slice(0, 20),
                result: outcome,
                myScore: myResult?.score || 0,
                opponentScore: opponentResult?.score || 0,
                category: duel.category,
                forfeited: false,
                async: true,
            });
            if (outcome === 'win') {
                setGlobalStats?.((prev) => applyOneVsOneWin(prev));
                setMessage({ type: 'success', text: `Pobijedio/la si dvoboj protiv ${otherNameOf(duel, uid) || 'protivnika'}!` });
            }
            recordAsyncDuelResolved?.({ won: outcome === 'win', accuracy: Math.round(((myResult?.correct || 0) / DUEL_QUESTION_COUNT) * 100) });
        } finally {
            claimingRef.current.delete(duel.id);
        }
    }, [uid, setGlobalStats, recordAsyncDuelResolved]);

    const refresh = useCallback(async ({ force = false } = {}) => {
        if (!active_ || inFlightRef.current) return;
        if (!force && nowMs() - lastFetchRef.current < MIN_REFRESH_INTERVAL_MS) return;
        inFlightRef.current = true;
        setIsLoading(true);
        try {
            const fetched = await fetchMyDuels(uid);
            let list = fetched.duels;
            const results = { ...fetched.myResults };
            const claimed = loadClaimedIds();
            const now = nowMs();

            // Housekeeping, bounded by the fetch limits.
            for (let i = 0; i < list.length; i++) {
                const d = list[i];
                const state = deriveDuelState(d, results[d.id], now);

                if (state === 'finalize') {
                    const done = await finishRun(d, uid, finalAnswersFor(d.id));
                    if (done.ok) {
                        clearRunProgress(d.id);
                        results[d.id] = { ...results[d.id], state: 'done', score: done.run.score, correct: done.run.correct, totalTimeMs: done.run.totalTimeMs };
                        if (done.duel) list[i] = done.duel;
                        recordAsyncDuelPlayed?.();
                    }
                } else if (state === 'waiting_for_opponent') {
                    const updated = await reconcileDuel(d, uid);
                    if (updated !== d) list[i] = updated;
                } else if (state === 'expired' && d.status !== 'expired' && d.status !== 'complete') {
                    if (await expireDuel(d.id)) list[i] = { ...d, status: 'expired' };
                }

                const cur = list[i];
                if (cur.status === 'complete' && !claimed.has(cur.id)) {
                    const mine = results[cur.id] || await getResult(cur.id, uid);
                    if (mine) {
                        results[cur.id] = mine;
                        await claimReward(cur, mine);
                    }
                }
            }
            setDuels([...list]);
            setMyResults(results);
            lastFetchRef.current = nowMs();
            setAsOf(lastFetchRef.current);
        } finally {
            inFlightRef.current = false;
            setIsLoading(false);
        }
    }, [active_, uid, claimReward, recordAsyncDuelPlayed]);

    // Lobby entry, and coming back to the tab while in the lobby.
    useEffect(() => {
        if (!active_ || gameState !== 'LOBBY') return undefined;
        refresh();
        const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [active_, gameState, refresh]);

    // Signing out / switching account drops the previous account's inbox
    // (in the cleanup, where tearing down per-account state belongs).
    useEffect(() => () => {
        setDuels([]);
        setMyResults({});
        setActiveDuel(null);
        setSummary(null);
        lastFetchRef.current = 0;
    }, [uid]);

    const pendingChallengeCount = active_ ? countPendingChallenges(duels, uid, myResults, asOf) : 0;
    const openAsChallengerCount = active_ ? countOpenAsChallenger(duels, uid, asOf) : 0;
    const challengeLimitReached = openAsChallengerCount >= MAX_OPEN_DUELS_AS_CHALLENGER;

    // ---- playing ----

    const buildQuestions = async (duel) => {
        const questions = await resolveMatchQuestions(duel.questionIds);
        return questions.length === DUEL_QUESTION_COUNT ? questions : null;
    };

    const showReview = useCallback(async (duel) => {
        const otherUid = otherUidOf(duel, uid);
        const [mine, theirs, questions] = await Promise.all([
            getResult(duel.id, uid),
            otherUid ? getResult(duel.id, otherUid) : null,
            resolveMatchQuestions(duel.questionIds),
        ]);
        setSummary({ duel, myResult: mine, opponentResult: theirs, questions, justFinished: false });
        setGameState?.('ASYNC_DUEL');
    }, [uid, setGameState]);

    /** Opens a duel from the inbox: play it, resume it, or review it. */
    const openDuel = useCallback(async (duel) => {
        if (!active_ || busy) return;
        setBusy(true);
        setMessage(null);
        try {
            const state = deriveDuelState(duel, myResults[duel.id], nowMs());
            if (state === 'complete' || state === 'waiting_for_opponent' || state === 'reconcile') {
                const fresh = state === 'complete' ? duel : await reconcileDuel(duel, uid);
                await showReview(fresh);
                return;
            }
            if (state === 'expired' || state === 'finalize') {
                setMessage({ type: 'error', text: 'Ovaj dvoboj je istekao.' });
                return;
            }

            const started = await startRun(duel.id, uid);
            if (!started.ok) {
                setMessage({ type: 'error', text: 'Dvoboj se nije mogao pokrenuti. Pokušaj ponovno.' });
                return;
            }
            if (started.result?.state === 'done') {
                await showReview(duel);
                return;
            }
            const questions = await buildQuestions(duel);
            if (!questions) {
                setMessage({ type: 'error', text: 'Pitanja za ovaj dvoboj nisu dostupna.' });
                return;
            }

            let answers = loadRunProgress(duel.id);
            if (started.resumed && answers.length === 0) {
                const startedMs = startedAtMs(started.result);
                if (startedMs != null && nowMs() - startedMs > RELOAD_GRACE_MS) {
                    // The run began a while ago and we have nothing saved: finalize
                    // it as played (all wrong) rather than let it be replayed.
                    await finishRun(duel, uid, []);
                    clearRunProgress(duel.id);
                    recordAsyncDuelPlayed?.();
                    setMessage({ type: 'error', text: 'Prekinuti dvoboj je završen bez odgovora.' });
                    refresh({ force: true });
                    return;
                }
            }
            setActiveDuel({ duel, questions, answers, startIndex: Math.min(answers.length, DUEL_QUESTION_COUNT - 1) });
            setSummary(null);
            setGameState?.('ASYNC_DUEL');
        } finally {
            setBusy(false);
        }
    }, [active_, busy, myResults, uid, showReview, setGameState, recordAsyncDuelPlayed, refresh]);

    /** Called by the play screen after each answer so a reload can resume. */
    const saveProgress = useCallback((answers) => {
        if (activeDuel) saveRunProgress(activeDuel.duel.id, answers);
    }, [activeDuel]);

    /** Called by the play screen after the tenth answer. */
    const finishActiveDuel = useCallback(async (answers) => {
        if (!activeDuel || !uid) return;
        const { duel, questions } = activeDuel;
        const done = await finishRun(duel, uid, answers);
        if (!done.ok) {
            setMessage({ type: 'error', text: 'Rezultat nije spremljen. Provjeri vezu i otvori dvoboj ponovno.' });
            setActiveDuel(null);
            setGameState?.('LOBBY');
            return;
        }
        clearRunProgress(duel.id);
        recordAsyncDuelPlayed?.();
        const finalDuel = done.duel || duel;
        const otherUid = otherUidOf(finalDuel, uid);
        const [mine, theirs] = await Promise.all([getResult(duel.id, uid), otherUid ? getResult(duel.id, otherUid) : null]);
        setActiveDuel(null);
        setSummary({ duel: finalDuel, myResult: mine, opponentResult: theirs, questions, justFinished: true });
        if (finalDuel.status === 'complete' && mine) claimReward(finalDuel, mine);
        refresh({ force: true });
    }, [activeDuel, uid, claimReward, recordAsyncDuelPlayed, refresh, setGameState]);

    const exitDuelScreen = useCallback(() => {
        setActiveDuel(null);
        setSummary(null);
        setGameState?.('LOBBY');
        refresh({ force: true });
    }, [setGameState, refresh]);

    // ---- creating ----

    /** Opens a duel by id (right after creating/claiming one). */
    const playDuelById = useCallback(async (duelId) => {
        const duel = await getDuel(duelId);
        if (duel) await openDuel(duel);
    }, [openDuel]);

    const challengePlayer = useCallback(async (opponent, category) => {
        if (!active_ || busy) return null;
        if (challengeLimitReached) {
            setMessage({ type: 'error', text: `Možeš imati najviše ${MAX_OPEN_DUELS_AS_CHALLENGER} otvorenih izazova.` });
            return null;
        }
        setBusy(true);
        setMessage(null);
        try {
            const duelId = await createDirectDuel({ uid, name: myName }, opponent, category);
            if (!duelId) {
                setMessage({ type: 'error', text: 'Izazov nije poslan. Pokušaj ponovno.' });
                return null;
            }
            setMessage({ type: 'success', text: `Izazov poslan: ${opponent.name}. Odigraj svoju rundu!` });
            await refresh({ force: true });
            return duelId;
        } finally {
            setBusy(false);
        }
    }, [active_, busy, challengeLimitReached, uid, myName, refresh]);

    /**
     * "Nasumični protivnik": claim the oldest open duel in the pool, or open a
     * new one and play it. Returns the duel id to open, or null.
     */
    const playRandomOpponent = useCallback(async (category) => {
        if (!active_ || busy) return null;
        setBusy(true);
        setMessage(null);
        try {
            const claimed = await claimRandomDuel({ uid, name: myName }, category);
            if (claimed) {
                await refresh({ force: true });
                return claimed.duelId;
            }
            if (challengeLimitReached) {
                setMessage({ type: 'error', text: `Možeš imati najviše ${MAX_OPEN_DUELS_AS_CHALLENGER} otvorenih izazova.` });
                return null;
            }
            const duelId = await createRandomDuel({ uid, name: myName }, category);
            if (!duelId) {
                setMessage({ type: 'error', text: 'Dvoboj nije mogao biti otvoren. Pokušaj ponovno.' });
                return null;
            }
            await refresh({ force: true });
            return duelId;
        } finally {
            setBusy(false);
        }
    }, [active_, busy, uid, myName, challengeLimitReached, refresh]);

    return {
        asyncDuelsEnabled: active_,
        duels,
        myResults,
        isLoading,
        busy,
        message,
        clearMessage: () => setMessage(null),
        pendingChallengeCount,
        challengeLimitReached,
        activeDuel,
        summary,
        refresh,
        openDuel,
        saveProgress,
        finishActiveDuel,
        exitDuelScreen,
        challengePlayer,
        playRandomOpponent,
        asOf,
        playDuelById,
    };
}
