# Izvješće o točnosti pitanja: Opće znanje (`opca_znanje.json`)

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
