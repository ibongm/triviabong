import React from 'react';
import { X, Trophy, Target, Award, Flame, Zap, BarChart2 } from 'lucide-react';
import { CATEGORY_META } from '../data/categoryMeta';
import { xpForLevel } from '../utils/leveling';
import { getTitleForLevel } from '../constants/levelTitles';
import { getVisibleAchievements } from '../constants/achievements';
import MatchHistoryList from './MatchHistoryList';
import LevelBadge from './LevelBadge';

export default function StatsModal({ isOpen, onClose, stats, onOpenAchievements, uid }) {
    if (!isOpen) return null;

    const categoryStats = stats?.categoryStats || {};
    const totalAnswered = stats?.totalAnswered || 0;
    const totalCorrect = stats?.totalCorrect || 0;
    const overallAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
    const unlockedAchievements = stats?.unlockedAchievements || {};
    const unlockedTrophiesCount = Object.keys(unlockedAchievements).length;
    const visibleTrophiesCount = getVisibleAchievements(unlockedAchievements).length;

    const level = stats?.level || 1;
    const xp = stats?.xp || 0;
    // The leveling curve is tiered, not flat, so progress-within-a-level is
    // measured against this level's own XP window rather than a flat modulo.
    // Math.max(0, ...) guards an admin-overridden level whose stored xp
    // hasn't caught up to that level's threshold yet.
    const currentLevelXp = xpForLevel(level);
    const nextLevelXp = xpForLevel(level + 1);
    const xpIntoLevel = Math.max(0, xp - currentLevelXp);
    const xpNeededForNext = nextLevelXp - currentLevelXp;
    const xpProgressPct = xpNeededForNext > 0 ? Math.min(100, Math.round((xpIntoLevel / xpNeededForNext) * 100)) : 100;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="sticky top-0 z-10 bg-slate-900 flex justify-between items-center border-b border-slate-800 pb-4 pt-1 mb-2">
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
                        <span className="flex items-center gap-2 text-sm font-black text-white">
                            <LevelBadge level={level} size="md" />
                            <span className="flex flex-col leading-tight">
                                <span>Razina {level}</span>
                                <span className="text-xs font-semibold text-amber-400/80">{getTitleForLevel(level)}</span>
                            </span>
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                            {xpIntoLevel} / {xpNeededForNext} XP do sljedeće razine
                        </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div
                            className="h-full bg-amber-500 transition-all duration-500 rounded-full"
                            style={{ width: `${xpProgressPct}%` }}
                        />
                    </div>
                </div>

                {/* Trofeji Row */}
                <div className="flex justify-between items-center bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-extrabold text-slate-200">Otključani Trofeji</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-amber-400">{unlockedTrophiesCount} / {visibleTrophiesCount}</span>
                        {onOpenAchievements && (
                            <button
                                onClick={() => { onClose(); onOpenAchievements(); }}
                                className="text-xs font-bold text-amber-400 hover:underline ml-1"
                            >
                                Pregled →
                            </button>
                        )}
                    </div>
                </div>

                {/* Global Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl text-center space-y-1">
                        <div className="flex justify-center text-amber-400">
                            <Trophy className="w-4 h-4" />
                        </div>
                        <div className="text-lg font-black text-white">{stats?.totalGames || 0}</div>
                        <div className="text-xs font-bold text-slate-400 uppercase">Odigrano</div>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl text-center space-y-1">
                        <div className="flex justify-center text-emerald-400">
                            <Target className="w-4 h-4" />
                        </div>
                        <div className="text-lg font-black text-white">{overallAccuracy}%</div>
                        <div className="text-xs font-bold text-slate-400 uppercase">Točnost</div>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl text-center space-y-1">
                        <div className="flex justify-center text-rose-400">
                            <Flame className="w-4 h-4" />
                        </div>
                        <div className="text-lg font-black text-white">{stats?.maxStreak || 0}x</div>
                        <div className="text-xs font-bold text-slate-400 uppercase">Max Niz</div>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl text-center space-y-1">
                        <div className="flex justify-center text-amber-400">
                            <Zap className="w-4 h-4" />
                        </div>
                        <div className="text-lg font-black text-white">{stats?.totalScore || 0}</div>
                        <div className="text-xs font-bold text-slate-400 uppercase">Bodovi</div>
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

                <MatchHistoryList uid={uid} />

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