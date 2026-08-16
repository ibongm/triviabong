# Analiza Pitanja i Odgovora (Glazba / Music)

U nastavku se nalazi pregled uočenih problema u pruženom skupu pitanja i odgovora iz kategorije **Glazba**, razvrstanih u tri glavne skupine: **netočna pitanja ili odgovori**, **pitanja koja sugeriraju točan odgovor (hinting / duplikati)** te **nejasno, dvosmisleno ili gramatički loše formulirana pitanja**.

---

## 1. Netočne činjenice ili pogrešni odgovori (Incorrect Questions / Answers)

1. **`hr_mus_12`**
   - **Pitanje:** "Koji je reket/glazbeni žanr nastao krajem 1970-ih u Jamajci, a proslavio ga je Bob Marley?"
   - **Problem:** Tipfeler "reket" umjesto "reggae" ili "glazbeni žanr". Također, Reggae je nastao u kasnim **1960-ima** (oko 1968.), a ne krajem 1970-ih.
   - **Prijedlog popravka:** Promijeniti u "Koji je glazbeni žanr nastao krajem 1960-ih na Jamajci..."

2. **`hr_mus_248`**
   - **Pitanje:** "Koji je američki rock sastav izdao album 'Who's Next' te operu 'Tommy'?"
   - **Problem:** **The Who** je **britanski (engleski)** rock sastav, a ne američki!
   - **Prijedlog popravka:** Zamijeniti pridjev "američki" s "britanski" ili "engleski".

3. **`hr_mus_427`**
   - **Pitanje:** "Koji je hrvatski rap izvođač iz Trilja izdao album 'Vojko' 2018. godine s hitom 'Ne može'?"
   - **Problem:** Vojko V **nije iz Trilja**, nego je iz **Splita** (rođen u Kninu / odrastao u Splitu). Iz Trilja je reper Grše (`hr_mus_428`).
   - **Prijedlog popravka:** Promijeniti u "...izvođač iz Splita...".

4. **`hr_mus_551`**
   - **Pitanje:** "Koji je engleski rock sastav vodio Bono Vox?"
   - **Ponuđeni točan odgovor:** "U2 (napomena: irski sastav)"
   - **Problem:** U samom pitanju stoji "Koji je **engleski** rock sastav...", a u polju odgovora stoji napomena da je sastav zapravo **irski**. Sam tekst pitanja sadrži netočnu činjenicu.
   - **Prijedlog popravka:** Izmijeniti tekst pitanja u: "Koji je irski rock sastav vodio Bono Vox?".

5. **`hr_mus_615`**
   - **Pitanje:** "Ako saksofon i klarinet spadaju u puhačke instrumente, koji od njih ima jedinstven pisk od trske?"
   - **Ponuđeni točan odgovor:** "Klarinet (jednostruki) i Saksofon (jednostruki)"
   - **Problem:** Pitanje je postavljeno u formi wy-ili ("koji od njih..."), a točan odgovor spaja **obazva** instrumenta jer i saksofon i klarinet imaju jednostruki pisk. Pitanje je neispravno koncipirano u odnosu na ponuđeni odgovor.
   - **Prijedlog popravka:** Preformulirati pitanje (npr. "Kakav pisk od trske koriste saksofon i klarinet?").

6. **`hr_mus_626` vs `hr_mus_817`**
   - **Pitanje `hr_mus_626`:** "Koja je pjesma grupe Rammstein postala njihov najveći međunarodni hit s albuma 'Mutter'?" -> Odgovor: "Sonne (ili Du hast)"
   - **Problem:** Pjesma *Du hast* se nalazi na albumu **Sehnsucht** (1997.), a ne na albumu **Mutter** (2001.). U pitanju `hr_mus_817` pravilno piše da je *Du hast* s albuma *Sehnsucht*. Odgovor na `hr_mus_626` je pogrešan i kontradiktoran.

7. **`hr_mus_791`**
   - **Pitanje:** "Koji je istarski rock sastav iz Pule izvodio pjesme 'Samo anđeli znaju', 'Moja prva ljubav' i 'Jedina'?"
   - **Ponuđeni točan odgovor:** "Atomsko sklonište (ili Gustafi/KUD Idijoti)"
   - **Problem:** Pjesme *Samo anđeli znaju*, *Moja prva ljubav* i *Jedina* izvodi riječka grupa **Fit**, a ne Atomsko sklonište, Gustafi ili KUD Idijoti! Cijelo pitanje i odgovor su činjenično potpuno pogrešni.
   - **Prijedlog popravka:** Izbrisati ili potpuno preformulirati pitanje za grupu Fit.

