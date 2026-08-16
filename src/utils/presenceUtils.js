// Presence/online-list helpers, extracted from OnlinePlayersList.jsx so that
// component file only exports a component (react-refresh/only-export-components)
// and so the shared filter isn't duplicated between the modal and the lobby CTA.

// 3x the 60s heartbeat in usePresence.js - tolerates one missed heartbeat
// (e.g. a brief network hiccup) before a player drops off the list.
export const ONLINE_THRESHOLD_MS = 180000;

export const filterOnlinePlayers = (players, currentUid, now) =>
    (players || [])
        .filter(p => p.uid !== currentUid)
        .filter(p => {
            const heartbeatMs = p.lastHeartbeat?.toMillis?.() ?? 0;
            return now - heartbeatMs <= ONLINE_THRESHOLD_MS;
        });
