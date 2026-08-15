import { Sparkles, X, RefreshCw, Crown, ListChecks, PenSquare, Swords } from 'lucide-react';
import { JOKER_COSTS } from '../constants/gameBalance';
import { getCoinsForLevelUp } from '../utils/leveling';
import { MAX_TITLED_LEVEL } from '../constants/levelTitles';
import { MISSION_REWARDS } from '../constants/missions';

// One-time "what's new" announcement for the 2026-08-15 economy rebalance -
// see App.jsx for the localStorage-gated trigger (shown once, same idiom as
// the daily-win-announcement ack flags). Not a form, so no submit state
// machine - closer in shape to GuideModal than ReportQuestionModal.
export default function WhatsNewModal({ isOpen, onClose, onOpenGuide }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 relative max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4 pt-1 mb-2">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">Što je novo</h2>
                            <p className="text-xs text-slate-400">Velika nadogradnja ekonomije i napredovanja</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-1.5">
                    <p className="text-sm font-black text-amber-300 flex items-center gap-1.5">
                        <RefreshCw className="w-4 h-4 shrink-0" /> Razina i XP su resetirani
                    </p>
                    <p className="text-xs text-slate-300">
                        Zbog nove formule napredovanja, svačija razina i XP su vraćeni na početak. <b className="text-white">Tvoji novčići su sačuvani</b> - ništa nije izgubljeno osim razine, koju ćeš brzo ponovno dosegnuti uz nove, brojnije izvore nagrada.
                    </p>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                    <h3 className="text-sm font-black text-white">Nova ekonomija</h3>
                    <div className="text-xs text-slate-300 space-y-1.5">
                        <p>Nova, jasnija XP krivulja i razina - svaka nosi vlastitu titulu (do razine {MAX_TITLED_LEVEL}) i novčani bonus pri usponu (od {getCoinsForLevelUp(1)} novčića).</p>
                        <p>Novi troškovi jokera: 50:50 ({JOKER_COSTS.fiftyFifty}c), +10s ({JOKER_COSTS.plusTen}c), Preskoči ({JOKER_COSTS.skip}c).</p>
                        <p>Nizovi točnih odgovora sada donose novčiće na 3., 5. i 10. odgovoru zaredom. Trofeji, 1v1 pobjede i Dnevni izazov sada donose i XP i novčiće.</p>
                    </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                    <h3 className="text-sm font-black text-white">Nove značajke</h3>
                    <div className="text-xs text-slate-300 space-y-2">
                        <p className="flex items-center gap-1.5"><Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" /> 50 titula igrača, od početnika do vrhunskog majstora.</p>
                        <p className="flex items-center gap-1.5"><ListChecks className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Dnevne misije - 3 nove misije svaki dan, s bonus novčićima za sve 3 (+{MISSION_REWARDS.CLEAN_SWEEP_BONUS}).</p>
                        <p className="flex items-center gap-1.5"><PenSquare className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Predloži vlastito pitanje za igru i osvoji nagradu kad ga admin odobri.</p>
                        <p className="flex items-center gap-1.5"><Swords className="w-3.5 h-3.5 text-amber-400 shrink-0" /> 1v1 dvoboji i Dnevni izazov sada donose XP i novčiće, uključujući bonus za uzastopne pobjede.</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onOpenGuide}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-xl transition-colors text-sm border border-slate-700/80"
                    >
                        Pogledaj Vodič
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl transition-colors text-sm"
                    >
                        Razumijem
                    </button>
                </div>
            </div>
        </div>
    );
}
