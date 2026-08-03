import { X, Trophy, Lock } from 'lucide-react';
import { ACHIEVEMENTS, ACHIEVEMENT_TIER_LABELS } from '../constants/achievements';

const TIERS = [1, 2, 3, 4, 5, 6];

// One row, shared by the pinned secret block and the tier lists, so the two
// can't drift apart. `pinned` only changes the accent colour.
function AchievementRow({ achievement, unlockedAt, pinned = false }) {
    const Icon = achievement.icon;
    const isUnlocked = !!unlockedAt;
    const accent = pinned
        ? 'bg-violet-500/10 border-violet-500/40'
        : 'bg-amber-500/10 border-amber-500/30';
    const iconAccent = pinned
        ? 'bg-violet-500/20 text-violet-300'
        : 'bg-amber-500/20 text-amber-400';

    return (
        <div className={`flex items-start gap-3 p-3 rounded-2xl border ${isUnlocked ? accent : 'bg-slate-950/60 border-slate-800'}`}>
            <div className={`p-2 rounded-xl shrink-0 ${isUnlocked ? iconAccent : 'bg-slate-900 text-slate-600'}`}>
                {isUnlocked ? <Icon className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
                {pinned && (
                    <p className="text-[10px] font-extrabold text-violet-300 uppercase tracking-wider mb-0.5">
                        Tajni trofej
                    </p>
                )}
                <p className={`text-sm font-bold ${isUnlocked ? 'text-white' : 'text-slate-500'}`}>{achievement.nameHr}</p>
                <p className={`text-xs ${isUnlocked ? 'text-slate-300' : 'text-slate-600'}`}>{achievement.descriptionHr}</p>
                {isUnlocked && (
                    <p className={`text-[10px] mt-0.5 ${pinned ? 'text-violet-300/80' : 'text-amber-400/80'}`}>
                        Otključano {new Date(unlockedAt).toLocaleDateString()}
                    </p>
                )}
            </div>
        </div>
    );
}

export default function AchievementsModal({ isOpen, onClose, stats }) {
    if (!isOpen) return null;

    const unlocked = stats?.unlockedAchievements || {};
    const unlockedCount = Object.keys(unlocked).length;
    // A hidden achievement is absent from the list AND from the denominator
    // until earned - showing "29 / 31" would itself leak that a 31st exists.
    const visibleAchievements = ACHIEVEMENTS.filter((a) => !a.hidden || unlocked[a.id]);
    const pinnedAchievements = visibleAchievements.filter((a) => a.hidden);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 relative max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                            <Trophy className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">Trofeji</h2>
                            <p className="text-xs text-slate-400">{unlockedCount} / {visibleAchievements.length} otključano</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {pinnedAchievements.length > 0 && (
                    <div className="space-y-2">
                        {pinnedAchievements.map((a) => (
                            <AchievementRow key={a.id} achievement={a} unlockedAt={unlocked[a.id]} pinned />
                        ))}
                    </div>
                )}

                {TIERS.map((tier) => (
                    <div key={tier} className="space-y-2">
                        <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                            {ACHIEVEMENT_TIER_LABELS[tier]}
                        </h3>
                        <div className="space-y-2">
                            {visibleAchievements.filter((a) => a.tier === tier).map((a) => (
                                <AchievementRow key={a.id} achievement={a} unlockedAt={unlocked[a.id]} />
                            ))}
                        </div>
                    </div>
                ))}

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
