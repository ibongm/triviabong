// Daily micro-mission constants - 7-day rotating 3-slot schedule. Schedule
// text/targets verbatim from DailyTasks.md.docx; category names there are
// English (History/Science/Geography/Art/Pop Culture/Sport/Music) and are
// mapped here to this app's real category keys (src/data/categoryKeys.js) -
// "Art" -> knjizevnost (Književnost i Umjetnost is the closest existing
// category; there's no separate "Art" pack).
export const MISSION_REWARDS = {
    SLOT_COMPLETION: 2,
    CLEAN_SWEEP_BONUS: 5,
    MAX_DAILY_YIELD: 11, // 2 + 2 + 2 + 5
};

export const MISSION_TYPES = {
    PLAY_1V1: 'PLAY_1V1',
    WIN_1V1: 'WIN_1V1',
    WIN_1V1_NO_JOKER: 'WIN_1V1_NO_JOKER',
    WIN_1V1_ACCURACY: 'WIN_1V1_ACCURACY',
    PLAY_DAILY: 'PLAY_DAILY',
    DAILY_ACCURACY: 'DAILY_ACCURACY',
    HYBRID_DAILY_1V1: 'HYBRID_DAILY_1V1',
    CATEGORY_CORRECT: 'CATEGORY_CORRECT',
    STREAK: 'STREAK',
    SUBMIT_QUESTION: 'SUBMIT_QUESTION',
    // Solo fallbacks (mission-fallbacks feature, FEATURES.MISSION_FALLBACKS):
    // used only as a slot's `alt`, so a player with nobody online to duel -
    // or nothing to suggest - can still clear every slot.
    SOLO_ROUND_COMPLETE: 'SOLO_ROUND_COMPLETE',
    SOLO_ROUND_MIN_CORRECT: 'SOLO_ROUND_MIN_CORRECT',
    SOLO_ROUND_NO_JOKER: 'SOLO_ROUND_NO_JOKER',
    REPORT_QUESTION: 'REPORT_QUESTION',
    HYBRID_DAILY_SOLO: 'HYBRID_DAILY_SOLO',
};

// Shared alt definitions (copy reviewed per release - see the plan's
// Phase 1 table). `minCorrect` is checked against a finished solo round's
// correct-answer count; a round only counts once it ends (victory or game
// over), never on quitting mid-round.
const ALT_REPORT_QUESTION = { type: MISSION_TYPES.REPORT_QUESTION, target: 1, descriptionHr: 'Prijavi 1 pitanje s greškom' };

