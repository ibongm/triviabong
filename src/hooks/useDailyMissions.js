import { useCallback, useEffect, useRef, useState } from 'react';
import { getZagrebDateString } from '../utils/achievements';
import { getMissionsForDate, MISSION_TYPES, MISSION_REWARDS, EMPTY_MISSION_SLOT_STATE } from '../constants/missions';
import { getDailyMissionsState, saveDailyMissionsState } from '../services/firebase';

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
 * Marks `slotKey` complete once its target is reached and applies `delta`
 * to its progress - additive for every mission type except STREAK, which
 * tracks a running peak (the longest streak reached that day) rather than
 * a count of events, since "hit a streak of N" isn't cumulative across
 * separate streaks. No-ops once a slot is already completed, so a mission
 * can't be double-progressed past its target.
 */
const applyProgress = (state, slotKey, mission, delta) => {
    const slot = state.slots[slotKey];
    if (!mission || slot.completed) return state;

    const newProgress = mission.type === MISSION_TYPES.STREAK
        ? Math.max(slot.progress, delta)
        : slot.progress + delta;
    const target = mission.target;
    const completed = newProgress >= target;

    return {
        ...state,
        slots: {
            ...state.slots,
            [slotKey]: { ...slot, progress: Math.min(newProgress, target), completed },
        },
    };
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
    const missionsToday = getMissionsForDate(new Date());
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
        setState(next);
        if (!uid) return;
        saveLocal(uid, dateKey, next);
        saveDailyMissionsState(uid, dateKey, next);
    }, [uid, dateKey]);

    // Finds which slot (if any) today's schedule assigns to `type`, and
    // applies `delta` (or the hybrid-flag updater) if a match filter passes.
    const record = useCallback((type, delta, matches = () => true) => {
        if (!uid || !state) return;
        let next = state;
        for (const slotKey of ['slot1', 'slot2', 'slot3']) {
            const mission = missionsToday[slotKey];
            if (mission?.type === type && matches(mission)) {
                next = applyProgress(next, slotKey, mission, delta);
            }
        }
        if (next !== state) persist(next);
    }, [uid, state, missionsToday, persist]);

    // HYBRID_DAILY_1V1 needs one Daily Challenge completion AND one 1v1
    // match completion on the same day - tracked via two extra boolean
    // flags on the slot rather than a numeric progress count, since
    // "progress" here means "which half is done", not an accumulating tally.
    const recordHybridHalf = useCallback((half) => {
        if (!uid || !state) return;
        let next = state;
        for (const slotKey of ['slot1', 'slot2', 'slot3']) {
            const mission = missionsToday[slotKey];
            if (mission?.type !== MISSION_TYPES.HYBRID_DAILY_1V1) continue;
            const slot = next.slots[slotKey];
            if (slot.completed) continue;
            const updated = { ...slot, [half]: true };
            const completed = !!(updated.dailyDone && updated.matchDone);
            next = { ...next, slots: { ...next.slots, [slotKey]: { ...updated, progress: completed ? mission.target : 0, completed } } };
        }
        if (next !== state) persist(next);
    }, [uid, state, missionsToday, persist]);

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
        record(MISSION_TYPES.DAILY_ACCURACY, 1, (m) => accuracy >= m.target);
        recordHybridHalf('dailyDone');
    }, [record, recordHybridHalf]);

    const recordCorrectCategory = useCallback((categoryKey) => {
        record(MISSION_TYPES.CATEGORY_CORRECT, 1, (m) => m.category === categoryKey);
    }, [record]);

    const recordStreak = useCallback((streakLength) => {
        record(MISSION_TYPES.STREAK, streakLength);
    }, [record]);

    const recordQuestionSubmitted = useCallback(() => {
        record(MISSION_TYPES.SUBMIT_QUESTION, 1);
    }, [record]);

    // Both claim* functions credit coins directly via setGlobalStats (same
    // "hand back raw setters, let this hook use them" convention useOneVsOne
    // follows) rather than returning the reward amount for a caller to
    // apply - there's no level-up path here (coins only, no xp), so no
    // level-up toast concern to route through gameLogic.js for.
    const claimSlot = useCallback((slotKey) => {
        if (!state) return;
        const slot = state.slots[slotKey];
        if (!slot.completed || slot.claimed) return;
        persist({ ...state, slots: { ...state.slots, [slotKey]: { ...slot, claimed: true } } });
        setGlobalStats(prev => ({ ...prev, coins: (prev.coins || 0) + MISSION_REWARDS.SLOT_COMPLETION }));
    }, [state, persist, setGlobalStats]);

    const claimCleanSweep = useCallback(() => {
        if (!state || state.cleanSweepClaimed) return;
        const allClaimed = ['slot1', 'slot2', 'slot3'].every((k) => state.slots[k].claimed);
        if (!allClaimed) return;
        persist({ ...state, cleanSweepClaimed: true });
        setGlobalStats(prev => ({ ...prev, coins: (prev.coins || 0) + MISSION_REWARDS.CLEAN_SWEEP_BONUS }));
    }, [state, persist, setGlobalStats]);

    return {
        dateKey,
        missionsToday,
        missionState: state,
        recordMatchComplete,
        recordDailyComplete,
        recordCorrectCategory,
        recordStreak,
        recordQuestionSubmitted,
        claimSlot,
        claimCleanSweep,
    };
}
