import { Trophy, HelpCircle, Coins, User, LogOut, ShieldCheck, Star } from 'lucide-react';
import { sound } from '../../utils/sound';

// Purely presentational: the level/coins/trophy chips, the guide and admin
// buttons, and the sign-in/sign-out control. Reads display state only - no
// game logic lives here.
export default function AppHeader({
    globalStats,
    currentUser,
    isAdminUser,
    onGoToLobby,
    onOpenStats,
    onOpenAchievements,
    onOpenGuide,
    onOpenAdmin,
    onOpenAuth,
    onLogout,
}) {
    return (
        <header className="w-full max-w-4xl mx-auto px-4 py-4 flex justify-between items-center border-b border-slate-900">
            <div
                onClick={() => { sound.playClick(); onGoToLobby(); }}
                className="flex items-center gap-2 cursor-pointer group"
            >
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
                    TB
                </div>
                <span className="font-black text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                    TriviaBong
                </span>
            </div>

            <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => { sound.playClick(); onOpenStats(); }}
                        className="flex flex-col items-center gap-0.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 px-3 py-1 rounded-xl text-amber-400 transition-colors"
                        title="Razina i Statistika"
                    >
                        <span className="flex items-center gap-1 text-xs font-bold">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            {globalStats.level || 1}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide leading-none">Razina</span>
                    </button>

                    <div className="flex flex-col items-center gap-0.5 bg-slate-900/80 border border-slate-800/80 px-3 py-1 rounded-xl text-amber-400">
                        <span className="flex items-center gap-1 text-xs font-bold">
                            <Coins className="w-4 h-4 text-amber-400" />
                            {globalStats.coins}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide leading-none">Zlatnici</span>
                    </div>

                    <button
                        onClick={() => { sound.playClick(); onOpenAchievements(); }}
                        className="flex flex-col items-center gap-0.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 px-3 py-1 rounded-xl text-amber-400 transition-colors"
                        title="Trofeji"
                    >
                        <span className="flex items-center gap-1 text-xs font-bold">
                            <Trophy className="w-4 h-4 text-amber-400" />
                            {Object.keys(globalStats.unlockedAchievements || {}).length}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide leading-none">Trofeji</span>
                    </button>
                </div>

                <button
                    onClick={() => { sound.playClick(); onOpenGuide(); }}
                    className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 transition-colors"
                    title="Kako Igrati"
                >
                    <HelpCircle className="w-4 h-4 text-amber-400" />
                    <span className="hidden sm:inline">Vodič</span>
                </button>

                {isAdminUser && (
                    <button
                        onClick={onOpenAdmin}
                        className="flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
                        title="Otvori Admin Panel"
                    >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Admin</span>
                    </button>
                )}

                {currentUser ? (
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                        <span className="text-xs font-bold text-slate-200 truncate max-w-[100px]">
                            {currentUser.displayName || currentUser.email.split('@')[0]}
                        </span>
                        <button
                            onClick={onLogout}
                            className="text-slate-500 hover:text-rose-400 transition-colors p-0.5"
                            title="Odjava"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => { sound.playClick(); onOpenAuth(); }}
                        className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-md shadow-amber-500/10"
                    >
                        <User className="w-3.5 h-3.5" />
                        <span>Prijava</span>
                    </button>
                )}
            </div>
        </header>
    );
}
