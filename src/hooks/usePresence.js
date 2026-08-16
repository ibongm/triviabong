import { useEffect, useRef } from 'react';
import { upsertPresence } from '../services/firebase';

const HEARTBEAT_INTERVAL_MS = 60000;

// Maps the single-player gameState machine onto presence's public status.
// 'busy' isn't reachable through this mapping yet - it's reserved for
// Plan B (1v1 invites/matches) and stays inert until that exists.
const statusForGameState = (gameState) => {
    if (gameState === 'PLAYING' || gameState === 'GAMEOVER' || gameState === 'VICTORY') {
        return 'playing';
    }
    return 'lobby';
};

// Publicly-visible counterpart to useSessionTracking: writes presence/{uid}
// (see firestore.rules) so other signed-in players can see who's online and
// what they're doing. Same 60s heartbeat + Page Visibility pausing pattern,
// but there's no per-gameState bucket to accumulate - each write is just the
// current status, so an immediate write on status change (not just the
// heartbeat tick) keeps the list responsive when someone starts a round.
export const usePresence = (uid, displayName, level, gameState) => {
    const latestRef = useRef({ displayName, level, status: statusForGameState(gameState) });

    // Immediate write whenever status (or identity) actually changes -
    // doesn't wait for the next heartbeat tick. Also keeps latestRef current
    // for the heartbeat/visibility effects below, which read it from inside
    // a callback (event handler/timer), not during render.
    useEffect(() => {
        latestRef.current = { displayName, level, status: statusForGameState(gameState) };
        if (!uid) return;
        const { displayName: dn, level: lvl, status } = latestRef.current;
        upsertPresence(uid, dn, lvl, status);
    }, [uid, displayName, level, gameState]);

    // Heartbeat: re-send the current snapshot every 60s while the tab is
    // visible, so lastHeartbeat keeps advancing and the doc doesn't go
    // stale in other clients' online-threshold filtering.
    useEffect(() => {
        if (!uid) return;
        const interval = setInterval(() => {
            if (document.visibilityState !== 'visible') return;
            const { displayName: dn, level: lvl, status } = latestRef.current;
            upsertPresence(uid, dn, lvl, status);
        }, HEARTBEAT_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [uid]);

    // Refresh immediately on returning to the tab, same reasoning as the
    // immediate write above - don't make a returning player wait out a full
    // heartbeat interval to look online again.
    useEffect(() => {
        if (!uid) return;
        const handleVisibilityChange = () => {
            if (document.visibilityState !== 'visible') return;
            const { displayName: dn, level: lvl, status } = latestRef.current;
            upsertPresence(uid, dn, lvl, status);
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [uid]);
};
