# Changelog

### [2026-08-16] - Cascading-Render set-state-in-effect Refactors (Phase 5)
- **Files Changed**:
  - `src/hooks/useGameRound.js` (Modified)
  - `src/components/MatchView.jsx` (Modified)
  - `src/App.jsx` (Modified)
- **Details**:
  - Removed cascading `useEffect` in `useGameRound.js` that previously called `setHiddenOptions`, `setSelectedOption`, and `setAnswerLocked` on `[currentIndex, questions]`.
  - Added reusable `lockAnswersBriefly(ms = 300)` helper in `useGameRound.js` and invoked it explicitly at all question transition points in `App.jsx` (`resetRoundState`, `advanceOrFinish`, `handleAnswerTimeout`, `activateSkip`).
  - Fixed unnecessary `currentIndex` dependency in `currentShuffledOptions` `useMemo`.
  - In `MatchView.jsx`, eliminated synchronous `setRevealTimeLeft` early-return call within the reveal effect by resetting `revealTimeLeft` in effect cleanup, resolving the `react-hooks/set-state-in-effect` error.

### [2026-08-16] - Add Regression Tests for Timer Timeout & Zagreb Date Calculations (Phase 7)
- **Files Changed**:
  - `api/daily-challenge-payout.js` (Modified)
  - `src/utils/dailyChallengePayout.test.js` (Created)
  - `src/utils/gameLogic.test.js` (Modified)
- **Details**:
  - Exported `addDaysToDateKey` and `getYesterdayZagrebDateKey` from `api/daily-challenge-payout.js` for automated testing.
  - Created `src/utils/dailyChallengePayout.test.js` testing day subtractions across month boundaries, leap years, year rollovers, and Zagreb winter (CET)/summer (CEST) cron times.
  - Added unit test in `src/utils/gameLogic.test.js` asserting timeout (`timeLeft === 0`) stat updates.

### [2026-08-16] - useScoreSaving Optimistic Rollback Closure Cleanup (Phase 6)
- **Files Changed**:
  - `src/hooks/useScoreSaving.js` (Modified)
  - `src/App.jsx` (Modified)
- **Details**:
  - Passed `leaderboards` state from `App.jsx` into `useScoreSaving` hook.
  - Replaced mutable closure assignment of `previousLeaderboards` inside `setLeaderboards` functional updater with `const previousLeaderboards = leaderboards` captured before the async try/catch block, keeping state updaters pure.

### [2026-08-16] - Fix Timezone Double-Offset in Daily Challenge Payout Cron (Phase 4)
- **Files Changed**:
  - `api/daily-challenge-payout.js` (Modified)
- **Details**:
  - Fixed double timezone offset in `getYesterdayZagrebDateKey` by formatting today's date in `Europe/Zagreb` exactly once via `Intl.DateTimeFormat('en-CA', ...)` and stepping back one day using `addDaysToDateKey`.

### [2026-08-16] - ESLint Debt Cleanup: Unused Vars & Fast-Refresh Decoupling (Phase 3)
- **Files Changed**:
  - `eslint.config.js` (Modified)
  - `src/hooks/useGameRound.js` (Modified)
  - `src/components/AchievementsModal.jsx` (Modified)
  - `src/components/AuthModal.jsx` (Modified)
  - `src/components/QuestionReview.jsx` (Modified)
  - `src/components/StatsModal.jsx` (Modified)
  - `src/utils/matchQuestions.js` (Modified)
  - `src/utils/presenceUtils.js` (Created)
  - `src/components/OnlinePlayersList.jsx` (Modified)
  - `src/hooks/useOneVsOne.js` (Modified)
- **Details**:
  - Added `no-unused-vars` ignore pattern (`varsIgnorePattern: '^_', argsIgnorePattern: '^_'`) to `eslint.config.js` for `src` files to legitimise intentional underscore-prefixed destructuring in `src/services/firebase.js`.
  - Removed unused named imports from `useGameRound.js` and `AchievementsModal.jsx`.
  - Removed redundant `import React` statements from `AuthModal.jsx`, `QuestionReview.jsx`, and `StatsModal.jsx`.
  - Renamed unused `categoryKey` parameter in `resolveMatchQuestions` to `_categoryKey` in `matchQuestions.js`.
  - Extracted `ONLINE_THRESHOLD_MS` and `filterOnlinePlayers` into `src/utils/presenceUtils.js` to satisfy `react-refresh/only-export-components` in `OnlinePlayersList.jsx` and updated `useOneVsOne.js`.

