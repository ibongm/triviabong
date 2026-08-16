# TriviaBong — Pregled pitanja: netočnosti, nagovještaji odgovora, nejasnoće

**Datum pregleda:** 6. kolovoza 2026.
**Opseg:** 3.535 pitanja u 8 kategorija (`src/data/categories/*.json`)
**Metoda:** Kombinacija automatiziranog pretraživanja uzoraka (self-answering, superlativi, duplikati, formatiranje) preko cijele baze + ručna dubinska provjera kategorije *opća znanja* (100/100 pitanja) + verifikacija sumnjivih nalaza web pretragom.

> **Napomena o opsegu:** Zbog veličine baze (3.535 pitanja), ovo NIJE iscrpan pitanje-po-pitanje pregled svih 8 kategorija. To je pregled visoke pouzdanosti temeljen na: (1) potpunom ručnom pregledu jedne kategorije kao referentne točke, i (2) sustavnom skeniranju uzoraka kroz sve kategorije za poznate tipove grešaka, s ručnom verifikacijom svakog nalaza prije uvrštavanja na popis. Postoji vjerojatnost da postoje dodatni problemi izvan ovog popisa koji nisu uhvaćeni ovim metodama.

---

## Legenda oznaka

| Oznaka | Značenje |
|---|---|
| 🔴 NETOČNO | Činjenična greška ili unutarnja proturječnost |
| 🟡 NAGOVJEŠTAJ | Pitanje otkriva ili sugerira točan odgovor |
| 🔵 NEJASNO | Loše sročeno, gramatički problem, ili konceptualna nejasnoća |
| ⚪ STRUKTURNO | Format/struktura pitanja (duplikati, prelomljena pitanja) |

---

## 1. Opća znanja (`opca_znanje.json`) — potpuni ručni pregled (100/100)

### 🔴 NETOČNO

- **hr_gen_146** — *"Koji je osnovni sastojak tradicionalnog **talijanskog** jela zvanog 'Guacamole'?"*
  Guacamole je **meksičko**, ne talijansko jelo. Odgovor "Avokado" je točan, ali premisa pitanja je netočna.

- **hr_gen_164** — Točan odgovor zapisan kao `'0 negativna (O-)'` — koristi se **znamenka nula**, a ne slovo O, što je nedosljedno sa standardnom notacijom krvnih grupa i može zbuniti pri provjeri odgovora.

- **hr_gen_184** — Točan odgovor "Inćun prugasti / Lepezasta iglica (Sailfish)" — nestandardan/pogrešan hrvatski naziv za sailfish. Standardni hrvatski nazivi su "iglan" ili "jedrilja"; "inćun prugasti" (prugasti inćun) nema veze sa sailfish.

### 🟡 NAGOVJEŠTAJ

- **hr_gen_150** — *"Koji se proces koristi za sterilizaciju mlijeka zagrijavanjem na visoku temperaturu pa brzim hlađenjem?"* → Odgovor "Pasterizacija". Pitanje u biti **definira** pasterizaciju vlastitim tekstom, čime se odgovor gotovo doslovno otkriva.

### 🔵 NEJASNO

- **hr_gen_149** — *"Koliko polja za igru ima na ploči za igranje domina s najvišim brojem dvostruka šestica?"* — Gramatički nepravilno ("dvostruka šestica" → "dvostruke šestice") i konceptualno zbunjujuće: domine nemaju "ploču s poljima" u klasičnom smislu, već se broji broj pločica u setu (28 za set do dvostruke šestice). Potrebno potpuno preformulirati.

- **hr_gen_192** — *"Kako se zove plava boja nastala miješanjem plave i zelene boje..."* — Cirkularna formulacija (cijan se naziva "plava boja" dok se istovremeno navodi da nastaje od "plave i zelene"). Bolje: "boja nastala miješanjem..."

- **hr_gen_197** — *"Koji je najstariji poznati pisani **jezik** na svijetu nastao u Sumeru?"* → Odgovor "Klinasto pismo". Neusklađenost pojmova: klinopis je **pismo/sustav zapisa**, ne "jezik" — jezik bi bio sumerski. Treba preformulirati pitanje da traži "sustav pisma", ne "jezik".