---

## 2. Pitanja s navođenjem (Hinting), trivijalnim odgovoricama i masovnim duplikatima

Baza sadrži iznimno velik broj **doslovnih duplikata ili skoro identičnih ponovljenih pitanja**, kao i pitanja koja u samom tekstu daju odgovor.

### A. Izravni Hinting / Odgovor u pitanju
1. **`hr_mus_122`**
   - **Pitanje:** "Koji je glazbeni instrument s udaraljkama i metalnim pločicama izumio Auguste Mustel pod nazivom **Čelesta**?"
   - **Točan odgovor:** **Čelesta**
   - **Problem:** Pitanje doslovno imenuje instrument koji je točan odgovor.

2. **`hr_mus_199`**
   - **Pitanje:** "Koji je njemački skladatelj napisao poznati 'Kanonski ples u D-duru' (**Pachelbelov** kanon)?"
   - **Točan odgovor:** Johann **Pachelbel**
   - **Problem:** Prezime skladatelja je navedeno u zagradi unutar pitanja.

3. **`hr_mus_200`**
   - **Pitanje:** "...poznat po hitovima 'Africa' i 'Rosanna' s albuma '**Toto IV**'?" -> **Točan odgovor:** **Toto**

4. **`hr_mus_303` & `hr_mus_304`**
   - **`hr_mus_303`:** "Koji je američki hard rock sastav iz New Jerseyja predvođen **Jonom** izdao album 'Slippery When Wet'?" -> Odgovor: **Bon Jovi** (Ime Jon odaje Bon Jovija).

5. **`hr_mus_668` & `hr_mus_828`**
   - **Pitanje:** "Ako saksofon spada u puhačke instrumente, tko ga je izumio u 19. stoljeću?" / "Tko je izumio saksofon u 19. stoljeću?"
   - **Točan odgovor:** Adolphe **Sax**
   - **Problem:** Instrument se zove **Sax**-ofon, pa je prezime izumitelja očito i trivijalno.

---

### B. Masovni duplikati i ponavljana pitanja u bazi
U bazi se identična ili minimalno preformulirana pitanja pojavljuju više puta:

