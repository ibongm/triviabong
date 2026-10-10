// Firestore I/O for private leagues (engagement plan Phase 6). Decisions live in
// utils/league.js (pure, tested); the data model and the rules that tie the
// multi-doc batches together are documented in the leagues block of
// firestore.rules. Every multi-doc change here is ONE batch (the rules use
// getAfter()/existsAfter() across the batch), and nothing subscribes: pages are
// fetched on open and cached in memory for a minute.
//
// Functions never throw: mutations resolve to { ok: true, ... } or
// { ok: false, reason } (reasons: 'invalid', 'limit', 'rejected', 'error', ...).
import {
    doc, collection, getDoc, getDocs, query, where, documentId, writeBatch,
    serverTimestamp, increment,
} from 'firebase/firestore';
import { db } from './firebase';
import {
    chunk, generateUnusedLeagueCode, sanitizeLeagueName, sanitizeLeagueEmoji, isValidLeagueCode,
    planLeave, canJoinMoreLeagues, toMillis, MAX_LEAGUES_PER_PLAYER,
} from '../utils/league';

const leagueRef = (id) => doc(db, 'leagues', id);
const memberRef = (id, uid) => doc(db, 'leagues', id, 'members', uid);
const codeRef = (code) => doc(db, 'leagueCodes', code);
const indexRef = (uid, id) => doc(db, 'users', uid, 'leagues', id);

const isPermissionDenied = (error) => error?.code === 'permission-denied';

// ---- caching --------------------------------------------------------------
const CACHE_TTL_MS = 60 * 1000;
const pageCache = new Map();
export const invalidateLeagueCache = (leagueId) => {
    if (leagueId) pageCache.delete(leagueId);
    else pageCache.clear();
};

// ---- my leagues -----------------------------------------------------------

/** The player's own league index (one small query), newest first. [] on failure. */
export const getMyLeagues = async (uid) => {
    if (!uid) return [];
    try {
        const snap = await getDocs(collection(db, 'users', uid, 'leagues'));
        return snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => toMillis(b.joinedAt) - toMillis(a.joinedAt));
    } catch (error) {
        console.error('Failed to load my leagues:', error);
        return [];
    }
};

/** Drops a league from the player's own index (after being kicked / the league was deleted). */
export const removeLeagueIndex = async (uid, leagueId) => {
    try {
        const b = writeBatch(db);
        b.delete(indexRef(uid, leagueId));
        await b.commit();
        return { ok: true };
    } catch (error) {
        console.error('Failed to remove league index:', error);
        return { ok: false, reason: 'error' };
    }
};

// ---- codes ----------------------------------------------------------------

/** { leagueId, name, emoji } for a code, or null (unknown code / failure). */
export const lookupLeagueCode = async (code) => {
    if (!isValidLeagueCode(code)) return null;
    try {
        const snap = await getDoc(codeRef(code));
        return snap.exists() ? snap.data() : null;
    } catch (error) {
        console.error('Failed to look up league code:', error);
        return null;
    }
};

const codeIsTaken = async (code) => {
    const snap = await getDoc(codeRef(code));
    return snap.exists();
};

// ---- create / join / leave -----------------------------------------------

/**
 * Creates a league owned by `uid`: league doc, the owner's member doc, the code
 * doc and the owner's index doc in one batch.
 * @returns {Promise<{ok:true, leagueId:string, code:string, name:string, emoji:string}|{ok:false, reason:string}>}
 */
export const createLeague = async ({ uid, memberName, name, emoji, currentCount = 0 }) => {
    const cleanName = sanitizeLeagueName(name);
    const cleanEmoji = sanitizeLeagueEmoji(emoji);
    if (!uid || !memberName || !cleanName) return { ok: false, reason: 'invalid' };
    if (!canJoinMoreLeagues(currentCount)) return { ok: false, reason: 'limit' };
    try {
        const code = await generateUnusedLeagueCode(codeIsTaken);
        if (!code) return { ok: false, reason: 'error' };
        const ref = doc(collection(db, 'leagues'));
        const b = writeBatch(db);
        b.set(ref, { name: cleanName, emoji: cleanEmoji, ownerUid: uid, code, memberCount: 1, createdAt: serverTimestamp() });
        b.set(memberRef(ref.id, uid), { name: memberName, joinedAt: serverTimestamp(), code });
        b.set(codeRef(code), { leagueId: ref.id, name: cleanName, emoji: cleanEmoji });
        b.set(indexRef(uid, ref.id), { name: cleanName, emoji: cleanEmoji, joinedAt: new Date() });
        await b.commit();
        invalidateLeagueCache();
        return { ok: true, leagueId: ref.id, code, name: cleanName, emoji: cleanEmoji };
    } catch (error) {
        console.error('Failed to create league:', error);
        return { ok: false, reason: isPermissionDenied(error) ? 'rejected' : 'error' };
    }
};

