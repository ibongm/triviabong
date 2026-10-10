// Pure logic behind private leagues (engagement plan Phase 6): join codes,
// link parsing, input sanitizing, ownership transfer and the merge that turns
// "members + whatever weekly/daily docs exist" into a table. No React/Firebase
// imports - services/leagues.js does the I/O, the tests pin this.

export const MAX_LEAGUE_MEMBERS = 50;
export const MAX_LEAGUES_PER_PLAYER = 5;
export const LEAGUE_NAME_MAX = 30;
export const LEAGUE_EMOJI_MAX = 8;
export const LEAGUE_CODE_LENGTH = 6;
// Firestore `documentId() in [...]` accepts at most 30 values per query.
export const IN_QUERY_CHUNK = 30;

// 32 characters, no 0/O or 1/I (they get misread in a shared link or when
// typed from a screenshot). A-H J-N P-Z 2-9 - firestore.rules enforces the
// same set with ^[A-HJ-NP-Z2-9]{6}$ (rulesCaps.test.js ties the two).
export const LEAGUE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const LEAGUE_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

// A fixed picker instead of free text: the name is the only user-written
// string a stranger sees, and there is no profanity filter.
export const LEAGUE_EMOJIS = Object.freeze(['🏆', '⚽', '🎯', '🔥', '🧠', '🦁', '🌟', '🎲', '🍀', '🚀', '🎓', '🐯']);

/**
 * A random 6-character code. `randomInt(n)` must return an integer in [0, n);
 * the default uses crypto when the platform has it (a code is the only thing
 * keeping strangers out of a league) and falls back to Math.random.
 */
export const defaultRandomInt = (n) => {
    const c = globalThis.crypto;
    if (c?.getRandomValues) {
        // Rejection sampling: no modulo bias.
        const limit = Math.floor(0x100000000 / n) * n;
        const buf = new Uint32Array(1);
        do { c.getRandomValues(buf); } while (buf[0] >= limit);
        return buf[0] % n;
    }
    return Math.floor(Math.random() * n);
};

export const generateLeagueCode = (randomInt = defaultRandomInt) => {
    let code = '';
    for (let i = 0; i < LEAGUE_CODE_LENGTH; i += 1) {
        code += LEAGUE_CODE_ALPHABET[randomInt(LEAGUE_CODE_ALPHABET.length)];
    }
    return code;
};

/**
 * Draws codes until one is unused. `isTaken(code)` is async (a Firestore get);
 * gives up after `maxAttempts` (a taken 6-of-32 code is a ~1e-9 event per
 * attempt per league, so failing here means something else is wrong).
 * @returns {Promise<string|null>}
 */
export const generateUnusedLeagueCode = async (isTaken, { randomInt = defaultRandomInt, maxAttempts = 5 } = {}) => {
    for (let i = 0; i < maxAttempts; i += 1) {
        const code = generateLeagueCode(randomInt);
        if (!(await isTaken(code))) return code;
    }
    return null;
};

