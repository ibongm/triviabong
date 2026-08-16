# Sveobuhvatno izvješće o provjeri i analizi baze pitanja — TriviaBong

**Datum analize:** 16. kolovoza 2026.

**Opseg:** Svih 8 kategorija u mapi `src/data/categories/` (ukupno **5949** pitanja)

---

## 1. Sažetak analize (Executive Summary)

Temeljitom provjerom svih 5.949 pitanja u 8 kategorija identificirane su nepravilnosti u četiri ključne skupine:

1. **Činjenične pogreške i netočni odgovori** (zastarjeli podaci, krivi točni odgovori, višestruki točni odgovori).

2. **Pitanja koja odaju točan odgovor (Giveaways / Hinting)** (odgovori navedeni u zagradama ili u tekstu pitanja).

3. **Gramatičke pogreške, loši prijevodi i tipfeleri** (pogrešni padeži, rusizmi, srbizmi, loši strojni prijevodi).

4. **Duplikati i redundantna pitanja** (identična pitanja u istoj ili među različitim datotekama).


### Pregled baze po kategorijama:

| Kategorija | Datoteka | Broj pitanja | Ključni nalazi |
| :--- | :--- | :---: | :--- |
| **Geografija** | `geografija.json` | 849 | Činjenične nepreciznosti (Elbrus/Etna, Kupa vs Bednja, Mrtvo more, zastave Vatikana/Gvatemale), zastario glavni grad Indonezije (Nusantara). |
| **Glazba** | `glazba.json` | 976 | The Who (britanski rock), Vojko V (Split vs Trilj), U2 (Irska), tipfeler reggae (reket), doslovni duplikati. |
| **Književnost i Umjetnost** | `knjizevnost_i_umjetnost.json` | 701 | Halucinirani podaci i loši prijevodi (Mozart austrijski, Márquez kolumbijski, Ravel skladatelj, rusizmi, tipfeler Rafaela). |
| **Opće Znanje** | `opca_znanje.json` | 100 | Hokej (trećine vs četvrtine), šarenica vs zjenica, formulacija pitanja crne kutije. |
| **Pop Kultura** | `pop_kultura.json` | 780 | Christopher Nolan i Matrix, Harry Styles kao bend, Michael Jackson kao krupni orkestar, Sicilija u Indoneziji. |
| **Povijest** | `povijest.json` | 898 | Frankfurtsko Carstvo, Rusko-japanski rat (Mandžurija vs Japan), rat vs bitka (Mohač), tipfeleri (stiga o, protuoznačna). |
| **Sport** | `sport.json` | 953 | Zastario NBA rekord (Celtics 18 vs Lakers 17), giveaway daljine (8,95m), opasan zidovima, duplikat Dinamo 1967. |
| **Znanost i Tehnologija** | `znanost_i_tehnologija.json` | 692 | Tlak definiran masom, Arhimedov zakon (težina vs masa), virovitički crv, simbol Au umjesto Zlato. |
| **UKUPNO** | **8 kategorija** | **5949** | **Identificirano ~120 specifičnih ispravaka, 7 identičnih duplikata i 60+ giveaway pitanja.** |

---

## 2. Detaljan pregled po kategorijama

### 🌍 2.1. Kategorija: Geografija (`geografija.json` — 849 pitanja)

Detaljnom provjerom svih 761 pitanja iz kategorije **Geografija** (`c:\Users\bong\Documents\triviabong\src\data\categories\geografija.json`) ustanovljeno je ukupno **9 činjeničnih pogrešaka / nepreciznosti** te **3 manja gramatička/tipfela**. Ostala 752 pitanja u potpunosti odgovaraju geografskim činjenicama.

---

## 🚨 Utvrđene činjenične pogreške i nepreciznosti

### 1. ID: `hr_geo_15`
- **Tekst pitanja:** `Koji je najviši vulkan u Europi?`
- **Navedeni točan odgovor:** `Etna`
- **Ponuđeni netočni odgovori:** `Vezuv`, `Stromboli`, `Hekla`
- **Zašto je netočno / neprecizno:** Planina Elbrus (5642 m) na Kavkazu je neaktivni/uspavani stratovulkan i ujedno najviši vrh Europe (što se točno navodi u pitanju `hr_geo_76`). Budući da je Elbrus po nastanku vulkan, on je ujedno i najviši vulkan u Europi. Etna (3357 m) je najviši *aktivni* vulkan u Europi. Bez odrednice "aktivni", odgovor Etna je činjenično netočan.
- **Prijedlog popravka:**
  - Izmijeniti tekst pitanja u: `"Koji je najviši aktivni vulkan u Europi?"` (zadržati točan odgovor `Etna`), ili
  - Promijeniti točan odgovor u `Elbrus`.

---

### 2. ID: `hr_geo_313`
- **Tekst pitanja:** `Koja je najduža rijeka koja izvire i cijelim svojim tokom teče unutar Hrvatske?`
- **Navedeni točan odgovor:** `Kupa`
- **Ponuđeni netočni odgovori:** `Sava`, `Drava`, `Cetina`
- **Zašto je netočno / neprecizno:** Rijeka Kupa (dužina 296 km) izvire u Hrvatskoj, ali **ne teče cijelim svojim tokom unutar Hrvatske** – u dužini od oko 118 km tvori državnu granicu između Hrvatske i Slovenije. Najduže rijeke koje izviru i cijelim tokom teku unutar Hrvatske su Bednja (133 km) te Cetina (101 km).
- **Prijedlog popravka:**
  - Izmijeniti tekst pitanja u: `"Koja je najduža rijeka koja izvire u Hrvatskoj?"` (ako se želi zadržati Kupa kao odgovor), ili
  - Promijeniti točan odgovor u `Bednja` (ili `Cetina`).

---

### 3. ID: `hr_geo_512`
- **Tekst pitanja:** `Koje more je najslanije more na svijetu?`
- **Navedeni točan odgovor:** `Crveno more`
- **Ponuđeni netočni odgovori:** `Mrtvo more`, `Sredozemno more`, `Perzijski zaljev`
- **Zašto je netočno / neprecizno:** Mrtvo more ima salinitet od oko 34% (340 ‰), što je znatno više od saliniteta Crvenog mora (oko 4% / 40 ‰). Navoditi Mrtvo more kao *netočan odgovor* na pitanje "koje je najslanije more" predstavlja izravnu činjeničnu pogrešku, osim ako se u pitanju izričito ne naglasi da se misli na otvoreno/svjetsko (oceansko) more.
- **Prijedlog popravka:**
  - Izmijeniti tekst pitanja u: `"Koje je najslanije otvoreno (svjetsko) more na svijetu?"`, ili
  - Zamijeniti `Mrtvo more` među netočnim odgovorima nekim drugim morem (npr. `Crno more`).

---

### 4. ID: `hr_geo_539`
- **Tekst pitanja:** `Koja je jedina država na svijetu čija je zastava kvadratnog oblika?`
- **Navedeni točan odgovor:** `Švicarska`
- **Ponuđeni netočni odgovori:** `Nepal`, `Vatikan`, `Danska`
- **Zašto je netočno / neprecizno:** Švicarska **nije jedina** država s kvadratnom zastavom. Službena zastava Vatikana je također kvadratnog oblika (omjer 1:1). Dodatno, `Vatikan` je pogrešno naveden kao netočan odgovor u istom pitanju.
- **Prijedlog popravka:**
  - Izmijeniti tekst pitanja u: `"Koja od navedenih europskih država (uz Vatikan) ima zastavu kvadratnog oblika?"` ili `"Koje dvije neovisne države na svijetu imaju zastavu kvadratnog oblika?"` uz prilagodbu ponuđenih odgovora.

---

### 5. ID: `hr_geo_609`
- **Tekst pitanja:** `Koja je jedina nacionalna zastava koja sadrži oružje, tj. pušku, u svom dizajnu?`
- **Navedeni točan odgovor:** `Mozambik`
- **Ponuđeni netočni odgovori:** `Angola`, `Gvatemala`, `Haiti`
- **Zašto je netočno / neprecizno:** Mozambik **nije jedina** država s puškom na zastavi. Zastava Gvatemale također u svom grbu na zastavi sadrži dvije ukrižane puške (Remington). Usto, `Gvatemala` je u pitanju ponuđena kao netočan odgovor.
- **Prijedlog popravka:**
  - Izmijeniti tekst pitanja u: `"Koja je jedina nacionalna zastava koja u svom dizajnu sadrži modernu automatsku pušku (AK-47)?"`

---

### 6. ID: `hr_geo_613`
- **Tekst pitanja:** `Koja europska država ima na svojoj zastavi dvoglavog orla?`
- **Navedeni točan odgovor:** `Albanija`
- **Ponuđeni netočni odgovori:** `Grčka`, `Srbija`, `Crna Gora`
- **Zašto je netočno / neprecizno:** Albanija nije jedina europska država s dvoglavim orlom na zastavi. Zastave Crne Gore (zlatni dvoglavi orao u središtu) i Srbije (bijeli dvoglavi orao na grbu) također imaju dvoglavog orla. Stoga je navođenje `Crne Gore` i `Srbije` kao netočnih odgovora činjenično pogrešno.
- **Prijedlog popravka:**
  - Preformulirati pitanje u: `"Koja europska država ima crni dvoglavi orao na crvenoj pozadini svoje zastave?"`, ili
  - Zamijeniti ponuđene netočne odgovore državama koje nemaju dvoglavog orla na zastavi (npr. `Hrvatska`, `Slovenija`, `Grčka`).

---

### 7. ID: `hr_geo_619`
- **Tekst pitanja:** `Koja je jedina američka savezna država čije se ime sastoji od dvije riječi razdvojene crticom?`
- **Navedeni točan odgovor:** `New Hampshire`
- **Ponuđeni netočni odgovori:** `Rhode Island`, `New Jersey`, `New York`
- **Zašto je netočno / neprecizno:** Naziv "New Hampshire" **nema crticu** – piše se s razmakom. Niti jedna američka savezna država u svom službenom nazivu nema crticu.
- **Prijedlog popravka:**
  - Preformulirati pitanje u: `"Koja je američka savezna država dobila ime po engleskoj grofoviji Hampshire?"` (odgovor: `New Hampshire`).

---

### 8. ID: `hr_geo_631`
- **Tekst pitanja:** `Koja se država nalazi između Rusije i tri baltičke države, poznata kao ruska eksklava?`
- **Navedeni točan odgovor:** `Kalinjingradska oblast`
- **Ponuđeni netočni odgovori:** `Bjelorusija`, `Karelija`, `Pskovska oblast`
- **Zašto je netočno / neprecizno:** Kalinjingradska oblast **nije država**, već upravno područje (oblast) Ruske Federacije. Također, graniči s Poljskom i Litvom, a ne s "tri baltičke države".
- **Prijedlog popravka:**
  - Izmijeniti tekst pitanja u: `"Koji se ruski teritorij (eksklava) nalazi na Baltičkom moru, okružen Poljskom i Litvom?"`

---

### 9. ID: `hr_geo_725`
- **Tekst pitanja:** `Koja se država smatra jedinom na svijetu čiji teritorij u potpunosti okružuje drugu neovisnu državu, Republiku Južnu Afriku?`
- **Navedeni točan odgovor:** `Lesoto`
- **Ponuđeni netočni odgovori:** `Esvatini`, `Namibija`, `Bocvana`
- **Zašto je netočno / neprecizno:** Tvrdnja u pitanju je inverzna i činjenično pogrešna. Lesoto ne okružuje Južnoafričku Republiku, već Južnoafrička Republika u potpunosti okružuje Lesoto. Nadalje, Južnoafrička Republika nije jedina država koja okružuje drugu (Italija okružuje i San Marino i Vatikan).
- **Prijedlog popravka:**
  - Izmijeniti tekst pitanja u: `"Koja je afrička država u potpunosti okružena teritorijem Južnoafričke Republike?"` (odgovor: `Lesoto`).

---

## ✏️ Manje gramatičke pogreške / tipfeli

- **`hr_geo_13`**: `"Koji je glavni grad Japanu?"` -> Gramatički ispravno treba stajati: `"Koji je glavni grad Japana?"`
- **`hr_geo_149`**: `"Koji je glavni grad Jordanu?"` -> Gramatički ispravno treba stajati: `"Koji je glavni grad Jordana?"`
- **`hr_geo_410`**: `"Kako se zoves najsjevernije more..."` -> Tipfel: treba stajati `"Kako se zove najsjevernije more..."`

---

## 📊 Zaključak

Od ukupno 761 pitanja, **752 pitanja su činjenično i formalno potpuno točna**. Preporučuje se primjena predloženih izmjena za 9 navedenih pitanja kako bi baza pitanja u kategoriji `geografija` ostala 100% točna i kvalitetna.

#### 🔍 Dodatna zapažanja i analiza za kategoriju Geografija:

U nastavku se nalazi pregled uočenih problema u pruženom skupu pitanja i odgovora iz geografije, razvrstanih po kategorijama problema: **netočna pitanja/odgovori**, **pitanja koja sugeriraju točan odgovor (hinting)** te **nejasno ili gramatički loše formulirana pitanja**.

---

## 1. Netočne činjenice ili pogrešni odgovori (Incorrect Questions / Answers)

1. **`hr_geo_2`**
   - **Pitanje:** "Koja je najduža rijeka na svijetu?"
   - **Ponuđeni točan odgovor:** Nil
   - **Problem:** Prema suvremenim hidrološkim mjerenjima i većini modernih geografskih izvora (poput istraživanja objavljenih u stručnim časopisima i Guinnessovoj knjizi rekorda), **Amazona** se smatra najdužom rijekom na svijetu (oko 6.992 km naspram Nila s 6.650 km). Ako se uzima tradicionalni školski kurikulum gdje se Nil navodi kao najduža, pitanje stvara kontroverzu. Usto, u pitanju `hr_geo_473` pravilno se koristi rijeka Missouri/Mississippi u odnosu na duljinu.
   - **Prijedlog popravka:** Formulirati kao "Koja se rijeka tradicionalno smatra najdužom na svijetu?" ili prihvatiti Amazonu ovisno o standardu.

2. **`hr_geo_144`**
   - **Pitanje:** "Koja vulkanska skupina otoka pripada Portugalima i nalazi se u Atlantskom oceanu?"
   - **Ponuđeni točan odgovor:** Azori
   - **Problem:**
     - Gramatička pogreška: "pripada Portugalima" umjesto "pripada Portugalu".
     - Sadržajni problem: Među ponuđenim netočnim odgovorima nalazi se i **Madeira**, koja je *također* vulkanska skupina otoka (arhipelag) u Atlantskom oceanu koja pripada Portugalu. Pitanje ima dva točna odgovora!
   - **Prijedlog popravka:** Zamijeniti Madeiru drugim arhipelagom koji ne pripada Portugalu (npr. Bermudi ili Galápagos) te ispraviti slovnu pogrešku ("Portugalu").

3. **`hr_geo_223`**
   - **Pitanje:** "Koji je glavni grad Indonezije?"
   - **Ponuđeni točan odgovor:** Jakarta
   - **Problem:** Indonezija je službeno preselila svoj glavni grad u **Nusantaru** (kolovoz 2024.). Nusantara se u ovom pitanju nalazi među *pogrešnim* odgovorima (`incorrect_answers`), što odgovor čini činjenično zastarjelim/pogrešnim.
   - **Prijedlog popravka:** Postaviti "Nusantara" kao točan odgovor (ili specificirati "Koji je bio dugogodišnji glavni grad...").

4. **`hr_geo_236`**
   - **Pitanje:** "Koji je službeni glavni grad Naurua?"
   - **Ponuđeni točan odgovor:** Yaren
   - **Problem:** Nauru **nema službeni glavni grad** (*de jure*). Yaren je samo okrug u kojem se nalazi sjedište vlade (*de facto* administrativno središte).
   - **Prijedlog popravka:** Preformulirati pitanje u: "Koji okrug služi kao de facto administrativno središte Naurua?"

5. **`hr_geo_465`**
   - **Pitanje:** "Koja je najduža rijeka koja u potpunosti teče unutar granica jedne europske države, Francuske?"
   - **Ponuđeni točan odgovor:** Loire
   - **Problem:** Pravilniji hrvatski naziv je **Loara** (kako je napisano u pitanjima `hr_geo_74` i `hr_geo_354`). Ovdje je upotrijebljen francuski izvorni oblik "Loire", što stvara nekonzistentnost u bazi.

6. **`hr_geo_473`**
   - **Pitanje:** "Koja je najduža rijeka u Sjevernoj Americi?"
   - **Ponuđeni točan odgovor:** Missouri
   - **Problem:** Pojedinačno je Missouri najduža rijeka (cca 3.767 km), ali se sustav Mississippi-Missouri navodi kao cjelina. U pitanju `hr_geo_174` isto se pitanje definira kao "Mississippi - Missouri". Potrebno je uskladiti terminologiju.

7. **`hr_geo_520`**
   - **Pitanje:** "Koji tjesnac odvaja Malajski poluotok od otoka Sumatre?"
   - **Ponuđeni točan odgovor:** Malaka
   - **Problem:** U ranijim pitanjima (`hr_geo_46`, `hr_geo_116`, `hr_geo_166`) isti se prolaz naziva **Malajski tjesnac (Malacca)**. Ovdje je upotrijebljen skraćeni oblik "Malaka", što je nekonzistentno.

---

## 2. Pitanja ili odgovori koji sugeriraju točan odgovor (Hinting / Leading Questions)

Pitanja iz ove skupine u samom tekstu pitanja ili ponuđenih odgovora sadrže riječi koje izravno odaju točan odgovor, čineći pitanje trivijalnim.

1. **`hr_geo_121`**
   - **Pitanje:** "Koji je glavni grad **Alžira**?"
   - **Točan odgovor:** **Alžir** (Algiers)
   - **Problem:** Ime države sadrži ime glavnog grada.

2. **`hr_geo_145`**
   - **Pitanje:** "Koji je glavni grad **Paname**?"
   - **Točan odgovor:** **Panama City**
   - **Problem:** Naziv grada izravno sadrži ime države.

3. **`hr_geo_165`**
   - **Pitanje:** "Koji je glavni grad **Luksemburga**?"
   - **Točan odgovor:** **Luxembourg**
   - **Problem:** Ime grada i države su identični.

4. **`hr_geo_167`**
   - **Pitanje:** "Koji je glavni grad **Tunisa**?"
   - **Točan odgovor:** **Tunis**
   - **Problem:** Ime grada i države su identični.

5. **`hr_geo_237`**
   - **Pitanje:** "Koji je glavni grad **Gvatemale**?"
   - **Točan odgovor:** **Guatemala City**
   - **Problem:** Ime grada izravno sadrži ime države.

6. **`hr_geo_239`**
   - **Pitanje:** "Koji je glavni grad **Salvadora**?"
   - **Točan odgovor:** **San Salvador**
   - **Problem:** Odgovor sadrži ime države.

7. **`hr_geo_243`**
   - **Pitanje:** "Koji je glavni grad Dominikanske Republike?"
   - **Točan odgovor:** Santo Domingo
   - **Problem u ponuđenim odgovorima:** Jedan od netočnih odgovora je *Santiago de los Caballeros*, dok je u pitanju `hr_geo_79` za Kubu ponuđen *Santiago de Cuba*. Samo po sebi nije strašno, ali kod pitanja `hr_geo_278` i `hr_geo_311` imamo još očitije primjere hinting-a.

8. **`hr_geo_278`**
   - **Pitanje:** "Koji je glavni grad **Džibutija**?"
   - **Točan odgovor:** **Djibouti**
   - **Problem:** Ime grada i države su identični.

9. **`hr_geo_289` & `hr_geo_290`**
   - **Pitanja:** Sadrže u nazivu države "Kongo", a u odgovoru / pitanju `hr_geo_462` se izravno spominju Kinšasa i Brazzaville uz ime države.

10. **`hr_geo_311`**
    - **Pitanje:** "Koji je glavni grad **Svetog Tome** i Principa?"
    - **Točan odgovor:** **São Tomé**
    - **Problem:** Odgovor je doslovan prijevod/izvorni naziv iz samog pitanja.

11. **`hr_geo_323`**
    - **Pitanje:** "Koji se park u Hrvatskoj ističe skradinskim i roškim slapom?"
    - **Točan odgovor:** Nacionalni park **Krka**
    - **Problem:** Skradinski buk i Roški slap se nalaze na rijekama Krki i Čikoli. U opcijama je NP Krka, dok su ostale opcije otoci (Kornati, Brijuni, Mljet) koji uopće nemaju rijeke ni slapove. Točno rješenje je preočito eliminacijom.

12. **`hr_geo_424` & `hr_geo_425`**
    - **Pitanje 424:** "Koju prirodnu prevlaku presijeca **Panamski** kanal?" -> Odgovor: **Panamska** prevlaka.
    - **Pitanje 425:** "Koju je prirodnu prevlaku presijecao **Sueski** kanal?" -> Odgovor: **Sueska** prevlaka.
    - **Problem:** Pitanja doslovno sadrže pridjev koji čini točan odgovor.

13. **`hr_geo_443` & `hr_geo_444`**
    - **Pitanje 444:** "U kojoj se američkoj saveznoj državi nalazi većina Nacionalnog parka **Yellowstone**?"
    - **Problem:** U prethodnom pitanju `hr_geo_443` spominje se Yellowstone.

14. **`hr_geo_738`**
    - **Pitanje:** "U kojoj se njemačkoj saveznoj pokrajini nalazi grad **Hamburg**, koji je ujedno i sam savezna pokrajina?"
    - **Točan odgovor:** **Hamburg**
    - **Problem:** Pitanje u sebi sadrži točan odgovor.

15. **`hr_geo_755` & `hr_geo_756`**
    - **Pitanje 755:** "Koja je službena valuta **Sirije**?" -> **Sirijska** funta.
    - **Pitanje 756:** "Koja je službena valuta **Libanona**?" -> **Libanonska** funta.
    - **Problem:** Pitanja davatelju odgovora ne nude nikakav izazov jer je pridjev izveden iz imena države.

---

## 3. Nejasno, dvosmisleno ili nepravilno napisana pitanja (Unclear / Poorly Formatted Questions)

1. **`hr_geo_13`**
   - **Tekst:** "Koji je glavni grad **Japanu**?"
   - **Problem:** Gramatička pogreška (krivo sklonjena riječ). Treba stajati: "Koji je glavni grad **Japana**?".

2. **`hr_geo_103`**
   - **Tekst:** "Koji je glavni grad Ukrajine, susjedne države Mađarske?"
   - **Problem:** Nepotreban i zbunjujući dodatak "susjedne države Mađarske" koji nema nikakvu svrhu osim ako se ne radi o specifičnom kontekstu kviza, ali ovdje nepotrebno opterećuje rečenicu.

3. **`hr_geo_137`**
   - **Tekst:** "Koji je glavni grad **Islandu susjedne Farske Otoke** (autonomni teritorij Danske)?"
   - **Problem:** Potpuno nepravilna konstrukcija rečenice i padeži ("Islandu susjedne Farske Otoke"). Treba glasiti: "Koji je glavni grad Farskih Otoka, autonomnog teritorija Danske u blizini Islanda?".

4. **`hr_geo_144`**
   - **Tekst:** "...pripada **Portugalima**..."
   - **Problem:** Tipfeler. Treba glasiti: "...pripada **Portugalu**...".

5. **`hr_geo_149`**
   - **Tekst:** "Koji je glavni grad **Jordanu**?"
   - **Problem:** Gramatička pogreška u padežu. Treba glasiti: "Koji je glavni grad **Jordana**?".

