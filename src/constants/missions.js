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
};

// 0 = Sunday ... 6 = Saturday, matching Date#getDay() so
// useDailyMissions.js can index straight off `new Date().getDay()`.
export const WEEKLY_MISSION_SCHEDULE = {
    1: { // Monday
        slot1: { type: MISSION_TYPES.PLAY_1V1, target: 2, descriptionHr: 'Odigraj 2 1v1 dvoboja' },
        slot2: { type: MISSION_TYPES.CATEGORY_CORRECT, category: 'povijest', target: 10, descriptionHr: 'Odgovori točno na 10 pitanja iz Povijesti' },
        slot3: { type: MISSION_TYPES.SUBMIT_QUESTION, target: 1, descriptionHr: 'Predloži 1 pitanje za pregled' },
    },
    2: { // Tuesday
        slot1: { type: MISSION_TYPES.PLAY_DAILY, target: 1, descriptionHr: 'Odigraj Dnevni izazov' },
        slot2: { type: MISSION_TYPES.CATEGORY_CORRECT, category: 'znanost', target: 10, descriptionHr: 'Odgovori točno na 10 pitanja iz Znanosti' },
        slot3: { type: MISSION_TYPES.STREAK, target: 5, descriptionHr: 'Postigni niz od 5 točnih odgovora u bilo kojem načinu' },
    },
    3: { // Wednesday
        slot1: { type: MISSION_TYPES.WIN_1V1, target: 2, descriptionHr: 'Pobijedi u 2 1v1 dvoboja' },
        slot2: { type: MISSION_TYPES.CATEGORY_CORRECT, category: 'geografija', target: 10, descriptionHr: 'Odgovori točno na 10 pitanja iz Geografije' },
        slot3: { type: MISSION_TYPES.WIN_1V1_NO_JOKER, target: 1, descriptionHr: 'Pobijedi u 1v1 dvoboju bez korištenja jokera' },
    },
    4: { // Thursday
        slot1: { type: MISSION_TYPES.HYBRID_DAILY_1V1, target: 1, descriptionHr: 'Odigraj 1 Dnevni izazov i 1 1v1 dvoboj' },
        slot2: { type: MISSION_TYPES.CATEGORY_CORRECT, category: 'knjizevnost', target: 10, descriptionHr: 'Odgovori točno na 10 pitanja iz Književnosti i Umjetnosti' },
        slot3: { type: MISSION_TYPES.SUBMIT_QUESTION, target: 1, descriptionHr: 'Predloži 1 pitanje za pregled' },
    },
    5: { // Friday
        slot1: { type: MISSION_TYPES.PLAY_1V1, target: 3, descriptionHr: 'Odigraj 3 1v1 dvoboja' },
        slot2: { type: MISSION_TYPES.CATEGORY_CORRECT, category: 'pop_kultura', target: 10, descriptionHr: 'Odgovori točno na 10 pitanja iz Pop kulture' },
        slot3: { type: MISSION_TYPES.DAILY_ACCURACY, target: 75, descriptionHr: 'Postigni 75%+ točnosti u Dnevnom izazovu' },
    },
    6: { // Saturday
        slot1: { type: MISSION_TYPES.WIN_1V1, target: 3, descriptionHr: 'Pobijedi u 3 1v1 dvoboja' },
        slot2: { type: MISSION_TYPES.CATEGORY_CORRECT, category: 'sport', target: 10, descriptionHr: 'Odgovori točno na 10 pitanja iz Sporta' },
        slot3: { type: MISSION_TYPES.STREAK, target: 10, descriptionHr: 'Postigni niz od 10 točnih odgovora u bilo kojem načinu' },
    },
    0: { // Sunday
        slot1: { type: MISSION_TYPES.PLAY_DAILY, target: 1, descriptionHr: 'Odigraj Dnevni izazov' },
        slot2: { type: MISSION_TYPES.CATEGORY_CORRECT, category: 'glazba', target: 10, descriptionHr: 'Odgovori točno na 10 pitanja iz Glazbe' },
        slot3: { type: MISSION_TYPES.WIN_1V1_ACCURACY, target: 2, accuracy: 80, descriptionHr: 'Pobijedi u 2 1v1 dvoboja s preko 80% točnosti' },
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
