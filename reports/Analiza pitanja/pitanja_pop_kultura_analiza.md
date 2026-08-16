# Analiza Pitanja i Odgovora (Pop Kultura / Pop Culture)

U nastavku se nalazi detaljan pregled uočenih problema u pruženoj bazi pitanja i odgovora iz kategorije **Pop Kultura** (`pop_kultura.json`), podijeljen u tri glavne skupine: **netočne činjenice i greške u odgovoru**, **pitanja s izravnim navođenjem (hinting) / masovni duplikati** te **nejasno ili nepravilno napisana pitanja**.

---

## 1. Netočne činjenice ili pogrešni odgovori (Incorrect Questions / Answers)

1. **`hr_pop_8`**
   - **Pitanje:** "Koji je redatelj režirao kultne naučno-fantastične filmove 'Matrix', 'Inception' i 'Interstellar'?"
   - **Ponuđeni točan odgovor:** Christopher Nolan
   - **Problem:** Christopher Nolan je režirao *Inception* i *Interstellar*, ali film *Matrix* su režirale sestre **Lana i Lilly Wachowski**. Nolan nema nikakve veze s *Matrixom*.
   - **Prijedlog popravka:** Ukloniti *Matrix* iz teksta pitanja (ostaviti npr. *Tenet*, *Inception* i *Interstellar*).

2. **`hr_pop_23`**
   - **Pitanje:** "Koji je pjevač i glumac bio frontmen pop benda **Harry Styles** prijed nego što je započeo solo karijeru?"
   - **Ponuđeni točan odgovor:** One Direction
   - **Problem:** Tekst pitanja je potpuno besmislen. Harry Styles **nije naziv pop benda**, nego ime samog pjevača. Pitanje je trebalo glasiti: "Čiji je frontmen/član bio Harry Styles prije nego što je započeo solo karijeru?".

3. **`hr_pop_47`**
   - **Pitanje:** "Koji je poznati **krupni orkestar i izvođač pesme 'Billie Jean'** izdao album 'Thriller' 1982. godine?"
   - **Ponuđeni točan odgovor:** Michael Jackson
   - **Problem:** Michael Jackson nije "krupni orkestar" nego pop pjevač/solist. Pitanje je nastalo kao loš strojni prijevod.

4. **`hr_pop_72`**
   - **Pitanje:** "Kako se zove legendarna kiselina i napitak u čarobnom svijetu Harryja Pottera koji se poslužuje u 'Tri metle'?"
   - **Ponuđeni točan odgovor:** Bezreka (Butterbeer / Bezalkoholno pivo od maslaca)
   - **Problem:** Napitak se na hrvatskom u službenom prijevodu zove **Buzovo pivo** ili **Bezalkoholno pivo od maslaca / Butterbeer**. Izraz "Bezreka" je nepostojeća riječ/tipfeler.

5. **`hr_pop_166`**
   - **Pitanje:** "Kako se zove **otok u Indoneziji** na kojem se odvija radnja druge sezone nagrađivane serije 'Beli lotos' (The White Lotus)?"
   - **Ponuđeni točan odgovor:** Sicilija (2. sezona je u Italiji na Siciliji, 1. na Havajima)
   - **Problem:** **Sicilija se nalazi u Italiji (Sredozemno more)**, a ne u Indoneziji! Sam tekst pitanja tvrdi da je Sicilija otok u Indoneziji.
   - **Prijedlog popravka:** Preformulirati pitanje u "Na kojem se talijanskom otoku odvija radnja 2. sezone serije 'Bijeli lotos'?".

6. **`hr_pop_221`**
   - **Pitanje:** "Kako se zove zloglasni **FBI agent** i ubojica kojeg glumi Anthony Hopkins u filmu 'Kad jaganjci utihnu' (The Silence of the Lambs)?"
   - **Ponuđeni točan odgovor:** Hannibal Lecter
   - **Problem:** Dr. Hannibal Lecter **nije bio FBI agent**, nego ugledni psihijatar i serijski ubojica. Agentica FBI-a bila je Clarice Starling (Jodie Foster).

