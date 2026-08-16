# TriviaBong — Master Execution Plan

## Context

Six independent review passes have now been run against this repo: a native 3-agent panel (`review-report.md`: 12 React lifecycle findings + 1 live-data bug), a follow-up architecture audit (`reports/architecture-audit-2026-08-04.md`), an edge-case audit (`reports/edge-cases-audit-2026-08-04.md`), a design/UX audit (`reports/design-ux-audit-2026-08-04.md`), plus two third-party reports authored outside this session by a different tool ("Antigravity IDE") — `reports/audit-data-security.md` and `reports/audit-performance.md`. Several findings across these six documents describe the exact same bug from different angles (e.g. the timer-churn bug and the stale-options-frame bug were independently rediscovered by two different tools). This plan deduplicates all of it into one inventory, groups by the four buckets requested (Critical Security & Logic, React Refactoring, UX/Game Loop Fixes, Polish), and sequences the work so structural fixes land before the smaller fixes that depend on them.

**Two items in this repo are already-known and explicitly accepted risk, not new work** — excluded from the plan below, kept here for traceability: (1) leaderboard scores are client-computed with only a plausibility ceiling in `firestore.rules` — accepted per prior team decision (fixing it needs the Firebase Blaze plan for server-side verification; see stored memory `leaderboard_client_authoritative_accepted`); (2) the full question bank (including `correct_answer`) is necessarily present in the client bundle because this is a client-only SPA with no backend — a real fix means a server-side answer-check endpoint, a bigger architecture change than this plan's scope, not a bug to patch.

**Findings sourced from the two third-party reports are marked `[Antigravity]`** below and treated with one notch less confidence than this session's own agent findings — their line numbers were spot-checked where they overlap with this session's own findings (all overlaps matched), but standalone `[Antigravity]`-only findings haven't been independently re-verified this session.

**No source files were touched producing this document.**

---

## Deduplication map (for traceability)

| Finding | Also reported by | Kept under |
|---|---|---|
| Timer interval churn + impure `playTick` updater | `review-report.md` (B10) + `audit-performance.md` [Antigravity] | React Refactoring #3 |
| Stale-options-frame on question advance | `review-report.md` (B6) + `audit-performance.md` [Antigravity] | React Refactoring #1 |
| Unbatched Firestore writes (~24-30/round) | `review-report.md` (B9) + `audit-performance.md` [Antigravity] | React Refactoring #2 |
| `getFastestPerfectRounds` uncapped scan | `architecture-audit` + `audit-data-security.md` [Antigravity] | React Refactoring #11 |
| Bundle: 1.71MB monolith, no code splitting | `architecture-audit` + `audit-performance.md` [Antigravity] | React Refactoring #12 |
| No tactile/active press feedback | `design-ux-audit` + `audit-performance.md` [Antigravity] | UX #3 |
| Timer visually smallest element on play screen | `design-ux-audit` + `audit-performance.md` [Antigravity] | UX #1 |
| Header overloaded on mobile | `design-ux-audit` + `audit-performance.md` [Antigravity] | UX #2 |

Two independent tools converging on the same bug (timer churn, stale-frame, unbatched writes, tactile feedback, timer size, header overload) is corroborating signal, not double-counting — treat those six as higher-confidence than single-source findings.

---

## Phase 0 — Blocking product decisions (must resolve before Phase 1 item #1)

Neither is a code question; both need a call before any fix lands:

1. **Level-preservation policy for the XP migration (L1):** preserve each player's pre-rebalance level and rebase xp onto the new curve (e.g. a level-6 player stays 6, Davor stays 48), vs. honest reset onto the harsh new curve (e.g. drop to 2, Davor drops to 6).
2. **Rekordi correction for the 3 already-inflated public profiles:** one-shot admin backfill immediately, vs. let each self-heal on next login.

---

## Phase 1 — Critical Security & Logic

Independent, no shared prerequisites — safe to fix in any order, ship incrementally.

