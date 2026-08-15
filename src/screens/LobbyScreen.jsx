import { useEffect, useState } from 'react';
import { RefreshCw, Crown, ChevronRight, CalendarDays, Swords, Medal, PenSquare, ListChecks } from 'lucide-react';
import RekordiBoards from '../components/RekordiBoards';
import { getCategoryDetails, DEFAULT_CATEGORY_COLOR } from '../utils/categoryDisplay';
import { sound } from '../utils/sound';

// Minutes:seconds remaining until the next Zagreb-local midnight, for the
// missions widget's reset countdown. Recomputed from wall-clock `now`
// rather than a fixed target captured once, so it stays correct across a
// DST transition mid-session (rare, but a fixed-target countdown would
// silently drift by an hour on the transition day).
const zagrebMsUntilMidnight = (now) => {
    const zagrebNowStr = now.toLocaleString('en-US', { timeZone: 'Europe/Zagreb' });
    const zagrebNow = new Date(zagrebNowStr);
    const nextMidnight = new Date(zagrebNow);
    nextMidnight.setHours(24, 0, 0, 0);
    return nextMidnight.getTime() - zagrebNow.getTime();
};

const formatCountdown = (ms) => {
    const totalMinutes = Math.max(0, Math.floor(ms / 60000));
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m`;
};

// Props-only extraction of App.jsx's LOBBY render block, plus one small
// piece of self-contained UI state (the missions countdown ticker) - same
// pattern MatchView.jsx's `now` ticker uses, not routed through App.jsx
// since nothing outside this component needs it.
export default function LobbyScreen({
    sentInvite,
    onCancelSentInvite,
    dailyWinAnnouncement,
    onDismissDailyWinAnnouncement,
    onLaunchDailyChallenge,
    currentUser,
    dailyAttemptStatus,
    onShowAuthModal,
    onShowOnlinePlayersModal,
    onlinePlayersCount,
    dailyLobbyMessage,
    categoriesList,
    onSelectCategory,
    onShowRekordiModal,
    rekordiData,
    onShowSubmitQuestionModal,
    onShowMissionsModal,
    missionState,
}) {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    const completedSlots = missionState
        ? ['slot1', 'slot2', 'slot3'].filter((k) => missionState.slots[k].completed).length
        : 0;
    const allDone = completedSlots === 3;

    return (
        <div className="space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight text-white">
                    Izaberi Kategoriju Kvizova
                </h1>
                <p className="text-slate-400 text-sm">
                    Testirajte svoje znanje, skupljajte bodove i penjite se na ljestvicu!
                </p>
            </div>

            {sentInvite && (
                <div className="flex items-center justify-between gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
                    <p className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
                        Poziv poslan{sentInvite.toDisplayName ? ` igraču ${sentInvite.toDisplayName}` : ''} - čeka se odgovor...
                    </p>
                    <button
                        onClick={onCancelSentInvite}
                        className="text-xs font-bold text-emerald-400/80 hover:text-emerald-300 shrink-0"
                    >
                        Odustani
                    </button>
                </div>
            )}

            {dailyWinAnnouncement && (
                <div className="flex items-center justify-between gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
                    <p className="text-sm font-bold text-amber-300 flex items-center gap-2">
                        <Crown className="w-5 h-5 shrink-0" />
                        Osvojio/la si jučerašnji Dnevni izazov! +{dailyWinAnnouncement.prize} zlatnika je već na tvom računu.
                    </p>
                    <button
                        onClick={onDismissDailyWinAnnouncement}
                        className="text-xs font-bold text-amber-400/80 hover:text-amber-300 shrink-0"
                    >
                        OK
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                    onClick={onLaunchDailyChallenge}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-500/15 to-amber-500/5 hover:from-amber-500/25 hover:to-amber-500/10 border border-amber-500/30 rounded-2xl transition-all group shadow-sm active:scale-[0.97] active:brightness-95"
                >
                    <div className="flex items-center gap-3.5">
                        <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 group-hover:scale-110 transition-transform">
                            <CalendarDays className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <span className="font-black text-white text-sm block">Dnevni izazov</span>
                            <span className="text-xs text-amber-300/80">
                                {!currentUser
                                    ? 'Prijavi se za igranje'
                                    : !dailyAttemptStatus
                                        ? 'Isti kviz za sve, jedan besplatan pokušaj dnevno'
                                        : !dailyAttemptStatus.canPlay
                                            ? 'Odigrano danas - vrati se sutra'
                                            : 'Besplatno - jedan pokušaj dnevno'}
                            </span>
                        </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-500/60 group-hover:text-amber-400 transition-colors" />
                </button>

                <button
                    onClick={() => {
                        if (!currentUser) { onShowAuthModal(); return; }
                        sound.playClick();
                        onShowOnlinePlayersModal();
                    }}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 hover:from-emerald-500/25 hover:to-emerald-500/10 border border-emerald-500/30 rounded-2xl transition-all group shadow-sm active:scale-[0.97] active:brightness-95"
                >
                    <div className="flex items-center gap-3.5">
                        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 group-hover:scale-110 transition-transform">
                            <Swords className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <span className="font-black text-white text-sm block">1v1 Dvoboj</span>
                            <span className="text-xs text-emerald-300/80">
                                {!currentUser
                                    ? 'Prijavi se da izazoveš druge igrače'
                                    : onlinePlayersCount === 0
                                        ? 'Nitko trenutno nije online'
                                        : `${onlinePlayersCount} ${onlinePlayersCount === 1 ? 'igrač' : 'igrača'} online`}
                            </span>
                        </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-500/60 group-hover:text-emerald-400 transition-colors" />
                </button>
            </div>
            <button
                onClick={() => {
                    if (!currentUser) { onShowAuthModal(); return; }
                    sound.playClick();
                    onShowMissionsModal();
                }}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all active:scale-[0.98] ${
                    allDone
                        ? 'bg-gradient-to-r from-amber-500/20 to-amber-500/5 border-amber-500/40'
                        : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900'
                }`}
            >
                <div className="flex items-center gap-2.5">
                    <ListChecks className={`w-4 h-4 ${allDone ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span className={`text-xs font-bold ${allDone ? 'text-amber-300' : 'text-slate-300'}`}>
                        {!currentUser ? 'Dnevne misije - prijavi se' : `Dnevne misije: ${completedSlots}/3 gotovo`}
                    </span>
                </div>
                {currentUser && (
                    <span className="text-xs text-slate-500">Reset za {formatCountdown(zagrebMsUntilMidnight(now))}</span>
                )}
            </button>

            {dailyLobbyMessage && (
                <p className="text-center text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl py-2">
                    {dailyLobbyMessage}
                </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {categoriesList.map(catKey => {
                    const details = getCategoryDetails(catKey);
                    const IconComponent = details.icon;
                    const color = details.color || DEFAULT_CATEGORY_COLOR;
                    return (
                        <button
                            key={catKey}
                            onClick={() => onSelectCategory(catKey)}
                            className={`flex items-center justify-between p-4 bg-slate-900/90 hover:bg-slate-900 border border-slate-800/80 ${color.hoverBorder} rounded-2xl transition-all duration-200 group shadow-sm hover:shadow-lg active:scale-[0.97] active:brightness-95`}
                        >
                            <div className="flex items-center gap-3.5">
                                <div className={`p-3 rounded-xl ${color.bg} border ${color.border} ${color.text} group-hover:scale-110 transition-transform`}>
                                    <IconComponent className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-slate-200 capitalize text-sm">{details.label}</span>
                            </div>
                            <ChevronRight className={`w-4 h-4 text-slate-600 ${color.groupHoverText} transition-colors`} />
                        </button>
                    );
                })}
            </div>

            <div className="text-center">
                <button
                    onClick={() => {
                        if (!currentUser) { onShowAuthModal(); return; }
                        sound.playClick();
                        onShowSubmitQuestionModal();
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-amber-400 transition-colors active:scale-95"
                >
                    <PenSquare className="w-3.5 h-3.5" /> Predloži pitanje
                </button>
            </div>

            <div className="space-y-3 pt-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Medal className="w-4 h-4 text-amber-400" /> Rekordi
                    </h2>
                    <button
                        onClick={() => { sound.playClick(); onShowRekordiModal(); }}
                        className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors active:scale-95"
                    >
                        Vidi sve →
                    </button>
                </div>
                <RekordiBoards data={rekordiData} limitPerBoard={3} compact />
            </div>
        </div>
    );
}