7. **`hr_pop_323`**
   - **Pitanje:** "Koji je reper iz Atlante poznat po izumu trapa i hitovima s albuma 'ASTROWORLD' (Travis Scott)?"
   - **Ponuđeni točan odgovor:** Travis Scott
   - **Problem:** Travis Scott je reper iz **Houston, Texas**, a ne iz Atlante! Iz Atlante su pioniri trapa Gucci Mane, T.I. ili Future.

8. **`hr_pop_340`**
   - **Pitanje:** "Kako se zove **pjesma grupe Bohemian Rhapsody** koja spaja operu i hard rock objavljena 1975.?"
   - **Ponuđeni točan odgovor:** Bohemian Rhapsody
   - **Problem:** Bohemian Rhapsody je **pjesma**, a grupa je **Queen**! Pitanje tvrdi da je grupa Bohemian Rhapsody.

9. **`hr_pop_393`**
   - **Pitanje:** "Kako se zove zli stvor u obliku **hobotnice i kralj u močvari** u animiranoj seriji 'Spužva Bob Skockani'?"
   - **Ponuđeni točan odgovor:** Karlo Bjeloperka (Squidward)
   - **Problem:** Karlo Bjeloperka (Squidward) je **lignja/hobotnica i prvi susjed Spužva Boba koji radi u Kustravom raku**, a **nije nikakav "kralj u močvari"**.

10. **`hr_pop_520`**
    - **Pitanje:** "Kako se zove zagonetna kćer Lorda Voldemorta i Bellatrix Lestrange u drami 'Harry Potter i ukleto dijete'?"
    - **Ponuđeni točan odgovor:** Delphini (Delphi)
    - **Problem u ponuđenim odgovorima:** Među netočnim odgovorima nalazi se **Nymphadora**, no njeno ime u knjigama je Nymphadora Tonks.

---

## 2. Pitanja s izravnim navođenjem (Hinting) i masovni duplikati

### A. Izravni Hinting / Odgovor sadržan u pitanju
1. **`hr_pop_21`**: "U kojem filmu iz 2017. godine Margot Robbie glumi klizačicu **Tonyu Harding**..." -> Odgovor: **I, Tonya**.
2. **`hr_pop_56` & `hr_pop_574`**: "Koja je obitelj u središtu radnje kultne mafijaške serije '**Obitelj Soprano**' (The Sopranos)?" -> Odgovor: **Obitelj Soprano**.
3. **`hr_pop_114`**: "U kojoj filmskoj špijunskoj parodiji Rowan Atkinson glumi nesposobnog britanskog agenta **Johnnyja Englisha**?" -> Odgovor: **Johnny English**.
4. **`hr_pop_238`**: "Kako se zove robot i najbolji prijatelj dječaka Hogartha u animiranom klasiku '**Željezni div**' (The Iron Giant)?" -> Odgovor: **Željezni div**.
5. **`hr_pop_262`**: "Koja je humoristična serija smještena u izmišljeni gradić **Schitt's Creek**...?" -> Odgovor: **Schitt's Creek**.
6. **`hr_pop_265`**: "...u seriji HBO-a '**Beli lotos**'?" -> Odgovor: **The White Lotus**.
7. **`hr_pop_271`**: "Kako se zove najstariji brat u obitelji Shelby u seriji 'Peaky Blinders' kojeg glumi Paul Anderson?" -> Odgovor: **Arthur Shelby** (Ime obitelji Shelby je u pitanju, eliminacija je prejednostavna).
8. **`hr_pop_273`**: "Kako se zove obitelj u središtu radnje crtića '**Obiteljski čovjek**' (Family Guy)?" -> Odgovor: **Obitelj Griffin** (opcija sadrži opcije "Obitelj Simpson", "Obitelj Smith").
9. **`hr_pop_340`**: "Kako se zove pjesma grupe **Bohemian Rhapsody**..." -> Odgovor: **Bohemian Rhapsody**.
10. **`hr_pop_383`**: "Kako se zove glavna zlikovka i vještica u serijalu videoigara '**Bayonetta**'?" -> Odgovor: **Bayonetta**.
11. **`hr_pop_437`**: "Kako se zove zloglasna bilježnica i njezin vlasnik Light Yagami u kultnom triler animeu?" -> Odgovor: **Death Note** (Bilježnica smrti).
12. **`hr_pop_446`**: "Koji je streamer i internet ličnost postao viralan s plesom i uzvikom '**IShowSpeed**'...?" -> Odgovor: **IShowSpeed**.
13. **`hr_pop_449`**: "Kako se zove poznati plesni izazov s pjesmom '**Harlem Shake**'...?" -> Odgovor: **Harlem Shake**.
14. **`hr_pop_459`**: "Kako se zove najpoznatiji reality show obitelji Kardashian..." -> Odgovor: **Keeping Up with the Kardashians**.
15. **`hr_pop_473`**: "Kako se zove viralan ples s rukama nastal prema sceni iz Netflixove serije '**Wednesday**'...?" -> Odgovor: **Wednesday Dance**.
16. **`hr_pop_489`**: "Kako se zove zloglasni i komični profil i kanal '**MrBeast**' na YouTubeu..." -> Odgovor: **MrBeast**.
17. **`hr_pop_566`**: "Kako se zove otok na kojem se odvija radnja filma '**Shutter Island**'...?" -> Odgovor: **Shutter Island**.

