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
    addDoc
} from "firebase/firestore";
import { DEFAULT_GLOBAL_STATS } from "../constants/defaultGlobalStats";

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
 * Saves a category high score to Firestore
 */
export const saveScoreToFirestore = async (categoryKey, name, score, uid = null) => {
    try {
        const scoresRef = collection(db, "leaderboards", categoryKey, "scores");
        await addDoc(scoresRef, {
            name,
            score,
            uid,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error saving score to Firestore:", error);
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