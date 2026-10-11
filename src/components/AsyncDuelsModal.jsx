import { useEffect, useMemo, useState } from 'react';
import { X, Swords, RefreshCw, Shuffle, Hourglass, Play, Eye, Crown, Skull, Handshake } from 'lucide-react';
import { getAllCategories } from '../data/questionsLoader';
import { CATEGORY_META } from '../data/categoryMeta';
import { getMatchHistory } from '../services/matches';
import { filterOnlinePlayers } from '../utils/presenceUtils';
import { ANY_CATEGORY, deriveDuelState, myOutcome, MAX_OPEN_DUELS_AS_CHALLENGER } from '../utils/asyncDuel';
import { categoryLabelFor } from '../utils/duelLabels';

const STATE_META = {
    my_turn: { label: 'Tvoj potez', tone: 'text-emerald-400', action: 'Igraj', icon: Play },
    resume: { label: 'Nastavi', tone: 'text-amber-400', action: 'Nastavi', icon: Play },
    waiting_for_opponent: { label: 'Čeka protivnika', tone: 'text-slate-400', action: 'Pogledaj', icon: Eye },
    reconcile: { label: 'Čeka protivnika', tone: 'text-slate-400', action: 'Pogledaj', icon: Eye },
    finalize: { label: 'Istekao', tone: 'text-slate-500', action: null, icon: Hourglass },
    expired: { label: 'Istekao', tone: 'text-slate-500', action: null, icon: Hourglass },
    complete: { label: 'Završeno', tone: 'text-slate-300', action: 'Pregled', icon: Eye },
};

const formatTimeLeft = (expiresAt, now) => {
    const ms = (expiresAt?.toMillis?.() ?? 0) - now;
    if (ms <= 0) return 'isteklo';
    const h = Math.floor(ms / 3600000);
    return h >= 1 ? `još ${h} h` : `još ${Math.max(1, Math.round(ms / 60000))} min`;
};

