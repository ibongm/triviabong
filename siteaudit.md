# KvizArena Tri-Agent Audit & Review Plan

## 1. Overview & Delegation Architecture

To perform a thorough review of the entire codebase for bugs, state race conditions, security vulnerabilities, and UI/UX issues, the codebase is divided into distinct operational domains across three AI coding agents:

| Agent | Assigned Scope | Key Architectural Targets |
| :--- | :--- | :--- |
| **Zoo Code (Gemini)** | Core Gameplay & Question Data | `src/App.jsx` state machine, `src/utils/gameLogic.js`, `src/utils/leveling.js`, `src/data/questionsLoader.js`, `src/data/categories/*.json`, `src/utils/sound.js`, `hr-HR` copy audit. |
| **Claude Code** | Security, Firebase & API Boundary | `firestore.rules`, `firestore.indexes.json`, `api/questions.js`, `api/daily-challenge-payout.js`, `src/services/*`, `src/components/AdminPanel.jsx`, `src/components/admin/*`. |
| **Grok Build** | UI/UX, Components, Hooks & E2E | `src/screens/*`, `src/components/*.jsx`, `src/hooks/*`, `scripts/*.mjs`, `golden-path.mjs`, `.github/workflows/ci.yml`, `.github/workflows/e2e-emulator.yml`. |

---

## 2. Identified Problems & Remediation Steps

### Issue 1: Vitest Configuration Import Mismatch (`npm test` Failure)
- **Severity**: High (Blocks unit test suite execution)
- **Location**: `vite.config.js` (line 1)
- **Problem**: Running `npm test` (`vitest run`) throws `TypeError: Cannot read properties of undefined (reading 'config')` across all 29 test files. This occurs because `vite.config.js` imports `defineConfig` from `'vite'` rather than `'vitest/config'`, causing a configuration lookup error under Vitest 4 with Vite 8.
- **Remediation**:
  Change line 1 in `vite.config.js` from:
  ```javascript
  import { defineConfig } from 'vite';
  ```
  to:
  ```javascript
  import { defineConfig } from 'vitest/config';
  ```

---

### Issue 2: Unsynchronized Local Working Tree vs. GitHub (`origin/main`)
- **Severity**: Medium (Branch divergence and potential merge conflicts)
- **Location**: Local git repository vs `origin/main`
- **Problem**:
  1. The local branch is **7 commits behind `origin/main`**. These commits contain auto-generated question additions across `geografija.json`, `glazba.json`, `knjizevnost_i_umjetnost.json`, `pop_kultura.json`, `povijest.json`, `sport.json`, and `znanost_i_tehnologija.json`.
  2. The local workspace has **6 unstaged modified files** (`.claude/skills/run-triviabong/SKILL.md`, `.github/workflows/ci.yml`, `.github/workflows/e2e-emulator.yml`, `CHANGELOG.md`, `src/components/DailyMissionsModal.jsx`, `src/screens/LobbyScreen.jsx`).
- **Remediation**:
  Run:
  ```bash
  git pull --rebase
  git commit -am "feat(ci): integrate async-duel check into CI workflows & refine modal/lobby responsiveness"
  git push origin main
  ```

---

### Issue 3: Cross-Category Duplicate Questions
- **Severity**: Low (Handled safely at runtime, but wastes static asset bandwidth)
- **Location**: `src/data/categories/*.json`
- **Problem**: 63 question prompt duplicates exist across category JSON files. While `dedupeQuestions()` in `src/data/questionsLoader.js` filters duplicates at runtime, the duplicate entries remain in static JSON files.
- **Remediation**:
  Run `scripts/report-duplicate-questions.mjs` to purge exact-match question texts from secondary category JSON files.

---

## 3. Zoo Code Audit Findings (Core Gameplay & Question Data)

### A. Question Datasets & Schema Integrity
- **Total Questions Audited**: **8,442 questions** across 8 category JSON files (`geografija.json`, `glazba.json`, `knjizevnost_i_umjetnost.json`, `opca_znanje.json`, `pop_kultura.json`, `povijest.json`, `sport.json`, `znanost_i_tehnologija.json`).
- **Schema Compliance**: **0 schema errors (100% compliant)**. Every item strictly adheres to required fields: `id`, `question`, `correct_answer`, and `incorrect_answers` array of 3 non-overlapping options.
- **Deduplication**: 63 cross-pack duplicate questions detected, handled dynamically via `dedupeQuestions()`.