- **Eminem / 'The Marshall Mathers LP'**: `hr_mus_20`, `hr_mus_518`
- **Michael Jackson / 'Thriller'**: `hr_mus_17`, `hr_mus_515`, `hr_mus_796`
- **Michael Jackson / 'King of Pop'**: `hr_mus_2`, `hr_mus_493`
- **Elvis Presley / 'King of Rock 'n' Roll'**: `hr_mus_121`, `hr_mus_494`
- **ABBA / Eurovizija 1974 ('Waterloo')**: `hr_mus_19`, `hr_mus_513`
- **Nirvana / 'Nevermind'**: `hr_mus_22`, `hr_mus_165`, `hr_mus_558`
- **Nirvana / 'Smells Like Teen Spirit'**: `hr_mus_104`, `hr_mus_512`
- **AC/DC / 'Highway to Hell' & 'Back in Black'**: `hr_mus_16`, `hr_mus_530`
- **AC/DC / Bon Scott**: `hr_mus_688`, `hr_mus_833`
- **AC/DC / Angus Young (školska uniforma)**: `hr_mus_690`, `hr_mus_834`
- **Queen / Freddie Mercury**: `hr_mus_99`, `hr_mus_497`
- **Queen / 'Bohemian Rhapsody'**: `hr_mus_8`, `hr_mus_527`
- **Guns N' Roses / 'Sweet Child O' Mine'**: `hr_mus_102`, `hr_mus_539`
- **Led Zeppelin / 'Stairway to Heaven'**: `hr_mus_51`, `hr_mus_516`
- **The Beatles / Liverpool**: `hr_mus_4`, `hr_mus_496`
- **The Rolling Stones / Mick Jagger**: `hr_mus_15`, `hr_mus_523`
- **David Bowie / Ziggy Stardust & Space Oddity**: `hr_mus_47`, `hr_mus_553`, `hr_mus_572`
- **U2 / Bono Vox**: `hr_mus_45`, `hr_mus_551`, `hr_mus_799`
- **U2 / Irska**: `hr_mus_45`, `hr_mus_552`
- **Pink Floyd / 'Dark Side of the Moon'**: `hr_mus_1`, `hr_mus_501`
- **Jimi Hendrix / Woodstock 1969**: `hr_mus_24`, `hr_mus_502`
- **Luis Fonsi / 'Despacito'**: `hr_mus_6`, `hr_mus_507`
- **Adele / 'Rolling in the Deep'**: `hr_mus_23`, `hr_mus_522`
- **Ed Sheeran / 'Shape of You'**: `hr_mus_83`, `hr_mus_531`
- **Baby Lasagna / Eurovizija 2024**: `hr_mus_476`, `hr_mus_556`
- **Let 3 / 'Mama ŠČ!'**: `hr_mus_477`, `hr_mus_562`
- **John Lennon / 'Imagine'**: `hr_mus_138`, `hr_mus_563`, `hr_mus_563`
- **Daft Punk / Robotske kacige**: `hr_mus_27`, `hr_mus_564`
- **Bob Marley / Reggae**: `hr_mus_12`, `hr_mus_123`, `hr_mus_565`
- **Sanremo festival**: `hr_mus_141`, `hr_mus_566`
- **Teatro alla Scala (La Scala)**: `hr_mus_107`, `hr_mus_568`
- **Whitney Houston / 'I Will Always Love You'**: `hr_mus_55`, `hr_mus_569`
- **Dolly Parton / 'I Will Always Love You'**: `hr_mus_146`, `hr_mus_570`
- **Zdravko Čolić**: `hr_mus_571`, `hr_mus_801`
- **Black Sabbath / Ozzy Osbourne**: `hr_mus_178`, `hr_mus_573`, `hr_mus_618`
- **Iron Maiden / Eddie**: `hr_mus_88`, `hr_mus_574`
- **The Clash / 'London Calling'**: `hr_mus_247`, `hr_mus_577`
- **Ramones / 'Blitzkrieg Bop'**: `hr_mus_177`, `hr_mus_578`
- **Psihomodo Pop / Davor Gobac**: `hr_mus_414`, `hr_mus_580`
- **Parni Valjak / Aki Rahimovski**: `hr_mus_467`, `hr_mus_581`
- **OutKast / André 3000 & Big Boi**: `hr_mus_128`, `hr_mus_582`, `hr_mus_803`
- **Stevie Wonder / 'Superstition'**: `hr_mus_142`, `hr_mus_185`, `hr_mus_583`
- **Ksilofon**: `hr_mus_584`, `hr_mus_804`
- **Aretha Franklin / 'Respect'**: `hr_mus_69`, `hr_mus_136`, `hr_mus_586`, `hr_mus_806`
- **Otis Redding / 'Respect'**: `hr_mus_585`, `hr_mus_805`
- **Oasis / 'Definitely Maybe'**: `hr_mus_72`, `hr_mus_589`
- **The Weeknd / 'Blinding Lights'**: `hr_mus_91`, `hr_mus_592`
- **Louis Armstrong / 'What a Wonderful World' / Satchmo**: `hr_mus_34`, `hr_mus_557`, `hr_mus_593`, `hr_mus_800`
- **Frank Sinatra / 'My Way' / 'Ol' Blue Eyes'**: `hr_mus_125`, `hr_mus_594`
- **Felix Mendelssohn / 'Svadbeni marš'**: `hr_mus_115`, `hr_mus_595`, `hr_mus_807`
- **Richard Wagner / 'Prsten Nibelunga'**: `hr_mus_127`, `hr_mus_596`
- **R.E.M. / 'Losing My Religion'**: `hr_mus_190`, `hr_mus_597`
- **Bruce Springsteen / 'The Boss'**: `hr_mus_14`, `hr_mus_599`
- **Bob Dylan / Nobelova nagrada / 'Blowin' in the Wind'**: `hr_mus_41`, `hr_mus_600`, `hr_mus_601`
- **Phil Collins / Genesis**: `hr_mus_182`, `hr_mus_603`, `hr_mus_808`
- **Elton John**: `hr_mus_35`, `hr_mus_604`
- **Denis & Denis / Marina Perazić**: `hr_mus_606`, `hr_mus_607`, `hr_mus_809`
- **Laufer / Damir Urban / 'Moja voda'**: `hr_mus_421`, `hr_mus_608`, `hr_mus_609`
- **Hladno Pivo / 'Džinovski'**: `hr_mus_610`, `hr_mus_810`
- **KUD Idijoti**: `hr_mus_422`, `hr_mus_612`, `hr_mus_811`
- **Paraf**: `hr_mus_613`, `hr_mus_812`
- **Pankrti**: `hr_mus_465`, `hr_mus_614`
- **System of a Down / 'Toxicity' / Serj Tankian**: `hr_mus_180`, `hr_mus_616`, `hr_mus_617`
- **Motörhead / Lemmy Kilmister / 'Ace of Spades'**: `hr_mus_269`, `hr_mus_619`, `hr_mus_620`
- **Roxette**: `hr_mus_621`, `hr_mus_814`
- **Europe / 'The Final Countdown'**: `hr_mus_623`, `hr_mus_815`
- **Scorpions / 'Wind of Change'**: `hr_mus_299`, `hr_mus_624`, `hr_mus_816`
- **Rammstein / Till Lindemann**: `hr_mus_39`, `hr_mus_625`
- **Jelena Rozga / 'Bižuterija'**: `hr_mus_628`, `hr_mus_818`
- **Tonči Huljić / Magazin**: `hr_mus_629`, `hr_mus_819`
- **Splitski festival**: `hr_mus_471`, `hr_mus_632`, `hr_mus_820`
- **Claude Debussy / 'Clair de lune'**: `hr_mus_74`, `hr_mus_643`, `hr_mus_822`
- **Igor Stravinski / 'Posvećenje proljeća'**: `hr_mus_84`, `hr_mus_644`, `hr_mus_823`
- **Edvard Grieg / 'Peer Gynt'**: `hr_mus_183`, `hr_mus_646`, `hr_mus_824`
- **Jean Sibelius / 'Finlandia'**: `hr_mus_168`, `hr_mus_647`, `hr_mus_825`
- **Disciplin A Kitschme / Koja**: `hr_mus_656`, `hr_mus_826`
- **Divlje Jagode / Zele Lipovača**: `hr_mus_435`, `hr_mus_664`, `hr_mus_827`
- **Max Martin**: `hr_mus_676`, `hr_mus_829`
- **Taylor Swift / 'The Eras Tour'**: `hr_mus_677`, `hr_mus_830`
- **The White Stripes / 'Seven Nation Army'**: `hr_mus_682`, `hr_mus_683`, `hr_mus_831`, `hr_mus_832`
- **Jim Morrison / The Doors**: `hr_mus_79`, `hr_mus_691`, `hr_mus_835`
- **Klub 27**: `hr_mus_692`, `hr_mus_836`
- **Wu-Tang Clan**: `hr_mus_54`, `hr_mus_694`, `hr_mus_837`
- **2Pac**: `hr_mus_114`, `hr_mus_696`, `hr_mus_838`
- **Beastie Boys / 'Licensed to Ill'**: `hr_mus_697`, `hr_mus_839`
- **Kiss / Gene Simmons**: `hr_mus_700`, `hr_mus_701`, `hr_mus_840`, `hr_mus_841`
- **Eric Clapton**: `hr_mus_704`, `hr_mus_842`
- **Karlo Metikoš & Josipa Lisac / 'Dnevnik jedne ljubavi'**: `hr_mus_707`, `hr_mus_708`, `hr_mus_843`, `hr_mus_844`
- **Arsen Dedić**: `hr_mus_447`, `hr_mus_709`, `hr_mus_845`
- **Gabi Novak**: `hr_mus_710`, `hr_mus_846`
- **Maja Blagdan / 'Sveta ljubav'**: `hr_mus_714`, `hr_mus_847`
- **Colonia / Indira Levak**: `hr_mus_487`, `hr_mus_716`, `hr_mus_848`
- **Nizozemski DJ-evi (Tiësto, Garrix, Armin)**: `hr_mus_720`, `hr_mus_849`
- **Ultra Europe / Poljud**: `hr_mus_721`, `hr_mus_850`
- **Tomorrowland / Belgija**: `hr_mus_97`, `hr_mus_722`, `hr_mus_851`
- **Exit festival / Novi Sad**: `hr_mus_723`, `hr_mus_852`
- **Måneskin / Damiano David**: `hr_mus_50`, `hr_mus_727`, `hr_mus_728`, `hr_mus_853`
- **Lordi / Eurosong 2006**: `hr_mus_731`, `hr_mus_854`
- **Nightwish / Tuomas Holopainen**: `hr_mus_143`, `hr_mus_732`, `hr_mus_855`
- **Michael Jackson / 'Moonwalk' / 'Billie Jean'**: `hr_mus_735`, `hr_mus_856`
- **Dino Jelusić / Whitesnake**: `hr_mus_740`, `hr_mus_857`
- **Tamburica**: `hr_mus_742`, `hr_mus_858`
- **Ljerica**: `hr_mus_743`, `hr_mus_859`
- **Gusle**: `hr_mus_744`, `hr_mus_860`
- **Klapsko pjevanje**: `hr_mus_747`, `hr_mus_861`
- **A cappella**: `hr_mus_749`, `hr_mus_862`
- **Glissando**: `hr_mus_752`, `hr_mus_863`
- **Spice Girls**: `hr_mus_40`, `hr_mus_756`, `hr_mus_864`
- **Bruno Mars**: `hr_mus_109`, `hr_mus_760`, `hr_mus_865`
- **Gorillaz / Damon Albarn**: `hr_mus_764`, `hr_mus_866`
- **Carole King / 'Tapestry'**: `hr_mus_191`, `hr_mus_769`, `hr_mus_867`
- **ZZ Top**: `hr_mus_773`, `hr_mus_868`
- **Dave Grohl / Foo Fighters**: `hr_mus_71`, `hr_mus_777`, `hr_mus_869`
- **Pearl Jam / Eddie Vedder / 'Ten'**: `hr_mus_155`, `hr_mus_779`, `hr_mus_870`
- **Quincy Jones**: `hr_mus_782`, `hr_mus_871`
- **George Martin / Peti Beatle**: `hr_mus_783`, `hr_mus_872`
- **Brian Epstein**: `hr_mus_784`, `hr_mus_873`
- **Solmizacija (Sol -> La)**: `hr_mus_785`, `hr_mus_874`
- **Oktava / 12 polutonova**: `hr_mus_786`, `hr_mus_875`
- **Michael Bublé**: `hr_mus_789`, `hr_mus_876`
- **Atomsko sklonište**: `hr_mus_663`, `hr_mus_877`