/**
 * Joins the league behind `code` (already looked up). The batch is accepted only
 * if the code is still the league's CURRENT code and the league isn't full -
 * both enforced by firestore.rules, which is why a failure maps to 'rejected'.
 */
export const joinLeague = async ({ uid, memberName, code, lookup, currentIds = [] }) => {
    if (!uid || !memberName || !lookup?.leagueId || !isValidLeagueCode(code)) return { ok: false, reason: 'invalid' };
    if (currentIds.includes(lookup.leagueId)) return { ok: false, reason: 'already_member' };
    if (!canJoinMoreLeagues(currentIds.length)) return { ok: false, reason: 'limit' };
    try {
        const b = writeBatch(db);
        b.set(memberRef(lookup.leagueId, uid), { name: memberName, joinedAt: serverTimestamp(), code });
        // increment(), not a read-modify-write: the joiner can't read the league.
        b.update(leagueRef(lookup.leagueId), { memberCount: increment(1) });
        b.set(indexRef(uid, lookup.leagueId), { name: lookup.name, emoji: lookup.emoji, joinedAt: new Date() });
        await b.commit();
        invalidateLeagueCache();
        return { ok: true, leagueId: lookup.leagueId };
    } catch (error) {
        console.error('Failed to join league:', error);
        return { ok: false, reason: isPermissionDenied(error) ? 'rejected' : 'error' };
    }
};

/**
 * Leaves a league. A non-owner just leaves; the owner first hands the league to
 * the longest-standing member; the last member deletes the league and its code.
 */
export const leaveLeague = async ({ uid, league, members }) => {
    if (!uid || !league?.id) return { ok: false, reason: 'invalid' };
    try {
        const plan = planLeave({ league, members, uid });
        const b = writeBatch(db);
        if (plan.kind === 'delete_league') {
            b.delete(leagueRef(league.id));
            b.delete(codeRef(league.code));
        } else if (plan.kind === 'transfer_and_leave') {
            b.update(leagueRef(league.id), { ownerUid: plan.newOwnerUid, memberCount: increment(-1) });
        } else {
            b.update(leagueRef(league.id), { memberCount: increment(-1) });
        }
        b.delete(memberRef(league.id, uid));
        b.delete(indexRef(uid, league.id));
        await b.commit();
        invalidateLeagueCache(league.id);
        return { ok: true, kind: plan.kind };
    } catch (error) {
        console.error('Failed to leave league:', error);
        return { ok: false, reason: isPermissionDenied(error) ? 'rejected' : 'error' };
    }
};

/** Owner removes a member (their own index doc is cleaned up when they next open "Lige"). */
export const kickMember = async ({ league, memberUid }) => {
    if (!league?.id || !memberUid) return { ok: false, reason: 'invalid' };
    try {
        const b = writeBatch(db);
        b.update(leagueRef(league.id), { memberCount: increment(-1) });
        b.delete(memberRef(league.id, memberUid));
        await b.commit();
        invalidateLeagueCache(league.id);
        return { ok: true };
    } catch (error) {
        console.error('Failed to remove league member:', error);
        return { ok: false, reason: isPermissionDenied(error) ? 'rejected' : 'error' };
    }
};

/** Owner renames / re-icons the league; the code doc's copy is kept in sync in the same batch. */
// (The owner's own index doc - and everyone else's - is re-synced by syncLeagueIndex the next time the page opens.)
export const updateLeagueDetails = async ({ league, name, emoji }) => {
    const cleanName = sanitizeLeagueName(name);
    const cleanEmoji = sanitizeLeagueEmoji(emoji);
    if (!league?.id || !cleanName) return { ok: false, reason: 'invalid' };
    try {
        const b = writeBatch(db);
        b.update(leagueRef(league.id), { name: cleanName, emoji: cleanEmoji });
        b.set(codeRef(league.code), { leagueId: league.id, name: cleanName, emoji: cleanEmoji });
        await b.commit();
        invalidateLeagueCache(league.id);
        return { ok: true, name: cleanName, emoji: cleanEmoji };
    } catch (error) {
        console.error('Failed to update league:', error);
        return { ok: false, reason: isPermissionDenied(error) ? 'rejected' : 'error' };
    }
};

