// Firestore I/O for the weekly / seasonal leaderboards (engagement plan
// Phase 5). The decisions live in utils/periodBoards.js (pure, tested); this
// file only reads and writes. Rules: see the weeklyBoards / seasonBoards /
// badges blocks in firestore.rules.
//
// Quota notes (Spark plan): recording a round is 1-2 reads + at most 2 writes
// in ONE transaction, skipped entirely when the round doesn't qualify;
// viewing a board is one 20-doc query + one get (+ one count aggregation,
// billed ~1 read per 1,000 matches, when the player is outside the top 20).
// No onSnapshot anywhere - boards are fetched on open.
import {
    doc, getDoc, getDocs, collection, query, orderBy, limit, where,
    runTransaction, serverTimestamp, getCountFromServer,
} from 'firebase/firestore';
import { db } from './firebase';
import { SEASONS } from '../constants/seasons';
import { weekKeyFor, seasonForWeek } from '../utils/periods';
import { planPeriodWrites, rankFromHigherCount } from '../utils/periodBoards';

const weeklyRef = (weekKey, uid) => doc(db, 'weeklyBoards', weekKey, 'players', uid);
const seasonRef = (seasonId, uid) => doc(db, 'seasonBoards', seasonId, 'players', uid);

/**
 * Records one finished round (solo or Daily Challenge) on the player's weekly
 * and season boards. NEVER throws and never needs awaiting for the main save
 * to be considered done - callers fire it after the score has been saved and
 * only log the result. Returns { written, weekKey, weeklyTotal } or
 * { written: false, error }.
 */
export const recordPeriodScore = async ({ uid, name, score, now = new Date() }) => {
    if (!uid || !name) return { written: false };
    try {
        const weekKey = weekKeyFor(now);
        const season = seasonForWeek(weekKey, SEASONS);
        let outcome = { written: false, weekKey };
        await runTransaction(db, async (tx) => {
            const weeklySnap = await tx.get(weeklyRef(weekKey, uid));
            const seasonSnap = season ? await tx.get(seasonRef(season.id, uid)) : null;
            const plan = planPeriodWrites({
                weeklyDoc: weeklySnap.exists() ? weeklySnap.data() : null,
                seasonDoc: seasonSnap && seasonSnap.exists() ? seasonSnap.data() : null,
                weekKey,
                season,
                score,
            });
            if (!plan.weekly) {
                outcome = { written: false, weekKey };
                return;
            }
            tx.set(weeklyRef(weekKey, uid), { name, ...plan.weekly, updatedAt: serverTimestamp() });
            if (plan.season && season) {
                tx.set(seasonRef(season.id, uid), { name, ...plan.season, updatedAt: serverTimestamp() });
            }
            outcome = { written: true, weekKey, weeklyTotal: plan.weekly.total };
        });
        return outcome;
    } catch (error) {
        console.error('Failed to record weekly/season score:', error);
        return { written: false, error: error?.message || String(error) };
    }
};

const mapPlayerDocs = (snap) => snap.docs.map((d) => ({ uid: d.id, ...d.data() }));

/** Top of a week's board, best first. [] on failure. */
export const getWeeklyBoard = async (weekKey, limitN = 20) => {
    try {
        const snap = await getDocs(query(
            collection(db, 'weeklyBoards', weekKey, 'players'),
            orderBy('total', 'desc'),
            limit(limitN),
        ));
        return mapPlayerDocs(snap);
    } catch (error) {
        console.error('Failed to load weekly board:', error);
        return [];
    }
};

/** Top of a season's board, best first. [] on failure. */
export const getSeasonBoard = async (seasonId, limitN = 20) => {
    try {
        const snap = await getDocs(query(
            collection(db, 'seasonBoards', seasonId, 'players'),
            orderBy('total', 'desc'),
            limit(limitN),
        ));
        return mapPlayerDocs(snap);
    } catch (error) {
        console.error('Failed to load season board:', error);
        return [];
    }
};

/** The signed-in player's own entry on a board, or null. kind: 'weekly' | 'season'. */
export const getMyBoardEntry = async (kind, key, uid) => {
    if (!uid) return null;
    try {
        const snap = await getDoc(kind === 'season' ? seasonRef(key, uid) : weeklyRef(key, uid));
        return snap.exists() ? { uid, ...snap.data() } : null;
    } catch (error) {
        console.error('Failed to load own board entry:', error);
        return null;
    }
};

/**
 * Exact 1-based rank for a player outside the visible top N: a count
 * aggregation of players with a strictly higher total (ties share a rank).
 * Null on failure.
 */
export const getMyBoardRank = async (kind, key, total) => {
    try {
        const path = kind === 'season' ? ['seasonBoards', key, 'players'] : ['weeklyBoards', key, 'players'];
        const snap = await getCountFromServer(query(collection(db, ...path), where('total', '>', total)));
        return rankFromHigherCount(snap.data().count);
    } catch (error) {
        console.error('Failed to compute board rank:', error);
        return null;
    }
};

/** Payout metadata the cron wrote for a finished week ({ paidAt, tiers, winners }), or null. */
export const getWeeklyMeta = async (weekKey) => {
    try {
        const snap = await getDoc(doc(db, 'weeklyBoards', weekKey));
        return snap.exists() ? snap.data() : null;
    } catch (error) {
        console.error('Failed to load weekly meta:', error);
        return null;
    }
};

// Badges rarely change (the cron writes them once per season), so one get per
// uid per page load is plenty.
const badgeCache = new Map();

/** Badge ids of one player ([] when none / on failure). Cached per session. */
export const getBadges = async (uid) => {
    if (!uid) return [];
    if (badgeCache.has(uid)) return badgeCache.get(uid);
    try {
        const snap = await getDoc(doc(db, 'badges', uid));
        const items = snap.exists() && Array.isArray(snap.data().items) ? snap.data().items : [];
        badgeCache.set(uid, items);
        return items;
    } catch (error) {
        console.error('Failed to load badges:', error);
        return [];
    }
};

/** { uid: badgeIds[] } for several players. */
export const getBadgesForUids = async (uids) => {
    const entries = await Promise.all(uids.map(async (uid) => [uid, await getBadges(uid)]));
    return Object.fromEntries(entries);
};
