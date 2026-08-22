// Pure aggregation logic for the admin player-detail session-stats toggle -
// no Firebase/React imports, so the date-bucketing math is independently
// reviewable/reusable regardless of how session docs get fetched (see
// getSessionsForUser in services/firebase.js). Aggregation happens at READ
// time by summing raw session docs rather than maintaining running
// counters, per the beta-scale design from the original brainstorm.

const toDate = (value) => {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate();
    if (value instanceof Date) return value;
    return new Date(value);
};

/** Total time-in-app (all gameStateSeconds buckets combined) for one session doc. */
export const totalSessionSeconds = (session) => {
    const buckets = session.gameStateSeconds || {};
    return Object.values(buckets).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);
};

const startOfDay = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

// ISO week, Monday start. getDay() is 0(Sun)-6(Sat); shift so Monday=0.
const startOfIsoWeek = (date) => {
    const d = startOfDay(date);
    const dayOffset = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dayOffset);
    return d;
};

const isInPeriod = (sessionDate, period, now) => {
    if (!sessionDate) return false;
    if (period === 'all') return true;
    if (period === 'daily') return sessionDate >= startOfDay(now);
    if (period === 'weekly') return sessionDate >= startOfIsoWeek(now);
    return false;
};

/**
 * Sums total time-in-app (all gameStateSeconds buckets combined) across
 * every session whose `startedAt` falls in the given period, bucketing by
 * when the session STARTED (not each heartbeat) - a long-lived open tab
 * that crosses midnight counts entirely toward the day it started on.
 * Acceptable imprecision at beta scale.
 */
export const summarizeSessionsByPeriod = (sessions, period, now = new Date()) => {
    return (sessions || []).reduce((sum, session) => {
        const startedAt = toDate(session.startedAt);
        if (!isInPeriod(startedAt, period, now)) return sum;
        return sum + totalSessionSeconds(session);
    }, 0);
};

/**
 * Sums total time-in-app across sessions in the given period, grouped by
 * owning uid - powers AdminPlayers.jsx's Danas/Tjedan/Ukupno list columns
 * (period defaults to 'all' for the all-time total). Filters with the same
 * isInPeriod scoping summarizeSessionsByPeriod uses, so a player's daily
 * total is always <= their weekly total <= their all-time total.
 */
export const sumSessionsByUid = (sessions, period = 'all', now = new Date()) => {
    const byUid = {};
    for (const session of sessions || []) {
        if (!session.uid) continue;
        if (!isInPeriod(toDate(session.startedAt), period, now)) continue;
        byUid[session.uid] = (byUid[session.uid] || 0) + totalSessionSeconds(session);
    }
    return byUid;
};

/**
 * How many seconds of this session's elapsed time still need adding to the
 * users/{uid}.playTime running counters.
 *
 * The session doc holds CUMULATIVE per-gameState totals and is rewritten whole
 * on each heartbeat, but playTime is increment-based - so each heartbeat must
 * send only what's new since the last successful playTime write. Getting this
 * wrong would re-add the whole session every 90s and inflate the totals, the
 * same class of bug as the session-flush inflation fixed in a56f6a8. Extracted
 * from useSessionTracking so it's directly testable.
 */
export const playTimeDelta = (gameStateSeconds, alreadyWritten = 0) => {
    const elapsed = Object.values(gameStateSeconds || {})
        .reduce((sum, v) => sum + (typeof v === 'number' && v > 0 ? v : 0), 0);
    const delta = elapsed - (alreadyWritten > 0 ? alreadyWritten : 0);
    return { elapsed, delta: delta > 0 ? delta : 0 };
};

/** Local-calendar YYYY-MM-DD key, matching the buckets written to users/{uid}.playTime.days. */
export const playTimeDayKey = (date = new Date()) => {
    const d = new Date(date);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
};

/** How many day buckets to retain per user - just over a week, so the weekly window is always covered. */
export const PLAY_TIME_DAYS_KEPT = 9;

/** Day keys older than the retention window, for pruning (see pruneUserPlayTimeDays). */
export const stalePlayTimeDayKeys = (days, now = new Date()) => {
    const cutoff = playTimeDayKey(new Date(startOfDay(now).getTime() - (PLAY_TIME_DAYS_KEPT - 1) * 86400000));
    return Object.keys(days || {}).filter((k) => k < cutoff);
};

/**
 * Rebuilds each player's playTime map from raw session docs - the shape
 * addPlayTime maintains incrementally, but computed from history.
 *
 * Needed because the playTime counters started at zero when they shipped
 * (2026-08-22), so the admin list's Danas/Tjedan/Ukupno columns read as ~0 for
 * everyone even though the sessions collection still held the real history.
 * The per-player Detalji view was unaffected - it reads sessions directly.
 *
 * `total` sums EVERY session (that's the all-time figure), while `days` keeps
 * only the retention window, matching what addPlayTime/pruneUserPlayTimeDays
 * maintain going forward. Buckets by the day a session STARTED, the same
 * approximation sumSessionsByUid already makes - a session crossing midnight
 * counts wholly toward the day it began.
 */
export const buildPlayTimeFromSessions = (sessions, now = new Date()) => {
    const byUid = {};
    const keepFrom = playTimeDayKey(
        new Date(startOfDay(now).getTime() - (PLAY_TIME_DAYS_KEPT - 1) * 86400000),
    );

    for (const session of sessions || []) {
        const uid = session?.uid;
        if (!uid) continue;
        const seconds = Math.round(totalSessionSeconds(session));
        if (seconds <= 0) continue;

        const entry = byUid[uid] || (byUid[uid] = { total: 0, days: {} });
        entry.total += seconds;

        const startedAt = toDate(session.startedAt);
        if (!startedAt) continue;
        const key = playTimeDayKey(startedAt);
        if (key >= keepFrom) entry.days[key] = (entry.days[key] || 0) + seconds;
    }
    return byUid;
};

/**
 * Same { daily, weekly, all } shape as sumSessionsByUid, but derived from the
 * playTime map maintained on each users/{uid} doc instead of from a scan over
 * every session doc ever written.
 *
 * AdminPlayers already fetches every user for its table, so this costs zero
 * extra reads - it replaces getAllSessions(), by its own comment the
 * fastest-growing scan in the admin panel. `all` is the running total rather
 * than a sum of the retained day buckets, so trimming old buckets never
 * rewrites history. Uses the same local start-of-day / Monday-start ISO week
 * boundaries as isInPeriod above, so daily <= weekly <= all still holds.
 */
export const summarizePlayTimeByUid = (users, now = new Date()) => {
    const daily = {};
    const weekly = {};
    const all = {};
    const todayKey = playTimeDayKey(now);
    const weekStartKey = playTimeDayKey(startOfIsoWeek(now));

    for (const user of users || []) {
        const uid = user?.uid;
        if (!uid) continue;
        const playTime = user.playTime || {};
        const days = playTime.days || {};
        const num = (v) => (typeof v === 'number' && v > 0 ? v : 0);

        all[uid] = num(playTime.total);
        daily[uid] = num(days[todayKey]);
        weekly[uid] = Object.entries(days).reduce(
            (sum, [key, value]) => (key >= weekStartKey ? sum + num(value) : sum),
            0,
        );
    }
    return { daily, weekly, all };
};

/** Formats a seconds count as e.g. "2 h 15 min", "45 min", "Manje od minute". */
export const formatDuration = (totalSecondsValue) => {
    const seconds = Math.max(0, Math.round(totalSecondsValue || 0));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours} h ${minutes} min`;
    if (minutes > 0) return `${minutes} min`;
    return 'Manje od minute';
};
