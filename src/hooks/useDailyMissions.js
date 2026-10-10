import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getZagrebDateString } from '../utils/achievements';
import { getMissionsForDateKey, MISSION_TYPES, MISSION_REWARDS, EMPTY_MISSION_SLOT_STATE } from '../constants/missions';
import { getDailyMissionsState, saveDailyMissionsState } from '../services/firebase';
import { applyMissionEvent, applyHybridHalf, categoryMatches, withoutAlts } from '../utils/missionProgress';
import { isFeatureEnabled } from '../constants/features';

const localStorageKey = (uid, dateKey) => `triviabong_missions:${uid}:${dateKey}`;

const freshMissionState = (dateKey) => ({
    dateKey,
    slots: {
        slot1: { ...EMPTY_MISSION_SLOT_STATE },
        slot2: { ...EMPTY_MISSION_SLOT_STATE },
        slot3: { ...EMPTY_MISSION_SLOT_STATE },
    },
    cleanSweepClaimed: false,
});

const loadLocal = (uid, dateKey) => {
    try {
        const raw = localStorage.getItem(localStorageKey(uid, dateKey));
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const saveLocal = (uid, dateKey, state) => {
    try {
        localStorage.setItem(localStorageKey(uid, dateKey), JSON.stringify(state));
    } catch {
        // localStorage can throw (quota, private browsing) - Firestore
        // write-through still happens, so this is a soft failure only.
    }
};

/**
 * Daily micro-missions (see src/constants/missions.js for the 7-day
 * schedule). Firestore path users/{uid}/missions/{dateKey} - loads from
 * localStorage first for instant render, write-through to Firestore on
 * every change. No-op (all record* calls do nothing, state stays null)
 * when signed out - missions require sign-in, same as Daily Challenge.
 */
export function useDailyMissions(uid, setGlobalStats) {
    const [dateKey, setDateKey] = useState(() => getZagrebDateString());
    const [state, setState] = useState(() => (uid ? (loadLocal(uid, dateKey) || freshMissionState(dateKey)) : null));
    // With MISSION_FALLBACKS off, every slot's `alt` is stripped, so the
    // progress logic and the modal behave exactly as before the feature.
    const missionsToday = useMemo(() => {
        const set = getMissionsForDateKey(dateKey);
        return isFeatureEnabled('MISSION_FALLBACKS') ? set : withoutAlts(set);
    }, [dateKey]);
    // Latest state, readable synchronously. Several record* calls can fire in
    // ONE event handler (handleAnswer calls recordCorrectCategory and then
    // recordStreak; a finished solo round records up to four events). With
    // only the `state` closure, each call started from the same stale value
    // and the last persist() overwrote the earlier ones - e.g. on days with
    // both a category slot and a streak slot, every correct answer's
    // category progress was clobbered by the streak write. Reading and
    // advancing this ref makes back-to-back events compose.
    // persist() advances it synchronously; this effect re-syncs it after
    // the other ways `state` changes (sign-in/date reset, Firestore load).
    const stateRef = useRef(state);
    useEffect(() => {
        stateRef.current = state;
    }, [state]);
    const loadedForRef = useRef(null); // `${uid}:${dateKey}` already fetched from Firestore

    // Re-initialize on sign-in/out or date change - adjusted during render
    // (React's documented "store prevKey in state, compare, adjust" pattern
    // for resetting state when a prop changes: https://react.dev/reference/react/useState#storing-information-from-previous-renders)
    // rather than in a useEffect, so this doesn't cost an extra render pass
    // for what's really a pure function of (uid, dateKey). Refs can't be
    // read/written during render, which is why this needs its own state
    // slot rather than a ref. The interval below still owns catching a
    // same-session midnight rollover.
    const initKey = `${uid || ''}:${dateKey}`;
    const [initializedFor, setInitializedFor] = useState(initKey);
    if (initializedFor !== initKey) {
        setInitializedFor(initKey);
        setState(uid ? (loadLocal(uid, dateKey) || freshMissionState(dateKey)) : null);
    }

    // Reconcile with Firestore once per uid/dateKey - Firestore is
    // authoritative once loaded (it's the write-through target), so a
    // fetched doc overwrites the localStorage-seeded guess.
    useEffect(() => {
        if (!uid) return;
        const key = `${uid}:${dateKey}`;
        if (loadedForRef.current === key) return;
        loadedForRef.current = key;
        (async () => {
            const remote = await getDailyMissionsState(uid, dateKey);
            if (remote && remote.dateKey === dateKey) {
                setState(remote);
                saveLocal(uid, dateKey, remote);
            }
        })();
    }, [uid, dateKey]);

    // Catches a midnight Zagreb rollover mid-session (not just on
    // mount/uid-change) - checked every minute, cheap since it's just a
    // string comparison.
    useEffect(() => {
        const interval = setInterval(() => {
            const today = getZagrebDateString();
            setDateKey((prev) => (prev === today ? prev : today));
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    const persist = useCallback((next) => {
        stateRef.current = next;
        setState(next);
        if (!uid) return;
        saveLocal(uid, dateKey, next);
        saveDailyMissionsState(uid, dateKey, next);
    }, [uid, dateKey]);

    // Applies one event to whichever slot (primary or alt) today's schedule
    // assigns to `type` - see utils/missionProgress.js.
    const record = useCallback((type, delta, matches) => {
        const current = stateRef.current;
        if (!uid || !current) return;
        const next = applyMissionEvent(current, missionsToday, type, delta, matches);
        if (next !== current) persist(next);
    }, [uid, missionsToday, persist]);

    const recordHybridHalf = useCallback((half) => {
        const current = stateRef.current;
        if (!uid || !current) return;
        const next = applyHybridHalf(current, missionsToday, half);
        if (next !== current) persist(next);
    }, [uid, missionsToday, persist]);

    const recordMatchComplete = useCallback(({ won, accuracy = 0 } = {}) => {
        record(MISSION_TYPES.PLAY_1V1, 1);
        if (won) {
            record(MISSION_TYPES.WIN_1V1, 1);
            // No jokers exist in 1v1 (see GuideModal), so any win already
            // satisfies WIN_1V1_NO_JOKER.
            record(MISSION_TYPES.WIN_1V1_NO_JOKER, 1);
            record(MISSION_TYPES.WIN_1V1_ACCURACY, 1, (m) => accuracy >= (m.accuracy || 0));
            recordHybridHalf('matchDone');
        }
    }, [record, recordHybridHalf]);

    const recordDailyComplete = useCallback(({ accuracy = 0 } = {}) => {
        record(MISSION_TYPES.PLAY_DAILY, 1);
        record(MISSION_TYPES.DAILY_ACCURACY, 1, (m) => accuracy >= (m.accuracy || 0));
        recordHybridHalf('dailyDone');
    }, [record, recordHybridHalf]);

    const recordCorrectCategory = useCallback((categoryKey) => {
        record(MISSION_TYPES.CATEGORY_CORRECT, 1, (m) => categoryMatches(m, categoryKey));
    }, [record]);

    const recordStreak = useCallback((streakLength) => {
        record(MISSION_TYPES.STREAK, streakLength);
    }, [record]);

    const recordQuestionSubmitted = useCallback(() => {
        record(MISSION_TYPES.SUBMIT_QUESTION, 1);
    }, [record]);

    // Mission-fallback events. No-ops on days/slots without a matching alt
    // (and always when MISSION_FALLBACKS is off, since alts are stripped).
    // Called once per FINISHED non-daily solo round (victory or game over).
    const recordSoloRoundComplete = useCallback(({ correct = 0, jokersUsed = false } = {}) => {
        record(MISSION_TYPES.SOLO_ROUND_COMPLETE, 1);
        record(MISSION_TYPES.SOLO_ROUND_MIN_CORRECT, 1, (m) => correct >= (m.minCorrect || 0));
        if (!jokersUsed) record(MISSION_TYPES.SOLO_ROUND_NO_JOKER, 1);
        recordHybridHalf('soloDone');
    }, [record, recordHybridHalf]);

    const recordQuestionReported = useCallback(() => {
        record(MISSION_TYPES.REPORT_QUESTION, 1);
    }, [record]);

    // Both claim* functions credit coins directly via setGlobalStats (same
    // "hand back raw setters, let this hook use them" convention useOneVsOne
    // follows) rather than returning the reward amount for a caller to
    // apply - there's no level-up path here (coins only, no xp), so no
    // level-up toast concern to route through gameLogic.js for.
    // Both read stateRef rather than the render's `state`, so a quick double
    // tap can't see the slot as unclaimed twice and credit the coins twice.
    const claimSlot = useCallback((slotKey) => {
        const current = stateRef.current;
        if (!current) return;
        const slot = current.slots[slotKey];
        if (!slot?.completed || slot.claimed) return;
        persist({ ...current, slots: { ...current.slots, [slotKey]: { ...slot, claimed: true } } });
        setGlobalStats(prev => ({ ...prev, coins: (prev.coins || 0) + MISSION_REWARDS.SLOT_COMPLETION }));
    }, [persist, setGlobalStats]);

    const claimCleanSweep = useCallback(() => {
        const current = stateRef.current;
        if (!current || current.cleanSweepClaimed) return;
        const allClaimed = ['slot1', 'slot2', 'slot3'].every((k) => current.slots[k]?.claimed);
        if (!allClaimed) return;
        persist({ ...current, cleanSweepClaimed: true });
        setGlobalStats(prev => ({ ...prev, coins: (prev.coins || 0) + MISSION_REWARDS.CLEAN_SWEEP_BONUS }));
    }, [persist, setGlobalStats]);

    return {
        dateKey,
        missionsToday,
        missionState: state,
        recordMatchComplete,
        recordDailyComplete,
        recordCorrectCategory,
        recordStreak,
        recordQuestionSubmitted,
        recordSoloRoundComplete,
        recordQuestionReported,
        claimSlot,
        claimCleanSweep,
    };
}