---

## 3. Nejasno, dvosmisleno ili gramatički neispravno napisana pitanja

1. **`hr_mus_7`**
   - **Tekst:** "...izvala albume..."
   - **Problem:** Tipfeler "izvala" umjesto "izdala".

2. **`hr_mus_22`**
   - **Tekst:** "Koji je seatlleški grunge sastav..."
   - **Problem:** Tipfeler "seatlleški" umjesto "sijetlski" ili "sijetlovski" / "seattleski".

3. **`hr_mus_28` & `hr_mus_187`**
   - **Tekst:** "...i izvala pjesme..."
   - **Problem:** Tipfeler "izvala" umjesto "izdala".

4. **`hr_mus_223`**
   - **Tekst:** "Koji je njemački skladatelj napisao operu 'Čarobni strelac' (Der Freischütz)?"
   - **Problem:** Na hrvatskom se opera standardno zove **Strijelac vilenjak** ili **Čarobni strijelac** (s 'ij', ne 'strelac').

5. **`hr_mus_372`**
   - **Tekst:** "...i izvala hit..."
   - **Problem:** Tipfeler "izvala" umjesto "izvela".

6. **`hr_mus_415` & `hr_mus_503` & `hr_mus_580` & `hr_mus_613` & `hr_mus_666` & `hr_mus_791`**
   - **Tekst:** U ponuđenim odgovorima umjesto "Prljavo kazalište" piše nepravilna riječ **"Prstatement"**. Riječ je o lošem skriptnom zamjenjivanju niza "kazalište" (engl. *theater / statement* greška).

