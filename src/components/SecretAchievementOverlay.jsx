import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { sound } from '../utils/sound';

// Full-screen reveal for a hidden achievement. Named generically rather than
// after the one that exists today, so a second secret trophy can reuse it.
//
// Deliberately NOT self-dismissing: the round is paused behind this (the
// countdown froze the moment the answer was selected), and it stays paused
// until onClose runs the deferred advance. z-[60] rather than the usual z-50
// because the header's Trofeji modal stays reachable during PLAYING and
// would otherwise sit on top of this.
export default function SecretAchievementOverlay({ isOpen, achievement, onClose }) {
    useEffect(() => {
        if (!isOpen) return;
        sound.playFanfare();
        confetti({
            particleCount: 180,
            spread: 100,
            origin: { y: 0.6 },
            colors: ['#7F0909', '#EEBA30', '#F8F8FF'],
        });
    }, [isOpen]);

    if (!isOpen || !achievement) return null;

    const Icon = achievement.icon;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-slate-900 border border-violet-500/40 rounded-3xl p-6 shadow-2xl text-center space-y-4">

                <div className="flex justify-center">
                    <div className="p-4 rounded-2xl bg-violet-500/15 border border-violet-500/30 text-violet-300 animate-pulse">
                        <Icon className="w-9 h-9" />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <p className="text-[11px] font-extrabold text-violet-300 uppercase tracking-[0.2em]">
                        Tajni trofej otključan!
                    </p>
                    <h2 className="text-2xl font-black text-white">{achievement.nameHr}</h2>
                    <p className="text-sm text-slate-300">{achievement.descriptionHr}</p>
                </div>

                <button
                    onClick={onClose}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl transition-colors text-sm"
                >
                    Nastavi
                </button>

            </div>
        </div>
    );
}
