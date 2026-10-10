// Calendar helpers for weekly / seasonal leaderboards (engagement plan
// Phase 5). Pure - no React/Firebase imports, so the browser, the tests and
// (as an inlined copy, see api/daily-challenge-payout.js) the payout cron
// agree on what "this week" means.
//
// A week is an ISO-8601 week as seen on the Zagreb calendar: it starts
// Monday 00:00 and ends Sunday 24:00 Zagreb time, and is keyed "YYYY-Www"
// (e.g. "2026-W42"). The ISO week-year can differ from the calendar year
// around New Year (2027-01-01 belongs to "2026-W53"), which is why the key
// is derived with the Thursday rule rather than from the date's own year.
//
// All date arithmetic is done on "YYYY-MM-DD" calendar strings anchored at
// UTC midnight, never on local-time Dates - so there is no DST in the maths.
// The only timezone conversion is Date -> Zagreb calendar date, done once
// through Intl.

const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const WEEK_KEY_PATTERN = /^\d{4}-W\d{2}$/;

const pad2 = (n) => String(n).padStart(2, '0');

const parseDateKey = (dateKey) => {
    const [y, m, d] = dateKey.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
};

const formatUtcDate = (ms) => new Date(ms).toISOString().slice(0, 10);

/** "YYYY-MM-DD" shifted by `delta` calendar days. */
export const addDays = (dateKey, delta) => formatUtcDate(parseDateKey(dateKey) + delta * MS_PER_DAY);

/** Zagreb calendar date ("YYYY-MM-DD") of an instant. */
export const zagrebDateKey = (date = new Date()) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zagreb' }).format(date);

/** ISO week key of a calendar date: "2026-10-10" -> "2026-W41". */
export const weekKeyForDateKey = (dateKey) => {
    const ms = parseDateKey(dateKey);
    const day = new Date(ms).getUTCDay() || 7; // Mon=1 ... Sun=7
    // The Thursday of this ISO week decides which year the week belongs to.
    const thursday = ms + (4 - day) * MS_PER_DAY;
    const weekYear = new Date(thursday).getUTCFullYear();
    const jan1 = Date.UTC(weekYear, 0, 1);
    const week = Math.ceil(((thursday - jan1) / MS_PER_DAY + 1) / 7);
    return `${weekYear}-W${pad2(week)}`;
};

/** ISO week key (Zagreb calendar) of an instant. */
export const weekKeyFor = (date = new Date()) => weekKeyForDateKey(zagrebDateKey(date));

export const isValidWeekKey = (weekKey) => {
    if (typeof weekKey !== 'string' || !WEEK_KEY_PATTERN.test(weekKey)) return false;
    const week = Number(weekKey.slice(6));
    return week >= 1 && week <= 53 && weekKeyForDateKey(weekStartDateKey(weekKey)) === weekKey;
};

/** Monday ("YYYY-MM-DD") of a week key. */
export const weekStartDateKey = (weekKey) => {
    const year = Number(weekKey.slice(0, 4));
    const week = Number(weekKey.slice(6));
    // Jan 4th is always in ISO week 1; step back to that week's Monday.
    const jan4 = Date.UTC(year, 0, 4);
    const jan4Day = new Date(jan4).getUTCDay() || 7;
    const week1Monday = jan4 - (jan4Day - 1) * MS_PER_DAY;
    return formatUtcDate(week1Monday + (week - 1) * 7 * MS_PER_DAY);
};

/** Sunday ("YYYY-MM-DD") of a week key - the last day it accepts rounds. */
export const weekEndDateKey = (weekKey) => addDays(weekStartDateKey(weekKey), 6);

/** The week key `delta` weeks before/after `weekKey` (crosses year ends). */
export const addWeeks = (weekKey, delta) =>
    weekKeyForDateKey(addDays(weekStartDateKey(weekKey), delta * 7));

/** Number of whole weeks from `fromWeek` to `toWeek` (negative if earlier). */
export const weeksBetween = (fromWeek, toWeek) =>
    Math.round((parseDateKey(weekStartDateKey(toWeek)) - parseDateKey(weekStartDateKey(fromWeek))) / (7 * MS_PER_DAY));

// The instant a Zagreb calendar day begins. Zagreb is UTC+1 (CET) or UTC+2
// (CEST); of the two candidate instants exactly one reads 00:00 in Zagreb.
// (Midnight itself is never skipped or repeated: EU DST changes happen at
// 02:00/03:00 local.)
export const zagrebMidnightMs = (dateKey) => {
    const utcMidnight = parseDateKey(dateKey);
    for (const offsetHours of [2, 1]) {
        const candidate = utcMidnight - offsetHours * 3600 * 1000;
        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Europe/Zagreb', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
        }).formatToParts(new Date(candidate));
        const hour = parts.find((p) => p.type === 'hour')?.value;
        const minute = parts.find((p) => p.type === 'minute')?.value;
        if (hour === '00' && minute === '00' && zagrebDateKey(new Date(candidate)) === dateKey) return candidate;
    }
    return utcMidnight - 3600 * 1000;
};

/** Milliseconds until the week containing `nowMs` ends (next Monday 00:00 Zagreb). */
export const msUntilWeekEnd = (nowMs = Date.now()) => {
    const weekKey = weekKeyFor(new Date(nowMs));
    const nextMonday = addDays(weekEndDateKey(weekKey), 1);
    return Math.max(0, zagrebMidnightMs(nextMonday) - nowMs);
};

/** "Završava za 2d 14h" style countdown text pieces. */
export const formatWeekCountdown = (ms) => {
    const totalMinutes = Math.max(0, Math.floor(ms / 60000));
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
};

/**
 * A season is `weekCount` consecutive ISO weeks starting at `startWeek`.
 * @param {{ id: string, startWeek: string, weekCount: number }} season
 */
export const seasonEndWeek = (season) => addWeeks(season.startWeek, season.weekCount - 1);

/** The season whose weeks include `weekKey`, or null between seasons. */
export const seasonForWeek = (weekKey, seasons) => {
    for (const season of seasons) {
        const offset = weeksBetween(season.startWeek, weekKey);
        if (offset >= 0 && offset < season.weekCount) return season;
    }
    return null;
};

/** The first season that has not started by `weekKey`, or null. */
export const nextSeasonAfter = (weekKey, seasons) => {
    const upcoming = seasons
        .filter((s) => weeksBetween(weekKey, s.startWeek) > 0)
        .sort((a, b) => weeksBetween(a.startWeek, b.startWeek));
    return upcoming[0] || null;
};
