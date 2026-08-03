// src/services/firebase.js
import { initializeApp } from "firebase/app";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut
} from "firebase/auth";
import {
    getFirestore,
    doc,
    setDoc,
    getDocFromServer,
    waitForPendingWrites,
    getDocs,
    collection,
    query,
    orderBy,
    limit,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    addDoc,
    writeBatch
} from "firebase/firestore";
import { DEFAULT_GLOBAL_STATS } from "../constants/defaultGlobalStats";
import { CATEGORY_META } from "../data/categoryMeta";

const firebaseConfig = {
    apiKey: "AIzaSyAlWaXV43v307yaC85OaABp62U6Z7m8OiA",
    authDomain: "triviabong-web.firebaseapp.com",
    projectId: "triviabong-web",
    storageBucket: "triviabong-web.firebasestorage.app",
    messagingSenderId: "769479466909",
    appId: "1:769479466909:web:20b977025bf3a6374a5974",
    measurementId: "G-BH18H9H0TC"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

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
        await setDoc(userRef, {
            ...DEFAULT_GLOBAL_STATS,
            ...stats,
            updatedAt: serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error("Error syncing stats to Firestore:", error);
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
        return true;
    } catch (error) {
        console.error("Error saving score to Firestore:", error);
        return false;
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
            displayName: (displayName && displayName.trim()) || 'Igrač',
            level: stats.level || 1,
            xp: stats.xp || 0,
            maxStreak: stats.maxStreak || 0,
            dayStreak: stats.dayStreak || 0,
            achievementCount: Object.keys(stats.unlockedAchievements || {}).length,
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
 * Firestore can't cheaply combine an equality filter (isPerfect) with a
 * sort on a different field (elapsedMs) without a composite index per
 * category, so this fetches each category's full list (same pattern as
 * getAllScoresForCategory) and filters/sorts client-side - fine for an
 * occasionally-opened records screen, not a hot path.
 */
export const getFastestPerfectRounds = async (limitN = 10) => {
    try {
        const categories = Object.keys(CATEGORY_META);
        const perCategory = await Promise.all(categories.map(async (cat) => {
            const scoresRef = collection(db, "leaderboards", cat, "scores");
            const querySnapshot = await getDocs(scoresRef);
            return querySnapshot.docs
                .map(docSnap => ({ id: docSnap.id, category: cat, ...docSnap.data() }))
                .filter(entry => entry.isPerfect === true && typeof entry.elapsedMs === 'number');
        }));
        return perCategory.flat().sort((a, b) => a.elapsedMs - b.elapsedMs).slice(0, limitN);
    } catch (error) {
        console.error("Error fetching fastest perfect rounds:", error);
        return [];
    }
};

/**
 * Fetches every publicProfiles entry (the public-safe Rekordi summary),
 * for admin management - unlike getPublicProfileLeaderboard, not capped
 * and not sorted by a specific ranking field.
 */
export const getAllPublicProfiles = async () => {
    try {
        const profilesRef = collection(db, "publicProfiles");
        const q = query(profilesRef, orderBy("updatedAt", "desc"));
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
    let count = 0;
    for (let i = 0; i < users.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db);
        for (const user of users.slice(i, i + BATCH_LIMIT)) {
            const profileRef = doc(db, "publicProfiles", user.uid);
            batch.set(profileRef, {
                displayName: (user.displayName && user.displayName.trim()) || 'Igrač',
                level: user.level || 1,
                xp: user.xp || 0,
                maxStreak: user.maxStreak || 0,
                dayStreak: user.dayStreak || 0,
                achievementCount: Object.keys(user.unlockedAchievements || {}).length,
                updatedAt: serverTimestamp()
            });
            count += 1;
        }
        await batch.commit();
    }
    return count;
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