### B. Core State Machine & Game Loop
- **Routing & State Machine**: Driven purely by `gameState` in `src/App.jsx` (`LOBBY -> LEADERBOARD -> PLAYING -> GAMEOVER / VICTORY`). Zero URL routing libraries are introduced, respecting `AGENTS.md` boundaries.
- **Scoring & Streak Logic**: `applyAnswer()` in `src/utils/gameLogic.js` correctly applies `XP_PER_CORRECT_ANSWER`, calculates streak milestone bonuses, and evaluates achievements dynamically without state mutations.
- **Aggregate Category Pooling**: `getQuestionsByCategory('opca_znanje')` dynamically flattens and returns the aggregate pool from all categories, guaranteeing that new questions in any file immediately enrich general knowledge rounds.

### C. Audio Synthesizer Pipeline
- Web Audio API singleton in `src/utils/sound.js` uses lazy `AudioContext` initialization on user gesture (`playClick`, `playCorrect`, `playWrong`, `playTick`, `playFanfare`), avoiding browser autoplay blocks.

### D. Croatian Language (`hr-HR`) Compliance
- All UI text, category titles, question content, joker labels, and feedback copy conform to authentic Croatian language rules.

---

## 4. Prompts for Claude Code & Grok Build

### A. Copy-Paste Prompt for Claude Code
```markdown
You are assigned as Claude Code to perform an in-depth security, backend, and Firestore audit for KvizArena.

### Audit Targets:
1. `firestore.rules` & `firestore.indexes.json`
2. Serverless API functions: `api/questions.js` & `api/daily-challenge-payout.js`
3. Firebase services: `src/services/firebase.js`, `src/services/statsStore.js`, `src/services/matches.js`, `src/services/asyncDuels.js`, `src/services/leagues.js`
4. Admin panel components: `src/components/AdminPanel.jsx` & `src/components/admin/*`

### Guidelines & Rules (AGENTS.md):
- Strictly enforce ADMIN_EMAIL (`ivanm.ploce@gmail.com`) boundary across `api/questions.js` and `firestore.rules`.
- Check Firestore user document updates always use `{ merge: true }`.
- Verify stats fetching (`getUserStatsFromFirestore`) checks `docSnap.metadata.hasPendingWrites` to avoid stale local state reads.
- Ensure E2E test compliance uses `BongBotTest` and `BongBotTest2` (never dynamic usernames exceeding 20 characters).
- Maintain MANDATORY logging rule: Log any modifications in `CHANGELOG.md` in the exact same turn.

### Tasks:
1. Review `firestore.rules` for unauthorized write vectors (e.g., modifying XP, coins, or league scores directly).
2. Audit `api/questions.js` for proper authorization, payload validation via `src/utils/questionMerge.js`, and GitHub Contents API integration error handling.
3. Check `src/services/statsStore.js` and async duel services for Firestore transaction lock contention or race conditions during stats sync.
4. Report any security vulnerabilities, state bugs, or edge cases found, categorized by severity (High / Medium / Low).
```

### B. Copy-Paste Prompt for Grok Build
```markdown
You are assigned as Grok Build to perform a UI/UX, Component, Custom Hook, and E2E Test Suite audit for KvizArena.

### Audit Targets:
1. Screen components: `src/screens/LobbyScreen.jsx`, `src/screens/PlayingScreen.jsx`, `src/screens/GameOverScreen.jsx`, `src/screens/LeaderboardScreen.jsx`, `src/screens/AsyncDuelScreen.jsx`
2. Modal components: `src/components/*.jsx` (e.g., `DailyMissionsModal.jsx`, `AchievementsModal.jsx`, `AuthModal.jsx`, `AsyncDuelsModal.jsx`, etc.)
3. Custom hooks: `src/hooks/*.js` (e.g., `useGameRound.js`, `useAsyncDuels.js`, `useOneVsOne.js`, `useSessionTracking.js`, etc.)
4. E2E & Verification scripts: `scripts/*.mjs`, `golden-path.mjs`, `.github/workflows/ci.yml`, `.github/workflows/e2e-emulator.yml`

### Guidelines & Rules (AGENTS.md):
- Tailwind CSS v3 utility classes exclusively for styling.
- Zero URL routing allowed (state machine via `gameState` in `App.jsx`).
- Audio must route through `src/utils/sound.js`.
- Authentic Croatian (`hr-HR`) required for all UI copy and button labels.
- Test accounts strictly restricted to `BongBotTest` and `BongBotTest2`.
- Log any file edits immediately in `CHANGELOG.md`.

### Tasks:
1. Inspect UI components for mobile responsiveness bugs (e.g., text overflow, broken flex wrapping, truncated counts on small screens like 320px–375px viewports).
2. Audit modal components for open/close backdrop scroll locking leaks or unhandled escape key behaviors.
3. Review custom React hooks for unmounted state update warnings or missing cleanup in `useEffect` listeners (e.g., Firestore `onSnapshot` subscriptions).
4. Verify E2E test scripts (`golden-path.mjs`, `async-duel-check.mjs`, `two-player-match-check.mjs`) for flakiness, missing timeouts, or emulator environment dependencies.
5. Provide a summary of UI/UX glitches, hook memory leaks, and test script issues found.
```

---

## 5. Grok Build Audit Findings (UI, Hooks & E2E)

Audited 2026-10-11. No application code was changed. Findings below are defects, not the cleanups that already exist (`useOneVsOne` unsubscribes, `usePresence` / `useSessionTracking` / `useDailyMissions` / `useGameRound` clear timers and listeners, `useDailyChallenge` and `usePreviousWeekSummary` use a `cancelled` flag, `MatchView` unsubscribes from the match doc).

### Issue 4: Joker row overflows at 320–375px
- **Severity**: High (primary actions clipped on a phone)
- **Location**: `src/screens/PlayingScreen.jsx` (joker row, around the `flex justify-center gap-2` block)
- **Problem**: `50:50 (15c)`, `+10s (10c)`, and `Preskoči (30c)` sit in one non-wrapping flex row inside a `p-6` card. `main` is `px-4` (`src/App.jsx`). At 320px the inner width is about 240px; the three buttons need roughly 370px. They still do not fit at 375px. The root is `overflow-x-hidden`, and `golden-path.mjs` only checks `document.scrollWidth` at 360px, so clipped buttons can pass that guard.
- **Remediation**: Allow the row to wrap (`flex-wrap`) or stack the buttons full-width below `sm`. Assert the buttons are inside the viewport, not only that the document has no horizontal scroll.

### Issue 5: Playing-screen meta row and answer text
- **Severity**: High (question chrome and answers are unreadable on a narrow phone)
- **Location**: `src/screens/PlayingScreen.jsx` (category / index / "Prijavi pitanje" row, and the option `<span className="truncate">`)
- **Problem**: Category label, difficulty badge, `n / n`, and "Prijavi pitanje" share one `justify-between` row with no wrap and no truncation. Long names such as "Znanost i tehnologija" overflow. Answer text uses `truncate`, so a long option is cut off. `src/screens/AsyncDuelScreen.jsx` already wraps answers with `break-words`.
- **Remediation**: Wrap or stack the meta row. Render option text with `whitespace-normal break-words`, matching the duel screen.

### Issue 6: Lobby rows that cannot shrink
- **Severity**: Medium (overflow on 320px, not a broken action)
- **Location**: `src/screens/LobbyScreen.jsx`
- **Problem**: These flex rows have no `min-w-0` and do not wrap, so the text stays one line:
  - Missions: "Dnevne misije: 0/3 gotovo" beside "Reset za 23h 59m".
  - Signed-out leagues: "Lige — prijavi se i natječi s prijateljima".
  - Daily-challenge and 1v1 cards, plus the economy and "prošli tjedan" banners.
- The "Izazovi" button is fine: the label can wrap and the pending-count badge is `shrink-0`.
- **Remediation**: Add `min-w-0` and `break-words` on the text, or let the row wrap. Keep the countdown and badge `shrink-0`.

### Issue 7: Leaderboard and game-over name rows
- **Severity**: Low
- **Location**: `src/screens/LeaderboardScreen.jsx`, `src/screens/GameOverScreen.jsx` (daily board rows)
- **Problem**: `justify-between` rows put a rank badge, a display name (up to 20 characters), and the score on one line with no truncation.
- **Remediation**: `min-w-0 truncate` on the name. Keep the score `shrink-0`.

### Issue 8: Mixed address and an English placeholder
- **Severity**: Low (copy, not layout)
- **Location**: `src/screens/LobbyScreen.jsx` ("Testirajte"), `src/screens/GameOverScreen.jsx` ("Osvojili ste", placeholder `Unesite nadimak (Nickname)`), lobby CTAs ("Prijavi se", "Trenutno si")
- **Problem**: The same screens mix vi-form and ti-form. The guest score field placeholder contains the English word "Nickname". This contradicts the blanket `hr-HR` pass in section 3.D above.
- **Remediation**: Pick one address (the product already uses ti-form on the daily and duel surfaces) and drop "Nickname" from the placeholder.

### Issue 9: Modals do not lock background scroll
- **Severity**: Medium
- **Location**: every `fixed inset-0` modal under `src/components/`, shell in `src/App.jsx` (`min-h-screen overflow-x-hidden`)
- **Problem**: Nothing sets `document.body` overflow. Wheel and touch still scroll the page under the backdrop. This is a missing lock, not a lock that fails to clear on close.
- **Remediation**: While any modal is open, set `overflow: hidden` on the document (or a single scroll parent) and restore it when the last modal closes, including on unmount.

### Issue 10: Escape does nothing, and close buttons are unlabeled
- **Severity**: Medium (keyboard and screen-reader gap; not a scoring bug)
- **Location**: `src/App.jsx` keydown effects; `AuthModal`, `ConfirmModal`, `MatchInviteModal`, `ReportQuestionModal`, `SubmitQuestionModal`, `StatsModal`, `GuideModal`, `AchievementsModal`, `WhatsNewModal`, `SecretAchievementOverlay`, `OnlinePlayersModal`, `RekordiModal`
- **Problem**: The only `keydown` listeners are 1–4 / A–D and Enter / Space for "Dalje". No modal uses `role="dialog"` or `aria-modal`, none trap focus, and backdrop clicks do not call `onClose`. `DailyMissionsModal`, `LeaguesModal`, and `AsyncDuelsModal` have `aria-label="Zatvori"`. The others use an icon or "✕" with no accessible name.
- **Remediation**: One shared dialog shell: Escape calls `onClose` (except where dismiss is destructive), focus moves in, and the close control has `aria-label="Zatvori"`.

### Issue 11: 1v1 invite covers a live solo round and an async duel
- **Severity**: High (the clock keeps running under the modal)
- **Location**: `src/App.jsx` (`MatchInviteModal` render and `isAnyModalOpen`), `src/hooks/useOneVsOne.js` (invite subscription is not limited to the lobby), `src/screens/AsyncDuelScreen.jsx` (`DuelPlay` clock)
- **Problem**: The invite renders whenever `!activeMatchId && incomingInvites.length > 0`, including `PLAYING` and `ASYNC_DUEL`. It is not part of `isAnyModalOpen`, so the solo countdown keeps ticking. The async-duel clock is local to `DuelPlay` and is not gated by `isAnyModalOpen` either. The secret-achievement overlay does not have this bug: it shows only after an answer, which already stops the solo timer.
- **Remediation**: Suppress the invite unless `gameState === 'LOBBY'` and there is no async-duel run, or add it to the pause set that already stops the solo timer and pause `DuelPlay` the same way.

### Issue 12: Cancelled 1v1 invite can still create a match
- **Severity**: Medium
- **Location**: `src/hooks/useOneVsOne.js` (sent-invite effect, `createMatch` plus the 500ms retry)
- **Problem**: Cleanup unsubscribes and clears the timeout, but a `createMatch` already in flight still calls `setActiveMatchId` and `setSentInvite(null)`.
- **Remediation**: Ignore the callback when a generation token or `sentInvite.id` no longer matches the invite that started the request.

### Issue 13: Async-duel refresh can write the previous account's inbox
- **Severity**: Medium
- **Location**: `src/hooks/useAsyncDuels.js` (`refresh`, and the `[uid]` cleanup)
- **Problem**: `refresh()` has no cancel token. On account switch the cleanup clears the inbox, then the in-flight fetch can `setDuels` with the previous uid's list and set `lastFetchRef`. The new account skips its own fetch for 30 seconds (`MIN_REFRESH_INTERVAL_MS`). `claimReward` in that loop uses the uid captured when the fetch started. `useLeagues.refresh` and the missions Firestore read in `useDailyMissions` have the same missing `cancelled` flag. Those only `setState` late. They do not put another user's inbox on screen. React 18 does not warn on `setState` after unmount.
- **Remediation**: Capture a request id (or `cancelled`) at the start of `refresh` and drop `setState` when uid has changed. Do the same for the leagues and missions fetches.

### Issue 14: Presence stays "lobby" during async duels and live 1v1
- **Severity**: Low (other players see someone as available who is already in a match)
- **Location**: `src/hooks/usePresence.js` (`statusForGameState`)
- **Problem**: Only `PLAYING`, `GAMEOVER`, and `VICTORY` map to `playing`. `ASYNC_DUEL` falls through to `lobby`. A live 1v1 does not change `gameState` (`MatchView` replaces the main tree), so that player is broadcast as in the lobby too. The `'busy'` branch in the comment is unused.
- **Remediation**: Map `ASYNC_DUEL` to `playing` or `busy`, and pass the active match into presence while `activeMatchId` is set.

### Issue 15: 1v1 E2E loop gives up mid-match
- **Severity**: High (confirmed flake; blocks the CI e2e job)
- **Location**: `.claude/skills/run-triviabong/two-player-match-check.mjs` (`playMatchToEnd`)
- **Problem**: CI run [38105146937](https://github.com/ibongm/triviabong/actions/runs/38105146937) (commit `538ec43`, docs-only) failed here after both players reached "Spreman!": `FAIL - A reached a final screen` and the same for B. The previous run ([38105091015](https://github.com/ibongm/triviabong/actions/runs/38105091015)) was green. The loop allows 90 iterations at 700ms (about 63 seconds) and treats "Revanš" as the only done signal. That budget fits a 5-second countdown plus ten questions only when every click lands. One missed click lets that question run toward the 20-second timer. The failure path returns `null` and does not print the last screen text. The 3-second wait before looking for B online is a single sample, not a poll. On this run that step passed.
- **Remediation**: Poll for an enabled answer or for "Revanš" with a deadline that covers 10 × 20s. Log `bodyText` when the deadline passes. Replace the fixed 3-second presence wait with the same poll.

### Issue 16: Golden-path timing, viewport, and screenshot path
- **Severity**: Low (this script passed on the run that failed Issue 15)
- **Location**: `.claude/skills/run-triviabong/golden-path.mjs`
- **Problem**: Answers use a fixed `waitForTimeout(1500)` against an auto-advance of about 1.2 seconds. Overflow is checked only at 360px, and only via document `scrollWidth` (see Issue 4). The default screenshot directory is `C:\Windows\Temp\triviabong-shots`. CI does not set `SCREENSHOT_DIR`, so on Ubuntu that string is one odd directory name. It does not fail the step.
- **Remediation**: Wait for the next question text or the end screen instead of 1500ms. Run the overflow check at 320px as well as 360px. Default `SCREENSHOT_DIR` to `os.tmpdir()`.

### Issue 17: Async-duel E2E depends on an env var the published workflow does not set
- **Severity**: Medium (the new check cannot pass on `origin/main` as it is today)
- **Location**: `scripts/async-duel-check.mjs`, `src/constants/features.js`, uncommitted `.github/workflows/ci.yml` and `.github/workflows/e2e-emulator.yml`
- **Problem**: `ASYNC_DUELS` is true only when both `VITE_USE_FIREBASE_EMULATOR` and `VITE_FORCE_ASYNC_DUELS` are `'true'`. The script exits if the lobby never shows "Izazovi — dvoboj bez čekanja". Those workflow edits exist only in the local working tree. Run 38105146937 does not include this step. The script itself is in better shape than the 1v1 check: it refuses non-localhost URLs, polls for "Tvoj potez" and "Završeno", and uses only `BongBotTest` / `BongBotTest2`. The 700ms sleep in `playRunToSummary` is shorter than the 1200ms reveal, but the loop retries while buttons are disabled. Emulators started with `&` stayed up for later steps on the last green e2e run.
- **Remediation**: Land the workflow env var and the `node scripts/async-duel-check.mjs` step together with the script. Do not run the script against a dev server that was started without `VITE_FORCE_ASYNC_DUELS`.

---

## 6. Claude Code Audit Findings (Security, Firebase & API Boundary)

Audited 2026-10-11. No application, rules or config files were changed. Items marked **[emulator-confirmed]** were reproduced with a throwaway test against the Firestore emulator (since deleted). Others come from reading the code.

**AGENTS.md checks that passed:** the `ADMIN_EMAIL` boundary matches in `firestore.rules:19` and `api/questions.js:51` (admin claim, or admin email with `email_verified`; email/password sign-up cannot spoof it). User-doc writes use `{ merge: true }`. `getUserStatsFromFirestore` checks `hasPendingWrites` after the fetch (`firebase.js:119-123`). No E2E script generates dynamic usernames (`qa-*` appears only in comments). `statsStore.js` is localStorage-only, so it has no transaction contention. Async-duel races (`claimRandomDuel`, `reconcileDuel`, `markRewardClaimed`, `startRun`) are settled by a transaction or by the rules, and the losing write fails harmlessly.

### Issue 18: Stats sync is likely denied after the first play-time heartbeat
- **Severity**: High
- **Location**: `src/App.jsx:521-531` (hydration), `src/services/firebase.js:251-260` (`syncUserStatsToFirestore`), `firestore.rules:83-87`
- **Problem**: Hydration copies the whole cloud user doc into `globalStats`, including `playTime`, `dailyWinStreak` and `lastDailyWinDate`. Sync strips only identity fields, so it writes the login-time `playTime` back. Once a 90s heartbeat raises the server `playTime.total`, the merged write carries a lower total and the rule rejects the whole write. **[emulator-confirmed]**: a merge-write with `playTime.total = 100` against a stored `190` is denied; the same write without `playTime` succeeds. Effect: XP, coins and stats earned after the first heartbeat stop syncing (only a `console.error`), and the older cloud copy overrides local on next login. The cross-device E2E check probably misses it because its sessions are under 90s. Not reproduced end to end in a browser.
- **Remediation**: Strip `playTime`, `dailyWinStreak`, `lastDailyWinDate` and `updatedAt` in both hydration and `syncUserStatsToFirestore`. Add a regression test that syncs after a simulated heartbeat.

### Issue 19: Anyone, even signed-out, can overwrite the Rekordi boards
- **Severity**: High
- **Location**: `firestore.rules:498-526` (`records/fastestPerfect`, `records/rekordiSummary`)
- **Problem**: `allow create, update` has no auth check, only a shape bound (`entries.size() <= 10`). Entry contents are not validated. **[emulator-confirmed]**: an unauthenticated client replaced both docs with fake entries.
- **Remediation**: At minimum `isSignedIn()` plus per-entry shape checks. Better, write through a token-verified `/api` endpoint using the Admin SDK. `api/daily-challenge-payout.js` already runs the Admin SDK on Vercel, so this does not need the Blaze plan.

### Issue 20: Server-side credits are lost when a stale session syncs
- **Severity**: Medium
- **Location**: `src/services/firebase.js:247-264`, `api/daily-challenge-payout.js`, `awardCommunityQuestionReward` (`firebase.js:503`), `src/components/admin/AdminPlayers.jsx` (edit and reset)
- **Problem**: Sync writes absolute `coins`/`xp`. The payout cron (`increment`), the community-question reward and admin edits or resets are overwritten by any open session that hydrated earlier and then syncs.
- **Remediation**: Do not sync server-owned counters from the client, or send `increment` deltas.

### Issue 21: Daily Challenge attempt docs can be created under another player's id
- **Severity**: Medium
- **Location**: `firestore.rules:547`
- **Problem**: `create` checks `isOwner(request.resource.data.uid)` but never ties the doc id to `auth.uid`, and `date` is not validated. **[emulator-confirmed]**: an attacker pre-created `{date}_{victimUid}` with their own `uid` inside, and the victim's own create was then denied (update is `false`). Uids are public through `publicProfiles`, so a player can be locked out of the Daily Challenge for any date.
- **Remediation**: Require `attemptDocId == request.resource.data.date + '_' + request.auth.uid`.

### Issue 22: Owner-written progression values are unbounded
- **Severity**: Medium
- **Location**: `firestore.rules:65-87` (`users`), `175-190` (`publicProfiles`)
- **Problem**: **[emulator-confirmed]** `coins`/`xp`/`level` accept 1e15, and `publicProfiles.level` accepts 99999. This forges the Rekordi level and streak boards, and goes beyond the already-accepted leaderboard-score risk because these values have no ceiling.
- **Remediation**: Add upper bounds and per-write delta limits, as `achievementCount <= 100` already does.

### Issue 23: Multi-tab coin refund
- **Severity**: Medium
- **Location**: `src/utils/statsMerge.js:16-33`
- **Problem**: `mergeMonotonicStats` takes `max()` of `coins`, but coins are not monotonic. Coins spent in one tab are restored by another tab's stale value.
- **Remediation**: Remove `coins` from the max-merge list, or merge it by timestamp or delta.

### Issue 24: Hot document on every stats sync
- **Severity**: Medium
- **Location**: `src/services/firebase.js:775-790` (`maybeUpdateRekordiProfileBoards`)
- **Problem**: After each debounced stats sync, a transaction on `records/rekordiSummary` always writes all four arrays, even when nothing changed. Concurrent players contend on one document, the web SDK gives up after its retries, and the failure is swallowed, so board updates are silently dropped.
- **Remediation**: Write only when the player's entry would actually change a board.

### Issue 25: No catch-up for missed daily payouts
- **Severity**: Medium
- **Location**: `api/daily-challenge-payout.js:289`
- **Problem**: The daily cron pays only "yesterday" and Vercel does not retry. One failed run loses that day's payout permanently. The weekly payout already has catch-up logic.
- **Remediation**: Walk back over unpaid dates (bounded, e.g. 7 days), guarded by the existing `payoutProcessed` flag.

### Issue 26: Live 1v1 and async duel outcomes are self-reported
- **Severity**: Medium (documented v1 tradeoff)
- **Location**: `firestore.rules` `matches`, `asyncDuels`, `matchHistory` blocks
- **Problem**: Winner, scores and `matchHistory` entries are client-written and unverified, so wins are forgeable. Async duels also have no per-user cap on open or direct duels.
- **Remediation**: Accept for now. If rewards grow, verify through a token-checked Admin-SDK endpoint.

### Low-severity findings (Claude Code)
- **Issue 27 - `api/questions.js` hardening**: `CATEGORY_FILES[category]` accepts prototype keys such as `constructor` (line 124; admin-only, ends in a 502, use `Object.hasOwn`). JWT verification does not pin `algorithms` to RS256 and does not check revocation (line 43). GitHub failures are not logged server-side (`getCategoryFile`, line 70). `validateEntry` has no maximum lengths.
- **Issue 28 - GitHub Contents API 1 MB limit**: `content` is empty for files over 1 MB. The largest category file is 526 KB, so admin edits would break when it roughly doubles, with a misleading "invalid JSON" error. Move to the Git Blobs API before then.
- **Issue 29 - Cron secret comparison**: compared with `!==`, not constant-time (`api/daily-challenge-payout.js:276`).
- **Issue 30 - Question approval is not atomic**: GitHub commit, then reward, then status update (`AdminQuestionSubmissions.jsx:59-103`). `awardCommunityQuestionReward` swallows errors, so a failed reward leaves the submission approved with no reward and no retry path.
- **Issue 31 - Incomplete user delete**: `deleteUserFromFirestore` removes only `users/{uid}` (`firebase.js:1363`). `publicProfiles`, scores, presence and the Auth account remain, and the next login recreates the doc.
- **Issue 32 - Anonymous counter writes**: `questionStats` / `categoryStats` allow junk doc ids and write spam. App Check is the real mitigation (already tracked).
- **Issue 33 - Matches and invites**: an accepted invite can back multiple matches, accepting does not check invite expiry, nothing cleans up old invites, matches or duels, and league-code lookups have no rate limit.
- **Issue 34 - Index and TTL drift**: `getPlayerBestScoreForCategory` (`uid ==` plus `orderBy score desc`) needs a composite index on `scores` that is not in `firestore.indexes.json`. The `sessions` and `presence` TTL policies also exist only in the console. Verify in the console.
- **Issue 35 - Housekeeping**: `isAdmin()` raises "Property admin is undefined" for non-admin tokens (harmless because of `||`; `token.get('admin', false)` is cleaner). The `records/*` comment block sits above `validSessionShape` instead of its rules. `vercel.json` has no CSP header.

### Suggested order (Claude Code scope)
1. Issue 18 (strip server-owned fields from sync) with a regression test.
2. Issue 19 (auth or Admin-SDK endpoint for `records/*`).
3. Issues 21 and 22 (bind attempt id to `auth.uid`; caps on `users` / `publicProfiles`).
4. Issues 24, 20, 25.
5. The rest as convenient.

Any rules change needs `firebase deploy --only firestore:rules` and a case in `scripts/firestore-rules-*.test.mjs`.
