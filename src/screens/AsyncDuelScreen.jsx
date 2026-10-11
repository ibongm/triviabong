import { useEffect, useRef, useState } from 'react';
import { Swords, Crown, Handshake, Skull, Check, X, Hourglass, Info } from 'lucide-react';
import TimerRing from '../components/TimerRing';
import { categoryLabelFor } from '../utils/duelLabels';
import { QUESTION_TIME_SECONDS } from '../constants/gameBalance';
import { getMatchQuestionOptions, isMatchAnswerCorrect } from '../utils/matchQuestions';
import { measuredAccuracyPercent } from '../utils/difficulty';
import { isFeatureEnabled } from '../constants/features';
import { DUEL_QUESTION_COUNT, myOutcome, secondsLeftFromMs } from '../utils/asyncDuel';
import { sound } from '../utils/sound';

const REVEAL_MS = 1200;
const QUESTION_MS = QUESTION_TIME_SECONDS * 1000;

// One 10-question run. Answers are held in memory (and mirrored to localStorage
// by the hook via onProgress) and written to Firestore ONCE, at the end - no
// per-question writes. No jokers, no lives, no explanations until the review.
function DuelPlay({ activeDuel, onProgress, onFinish, onExit }) {
    const { duel, questions, startIndex } = activeDuel;
    const [index, setIndex] = useState(startIndex);
    const [answers, setAnswers] = useState(activeDuel.answers);
    const [selected, setSelected] = useState(null);
    // Clock and question start are STATE (not refs / render-time Date.now()):
    // elapsed = now - questionStart is then a pure function of render state.
    // The 250 ms tick bounds the recorded answer time's precision, which is
    // plenty for a score that is rounded to whole seconds anyway.
    const [now, setNow] = useState(() => Date.now());
    const [questionStart, setQuestionStart] = useState(() => Date.now());
    const revealTimerRef = useRef(null);
    const lockedRef = useRef(false);

    const question = questions[index];

    // Ticking clock for the visible timer only; the recorded time comes from
    // timestamps taken in the answer handler.
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 250);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => () => clearTimeout(revealTimerRef.current), []);

    const record = (entry) => {
        if (lockedRef.current) return;
        lockedRef.current = true;
        const next = [...answers, entry];
        setAnswers(next);
        onProgress(next);
        revealTimerRef.current = setTimeout(() => {
            if (next.length >= DUEL_QUESTION_COUNT) {
                onFinish(next);
                return;
            }
            setIndex(next.length);
            setSelected(null);
            const t = Date.now();
            setNow(t);
            setQuestionStart(t);
            lockedRef.current = false;
        }, REVEAL_MS);
    };

    const elapsed = Math.max(0, Math.min(QUESTION_MS, now - questionStart));
    const timeLeft = selected !== null ? 0 : secondsLeftFromMs(elapsed);

    useEffect(() => {
        if (selected === null && elapsed >= QUESTION_MS && !lockedRef.current) {
            sound.playWrong();
            setSelected(-1);
            record({ c: false, t: QUESTION_MS });
        }
    // `record` closes over the latest answers; the timeout check must run on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [elapsed, selected]);

    if (!question) return null;
    const options = getMatchQuestionOptions(duel.id, question);

    const handleAnswer = (optionIndex) => {
        if (selected !== null || lockedRef.current) return;
        const t = elapsed;
        const correct = isMatchAnswerCorrect(duel.id, question, optionIndex);
        sound.playClick();
        if (correct) sound.playCorrect(); else sound.playWrong();
        setSelected(optionIndex);
        record({ c: correct, t });
    };

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 bg-slate-900/60 border border-slate-800/80 p-3 sm:p-3.5 rounded-2xl text-xs font-bold">
                <span className="min-w-0 truncate text-slate-400 uppercase tracking-wider">{categoryLabelFor(duel.category)}</span>
                <TimerRing timeLeft={timeLeft} totalTime={QUESTION_TIME_SECONDS} />
                <span className="text-right text-slate-300 tabular-nums">{Math.min(index + 1, DUEL_QUESTION_COUNT)} / {DUEL_QUESTION_COUNT}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
                <h2 className="text-xl sm:text-2xl font-display font-bold text-white leading-snug">{question.question}</h2>
                <div className="grid grid-cols-1 gap-3">
                    {options.map((option, idx) => {
                        const isCorrect = isMatchAnswerCorrect(duel.id, question, idx);
                        let style = 'bg-slate-950/60 hover:bg-slate-800 border-slate-800 text-slate-200';
                        if (selected !== null) {
                            if (isCorrect) style = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold';
                            else if (idx === selected) style = 'bg-rose-500/30 border-rose-500 text-rose-300 font-bold';
                        }
                        return (
                            <button
                                key={idx}
                                disabled={selected !== null}
                                onClick={() => handleAnswer(idx)}
                                className={`w-full p-4 rounded-2xl border text-left font-semibold text-sm transition-all active:scale-[0.97] ${style}`}
                            >
                                <span className="block whitespace-normal break-words">{option}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <button onClick={onExit} className="w-full text-xs text-slate-500 hover:text-slate-300">
                Odustani (runda ostaje potrošena)
            </button>
        </div>
    );
}

// End-of-run screen, also used to review any finished duel from the inbox.
// The explanation (Phase 2) and "% answered correctly" (Phase 3) lines live
// here and nowhere earlier in a duel, so both players keep the same pace.
function DuelSummary({ summary, myUid, onExit }) {
    const { duel, myResult, opponentResult, questions } = summary;
    const complete = duel.status === 'complete';
    const outcome = complete ? myOutcome(duel, myUid) : null;
    const opponentName = (duel.challengerUid === myUid ? duel.opponentName : duel.challengerName) || 'Protivnik';
    const showExplanations = isFeatureEnabled('EXPLANATIONS');
    const showAccuracy = isFeatureEnabled('DIFFICULTY');

    const Icon = outcome === 'win' ? Crown : outcome === 'draw' ? Handshake : outcome === 'loss' ? Skull : Hourglass;
    const tone = outcome === 'win' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
        : outcome === 'loss' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        : 'bg-slate-800 border-slate-700 text-slate-300';
    const headline = outcome === 'win' ? 'Pobjeda!' : outcome === 'loss' ? 'Poraz' : outcome === 'draw' ? 'Neriješeno!'
        : duel.status === 'expired' ? 'Dvoboj je istekao' : 'Čekamo protivnika';

    return (
        <div className="space-y-5">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-center space-y-4">
                <div className={`inline-flex items-center justify-center p-4 rounded-2xl border ${tone}`}>
                    <Icon className="w-10 h-10" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white">{headline}</h2>
                    <p className="text-xs text-slate-500 mt-1">{categoryLabelFor(duel.category)} · {DUEL_QUESTION_COUNT} pitanja</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3">
                        <div className="text-xs text-slate-400">Ti</div>
                        <div className="text-2xl font-black text-white">{myResult?.score ?? '–'}</div>
                        <div className="text-xs text-slate-500">{myResult ? `${myResult.correct}/${DUEL_QUESTION_COUNT} točnih` : ''}</div>
                    </div>
                    <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3">
                        <div className="text-xs text-slate-400 truncate">{opponentName}</div>
                        <div className="text-2xl font-black text-white">{opponentResult?.state === 'done' ? opponentResult.score : '?'}</div>
                        <div className="text-xs text-slate-500">{opponentResult?.state === 'done' ? `${opponentResult.correct}/${DUEL_QUESTION_COUNT} točnih` : 'još nije odigrao/la'}</div>
                    </div>
                </div>
                {!complete && duel.status !== 'expired' && (
                    <p className="text-xs text-slate-400">Rezultat ćeš vidjeti kad {opponentName} odigra. Provjeri u lobiju ili pod „Izazovi”.</p>
                )}
            </div>

            {myResult?.answers?.length === DUEL_QUESTION_COUNT && questions?.length === DUEL_QUESTION_COUNT && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-2">
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Pregled pitanja</h3>
                    {questions.map((q, i) => {
                        const mine = myResult.answers[i];
                        const theirs = opponentResult?.state === 'done' ? opponentResult.answers?.[i] : null;
                        const pct = showAccuracy ? measuredAccuracyPercent(q) : null;
                        return (
                            <div key={q.id} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2">
                                <p className="text-sm text-slate-200 leading-snug break-words">
                                    <span className="text-slate-500 text-xs mr-1.5">{i + 1}.</span>
                                    {q.question}
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className={`min-w-0 rounded-lg border px-2.5 py-2 ${mine?.c ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-rose-500/30 bg-rose-500/10'}`}>
                                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Ti</div>
                                        <div className={`mt-0.5 flex items-center gap-1 text-xs font-bold ${mine?.c ? 'text-emerald-300' : 'text-rose-300'}`}>
                                            {mine?.c
                                                ? <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                                : <X className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                                            <span>{mine?.c ? 'Točno' : 'Netočno'}</span>
                                        </div>
                                    </div>
                                    <div className={`min-w-0 rounded-lg border px-2.5 py-2 ${theirs ? (theirs.c ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-rose-500/30 bg-rose-500/10') : 'border-slate-700 bg-slate-900/60'}`}>
                                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate">{opponentName}</div>
                                        {theirs ? (
                                            <div className={`mt-0.5 flex items-center gap-1 text-xs font-bold ${theirs.c ? 'text-emerald-300' : 'text-rose-300'}`}>
                                                {theirs.c
                                                    ? <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                                    : <X className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                                                <span>{theirs.c ? 'Točno' : 'Netočno'}</span>
                                            </div>
                                        ) : (
                                            <div className="mt-0.5 flex items-center gap-1 text-xs font-bold text-slate-400">
                                                <Hourglass className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                                <span>Čeka</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-xs text-emerald-300/90 break-words">Točno: {q.correct_answer}</div>
                                {pct !== null && <div className="text-xs text-slate-500">Točno je odgovorilo {pct}% igrača</div>}
                                {showExplanations && q.explanation && (
                                    <p className="text-xs text-slate-300 flex gap-1.5 break-words"><Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" aria-hidden="true" />{q.explanation}</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <button
                onClick={onExit}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3.5 rounded-2xl transition-colors active:scale-[0.97]"
            >
                Natrag u lobi
            </button>
        </div>
    );
}

export default function AsyncDuelScreen({ activeDuel, summary, currentUid, onProgress, onFinish, onExit }) {
    if (activeDuel) {
        return <DuelPlay key={activeDuel.duel.id} activeDuel={activeDuel} onProgress={onProgress} onFinish={onFinish} onExit={onExit} />;
    }
    if (summary) {
        return <DuelSummary summary={summary} myUid={currentUid} onExit={onExit} />;
    }
    return (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
            <Swords className="w-8 h-8 animate-pulse text-emerald-400" />
            <p className="text-sm">Učitavanje dvoboja...</p>
        </div>
    );
}
