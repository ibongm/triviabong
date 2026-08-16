# AdminPanel.jsx — Implementation Plan

**Project:** TriviaBong
**Scope:** Admin dashboard redesign + supporting data collection
**Status:** Planning — no code written yet
**Audience:** Admin only (single operator). Beta-scale user base.

---

## 0. Context & assumptions

**Current architecture (as understood):**
- Client-only React SPA — Vite, Tailwind v3, Firebase Auth + Firestore
- Single-component state machine in `src/App.jsx` (`LOBBY → LEADERBOARD → PLAYING → GAMEOVER/VICTORY`)
- Questions stored as static JSON in `src/data/categories/*.json`, loaded via `src/data/questionsLoader.js`, aliases via `src/data/categoryKeys.js`
- Achievements logic in `src/utils/achievements.js` + `src/constants/achievements.js`
- Leveling curve in `src/utils/leveling.js`
- Firebase helpers in `src/services/firebase.js`
- `api/questions.js` — Vercel serverless function, writes questions via GitHub Contents API

**Assumptions to verify before building:**
- Questions already have stable unique IDs ✅ (confirmed)
- Existing admin panel is gated by Firebase Auth UID (or similar) — needs confirming
- Player stats (XP, coins, trophies) live in Firestore per-user documents — needs confirming on exact shape

---

## 1. Feature summary

| # | Feature | Type | Depends on |
|---|---------|------|------------|
| 1 | Session / time tracking | New data collection | — |
| 2 | Gameplay event log | New data collection | — |
| 3 | Player Management (list + profile + edit) | Dashboard section | 1 |
| 4 | Full sync on admin edit | Logic change | 3 |
| 5 | Baza pitanja (merged question hub) | Dashboard section | — |
| 6 | Question reports | New data + dashboard section | 5 |
| 7 | Engagement & retention stats | Dashboard section | 1 |
| 8 | Gameplay / content insights | Dashboard section | 2 |
| 9 | Content balance (trophy distribution) | Dashboard section | — |

---

## 2. Data layer (build first — everything else reads from this)

### 2.1 Session tracking

