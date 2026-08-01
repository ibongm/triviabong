import React from 'react';
import { X, Trophy, Target, Award, Flame, Zap, BarChart2, Star } from 'lucide-react';
import { CATEGORY_META } from '../data/categoryMeta';
import { XP_PER_LEVEL } from '../utils/leveling';

export default function StatsModal({ isOpen, onClose, stats }) {
    if (!isOpen) return null;

    const categoryStats = stats?.categoryStats || {};
    const totalAnswered = stats?.totalAnswered || 0;
    const totalCorrect = stats?.totalCorrect || 0;
    const overallAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

    const level = stats?.level || 1;
    const xp = stats?.xp || 0;
    const xpIntoLevel = xp % XP_PER_LEVEL;
    const xpProgressPct = Math.round((xpIntoLevel / XP_PER_LEVEL) * 100);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                            <BarChart2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">Statistika Igrača</h2>
                            <p className="text-xs text-slate-400">Pregled napretka i točnosti po kategorijama</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Level / XP Progress */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5 text-sm font-black text-white">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> Razina {level}
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                            {xpIntoLevel} / {XP_PER_LEVEL} XP do sljedeće razine
                        </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div
                            className="h-full bg-amber-500 transition-all duration-500 rounded-full"
                            style={{ width: `${xpProgressPct}%` }}
                        />
                    </div>
                </div>

                {/* Global Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl text-center space-y-1">
                        <div className="flex justify-center text-amber-400">
                            <Trophy className="w-4 h-4" />
                        </div>
                        <div className="text-lg font-black text-white">{stats?.totalGames || 0}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Odigrano</div>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl text-center space-y-1">
                        <div className="flex justify-center text-emerald-400">
                            <Target className="w-4 h-4" />
                        </div>
                        <div className="text-lg font-black text-white">{overallAccuracy}%</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Točnost</div>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl text-center space-y-1">
                        <div className="flex justify-center text-rose-400">
                            <Flame className="w-4 h-4" />
                        </div>
                        <div className="text-lg font-black text-white">{stats?.maxStreak || 0}x</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Max Niz</div>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl text-center space-y-1">
                        <div className="flex justify-center text-amber-400">
                            <Zap className="w-4 h-4" />
                        </div>
                        <div className="text-lg font-black text-white">{stats?.totalScore || 0}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Bodovi</div>
                    </div>
                </div>

                {/* Category Accuracy Breakdown */}
                <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-amber-400" /> Profil Točnosti po Kategorijama
                    </h3>

                    <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                        {Object.keys(CATEGORY_META).map((catKey) => {
                            const catData = categoryStats[catKey] || { total: 0, correct: 0 };
                            const acc = catData.total > 0 ? Math.round((catData.correct / catData.total) * 100) : 0;
                            const label = CATEGORY_META[catKey]?.label;

                            return (
                                <div key={catKey} className="space-y-1">
                                    <div className="flex justify-between items-center text-xs font-bold">
                                        <span className="text-slate-300">{label}</span>
                                        <span className="text-slate-400">
                                            <span className="text-amber-400 font-black">{acc}%</span> ({catData.correct}/{catData.total})
                                        </span>
                                    </div>
                                    <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                        <div
                                            className={`h-full transition-all duration-500 rounded-full ${acc >= 80
                                                    ? 'bg-emerald-500'
                                                    : acc >= 50
                                                        ? 'bg-amber-500'
                                                        : catData.total > 0
                                                            ? 'bg-rose-500'
                                                            : 'bg-slate-800'
                                                }`}
                                            style={{ width: `${acc}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

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