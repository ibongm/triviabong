import { useState } from 'react';
import { X, Medal } from 'lucide-react';
import RekordiBoards from './RekordiBoards';
import PeriodBoards from './PeriodBoards';
import { isFeatureEnabled } from '../constants/features';

const TABS = [
    { key: 'weekly', label: 'Tjedno' },
    { key: 'season', label: 'Sezona' },
    { key: 'all', label: 'Svih vremena' },
];

export default function RekordiModal({ isOpen, onClose, data, currentUser = null }) {
    // Weekly / seasonal boards (engagement plan Phase 5). With the flag off
    // this modal is exactly the old all-time view, no tab bar.
    const periodBoardsEnabled = isFeatureEnabled('WEEKLY_BOARDS');
    const [tab, setTab] = useState('weekly');

    if (!isOpen) return null;

    const activeTab = periodBoardsEnabled ? tab : 'all';

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

                {periodBoardsEnabled && (
                    <div className="grid grid-cols-3 gap-1 bg-slate-950/60 border border-slate-800 rounded-xl p-1" role="tablist">
                        {TABS.map((t) => (
                            <button
                                key={t.key}
                                role="tab"
                                aria-selected={activeTab === t.key}
                                onClick={() => setTab(t.key)}
                                className={`py-2 rounded-lg text-xs font-bold transition-colors ${activeTab === t.key ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                )}

                {activeTab === 'all'
                    ? <RekordiBoards data={data} limitPerBoard={10} />
                    : <PeriodBoards kind={activeTab} currentUser={currentUser} />}

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
