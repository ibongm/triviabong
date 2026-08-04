import { X, HelpCircle, Zap, Award, Coins, Scissors, Clock, FastForward, Heart, Play } from 'lucide-react';
import {
    MAX_LIVES,
    QUESTIONS_PER_ROUND,
    QUESTION_TIME_SECONDS,
    PLUS_TEN_SECONDS,
    BASE_SCORE,
    SPEED_BONUS_PER_SECOND,
    STREAK_MULTIPLIER_STEP,
    XP_PER_CORRECT_ANSWER,
    PERFECT_ROUND_XP_BONUS,
    COIN_STREAK_BONUS_INTERVAL,
    COIN_STREAK_BONUS_AMOUNT,
    COIN_PER_ROUND_COMPLETE,
    COIN_PERFECT_ROUND_BONUS,
    COIN_LEVEL_UP_BONUS,
    JOKER_COSTS
} from '../constants/gameBalance';
import { xpForLevel } from '../utils/leveling';
import { DEFAULT_GLOBAL_STATS } from '../constants/defaultGlobalStats';

// All numbers below come from constants/gameBalance.js (and leveling.js /
// defaultGlobalStats.js) rather than being typed in as literals, so this
// guide can't silently drift from what App.jsx actually does.
const STREAK_MULTIPLIER_PERCENT = Math.round(STREAK_MULTIPLIER_STEP * 100);

// Worked example for the scoring section: answering with half the timer
// left, on the 3rd consecutive correct answer (streak going into it = 2).
const EXAMPLE_TIME_LEFT = Math.round(QUESTION_TIME_SECONDS / 2);
const EXAMPLE_STREAK = 2;
const EXAMPLE_SPEED_BONUS = EXAMPLE_TIME_LEFT * SPEED_BONUS_PER_SECOND;
const EXAMPLE_MULTIPLIER = 1 + EXAMPLE_STREAK * STREAK_MULTIPLIER_STEP;
const EXAMPLE_SCORE = Math.round((BASE_SCORE + EXAMPLE_SPEED_BONUS) * EXAMPLE_MULTIPLIER);

function Section({ icon, title, children }) {
    return (
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
            <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                {icon} {title}
            </h3>
            <div className="text-xs text-slate-300 space-y-1.5">
                {children}
            </div>
        </div>
    );
}

export default function GuideModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 relative max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="sticky top-0 z-10 bg-slate-900 flex justify-between items-center border-b border-slate-800 pb-4 pt-1 mb-2">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                            <HelpCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">Kako Igrati</h2>
                            <p className="text-xs text-slate-400">Bodovi, novčići, razine i sve ostalo</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <Section icon={<Zap className="w-4 h-4 text-amber-400" />} title="Bodovanje">
                    <p>Točan odgovor donosi <b className="text-white">{BASE_SCORE}</b> osnovnih bodova.</p>
                    <p>Brzinski bonus: broj preostalih sekundi × <b className="text-white">{SPEED_BONUS_PER_SECOND}</b> - što brže odgovorite, to više bodova.</p>
                    <p>Niz točnih odgovora zaredom donosi množitelj: svaki uzastopni točan odgovor dodaje <b className="text-white">+{STREAK_MULTIPLIER_PERCENT}%</b> na sve buduće bodove u toj rundi.</p>
                    <p className="text-slate-500 italic">
                        Primjer: točan odgovor s {EXAMPLE_TIME_LEFT}s preostalo, na 3. uzastopnom točnom odgovoru
                        ({BASE_SCORE} + {EXAMPLE_TIME_LEFT}×{SPEED_BONUS_PER_SECOND}) × {EXAMPLE_MULTIPLIER.toFixed(1)} = <b>{EXAMPLE_SCORE} bodova</b>.
                    </p>
                </Section>

                <Section icon={<Award className="w-4 h-4 text-amber-400" />} title="XP i Razine">
                    <p>Svaki točan odgovor donosi <b className="text-white">+{XP_PER_CORRECT_ANSWER} XP</b>. Savršena runda (svih {QUESTIONS_PER_ROUND} pitanja točno, bez preskakanja) donosi dodatnih <b className="text-white">+{PERFECT_ROUND_XP_BONUS} XP</b>.</p>
                    <p>Svaka sljedeća razina traži sve više XP-a - a od 5. razine nadalje znatno više nego prije.</p>
                    <p className="text-slate-500 italic">
                        Razina 2: {xpForLevel(2)} XP, razina 5: {xpForLevel(5)} XP, razina 10: {xpForLevel(10)} XP.
                    </p>
                    <p>Razina se može popeti i usred runde, čim XP pređe sljedeći prag.</p>
                </Section>

                <Section icon={<Coins className="w-4 h-4 text-amber-400" />} title="Novčići">
                    <p>Novi igrači kreću s <b className="text-white">{DEFAULT_GLOBAL_STATS.coins}</b> novčića.</p>
                    <p>Završetak runde (pobjeda ili kraj igre) donosi <b className="text-white">+{COIN_PER_ROUND_COMPLETE}</b> novčić, a savršena runda (svih {QUESTIONS_PER_ROUND} točno) donosi dodatnih <b className="text-white">+{COIN_PERFECT_ROUND_BONUS}</b>.</p>
                    <p>Svaki <b className="text-white">{COIN_STREAK_BONUS_INTERVAL}.</b> uzastopni točan odgovor donosi <b className="text-white">+{COIN_STREAK_BONUS_AMOUNT}</b> novčić.</p>
                    <p>Prelazak na novu razinu donosi <b className="text-white">+{COIN_LEVEL_UP_BONUS}</b> novčića.</p>
                    <p className="text-slate-500 italic">Novčići se troše na jokere ispod.</p>
                </Section>

                <Section icon={<Scissors className="w-4 h-4 text-amber-400" />} title="Jokeri">
                    <p className="flex items-center gap-1.5"><Scissors className="w-3.5 h-3.5 text-amber-400 shrink-0" /> 50:50 ({JOKER_COSTS.fiftyFifty}c) - uklanja 2 netočna odgovora.</p>
                    <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" /> +{PLUS_TEN_SECONDS}s ({JOKER_COSTS.plusTen}c) - dodaje {PLUS_TEN_SECONDS} sekundi na trenutno pitanje.</p>
                    <p className="flex items-center gap-1.5"><FastForward className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Preskoči ({JOKER_COSTS.skip}c) - prelazi na sljedeće pitanje bez posljedica.</p>
                    <p className="text-slate-500 italic">Svaki joker se može iskoristiti jednom po rundi.</p>
                </Section>

                <Section icon={<Heart className="w-4 h-4 text-rose-500 fill-rose-500" />} title="Životi">
                    <p>Krećete s <b className="text-white">{MAX_LIVES}</b> života. Pogrešan odgovor ili isteklo vrijeme oduzima <b className="text-white">1 život</b>.</p>
                    <p>Kad životi padnu na 0, runda završava (Kraj Igre). Životi se ne obnavljaju tijekom runde.</p>
                </Section>

                <Section icon={<Play className="w-4 h-4 text-amber-400" />} title="Runda">
                    <p>Svaka runda ima <b className="text-white">{QUESTIONS_PER_ROUND}</b> pitanja, po <b className="text-white">{QUESTION_TIME_SECONDS}</b> sekundi svako.</p>
                    <p>Odgovorite na svih {QUESTIONS_PER_ROUND} pitanja bez gubitka svih života za pobjedu (Pobjeda).</p>
                    <p className="text-slate-500 italic">Kategorija "Opće znanje" izvlači pitanja iz svih kategorija zajedno, ne samo svojih.</p>
                </Section>

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