### [2026-08-16] - Fix Ref Mutation During Render in MatchView (Phase 2)
- **Files Changed**:
  - `src/components/MatchView.jsx` (Modified)
- **Details**:
  - Moved `matchRef.current` and `isPlayer1Ref.current` assignments into a dedicated `useEffect([match, isPlayer1])` hook, eliminating 2 `react-hooks/refs` ESLint errors while preserving the stable 8-second heartbeat interval.

### [2026-08-16] - Fix Single-Player Timer Hang at 0s (Phase 1)
- **Files Changed**:
  - `src/App.jsx` (Modified)
- **Details**:
  - Added a dedicated `useEffect` keyed on `[timeLeft, gameState, selectedOption, isAnyModalOpen]` to trigger `handleAnswerTimeout()` when the countdown hits zero.
  - Removed the dead `timeLeft <= 0` guard from the top of the interval effect whose dependency array intentionally omitted `timeLeft`.


### [2026-08-16] - Reduce Firestore Quota: Heartbeat Intervals & Scoped Presence Listener
- **Files Changed**:
  - `src/hooks/usePresence.js` (Modified)
  - `src/components/OnlinePlayersList.jsx` (Modified)
  - `src/hooks/useSessionTracking.js` (Modified)
  - `src/hooks/useOneVsOne.js` (Modified)
  - `src/App.jsx` (Modified)
- **Details**:
  - Reduced Firestore write quota burn by bumping `HEARTBEAT_INTERVAL_MS` from 30s to 60s in `usePresence.js` (cutting presence writes by 50%) and from 30s to 90s in `useSessionTracking.js` (cutting admin session writes by 66%).
  - Adjusted `ONLINE_THRESHOLD_MS` in `OnlinePlayersList.jsx` from 90s to 180s to maintain the 3x heartbeat interval ratio and tolerate single missed beats.
  - Scoped the `subscribeToOnlinePlayers` `onSnapshot` listener in `useOneVsOne.js` to only run when `gameState === 'LOBBY'` and `!activeMatchId`, unsubscribing during active gameplay, leaderboards, and 1v1 matches to eliminate broadcast read fan-out during rounds.
  - Passed `gameState` to `useOneVsOne` in `App.jsx`.

### [2026-08-16] - Install Antigravity Workflows
- **Files Changed**:
  - `.agent/workflows/*` (Created)
- **Details**:
  - Installed all 45 Antigravity development, testing, database, deployment, and AI workflows into `.agent/workflows/` via `npx antigravity-workflows install --all`.

## 2026-08-16

- **Files Changed**: `reports/*` (deleted), `plans/*` (deleted), `docs/*` (deleted), `.adeptly/*` (deleted), `ANALIZA_SVIH_KATEGORIJA_EXPORT.md` (deleted), `review-report.md` (deleted), `trofejiexample.txt` (deleted), `.gitignore`
  **Details**: Removed accumulated audit-report/planning-doc/tool-artifact clutter that had been committed to the repo (`reports/` category-inaccuracy audits and architecture/perf/security/UX reviews, `plans/` implementation plans, `docs/plans/` and `.adeptly/chat-history/` - output from an unrelated tool, plus three top-level stray files). `scripts/` and `.agents/` were left untouched per explicit instruction. Added `/reports/`, `/plans/`, `/docs/`, `/.adeptly/` to `.gitignore` so this kind of scratch output stays local instead of re-accumulating in git.

- **Files Changed**: `.claude/skills/run-triviabong/golden-path.mjs`
  **Details**: Fixed a flaky assertion in the answer-loop step. `clickFirstAnswer` always clicks whichever answer button is first, regardless of correctness; on a lives-based category (e.g. Geografija) three unlucky wrong clicks in a row legitimately ends the round mid-loop, replacing the `Bodovi:` score line with a game-over screen. The check right after the loop only tested for `Bodovi:\s*\d+`, so a round that correctly ended early was scored as a failure ("score updated from answering") even though nothing was actually broken - caught when wiring the E2E suite into `ci.yml` to run on every push surfaced this far more often than the old manual-only `workflow_dispatch` trigger did. Now also accepts `Kraj Igre`/`Pobjeda` (round-ended) as a passing outcome.

