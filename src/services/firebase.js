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
    getDocs,
    collection,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from "firebase/firestore";

// Your Firebase configuration object
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
 * Syncs player profile to Firestore on login without overwriting existing stats
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
 * Updates any user field (Level, XP, Coins, Nickname, Role, etc.) in Firestore
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