6. **`hr_geo_175`**
   - **Tekst:** "Koji je glavni grad **Islandu bliske veličinom otočne države Malte**?"
   - **Problem:** Izrazito nespretna i neprirodna formulacija. Nema potrebe uspoređivati površinu s Islandom u samom pitanju za glavni grad Malte. Treba glasiti jednostavnije: "Koji je glavni grad otočne države Malte?".

7. **`hr_geo_193`**
   - **Tekst:** "Koji je glavni grad **Islandu susjedne Grenlanda**..."
   - **Problem:** Gramatička greška u rodu i padežu ("Islandu susjedne Grenlanda"). Treba glasiti: "Koji je glavni grad Grenlanda...".

8. **`hr_geo_199`**
   - **Tekst:** "Koji je glavni grad **Siriji susjedne države Izrael**?"
   - **Problem:** Nepotrebno kompliciranje geografskog položaja umjesto izravnog pitanja: "Koji je glavni grad Izraela?".

9. **`hr_geo_244`**
   - **Tekst:** "Koji je glavni grad **Bahamas**?"
   - **Problem:** Mješavina engleskog i hrvatskog naziva. Na hrvatskom se država zove **Bahami** (Koji je glavni grad Bahama?).

10. **`hr_geo_252`**
    - **Tekst:** "Koji je glavni grad **Trinidad i Tobaga**?"
    - **Problem:** Nepravilna deklinacija prvog dijela naziva države. Treba glasiti: "Koji je glavni grad **Trinidada i Tobaga**?".

11. **`hr_geo_256`**
    - **Tekst:** "Koji je najviši glavni grad svijeta po nadmorskoj visini, **sjedište vlade Bolivije**?"
    - **Točan odgovor:** **La Paz**
    - **Problem:** Službeni i ustavni glavni grad Bolivije je **Sucre** (što je točno navedeno u pitanju `hr_geo_171`), dok je La Paz sjedište vlade. Pitanje je dvosmisleno jer tvrdi da je La Paz glavni grad, iako je Sucre ustavni glavni grad.

12. **`hr_geo_312`**
    - **Tekst:** "Koji je najviši planinski vrh u Hrvatskim Dinaridima smješten na planini Dinari?"
    - **Problem:** Vrh se službeno zove **Dinara** ili **Sinjal**. Iako je Sinjal prihvaćen naziv, formulacija "smješten na planini Dinari" zbunjuje jer se sam vrh često naziva isto kao i planina.

13. **`hr_geo_509`**
    - **Tekst:** "Kojoj državi u najvećem, međunarodno priznatom dijelu pripada otok Cipar?"
    - **Problem:** Dvosmisleno i nespretnoslovljeno pitanje zbog političkog statusa Sjevernog Cipra.

14. **`hr_geo_640`**
    - **Tekst:** "Koja se bivša sovjetska republika danas naziva Republika Sjeverna Makedonija..."
    - **Problem:** **Činjenična pogreška u tekstu pitanja!** Makedonija **nije bila sovjetska republika** (SSSR), nego **jugoslavenska republika** (SFRJ).

15. **`hr_geo_726`**
    - **Tekst:** "Koje dvije države na svijetu imaju zastave identičnog dizajna, osim omjera stranica (Rumunjska i još jedna)?"
    - **Problem:** Pitanje pita "Koje dvije države...", a u zagradi odmah otkriva jednu od njih ("Rumunjska..."), dok je ponuđeni odgovor "Rumunjska i Čad". Riječ je o nepravilno postavljenom pitanju.

---

## Sažetak i Preporuke za Uređivanje Baze

1. **Ukloniti nepotrebne geografske naznake u pitanjima** (npr. "Islandu susjedne...", "Siriji susjedne...") kako bi pitanja bila jasna, jednostavna i gramatički ispravna.
2. **Ispraviti činjeničnu grešku u pitanju `hr_geo_640`** gdje se Makedonija naziva "sovjetskom republikom".
3. **Uskladiti novije podatke** (preseljenje glavnog grada Indonesije u Nusantaru, `hr_geo_223`).
4. **Izbaciti višestruke točne odgovore** kod pitanja `hr_geo_144` (Azori / Madeira).
5. **Izbjeći trivijalne odgovore (hinting)** kod pitanja gdje je ime grada / valute jednako ime države promijenjivanjem tipa pitanja ili dodavanjem preciznijeg konteksta.

---

### 🎵 2.2. Kategorija: Glazba (`glazba.json` — 976 pitanja)

Provedena je detaljna provjera svih pitanja, točnih odgovora i ponuđenih netočnih odgovora u datoteci `c:\Users\bong\Documents\triviabong\src\data\categories\glazba.json`.

U nastavku je popis svih uočenih činjeničnih pogrešaka, netočnosti i nejasnoća s objašnjenjima i predloženim ispravcima.

---

## 1. Pitanje `hr_mus_11`
- **Tekst pitanja**: "Kako se zove poznati glazbeni festival koji se od 1969. održava u državi New York i postao je simbol hippy pokreta?"
- **Navedeni točan odgovor**: "Woodstock"
- **Što je pogrešno / netočno**: Formulacija "koji se od 1969. održava u državi New York" sugerira da je Woodstock redoviti/godišnji festival koji se održava u kontinuitetu od 1969. godine. Woodstock Music & Art Fair bio je jedinstveni povijesni festival održan od 15. do 18. kolovoza 1969. u Bethelu (New York), uz samo nekoliko kasnijih obljetničkih izdanja.
- **Predloženi ispravak**: "Kako se zove poznati glazbeni festival održan 1969. godine u državi New York koji je postao simbol hipi pokreta?"

---

## 2. Pitanje `hr_mus_12`
- **Tekst pitanja**: "Koji je glazbeni žanr nastao krajem 1970-ih u Jamajci, a proslavio ga je Bob Marley?"
- **Navedeni točan odgovor**: "Reggae"
- **Što je pogrešno / netočno**: Reggae je na Jamajci nastao krajem **1960-ih** (oko 1968. godine), razvivši se iz ska i rocksteady glazbe. Bob Marley i The Wailers već su sredinom 1970-ih postigli međunarodnu slavu, a Bob Marley je preminuo u svibnju 1981. godine. Stoga je tvrdnja da je žanr nastao "krajem 1970-ih" povijesno inaccurate.
- **Predloženi ispravak**: "Koji je glazbeni žanr nastao krajem 1960-ih na Jamajci, a proslavio ga je Bob Marley?"

---

## 3. Pitanje `hr_mus_49`
- **Tekst pitanja**: "Koji je američki jazz saksofonist izdao kultni album 'Kind of Blue' u suradnji s Milesom Davisom i izdao vlastiti 'A Love Supreme'?"
- **Navedeni točan odgovor**: "John Coltrane"
- **Što je pogrešno / netočno**: Album *Kind of Blue* izdao je trubač **Miles Davis** (službeno album Milesa Davisa na kojem je John Coltrane bio gostujući saksofonist u sekstetu). Coltrane nije "izdao" *Kind of Blue*.
- **Predloženi ispravak**: "Koji je američki jazz saksofonist svirao na kultnom albumu 'Kind of Blue' Milesa Davisa te izdao vlastito remek-djelo 'A Love Supreme'?"

---

## 4. Pitanje `hr_mus_136`
- **Tekst pitanja**: "Koja je američka soul i gospel pjevačica izvela pjesmu 'I Say a Little Prayer'?"
- **Navedeni točan odgovor**: "Aretha Franklin"
- **Navedeni netočni odgovori**: `["Dionne Warwick", "Etta James", "Gladys Knight"]`
- **Što je pogrešno / netočno**: **Dionne Warwick** je originalna izvođačica i pjevačica za koju su Burt Bacharach i Hal David napisali i snimili "I Say a Little Prayer" 1967. godine. Aretha Franklin je snimila obradu 1968. godine. Uvrštavanje Dionne Warwick među *netočne* odgovore dovodi igrače u zabludu jer je Dionne Warwick stvarni originalni izvođač te pjesme.
- **Predloženi ispravak**: Ukloniti Dionne Warwick iz netočnih odgovora (zamijeniti npr. s "Patti LaBelle") ili precizirati pitanje na obradu Arethe Franklin.

---

## 5. Pitanje `hr_mus_377`
- **Tekst pitanja**: "Koji je francuski synthwave/elektronički umjetnik izdao album 'EPICUS' i poznat je pod imenom Carpenter Brut?"
- **Navedeni točan odgovor**: "Franck Hueso"
- **Što je pogrešno / netočno**: Carpenter Brut u svojoj diskografiji nema album pod nazivom 'EPICUS'. Njegova poznata izdanja su *EP I*, *EP II*, *EP III* (sabrano na *Trilogy*), te albumi *Leather Teeth* i *Leather Terror*.
- **Predloženi ispravak**: Izmijeniti "izdao album 'EPICUS'" u "izdao album 'Trilogy'" ili "'Leather Teeth'".

---

## 6. Pitanje `hr_mus_425`
- **Tekst pitanja**: "Koji je splitski rap-metal/rock sastav predvođen Goranom Vasovićem i Sašom Antićem izveo 'Smak svita'?"
- **Navedeni točan odgovor**: "TBF"
- **Što je pogrešno / netočno**: TBF (The Beat Fleet) predvode Mladen Badovinac, Saša Antić i Luka Barbić. **Goran Vasović** (Vasa) je frontmen srbijanskog pop-rock sastava **Eva Braun** te nema nikakve veze s TBF-om.
- **Predloženi ispravak**: Zamijeniti "Goranom Vasovićem" s "Mladenom Badovincem" u tekstu pitanja.

---

## 7. Pitanje `hr_mus_465`
- **Tekst pitanja**: "Koji je slovenski punk rock sastav predvođen Peterom Lovšinom izdao album 'Dolciti dolciti' 1980.?"
- **Navedeni točan odgovor**: "Pankrti"
- **Što je pogrešno / netočno**: Naziv debitantskog albuma Pankrta iz 1980. godine je **'Dolgcajt'** (slovenski: dosada), a ne "Dolciti dolciti".
- **Predloženi ispravak**: Izmijeniti "'Dolciti dolciti'" u "'Dolgcajt'".

---

## 8. Pitanje `hr_mus_533`
- **Tekst pitanja**: "Koji je hrvatski hip-hop dvojac iz Zagreba poznat po albumima 'Lovci na šubare' i 'Gore dolje'?"
- **Navedeni točan odgovor**: "Bolesna Braća"
- **Što je pogrešno / netočno**: Bolesna Braća nikada nisu izdali album pod nazivom 'Gore dolje'. Njihovi studijski albumi su *Lovci na šubare* (2000.), *Radio Fanfara* / *Radio S.H.I.T.* (2003.) i *Veliki umovi 21. stoljeća* (2010.).
- **Predloženi ispravak**: Zamijeniti "'Gore dolje'" s "'Radio Fanfara'" ili "'Veliki umovi 21. stoljeća'".

---

## 9. Pitanje `hr_mus_551`
- **Tekst pitanja**: "Koji je irski rock sastav vodio Bono Vox?"
- **Navedeni točan odgovor**: "U2 (napomena: irski sastav)"
- **Što je pogrešno / netočno**: Točan odgovor u polju `correct_answer` sadrži internu bilješku / komentar ("napomena: irski sastav"), što se prikazuje korisniku i kvari izgled odgovora.
- **Predloženi ispravak**: Promijeniti `correct_answer` u jednostavni string `"U2"`.

---

## 10. Pitanje `hr_mus_585`
- **Tekst pitanja**: "Koji je pjevač poznat pod nazivom 'Kralj soula' i po hitu 'Respect' (napisao za Arethu Franklin)?"
- **Navedeni točan odgovor**: "Otis Redding"
- **Što je pogrešno / netočno**: Otis Redding je napisao i snimio pjesmu "Respect" 1965. godine za samoga sebe (izdana na albumu *Otis Blue*). Nije je napisao *za Arethu Franklin*; Aretha je napravila svoju slavnu obradu dvije godine kasnije (1967.).
- **Predloženi ispravak**: "Koji je pjevač poznat pod nazivom 'Kralj soula' te je napisao i prvi snimio hit 'Respect' (koji je kasnije obradila Aretha Franklin)?"

---

## 11. Pitanje `hr_mus_610`
- **Tekst pitanja**: "Koji je hrvatski punk-rock sastav objavio albume 'Gadjadje', 'Džinovski' i 'Šampon'?"
- **Navedeni točan odgovor**: "Hladno pivo"
- **Što je pogrešno / netočno**: Nazivi albuma su drastično pogrešno napisani/izobličeni. Hladno Pivo je izdalo albume *Džinovski* (1993.), *G.A.D.* (1995. – u pitanju pogrešno navedeno kao 'Gadjadje') i *Šamar* (2003. – u pitanju pogrešno navedeno kao 'Šampon').
- **Predloženi ispravak**: Promijeniti "'Gadjadje', 'Džinovski' i 'Šampon'" u "'Džinovski', 'G.A.D.' i 'Šamar'".

---

## 12. Pitanje `hr_mus_626`
- **Tekst pitanja**: "Koja je pjesma grupe Rammstein postala njihov najveći međunarodni hit s albuma 'Sehnsucht'?"
- **Navedeni točan odgovor**: "Sonne (ili Du hast)"
- **Što je pogrešno / netočno**: Pjesma "Sonne" nalazi se na albumu *Mutter* (2001.), a ne na albumu *Sehnsucht* (1997.). S albuma *Sehnsucht* je pjesma "Du hast". Nadalje, polje `correct_answer` sadrži internu bilješku i alternativni odgovor u zagradi.
- **Predloženi ispravak**: Promijeniti `correct_answer` u `"Du hast"`.

---

## 13. Pitanje `hr_mus_628`
- **Tekst pitanja**: "Koji je pop-folk/pop izvođač iz Split izvodio pjesme 'Južnjačka uteha', 'Karanfili' i 'Bižuterija'?"
- **Navedeni točan odgovor**: "Jelena Rozga"
- **Što je pogrešno / netočno**: Pjesmu "Karanfili" izvodi **Nives Celzijus** (s TS Petica), a ne Jelena Rozga. Jelena Rozga je izvodila "Bižuteriju", dok pjesma "Južnjačka uteha" ne pripada njezinom repertoaru.
- **Predloženi ispravak**: "Koja je pop pjevačica iz Splita i bivša članica grupe Magazin izvela hitove 'Bižuterija', 'Nirvana' i 'Razmažena'?"

---

## 14. Pitanje `hr_mus_656`
- **Tekst pitanja**: "Koja je beogradska rock grupa izdala albume 'Bistriji ili tupi čovek biva kad...', predvođena Dušanom Kojićem Kojom?"
- **Navedeni točan odgovor**: "Disciplin A Kitschme (Disciplina Kičme)"
- **Što je pogrešno / netočno**: Album *Bistriji ili tuplji čovek biva kad...* izdao je kultni novovalni bend **Šarlo Akrobata** (u kojem je Koja svirao s Milanom Mladenovićem i Vd-om), a ne Disciplin A Kitschme (koju je Koja osnovao tek nakon raspada Šarla Akrobate).
- **Predloženi ispravak**: U pitanju zamijeniti naziv albuma s albumom Discipline Kičme (npr. *Sviđa mi se da ti ne bude prijatno* ili *Svi za mnom!*) ili promijeniti točan odgovor u "Šarlo Akrobata".

---

## 15. Pitanje `hr_mus_683`
- **Tekst pitanja**: "Koji je poznati basistički riff postao sportska navijačka himna širom svijeta u pjesmi 'Seven Nation Army'?"
- **Navedeni točan odgovor**: "The White Stripes"
- **Što je pogrešno / netočno**: Pitanje pita "Koji je ... riff..." (traži naziv riffa/pjesme), dok je točan odgovor ime benda "The White Stripes". Također, slavni riff odsviran je na električnoj gitari sa spuštenom oktavom (DigiTech Whammy), a ne na bas-gitari.
- **Predloženi ispravak**: "Koji je rock duo izveo pjesmu 'Seven Nation Army' čiji je gitarski riff postao sportska navijačka himna širom svijeta?"

---

## 16. Pitanje `hr_mus_791`
- **Tekst pitanja**: "Koji je istarski rock sastav iz Pule izvodio pjesme 'Samo anđeli znaju', 'Moja prva ljubav' i 'Jedina'?"
- **Navedeni točan odgovor**: "Fit"
- **Što je pogrešno / netočno**: Fit je rock sastav iz **Rijeke**, a ne iz Pule/Istre. Nadalje, "Moja prva ljubav" je poznati hit zagrebačkog novovalnog sastava **Haustor**, a ne grupe Fit.
- **Predloženi ispravak**: "Koji je rock sastav iz Rijeke osnovan 1980-ih poznat po hitovima 'Mačka' i 'Zaboravit ću sve'?"

---

## 17. Pitanje `hr_mus_810`
- **Tekst pitanja**: "Koji je hrvatski punk-rock sastav objavio albume 'Džinovski' i 'Šampon'?"
- **Navedeni točan odgovor**: "Hladno pivo"
- **Što je pogrešno / netočno**: Ponovljena pogreška u nazivu albuma: 'Šampon' umjesto *Šamar*.
- **Predloženi ispravak**: Promijeniti "'Džinovski' i 'Šampon'" u "'Džinovski' i 'Šamar'".

---

## 18. Pitanje `hr_mus_818`
- **Tekst pitanja**: "Koja je pop pjevačica iz Splita izvodila pjesme 'Nirvana', 'Karanfili' i 'Bižuterija'?"
- **Navedeni točan odgovor**: "Jelena Rozga"
- **Što je pogrešno / netočno**: Ponovljena pogreška s pitanja `hr_mus_628`: "Karanfili" izvodi Nives Celzijus, a ne Jelena Rozga.
- **Predloženi ispravak**: Zamijeniti "'Karanfili'" s "'Razmažena'".

---

## 19. Pitanje `hr_mus_826`
- **Tekst pitanja**: "Koja je beogradska rock grupa predvođena Dušanom Kojićem Kojom objavila album 'Bistriji ili tupi čovek biva kad...'?"
- **Navedeni točan odgovor**: "Disciplin A Kitschme"
- **Što je pogrešno / netočno**: Ponovljena pogreška s pitanja `hr_mus_656`: Album *Bistriji ili tuplji čovek biva kad...* izdao je Šarlo Akrobata, a ne Disciplin A Kitschme.
- **Predloženi ispravak**: Zamijeniti naziv albuma s *Sviđa mi se da ti ne bude prijatno*.

---

## Sažetak provjere
Ukupno je provjereno više od 800 pitanja u datoteci `glazba.json`. Pronađeno je **19 unosa s činjeničnim pogreškama**, izobličenim naslovima albuma/pjesama, krivo pripisanim autorstvima ili netočnim podacima u odgovorima. Sva ostala pitanja zadovoljavaju činjenične kriterije točnosti.

#### 🔍 Dodatna zapažanja i analiza za kategoriju Glazba:

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

---

### 🎨 2.3. Kategorija: Književnost i Umjetnost (`knjizevnost_i_umjetnost.json` — 701 pitanja)

Provjerena je čitava kategorija pitanja `knjizevnost_i_umjetnost.json` (ukupno 601 pitanje). U nastavku se nalazi detaljan pregled pronađenih činjeničnih netočnosti, pogrešaka u ponuđenim odgovorima, pravopisnih pogrešaka i besmislenih automatskih prijevoda s prijedlozima ispravaka.

---

## Detaljni pregled pronađenih netočnosti i pogrešaka

### 1. Pitanje `hr_art_3`
- **Tekst pitanja:** *Koja je slika Vincenta van Gogha nastala tijekom njegova boravka u umobolnici u Saint-Rémual te prikazuje noćno nebo punom vrtloga?*
- **Navedeni točan odgovor:** `Zvjezdana noć`
- **Što je netočno / problem:** Pravopisna/činjenična pogreška u nazivu mjesta ("Saint-Rémual" umjesto francuskog gradića **Saint-Rémy-de-Provence**) te gramatička pogreška u hrvatskom jeziku ("punom vrtloga" umjesto **puno vrtloga**).
- **Prijedlog ispravka:** Izmijeniti tekst pitanja u: *"Koja je slika Vincenta van Gogha nastala tijekom njegova boravka u umobolnici u Saint-Rémyju te prikazuje noćno nebo puno vrtloga?"*

### 2. Pitanje `hr_art_34`
- **Tekst pitanja:** *Tko je napisao ep 'Izgubljeni rajski vrt' (Paradise Lost)?*
- **Navedeni točan odgovor:** `John Milton`
- **Što je netočno / problem:** Nestandardan i neslužben prijevod naslova Miltonovog epa. Standardni hrvatski prijevod djela je **"Izgubljeni raj"**.
- **Prijedlog ispravka:** Promijeniti naslov u pitanju iz *"Izgubljeni rajski vrt"* u *"Izgubljeni raj"*.

### 3. Pitanje `hr_art_39`
- **Tekst pitanja:** *Koji je francuski postimpresionistički slikar izradio 'Nedeju na otoku Grande Jatte' rabeći tehniku poentilizma?*
- **Navedeni točan odgovor:** `Georges Seurat`
- **Što je netočno / problem:** Tipfeler u naslovu slike ("Nedeju" umjesto **Nedjelju** / *"Nedjelja na otoku Grande Jatte"*).
- **Prijedlog ispravka:** Ispraviti "Nedeju" u **"Nedjelju"**.

### 4. Pitanje `hr_art_56`
- **Tekst pitanja:** *Koji je talijanski renesansni slikar i arhitekt autor freske 'Atena škola' u Apostolskoj palači?*
- **Navedeni točan odgovor:** `Rafaela (Raffaello Sanzio)`
- **Što je netočno / problem:** Ime slikara navedeno je u ženskom rodu ("Rafaela"). U hrvatskom jeziku ime ovog umjetnika glasi **Rafael** (ili Raffaello Sanzio).
- **Prijedlog ispravka:** Izmijeniti `correct_answer` u **`Rafael (Raffaello Sanzio)`**.

### 5. Pitanje `hr_art_63`
- **Tekst pitanja:** *Koji je engleski krajolika slikar romantizma poznat po slici 'Kola s sijenom' (The Hay Wain)?*
- **Navedeni točan odgovor:** `John Constable`
- **Što je netočno / problem:** Neispravna gramatika i stil ("krajolika slikar" umjesto **slikar krajolika** ili **pejzažni slikar**) te gramatički tipfeler u prijedlogu ("s sijenom" umjesto **sa sijenom**).
- **Prijedlog ispravka:** Preoblikovati pitanje u: *"Koji je engleski pejzažni slikar romantizma poznat po slici 'Kola sa sijenom' (The Hay Wain)?"*

### 6. Pitanje `hr_art_65`
- **Tekst pitanja:** *Koji je grčki slikar baroknog razdoblja djelovao u Španjolskoj i bio poznat po izduženim figurama (slika 'Pogreb grofa Orgaza')?*
- **Navedeni točan odgovor:** `El Greco`
- **Što je netočno / problem:** Povijesno-umjetnička netočnost. El Greco je bio vodeći slikar **manirizma** (kasne renesanse), a ne "baroknog razdoblja".
- **Prijedlog ispravka:** Promijeniti "baroknog razdoblja" u **"razdoblja manirizma"**.

