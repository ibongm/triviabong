import {
    Award, Compass, Moon, Sunrise, UserCheck,
    Zap, Timer, Rocket, Clock, Gauge,
    Flame, TrendingUp, CalendarCheck, CalendarDays, Calendar,
    Star, Coins, Medal, Crown, ShieldCheck,
    LifeBuoy, Shield, AlertTriangle, Puzzle, Skull,
    Globe, History, Atom, Sparkles, GraduationCap, Wand2,
    Swords
} from 'lucide-react';

// Hidden achievements are absent from AchievementsModal entirely - row AND
// "x / y" counter - until earned, then pinned above the tier list. Exported
// because App.jsx needs the id to decide whether to fire the reveal.
export const SVI_SMO_MI_MARIJA_ID = 'svi_smo_mi_marija';

// Static catalog only - no logic here. Trigger conditions live in
// src/utils/achievements.js (ACHIEVEMENT_CHECKS), keyed by the same ids, so
// content and logic can be reviewed/edited independently but never drift on
// which ids exist (evaluateAchievements loops this array, not the checks map).
//
// "profile_complete" is deliberately simplified from its original design
// ("sign in AND set up a display name") to just "signed in" - the app has no
// self-service display-name editor anywhere (only an auto-derived default
// from email/Google profile), so the second half isn't achievable by a
// player today.
// `statOnly: true` marks achievements whose check() depends only on `stats`,
// never `ctx` - meaning they can be safely re-evaluated from a static stat
// snapshot (e.g. after an admin edit) with no gameplay-moment context. The
// admin-panel achievement REVOKE path (AdminPlayers.jsx) only ever touches
// this subset - see its comment for why: the other achievements need
// momentary context (time of day, that round's elapsed time, which jokers
// were used, an in-progress streak) that a static snapshot can't
// reconstruct, so re-checking them with an empty ctx would always evaluate
// false and revoke them regardless of whether they're still "true". A new
// achievement must deliberately opt into this flag, not default into either
// behavior.
export const ACHIEVEMENTS = [
    // Tier 1: Onboarding & First Steps
    { id: 'first_blood', tier: 1, statOnly: true, nameHr: 'Prvi korak', descriptionHr: 'Točno odgovorite na svoje prvo pitanje.', icon: Award },
    { id: 'category_explorer', tier: 1, statOnly: true, nameHr: 'Sveznalac u nastajanju', descriptionHr: 'Odigrajte barem jednu rundu u svih 8 kategorija.', icon: Compass },
    { id: 'night_owl', tier: 1, nameHr: 'Noćna ptica', descriptionHr: 'Završite rundu između ponoći i 5 ujutro.', icon: Moon },
    { id: 'early_bird', tier: 1, nameHr: 'Rano ranilac', descriptionHr: 'Završite rundu prije 7 ujutro.', icon: Sunrise },
    { id: 'profile_complete', tier: 1, nameHr: 'Popunjen profil', descriptionHr: 'Prijavite se s računom.', icon: UserCheck },

    // Tier 2: Speed & Time-Based
    { id: 'lightning_reflexes', tier: 2, nameHr: 'Brži od svjetlosti', descriptionHr: 'Točno odgovorite u manje od 2 sekunde.', icon: Zap },
    { id: 'buzzer_beater', tier: 2, nameHr: 'U zadnjoj sekundi', descriptionHr: 'Točno odgovorite s manje od 1 sekunde na satu.', icon: Timer },
    { id: 'speed_demon', tier: 2, nameHr: 'Brzinski meštar', descriptionHr: 'Završite kviz od 10 pitanja u manje od 30 sekundi, sa 100% točnosti.', icon: Rocket },
    { id: 'no_rush', tier: 2, nameHr: 'Hladne glave', descriptionHr: 'Odgovorite točno nakon više od 15 sekundi razmišljanja.', icon: Clock },
    { id: 'sonic_speed', tier: 2, nameHr: 'Zvučni zid', descriptionHr: '5 uzastopnih točnih odgovora, svaki u manje od 3 sekunde.', icon: Gauge },

    // Tier 3: Streaks & Consistency
    { id: 'on_fire', tier: 3, nameHr: 'U plamenu', descriptionHr: 'Dosegnite niz od 5 točnih odgovora u jednoj rundi.', icon: Flame },
    { id: 'unstoppable', tier: 3, nameHr: 'Nezaustavljiv', descriptionHr: 'Dosegnite niz od 10 točnih odgovora u jednoj rundi.', icon: TrendingUp },
    { id: 'daily_habit', tier: 3, statOnly: true, nameHr: 'Svakodnevna rutina', descriptionHr: 'Igrajte 3 dana zaredom.', icon: CalendarCheck },
    { id: 'weekly_warrior', tier: 3, statOnly: true, nameHr: 'Tjedni ratnik', descriptionHr: 'Igrajte 7 dana zaredom.', icon: CalendarDays },
    { id: 'monthly_master', tier: 3, statOnly: true, nameHr: 'Igrač mjeseca', descriptionHr: 'Igrajte 30 dana zaredom.', icon: Calendar },

    // Tier 4: Score & Perfection
    { id: 'perfectionist', tier: 4, nameHr: 'Perfekcionist', descriptionHr: 'Riješite kviz sa 100% točnosti (10/10).', icon: Star },
    { id: 'high_roller', tier: 4, nameHr: 'Sakupljač bodova', descriptionHr: 'Osvojite preko 5.000 bodova u jednoj rundi.', icon: Coins },
    { id: 'century_club', tier: 4, statOnly: true, nameHr: 'Klub 100', descriptionHr: 'Točno odgovorite na 100 pitanja ukupno.', icon: Medal },
    { id: 'trivia_legend', tier: 4, statOnly: true, nameHr: 'Trivia Legenda', descriptionHr: 'Točno odgovorite na 1.000 pitanja ukupno.', icon: Crown },
    { id: 'flawless_victory', tier: 4, statOnly: true, nameHr: 'Bez greške', descriptionHr: 'Odigrajte 3 savršene runde zaredom.', icon: ShieldCheck },

    // Tier 5: Tactical & Lifelines
    { id: 'life_saver', tier: 5, nameHr: 'Pametno iskorišteno', descriptionHr: 'Iskoristite 50:50 i točno odgovorite na to pitanje.', icon: LifeBuoy },
    { id: 'purist', tier: 5, nameHr: 'Bez tuđe pomoći', descriptionHr: 'Pobijedite u rundi bez korištenja ijednog jokera.', icon: Shield },
    { id: 'close_call', tier: 5, nameHr: 'Sreća u nesreći', descriptionHr: 'Iskoristite Preskoči s posljednjim životom i pobijedite.', icon: AlertTriangle },
    { id: 'tactician', tier: 5, nameHr: 'Taktičar', descriptionHr: 'Iskoristite sva 3 jokera u jednoj rundi.', icon: Puzzle },
    { id: 'living_dangerously', tier: 5, nameHr: 'Hod po rubu', descriptionHr: 'Dosegnite zadnje pitanje bez preostalih jokera i točno odgovorite.', icon: Skull },

    // Tier 6: Category Mastery
    { id: 'geographer', tier: 6, statOnly: true, nameHr: 'Svjetski putnik', descriptionHr: '50 točnih odgovora u kategoriji Geografija.', icon: Globe },
    { id: 'history_buff', tier: 6, statOnly: true, nameHr: 'Povjesničar', descriptionHr: '50 točnih odgovora u kategoriji Povijest.', icon: History },
    { id: 'science_whiz', tier: 6, statOnly: true, nameHr: 'Znanstvenik', descriptionHr: '50 točnih odgovora u kategoriji Znanost i Tehnologija.', icon: Atom },
    { id: 'pop_culture_icon', tier: 6, statOnly: true, nameHr: 'Ikona pop kulture', descriptionHr: '50 točnih odgovora u kategoriji Pop kultura.', icon: Sparkles },
    { id: 'jack_of_all_trades', tier: 6, statOnly: true, nameHr: 'Majstor svih zanata', descriptionHr: 'Ostvarite 80%+ točnosti u svakoj kategoriji.', icon: GraduationCap },

    // Tier 7: 1v1 (Plan B) - statOnly since it only depends on the
    // total1v1Wins counter (incremented directly in App.jsx's match-over
    // handler, not via the per-answer handleAnswer pipeline the rest of
    // this catalog goes through).
    { id: 'first_1v1_win', tier: 7, statOnly: true, nameHr: 'Prva pobjeda 1v1', descriptionHr: 'Pobijedite u 1v1 dvoboju protiv drugog igrača.', icon: Swords },

    // Hidden. `tier: 0` matches none of the TIERS AchievementsModal renders,
    // which is a second, independent guard on top of the `hidden` flag - it
    // can't leak into a tier section even if that filter is ever changed.
    // The description names the trigger openly because it's only ever shown
    // after the achievement has already been earned.
    { id: SVI_SMO_MI_MARIJA_ID, tier: 0, hidden: true, nameHr: 'Svi smo mi Marija', descriptionHr: 'Točno ste odgovorili na pitanje o Harryju Potteru.', icon: Wand2 },
];

export const ACHIEVEMENT_TIER_LABELS = {
    1: 'Prvi koraci',
    2: 'Brzina i vrijeme',
    3: 'Nizovi i ustrajnost',
    4: 'Rezultat i savršenstvo',
    5: 'Taktika i jokeri',
    6: 'Majstorstvo kategorija',
    7: '1v1 Dvoboji',
};
