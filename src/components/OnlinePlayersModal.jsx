import { X, Swords } from 'lucide-react';
import OnlinePlayersList from './OnlinePlayersList';

export default function OnlinePlayersModal({ isOpen, onClose, currentUid, onInvite }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 relative max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <Swords className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">1v1 Dvoboj</h2>
                            <p className="text-xs text-slate-400">Izazovi drugog igrača na dvoboj</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <OnlinePlayersList currentUid={currentUid} onInvite={onInvite} />

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
