// src/services/firebase.js
import { initializeApp } from "firebase/app";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    connectAuthEmulator
} from "firebase/auth";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    getDocFromServer,
    waitForPendingWrites,
    getDocs,
    collection,
    query,
    where,
    orderBy,
    limit,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    addDoc,
    writeBatch,
    connectFirestoreEmulator,
    runTransaction,
    onSnapshot,
    increment
} from "firebase/firestore";
import { DEFAULT_GLOBAL_STATS } from "../constants/defaultGlobalStats";
import { CATEGORY_META } from "../data/categoryMeta";
import { buildPublicProfileFields } from "../utils/publicProfile";
import { COMMUNITY_QUESTION_APPROVED_XP, COMMUNITY_QUESTION_APPROVED_COINS } from "../constants/gameBalance";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAlWaXV43v307yaC85OaABp62U6Z7m8OiA",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "triviabong-web.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "triviabong-web",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "triviabong-web.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "769479466909",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:769479466909:web:20b977025bf3a6374a5974",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-BH18H9H0TC"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
    const authPort = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_PORT || '9250';
    const firestorePort = import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT || '8080';
    connectFirestoreEmulator(db, '127.0.0.1', Number(firestorePort));
    connectAuthEmulator(auth, `http://127.0.0.1:${authPort}`);
}

export const logoutUser = () => signOut(auth);
export const logoutAdmin = logoutUser;

export const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    await syncUserProfile(result.user);
    return result.user;
};

/**
 * Syncs player profile metadata to Firestore on login
 */
export const syncUserProfile = async (user) => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);

    await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'Igrač',
        photoURL: user.photoURL || '',
        lastLogin: serverTimestamp()
    }, { merge: true });
};

/**
 * Loads user profile & stats from Firestore. On login, App.jsx calls this
 * around the same time AuthModal's syncUserProfile() writes the profile
 * doc (uid/email/displayName/photoURL/lastLogin) - these two are separate,
 * unsequenced reactions to the same auth event, so syncUserProfile's write
 * can get locally queued WHILE this fetch is already in flight. When that
 * happens the fetched snapshot comes back with metadata.hasPendingWrites
 * true (even though it's a server fetch, not a cache hit) and reflects only
 * that pending write's fields, not the full stats another device already
 * synced - waiting to check pending-writes state upfront doesn't help since
 * the write isn't pending yet at that point (classic TOCTOU). Instead,
 * check hasPendingWrites AFTER fetching and only then wait + refetch.
 */
export const getUserStatsFromFirestore = async (uid) => {
    if (!uid) return null;
    try {
        const userRef = doc(db, "users", uid);
        let docSnap = await getDocFromServer(userRef);
        if (docSnap.metadata.hasPendingWrites) {
            await waitForPendingWrites(db);
            docSnap = await getDocFromServer(userRef);
        }
        if (docSnap.exists()) {
            return docSnap.data();
        }
    } catch (error) {
        console.error("Error fetching user stats from Firestore:", error);
    }
    return null;
};

/**
 * Syncs the player's full stats (level, xp, coins, totals, per-category
 * accuracy) to Firestore, so they follow the account across devices.
 */
