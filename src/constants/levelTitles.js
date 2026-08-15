// Player level titles, index 0 = Level 1. Verbatim from
// TriviaBong_Level_Titles.md.docx - do not paraphrase or translate.
export const LEVEL_TITLES = [
    "Slučajni Prolaznik",       // Lvl 1
    "Znatiželjni Promatrač",    // Lvl 2
    "Kviz Početnik",            // Lvl 3
    "Sakupljač Zanimljivosti",  // Lvl 4
    "Radoznali Um",             // Lvl 5
    "Kviz Šegrt",                // Lvl 6
    "Pripravnik Znanja",        // Lvl 7
    "Lovac na Odgovore",        // Lvl 8
    "Pametnjaković",            // Lvl 9
    "Kviz Entuzijast",          // Lvl 10
    "Šaptač s Klupe",            // Lvl 11
    "Joker s Klupe",            // Lvl 12
    "Brzi Prst",                // Lvl 13
    "Dežurna Sveznalica",        // Lvl 14
    "Kvizofil",                 // Lvl 15
    "Prekaljeni Igrač",         // Lvl 16
    "Enigmat",                  // Lvl 17
    "Iskusni Kvizaš",           // Lvl 18
    "Lovac na Bodove",          // Lvl 19
    "Pub Kviz Veteran",         // Lvl 20
    "Specijalist za Kategorije", // Lvl 21
    "Kviz Taktičar",             // Lvl 22
    "Majstor Asocijacija",      // Lvl 23
    "Hladnokrvni Mozak",        // Lvl 24
    "Kviz Analitičar",           // Lvl 25
    "Kirurg za Pitanja",        // Lvl 26
    "Riješena Enigma",           // Lvl 27
    "Dominator Rundi",          // Lvl 28
    "Teška Kategorija",         // Lvl 29
    "Kviz Majstor",             // Lvl 30
    "Erudit",                   // Lvl 31
    "Arhivist Činjenica",        // Lvl 32
    "Hodajući Leksikon",         // Lvl 33
    "Kviz Strateg",             // Lvl 34
    "Profesor",                 // Lvl 35
    "Živa Enciklopedija",        // Lvl 36
    "Polihistor",                // Lvl 37
    "Vladar Tablice",           // Lvl 38
    "Kviz Šampion",              // Lvl 39
    "Kviz Velemajstor",         // Lvl 40
    "Intelektualna Sila",       // Lvl 41
    "Gospodar Formata",         // Lvl 42
    "Mozak Bez Greške",          // Lvl 43
    "Kviz Monarh",              // Lvl 44
    "Čuvar Znanja",              // Lvl 45
    "Nepobjedivi Um",           // Lvl 46
    "Vrhovni Arbitar",          // Lvl 47
    "Kviz Fenomen",             // Lvl 48
    "Kviz Titan",               // Lvl 49
    "Trivia Bong",              // Lvl 50
];

export const MAX_TITLED_LEVEL = LEVEL_TITLES.length;

/**
 * Title for a given level - clamped to [1, MAX_TITLED_LEVEL] so a level
 * beyond 50 (or a defensively-passed 0) still returns a sensible title
 * rather than undefined.
 */
export const getTitleForLevel = (level) => {
    const idx = Math.max(1, Math.min(level, MAX_TITLED_LEVEL)) - 1;
    return LEVEL_TITLES[idx];
};
