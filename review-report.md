# TriviaBong — Code Review Report

**Date:** 2026-08-04 · **Branch:** `main` · **HEAD:** `dab1151`

> ⚠️ **PARTIAL COVERAGE.** A three-agent review panel was dispatched. Only **Agent B completed**. Agents A and C were terminated mid-run by an API session limit and returned **zero findings**. Do not read this report as a clean bill of health — see [Not covered](#not-covered--do-not-treat-as-clean) for the substantial areas that were never inspected.

## Coverage status

| Agent | Scope | Status |
|---|---|---|
| **A** — Data & Logic Security | Question JSON integrity, `firestore.rules`, `api/questions.js` auth, swallowed promise rejections | ❌ **Did not run** — session limit, 0 findings |
| **B** — React Architecture & State | Timers, game lifecycle, stale closures, effect deps, race conditions | ✅ **Complete** — 12 findings |
| **C** — Performance & UI | Re-render cost, bundle size, Tailwind, responsive, a11y | ❌ **Did not run** — session limit, 0 findings |

One additional `[Critical Fix]` below (**L1**) was diagnosed directly against live production Firestore data before the panel ran; the panel agents were explicitly instructed to skip it.

**Total findings: 13** — 9 Critical, 2 Performance, 2 Cleanliness.

---

## Prioritized findings

### [Critical Fix]

| # | Src | File:Line | Finding | Failure scenario | Proposed fix |
|---|---|---|---|---|---|
| **L1** | Lead | `src/utils/leveling.js:12-36`, `src/App.jsx:450`, `:378` | Commit `4485e0c` changed XP from **50 → 1** per correct answer and replaced the flat 500-XP curve with a tiered one, but shipped **no migration for banked xp**. Every pre-existing account's `xp` is a 50×-inflated legacy number being read by the new curve. | Verified against live `publicProfiles`. **3 accounts already inflated** — Ivan Marević 6→**14** (xp 2912), ljubica tomanovic 7→**15** (3383), Ivan Druzijanic 7→**15** (3325). **4 more detonate on their next correct answer** — Luka Marevic 9→**17** (4300), Svemir Tomić 6→**14** (2900), Cro Magnon 3→**9** (1300), Ivano Štrbić 2→**6** (500). Fires via `Math.max(prevLevel, computeLevelFromXp(newXp))`. | Versioned one-time migration. Add `statsVersion` to `DEFAULT_GLOBAL_STATS`; in a new `src/utils/statsMigration.js`, read `statsVersion` from the **raw** persisted object *before* merging over defaults (merging first makes legacy data look already-migrated), then cap level at `Math.min(storedLevel, Math.floor(xp/500)+1)` and rebase `xp` onto the new curve at the same level + progress fraction. Hook both load paths: `App.jsx:122-129` (localStorage) and `:199-212` (Firestore). **Blocked on two product decisions — see [Open decisions](#open-decisions).** |
| **B1** | Agent B | `src/App.jsx:487`, `:492`, `:528`, `:532` | Four `setTimeout`s that drive `gameState`/`currentIndex` are never stored or cleared. The header logo (`:696`) sets `gameState('LOBBY')` and renders outside every `gameState` branch, so it is clickable mid-round. | Answer question 10 correctly, then click the "TriviaBong" logo within 1200ms. You land in LOBBY; ~1s later confetti fires *over the lobby*, `applyRoundEndRewards` grants coins/XP for an abandoned round, and `setGameState('VICTORY')` yanks you to the victory screen. Same on last life → the auto-save effect (`:653`) writes that score to the **live leaderboard**. | Store pending transitions in a ref and clear on unmount + on leaving `PLAYING`: `const advanceTimer = useRef(null)`; then `useEffect(() => { if (gameState !== 'PLAYING') clearTimeout(advanceTimer.current); return () => clearTimeout(advanceTimer.current); }, [gameState])` |
| **B2** | Agent B | `src/App.jsx:342` | `totalScore: (prev.totalScore \|\| 0) + (isCorrect ? score : 0)` — `updateCategoryStats` is called at `:416`, **before** `newScore` is computed at `:427`, so it adds the *running score from before this answer*. | A flawless round earning e₁…e₁₀ grows `totalScore` by `0 + e₁ + (e₁+e₂) + … + (e₁+…+e₉)` ≈ **4.5× the round score**, while Q10's points are never counted. Rendered as "Bodovi" at `StatsModal.jsx:97` and synced to `users/{uid}` on every answer. | Pass the earned amount explicitly (same pattern as the existing `jokersUsedSnapshot`): `const updateCategoryStats = (isCorrect, earnedPoints = 0) => { … totalScore: (prev.totalScore \|\| 0) + earnedPoints … }` and call it *after* computing `earned`. |
| **B3** | Agent B | `src/App.jsx:197-213` | Auth listener has **no `else` branch for sign-out** — `globalStats` is never reset when `user === null`. Only `currentUser`/`statsReadyForUid` are cleared. | Sign in on a shared device, reach level 6 / 40 coins / 12 trophies, click logout (`:768`). Header still shows Razina 6 / 40 zlatnika / 12 trofeja, and the persist effect at `:234` writes the ex-account's stats to localStorage. The next anonymous player spends those coins on jokers and inherits the trophies. | `if (user) { … } else { setGlobalStats(DEFAULT_GLOBAL_STATS); }` |
| **B4** | Agent B | `src/App.jsx:199-212` | `await getUserStatsFromFirestore(user.uid)` has no cancellation/staleness guard. `statsReadyForUid` gates the *write* side but nothing invalidates a late resolve. The fetch can do **two** server round-trips (`firebase.js:86-90`), widening the window. | (a) Sign in, log out while the fetch is in flight → it resolves and restores the ex-account's stats into memory + localStorage *after* the reset. (b) Sign out of A straight into B; if A's fetch resolves second, `globalStats` holds A's data and `statsReadyForUid === A.uid` while `currentUser.uid === B.uid`, so the `:235` guard is false forever and **B's entire session never syncs to Firestore**. | Generation-guard the callback: `const authGen = useRef(0)`; inside, `const gen = ++authGen.current; … const cloudStats = await getUserStatsFromFirestore(user.uid); if (gen !== authGen.current) return;` |
| **B5** | Agent B | `src/App.jsx:260-276` | Timer effect only bails on `gameState !== 'PLAYING'` and `selectedOption !== null`. It has no awareness of `showStatsModal` / `showGuideModal` / `showAchievementsModal` / `showRekordiModal` / `showAuthModal`, whose trigger buttons (`:710`, `:730`, `:743`, `:777`) render unconditionally during play. | Mid-question, click **Vodič**. The modal covers the screen; 20s later `handleAnswerTimeout` runs behind it — you silently lose a life and the round advances. On your last life you are dropped to GAMEOVER while still reading the guide. | Derive one flag and add to guard + deps: `const isPaused = showStatsModal \|\| showGuideModal \|\| showAchievementsModal \|\| showRekordiModal \|\| showAuthModal;` then `if (gameState !== 'PLAYING' \|\| selectedOption !== null \|\| isPaused) return;` |
| **B6** | Agent B | `src/App.jsx:177-187` | `currentShuffledOptions` and `answerLocked` are *effect-written* state rather than derived values, so they lag the `currentIndex` change by one committed, painted frame (`useEffect` runs after paint). | On advance (`:496-498`) React commits one frame where question text = **N+1**, options = **N's**, `selectedOption` = `null`, `answerLocked` = `false`. Those stale buttons render **enabled** and wired to `handleAnswer` for question N+1 — the 300ms input lock does not cover the transition frame. *Agent B marked the visual flash **UNVERIFIED** (code reading only, not reproduced in-browser).* | Derive instead of store: `const currentShuffledOptions = useMemo(() => shuffleArray(getQuestionOptions(questions[currentIndex])), [questions, currentIndex])`, and set `answerLocked = true` in the same batch that advances `currentIndex`, letting the effect only *un*lock. |
| **B7** | Agent B | `src/App.jsx:436` + `src/utils/achievements.js:31` | Speed achievements key off raw `timeLeft`, which `activatePlusTen` (`:586`) pushes to **30** — above `QUESTION_TIME_SECONDS`. `lightning_reflexes` ("< 2 sekunde") is `timeLeft > 18`; `fastAnswerStreak` ("< 3 sekunde") is `timeLeft > 17`. | On Q1, click **+10s** at t=19 (`timeLeft` → 29). Wait 5 seconds, answer correctly at `timeLeft = 24`. `24 > 18` → "Brži od svjetlosti" unlocks for a **5-second** answer; `24 > 17` bumps `fastAnswerStreak`, so "Zvučni zid" (5 consecutive sub-3s answers) unlocks with zero speed. | Measure elapsed, not remaining — track `questionStartTime` and pass `elapsedMs` in ctx. Or clamp for achievements only: `const effectiveTimeLeft = Math.min(timeLeft, QUESTION_TIME_SECONDS);` (leave the score speed bonus alone — `firestore.rules:52` already budgets for the joker). |
| **B8** | Agent B | `src/App.jsx:278-291` | `selectCategory` fires an async `getLeaderboardFromFirestore` with no request-generation guard and no cleanup; a late response unconditionally calls `setActiveCategoryLeaderboard`. | LOBBY → click **Geografija** → immediately **Natrag** → immediately **Povijest**. If Geografija resolves second, the screen shows the "Povijest" header over **Geografija's** scores, and the earlier `setIsLoadingLeaderboard(false)` kills the spinner before Povijest's data arrives. | `const lbReq = useRef(0)`; then `const req = ++lbReq.current; … const remote = await getLeaderboardFromFirestore(catKey); if (req !== lbReq.current) return;` |

### [Performance Optimization]

| # | Src | File:Line | Finding | Measured impact | Proposed fix |
|---|---|---|---|---|---|
| **B9** | Agent B | `src/App.jsx:233-239` | Every `globalStats` mutation triggers **two** Firestore writes (`syncUserStatsToFirestore` + `syncPublicProfile`), unbatched and undebounced. `syncPublicProfile` also uses `setDoc` **without** `{merge:true}`, rewriting the whole doc each time. | One 10-question round produces ~12-15 distinct `globalStats` commits (1 round start + 10 answers + up to 3 joker deductions + 1 round-end payout) → **~24-30 Firestore document writes per round, per signed-in player**. | Keep localStorage immediate, debounce the remote half: `useEffect(() => { if (!(currentUser?.uid && statsReadyForUid === currentUser.uid)) return; const t = setTimeout(() => { syncUserStatsToFirestore(...); syncPublicProfile(...); }, 2000); return () => clearTimeout(t); }, [globalStats, currentUser, statsReadyForUid])` |
| **B10** | Agent B | `src/App.jsx:268-273` | `sound.playTick()` is called **inside** the `setTimeLeft` updater — an impure state updater. Separately, `timeLeft` is a dep of the effect, so the interval is torn down and recreated every tick. | `main.jsx:7` enables `StrictMode`, which double-invokes updaters → **two overlapping tick sounds per second at t≤4s in dev**. Each 1000ms interval re-arms only after React commits, so the countdown accumulates render latency and runs measurably slower than wall-clock over 20s — which also **skews the `elapsedMs` written to the Rekordi speedrun board**. | Move the side effect out and stop re-arming: `useEffect(() => { if (timeLeft <= 4 && timeLeft > 1) sound.playTick(); }, [timeLeft])` and `setInterval(() => setTimeLeft(p => p - 1), 1000)` with `timeLeft` dropped from the interval effect's deps (key on question index instead). |

### [Code Cleanliness]

| # | Src | File:Line | Finding | Failure scenario | Proposed fix |
|---|---|---|---|---|---|
| **B11** | Agent B | `src/App.jsx:626-630` | `saveScore` writes the optimistic local leaderboard entry **before** awaiting Firestore and never rolls it back. The update is also non-functional (`setLeaderboards({ ...leaderboards, … })`, reading closure state). | Go offline, finish a round → `saveScoreToFirestore` returns `false` → throws → UI correctly shows "Spremanje nije uspjelo", but `localStorage['triviabong_leaderboards']` already holds the entry. Since `selectCategory:288` falls back to `leaderboards[catKey]` when the remote list is empty, that **never-saved score displays as a real leaderboard entry**. | Move the local write after a successful `await` and make it functional: `setLeaderboards(prev => ({ ...prev, [catKey]: [...(prev[catKey] \|\| []), entry].sort((a,b)=>b.score-a.score).slice(0,10) }))` |
| **B12** | Agent B | `src/App.jsx:134-139`, `:200-211` | (a) `jokerMessageTimer` is never cleared on unmount, nor is the message cleared on question advance or leaving `PLAYING`. (b) `setGlobalStats(prev => ({ ...prev, ...cloudStats }))` spreads the **raw `users/{uid}` doc**, mixing profile fields into the stats object. | (a) Click a joker with insufficient coins on Q5, answer within 2s → the red "Nemaš dovoljno zlatnika" banner persists under Q6. (b) `globalStats` ends up carrying `email`, `uid`, `photoURL`, `role`, `lastLogin` — all `JSON.stringify`'d into localStorage (**account email in plaintext**) and echoed back by `syncUserStatsToFirestore:108`. After one reload the `lastLogin` Firestore `Timestamp` has been JSON round-tripped into a plain `{seconds, nanoseconds}` map and **written back to Firestore in that degraded form**. | (a) `useEffect(() => () => clearTimeout(jokerMessageTimer.current), [])` plus `setJokerMessage(null)` in the index-change effect. (b) Whitelist on read: `const picked = Object.fromEntries(Object.keys(DEFAULT_GLOBAL_STATS).map(k => [k, cloudStats?.[k] ?? DEFAULT_GLOBAL_STATS[k]]))` |

---

## Verified clean (Agent B)

Negative results are real signal — these were actively checked and cleared:

- **Timer interval leak** — none. Deps `[timeLeft, gameState, selectedOption]` guarantee `clearInterval` before each re-arm; no second interval is ever created. The issue is churn (B10), not a leak.
- **`handleAnswerTimeout` double-fire** — impossible. It sets `selectedOption = 'TIMEOUT'` synchronously, re-running the effect into the early return. A user click racing the timeout is blocked by `disabled={selectedOption !== null || answerLocked}` (`:948`) plus the guard at `:410`.
- **Auto-save firing twice per round** — the `scoreSaved`/`isSaving` guard at `:621` holds; effect deps don't change during the in-flight window; the retry path is covered by `isSaving`. Cannot fire with a stale `score` either — `setScore` always commits at least one render before `setGameState`.
- **Joker coin double-spend** — not exploitable. React flushes between discrete click events, so a second handler sees the decremented `coins`.
- **Lobby category spam-click** — the grid unmounts on first click; the only reachable race is the `Natrag` round-trip (B8).
- **`setGlobalStats` non-functional updates** — all 7 call sites correctly use the functional form. The documented snapshot fixes (`jokersUsedSnapshot`, `checkTacticianOnJokerUse`) are complete. The one stale read they missed is `score` inside `updateCategoryStats` (B2).

## Lint baseline

`npm run lint` — **9 problems (7 errors, 2 warnings)**, matching the established baseline:

```
src/App.jsx
    1:8  error    'React' is defined but never used                    no-unused-vars
  178:5  error    Calling setState synchronously within an effect …    react-hooks/set-state-in-effect
  264:7  error    Cannot access variable before it is declared         react-hooks/immutability
  276:6  warning  missing dependency: 'handleAnswerTimeout'            react-hooks/exhaustive-deps
  663:6  warning  missing dependency: 'saveScore'                      react-hooks/exhaustive-deps
src/components/AdminPanel.jsx
   1:8  error  'React' is defined but never used                       no-unused-vars
  43:9  error  Calling setState synchronously within an effect …       react-hooks/set-state-in-effect
src/components/AuthModal.jsx
  1:8  error  'React' is defined but never used                        no-unused-vars
src/components/StatsModal.jsx
  1:8  error  'React' is defined but never used                        no-unused-vars
```

- **Noise:** the four `no-unused-vars` React imports; `App.jsx:264` (`handleAnswerTimeout` is a `const` at 513 referenced by an effect closure at 264 — effects run post-commit, so TDZ is unreachable); `AdminPanel.jsx:43`.
- **Knowingly tolerated:** the two `exhaustive-deps` warnings. No *other* exhaustive-deps issue exists.
- **Real bug behind a lint error:** `App.jsx:178` → finding **B6**.

---

## Not covered — do not treat as clean

Agents A and C never ran. **None** of the following was inspected:

**Data integrity (Agent A):**
- Duplicate `id` values within and across `src/data/categories/*.json` — matters especially because `opca_znanje` is an aggregate pool of every category.
- Duplicate / near-duplicate `question` text across files (same aggregate-pool concern).
- `correct_answer` also present inside `incorrect_answers` (would render two correct options).
- Per-object `category` field disagreeing with its containing file — visible during play, since the quiz header renders each question's own `category`.
- Schema violations, wrong `incorrect_answers` length (the 50:50 joker slices 2), stray HTML entities or whitespace breaking string equality.

**Backend security (Agent A):**
- Full `firestore.rules` review — privilege escalation, missing field-shape validation, client writes the rules would silently reject.
- `ADMIN_EMAIL` sync between `src/App.jsx` and `firestore.rules`.
- `api/questions.js` — token **audience/issuer** verification (not just signature), `email_verified` handling, input validation.
- Divergence between the client preview in `src/utils/questionMerge.js` and the server's authoritative merge.
- Manipulation vectors beyond the plain score value: `elapsedMs`/`isPerfect` spoofing, `publicProfiles` level/xp spoofing, writing another user's `uid`.

**Performance & UI (Agent C):**
- Per-timer-tick re-render cost across the single-component tree; whether modals are mounted-but-hidden; whether any shuffle/sort runs in the render body.
- Bundle composition — is the ~500KB of question JSON in the main chunk? Is `AdminPanel` (reachable only at `/admin` for one hardcoded email) code-split or shipped to every visitor?
- Firestore read count on LOBBY mount; whether `getFastestPerfectRounds` pulls entire collections client-side.
- Tailwind correctness, responsive breakpoints on a mobile-played game, a11y (icon-only button labels, `aria-live` on timer/score, color-only state).

Re-running A and C after the session limit resets (3am Europe/Zagreb) would close these gaps.

---

## Open decisions

Finding **L1** is blocked on two product calls:

1. **Level policy** — preserve each player's pre-rebalance level and rebase xp onto the new curve (you stay 6, Davor Milosevic stays 48), **or** honest reset onto the new curve (you drop to 2, Davor drops to 6).
2. **Rekordi correction** — add a one-shot AdminPanel backfill so the three already-inflated public profiles are fixed immediately, **or** let each self-heal when that player next opens the site.