---

## 2. Nalazi iz sustavnog skeniranja svih 8 kategorija (verificirano)

### 🔴 NETOČNO

- **hr_sci_408** (`znanost_i_tehnologija.json`)
  *"Kako se zove prvi sintetizirani kemijski element otkriven u laboratoriju (atomski broj 94)?"* → Odgovor: "Plutonij (Pu)"
  **Ovo je netočno.** Plutonij (1940.) je **drugi** transuranski/sintetički element, ne prvi. Prvi umjetno stvoren kemijski element je **tehnecij** (1937.) — što je ispravno navedeno u pitanju **hr_sci_168** iz iste kategorije. Ova dva pitanja se izravno kontradiktoriju unutar iste baze pitanja. Treba ili ispraviti tvrdnju (npr. "prvi transuranski element" — što bi također trebalo provjeriti jer je neptunij tehnički prvi izoliran) ili u potpunosti preformulirati pitanje.

- **hr_mus_481** (`glazba.json`)
  *"Koja je ženska pop grupa predstavljala Hrvatsku na Euroviziji 2010. godine s pjesmom 'Lako je sve'?"* → Odgovor: "Feminnem" (točno, verificirano)
  **Problem s netočnim ponuđenim odgovorima:** Netočni odgovori uključuju i "ENI" i "E.N.I." — isti (izmišljeni/nepostojeći) naziv zapisan dva puta na različit način. Ovo efektivno smanjuje broj stvarno različitih ponuđenih opcija i može zbuniti igrače.

### 🟡 NAGOVJEŠTAJ (odgovor otkriven u pitanju)

- **hr_sport_134** (`sport.json`)
  *"Koji je atletski rekord na 200 metara za muškarce **(19,19 s)** također u vlasništvu Usaina Bolta?"* → Odgovor: "19,19 s"
  Točan odgovor je doslovno ispisan unutar teksta pitanja. Potrebno ukloniti brojku iz zagrade.

- **hr_sport_463** (`sport.json`)
  *"Koji je e-sport tim pobijedio na Counter-Strike 2 Majoru u Copenhagenu 2024. godine **(Navi)**?"* → Odgovor: "NAVI (Natus Vincere)"
  Naziv tima naveden je u zagradi unutar samog pitanja. Činjenica je točna (NAVI je stvarno pobijedio na PGL Major Copenhagen 2024.), ali format pitanja otkriva odgovor unaprijed.

### ⚪ STRUKTURNO (prelomljena/dvostruka pitanja)

- **hr_sport_486** (`sport.json`)
  *"Koji je američki košarkaš osvojio zlatnu medalju u skoku uvis ili trosskoku? (Ili: Koji je američki trkač Noah Lyles osvojio zlato na 100m na OI u Parizu 2024.?)"* → Odgovor: "Noah Lyles"
  **Ovo pitanje je pokvareno/nedovršeno.** Sadrži dvije potpuno različite, međusobno proturječne verzije pitanja spojene u jedan tekst — izgleda kao da su dva radna nacrta pitanja slučajno spojena. Prva verzija (o košarkašu i skoku uvis/troskoku) nema smisla u odnosu na odgovor "Noah Lyles" (koji je sprinter, ne košarkaš). Drugu verziju treba zadržati i očistiti, a prvu u potpunosti ukloniti. Dodatno, ime "Noah Lyles" već je spomenuto u tekstu pitanja, što dodatno otkriva odgovor.

- **hr_geo_25 / hr_geo_261** (`geografija.json`)
  Dva gotovo identična pitanja s istim točnim odgovorom:
  - hr_geo_25: *"Koji je najviši vodopad na svijetu?"* → Angelov vodopad (Salto Ángel)
  - hr_geo_261: *"Koji je najviši vodopad na svijetu smješten u Venecueli?"* → Angelov vodopad (Salto Ángel)

  Ovo je stvarni duplikat iste činjenice — igrač koji dobije oba pitanja u istoj partiji dobiva efektivno identično pitanje dvaput.