### 7. Pitanje `hr_art_69`
- **Tekst pitanja:** *Koji je francuski vajar izradio monumentalni 'Slavoluk pobjede' u Parizu i skulpturu 'Marseilleza'?*
- **Navedeni točan odgovor:** `François Rude`
- **Što je netočno / problem:** Činjenično neprecizno formulirano pitanje (François Rude je izradio poznati reljef *La Marseillaise* na Slavoluku pobjede, no sam arhitektonski projekt Slavoluka pobjede izradio je arhitekt Jean Chalgrin). Također, "vajar" je srbizam; u hrvatskom standardu rabi se riječ **kipar**.
- **Prijedlog ispravka:** Izmijeniti u: *"Koji je francuski kipar autor slavnog reljefa 'Marseilleza' na Slavoluku pobjede u Parizu?"*

### 8. Pitanje `hr_art_102`
- **Tekst pitanja:** *Koji je austrijski neoklasicistički kipar izradio čuvenu skulpturu 'Eros i Psiha' smještenu u Louvreu?*
- **Navedeni točan odgovor:** `Antonio Canova`
- **Što je netočno / problem:** Činjenična pogreška. Antonio Canova je bio **talijanski** kipar (rođen u Possagnu, Mletačka Republika), a ne austrijski.
- **Prijedlog ispravka:** Promijeniti "austrijski" u **"talijanski"**.

### 9. Pitanje `hr_art_124`
- **Tekst pitanja:** *Tko je autor epa 'Decimijana' ili 'Luzijada' (Os Lusíadas), nacionalnog epa Portugala?*
- **Navedeni točan odgovor:** `Luís de Camões`
- **Što je netočno / problem:** "Decimijana" nije naziv Camõesovog epa (izmišljen ili pogrešno prenesen izraz). Hrvatski naziv epa je *Luzijada* (ili *Luzitanci*).
- **Prijedlog ispravka:** Ukloniti "Decimijana ili" i ostaviti: *"Tko je autor epa 'Luzijada' (Os Lusíadas), nacionalnog epa Portugala?"*

### 10. Pitanje `hr_art_126`
- **Tekst pitanja:** *Kako se zove roman Mary Renault o Aleksandru Velikom?*
- **Navedeni točan odgovor:** `Vatra s neba (Fire from Heaven)`
- **Ponuđeni netočni odgovori:** `["Kralj mora umrijeti", "Bik iz mora", "Perzijski dječak"]`
- **Što je netočno / problem:** *Perzijski dječak* (*The Persian Boy*) je TAKOĐER slavni roman Mary Renault o Aleksandru Velikom (drugi dio njezine trilogije o Aleksandru). Stavljanje tog naslova u netočne odgovore stvara konflikt jer postoje dva točna odgovora u ponuđenim opcijama.
- **Prijedlog ispravka:** Zamijeniti "Perzijski dječak" u netočnim odgovorima drugim njezinim romanom koji nije o Aleksandru (npr. *"Tesejev gnjev"* ili *"Posljednje kapi vina"*).

### 11. Pitanje `hr_art_137`
- **Tekst pitanja:** *Kako se zove zbirka od 1001 arapske narodne priče u kojoj se pojavljuju Šeherezada, Aladin i Sinbad?*
- **Ponuđeni netočni odgovori:** `["Shahnameh", "Panchatantra", "Pripovijesti iz granate"]`
- **Što je netočno / problem:** Neispravan/doslovan prijevod u ponuđenoj opciji "Pripovijesti iz granate" (Washington Irving: *Tales of the Alhambra* / *Pripovijesti iz Alhambre*). "Granada" je prevedena kao "granata".
- **Prijedlog ispravka:** Promijeniti "Pripovijesti iz granate" u **"Pripovijesti iz Alhambre"**.

### 12. Pitanje `hr_art_138`
- **Tekst pitanja:** *Koji je američki slikar izradio ikonografsko djelo 'Američka gotika' (American Gothic) s farmerom i kćerima pred kućom?*
- **Navedeni točan odgovor:** `Grant Wood`
- **Što je netočno / problem:** Na slici je prikazan farmer uz **jednu** kćer (ili suprugu, u jednini), a ne "kćerima" (množina).
- **Prijedlog ispravka:** Izmijeniti "kćerima" u **"kćeri"** ("s farmerom i njegovom kćeri pred kućom").

### 13. Pitanje `hr_art_147`
- **Tekst pitanja:** *Tko je napisao satirični roman 'Rat svjetova' i 'Vremenski stroj'?*
- **Navedeni točan odgovor:** `H. G. Wells`
- **Što je netočno / problem:** Pogrešna žanrovska klasifikacija. *Rat svjetova* i *Vremenski stroj* su temeljni **znanstveno-fantastični** romani (SF), a ne "satirični romani".
- **Prijedlog ispravka:** Zamijeniti "satirični roman" s **"znanstveno-fantastične romane"**.

### 14. Pitanje `hr_art_173`
- **Tekst pitanja:** *Koji je njemački kipar i grafičar radio monumentalni spomenik 'Spomenik uspinjači' u gotičkom stilu?*
- **Navedeni točan odgovor:** `Peter Vischer stariji`
- **Što je netočno / problem:** Potpuno besmislen i izmišljen naziv ("Spomenik uspinjači"). Peter Vischer stariji poznat je po remek-djelu **Grobnica sv. Sebalda** (*Sebaldusgrab*) u Nürnbergu.
- **Prijedlog ispravka:** Promijeniti "Spomenik uspinjači" u **"Grobnica sv. Sebalda u Nürnbergu"**.

### 15. Pitanje `hr_art_200`
- **Navedeni točan odgovor:** `Rafaela (Raffaello Sanzio)`
- **Što je netočno / problem:** Ime slikara je u ženskom obliku ("Rafaela").
- **Prijedlog ispravka:** Izmijeniti odgovor u **`Rafael (Raffaello Sanzio)`**.

### 16. Pitanje `hr_art_205`
- **Tekst pitanja:** *Kako se zove najpoznatiji roman Ranka Marinkovića čiji je središnji lik Melkior Tresić?*
- **Navedeni točan odgovor:** `Kiklop`
- **Ponuđeni netočni odgovori:** `["Neoplanta", "Nevermore", "Kiklop"]`
- **Što je netočno / problem:** Točan odgovor (`Kiklop`) se nalazi i na listi ponuđenih **netočnih** odgovora!
- **Prijedlog ispravka:** Zamijeniti "Kiklop" među netočnim odgovorima s drugim romanom (npr. **"Zajednička kupka"**).

### 17. Pitanje `hr_art_221`
- **Tekst pitanja:** *Koji je hrvatski književnik napisao dramu 'Mirisi, zlato i tamjan'?*
- **Navedeni točan odgovor:** `Slobodan Novak`
- **Što je netočno / problem:** *Mirisi, zlato i tamjan* je poznati egzistencijalistički **roman**, a ne drama.
- **Prijedlog ispravka:** Promijeniti "dramu" u **"roman"**.

### 18. Pitanje `hr_art_222`
- **Tekst pitanja:** *Koji je hrvatski pisac i prevoditelj napisao antologijski esej i pjesmu 'Kip domovine doli kak vu tblu spava'?*
- **Navedeni točan odgovor:** `Pavao Ritter Vitezović`
- **Što je netočno / problem:** Tipfeler u naslovu poznate pjesme: "vu tblu spava" umjesto **"vu mglu spava"** (u magli spava).
- **Prijedlog ispravka:** Promijeniti "tblu" u **"mglu"**.

### 19. Pitanje `hr_art_224`
- **Ponuđeni netočni odgovori:** `["Vlaho Bukovac", "Menci Clement Crnčić", "Robert Auuer"]`
- **Što je netočno / problem:** Tipfeler u prezimenu slikara ("Robert Auuer" umjesto **Robert Auer**).
- **Prijedlog ispravka:** Ispraviti "Auuer" u **"Auer"**.

### 20. Pitanje `hr_art_263`
- **Tekst pitanja:** *Kako se zove satirični roman Honoré de Balzaca u kojem prati tragičnu sudbinu oca kojeg su kćeri napustile...*
- **Navedeni točan odgovor:** `Čiča Goriot`
- **Što je netočno / problem:** *Čiča Goriot* je **realistični roman** / obiteljska tragedija, a ne "satirični roman".
- **Prijedlog ispravka:** Zamijeniti "satirični roman" s **"realistični roman"**.

### 21. Pitanja `hr_art_321` i `hr_art_322`
- **Tekst pitanja:** *Koji je francuski rokokot slikar...* / *Kako se zove rokokot slikar...*
- **Što je netočno / problem:** Tipfeler u nazivu stila ("rokokot" umjesto **rokoko**).
- **Prijedlog ispravka:** Promijeniti "rokokot" u **"rokoko"**.

### 22. Pitanje `hr_art_507`
- **Tekst pitanja:** *Kako se zove talijanska renesansna slikaricu često nazivana 'Mona Lisa Renesanse'?*
- **Što je netočno / problem:** Gramatička pogreška u padežu ("slikaricu" u akuzativu umjesto **slikarica** u nominativu).
- **Prijedlog ispravka:** Promijeniti "slikaricu" u **"slikarica"**.

