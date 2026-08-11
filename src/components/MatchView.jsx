import { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { Swords, Crown, Handshake, Flag, RotateCcw, Zap, WifiOff } from 'lucide-react';
import TimerRing from './TimerRing';
import { CATEGORY_META } from '../data/categoryMeta';
import { BASE_SCORE, SPEED_BONUS_PER_SECOND, STREAK_MULTIPLIER_STEP, QUESTION_TIME_SECONDS } from '../constants/gameBalance';
import { resolveMatchQuestions, getMatchQuestionOptions, isMatchAnswerCorrect } from '../utils/matchQuestions';
import {
    subscribeToMatch,
    setMatchQuestionStarted,
    setMatchCountdownStarted,
    startMatch,
    submitMatchAnswer,
    revealMatchQuestion,
    advanceMatchQuestion,
    finishMatch,
    forfeitMatch,
    heartbeatMatch,
} from '../services/matches';
import { sound } from '../utils/sound';

const FORFEIT_THRESHOLD_MS = 30000;
const LAST_QUESTION_INDEX = 10; // 0-9 regular + 10 sudden death
const REVEAL_DURATION_SECONDS = 3;
const PRE_MATCH_COUNTDOWN_SECONDS = 5;

export default function MatchView({ matchId, currentUid, onExit, onMatchOver, onRematch }) {
    const [match, setMatch] = useState(null);
    const [now, setNow] = useState(() => Date.now());
    const [revealTimeLeft, setRevealTimeLeft] = useState(REVEAL_DURATION_SECONDS);
    const streakRef = useRef(0);
    const questionStartedGuardRef = useRef(null); // last index we already tried to start
    const revealGuardRef = useRef(null); // last index we already tried to reveal
    const advanceGuardRef = useRef(null); // last index we already tried to advance from
    const finishGuardRef = useRef(false);
    const matchOverHandledRef = useRef(false);
    const startGuardRef = useRef(false); // already tried to fire countdown -> question_active

    useEffect(() => {
        const unsubscribe = subscribeToMatch(matchId, setMatch);
        return unsubscribe;
    }, [matchId]);

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    const countdownStartedMs = match?.countdownStartedAt?.toMillis?.() ?? null;
    const startCountdown = countdownStartedMs
        // Clamped to PRE_MATCH_COUNTDOWN_SECONDS, not just floored at 0: if
        // the local clock lags the Firestore server clock that stamped
        // countdownStartedAt, (now - countdownStartedMs) can briefly go
        // negative, which without this clamp displays 6+ instead of 5 for
        // the first tick - caught visually while watching a real match.
        ? Math.min(PRE_MATCH_COUNTDOWN_SECONDS, Math.max(0, PRE_MATCH_COUNTDOWN_SECONDS - Math.floor((now - countdownStartedMs) / 1000)))
        : null;

    // ---- Synced pre-match countdown: first client whose timer hits 0 ----
    // starts the match. Anchored to the shared countdownStartedAt server
    // timestamp (set once, first-write-wins, by whoever clicks Spreman
    // first - see setMatchCountdownStarted) instead of each client's own
    // click time, so both players see the same countdown regardless of when
    // they individually clicked.
    useEffect(() => {
        if (!match || match.status !== 'countdown' || startCountdown !== 0) return;
        if (startGuardRef.current) return;
        startGuardRef.current = true;
        startMatch(matchId);
    }, [match, matchId, startCountdown]);

    const isPlayer1 = match?.player1Uid === currentUid;
    const myUid = currentUid;
    const oppUid = isPlayer1 ? match?.player2Uid : match?.player1Uid;
    const myDisplayName = isPlayer1 ? match?.player1DisplayName : match?.player2DisplayName;
    const oppDisplayName = isPlayer1 ? match?.player2DisplayName : match?.player1DisplayName;
    const myScore = isPlayer1 ? match?.player1Score : match?.player2Score;
    const oppScore = isPlayer1 ? match?.player2Score : match?.player1Score;
    const myAnswer = isPlayer1 ? match?.player1Answer : match?.player2Answer;
    const oppAnswer = isPlayer1 ? match?.player2Answer : match?.player1Answer;

    const questionIds = match?.questionIds;
    const category = match?.category;
    const questions = useMemo(() => {
        if (!questionIds || !category) return [];
        return resolveMatchQuestions(questionIds, category);
    }, [questionIds, category]);

    const currentQuestion = questions[match?.currentQuestionIndex] || null;
    const options = useMemo(
        () => (currentQuestion ? getMatchQuestionOptions(matchId, currentQuestion) : []),
        [matchId, currentQuestion]
    );

    const questionStartedMs = match?.questionStartedAt?.toMillis?.() ?? null;
    const timeLeft = questionStartedMs
        // Same clock-skew clamp as startCountdown above.
        ? Math.min(QUESTION_TIME_SECONDS, Math.max(0, QUESTION_TIME_SECONDS - Math.floor((now - questionStartedMs) / 1000)))
        : QUESTION_TIME_SECONDS;

    // ---- Per-player heartbeat ----
    // Deliberately NOT keyed on match.status: during fast-paced play the
    // match transitions status (question_active -> reveal -> question_active
    // -> ...) far more often than every 8s, and a status-keyed dependency
    // would tear down and restart this interval on every single transition
    // before it ever got a chance to fire - meaning the heartbeat would
    // never actually reach Firestore, and the opponent's stale-heartbeat
    // check below would eventually forfeit an actively-playing match. Reads
    // the latest match/isPlayer1 via refs instead so the interval itself
    // can stay alive for the whole match.
    const matchRef = useRef(match);
    matchRef.current = match;
    const isPlayer1Ref = useRef(isPlayer1);
    isPlayer1Ref.current = isPlayer1;
    useEffect(() => {
        const interval = setInterval(() => {
            const m = matchRef.current;
            if (!m || m.status === 'match_over' || m.status === 'forfeited') return;
            heartbeatMatch(matchId, isPlayer1Ref.current);
        }, 8000);
        return () => clearInterval(interval);
    }, [matchId]);

    useEffect(() => {
        if (!match || match.status === 'match_over' || match.status === 'forfeited') return;
        const oppHeartbeatMs = (isPlayer1 ? match.player2HeartbeatAt : match.player1HeartbeatAt)?.toMillis?.();
        if (!oppHeartbeatMs) return;
        if (now - oppHeartbeatMs > FORFEIT_THRESHOLD_MS) {
            forfeitMatch(matchId, myUid, 'timeout');
        }
    }, [now, match, matchId, isPlayer1, myUid]);

    // ---- First client to arrive at a fresh question starts the clock ----
    useEffect(() => {
        if (!match || match.status !== 'question_active' || match.questionStartedAt) return;
        if (questionStartedGuardRef.current === match.currentQuestionIndex) return;
        questionStartedGuardRef.current = match.currentQuestionIndex;
        setMatchQuestionStarted(matchId);
    }, [match, matchId]);

    // ---- Reveal once both have answered or time's up ----
    useEffect(() => {
        if (!match || match.status !== 'question_active') return;
        const bothAnswered = match.player1Answer && match.player2Answer;
        if (!bothAnswered && timeLeft > 0) return;
        if (revealGuardRef.current === match.currentQuestionIndex) return;
        revealGuardRef.current = match.currentQuestionIndex;
        revealMatchQuestion(matchId);
    }, [match, matchId, timeLeft]);

    // ---- Reveal phase: 3-second delay before advancing to next question ----
    useEffect(() => {
        if (!match || match.status !== 'reveal') {
            setRevealTimeLeft(REVEAL_DURATION_SECONDS);
            return;
        }
        if (advanceGuardRef.current === match.currentQuestionIndex) return;
        advanceGuardRef.current = match.currentQuestionIndex;

        const isLastRegular = match.currentQuestionIndex === 9;
        const isSuddenDeath = match.currentQuestionIndex === LAST_QUESTION_INDEX;
        const tied = match.player1Score === match.player2Score;

        const countdownInterval = setInterval(() => {
            setRevealTimeLeft((prev) => Math.max(0, prev - 1));
        }, 1000);

        const timer = setTimeout(() => {
            if (isSuddenDeath || (isLastRegular && !tied)) {
                if (finishGuardRef.current) return;
                finishGuardRef.current = true;
                const winnerUid = match.player1Score === match.player2Score
                    ? null
                    : (match.player1Score > match.player2Score ? match.player1Uid : match.player2Uid);
                finishMatch(matchId, winnerUid);
                return;
            }
            advanceMatchQuestion(matchId, match.currentQuestionIndex + 1);
        }, REVEAL_DURATION_SECONDS * 1000);

        return () => {
            clearInterval(countdownInterval);
            clearTimeout(timer);
        };
    }, [match?.status, match?.currentQuestionIndex]);

    // ---- Write match history + notify parent when match completes ----
    useEffect(() => {
        if (!match) return;
        if (match.status !== 'match_over' && match.status !== 'forfeited') return;
        if (matchOverHandledRef.current) return;
        matchOverHandledRef.current = true;

        const result = match.winnerUid === null ? 'draw' : (match.winnerUid === myUid ? 'win' : 'loss');
        if (result === 'win') {
            sound.playCorrect();
            confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        }
        onMatchOver?.({
            result,
            myScore: myScore || 0,
            opponentScore: oppScore || 0,
            opponentUid: oppUid,
            opponentDisplayName: oppDisplayName,
            category: match.category,
            forfeited: match.status === 'forfeited',
        });
    }, [match, myUid, myScore, oppScore, oppUid, oppDisplayName, onMatchOver]);

    if (!match) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
                <Swords className="w-8 h-8 animate-pulse text-emerald-400" />
                <p className="text-sm">Učitavanje dvoboja...</p>
            </div>
        );
    }

    const categoryLabel = CATEGORY_META[match.category]?.label || match.category;

    const handleAnswer = async (optionIndex) => {
        if (myAnswer || timeLeft <= 0 || match.status !== 'question_active') return;
        const isCorrect = isMatchAnswerCorrect(matchId, currentQuestion, optionIndex);
        sound.playClick();

        if (isCorrect) {
            sound.playCorrect();
            const speedBonus = timeLeft * SPEED_BONUS_PER_SECOND;
            const streakMultiplier = 1 + streakRef.current * STREAK_MULTIPLIER_STEP;
            const earned = Math.round((BASE_SCORE + speedBonus) * streakMultiplier);
            streakRef.current += 1;
            const newScore = (myScore || 0) + earned;
            const newCorrect = (isPlayer1 ? match.player1Correct : match.player2Correct) + 1;
            await submitMatchAnswer(matchId, isPlayer1, optionIndex, { score: newScore, correctCount: newCorrect });
        } else {
            sound.playWrong();
            streakRef.current = 0;
            await submitMatchAnswer(matchId, isPlayer1, optionIndex);
        }
    };

    const handleForfeit = () => {
        forfeitMatch(matchId, oppUid, 'manual');
    };

    // ---- waiting_ready / countdown ----
    if (match.status === 'waiting_ready' || match.status === 'countdown') {
        const isCounting = match.status === 'countdown';
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6">
                <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <Swords className="w-10 h-10" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white">1v1 Dvoboj</h2>
                    <p className="text-sm text-slate-400 mt-1">
                        <span className="font-bold text-slate-200">{myDisplayName}</span> protiv <span className="font-bold text-slate-200">{oppDisplayName}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1 capitalize">Kategorija: {categoryLabel} · 10 pitanja</p>
                </div>
                {isCounting ? (
                    <div className="py-4 space-y-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dvoboj počinje za</p>
                        <div className="text-5xl font-black text-emerald-400 animate-pulse">{startCountdown ?? PRE_MATCH_COUNTDOWN_SECONDS}</div>
                    </div>
                ) : (
                    <button
                        onClick={() => setMatchCountdownStarted(matchId)}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3.5 rounded-2xl transition-colors shadow-lg shadow-emerald-500/20 active:scale-[0.97]"
                    >
                        Spreman!
                    </button>
                )}
                <button onClick={onExit} className="text-xs text-slate-500 hover:text-slate-300">Napusti dvoboj</button>
            </div>
        );
    }

    // ---- match_over / forfeited ----
    if (match.status === 'match_over' || match.status === 'forfeited') {
        const isWin = match.winnerUid === myUid;
        const isDraw = match.winnerUid === null;
        return (
            <div className={`bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6 ${!isWin && !isDraw ? 'animate-shake animate-flash-red ring-1 ring-rose-500/40' : 'animate-fade-in'}`}>
                <div className={`inline-flex items-center justify-center p-4 rounded-2xl border ${isWin ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : isDraw ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                    {isDraw
                        ? <Handshake className="w-10 h-10" />
                        : (match.status === 'forfeited' && isWin && match.forfeitReason === 'timeout')
                            ? <WifiOff className="w-10 h-10" />
                            : <Crown className="w-10 h-10" />}
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white">
                        {match.status === 'forfeited'
                            ? (isWin
                                ? (match.forfeitReason === 'timeout' ? 'Protivnik je izgubio vezu' : 'Protivnik je napustio dvoboj')
                                : 'Napustio/la si dvoboj')
                            : (isDraw ? 'Neriješeno!' : (isWin ? 'Pobjeda!' : 'Poraz'))}
                    </h2>
                    <p className="text-sm text-slate-400 mt-2">
                        {myDisplayName} <span className="font-black text-white">{myScore}</span> — <span className="font-black text-white">{oppScore}</span> {oppDisplayName}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onExit}
                        className="flex-1 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-colors"
                    >
                        Natrag u predvorje
                    </button>
                    <button
                        onClick={() => onRematch?.(oppUid, match.category)}
                        className="flex-1 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-colors flex items-center justify-center gap-1.5"
                    >
                        <RotateCcw className="w-4 h-4" /> Revanš
                    </button>
                </div>
            </div>
        );
    }

    // ---- question_active / reveal ----
    if (!currentQuestion) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
                <p className="text-sm">Učitavanje pitanja...</p>
            </div>
        );
    }

    const isRevealing = match.status === 'reveal';
    const correctAnswer = currentQuestion.correct_answer || currentQuestion.correctAnswer;
    const isSuddenDeath = match.currentQuestionIndex === LAST_QUESTION_INDEX;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-2xl text-xs font-bold">
                <div className="flex items-center gap-1.5 text-slate-300">
                    <span className="text-slate-500">{myDisplayName}</span>
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>{myScore}</span>
                </div>
                <TimerRing timeLeft={timeLeft} totalTime={QUESTION_TIME_SECONDS} />
                <div className="flex items-center gap-1.5 text-slate-300">
                    <span>{oppScore}</span>
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-slate-500">{oppDisplayName}</span>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
                <div className="flex justify-between items-center text-xs text-slate-400 font-bold">
                    <span className="uppercase tracking-wider flex items-center gap-1.5">
                        {isSuddenDeath && <span className="text-rose-400">IZJEDNAČENJE ·</span>} {categoryLabel}
                    </span>
                    <div className="flex items-center gap-2">
                        <span>{Math.min(match.currentQuestionIndex + 1, 10)} / 10</span>
                        <button onClick={handleForfeit} className="text-slate-600 hover:text-rose-400 transition-colors" title="Napusti dvoboj">
                            <Flag className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">
                    {currentQuestion.question || currentQuestion.tekst || currentQuestion.pitanje}
                </h2>

                <div className="grid grid-cols-1 gap-3">
                    {options.map((option, idx) => {
                        const isCorrect = option === correctAnswer;
                        const iPickedThis = myAnswer?.optionIndex === idx;
                        const oppPickedThis = oppAnswer?.optionIndex === idx;
                        // Both players picked the exact same option - correctness
                        // is necessarily identical for both (it's the same
                        // physical answer), so there's nothing to split on color;
                        // instead we render a visible left/right divider so it
                        // reads as "both of you picked this" rather than the
                        // single-picker style below.
                        const bothPickedThis = iPickedThis && oppPickedThis;

                        let btnStyle = "bg-slate-950/60 hover:bg-slate-800 border-slate-800 text-slate-200";
                        if (isRevealing) {
                            if (bothPickedThis) {
                                btnStyle = isCorrect
                                    ? "border-emerald-400 text-emerald-200 font-bold shadow-lg shadow-emerald-500/10"
                                    : "border-rose-400 text-rose-200 font-bold";
                            } else if (iPickedThis) {
                                btnStyle = isCorrect
                                    ? "bg-emerald-500/30 border-emerald-400 text-emerald-300 font-bold shadow-lg shadow-emerald-500/10"
                                    : "bg-rose-500/25 border-rose-500 text-rose-300 font-bold";
                            } else if (oppPickedThis) {
                                btnStyle = isCorrect
                                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-semibold"
                                    : "bg-rose-500/15 border-rose-500/40 text-rose-300 font-semibold";
                            } else if (isCorrect) {
                                btnStyle = "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold";
                            }
                        } else if (iPickedThis) {
                            btnStyle = "bg-slate-700 border-slate-600 text-white font-bold";
                        }

                        return (
                            <button
                                key={idx}
                                disabled={!!myAnswer || isRevealing}
                                onClick={() => handleAnswer(idx)}
                                className={`w-full p-4 rounded-2xl border text-left font-semibold text-sm transition-all flex justify-between items-center active:scale-[0.97] active:brightness-95 relative overflow-hidden ${btnStyle}`}
                            >
                                {isRevealing && bothPickedThis && (
                                    <>
                                        <span
                                            aria-hidden="true"
                                            className={`absolute inset-y-0 left-0 w-1/2 ${isCorrect ? 'bg-emerald-500/35' : 'bg-rose-500/30'}`}
                                        />
                                        <span
                                            aria-hidden="true"
                                            className={`absolute inset-y-0 right-0 w-1/2 border-l ${isCorrect ? 'bg-emerald-500/15 border-emerald-400/40' : 'bg-rose-500/15 border-rose-400/40'}`}
                                        />
                                    </>
                                )}
                                <span className="relative z-10">{option}</span>
                                {isRevealing && (iPickedThis || oppPickedThis) && (
                                    <div className="flex items-center gap-1 relative z-10">
                                        {iPickedThis && (
                                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                                                Ti
                                            </span>
                                        )}
                                        {oppPickedThis && (
                                            <span className="text-[10px] font-bold text-slate-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-md">
                                                {oppDisplayName}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {isRevealing && (
                    <div className="space-y-1 text-center">
                        <p className="text-xs font-bold text-emerald-400">
                            Sljedeće pitanje za {revealTimeLeft}s...
                        </p>
                        <p className="text-xs text-slate-500">
                            {myAnswer ? 'Odgovorio/la si' : 'Nisi stigao/la odgovoriti'} · {oppAnswer ? `${oppDisplayName} je odgovorio/la` : `${oppDisplayName} nije stigao/la`}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