### 🔵 NEJASNO (nedosljedan format)

- **hr_sport_156** (`sport.json`) — *"Ako tenisač osvoji gem bez da protivniku prepusti ijedan bod, rezultat gema za protivnika je:"*
- **hr_sport_191** (`sport.json`) — *"Ako igrač u kuglanju sruši sve čunjeve iz dva pokušaja u jednom okiru (frame), to se zove:"*

  Oba pitanja su sročena kao rečenice za dopunjavanje ("...je:") umjesto kao upitne rečenice, za razliku od stila "Koji/Kako se zove...?" korištenog kroz ostatak baze. Nije pogrešno, ali je stilski nedosljedno.

### 🔵 NEJASNO — prekomjerno objašnjavajuće zagrade (može ukazivati na odgovor kroz eliminaciju)

Sljedeća pitanja sadrže parentetička objašnjenja koja djelomično odgovaraju na samo pitanje ili sužavaju polje odgovora prije nego što igrač uopće razmisli:

- **hr_geo_44** — *"Koji je najviši planinski vrh u Sjevernoj Americi **(nekadašnji McKinley)**?"* → Odgovor: Denali
- **hr_gen_126** — *"Koja zemlja je domovina kave **(gdje je biljka kave izvorno otkrivena)**?"* → Odgovor: Etiopija
- **hr_art_338** — *"...djelo 'Aranžman u sivom i crnom br. 1' **(poznato kao 'Whistlerova majka')**?"* → Odgovor: James McNeill Whistler (ime "Whistler" doslovno se pojavljuje u zagradi unutar pitanja)
- **hr_sport_62** — *"Koji se trofej dodjeljuje u ženskom reprezentativnom tenisu **(ranije poznat kao Fed Cup)**?"* → Odgovor: Billie Jean King Cup
- **hr_sport_379** — *"Koliko minuta traje jedna regularna runda u profesionalnoj UFC borbi **(izvan šampionskih borbi)**?"* → dodatno pojašnjenje unutar pitanja nepotrebno komplicira formulaciju

  Ova pitanja nisu nužno netočna, ali parentetičke napomene ponekad odaju dio odgovora (posebno hr_art_338, gdje se prezime "Whistler" doslovno pojavljuje u zagradi).

---

## 3. Preporuke za daljnji rad

1. **Prioritet 1 — ispraviti odmah:** hr_sci_408 (činjenična greška), hr_sport_486 (pokvareno/spojeno pitanje), hr_mus_481 (duplicirani netočni odgovori).
2. **Prioritet 2 — ukloniti nagovještaje:** hr_sport_134, hr_sport_463, hr_gen_150, hr_art_338 (ukloniti riječ koja odaje odgovor iz zagrade).
3. **Prioritet 3 — stilska dosljednost:** hr_sport_156, hr_sport_191 (preformulirati kao pitanja), hr_gen_149 i hr_gen_197 (gramatika/konceptualna preciznost).
4. **Preostalih 7 kategorija** (geografija, glazba, knjizevnost_i_umjetnost, pop_kultura, povijest, sport, znanost_i_tehnologija) pregledane su samo metodom skeniranja uzoraka, ne punim ručnim pregledom pitanje-po-pitanje kao opća znanja. Za jednaku razinu pouzdanosti kao kod opće znanja, preporučuje se dodatni krug ručnog pregleda po kategorijama.
5. Automatizirani skener (`scan.py`, priložen odvojeno ako je potreban) prijavio je i 390 pitanja s "superlativima" (najveći/najviši/prvi...) i 379 pitanja gdje se dio odgovora tekstualno pojavljuje u pitanju — velika većina toga je **lažno pozitivno** (normalan obrazac u geografiji/trivia pitanjima, npr. "Koji tjesnac..." → "X tjesnac") i nije uključena u ovaj popis, budući da ne predstavlja stvaran problem.

---

*Ovaj dokument je pripremljen kao radni materijal za dalju uredničku obradu pitanja prije beta testiranja.*