**Purpose:** power per-player time stats (#3) and aggregate engagement (#7).

**What to capture:**
- `userId`
- Session start timestamp
- Last heartbeat / session end timestamp
- Time spent per `gameState` (`LOBBY`, `LEADERBOARD`, `PLAYING`, `GAMEOVER`, `VICTORY`)
- App version / build
- Basic device + browser info

**Mechanics:**
- Timer accumulates per `gameState`, driven off the existing state machine transitions in `App.jsx`
- **Page Visibility API** — pause accumulation when the tab is backgrounded, resume on focus. Without this, an abandoned open tab inflates every number.
- **Heartbeat writes** — periodic flush (suggested ~30s while active) so data survives tab closes, crashes, and lost connections. There is no reliable "session ended" event in a browser.
- Session considered ended if no heartbeat for N minutes (define N — suggested 5).

**Storage:** new Firestore collection, one doc per session, indexed on `userId` + timestamp.

**Design decision:** store **raw session docs**, not pre-aggregated counters. At beta scale the read cost is trivial and it keeps every future slice of the data available. Aggregate at read time.

---

### 2.2 Gameplay event log

**Purpose:** power question accuracy, category popularity, win/loss rate (#8).

**Two event types:**

**Question attempt**
- `userId`, `questionId`, `categoryId`, correct/incorrect, timestamp
- Optionally: time-to-answer, HP remaining at time of answer

**Game result**
- `userId`, outcome (`VICTORY` / `GAMEOVER`), categories played, score, questions answered, duration, timestamp

**Storage:** new Firestore collection(s), separate from sessions.

> ⚠️ **Design this schema carefully once.** Three separate dashboard stats read from it. Getting the shape right up front avoids reworking all three later.

---

### 2.3 Question reports

**Purpose:** power the report queue (#6).

**Fields:** `questionId`, `categoryId`, `userId` (reporter), reason (enum), optional free-text note, timestamp, status (`pending` / `resolved` / `dismissed`).

---

### 2.4 Firestore security rules

Required across all three new collections:
- Players may **write only their own** session / event / report documents
- Players may **not read** other players' data
- Admin UID has full read access

This is a prerequisite, not an afterthought — the collections should not go live without it.

---

## 3. Admin dashboard shell

Redesign `AdminPanel.jsx` as a container with navigable sections rather than a flat page.

**Sections:**
1. Pregled / Overview — engagement, retention, content balance at a glance
2. Igrači / Players — list + profile + edit
3. Baza pitanja — question hub
4. Prijave / Reports — report queue
5. Statistika igre / Gameplay insights

**Cross-section navigation requirement:** clicking a report in section 4 must deep-link into section 3, filtered to that specific question ID. Plan the section state to accept a target/filter parameter — do not build sections as fully isolated islands.

---

## 4. Feature: Player Management

Replaces the existing *upravljaj javnim profilima*.

### 4.1 Player list

- One table, every player as a row
- **Columns:** name/username, XP, level, coins, trophy count, total time played, last active, account created
- **Sortable by every column** — click header to sort, click again to flip asc/desc
- Row click → player profile

### 4.2 Player profile (single view, all info)

Aggregation layer pulling from multiple Firestore sources into one screen:
- Profile / account info
- XP + level
- Coins
- Trophies / achievements (earned + unearned)
- **Session stats** with Daily / Weekly / All-time toggle → **single total number per period** (today's total / this week's total / lifetime), not a trend chart
- Recent activity summary (games played, accuracy) — optional, from the event log

### 4.3 Editing — direct override

- Admin can edit any stat directly; the entered value is written as-is
- No routing through normal gameplay logic to "earn" the value

### 4.4 Full sync after edit

After **any** admin edit, immediately reconcile derived state (do not wait for the player's next action):

1. **Recompute level** from the new XP using the existing `leveling.js` curve, and persist it
2. **Re-run achievement checks** against the player's full updated stat set, using the existing `achievements.js` logic
   - Newly-qualifying trophies → **unlock, but grant no reward** (no coins/XP payout on sync-unlock)
   - Trophies whose criteria are no longer met → **revoke**
3. **Suppress all player-facing side effects** — no toasts, no unlock animations, no notifications. The data updates silently; the player sees changes next time they view their profile normally.

**New logic required:** `achievements.js` is presumably unlock-only (gameplay never needed to take a trophy away). A **revoke path** must be added — same condition evaluation, but removing trophies that no longer qualify.

### 4.5 Open question ❓

**If a trophy earned through real gameplay is later revoked by an edit, are the coins/rewards already granted clawed back?**
Suggested default: **no** — revocation affects trophy status only, never touches already-granted currency. This is consistent with "no reward on sync-unlock," but was proposed, not confirmed. **Decide before implementing 4.4.**

### 4.6 Note on drift

Direct override means stored values may not reflect how they'd have arisen through play. Full sync keeps derived values (level, trophies) consistent, but raw stats remain whatever the admin set. Expect this during testing — an odd-looking state is more likely a manual edit than a bug.

---

## 5. Feature: Baza pitanja

Merges three existing sections — *broj pitanja po kategoriji*, *upravljaj pitanjima*, *dodaj pitanja* — into one hub.

### 5.1 Landing — category stats
- Question count per category
- Breakdown by difficulty, if tracked
- Entry point into manage / add

### 5.2 Upravljaj pitanjima
- Browsable, searchable, category-filterable question list
- Edit / delete any question, targeted by its **unique ID** (never array index — indices shift)
- Must accept an incoming filter parameter so the report queue can deep-link to a single question

### 5.3 Dodaj pitanja
- Existing add flow via `api/questions.js` → GitHub Contents API

### 5.4 ⚠️ Critical constraint: commit-based writes

Questions are static JSON in the repo, **not Firestore**. Therefore:
- Edit and delete must read the category file, modify the target entry by ID, and write the whole file back via the GitHub Contents API
- **Every change is a git commit → likely triggers a Vercel redeploy**
- Changes are **not instant**, unlike the Firestore-backed player edits

**UX implications to design for:**
- Show a clear pending/processing state after save — do not imply instant success
- Guard against concurrent edits clobbering each other (two edits to the same category file in quick succession)
- Handle GitHub API failures explicitly (rate limits, conflicts, auth)

---

## 6. Feature: Question reports

### 6.1 Player side
- Lightweight "report" action on a question during or after play
- **Reason picker** (e.g. wrong answer marked correct / unclear wording / typo / offensive / other) plus optional free-text note — a blind flag with no context is much less useful
- Fire-and-forget; minimal interruption to gameplay

### 6.2 Admin side
- **Reports queue** — pending reports listed with question, category, reason, reporter, timestamp
- Click a report → **deep-link into Baza pitanja, filtered to that exact question**, ready to edit or delete
- Mark **resolved** or **dismissed** so the queue does not accumulate
- Group/count multiple reports on the same question

### 6.3 Pairing with data
A question flagged by **both** low accuracy (#8) and user reports is the strongest signal of a genuinely bad question. Surface both signals together where possible.

---

## 7. Feature: Engagement & retention (aggregate)

Reads from session data (2.1). **Aggregate across all testers — not per-user.**

- **DAU / WAU** — distinct users active in the last 1 / 7 days
- **New vs. returning** split
- **Retention** — of testers whose first session was on day X, what % returned on day X+1 and day X+7
- **30-day trend line** — worth charting here (unlike the per-player stats, where a single number was specified). Different context, different need.
- Average session length, sessions per user

---

## 8. Feature: Gameplay & content insights

Reads from the gameplay event log (2.2).

- **Question accuracy rate** — sortable, worst-first. Low accuracy = genuinely hard *or* badly worded. Cross-reference with reports.
- **Category popularity** — plays and time spent per category. Shows what to expand vs. what is dead weight.
- **Win/loss rate on the HP system** — difficulty-curve health check. Near-universal losses → too hard; near-universal wins → too easy.
- **Average score and game length**

**Suggested build priority:** at beta scale with a small tester pool, question accuracy and category popularity are more actionable than engagement metrics. Consider building #8 before #7.

---

## 9. Feature: Content balance

- **Trophy unlock distribution** — % of testers who have earned each trophy
- Flags outliers in both directions: effectively unreachable trophies (possible bug or over-tuned) and instantly universal trophies (trivial, maybe not worth being a trophy)

---

## 10. Suggested build order

**Phase 1 — Foundations**
1. Firestore schema design for sessions, gameplay events, reports (2.1–2.3)
2. Security rules (2.4)
3. Session tracking instrumentation — visibility API, heartbeats
4. Gameplay event logging instrumentation

**Phase 2 — Shell**
5. `AdminPanel.jsx` restructure into navigable sections, with cross-section deep-link support

**Phase 3 — Player management**
6. Player list with full column sorting
7. Player profile aggregation view + session stat toggle
8. Direct-override editing
9. Full-sync logic, including new revoke path in `achievements.js`

**Phase 4 — Questions**
10. Baza pitanja landing + manage + add, merged
11. Edit/delete via GitHub Contents API, with pending-state UX

**Phase 5 — Reports**
12. Player-side report action
13. Admin report queue + deep-link into Baza pitanja

**Phase 6 — Analytics**
14. Gameplay & content insights (#8)
15. Engagement & retention (#7)
16. Content balance (#9)

*Rationale:* data collection ships first so real data accumulates while the dashboard views are being built. Analytics last — they are useless until there is history to read.

---

## 11. Open items before implementation

- [ ] **Reward clawback on trophy revocation** — confirm the default in 4.5
- [ ] Heartbeat interval and session-timeout threshold
- [ ] Exact Firestore document shape for existing player stats (needs a look at the code)
- [ ] How the admin panel is currently access-gated
- [ ] Whether questions carry a difficulty field (affects Baza pitanja landing stats)
- [ ] Concurrency strategy for simultaneous question-file edits
- [ ] Croatian labels for all new UI strings

---

## 12. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Heartbeat writes inflate Firestore usage | Cost | Beta-scale is fine; revisit interval before wider release |
| Question edits are commit-based and slow | UX confusion | Explicit pending state; never imply instant save |
| Concurrent question-file edits overwrite each other | Data loss | Serialize writes / re-read before write / conflict detection |
| Achievement revoke path is new, untested logic | Wrong trophies removed | Test against the existing `run-triviabong` E2E skill; consider a dry-run mode showing what *would* change before committing |
| Admin edits leave stats in states gameplay would never produce | Confusing bug reports | Expected behavior — keep in mind when triaging |
| Full sync calls gameplay logic outside gameplay context | Unwanted side effects firing | Explicitly suppress toasts/animations/notifications in the admin path |
