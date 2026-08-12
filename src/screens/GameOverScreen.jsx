import { Crown, Flame, CalendarDays, Trophy, Award, RefreshCw, Play } from 'lucide-react';
import QuestionReview from '../components/QuestionReview';

export default function GameOverScreen({
    gameState,
    score,
    dailyChallengeMode,
    scoreSaved,
    dailySubmitResult,
    dailyLeaderboard,
    currentUser,
    roundHighlight,
    autoSaveFailed,
    onRetrySave,
    nickname,
    onNicknameChange,
    onSaveScoreSubmit,
    isSaving,
    roundHistory,
    onPlayAgain,
    onReturnToLobby,
}) {
    const isVictory = gameState === 'VICTORY';

    return (
        <div className={`bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6 ${gameState === 'GAMEOVER' ? 'animate-shake animate-flash-red ring-1 ring-rose-500/40' : 'animate-fade-in'}`}>
            <div className={`inline-flex items-center justify-center p-4 rounded-2xl ${isVictory ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'}`}>
                {isVictory ? <Crown className="w-10 h-10" /> : <Flame className="w-10 h-10" />}
            </div>

            <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                    {isVictory ? 'Čestitamo! Pobjeda!' : 'Kraj Igre!'}
                </h2>
                <p className="text-slate-400 text-sm">
                    Osvojili ste ukupno <span className="text-amber-400 font-bold">{score}</span> bodova.
                </p>
            </div>

            {dailyChallengeMode && scoreSaved && dailySubmitResult && (
                <div className="space-y-3">
                    <p className={`text-xs font-bold flex items-center justify-center gap-1.5 py-3 rounded-xl border ${dailySubmitResult.isTop ? 'text-amber-300 bg-amber-500/10 border-amber-500/30' : 'text-slate-300 bg-slate-800/60 border-slate-700/60'}`}>
                        <CalendarDays className="w-4 h-4" />
                        {dailySubmitResult.isTop
                            ? 'Trenutno si na 1. mjestu dnevnog izazova!'
                            : dailySubmitResult.rank
                                ? `Trenutno si na ${dailySubmitResult.rank}. mjestu dnevnog izazova.`
                                : 'Rezultat je zabilježen na dnevnoj ljestvici.'}
                    </p>
                    {dailyLeaderboard.length > 0 && (
                        <div className="bg-slate-950/60 rounded-2xl border border-slate-800 overflow-hidden divide-y divide-slate-800/80 text-left">
                            {dailyLeaderboard.slice(0, 5).map((entry, idx) => (
                                <div
                                    key={entry.uid || idx}
                                    className={`flex justify-between items-center p-3 text-sm px-4 ${entry.uid === currentUser?.uid ? 'bg-amber-500/10' : ''}`}
                                >
                                    <span className="font-semibold text-slate-300 flex items-center gap-3">
                                        <span className={`text-xs font-extrabold w-6 h-6 rounded-lg flex items-center justify-center ${idx === 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                                            #{idx + 1}
                                        </span>
                                        <span>{entry.name}</span>
                                    </span>
                                    <span className="text-amber-400 font-bold">{entry.score} bod.</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {!dailyChallengeMode && scoreSaved && roundHighlight && (roundHighlight.isNewPersonalBest || roundHighlight.rank) && (
                <p className={`text-xs font-bold flex items-center justify-center gap-1.5 py-3 rounded-xl border ${roundHighlight.isNewPersonalBest ? 'text-amber-300 bg-amber-500/10 border-amber-500/30' : 'text-slate-300 bg-slate-800/60 border-slate-700/60'}`}>
                    <Trophy className="w-4 h-4" />
                    {roundHighlight.isNewPersonalBest
                        ? 'Novi osobni rekord!'
                        : `Trenutno si na ${roundHighlight.rank}. mjestu za ovu kategoriju!`}
                </p>
            )}

            {scoreSaved ? (
                <p className="text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 py-3 rounded-xl">
                    <Award className="w-4 h-4" /> Rezultat uspješno spremljen!
                </p>
            ) : currentUser ? (
                autoSaveFailed ? (
                    <button
                        type="button"
                        onClick={onRetrySave}
                        className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold py-3 rounded-xl text-sm transition-colors active:scale-[0.97] active:brightness-95"
                    >
                        Spremanje nije uspjelo. Pokušaj ponovno.
                    </button>
                ) : (
                    <p className="text-slate-400 text-xs font-bold animate-pulse py-3">Spremanje rezultata...</p>
                )
            ) : (
                <form onSubmit={onSaveScoreSubmit} className="space-y-3">
                    <input
                        type="text"
                        placeholder="Unesite nadimak (Nickname)"
                        value={nickname}
                        onChange={(e) => onNicknameChange(e.target.value)}
                        maxLength={15}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center text-white font-bold text-sm focus:outline-none focus:border-amber-400"
                    />
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl text-sm transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50 active:scale-[0.97] active:brightness-95"
                    >
                        {isSaving ? 'Spremanje...' : 'Spremi Rezultat'}
                    </button>
                </form>
            )}

            <QuestionReview history={roundHistory} />

            <div className="space-y-2.5 pt-2">
                {!dailyChallengeMode && (
                    <button
                        onClick={onPlayAgain}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3.5 rounded-2xl transition-colors shadow-lg shadow-amber-500/20 flex justify-center items-center gap-2 text-sm active:scale-[0.97] active:brightness-95"
                    >
                        <Play className="w-4 h-4 fill-slate-950" /> Igraj Ponovno
                    </button>
                )}

                <button
                    onClick={onReturnToLobby}
                    className="w-full bg-slate-800 hover:bg-slate-750 text-slate-100 font-bold py-3.5 rounded-2xl transition-colors flex justify-center items-center gap-2 border border-slate-700/80 text-sm active:scale-[0.97] active:brightness-95"
                >
                    <RefreshCw className="w-4 h-4 text-slate-400" /> Povratak u Izbornik
                </button>
            </div>
        </div>
    );
}
