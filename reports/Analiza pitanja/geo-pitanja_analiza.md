# Analiza Pitanja i Odgovora (Geografija)

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
