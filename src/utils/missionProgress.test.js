import { describe, it, expect } from 'vitest';
import { applyMissionEvent, applyHybridHalf, categoryMatches, withoutAlts, pathProgress } from './missionProgress';
import { MISSION_TYPES as T, WEEKLY_MISSION_SCHEDULE, EMPTY_MISSION_SLOT_STATE } from '../constants/missions';

const fresh = () => ({
    slots: {
        slot1: { ...EMPTY_MISSION_SLOT_STATE },
        slot2: { ...EMPTY_MISSION_SLOT_STATE },
        slot3: { ...EMPTY_MISSION_SLOT_STATE },
    },
    cleanSweepClaimed: false,
});

const missions = {
    slot1: { type: T.PLAY_1V1, target: 2, alt: { type: T.SOLO_ROUND_COMPLETE, target: 3 } },
    slot2: { type: T.CATEGORY_CORRECT, category: 'znanost', target: 2 },
    slot3: { type: T.STREAK, target: 5 },
};

describe('applyMissionEvent - primary and alt paths', () => {
    it('advances the primary path', () => {
        const s = applyMissionEvent(fresh(), missions, T.PLAY_1V1, 1);
        expect(s.slots.slot1.progress).toBe(1);
        expect(s.slots.slot1.completed).toBe(false);
    });

    it('completes via the primary path at its target', () => {
        let s = applyMissionEvent(fresh(), missions, T.PLAY_1V1, 1);
        s = applyMissionEvent(s, missions, T.PLAY_1V1, 1);
        expect(s.slots.slot1.completed).toBe(true);
        expect(s.slots.slot1.completedVia).toBe('primary');
    });

    it('advances and completes via the alt path on its own target', () => {
        let s = fresh();
        for (let i = 0; i < 3; i++) s = applyMissionEvent(s, missions, T.SOLO_ROUND_COMPLETE, 1);
        expect(s.slots.slot1.altProgress).toBe(3);
        expect(s.slots.slot1.completed).toBe(true);
        expect(s.slots.slot1.completedVia).toBe('alt');
    });

    it('never adds the two paths together', () => {
        let s = applyMissionEvent(fresh(), missions, T.PLAY_1V1, 1); // 1/2 primary
        s = applyMissionEvent(s, missions, T.SOLO_ROUND_COMPLETE, 1); // 1/3 alt
        s = applyMissionEvent(s, missions, T.SOLO_ROUND_COMPLETE, 1); // 2/3 alt
        expect(s.slots.slot1.completed).toBe(false);
    });

    it('ignores alt events when the slot has no alt (flag off / day without one)', () => {
        const s0 = fresh();
        const s = applyMissionEvent(s0, withoutAlts(missions), T.SOLO_ROUND_COMPLETE, 1);
        expect(s).toBe(s0);
    });

    it('does not move a completed slot and returns the same object', () => {
        let s = applyMissionEvent(fresh(), missions, T.PLAY_1V1, 2);
        const before = s;
        s = applyMissionEvent(s, missions, T.PLAY_1V1, 1);
        s = applyMissionEvent(s, missions, T.SOLO_ROUND_COMPLETE, 1);
        expect(s).toBe(before);
    });

    it('clamps progress at the target', () => {
        const s = applyMissionEvent(fresh(), missions, T.PLAY_1V1, 9);
        expect(s.slots.slot1.progress).toBe(2);
    });

    it('treats STREAK as a running peak, not a sum, and skips no-op writes', () => {
        let s = applyMissionEvent(fresh(), missions, T.STREAK, 3);
        s = applyMissionEvent(s, missions, T.STREAK, 2);
        expect(s.slots.slot3.progress).toBe(3);
        const same = applyMissionEvent(s, missions, T.STREAK, 3);
        expect(same).toBe(s);
    });

    it('reads old docs without altProgress as 0', () => {
        const old = fresh();
        delete old.slots.slot1.altProgress;
        const s = applyMissionEvent(old, missions, T.SOLO_ROUND_COMPLETE, 1);
        expect(s.slots.slot1.altProgress).toBe(1);
    });

    it('back-to-back events compose when applied to the latest state (the category+streak clobber bug)', () => {
        // Same order as handleAnswer: category, then streak, on one correct answer.
        let s = fresh();
        s = applyMissionEvent(s, missions, T.CATEGORY_CORRECT, 1, (m) => categoryMatches(m, 'znanost'));
        s = applyMissionEvent(s, missions, T.STREAK, 1);
        expect(s.slots.slot2.progress).toBe(1);
        expect(s.slots.slot3.progress).toBe(1);
    });

    it('applies the matches filter to the alt definition too (minCorrect)', () => {
        const m = { slot1: { type: T.WIN_1V1, target: 2, alt: { type: T.SOLO_ROUND_MIN_CORRECT, target: 2, minCorrect: 7 } }, slot2: missions.slot2, slot3: missions.slot3 };
        const round = (correct) => (def) => correct >= (def.minCorrect || 0);
        let s = applyMissionEvent(fresh(), m, T.SOLO_ROUND_MIN_CORRECT, 1, round(6));
        expect(s.slots.slot1.altProgress || 0).toBe(0);
        s = applyMissionEvent(s, m, T.SOLO_ROUND_MIN_CORRECT, 1, round(7));
        expect(s.slots.slot1.altProgress).toBe(1);
    });
});

