# Analysis of Trivia Questions Dataset

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