export const syncUserStatsToFirestore = async (uid, stats) => {
    if (!uid) return;
    try {
        const userRef = doc(db, "users", uid);
        const {
            uid: _uid, email: _email, displayName: _dn, photoURL: _ph,
            lastLogin: _ll, role: _role, ...cleanStats
        } = stats || {};

        await setDoc(userRef, {
            ...DEFAULT_GLOBAL_STATS,
            ...cleanStats,
            updatedAt: serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error("Error syncing stats to Firestore:", error);
    }
};

/**
 * Starts a new admin-only time-tracking session (beta insights - see
 * firestore.rules' `sessions/{sessionId}` match block). One doc per browser
 * session/tab; signed-in users only, since anonymous play has no stable
 * identity to correlate time-spent across visits. Returns the new doc's id
 * (used by every subsequent heartbeatSession call for this session), or null
 * if the write failed - callers should treat that as "tracking unavailable
 * this session" rather than retrying, since a session is only meaningful if
 * it started successfully.
 */
export const startSession = async (uid) => {
    if (!uid) return null;
    try {
        const sessionsRef = collection(db, 'sessions');
        const docRef = await addDoc(sessionsRef, {
            uid,
            startedAt: serverTimestamp(),
            lastHeartbeat: serverTimestamp(),
            gameStateSeconds: {},
        });
        return docRef.id;
    } catch (error) {
        console.error('Error starting session:', error);
        return null;
    }
};

/**
 * Periodic heartbeat for an in-progress session (see startSession) - writes
 * the FULL current gameStateSeconds snapshot rather than an incremental
 * delta, since there's exactly one writer (the owning client) per session
 * doc and no read-modify-write race to guard against. `uid` must be resent
 * every heartbeat because firestore.rules' validSessionShape requires it on
 * every update, not just create.
 */
export const heartbeatSession = async (sessionId, uid, gameStateSeconds) => {
    if (!sessionId || !uid) return;
    try {
        const sessionRef = doc(db, 'sessions', sessionId);
        await updateDoc(sessionRef, {
            uid,
            lastHeartbeat: serverTimestamp(),
            gameStateSeconds,
        });
    } catch (error) {
        console.error('Error sending session heartbeat:', error);
    }
};

/**
 * Logs one question-attempt event (admin-only content-insights dashboard
 * data - question accuracy, category popularity). Accepts BOTH anonymous
 * and signed-in play (uid nullable) - see firestore.rules' comment on
 * `questionAttempts/{attemptId}` for why this differs from session
 * tracking. Fire-and-forget: never throws, since a logging failure must
 * never interrupt gameplay.
 */
export const logQuestionAttempt = async (attempt) => {
    try {
        await addDoc(collection(db, 'questionAttempts'), {
            ...attempt,
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error logging question attempt:', error);
    }
};

/**
 * Logs one game-result event (admin-only content-insights dashboard data -
 * win/loss rate, average score/length). Same anonymous-friendly,
 * fire-and-forget contract as logQuestionAttempt.
 */
export const logGameResult = async (result) => {
    try {
        await addDoc(collection(db, 'gameResults'), {
            ...result,
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error logging game result:', error);
    }
};

/**
 * Submits a player's "report this question" action. Accepts BOTH anonymous
 * and signed-in play, same reasoning as logQuestionAttempt/logGameResult.
 * Fire-and-forget from the caller's perspective (App.jsx shows a thank-you
 * message regardless), but still surfaces success/failure so a genuinely
 * offline submit doesn't silently vanish.
 */
export const submitQuestionReport = async (report) => {
    try {
        await addDoc(collection(db, 'reports'), {
            ...report,
            status: 'pending',
            createdAt: serverTimestamp(),
        });
        return true;
    } catch (error) {
        console.error('Error submitting question report:', error);
        return false;
    }
};

/**
 * Fetches every report (admin-only Reports queue).
 */
export const getAllReports = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, 'reports'));
        return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    } catch (error) {
        console.error('Error fetching reports:', error);
        return [];
    }
};

/**
 * Marks every report for one question as resolved/dismissed in one batch -
 * the admin fixed (or dismissed) the QUESTION, so every report against it
 * clears together rather than requiring one click per report. `reportIds`
 * is the caller's already-fetched list for that question (AdminReports
 * groups by questionId client-side), so this never needs its own query.
 */
export const updateReportsStatusForQuestion = async (reportIds, status) => {
    if (!reportIds || reportIds.length === 0) return;
    const batch = writeBatch(db);
    for (const id of reportIds) {
        batch.update(doc(db, 'reports', id), { status });
    }
    await batch.commit();
};

/**
 * Submits a player-proposed new question for admin review (Baza pitanja ->
 * Predložena pitanja). Unlike submitQuestionReport, requires a signed-in
 * uid - firestore.rules ties the create to isOwner(uid), so anonymous play
 * can't submit. Content fields mirror the shape validateEntry (see
 * src/utils/questionMerge.js) enforces, since an approved submission is fed
 * straight into that same validation on the server.
 */
export const submitQuestionSubmission = async (submission) => {
    try {
        await addDoc(collection(db, 'questionSubmissions'), {
            ...submission,
            status: 'pending',
            createdAt: serverTimestamp(),
        });
        return true;
    } catch (error) {
        console.error('Error submitting question submission:', error);
        return false;
    }
};

/**
 * Fetches every question submission (admin-only Predložena pitanja queue).
 */
export const getAllQuestionSubmissions = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, 'questionSubmissions'));
        return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    } catch (error) {
        console.error('Error fetching question submissions:', error);
        return [];
    }
};

