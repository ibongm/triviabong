# Analysis of Question Dataset Issues

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