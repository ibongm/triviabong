import { useEffect, useMemo, useState } from 'react';
import { getSessionsForUser } from '../../services/firebase';
import { summarizeSessionsByPeriod, formatDuration } from '../../utils/sessionStats';
import { ACHIEVEMENTS } from '../../constants/achievements';

const PERIODS = [
    { key: 'daily', label: 'Danas' },
    { key: 'weekly', label: 'Ovaj tjedan' },
    { key: 'all', label: 'Ukupno' },
];

export default function AdminPlayerDetail({ user, onClose, onEdit }) {
    const [sessions, setSessions] = useState([]);
    const [sessionsLoading, setSessionsLoading] = useState(true);
    const [period, setPeriod] = useState('daily');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const data = await getSessionsForUser(user.uid);
            if (!cancelled) {
                setSessions(data);
                setSessionsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [user.uid]);

    const periodSeconds = useMemo(
        () => summarizeSessionsByPeriod(sessions, period),
        [sessions, period]
    );

    const unlocked = user.unlockedAchievements || {};
    const trophyCount = Object.keys(unlocked).length;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#121824] border border-slate-800 text-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <img
                            src={user.photoURL || 'https://via.placeholder.com/48'}
                            alt="Avatar"
                            className="w-12 h-12 rounded-full border border-slate-700"
                        />
                        <div>
                            <h3 className="text-lg font-bold text-amber-400">{user.displayName || 'Igrač'}</h3>
                            <p className="text-xs text-slate-400">{user.email}</p>
                            <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${user.role === 'admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400'}`}>
                                {user.role || 'player'}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-300 shrink-0"
                    >
                        Zatvori
                    </button>
                </div>

                {/* XP / Level / Coins */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
                        <p className="text-slate-500 text-xs mb-1">Razina</p>
                        <p className="text-amber-400 font-bold text-lg">{user.level || 1}</p>
                    </div>
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
                        <p className="text-slate-500 text-xs mb-1">XP</p>
                        <p className="text-slate-200 font-bold text-lg">{user.xp || 0}</p>
                    </div>
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
                        <p className="text-slate-500 text-xs mb-1">Novčići</p>
                        <p className="text-yellow-400 font-bold text-lg">{user.coins || 0}</p>
                    </div>
                </div>

                {/* Session stats */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-slate-300">Vrijeme u aplikaciji</h4>
                        <div className="flex gap-1">
                            {PERIODS.map((p) => (
                                <button
                                    key={p.key}
                                    type="button"
                                    onClick={() => setPeriod(p.key)}
                                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                                        period === p.key
                                            ? 'bg-amber-500 text-slate-950'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-center">
                        {sessionsLoading ? (
                            <p className="text-slate-500 text-sm">Učitavanje...</p>
                        ) : (
                            <p className="text-emerald-400 font-bold text-xl">{formatDuration(periodSeconds)}</p>
                        )}
                    </div>
                </div>

                {/* Trophies */}
                <div className="mb-6">
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">
                        Trofeji <span className="text-slate-500 font-normal">({trophyCount} / {ACHIEVEMENTS.length})</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                        {ACHIEVEMENTS.map((a) => {
                            const unlockedAt = unlocked[a.id];
                            const Icon = a.icon;
                            return (
                                <div
                                    key={a.id}
                                    title={a.descriptionHr}
                                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${
                                        unlockedAt
                                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                            : 'bg-slate-950/40 border-slate-800 text-slate-600'
                                    }`}
                                >
                                    <Icon className="w-4 h-4 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="truncate font-medium">{a.nameHr}</p>
                                        {unlockedAt && (
                                            <p className="text-[10px] text-amber-400/70">
                                                {new Date(unlockedAt).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg font-medium"
                    >
                        Zatvori
                    </button>
                    <button
                        type="button"
                        onClick={() => onEdit(user)}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs rounded-lg font-bold"
                    >
                        Uredi
                    </button>
                </div>
            </div>
        </div>
    );
}
