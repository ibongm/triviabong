import { useEffect, useState } from 'react';
import { Users, Circle, Gamepad2, Clock } from 'lucide-react';
import { subscribeToOnlinePlayers } from '../services/firebase';

// 3x the 30s heartbeat in usePresence.js - tolerates one missed heartbeat
// (e.g. a brief network hiccup) before a player drops off the list.
const ONLINE_THRESHOLD_MS = 90000;

const STATUS_META = {
    lobby: { label: 'Dostupan', dotClass: 'text-emerald-400' },
    playing: { label: 'U igri', dotClass: 'text-amber-400' },
    busy: { label: 'Zauzet', dotClass: 'text-slate-400' },
};

// Lobby-only, publicly-listable (to signed-in players) online-players
// panel - see Plan A. Filters presence docs to the online threshold
// client-side rather than via a Firestore query, since a
// where('lastHeartbeat', '>', ...) query would need a value that keeps
// moving every render and would need a composite index for no real benefit
// at beta scale.
export default function OnlinePlayersList({ currentUid }) {
    const [players, setPlayers] = useState(null);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const unsubscribe = subscribeToOnlinePlayers(setPlayers);
        return unsubscribe;
    }, []);

    // Re-evaluate the online threshold periodically so a ghost entry
    // (heartbeat stopped, doc not yet deleted) actually disappears instead
    // of only updating on the next unrelated re-render.
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 10000);
        return () => clearInterval(interval);
    }, []);

    if (players === null) {
        return null;
    }

    const onlinePlayers = players
        .filter(p => p.uid !== currentUid)
        .filter(p => {
            const heartbeatMs = p.lastHeartbeat?.toMillis?.() ?? 0;
            return now - heartbeatMs <= ONLINE_THRESHOLD_MS;
        })
        .sort((a, b) => (b.level || 0) - (a.level || 0));

    return (
        <div className="space-y-3 pt-4">
            <h2 className="text-sm font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" /> Online igrači
            </h2>

            {onlinePlayers.length === 0 ? (
                <p className="text-sm text-slate-500 bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-center">
                    Trenutno nema drugih igrača na mreži.
                </p>
            ) : (
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl divide-y divide-slate-800">
                    {onlinePlayers.map(player => {
                        const meta = STATUS_META[player.status] || STATUS_META.lobby;
                        return (
                            <div key={player.uid} className="flex items-center justify-between p-3.5">
                                <div className="flex items-center gap-3">
                                    <Circle className={`w-2.5 h-2.5 fill-current ${meta.dotClass}`} />
                                    <div>
                                        <span className="font-bold text-slate-200 text-sm block">{player.displayName}</span>
                                        <span className="text-xs text-slate-500">Razina {player.level}</span>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                    {player.status === 'playing'
                                        ? <Gamepad2 className="w-3.5 h-3.5" />
                                        : <Clock className="w-3.5 h-3.5" />}
                                    {meta.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
