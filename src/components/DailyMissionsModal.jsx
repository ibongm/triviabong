import { X, ListChecks, Check, Gift } from 'lucide-react';
import { MISSION_REWARDS } from '../constants/missions';

function SlotCard({ mission, slotState, onClaim }) {
    const pct = Math.min(100, Math.round((slotState.progress / mission.target) * 100));
    const claimable = slotState.completed && !slotState.claimed;

    return (
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-slate-200">{mission.descriptionHr}</p>
                {slotState.claimed && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${slotState.completed ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">{Math.min(slotState.progress, mission.target)} / {mission.target}</p>
                {claimable ? (
                    <button
                        type="button"
                        onClick={onClaim}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1 rounded-lg text-xs"
                    >
                        Preuzmi +{MISSION_REWARDS.SLOT_COMPLETION}
                    </button>
                ) : slotState.claimed ? (
                    <p className="text-xs text-emerald-400 font-bold">Preuzeto</p>
                ) : (
                    <p className="text-xs text-slate-600">+{MISSION_REWARDS.SLOT_COMPLETION} novčića</p>
                )}
            </div>
        </div>
    );
}

// Daily micro-missions review/claim UI - see hooks/useDailyMissions.js for
// the tracking/persistence logic this only reads from and calls into.
export default function DailyMissionsModal({ isOpen, onClose, missionsToday, missionState, onClaimSlot, onClaimCleanSweep }) {
    if (!isOpen) return null;

    if (!missionState) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center space-y-3">
                    <p className="text-sm text-slate-300">Prijavi se da bi pratio/la dnevne misije.</p>
                    <button onClick={onClose} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-xl text-sm">
                        Zatvori
                    </button>
                </div>
            </div>
        );
    }

    const allClaimed = ['slot1', 'slot2', 'slot3'].every((k) => missionState.slots[k].claimed);
    const cleanSweepClaimable = allClaimed && !missionState.cleanSweepClaimed;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                        <ListChecks className="w-4 h-4" /> Dnevne misije
                    </h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-2">
                    {['slot1', 'slot2', 'slot3'].map((slotKey) => (
                        <SlotCard
                            key={slotKey}
                            mission={missionsToday[slotKey]}
                            slotState={missionState.slots[slotKey]}
                            onClaim={() => onClaimSlot(slotKey)}
                        />
                    ))}
                </div>

                <div className={`rounded-xl p-3 flex items-center justify-between gap-2 border ${missionState.cleanSweepClaimed ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}>
                    <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-amber-400 shrink-0" />
                        <p className="text-xs text-slate-300">Sve 3 misije istog dana: <b className="text-white">+{MISSION_REWARDS.CLEAN_SWEEP_BONUS}</b> bonus novčića</p>
                    </div>
                    {missionState.cleanSweepClaimed ? (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : cleanSweepClaimable ? (
                        <button
                            type="button"
                            onClick={onClaimCleanSweep}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1 rounded-lg text-xs shrink-0"
                        >
                            Preuzmi
                        </button>
                    ) : null}
                </div>

                <button
                    onClick={onClose}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-xl text-sm"
                >
                    Zatvori
                </button>
            </div>
        </div>
    );
}