7. **`hr_mus_499`**
   - **Tekst:** "...napisao **opatu** 'Aida'..."
   - **Problem:** Tipfeler. Treba pisati "operu", a ne "opatu".

8. **`hr_mus_511`**
   - **Tekst u opcijama:** "...Klavembal"
   - **Problem:** Tipfeler "Klavembal" umjesto "Čembalo" ili "Klavembal".

9. **`hr_mus_648`**
   - **Tekst u opcijama:** "...L Leoš Janáček"
   - **Problem:** Tipfeler "L Leoš".

10. **`hr_mus_670`**
    - **Tekst:** "...Kvrnta, Kvarata..."
    - **Problem:** Tipfeleri u netočnim odgovorima ("Kvinta", "Kvarta").

---

## Preporuke za Čišćenje i Poboljšanje Baze

1. **Ukloniti masovne duplikate**: Pitanja iz raspona `hr_mus_493` do `hr_mus_877` u ogromnoj mjeri ponavljaju pitanja iz prvog dijela baze (`hr_mus_1` do `hr_mus_492`). Preporučuje se zadržati samo jednu, najkvalitetniju verziju svakog pitanja.
2. **Ispraviti pogrešne činjenice**: Popraviti nacionalnost The Who (`hr_mus_248`), podrijetlo Vojka V (`hr_mus_427`), nacionalnost U2 u tekstu pitanja (`hr_mus_551`), te točan izvođač pjesama u `hr_mus_791`.
3. **Automatski zamijeniti riječ "Prstatement" s "Prljavo kazalište"** u svim opcijama odgovora.
4. **Ukloniti tragove u tekstu pitanja (hinting)** (npr. u `hr_mus_122` izbaciti naziv Čelesta iz pitanja, u `hr_mus_199` izbaciti "(Pachelbelov)").
