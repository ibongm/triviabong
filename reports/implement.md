# TriviaBong — Commit-Grouped Implementation Plan

## Context

`reports/master-plan.md` lists ~40 deduplicated findings across 5 execution phases, sequenced by *dependency* (what must land before what) but not by *what should ship in one commit*. This reorganizes the same backlog into concrete, revertable commit groups — small enough to bisect/rollback cleanly, but bundling fixes that genuinely can't be split (same lines, same shared helper, same screen, same QA pass).

An Explore pass against the current code (App.jsx, firestore.rules, firebase.js, AdminPanel.jsx) confirmed master-plan.md's line numbers still hold, and surfaced real coupling that changes some groupings from what a naive "one commit per finding" split would produce:

- **App.jsx `handleAnswer`**: the round-transition `setTimeout` (Phase 1 #6) sits directly below the game-over branch in the same function as the modal-timer-pause fix (Phase 1 #9) — editing one touches lines adjacent to the other.
- **`onAuthStateChanged` effect (190–226)**: sign-out reset (Phase 1 #4), the auth-fetch race (Phase 1 #5), and the `cloudStats` raw-doc-spread bug (originally filed under Phase 3 #4) are all in this same effect body — pulled forward into one commit rather than split across phases.
- **`applyRoundEndRewards`** is called from `handleAnswer`, `handleAnswerTimeout`, and `activateSkip`; **`updateCategoryStats`** is called from both answer paths — any scoring/achievement fix touches all call sites.
- **`isAdmin()`** is shared by the `users`, `leaderboards`, and `publicProfiles` match blocks in `firestore.rules` — an `email_verified` addition there has a much larger blast radius than the per-collection validation/timestamp rules, so it's kept out of the rules-hardening commit and gated behind a reachability check first.
- **`categoryKeys.js` unification (Phase 3 #7)** intrinsically touches 4 registries at once — it was never splittable, just noting it stays one commit.

No source files are touched by this planning pass itself.

---

## Phase 0 — Decisions (no code)

Must be resolved before Phase 1 Commit 8 (XP migration, deferred into Phase 2 Commit 3) can be written:
1. Level-preservation vs. honest-reset policy for the XP rebalance.
2. One-shot admin backfill vs. self-heal for the 3 inflated Rekordi profiles.

**Reachability spike — RESOLVED, item 11 dropped.** Firebase Console → Authentication → Settings → User account linking is set to "Link accounts that use the same email" (not "Create multiple accounts for each identity provider"). With this setting, `createUserWithEmailAndPassword(auth, 'ivanm.ploce@gmail.com', ...)` cannot mint a second, unverified uid for the admin's email — Firebase rejects it with `auth/email-already-in-use` since the Google-linked account already owns that email. The `isAdmin()` email-only check therefore isn't exploitable via self-registration. Phase 1 Commit 9 (`firestore.rules: isAdmin() email_verified check`, item 11) is dropped from scope.

---

## Phase 1 — Critical Security & Logic (8 commits)

1. ~~**`fix: patch 50:50 joker guaranteed-answer exploit`** *(item 2)* — hide options by index/occurrence in `App.jsx` (`activateFiftyFifty` ~566–581, render loop ~929–968), plus correct the 2 dirty JSON rows (`hr_geo_59`, `hr_sport_80`). Self-contained; ship first since it's live and exploitable today.~~ ✅ **DONE** — `hiddenOptions` switched from value-based to index-based matching; `hr_geo_59` duplicate "Incheon"→"Daegu", `hr_sport_80` duplicate "Pikado"→"Stolni tenis".
2. ~~**`fix: correct scoring/achievement pipeline reads`** *(items 3, 7)* — `totalScore` stale-read in `updateCategoryStats` (331–358) and the `+10s` joker inflating speed achievements (`achievements.js:31`). Same post-answer pipeline, adjacent code.~~ ✅ **DONE** — `updateCategoryStats` now receives `pointsEarned` param instead of reading stale `score` closure; `timeLeft` capped at `QUESTION_TIME_SECONDS` in achievement ctx; call site moved after `earned` is computed; wrong-answer path explicitly passes 0.
3. ~~**`fix: auth/stats sync effect races`** *(items 4, 5, + the cloudStats spread bug pulled forward from Phase 3 #4)* — sign-out stats reset, the account-switch race that strands `statsReadyForUid`, and the raw `cloudStats` spread pulling `email`/`role`/`uid` into `globalStats`. All in `onAuthStateChanged` (190–226); editing this effect three separate times would just create merge noise.~~ ✅ **DONE** — Added sign-out branch resetting to `DEFAULT_GLOBAL_STATS`; `authGeneration` counter guards async fetch against account-switch races; destructure-strip of `uid/email/displayName/photoURL/lastLogin/updatedAt/role` before merging `cloudStats` into `globalStats`.
4. ~~**`fix: round-transition timer leaks + modal pause + joker-message timer cleanup`** *(items 6, 9, + the timer-cleanup half of Phase 3 #4)* — confirmed-adjacent lines in `handleAnswer`/`handleAnswerTimeout`; bundle so one golden-path + one throwaway multi-window repro script covers all three.~~ ✅ **DONE** — Stored transition timers in `roundTransitionTimerRef` and `gameOverTimerRef`; added `returnToLobby` helper that clears transition and joker message timers; cleared timers in `launchQuizRound`; added `isAnyModalOpen` check to timer `useEffect` so countdown pauses when any modal is open.
5. **`fix: leaderboard category fetch race`** *(item 8)* — request-generation guard in `selectCategory`. Self-contained.
6. ~~**`fix: input validation & error surfacing`** *(items 13, 14)* — AdminPanel numeric bounds/NaN guard + AuthModal error-type distinction. Zero line overlap, same "surface real failures" theme, safe to bundle.~~ ✅ **DONE & COMMITTED** — `b4fc64e`. AdminPanel: `handleSaveUser` validates/clamps `level`/`xp`/`coins` (finite, `level>=1`, `xp,coins>=0`, floored) instead of raw `Number()`; save/delete failures now surface inline (`formError`/`usersMessage`) instead of `alert()`/silent unhandled rejection. AuthModal: new `getAuthErrorMessage()` distinguishes network/timeout, rate-limiting, disabled-account, and Google popup blocked-vs-cancelled from actual bad-credential errors.
7. ~~**`fix: multi-tab last-write-wins interim mitigation`** *(item 12)* — `storage` event listener + max-of-monotonic-fields. Flag in the commit message that this is superseded by Phase 2 Commit 4 and can likely be deleted then.~~ ✅ **DONE** — Added `mergeMonotonicStats` utility taking `Math.max()` across monotonic scalar fields (`level`, `xp`, `coins`, `totalGames`, `totalAnswered`, `totalCorrect`, `maxStreak`, `totalScore`, `dayStreak`, `consecutivePerfectRounds`), unioning achievement IDs, and max-merging category stats; added `window` `storage` event listener effect in `App.jsx`. *(Note: interim logic to be superseded by Phase 2 Commit 4)*
8. ~~**`firestore.rules: field validation + timestamp pinning`** *(items 10, 15)* — additive per-field checks in the existing `users` and `leaderboards` match blocks. Low blast radius, one emulator test run covers both.~~ ✅ **DONE & EMULATOR VERIFIED** — int/range checks added to `users/{uid}` create+update (`level>=1`; `xp`/`coins`/`maxStreak`/`dayStreak` `>=0`; `achievementCount` 0–30) and `createdAt == request.time` pinned on leaderboard score writes. Verified via emulator run.

~~9. `firestore.rules: isAdmin() email_verified check` *(item 11)*~~ — **dropped**, see Phase 0 reachability spike result above.

Item 1 (XP/level migration) is *not* a Phase 1 commit — `master-plan.md` itself notes `statsStore.js` (Phase 2) is the generalized fix, so it's implemented there instead of writing throwaway migration code twice.

---

## Phase 2 — Foundational Refactors (4 commits, strict order — each is large; land and verify individually)

1. **`refactor: extract pure applyAnswer()`** *(item 1)* — replaces inline `setGlobalStats` logic in `handleAnswer`/`handleAnswerTimeout`/`applyRoundEndRewards`/`updateCategoryStats` with `applyAnswer(stats, round, ctx) → {stats, round, events}`. Foundation for Commit 2.
2. **`refactor: useGameRound() hook + derive options via useMemo`** *(items 2, 3)* — one owner for round state, the timer effect, and transition timeouts; folding in the `useMemo` derivation of `currentShuffledOptions`/`answerLocked` here since it's state the hook now owns anyway. Depends on Commit 1.
3. **`feat: statsStore.js — schema versioning, account-scoped keys, XP migration`** *(items 4, 5 from Phase 2, + Phase 1 item 1)* — new module, `statsVersion` + `MIGRATIONS` array, account-scoped localStorage key. Implements the XP rebalance migration as the first entry in `MIGRATIONS`, gated on the Phase 0 decision. Note in the commit: this makes Phase 1 Commit 3's manual sign-out clear redundant (account-scoped keys fix it by construction) — safe to simplify then, not required immediately.
4. **`refactor: move stats off shared users/{uid} doc, use increment()`** *(item 6)* — touches `firebase.js` write paths, `firestore.rules` shape, and every write site (`AuthModal.jsx`, `App.jsx`, `AdminPanel.jsx`). Largest single commit in the plan — do it behind a migration script / feature flag if at all possible, and only after Commit 3 is stable. Supersedes Phase 1 Commit 7's mitigation.

---

## Phase 3 — Dependent Fixes (10 commits, mostly independent — sequence only where noted)

1. **`fix: timer drift`** *(item 1)* — move `playTick()` out of the `setTimeLeft` updater, stop re-arming the interval. **Depends on Phase 2 Commit 2** (timer effect now lives in the hook).
2. **`perf: debounce remote Firestore writes`** *(item 2)* — 2s debounce behind the local write. **Depends on Phase 2 Commit 4** (same write path).
3. **`fix: optimistic leaderboard write rollback + non-functional setLeaderboards`** *(item 3)* — self-contained.
4. **`perf: Rekordi/admin query cost hardening`** *(items 5, 10, 11)* — remove unconditional mount fetch + `limit()`/index on `getFastestPerfectRounds`, paginate `getAllRegisteredUsers`/`getAllPublicProfiles`/`clearLeaderboardForCategory`, fix the `getBestScoresAcrossCategories` N+1. All in `firebase.js`, same "query cost" theme, bundled to review with one eye on read-cost impact.
5. **`build: code-split AdminPanel + question JSON`** *(item 6)* — `React.lazy`, `manualChunks`. Standalone; verify bundle size before/after.
6. **`refactor: unify category registry`** *(item 7)* — `categoryKeys.js` as single source; `categoryPacks`/`CATEGORY_META`/`ID_PREFIXES`/`CATEGORY_FILES` build from it. Inherently one commit — the whole point is removing the 4-list drift.
7. **`fix: dedupe aggregate question pool`** *(item 8)* — dedupe `getAllQuestions()` by normalized text. Standalone.
8. **`chore: pin firestore.rules magic numbers to source + CI check`** *(item 9)* — standalone.
9. **`chore: env-based Firebase config + emulator flag`** *(item 12)* — standalone; unlocks future emulator-backed test runs (not required by anything else here, but low-risk enabler).
10. **`chore: admin wiring cleanup`** *(items 13, 14)* — remove dead `AdminPanel` props (`globalStats`/`setGlobalStats`/`leaderboards`/`setLeaderboards` it never uses), fix the admin-gate path-vs-doc drift (either restrict the header button by path to match CLAUDE.md, or update the doc — needs a quick call on which is true intent).

---

## Phase 4 — UX / Game Loop (3 commits, grouped by screen for one visual-QA pass each)

1. **`style: playing-screen focus`** *(items 1, 2)* — timer prominence (`TimerRing.jsx` size/stroke/digit weight) + header consolidation (Razina+Zlatnici merge, Trofeji into Stats modal).
2. **`style: tactile feedback + lobby variety`** *(items 3, 4, 5)* — active-press feedback on all buttons, per-category color tokens, featured/CTA hierarchy on the lobby grid.
3. **`style: transition & overlay polish`** *(items 6, 7)* — game-over shake/flash, sticky modal headers on `GuideModal`/`StatsModal`/`AuthModal`.

---

## Phase 5 — Polish (2 commits)

1. **`chore: token/copy polish`** *(items 1, 2, 3, 5)* — `AuthModal` background token, sub-11px text sizing, logotype gradient simplification, CLAUDE.md bundle-size/ADMIN_EMAIL refresh. All trivial, no shared lines.
2. ~~**`chore: remove unused framer-motion dependency`** *(item 4)* — kept isolated from the above so a `package.json`/lockfile change is independently revertable if it turns out something depended on it transitively.~~ ✅ **DONE & COMMITTED** — `9d507d2`. `npm uninstall framer-motion` (also dropped transitive-only `motion-dom`/`motion-utils`); confirmed via grep that `src/` and `api/` had zero imports. Full `npm run build` verification was blocked by the unrelated, pre-existing `App.jsx` `currentQ` duplicate-declaration break from a concurrent in-progress refactor — re-run once that resolves.

---

## Verification (per commit, following CLAUDE.md's existing conventions)

- **Phase 1 & 3 logic commits:** re-run `.claude/skills/run-triviabong/golden-path.mjs` after each; write a throwaway repro script for anything it doesn't cover (multi-tab, sign-out, joker exploit, category-fetch race), delete after use.
- **firestore.rules commits (Phase 1 #8; Phase 2 #4):** `firebase emulators:exec --only firestore "node <script>.mjs"` before deploying — never deploy rules straight from this plan without that run and explicit confirmation. Phase 1 #8 is implemented but still uncommitted/undeployed as of this update.
- **Phase 2 refactor commits:** land and smoke-test individually before starting the next (they're ordered for a reason); `npm run lint` at/under the current 9-problem baseline, `npm run build` clean, after each.
- **Phase 4/5 commits:** screenshot at normal and `timeLeft<=4` state, and at a ~375–414px mobile viewport.
- **Phase 2 Commit 3 (XP migration) specifically:** re-verify against live `publicProfiles` data that all previously-inflated accounts show the policy-correct level.