// "Izazovi": challenge a player (online or a recent opponent), play a random
// opponent, and the inbox ("Moji dvoboji"). Everything it shows comes from
// the one-shot fetch in useAsyncDuels - no listeners.
export default function AsyncDuelsModal({
    isOpen,
    onClose,
    currentUid,
    onlinePlayers,
    duels,
    myResults,
    isLoading,
    busy,
    message,
    challengeLimitReached,
    onRefresh,
    onOpenDuel,
    onChallenge,
    onPlayRandom,
}) {
    const categories = useMemo(() => getAllCategories(), []);
    const [category, setCategory] = useState(ANY_CATEGORY);
    const [recent, setRecent] = useState([]);
    // Wall clock for "is this player online" / "time left"; ticks only while open.
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!isOpen) return undefined;
        const interval = setInterval(() => setNow(Date.now()), 15000);
        return () => clearInterval(interval);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !currentUid) return undefined;
        let cancelled = false;
        getMatchHistory(currentUid, 15).then((entries) => {
            if (cancelled) return;
            const seen = new Set();
            const unique = [];
            for (const e of entries) {
                if (!e.opponentUid || seen.has(e.opponentUid)) continue;
                seen.add(e.opponentUid);
                unique.push({ uid: e.opponentUid, name: e.opponentDisplayName });
            }
            setRecent(unique.slice(0, 6));
        });
        return () => { cancelled = true; };
    }, [isOpen, currentUid]);

    if (!isOpen) return null;

    const online = (onlinePlayers ? filterOnlinePlayers(onlinePlayers, currentUid, now) : [])
        .map((p) => ({ uid: p.uid, name: p.displayName }));
    const onlineIds = new Set(online.map((p) => p.uid));
    const candidates = [...online, ...recent.filter((r) => !onlineIds.has(r.uid) && r.uid !== currentUid)];

    const rows = duels.map((d) => ({ duel: d, state: deriveDuelState(d, myResults[d.id], now) }));
    const order = { my_turn: 0, resume: 1, waiting_for_opponent: 2, reconcile: 2, complete: 3, finalize: 4, expired: 4 };
    rows.sort((a, b) => (order[a.state] - order[b.state]));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
                <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="shrink-0 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <Swords className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-xl font-black text-white">Izazovi</h2>
                            <p className="text-xs text-slate-400 leading-snug">Dvoboj bez čekanja — protivnik igra kad stigne (48 h)</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="shrink-0 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors" aria-label="Zatvori">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {message && (
                    <p className={`text-sm rounded-lg p-3 ${message.type === 'success' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border border-rose-500/30'}`}>
                        {message.text}
                    </p>
                )}

                <div className="space-y-3">
                    <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider">Kategorija</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 px-3 py-2"
                    >
                        <option value={ANY_CATEGORY}>Bilo koja kategorija</option>
                        {categories.map((key) => (
                            <option key={key} value={key}>{CATEGORY_META[key]?.label || key}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => onPlayRandom(category)}
                        disabled={busy}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black py-3 rounded-2xl transition-colors active:scale-[0.97]"
                    >
                        <Shuffle className="w-4 h-4" /> Nasumični protivnik
                    </button>
                    {challengeLimitReached && (
                        <p className="text-xs text-amber-400">Imaš {MAX_OPEN_DUELS_AS_CHALLENGER} otvorenih izazova — pričekaj da se neki završi.</p>
                    )}
                </div>

                <div className="space-y-2">
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Izazovi igrača</h3>
                    {candidates.length === 0 ? (
                        <p className="text-sm text-slate-500 bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-center">
                            Nema igrača na mreži ni nedavnih protivnika. Probaj nasumičnog protivnika.
                        </p>
                    ) : (
                        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl divide-y divide-slate-800">
                            {candidates.map((p) => (
                                <div key={p.uid} className="flex items-center justify-between gap-3 p-3">
                                    <div className="min-w-0 flex-1 flex items-center gap-2">
                                        <span className="text-sm font-bold text-slate-200 truncate">{p.name}</span>
                                        {onlineIds.has(p.uid) && <span className="shrink-0 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">na mreži</span>}
                                    </div>
                                    <button
                                        onClick={() => onChallenge(p, category)}
                                        disabled={busy || challengeLimitReached}
                                        className="shrink-0 text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2.5 py-1.5 disabled:opacity-40 active:scale-95"
                                    >
                                        <Swords className="w-3.5 h-3.5" /> Izazovi
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Moji dvoboji</h3>
                        <button onClick={() => onRefresh({ force: true })} disabled={isLoading} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 disabled:opacity-50">
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Osvježi
                        </button>
                    </div>
                    {rows.length === 0 ? (
                        <p className="text-sm text-slate-500 bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-center">
                            {isLoading ? 'Učitavanje...' : 'Još nema dvoboja.'}
                        </p>
                    ) : (
                        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl divide-y divide-slate-800">
                            {rows.map(({ duel, state }) => {
                                const meta = STATE_META[state] || STATE_META.expired;
                                const mine = duel.challengerUid === currentUid;
                                const other = (mine ? duel.opponentName : duel.challengerName) || 'Nasumični protivnik';
                                const outcome = state === 'complete' ? myOutcome(duel, currentUid) : null;
                                const OutcomeIcon = outcome === 'win' ? Crown : outcome === 'loss' ? Skull : outcome === 'draw' ? Handshake : null;
                                const Action = meta.icon;
                                return (
                                    <div key={duel.id} className="flex items-center justify-between gap-3 p-3">
                                        <div className="min-w-0">
                                            <div className="text-sm font-bold text-slate-200 truncate flex items-center gap-1.5">
                                                {OutcomeIcon && <OutcomeIcon className={`w-3.5 h-3.5 shrink-0 ${outcome === 'win' ? 'text-amber-400' : outcome === 'loss' ? 'text-rose-400' : 'text-slate-400'}`} />}
                                                {mine ? `Ti → ${other}` : `${other} → ti`}
                                            </div>
                                            <div className="text-xs text-slate-500 leading-snug break-words">
                                                {categoryLabelFor(duel.category)} · <span className={meta.tone}>{meta.label}</span>
                                                {state !== 'complete' && state !== 'expired' && state !== 'finalize' && ` · ${formatTimeLeft(duel.expiresAt, now)}`}
                                            </div>
                                        </div>
                                        {meta.action && (
                                            <button
                                                onClick={() => onOpenDuel(duel)}
                                                disabled={busy}
                                                className="text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg px-3 py-1.5 flex items-center gap-1 disabled:opacity-50 active:scale-95 shrink-0"
                                            >
                                                <Action className="w-3.5 h-3.5" /> {meta.action}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <button onClick={onClose} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold py-3 rounded-xl transition-colors text-sm border border-slate-700/80">
                    Zatvori
                </button>
            </div>
        </div>
    );
}
