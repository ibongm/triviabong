import { useState, useEffect } from 'react';
import { X, Medal, Star, Trophy, Flame, CalendarCheck, Zap } from 'lucide-react';
import {
    getPublicProfileLeaderboard,
    getBestScoresAcrossCategories,
    getFastestPerfectRounds
} from '../services/firebase';
import { CATEGORY_META } from '../data/categoryMeta';

const BOARDS = [
    { key: 'level', title: 'Najviša razina', icon: Star, unit: 'level', signedInOnly: true },
    { key: 'bestScore', title: 'Najbolji rezultat', icon: Zap, unit: 'score', signedInOnly: false },
    { key: 'fastestPerfect', title: 'Najbrža savršena runda', icon: Medal, unit: 'time', signedInOnly: false },
    { key: 'maxStreak', title: 'Najduži niz', icon: Flame, unit: 'streak', signedInOnly: true },
    { key: 'achievementCount', title: 'Najviše trofeja', icon: Trophy, unit: 'trophies', signedInOnly: true },
    { key: 'dayStreak', title: 'Najduži niz dana', icon: CalendarCheck, unit: 'days', signedInOnly: true },
];

const formatEntry = (board, entry) => {
    const categoryLabel = CATEGORY_META[entry.category]?.label || entry.category;
    switch (board.unit) {
        case 'score':
            return `${entry.name} — ${entry.score} bodova (${categoryLabel})`;
        case 'time':
            return `${entry.name} — ${(entry.elapsedMs / 1000).toFixed(1)}s (${categoryLabel})`;
        case 'level':
            return `${entry.displayName} — Razina ${entry.level}`;
        case 'streak':
            return `${entry.displayName} — ${entry.maxStreak}x niz`;
        case 'trophies':
            return `${entry.displayName} — ${entry.achievementCount} trofeja`;
        case 'days':
            return `${entry.displayName} — ${entry.dayStreak} dana zaredom`;
        default:
            return '';
    }
};

export default function RekordiModal({ isOpen, onClose }) {
    // data starts null (still-loading) rather than {} so "loading" can be
    // derived from it directly - avoids a second setState call synchronously
    // at the top of the effect (only reachable-after-await setState calls
    // below are needed, which is the accepted "fetch on open" shape).
    const [data, setData] = useState(null);

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        (async () => {
            const [level, bestScore, fastestPerfect, maxStreak, achievementCount, dayStreak] = await Promise.all([
                getPublicProfileLeaderboard('level', 10),
                getBestScoresAcrossCategories(10),
                getFastestPerfectRounds(10),
                getPublicProfileLeaderboard('maxStreak', 10),
                getPublicProfileLeaderboard('achievementCount', 10),
                getPublicProfileLeaderboard('dayStreak', 10),
            ]);
            if (cancelled) return;
            setData({ level, bestScore, fastestPerfect, maxStreak, achievementCount, dayStreak });
        })();
        return () => { cancelled = true; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 relative max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                            <Medal className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">Rekordi</h2>
                            <p className="text-xs text-slate-400">Globalni poretci svih igrača</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {data === null && <p className="text-slate-400 text-sm text-center py-4">Učitavanje...</p>}

                {data !== null && BOARDS.map((board) => {
                    const entries = data[board.key] || [];
                    const Icon = board.icon;
                    return (
                        <div key={board.key} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                            <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                                <Icon className="w-4 h-4 text-amber-400" /> {board.title}
                            </h3>
                            {entries.length === 0 ? (
                                <p className="text-xs text-slate-500 italic">Još nema rezultata.</p>
                            ) : (
                                <ol className="text-xs text-slate-300 space-y-1">
                                    {entries.map((entry, idx) => (
                                        <li key={entry.id || entry.uid} className="flex gap-2">
                                            <span className="text-amber-400 font-bold w-4 shrink-0">{idx + 1}.</span>
                                            <span className="truncate">{formatEntry(board, entry)}</span>
                                        </li>
                                    ))}
                                </ol>
                            )}
                            {board.signedInOnly && (
                                <p className="text-[10px] text-slate-600 italic">Samo prijavljeni igrači.</p>
                            )}
                        </div>
                    );
                })}

                {/* Footer */}
                <button
                    onClick={onClose}
                    className="w-full bg-slate-800 hover:bg-slate-750 text-slate-100 font-bold py-3 rounded-xl transition-colors text-sm border border-slate-700/80"
                >
                    Zatvori
                </button>

            </div>
        </div>
    );
}
