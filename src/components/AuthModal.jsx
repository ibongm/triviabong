import React, { useState } from 'react';
import {
    auth,
    googleProvider,
    syncUserProfile
} from '../services/firebase';
import {
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword
} from 'firebase/auth';

// Firebase groups every failure (network outages, rate limits, bad
// credentials) behind generic-looking error codes - mapping them here so
// "the wifi dropped" no longer reads to the player as "wrong password".
const NETWORK_ERROR_CODES = new Set([
    'auth/network-request-failed',
    'auth/timeout',
]);

function getAuthErrorMessage(err, { isRegister, isGoogle } = {}) {
    const code = err?.code;

    if (NETWORK_ERROR_CODES.has(code)) {
        return 'Greška u mreži. Provjerite internetsku vezu i pokušajte ponovno.';
    }
    if (code === 'auth/too-many-requests') {
        return 'Previše pokušaja. Pokušajte ponovno za nekoliko minuta.';
    }
    if (code === 'auth/user-disabled') {
        return 'Ovaj račun je onemogućen.';
    }

    if (isGoogle) {
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
            return '';
        }
        if (code === 'auth/popup-blocked') {
            return 'Skočni prozor je blokiran. Omogućite skočne prozore i pokušajte ponovno.';
        }
        return 'Greška pri prijavi s Google računom.';
    }

    if (isRegister) {
        if (code === 'auth/email-already-in-use') {
            return 'Ovaj email je već registriran. Pokušajte se prijaviti umjesto toga.';
        }
        if (code === 'auth/weak-password') {
            return 'Lozinka je preslaba (minimalno 6 znakova).';
        }
        if (code === 'auth/invalid-email') {
            return 'Neispravna email adresa.';
        }
        return 'Neuspješna registracija. Provjerite podatke.';
    }

    return 'Pogrešan email ili lozinka.';
}

export default function AuthModal({ isOpen, onClose, onSuccess }) {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    // Handle Google Sign-In
    const handleGoogleLogin = async () => {
        setErrorMsg('');
        setLoading(true);
        try {
            const result = await signInWithPopup(auth, googleProvider);

            // Sync user profile data to Firestore
            await syncUserProfile(result.user);

            if (onSuccess) onSuccess(result.user);
            if (onClose) onClose();
        } catch (err) {
            console.error("Google Auth Error:", err);
            setErrorMsg(getAuthErrorMessage(err, { isGoogle: true }));
        } finally {
            setLoading(false);
        }
    };

    // Handle Email / Password Login & Registration
    const handleEmailAuth = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setLoading(true);

        try {
            let userCredential;
            if (isRegister) {
                userCredential = await createUserWithEmailAndPassword(auth, email, password);
            } else {
                userCredential = await signInWithEmailAndPassword(auth, email, password);
            }

            // Sync user profile data to Firestore
            await syncUserProfile(userCredential.user);

            if (onSuccess) onSuccess(userCredential.user);
            if (onClose) onClose();
        } catch (err) {
            console.error("Email Auth Error:", err);
            setErrorMsg(getAuthErrorMessage(err, { isRegister }));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#121824] border border-slate-800 text-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl font-bold transition-colors"
                >
                    ✕
                </button>

                <h2 className="text-2xl font-bold text-center mb-6 text-amber-400">
                    {isRegister ? 'Registracija Igrača' : 'Prijava Igrača'}
                </h2>

                {errorMsg && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg text-center mb-4">
                        {errorMsg}
                    </div>
                )}

                {/* Google Sign In Button */}
                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 font-semibold py-3 px-4 rounded-xl hover:bg-slate-100 transition-colors mb-6 disabled:opacity-50"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                    </svg>
                    Prijava s Google računom
                </button>

                <div className="relative flex py-2 items-center mb-6">
                    <div className="flex-grow border-t border-slate-700"></div>
                    <span className="flex-shrink mx-4 text-slate-400 text-xs uppercase">ili putem emaila</span>
                    <div className="flex-grow border-t border-slate-700"></div>
                </div>

                {/* Email/Password Form */}
                <form onSubmit={handleEmailAuth} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Email adresa</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-400 transition-colors"
                            placeholder="vaz-email@domena.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Lozinka</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-400 transition-colors"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 mt-2"
                    >
                        {loading ? 'Spremanje...' : isRegister ? 'Registriraj se' : 'Prijavi se'}
                    </button>
                </form>

                {/* Switch mode */}
                <div className="text-center mt-6">
                    <button
                        type="button"
                        onClick={() => setIsRegister(!isRegister)}
                        className="text-slate-400 hover:text-amber-400 text-sm transition-colors"
                    >
                        {isRegister
                            ? 'Već imate račun? Prijavite se'
                            : 'Nemate račun? Registrirajte se'}
                    </button>
                </div>
            </div>
        </div>
    );
}