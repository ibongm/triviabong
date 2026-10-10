import { useCallback, useEffect, useState } from 'react';
import { isFeatureEnabled } from '../constants/features';
import { parseLeaguePath } from '../utils/league';
import { getMyLeagues } from '../services/leagues';

const PENDING_KEY = 'triviabong_pending_league_code';
// How long to wait for the auth state before treating a visitor as signed out.
const LINK_AUTH_WAIT_MS = 1500;

const readPendingCode = () => {
    let fromUrl = null;
    try { fromUrl = parseLeaguePath(window.location.pathname); } catch { /* no window */ }
    if (fromUrl) {
        // Remember it (sign-in may take a while) and take /liga/CODE out of the
        // address bar, so a reload doesn't replay the link.
        try { sessionStorage.setItem(PENDING_KEY, fromUrl); } catch { /* storage unavailable: link works once */ }
        try { window.history.replaceState(null, '', '/'); } catch { /* ignore */ }
        return fromUrl;
    }
    try {
        const stored = sessionStorage.getItem(PENDING_KEY);
        return stored && parseLeaguePath(`/liga/${stored}`) ? stored : null;
    } catch {
        return null;
    }
};

/**
 * Private leagues (FEATURES.LEAGUES, engagement plan Phase 6): the player's own
 * league list (one small query, fetched when "Lige" opens - never listened to)
 * and the `/liga/CODE` invite link.
 *
 * There's no router: like `isAdminPath()` in App.jsx the link is read once on
 * load. It is parked in sessionStorage and surfaced as `pendingCode`; the modal
 * opens once auth has had a moment to resolve (`linkReady`), asks a signed-out
 * visitor to sign in (leagues require an account, decision D4) and then lets
 * them join.
 */
export function useLeagues(currentUser) {
    const enabled = isFeatureEnabled('LEAGUES');
    const uid = currentUser?.uid || null;
    const [leagues, setLeagues] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pendingCode, setPendingCode] = useState(() => (enabled ? readPendingCode() : null));
    const [authWaitOver, setAuthWaitOver] = useState(false);

    useEffect(() => {
        if (!pendingCode) return undefined;
        const timer = setTimeout(() => setAuthWaitOver(true), LINK_AUTH_WAIT_MS);
        return () => clearTimeout(timer);
    }, [pendingCode]);

    const refresh = useCallback(async () => {
        if (!enabled || !uid) {
            setLeagues([]);
            return [];
        }
        setLoading(true);
        const list = await getMyLeagues(uid);
        setLeagues(list);
        setLoading(false);
        return list;
    }, [enabled, uid]);

    const clearPendingCode = useCallback(() => {
        setPendingCode(null);
        try { sessionStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
    }, []);

    return {
        enabled,
        leagues,
        loading,
        refresh,
        pendingCode,
        clearPendingCode,
        // The link opens the modal once we know whether someone is signed in.
        linkReady: !!pendingCode && (!!uid || authWaitOver),
    };
}