1. **XP/level migration (L1).** `src/utils/leveling.js`, `src/App.jsx:450,378`. Commit `4485e0c` rescaled XP 50→1 and swapped the level curve without migrating banked xp. 3 accounts already inflated live (verified against production Firestore), 4 more detonate on next correct answer. **Blocked on Phase 0 decision #1.** *(`review-report.md`)*
2. **50:50 joker guaranteed-answer exploit.** `src/App.jsx:572-573,931`. Hides options by string value, not array slot. Two live questions (`hr_geo_59`, `hr_sport_80`) have a duplicated `incorrect_answers` string, so 2-in-3 clicks hide all three wrong answers — 3 coins for a guaranteed correct answer, live in production today. Fix: hide by index/occurrence, not value; also clean the two dirty JSON rows. *(`edge-cases-audit`)*
3. **`totalScore` stale-read inflation.** `src/App.jsx:342,416,427`. `updateCategoryStats` reads `score` before the current answer's points are added — inflates lifetime `totalScore` ~4.5× per flawless round and drops Q10's points entirely. *(review-report.md B2)*
4. **No sign-out stats reset.** `src/App.jsx:197-213`. `globalStats` is never cleared on logout; next anonymous player on a shared device inherits the account's coins/level/trophies. *(review-report.md B3)*
5. **Auth-fetch race can permanently break sync.** `src/App.jsx:199-212`. Unguarded async stats fetch; account-switch races can strand `statsReadyForUid` so an account's Firestore sync silently never fires again for that session. *(review-report.md B4)*
6. **Round-transition timers never cleared / logo escape hatch.** `src/App.jsx:487,492,528,532,696`. Clicking the header logo mid-round during the ~1s post-answer window lands in LOBBY while a stale `setTimeout` still fires — can write an abandoned round's score to the live leaderboard. *(review-report.md B1)*
7. **`+10s` joker inflates speed achievements.** `src/App.jsx:436` + `src/utils/achievements.js:31`. Achievements key off raw `timeLeft`, which the joker pushes above `QUESTION_TIME_SECONDS` — a 5-second answer can unlock "sub-2-second" achievements. *(review-report.md B7)*
8. **Leaderboard category fetch race.** `src/App.jsx:278-291`. No request-generation guard; rapid category switching can display the wrong category's scores under the right header. *(review-report.md B8)*
9. **Timer not paused by modals.** `src/App.jsx:260-276`. Opening Vodič/Stats/Achievements/Rekordi/Auth mid-question doesn't pause the countdown — silent life loss behind the overlay. *(review-report.md B5)*
10. **Unvalidated `/users/{uid}` field mutation.** `firestore.rules:38-41`. Only `role` is protected on update — any authenticated user can set `coins: 999999` or `level: 999` directly via the browser console/devtools. Needs type + range validation added to the rule (int, `coins >= 0`, `level >= 1`, `xp >= 0`, matching the pattern `publicProfiles` already uses). *(`audit-data-security.md` [Antigravity])*
11. **`isAdmin()` missing `email_verified` check.** `firestore.rules:19-21`, `api/questions.js:51-54`. Compares only `token.email`, not verification status. **Verify first** whether Firebase Auth actually permits an unverified account to register with an already-admin-associated email before treating as urgent — flagged `[Antigravity, unverified]`. If confirmed reachable, add `&& request.auth.token.email_verified == true` to both rule and serverless check.
12. **Multi-tab/multi-device last-write-wins data loss.** `src/App.jsx:233-239`, `src/services/firebase.js:104-116`. No `storage`/`onSnapshot` reconciliation between tabs; the tab that writes last silently erases the other's just-earned coins/xp. Root cause shared with React Refactoring #6 below — quick mitigation here (add a `storage` event listener, take max of monotonic fields) can ship before the full fix. *(edge-cases-audit)*
13. **AdminPanel numeric fields have no bounds/NaN guard.** `src/components/AdminPanel.jsx:269-271`. A blank or negative level/xp write is rejected by `firestore.rules` on that player's *next* public-profile sync but the failure is only `console.error`'d — that player's Rekordi entry silently freezes forever. Clamp on submit; surface `syncPublicProfile` failures to the UI. *(edge-cases-audit)*
14. **Auth error masking.** `src/components/AuthModal.jsx:34-36,61-67`. Every failure (including network outages) is shown as "wrong password" / "registration failed" — never distinguishes `auth/network-request-failed` from real credential errors. *(edge-cases-audit)*
15. **Timestamp spoofing on score writes.** `firestore.rules:60-75`. `createdAt` isn't pinned to `request.time`, so a client can backdate/postdate leaderboard entries. Small rule addition: `&& request.resource.data.createdAt == request.time`. *(`audit-data-security.md` [Antigravity])*

---

## Phase 2 — React Refactoring: foundational (unlocks Phase 3)

These are structural extractions that several smaller fixes depend on — sequence first within this bucket.

