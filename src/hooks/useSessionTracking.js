import { useEffect, useRef } from 'react';
import { startSession, heartbeatSession } from '../services/firebase';

const HEARTBEAT_INTERVAL_MS = 30000;

// Admin-only time-tracking instrumentation (beta insights) - accumulates
// wall-clock time spent in each gameState for the current browser session
// and flushes the full snapshot to Firestore every 30s, pausing while the
// tab is backgrounded (Page Visibility API) so an abandoned open tab doesn't
// inflate the numbers. Signed-in users only - see startSession's comment
// (services/firebase.js) for why anonymous play is out of scope. There's no
// reliable "session end"/unload event in a browser (especially on mobile),
// so this relies entirely on periodic heartbeats rather than a final write
// on unmount - a session that never gets a second heartbeat just reads as a
// short one later, an acceptable failure mode at beta scale.
export const useSessionTracking = (uid, gameState) => {
    const sessionIdRef = useRef(null);
    const secondsRef = useRef({});
    const activeSinceRef = useRef(null); // null while backgrounded/no session
    const gameStateRef = useRef(gameState);

    // Credits elapsed time (since activeSinceRef) to the CURRENT gameState
    // bucket, then resets activeSinceRef to "now" if still active. Shared by
    // the gameState-change effect, the visibility handler, and the heartbeat
    // timer so none of them can double-count or drop a gap between them.
    const flushElapsed = () => {
        if (activeSinceRef.current === null) return;
        const now = Date.now();
        const elapsedSeconds = (now - activeSinceRef.current) / 1000;
        const state = gameStateRef.current;
        secondsRef.current[state] = (secondsRef.current[state] || 0) + elapsedSeconds;
        activeSinceRef.current = now;
    };

    // Start/stop a session as the signed-in user changes. Deliberately does
    // NOT depend on gameState - a new session per gameState transition would
    // defeat the point of measuring where time actually goes.
    useEffect(() => {
        if (!uid) {
            sessionIdRef.current = null;
            return;
        }

        let cancelled = false;
        secondsRef.current = {};
        activeSinceRef.current = document.visibilityState === 'visible' ? Date.now() : null;

        (async () => {
            const id = await startSession(uid);
            if (!cancelled) sessionIdRef.current = id;
        })();

        return () => {
            cancelled = true;
            sessionIdRef.current = null;
        };
    }, [uid]);

    // Keep gameStateRef current, crediting elapsed time to the OLD state
    // before switching to the bucket a later flush would credit.
    useEffect(() => {
        flushElapsed();
        gameStateRef.current = gameState;
    }, [gameState]);

    // Page Visibility API - pause the active timer while backgrounded,
    // resume on refocus.
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                flushElapsed();
                activeSinceRef.current = null;
            } else if (uid) {
                activeSinceRef.current = Date.now();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [uid]);

    // Heartbeat: flush + write the full snapshot every 30s while signed in.
    useEffect(() => {
        if (!uid) return;
        const interval = setInterval(() => {
            flushElapsed();
            if (sessionIdRef.current) {
                heartbeatSession(sessionIdRef.current, uid, { ...secondsRef.current });
            }
        }, HEARTBEAT_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [uid]);
};
