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

/** Formats a seconds count as e.g. "2 h 15 min", "45 min", "Manje od minute". */
export const formatDuration = (totalSecondsValue) => {
    const seconds = Math.max(0, Math.round(totalSecondsValue || 0));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours} h ${minutes} min`;
    if (minutes > 0) return `${minutes} min`;
    return 'Manje od minute';
};