1. **`applyAnswer()` pure-function extraction.** Replace `src/App.jsx:331-511`'s inline `setGlobalStats` logic with a pure `applyAnswer(stats, round, ctx) → {stats, round, events}`. This single extraction structurally eliminates the stale-closure bug class (Phase 1 #3 is literally an instance of it) and makes the scoring/streak/xp pipeline unit-testable for the first time. *(architecture-audit)*
2. **`useGameRound()` hook.** Owns `questions/currentIndex/selectedOption/answerLocked/timeLeft/lives/streak/score`, the timer effect, and every round-transition `setTimeout`. One owner for pending timers structurally kills Phase 1 #6 and #9 rather than patching each site individually. *(architecture-audit)*
3. **Derive `currentShuffledOptions`/`answerLocked` via `useMemo` instead of effect-write.** `src/App.jsx:177-187`. Removes the one-frame stale-options flash on question advance; also clears the `react-hooks/set-state-in-effect` lint error at line 178. *(review-report.md B6, corroborated by `audit-performance.md` [Antigravity])*
4. **`statsStore.js` + schema versioning.** New module owning the only load/save path for `globalStats`, with `statsVersion` on `DEFAULT_GLOBAL_STATS` and an ordered `MIGRATIONS` array applied to the *raw* persisted object before any defaults-merge. This is the generalized fix that also implements Phase 1 #1 once Phase 0 decision #1 is made — one hook point for this rebalance and every future one. *(architecture-audit)*
5. **Account-scoped localStorage.** Inside `statsStore`, key by `` `triviabong_global_stats:${uid ?? 'anon'}` `` — makes Phase 1 #4 (sign-out reset) unnecessary by construction, since sign-out just reads a different slot.
6. **Move stats off the shared `users/{uid}` doc; use `increment()` for monotonic fields.** Root-causes Phase 1 #12 (multi-tab loss) and the general "no coherent source of truth" problem (`AuthModal.jsx`, `App.jsx`, `AdminPanel.jsx` all write the same doc today with plain `setDoc`). *(architecture-audit)*

## Phase 3 — React Refactoring: dependent fixes

1. **Timer side-effect extraction.** `src/App.jsx:268-273`. Move `sound.playTick()` out of the `setTimeLeft` updater (impure; double-fires under StrictMode); stop re-arming the interval every tick — currently causes measurable countdown drift against wall-clock, which skews the Rekordi speedrun `elapsedMs`. *(review-report.md B10, corroborated by `audit-performance.md` [Antigravity])*
2. **Debounce remote Firestore writes.** `src/App.jsx:233-239`. Currently ~24-30 writes/round/signed-in-player. Debounce the remote half 2s behind the immediate localStorage write. *(review-report.md B9, corroborated by `audit-performance.md` [Antigravity])*
3. **Optimistic leaderboard write ordering.** `src/App.jsx:626-630`. Local leaderboard entry is written before the Firestore `await` resolves and never rolled back on failure — a failed save still displays as a real entry. Also fix the non-functional `setLeaderboards` call.
4. **`jokerMessageTimer` cleanup + raw-doc-spread fix.** `src/App.jsx:134-139,200-211`. Timer never cleared on unmount/advance; `cloudStats` spread pulls `email`/`role`/`uid` into `globalStats` and degrades the `lastLogin` Firestore Timestamp on round-trip.
5. **Rekordi fetch cost.** `src/App.jsx:253-257`, `src/services/firebase.js:226-241`. Drop the unconditional mount fetch; add `limit()` + composite index to `getFastestPerfectRounds` instead of scanning every score ever recorded. *(architecture-audit, corroborated by `audit-data-security.md` [Antigravity])*
6. **Bundle splitting.** `React.lazy` for `AdminPanel` (currently shipped to every visitor for one hardcoded email); `manualChunks` or dynamic import for question JSON (now 3542 questions / ~1.29MB, not the ~500KB CLAUDE.md documents — 2.4× doc drift). *(architecture-audit, corroborated by `audit-performance.md` [Antigravity])*
7. **Unify the category registry.** `src/data/categoryKeys.js` becomes the single list; `categoryPacks`, `CATEGORY_META`, `ID_PREFIXES`, `CATEGORY_FILES` all build from or assert against it — currently 4 separately-maintained lists that can silently drift (adding a category today requires 5 uncoordinated edits). *(architecture-audit)*
8. **Aggregate-pool dedupe.** `src/data/questionsLoader.js:65`, `src/utils/questionMerge.js:145-146`. 5 confirmed duplicate questions currently live in the `opca_znanje` aggregate pool because dedupe only checks the target file, not the full aggregate. Dedupe `getAllQuestions()` by normalized text.
9. **Firestore rules magic-number drift.** `firestore.rules:66,107`. The `achievementCount <= 30` and `score <= 10000` caps are hand-derived from `achievements.js`/`gameBalance.js` with no assertion tying them together — the next added achievement or balance change breaks writes invisibly (caught only by `console.error`). Add a source comment + a CI check.
10. **Unpaginated admin reads.** `src/services/firebase.js:274-288,374-385`. `getAllRegisteredUsers`/`getAllPublicProfiles`/`clearLeaderboardForCategory` are uncapped — mounting AdminPanel downloads the entire user table in one batch. *(`audit-data-security.md` [Antigravity])*
11. **`getBestScoresAcrossCategories` N+1 fan-out.** `src/services/firebase.js:202-216`. 8 parallel queries today, grows linearly per new category — low urgency, bundle with #5 above if touching Rekordi cost anyway. *(`audit-data-security.md` [Antigravity])*
12. **Test seams / emulator wiring.** `src/services/firebase.js:29-37`. Zero `import.meta.env` usage anywhere — Firebase config is a hardcoded literal, so the app can't be pointed at the Firestore emulator, which is why `golden-path.mjs` writes to live production on every run. Read config from `VITE_FIREBASE_*` with current literals as fallback; add emulator connection behind a flag. *(architecture-audit)*
13. **Dead prop coupling.** `src/App.jsx:1106-1117`. `AdminPanel` receives `globalStats`/`setGlobalStats`/`leaderboards`/`setLeaderboards` it never uses (`AdminPanel.jsx:21` signature is just `{ onClose }`).
14. **Admin gate path drift.** `src/App.jsx:751-760,1105`. CLAUDE.md documents the admin panel as gated by path *and* email; the header button actually renders on any path. Low security impact (real boundary is `firestore.rules`), but the doc claim is false — fix or update the doc.

