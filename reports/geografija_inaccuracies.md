# Izvješće o provjeri točnosti podataka: `geografija.json`

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
