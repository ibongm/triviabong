# Changelog

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