---

### B. Masovni duplikati u bazi
Pitanja u rasponu od `hr_pop_500` do `hr_pop_688` u ogromnoj mjeri doslovno ponavljaju pitanja iz prvog dijela baze (`hr_pop_1`–`hr_pop_500`):

* **Robert Downey Jr. / Iron Man**: `hr_pop_2`, `hr_pop_593`
* **Westeros / Game of Thrones**: `hr_pop_3`, `hr_pop_91`, `hr_pop_623`
* **Squid Game**: `hr_pop_4`
* **Hogwarts**: `hr_pop_5`
* **Parasite (Parazit)**: `hr_pop_6`, `hr_pop_594`
* **Wednesday Addams**: `hr_pop_7`, `hr_pop_153`, `hr_pop_649`
* **Keanu Reeves / Matrix**: `hr_pop_9`, `hr_pop_197`, `hr_pop_596`
* **Krypton**: `hr_pop_11`
* **Pokémon / Gotta Catch 'Em All**: `hr_pop_12`, `hr_pop_597`
* **Central Perk / Friends**: `hr_pop_13`, `hr_pop_274`, `hr_pop_598`
* **Frozen / 'Let It Go'**: `hr_pop_14`, `hr_pop_76`
* **James Bond / 007**: `hr_pop_16`, `hr_pop_599`
* **Leonardo DiCaprio / Titanic**: `hr_pop_17`, `hr_pop_600`
* **Shrek**: `hr_pop_18`, `hr_pop_601`
* **MrBeast / Jimmy Donaldson**: `hr_pop_19`, `hr_pop_602`
* **Isla Nublar / Jurassic Park**: `hr_pop_20`, `hr_pop_578`
* **Spužva Bob / Gary (Slavko)**: `hr_pop_22`, `hr_pop_603`
* **Harry Styles / One Direction**: `hr_pop_23`, `hr_pop_474`, `hr_pop_490`, `hr_pop_604`
* **Eleven / Stranger Things**: `hr_pop_24`, `hr_pop_605`
* **Romeo i Julija / Verona**: `hr_pop_25`, `hr_pop_592`
* **Pixar**: `hr_pop_26`, `hr_pop_179`, `hr_pop_606`, `hr_pop_665`
* **Walter White / Breaking Bad**: `hr_pop_28`, `hr_pop_93`, `hr_pop_284`, `hr_pop_607`
* **Dua Lipa / Best New Artist 2019**: `hr_pop_29`, `hr_pop_460`, `hr_pop_464`, `hr_pop_608`
* **Jedi / Star Wars**: `hr_pop_30`, `hr_pop_609`
* **Oppenheimer / Christopher Nolan**: `hr_pop_31`, `hr_pop_610`
* **Angelina Jolie / Lara Croft**: `hr_pop_32`, `hr_pop_611`
* **Avicii / 'Levels' & 'Wake Me Up'**: `hr_pop_33`, `hr_pop_612`
* **Batman / Gotham City**: `hr_pop_34`, `hr_pop_613`
* **Sanremo festival**: `hr_pop_35`, `hr_pop_614`
* **Heath Ledger / Joker**: `hr_pop_36`, `hr_pop_615`
* **PSY / Gangnam Style**: `hr_pop_37`, `hr_pop_616`
* **Mario / Nintendo**: `hr_pop_42`, `hr_pop_379`, `hr_pop_617`
* **Wakanda / Black Panther**: `hr_pop_44`, `hr_pop_618`
* **Michael Jackson / 'Thriller'**: `hr_pop_47`, `hr_pop_316`, `hr_pop_619`
* **The Hunger Games (Igre gladi)**: `hr_pop_48`, `hr_pop_63`, `hr_pop_82`, `hr_pop_559`, `hr_pop_620`
* **Freddy Krueger**: `hr_pop_49`, `hr_pop_621`
* **Avatar (2009)**: `hr_pop_88`, `hr_pop_622`
* **The Weeknd / 'Blinding Lights'**: `hr_pop_92`, `hr_pop_462`, `hr_pop_624`
* **Tom Cruise / Top Gun**: `hr_pop_95`, `hr_pop_625`
* **The Crown (Kruna)**: `hr_pop_96`, `hr_pop_288`, `hr_pop_555`, `hr_pop_626`
* **Taylor Swift / Grammys & Midnights**: `hr_pop_100`, `hr_pop_301`, `hr_pop_328`, `hr_pop_547`, `hr_pop_627`
* **La Casa de Papel**: `hr_pop_101`, `hr_pop_503`, `hr_pop_628`
* **Thanos**: `hr_pop_102`, `hr_pop_522`, `hr_pop_629`
* **Grogu / Baby Yoda**: `hr_pop_105`, `hr_pop_630`
* **Coachella**: `hr_pop_107`, `hr_pop_631`
* **Fortnite**: `hr_pop_109`, `hr_pop_364`, `hr_pop_632`
* **Pink Floyd / Dark Side of the Moon**: `hr_pop_110`, `hr_pop_543`, `hr_pop_633`
* **Garfield**: `hr_pop_112`, `hr_pop_634`
* **The Last of Us**: `hr_pop_89`, `hr_pop_115`, `hr_pop_343`, `hr_pop_635`
* **Kanye West**: `hr_pop_117`, `hr_pop_450`, `hr_pop_636`
* **Emma Stone / Oscari**: `hr_pop_120`, `hr_pop_637`
* **Las Vegas**: `hr_pop_121`, `hr_pop_638`
* **Jason Voorhees / Petak 13.**: `hr_pop_132`, `hr_pop_639`
* **Madonna / 'Ray of Light'**: `hr_pop_134`, `hr_pop_305`, `hr_pop_640`
* **Jay-Z**: `hr_pop_136`, `hr_pop_641`
* **Emmy Award**: `hr_pop_137`, `hr_pop_642`
* **Dune (Dina)**: `hr_pop_138`, `hr_pop_643`
* **Lorde**: `hr_pop_139`, `hr_pop_320`, `hr_pop_527`, `hr_pop_644`
* **Chucky / Child's Play**: `hr_pop_145`, `hr_pop_645`
* **Bumblebee**: `hr_pop_147`, `hr_pop_646`
* **Amy Winehouse / 'Valerie'**: `hr_pop_148`, `hr_pop_647`
* **Los Angeles / Hollywood**: `hr_pop_150`, `hr_pop_648`
* **Jenna Ortega / Wednesday**: `hr_pop_153`, `hr_pop_649`
* **Jaws (Ralje)**: `hr_pop_154`, `hr_pop_650`
* **George Michael / 'Last Christmas'**: `hr_pop_155`, `hr_pop_651`
* **WALL-E**: `hr_pop_156`, `hr_pop_652`
* **Fast & Furious (Brzi i žestoki)**: `hr_pop_158`, `hr_pop_653`
* **Annabelle**: `hr_pop_159`, `hr_pop_654`
* **Bad Bunny / 'Un Verano Sin Ti'**: `hr_pop_161`, `hr_pop_309`, `hr_pop_655`
* **Rihanna / Fenty**: `hr_pop_43`, `hr_pop_164`, `hr_pop_581`, `hr_pop_656`
* **Timothée Chalamet / Wonka**: `hr_pop_165`, `hr_pop_657`
* **Cruella de Vil**: `hr_pop_169`, `hr_pop_658`
* **Michelle Yeoh / Oscar**: `hr_pop_170`, `hr_pop_659`
* **Ariana Grande**: `hr_pop_172`, `hr_pop_337`, `hr_pop_660`
* **Peter Griffin / Family Guy**: `hr_pop_173`, `hr_pop_273`, `hr_pop_500`, `hr_pop_518`, `hr_pop_661`
* **Bruno Mars / 'Uptown Funk'**: `hr_pop_174`, `hr_pop_662`
* **Margot Robbie / Barbie**: `hr_pop_176`, `hr_pop_663`
* **BTS**: `hr_pop_178`, `hr_pop_333`, `hr_pop_664`
* **Sauron / Lord of the Rings**: `hr_pop_180`, `hr_pop_666`
* **Minecraft**: `hr_pop_181`, `hr_pop_346`, `hr_pop_667`
* **Frodo Baggins**: `hr_pop_182`, `hr_pop_668`
* **Queen / 'Radio Ga Ga'**: `hr_pop_183`, `hr_pop_669`
* **Kratos / God of War**: `hr_pop_184`, `hr_pop_347`, `hr_pop_670`
* **The Vampire Diaries**: `hr_pop_146`, `hr_pop_671`
* **Dug / Up**: `hr_pop_192`, `hr_pop_672`
* **The Flash**: `hr_pop_193`, `hr_pop_673`
* **Deadpool / Ryan Reynolds**: `hr_pop_67`, `hr_pop_194`, `hr_pop_674`
* **Hill Valley / Back to the Future**: `hr_pop_202`, `hr_pop_676`
* **Christian Bale / American Psycho**: `hr_pop_203`, `hr_pop_677`
* **HAL 9000**: `hr_pop_204`, `hr_pop_678`
* **Anne Hathaway / Princess Diaries**: `hr_pop_205`, `hr_pop_679`
* **Braveheart**: `hr_pop_207`, `hr_pop_680`
* **Tom Cruise / Ethan Hunt**: `hr_pop_209`, `hr_pop_681`
* **Pandora / Avatar**: `hr_pop_212`, `hr_pop_682`
* **Reese Witherspoon / Legally Blonde**: `hr_pop_213`, `hr_pop_683`
* **Snow White / 1937 Disney**: `hr_pop_214`, `hr_pop_684`
* **Buzz Lightyear**: `hr_pop_215`, `hr_pop_685`
* **The Shining / Overlook Hotel**: `hr_pop_219`, `hr_pop_686`
* **Hannibal Lecter**: `hr_pop_221`, `hr_pop_687`
* **Lightning McQueen**: `hr_pop_248`, `hr_pop_688`

