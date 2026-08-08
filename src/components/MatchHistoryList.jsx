import { useEffect, useState } from 'react';
import { Swords, Crown, Handshake, Skull } from 'lucide-react';
import { CATEGORY_META } from '../data/categoryMeta';
import { getMatchHistory } from '../services/matches';

const RESULT_META = {
    win: { label: 'Pobjeda', icon: Crown, className: 'text-emerald-400' },
    loss: { label: 'Poraz', icon: Skull, className: 'text-rose-400' },
    draw: { label: 'Neriješeno', icon: Handshake, className: 'text-slate-400' },
};

// Owner-only 1v1 match history (see firestore.rules matchHistory/{uid}) -
// self-fetches on mount rather than being threaded through App.jsx state,
// since it's only ever needed here (inside StatsModal) and StatsModal is
// already lazily rendered only while open.
export default function MatchHistoryList({ uid }) {
    const [entries, setEntries] = useState(null);

    useEffect(() => {
        if (!uid) return;
        let cancelled = false;
        getMatchHistory(uid).then(result => {
            if (!cancelled) setEntries(result);
        });
        return () => { cancelled = true; };
    }, [uid]);

    if (!uid) return null;

    return (
        <div className="space-y-3 pt-2">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Swords className="w-4 h-4 text-emerald-400" /> Povijest 1v1 Dvoboja
            </h3>

            {entries === null ? (
                <p className="text-xs text-slate-500 text-center py-3">Učitavanje...</p>
            ) : entries.length === 0 ? (
                <p className="text-xs text-slate-500 bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-center">
                    Još nisi odigrao/la nijedan 1v1 dvoboj.
                </p>
            ) : (
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl divide-y divide-slate-800">
                    {entries.map(entry => {
                        const meta = RESULT_META[entry.result] || RESULT_META.draw;
                        const Icon = meta.icon;
                        const categoryLabel = CATEGORY_META[entry.category]?.label || entry.category;
                        return (
                            <div key={entry.id} className="flex items-center justify-between p-3 text-xs">
                                <div className="flex items-center gap-2">
                                    <Icon className={`w-3.5 h-3.5 shrink-0 ${meta.className}`} />
                                    <div>
                                        <span className="font-bold text-slate-200 block">
                                            protiv {entry.opponentDisplayName}
                                        </span>
                                        <span className="text-slate-500 capitalize">{categoryLabel}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`font-black block ${meta.className}`}>{meta.label}</span>
                                    <span className="text-slate-500">{entry.myScore} : {entry.opponentScore}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
