import { Heart, Zap, Flag, Scissors, Clock, FastForward } from 'lucide-react';
import TimerRing from '../components/TimerRing';
import { getCategoryDetails, checkIsCorrect } from '../utils/categoryDisplay';
import { sound } from '../utils/sound';
import { MAX_LIVES, QUESTION_TIME_SECONDS, PLUS_TEN_SECONDS, JOKER_COSTS } from '../constants/gameBalance';

export default function PlayingScreen({
    lives,
    timeLeft,
    score,
    currentQ,
    selectedCategory,
    currentIndex,
    questionsLength,
    onShowReportModal,
    currentShuffledOptions,
    hiddenOptions,
    selectedOption,
    answerLocked,
    onAnswer,
    fiftyFiftyLocked,
    fiftyFiftyShort,
    plusTenLocked,
    plusTenShort,
    skipLocked,
    skipShort,
    coins,
    onShowJokerMessage,
    onActivateFiftyFifty,
    onActivatePlusTen,
    onActivateSkip,
    jokerMessage,
}) {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-2xl text-xs font-bold">
                <div className="flex items-center gap-1">
                    {Array.from({ length: MAX_LIVES }, (_, i) => (
                        <Heart
                            key={i}
                            className={i < lives ? 'w-4 h-4 text-rose-500 fill-rose-500' : 'w-4 h-4 text-slate-700 fill-none'}
                        />
                    ))}
                </div>
                <TimerRing timeLeft={timeLeft} totalTime={QUESTION_TIME_SECONDS} />
                <div className="flex items-center gap-1.5 text-slate-300">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Bodovi: {score}</span>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
                <div className="flex justify-between items-center text-xs text-slate-400 font-bold">
                    {/* Opće znanje is an aggregate pool (see questionsLoader.js), so
                        show each question's real source category rather than the
                        generic "Opće znanje" label for every question. */}
                    <span className="uppercase tracking-wider">{getCategoryDetails(currentQ.category || selectedCategory).label}</span>
                    <div className="flex items-center gap-2">
                        <span>{currentIndex + 1} / {questionsLength}</span>
                        <button
                            type="button"
                            onClick={() => { sound.playClick(); onShowReportModal(); }}
                            className="flex items-center gap-1 text-slate-500 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 rounded-lg px-1.5 py-1 transition-colors active:scale-90"
                        >
                            <Flag className="w-3.5 h-3.5" />
                            <span>Prijavi pitanje</span>
                        </button>
                    </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-display font-black text-white leading-snug">
                    {currentQ.question || currentQ.tekst || currentQ.pitanje}
                </h2>

                <div className="grid grid-cols-1 gap-3">
                    {currentShuffledOptions.map((option, idx) => {
                        const isHidden = hiddenOptions.includes(idx);
                        if (isHidden) return null;

                        const isCorrect = checkIsCorrect(currentQ, option);

                        let btnStyle = "bg-slate-950/60 hover:bg-slate-800 border-slate-800 text-slate-200";
                        if (selectedOption !== null) {
                            if (isCorrect) {
                                if (selectedOption === option) {
                                    btnStyle = "bg-emerald-500/30 border-emerald-400 text-emerald-300 font-bold shadow-lg shadow-emerald-500/10";
                                } else {
                                    btnStyle = "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold";
                                }
                            } else if (option === selectedOption) {
                                btnStyle = "bg-rose-500/30 border-rose-500 text-rose-300 font-bold";
                            }
                        }

                        return (
                            <button
                                key={idx}
                                disabled={selectedOption !== null || answerLocked}
                                onClick={() => onAnswer(option)}
                                className={`w-full p-4 rounded-2xl border text-left font-semibold text-sm transition-all flex justify-between items-center active:scale-[0.97] active:brightness-95 ${btnStyle}`}
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="hidden sm:inline-flex items-center justify-center w-5 h-5 rounded-md bg-slate-800/80 border border-slate-700/80 text-[10px] font-black text-amber-400/90 shrink-0">
                                        {idx + 1}
                                    </span>
                                    <span className="truncate">{option}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="flex justify-center gap-2 pt-2 border-t border-slate-800/80">
                    <button
                        disabled={fiftyFiftyLocked}
                        title={fiftyFiftyShort ? `Cijena: ${JOKER_COSTS.fiftyFifty}c (imaš ${coins}c)` : undefined}
                        onClick={() => {
                            if (fiftyFiftyShort) { onShowJokerMessage(`Nemaš dovoljno zlatnika (potrebno ${JOKER_COSTS.fiftyFifty}c)`); return; }
                            onActivateFiftyFifty();
                        }}
                        className={`px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 disabled:opacity-40 flex items-center gap-1 active:scale-95 active:brightness-95 ${!fiftyFiftyLocked && fiftyFiftyShort ? 'opacity-40' : ''}`}
                    >
                        <Scissors className="w-3.5 h-3.5 text-amber-400" /> 50:50 ({JOKER_COSTS.fiftyFifty}c)
                    </button>
                    <button
                        disabled={plusTenLocked}
                        title={plusTenShort ? `Cijena: ${JOKER_COSTS.plusTen}c (imaš ${coins}c)` : undefined}
                        onClick={() => {
                            if (plusTenShort) { onShowJokerMessage(`Nemaš dovoljno zlatnika (potrebno ${JOKER_COSTS.plusTen}c)`); return; }
                            onActivatePlusTen();
                        }}
                        className={`px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 disabled:opacity-40 flex items-center gap-1 active:scale-95 active:brightness-95 ${!plusTenLocked && plusTenShort ? 'opacity-40' : ''}`}
                    >
                        <Clock className="w-3.5 h-3.5 text-amber-400" /> +{PLUS_TEN_SECONDS}s ({JOKER_COSTS.plusTen}c)
                    </button>
                    <button
                        disabled={skipLocked}
                        title={skipShort ? `Cijena: ${JOKER_COSTS.skip}c (imaš ${coins}c)` : undefined}
                        onClick={() => {
                            if (skipShort) { onShowJokerMessage(`Nemaš dovoljno zlatnika (potrebno ${JOKER_COSTS.skip}c)`); return; }
                            onActivateSkip();
                        }}
                        className={`px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 disabled:opacity-40 flex items-center gap-1 active:scale-95 active:brightness-95 ${!skipLocked && skipShort ? 'opacity-40' : ''}`}
                    >
                        <FastForward className="w-3.5 h-3.5 text-amber-400" /> Preskoči ({JOKER_COSTS.skip}c)
                    </button>
                </div>
                {jokerMessage && (
                    <p className="text-center text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl py-2">
                        {jokerMessage}
                    </p>
                )}
            </div>
        </div>
    );
}
