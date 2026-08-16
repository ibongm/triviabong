# Daily Challenge — Implementation Plan

Status: **design locked, not yet implemented.** This document specifies what to build; it intentionally contains no code. Claude Code should verify every architectural assumption below against the live codebase before writing anything, per repo convention.

---

## 1. Feature summary

A competitive daily mode: every player gets the same 10 questions on a given calendar day (Europe/Zagreb time), scores rank against each other on a per-day leaderboard, and whoever holds #1 at day-rollover wins a coin prize. Up to 4 attempts/day are allowed, with an escalating coin cost after the first, only the player's best score of the day counts, and no jokers are available.

### Locked rules
| Decision | Value |
|---|---|
| Question count | 10 |
| Question pool | Full aggregate pool (`getAllQuestions()` — same source as Opće znanje) |
| Question selection | Deterministic, seeded by Zagreb calendar date; same 10 questions for every player that day |
| Day boundary | Europe/Zagreb time, not device-local |
| Attempt 1 | Free |
| Attempt 2 | 2 coins |
| Attempt 3 | 3 coins |
| Attempt 4 | 5 coins |
| Attempt 5+ | Not allowed — hard cap at 4/day |
| Score that counts | Best of the day's attempts only (replays don't add separate entries) |
| Jokers | Disabled entirely in this mode |
| Per-attempt rewards | Normal round rewards apply on every attempt (completion coin, perfect bonus, streak-milestone bonus, XP) — not just the first |
| Daily winner prize | 20 coins to whoever holds rank #1 at Zagreb midnight rollover |
| Ties for #1 | Every tied player gets the full 20-coin payout (no split) |
| Leaderboard submission | Requires sign-in (no anonymous play in this mode) |

---

## 2. Why this isn't a small extension of existing leaderboards

Worth stating plainly before scoping work: two pieces of this have **no precedent anywhere in the current codebase** and need new patterns, not copies of existing ones.

1. **Deterministic same-for-everyone question selection.** Every question draw today (`Math.random()` in `App.jsx`, `shuffleArray` in `questionUtils.js`) is unseeded. Nothing in the app currently produces a reproducible "same shuffle for everyone" result. This needs a small seeded-PRNG utility that does not exist yet.
2. **Cross-write attempt counting/enforcement.** Every Firestore write in this app today is single-document, client-computed, and only *bounds*-checked (e.g. "score must be an int between 0 and 10000"). Nothing today counts *how many prior writes a uid has made* before allowing a new one. Enforcing "max 4 attempts/day, priced 0/2/3/5" server-side is a genuinely new rules pattern, not a copy of the existing `leaderboards/{cat}/scores` `allow create` block.

Everything else (scoring, UI, joker-disable, rewards) is a straightforward reuse of existing systems.

---

## 3. Data model

### 3.1 Daily question selection (no new Firestore doc)