/**
 * Marks one question submission as approved/rejected. One doc per action -
 * unlike updateReportsStatusForQuestion, submissions aren't grouped, so no
 * batch is needed.
 */
export const updateQuestionSubmissionStatus = async (id, status) => {
    await updateDoc(doc(db, 'questionSubmissions', id), { status });
};

/**
 * Awards the submitter's community-question-approved xp/coins on their
 * users/{uid} doc, called by AdminQuestionSubmissions.jsx right after a
 * successful /api/questions add. Uses increment() rather than a read-modify-
 * write so a concurrent write (the player playing a round at the same
 * moment an admin approves) can't clobber either update. Level is NOT
 * recomputed here - firestore.rules' admin branch allows any update, but
 * this app has no server-side computeLevelFromXp equivalent; the player's
 * own client recalculates level from xp the next time they play, same
 * tradeoff as the Daily Challenge payout cron.
 */
export const awardCommunityQuestionReward = async (uid) => {
    if (!uid) return;
    try {
        await updateDoc(doc(db, 'users', uid), {
            xp: increment(COMMUNITY_QUESTION_APPROVED_XP),
            coins: increment(COMMUNITY_QUESTION_APPROVED_COINS),
        });
    } catch (error) {
        console.error('Error awarding community question reward:', error);
    }
};

/**
 * Reads today's (or any given date's) daily-missions progress doc for a
 * signed-in player - users/{uid}/missions/{dateKey}, see firestore.rules.
 * Returns null if the player hasn't started today's missions yet (or is
 * signed out) - useDailyMissions.js treats that as "initialize fresh".
 */
export const getDailyMissionsState = async (uid, dateKey) => {
    if (!uid) return null;
    try {
        const snap = await getDoc(doc(db, 'users', uid, 'missions', dateKey));
        return snap.exists() ? snap.data() : null;
    } catch (error) {
        console.error('Error fetching daily missions state:', error);
        return null;
    }
};

/**
 * Write-through save for the daily-missions doc - called after every local
 * progress/claim update by useDailyMissions.js, same "localStorage first,
 * Firestore write-through" pattern as the rest of globalStats.
 */
export const saveDailyMissionsState = async (uid, dateKey, state) => {
    if (!uid) return;
    try {
        await setDoc(doc(db, 'users', uid, 'missions', dateKey), state);
    } catch (error) {
        console.error('Error saving daily missions state:', error);
    }
};

/**
 * Fetches every questionAttempts/gameResults doc (admin-only content-
 * insights dashboard - question accuracy, category popularity). Fine at
 * beta scale to fetch everything and aggregate client-side at read time,
 * same pattern as getSessionsForUser/summarizeSessionsByPeriod - no
 * precomputed counters to keep in sync.
 */
export const getAllQuestionAttempts = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, 'questionAttempts'));
        return querySnapshot.docs.map(docSnap => docSnap.data());
    } catch (error) {
        console.error('Error fetching question attempts:', error);
        return [];
    }
};

export const getAllGameResults = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, 'gameResults'));
        return querySnapshot.docs.map(docSnap => docSnap.data());
    } catch (error) {
        console.error('Error fetching game results:', error);
        return [];
    }
};

/**
 * Fetches every session doc across ALL players (admin-only - powers the
 * player-list "Vrijeme igre" column, unlike getSessionsForUser below which
 * scopes to one player for the detail-view toggle). Same "fetch everything,
 * aggregate client-side" tradeoff as getAllQuestionAttempts/
 * getAllGameResults - fine at beta scale.
 */
export const getAllSessions = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, 'sessions'));
        return querySnapshot.docs.map(docSnap => docSnap.data());
    } catch (error) {
        console.error('Error fetching all sessions:', error);
        return [];
    }
};

