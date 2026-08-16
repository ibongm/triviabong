# Fact-Checking Report: `znanost_i_tehnologija.json`

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