- Compute `dailyDateKey` = current date in `Europe/Zagreb`, formatted `YYYY-MM-DD` (mirrors the existing `getLocalDateString` pattern in `achievements.js`, but pinned to a fixed timezone instead of device-local — needs `Intl.DateTimeFormat` with `timeZone: 'Europe/Zagreb'`, not `toLocaleDateString()` with no timezone argument).
- Derive a numeric seed from `dailyDateKey` (e.g. a simple string hash — no cryptographic requirement, just deterministic and not trivially invertible by casual inspection).
- Implement a small seeded PRNG (e.g. mulberry32 or similar — pick something well-known, ~10 lines, no new dependency) in a new pure utility file.
- Use the seeded PRNG to pick 10 question IDs from `getAllQuestions()`, sorted/indexed in a stable order first (array order from `getAllQuestions()` must be deterministic across clients/runs for the same input data — verify this, since object key iteration order or file-load order could theoretically differ; if `getAllQuestions()` concatenates category files in a fixed array order today, this is already safe, but confirm rather than assume).
- **On the "technically peekable" concern:** a client-computed seed from a public formula is not cryptographically hidden — anyone reading the bundle can compute future dates' sets in advance if they choose to. Full closure of that gap would require a server-authoritative pick (Cloud Function / scheduled job), which is a real architecture addition this project doesn't have today (see CLAUDE.md: deliberately backend-less aside from `api/questions.js`). Decision for this plan: accept the client-computed seed as sufficient (matches the project's existing trust model everywhere else), and treat true server-side secrecy as an explicit non-goal, not an oversight. Flag this tradeoff in code comments at the seed-derivation site so a future reader doesn't mistake it for an accident.

### 3.2 New Firestore collection: `dailyLeaderboards/{date}/scores/{scoreId}`

Mirrors the shape of `leaderboards/{categoryKey}/scores/{scoreId}` with the same bounded-write philosophy (client-computed, server only bounds the damage):

```
dailyLeaderboards/{date}/scores/{scoreId}
  uid: string (required — no anonymous submissions, unlike the existing leaderboards)
  name: string (1-20 chars, same bound as existing leaderboard rule)
  score: int (0-10000, same ceiling as existing leaderboard rule — jokers are disabled so realistic max is lower, but reuse the existing bound rather than inventing a new one)
  attemptNumber: int (1-4 — which attempt produced this score, needed for the cost/cap enforcement below)
  createdAt: server timestamp
```

Design note: rather than one doc per attempt, consider **one doc per `{date, uid}`** (doc ID = uid, or a composite) holding `bestScore`, `attemptsUsedToday`, and `bestScoreAttemptNumber`, updated via `set(..., {merge: true})` on each attempt if the new score beats the stored one. This is a real fork — see Section 5, Open Question 1.

### 3.3 New Firestore doc (per-player, per-day): attempt/spend tracking

Needed regardless of which leaderboard-doc shape is chosen, because *something* has to durably record "this uid has used N attempts today, spent M coins today" to enforce the cap and prevent a client from just re-sending a free-attempt-priced write a fifth time.

Proposed: `dailyAttempts/{date}_{uid}` (or a subcollection `dailyAttempts/{date}/players/{uid}`):
```
uid: string
date: string (YYYY-MM-DD, Zagreb)
attemptsUsed: int (0-4)
coinsSpentToday: int (derivable from attemptsUsed via the fixed price table, but storing it explicitly makes rules simpler — see Section 4)
```

This doc is written/incremented on every attempt start (before the round plays), not on score submission — otherwise a player could start a round, see it's going badly, abandon it without submitting, and get the attempt back for free. Needs explicit decision: **does starting a round consume an attempt/coin immediately, or only a completed-and-submitted round?** (See Section 5, Open Question 2 — this materially affects both UX and rules design.)

### 3.4 Coin spend for attempts 2-4

Coins are currently a plain field on `users/{uid}` (`globalStats.coins`), deducted client-side, synced via `syncUserStatsToFirestore`'s `setDoc(..., {merge:true})`. There is no existing pattern anywhere in this codebase for a *rules-enforced* spend (jokers today are gated purely client-side by `globalStats.coins < JOKER_COSTS.x`, with no server check that the deduction actually happened or was affordable). For the daily challenge, because it feeds a competitive leaderboard, the spend needs a rules-level check that:
- The player actually has enough coins before the write is allowed to proceed to a paid attempt, **and**
- The attempt count for that date/uid doesn't already exceed 4.

Both checks require the rules engine to read the `dailyAttempts/{date}_{uid}` doc (via `get()`) inside the write rule for the leaderboard/attempt doc — Firestore rules support this via `get()` calls, but each one counts against the free "document reads within a rule" budget and adds latency; keep the number of cross-doc `get()`s in the hot path minimal (ideally one).

---

## 4. Firestore rules changes

New rules blocks needed in `firestore.rules`, modeled on the existing `leaderboards/{categoryKey}/scores/{scoreId}` block but extended with cross-document checks that have no precedent in the current ruleset:

```
match /dailyAttempts/{attemptDocId} {
  // Only the owning uid can read/write their own attempt-tracking doc.
  // attemptDocId encodes {date}_{uid} — parse or store uid as a field and
  // check request.auth.uid == resource.data.uid (existing isOwner() pattern
  // needs the uid to already exist in resource.data for updates; for
  // create, check against request.resource.data.uid instead).

  allow read: if isOwner(<uid extracted or stored on the doc>);

  allow create: if isOwner(<uid>)
    && request.resource.data.attemptsUsed == 1
    && request.resource.data.keys().hasOnly(['uid', 'date', 'attemptsUsed', 'coinsSpentToday']);
    // first attempt of the day for this uid — free, no coin check needed

  allow update: if isOwner(<uid>)
    && request.resource.data.attemptsUsed == resource.data.attemptsUsed + 1
    && request.resource.data.attemptsUsed <= 4
    // price table enforcement — the coin delta charged must match the
    // fixed price for the attempt number being purchased (2/3/5), and the
    // owning user's users/{uid}.coins must be >= that price. This requires
    // a get() on users/{uid} inside this rule (or restructure so the coin
    // deduction and attempt-increment happen as a single batched write from
    // the client with both documents' rules validating consistently).
}

match /dailyLeaderboards/{date}/scores/{scoreId} {
  allow read: if true; // public leaderboard, same as existing leaderboards

  allow create, update: if isOwner(request.resource.data.uid)
    && request.resource.data.score is int
    && request.resource.data.score >= 0
    && request.resource.data.score <= 10000
    && request.resource.data.name is string
    && request.resource.data.name.size() > 0
    && request.resource.data.name.size() <= 20
    // Must also confirm this write corresponds to an attempt already
    // recorded in dailyAttempts/{date}_{uid} for the SAME date — otherwise
    // nothing stops a client from writing directly to the leaderboard
    // bypassing the attempt/cost tracking entirely. This is the crux of
    // why these two collections can't be designed independently.

  allow delete: if isAdmin(); // admin cleanup, matches existing pattern
}
```

**This block needs to be written and tested against the Firestore emulator before deploying** — per CLAUDE.md's existing convention (`firebase emulators:exec --only firestore "node <test-script>.mjs"` using `@firebase/rules-unit-testing`), and doubly so here since this is the first rules block in the project that does cross-document validation. Write an ad hoc emulator test script specifically exercising: (a) attempt 1 succeeds free, (b) attempt 2 fails without enough coins, (c) attempt 2 succeeds and deducts correctly, (d) attempt 5 is rejected outright, (e) a leaderboard write with no matching `dailyAttempts` doc is rejected, (f) a leaderboard write attempting a worse score than the stored best either no-ops or is rejected depending on the Section 5 decision.

---

## 5. Open questions to resolve before implementation starts

These are real design forks, not implementation details — Claude Code should not silently pick an answer.

1. **Leaderboard doc shape: one doc per attempt, or one doc per `{date, uid}` holding only the best?** One-per-attempt is simpler to write but means the rules (and any client-side rank query) must filter/dedupe to "best per uid" at read time, which is more complex and more read-heavy for a page that needs to show a clean ranked list. One-per-`{date,uid}` (upsert on improvement) keeps the leaderboard collection itself clean and directly queryable by `orderBy('score','desc')`, but means the write path is "read existing best, compare, conditionally write" rather than a plain `addDoc` — closer to how `maybeUpdateFastestPerfectRecord`'s transaction pattern in `firebase.js` already works, which is a reasonable precedent to reuse here.
2. **Does starting an attempt consume the cost/count immediately, or only a submitted, completed round?** Consuming on start is simpler to enforce (no "abandoned round" edge case) but means a player who closes the tab mid-round loses that attempt/coin for nothing, which will generate support complaints in a beta. Consuming on submit is friendlier but reopens the question of what happens if a round is started, coins are reserved, and never submitted — does the reservation ever expire/release?
3. **Winner determination timing.** "Whoever holds rank #1 at Zagreb midnight" needs *something* to actually run at that moment and pay out — there is no scheduled/cron mechanism in this project today (confirmed: no Cloud Functions, no `workflow_dispatch`-triggered payout job). Options: (a) a Vercel Cron / scheduled Cloud Function evaluated at Zagreb midnight (new infra, first of its kind in this project), or (b) lazily evaluated — the first player to open the app on the new day triggers a "was there an unresolved winner from yesterday" check client-side and writes the payout. Option (b) avoids new infra but means the payout timing is fuzzy (depends on when someone happens to open the app) and needs care to ensure it only ever pays out once (idempotency) even if multiple clients race to be "first" the next morning.
4. **Display of the daily leaderboard mid-day.** Does the UI show live standings while the day is in progress (motivating players to check back and try to reclaim #1), or only reveal results after rollover? This is a product decision with UX implications, not just a technical one — live standings likely increase replay-for-competition behavior (aligning with the "competitive" goal) but need the leaderboard read to be cheap/frequent-safe.
5. **What happens to `dailyAttempts` and `dailyLeaderboards` docs over time?** No retention/cleanup policy has been discussed. Given daily rollover, old days' docs will accumulate indefinitely. Decide whether old daily data is kept forever (fine at beta scale, matches "no precomputed counters, storage is cheap" philosophy elsewhere in the project), or pruned after some window.

---

## 6. Implementation checklist

Grouped roughly in dependency order. Sizes are rough guidance, not commitments.

### 6.1 Foundations
- [ ] Add a seeded-PRNG utility (new file, e.g. `src/utils/dailySeed.js`) — pure function, no React/Firebase imports, mirroring the existing style of `questionUtils.js`/`gameplayInsights.js`.
- [ ] Add a Zagreb-pinned date helper (extend or sit alongside `getLocalDateString` in `achievements.js` — likely a new function rather than modifying the existing one, since the existing one is deliberately device-local and other callers depend on that).
- [ ] Add `getDailyChallengeQuestions(dateKey)` — pure function combining the seed + PRNG + `getAllQuestions()` to return today's 10 question objects. Confirm `getAllQuestions()`'s array ordering is stable/deterministic first (Section 3.1).
- [ ] Add daily-challenge cost table as a named constant in `src/constants/gameBalance.js` (matching the existing `JOKER_COSTS` pattern): `DAILY_CHALLENGE_COSTS = [0, 2, 3, 5]` and `DAILY_CHALLENGE_MAX_ATTEMPTS = 4`, plus `DAILY_CHALLENGE_WINNER_PRIZE = 20`.

### 6.2 Firestore rules
- [ ] Resolve Open Questions 1 and 2 above — rules design depends on the answers.
- [ ] Write `dailyAttempts/{date}_{uid}` and `dailyLeaderboards/{date}/scores/{scoreId}` rules blocks in `firestore.rules`.
- [ ] Write an emulator test script exercising the cases listed at the end of Section 4.
- [ ] Deploy rules (`firebase deploy --only firestore:rules`) only after emulator tests pass.

### 6.3 Firebase service layer (`src/services/firebase.js`)
- [ ] `getDailyAttemptStatus(uid, date)` — reads `dailyAttempts/{date}_{uid}`, returns attempts used / next cost / can-play.
- [ ] `startDailyAttempt(uid, date)` — writes/increments the attempt doc per the Section 5.2 decision, deducting coins if this is a paid attempt (needs to be a transaction if it touches both `dailyAttempts` and `users/{uid}.coins` atomically — mirror the `runTransaction` pattern already used in `maybeUpdateFastestPerfectRecord`).
- [ ] `submitDailyScore(uid, date, name, score, attemptNumber)` — writes to `dailyLeaderboards/{date}/scores` per the chosen doc shape.
- [ ] `getDailyLeaderboard(date)` — read, ordered by score desc, same shape as `getLeaderboardFromFirestore`.
- [ ] Winner-payout function per the Section 5.3 decision — either a scheduled function (new infra) or a lazy client-triggered check-and-pay with idempotency guard.

### 6.4 Game flow (`src/App.jsx`)
- [ ] New entry point into the daily challenge (likely a new button/card on the lobby screen, alongside category selection — needs a design decision on where it lives visually, not addressed in this plan).
- [ ] New `gameState` handling or a mode flag threaded through the existing `LOBBY → PLAYING → GAMEOVER/VICTORY` machine (per CLAUDE.md's existing convention: "add a new `gameState` value and a corresponding render branch rather than introducing routing" — likely a `dailyChallengeMode` boolean alongside the existing state rather than new top-level states, since the flow is otherwise identical).
- [ ] Force `selectedCategory` selection to bypass normal category choice and load `getDailyChallengeQuestions(today)` instead of the existing `getQuestionsByCategory` random-slice path.
- [ ] Disable all three joker handlers/buttons when in daily-challenge mode (reuse existing `jokersUsed`/`JOKER_COSTS`-gated UI, but force all three inert regardless of coin balance — the existing "greyed out, native disabled" pattern noted in the codebase for insufficient coins can likely be reused for "disabled because daily mode" too, but confirm the UI copy needs to differ, since "not enough coins" and "not available in this mode" are different messages to the player).
- [ ] Wire round-end for daily mode to call `submitDailyScore` instead of / in addition to the normal `saveScoreToFirestore` path, while still applying normal `applyRoundEndRewards` (XP, coins, achievements) per the locked "every attempt earns normal rewards" rule.
- [ ] Show attempt count / next cost / cap-reached state in the pre-round UI (needs the cost table and current attempt status from `getDailyAttemptStatus`).

### 6.5 New UI surfaces
- [ ] Daily leaderboard view — new component (e.g. `DailyLeaderboardModal.jsx` or a tab within the existing `RekordiModal.jsx`/`RekordiBoards.jsx` — decide whether this is a new modal or folded into the existing Rekordi UI, since Rekordi already handles multiple leaderboard "boards"; folding in is likely less UI surface to maintain but needs the existing Rekordi data-fetch pattern extended for a per-date collection rather than a fixed category key).
- [ ] Post-round summary for daily mode — show rank, best score, whether the player currently holds #1, and remaining attempts/cost for a replay.
- [ ] Winner announcement — surfacing the 20-coin payout to the player(s) who won, whenever that resolves (depends on Section 5.3 decision — a lazy client-side check likely needs a "you won yesterday's challenge!" toast/modal on next app open).

### 6.6 Testing
- [ ] Extend the `run-triviabong` Claude Code skill's `golden-path.mjs` (or add a sibling script) to cover: playing a free daily attempt, attempting a 5th play and confirming rejection, and a full score-submission-to-leaderboard round-trip. Per CLAUDE.md's existing caution, remember this hits live production Firestore when run — treat it the same way the existing E2E scripts are treated (manual/`workflow_dispatch` only, not wired into normal CI).
- [ ] Firestore emulator rules tests per Section 4.
- [ ] Manual verification of the Zagreb-midnight rollover boundary specifically (e.g. temporarily mocking the date function, since waiting for real midnight to test is impractical) — this is the single highest-risk piece of new logic to get subtly wrong (off-by-one on DST transitions, UTC-vs-Zagreb offset errors), so it deserves deliberate test coverage rather than relying on organic beta usage to surface bugs.

---

## 7. Explicit non-goals for this iteration

Stated to keep scope bounded — these are reasonable future extensions, not omissions:

- True server-authoritative "unpeekable" question selection (would require Cloud Functions / scheduled infra this project doesn't have — see Section 3.1).
- Multi-day daily-challenge streak tracking or achievements specific to daily-challenge participation (separate from the existing `dayStreak`, which is about playing *any* mode on consecutive days).
- Any social/sharing mechanic around daily results (e.g. "share your rank") — noted as a separate feature area in earlier discussion, not folded in here.
- Localization / non-Croatian daily challenge variants.