---

## Phase 4 — UX / Game Loop Fixes

1. **Timer prominence.** `src/components/TimerRing.jsx`. Bump `SIZE` 32→56, `STROKE_WIDTH` 3→5, digit class to `text-lg font-black` — currently the single most important gameplay signal is visually the smallest element on screen. *(design-ux-audit, corroborated by `audit-performance.md` [Antigravity])*
2. **Header consolidation.** `src/App.jsx` header block. Collapse Razina + Zlatnici into one profile pill; move Trofeji into the Stats modal entry point — 5-6 same-weight interactive elements currently crowd one row on mobile widths. *(design-ux-audit, corroborated by `audit-performance.md` [Antigravity])*
3. **Tactile tap feedback.** Add `active:scale-[0.97] active:brightness-95 transition-transform` to every interactive button — `hover:` classes alone don't fire reliably on touch (`hoverOnlyWhenSupported: true` in `tailwind.config.js`). *(design-ux-audit, corroborated by `audit-performance.md` [Antigravity])*
4. **Category color variety.** Add a `color` token per entry in `categoryMeta.js`; all 8 categories currently share one identical amber chip style.
5. **Lobby CTA hierarchy.** Surface a featured/continue category card, or give the primary action distinct fill/size vs. the rest of the grid.
6. **Game-over feedback.** Add a brief shake/flash before the 1s cut to GAMEOVER — currently a silent transition beyond the existing red highlight.
7. **Sticky modal headers.** `GuideModal.jsx`, `StatsModal.jsx`, `AuthModal.jsx`. Close button scrolls out of view on long content (achievement lists, guide rules). *(`audit-performance.md` [Antigravity])*

## Phase 5 — Polish

1. Replace `bg-[#121824]` in `AuthModal.jsx` with `bg-slate-900` to match the rest of the token set.
2. Raise state-bearing text off `text-[9px]`/`text-[10px]` (stat labels, timer digits) to a ~11-14px minimum; reserve sub-11px for purely decorative marks.
3. Simplify the stacked gradient header logotype (badge gradient + text gradient together reads as a generic AI-gradient trope).
4. Remove `framer-motion` from `package.json` — declared dependency, zero imports anywhere in `src/` or `api/`.
5. Refresh CLAUDE.md's stale bundle-size claim (~500KB/1492 questions → actual ~1.29MB/3542 questions) and the two-of-three `ADMIN_EMAIL` locations it doesn't mention (`api/questions.js:24`).

---

## Verification

- **Phase 1 & 3 logic fixes:** re-run `.claude/skills/run-triviabong/golden-path.mjs` after each fix lands; it exercises the full LOBBY→PLAYING→GAMEOVER path and fails on any console error. Write a throwaway script for anything golden-path doesn't cover (multi-tab race, sign-out reset, joker exploit reproduction) per this session's established pattern — delete after use.
- **Firestore rules changes (Phase 1 #10, #11, #15):** test against the Firestore emulator per CLAUDE.md's existing convention (`firebase emulators:exec --only firestore "node <script>.mjs"`) before deploying — do not deploy rules without that verification and explicit confirmation.
- **Phase 2/3 refactors:** `npm run lint` must hold at or improve the current 9-problem baseline; `npm run build` must stay clean.
- **Phase 4/5 UX/polish:** visual check via screenshots at both a normal and near-`timeLeft<=4` state, and on a mobile viewport (~375-414px width), per this session's established screenshot-and-Read pattern.
- **L1 migration specifically:** re-verify against live `publicProfiles` data (same method used to diagnose it) that all previously-inflated accounts now show the policy-correct level.