// 0 = Sunday ... 6 = Saturday, matching Date#getUTCDay() of the Zagreb
// date key (see weekdayOfDateKey below).
//
// DAILY_ACCURACY was previously `target: 75` with progress +1 per
// qualifying Daily Challenge, so it could never reach 75 - Friday's slot 3
// was impossible to complete. It now follows WIN_1V1_ACCURACY's shape: the
// threshold lives in `accuracy`, `target` is how many qualifying runs.
export const WEEKLY_MISSION_SCHEDULE = {
    1: { // Monday
        slot1: { type: MISSION_TYPES.PLAY_1V1, target: 2, descriptionHr: 'Odigraj 2 1v1 dvoboja', alt: { type: MISSION_TYPES.SOLO_ROUND_COMPLETE, target: 3, descriptionHr: 'Završi 3 solo runde' } },
        slot2: { type: MISSION_TYPES.CATEGORY_CORRECT, category: 'povijest', target: 10, descriptionHr: 'Odgovori točno na 10 pitanja iz Povijesti' },
        slot3: { type: MISSION_TYPES.SUBMIT_QUESTION, target: 1, descriptionHr: 'Predloži 1 pitanje za pregled', alt: ALT_REPORT_QUESTION },
    },
    2: { // Tuesday
        slot1: { type: MISSION_TYPES.PLAY_DAILY, target: 1, descriptionHr: 'Odigraj Dnevni izazov' },
        slot2: { type: MISSION_TYPES.CATEGORY_CORRECT, category: 'znanost', target: 10, descriptionHr: 'Odgovori točno na 10 pitanja iz Znanosti' },
        slot3: { type: MISSION_TYPES.STREAK, target: 5, descriptionHr: 'Postigni niz od 5 točnih odgovora u bilo kojem načinu' },
    },
    3: { // Wednesday
        slot1: { type: MISSION_TYPES.WIN_1V1, target: 2, descriptionHr: 'Pobijedi u 2 1v1 dvoboja', alt: { type: MISSION_TYPES.SOLO_ROUND_MIN_CORRECT, target: 2, minCorrect: 7, descriptionHr: 'Završi 2 runde sa 7+ točnih' } },
        slot2: { type: MISSION_TYPES.CATEGORY_CORRECT, category: 'geografija', target: 10, descriptionHr: 'Odgovori točno na 10 pitanja iz Geografije' },
        slot3: { type: MISSION_TYPES.WIN_1V1_NO_JOKER, target: 1, descriptionHr: 'Pobijedi u 1v1 dvoboju bez korištenja jokera', alt: { type: MISSION_TYPES.SOLO_ROUND_NO_JOKER, target: 1, descriptionHr: 'Završi solo rundu bez jokera' } },
    },
    4: { // Thursday
        slot1: { type: MISSION_TYPES.HYBRID_DAILY_1V1, target: 1, descriptionHr: 'Odigraj 1 Dnevni izazov i 1 1v1 dvoboj', alt: { type: MISSION_TYPES.HYBRID_DAILY_SOLO, target: 1, descriptionHr: 'Odigraj Dnevni izazov i 1 solo rundu' } },
        slot2: { type: MISSION_TYPES.CATEGORY_CORRECT, category: 'knjizevnost', target: 10, descriptionHr: 'Odgovori točno na 10 pitanja iz Književnosti i Umjetnosti' },
        slot3: { type: MISSION_TYPES.SUBMIT_QUESTION, target: 1, descriptionHr: 'Predloži 1 pitanje za pregled', alt: ALT_REPORT_QUESTION },
    },
    5: { // Friday
        slot1: { type: MISSION_TYPES.PLAY_1V1, target: 3, descriptionHr: 'Odigraj 3 1v1 dvoboja', alt: { type: MISSION_TYPES.SOLO_ROUND_COMPLETE, target: 4, descriptionHr: 'Završi 4 solo runde' } },
        slot2: { type: MISSION_TYPES.CATEGORY_CORRECT, category: 'pop_kultura', target: 10, descriptionHr: 'Odgovori točno na 10 pitanja iz Pop kulture' },
        slot3: { type: MISSION_TYPES.DAILY_ACCURACY, target: 1, accuracy: 75, descriptionHr: 'Postigni 75%+ točnosti u Dnevnom izazovu' },
    },
    6: { // Saturday
        slot1: { type: MISSION_TYPES.WIN_1V1, target: 3, descriptionHr: 'Pobijedi u 3 1v1 dvoboja', alt: { type: MISSION_TYPES.SOLO_ROUND_MIN_CORRECT, target: 3, minCorrect: 7, descriptionHr: 'Završi 3 runde sa 7+ točnih' } },
        slot2: { type: MISSION_TYPES.CATEGORY_CORRECT, category: 'sport', target: 10, descriptionHr: 'Odgovori točno na 10 pitanja iz Sporta' },
        slot3: { type: MISSION_TYPES.STREAK, target: 10, descriptionHr: 'Postigni niz od 10 točnih odgovora u bilo kojem načinu' },
    },
    0: { // Sunday
        slot1: { type: MISSION_TYPES.PLAY_DAILY, target: 1, descriptionHr: 'Odigraj Dnevni izazov' },
        slot2: { type: MISSION_TYPES.CATEGORY_CORRECT, category: 'glazba', target: 10, descriptionHr: 'Odgovori točno na 10 pitanja iz Glazbe' },
        slot3: { type: MISSION_TYPES.WIN_1V1_ACCURACY, target: 2, accuracy: 80, descriptionHr: 'Pobijedi u 2 1v1 dvoboja s preko 80% točnosti', alt: { type: MISSION_TYPES.SOLO_ROUND_MIN_CORRECT, target: 2, minCorrect: 9, descriptionHr: 'Završi 2 runde s 9+ točnih' } },
    },
};

/**
 * Weekday (0 = Sunday ... 6 = Saturday) of a "YYYY-MM-DD" calendar date.
 * Computed from the date string itself (UTC-anchored, pure calendar
 * arithmetic) rather than a Date's local getDay(), so it can't disagree with
 * the Zagreb date key the mission doc is stored under.
 * @param {string} dateKey
 */
export const weekdayOfDateKey = (dateKey) => {
    const [y, m, d] = String(dateKey).split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

/**
 * The 3-slot mission set for a Zagreb calendar date ("YYYY-MM-DD", as
 * produced by getZagrebDateString()). Previously keyed off the DEVICE's
 * local weekday (`new Date().getDay()`) while the progress doc was keyed by
 * the Zagreb date, so a device in another timezone could show one day's
 * missions against another day's progress around midnight.
 * @param {string} dateKey
 */
export const getMissionsForDateKey = (dateKey) => WEEKLY_MISSION_SCHEDULE[weekdayOfDateKey(dateKey)];

export const EMPTY_MISSION_SLOT_STATE = { progress: 0, completed: false, claimed: false };