/**
 * Fetches every session doc for one player (admin-only - see
 * firestore.rules' `sessions/{sessionId}` match block, `allow list: if
 * isAdmin();`). Returns raw docs; daily/weekly/all-time aggregation happens
 * client-side at read time (src/utils/sessionStats.js) rather than being
 * precomputed, per the beta-scale design in the original brainstorm.
 */
export const getSessionsForUser = async (uid) => {
    if (!uid) return [];
    try {
        const sessionsRef = collection(db, 'sessions');
        const q = query(sessionsRef, where('uid', '==', uid));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    } catch (error) {
        console.error('Error fetching sessions for user:', error);
        return [];
    }
};

/**
 * Saves a category high score to Firestore. elapsedMs/isPerfect are optional
 * (used by the Rekordi "fastest perfect round" board) - omitted entirely
 * from the payload when not provided, rather than written as null, so
 * older call sites/rules validation are unaffected. Returns whether the
 * write actually succeeded - the caller (App.jsx's saveScore) uses this to
 * decide whether the "successfully saved" state is truthful, rather than
 * just always showing it once the promise settles.
 */
export const saveScoreToFirestore = async (categoryKey, name, score, uid = null, elapsedMs = null, isPerfect = null) => {
    try {
        const scoresRef = collection(db, "leaderboards", categoryKey, "scores");
        const payload = { name, score, uid, createdAt: serverTimestamp() };
        if (typeof elapsedMs === 'number') payload.elapsedMs = elapsedMs;
        if (typeof isPerfect === 'boolean') payload.isPerfect = isPerfect;
        await addDoc(scoresRef, payload);
        if (isPerfect === true && typeof elapsedMs === 'number') {
            await maybeUpdateFastestPerfectRecord(categoryKey, name, uid, elapsedMs);
        }
        return true;
    } catch (error) {
        console.error("Error saving score to Firestore:", error);
        return false;
    }
};

const FASTEST_PERFECT_DOC_REF = () => doc(db, "records", "fastestPerfect");
const MAX_FASTEST_PERFECT_ENTRIES = 10;

/**
 * Keeps records/fastestPerfect (a maintained top-10 of the fastest flawless
 * rounds across every category) up to date, so getFastestPerfectRounds can
 * read one bounded doc instead of scanning every leaderboards/{cat}/scores
 * subcollection - see that function's comment for why the scan existed and
 * why it had to go. Only writes when the new round actually beats the
 * current 10th place (or the board isn't full yet); a miss costs one read
 * and no write. Never throws - a failure here should not fail the
 * underlying score save it's attached to.
 */
const maybeUpdateFastestPerfectRecord = async (categoryKey, name, uid, elapsedMs) => {
    try {
        await runTransaction(db, async (tx) => {
            const ref = FASTEST_PERFECT_DOC_REF();
            const snap = await tx.get(ref);
            const entries = snap.exists() ? (snap.data().entries || []) : [];
            if (entries.length >= MAX_FASTEST_PERFECT_ENTRIES
                && elapsedMs >= entries[entries.length - 1].elapsedMs) {
                return;
            }
            const updated = [...entries, { category: categoryKey, name, uid: uid || null, elapsedMs, createdAt: Date.now() }]
                .sort((a, b) => a.elapsedMs - b.elapsedMs)
                .slice(0, MAX_FASTEST_PERFECT_ENTRIES);
            tx.set(ref, { entries: updated, updatedAt: serverTimestamp() });
        });
    } catch (error) {
        console.error("Error updating fastest-perfect record:", error);
    }
};

/**
 * Fetches top 10 scores for a given category from Firestore
 */
export const getLeaderboardFromFirestore = async (categoryKey) => {
    try {
        const scoresRef = collection(db, "leaderboards", categoryKey, "scores");
        const q = query(scoresRef, orderBy("score", "desc"), limit(10));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(docSnap => docSnap.data());
    } catch (error) {
        console.error("Error fetching leaderboard from Firestore:", error);
        return [];
    }
};

/**
 * Fetches this player's single highest score ever recorded in a category,
 * BEFORE the round currently being saved - so the caller can compare a new
 * score against it to detect a personal best. Returns null if signed out or
 * the player has no prior score in this category (both cases new score
 * should count as a personal best).
 */