describe('categoryMatches', () => {
    it('matches both spellings of a category (the long-form tag bug)', () => {
        expect(categoryMatches({ category: 'znanost' }, 'znanost_i_tehnologija')).toBe(true);
        expect(categoryMatches({ category: 'knjizevnost' }, 'knjizevnost_i_umjetnost')).toBe(true);
        expect(categoryMatches({ category: 'znanost' }, 'znanost')).toBe(true);
    });
    it('rejects other categories', () => {
        expect(categoryMatches({ category: 'sport' }, 'glazba')).toBe(false);
        expect(categoryMatches({ category: 'sport' }, undefined)).toBe(false);
    });
});

describe('applyHybridHalf', () => {
    const hybrid = { slot1: { type: T.HYBRID_DAILY_1V1, target: 1, alt: { type: T.HYBRID_DAILY_SOLO, target: 1 } }, slot2: missions.slot2, slot3: missions.slot3 };

    it('completes on daily + match', () => {
        let s = applyHybridHalf(fresh(), hybrid, 'dailyDone');
        s = applyHybridHalf(s, hybrid, 'matchDone');
        expect(s.slots.slot1.completed).toBe(true);
        expect(s.slots.slot1.completedVia).toBe('primary');
    });

    it('completes on daily + solo round when the slot has an alt', () => {
        let s = applyHybridHalf(fresh(), hybrid, 'soloDone');
        expect(s.slots.slot1.completed).toBe(false);
        s = applyHybridHalf(s, hybrid, 'dailyDone');
        expect(s.slots.slot1.completed).toBe(true);
        expect(s.slots.slot1.completedVia).toBe('alt');
    });

    it('ignores soloDone without an alt', () => {
        const s0 = fresh();
        expect(applyHybridHalf(s0, withoutAlts(hybrid), 'soloDone')).toBe(s0);
    });

    it('does not complete on the daily half alone', () => {
        const s = applyHybridHalf(fresh(), hybrid, 'dailyDone');
        expect(s.slots.slot1.completed).toBe(false);
    });
});

describe('pathProgress', () => {
    it('reports primary and alt separately', () => {
        const slot = { progress: 1, altProgress: 2, completed: false };
        expect(pathProgress(slot, missions.slot1, 'primary')).toEqual({ value: 1, target: 2, pct: 50 });
        expect(pathProgress(slot, missions.slot1, 'alt')).toEqual({ value: 2, target: 3, pct: 67 });
    });
    it('reports hybrid halves out of 2', () => {
        const hybrid = { type: T.HYBRID_DAILY_1V1, target: 1, alt: { type: T.HYBRID_DAILY_SOLO, target: 1 } };
        expect(pathProgress({ dailyDone: true }, hybrid, 'primary').value).toBe(1);
        expect(pathProgress({ dailyDone: true, soloDone: true }, hybrid, 'alt').value).toBe(2);
    });
});

describe('weekly schedule invariants', () => {
    const SOCIAL = new Set([T.PLAY_1V1, T.WIN_1V1, T.WIN_1V1_NO_JOKER, T.WIN_1V1_ACCURACY, T.HYBRID_DAILY_1V1, T.SUBMIT_QUESTION]);

    it('every slot that depends on other players or on submitting has an alt', () => {
        for (let day = 0; day < 7; day++) {
            for (const key of ['slot1', 'slot2', 'slot3']) {
                const m = WEEKLY_MISSION_SCHEDULE[day][key];
                if (SOCIAL.has(m.type)) expect(m.alt, `day ${day} ${key}`).toBeTruthy();
            }
        }
    });

    it('every mission and alt has a positive target and Croatian copy', () => {
        for (let day = 0; day < 7; day++) {
            for (const key of ['slot1', 'slot2', 'slot3']) {
                for (const def of [WEEKLY_MISSION_SCHEDULE[day][key], WEEKLY_MISSION_SCHEDULE[day][key].alt].filter(Boolean)) {
                    expect(def.target).toBeGreaterThan(0);
                    expect(def.descriptionHr.length).toBeGreaterThan(0);
                }
            }
        }
    });

    it('DAILY_ACCURACY is completable: one qualifying run, threshold in `accuracy`', () => {
        const friday = WEEKLY_MISSION_SCHEDULE[5].slot3;
        expect(friday.type).toBe(T.DAILY_ACCURACY);
        const s = applyMissionEvent(fresh(), WEEKLY_MISSION_SCHEDULE[5], T.DAILY_ACCURACY, 1, (m) => 80 >= m.accuracy);
        expect(s.slots.slot3.completed).toBe(true);
    });
});
