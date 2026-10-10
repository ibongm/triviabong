// Pure daily-mission progress logic, extracted from hooks/useDailyMissions.js
// so it can be unit-tested (the hook keeps persistence, timers and React
// state). No React/Firebase imports.
//
// A slot definition (constants/missions.js) has a primary mission and, since
// the mission-fallbacks feature, an optional `alt` of the same shape. The
// slot completes when EITHER path reaches its own target; progress from the
// two paths never adds together. Slot state keeps the two counters apart:
// `progress` (primary) and `altProgress` (alt). Docs written before `alt`
// existed have no `altProgress` and read as 0 - no migration needed.
import { MISSION_TYPES } from '../constants/missions.js';
import { resolveCategoryKey } from '../data/categoryKeys.js';

export const SLOT_KEYS = ['slot1', 'slot2', 'slot3'];

/**
 * Returns the day's mission set with every `alt` removed - used when the
 * MISSION_FALLBACKS flag is off, so the rest of the code can treat "no alt"
 * and "flag off" identically.
 */
export const withoutAlts = (missions) => {
    if (!missions) return missions;
    const out = {};
    for (const key of SLOT_KEYS) {
        if (!missions[key]) continue;
        // eslint-disable-next-line no-unused-vars
        const { alt, ...primary } = missions[key];
        out[key] = primary;
    }
    return out;
};

/**
 * Category match for CATEGORY_CORRECT. Both sides go through
 * resolveCategoryKey: question files carry both spellings of some
 * categories (e.g. 'znanost' and 'znanost_i_tehnologija'), and a strict
 * string compare silently ignored every answer to a question tagged with
 * the long form.
 */
export const categoryMatches = (mission, categoryKey) => {
    const want = resolveCategoryKey(mission?.category) || mission?.category;
    const got = resolveCategoryKey(categoryKey) || categoryKey;
    return !!want && want === got;
};

const advance = (current, mission, delta) => (
    mission.type === MISSION_TYPES.STREAK
        // "Hit a streak of N" isn't cumulative across separate streaks -
        // track the day's peak instead of summing.
        ? Math.max(current, delta)
        : current + delta
);

const isComplete = (slot, mission) => (
    (slot.progress || 0) >= mission.target
    || (!!mission.alt && (slot.altProgress || 0) >= mission.alt.target)
);

/**
 * Applies one mission event to every slot whose primary or alt mission has
 * this `type` and passes `matches`. Returns the SAME state object when
 * nothing changed, so callers can skip a write.
 * @param {object} state - { slots: { slotN: { progress, altProgress?, completed, claimed } } }
 * @param {object} missions - the day's slot definitions
 * @param {string} type - a MISSION_TYPES value
 * @param {number} delta
 * @param {(mission: object) => boolean} [matches] - extra filter, receives the
 *   primary or alt definition being checked
 */
export const applyMissionEvent = (state, missions, type, delta, matches = () => true) => {
    if (!state || !missions) return state;
    let next = state;
    for (const slotKey of SLOT_KEYS) {
        const mission = missions[slotKey];
        const slot = next.slots[slotKey];
        if (!mission || !slot || slot.completed) continue;

        let updated = null;
        if (mission.type === type && matches(mission)) {
            const progress = Math.min(advance(slot.progress || 0, mission, delta), mission.target);
            if (progress !== (slot.progress || 0)) updated = { ...slot, progress };
        } else if (mission.alt?.type === type && matches(mission.alt)) {
            const altProgress = Math.min(advance(slot.altProgress || 0, mission.alt, delta), mission.alt.target);
            if (altProgress !== (slot.altProgress || 0)) updated = { ...slot, altProgress };
        }
        if (!updated) continue;

        updated.completed = isComplete(updated, mission);
        if (updated.completed) {
            updated.completedVia = (updated.progress || 0) >= mission.target ? 'primary' : 'alt';
        }
        next = { ...next, slots: { ...next.slots, [slotKey]: updated } };
    }
    return next;
};

/**
 * HYBRID_DAILY_1V1: needs the Daily Challenge AND (a 1v1 match, or - when
 * the slot has an alt - a finished solo round), all on the same day.
 * Tracked as boolean halves on the slot rather than a count.
 * @param {'dailyDone'|'matchDone'|'soloDone'} half
 */
export const applyHybridHalf = (state, missions, half) => {
    if (!state || !missions) return state;
    let next = state;
    for (const slotKey of SLOT_KEYS) {
        const mission = missions[slotKey];
        if (mission?.type !== MISSION_TYPES.HYBRID_DAILY_1V1) continue;
        const slot = next.slots[slotKey];
        if (!slot || slot.completed || slot[half]) continue;
        if (half === 'soloDone' && !mission.alt) continue;

        const updated = { ...slot, [half]: true };
        const viaMatch = !!(updated.dailyDone && updated.matchDone);
        const viaSolo = !!(mission.alt && updated.dailyDone && updated.soloDone);
        const completed = viaMatch || viaSolo;
        next = {
            ...next,
            slots: {
                ...next.slots,
                [slotKey]: {
                    ...updated,
                    progress: completed ? mission.target : 0,
                    completed,
                    ...(completed ? { completedVia: viaMatch ? 'primary' : 'alt' } : {}),
                },
            },
        };
    }
    return next;
};

/**
 * Display numbers for one path of a slot (primary or alt), clamped to target.
 * @returns {{ value: number, target: number, pct: number }}
 */
export const pathProgress = (slot, mission, which = 'primary') => {
    const def = which === 'alt' ? mission?.alt : mission;
    if (!def) return { value: 0, target: 0, pct: 0 };
    let value;
    if (def.type === MISSION_TYPES.HYBRID_DAILY_1V1 || def.type === MISSION_TYPES.HYBRID_DAILY_SOLO) {
        const second = which === 'alt' ? slot?.soloDone : slot?.matchDone;
        value = (slot?.dailyDone ? 1 : 0) + (second ? 1 : 0);
        return { value, target: 2, pct: Math.round((value / 2) * 100) };
    }
    const raw = which === 'alt' ? (slot?.altProgress || 0) : (slot?.progress || 0);
    value = Math.min(raw, def.target);
    return { value, target: def.target, pct: def.target ? Math.min(100, Math.round((value / def.target) * 100)) : 0 };
};