- **Files Changed**: `.github/workflows/ci.yml`, `CLAUDE.md`
  **Details**: Wired the three emulator-based E2E scripts into `ci.yml` as a new `e2e` job (alongside the existing `lint-and-build` job) so they run on every push/PR, not just on manual `workflow_dispatch`. The job duplicates `e2e-emulator.yml`'s steps (JDK 21 setup, start Firestore+Auth emulators, `VITE_USE_FIREBASE_EMULATOR=true` dev server, run all three scripts) rather than replacing that file, since `e2e-emulator.yml` is kept around for ad hoc runs against an arbitrary branch from the Actions tab. Updated `CLAUDE.md`'s CI paragraph, which previously stated the E2E scripts were deliberately excluded from `ci.yml`, to match.

- **Files Changed**: `.github/workflows/e2e-emulator.yml`
  **Details**: First `workflow_dispatch` run of the emulator-based E2E workflow failed at "Start Firebase emulators" (exit 124, timeout) - the Firestore/Auth emulators need JDK 21+ and `ubuntu-latest`'s default Java was older, so `firebase-tools` errored immediately ("no longer supports Java version before 21") and the port-wait loop just timed out waiting on a process that had already exited. Added an `actions/setup-java@v4` step (Temurin, Java 21) before `actions/setup-node@v4`.

- **Files Changed**: `src/App.jsx`
  **Details**: Fixed a false "Razina 2" level-up toast firing on every fresh page load for signed-in accounts. The level-up diff effect compared `globalStats.level` against a `prevLevelRef` baseline seeded from the anonymous placeholder state (`level: 1`) present before auth resolves; when the real account's stats (`level: 2`) hydrated in, the effect saw `2 > 1` and treated it as a genuine level-up. Added a `hydratingStatsRef` flag, set immediately before each of the three `setGlobalStats` calls that hydrate state from storage/network rather than gameplay (auth resolve, sign-out, cross-tab `storage` merge) - the diff effect now checks this flag first and, when set, silently adopts the incoming level as the new baseline instead of showing the toast, then clears it. Gameplay `setGlobalStats` call sites (round answers, daily missions, 1v1 match completion) are untouched and still toast normally.

