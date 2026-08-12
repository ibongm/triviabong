import { Trophy, RefreshCw, Play } from 'lucide-react';
import { getCategoryDetails } from '../utils/categoryDisplay';

export default function LeaderboardScreen({
    selectedCategory,
    isLoadingLeaderboard,
    activeCategoryLeaderboard,
    onReturnToLobby,
    onLaunchQuizRound,
}) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 text-center">
            <div className="flex items-center justify-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <Trophy className="w-8 h-8" />
                </div>
                <div className="text-left">
                    <h2 className="text-2xl font-black text-white">
                        {getCategoryDetails(selectedCategory).label}
                    </h2>
                    <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                        Najbolji Rezultati
                    </p>
                </div>
            </div>

            <div className="bg-slate-950/60 rounded-2xl border border-slate-800 overflow-hidden divide-y divide-slate-800/80 min-h-[160px] flex flex-col justify-center">
                {isLoadingLeaderboard ? (
                    <div className="p-6 text-slate-400 text-sm animate-pulse flex justify-center items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                        <span>Učitavanje ljestvice...</span>
                    </div>
                ) : activeCategoryLeaderboard.length > 0 ? (
                    activeCategoryLeaderboard.slice(0, 5).map((entry, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3.5 text-sm px-5">
                            <span className="font-semibold text-slate-300 flex items-center gap-3">
                                <span className={`text-xs font-extrabold w-6 h-6 rounded-lg flex items-center justify-center ${idx === 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                                    #{idx + 1}
                                </span>
                                <span>{entry.name}</span>
                            </span>
                            <span className="text-amber-400 font-bold">{entry.score} bod.</span>
                        </div>
                    ))
                ) : (
                    <div className="p-6 text-slate-500 text-xs">
                        Još nema zabilježenih rezultata za ovu kategoriju. Budite prvi!
                    </div>
                )}
            </div>

            <div className="flex gap-3 pt-2">
                <button
                    onClick={onReturnToLobby}
                    className="flex-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold py-3.5 rounded-2xl transition-colors text-sm active:scale-[0.97] active:brightness-95"
                >
                    Natrag
                </button>
                <button
                    onClick={onLaunchQuizRound}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3.5 rounded-2xl transition-colors shadow-lg shadow-amber-500/20 flex justify-center items-center gap-2 text-sm active:scale-[0.97] active:brightness-95"
                >
                    <Play className="w-4 h-4 fill-slate-950" /> Započni Kviz
                </button>
            </div>
        </div>
    );
}