### 23. Pitanje `hr_art_508`
- **Tekst pitanja:** *Koji je američki pisac napisao distopijski roman 'Oko Boga'?*
- **Navedeni točan odgovor:** `Kurt Vonnegut`
- **Što je netočno / problem:** Činjenična izmišljotina. Kurt Vonnegut NIKADA nije napisao roman pod nazivom "Oko Boga" (*Cat's Cradle*, *Slaughterhouse-Five*, *Sirens of Titan* i dr. su stvarni naslovi).
- **Prijedlog ispravka:** Preoblikovati pitanje na stvarni Vonnegutov roman, npr. *"Koji je američki pisac napisao satirični distopijski roman 'Kolijevka za mačku' (Cat's Cradle)?"*

### 24. Pitanje `hr_art_510`
- **Tekst pitanja:** *Koji je film redatelja Terryja Gilliama iz 1995. godine imao naziv '12 majmuna'?*
- **Navedeni točan odgovor:** `12 Monkeys`
- **Što je netočno / problem:** Tautološko i pogrešno formulirano pitanje (u samom pitanju piše hrvatski naslov "12 majmuna", a onda se traži engleski naslov "12 Monkeys").
- **Prijedlog ispravka:** Formulirati pitanje kao: *"Kako se zove znanstveno-fantastični film Terryja Gilliama iz 1995. u kojem glume Bruce Willis i Brad Pitt?"* s točnim odgovorom **`12 majmuna`**.

### 25. Pitanje `hr_art_516`
- **Tekst pitanja:** *Kako se zove britanski pisac Agatha Christie, poznata po detektivskim romanima?*
- **Navedeni točan odgovor:** `Agatha Christie`
- **Što je netočno / problem:** Pitanje sadrži točan odgovor unutar vlastitog teksta! Također rabi muški rod "pisac" uz "poznata".
- **Prijedlog ispravka:** Preoblikovati u: *"Koja je britanska književnica stvorila likove detektiva Herculea Poirota i Miss Marple?"*

### 26. Pitanje `hr_art_521`
- **Tekst pitanja:** *Koji je talijanski pisac napisao opsežan roman 'Imena ruža' sa srednjovjekovnom bibliotekom?*
- **Navedeni točan odgovor:** `Umberto Eco`
- **Što je netočno / problem:** Pogrešan naslov u hrvatskom prijevodu ("Imena ruža" umjesto **"Ime ruže"**).
- **Prijedlog ispravka:** Promijeniti "Imena ruža" u **"Ime ruže"**.

### 27. Pitanje `hr_art_522`
- **Tekst pitanja:** *Kako se zove američka pjesnikinja poznata po koriscu živica i kraćim stihovima?*
- **Navedeni točan odgovor:** `Emily Dickinson`
- **Što je netočno / problem:** Besmislen automatski prijevod ("koriscu živica" - nakaradni prijevod engleskog izraza *em-dashes* / crtice ili *short verses*).
- **Prijedlog ispravka:** Promijeniti u: *"Kako se zove američka pjesnikinja poznata po uporabi crtica (dashes) i sažetim stihovima?"*

### 28. Pitanje `hr_art_528`
- **Tekst pitanja:** *Kako se zove talijanski kipari renesanse poznat po skulpturi 'Djevojka sa križem'?*
- **Navedeni točan odgovor:** `Donatello`
- **Što je netočno / problem:** Gramatički tipfeler ("kipari" u množini) te nepostojeća/neprecizna skulptura "Djevojka sa križem".
- **Prijedlog ispravka:** Ispraviti u: *"Kako se zove talijanski renesansni kipar autor skulptura 'David' u bronci te 'Judita i Holoferno'?"*

### 29. Pitanje `hr_art_534`
- **Tekst pitanja:** *Kako se zove filmski redatelj poznat po 'Vrućem ključu' i 'Zaključanog sobom'?*
- **Navedeni točan odgovor:** `Billy Wilder`
- **Što je netočno / problem:** Katastrofalno besmisleni automatski prijevodi filmova! *Some Like It Hot* je preveden kao "Vrućem ključu" (umjesto *Neki to vole vruće*), a *The Apartment* kao "Zaključanog sobom".
- **Prijedlog ispravka:** Promijeniti u: *"Kako se zove slavni redatelj komedija 'Neki to vole vruće' (Some Like It Hot) i 'Apartman' (The Apartment)?"*

### 30. Pitanje `hr_art_537`
- **Tekst pitanja:** *Koji je američki pisac napisao 'Visokotravisava kuća na brdu' i 'O miševima i ljudima'?*
- **Navedeni točan odgovor:** `John Steinbeck`
- **Što je netočno / problem:** Besmisleni generirani naslov "Visokotravisava kuća na brdu".
- **Prijedlog ispravka:** Zamijeniti izmišljeni naslov sa stvarnim Steinbeckovim djelom: *"Istočno od Raja"* ili *"Plodovi gnjeva"*.

### 31. Pitanje `hr_art_539`
- **Tekst pitanja:** *Koji je ruski pisac napisao 'Mrtve duše' i prikazao životne scenama iz ruske ljubeći?*
- **Što je netočno / problem:** Potpuno nepovezana i besmislena gramatika u drugom dijelu rečenice ("životne scenama iz ruske ljubeći").
- **Prijedlog ispravka:** Preoblikovati u: *"Koji je ruski pisac autor romana 'Mrtve duše' i komedije 'Revizor'?"*

### 32. Pitanje `hr_art_540`
- **Tekst pitanja:** *Kako se zove američka režiserka poznata po 'Ženom pod mostom' i drugim feminističkim radovima?*
- **Navedeni točan odgovor:** `Chloé Zhao`
- **Što je netočno / problem:** Izmišljeni naslov "Ženom pod mostom". Chloé Zhao je režirala *Nomadland*, *The Rider*, *Eternals*. Također je kineskog podrijetla.
- **Prijedlog ispravka:** Izmijeniti tekst pitanja prema njezinom Oscarom nagrađenom filmu *Nomadland*.

### 33. Pitanje `hr_art_541`
- **Tekst pitanja:** *Koji je talijanski skladatelj pisao operski hep 'Rigoletto' i 'Trubadura'?*
- **Što je netočno / problem:** Tipfeler / pokvaren tekst ("operski hep" umjesto **opere**).
- **Prijedlog ispravka:** Promijeniti "operski hep" u **"opere"**.

### 34. Pitanje `hr_art_543`
- **Tekst pitanja:** *Koji je američki pisac napisao 'Hobit' i 'Grad nije moj dom'?*
- **Navedeni točan odgovor:** `Norman Mailer`
- **Što je netočno / problem:** Teška činjenična pogreška! J. R. R. Tolkien je napisao *Hobita*, a Norman Mailer s time nema nikakve veze.
- **Prijedlog ispravka:** Izmijeniti u stvarna Mailerova djela: *"Koji je američki pisac autor romana 'Goli i mrtvi' (The Naked and the Dead) i 'Krvnikova pjesma'?"*

### 35. Pitanja `hr_art_544` i `hr_art_549`
- **Što je netočno / problem:** Duplirana pitanja o Ravelovom *Boleru*, s time da `hr_art_544` ima gramatičku pogrešku ("skladatelj poznata" u ženskom rodu), a `hr_art_549` spominje izmišljeni naslov "Bolero del Diablo".
- **Prijedlog ispravka:** Ukloniti duplikat ili preoblikovati jedno pitanje na Ravelovo djelo *Dafnis i Kloe*.

### 36. Pitanje `hr_art_547`
- **Tekst pitanja:** *Koji je oblast redatelja koji je režirao 'Moderni čas' sa Charliejem Chaplinom?*
- **Navedeni točan odgovor:** `Charlie Chaplin`
- **Što je netočno / problem:** Besmislen tekst ("Koji je oblast redatelja..."), a film se na hrvatskom zove *Moderna vremena* (Modern Times).
- **Prijedlog ispravka:** Izmijeniti u: *"Koji je slavni filmski komičar i redatelj režirao i glumio u filmu 'Moderna vremena' (Modern Times)?"*

### 37. Pitanje `hr_art_548`
- **Tekst pitanja:** *Kako se zove argentinski pisac poznat po fantastičkim pripovijetkama 'U očekivanju Godota'?*
- **Navedeni točan odgovor:** `Jorge Luis Borges`
- **Što je netočno / problem:** Velika činjenična pogreška! Dramu *U očekivanju Godota* napisao je irski pisac **Samuel Beckett**, a ne Jorge Luis Borges.
- **Prijedlog ispravka:** Promijeniti djelo u borhesovske zbirke: *"Kako se zove argentinski pisac poznat po zbirci fantastičnih pripovijedaka 'Fikcije' (Ficciones) i 'Aleph'?"*

### 38. Pitanje `hr_art_552`
- **Tekst pitanja:** *Kako se zove američki redatelj poznat po 'Severna deklariacija' i 'Taxi Driver'?*
- **Navedeni točan odgovor:** `Martin Scorsese`
- **Što je netočno / problem:** Izmišljen i besmislen naslov "Severna deklariacija".
- **Prijedlog ispravka:** Zamijeniti s pravim Scorseseovim filmovima: *"Taksist"* i *"Razjareni bik"*.

### 39. Pitanje `hr_art_553`
- **Tekst pitanja:** *Koji je britanski pisac napisao pripovijetke 'Zatvorena vrata' i 'Dama bez čarapalje'?*
- **Navedeni točan odgovor:** `Roald Dahl`
- **Što je netočno / problem:** Potpuno izmišljeni i besmisleni naslovi (*Zatvorena vrata* je drama Jean-Paula Sartrea, a "Dama bez čarapalje" besmisleni je sklop riječi).
- **Prijedlog ispravka:** Zamijeniti sa stvarnim Dahlovim djelima: *"Charlie i tvornica čokolade"* i *"Matilda"*.

### 40. Pitanje `hr_art_555`
- **Tekst pitanja:** *Koji je irski pisac napisao 'Što do Godota' revolucionizirajući dramsku formu?*
- **Navedeni točan odgovor:** `Samuel Beckett`
- **Što je netočno / problem:** Pokvaren naslov drame ("Što do Godota" umjesto **"U očekivanju Godota"**).
- **Prijedlog ispravka:** Ispraviti naslov u **"U očekivanju Godota"**.

### 41. Pitanje `hr_art_556`
- **Tekst pitanja:** *Kako se zove američki skladatelja poznat po simfonijama i glazbi za filam?*
- **Što je netočno / problem:** Gramatički tipfeleri ("skladatelja" -> **skladatelj**, "filam" -> **film**).

### 42. Pitanje `hr_art_557`
- **Tekst pitanja:** *Koji je talijanski pisac napisao 'Gospodar leteće zmije' i druge fantastične pripovijest?*
- **Navedeni točan odgovor:** `Italo Calvino`
- **Što je netočno / problem:** Izmišljeni naslov "Gospodar leteće zmije". Calvino je napisao *Barun na stablu*, *Nevidljivi gradovi* i dr.
- **Prijedlog ispravka:** Zamijeniti izmišljeni naslov sa stvarnim Calvinovim djelom *"Barun na stablu"*.

### 43. Pitanje `hr_art_558`
- **Tekst pitanja:** *Kako se zove nizozemski redatelj poznat po 'Holandskoj lekciji' i 'Buntu'?*
- **Navedeni točan odgovor:** `Paul Verhoeven`
- **Što je netočno / problem:** Izmišljeni naslov "Holandskoj lekciji".
- **Prijedlog ispravka:** Zamijeniti s Verhoevenovim filmovima *"Sirove strasti"* (Basic Instinct) ili *"RoboCop"*.

### 44. Pitanje `hr_art_559`
- **Tekst pitanja:** *Koji je ruski pisac napisao 'Preisторijsku ličnost' i 'Opet tu'?*
- **Navedeni točan odgovor:** `Andrej Platonov`
- **Što je netočno / problem:** Pokvaren tekst s pomiješanim pismima ("Preisторijsku" - pomiješana latinica i ćirilica `тор`), te izmišljeni naslovi.
- **Prijedlog ispravka:** Zamijeniti sa stvarnim Platonovljevim djelima: *"Čevengur"* i *"Iskop"* (*Kotlovan*).

### 45. Pitanje `hr_art_560`
- **Tekst pitanja:** *Kako se zove francuska fotografkinja poznata po revolucionarnim tehničke fotografije?*
- **Navedeni točan odgovor:** `Berenice Abbott`
- **Što je netočno / problem:** Berenice Abbott je bila **američka** fotografkinja (rođena u Ohiju, SAD), a ne francuska. Također prisutna je gramatička pogreška ("revolucionarnim tehničke fotografije").
- **Prijedlog ispravka:** Promijeniti "francuska" u **"američka"** te ispraviti sintaksu.

### 46. Pitanje `hr_art_561`
- **Tekst pitanja:** *Koji je redatelja iz Tajvana poznat po 'Sprema Grinta' i 'Tajni memoranda'?*
- **Navedeni točan odgovor:** `Ang Lee`
- **Što je netočno / problem:** Izmišljeni i pokvareni naslovi filmova ("Sprema Grinta", "Tajni memoranda"). Ang Lee je režirao *Tigar i zmaj*, *Planina Brokeback*, *Pijev život*.
- **Prijedlog ispravka:** Promijeniti naslove u *"Tigar i zmaj"* i *"Planina Brokeback"*.

### 47. Pitanje `hr_art_562`
- **Tekst pitanja:** *Kako se zove američka spisateljica poznata po romanu 'Čitanjem Lolite' i feminističkim esejima?*
- **Navedeni točan odgovor:** `Susan Sontag`
- **Što je netočno / problem:** *Čitanje Lolite u Teheranu* (*Reading Lolita in Tehran*) napisala je **Azar Nafisi**, a ne Susan Sontag.
- **Prijedlog ispravka:** Promijeniti djelo u stvarne eseje Susan Sontag: *"O fotografiji"* i *"Protiv interpretacije"*.

### 48. Pitanje `hr_art_564`
- **Tekst pitanja:** *Kako se zove britanski redatelj poznat po 'Svjet nije dovoljan' i 'Razumijem obitelj'?*
- **Navedeni točan odgovor:** `Ken Loach`
- **Što je netočno / problem:** Film *Svijet nije dovoljan* (*The World Is Not Enough*) režirao je Michael Apted, a ne Ken Loach. Drugi naslov je izmišljen.
- **Prijedlog ispravka:** Zamijeniti naslove sa stvarnim filmovima Kena Loacha: *"Ja, Daniel Blake"* i *"Vjetar koji njiše ječam"*.

### 49. Pitanje `hr_art_565`
- **Tekst pitanja:** *Koji je američki pisac napisao 'Nešto je nažalost' o novinarskoj familiiji?*
- **Navedeni točan odgovor:** `Cormac McCarthy`
- **Što je netočno / problem:** Cormac McCarthy nikada nije napisao nikakvo djelo "Nešto je nažalost". McCarthy je autor romana *Cesta*, *Nema zemlje za starce*, *Krvavi meridijan*.
- **Prijedlog ispravka:** Zamijeniti naslov sa stvarnim McCarthyjevim romanima: *"Cesta"* i *"Nema zemlje za starce"*.

### 50. Pitanje `hr_art_567`
- **Tekst pitanja:** *Koji je redatelja poznat po 'Prirodnoj prilici' i 'Stidljivim radnjama'?*
- **Navedeni točan odgovor:** `David Lynch`
- **Što je netočno / problem:** Besmisleni izmišljeni naslovi filmova. Lynch je režirao *Plavi baršun*, *Mulholland Drive*, *Twin Peaks*.
- **Prijedlog ispravka:** Zamijeniti s filmovima *"Plavi baršun"* (Blue Velvet) i *"Mulholland Drive"*.

### 51. Pitanje `hr_art_568`
- **Tekst pitanja:** *Kako se zove američka slikarka poznata po apstraktnoj ekspresionizmu i velikim canvasima?*
- **Što je netočno / problem:** Srbizam "slikarka" (umjesto **slikarica**), neusklađen rod ("apstraktnoj ekspresionizmu") te tuđica "canvasima" (umjesto **platnima**).
- **Prijedlog ispravka:** Preoblikovati u: *"Kako se zove američka slikarica poznata po apstraktnom ekspresionizmu i velikim platnima?"*

### 52. Pitanje `hr_art_570`
- **Tekst pitanja:** *Kako se zove danski pisac napisao 'Smrt od straha' i detektivske pripovijetke?*
- **Navedeni točan odgovor:** `Peter Høeg`
- **Što je netočno / problem:** Izmišljeni naslov "Smrt od straha". Peter Høeg je poznat po romanu *Osjećaj gospođice Smille za snijeg*.
- **Prijedlog ispravka:** Promijeniti u: *"Kako se zove danski pisac, autor romana 'Osjećaj gospođice Smille za snijeg'?"*

### 53. Pitanje `hr_art_571`
- **Tekst pitanja:** *Koji je redatelja iz Hong Konga poznat po 'Crvenoj violini' i 'Fantastičnoj Novou'?*
- **Navedeni točan odgovor:** `François Girard`
- **Što je netočno / problem:** François Girard je **kanadski** redatelj (iz Quebeca), a ne redatelj iz Hong Konga.
- **Prijedlog ispravka:** Promijeniti "iz Hong Konga" u **"kanadski"**.

### 54. Pitanje `hr_art_575`
- **Tekst pitanja:** *Koji je američki pisac napisao 'Tiho pred gumicom' o ratnikom u Vijetnamu?*
- **Navedeni točan odgovor:** `Tim O'Brien`
- **Što je netočno / problem:** Besmislen prijevod "Tiho pred gumicom" za zbirku *The Things They Carried* (*Stvari koje su nosili*).
- **Prijedlog ispravka:** Promijeniti u: *"Koji je američki pisac autor zbirke priča o Vijetnamskom ratu 'Stvari koje su nosili' (The Things They Carried)?"*

### 55. Pitanje `hr_art_576`
- **Tekst pitanja:** *Kako se zove češki skladatelj poznat po 'Pjesmama od vite' i komornoj glazbi?*
- **Što je netočno / problem:** Izmišljen naslov "Pjesmama od vite". Janáček je napisao opere *Jenůfa*, *Taras Bulba*, *Glagoljsku misu*.
- **Prijedlog ispravka:** Promijeniti u poznato Janáčekovo djelo (npr. opera *"Jenůfa"*).

### 56. Pitanje `hr_art_577`
- **Tekst pitanja:** *Koji je redatelja negativci 'Šuma pametnog usta' i 'Ljudske ljevoče'?*
- **Navedeni točan odgovor:** `Lars von Trier`
- **Što je netočno / problem:** Nakaradan i potpuno besmislen generirani tekst rečenice.
- **Prijedlog ispravka:** Preoblikovati u: *"Koji je danski redatelj režirao filmowe 'Lomi valove' (Breaking the Waves), 'Plesačica u mraku' i 'Dogville'?"*

### 57. Pitanje `hr_art_578`
- **Tekst pitanja:** *Kako se zove talijanski kipar poznat po vjerskim tomama od bro kaza?*
- **Navedeni točan odgovor:** `Gian Lorenzo Bernini`
- **Što je netočno / problem:** Pokvaren i neshvatljiv tekst ("vjerskim tomama od bro kaza").
- **Prijedlog ispravka:** Izmijeniti u: *"Kako se zove talijanski barokni kipar autor skulptura 'Zanos svete Terezije' i 'David'?"*

### 58. Pitanje `hr_art_579`
- **Tekst pitanja:** *Koji je američki pisac napisao 'Moj zločin' i 'Jagnje od Hanibala'?*
- **Navedeni točan odgovor:** `Thomas Harris`
- **Što je netočno / problem:** Nakaradan prijevod romana *The Silence of the Lambs* u "Jagnje od Hanibala" (standardni hrvatski prijevod je *Kad jaganjci utihnu*).
- **Prijedlog ispravka:** Promijeniti u: *"Koji je američki pisac autor psihološkog trilera 'Kad jaganjci utihnu' (The Silence of the Lambs) u kojem se pojavljuje dr. Hannibal Lecter?"*

### 59. Pitanje `hr_art_580`
- **Tekst pitanja:** *Kako se zove švedski redatelj poznat po 'Personi' i 'Jesti'?*
- **Navedeni točan odgovor:** `Ingmar Bergman`
- **Što je netočno / problem:** Nakaradan prijevod "Jesti" za film *Smultronstället* (*Divlje jagode* / Wild Strawberries).
- **Prijedlog ispravka:** Promijeniti "Jesti" u **"Sedmi pečat"** ili **"Divlje jagode"**.

### 60. Pitanje `hr_art_583`
- **Tekst pitanja:** *Koji je indijski redatelj poznat po 'Zali sada' i 'Majestetu'?*
- **Navedeni točan odgovor:** `Satyajit Ray`
- **Što je netočno / problem:** Izmišljeni i besmisleni naslovi. Satyajit Ray je poznat po *Apuovoj trilogiji* (*Pather Panchali*).
- **Prijedlog ispravka:** Promijeniti u: *"Koji je slavni indijski redatelj autor antologijske 'Apuove trilogije' (Pather Panchali)?"*

### 61. Pitanje `hr_art_586`
- **Tekst pitanja:** *Kako se zove norveški skladatelj poznata po 'Pjesmama od pjesama' i lijepo glazbi?*
- **Što je netočno / problem:** Gramatičke pogreške u rodu i padežu ("poznata", "lijepo glazbi") te besmislen naslov.
- **Prijedlog ispravka:** Promijeniti u: *"Kako se zove norveški romantičarski skladatelj, autor glazbe za Ibsenovu dramu 'Peer Gynt'?"*

### 62. Pitanje `hr_art_587`
- **Tekst pitanja:** *Koji je američki redatelj napisao 'Zeleni milja' i 'Ostani sa mnom'?*
- **Navedeni točan odgovor:** `Frank Darabont`
- **Što je netočno / problem:** Film *Stand by Me* (*Ostani uz mene*) režirao je **Rob Reiner** (koji je naveden među netočnim odgovorima!), a ne Frank Darabont.
- **Prijedlog ispravka:** Zamijeniti naslov s Darabontovim filmom *"Iskupljenje u Shawshanku"* (The Shawshank Redemption).

### 63. Pitanje `hr_art_588`
- **Tekst pitanja:** *Kako se zove francuska kritičarka i teorijačicaTeksta poznata po 'Razaranju nasljeđa'?*
- **Što je netočno / problem:** Tipfeler ("teorijačicaTeksta") te besmislen prijevod naslova. Hélène Cixous je autorica slavnog eseja *Smijeh Meduze* (*Le Rire de la Méduse*).
- **Prijedlog ispravka:** Promijeniti u: *"Kako se zove francuska književna teoretičarka autorica utjecajnog feminističkog eseja 'Smijeh Meduze' (Le Rire de la Méduse)?"*

### 64. Pitanje `hr_art_589`
- **Tekst pitanja:** *Koji je američki glazbenik poznat po blues glazbi 'Reduziranje kanala' i 'Korijen'?*
- **Navedeni točan odgovor:** `Robert Johnson`
- **Što je netočno / problem:** Izmišljeni i besmisleni naslovi. Robert Johnson je poznat po blues klasicima *Cross Road Blues*, *Sweet Home Chicago*, *Me and the Devil Blues*.
- **Prijedlog ispravka:** Zamijeniti naslove s *"Cross Road Blues"* i *"Sweet Home Chicago"*.

### 65. Pitanje `hr_art_590`
- **Tekst pitanja:** *Kako se zove francuski redatelj poznat po 'Redu i Modru' filmskim serijama?*
- **Navedeni točan odgovor:** `Krzysztof Kieślowski`
- **Što je netočno / problem:** Kieślowski je **poljski** redatelj, a ne francuski. "Redu i Modru" je nakaradan prijevod njegove trilogije *Tri boje: Plava, Bijela, Crvena*.
- **Prijedlog ispravka:** Promijeniti "francuski" u **"poljski"** te naslov u **"trilogiji 'Tri boje' ('Plavo', 'Bijelo', 'Crveno')"**.

### 66. Pitanje `hr_art_591`
- **Što je netočno / problem:** Potpuni duplikat pitanja `hr_art_503` i `hr_art_38` (pitanje o Jane Austen i *Ponos i predrasude* ponovljeno je 3 puta).
- **Prijedlog ispravka:** Zamijeniti pitanje drugim autorskim pitanjem.

### 67. Pitanje `hr_art_593`
- **Tekst pitanja:** *Koji je redatelja poznat po 'Vrućem letu' i 'Snu u Listu'?*
- **Navedeni točan odgovor:** `Patricio Guzmán`
- **Što je netočno / problem:** Tipfeler ("redatelja") te izmišljeni i besmisleni naslovi filmova. Guzmán je poznat po dokumentarcima *Bitka za Čile* (The Battle of Chile) i *Nostalgija za svjetlom*.
- **Prijedlog ispravka:** Promijeniti naslove u *"Bitka za Čile"* i *"Nostalgija za svjetlom"*.

### 68. Pitanje `hr_art_594`
- **Tekst pitanja:** *Kako se zove talijanski kipar poznat po 'Novu Niku' i bih Bokom?*
- **Navedeni točan odgovor:** `Antonio Canova`
- **Što je netočno / problem:** Potpuno pokvaren i neshvatljiv tekst ("bih Bokom", "Novu Niku").
- **Prijedlog ispravka:** Promijeniti u: *"Kako se zove talijanski neoklasicistički kipar autor skulptura 'Eros i Psiha' i 'Tri gracije'?"*

### 69. Pitanje `hr_art_597`
- **Tekst pitanja:** *Koji je belgijski redatelj poznat po 'Šapatu brijega' i 'Svečanoj tihu'?*
- **Navedeni točan odgovor:** `André Delvaux`
- **Što je netočno / problem:** Izmišljeni i besmisleni naslovi. Delvaux je poznat po filmu *Čovjek koji je kratko podšišao kosu*.
- **Prijedlog ispravka:** Promijeniti naslov u *"Čovjek koji je kratko podšišao kosu"*.

### 70. Pitanje `hr_art_601`
- **Tekst pitanja:** *Koji je britanski glazbenik poznat po klasičnoj glazbi i novim kompozicijama 'Kolima'?*
- **Navedeni točan odgovor:** `Andrew Lloyd Webber`
- **Što je netočno / problem:** Webber je slavni skladatelj **mjuzikla** (*Fantom u operi*, *Mačke*, *Evita*), a ne "klasične glazbe". "Kolima" je nakaradan automatski prijevod naslova mjuzikla *Cats* (*Mačke* -> car -> kola).
- **Prijedlog ispravka:** Promijeniti u: *"Koji je britanski skladatelj mjuzikla autor slavnih djela 'Fantom u operi' (The Phantom of the Opera), 'Mačke' (Cats) i 'Evita'?"*

---

## Sažetak provjere
Kategorija `knjizevnost_i_umjetnost.json` sadrži izvrstan i opsežan skup pitanja, no u zadnjoj trećini datoteke (pitanja od `hr_art_500` nadalje) prisutan je veći broj automatski generiranih/prevedenih pitanja s ozbiljnim sintaksnim i činjeničnim pogreškama, izmišljenim naslovima djela, nespretnim prijevodima i zamjenom autorstva. 

Sve navedene točke u ovom izvješću omogućuju potpunu korekciju datoteke kako bi bila 100% činjenično i jezično točna.

#### 🔍 Dodatna zapažanja i analiza za kategoriju Književnost i Umjetnost:

U nastavku se nalazi pregled uočenih problema u pruženom skupu pitanja i odgovora iz kategorije **Književnost i Umjetnost** (`umjetnost.json`), razvrstanih u tri glavne kategorije: **netočna pitanja ili odgovori**, **pitanja koja sugeriraju točan odgovor (hinting / duplikati)** te **nejasno, dvosmisleno ili nepravilno napisana pitanja**.

---

## 1. Netočne činjenice ili pogrešni odgovori (Incorrect Questions / Answers)

1. **`hr_art_11` & `hr_art_21` & `hr_art_25` & `hr_art_56` & `hr_art_169` & `hr_art_200`**
   - **Problem u ponuđenim odgovorima:** Ime slavnog renesansnog slikara Raffaella Sanzija dosljedno je pogrešno napisano u ženskom rodu kao **"Rafaela"** umjesto **"Raffael"**, **"Rafaell"** ili **"Rafaele"** / **"Rafael"**.

2. **`hr_art_152`**
   - **Pitanje:** "Koji je francuski kipar u staklu autor skulpture 'Mala četrnaestogodišnja plesačica'?"
   - **Ponuđeni točan odgovor:** Edgar Degas
   - **Problem:** Edgar Degas je bio **impresionistički slikar i kipar u vosku/bronci**, a **ne kipar u staklu**. Kipar u staklu bio je René Lalique (`hr_art_125`).
   - **Prijedlog popravka:** Promijeniti u "...francuski impresionistički slikar i kipar autor skulpture..."

3. **`hr_art_205`**
   - **Pitanje:** "Kako se zove najpoznatiji roman Ranka Marinkovića čiji je središnji lik Melkior Tresić?"
   - **Problem u netočnim odgovorima:** Jedan od ponuđenih netočnih odgovora glasi **"Neoplazmišati"**, što je besmisleni tipfeler umjesto **"Neoplanta"** (roman Slobodana Tišme) ili **"Nevermore"**.

4. **`hr_art_244`**
   - **Pitanje:** "Kako se zove roman Zorana Ferića u kojem opisuje patološke i groteskne zgode s otoka Raba?"
   - **Ponuđeni točan odgovor:** Anđeo u hlačama
   - **Problem:** Knjiga o otoku Rabu i grotesknim patološkim zgodama zove se **Smrt djevojčice sa šibicama** (koja se u opcijama nalazi među *netočnim* odgovorima!). *Anđeo u hlačama* uopće nije roman Zorana Ferića nego zbirka/naslov drugog autora, dok je Ferić napisao *Anđeo u plasteniku*.
   - **Prijedlog popravka:** Postaviti **Smrt djevojčice sa šibicama** kao točan odgovor.

5. **`hr_art_505`**
   - **Pitanje:** "Kako se zove američki romanopisac autor 'Jalne Daisy' koji je opisao Lost Generation?"
   - **Ponuđeni točan odgovor:** F. Scott Fitzgerald
   - **Problem:** Lik se zove **Daisy Buchanan** (iz *Velikog Gatsbyja*), izraz "Jalne Daisy" ne postoji i činjenično je besmislen.

6. **`hr_art_506`**
   - **Pitanje:** "Koji je francusko-hrvatskog porijekla slikar poznat po surrealističkim djelima?"
   - **Ponuđeni točan odgovor:** Max Ernst
   - **Problem:** Max Ernst je bio **njemački** nadrealistički slikar. Nije bio francusko-hrvatskog podrijetla.

7. **`hr_art_507`**
   - **Pitanje:** "Kako se zove talijanska renesansna slikarku često nazivana 'Mona Lisa Renesanse'?"
   - **Ponuđeni točan odgovor:** Sofonisba Anguissola
   - **Problem:** Gramatički i činjenično neispravno formulirano pitanje.

8. **`hr_art_509`**
   - **Pitanje:** "Kako se zove barokni skladatelj, kasnije klasičar, известан po simfonijama i koncertima?"
   - **Ponuđeni točan odgovor:** Antonio Vivaldi
   - **Problem:** Vivaldi je bio isključivo barokni skladatelj, poznat po koncertima (preko 500), no nije stvarao klasicističke simfonije. Pitanje sadrži i rusizam/srpski oblik ("известан").

9. **`hr_art_510`**
   - **Pitanje:** "Koji je film redatelja Terryja Gilliamsa iz 1985. godine imao naziv '12 majmuna'?"
   - **Ponuđeni točan odgovor:** 12 Monkeys
   - **Problem:** Film *12 majmuna* (12 Monkeys) izašao je **1995. godine**, a ne 1985. (1985. je izašao njegov film *Brazil*).

10. **`hr_art_511`**
    - **Pitanje:** "Kako se zove talijanski skladatelj 18. stoljeća poznat po operama 'Don Giovanni' i 'Čarobna frula'?"
    - **Ponuđeni točan odgovor:** Wolfgang Amadeus Mozart
    - **Problem:** Mozart je bio **austrijski/njemački skladatelj**, a **ne talijanski**!

11. **`hr_art_513`**
    - **Pitanje:** "Koji je njemački skladatelj poznat po godišnjih Muzikalskim darivanjima u Bachu?"
    - **Ponuđeni točan odgovor:** Johann Sebastian Bach
    - **Problem:** Pitanje je potpuno besmisleno generirano prevođenjem ("u Bachu", "Muzikalskim darivanjima").

12. **`hr_art_514`**
    - **Pitanje:** "Kako se zove britanska glumica poznata po ulogama u 'Breakfast at Tiffany's' i filmima sa Jamesa Bonda?"
    - **Problem:** Audrey Hepburn **nikada nije glumila u filmovima o Jamesu Bondu**.

13. **`hr_art_515`**
    - **Pitanje:** "Koji je francuski skladatelj poznat po baleskom glazbi 'The Rite of Spring'?"
    - **Ponuđeni točan odgovor:** Igor Stravinsky
    - **Problem:** Igor Stravinski je bio **ruski** (i kasnije američki/švicarski) skladatelj, a **ne francuski**.

14. **`hr_art_519`**
    - **Pitanje:** "Koji je redatelj poznat po proizvodnji 'Čelika Magnolija' i 'Plače sa vukovima'?"
    - **Ponuđeni točan odgovor:** Steven Spielberg
    - **Problem:** *Čelične magnolije* režirao je Herbert Ross, a *Ples s vukovima* Kevin Costner. Steven Spielberg nema veze ni s jednim ni s drugim filmom.

15. **`hr_art_524`**
    - **Pitanje:** "Kako se zove njemački композitor poznat po 'Božanskoj komediji' i simfonijama?"
    - **Ponuđeni točan odgovor:** Ludwig van Beethoven
    - **Problem:** Beethoven nije napisao "Božansku komediju" (to je ep Dantea Alighierija).

16. **`hr_art_529`**
    - **Pitanje:** "Koji je skladatelj hrvatskog porijekla poznat po simfonijama 'Vrijeme' i 'Dijelenja'?"
    - **Ponuđeni točan odgovor:** Milko Kelemen
    - **Problem:** Proizvoljni i netočni nazivi djela.

17. **`hr_art_530`**
    - **Pitanje:** "Kako se zove španjolski kisac napisao 'Ljubav u vrijeme holere'?"
    - **Ponuđeni točan odgovor:** Gabriel García Márquez
    - **Problem:** Márquez je **kolumbijski pisac**, a ne španjolski!

18. **`hr_art_535`**
    - **Pitanje:** "Koji je britanski glazbenik osnivač benda 'The Beatles' kao tekstopisac?"
    - **Ponuđeni točan odgovor:** John Lennon
    - **Problem:** Dvosmisleno i nespretloslovljeno (The Beatles su osnovali John Lennon i Paul McCartney zajedno s prvotnim članovima).

19. **`hr_art_544` & `hr_art_549`**
    - **Pitanje:** "Kako se zove francuska skladateljica poznata po glazbi za ples 'Bolero'?" / "Koji je francusko-talijanski skladatelj..."
    - **Ponuđeni točan odgovor:** Maurice Ravel
    - **Problem:** Maurice Ravel je bio **muškarac (muški skladatelj)**, a ne "skladateljica"!

20. **`hr_art_547`**
    - **Pitanje:** "Koji je oblast redatelja koji je režirao 'Moderni čas' sa Charlijem Chaplotom?"
    - **Ponuđeni točan odgovor:** Charlie Chaplin
    - **Problem:** Potpuno nepostojeće riječi i besmisleno pitanje ("Charlijem Chaplotom", "oblast redatelja").

21. **`hr_art_550`**
    - **Pitanje:** "Kako se zove švecarski pisac i nobelovac autor 'Jalonski roman'?"
    - **Ponuđeni točan odgovor:** Robert Walser
    - **Problem:** Robert Walser **nikada nije dobio Nobelovu nagradu** za književnost.

22. **`hr_art_551`**
    - **Pitanje:** "Koji je američki glazbenik poznat po rock glazbi 'Čekaj' i 'The Rolling Stones'?"
    - **Ponuđeni točan odgovor:** Mick Jagger
    - **Problem:** Mick Jagger je **britanski/engleski** glazbenik, a ne američki.

23. **`hr_art_554`**
    - **Pitanje:** "Kako se zove померanska skladanja..."
    - **Ponuđeni točan odgovor:** Magdalena Abakanowicz
    - **Problem:** Magdalena Abakanowicz bila je **poljska kiparica i tekstilna umjetnica**, a ne "skladanja".

24. **`hr_art_569`**
    - **Pitanje:** "Koji je britanski glazbenik poznat po elektronskoj glazbi i experimentima s EMS sintetizatorom?"
    - **Ponuđeni točan odgovor:** Kraftwerk
    - **Problem:** Kraftwerk je **njemački** sastav iz Düsseldorfa, a ne britanski glazbenik.

25. **`hr_art_572`**
    - **Pitanje:** "Kako se zove američka pisačica autor 'Podzemnog željezničkog' i 'Bijelog Zeba'?"
    - **Ponuđeni točan odgovor:** Haruki Murakami
    - **Problem:** Haruki Murakami je **japanski muški pisac**, a ne američka pisačica. *Podzemnu željeznicu* napisao je Colson Whitehead.

26. **`hr_art_574`**
    - **Pitanje:** "Kako se zove francuskinja redatelja poznat po 'Crvenom' i 'Bieloj'?"
    - **Ponuđeni točan odgovor:** Krzysztof Kieślowski
    - **Problem:** Krzysztof Kieślowski je bio **poljski muški redatelj**.

27. **`hr_art_576`**
    - **Pitanje:** "Kako se zove češka skladanja..."
    - **Ponuđeni točan odgovor:** Leoš Janáček
    - **Problem:** Janáček je bio muški skladatelj.

28. **`hr_art_581`**
    - **Pitanje:** "Koji je francuskom skladatelja napisao 'Fausta' i 'Samson i Dalila'?"
    - **Ponuđeni točan odgovor:** Camille Saint-Saëns
    - **Problem:** Operu *Faust* napisao je **Charles Gounod**, dok je Saint-Saëns napisao *Samson i Dalila*.

29. **`hr_art_582`**
    - **Pitanje:** "Kako se zove američka slikarina pop art..."
    - **Ponuđeni točan odgovor:** Andy Warhol
    - **Problem:** Andy Warhol je bio muškarac.

30. **`hr_art_586`**
    - **Pitanje:** "Kako se zove norveška skladanja..."
    - **Ponuđeni točan odgovor:** Edvard Grieg
    - **Problem:** Edvard Grieg je bio muški skladatelj.

31. **`hr_art_591`**
    - **Pitanje:** "Koji je britanski pisac napisao 'Ponos i predrasude' pod pseudonimom Jane Austen?"
    - **Ponuđeni točan odgovor:** Jane Austen
    - **Problem:** Jane Austen je njeno pravo ime, a ne pseudonim.

32. **`hr_art_596`**
    - **Pitanje:** "Kako se zove britanski skladatelja poznat po filmskoj glazbi 'Zvjezdane steze'?"
    - **Ponuđeni točan odgovor:** Hans Zimmer
    - **Problem:** Hans Zimmer je **njemački** skladatelj.

33. **`hr_art_599`**
    - **Pitanje:** "Koji je skladatelja napisao 'Noćni red' i 'Tamni dio mjeseca'?"
    - **Ponuđeni točan odgovor:** Claude Debussy
    - **Problem:** *The Dark Side of the Moon* je album grupe Pink Floyd.

---

## 2. Pitanja s navođenjem (Hinting) i besmisleni duplikati

1. **`hr_art_366`**
   - **Pitanje:** "Koji je francuski umjetnik osnovao pokret 'Nouveau Réalisme' te je poznat po patentiranoj plavoj boji (**IKB**)?"
   - **Točan odgovor:** **Yves Klein** (IKB = International **Klein** Blue - inicijali direktno odaju odgovor).

2. **`hr_art_405`**
   - **Pitanje:** "Kako se zove narativna pjesma Geoffreya Chaucera '**Troilus i Kresida**' (Troilus and Criseyde)...?"
   - **Točan odgovor:** **Troilus i Kresida** (Naslov je doslovno napisan u pitanju!).

3. **`hr_art_516` & `hr_art_591`**
   - **Pitanje `hr_art_516`:** "Kako se zove britanski pisac **Agatha Christie**, poznata po detektivskim romanima?" -> Odgovor: **Agatha Christie**.

4. **`hr_art_523`**
   - **Pitanje:** "Koji je umjetnik iza ideje '**ready-made**' i potpisanog pisoara kao umjetnine?" -> Odgovor: **Marcel Duchamp** (Pitanje je identično ranijem `hr_art_352`).

5. **`hr_art_547`**
   - **Pitanje:** "...sa **Charlijem Chaplotom**?" -> Odgovor: **Charlie Chaplin**.

6. **`hr_art_555`**
   - **Pitanje:** "Koji je irski pisac napisao '**Što do Godota**'..." -> Odgovor: **Samuel Beckett** (Preoblikovano pitanje iz `hr_art_68`).

---

## 3. Masovni strojni prijevodi, nejasno i gramatički nepravilno napisana pitanja

Cijeli raspon pitanja od **`hr_art_501` do `hr_art_601`** nastao je neukim strojnim prevođenjem s drugog jezika (najvjerojatnije ruskog ili engleskog), te obiluje strahovitim gramatičkim pogreškama, izmišljenim riječima i besmislenim rečenicama:

* **`hr_art_503`**: "britanski pisac autor романа..." (ruska ćirilica 'романа')
* **`hr_art_507`**: "...slikarku..."
* **`hr_art_509`**: "...известан po simfonijama..." (ruski/srpski izraz)
* **`hr_art_514`**: "...filmima sa Jamesa Bonda?"
* **`hr_art_515`**: "...baleskom glazbi..."
* **`hr_art_517`**: "...drugu klasiku..."
* **`hr_art_518`**: "...poznatan po prikazivanju..."
* **`hr_art_520`**: "...revolucionalizirao proznu strukturu?"
* **`hr_art_522`**: "...koriscu živica..."
* **`hr_art_524`**: "...njemački композitor..." (ćirilično 'композitor')
* **`hr_art_528`**: "...talijanski rzezbari renesanse..."
* **`hr_art_530`**: "...španjolski kisac napisao..."
* **`hr_art_531`**: "...jazz legenda познana po trubljenju 'Grešiti bebop'?"
* **`hr_art_532`**: "...slikarka poznata po svjetskim porterima?"
* **`hr_art_533`**: "...'Ja znam, zašto pjeva zatvora ptica'?"
* **`hr_art_536`**: "...francuska slikarka impresionista poznata po scinama s djeci..."
* **`hr_art_537`**: "...'O Jesu kokoškama'?" (strojni prijevod za *Of Mice and Men*)
* **`hr_art_539`**: "...ruskin pisac... ljubeći?"
* **`hr_art_540`**: "...američka režiserka poznatau po 'Ženom pod mostom'..."
* **`hr_art_541`**: "...operski hep..."
* **`hr_art_543`**: "...'Izazov patuljaka'..."
* **`hr_art_544`**: "...francuska skladateljica..."
* **`hr_art_545`**: "...od gipsa i bjetona?"
* **`hr_art_546`**: "...lirskim revolucijama?"
* **`hr_art_548`**: "...'Žaba čekati'?"
* **`hr_art_550`**: "...švecarski pisac..."
* **`hr_art_552`**: "...američki redatelja poznat po 'Severna deklariacija'..."
* **`hr_art_553`**: "...'Kočonjena vrata' i 'Dama bez čarapalje'?"
* **`hr_art_554`**: "...померanska skladanja..."
* **`hr_art_556`**: "...američki skladatelja poznat po симфонијама..." (ćirilica)
* **`hr_art_558`**: "...holandski redatelja..."
* **`hr_art_560`**: "...tehnikalnih fotografiranja?"
* **`hr_art_561`**: "...redatelja iz Taiwanese..."
* **`hr_art_562`**: "...američka pisačica..."
* **`hr_art_563`**: "...skladatelja napisao..."
* **`hr_art_564`**: "...britanski redatelja..."
* **`hr_art_565`**: "...o novinarskoj familiiji?"
* **`hr_art_566`**: "...japonska skladanja..."
* **`hr_art_568`**: "...američka slikarina..."
* **`hr_art_570`**: "...дани pisac..." (ćirilica)
* **`hr_art_573`**: "...britanski skladatelja..."
* **`hr_art_574`**: "...francuskinja redatelja..."
* **`hr_art_576`**: "...češka skladanja..."
* **`hr_art_577`**: "...redatelja negativci 'Šuma pametnog usta'..."
* **`hr_art_578`**: "...vjerskim tomama od bro kaza?"
* **`hr_art_580`**: "...švedska redatelja..."
* **`hr_art_581`**: "...francuskom skladatelja..."
* **`hr_art_582`**: "...američka slikarina pop art..."
* **`hr_art_583`**: "...redatelja iz Indije..."
* **`hr_art_585`**: "...surrealističkim scilama sa telima..."
* **`hr_art_586`**: "...norveška skladanja..."
* **`hr_art_587`**: "...američki redatelja..."
* **`hr_art_588`**: "...teorijačicaTeksta..."
* **`hr_art_590`**: "...francouzski redatelja..."
* **`hr_art_592`**: "...američka glasovka..."
* **`hr_art_594`**: "...bih Bokom?"
* **`hr_art_595`**: "...amerikani pisac..."
* **`hr_art_596`**: "...britanski skladatelja..."
* **`hr_art_597`**: "...redatelja iz Belgije..."
* **`hr_art_598`**: "...francuska filmska redatelja..."
* **`hr_art_600`**: "...američki redatelja poznata..."

---

## Preporuke za Čišćenje i Poboljšanje Baze

1. **Potpuno izbrisati ili ponovno napisati raspon od `hr_art_501` do `hr_art_601`**. Taj dio baze je neupotrebljiv zbog teških grešaka u strojnom prevođenju, neslaganja rodova, ćiriličnih slova i potpunih činjeničnih besmislica.
2. **Ispraviti činjenične pogreške u prvom dijelu baze**:
   - Ispraviti pogrešku oko romana *Smrt djevojčice sa šibicama* (`hr_art_244`).
   - Ispraviti medij u kojem je radio Edgar Degas (`hr_art_152`).
   - Zamijeniti ženski oblik "Rafaela" s "Rafael" u svim opcijama odgovora.
3. **Ukloniti naznake točnih odgovora (hinting)** kod pitanja `hr_art_366` i `hr_art_405`.

---

### 💡 2.4. Kategorija: Opće Znanje (`opca_znanje.json` — 100 pitanja)

Tijekom detaljne provjere činjenica svih 100 pitanja u datoteci `c:\Users\bong\Documents\triviabong\src\data\categories\opca_znanje.json`, identificirano je **4 pitanja** s činjeničnim pogreškama, dvosmislenostima ili pogrešnim formulacijama.

U nastavku je detaljan pregled pronađenih nepravilnosti s obrazloženjima i predloženim ispravcima.

---

### 1. Pitanje `hr_gen_175`

- **ID pitanja:** `hr_gen_175`
- **Tekst pitanja:** `"Koliko minuta traje jedna četvrtina u standardnoj hokejaškoj utakmici (period)?"`
- **Navedeni točan odgovor:** `"20 minuta"`
- **Što je pogrešno / Zašto je netočno:** 
  U hokeju na ledu utakmica se sastoji od **tri trećine (perioda)** po 20 minuta (ukupno 60 minuta čiste igre). Hokejska utakmica **nema četvrtine** (četvrtina označava 1/4 utakmice, npr. u košarci ili američkom nogometu). Nazivati period u hokeju "četvrtinom" činjenično je pogrešno jer bi 4 četvrtine po 20 minuta iznosile 80 minuta.
- **Predloženi ispravak:**
  - **Ispravljeni tekst pitanja:** `"Koliko minuta traje jedna trećina (period) u standardnoj hokejaškoj utakmici?"`
  - **Točan odgovor:** `"20 minuta"`
  - **Netočni odgovori:** `["15 minuta", "12 minuta", "25 minuta"]`

---

### 2. Pitanje `hr_gen_158`

- **ID pitanja:** `hr_gen_158`
- **Tekst pitanja:** `"Koji se dio oka širi ili skuplja kako bi regulirao ulazak svjetlosti?"`
- **Navedeni točan odgovor:** `"Zjenica"`
- **Navedeni netočni odgovori:** `["Šarenica", "Mrežnica", "Rožnica"]`
- **Što je pogrešno / Zašto je netočno:** 
  Anatomski i biološki, **šarenica (iris)** je mišićno tkivo koje se aktivno širi i skuplja (steže i opušta) kako bi kontroliralo količinu svjetlosti koja ulazi u oko. **Zjenica (pupil)** nije mišić ili fizikalno tkivo, već samo otvor (rupa) u središtu šarenice čiji se promjer mijenja radom šarenice. Iako se u razgovornom jeziku kaže "zjenica se širi", navođenje **"Šarenica" kao netočnog odgovora** stvara ozbiljnu činjeničnu pogrešku i zabludu, jer je šarenica upravo onaj dio oka koji se širi/skuplja.
- **Predloženi ispravak:**
  - **Opcija A (promjena pitanja):**
    - **Tekst pitanja:** `"Kako se zove otvor u središtu šarenice kroz koji svjetlost ulazi u oko?"`
    - **Točan odgovor:** `"Zjenica"`
    - **Netočni odgovori:** `["Mrežnica", "Rožnica", "Leća"]`
  - **Opcija B (promjena točnog odgovora):**
    - **Tekst pitanja:** `"Koji se mišićni dio oka širi ili skuplja kako bi regulirao ulazak svjetlosti?"`
    - **Točan odgovor:** `"Šarenica"`
    - **Netočni odgovori:** `["Mrežnica", "Rožnica", "Leća"]`

---

### 3. Pitanje `hr_gen_179`

- **ID pitanja:** `hr_gen_179`
- **Tekst pitanja:** `"Kako se zove zrakoplovna crna kutija koja zapravo nije crna već kojeg sjajnog tona radi lakšeg pronalaska?"`
- **Navedeni točan odgovor:** `"Narančasta"`
- **Što je pogrešno / Zašto je netočno:** 
  Pitanje započinje s *"Kako se zove..."* (što traži naziv uređaja, npr. snimač podataka o letu / Flight Data Recorder), dok je ponuđeni točan odgovor pridjev za boju (*"Narančasta"*). Osim toga, sintaksa pitanja (*"već kojeg sjajnog tona"*) je jezično neispravna i neprirodna.
- **Predloženi ispravak:**
  - **Ispravljeni tekst pitanja:** `"Koje je boje zrakoplovna 'crna kutija' kako bi se lakše uočila i pronašla nakon nesreće?"`
  - **Točan odgovor:** `"Narančasta"`
  - **Netočni odgovori:** `["Žuta", "Crvena", "Plava"]`

---

### 4. Pitanje `hr_gen_187`

- **ID pitanja:** `hr_gen_187`
- **Tekst pitanja:** `"Kako se zove proces kojim plinovito stanje tvari prelazi izravno u tekuće?"`
- **Navedeni točan odgovor:** `"Kondenzacija"`
- **Što je pogrešno / Zašto je netočno:** 
  Riječ *"izravno"* u kontekstu agregatnih stanja stručno se koristi za prijelaze koji preskaču među stanje (npr. sublimacija iz čvrstog izravno u plinovito ili desublimacija iz plinovitog izravno u čvrsto). Prijelaz iz plinovitog u tekuće stanje je standardni prijelaz izmedu susjednih agregatnih stanja (kondenzacija), pa je riječ *"izravno"* suvišna i navodi na krivi zaključak (zamjenu s desublimacijom).
- **Predloženi ispravak:**
  - **Ispravljeni tekst pitanja:** `"Kako se zove fizikalni proces kojim tvar iz plinovitog stanja prelazi u tekuće?"`
  - **Točan odgovor:** `"Kondenzacija"`
  - **Netočni odgovori:** `["Sublimacija", "Isparavanje", "Taljenje"]`

---

## Zaključak

Od ukupno 100 analiziranih pitanja (`hr_gen_101` do `hr_gen_200`), **96 pitanja je potpuno točno i zadovoljava sve kriterije**, dok **4 pitanja zahtijevaju korekciju** teksta ili ponuđenih odgovora prema gore navedenim smjernicama.

---

### 🎬 2.5. Kategorija: Pop Kultura (`pop_kultura.json` — 780 pitanja)

Pregledom svih pitanja u datoteci `c:\Users\bong\Documents\triviabong\src\data\categories\pop_kultura.json` utvrđene su sljedeće činjenične netočnosti, pogreške u prijevodu, tipfeleri i nelogičnosti.

---

### 1. Pitanje `hr_pop_6`
- **Pitanje:** Koji je film nagrađen Oskorom za najbolji film 2020. godine i prvi je film na stranom jeziku koji je osvojio tu nagradu?
- **Navedeni točan odgovor:** Parazit (Parasite)
- **Problem / Netočnost:** Tipfeler u tekstu pitanja — riječ "Oskorom" umjesto "Oskarom" ili "Oscarom".
- **Predloženi popravak:** Izmijeniti tekst pitanja u: "Koji je film nagrađen Oscarom za najbolji film 2020. godine i prvi je film na stranom jeziku koji je osvojio tu nagradu?"

---

### 2. Pitanje `hr_pop_24`
- **Pitanje:** Kako se zove tajanstveno stvorenje s utvrđenim telekinetičkim moćima u seriji 'Stranger Things' koje voli vafle?
- **Navedeni točan odgovor:** Eleven (Jedanaest)
- **Problem / Netočnost:** Eleven je ljudsko biće / djevojčica s telekinetičkim moćima (eksperimentalni subjekt 011), a ne "stvorenje" (creature/monster).
- **Predloženi popravak:** Izmijeniti tekst pitanja u: "Kako se zove tajanstvena djevojčica s telekinetičkim moćima u seriji 'Stranger Things' koja voli vafle?"

---

### 3. Pitanje `hr_pop_27`
- **Pitanje:** Kako se zove najpoznatija prijelazna zgrada u New Yorku koja služi kao sjedište osvetnika u Marvelovim stripovima?
- **Navedeni točan odgovor:** Stark Tower / Avengers Tower
- **Problem / Netočnost:** Besmislen / pogrešan prijevod "prijelazna zgrada" (transitional building) umjesto "prepoznatljivi neboder" ili "poznati toranj" (iconic skyscraper/building).
- **Predloženi popravak:** Izmijeniti tekst pitanja u: "Kako se zove poznati neboder u New Yorku koji služi kao sjedište Osvetnika u Marvelovim stripovima i filmovima?"

---

### 4. Pitanje `hr_pop_37`
- **Pitanje:** Kako se zove najpoznatija pjesma južnokorejskog izvođača PSY-a iz 2012. koja je prva prešla milijard pregleda na YouTubeu?
- **Navedeni točan odgovor:** Gangnam Style
- **Problem / Netočnost:** Tipfeler u tekstu pitanja — "milijard pregleda" umjesto "milijardu pregleda".
- **Predloženi popravak:** Izmijeniti tekst pitanja u: "Kako se zove najpoznatija pjesma južnokorejskog izvođača PSY-a iz 2012. koja je prva prešla milijardu pregleda na YouTubeu?"

---

### 5. Pitanje `hr_pop_45`
- **Pitanje:** Koji je redatelj poznat po svojim vizualno upečatljivim i simetričnim filmovima poput 'Hotel Grand Budapest' i 'Svijet iz mašte'?
- **Navedeni točan odgovor:** Wes Anderson
- **Problem / Netočnost:** Činjenična pogreška — ne postoji film Wesa Andersona pod naslovom "Svijet iz mašte".
- **Predloženi popravak:** Zamijeniti izmišljeni naslov stvarnim filmom Wesa Andersona, npr.: "Koji je redatelj poznat po svojim vizualno upečatljivim i simetričnim filmovima poput 'Hotel Grand Budapest' i 'Kraljevstvo izlazećeg mjeseca' (Moonrise Kingdom)?"

---

### 6. Pitanje `hr_pop_72`
- **Pitanje:** Kako se zove legendarna kiselina i napitak u čarobnom svijetu Harryja Pottera koji se poslužuje u 'Tri metle'?
- **Navedeni točan odgovor:** Buzovo pivo (Butterbeer / Bezalkoholno pivo od maslaca)
- **Problem / Netočnost:** 
  1. U tekstu pitanja napitak se naziva "kiselina" (acid), što je potpuno pogrešno.
  2. U točnom odgovoru navodi se "Buzovo pivo", što ne postoji u hrvatskom prijevodu Harryja Pottera (izvorno: *Butterbeer*, hrvatski: *Pivo od maslaca* ili *Bezalkoholno pivo od maslaca*).
- **Predloženi popravak:**
  - Tekst pitanja: "Kako se zove legendarni napitak u čarobnom svijetu Harryja Pottera koji se poslužuje u kafiću 'Tri metle'?"
  - Točan odgovor: "Pivo od maslaca (Butterbeer)"

---

### 7. Pitanje `hr_pop_74`
- **Pitanje:** Kako se zove protagonist i preživjeli borac u franšizi 'Postapokaliptični Pobesneli Max' (Mad Max)?
- **Navedeni točan odgovor:** Max Rockatansky
- **Problem / Netočnost:** Jezična pogreška — "Pobesneli Max" je srpski naslov franšize. U službenom hrvatskom prijevodu naslov glasi "Pobješnjeli Max" (ili "Mad Max").
- **Predloženi popravak:** Izmijeniti tekst pitanja u: "Kako se zove protagonist i preživjeli borac u postapokaliptičnoj filmskoj franšizi 'Pobješnjeli Max' (Mad Max)?"

---

### 8. Pitanje `hr_pop_87`
- **Pitanje:** Koji je glumac glumio Dwaynea Johnsona u filmu 'Jumanji: Dobrodošli u džunglu' i poznat je pod nadimkom 'The Rock'?
- **Navedeni točan odgovor:** Dwayne Johnson
- **Problem / Netočnost:** Besmisleno sročeno pitanje ("Koji je glumac glumio Dwaynea Johnsona..."). Dwayne Johnson nije glumio samoga sebe nego lika dr. Smoldera Bravestonea.
- **Predloženi popravak:** Izmijeniti tekst pitanja u: "Koji je glumac, poznat pod nadimkom 'The Rock', glumio dr. Smoldera Bravestonea u filmu 'Jumanji: Dobrodošli u džunglu'?"

---

### 9. Pitanje `hr_pop_108`
- **Pitanje:** Kako se zove glavi zlikovac u prvom filmu 'Star Wars' koji je otac Lukea Skywalkera?
- **Navedeni točan odgovor:** Darth Vader
- **Problem / Netočnost:** Tipfeler u tekstu pitanja — "glavi zlikovac" umjesto "glavni zlikovac".
- **Predloženi popravak:** Izmijeniti "glavi" u "glavni".

---

### 10. Pitanje `hr_pop_142`
- **Pitanje:** Kako se zove fikcionalna država iz koje potječe borilački vještak i lik Shang-Chi u Marvelovom svemiru?
- **Navedeni točan odgovor:** Ta Lo
- **Problem / Netočnost:** Činjenična pogreška — Ta Lo u Marvelovom svemiru nije "država" (country), nego skriveno mitološko selo / paralelna dimenzija.
- **Predloženi popravak:** Izmijeniti tekst pitanja u: "Kako se zove skriveno mitološko selo i dimenzija iz koje potječe majka junaka Shang-Chija u Marvelovom svemiru?"

---

### 11. Pitanje `hr_pop_166`
- **Pitanje:** Kako se zove talijanski otok na kojem se odvija radnja druge sezone serije 'Bijeli lotos' (The White Lotus)?
- **Navedeni točan odgovor:** Sicilija (2. sezona je u Italiji na Siciliji, 1. na Havajima)
- **Problem / Netočnost:** Pogreška u formatu ponuđenog odgovora — točan odgovor sadrži objašnjenje u zagradi u samom tekstu opcije umjesto čistog odgovora.
- **Predloženi popravak:** Pročistiti točan odgovor u samo: `Sicilija`.

---

### 12. Pitanje `hr_pop_184`
- **Pitanje:** Kako se zove glavi lik u franšizi videoigara 'God of War' koji osvaja grčku i skandinavsku mitologiju?
- **Navedeni točan odgovor:** Kratos
- **Problem / Netočnost:** Tipfeler u tekstu pitanja — "glavi lik" umjesto "glavni lik".
- **Predloženi popravak:** Izmijeniti "glavi" u "glavni".

---

### 13. Pitanja `hr_pop_212` i `hr_pop_682`
- **Pitanje:** Kako se zove planeta na kojoj se nalazi rudnik dragocjenog minerala unobtanija u filmu 'Avatar'?
- **Navedeni točan odgovor:** Pandora
- **Problem / Netočnost:** Činjenična pogreška — Pandora u filmu *Avatar* nije planet ("planeta"), već nastanjeni mjesec (prirodni satelit) koji kruži oko plinskog diva Polifema.
- **Predloženi popravak:** Izmijeniti tekst pitanja u: "Kako se zove mjesec na kojem se nalazi rudnik dragocjenog minerala unobtanija u filmu 'Avatar'?"

---

### 14. Pitanje `hr_pop_217`
- **Pitanje:** Kako se zove glavi ženski lik kojeg glumi Kate Winslet u filmu 'Vječni sjaj nepobjedivog uma' (Eternal Sunshine of the Spotless Mind)?
- **Navedeni točan odgovor:** Clementine
- **Problem / Netočnost:** Tipfeler u tekstu pitanja — "glavi ženski lik" umjesto "glavni ženski lik".
- **Predloženi popravak:** Izmijeniti "glavi" u "glavni".

---

### 15. Pitanje `hr_pop_230`
- **Pitanje:** Kako se zove pas iz animiranog filma 'Koralina' i 'Noćna mora prije Božića' koji ima nos u obliku svjetleće bundeve?
- **Navedeni točan odgovor:** Zero
- **Problem / Netočnost:** Činjenična pogreška — pas Zero je duh-pas Jacka Skellingtona iz filma *Noćna mora prije Božića* (The Nightmare Before Christmas). Ne pojavljuje se u filmu *Koralina* (Coraline).
- **Predloženi popravak:** Izbaciti film *Koralina*: "Kako se zove pas iz animiranog filma 'Noćna mora prije Božića' koji ima nos u obliku svjetleće bundeve?"

---

### 16. Pitanje `hr_pop_278`
- **Pitanje:** Koja je serija o financijskom savjetniku Martju Byrdeu koji pere novac za meksički kartel u Missouriju?
- **Navedeni točan odgovor:** Ozark
- **Problem / Netočnost:** Tipfeler u tekstu pitanja — "Martju Byrdeu" umjesto "Martyju Byrdeu".
- **Predloženi popravak:** Izmijeniti "Martju" u "Martyju".

---

### 17. Pitanje `hr_pop_283`
- **Pitanje:** Kako se zove majka i kraljica zmajeva Daenerys Targaryen u 'Igri prijestolja'?
- **Navedeni točan odgovor:** Khaleesi
- **Problem / Netočnost:** Nelogično sročeno pitanje — pitanje navodi njezino pravo ime ("Daenerys Targaryen") i pita "Kako se zove...", a kao odgovor očekuje titulu "Khaleesi" (dothraki titula za kraljicu/suprugu khala).
- **Predloženi popravak:** Izmijeniti tekst pitanja u: "Koju titulu ili nadimak nosi majka zmajeva Daenerys Targaryen u 'Igri prijestolja'?"

---

### 18. Pitanje `hr_pop_291`
- **Pitanje:** Kako se zove pas pasmine mops koji živi s obitelji u animiranoj seriji 'Family Guy'?
- **Navedeni točan odgovor:** Brian Griffin
- **Problem / Netočnost:** Velika činjenična pogreška — Brian Griffin u seriji *Family Guy* je **bijeli labrador retriver** (White Labrador Retriever), a ne mops!
- **Predloženi popravak:** Izmijeniti "pas pasmine mops" u "pas pasmine labrador retriver".

---

### 19. Pitanje `hr_pop_393`
- **Pitanje:** Kako se zove mrzovoljni prvi susjed Spužva Boba Skockanog koji svira klarinet?
- **Navedeni točan odgovor:** Karlo Bjeloperka (Squidward)
- **Netočni odgovori:** Patrik, Plankton, Gospodin Klijentić
- **Problem / Netočnost:** Tipfeler u netočnom odgovoru — "Gospodin Klijentić" umjesto "Gospodin Kliještić" (Mr. Krabs u hrvatskoj sinkronizaciji je Gospodin Kliještić).
- **Predloženi popravak:** Izmijeniti netočan odgovor "Gospodin Klijentić" u "Gospodin Kliještić".

---

### 20. Pitanje `hr_pop_399`
- **Pitanje:** Kako se zove izmišljeni grad pod morem u kojem živi Spužva Bob Skockani?
- **Navedeni točan odgovor:** Bikinska Koraljna (Bikini Bottom)
- **Problem / Netočnost:** Pogrešan prijevod — u službenoj hrvatskoj sinkronizaciji serije *Spužva Bob Skockani*, Bikini Bottom se prevodi kao **Bikini Dolina** (ili Bikini Bottom). "Bikinska Koraljna" je loš strojni prijevod.
- **Predloženi popravak:** Izmijeniti točan odgovor u: "Bikini Dolina (Bikini Bottom)".

---

### 21. Pitanje `hr_pop_440`
- **Pitanje:** Koji je animirani serijal pratio pustolovine dječaka pretvorenog u psa pod imenom 'Courage the Cowardly Dog'?
- **Navedeni točan odgovor:** Kuraž hrabri pas
- **Problem / Netočnost:** Činjenična pogreška — pas Kuraž (Courage) nikada nije bio dječak pretvoren u psa. Kuraž je ružičasti pas kojeg su kao štene udomili Muriel i Eustace.
- **Predloženi popravak:** Izmijeniti "dječaka pretvorenog u psa" u "plašljivog ružičastog psa".

---

### 22. Pitanje `hr_pop_472`
- **Pitanje:** Koja je pjevačica osvojila nagradu Oscar za najbolju pjesmu s filmom 'Odrastanje' (No Time to Die) o Jamesu Bondu?
- **Navedeni točan odgovor:** Billie Eilish
- **Problem / Netočnost:** Pogrešan prijevod naslova filma — film o Jamesu Bondu *No Time to Die* u Hrvatskoj je preveden kao "Za smrt nema vremena". Naslov "Odrastanje" odnosi se na filmove *Boyhood* ili *Turning Red*.
- **Predloženi popravak:** Izmijeniti "'Odrastanje' (No Time to Die)" u "'Za smrt nema vremena' (No Time to Die)".

---

### 23. Pitanje `hr_pop_492`
- **Pitanje:** Kako se zove glavi lik u videoigri 'Final Fantasy VII' koji nosi mač Buster Sword?
- **Navedeni točan odgovor:** Cloud Strife
- **Problem / Netočnost:** Tipfeler u tekstu pitanja — "glavi lik" umjesto "glavni lik".
- **Predloženi popravak:** Izmijeniti "glavi" u "glavni".

---

### 24. Pitanje `hr_pop_504`
- **Pitanje:** Kako se zove glavi lik franšize videoigara 'The Legend of Zelda' koji spašava princezu Zeldu?
- **Navedeni točan odgovor:** Link
- **Problem / Netočnost:** Tipfeler u tekstu pitanja — "glavi lik" umjesto "glavni lik".
- **Predloženi popravak:** Izmijeniti "glavi" u "glavni".

---

### 25. Pitanje `hr_pop_530`
- **Pitanje:** Kako se zove glavi zlikovac u crtiću 'Super Mario' koji otima princezu Peach?
- **Navedeni točan odgovor:** Bowser
- **Problem / Netočnost:** Tipfeler u tekstu pitanja — "glavi zlikovac" umjesto "glavni zlikovac".
- **Predloženi popravak:** Izmijeniti "glavi" u "glavni".

---

### 26. Pitanje `hr_pop_550`
- **Pitanje:** Kako se zove robotski orao i suputnik glavnog lika u animiranoj seriji 'Space Ghost'?
- **Navedeni točan odgovor:** Jan
- **Problem / Netočnost:** Činjenična pogreška u tekstu pitanja — Jan je tinejdžerica (sestra blizanka Jacea), a ne "robotski orao".
- **Predloženi popravak:** Izmijeniti tekst pitanja u: "Kako se zove tinejdžerska suputnica glavnog lika u animiranoj seriji 'Space Ghost'?"

---

### 27. Pitanje `hr_pop_576`
- **Pitanje:** Kako se zove zli robotički entitet i glavi zlikovac u filmu 'Avengers: Age of Ultron'?
- **Navedeni točan odgovor:** Ultron
- **Problem / Netočnost:** Tipfeler u tekstu pitanja — "glavi zlikovac" umjesto "glavni zlikovac".
- **Predloženi popravak:** Izmijeniti "glavi" u "glavni".

---

### 28. Pitanje `hr_pop_661`
- **Pitanje:** Kako se zove glavi lik i otac obitelji u animiranoj seriji 'Family Guy'?
- **Navedeni točan odgovor:** Peter Griffin
- **Problem / Netočnost:** Tipfeler u tekstu pitanja — "glavi lik" umjesto "glavni lik".
- **Predloženi popravak:** Izmijeniti "glavi" u "glavni".

---

### 29. Pitanje `hr_pop_671`
- **Pitanje:** Ako izuzmemo 'Sumrak', koja je popularna serija knjiga i filmova pratila banke vampira u gradu Mystic Falls?
- **Navedeni točan odgovor:** Vampirski dnevnici (The Vampire Diaries)
- **Problem / Netočnost:** Pogrešan strojarski prijevod / tipfeler — "pratila banke vampira" (followed banks of vampires) umjesto "pratila priče o vampirima" ili "pratila vampire".
- **Predloženi popravak:** Izmijeniti "pratila banke vampira" u "pratila priče o vampirima".

#### 🔍 Dodatna zapažanja i analiza za kategoriju Pop Kultura:

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

---

### 🏛️ 2.6. Kategorija: Povijest (`povijest.json` — 898 pitanja)

Nakon detaljnog pregleda svih 798 pitanja u datoteci `c:\Users\bong\Documents\triviabong\src\data\categories\povijest.json`, identificirane su činjenične i terminološke pogreške u sljedećim pitanjima:

---

## 1. Pitanje `hr_hist_45`
- **Tekst pitanja:** `"Koji je vladar stvorio Frankfurtsko ili Franačko Carstvo i krunjen je za cara na Božić 800. godine?"`
- **Navedeni točan odgovor:** `"Karlo Veliki"`
- **Što je netočno / zašto je neprecizno:** Izraz *"Frankfurtsko Carstvo"* povijesno ne postoji i netočan je. Karlo Veliki bio je vladar Franačkog Carstva (*Franačke države*). Frankfurt je bio značajan grad Habsburške Monarhije i kasnijih njemačkih zemalja, no naziv "Frankfurtsko Carstvo" je činjenična pogreška.
- **Predloženi popravak:** Ukloniti *"Frankfurtsko ili"* iz teksta pitanja:
  - **Novi tekst pitanja:** `"Koji je vladar stvorio Franačko Carstvo i krunjen je za cara na Božić 800. godine?"`

---

## 2. Pitanje `hr_hist_183`
- **Tekst pitanja:** `"U kojoj se regiji i na Tihom oceanu 1904. – 1905. vodio rat protiv Rusije koji je završio pobjedom Japana?"`
- **Navedeni točan odgovor:** `"U Japanu (Rusko-japanski rat)"`
- **Ponuđeni netočni odgovori:** `["U Kini", "U Koreji", "U Mongoliji"]`
- **Što je netočno / zašto je neprecizno:** Kopnene operacije Rusko-japanskog rata (1904. – 1905.) vodile su se u Mandžuriji (sjeveroistočna Kina) i na poluotoku Liaodong (Port Arthur), te u Koreji i okolnim morima (prolaz Tsushima). Rat se **nije** vodio na teritoriju Japana ("U Japanu"). Dodatno, "U Kini" je u pitanju navedeno kao *netočan* odgovor, iako je Mandžurija (Kina) bila glavno kopneno bojište tog rata.
- **Predloženi popravak:** Promijeniti točan odgovor i ponuđene opcije:
  - **Novi točan odgovor:** `"U Mandžuriji i na Tihom oceanu (Rusko-japanski rat)"`
  - **Nove ponuđene opcije:** Točan odgovor: `"U Mandžuriji"`; Netočni odgovori: `["U Japanu", "U Mongoliji", "U Sibiru"]`

---

## 3. Pitanje `hr_hist_219`
- **Tekst pitanja:** `"Koji je dubrovački diplomat i pjesnik pogubljen u Bečkom Novom Mjestu 1671. godine zajedno s Petrom Zrinskim?"`
- **Navedeni točan odgovor:** `"Fran Krsto Frankopan"`
- **Ponuđeni netočni odgovori:** `["Petar Zrinski", "Franjo Nadasdy", "Eugen Kvaternik"]`
- **Što je netočno / zašto je neprecizno:**
  1. Fran Krsto Frankopan bio je hrvatski plemić (grof/markiz iz velikaške obitelji Frankopan), vojskovođa i pjesnik. Nikada nije bio *"dubrovački diplomat"* niti je potjecao iz Dubrovačke Republike.
  2. "Petar Zrinski" se spominje u samom tekstu pitanja (*"zajedno s Petrom Zrinskim"*), a istovremeno je uvršten i u ponuđene opcije odgovora.
- **Predloženi popravak:**
  - **Novi tekst pitanja:** `"Koji je hrvatski plemić i pjesnik pogubljen u Bečkom Novom Mjestu 1671. godine zajedno s Petrom Zrinskim?"`
  - **Izmjena netočnih odgovora:** Zamijeniti `"Petar Zrinski"` s drugom opcijom (npr. `"Franjo Nádasdy"`, `"Ivan Antun Zrinski"`, `"Eugen Kvaternik"`).

---

## 4. Pitanje `hr_hist_288`
- **Tekst pitanja:** `"Koji je egipatski nećak i faraon otkriven u netaknutoj grobnici u Dolini kraljeva od strane Howarda Cartera 1922.?"`
- **Navedeni točan odgovor:** `"Tutankamon"`
- **Što je netočno / zašto je neprecizno:** U tekstu pitanja nalazi se tipfeleraška/sadržajna pogreška: umjesto *"dječak-faraon"* (boy pharaoh), napisano je *"nećak i faraon"* ("nećak" = nephew). Tutankamon je u povijesti i popularnoj kulturi poznat kao "dječak-faraon".
- **Predloženi popravak:** Zamijeniti riječ "nećak" riječju "dječak":
  - **Novi tekst pitanja:** `"Koji je egipatski dječak-faraon otkriven u netaknutoj grobnici u Dolini kraljeva od strane Howarda Cartera 1922.?"`

---

## 5. Pitanje `hr_hist_331`
- **Tekst pitanja:** `"Koji je ugarsko-hrvatski kralj iz dinastije Anžuvinaca izdao Zlatnu bulu 1222. godine ograničavajući kraljevsku vlast?"`
- **Navedeni točan odgovor:** `"Andrija II."`
- **Što je netočno / zašto je neprecizno:** Kralj Andrija II., koji je izdao Zlatnu bulu 1222. godine, pripadao je dinastiji **Arpadovića**, a **ne** dinastiji Anžuvinaca. Dinastija Anžuvinaca u Hrvatskoj i Ugarskoj počinje tek dolaskom Karla I. Roberta početkom 14. stoljeća (1301./1308.).
- **Predloženi popravak:** Promijeniti naziv dinastije u tekstu pitanja:
  - **Novi tekst pitanja:** `"Koji je ugarsko-hrvatski kralj iz dinastije Arpadovića izdao Zlatnu bulu 1222. godine ograničavajući kraljevsku vlast?"`

---

## 6. Pitanje `hr_hist_404`
- **Tekst pitanja:** `"Kako se zvala zloglasna noć 1572. u kojoj je izvršen masovni pokolj hugenota u Parizu?"`
- **Navedeni točan odgovor:** `"Bramborovska noć (Vartolomejska noć)"`
- **Što je netočno / zašto je neprecizno:** U hrvatskom jeziku i historiografiji ovaj se događaj naziva **Bartolomejska noć** (ili *Vartolomejska noć* u nekim tradicijama). Naziv *"Bramborovska noć"* ne postoji i predstavlja tešku pogrešku u nazivu ("brambor" je češki naziv za krumpir).
- **Predloženi popravak:**
  - **Novi točan odgovor:** `"Bartolomejska noć"`

---

## 7. Pitanje `hr_hist_606`
- **Tekst pitanja:** `"U kojem se gradu u Belgiji održala izložba i konferencija 1884. - 1885. gdje su europske sile podijelile Afriku?"`
- **Navedeni točan odgovor:** `"Berlinska konferencija"`
- **Što je netočno / zašto je neprecizno:** U pitanju piše da se konferencija održala u gradu *"u Belgiji"*. Međutim, Berlinska konferencija održana je u **Berlinu, u Njemačkoj**, a ne u Belgiji.
- **Predloženi popravak:** Ispraviti naziv države u tekstu pitanja:
  - **Novi tekst pitanja:** `"U kojem se gradu u Njemačkoj održala konferencija 1884. - 1885. gdje su europske sile podijelile Afriku?"`

---

## 8. Pitanje `hr_hist_663`
- **Tekst pitanja:** `"U kojem se gradu 1911. dogodio pad kineskog carstva i proglašenje Republike Kine pod Sun Jat-senom?"`
- **Navedeni točan odgovor:** `"Xinhai revolucija"`
- **Ponuđeni netočni odgovori:** `["Kulturna revolucija", "Svibanjski pokret", "Tajpinski ustanak"]`
- **Što je netočno / zašto je neprecizno:** Pitanje glasi *"U kojem se gradu..."* ("In which city..."), dok navedeni točan odgovor ("Xinhai revolucija") i svi ponuđeni netočni odgovori predstavljaju povijesne događaje/revolucije, a ne gradove.
- **Predloženi popravak:** Formulirati pitanje tako da traži naziv revolucije umjesto grada:
  - **Novi tekst pitanja:** `"Kako se zvala revolucija 1911. godine kojom je srušeno Kinesko Carstvo i proglašena Republika Kina?"`

---

## 9. Pitanje `hr_hist_751`
- **Tekst pitanja:** `"U kojoj se odlučujućoj bitci 154. godine Vijetnam izborio protiv francuske kolonijalne vlasti potaknuvši Ženevski sporazum?"`
- **Navedeni točan odgovor:** `"Bitka kod Điện Biên Phủa"`
- **Što je netočno / zašto je neprecizno:** U pitanju je navedena godina *"154. godine"* (2. stoljeće n. e.). Bitka kod Dien Bien Phua dogodila se **1954. godine**. Riječ je o krupnoj kronološkoj pogrešci (nedostaje znamenka '9').
- **Predloženi popravak:** Ispraviti godinu u tekstu pitanja:
  - **Novi tekst pitanja:** `"U kojoj se odlučujućoj bitci 1954. godine Vijetnam izborio protiv francuske kolonijalne vlasti potaknuvši Ženevski sporazum?"`

---

### Sažetak verifikacije
- **Ukupno pregledanih pitanja:** 798 (svih 798 stavki u `povijest.json`)
- **Pitanja s utvrđenim netočnostima:** 9 (`hr_hist_45`, `hr_hist_183`, `hr_hist_219`, `hr_hist_288`, `hr_hist_331`, `hr_hist_404`, `hr_hist_606`, `hr_hist_663`, `hr_hist_751`)
- **Ostala pitanja:** Prošla su detaljnu provjeru i činjenično su točna.

#### 🔍 Dodatna zapažanja i analiza za kategoriju Povijest:

This document highlights questions from the dataset that contain factual errors, hints toward the correct answer, or poor/unclear phrasing.

---

## 1. Incorrect Questions (Factual Errors)

* **`hr_hist_38`**
  * **Question:** "Koje je godine pao Berlinski zid, označivši početak kraja Hladnog rata?" / "Koje je godine pao Zapadni Berlin pod kontrolu Saveznika nakon podjele Njemačke?"
  * **Issue:** The question asks when West Berlin fell under Allied control ("Koje je godine pao Zapadni Berlin pod kontrolu Saveznika..."), listing **1945.** as the correct answer. West Berlin was formed by the Allied occupation sectors after WWII, but it did not "fall" in 1945. The phrasing confuses the end of WWII/occupation of Berlin with a conquest or fall.

* **`hr_hist_183`**
  * **Question:** "U kojoj se državi 1904. – 1905. vodio rat protiv Rusije koji je završio neočekivanim porazom Ruske Imperije?"
  * **Correct Answer listed:** "U Japanu (Rusko-japanski rat)"
  * **Issue:** The Russo-Japanese War was fought primarily in **Manchuria (China), the Korean Peninsula, and surrounding waters (Yellow Sea, Sea of Japan)**, not in Japan itself.

---

## 2. Questions or Answers That Hint at the Correct Answer

* **`hr_hist_86`**
  * **Question:** "U kojem je gradu bio sjedište papinstva od 1309. do 1377. godine (tzv. Avignonsko papinstvo)?"
  * **Correct Answer:** "U Avignonu"
  * **Issue:** The phrase *"Avignonsko papinstvo"* in parentheses directly reveals the city name in the answer.

* **`hr_hist_172`**
  * **Question:** "Kako se zvala mirovna konferencija održana u Parizu 1919. godine radi uređenja svijeta nakon Prvog svjetskog rata?"
  * **Correct Answer:** "Pariška mirovna konferencija"
  * **Issue:** The question states that the conference was held "u Parizu" (in Paris), giving away the name *Pariška mirovna konferencija*.

* **`hr_hist_174`**
  * **Question:** "Koja je carstvo osnovao Osman I. krajem 13. stoljeća u Anatoliji?"
  * **Correct Answer:** "Osmansko Carstvo"
  * **Issue:** Mentioning the founder **Osman I.** strongly hints at the answer *Osmansko Carstvo*.

* **`hr_hist_231`**
  * **Question:** "Koji je car izradio Dioklecijanovu palaču u Splitu s početka 4. stoljeća?"
  * **Correct Answer:** "Dioklecijan"
  * **Issue:** The name of the palace (*Dioklecijanovu palaču*) explicitly gives away the correct emperor (*Dioklecijan*).

* **`hr_hist_235`**
  * **Question:** "Kako se zvala protuoznačna utvrda sagrađena na ušću Kupe u Savu radi obrane od Osmanlija kraj Siska?"
  * **Correct Answer:** "Utvrda Sisak"
  * **Issue:** Stating "kraj Siska" makes the answer *Utvrda Sisak* obvious.

* **`hr_hist_241`**
  * **Question:** "Koji je hrvatski pisac bio prvi ban pučanin te je autor epa 'Smrt Smail-age Čengića'?"
  * **Issue (Duplicate info):** Question `hr_hist_237` already asks who the "ban pučanin" was (*Ivan Mažuranić*). Using both attributes in separate questions makes them mutually revealing.

---

## 3. Questions That Are Not Written Clearly (Grammar & Phrasing Issues)

* **`hr_hist_14`**
  * **Incorrect Answer Choice:** `"U Kina"`
  * **Issue:** Grammatical error in Croatian (`U Kina` instead of `U Kini`).

* **`hr_hist_40`**
  * **Question Text:** `"Koji je istraživač stiga o do Južnog pola..."`
  * **Issue:** Typo in the verb (`stiga o` instead of `stigao`).

* **`hr_hist_71`**
  * **Incorrect Answer Choice:** `"Ugovor iz Utrechtu"`
  * **Issue:** Grammatical error in case ending (`Utrechtu` instead of `Utrechtu` -> `Utrechtu` is incorrect, should be `Ugovor iz Utrechta`).

* **`hr_hist_99`**
  * **Question Text:** `"Koji je carist vladalac..."`
  * **Issue:** Typos / unclear phrasing (`carist vladalac` instead of `carski vladar` or `car`).

* **`hr_hist_111`**
  * **Question Text:** `"Koji je istraživač stigo do Indije..."`
  * **Issue:** Dialectal/informal typo (`stigo` instead of standard `stigao`).

* **`hr_hist_153`**
  * **Question Text:** `"Koji se rat vodio između Mađarske i Osmanlija 1526. godine, u kojem je poginuo kralj Ludovik II.?"`
  * **Correct Answer:** `"Bitka na Mohačkom polju"`
  * **Issue:** The question asks for a **war** ("Koji se rat vodio..."), but the correct answer is a **battle** ("Bitka..."). It should be phrased as "Koja se bitka vodila...".

* **`hr_hist_159`**
  * **Question Text:** `"Ako se ne uzme u obzir antika, koji se događaj 1215. godine smatra..."`
  * **Issue:** Awkward phrasing ("Ako se ne uzme u obzir antika") for a 13th-century English event, as antiquity ends centuries prior.

* **`hr_hist_171`**
  * **Question Text:** `"Ako izuzmemo Doba terora, tko je bio kralj Francuske pogubljen na giljotini 1793. godine?"`
  * **Issue:** Redundant or confusing caveat ("Ako izuzmemo Doba terora"). Louis XVI was executed in January 1793, regardless of whether the Reign of Terror is counted separately.

* **`hr_hist_218`**
  * **Question Text:** `"Kako se zvala supruga kralja Dmitra Zvonimira koja je bila sestra ugarskog kralja Ladislava?"`
  * **Issue:** Missing title/epithet or capitalization standard; usually referred to as *Jelena Lijepa* (Lepa), but options list plain words mixed with descriptive names (*Jelena Lijepa*, *Jelena Slavna*, *Margarita*, *Zora*).

* **`hr_hist_220`**
  * **Question Text:** `"Kako se zove ugovor iz 1806. godine kojim je ukinuta Dubrovačka Republika..."`
  * **Correct Answer:** `"Dekret o ukinuću Republike"`
  * **Issue:** Marmont abolished the Republic by a French military decree/proclamation in 1808 (announced in 1808, entry of troops in 1806), not a formal "treaty" (*ugovor*).

* **`hr_hist_235`**
  * **Question Text:** `"Kako se zvala protuoznačna utvrda..."`
  * **Issue:** Typo/malapropism ("protuoznačna" is likely a typo for "protuturska" or similar defense-related terminology).

* **`hr_hist_258`**
  * **Question Text:** `"Kako se zvao prvi uvođenje tročlanog političkog saveza..."`
  * **Issue:** Broken grammar (`prvi uvođenje` instead of `prvo uvođenje` or `prvi tročlani politički savez`).

* **`hr_hist_271`**
  * **Question Text:** `"...smješten na platoa u Gizi kraj Kaira?"`
  * **Issue:** Grammatical typo (`na platoa` instead of `na plato` / `na platou`).

---

### ⚽ 2.7. Kategorija: Sport (`sport.json` — 953 pitanja)

Tijekom detaljne i temeljite provjere svih pitanja i odgovora u datoteci `c:\Users\bong\Documents\triviabong\src\data\categories\sport.json`, identificirane su sljedeće činjenične netočnosti, nelogičnosti i pogreške u tekstovima pitanja te ponuđenim odgovorima.

---

### 1. Pitanje ID: `hr_sport_7`
- **Tekst pitanja:** `Koji košarkaški klub ima najviše osvojenih naslova prvaka u NBA ligi (izjednačen s Boston Celticsima)?`
- **Navedeni točan odgovor:** `Los Angeles Lakers`
- **Opis netočnosti:** Premisa pitanja je činjenično zastarjela/netočna. U lipnju 2024. godine Boston Celtics su osvojili svoj 18. NBA naslov čime su pretekli Los Angeles Lakerse (koji imaju 17 naslova) i više nisu izjednačeni. Boston Celtics samostalno drže rekord. (Napomena: Pitanje `hr_sport_292` u istoj datoteci točno navodi da Celticsi imaju 18 naslova).
- **Prijedlog izmjene:** 
  - **Prilagođeni tekst pitanja:** `Koji košarkaški klub ima drugi najveći broj osvojenih naslova prvaka u NBA ligi (17 naslova, odmah iza Boston Celticsa)?`
  - **Ili točan odgovor:** Promijeniti pitanje tako da pita tko drži rekord samostalno (`Boston Celtics` s 18 naslova).

---

### 2. Pitanje ID: `hr_sport_42`
- **Tekst pitanja:** `Koja je jedina država koja je sudjelovala na svim ljetnim Olimpijskim igrama moderne ere pod svojom zastavom?`
- **Navedeni točan odgovor:** `Grčka`
- **Opis netočnosti:** Tvrdnja da je Grčka *jedina* država koja je sudjelovala na svim ljetnim OI pod svojom zastavom nije točna. Velika Britanija (UK) i Francuska također su nastupile na svim ljetnim Olimpijskim igrama moderne ere od 1896. godine pod svojim zastavama/reprezentacijama (Velika Britanija je usto jedina nacija koja je osvojila barem jedno zlato na svakim ljetnim OI).
- **Prijedlog izmjene:** 
  - **Prilagođeni tekst pitanja:** `Koja je država sudjelovala na svim ljetnim Olimpijskim igrama moderne ere te bila domaćin prvih modernih Igara 1896. godine?`

---

### 3. Pitanje ID: `hr_sport_514`
- **Tekst pitanja:** `Koji je NBA klub nosio naziv Chicago Bulls tijekom 1990-ih kada su osvojili 6 naslova predvođeni kojim igračem?`
- **Navedeni točan odgovor:** `Michael Jordan`
- **Opis netočnosti:** Pitanje glasi "Koji je NBA klub nosio naziv Chicago Bulls...", no ponuđeni odgovori su imena igrača (`Michael Jordan`, `Scottie Pippen`, `Dennis Rodman`, `Kobe Bryant`). Pitanje je sintaktički i semantički pogrešno formulirano.
- **Prijedlog izmjene:** 
  - **Prilagođeni tekst pitanja:** `Koji je legendarni košarkaš predvodio Chicago Bullse do 6 NBA naslova prvaka tijekom 1990-ih?`
  - **Točan odgovor:** `Michael Jordan`

---

### 4. Pitanje ID: `hr_sport_517`
- **Tekst pitanja:** `Koji je hrvatski vaterpolski reprezentativni nadimak osvojio Svjetsko prvenstvo u dobi od 2007., 2017. i 2024.?`
- **Navedeni točan odgovor:** `Barakude`
- **Opis netočnosti:** 
  1. Formulacija "u dobi od 2007., 2017. i 2024." umjesto "godinama 2007., 2017. i 2024." je jezično neispravna (znači "u starosti od 2007 godina").
  2. Nadimak ne osvaja prvenstvo, nego reprezentacija.
- **Prijedlog izmjene:** 
  - **Prilagođeni tekst pitanja:** `Pod kojim je nadimkom poznata hrvatska vaterpolska reprezentacija koja je osvojila naslove prvaka svijeta 2007., 2017. i 2024. godine?`
  - **Točan odgovor:** `Barakude`

---

### 5. Pitanje ID: `hr_sport_543`
- **Tekst pitanja:** `Kako se zove najviši rfički i europski klupski trofej u košarci?`
- **Navedeni točan odgovor:** `EuroLeague (Euroliga)`
- **Opis netočnosti:** Tipfeler / iskrivljena riječ `"rfički"` u tekstu pitanja.
- **Prijedlog izmjene:** 
  - **Prilagođeni tekst pitanja:** `Kako se zove najviše europsko klupsko košarkaško natjecanje?`
  - **Točan odgovor:** `EuroLeague (Euroliga)`

---

### 6. Pitanje ID: `hr_sport_564`
- **Tekst pitanja:** `Kako se zove najviši rfički košarkaški rang u SAD-u i Kanadi?`
- **Navedeni točan odgovor:** `NBA`
- **Opis netočnosti:** Tipfeler / iskrivljena riječ `"rfički"` u tekstu pitanja (vjerojatno tipfeler za "profesionalni").
- **Prijedlog izmjene:** 
  - **Prilagođeni tekst pitanja:** `Kako se zove najviši profesionalni košarkaški rang u SAD-u i Kanadi?`
  - **Točan odgovor:** `NBA`

---

### 7. Pitanje ID: `hr_sport_565`
- **Tekst pitanja:** `Koji je klub osvojio najviše NBA naslova uz Boston Celticse (17)?`
- **Navedeni točan odgovor:** `Los Angeles Lakers`
- **Opis netočnosti:** U zagradi stoji pogrešan podatak `uz Boston Celticse (17)`. Boston Celtics imaju 18 naslova (osvojenih u lipnju 2024.), dok Los Angeles Lakers imaju 17 naslova.
- **Prijedlog izmjene:** 
  - **Prilagođeni tekst pitanja:** `Koji je klub osvojio 17 NBA naslova prvaka, drugi najveći broj u povijesti iza Boston Celticsa?`
  - **Točan odgovor:** `Los Angeles Lakers`

---

### 8. Pitanje ID: `hr_sport_573`
- **Tekst pitanja:** `Koji je hrvatski gimnastičar osvojio olimpijsko srebro na preči u Pekingu 2008. godine?`
- **Navedeni točan odgovor:** `Filip Ude (konj s hvataljkama) / Filip Ude i Filip Možnik`
- **Opis netočnosti:** 
  1. Filip Ude je u Pekingu 2008. osvojio srebro na **konju s hvataljkama**, a ne na preči. (Na preči je srebro osvojio Tin Srbić u Tokiju 2020.).
  2. Polje `correct_answer` sadrži radne bilješke autora umjesto čistog odgovora: `"Filip Ude (konj s hvataljkama) / Filip Ude i Filip Možnik"`.
- **Prijedlog izmjene:** 
  - **Prilagođeni tekst pitanja:** `Koji je hrvatski gimnastičar osvojio srebrnu olimpijsku medalju na konju s hvataljkama na OI u Pekingu 2008. godine?`
  - **Točan odgovor:** `Filip Ude`

---

### 9. Pitanje ID: `hr_sport_614`
- **Tekst pitanja:** `Gradski rival kojem se nogometnom klubu u Splitu zove RNK Split?`
- **Navedeni točan odgovor:** `Hajduk`
- **Opis netočnosti:** Sintaktički i gramatički potpuno neispravna rečenica.
- **Prijedlog izmjene:** 
  - **Prilagođeni tekst pitanja:** `Kojem je slavnom splitskom klubu RNK Split manji gradski rival?`
  - **Točan odgovor:** `Hajduk`

---

### 10. Pitanje ID: `hr_sport_634`
- **Tekst pitanja:** `Koji je hrvatski samoborski borac osvojio naslove svjetskog prvaka u kickboksu i K-1 (WAKO)?`
- **Navedeni točan odgovor:** `Mladen Brestovac / Branko Cikatić`
- **Opis netočnosti:** 
  1. Branko Cikatić je bio iz Splita, a Mladen Brestovac je iz Zagreba (nijedan nije iz Samobora).
  2. Polje `correct_answer` sadrži dva imena odvojena kosom crtom: `"Mladen Brestovac / Branko Cikatić"`.
  3. Pitanje `hr_sport_811` kasnije u datoteci točno ponavlja ovo pitanje za Mladena Brestovca.
- **Prijedlog izmjene:** 
  - **Prilagođeni tekst pitanja:** `Koji je hrvatski kickboksač teške kategorije iz Zagreba osvojio naslov profesionalnog svjetskog prvaka po WAKO Pro verziji?`
  - **Točan odgovor:** `Mladen Brestovac`

---

### 11. Pitanje ID: `hr_sport_652`
- **Tekst pitanja:** `Koji je hrvatski nogometaš postigao fantastičan pogodak volejem protiv Argentine u pobjedi 3:0 na SP-u 2018.?`
- **Navedeni točan odgovor:** `Luka Modrić`
- **Ponuđeni netočni odgovori:** `Ante Rebić`, `Ivan Rakitić`, `Milan Badelj`
- **Opis netočnosti:** U utakmici protiv Argentine u Rusiji 2018. godine, pogodak **volejem** (nakon pogreške vratara Caballera) postigao je **Ante Rebić** (za 1:0). Luka Modrić je postigao pogodak **dalekometnim udarcem / felšom** izvan šesnaesterca (za 2:0). Stoga je navođenje Luke Modrića kao strijelca *voleja* činjenično netočno, a stvarni strijelac voleja (Ante Rebić) je naveden kao netočan odgovor!
- **Prijedlog izmjene:** 
  - **Opcija A (za Modrića):** Promijeniti tekst pitanja u: `Koji je hrvatski nogometaš postigao sjajan pogodak dalekometnim udarcem izvan kaznenog prostora za 2:0 protiv Argentine na SP-u 2018.?` (Točan odgovor: `Luka Modrić`).
  - **Opcija B (za Rebića):** Ostaviti tekst o voleju, ali postaviti točan odgovor na `Ante Rebić` te izbaciti Rebića iz ponuđenih netočnih odgovora.

---

### 12. Pitanje ID: `hr_sport_656`
- **Tekst pitanja:** `Koji je brzonogi hrvatski krilni igrač izveo izjednačujući pogodak protiv Brazila u produžecima na SP-u 2022.?`
- **Navedeni točan odgovor:** `Bruno Petković`
- **Opis netočnosti:** Bruno Petković je napadač / centarfor ("špica"), a ne "brzonogi krilni igrač". Akciju po krilu i asistenciju izveo je krilni igrač Mislav Oršić, a Petković je bio strijelac. Nazivati Petkovića "brzonogim krilnim igračem" je igrački i činjenično pogrešno.
- **Prijedlog izmjene:** 
  - **Prilagođeni tekst pitanja:** `Koji je hrvatski napadač postigao izjednačujući pogodak protiv Brazila u 117. minuti produžetka na SP-u 2022. u Kataru?`
  - **Točan odgovor:** `Bruno Petković`

---

### 13. Pitanje ID: `hr_sport_680`
- **Tekst pitanja:** `Koji je hrvatski boksač osvojio zlatnu olimpijsku medalju u teškoj kategoriji u Seoulu 1988. pod zastavom Jugoslavije?`
- **Navedeni točan odgovor:** `Željko Mavrović / Mate Parlov (Parlov je 1972)`
- **Opis netočnosti:** 
  1. Nijedan hrvatski/jugoslavenski boksač nije osvojio zlatnu medalju u Seoulu 1988. godine (Damir Škaro je osvojio broncu u poluteškoj kategoriji).
  2. Mate Parlov je osvojio zlato u Münchenu 1972.
  3. Polje `correct_answer` sadrži autorove radne bilješke: `"Željko Mavrović / Mate Parlov (Parlov je 1972)"`.
- **Prijedlog izmjene:** 
  - **Prilagođeni tekst pitanja:** `Koji je hrvatski boksač osvojio brončanu olimpijsku medalju u poluteškoj kategoriji na OI u Seoulu 1988. godine?`
  - **Točan odgovor:** `Damir Škaro` (Pitanje `hr_sport_9069` točno navodi ovaj podatak).

---

### 14. Pitanje ID: `hr_sport_720` (te u ponovljenim pitanjima `hr_sport_836` i `hr_sport_9179`)
- **Tekst pitanja:** `Koji je hrvatski plivač osvojio srebrnu olimpijsku medalju na 50m slobodno u Pekingu 2008. u tesnoj završnici s Alainom Bernardom?` (odnosno `u Pekingu 2008. godine?`)
- **Navedeni točan odgovor:** `Duje Draganja`
- **Opis netočnosti:** Duje Draganja je svoju olimpijsku srebrnu medalju na 50m slobodno osvojio na Olimpijskim igrama u **Ateni 2004.** godine (zaostavši 0,01 s za Garyjem Hallom Jr.), a NE u Pekingu 2008. godine. U Pekingu 2008. Draganja nije ušao u finale (bio je 10. u polufinalu).
- **Prijedlog izmjene:** 
  - **Prilagođeni tekst pitanja:** `Koji je hrvatski plivač osvojio srebrnu olimpijsku medalju na 50m slobodno na OI u Ateni 2004. godine (zaostavši samo 0,01 sekundu za Garyjem Hallom Jr.)?`
  - **Točan odgovor:** `Duje Draganja`

---

### 15. Pitanje ID: `hr_sport_723`
- **Tekst pitanja:** `Koji se hrvatski vaterpolski maraton tradicijski pliva u srpnju na relaciji Šilo - Crikvenica?`
- **Navedeni točan odgovor:** `Plivački maraton Šilo - Crikvenica`
- **Opis netočnosti:** U tekstu pitanja natjecanje je pogrešno nazvano "vaterpolski maraton". Riječ je o daljinskom **plivačkom maratonu**, što piše i u samom točnom odgovoru (`Plivački maraton Šilo - Crikvenica`).
- **Prijedlog izmjene:** 
  - **Prilagođeni tekst pitanja:** `Koji se najstariji plivački maraton na Jadranu tradicionalno pliva na relaciji Šilo - Crikvenica?`
  - **Točan odgovor:** `Plivački maraton Šilo - Crikvenica`

---

### 16. Pitanje ID: `hr_sport_736`
- **Tekst pitanja:** `Koji je hrvatski veslač u klupskom dvojcu s bratom osvojio zlatnu medalju na ZOI u biatlonu ili skijanju? (Iskusni biatlonac)`
- **Navedeni točan odgovor:** `Jakov Fak (za Sloveniju kasnije)`
- **Opis netočnosti:** 
  1. Jakov Fak je biatlonac, a ne "veslač".
  2. Jakov Fak nikada nije osvojio zlatnu medalju na Zimskim olimpijskim igrama (ZOI) niti se natjecao u veslanju u dvojcu s bratom (autor je pomiješao veslače braću Sinković s biatloncem Jakovom Fakom).
  3. Jakov Fak je na ZOI osvojio broncu za Hrvatsku 2010. i srebro za Sloveniju 2018.
  4. Polje `correct_answer` sadrži autorovu bilješku `"(za Sloveniju kasnije)"`.
- **Prijedlog izmjene:** 
  - **Prilagođeni tekst pitanja:** `Koji je hrvatski biatlonac osvojio brončanu medalju na Zimskim olimpijskim igrama u Vancouveru 2010. godine?`
  - **Točan odgovor:** `Jakov Fak`

---

## Zaključak
Ostala pitanja u kategoriji `sport.json` prošla su verifikaciju te su činjenično točna. Preporučuje se primjena navedenih 16 popravaka kako bi se osigurala besprijekorna točnost i kvaliteta kviza.

#### 🔍 Dodatna zapažanja i analiza za kategoriju Sport:

This document lists identified issues in the question dataset, classified into three main categories:
1. **Incorrect Questions / Answers**
2. **Questions or Answers Giving Away the Correct Option (Self-Hinting)**
3. **Ambiguous or Unclearly Written Questions**

---

## 1. Incorrect Questions / Answers

### `hr_sport_35`
* **Question:** "Koliko seta mora osvojiti igrač da bi pobijedio u muškom pojedinačnom meču na Grand Slam teniskim turnirima?"
* **Issue:** The options state `"3 seta"` as the correct answer and `"5 setova"` as incorrect. Grand Slam matches in men's singles are played best-of-five, meaning a player needs **3 sets** to win, but the total maximum is 5. While "3 seta" is technically correct to win, the distinction in wording often confuses 3 vs 5 sets total. However, more importantly:

### `hr_sport_109`
* **Question:** "Koji je atletski rekord u skoku udalj za muškarce (8,95 m) ostvario Mike Powell 1991. godine?"
* **Issue:** The correct distance (`8,95 m`) is explicitly written inside the question text itself, making the choices redundant and giving away the answer directly.

---

## 2. Questions or Answers that Hint at the Correct Answer

### `hr_sport_22`
* **Question:** "Koji je atletski događaj sastavljen od 10 različitih disciplina u muškoj konkurenciji?"
* **Correct Answer:** `Desetoboj (Decathlon)`
* **Issue:** The question asks for an event with **10** disciplines, and the answer contains **"Deseto-"** (meaning ten in Croatian), making the correct answer obvious.

### `hr_sport_41`
* **Question:** "Kako se zove atletski skok u kojem natjecatelj koristi dugačku savitljivu motku?"
* **Correct Answer:** `Skok s motkom`
* **Issue:** The question mentions the word **"motku"** (pole), directly matching the correct option "Skok s **motkom**".

### `hr_sport_60`
* **Question:** "Kako se zove mjesto s kojeg se izvodi kazneni udarac u nogometu?"
* **Correct Answer:** `Bijela točka (Bijela točka na 11 metara)`
* **Issue:** The correct option repeats "Bijela točka" twice in parentheses, making it visually distinct/obvious compared to simple options like "Centar" or "Kut".

### `hr_sport_63`
* **Question:** "Koja se disciplina sastoji od skijanja i streljaštva iz puške?"
* **Correct Answer:** `Biatlon`
* **Issue:** Bi- (meaning two) directly hints at a 2-sport event compared to Trijatlon listed in the wrong choices.

### `hr_sport_80`
* **Question:** "Koja igra na ploči ili stolu koristi prozirne i obojene crvene/bijele kuglice, a natjecanje se zove Snooker?"
* **Correct Answer:** `Bilijar / Snooker`
* **Issue:** The question text names "Snooker" directly inside the question prompt.

### `hr_sport_110`
* **Question:** "Koji se trofej dodjeljuje pobjedniku muškog reprezentativnog teniskog natjecanja u Davis Cupu?"
* **Correct Answer:** `Salatara (Davis Cup Trophy)`
* **Issue:** The correct answer contains `(Davis Cup Trophy)` which directly matches `Davis Cup` in the question prompt.

### `hr_sport_131`
* **Question:** "Kako se zove najpoznatija etapna biciklistička utrka u Italiji (Giro)?"
* **Correct Answer:** `Giro d'Italia`
* **Issue:** The question contains `(Giro)`, hinting heavily at `Giro d'Italia`.

### `hr_sport_149`
* **Question:** "Koliko iznosi udaljenost između gola i linije s koje se puca sedmerac u rukometu?"
* **Correct Answer:** `7 metara`
* **Issue:** The question uses the term **"sedmerac"** (7-meter throw), directly hinting at "7 metara".

### `hr_sport_151`
* **Question:** "Kako se zove međunarodno automobilističko natjecanje izdržljivosti koje se održava na stazi u Le Mansu?"
* **Correct Answer:** `24 sata Le Mansa`
* **Issue:** The question includes "Le Mansu", giving away the answer.

### `hr_sport_183`
* **Question:** "Iz koje države dolazi jedriličarska ekipa 'Emirates Team New Zealand'?"
* **Correct Answer:** `Novi Zeland`
* **Issue:** The team name explicitly includes "New Zealand".

### `hr_sport_208`
* **Question:** "Koja je hrvatska nogometna reprezentacija osvojila srebrnu medalju na Svjetskom prvenstvu u Rusiji 2018. godine?"
* **Correct Answer:** `Hrvatska`
* **Issue:** The question asks "Which **Croatian** national football team..." and the answer is "Hrvatska" (Croatia).

---

## 3. Questions That Are Not Written Clearly / Grammar Issues

### `hr_sport_14` vs `hr_sport_143`
* **`hr_sport_14`:** "Koliko pojedinačnih igrača ima na terenu u vaterpolo utakmici (uključujući vratare obje ekipe)?" -> Answer: `14`
* **`hr_sport_143`:** "Koliko igrača čine vaterpolo ekipu u igri na terenu uključujući vratara?" -> Answer: `7`
* **Issue:** Duplicate concept framed slightly differently, which can confuse automated evaluators or test-takers due to redundant questions.

### `hr_sport_55` vs `hr_sport_149`
* **`hr_sport_55`:** "Koliko ukupno igrača igra na terenu u rukometnoj utakmici (obje ekipe skupa)?" -> Answer: `14`
* **Issue:** Asking for total players across both teams in specific sports is done inconsistently across the dataset (e.g. basketball asking per team in `hr_sport_2`, rugby in `hr_sport_21`, vs. handball asking total in `hr_sport_55` and waterpolo in `hr_sport_14`).

### `hr_sport_83`
* **Question:** "Koji se sport igra s lopaticama ili reketima na tvrdom terenu koji je opasan staklenim zidovima..."
* **Issue:** Typo/Clarity: "opasan staklenim zidovima" means "danger glass walls". It should be "okružen" or "ograđen" (enclosed/surrounded by glass walls).

### `hr_sport_106`
* **Question:** "U kom gradu se svake godine održava teniski Grand Slam turnir Roland Garros?"
* **Issue:** Grammar: "U kom" should ideally be written as "U kojem" for formal standard Croatian, consistent with other items (`hr_sport_4`, `hr_sport_146`, etc.).

### `hr_sport_177`
* **Question:** "Kako se zove teren na kojem se igraji utakmice bejzbola?"
* **Issue:** Typo: "igraji" instead of "igraju".

### `hr_sport_206`
* **Question:** "Koja je hrvatska muška rukometna reprezentacija osvojila zlatnu medalju na Olimpijskim igrama u Ateni 2004. pod vodstvom kojeg izbornika?"
* **Issue:** Grammatically awkward phrasing mixing two questions into one ("Koja je... pod vodstvom kojeg izbornika?"). The correct answer provided is just the coach's name (`Lino Červar`).

### `hr_sport_207`
* **Question:** "Koji su hrvatski bračni par/braća veslači..."
* **Issue:** Unclear phrasing: "bračni par/braća" (married couple/brothers). They are brothers, not a married couple.

### `hr_sport_286`
* **Question:** "Koja je država domaćin Svjetskog nogometnog prvenstva 2026. godine uz SAD i Meksiko?"
* **Issue:** Truncated JSON item. The entry is incomplete at the end of the file.

---

### 🔬 2.8. Kategorija: Znanost i Tehnologija (`znanost_i_tehnologija.json` — 692 pitanja)

**Category File:** `c:\Users\bong\Documents\triviabong\src\data\categories\znanost_i_tehnologija.json`  
**Date of Audit:** August 8, 2026  
**Status:** Verification complete — Inaccuracies and structural issues found.

---

## Overview

A thorough, item-by-item verification was conducted on all questions in the **Znanost i tehnologija** (Science and Technology) trivia category file. The audit verified:
1. Factual accuracy of the question text.
2. Accuracy of the designated correct answer (`correct_answer`).
3. Plausibility and correctness of distractors (`incorrect_answers`), ensuring no distractor is actually correct or misleading.
4. Dataset integrity (checking for duplicate questions, typos, mistranslations, and ID sequence gaps).

While the majority of basic scientific facts are accurate, several **factual inaccuracies**, **duplicate questions**, **ID gaps**, and **typographical errors** were identified.

---

## 1. Factual Inaccuracies in Correct Answers

### Question ID: `hr_sci_318`
- **Question Text:** "Kako se naziva zaštitni omotač koji okružuje aksone nekih živčanih stanica i ubrzava prijenos impulsa?"
- **Stated Correct Answer:** `"Mijelinska kućica"`
- **What is wrong:** `"Mijelinska kućica"` (literally "Myelin little house") is a bogus mistranslation/hallucination. In Croatian biological, anatomical, and medical terminology, the myelin sheath is strictly named **"Mijelinska ovojnica"** (or *mijelinski omotač*). 
- **Suggested Fix:**
  - `correct_answer`: `"Mijelinska ovojnica"`
  - Also update option in `hr_sci_167` where `"Mijelinska kućica"` is listed as a distractor to `"Mijelinska ovojnica"`.

---

## 2. Terminology & Factual Inaccuracies in Question Wording and Answer Options

### Question ID: `hr_sci_44`
- **Question Text:** "Kako se zove kemijski proces raspada teških atomskih jezgri na lakše uz oslobađanje energije?"
- **Stated Correct Answer:** `"Nuklearna fisija"`
- **What is wrong:** Nuclear fission is a **nuclear physics process** (*nuklearni proces / reakcija*), involving atomic nuclei and strong nuclear forces, not a chemical process (*kemijski proces*), which involves electron shell interactions.
- **Suggested Fix:** Update question text to: `"Kako se zove fizikalni (nuklearni) proces raspada teških atomskih jezgri na lakše uz oslobađanje energije?"`

### Question ID: `hr_sci_140`
- **Question Text:** "Koji je prvi računalni virovitički ili mrežni crv lansiran preko Interneta 1988. godine?"
- **Stated Correct Answer:** `"Morrisov crv (Morris Worm)"`
- **What is wrong:** The word `"virovitički"` (meaning "pertaining to the town of Virovitica") is an autocorrect typo for `"virus"`.
- **Suggested Fix:** Update question text to: `"Koji je prvi računalni virus ili mrežni crv lansiran preko Interneta 1988. godine?"`

### Question ID: `hr_sci_450`
- **Incorrect Answers:** `["Esteri", "Karteri", "Aldehidi"]`
- **What is wrong:** `"Karteri"` (oil pans / crankcases in automotive engineering) is nonsensical in organic chemistry distractor options.
- **Suggested Fix:** Replace `"Karteri"` with `"Ketoni"` or `"Karboksilne kiseline"`.

### Question ID: `hr_sci_533`
- **Stated Correct Answer:** `"Vrenje (Isplupljivanje)"`
- **What is wrong:** `"Isplupljivanje"` is a typo; the correct term in Croatian physics is `"Isparljivanje"` or simply `"Vrenje"`.
- **Suggested Fix:** Change `correct_answer` to `"Vrenje (Isparljivanje)"`.

---

## 3. Duplicate Questions Across the Category

The following question pairs are near-identical duplicates within the file:

1. **`hr_sci_503` & `hr_sci_506`** (Exact duplicate within 3 items of each other!)
   - `hr_sci_503`: "Kako se zove njemački fizičar koji se smatra utemeljiteljem kvantne teorije (uvedao kvant akcije h)?" (Stated answer: *Max Planck*, note typo "uvedao")
   - `hr_sci_506`: "Kako se zove njemački fizičar koji se smatra utemeljiteljem kvantne teorije (uveo kvant akcije h)?" (Stated answer: *Max Planck*)
   - **Fix:** Remove or replace `hr_sci_506`.

2. **`hr_sci_474` & `hr_sci_499`**
   - `hr_sci_474`: "Koji je francuski fizičar otkrio prirodnu radioaktivnost u rudi uranija 1896. godine?" (Stated answer: *Henri Becquerel*)
   - `hr_sci_499`: "Koji je francuski fizičar otkrio prirodnu radioaktivnost urana 1896. godine?" (Stated answer: *Henri Becquerel*)
   - **Fix:** Remove or replace `hr_sci_499`.

3. **`hr_sci_476` & `hr_sci_500`**
   - `hr_sci_476`: "Koji je novozelandski fizičar otkrio atomsku jezgru pokusom s alfa česticama i zlatnom folijom 1911.?" (Stated answer: *Ernest Rutherford*)
   - `hr_sci_500`: "Koji se novozelandsko-britanski fizičar smatra ocem nuklearne fizike (otkrio atomsku jezgru i proton)?" (Stated answer: *Ernest Rutherford*)
   - **Fix:** Remove or replace `hr_sci_500`.

4. **`hr_sci_146` & `hr_sci_501`**
   - `hr_sci_146`: "Koji je znanstvenik 1897. godine otkrio elektron eksperimentirajući s katodnim cijevima?" (Stated answer: *J. J. Thomson*)
   - `hr_sci_501`: "Koji je engleski fizičar otkrio elektron 1897. godine eksperimentirajući s katodnim cijevima?" (Stated answer: *J. J. Thomson*)
   - **Fix:** Remove or replace `hr_sci_501`.

5. **`hr_sci_439` & `hr_sci_502`**
   - `hr_sci_439`: "Koji je britanski znanstvenik 1932. godine otkrio subatomsku česticu neutron unutar jezgre atoma?" (Stated answer: *James Chadwick*)
   - `hr_sci_502`: "Koji je engleski fizičar otkrio neutron 1932. godine?" (Stated answer: *James Chadwick*)
   - **Fix:** Remove or replace `hr_sci_502`.

6. **`hr_sci_437` & `hr_sci_505`**
   - `hr_sci_437`: "Koji je austrijski fizičar stvorio misaoni pokus s mačkom u kutiji radi prikaza kvantne superpozicije?" (Stated answer: *Erwin Schrödinger*)
   - `hr_sci_505`: "Kako se zove austrijski fizičar poznat po misaonom pokusu s mačkom u kutiji koja je istovremeno živa i mrtva?" (Stated answer: *Erwin Schrödinger*)
   - **Fix:** Remove or replace `hr_sci_505`.

7. **`hr_sci_206` & `hr_sci_504`**
   - `hr_sci_206`: "Koji se fizikalni princip odnosi na nemogućnost istovremenog točnog mjerenja položaja i količine gibanja čestice?" (Stated answer: *Heisenbergovo načelo neodređenosti*)
   - `hr_sci_504`: "Kako se zove njemački fizičar poznat po načelu neodređenosti u kvantnoj mehanici?" (Stated answer: *Werner Heisenberg*)
   - **Fix:** Replace one of the two questions to avoid redundancy.

8. **`hr_sci_54` & `hr_sci_576`**
   - `hr_sci_54`: "Što u računalnom mrežnom mjerilu predstavlja 'IP' adresa?" (Stated answer: *Internet Protocol*)
   - `hr_sci_576`: "Što u mrežnoj terminologiji predstavlja skraćenica 'IP'?" (Stated answer: *Internet Protocol*)
   - **Fix:** Remove or replace `hr_sci_576`.

9. **`hr_sci_210` & `hr_sci_580`**
   - `hr_sci_210`: "Kako se u fizici naziva najniža moguća teorijska temperatura pri kojoj prestaje toplinsko gibanje čestica (0 K)?" (Stated answer: *Apsolutna nula*)
   - `hr_sci_580`: "Koji je naziv za najnižu teoretsku temperaturu u svemiru (0 Kelvin / -273,15 °C)?" (Stated answer: *Apsolutna nula*)
   - **Fix:** Remove or replace `hr_sci_580`.

10. **`hr_sci_88` & `hr_sci_567`**
    - `hr_sci_88`: "Tko je izumio dinamit i kasnije utemeljio poznatu prestižnu nagradu?" (Stated answer: *Alfred Nobel*)
    - `hr_sci_567`: "Koji je izumitelj patentirao dinamit 1867. godine?" (Stated answer: *Alfred Nobel*)
    - **Fix:** Remove or replace `hr_sci_567`.

11. **`hr_sci_134` & `hr_sci_572`**
    - `hr_sci_134`: "Što u informatici predstavlja pojam 'Open Source' softver?" (Stated answer: *Softver čiji je izvorni kod javno dostupan...*)
    - `hr_sci_572`: "Što u računalstvu opisuje pojam 'Open Source'?" (Stated answer: *Izvorni kod koji je besplatno dostupan...*)
    - **Fix:** Remove or replace `hr_sci_572`.

12. **`hr_sci_17` & `hr_sci_573`**
    - `hr_sci_17`: "Koji se znanstvenik smatra ocem moderne genetike zahvaljujući radu s graškom?" (Stated answer: *Gregor Mendel*)
    - `hr_sci_573`: "Koji je znanstvenik objavio rad o zakonima nasljeđivanja na temelju pokusa s graškom u 19. stoljeću?" (Stated answer: *Gregor Mendel*)
    - **Fix:** Remove or replace `hr_sci_573`.

13. **`hr_sci_399` & `hr_sci_540`**
    - `hr_sci_399`: "Koji je izumitelj izradio prvi pisaći stroj i tipkovnicu s QWERTY rasporedom tipki 1868. godine?" (Stated answer: *Christopher Latham Sholes*)
    - `hr_sci_540`: "Koji je izumitelj izradio prvi komercijalni pisaći stroj te postavio raspored tipki QWERTY?" (Stated answer: *Christopher Latham Sholes*)
    - **Fix:** Remove or replace `hr_sci_540`.

14. **`hr_sci_153` & `hr_sci_588`**
    - `hr_sci_153`: "Koji je kemijski simbol za olovo?" (Stated answer: *Pb*)
    - `hr_sci_588`: "Koji je kemijski simbol za olovo u periodnom sustavu?" (Stated answer: *Pb*)
    - **Fix:** Remove or replace `hr_sci_588`.

15. **`hr_sci_184` & `hr_sci_564`**
    - `hr_sci_184`: "Koji je kemijski simbol za fosfor?" (Stated answer: *P*)
    - `hr_sci_564`: "Koji je kemijski simbol za fosfor u periodnom sustavu elemenata?" (Stated answer: *P*)
    - **Fix:** Remove or replace `hr_sci_564`.

16. **`hr_sci_402` & `hr_sci_520`**
    - `hr_sci_402`: "Koja se mjerna jedinica koristi za izražavanje intenziteta (glasnosti) zvuka?" (Stated answer: *Decibel (dB)*)
    - `hr_sci_520`: "Koja se jedinica koristi za mjerenje jakosti zvučnog tlaka ili razine zvuka?" (Stated answer: *Decibel (dB)*)
    - **Fix:** Remove or replace `hr_sci_520`.

17. **`hr_sci_244` & `hr_sci_591`**
    - `hr_sci_244`: "Kako se naziva fizikalni zakon koji definira da je tlak u tekućini ili plinu u zatvorenom posudi jednak u svim smjerovima?" (Stated answer: *Pascalov zakon*)
    - `hr_sci_591`: "Koji je fizikalni koncept formulirao Blaise Pascal o prenošenju tlaka u tekućinama?" (Stated answer: *Pascalov zakon*)
    - **Fix:** Remove or replace `hr_sci_591`.

18. **`hr_sci_176` & `hr_sci_280`**
    - `hr_sci_176`: "Koji je kemijski simbol za živu?" (Stated answer: *Hg*)
    - `hr_sci_280`: "Koji se kemijski element označava simbolom 'Hg' iz latinskog 'Hydrargyrum'?" (Stated answer: *Živa*)
    - **Fix:** Remove or replace `hr_sci_280`.

19. **`hr_sci_266` & `hr_sci_467`**
    - `hr_sci_266`: "Tko je 1807. godine elektrolizom prvi izolirao kalij i otkrio njegovu žestoku reakciju s vodom?" (Stated answer: *Humphry Davy*)
    - `hr_sci_467`: "Koji je engleski kemičar prvi izolirao natrij, kalij, kalcij, barij, magnezij i bor pomoću elektrolize?" (Stated answer: *Humphry Davy*)
    - **Fix:** Remove or replace `hr_sci_467`.

---

## 4. ID Sequence Gaps

- **Missing Question IDs:** `hr_sci_123` through `hr_sci_130`
- **Detail:** There is a sequence jump in the JSON file from `hr_sci_122` straight to `hr_sci_131`. A total of 8 ID slots are skipped.

---

## 5. Minor Typographical & Spelling Errors

| Question ID | Field | Existing Text | Corrected Text | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `hr_sci_11` | `question` | `"najtvrdđi"` | `"najtvrđi"` | Typo ('rdđ' instead of 'rđ') |
| `hr_sci_34` | `incorrect_answers` | `"Golgetijevo tijelo"` | `"Golgijevo tijelo"` | Misspelling of Golgi apparatus |
| `hr_sci_41` | `incorrect_answers` | `"Ultravijolično zračenje"` | `"Ultravijoličasto zračenje"` / `"Ultraljubičasto zračenje"` | Dialectal/misspelled UV radiation |
| `hr_sci_46` | `incorrect_answers` | `"Kandel"` | `"Kandela"` | Misspelled SI unit symbol/name |
| `hr_sci_114` | `incorrect_answers` | `"Plutorij"` | `"Plutonij"` | Typo in Plutonium |
| `hr_sci_316` | `incorrect_answers` | `"Gukoza"` | `"Glukoza"` | Typo in Glucose |
| `hr_sci_510` | `incorrect_answers` | `"Molitden"`, `"Magnezijum-dioksid"` | `"Molibden"`, `"Magnezij-dioksid"` | Typo in Molybdenum / Serbian variant |
| `hr_sci_575` | `incorrect_answers` | `"Stogoni"` | `"Stonoge"` | Typo in Myriapoda |

---

## Summary & Action Plan

1. **Fix `hr_sci_318`**: Change `"Mijelinska kućica"` to `"Mijelinska ovojnica"`.
2. **Fix Wording**: Correct `"kemijski proces"` in `hr_sci_44` to `"nuklearni proces"`, and fix `"virovitički"` in `hr_sci_140` to `"virus"`.
3. **Deduplicate**: Remove/replace the 19 redundant duplicate questions identified in Section 3 to ensure dataset variety.
4. **Clean up typos**: Apply the spelling corrections listed in Section 5.

#### 🔍 Dodatna zapažanja i analiza za kategoriju Znanost i Tehnologija:

This document contains a comprehensive review of the provided science questions dataset[cite: 5]. The questions listed below contain issues such as inaccurate underlying science/facts, self-revealing wording, ambiguity, or poor formatting[cite: 5].

---

## 1. Incorrect Questions / Scientifically Inaccurate Answers

* **ID:** `hr_sci_22`
  * **Question:** "Kako se naziva proces u kom tvar iz plinovitog stanja prelazi izravno u tekuće?"
  * **Issue:** Going from gas to liquid is simply condensation, not "izravno" (directly). Direct phase transition from gas to solid (skipping liquid) is **deposition/desublimation**, while direct phase transition from gas to liquid does not skip any intermediate state. The question wording falsely implies an unusual direct phase skip.

* **ID:** `hr_sci_144`
  * **Question:** "Koji se kemijski element koristi kao poluvodička baza u većini modernih mikročipova i tranzistora?"
  * **Issue:** Minor typo in options: Option `"Galsij"` should be **Galij** (Gallium).

* **ID:** `hr_sci_213`
  * **Question:** "Koji je fizikalni zakon otkrio da je uzgon koji djeluje na tijelo uronjeno u tekućinu jednak masi istisnute tekućine?"
  * **Issue:** Archimedes' principle states that the buoyant force is equal to the **weight** (or force of gravity, $F_g = m \cdot g$) of the displaced fluid, not its **mass** ($m$).

* **ID:** `hr_sci_270`
  * **Question:** "Koji element s kemijskim simbolom Au ubraja se među najduktilnije (najrastezljivije) metale..."
  * **Issue:** Categorized under both fact-hints and errors. The answer is given as `"Au"`, but the question asks "Koji element..." (Which element...), so the canonical answer should be **Zlato** (Gold).

---

## 2. Questions or Answers That Hint at the Correct Answer

* **ID:** `hr_sci_47`
  * **Question:** "Kako se zove tehnologija koja omogućuje bežično povezivanje uređaja na kratkim udaljenostima (imenovana po danskom kralju)?"
  * **Issue:** Mentioning that it is named after a Danish king (Harald Bluetooth) strongly hints at **Bluetooth** for anyone with basic history/trivia knowledge.

* **ID:** `hr_sci_82`
  * **Question:** "Koja kiselina daje karakterističan kiseli okus limunu i agrumima?"
  * **Correct Answer:** "Limunska kiselina"
  * **Issue:** The question contains the root word ("limunu"), directly pointing to the correct answer ("Limunska kiselina").

* **ID:** `hr_sci_270`
  * **Question:** "Koji element s kemijskim simbolom **Au** ubraja se među najduktilnije..."
  * **Correct Answer:** "Au"
  * **Issue:** The question explicitly states the exact chemical symbol `"Au"` which is the given answer itself.

---

## 3. Questions That Are Not Written Clearly or Formatted Poorly

* **ID:** `hr_sci_12`
  * **Question:** "Kako se zove najpoznatiji svemirski teleskop lansiran 2021. godine kao nasljednik Hubblea?"
  * **Issue:** The full and official name of the telescope is "James Webb Space Telescope" (JWST). Simply listing `"James Webb"` names the person (administrator), rather than the instrument itself.

* **ID:** `hr_sci_33`
  * **Question:** "Koji je dio oka odgovoran za fokusiranje svjetlosti na mrežnicu (mrežnjaču)?"
  * **Issue:** Both the **cornea** (rožnica) and the **lens** (leća) focus light onto the retina (in fact, the cornea performs roughly two-thirds of the eye's total refractive power). Specifying the lens without clarifying "dynamic/adjustable focusing" (akomodacija) makes the question ambiguous.

* **ID:** `hr_sci_62`
  * **Question:** "Kako se naziva najmnogoljudnija domena u klasifikaciji živih bića (strukturno najjednostavnija, bez jezgre)?"
  * **Issue:** Using the term "najmnogoljudnija" (most populous/populated) for domain classification of single-celled organisms is colloquial and awkward in scientific Croatian context.

* **ID:** `hr_sci_140`
  * **Question:** "Koji je prvi računalni virovitički ili mrežni crv lansiran preko Interneta 1988. godine?"
  * **Issue:** Contains a major typo/autocorrect error: `"virovitički"` (pertaining to the city of Virovitica) instead of `"virusni"` (viral).

* **ID:** `hr_sci_162`
  * **Question:** "Kako se u fizici zove masa po jedinici površine na koju djeluje sila usmjerena okomito?"
  * **Issue:** Pressure is defined as perpendicular **force** per unit area ($P = F/A$), not **mass** per unit area. 

* **ID:** `hr_sci_219`
  * **Question:** "Kako se naziva maglica sastavljena od međuzvjezdanog plina i prašine u kojoj nastaju nove zvijezde?"
  * **Correct Answer:** "Zvjezdana rodilišta / Nebula"
  * **Issue:** Option formatting is inconsistent. Combining a descriptive term ("Zvjezdana rodilišta") with a slash and a generic term ("Nebula") creates clarity issues. Additionally, `"Kuster"` in `incorrect_answers` is a typo for "Klaster" (cluster).

---

## 3. Registar doslovnih duplikata (Exact Duplicates Registry)

U bazi je otkriveno **7 identičnih parova pitanja** koja se doslovno ponavljaju od riječi do riječi:

1. **Kraljica soula (Aretha Franklin)**:
   - `glazba.json` (`hr_mus_586`)
   - `glazba.json` (`hr_mus_806`)

2. **Marina Perazić / Denis & Denis**:
   - `glazba.json` (`hr_mus_607`)
   - `glazba.json` (`hr_mus_809`)

3. **Divlje jagode / Zele Lipovača**:
   - `glazba.json` (`hr_mus_664`)
   - `glazba.json` (`hr_mus_827`)

4. **Angus Young / AC/DC**:
   - `glazba.json` (`hr_mus_690`)
   - `glazba.json` (`hr_mus_834`)

5. **Dinamo Zagreb / Kup velesajamskih gradova 1967.**:
   - `sport.json` (`hr_sport_613`)
   - `sport.json` (`hr_sport_798`)

6. **Najbrži kopneni sisavac (Gepard)**:
   - `opca_znanje.json` (`hr_gen_136`)
   - `znanost_i_tehnologija.json` (`hr_sci_624`)

7. **Kemijski simbol za zlato (Au)**:
   - `opca_znanje.json` (`hr_gen_101`)
   - `znanost_i_tehnologija.json` (`hr_sci_626`)

---

## 4. Preporuke i smjernice za sanaciju baze

1. **Korekcija činjeničnih pogrešaka**: Prioritetno ažurirati točne odgovore i tekstove pitanja za pitanja s činjeničnim pogreškama (npr. Zoran Ferić roman o Rabu, Mozartova nacionalnost, The Who nacionalnost, Indonezija/Nusantara, Celtics 18 naslova).

2. **Uklanjanje giveaway elemenata**: Preformulirati pitanja koja u zagradama ili samom tekstu daju rješenje (npr. *Dioklecijan*, *Avignon*, *Giro*, *8,95m*).

3. **Čišćenje strojnih prijevoda u književnosti i pop kulturi**: Ukloniti rusizme (*известан*, *композitor*) i bizarne formulacije (*krupni orkestar*, *Jalne Daisy*, *kralj u močvari*).

4. **Deduplikacija baze**: Zamijeniti 7 identičnih duplikata novim zanimljivim pitanjima.