- **Files Changed**: `package.json`, `package-lock.json`, `.github/workflows/e2e-manual.yml` (deleted), `.github/workflows/e2e-emulator.yml` (new), `.claude/skills/run-triviabong/SKILL.md`, `.claude/skills/run-triviabong/cross-device-sync-check.mjs`, `.claude/skills/run-triviabong/two-player-match-check.mjs`, `CLAUDE.md`
  **Details**: Moved the three E2E Playwright scripts (`golden-path.mjs`, `cross-device-sync-check.mjs`, `two-player-match-check.mjs`) off live production Firestore onto the local Firebase Emulator Suite. The app-side emulator wiring already existed (`src/services/firebase.js`'s `VITE_USE_FIREBASE_EMULATOR` branch, `firebase.json`/`.firebaserc`/`firestore.rules` at the repo root) from an earlier pass but was never connected to the E2E scripts or CI - none of the three scripts import the Firebase SDK directly (they drive the app only through the browser), so no script-logic changes were needed, just starting `firebase emulators:start --only firestore,auth` and setting `VITE_USE_FIREBASE_EMULATOR=true` before `npm run dev`. Added `firebase-tools` as a devDependency (was missing entirely, needed to run the emulator CLI). Replaced `.github/workflows/e2e-manual.yml` (golden-path only, against live prod) with `.github/workflows/e2e-emulator.yml` (all three scripts, against the emulator) - still `workflow_dispatch`-only, not wired into push/PR CI. Updated `SKILL.md`'s Prerequisites/Start/Gotchas sections and the two scripts' header comments, which previously stated flatly that runs hit live production - now documents the emulator path as the recommended default (safe to loop/automate) with a live-prod fallback for when that's specifically needed. Updated `CLAUDE.md`'s CI paragraph to match.

## 2026-08-15

- **Files Changed**: `src/index.css`, `index.html`, `src/assets/fonts/inter-latin.woff2` (new), `src/assets/fonts/inter-latin-ext.woff2` (new), `src/assets/fonts/space-grotesk-latin.woff2` (new), `src/assets/fonts/space-grotesk-latin-ext.woff2` (new), `src/screens/GameOverScreen.jsx`, `src/screens/LeaderboardScreen.jsx`, `src/screens/LobbyScreen.jsx`, `src/screens/PlayingScreen.jsx`
  **Details**: Performance Phase 3 - self-hosted Inter and Space Grotesk instead of fetching render-blocking from `fonts.googleapis.com`/`fonts.gstatic.com` on every load. Both are variable fonts (confirmed every requested weight resolving to the same underlying file), so one `@font-face` per unicode-range subset with a `font-weight: 100 900` range covers Inter's full 400-900 usage - 2 files (`latin`/`latin-ext`, ~133KB combined) instead of 12. Discovered along the way: Space Grotesk has no 800/900 weight at all (Google Fonts was silently dropping the `800` the app had been requesting) - the 4 headings using `font-display font-black` had always been rendering as browser-synthesized fake-bold over the real 700 weight, never true black. Changed those 4 to `font-bold` (the actual heaviest weight that exists) instead of trying to fetch a weight that doesn't exist, and self-hosted only that one weight (2 files, ~25KB). Verified in-browser: zero requests to any Google font domain, all four affected headings (including Croatian diacritics, confirming the `latin-ext` subset works) render correctly, golden-path e2e passes clean.

- **Files Changed**: `src/App.jsx`, `src/assets/kvizarena-logo.png`, `src/assets/hero.png` (deleted), `src/assets/react.svg` (deleted), `src/assets/vite.svg` (deleted), `.claude/skills/run-triviabong/golden-path.mjs`, `package-lock.json`
  **Details**: Performance pass (Phase 1+2 of a bundle-size audit). Lazily loads `GuideModal`, `WhatsNewModal`, `AchievementsModal`, `DailyMissionsModal`, and `MatchView` via `React.lazy`/`Suspense` (mirroring the existing `AdminPanel` pattern) instead of bundling them eagerly into the main chunk regardless of whether a session ever opens them - each of these was previously rendered unconditionally with an internal `isOpen` self-guard, so becoming lazy also required moving that guard out to the JSX call site (`{showX && <Suspense>...}`), not just swapping the import. Main `index` chunk dropped ~33KB raw (903KB -> 870KB). Recompressed `kvizarena-logo.png` (87KB -> 17.8KB, lossless re-encode at max PNG compression, verified visually identical - done via a one-off `npm install --no-save sharp` that was uninstalled afterward, not a lasting dependency) and deleted three dead, unreferenced assets (`hero.png`, `react.svg`, `vite.svg`). Also fixed a real regression this surfaced: `golden-path.mjs`'s `clickByTitle` matched the header stats button's `title` attribute by exact equality, which broke once an earlier change made that title include the player's level title (e.g. "Razina i Statistika — Slučajni Prolaznik") - changed to a prefix match. `package-lock.json`'s stale `name` field ("triviaapp") also got synced to match `package.json`'s current name ("kvizarena") as an incidental side effect of the temporary sharp install/uninstall.

- **Files Changed**: `src/hooks/useOneVsOne.js`, `src/App.jsx`, `src/components/OnlinePlayersModal.jsx`, `src/components/OnlinePlayersList.jsx`
  **Details**: Fixed a Firestore read-quota driver found via a full audit of what's triggering reads - two separate, unfiltered, always-on `onSnapshot` listeners on the entire `presence` collection (one in `useOneVsOne`, live for the whole signed-in session, just to show a count in the lobby's "1v1 Dvoboj" CTA; one in `OnlinePlayersList`, live whenever the online-players modal was open), both explicitly flagged as duplicative in the old code comment. Collapsed into one shared subscription in `useOneVsOne` (`onlinePlayers` raw list + `onlinePlayersCount`, both returned from the hook), passed down as a `players` prop through `App.jsx` -> `OnlinePlayersModal` -> `OnlinePlayersList` instead of that component subscribing a second time. No behavior change - same self-exclusion/90s-staleness filtering, same loading-state handling - just one `onSnapshot` on `presence` per signed-in tab instead of up to two.

