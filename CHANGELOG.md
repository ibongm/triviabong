# Changelog

### [2026-10-16] - CI on Node 22, all 7 rules suites, manual dispatch (audit M5)
- **Files Changed**:
  - `.github/workflows/ci.yml` (Modified)
  - `.github/workflows/e2e-emulator.yml` (Deleted)
- **Details**:
  - Both jobs move from Node 20 (EOL 2026-04-30) to Node 22.
  - Adds `workflow_dispatch`, needed to run CI on the bot PR branches (PRs opened with `GITHUB_TOKEN` don't trigger `pull_request`) and replacing the manual-only `e2e-emulator.yml`.
  - The `e2e` job now also runs `firestore-rules-counters`, `-explanations` and `-playtime` (previously never run in CI), so all 7 rules suites run.
  - Deleted `e2e-emulator.yml`: a manual-only copy of the `e2e` job that had already drifted (missing the security-audit suite).

### [2026-10-16] - Split the monolithic question chunk per category (audit H2)
- **Files Changed**:
  - `vite.config.js` (Modified)
- **Details**:
  - Removed the `manualChunks` rule that forced every `src/data/categories/*` module into one `questions-data` chunk (5.9 MB / 1.47 MB gzip), which defeated the per-category `import()` in `questionsLoader.js`. The build now emits one chunk per category (geografija 129 kB … pop_kultura 238 kB gzip; opca_znanje 8 kB). A single-category round downloads one chunk; Opće znanje, the Daily Challenge and 1v1 (`getAllQuestions`) still fetch all eight, now in parallel.

### [2026-10-16] - Workflows open PRs instead of pushing to main; untrack reports and root artifacts (audit H1, M4, L7)
- **Files Changed**:
  - `.github/workflows/generate-questions.yml` (Modified)
  - `.github/workflows/audit-category.yml` (Modified)
  - `.gitignore` (Modified)
  - `reports/audit_*_2026-10-10.md` (8 files, removed from tracking; kept on disk)
  - `AUDIT_REPORT.md`, `lighthouse-report.report.html`, `lighthouse-report.report.json`, `screenshots/*.png` (removed from tracking; kept on disk)
- **Details**:
  - `generate-questions.yml`: adds `pull-requests: write`; commits to `questions/<category>-<run_id>` and opens a PR with `gh pr create` instead of pushing to `main` (2026-10-10..15 pushed ~8.6k unreviewed questions straight to production). An empty run still exits cleanly.
  - `audit-category.yml`: drops `git add -f reports/` (it bypassed the `/reports/` gitignore in a public repo); uploads `reports/` as the `audit-<category>-<run_id>` artifact (`if: always()`); fixes go to `audit/<category>-<run_id>` + PR. Adds `pull-requests: write`.
  - PRs opened with `GITHUB_TOKEN` don't trigger `ci.yml`; both PR bodies say to run CI on the branch via workflow_dispatch before merging.
  - `.gitignore`: adds `lighthouse-report.*`, `/screenshots/` (output of `scripts/capture-audit-screens.mjs`), `/AUDIT_REPORT.md`. Nothing in the repo reads those files.

### [2026-10-16] - Dependency vulnerability remediation (npm audit 22 -> 8, critical 2 -> 0)
- **Files Changed**:
  - `package.json` (Modified)
  - `package-lock.json` (Modified)
- **Details**:
  - `npm audit fix` (no `--force`): `vitest` 3.0.8 -> 3.2.7 (still within the declared `^3.0.8`), its nested `vite` 6 -> 7, `@vitest/*` and `rollup`/`esbuild` platform binaries refreshed, `firebase-tools` 15.33 -> 15.34 (which drops `basic-ftp` and its parent chain, clearing that advisory with no pin). Lockfile diff is large because of those transitive moves (1048 -> 1000 packages).
  - `overrides` added next to `uuid`: `@grpc/grpc-js` `^1.14.6` (vulnerable 1.9.16 was pulled via `@firebase/firestore`; unifies on the already-installed patched copy), `postcss-selector-parser` `^7.1.6` (6.x has no patched release; built CSS is byte-identical), `@opentelemetry/core` `^2.8.0` (under `@google-cloud/pubsub` -> `firebase-tools`, CLI only), `tinypool` `^2.1.2` (critical prototype-pollution RCE; `npm audit fix` can't reach it without vitest 5; supports Node 20/22).
  - Considered and skipped: an `@vitest/mocker` `^4.1.11` override (works with vitest 3.2.7 in tests, but overrides a package vitest pins to its own version for a moderate dev-only advisory). No patched release exists for `braces`/`micromatch` (reached via Tailwind v3 `chokidar`/`fast-glob`, and `firebase-tools` -> `chokidar`); the only npm-offered fix is Tailwind 4, which AGENTS.md forbids. `firebase`/`firebase-tools` not downgraded, `--force` not used, `tailwindcss` stays v3.
  - Remaining 8 (0 critical, 6 high, 2 moderate): `braces`, `chokidar`, `micromatch`, `fast-glob`, `tailwindcss`, `firebase-tools` (all via `braces`/`chokidar`, build/CLI-time only) and `vitest` + `@vitest/mocker` (dev-only).
  - Verified: `npm test` (399), `npm run lint`, `npm run build` (CSS byte-identical to before), and all 7 Firestore rules suites (356 checks) under `firebase emulators:exec`.

### [2026-10-16] - Fix live 1v1 stalling after question 1; refresh stale E2E copy
- **Files Changed**:
  - `src/components/MatchView.jsx` (Modified)
  - `.claude/skills/run-triviabong/golden-path.mjs` (Modified)
  - `.claude/skills/run-triviabong/cross-device-sync-check.mjs` (Modified)
  - `.claude/skills/run-triviabong/two-player-match-check.mjs` (Modified)
  - `.claude/skills/run-triviabong/run-1v1-emulator-test.mjs` (Modified)
  - `scripts/async-duel-check.mjs` (Modified)
  - `scripts/capture-audit-screens.mjs` (Modified)
  - `.github/workflows/ci.yml` (Modified)
- **Details**:
  - `ci.yml`: the e2e job now runs `scripts/firestore-rules-security-audit.test.mjs` (the 98-check audit suite incl. the CEL date-helper probe) after the leagues rules test, against the already-running emulator.
  - `MatchView.jsx`: the reveal-advance effect depended on the whole `match` object (added by the 2026-10-11 lint pass, `f440067`). Every Firestore snapshot yields a new object, so any match update during the 3s reveal re-ran the effect: its cleanup cancelled the advance timer and the `advanceGuardRef` early-return blocked re-arming it, leaving both clients on "Sljedeće pitanje za 3s..." forever. The effect is now keyed on `status`/`currentQuestionIndex`/`matchId` only and reads scores from `matchRef` when the timer fires. Found via two-player-match-check.mjs, which stalled identically on the pre-audit rules (A/B-verified), so it is not caused by the security-audit rules.
  - E2E scripts: updated selectors/strings that the 2026-10-11 copy fixes made stale ("Izaberi Kategoriju Kvizova" -> "Odaberi kategoriju kvizova", "Povratak u Izbornik" -> "Povratak u izbornik", nickname placeholder "Unesite nadimak (Nickname)" -> "Unesite nadimak"). The CI e2e job could not have passed since that commit.
  - Verified on the emulator with the security-audit rules: golden-path, cross-device-sync, two-player-match (incl. tie -> sudden death -> draw) and async-duel checks all pass.

### [2026-10-16] - Security audit remediation (H1–H4, M1, M2, M4, L1–L4)
- **Files Changed**:
  - `firestore.rules` (Modified)
  - `src/services/firebase.js` (Modified)
  - `src/services/matches.js` (Modified)
  - `api/questions.js` (Modified)
  - `api/daily-challenge-payout.js` (Modified)
  - `src/utils/dailyChallengePayout.test.js` (Modified)
  - `scripts/firestore-rules-weekly-boards.test.mjs` (Modified)
  - `scripts/firestore-rules-security-audit.test.mjs` (Added)
- **Details**:
  - H1 (rules): `records/fastestPerfect` + `records/rekordiSummary` now require sign-in (admin bypass for rebuilds) and reject shrinking lists. fastestPerfect and rekordiSummary.bestScore entries get full shape checks; the four rekordiSummary profile lists get list bounds only (≤10, no shrink), because even a type-only check on the 40 entries a profile sync rewrites exceeds the 1000-expression limit (measured in the emulator). Only lists a write changes are validated. Entries are indexed once and index checks inlined, since each function call receiving a list re-costs its length. `saveScoreToFirestore` skips both record updates when signed out.
  - H2 (rules): `isCurrentZagrebDay()` window `[D 00:00Z − 2h, D 00:00Z + 23h05m)` (closes before the 23:10 UTC cron). `dailyAttempts` create requires doc id `== date + '_' + auth.uid` and today's date (blocks locking out other players). `dailyLeaderboards` create/update requires the current day.
  - H3 (rules): `match_over` only from the question-10 reveal (or question 9 with unequal scores), and `winnerUid` must equal the score-implied winner.
  - H4 (rules + client): `users/{uid}` create/update reject `role`, `dailyWinStreak`, `lastDailyWinDate` (trusted by the payout cron) and cap docs at 40 keys (~25 in use). `syncUserStatsToFirestore` strips `dailyWinStreak`/`lastDailyWinDate`, so a stale local copy can't fail the stats sync.
  - M1 (rules + test): weekly board create/update only for the current Zagreb ISO week (`isoWeekStart`/`isCurrentZagrebWeek`). Weekly test computes `WEEK` dynamically and covers past/future/ended weeks.
  - M2 (rules): a 1v1 score may only change in the same write as that player's answer, by ≤900 (one answer's max).
  - M4 (rules): mission docs restricted to `{dateKey (== doc id), slots{slot1..3}, cleanSweepClaimed: bool}`; read/write split.
  - L1 (rules): timeout forfeit with `winnerUid == caller` allowed only when the opponent's heartbeat doc is >40s stale (client threshold 45s). The auto-forfeit was previously always denied. Concessions unchanged.
  - L2 (API): `api/questions.js` category lookup uses `Object.hasOwn`. The raw GitHub error body is logged server-side, no longer returned.
  - L3 (API): cron auth via exported `isAuthorizedCron()` using `timingSafeEqual` with a length pre-check; unit-tested.
  - L4 (rules): `publicProfiles` get stays public, list requires sign-in (only admin views list it).
  - Tests: new emulator suite (98 checks) incl. a CEL probe confirming `int()` on `"08"`/`"09"`, month/year edges, leap day and 53-week years via the real helpers. All 7 rules suites pass (356 checks), plus 399 unit tests, build and lint.
  - Not deployed: rules need `firebase deploy --only firestore:rules` together with the client build.

### [2026-10-11] - Mobile (390px) UI audit remediation & Croatian copy fixes
- **Files Changed**:
  - `src/App.jsx` (Modified)
  - `src/screens/PlayingScreen.jsx` (Modified)
  - `src/screens/GameOverScreen.jsx` (Modified)
  - `src/screens/LobbyScreen.jsx` (Modified)
  - `plans/mobile-ui-audit-and-fix-plan.md` (Added)
- **Details**:
  - Touch Targets: Upgraded header badges, joker buttons (50:50, +10s, Preskoči), "Prijavi pitanje", and "Predloži pitanje" buttons to minimum 44px touch height (`min-h-[44px]`).
  - Text Truncation: Replaced `truncate` on answer option buttons in `PlayingScreen.jsx` with `break-words text-wrap leading-snug` to prevent answer text cutoffs on 390px mobile viewports.
  - Localization & Copy (`hr-HR`): Replaced English level label `Lvl` with `Raz.`, removed English `(Nickname)` from game over input placeholder, corrected title-casing on `Igraj ponovno`, `Povratak u izbornik`, and `Odaberi kategoriju kvizova`, and updated joker cost currency symbol from `c` to `z` (zlatnika).

### [2026-10-11] - Audit report remediation (CI, linting, security & workflow hardening)
- **Files Changed**:
  - `.claude/skills/run-triviabong/two-player-match-check.mjs` (Modified)
  - `.github/workflows/ci.yml` (Modified)
  - `.github/workflows/audit-category.yml` (Modified)
  - `src/App.jsx` (Modified)
  - `src/components/MatchView.jsx` (Modified)
  - `src/data/questionsLoader.js` (Modified)
  - `src/services/firebase.js` (Modified)
  - `package.json` (Modified)
  - `package-lock.json` (Modified)
- **Details**:
  - CI & E2E: Increased `maxIterations` budget in `two-player-match-check.mjs` from 90 to 130 (~91s) to prevent intermittent CI runner timeouts. Added top-level `permissions: contents: read` to `ci.yml` and removed `continue-on-error: true` to make linting a blocking gate.
  - Security & Workflows: Fixed shell injection in `audit-category.yml` by scoping inputs through environment variables and added a clean `git diff` check before committing.
  - Quality & Lint: Resolved all 12 ESLint errors and warnings in `App.jsx` and `MatchView.jsx` (unused imports, sync `setState` in effects via `queueMicrotask`, missing effect dependencies, ref-cached handler instances) while preserving `App.jsx` round orchestration rules.
  - Dependencies & Comments: Updated `vitest` to `^3.0.8` to resolve Vite 8 configuration mismatch (all 395 unit tests pass). Cleaned up stale question count comments in `questionsLoader.js` and `firebase.js`.

### [2026-10-11] - ui-styling Quick Start is Tailwind v3 only
- **Files Changed**:
  - `.agents/skills/ui-styling/SKILL.md` (Modified)
- **Details**: Replaced the Quick Start shadcn init, component example, and Tailwind v4 Vite install block with the repo rule: Tailwind CSS v3 utility classes only.

### [2026-10-11] - Repository audit report (CI, security, quality, PRs)
- **Files Changed**:
  - `AUDIT_REPORT.md` (Added)
  - `CHANGELOG.md` (Modified)
- **Details**: Read-only audit via `gh`, `npm audit`, `npm test`, `npm run lint` and git-history secret scan. Findings with PASS/WARN/FAIL status and prioritized actions are in `AUDIT_REPORT.md`. No source, workflow or config files were changed.

### [2026-10-11] - Tri-agent site audit plan, identified issues and findings
- **Files Changed**:
  - `siteaudit.md` (Modified)
- **Details**: Updated `siteaudit.md` with detailed problem reports (Vitest configuration import mismatch under Vite 8, git branch divergence of 7 remote commits and 6 uncommitted local files, 63 cross-pack question duplicates) alongside remediation instructions, Zoo Code audit results, and copy-paste prompts for Claude Code and Grok Build.

### [2026-10-11] - Security, backend and Firestore audit report
- **Files Changed**:
  - `siteaudit.md` (Modified - added section 6, Claude Code findings, Issues 18-35)
  - `CHANGELOG.md` (Modified)
- **Details**: Read-only audit of `firestore.rules`, the two `api/` functions, the Firebase service modules and the Admin Panel. Findings are ranked High/Medium/Low in `siteaudit.md`. Key items: stats sync writes a stale `playTime` that the rules reject (H1), and `records/*` is writable without auth (H2). No source or rules changes were made.

### [2026-10-11] - Mission fallback bars and Izazovi row on small screens
- **Files Changed**:
  - `src/components/DailyMissionsModal.jsx` (Modified)
  - `src/screens/LobbyScreen.jsx` (Modified)
- **Details**: The "ili:" alternative sits on its own line with a `tabular-nums` count pinned to the right, so a progress tick no longer wraps the count and pushes the bar. Mission cards wrap long Croatian copy, the claim button stays on one line, and the modal scrolls inside `max-h-[90vh]`. The lobby Izazovi row keeps its badge from colliding with the label.

### [2026-10-11] - Wire async-duel check into CI
- **Files Changed**:
  - `.github/workflows/ci.yml` (Modified)
  - `.github/workflows/e2e-emulator.yml` (Modified)
  - `.claude/skills/run-triviabong/SKILL.md` (Modified)
  - `CHANGELOG.md` (Modified)
- **Details**: Both workflows' dev-server step now also sets `VITE_FORCE_ASYNC_DUELS: 'true'` and run `node scripts/async-duel-check.mjs` (from the repo root) after the two-player match check. SKILL.md gained a "Run the async duel check" section covering the required `VITE_USE_FIREBASE_EMULATOR` + `VITE_FORCE_ASYNC_DUELS` flags, what it asserts, and the one-duel-per-emulator-session constraint.

### [2026-10-11] - NOTES.md session wrap-up
- **Files Changed**:
  - `NOTES.md` (Modified)
- **Details**: Replaced the previous wrap-up with this session's: async duel E2E check and emulator-only flag override shipped, UI polish committed, everything pushed. Next steps: wire the check into CI + SKILL.md, production smoke tests, first nightly cron run.

### [2026-10-11] - E2E check for async duels (emulator only)
- **Files Changed**:
  - `scripts/async-duel-check.mjs` (Created)
  - `src/constants/features.js` (Modified)
- **Details**: New Playwright driver for the full async duel lifecycle with `BongBotTest` (challenger) and `BongBotTest2` (opponent) in two concurrent contexts: challenge from the "Izazovi" modal, B plays its 10 questions from the inbox, A finishes, duel resolves to `complete`. Asserts the win/loss/draw outcomes are complementary and match the scores, then reads the Firestore emulator REST API for `winnerUid` vs. the stored results, `rewardClaimed` on both result docs, both `matchHistory` entries (`async: true`), and the winner's `total1v1Wins`. Fails on any console error; refuses non-localhost URLs. Credentials via the skill's `e2eCredentials.mjs`; Playwright resolved from `.claude/skills/run-triviabong/node_modules`. `FEATURES.ASYNC_DUELS` now evaluates to `true` only when both `VITE_USE_FIREBASE_EMULATOR=true` and `VITE_FORCE_ASYNC_DUELS=true` are set (default and production stay `false`). Run: emulators + `VITE_USE_FIREBASE_EMULATOR=true VITE_FORCE_ASYNC_DUELS=true npm run dev`, then `node scripts/async-duel-check.mjs`.

### [2026-10-11] - Async duels UI polish
- **Files Changed**:
  - `src/screens/AsyncDuelScreen.jsx` (Modified)
  - `src/components/AsyncDuelsModal.jsx` (Modified)
- **Details**: Play header is a three-column grid: truncated category, centered 20 s timer ring, tabular counter. Answer text wraps instead of truncating. Question review is a labeled two-column pair (Ti / protivnik, or Čeka). Modal title wraps beside the close button, player names truncate with the `na mreži` badge kept outside the ellipsis, inbox meta wraps, the close hover uses `slate-700`, and the error banner uses rose.

### [2026-10-11] - Flip MISSION_FALLBACKS on
- **Files Changed**:
  - `src/constants/features.js` (Modified)
- **Details**: `FEATURES.MISSION_FALLBACKS` `false` -> `true`. Social/submission mission slots now have a solo fallback path. No rules or index dependency. Rollback: set the flag back to `false`.

### [2026-10-11] - Root Firestore indexes file + rules suites verified
- **Files Changed**:
  - `firestore.indexes.json` (Created), `firestore.indexes.async-duels.json` (Deleted), `firebase.json` (Modified)
  - `api/daily-challenge-payout.js` (Modified, comment only), `HANDOFF.md` (Modified, section 5.3)
- **Details**: Exported the live index set (`firebase firestore:indexes` - it was empty), put the 4 `asyncDuels` composite indexes into a new root `firestore.indexes.json` and wired it into `firebase.json` (`firestore.indexes`), so `firebase deploy --only firestore:indexes` is now safe (live set + new, nothing to delete). Removed the superseded `firestore.indexes.async-duels.json`. Ran all 6 `scripts/firestore-rules-*.test.mjs` suites against the Firestore emulator - all pass (async-duels 80, weekly-boards 58, leagues 71, explanations 11, counters 21, playtime 12); no `firestore.rules` changes were needed. Nothing deployed.

### [2026-10-10] - Engagement plan Phase 6: private leagues (dark)
- **Files Changed**:
  - `src/utils/league.js` (Created), `src/utils/league.test.js` (Created), `src/constants/rulesCaps.test.js` (Modified)
  - `src/services/leagues.js` (Created), `src/hooks/useLeagues.js` (Created)
  - `src/components/LeaguesModal.jsx` (Created), `src/components/LeaguePage.jsx` (Created)
  - `src/components/admin/AdminLeagues.jsx` (Created), `src/components/AdminPanel.jsx` (Modified)
  - `src/screens/LobbyScreen.jsx` (Modified), `src/App.jsx` (Modified)
  - `firestore.rules` (Modified), `scripts/firestore-rules-leagues.test.mjs` (Created)
  - `.github/workflows/ci.yml` (Modified), `.github/workflows/e2e-emulator.yml` (Modified)
  - `CLAUDE.md` (Modified)
- **Details**:
  - **Private leagues (dark, `FEATURES.LEAGUES = false`).** Create a league (name + emoji), share a 6-character code or `/liga/CODE` link, up to 50 members, weekly table built from Phase 5's `weeklyBoards` data, daily mini-ranking, crown for last week's winner, challenge a member via the existing async-duel flow. Accounts required; no coins/XP.
  - **Rules.** New `leagues/{id}` (+ `members`), `leagueCodes/{code}` (get only, no list) and `users/{uid}/leagues/{id}` index. Create/join/leave/kick/hand-over are single `writeBatch`es tied together with `getAfter`/`existsAfter`; join uses `increment(1)` on `memberCount` because a joiner can't read the league; join requires the league's current code (regenerating locks out old links); last member leaving deletes the league. Rules NOT executed locally (no emulator in the sandbox); `scripts/firestore-rules-leagues.test.mjs` runs in both e2e workflows.
  - **Invite link.** `/liga/CODE` parsed once on load, kept in `sessionStorage`, removed from the address bar; modal opens after auth settles; signed-out visitors are asked to sign in first; invalid codes are ignored.
  - **Plan deviations.** `leagueCodes` carries `name`/`emoji` for the join preview; code/link visible to all members; member docs immutable (name = join-time name); 5-leagues-per-player cap is client-only.
  - **Admin.** Read-only "Lige" section with delete.
  - **Not done:** Playwright E2E for leagues, league achievement.
  - Verification: unit suite passes (395 tests, incl. 24 new league tests and the rules-cap tie); build passes; lint unchanged at the 12 pre-existing problems; headless-browser smoke test with the flag temporarily on (signed-out lobby row → sign-in prompt, `/liga/ABC234` stores the code, strips the URL and shows the sign-in-to-join prompt, `/liga/ABC230` ignored, no page errors), flag reverted afterwards. Signed-in flows and the rules are verified only by CI / Bong's emulator run.

### [2026-10-10] - Engagement plan Phase 5: weekly and seasonal leaderboards (dark)
- **Files Changed**:
  - `src/utils/periods.js` (Created), `src/utils/periods.test.js` (Created)
  - `src/utils/periodBoards.js` (Created), `src/utils/periodBoards.test.js` (Created), `src/utils/periodPayout.test.js` (Created)
  - `src/constants/seasons.js` (Created), `src/constants/rulesCaps.test.js` (Modified)
  - `src/services/periodBoards.js` (Created), `src/hooks/useScoreSaving.js` (Modified)
  - `src/hooks/usePreviousWeekSummary.js` (Created), `src/components/PeriodBoards.jsx` (Created)
  - `src/components/RekordiModal.jsx` (Modified), `src/screens/LobbyScreen.jsx` (Modified), `src/App.jsx` (Modified)
  - `firestore.rules` (Modified), `scripts/firestore-rules-weekly-boards.test.mjs` (Created)
  - `api/daily-challenge-payout.js` (Modified)
  - `.github/workflows/ci.yml` (Modified), `.github/workflows/e2e-emulator.yml` (Modified)
  - `CLAUDE.md` (Modified)
- **Details**:
  - **Weekly / seasonal boards (dark, `FEATURES.WEEKLY_BOARDS = false`).** Weekly rank = sum of a player's 5 best rounds that ISO week (Zagreb calendar); season rank = sum of their 5 best weekly totals. Solo and Daily Challenge rounds of signed-in players count; duels don't. Season 1 is provisional: 8 weeks from Monday 2026-10-26 (`2026-W44`), set in `src/constants/seasons.js`.
  - **Calendar helpers.** `periods.js`: ISO week key from a Zagreb date, week start/end, week arithmetic across year ends (2026 has 53 weeks), season lookup, exact countdown to Monday 00:00 Zagreb (correct across DST changes). Tests cover DST weekends, year boundaries, leap years and a 13-year round trip.
  - **Write path.** `recordPeriodScore` runs after the round's own save succeeded, fire-and-forget, in one transaction over the weekly and season docs; writes nothing for a round that doesn't raise the weekly total; never throws, never delays `SAVE_RETRY_DELAY_MS` flow.
  - **Rules.** New `weeklyBoards/{week}/players/{uid}`, `seasonBoards/{season}/players/{uid}` (owner-only; a weekly doc starts as one round and every update must be a single top-5 insertion with total growth <= 10000; season total can only rise, <= 10000 per write) and `badges/{uid}` (no client writes). Parent `weeklyBoards/{week}` / `seasonBoards/{season}` docs are payout metadata, Admin SDK only. Rules NOT executed locally (no emulator in the sandbox); `scripts/firestore-rules-weekly-boards.test.mjs` (58 cases incl. forged total, unsorted slots, someone else's doc, a client granting itself a badge, a forged half of the two-doc transaction) runs in both e2e workflows.
  - **Plan deviations.** No `rounds` counter on the weekly doc; season doc holds a `weeks` map instead of `w1..w5` (see CLAUDE.md for why).
  - **UI.** Rekordi modal gets tabs Tjedno | Sezona | Svih vremena when the flag is on (all-time view untouched); countdown, top 20, own row pinned with exact rank via count aggregation, season badges next to names, "no active season" state; 60 s in-memory cache. Lobby shows a one-time "Prošli tjedan: N. mjesto" card per week (acknowledgment in localStorage).
  - **Payouts and badges.** `runPeriodPayouts` in the nightly cron (independent of the daily payout, never throws): pays the last finished week's top 3 once (30/15/10 coins + 30/15/10 XP, ties in full, `paidAt` checked inside the transaction); when that week ends a season, awards `sN_gold/silver/bronze` and `sN_top10` badges once. Runs every night so a missed Sunday is caught up. Mirrors of the week/season/tier logic and reward constants are inlined in the cron and pinned by `periodPayout.test.js`, which also checks payout idempotency against an in-memory fake.
  - **Not done:** divisions (plan 5.7, deferred), "Tjedni pobjednik" / "Sezona: Top 10" achievements, a public-profile screen for badges (none exists in the client), a Playwright check for the boards.
  - Verification: unit suite passes (370 tests); build passes; lint unchanged at the 12 pre-existing problems; headless-browser smoke test with the flag temporarily on (tabs render, countdown matches the clock, "no active season" state, all-time tab unchanged), flag reverted afterwards.

### [2026-10-10] - Engagement plan Phase 4: async duels (dark)
- **Files Changed**:
  - `src/utils/asyncDuel.js` (Created), `src/utils/asyncDuel.test.js` (Created)
  - `src/utils/duelProgress.js` (Created), `src/utils/duelLabels.js` (Created)
  - `src/utils/oneVsOneReward.js` (Created), `src/utils/oneVsOneReward.test.js` (Created)
  - `src/utils/gameLogic.js` (Modified), `src/utils/gameLogic.test.js` (Modified), `src/components/MatchView.jsx` (Modified)
  - `src/services/asyncDuels.js` (Created), `src/hooks/useAsyncDuels.js` (Created)
  - `src/screens/AsyncDuelScreen.jsx` (Created), `src/components/AsyncDuelsModal.jsx` (Created)
  - `src/App.jsx` (Modified), `src/screens/LobbyScreen.jsx` (Modified), `src/components/MatchHistoryList.jsx` (Modified), `src/components/GuideModal.jsx` (Modified)
  - `src/hooks/useDailyMissions.js` (Modified), `src/constants/features.js` (Modified), `src/constants/rulesCaps.test.js` (Modified)
  - `firestore.rules` (Modified), `scripts/firestore-rules-async-duels.test.mjs` (Created), `firestore.indexes.async-duels.json` (Created)
  - `api/daily-challenge-payout.js` (Modified)
  - `.github/workflows/ci.yml` (Modified), `.github/workflows/e2e-emulator.yml` (Modified)
  - `CLAUDE.md` (Modified)
- **Details**:
  - **Async duels (dark, `FEATURES.ASYNC_DUELS = false`; `ASYNC_DUELS_ADMIN_PREVIEW` shows the UI to the verified admin only).** Ten questions per player, answered at different times within 48 h. Direct challenge or random-opponent pool (per category or "any", D8); 5 open duels as challenger (client-enforced); no `onSnapshot` listeners - inbox is fetched on lobby entry / tab return / refresh (30 s throttle). Live 1v1 files are untouched except `MatchView` calling the extracted `computeDuelAnswerScore` (same numbers, pinned by tests).
  - **Rules.** New `asyncDuels/{id}` and `results/{uid}` blocks: create/claim/complete/expire transitions, one result per player created `in_progress` before the first question, finish only `in_progress -> done` with capped numbers, the winner on `complete` must match the stored results (`getAfter`), reward claim once. `matchHistory` create accepts an optional boolean `async`. **Deviation from the plan:** the other player's result becomes readable once the reader's own run is `done` (not once the duel is `complete`), because the latter deadlocks if the finishing client dies before writing the winner; the plan's "finishedAt - startedAt <= 230 s" bound was dropped because it contradicts finalizing abandoned runs later. Rules are NOT yet executed - the emulator JAR can't be downloaded in the build sandbox; `scripts/firestore-rules-async-duels.test.mjs` (about 60 cases incl. every negative case in the plan) is now a step in both e2e workflows.
  - **Play/finish/rewards.** Answers kept in localStorage and written once; abandoned runs (>10 min) finalized with what was answered; `finishRun` = write my result, then complete the parent if the other side is done (`reconcileDuel` repairs a crash in between). Rewards: flag first, credit second; win = `applyOneVsOneWin` (+15 XP, +3 coins, `total1v1Wins`, achievements) per D7; `matchHistory` entry with `async: true`. Missions: `PLAY_1V1` when my side finishes, win-based missions + hybrid `matchDone` when the result resolves.
  - **UI.** Lobby "Izazovi" row with an "Imaš N izazova" badge (challenger name/category only, never a score); "Izazovi" modal (category incl. "Bilo koja kategorija", random opponent, online players + recent opponents, "Moji dvoboji"); play screen (20 s timer, no jokers); end screen / review with side-by-side correctness, plus explanation and "% igrača" lines when those flags are on. Guide section behind the flag.
  - **Expiry sweep.** `sweepExpiredDuels` in the nightly cron, independent of the payout, never throws, 500 per run.
  - **Indexes:** `firestore.indexes.async-duels.json` (4 composite indexes) - not wired into `firebase.json` on purpose; see CLAUDE.md.
  - **Not done:** the Playwright `async-duel-check.mjs` (can't be validated without the emulator + a browser here).
  - Verification: 313 unit tests pass (+28); build passes; lint unchanged at the 12 pre-existing problems; throwaway server-render check of the play, summary and modal screens passed.

### [2026-10-10] - Engagement plan Phase 3: difficulty tiers (dark)
- **Files Changed**:
  - `src/utils/difficulty.js` (Created), `src/utils/difficulty.test.js` (Created)
  - `src/utils/roundComposer.js` (Created), `src/utils/roundComposer.test.js` (Created)
  - `src/utils/questionMerge.js` (Modified), `src/utils/questionMerge.test.js` (Modified)
  - `src/utils/matchQuestions.js` (Modified), `src/utils/matchQuestions.test.js` (Modified)
  - `src/App.jsx` (Modified), `src/screens/PlayingScreen.jsx` (Modified)
  - `src/components/admin/AdminQuestions.jsx` (Modified)
  - `scripts/compute-difficulty.mjs` (Created), `.github/workflows/compute-difficulty.yml` (Created)
  - `scripts/generate-questions.mjs` (Modified)
  - `CLAUDE.md` (Modified)
- **Details**:
  - **Tiers (dark, `FEATURES.DIFFICULTY` / `DIFFICULTY_BADGE` = false).** Optional `difficulty`, `difficultyAccuracy`, `difficultySource` on questions. `validateEntry` accepts an optional valid `difficulty`; `mergeQuestions` carries it but always as source `guess` (only the compute script writes `stats`); `editQuestionById` already preserves the fields.
  - **Measuring.** `scripts/compute-difficulty.mjs` reads public `questionStats` via Firestore REST and tiers every question with >= 15 attempts (easy >= 75% correct, hard < 45%); under-15%-correct questions go to `reports/suspect_questions_<date>.md` for manual review. Manual workflow `compute-difficulty.yml` pushes to a new `difficulty/<run>` branch, never main. Dry-run and real write verified against fake stats; diff touched only the three new fields.
  - **Round shape.** `composeRound`: 3 easy / 4 medium / 3 hard, easy -> hard, uniform shuffle within tiers, untiered = medium, short tiers topped up from the rest. Used by `launchQuizRound` and by `pickMatchQuestionIds` for the 10 played 1v1 questions (reserve stays random). Flag off = byte-for-byte the old selection paths.
  - **UI.** Reveal line "Točno je odgovorilo N% igrača" (measured questions only) and an optional tier chip in `PlayingScreen`; admin Pitanja list shows tier/accuracy and has a tier filter incl. "Sumnjiva (<15% točnih)".
  - **Generator.** Gemini now returns `difficulty_guess`, stored as `difficulty` with source `guess`.
  - **Deliberately not done:** Daily Challenge reordering (a mid-day tier recompute would change the order for later players); score weighting by tier (D1).
  - Verification: 285 unit tests pass (+23); build passes; lint unchanged at the 12 pre-existing problems.

### [2026-10-10] - Engagement plan Phase 2: answer explanations (dark) + elapsedMs save fix
- **Files Changed**:
  - `src/utils/questionMerge.js` (Modified), `src/utils/questionMerge.test.js` (Modified)
  - `src/App.jsx` (Modified), `src/screens/PlayingScreen.jsx` (Modified)
  - `src/components/QuestionReview.jsx` (Modified), `src/components/MatchView.jsx` (Modified)
  - `src/components/SubmitQuestionModal.jsx` (Modified), `src/components/admin/AdminQuestionSubmissions.jsx` (Modified), `src/components/admin/AdminQuestions.jsx` (Modified)
  - `src/components/ReportQuestionModal.jsx` (Modified), `src/constants/reportReasons.js` (Modified), `src/constants/reportReasons.test.js` (Created)
  - `src/components/GuideModal.jsx` (Modified)
  - `src/hooks/useScoreSaving.js` (Modified), `src/constants/gameBalance.js` (Modified), `src/constants/rulesCaps.test.js` (Modified)
  - `firestore.rules` (Modified), `scripts/firestore-rules-explanations.test.mjs` (Created)
  - `scripts/generate-questions.mjs` (Modified), `scripts/generate-explanations.mjs` (Created), `scripts/apply-explanations.mjs` (Created), `.github/workflows/generate-explanations.yml` (Created)
  - `.claude/skills/run-triviabong/golden-path.mjs` (Modified)
  - `CLAUDE.md` (Modified)
- **Details**:
  - **Explanations (dark, `FEATURES.EXPLANATIONS = false`).** Optional `explanation` (<= 220 chars) on questions. Per decision D5, solo rounds pause after EVERY answer or timeout on a question that has one: the explanation appears under the answers with a "Dalje" button (Enter/Space also works); jokers stay disabled; the report button works, so a wrong explanation can be reported on the spot. Questions without one keep the 1.2s auto-advance. Daily Challenge never pauses (explanations only in its end review). 1v1 shows a collapsible "Pregled pitanja s objašnjenjima" on the match-over screen only. `QuestionReview` shows explanations under each answer.
  - Paused time is excluded from the round's duration via `pausedMsRef` (the secret-achievement overlay now uses it too; its old `roundStartTime` shift never reached `applyRoundEndRewards`, whose deferred callbacks close over the earlier value).
  - **Bug fix (live, not flag-gated): score saves could be rejected for `elapsedMs`.** `saveScore` computed `Date.now() - roundStartTime` at SAVE time, so time spent on the game-over screen counted - a player who finished signed out and signed in later to save could exceed the rules' `elapsedMs <= 200000`, which rejects the whole leaderboard entry. Now the active duration is captured once at round end (`finalRoundElapsedMs`) and sent only when within the cap (`MAX_ROUND_ELAPSED_MS`), otherwise omitted (the field is optional). Possibly related to the 2026-10-02 report of a 10/10 victory that never reached the leaderboard.
  - **Content tooling:** `validateEntry` checks the field; `mergeQuestions` carries it; `editQuestionById` can set/keep/remove it (admin edit form gets a textarea with a counter). Generator now requires an explanation from Gemini (over-long ones are dropped, the question kept). New `generate-explanations.mjs` drafts explanations for existing questions into a review file pushed to a NEW branch by the workflow (never to main), and writes questions the model believes have a wrong answer to a separate `_PROVJERITI.json`. New `apply-explanations.mjs` applies a reviewed file by id across all category files, never overwriting without `--force`; output formatting verified identical to the existing files.
  - **Submissions & reports (need the rules deploy before flipping the flag):** players can add an optional explanation when suggesting a question (field only shown/sent while the flag is on); approval passes it through to the bank. New report reason "Objašnjenje je netočno" (`wrong_explanation`), offered only for questions that have an explanation. `firestore.rules`: `questionSubmissions` allows optional `explanation` (1-220 chars); `reports.reason` enum gains `wrong_explanation`.
  - **E2E:** `golden-path.mjs` clicks "Dalje" when present, so it keeps working once the flag is on.
  - Verification: 262 unit tests pass (+17). Throwaway server-render smoke test (not committed) confirmed the explanation box and "Dalje" render only when expected. Generator/backfill/apply scripts exercised end to end with a stubbed Gemini response (category files restored afterwards). Lint unchanged at the pre-existing 12. Build passes; questions chunk unchanged in size until explanations are actually added. **Not run here:** `scripts/firestore-rules-explanations.test.mjs` (the emulator JAR download is blocked in this environment) and the E2E suite (no browser) - run both before deploying rules.

### [2026-10-10] - Engagement plan Phase 1: mission fallbacks + four mission bug fixes
- **Files Changed**:
  - `src/constants/missions.js` (Modified)
  - `src/utils/missionProgress.js` (Created)
  - `src/utils/missionProgress.test.js` (Created)
  - `src/hooks/useDailyMissions.js` (Modified)
  - `src/components/DailyMissionsModal.jsx` (Modified)
  - `src/components/ReportQuestionModal.jsx` (Modified)
  - `src/components/GuideModal.jsx` (Modified)
  - `src/App.jsx` (Modified)
  - `CLAUDE.md` (Modified)
- **Details**:
  - **Mission fallbacks (dark, `FEATURES.MISSION_FALLBACKS = false`).** Every slot that needs another player or a question submission gets an `alt`: Mon/Fri "play N duels" → finish 3/4 solo rounds; Wed/Sat "win N duels" → finish 2/3 rounds with 7+ correct; Wed "win without jokers" → finish a solo round without jokers; Thu hybrid → Daily Challenge + 1 solo round; Sun "2 wins with 80%+" → 2 rounds with 9+ correct; Mon/Thu "suggest a question" → report a question with an error. A slot completes when either path reaches its own target; `progress`/`altProgress` never add up; `completedVia` records which path. Old mission docs without `altProgress` read as 0. Rewards unchanged.
  - New events: `recordSoloRoundComplete` (called once from `applyRoundEndRewards`, non-daily rounds only, outside any setState updater) and `recordQuestionReported` (from `ReportQuestionModal`, only after a successful write). With the flag off, the hook strips all alts, so behavior is identical to before.
  - `DailyMissionsModal`: second "ili: ..." line with its own thinner bar per slot; status shows "Riješeno alternativom" when done that way. `GuideModal` gets one flag-gated paragraph.
  - Progress logic extracted to pure `src/utils/missionProgress.js`.
  - **Bug fix (live immediately, not flag-gated): category progress clobbered by streak writes.** `handleAnswer` calls `recordCorrectCategory` then `recordStreak` in the same handler; each `record` started from the same closure `state`, and the STREAK update always returned a new object, so its write overwrote the category increment. On Tuesday (Znanost + streak 5) and Saturday (Sport + streak 10) the category slot couldn't advance until the streak slot was completed. The hook now reads and advances a `stateRef`.
  - **Bug fix: long-form category tags never counted.** `CATEGORY_CORRECT` compared `m.category === categoryKey`, but 220 Znanost questions are tagged `znanost_i_tehnologija` and 200 Književnost questions `knjizevnost_i_umjetnost` (the mission says `znanost`/`knjizevnost`). Now both sides go through `resolveCategoryKey`.
  - **Bug fix: Friday's "75%+ in the Daily Challenge" was impossible.** It had `target: 75` with +1 per qualifying run. Now `target: 1, accuracy: 75`, matching `WIN_1V1_ACCURACY`'s shape; the matcher reads `m.accuracy`.
  - **Bug fix: double-tap could claim a slot twice.** `claimSlot`/`claimCleanSweep` checked the render's `state`; they now check `stateRef`, so a second tap sees the slot as already claimed.
  - No Firestore rules change needed (`users/{uid}/missions/{dateKey}` has no field validation).
  - Verification: 245 unit tests pass (+22: both paths alone, no summing, completed slots frozen, clamping, STREAK peak, old docs, composed back-to-back events, minCorrect filter on alts, both category spellings, hybrid via match/solo, schedule invariant that every social slot has an alt, Friday accuracy completable). Lint unchanged at the pre-existing 12 (untouched parts of `App.jsx`). Build passes. E2E not run locally (no browser here); runs in CI on the PR.

### [2026-10-10] - Engagement plan Phase 0: stable Daily Challenge, generator validation, uniform shuffles, flags
- **Files Changed**:
  - `src/utils/dailySeed.js` (Modified)
  - `src/utils/dailySeed.test.js` (Created)
  - `src/utils/questionMerge.js` (Modified)
  - `src/utils/questionMerge.test.js` (Modified)
  - `scripts/generate-questions.mjs` (Modified)
  - `.github/workflows/generate-questions.yml` (Modified)
  - `scripts/report-duplicate-questions.mjs` (Created)
  - `src/utils/questionUtils.js` (Modified)
  - `src/utils/questionUtils.test.js` (Created)
  - `src/App.jsx` (Modified)
  - `src/utils/matchQuestions.js` (Modified, comment only)
  - `src/constants/missions.js` (Modified)
  - `src/constants/missions.test.js` (Created)
  - `src/hooks/useDailyMissions.js` (Modified)
  - `src/constants/features.js` (Created)
  - `CLAUDE.md` (Modified)
- **Details**:
  - **Daily Challenge set no longer changes mid-day.** `getDailyChallengeQuestions` seeded-shuffled the whole question pool, so any question added anywhere changed the pool length and reshuffled the entire day's set - and the generator workflow commits (auto-deploys) several times a day. Players before and after a deploy got different questions on one shared leaderboard/payout. New pure `selectDailyQuestions` ranks each question by a murmur-finalized hash of `(dateKey, id)` and takes the lowest 10; questions with `addedOn >= dateKey` are ineligible. Adding/removing unrelated questions can't alter a day's set. The set for the deploy day itself changes once, at deploy.
  - **`addedOn` stamping.** `mergeQuestions` now stamps `addedOn` (Zagreb date, new `getZagrebDateKey`) on every added question - covers both the admin upload (`api/questions.js` and its preview, which share the function) and the generator. Optional `otherQuestionTexts` (built with new `buildQuestionTextIndex`) adds cross-category dedupe. `editQuestionById` now spreads the original entry so admin edits no longer strip non-core fields.
  - **Generator goes through shared validation.** `generate-questions.mjs` previously wrote Gemini output straight to the file: no `validateEntry`, prompt-only dedupe (last 60 questions), and its own prefixes (`hr_his_`/`hr_spo_` instead of `hr_hist_`/`hr_sport_` - 120 such ids exist now and are deliberately left unchanged). It now validates each entry (rejections logged), merges via `mergeQuestions` with whole-bank dedupe and `ID_PREFIXES`, rejects unknown categories and counts outside 1-200, and supports `--dry-run`. Verified with a stubbed Gemini response: a cross-category duplicate was skipped, two malformed entries rejected, the new id was `hr_hist_1029`, and the file was untouched in dry-run.
  - **Workflow:** installs project deps (`npm ci`) since the script now imports `src/utils/questionMerge.js`; passes inputs via env instead of interpolating them into the shell; exits cleanly when a run adds nothing instead of failing on an empty commit.
  - **Duplicate report:** new read-only `report-duplicate-questions.mjs`. Current bank: 57 duplicate groups / 62 removable copies, 50 of them within a single file (the generator's prompt-only dedupe), 4 groups with conflicting correct answers.
  - **Uniform shuffles.** `shuffleArray` used `sort(() => Math.random() - 0.5)`; measured over 200k runs it put the first option - always the correct answer, per `getQuestionOptions` - in position A 35.8% and D 31.1% of the time (vs 25%). Now Fisher-Yates (optional PRNG param). `launchQuizRound` uses it instead of its own sort-based shuffle. Live 1v1 option order is unaffected (it has its own seeded shuffle).
  - **Missions weekday from the Zagreb date.** `getMissionsForDate(new Date())` used the device's local weekday while the progress doc is keyed by the Zagreb date; replaced with `getMissionsForDateKey(dateKey)` + `weekdayOfDateKey`.
  - **Feature flags:** `src/constants/features.js`, all `false`, for the upcoming phases.
  - **Deviation from the plan:** `firestore.indexes.json` was NOT created. Composite indexes currently exist only in the Firebase console (e.g. `getPlayerBestScoreForCategory` needs one), and deploying an incomplete indexes file offers to delete everything missing from it. Documented in CLAUDE.md: export the live set first (`firebase firestore:indexes > firestore.indexes.json`); deferred to Phase 4, the first phase that needs a new index.
  - `CLAUDE.md`: fixed the stale flat-500-XP leveling description and the dangling "1v1 live match" reference; documented daily selection, `addedOn`, the generator, shuffling, flags and indexes.
  - Verification: 223 unit tests pass (+29: daily selection incl. "adding same-day questions leaves the set unchanged", merge stamping/cross-bank dedupe/edit preservation, Zagreb date edges, shuffle uniformity within 23-27% per position, mission weekdays incl. DST and year boundary). Lint unchanged at the pre-existing 12 problems (all in untouched parts of `App.jsx`). Build passes. E2E not run locally (no browser available in this environment) - CI's emulator e2e job runs on the branch push.

### [2026-10-10] - Fix Generate Category Questions failing to push
- **Files Changed**:
  - `.github/workflows/generate-questions.yml` (Modified)
- **Details**:
  - Every run failed in "Commit and Push to Main" with `cannot pull with rebase: You have unstaged changes` (exit 128), so generated questions were committed on the runner and then discarded. Cause: `npm install @google/genai` (not a listed dependency) rewrote the tracked `package.json` and `package-lock.json`, and those unstaged edits blocked `git pull --rebase`.
  - Install step now uses `npm install --no-save @google/genai`, and the commit step runs `git stash --include-untracked` before the pull - the same fix already applied to `audit-category.yml`.

### [2026-10-02] - Surface failed score saves + auto-retry
- **Files Changed**:
  - `src/hooks/useScoreSaving.js` (Modified)
- **Details**:
  - `saveScore` and `submitDaily` now rethrow after logging/rolling back, instead of swallowing the error. Previously a failed save left GameOverScreen on "Spremanje rezultata..." forever, because the auto-save effect's `catch` (which sets `autoSaveFailed`) and the retry button's `.catch` never fired. Found after a 10/10 Geografija victory (5132) never reached the leaderboard.
  - Added one automatic retry (after `SAVE_RETRY_DELAY_MS` = 1500ms) of the leaderboard write before reporting failure.

### [2026-09-13] - Add PWA support and update favicon
- **Files Changed**:
  - `index.html` (Modified)
  - `public/manifest.json` (Created)
  - `public/icon-192.png` (Created)
  - `public/icon-512.png` (Created)
  - `public/screenshot-desktop.png` (Created)
  - `public/screenshot-mobile .png` (Created)
  - `Plan1.txt` (Created)
  - `.gitignore` (Modified)
- **Details**:
  - Switched favicon from SVG to PNG (`icon-192.png`) and added `<link rel="manifest">` to `index.html`
  - Added `public/manifest.json` for PWA configuration
  - Added 192×192 and 512×512 PWA icons
  - Added desktop and mobile PWA screenshots
  - Added `Plan1.txt` planning document
  - Updated `.gitignore` to exclude `/.agent/`, `/.agents/`, and `/scratch/` directories from version control

### [2026-08-22] - Fix 1v1 duels ignoring the chosen category
- **Files Changed**:
  - `src/utils/matchQuestions.js` (Modified)
  - `src/utils/matchQuestions.test.js` (Modified)
- **Details**:
  - `pickMatchQuestionIds` concatenated the chosen category's pool with the **full** question set and shuffled the two together, then took 11. Because the aggregate pool is ~5,949 questions and a category holds only a few hundred, the category was diluted to noise: a "Geografija" duel served roughly **14%** Geografija questions and the rest from everywhere else. Players picking a category for a duel were effectively getting random questions.
  - The local was already named `fallbackPool`, so the intent was clearly "top up only if this category is short" - the concatenation was an implementation slip, not a design choice.
  - Now the category pool is shuffled and sliced on its own, and the wider set is consulted **only** when that category holds fewer than the 11 needed, excluding ids already picked so a top-up can't duplicate one. Opće znanje needs no special case: `getQuestionsByCategory` already returns the whole aggregate pool for it (`AGGREGATE_CATEGORIES`), so the top-up never triggers.
  - Found via the same-day 1v1 insights work: a Geografija match logged `hr_hist_*` ids into the new per-question counters, which is only visible now that duels feed those counters at all.
  - Verified end-to-end on the emulator - a Sport duel produced **11 questionStats docs, all `hr_sport_*`, `{"sport": 11}`**, against the mixed `hr_geo_*`/`hr_hist_*` spread the same check showed before the fix. Plus 8 new unit tests (194 total) using a mocked loader: asserts across 20 runs that every pick comes from the chosen category, that picks never repeat within a match, that results vary between matches, and that a short category tops up to 11 without duplicating.

### [2026-08-22] - Feed 1v1 duels into the admin content-insights
- **Files Changed**:
  - `src/components/MatchView.jsx` (Modified)
- **Details**:
  - 1v1 was **entirely invisible** to the admin Pregled: `logQuestionAttempt`/`logGameResult` were only ever called from `App.jsx`'s solo round path, so duel category choices never reached Popularnost Kategorija and no duel answer ever reached Preciznost Pitanja. Found by playing three production duels (Geografija/Sport/Glazba) and observing `categoryStats` unchanged when read live from Firestore.
  - `MatchView` now logs its own side on both paths: answered questions from `handleAnswer`, and **timed-out questions from the reveal effect**. The timeout case matters - without it 1v1 accuracy would be systematically inflated on exactly the hard questions players give up on, which is the signal that table exists to surface. A new `attemptLoggedGuardRef` keeps the two paths (and re-renders) from double-logging one question.
  - Each client logs only its own side, so a duel counts as **two plays and two attempts per question** - correct, since two players really did choose that category and answer that question, and it keeps `avgScore` a per-player figure.
  - Attributes each attempt to the **question's own** `category`, not the match category - same reasoning as solo, since Opće znanje is an aggregate pool.
  - `questionsAnswered`/`correctAnswers` are deliberately omitted from `logGameResult`: a match runs up to 11 questions (0-9 plus sudden death) but `firestore.rules` caps both at 10, so sending them would get the whole write **rejected**. Both are optional in that rule and unused by the insights tables. Score is clamped to the same 0-10000 ceiling the rules enforce.
  - Caveat: duel wins now blend into Popularnost Kategorija's "Postotak pobjeda" alongside solo victories, which mean different things (finishing a round vs beating an opponent). Accuracy and plays are unaffected.
  - Verified on the emulator from empty counters, with no solo rounds played: one duel produced `categoryStats/geografija` **plays=2, totalScore=2640** (= the reported 1320 x 2), **victories=0** (it was a draw), and **11 questionStats docs / 22 attempts** (11 questions x 2 players) with **0** `wrong == total - correct` violations. 186 unit tests pass; no new lint problems.

### [2026-08-22] - Rebuild play-time history from sessions (repairs the admin Danas/Tjedan/Ukupno columns)
- **Files Changed**:
  - `src/utils/sessionStats.js` (Modified)
  - `src/utils/sessionStats.test.js` (Modified)
  - `src/services/firebase.js` (Modified)
  - `src/components/admin/AdminPlayers.jsx` (Modified)
- **Details**:
  - Fallout from moving play-time onto `users/{uid}.playTime` earlier today: those counters started at **zero**, so the admin player list showed "Manje od minute" for every player - including long-standing ones - even though the `sessions` collection still held the full history. Spotted while walking the live admin panel. The per-player **Detalji** view was never affected: it reads `getSessionsForUser` directly and still showed real figures (verified live: Andrej Lekic, Ukupno = 2 min). Only the list columns lost history.
  - Added `buildPlayTimeFromSessions` (pure, in `sessionStats.js`) and the admin-only `recomputePlayTimeFromSessions()`, wired to a confirm-gated **"Obnovi vrijeme igre"** button in `AdminPlayers`. `total` sums every session ever; `days` keeps only the retention window, matching what `addPlayTime`/`pruneUserPlayTimeDays` maintain going forward. Buckets by session start date - the same approximation `sumSessionsByUid` already made.
  - Writes the whole `playTime` map with `updateDoc` (absolute, not `increment`) so a rerun corrects drift rather than compounding it; batched under `writeBatch`'s 500-op cap. **No rules change or deploy needed** - `users/{uid}` already allows unconditional admin updates.
  - Deliberately manual and expensive: it runs the very `getAllSessions()` scan that moving to counters removed from the admin read path. One-off repair, not routine. Documented caveat: a client with a live session open when it runs still holds its own "already written" marker, so that session can be double-counted until the tab reloads - prefer running it when nobody is mid-session.
  - 8 new tests (186 total), including a round-trip asserting the rebuilt buckets read back correctly through `summarizePlayTimeByUid` (daily/weekly/all-time), that ancient sessions count toward `total` but not `days`, and that same-day sessions merge into one bucket.

### [2026-08-22] - Move E2E account passwords out of the public repo, and refuse to guess them
- **Files Changed**:
  - `.claude/skills/run-triviabong/e2eCredentials.mjs` (Created)
  - `.claude/skills/run-triviabong/two-player-match-check.mjs` (Modified)
  - `.claude/skills/run-triviabong/cross-device-sync-check.mjs` (Modified)
  - `.claude/skills/run-triviabong/run-1v1-emulator-test.mjs` (Modified, comment only)
  - `.claude/skills/run-triviabong/SKILL.md` (Modified)
- **Details**:
  - This repo is **public** (`githubRepoVisibility: public`), and the passwords for the two shared E2E accounts on live Firebase Auth were committed in plaintext in both driver scripts and spelled out in `SKILL.md`. Passwords now come from `E2E_PASSWORD` / `E2E_PASSWORD_2`; the emails stay in source, since they're `@example.com` identifiers the scripts assert on rather than secrets.
  - **The guard matters more than the move.** `signIn()` is login-*or-register*: against a real project a wrong or missing password doesn't fail, it quietly creates a new account - precisely the junk-account accumulation CLAUDE.md already records (generated names breaching the 20-char `displayName` cap and silently breaking the admin "Popuni sve profile" backfill). `e2eCredentials.mjs` therefore **throws before a browser is opened** when the target isn't localhost and the vars are unset, naming the missing one.
  - **CI and emulator runs stay zero-config.** Both workflows invoke the scripts with no URL argument, so they default to `http://localhost:5173`; a localhost target with no env vars falls back to an obviously-fake constant, and since emulator state is wiped per run the existing register-on-first-use path handles it. No GitHub secret needed.
  - `run-1v1-emulator-test.mjs` is deliberately exempt and now says why: its emails are generated per run and only ever exist in the emulator, so routing them through the resolver would imply a secret that doesn't exist.
  - **Still requires the user:** rotating both passwords. Moving them out of the repo achieves nothing while the old ones still work, and the old values remain in git history regardless - rewriting history on a public repo is disruptive and incomplete (forks, caches, GitHub's own copies), so **rotation is the remedy, not scrubbing**.
  - **The console can't do that rotation.** Firebase Auth's user list offers only "Reset password", which emails a link - and these accounts use `@example.com`, an IANA-reserved domain that accepts no mail, so the link can never arrive. There is no "set password" in the console UI either. Added `scripts/rotate-e2e-passwords.mjs`: signs in with the *current* password and calls `updatePassword`, needing no service-account key (unlike `scripts/set-admin-claim.mjs`). Reads current/new values from `E2E_PASSWORD`/`E2E_NEW_PASSWORD` and `E2E_PASSWORD_2`/`E2E_NEW_PASSWORD_2`; nothing is stored in the file. Refuses no-op rotations, mismatched pairs, and sub-6-character passwords before contacting Firebase. Guards verified locally; the rotation path itself is deliberately left for the user to run, since it needs the real credentials and mutates production.
  - Note the exposure is not merely "someone could read scores as a test user": because the old passwords are public, anyone could sign in and rotate them first, locking the owner out of both accounts.
  - Verification: guard confirmed - both scripts exit 1 immediately against `https://triviabong.vercel.app` with no env vars, without launching a browser or touching production. Zero-config emulator path re-run end to end: `cross-device-sync-check` and `two-player-match-check` both **ALL PASSED** with 0 console errors, the latter with both clients agreeing on the final score (960—960) and complementary outcomes. `grep` confirms zero occurrences of either old password anywhere in the repo. 178 unit tests pass; lint unchanged at its pre-existing baseline (no app code touched).

### [2026-08-22] - Filter presence reads, move play-time onto user docs, TTL the transient collections
- **Files Changed**:
  - `src/services/firebase.js` (Modified)
  - `src/hooks/useSessionTracking.js` (Modified)
  - `src/utils/sessionStats.js` (Modified)
  - `src/utils/sessionStats.test.js` (Modified)
  - `src/components/admin/AdminPlayers.jsx` (Modified)
  - `src/App.jsx` (Modified)
  - `firestore.rules` (Modified)
  - `scripts/firestore-rules-playtime.test.mjs` (Created)
- **Details**:
  - **Presence reads are now filtered server-side.** `subscribeToOnlinePlayers` subscribed to the *unfiltered* `presence` collection and filtered client-side, so every lobby entry paid an initial snapshot over every doc - and because `deletePresence` only runs on explicit logout (there is no reliable unload event), each closed tab leaks a doc permanently: production held 11, of which ~9 were stale, the oldest from the previous evening. Now `where('lastHeartbeat', '>=', now - ONLINE_THRESHOLD_MS)`; single-field range filter, so Firestore's automatic indexes serve it and no `firestore.indexes.json` is needed. The client-side `filterOnlinePlayers` pass stays and stays authoritative - the cutoff is fixed at subscribe time, so players going stale mid-session still need it.
  - **Correction to an earlier claim in this session:** the presence listener was described as re-reading the whole collection on every change. It doesn't - Firestore bills a listener's initial snapshot plus one read per *changed* document. The cost was the snapshot size, not a repeated full read.
  - **Play-time moved off the sessions scan.** Added `playTime: { total, days: { 'YYYY-MM-DD': seconds } }` to `users/{uid}`, incremented from `useSessionTracking`'s existing 90s heartbeat via `addPlayTime` (dotted-path `increment()`, so concurrent tabs can't clobber each other). `AdminPlayers` already fetches every user, so the Danas/Tjedan/Ukupno columns now cost **zero extra reads** and `getAllSessions()` - by its own comment the most expensive read in the panel, growing with every session ever - is gone from the admin path. `sessions` and `getSessionsForUser` are **kept**: AdminPlayerDetail still needs the per-gameState breakdown and that query is already uid-scoped.
  - Day buckets are pruned to `PLAY_TIME_DAYS_KEPT` (9) by `pruneUserPlayTimeDays`, called from the login path that already reads the user doc - so pruning costs no extra read. `all` comes from the running `total`, not a sum of retained buckets, so trimming never rewrites history.
  - `AdminPlayers` derives the totals with `useMemo` over the already-fetched `users` and a `now` captured in a lazy `useState` initializer. First attempt used an effect + `setState`, which the repo's `react-hooks/set-state-in-effect` rule correctly rejected.
  - **TTL: fields shipped, policies BLOCKED on the Spark plan.** Added `expiresAt` to `sessions` (90d) and `presence` (24h, refreshed every heartbeat so an active player never expires), and extended both `hasOnly` allowlists in `firestore.rules` to permit it. Creating the actual TTL policy then failed in the Cloud console with `403: Project triviabong-web has billing disabled. Please enable it.` - **Firestore TTL requires Blaze**, which the docs don't state plainly. The `expiresAt` fields are left in place: they're written, rules-validated, and cost a few bytes, so the policies can be created the moment billing is enabled - but until then **nothing is being deleted**, and this slice delivers no saving on its own.
  - TTL was **deliberately NOT applied to `questionAttempts`/`gameResults`** regardless of plan: those are what `recomputeContentInsightStats()` rebuilds the counters from using absolute `setDoc`, so expiring them would make a later rebuild silently *shrink* the counters rather than merely cap storage - a data-loss footgun, not a saving. When TTL does become available, apply it only to `sessions` and `presence`.
  - **Investigated and deliberately left alone:** `getUserStatsFromFirestore`'s `getDocFromServer`, the only page-load read that can never come from cache (1, rarely 2, per signed-in load). Serving it cache-first isn't a tuning knob - it *is* the cross-device bug the `hasPendingWrites` dance guards against: a returning device would show stats another device has moved past, and on a brand-new device the cache is empty so it hits the server regardless. The second read is already conditional, and `App.jsx` calls it once per auth resolution (`onAuthStateChanged`, which token refreshes don't trigger). Conclusion recorded in the function's comment so it isn't re-litigated.
  - `playTimeDelta` extracted from the hook and unit-tested: session docs hold *cumulative* totals and are rewritten whole each heartbeat, while `playTime` is increment-based, so a heartbeat must send only the new seconds. Sending the cumulative figure would re-add the whole session every 90s - the same inflation class as the flush bug fixed in `a56f6a8`.
  - `firestore.rules` bounds `playTime.total` as a non-negative int that can only ever increase. Rules cannot validate the delta of a nested map field, so the per-write cap (`MAX_PLAY_TIME_DELTA_SECONDS`) necessarily lives client-side; the rule bounds direction, the client bounds magnitude.
  - Verification: **178 unit tests** (+19); `scripts/firestore-rules-playtime.test.mjs` (12 assertions - owner may increment, may not decrease/negate/pass a non-int, another player is denied, `role` still protected, `expiresAt` accepted and type-checked on sessions/presence, unknown fields still rejected) and the existing counters suite (21) both green on the emulator; `golden-path.mjs` and `cross-device-sync-check.mjs` both pass against the emulator with **0 console errors** - the latter specifically confirming the new prune call on the login path didn't disturb the cross-device stats race. Emulator docs inspected directly: `sessions.expiresAt` ~90d out, `presence.expiresAt` ~24h out. `playTime` itself is not exercised by the E2E scripts, whose rounds are shorter than the 90s heartbeat - hence the extracted, unit-tested delta helper.

### [2026-08-22] - Fix /admin 404, bound the Pregled read cost for real, correct the question-count figure
- **Files Changed**:
  - `vercel.json` (Modified)
  - `src/services/firebase.js` (Modified)
  - `src/components/admin/AdminOverview.jsx` (Modified)
  - `src/utils/gameplayInsights.js` (Modified, comment only)
  - `CLAUDE.md` (Modified)
- **Details**:
  - Found while walking the live production admin panel in a browser, verifying the same-day Phase 2 deploy.
  - **`/admin` returned Vercel's 404 in production.** `App.jsx`'s `isAdminPath()` opens the panel on that path, but there is no `/admin` file on disk and `vercel.json` had no `rewrites` block, so a direct visit or refresh never reached the app - only the in-app header button worked. Added the standard SPA fallback (`/(.*)` -> `/index.html`). Vercel applies `rewrites` **after** the filesystem check, so `/api/*` functions and `/assets/*` still resolve first and only genuinely unmatched paths fall through.
  - **`vercel.json` rejects unknown top-level keys.** The first attempt at this fix carried a `_comment_rewrites` key to document the rationale inline; the deployment failed at config validation *before the build started* (state `ERROR`, no build logs at all). Production was unaffected - Vercel keeps serving the last good deployment - but the fix didn't land until the key was removed. It's plain JSON with a strict schema: no comments, no extra keys. Rationale belongs here, not in the file.
  - **Corrected a wrong figure that made the previous entry's headline claim overstated.** The Phase 2 work below described `questionStats` as bounded by "~1492 questions", taken from CLAUDE.md. The real total is **5,949** - CLAUDE.md's number was long out of date (questions accumulate via admin upload). Measured live: `questionStats` currently holds **2,852** docs and reading it whole cost **~2,900 reads per cold admin load** (Firestore Usage went 18,360 -> 21,445 across the audit). So the counters were roughly **2x** better than the raw-attempt scan they replaced, not the order of magnitude implied, and would drift worse as question coverage grew.
  - Replaced `getAllQuestionStats()` with `getWorstQuestionStats(limitN = 100)`: `orderBy('wrong','desc')` + `limit`, making the Pregled a **fixed ~100 reads** regardless of question count or play volume. No new index needed (single-field ordering), no rules change (`questionStats` is already publicly readable), and no new field - `wrong` was already denormalized so `firestore.rules` could verify `wrong == total - correct`. `summarizeQuestionAccuracyFromStats` still re-sorts the window by accuracy, so the table reads the same. Tradeoff, documented at the function: a question answered twice at 0% can now fall outside the window - deliberate, since two attempts is not evidence a question is bad, and the old full scan floated exactly that noise to the top.
  - Fixed the stale "1492" in `CLAUDE.md` and added an explicit warning not to hardcode a total question count, with the one-liner to count them instead - that stale figure is what produced the mis-sizing.
  - Verified in production during the same session: all 6 admin sections render against real data with **zero console errors**; the Danas/Tjedan/Ukupno columns populate from the Phase 1 persistent cache; the counter backfill had already run, and an integrity check over all 2,852 docs found **0 violations** of `wrong == total - correct`.

### [2026-08-22] - Phase 2: replace the admin content-insight scans with maintained counters
- **Files Changed**:
  - `src/services/firebase.js` (Modified)
  - `src/utils/gameplayInsights.js` (Modified)
  - `src/utils/gameplayInsights.test.js` (Created)
  - `src/components/admin/AdminOverview.jsx` (Modified)
  - `firestore.rules` (Modified)
  - `scripts/firestore-rules-counters.test.mjs` (Created)
- **Details**:
  - Phase 1 (entry below) capped how *often* the admin panel's unbounded scans ran, but not what they cost - `getAllQuestionAttempts()`/`getAllGameResults()` still grew by one doc per question answered / game played, forever. Phase 2 takes them off the read path entirely.
  - Added `questionStats/{questionId}` (`{ categoryId, total, correct, wrong }`) and `categoryStats/{categoryId}` (`{ plays, totalScore, victories }`), maintained incrementally by new `bumpQuestionStats`/`bumpCategoryStats` helpers called from `logQuestionAttempt`/`logGameResult`. Same maintain-on-write pattern as `records/rekordiSummary`. The raw `questionAttempts`/`gameResults` writes are **kept** - they remain the audit trail and the source the rebuild reads. Both log functions now use `Promise.allSettled` so a failing counter write can't suppress the raw write (or vice versa) and neither can throw into gameplay.
  - `AdminOverview` now reads the counters via new `getAllQuestionStats()`/`getAllCategoryStats()`. The accuracy table is bounded by question count instead of attempts-ever; popularity is a flat **8 docs**. Neither grows with playtime any more. **Superseded — see the 2026-08-22 entry above:** the "~1492" ceiling quoted here came from a stale CLAUDE.md figure (the real total is 5,949), so this bound was far weaker than stated and measured ~2,900 reads per cold load in production; `getAllQuestionStats` was replaced by a top-100 `getWorstQuestionStats` query.
  - `gameplayInsights.js` gains `summarizeQuestionAccuracyFromStats`/`summarizeCategoryPopularityFromStats`, emitting field-for-field the same rows as the existing raw-path functions, so `AdminOverview`'s tables are untouched. The raw functions are retained - they're now what the rebuild uses. New `gameplayInsights.test.js` (14 cases) covers both adapters and, importantly, **pins the two paths to identical output for equivalent input**: if they ever drift, a rebuild would silently change what the admin sees.
  - `recomputeContentInsightStats()` rebuilds both counter sets from the raw collections with absolute values (`setDoc`, batched at 400/commit) so a rebuild *corrects* drift rather than compounding it. Wired to a confirm-gated "Rekonstruiraj statistiku" button in AdminOverview, mirroring "Rekonstruiraj sažetak". **Must be run once to backfill history that predates the counters** - until then the Pregled tables only reflect activity since deploy.
  - `firestore.rules`: both new collections are writable by anyone (signed in or not) because the game logs attempts for anonymous play, exactly like `questionAttempts`. The rules pin every write to a single +1 and pin `wrong == total - correct` so a caller can't desync the pair; `totalScore` may only move within the 0-10000 range `gameResults.score` already validates. Absolute-value writes are allowed only for `isAdmin()`, which is what makes the rebuild possible. **This is the ceiling rules can enforce** - a determined caller can still spam *valid* +1 writes to skew stats or burn write quota, exactly as they can spam `addDoc(questionAttempts)` today; App Check is the mitigation, not these rules, and the rules comment says so rather than implying otherwise.
  - **Requires `firebase deploy --only firestore:rules`** - not yet deployed. Until it is, the counter writes will be denied in production and the Pregled tables will read empty (gameplay itself is unaffected: `Promise.allSettled` isolates the failure and the raw `questionAttempts` write still succeeds).
  - Verification: 159 unit tests pass; `scripts/firestore-rules-counters.test.mjs` (new, 21 assertions, run via `npx firebase emulators:exec --only firestore "node scripts/firestore-rules-counters.test.mjs"`) confirms +1 succeeds, +5 / desynced `wrong` / decrements / category-switching / extra fields / non-1 creates are all **denied**, and both `isAdmin()` paths (custom claim and admin email) may rebuild. `golden-path.mjs` run against the emulator passed with 0 console errors, and the counters written during that round were inspected directly: 5 `questionStats` docs with the invariant holding, `categoryStats/geografija` at `plays=1, totalScore=600` matching the round's 2 correct answers. Checked in rather than left ad hoc (contra CLAUDE.md's note) because the rules now encode delta invariants that are easy to break silently.

### [2026-08-22] - Generalize the admin localStorage cache and extend it to the sessions scan
- **Files Changed**:
  - `src/utils/adminSectionCache.js` (Created)
  - `src/utils/adminSectionCache.test.js` (Created)
  - `src/utils/adminOverviewCache.js` (Deleted, superseded by the above)
  - `src/components/admin/AdminOverview.jsx` (Modified)
  - `src/components/admin/AdminPlayers.jsx` (Modified)
- **Details**:
  - Investigated a 6,474-read Firestore spike (13% of the Spark plan's 50k/day quota) that landed in ~2 minutes at ~02:18 CEST with only 2 clients connected. Confirmed in the Firebase console's Usage tab and independently against the raw `firestore.googleapis.com/document/read_ops_count` metric in Cloud Monitoring, which peaked at ~78 reads/sec and - grouped by its `type` label - was **100% `QUERY`** (collection scans) with `LOOKUP` flat at ~0. An initial hypothesis blaming `subscribeToOnlinePlayers` (the unfiltered `presence` listener) was **wrong**: it fits the QUERY-only evidence but not the actual activity, which was one round played, then the Admin Panel opened, its tabs browsed, and the page refreshed. Same failure shape as the 45,238-read and ~46k spikes in the 2026-08-20 entries below - the third instance this week.
  - Root cause is the reload gap left by `adminDataCache.js`: it's a module-level `Map`, so it covers tab-switch reuse within one page load but is wiped by any refresh, after which every admin section re-runs its full-collection scan from scratch. Only `AdminOverview` had a second, `localStorage`-backed tier (`adminOverviewCache.js`, added 2026-08-20); the other four sections had no cross-reload protection at all.
  - Replaced the single-purpose `adminOverviewCache.js` with `adminSectionCache.js`, the same 15-minute TTL / `{ data, storedAt }` envelope / try-catch-around-`localStorage` shape (still mirroring `rekordiCache.js`) but keyed per section, plus a `clearCachedAdminSection` for the explicit refresh paths. `AdminOverview` now uses it with no behavior change; its "🔄 Osvježi" additionally clears the persisted entry, so a *failed* refetch can no longer leave behind the stale value the admin just asked to replace.
  - Extended the persistent tier to `AdminPlayers`' `getAllSessions()` scan - by its own comment the fastest-growing, most expensive scan in the panel (one doc per play session, forever). What's cached is the already-summarized `{ daily, weekly, all }` map of uid -> seconds, so it's bounded by player count rather than session count. Deliberately **not** extended to the `users` scan, nor to reports/submissions/profiles: `users` is bounded by registered-player count (tens) and its docs carry Firestore `Timestamp`s (`lastLogin`) that `JSON.stringify` flattens to `{ seconds, nanoseconds }`, which every `toMillis()` helper in the admin components would then read as `0` - silently breaking the "Zadnja aktivnost" column. Reports and submissions are action queues where 15-minute staleness would actively hide new items from the admin. Both constraints are documented in `adminSectionCache.js`'s header and at the `AdminPlayers` call site.
  - Added `adminSectionCache.test.js` (12 cases): round-trip, per-section isolation, key namespacing, the 15-minute TTL boundary either side, unparseable/incomplete envelopes, and a `localStorage` that throws outright (private mode, blocked site data). Two cases pin the serialization contract specifically - one asserts a Firestore-`Timestamp`-shaped value loses its `toMillis`/`toDate` methods across the JSON round-trip and that the admin components' shared `toMillis()` helper then silently reads it as `0`, the other that a timestamp normalized to millis first survives intact. That trap is what kept `users` off the persistent tier, and it's the failure mode most likely to bite whoever extends this cache next, so it's guarded rather than only commented. Uses a small in-memory `localStorage` stub, keeping the suite jsdom-free per CLAUDE.md.
  - This caps how *often* the unbounded scans run; it does not make them cheaper, and their cost still grows with every game played. The real fix - maintained summary docs updated incrementally on write, following the `records/rekordiSummary` pattern from the 2026-08-20 entry below, plus a possible Firestore TTL policy on `questionAttempts`/`gameResults`/`sessions` - remains outstanding.

### [2026-08-20] - Cache Admin Overview insights to stop unbounded per-reload Firestore reads
- **Files Changed**:
  - `src/utils/adminOverviewCache.js` (Created)
  - `src/components/admin/AdminOverview.jsx` (Modified)
- **Details**:
  - Traced a ~46k Firestore read spike to a debugging session's handful of full page reloads, each of which opened the Admin Panel's default "Pregled" tab. `AdminOverview.jsx` calls `getAllQuestionAttempts()`/`getAllGameResults()` on mount, and both are unbounded `getDocs(collection(...))` scans (`firebase.js:381-399`) - one doc per question ever answered / game ever played, across all players. The only cache in front of them, `adminDataCache.js`, is a module-level in-memory `Map` that's wiped on every full page reload, so each reload re-ran both full-collection scans from scratch.
  - Added `adminOverviewCache.js`, a `localStorage`-backed 15-minute TTL cache mirroring `rekordiCache.js`'s pattern (same "45k reads" failure shape as that fix, see entry below) - but caching the *computed* `{ popularity, accuracy }` summary rather than the raw `attempts`/`results` arrays, since the summary is bounded by question/category count (~1492 questions, 8 categories) while the raw collections grow forever. `AdminOverview.jsx` now checks this cache before touching Firestore at all; a hit skips `getAllQuestionAttempts`/`getAllGameResults`/`getAllCategoryPacks` entirely. The existing in-memory cache is untouched and still handles same-page-load tab-switch reuse; "🔄 Osvježi" bypasses both.

### [2026-08-20] - Note confirm-dialog blocking behavior on the Rekordi summary rebuild button
- **Files Changed**:
  - `src/components/admin/AdminLeaderboardsProfiles.jsx` (Modified, comment only)
- **Details**:
  - Investigated a report of the Rekordi boards being mostly empty on production: caused by the same-day `records/rekordiSummary` migration (see entry below) never being backfilled, not a code bug. Fixed live by running the existing "Rekonstruiraj sažetak" admin button.
  - While doing that fix via browser automation, the button's `window.confirm()` call froze the page (and the attached CDP session) until a human manually clicked through the native dialog - twice, since two rebuild attempts were needed. Added a comment on `handleRecomputeRekordiSummary` noting this blocking behavior for future admin/automation use.

### [2026-08-20] - Move Rekordi leaderboards to a shared server-side maintained doc
- **Files Changed**:
  - `firestore.rules` (Modified)
  - `src/services/firebase.js` (Modified)
  - `src/App.jsx` (Modified)
  - `src/components/RekordiBoards.jsx` (Modified, comments only)
  - `src/components/admin/AdminLeaderboardsProfiles.jsx` (Modified)
- **Details**:
  - The 2026-08-20 `rekordiCache.js` localStorage TTL cache (previous entry) turned out to only cap re-fetches from the *same browser*; it does nothing to bound aggregate reads across many distinct visitors, so the underlying per-pageview 6-query/up-to-121-read fan-out was still live for every unique visit and could still blow the 50k/day Spark quota under real traffic (confirmed via the Firebase Console: reads climbed from ~7.5K to 59K within hours on 2026-08-20, well after the cache fix had already deployed).
  - Added `records/rekordiSummary`, a single maintained Firestore doc holding the top-10 for the `level`/`maxStreak`/`achievementCount`/`dayStreak`/`bestScore` boards - same pattern the existing `records/fastestPerfect` doc already used. It's kept current incrementally: `maybeUpdateRekordiProfileBoards` (called from `syncPublicProfile`, one transaction covering all 4 profile-based boards) and `maybeUpdateRekordiBestScore` (called from `saveScoreToFirestore` on every score save) upsert/re-sort/truncate the relevant array in a single read+write transaction, rather than recomputing anything at read time.
  - `App.jsx`'s `refreshRekordiData` now calls the new `getRekordiSummary()` (1 bounded read) alongside the existing `getFastestPerfectRounds()` (1 bounded read) - 2 reads per uncached page load instead of up to 121, regardless of how many unique visitors hit it.
  - `getPublicProfileLeaderboard`/`getBestScoresAcrossCategories` (the old unbounded-scan functions) are no longer called from the page-load path; they're kept as the internals of a new admin-only `recomputeRekordiSummary()` escape hatch (wired to a "Rekonstruiraj sažetak" button in the Admin Panel next to the existing fastestPerfect one) that rebuilds `records/rekordiSummary` from scratch, for the case where editing a player directly in the Admin Panel or running "Popuni sve profile" bypasses the incremental update and leaves it stale.
  - `firestore.rules` adds a `records/rekordiSummary` rule mirroring `records/fastestPerfect`'s (`allow read: if true`; `create`/`update` validated by key allowlist + each board capped at 10 entries; `delete` admin-only). **Requires `firebase deploy --only firestore:rules` to take effect in production** - not yet deployed as part of this change.

### [2026-08-20] - Cache Rekordi data to stop unbounded per-pageview Firestore reads
- **Files Changed**:
  - `src/utils/rekordiCache.js` (Created)
  - `src/App.jsx` (Modified)
  - `src/hooks/useScoreSaving.js` (Modified)
- **Details**:
  - Cloud Monitoring showed 45,238 Firestore document reads in a 3-hour window (~90% of the Spark plan's daily 50k budget), in isolated bursts unrelated to any deploy. Traced to `refreshRekordiData()` in `App.jsx`, which fired 6 parallel Firestore calls (worst case ~121 document reads, dominated by `getBestScoresAcrossCategories`'s 8-way per-category fan-out) unconditionally on every single page load, with no caching - so its cost scaled with raw pageviews, making it cheap for a bot/reload-loop to exhaust the whole daily quota.
  - Added `rekordiCache.js`, a 15-minute localStorage TTL cache (`loadCachedRekordi`/`saveCachedRekordi`). `refreshRekordiData` now takes a `force` param: the on-mount call (`force=false`, default) serves the cached result within the TTL window instead of re-fetching; `useScoreSaving.js`'s post-save call (`force=true`) always bypasses the cache so the player's own just-saved score shows up immediately, and its fresh fetch also refreshes the cache for subsequent visitors.
  - No Firestore schema/rules changes - pure client-side change. `RekordiBoards.jsx` already treats the data as safe to reuse across visits per its own existing comment, so this doesn't change its freshness contract, only extends it across page reloads.

### [2026-08-20] - Show Danas/Tjedan/Ukupno play-time columns in admin player list
- **Files Changed**:
  - `src/utils/sessionStats.js` (Modified)
  - `src/components/admin/AdminPlayers.jsx` (Modified)
- **Details**:
  - `sumSessionsByUid` now accepts an optional `period` arg (`'daily' | 'weekly' | 'all'`, defaulting to `'all'` for backward compatibility) and filters with the same `isInPeriod` scoping `summarizeSessionsByPeriod` already used for the per-player Daily/Weekly toggle in `AdminPlayerDetail.jsx`.
  - `AdminPlayers.jsx`'s single all-time "Vrijeme igre" column is now three sortable columns - "Danas", "Tjedan", "Ukupno vrijeme" - computed from the same one `getAllSessions()` fetch filtered three ways in-memory, so no additional Firestore reads. Each new column reuses the existing generic click-to-sort/ascending-descending mechanism (`COLUMNS`/`handleSort`/`sortedUsers`) with no changes to that logic.

### [2026-08-20] - Fix stale "Zadnja aktivnost" and inflated "Vrijeme igre" in admin panel
- **Files Changed**:
  - `src/App.jsx` (Modified)
  - `src/services/firebase.js` (Modified)
  - `src/hooks/useSessionTracking.js` (Modified)
- **Details**:
  - `lastLogin` (the field behind AdminPlayers.jsx's "Zadnja aktivnost" column) was only ever written by `syncUserProfile()` from explicit interactive sign-in flows, so a returning player whose Firebase Auth session simply persisted across visits never got it refreshed - the column effectively showed "date of last login-button click," not last activity. `App.jsx`'s `onAuthStateChanged` handler now also calls `syncUserProfile(user)` for a restored/persisted session, not just explicit login, so `lastLogin` reflects the actual last visit.
  - `useSessionTracking.js`'s `flushElapsed()` credited elapsed wall-clock time to the current gameState bucket with no ceiling, so a gap `visibilitychange` didn't catch (e.g. OS sleep/suspend while the tab stayed "visible") got fully credited as active playtime on the next flush - a plausible source of implausible "Vrijeme igre" totals like "17h 46min". Added a `MAX_FLUSH_SECONDS = 300` clamp in `flushElapsed()` so a normal 90s-cadence flush is unaffected while a multi-hour gap gets truncated instead of fully credited.
  - Verified: existing traces of both root causes confirmed against current code (exact line numbers checked directly, not just from a prior transcript); manual verification plan documented (Firestore emulator session-restore check for `lastLogin`, `golden-path.mjs` regression check for normal-session `gameStateSeconds` totals).

### [2026-08-17] - Reduce Firestore read quota: presence heartbeat, 1v1 match heartbeat, admin panel caching
- **Files Changed**:
  - `src/hooks/usePresence.js` (Modified)
  - `src/utils/presenceUtils.js` (Modified)
  - `src/services/matches.js` (Modified)
  - `src/components/MatchView.jsx` (Modified)
  - `firestore.rules` (Modified)
  - `src/utils/adminDataCache.js` (Created)
  - `src/components/admin/AdminOverview.jsx` (Modified)
  - `src/components/admin/AdminReports.jsx` (Modified)
  - `src/components/admin/AdminQuestionSubmissions.jsx` (Modified)
  - `src/components/admin/AdminPlayers.jsx` (Modified)
  - `src/components/admin/AdminLeaderboardsProfiles.jsx` (Modified)
- **Details**:
  - Widened the `presence` collection heartbeat from 60s to 180s (`usePresence.js`), with `presenceUtils.js`'s online-threshold bumped in lockstep to keep the documented 3x-heartbeat safety margin - cuts steady-state `onSnapshot` fan-out reads, which scale as writer-count x listener-count among concurrently lobby-idle players.
  - Split 1v1 match heartbeats out of the `matches/{matchId}` document into a new `matches/{matchId}/heartbeats/{uid}` subcollection (`matches.js`'s `heartbeatMatch`/new `subscribeToOpponentHeartbeat`, wired into `MatchView.jsx`), since Firestore's `onSnapshot` re-fires on any field change - colocating the heartbeat with gameplay state was doubling the read cost of every heartbeat for zero gameplay-relevant information. Also widened the heartbeat interval 8s -> 15s and the forfeit threshold 30s -> 45s. Added/updated `firestore.rules` accordingly (new `heartbeats/{uid}` rule block, deliberately without a `get()` cross-check to avoid billing an extra read on every heartbeat write).
  - Added `src/utils/adminDataCache.js`, a simple in-memory cache for AdminPanel's per-section Firestore reads, since `AdminPanel.jsx` unmounts/remounts each section on every tab switch with no caching by design - every tab revisit was re-running its full `getAllX()` collection scan from scratch. Wired into `AdminOverview`, `AdminReports`, `AdminQuestionSubmissions`, `AdminPlayers` (both its `users` and `sessions` scans), and `AdminLeaderboardsProfiles` (both `publicProfiles` and per-category `getAllScoresForCategory`), each with a manual refresh action; existing post-mutation refetches now also refresh the cache.
  - Verified via an ad hoc Firestore rules test against the emulator (new `heartbeats` subcollection rules) and `golden-path.mjs`/`two-player-match-check.mjs` against the emulator (zero console errors; two-player check exercises the new heartbeat subcollection and rules end-to-end).

### [2026-08-16] - Remediate Transitive uuid Vulnerability via Overrides (Security Phase 5)
- **Files Changed**:
  - `package.json` (Modified)
  - `package-lock.json` (Modified)
  - `SECURITY.md` (Modified)
- **Details**:
  - Added `"overrides": { "uuid": "^11.1.1" }` to `package.json`, successfully eliminating the transitive `uuid <11.1.1` vulnerabilities across both `firebase-admin` and `firebase-tools` chains (dropping vulnerabilities from 9 down to 3 dev-only).

### [2026-08-16] - Custom Claims Support & Admin Setup Script (Security Phase 4)
- **Files Changed**:
  - `scripts/set-admin-claim.mjs` (Created)
  - `firestore.rules` (Modified)
  - `api/questions.js` (Modified)
  - `src/App.jsx` (Modified)
- **Details**:
  - Created operational helper `scripts/set-admin-claim.mjs` to assign `{ admin: true }` custom claims via Firebase Admin SDK.
  - Implemented dual-check admin verification (`request.auth.token.admin == true` or verified admin email fallback) in `firestore.rules` and `api/questions.js`.
  - Added asynchronous `hasAdminClaim` state and token claims resolution in `App.jsx` with fallback to verified admin email.

### [2026-08-16] - Enforce email_verified on Admin Access Points (Security Phase 3)
- **Files Changed**:
  - `firestore.rules` (Modified)
  - `api/questions.js` (Modified)
  - `src/App.jsx` (Modified)
- **Details**:
  - Enforced `request.auth.token.email_verified == true` in Firestore security rules `isAdmin()` function.
  - Required `payload.email_verified === true` in `api/questions.js` `verifyAdmin` JWT validation.
  - Added `user.emailVerified` checks across all 3 client-side admin route/modal evaluation sites in `App.jsx`.

### [2026-08-16] - Remediate nanoid Vulnerability & Document Security Policy (Security Phase 2)
- **Files Changed**:
  - `package.json` (Modified)
  - `package-lock.json` (Modified)
  - `SECURITY.md` (Created)
- **Details**:
  - Bumped `postcss` from `^8.5.25` to `^8.5.26` in `package.json`, resolving the high-severity `nanoid <3.3.18` vulnerability.
  - Created `SECURITY.md` documenting accepted residual transitive dependencies (`@opentelemetry/core` and `uuid` under `firebase-tools` and `firebase-admin`) and outlining future CSP implementation requirements.

### [2026-08-16] - Add HTTP Security Headers (Security Phase 1)
- **Files Changed**:
  - `vercel.json` (Modified)
- **Details**:
  - Configured global HTTP security headers for all routes in `vercel.json`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`.

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
