# Izvješće o točnosti podataka – Kategorija: Sport (`sport.json`)

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