- **Files Changed**: `src/components/LevelBadge.jsx`, `src/components/StatsModal.jsx`, `src/components/admin/AdminPlayerDetail.jsx`, `src/App.jsx`, `src/components/OnlinePlayersList.jsx`, `src/components/RekordiBoards.jsx`
  **Details**: Surfaced the Croatian level title (`getTitleForLevel`, already existed in `levelTitles.js`, previously only shown in the level-up toast) next to the new `LevelBadge` wherever there's room for a second line of text - Stats modal and AdminPlayerDetail show it as visible text under the level number; the header pill, online players list, and Rekordi board (too cramped for a full title, some run 20+ characters) show it as a hover tooltip instead, via a new `title` prop `LevelBadge` forwards onto its wrapper `div`.

- **Files Changed**: `src/components/LevelBadge.jsx` (new), `src/utils/leveling.js`, `src/utils/leveling.test.js`, `src/App.jsx`, `src/components/StatsModal.jsx`, `src/components/OnlinePlayersList.jsx`, `src/components/RekordiBoards.jsx`, `src/components/admin/AdminPlayerDetail.jsx`
  **Details**: Added `LevelBadge` - a tiered vector icon (6 tiers derived from `levelTitles.js`'s existing 50-title/50-level range, 4 sizes: micro/sm/md/lg, sub-tier star pips) replacing plain "Razina N" text/Star-icon combos across the header level pill, level-up toast, Stats modal, online players list, the Rekordi "Najviša razina" board, and AdminPlayerDetail. New pure helpers `getLevelTierIndex`/`getLevelStarCount` in `leveling.js` clamp level into the titled range (level is uncapped XP-wise, so anything past 50 still renders the top "Trivia Bong" tier instead of breaking). Adapted from a proposed implementation plan (PDF) that assumed TypeScript and a hard 50-level cap - neither holds in this repo, so the component is plain JSX and reuses the existing `levelTitles.js` clamp pattern instead.

- **Files Changed**: `src/services/firebase.js`, `firestore.rules`, `src/components/SubmitQuestionModal.jsx` (new), `src/components/admin/AdminQuestionSubmissions.jsx` (new), `src/components/AdminPanel.jsx`, `src/App.jsx`, `src/screens/LobbyScreen.jsx`
  **Details**: Added the player question-submission feature - a "Predloži pitanje" entry point in the Lobby (signed-in only) writing to a new `questionSubmissions` Firestore collection, plus a "Predložena pitanja" admin review queue that approves straight into the existing `/api/questions` GitHub-commit merge pipeline.

- **Files Changed**: `src/constants/gameBalance.js`, `src/utils/leveling.js`, `src/utils/leveling.test.js`, `src/constants/levelTitles.js` (new), `src/constants/levelTitles.test.js` (new), `src/services/statsStore.js`, `src/utils/gameLogic.js`, `src/utils/gameLogic.test.js`, `src/constants/achievements.js` (audited, no changes needed), `src/App.jsx`, `src/components/GuideModal.jsx`
  **Details**: Economy rebalance - new quadratic XP curve (`25 * (level-1)^2`), streak coin milestones (3/5/10) replacing the old fixed-interval bonus, new joker prices (15/10/30), tiered level-up coin rewards (`getCoinsForLevelUp`), 50 Croatian level titles, achievement payouts (5xp/5coins normal, 10xp/10coins hidden - previously achievements paid nothing), a v1->v2 stats migration (xp/level reset, coins preserved), and a new level-up toast in `App.jsx` (there was none before - the `LEVEL_UP` event `gameLogic.js` emitted was previously discarded unread). Removed round-completion/perfect-round income (`COIN_PER_ROUND_COMPLETE`, `COIN_PERFECT_ROUND_BONUS`, `PERFECT_ROUND_XP_BONUS`).

- **Files Changed**: `src/services/firebase.js`, `src/components/admin/AdminQuestionSubmissions.jsx`
  **Details**: Community-question-approval reward - admin approving a submission now credits the submitter `+25 XP` / `+5 coins` via `awardCommunityQuestionReward`.

- **Files Changed**: `firestore.rules`
  **Details**: Added `users/{uid}/missions/{dateKey}` subcollection rule (owner-only read/write, date-format validated). Verified via Firestore emulator test (owner CRUD succeeds; non-owner/anonymous reads and writes denied; malformed date rejected) before deploying.

- **Files Changed**: `src/constants/missions.js` (new), `src/hooks/useDailyMissions.js` (new), `src/components/DailyMissionsModal.jsx` (new), `src/screens/LobbyScreen.jsx`, `src/App.jsx`, `src/hooks/useOneVsOne.js`, `src/hooks/useScoreSaving.js`, `src/components/MatchView.jsx`, `src/components/SubmitQuestionModal.jsx`
  **Details**: Daily micro-missions - 7-day rotating 3-slot schedule (2 coins/slot, +5 clean-sweep bonus), tracked in `users/{uid}/missions/{dateKey}` with a localStorage-first, write-through hook. Wired trigger events into 1v1 match completion (`useOneVsOne.js`, plus new 1v1 win XP/coins that hadn't been wired anywhere before), Daily Challenge completion (`useScoreSaving.js`, plus new Daily Challenge participation XP), category-correct/streak tracking (`App.jsx`'s `handleAnswer`), and question submission (`SubmitQuestionModal.jsx`). Added a Lobby widget (completed-slot count + Zagreb-midnight countdown) and a claim modal.

- **Files Changed**: `api/daily-challenge-payout.js`, `src/hooks/useDailyChallenge.js`, `src/components/GuideModal.jsx`
  **Details**: Daily Challenge payout expanded from single-winner-only to top-3 placement (tiered coins/XP, ties handled per-tier) plus a consecutive-1st-place win-streak coin bonus (`dailyWinStreak`/`lastDailyWinDate` on the user doc). Fixed the "you won yesterday" lobby banner, which read a `prizeEach` field this change removed, to instead compute the rank-1 prize from the new tiered/streak data.

- **Files Changed**: (production Firestore data, no code) `leaderboards/*/scores`, `dailyLeaderboards`, `dailyAttempts`, `dailyMeta`, `records/fastestPerfect`, `matchHistory`, `publicProfiles`
  **Details**: Post-rebalance data reset requested by Bong - deleted all category and Daily Challenge leaderboard scores, daily-attempt/payout-meta records, the fastest-perfect-round record, every player's 1v1 match history, and all public Rekordi-board profiles, via `firebase firestore:delete` under the already-authenticated CLI session (no service-account secret needed for pure deletes). Verified empty via a direct read afterward. `matches/{matchId}` documents themselves are undeletable by `firestore.rules` design (`allow delete: if false`) and were deliberately left orphaned/invisible rather than loosening that rule for a one-off cleanup.

- **Files Changed**: `src/services/firebase.js`, `src/components/admin/AdminPlayers.jsx`
  **Details**: Added `resetAllPlayerProgression()` and a "Resetiraj napredak svih igrača" AdminPanel button (Igrači tab), completing the data-reset above - resets every registered player's level/xp/achievements/totalGames/totalCorrect/categoryStats/streaks/total1v1Wins back to defaults, coins and identity fields untouched. This piece needs an authenticated admin write (can't be done via CLI delete), and the real service-account key can't be retrieved (Vercel "Sensitive" env vars are write-only, even to the project owner) - so unlike the deletes above, this is built as an admin-panel action for Bong to trigger himself while signed in, gated behind a type-`RESET`-to-confirm prompt given the blast radius.

- **Files Changed**: `src/components/GuideModal.jsx`, `src/components/WhatsNewModal.jsx` (new), `src/App.jsx`, `src/screens/LobbyScreen.jsx`
  **Details**: Filled in Vodič's missing sections for the economy rebalance (Titule, Dnevne misije, Zajednica) using live constants, not hardcoded copy. Added a one-time "Što je novo" modal (localStorage-gated, shown once on next load) explaining the rebalance and explicitly calling out that xp/level were reset while coins were preserved, plus a dismissible Lobby banner reminder visible through 2026-08-18.