---

## 3. Nejasno, dvosmisleno i nepravilno napisana pitanja

1. **`hr_pop_8`**: "Koji je redatelj režirao kultne naučno-fantastične filmove..." (Upotrijebljen srbizam "naučno-fantastične" umjesto hrvatske riječi "znanstveno-fantastične").
2. **`hr_pop_23`**: "...frontmen pop benda Harry Styles prijed..." (Riječ "prijed" umjesto "prije").
3. **`hr_pop_47`**: "...krupni orkestar i izvođač pesme 'Billie Jean'..." (Dvosmisleno i nepotrebno loše prevedeno "krupni orkestar" i srbizam "pesme").
4. **`hr_pop_49`**: "...film 'Ststrah u Ulici Brijestova'..." (Tipfeler "Ststrah").
5. **`hr_pop_88` & `hr_pop_118` & `hr_pop_622`**: "Ako izuzmemo stripove..." / "Ako izuzmemo animirane filmove..." (Nespretne fraze dodane u pitanja).
6. **`hr_pop_97`**: Pitanje pita za ime otoka u seriji *Lost*, a točan odgovor u bazi glasi: **"Bez imena (Isto poznat jednostavno kao 'Otok')"**. Nespretno formuliran odgovor.
7. **`hr_pop_187` & `hr_pop_536`**: "...zozloglasni lav..." (Tipfeler "zozloglasni").
8. **`hr_pop_275`**: "...pametni znanstvenik i djed alkoholičar... u animiranoj seriji za odrasle?" (Odgovor glasi: **"Rick Sanchez (Rick and Morty)"** - spaja ime lika i naziv serije u jednom odgovoru).
9. **`hr_pop_341`**: "Kako se zove izmišljeni grad u kojem se odvija radnja većine videoigre 'Grand Theft Auto: San Andreas' uz Los Santos?" -> Odgovor: **"San Fierro & Las Venturas"** (Spaja dva grada u jedan odgovor).
10. **`hr_pop_387`**: Odgovor: **"Chainsword / Lancer"** (Spaja nazive oružja iz dviju različitih franšiza Warhammer 40k i Gears of War).
11. **`hr_pop_475`**: "...zavodjenju u modernom..." (Tipfeler "zavodjenju" umjesto "zavođenju").
12. **`hr_pop_501`**: "...pod imenom?" (Pitanje iznenadno završava upitnikom i izrazom "pod imenom" umjesto jasne rečenice "pod kojim je umjetničkim imenom djelovao?").
13. **`hr_pop_530`**: Odgovor: "Bowser", no među ponuđenim netočnim odgovorima stoji besmisleni tipfeler **"Waluyo"** umjesto "Waluigi".
14. **`hr_pop_550`**: Pitanje pita za robotskog orla u *Space Ghostu*, no u opcijama se nudi ime **Jan** (koja je ljudska djevojčica, dok je majmun Blip).
15. **`hr_pop_584`**: "...autoga Charlesa M. Schulza?" (Tipfeler "autoga" umjesto "autora").
16. **`hr_pop_675`**: "In spomenutom filmu znanstvene fantastike..." (Počinje s "In" umjesto "U").

---

## Preporuke za Čišćenje Baze

1. **Ukloniti masovne duplikate**: Pitanja iz druge polovice baze (`hr_pop_500` do `hr_pop_688`) gotovo u potpunosti ponavljaju pitanja iz prvog dijela (`hr_pop_1` do `hr_pop_500`).
2. **Ispraviti činjenične pogreške**:
   - Ukloniti *Matrix* iz pitanja o Christopheru Nolanu (`hr_pop_8`).
   - Popraviti podrijetlo Travisa Scotta (Houston, a ne Atlanta - `hr_pop_323`).
   - Popraviti tvrdnju za Siciliju (Italija, a ne Indonezija - `hr_pop_166`).
   - Popraviti tvrdnju za Hannibala Lectera (psihijatar, a ne FBI agent - `hr_pop_221`).
3. **Ukloniti naznake točnih odgovora (hinting)**: Izbaciti ime traženog lika/filma/serije iz samog teksta pitanja (npr. u `hr_pop_21`, `hr_pop_56`, `hr_pop_114`, `hr_pop_238`, `hr_pop_262`, `hr_pop_265`).