/** What a person typed or pasted -> a canonical code candidate. */
export const normalizeLeagueCode = (input) =>
    String(input ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export const isValidLeagueCode = (code) => LEAGUE_CODE_PATTERN.test(String(code ?? ''));

/** "/liga/ABC234" (any case, optional trailing slash) -> "ABC234", else null. */
export const parseLeaguePath = (pathname) => {
    const m = /^\/liga\/([^/]+)\/?$/i.exec(String(pathname ?? ''));
    if (!m) return null;
    const code = normalizeLeagueCode(m[1]);
    return isValidLeagueCode(code) ? code : null;
};

export const buildLeagueLink = (origin, code) => `${String(origin).replace(/\/+$/, '')}/liga/${code}`;

// Capped by UTF-16 length (not code points) so the result is within
// firestore.rules' name.size() <= 30 however the rules count characters, and
// built per code point so a surrogate pair is never cut in half.
export const sanitizeLeagueName = (input) => {
    let out = '';
    for (const ch of Array.from(String(input ?? '').replace(/\s+/g, ' ').trim())) {
        if (out.length + ch.length > LEAGUE_NAME_MAX) break;
        out += ch;
    }
    return out.trim();
};

/** Only picker emojis are accepted; anything else falls back to the first one. */
export const sanitizeLeagueEmoji = (input) => (LEAGUE_EMOJIS.includes(input) ? input : LEAGUE_EMOJIS[0]);

export const toMillis = (ts) => {
    if (!ts) return 0;
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (typeof ts.seconds === 'number') return ts.seconds * 1000;
    return Number.isFinite(ts) ? ts : 0;
};

export const chunk = (list, size = IN_QUERY_CHUNK) => {
    const out = [];
    for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
    return out;
};

/** The member who becomes owner when `leavingUid` (the owner) goes: the longest-standing one. */
export const pickNewOwner = (members, leavingUid) => {
    const candidates = members.filter((m) => m.uid !== leavingUid);
    if (candidates.length === 0) return null;
    return [...candidates].sort((a, b) => toMillis(a.joinedAt) - toMillis(b.joinedAt) || a.uid.localeCompare(b.uid))[0].uid;
};

/** What leaving means for this player: how the league must be changed. */
export const planLeave = ({ league, members, uid }) => {
    const isOwner = league.ownerUid === uid;
    const others = members.filter((m) => m.uid !== uid);
    if (isOwner && others.length === 0) return { kind: 'delete_league' };
    if (isOwner) return { kind: 'transfer_and_leave', newOwnerUid: pickNewOwner(members, uid) };
    return { kind: 'leave' };
};

export const canJoinMoreLeagues = (currentCount) => currentCount < MAX_LEAGUES_PER_PLAYER;

const total = (doc) => (Number.isFinite(doc?.total) && doc.total > 0 ? doc.total : 0);

/**
 * Ranked rows from ties-share-a-rank ordering.
 * @param {object[]} rows sorted best-first
 * @param {(row:object)=>number} valueOf
 */
const assignRanks = (rows, valueOf) => {
    let prev = null;
    let prevRank = 0;
    return rows.map((row, idx) => {
        const v = valueOf(row);
        const rank = idx > 0 && v === prev ? prevRank : idx + 1;
        prev = v;
        prevRank = rank;
        return { ...row, rank };
    });
};

/**
 * The league's weekly table. Every member appears; those with no weekly doc
 * (or a zero total) sit at the bottom with 0 and no rank number, ordered by
 * join time. Ranked rows tie-share a rank like the global boards.
 * @param {{uid:string,name:string,joinedAt?:any}[]} members
 * @param {Record<string, {total?:number, name?:string, updatedAt?:any}>} weeklyByUid
 */
export const buildWeeklyTable = (members, weeklyByUid) => {
    const rows = members.map((m) => {
        const doc = weeklyByUid[m.uid];
        return {
            uid: m.uid,
            name: doc?.name || m.name,
            total: total(doc),
            lastPlayedMs: toMillis(doc?.updatedAt),
            joinedMs: toMillis(m.joinedAt),
        };
    });
    const played = rows.filter((r) => r.total > 0).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
    const idle = rows.filter((r) => r.total === 0).sort((a, b) => a.joinedMs - b.joinedMs || a.uid.localeCompare(b.uid));
    return [
        ...assignRanks(played, (r) => r.total),
        ...idle.map((r) => ({ ...r, rank: null })),
    ];
};

/** Members who played today's Daily Challenge, best first (score from dailyLeaderboards). */
export const buildDailyRanking = (members, dailyByUid) => {
    const rows = members
        .map((m) => ({ uid: m.uid, name: dailyByUid[m.uid]?.name || m.name, score: dailyByUid[m.uid]?.score }))
        .filter((r) => Number.isFinite(r.score) && r.score > 0)
        .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    return assignRanks(rows, (r) => r.score);
};

/** Uids that topped last week's table (ties all share the crown); none if nobody played. */
export const lastWeekWinners = (members, previousWeeklyByUid) => {
    let best = 0;
    for (const m of members) best = Math.max(best, total(previousWeeklyByUid[m.uid]));
    if (best === 0) return [];
    return members.filter((m) => total(previousWeeklyByUid[m.uid]) === best).map((m) => m.uid);
};

/** "prije 3 h" style text for a last-played timestamp (ms). */
export const formatLastPlayed = (ms, nowMs) => {
    if (!ms) return null;
    const diff = Math.max(0, nowMs - ms);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 2) return 'upravo';
    if (minutes < 60) return `prije ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `prije ${hours} h`;
    return `prije ${Math.floor(hours / 24)} d`;
};