export const getPlayerBestScoreForCategory = async (uid, categoryKey) => {
    if (!uid) return null;
    try {
        const scoresRef = collection(db, "leaderboards", categoryKey, "scores");
        const q = query(scoresRef, where("uid", "==", uid), orderBy("score", "desc"), limit(1));
        const querySnapshot = await getDocs(q);
        return querySnapshot.empty ? null : querySnapshot.docs[0].data().score;
    } catch (error) {
        console.error("Error fetching player's best score for category:", error);
        return null;
    }
};

const DAILY_ATTEMPT_DOC_REF = (uid, date) => doc(db, "dailyAttempts", `${date}_${uid}`);
const DAILY_LEADERBOARD_DOC_REF = (uid, date) => doc(db, "dailyLeaderboards", date, "scores", uid);

/**
 * Reads today's attempt status for a player without writing anything - used
 * to render the pre-round lobby card. Never throws; a fresh player (no doc
 * yet) reads as not-yet-played.
 */
export const getDailyAttemptStatus = async (uid, date) => {
    try {
        const snap = await getDoc(DAILY_ATTEMPT_DOC_REF(uid, date));
        const alreadyPlayed = snap.exists() && snap.data().attemptsUsed >= 1;
        return { canPlay: !alreadyPlayed };
    } catch (error) {
        console.error("Error fetching daily attempt status:", error);
        return { canPlay: false };
    }
};

/**
 * Consumes the single daily free attempt - consumed on round START, not on
 * submission (a closed/abandoned round still uses up the day's one shot,
 * per the locked design decision). One free attempt/day, no coin cost.
 *
 * Returns { success, reason } - reason is 'already_played' | 'error' on
 * failure. firestore.rules' dailyAttempts create-once rule re-validates
 * this independently; this function being wrong would just mean a rejected
 * write, not a security hole.
 */
export const startDailyAttempt = async (uid, date) => {
    if (!uid) return { success: false, reason: "error" };
    try {
        return await runTransaction(db, async (tx) => {
            const attemptRef = DAILY_ATTEMPT_DOC_REF(uid, date);
            const attemptSnap = await tx.get(attemptRef);
            if (attemptSnap.exists() && attemptSnap.data().attemptsUsed >= 1) {
                return { success: false, reason: "already_played" };
            }
            tx.set(attemptRef, { uid, date, attemptsUsed: 1, updatedAt: serverTimestamp() });
            return { success: true };
        });
    } catch (error) {
        console.error("Error starting daily attempt:", error);
        return { success: false, reason: "error" };
    }
};

/**
 * Records a player's Daily Challenge score for the given date - one doc per
 * {date,uid} (see locked design decision in the Daily Challenge plan). The
 * score-improvement guard is mostly defensive (a resubmitted/retried write
 * shouldn't lower an already-recorded score) since startDailyAttempt's
 * one-attempt cap means there's normally only ever one submission per day.
 */
export const submitDailyScore = async (uid, date, name, score) => {
    if (!uid) return false;
    try {
        await runTransaction(db, async (tx) => {
            const ref = DAILY_LEADERBOARD_DOC_REF(uid, date);
            const snap = await tx.get(ref);
            if (snap.exists() && snap.data().score > score) return;
            tx.set(ref, { uid, name, score, createdAt: serverTimestamp() });
        });
        return true;
    } catch (error) {
        console.error("Error submitting daily score:", error);
        return false;
    }
};

/**
 * Reads dailyMeta/{date} - written only by api/daily-challenge-payout.js's
 * Admin SDK job, never by any client (see firestore.rules). Used to check
 * "did yesterday's Daily Challenge already pay out, and did I win" for the
 * winner-announcement UI. Returns null if the payout hasn't run yet (or the
 * date had no entries at all).
 */
export const getDailyMeta = async (date) => {
    try {
        const snap = await getDoc(doc(db, "dailyMeta", date));
        return snap.exists() ? snap.data() : null;
    } catch (error) {
        console.error("Error fetching daily meta:", error);
        return null;
    }
};

/**
 * Live standings for a given date's Daily Challenge, ordered best-first -
 * same shape as getLeaderboardFromFirestore. Safe to re-fetch frequently
 * (locked decision: standings are visible live, not just after rollover).
 */
