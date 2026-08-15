import { X, HelpCircle, Zap, Award, Coins, Scissors, Clock, FastForward, Heart, Play, CalendarDays, Swords, Trophy, Medal, Crown, ListChecks, PenSquare } from 'lucide-react';
import {
    MAX_LIVES,
    QUESTIONS_PER_ROUND,
    QUESTION_TIME_SECONDS,
    PLUS_TEN_SECONDS,
    BASE_SCORE,
    SPEED_BONUS_PER_SECOND,
    STREAK_MULTIPLIER_STEP,
    XP_PER_CORRECT_ANSWER,
    COIN_STREAK_MILESTONES,
    JOKER_COSTS,
    DAILY_CHALLENGE_PARTICIPATION_XP,
    DAILY_CHALLENGE_TOP3_COINS,
    DAILY_CHALLENGE_TOP3_XP,
    DAILY_CHALLENGE_WIN_STREAK_COINS,
    ONE_VS_ONE_WIN_XP,
    ONE_VS_ONE_WIN_COINS,
    ACHIEVEMENT_NORMAL_XP,
    ACHIEVEMENT_NORMAL_COINS,
    ACHIEVEMENT_HIDDEN_XP,
    ACHIEVEMENT_HIDDEN_COINS,
    COMMUNITY_QUESTION_APPROVED_XP,
    COMMUNITY_QUESTION_APPROVED_COINS
} from '../constants/gameBalance';
import { xpForLevel, getCoinsForLevelUp } from '../utils/leveling';
import { LEVEL_TITLES, getTitleForLevel, MAX_TITLED_LEVEL } from '../constants/levelTitles';
import { MISSION_REWARDS } from '../constants/missions';
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
                    <p>Svaki točan odgovor donosi <b className="text-white">+{XP_PER_CORRECT_ANSWER} XP</b>.</p>
                    <p>XP se dodatno zarađuje kroz Dnevni izazov, 1v1 dvoboje, trofeje (<b className="text-white">+{ACHIEVEMENT_NORMAL_XP}</b> obični, <b className="text-white">+{ACHIEVEMENT_HIDDEN_XP}</b> tajni) i odobrena predložena pitanja - vidi odgovarajuće odjeljke ispod.</p>
                    <p>Svaka sljedeća razina traži sve više XP-a.</p>
                    <p className="text-slate-500 italic">
                        Razina 2: {xpForLevel(2)} XP, razina 10: {xpForLevel(10)} XP, razina 50: {xpForLevel(50)} XP.
                    </p>
                    <p>Razina se može popeti i usred runde, čim XP pređe sljedeći prag - svaki uspon nosi svoju titulu i novčani bonus.</p>
                </Section>

                <Section icon={<Crown className="w-4 h-4 text-amber-400" />} title="Titule">
                    <p>Svaka razina od 1 do {MAX_TITLED_LEVEL} ima vlastitu hrvatsku titulu koja se prikazuje kad postigneš tu razinu.</p>
                    <p className="text-slate-500 italic">
                        Razina 1: "{getTitleForLevel(1)}" · Razina 25: "{getTitleForLevel(25)}" · Razina {MAX_TITLED_LEVEL}: "{getTitleForLevel(MAX_TITLED_LEVEL)}".
                    </p>
                    <p className="text-slate-500 italic">Sve {LEVEL_TITLES.length} titule možeš vidjeti kako se otključavaju dok napreduješ.</p>
                </Section>

                <Section icon={<Coins className="w-4 h-4 text-amber-400" />} title="Novčići">
                    <p>Novi igrači kreću s <b className="text-white">{DEFAULT_GLOBAL_STATS.coins}</b> novčića.</p>
                    <p>Niz točnih odgovora u rundi donosi novčiće na ključnim brojevima: <b className="text-white">{COIN_STREAK_MILESTONES[3]}</b> na 3., <b className="text-white">{COIN_STREAK_MILESTONES[5]}</b> na 5., <b className="text-white">{COIN_STREAK_MILESTONES[10]}</b> na 10. uzastopni točan odgovor.</p>
                    <p>Prelazak na novu razinu donosi <b className="text-white">{getCoinsForLevelUp(1)}</b> novčića na razinama 1-5, a <b className="text-white">5 + razina</b> novčića od 6. razine nadalje - svaka 10. razina nosi dodatnih <b className="text-white">+25</b> novčića.</p>
                    <p>Otključani trofej donosi <b className="text-white">+{ACHIEVEMENT_NORMAL_COINS}</b> novčića (obični) ili <b className="text-white">+{ACHIEVEMENT_HIDDEN_COINS}</b> (tajni).</p>
                    <p>Odobreno predloženo pitanje donosi <b className="text-white">+{COMMUNITY_QUESTION_APPROVED_COINS}</b> novčića i <b className="text-white">+{COMMUNITY_QUESTION_APPROVED_XP}</b> XP.</p>
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

                <Section icon={<CalendarDays className="w-4 h-4 text-amber-400" />} title="Dnevni izazov">
                    <p>Svaki dan svi igrači dobiju <b className="text-white">isti set od {QUESTIONS_PER_ROUND} pitanja</b> - jednom besplatno, jedan pokušaj po danu.</p>
                    <p>Jokeri nisu dostupni u dnevnom izazovu.</p>
                    <p>Sudjelovanje donosi <b className="text-white">+{DAILY_CHALLENGE_PARTICIPATION_XP} XP</b>. Rezultat se odmah upisuje na dnevnu ljestvicu, koja je vidljiva uživo tijekom cijelog dana.</p>
                    <p>Kad dan završi (u ponoć po zagrebačkom vremenu), prva tri mjesta osvajaju: <b className="text-white">1.</b> {DAILY_CHALLENGE_TOP3_COINS[1]} novčića / {DAILY_CHALLENGE_TOP3_XP[1]} XP, <b className="text-white">2.</b> {DAILY_CHALLENGE_TOP3_COINS[2]} novčića / {DAILY_CHALLENGE_TOP3_XP[2]} XP, <b className="text-white">3.</b> {DAILY_CHALLENGE_TOP3_COINS[3]} novčića / {DAILY_CHALLENGE_TOP3_XP[3]} XP - u slučaju izjednačenja, nagradu dobivaju svi izjednačeni igrači.</p>
                    <p className="text-slate-500 italic">Uzastopni dani na 1. mjestu nose rastuću nagradu (od {DAILY_CHALLENGE_WIN_STREAK_COINS[1]} novčića prvi dan do {DAILY_CHALLENGE_WIN_STREAK_COINS[7]} novčića na 7. dan zaredom).</p>
                </Section>

                <Section icon={<Swords className="w-4 h-4 text-emerald-400" />} title="1v1 Dvoboj">
                    <p>Pozovi bilo kojeg <b className="text-white">online igrača</b> iz predvorja na dvoboj uživo - odaberi kategoriju, pošalji poziv, a on ga prihvaća ili odbija.</p>
                    <p>Kad oba igrača kliknu <b className="text-white">Spreman</b>, dvoboj počinje istovremeno za oboje nakon kratkog odbrojavanja.</p>
                    <p>Igra se {QUESTIONS_PER_ROUND} pitanja - ako je nakon toga neriješeno, odlučuje dodatno pitanje (iznenadna smrt). Jokeri nisu dostupni.</p>
                    <p>Pobjeda donosi <b className="text-white">+{ONE_VS_ONE_WIN_XP} XP</b> i <b className="text-white">+{ONE_VS_ONE_WIN_COINS}</b> novčića.</p>
                    <p className="text-slate-500 italic">Ako protivnik ne odgovori i ne javi se dulje vrijeme, možeš prijaviti predaju i pobijediti. Rezultati dvoboja spremaju se u tvoju povijest, a pobjede se broje za trofej.</p>
                </Section>

                <Section icon={<ListChecks className="w-4 h-4 text-amber-400" />} title="Dnevne misije">
                    <p>Svaki dan dobiješ <b className="text-white">3 misije</b> iz rotirajućeg 7-dnevnog rasporeda - jedna za način igre, jedna za određenu kategoriju, jedna raznovrsna.</p>
                    <p>Svaka dovršena misija donosi <b className="text-white">+{MISSION_REWARDS.SLOT_COMPLETION}</b> novčića. Dovršiš li sve 3 istog dana, dobivaš dodatnih <b className="text-white">+{MISSION_REWARDS.CLEAN_SWEEP_BONUS}</b> novčića bonus.</p>
                    <p className="text-slate-500 italic">Misije se resetiraju svaki dan u ponoć po zagrebačkom vremenu - nedovršen napredak se ne prenosi. Zahtijeva prijavu. Otvori "Dnevne misije" u predvorju za današnji raspored i preuzimanje nagrada.</p>
                </Section>

                <Section icon={<PenSquare className="w-4 h-4 text-amber-400" />} title="Zajednica">
                    <p>Klikom na "Predloži pitanje" u predvorju možeš predložiti novo pitanje za igru - odaberi kategoriju, upiši pitanje, točan odgovor i 3 netočna.</p>
                    <p>Svako predloženo pitanje pregledava admin prije nego postane dio igre.</p>
                    <p>Odobreno pitanje donosi <b className="text-white">+{COMMUNITY_QUESTION_APPROVED_XP} XP</b> i <b className="text-white">+{COMMUNITY_QUESTION_APPROVED_COINS}</b> novčića. Zahtijeva prijavu.</p>
                </Section>

                <Section icon={<Trophy className="w-4 h-4 text-amber-400" />} title="Trofeji">
                    <p>Trofeji se otključavaju automatski dok igraš - za brzinu, nizove, rezultat, korištenje jokera, majstorstvo kategorija i još mnogo toga.</p>
                    <p className="text-slate-500 italic">Neki trofeji su tajni i ne otkrivaju se dok ih ne osvojiš. Pregled svih trofeja nalazi se u Statistika → Trofeji.</p>
                </Section>

                <Section icon={<Medal className="w-4 h-4 text-amber-400" />} title="Rekordi">
                    <p>Predvorje prikazuje globalne ljestvice: dnevni izazov, najviša razina, najbolji rezultat, najbrža savršena runda, najduži niz točnih odgovora, najviše trofeja i najduži niz dana zaredom.</p>
                    <p className="text-slate-500 italic">Puni pregled svih ljestvica dostupan je klikom na "Vidi sve →" iznad kompaktnog prikaza.</p>
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