/** Owner rotates the join code: old links stop working (rules check the CURRENT code on join). */
export const regenerateLeagueCode = async ({ league }) => {
    if (!league?.id) return { ok: false, reason: 'invalid' };
    try {
        const code = await generateUnusedLeagueCode(codeIsTaken);
        if (!code) return { ok: false, reason: 'error' };
        const b = writeBatch(db);
        b.update(leagueRef(league.id), { code });
        b.delete(codeRef(league.code));
        b.set(codeRef(code), { leagueId: league.id, name: league.name, emoji: league.emoji });
        await b.commit();
        invalidateLeagueCache(league.id);
        return { ok: true, code };
    } catch (error) {
        console.error('Failed to regenerate league code:', error);
        return { ok: false, reason: isPermissionDenied(error) ? 'rejected' : 'error' };
    }
};

// ---- league page ----------------------------------------------------------

/** { uid: data } for the given uids from a collection whose doc ids are uids, in `in`-query chunks. */
const fetchDocsByUid = async (pathParts, uids) => {
    if (uids.length === 0) return {};
    const parts = await Promise.all(chunk(uids).map(async (ids) => {
        const snap = await getDocs(query(collection(db, ...pathParts), where(documentId(), 'in', ids)));
        return snap.docs.map((d) => [d.id, d.data()]);
    }));
    return Object.fromEntries(parts.flat());
};

/**
 * Everything the league page shows, in as few reads as possible: the league doc
 * + its members (1 get + 1 query), then the members' weekly docs for this and
 * last week and today's Daily Challenge docs (<= 2 chunked `in` queries each).
 * Cached for a minute. Statuses: 'ok' | 'not_member' (kicked / left) | 'gone'
 * (deleted) | 'error'.
 */
export const loadLeaguePage = async ({ leagueId, weekKey, previousWeekKey, dateKey, force = false }) => {
    const cached = pageCache.get(leagueId);
    if (!force && cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;
    try {
        const leagueSnap = await getDoc(leagueRef(leagueId));
        if (!leagueSnap.exists()) return { status: 'gone' };
        const membersSnap = await getDocs(collection(db, 'leagues', leagueId, 'members'));
        const members = membersSnap.docs.map((d) => ({ uid: d.id, ...d.data() }));
        const uids = members.map((m) => m.uid);
        const [weekly, previous, daily] = await Promise.all([
            fetchDocsByUid(['weeklyBoards', weekKey, 'players'], uids),
            fetchDocsByUid(['weeklyBoards', previousWeekKey, 'players'], uids),
            fetchDocsByUid(['dailyLeaderboards', dateKey, 'scores'], uids),
        ]);
        const data = { status: 'ok', league: { id: leagueId, ...leagueSnap.data() }, members, weekly, previous, daily };
        pageCache.set(leagueId, { at: Date.now(), data });
        return data;
    } catch (error) {
        // A kicked member (or a league deleted by an admin) can no longer read it:
        // a get on a missing/forbidden doc is permission-denied, not "not found".
        if (isPermissionDenied(error)) return { status: 'not_member' };
        console.error('Failed to load league page:', error);
        return { status: 'error' };
    }
};

/** Keeps the player's own index doc in step with the league's name/emoji (1 write, only when stale). */
export const syncLeagueIndex = async ({ uid, league, myIndex }) => {
    if (!uid || !league?.id || !myIndex) return;
    if (myIndex.name === league.name && myIndex.emoji === league.emoji) return;
    try {
        const b = writeBatch(db);
        b.set(indexRef(uid, league.id), { name: league.name, emoji: league.emoji, joinedAt: myIndex.joinedAt || new Date() });
        await b.commit();
    } catch (error) {
        console.error('Failed to sync league index:', error);
    }
};

// ---- admin (moderation) -----------------------------------------------------

/** Admin only (rules): every league, newest first. [] on failure. */
export const adminListLeagues = async () => {
    try {
        const snap = await getDocs(collection(db, 'leagues'));
        return snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
    } catch (error) {
        console.error('Failed to list leagues:', error);
        return [];
    }
};

/** Admin deletes a league and its code doc (members' own index docs clean themselves up). */
export const adminDeleteLeague = async (league) => {
    if (!league?.id) return { ok: false, reason: 'invalid' };
    try {
        const b = writeBatch(db);
        b.delete(leagueRef(league.id));
        if (league.code) b.delete(codeRef(league.code));
        await b.commit();
        invalidateLeagueCache(league.id);
        return { ok: true };
    } catch (error) {
        console.error('Failed to delete league:', error);
        return { ok: false, reason: 'error' };
    }
};

export { MAX_LEAGUES_PER_PLAYER };