export const getDailyLeaderboard = async (date, limitN = 10) => {
    try {
        const scoresRef = collection(db, "dailyLeaderboards", date, "scores");
        const q = query(scoresRef, orderBy("score", "desc"), limit(limitN));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(docSnap => docSnap.data());
    } catch (error) {
        console.error("Error fetching daily leaderboard from Firestore:", error);
        return [];
    }
};

/**
 * Syncs a deliberately public-safe summary of a player's stats to
 * publicProfiles/{uid} - only what the Rekordi ranking boards need
 * (never the sensitive fields that keep users/{uid} owner/admin-only).
 * Called alongside syncUserStatsToFirestore, same call site.
 */
export const syncPublicProfile = async (uid, displayName, stats) => {
    if (!uid) return;
    try {
        const profileRef = doc(db, "publicProfiles", uid);
        await setDoc(profileRef, {
            ...buildPublicProfileFields({ ...stats, displayName }),
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error syncing public profile to Firestore:", error);
    }
};

/**
 * Top players ranked by a single publicProfiles field (level, maxStreak,
 * dayStreak, or achievementCount) - reused for 4 of the Rekordi boards.
 */
export const getPublicProfileLeaderboard = async (field, limitN = 10) => {
    try {
        const profilesRef = collection(db, "publicProfiles");
        const q = query(profilesRef, orderBy(field, "desc"), limit(limitN));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(docSnap => ({ uid: docSnap.id, ...docSnap.data() }));
    } catch (error) {
        console.error(`Error fetching public profile leaderboard for ${field}:`, error);
        return [];
    }
};

/**
 * Best single-round score across every category (Rekordi board) - fetches
 * the top limitN from each of the 8 category leaderboards (not just the
 * single best from each, since the true overall top N could plausibly all
 * come from one category) and re-sorts the merged set.
 */
export const getBestScoresAcrossCategories = async (limitN = 10) => {
    try {
        const categories = Object.keys(CATEGORY_META);
        const perCategory = await Promise.all(categories.map(async (cat) => {
            const scoresRef = collection(db, "leaderboards", cat, "scores");
            const q = query(scoresRef, orderBy("score", "desc"), limit(limitN));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, category: cat, ...docSnap.data() }));
        }));
        return perCategory.flat().sort((a, b) => b.score - a.score).slice(0, limitN);
    } catch (error) {
        console.error("Error fetching best scores across categories:", error);
        return [];
    }
};

/**
 * Fastest flawless (10/10) round across every category (Rekordi board).
 * Reads the single maintained records/fastestPerfect doc (kept current by
 * maybeUpdateFastestPerfectRecord on every perfect-round score save) instead
 * of scanning every leaderboards/{cat}/scores subcollection - that scan used
 * to cost one read per score ever saved, on every app load, forever. This
 * is one bounded read regardless of how many scores exist.
 */
export const getFastestPerfectRounds = async (limitN = 10) => {
    try {
        const snap = await getDoc(FASTEST_PERFECT_DOC_REF());
        if (!snap.exists()) return [];
        return (snap.data().entries || []).slice(0, limitN);
    } catch (error) {
        console.error("Error fetching fastest perfect rounds:", error);
        return [];
    }
};

/**
 * Admin-only escape hatch: rebuilds records/fastestPerfect from scratch by
 * scanning every leaderboards/{cat}/scores subcollection (the same full
 * scan getFastestPerfectRounds used to do on every load). Needed because
 * deleting a score or clearing a category via the Admin Panel can leave the
 * maintained doc pointing at data that no longer exists - this is the fix
 * for that drift. Deliberately not run automatically; it's an unbounded
 * scan, only acceptable as an occasional admin action (same tolerance as
 * getAllScoresForCategory/clearLeaderboardForCategory below).
 */
