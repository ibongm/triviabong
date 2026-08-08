import { useEffect, useMemo, useRef, useState } from 'react';
import { Swords, Crown, Handshake, Flag, RotateCcw, Zap } from 'lucide-react';
import TimerRing from './TimerRing';
import { CATEGORY_META } from '../data/categoryMeta';
import { BASE_SCORE, SPEED_BONUS_PER_SECOND, STREAK_MULTIPLIER_STEP, QUESTION_TIME_SECONDS } from '../constants/gameBalance';
import { resolveMatchQuestions, getMatchQuestionOptions, isMatchAnswerCorrect } from '../utils/matchQuestions';
import {
    subscribeToMatch,
    setMatchQuestionStarted,
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

// Full-screen container for the entire 1v1 mode - reads/writes
// matches/{matchId} directly rather than App.jsx's local gameState, since
// both clients must see the same thing (see Plan B §4 - a new top-level
// mode alongside, not woven into, the existing single-player state
// machine).
export default function MatchView({ matchId, currentUid, onExit, onMatchOver, onRematch }) {
    const [match, setMatch] = useState(null);
    const [now, setNow] = useState(() => Date.now());
    const streakRef = useRef(0);
    const questionStartedGuardRef = useRef(null); // last index we already tried to start
    const revealGuardRef = useRef(null); // last index we already tried to reveal
    const advanceGuardRef = useRef(null); // last index we already tried to advance from
    const finishGuardRef = useRef(false);
    const matchOverHandledRef = useRef(false);

    useEffect(() => {
        const unsubscribe = subscribeToMatch(matchId, setMatch);
        return unsubscribe;
    }, [matchId]);

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

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
        ? Math.max(0, QUESTION_TIME_SECONDS - Math.floor((now - questionStartedMs) / 1000))
        : QUESTION_TIME_SECONDS;

    // ---- Per-player heartbeat (forfeit detection - see firestore.rules
    // comment on why a single shared field can't distinguish sides) ----
    useEffect(() => {
        if (!match || match.status === 'match_over' || match.status === 'forfeited') return;
        const interval = setInterval(() => heartbeatMatch(matchId, isPlayer1), 8000);
        return () => clearInterval(interval);
    }, [matchId, isPlayer1, match?.status]);

    useEffect(() => {
        if (!match || match.status === 'match_over' || match.status === 'forfeited') return;
        const oppHeartbeatMs = (isPlayer1 ? match.player2HeartbeatAt : match.player1HeartbeatAt)?.toMillis?.();
        if (!oppHeartbeatMs) return;
        if (now - oppHeartbeatMs > FORFEIT_THRESHOLD_MS) {
            forfeitMatch(matchId, myUid);
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

    // ---- From reveal: advance to the next question, enter sudden death,
    // or finish the match ----
    useEffect(() => {
        if (!match || match.status !== 'reveal') return;
        if (advanceGuardRef.current === match.currentQuestionIndex) return;

        const isLastRegular = match.currentQuestionIndex === 9;
        const isSuddenDeath = match.currentQuestionIndex === LAST_QUESTION_INDEX;
        const tied = match.player1Score === match.player2Score;

        if (isSuddenDeath || (isLastRegular && !tied)) {
            if (finishGuardRef.current) return;
            finishGuardRef.current = true;
            const winnerUid = match.player1Score === match.player2Score
                ? null
                : (match.player1Score > match.player2Score ? match.player1Uid : match.player2Uid);
            finishMatch(matchId, winnerUid);
            return;
        }

        advanceGuardRef.current = match.currentQuestionIndex;
        advanceMatchQuestion(matchId, match.currentQuestionIndex + 1);
    }, [match, matchId]);

    // ---- Write match history + notify parent (achievements/stats) once,
    // when the match reaches a terminal state ----
    useEffect(() => {
        if (!match) return;
        if (match.status !== 'match_over' && match.status !== 'forfeited') return;
        if (matchOverHandledRef.current) return;
        matchOverHandledRef.current = true;

        const result = match.winnerUid === null ? 'draw' : (match.winnerUid === myUid ? 'win' : 'loss');
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
            // Answer + score written atomically - see submitMatchAnswer's
            // comment for why this can't be two sequential writes.
            await submitMatchAnswer(matchId, isPlayer1, optionIndex, { score: newScore, correctCount: newCorrect });
        } else {
            sound.playWrong();
            streakRef.current = 0;
            await submitMatchAnswer(matchId, isPlayer1, optionIndex);
        }
    };

    const handleForfeit = () => {
        forfeitMatch(matchId, oppUid);
    };

    // ---- waiting_ready ----
    if (match.status === 'waiting_ready') {
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
                <button
                    onClick={() => startMatch(matchId)}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3.5 rounded-2xl transition-colors shadow-lg shadow-emerald-500/20 active:scale-[0.97]"
                >
                    Spreman!
                </button>
                <button onClick={onExit} className="text-xs text-slate-500 hover:text-slate-300">Napusti dvoboj</button>
            </div>
        );
    }

    // ---- match_over / forfeited ----
    if (match.status === 'match_over' || match.status === 'forfeited') {
        const isWin = match.winnerUid === myUid;
        const isDraw = match.winnerUid === null;
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6">
                <div className={`inline-flex items-center justify-center p-4 rounded-2xl border ${isWin ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : isDraw ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                    {isDraw ? <Handshake className="w-10 h-10" /> : <Crown className="w-10 h-10" />}
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white">
                        {match.status === 'forfeited'
                            ? (isWin ? 'Protivnik je napustio dvoboj' : 'Napustio/la si dvoboj')
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
                        let btnStyle = "bg-slate-950/60 hover:bg-slate-800 border-slate-800 text-slate-200";
                        if (isRevealing) {
                            if (option === correctAnswer) {
                                btnStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold";
                            } else if (idx === myAnswer?.optionIndex) {
                                btnStyle = "bg-rose-500/20 border-rose-500 text-rose-300 font-bold";
                            }
                        } else if (myAnswer?.optionIndex === idx) {
                            btnStyle = "bg-slate-700 border-slate-600 text-white font-bold";
                        }

                        return (
                            <button
                                key={idx}
                                disabled={!!myAnswer || isRevealing}
                                onClick={() => handleAnswer(idx)}
                                className={`w-full p-4 rounded-2xl border text-left font-semibold text-sm transition-all flex justify-between items-center active:scale-[0.97] active:brightness-95 relative ${btnStyle}`}
                            >
                                <span>{option}</span>
                                {isRevealing && oppAnswer?.optionIndex === idx && (
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-950/60 px-1.5 py-0.5 rounded-md">{oppDisplayName}</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {isRevealing && (
                    <p className="text-center text-xs text-slate-500">
                        {myAnswer ? 'Odgovorio/la si' : 'Nisi stigao/la odgovoriti'} · {oppAnswer ? `${oppDisplayName} je odgovorio/la` : `${oppDisplayName} nije stigao/la`}
                    </p>
                )}
            </div>
        </div>
    );
}
