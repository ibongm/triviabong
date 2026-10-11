# HANDOFF — KvizArena engagement features (written 2026-10-11, \~02:00 Zagreb)

Audience: Claude Code, picking this repo up cold on Bong's own machine. Read this first, then `CLAUDE.md` (the architecture sections for each phase are current and detailed) and the top of `CHANGELOG.md` (one entry per phase).

## 0\. One-paragraph status

On 2026-10-10 a cloud Claude session implemented the whole six-feature "engagement plan" as seven PRs (Phase 0 groundwork + Phases 1–6). **All seven are merged into `main`** (#5–#11; `main` was at `120dc3e` after Phase 6, plus automated question-generator commits since). Every feature ships **dark behind a flag** in `src/constants/features.js`, and **all flags are still `false`** — so production behaviour only changed through the Phase 0/Phase 1/Phase 2 bug fixes listed in §3. What is left is **operational and has to be done by Bong, not by code**: run the Firestore rules tests, deploy `firestore.rules`, create four composite indexes, try each feature on production, then flip flags (one-line commits). Nothing in the cloud sandbox could execute the Firestore rules (no emulator JAR), so **the rules are unverified by execution** until CI or Bong runs them.

## 1\. Standing rules (from Bong / the Project — obey them)

* **Never write a plan or code until Bong explicitly says to.** "Continue" at a gate counted as the go-ahead for the next phase. If Bong asks a question or asks for a review, answer — do not start implementing.
* **Hard approval gates.** Work phase by phase; stop at the end of each phase and wait.
* **One feature branch per change, cut from latest `origin/main`; push with `-u`.** Bong opens the PRs himself (the cloud environment's `gh` was unauthenticated) — give him the compare URL: `https://github.com/ibongm/triviabong/compare/main...<branch>`.
* **Every code/config change is logged in `CHANGELOG.md`** (newest on top; `### \[YYYY-MM-DD] - Title`, then **Files Changed** and **Details**), and the relevant `CLAUDE.md` section is updated in the same change.
* **New features ship dark behind a `FEATURES.\*` flag** (default `false`).
* **Bong — not Claude — deploys Firestore rules/indexes and flips flags.** Claude may prepare the flag-flip commit when asked.
* Commit trailers used so far: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session\_01UHgadgpz8vqPM2c1ic2QKZ`. PR bodies end with `🤖 Generated with \[Claude Code](https://claude.com/claude-code)` plus the session URL. (If you are a different session, use your own session's trailers.)
* All UI copy and question content is **Croatian**. Keep new copy Croatian and in the existing tone.
* Bong's timezone is Europe/Zagreb; all date logic in the app uses the Zagreb calendar (not device-local).
* Bong prefers visual/interactive formats (checklists, charts) when exploring findings.

## 2\. Decisions that were made (don't re-litigate without asking)

|ID|Decision|Where it shows up|
|-|-|-|
|D1|No score weighting by difficulty tier|Phase 3|
|D2|Expired/abandoned-by-both async duels have **no winner**|Phase 4|
|D3|Weekly rank = sum of a player's **5 best rounds** that week; season rank = sum of their **5 best weekly totals**|Phase 5|
|D4|Leagues **require an account**|Phase 6|
|D5|Explanation pause happens after **every** answer (right or wrong) on a question that has one|Phase 2|
|D6|Season 1 = 8 weeks from Mon **2026-10-26** (`2026-W44`) — **a default Claude chose and told Bong about; still provisional**|Phase 5|
|D7|An async-duel win counts as a 1v1 win (same reward via `applyOneVsOneWin`)|Phase 4|
|D8|Async duels: random-opponent pool is per category or "any category"|Phase 4|
|D10|Weekly podium payout: 1st 30 coins+30 XP, 2nd 15+15, 3rd 10+10 (ties paid in full) — **also a default Claude chose**|Phase 5|
|—|Leagues give **no coins/XP** (plan §6.5)|Phase 6|

(There is no D9 in anything the cloud session recorded. The authoritative plan is `claude/KvizArena\_Engagement\_Features\_Plan.md` in Bong's claude.ai Project "TriviaWebApp" — Claude Code can't read it unless Bong pastes it in; `src/constants/features.js` references it.)

## 3\. What was done, phase by phase (all merged)

|PR|Branch|Phase|
|-|-|-|
|#5|`feature/engagement-phase-0`|Groundwork|
|#6|`feature/engagement-phase-1`|Mission fallbacks|
|#7|`feature/engagement-phase-2`|Answer explanations|
|#8|`feature/engagement-phase-3`|Difficulty tiers|
|#9|`feature/engagement-phase-4`|Async duels|
|#10|`feature/engagement-phase-5`|Weekly/seasonal boards|
|#11|`feature/engagement-phase-6`|Private leagues|

Also on 2026-10-10 (before the phases): fixed the **"Generate Category Questions" workflow failing to push** (`npm install --no-save`, `git stash` before pull) — questions generated earlier were being discarded.

### Phase 0 — groundwork (LIVE, not flag-gated)

* **Daily Challenge set no longer changes mid-day.** `selectDailyQuestions` in `src/utils/dailySeed.js` ranks questions by hash of `(dateKey, id)`; questions with `addedOn >= dateKey` are ineligible. Previously every question added anywhere (the generator commits several times a day) reshuffled the day's set under one shared leaderboard/payout.
* `addedOn` (Zagreb date) now stamped by `mergeQuestions` on every added question (admin upload, generator). Cross-category dedupe via `buildQuestionTextIndex`. `editQuestionById` spreads the original entry so edits don't strip extra fields.
* `scripts/generate-questions.mjs` now goes through `validateEntry`/`mergeQuestions`, whole-bank dedupe, `ID\_PREFIXES`, `--dry-run`. (The 40 `hr\_his\_\*` / 80 `hr\_spo\_\*` ids are left alone — stats/matches/reports reference them.)
* `shuffleArray` is now Fisher–Yates (old `sort(() => Math.random() - 0.5)` put the correct answer in position A 35.8% / D 31.1%).
* Missions weekday now derived from the **Zagreb** date key.
* `src/constants/features.js` created (all `false`).
* `scripts/report-duplicate-questions.mjs` (read-only): bank had 57 duplicate groups / 62 removable copies, 4 groups with **conflicting correct answers** — removal is a **manual decision still pending**.
* Deviation: `firestore.indexes.json` was deliberately NOT created (see §5.3).

### Phase 1 — mission fallbacks (`FEATURES.MISSION\_FALLBACKS`) + 4 LIVE bug fixes

* Every social/submission mission slot gets an `alt` solo path; a slot completes when either path hits its own target (never summed); `completedVia` records which. Pure logic in `src/utils/missionProgress.js`. New events `recordSoloRoundComplete`, `recordQuestionReported`.
* **Live fixes:** (a) category progress was clobbered by the streak write in the same handler (hook now uses a `stateRef`); (b) long-form category tags (`znanost\_i\_tehnologija`, `knjizevnost\_i\_umjetnost`) never counted — now compared through `resolveCategoryKey`; (c) Friday's "75%+ in the Daily Challenge" was impossible (`target:75` → `target:1, accuracy:75`); (d) double-tap could claim a slot twice.
* No rules change needed (`users/{uid}/missions/{dateKey}` has no field validation).

### Phase 2 — answer explanations (`FEATURES.EXPLANATIONS`) + 1 LIVE fix

* Optional `explanation` (≤ 220 chars) on questions. Solo rounds hold the transition until "Dalje"/Enter after every answer on a question that has one; Daily Challenge never pauses; 1v1 shows explanations on the match-over screen only.
* **Live fix:** score saves could be rejected for `elapsedMs > 200000` because the duration was computed at *save* time (counting game-over-screen time). Now captured once at round end (`finalRoundElapsedMs`) and omitted if over the cap. Possibly the cause of the 2026-10-02 "10/10 victory never reached the leaderboard" report.
* Tooling: `scripts/generate-explanations.mjs` + `generate-explanations.yml` (drafts to `reports/explanations\_<cat>\_<date>.json` on a NEW branch, questionable answers to `\_PROVJERITI.json`, never edits category files); `scripts/apply-explanations.mjs <file> \[--force]`.
* **Needs rules deploy:** `questionSubmissions` accepts optional `explanation` (1–220); `reports.reason` enum gains `wrong\_explanation`. Test: `scripts/firestore-rules-explanations.test.mjs`.

### Phase 3 — difficulty tiers (`FEATURES.DIFFICULTY`, `FEATURES.DIFFICULTY\_BADGE`)

* Optional `difficulty` (`easy|medium|hard`), `difficultyAccuracy`, `difficultySource` (`stats`|`guess`). Thresholds in `src/utils/difficulty.js` (easy ≥ 75% correct, hard < 45%, measured only from ≥ 15 attempts).
* `scripts/compute-difficulty.mjs` (reads public `questionStats` over Firestore REST; writes `stats` tiers; writes `reports/suspect\_questions\_<date>.md` for questions < 15% correct = likely wrong answer key; never auto-edits). `compute-difficulty.yml` (manual) pushes to a NEW `difficulty/<run>` branch.
* `composeRound`: 3 easy / 4 medium / 3 hard, easy→hard; untiered = medium. Used for solo rounds and the 10 played 1v1 questions. **Daily Challenge deliberately untouched.** Admin → Pitanja shows tier chips and a filter (incl. "Sumnjiva"). No rules change.

### Phase 4 — async duels (`FEATURES.ASYNC\_DUELS`, `FEATURES.ASYNC\_DUELS\_ADMIN\_PREVIEW`)

* Ten questions each, answered within 48 h. Direct challenge or random pool. Fetch-only (no `onSnapshot`). New `gameState` `ASYNC\_DUEL`, "Izazovi" modal, lobby row with badge. Live 1v1 code untouched apart from `MatchView` calling the extracted `computeDuelAnswerScore`.
* **Rules deviation from plan:** the opponent's result becomes readable once *your own* run is `done` (not once the duel is `complete`), to avoid a deadlock if the finishing client dies before writing the winner. `finishRun` = two writes; `reconcileDuel` repairs the gap.
* Nightly cron `api/daily-challenge-payout.js` also runs `sweepExpiredDuels` (never throws, 500/run).
* **Needs:** `firestore.rules` deploy **and** 4 composite indexes from `firestore.indexes.json` (see §5.3). Test: `scripts/firestore-rules-async-duels.test.mjs` (\~60 cases).
* `ASYNC\_DUELS\_ADMIN\_PREVIEW` shows the UI to the verified admin account only — intended for the production dry run.

### Phase 5 — weekly/seasonal boards (`FEATURES.WEEKLY\_BOARDS`)

* One flag covers the write path, Rekordi tabs (Tjedno | Sezona | Svih vremena) and the lobby "Prošli tjedan" card. Zagreb-calendar ISO weeks (`src/utils/periods.js`; 2026 has 53 weeks). Seasons in `src/constants/seasons.js`.
* Data: `weeklyBoards/{week}/players/{uid}`, `seasonBoards/{season}/players/{uid}`, `badges/{uid}` (Admin SDK only — **never put badges on `publicProfiles`**).
* Write path: `recordPeriodScore` fire-and-forget after a successful round save (one transaction; non-qualifying rounds cost 1–2 reads, no writes).
* Cron `runPeriodPayouts` pays the last finished week's podium once and awards season badges; it carries **inlined copies** of the week/season/reward logic — `src/utils/periodPayout.test.js` pins them against the originals. **If you change `periods.js`, `seasons.js`, `periodBoards.js` or the reward constants, change the cron's copy too.**
* Deviations: no `rounds` counter on the weekly doc; season doc stores a `weeks` map (not `w1..w5`). Rules cannot check that `weekKey` is the current week (same trust ceiling as the solo leaderboard — scores are client-computed).
* **Needs rules deploy.** Test: `scripts/firestore-rules-weekly-boards.test.mjs` (58 cases). No new indexes.

### Phase 6 — private leagues (`FEATURES.LEAGUES`)

* Create a league (name + emoji), join with 6-char code (`A-HJ-NP-Z2-9`) or `/liga/CODE` link, max 50 members, weekly table (from Phase 5 data), daily mini-ranking, crown for last week's winner, "challenge a member" via the Phase 4 async-duel flow, owner settings (rename/emoji/new code), leave/kick/hand-over, last member out deletes the league, read-only admin "Lige" section. Accounts required; no coins/XP.
* Data: `leagues/{id}` (+ `members/{uid}`), `leagueCodes/{code}` (get-only, no list), `users/{uid}/leagues/{id}` (my-leagues index). Every multi-doc change is a single client `writeBatch` tied together in `firestore.rules` with `get/getAfter/exists/existsAfter`; joins use `increment(1)` because a joiner can't read the league.
* Invite link: parsed once on load in `useLeagues`, parked in `sessionStorage`, URL reset to `/`, modal opens after auth settles; invalid codes (containing 0/O/1/I) ignored.
* **Deviations/notes:** `leagueCodes` also carries `name`/`emoji` (join preview); code+link visible to all members; member docs immutable (name = join-time name); **5-leagues-per-player cap is client-only**; kicked members' index docs self-clean on next open; admin delete leaves invisible orphan member docs; names capped by UTF-16 length client-side.
* **Needs rules deploy.** Test: `scripts/firestore-rules-leagues.test.mjs`. No new indexes. **Leagues only show scores when `WEEKLY\_BOARDS` data exists** → flip those two together.

## 4\. Verification state

* Unit suite: **395 tests pass** (`npm test`). Build passes. **Lint baseline is 12 problems (8 errors, 4 warnings), all pre-existing in untouched parts — it must not grow.**
* Browser smoke tests with flags temporarily on (reverted after): Phase 5 (tabs, countdown, no-season state) and Phase 6 (signed-out lobby row → sign-in prompt, `/liga/ABC234` stores code and strips URL, `/liga/ABC230` ignored, no page errors).
* **NOT verified by execution — do this before trusting anything:**

  1. **Every rules block** (Phases 2, 4, 5, 6). The sandbox couldn't download the Firestore emulator JAR. The four scripts above run in both `.github/workflows/ci.yml` and `e2e-emulator.yml`; check the CI result on the merged PRs / `main`, and run them locally if CI was red or skipped.
  2. **All signed-in flows** for leagues, async duels and weekly boards (need real Firebase/emulator + two accounts).
  3. The nightly cron's new branches (`sweepExpiredDuels`, `runPeriodPayouts`) have only been unit-tested against an in-memory fake. Expectation (not confirmed): with flags off and no data they are no-ops, but `sweepExpiredDuels` queries need the async-duel composite indexes, so it may log a failed-precondition error each night until step 5.3 is done. It is designed never to throw. Check the Vercel function logs after the first nightly run.
* **Playwright E2E not written** for async duels (`async-duel-check.mjs`), weekly boards or leagues. The existing three (`golden-path`, `cross-device-sync-check`, `two-player-match-check` — see `.claude/skills/run-triviabong/`) still run in CI; `golden-path.mjs` was updated to click "Dalje" so it survives `EXPLANATIONS` being on.

## 5\. WHAT IS LEFT — in order

### 5.1 Confirm CI / run the rules tests (Bong, at home)

`firebase emulators:exec --only firestore "node scripts/firestore-rules-leagues.test.mjs"` — and the same for `firestore-rules-weekly-boards`, `-async-duels`, `-explanations` (also `-counters`, `-playtime` for the older rules). Needs JDK 21+. If anything fails, fix **rules or tests before deploying** and tell the user what failed — don't flip flags to "see if it works".

### 5.2 Deploy `firestore.rules` (Bong)

`firebase deploy --only firestore:rules` (project in `.firebaserc`). One deploy covers Phases 2, 4, 5, 6. All new rule blocks are additive; existing collections' rules were not loosened.

### 5.3 Deploy the async-duel indexes (Bong)

**Done in repo 2026-10-11:** the live index set was exported (it was empty) and the 4 composite indexes (challenger/opponent inbox queries, random-opponent pool, the cron's expiry sweep) now live in the root `firestore.indexes.json`, wired into `firebase.json`. Remaining step: `firebase deploy --only firestore:indexes` (or deploy with the rules). Re-export (`firebase firestore:indexes`) first if indexes were added in the console since.

### 5.4 Per-feature prep before each flag

* **EXPLANATIONS:** the bank has no explanations yet, so flipping the flag alone changes almost nothing. Run the `generate-explanations.yml` workflow per category → review the PR branch (and `\_PROVJERITI.json`: answers the model doubted) → `node scripts/apply-explanations.mjs <file>`. Gate on rules deploy (§5.2).
* **DIFFICULTY / DIFFICULTY\_BADGE:** run `compute-difficulty.yml` once enough `questionStats` have accumulated (≥ 15 attempts per question); review the generated `difficulty/<run>` branch and `reports/suspect\_questions\_\*.md` (likely wrong answer keys — fix by hand). Without data, rounds behave exactly like before (all questions count as medium).
* **MISSION\_FALLBACKS:** no prerequisites; can be flipped any time (no rules/index dependency).
* **ASYNC\_DUELS:** rules + indexes first; use `ASYNC\_DUELS\_ADMIN\_PREVIEW` for a production dry run with two real accounts (Bong has `BongBotTest`/`BongBotTest2` for E2E) before `ASYNC\_DUELS`.
* **WEEKLY\_BOARDS + LEAGUES:** rules first. Confirm Season 1 dates (D6) — **Season 1 is currently set to start Monday 2026-10-26**; if launch slips, edit `startWeek` in `src/constants/seasons.js` **and** the cron's inlined copy in `api/daily-challenge-payout.js`, and update `periodPayout.test.js` if needed. Try a real league with friends on production before announcing.

### 5.5 Flag flips (one-line commits to `src/constants/features.js`, then Vercel auto-deploys)

Suggested order (lowest risk first): `MISSION\_FALLBACKS` → `EXPLANATIONS` (after backfill) → `DIFFICULTY`/`DIFFICULTY\_BADGE` (after compute) → `WEEKLY\_BOARDS` + `LEAGUES` → `ASYNC\_DUELS\_ADMIN\_PREVIEW` then `ASYNC\_DUELS`. Flip one at a time, watch the browser console + Firestore usage, log each flip in `CHANGELOG.md`. **Rollback = flip the flag back to `false`** (data written while on stays harmlessly in Firestore; rules can stay deployed).

### 5.6 Optional / deferred work (not started; ask before doing)

* Playwright E2E scripts: `async-duel-check.mjs`, a weekly-boards check, a leagues check (two accounts, two concurrent contexts, like `two-player-match-check.mjs`).
* `GuideModal` how-to copy for leagues (flag-gated), as was done for missions/explanations/duels.
* Achievements: "Tjedni pobjednik", "Sezona: Top 10", a league achievement. Divisions (plan §5.7). A public-profile screen to show badges (none exists; badges only show on the season board).
* Remove the 62 duplicate questions found by `report-duplicate-questions.mjs` (manual — 4 groups have conflicting correct answers; decide which answer is right first).
* Hard-coded `ADMIN\_EMAIL` rule: if it ever changes, update `src/App.jsx`, `api/questions.js` **and** `firestore.rules`, then redeploy rules.

## 6\. Gotchas a fresh session will hit

* **Do not hardcode a total question count** anywhere (grows with every upload; a stale figure once mis-sized an admin read by \~3×). Count with a script.
* **`main` moves under you:** the question generator auto-commits to `main` several times a day (`feat(data): auto-generate questions in …`). Always branch from a freshly fetched `origin/main`; rebase before pushing.
* **The Daily Challenge must stay independent of pool size** (rank = hash of `(dateKey, id)`; same-day additions ineligible). Don't "simplify" it back to a seeded shuffle of the whole pool.
* **Hooks follow "lift state, hand back raw setters"** (`useGameRound`, `useScoreSaving`, …). `handleAnswer` in `App.jsx` is deliberately not extracted.
* **Lint rules active:** `react-hooks/set-state-in-effect`, `purity`, `refs`, `immutability`. Don't call `Date.now()`/`Math.random()` in render; don't set state synchronously in an effect body (resolve a promise, then set). Keep the baseline at 12.
* **Rules can't count a user's leagues, check the current week, or reliably count non-BMP characters** — those limits are client-side by design (documented in `CLAUDE.md`).
* **The cron can't import from `src/`** — inlined copies are pinned by `periodPayout.test.js`; keep them in sync.
* **`npm run dev` doesn't serve `/api/\*`**; use `npx vercel dev` for those.
* **Cloud-sandbox limits that no longer apply on Bong's machine:** no emulator JAR, no `gh` auth, shell network allow-list. On Bong's machine you can run the emulator, E2E scripts and `gh` normally (check `gh auth status`).
* **Stop-hook false positive (cloud sessions only):** `\~/.claude/stop-hook-git-check.sh` complained "unpushed commit / no remote branch" for branches that were already pushed (and later merged), because the local remote-tracking ref was missing. Fix: `git fetch origin '+refs/heads/\*:refs/remotes/origin/\*'`; verify with `git ls-remote origin <branch>`.
* **E2E accounts:** only the two fixed accounts `BongBotTest` / `BongBotTest2` (passwords are not in the repo — see `scripts/rotate-e2e-passwords.mjs` and the skill's `SKILL.md`). Never mint throwaway accounts (their long names broke the admin "Popuni sve profile" backfill via the 20-char `displayName` cap).
* The repo root has a stale `Plan1.txt` (an old pasted Firebase-quota discussion) and `dist/` — ignore both.

## 7\. Quick command reference

```
npm test                     # 395 unit tests
npm run lint                 # must stay at 12 problems
npm run build
node .claude/skills/run-triviabong/golden-path.mjs   # full round in headless Chromium (see SKILL.md)
firebase emulators:exec --only firestore "node scripts/firestore-rules-leagues.test.mjs"
git fetch origin \&\& git switch -c <branch> origin/main
```

## 8\. Where to look first for each area

|Area|Start here|
|-|-|
|Flags|`src/constants/features.js`|
|Round/answer logic, game state machine|`src/App.jsx` (+ `src/hooks/useGameRound.js`)|
|Missions|`src/constants/missions.js`, `src/utils/missionProgress.js`, `src/hooks/useDailyMissions.js`|
|Explanations|`src/utils/questionMerge.js` (`EXPLANATION\_MAX\_LENGTH`), `PlayingScreen.jsx`, `App.jsx` (`scheduleAfterAnswer`)|
|Difficulty|`src/utils/difficulty.js`, `src/utils/roundComposer.js`, `scripts/compute-difficulty.mjs`|
|Async duels|`src/utils/asyncDuel.js`, `src/services/asyncDuels.js`, `src/hooks/useAsyncDuels.js`, `src/screens/AsyncDuelScreen.jsx`|
|Weekly/season boards|`src/utils/periods.js`, `periodBoards.js`, `src/services/periodBoards.js`, `src/components/PeriodBoards.jsx`, `api/daily-challenge-payout.js`|
|Leagues|`src/utils/league.js`, `src/services/leagues.js`, `src/hooks/useLeagues.js`, `LeaguesModal.jsx`, `LeaguePage.jsx`|
|Security boundary|`firestore.rules` and the `scripts/firestore-rules-\*.test.mjs` suites|