export const recomputeFastestPerfectRecord = async (limitN = MAX_FASTEST_PERFECT_ENTRIES) => {
    const categories = Object.keys(CATEGORY_META);
    const perCategory = await Promise.all(categories.map(async (cat) => {
        const scoresRef = collection(db, "leaderboards", cat, "scores");
        const querySnapshot = await getDocs(scoresRef);
        return querySnapshot.docs
            .map(docSnap => ({ category: cat, ...docSnap.data() }))
            .filter(entry => entry.isPerfect === true && typeof entry.elapsedMs === 'number');
    }));
    const entries = perCategory.flat()
        .sort((a, b) => a.elapsedMs - b.elapsedMs)
        .slice(0, limitN)
        .map(({ category, name, uid, elapsedMs }) => ({ category, name, uid: uid || null, elapsedMs, createdAt: Date.now() }));
    await setDoc(FASTEST_PERFECT_DOC_REF(), { entries, updatedAt: serverTimestamp() });
    return entries.length;
};

/**
 * Fetches every publicProfiles entry (the public-safe Rekordi summary),
 * for admin management - unlike getPublicProfileLeaderboard, not capped
 * and not sorted by a specific ranking field.
 */
export const getAllPublicProfiles = async (limitN = 100) => {
    try {
        const profilesRef = collection(db, "publicProfiles");
        const q = query(profilesRef, orderBy("updatedAt", "desc"), limit(limitN));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(docSnap => ({ uid: docSnap.id, ...docSnap.data() }));
    } catch (error) {
        console.error("Error fetching public profiles:", error);
        return [];
    }
};

/**
 * Deletes a single publicProfiles entry (removes that player from every
 * Rekordi ranking board - does not touch their actual account/users doc).
 */
export const deletePublicProfile = async (uid) => {
    const profileRef = doc(db, "publicProfiles", uid);
    await deleteDoc(profileRef);
};

/**
 * Deletes every publicProfiles entry. Same batching approach as
 * clearLeaderboardForCategory, since Firestore has no client-side
 * "delete collection" operation. Returns how many were deleted.
 */
export const clearAllPublicProfiles = async () => {
    const profilesRef = collection(db, "publicProfiles");
    const querySnapshot = await getDocs(profilesRef);
    const docs = querySnapshot.docs;

    const BATCH_LIMIT = 500;
    for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db);
        for (const docSnap of docs.slice(i, i + BATCH_LIMIT)) {
            batch.delete(docSnap.ref);
        }
        await batch.commit();
    }
    return docs.length;
};

/**
 * One-time admin backfill: creates/updates a publicProfiles doc for every
 * existing users/{uid} doc, using whatever level/xp/streak/achievement data
 * that account already has. Needed because publicProfiles didn't exist
 * before the Rekordi feature shipped - an existing account otherwise only
 * gets its own doc organically, the next time it signs back in and its
 * stats re-sync (see syncPublicProfile's call site in App.jsx), so accounts
 * that haven't logged in since are silently missing from every board. Relies
 * on the admin-write allowance added to firestore.rules for publicProfiles.
 */
export const backfillPublicProfiles = async () => {
    const users = await getAllRegisteredUsers();
    const BATCH_LIMIT = 500;
    const failed = [];
    let succeeded = 0;

    const profilePayload = (user) => ({
        ...buildPublicProfileFields(user),
        updatedAt: serverTimestamp()
    });

    for (let i = 0; i < users.length; i += BATCH_LIMIT) {
        const chunk = users.slice(i, i + BATCH_LIMIT);
        try {
            const batch = writeBatch(db);
            for (const user of chunk) {
                batch.set(doc(db, "publicProfiles", user.uid), profilePayload(user));
            }
            await batch.commit();
            succeeded += chunk.length;
        } catch (error) {
            // A batch commit is atomic - rules are evaluated per write, but a
            // single rejected doc rejects the entire commit. That's how one
            // malformed account (historically a qa-*-<epoch> test user whose
            // displayName exceeded the rules' 20-char cap) silently blocked
            // the backfill for every real player. buildPublicProfileFields
            // should now prevent that, but fall back to individual writes
            // anyway so a future rule mismatch degrades to "skip the bad one"
            // instead of "fail everyone", and so we can name the offenders.
            console.error("Batch backfill rejected, retrying writes individually:", error);
            for (const user of chunk) {
                try {
                    await setDoc(doc(db, "publicProfiles", user.uid), profilePayload(user));
                    succeeded += 1;
                } catch (userError) {
                    console.error(`Backfill failed for ${user.uid}:`, userError);
                    failed.push({ uid: user.uid, displayName: user.displayName || '' });
                }
            }
        }
    }
    return { succeeded, failed };
};

/**
 * Fetches EVERY score for a category (not capped at 10 like
 * getLeaderboardFromFirestore, which is the gameplay-facing top-10 read),
 * including doc ids, for admin management.
 */
export const getAllScoresForCategory = async (categoryKey) => {
    try {
        const scoresRef = collection(db, "leaderboards", categoryKey, "scores");
        const q = query(scoresRef, orderBy("score", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    } catch (error) {
        console.error("Error fetching all scores for category:", error);
        return [];
    }
};

/**
 * Deletes a single leaderboard score.
 */
export const deleteScoreFromFirestore = async (categoryKey, scoreId) => {
    const scoreRef = doc(db, "leaderboards", categoryKey, "scores", scoreId);
    await deleteDoc(scoreRef);
};

/**
 * Deletes every score in a category's leaderboard. Firestore has no native
 * client-side "delete collection" operation, so this fetches every doc id
 * first, then removes them in batches (writeBatch caps at 500 ops/batch).
 * Returns how many were deleted.
 */
export const clearLeaderboardForCategory = async (categoryKey) => {
    const scoresRef = collection(db, "leaderboards", categoryKey, "scores");
    const querySnapshot = await getDocs(scoresRef);
    const docs = querySnapshot.docs;

    const BATCH_LIMIT = 500;
    for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db);
        for (const docSnap of docs.slice(i, i + BATCH_LIMIT)) {
            batch.delete(docSnap.ref);
        }
        await batch.commit();
    }
    return docs.length;
};

/**
 * Fetches all registered players from Firestore
 */
export const getAllRegisteredUsers = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        return querySnapshot.docs.map(docSnap => ({
            uid: docSnap.id,
            ...docSnap.data()
        }));
    } catch (error) {
        console.error("Error fetching users from Firestore:", error);
        return [];
    }
};

/**
 * Updates any user field in Firestore
 */
export const updateUserInFirestore = async (uid, updatedData) => {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, updatedData);
};

/**
 * Deletes a user document from Firestore database
 */
export const deleteUserFromFirestore = async (uid) => {
    const userRef = doc(db, "users", uid);
    await deleteDoc(userRef);
};

/**
 * Creates/updates the caller's presence/{uid} doc (see firestore.rules) -
 * one publicly-listable doc per signed-in online player, showing status
 * (lobby/playing/busy), displayName and level. displayName/level are
 * denormalized here rather than joined from publicProfiles/{uid} on read,
 * so the online list doesn't need an extra read per newly-visible player on
 * every heartbeat - see Plan A's data-model notes. Signed-in users only
 * (no uid, no doc), same reasoning as startSession.
 */
export const upsertPresence = async (uid, displayName, level, status) => {
    if (!uid) return;
    try {
        const presenceRef = doc(db, "presence", uid);
        await setDoc(presenceRef, {
            uid,
            displayName: (displayName || 'Igrač').slice(0, 20),
            level: Number.isInteger(level) && level >= 1 ? level : 1,
            status,
            lastHeartbeat: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error updating presence:', error);
    }
};

/**
 * Live-subscribes to every presence/{uid} doc. Filtering by the "online"
 * threshold (stale heartbeats still linger as docs until the owner logs out
 * - see deletePresence) happens client-side in the caller, not here, since
 * "online" is a read-time judgment call (see usePresence) rather than
 * something worth a composite index for at beta scale. Returns the
 * onSnapshot unsubscribe function.
 */
export const subscribeToOnlinePlayers = (callback) => {
    const presenceRef = collection(db, "presence");
    return onSnapshot(presenceRef, (snapshot) => {
        callback(snapshot.docs.map(docSnap => docSnap.data()));
    }, (error) => {
        console.error('Error subscribing to online players:', error);
    });
};

/**
 * Removes the caller's presence doc on explicit logout - a clean signal
 * instead of waiting out the heartbeat timeout for everyone else's list to
 * catch up. Never throws: called from handlePlayerLogout, which must not be
 * blocked by a presence-cleanup failure.
 */
export const deletePresence = async (uid) => {
    if (!uid) return;
    try {
        await deleteDoc(doc(db, "presence", uid));
    } catch (error) {
        console.error('Error deleting presence:', error);
    }
};