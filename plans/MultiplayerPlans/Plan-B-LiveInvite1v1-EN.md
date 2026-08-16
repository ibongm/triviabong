# Plan B — 1v1 Friend Invite (Live Invite Match)

**Status:** Plan only — no code written. Waiting for explicit go-ahead per project instructions.
**Dependency:** Assumes Plan A (Online Presence) exists, since inviting from the online list (B7) is the only invite method chosen.

---

## 1. Decision summary (from the filled-in template)

| Question | Decision |
|---|---|
| Number of questions | Fixed at 10 |
| Categories | Host chooses before sending the invite |
| Timer | Same as solo (`QUESTION_TIME_SECONDS = 20`, confirmed in `gameBalance.js`) |
| Scoring | Answer speed affects points — same system as solo (BASE_SCORE + SPEED_BONUS_PER_SECOND) |
| Rewards | Dedicated 1v1 trophy/achievement; coin/XP payout **not** selected — treating as "not for v1" |
| Jokers | Disabled |
| Invite | Directly from the online list |
| Responding to invite | In-app modal, accept/decline, 60s timeout |
| Leaving | 30s of inactivity → automatic forfeit, no penalty for now |
| Rematch | "Play Again" button sends a new invite to the same opponent |
| History | Match is saved, past 1v1 results visible |
| Playwright | Later |

---

## 2. Architectural context — what's actually new here

The current architecture (`CLAUDE.md`, confirmed by reading the repo) is a **client-only, single-player state machine** — `App.jsx` is the sole owner of `gameState`, nothing else reads or changes it. 1v1 is the first feature where **two different clients must share authoritative state live**. That's a qualitatively different problem from the Daily Challenge (async, one player writing their own result independently) or the leaderboard system (write-once, read-many).

Existing precedents that **help**:
- `sessions/{sessionId}` heartbeat pattern → I use an identical approach for "is my opponent still here"
- Daily Challenge payout (`api/daily-challenge-payout.js`, Admin SDK, bypasses rules) → precedent for "the server must be an authority" if any part of the match needs it (see §6, open question about simultaneous answers)
- `firestore.rules` style of strict `hasOnly()`/diff-based rules → match doc rules need to follow the same standard

What **doesn't exist yet** and needs to be built from scratch:
- A shared, real-time, two-client document where both players are allowed to write to different fields, but must not be able to see/change fields that would give them an unfair edge (e.g. the opponent's answer before the reveal)
- A new top level of the state machine — 1v1 mode doesn't fit into the existing `LOBBY→LEADERBOARD→PLAYING→GAMEOVER/VICTORY` sequence, since that sequence assumes a single player

---

## 3. Data model

### New collection: `matchInvites/{inviteId}`

A short-lived document that exists only while an invite awaits a response.

```
{
  fromUid: string,
  fromDisplayName: string,
  toUid: string,
  category: string,          // chosen by the host before sending (B2)
  status: 'pending' | 'accepted' | 'declined' | 'expired',
  createdAt: timestamp,
  expiresAt: timestamp,      // createdAt + 60s (B8)
}
```

- The `toUid` client (invitee) listens on `where('toUid', '==', myUid).where('status', '==', 'pending')` to show the modal
- On accept, the invitee writes `status: 'accepted'` — that's the trigger the `fromUid` client listens for to create the actual `matches/{matchId}` document
- After 60s with no response, the client that sent the invite locally detects the timeout and writes `status: 'expired'` (there's no real server to do this reliably — see §6's limitation)

### New collection: `matches/{matchId}`

The main shared document for the duration of a match.

```
{
  player1Uid: string,
  player2Uid: string,
  player1DisplayName: string,
  player2DisplayName: string,
  category: string,
  questionIds: string[],        // 10 questions, chosen at creation time - BOTH
                                 // clients must see the SAME order, so they're
                                 // chosen ONCE (by player1/the host) and written
                                 // here, not re-derived locally on each client
  status: 'waiting_ready' | 'question_active' | 'reveal' | 'match_over' | 'forfeited',
  currentQuestionIndex: number,  // 0-9
  questionStartedAt: timestamp | null,   // set by whichever client reaches that
                                          // phase first - see §6 on the "first
                                          // writer" risk

  // Per-player answers for the CURRENT question - cleared/reset when
  // advancing to the next question. Separate fields per player, not a
  // shared array, so rules can clearly restrict who may write which field.
  player1Answer: { optionIndex: number, answeredAt: timestamp } | null,
  player2Answer: { optionIndex: number, answeredAt: timestamp } | null,

  // Cumulative score through the match
  player1Score: number,
  player2Score: number,
  player1Correct: number,   // count of correct answers, for tie-break display
  player2Correct: number,

  lastActivityAt: timestamp,   // heartbeat for forfeit detection (B9)
  winnerUid: string | null,    // set when reaching match_over

  createdAt: timestamp,
}
```

**Why questions are chosen up front and written down, not picked "live" by index:**
If each client locally called `getQuestionsByCategory` by `currentQuestionIndex`, both clients would need an **identical seed/order** or they'd see different questions. Simpler and safer: the host, when creating the match, picks 10 question IDs once (using the existing `questionsLoader.js`), writes them into `questionIds`, and both clients then locally resolve the full question text from the **already-existing static JSON data** (no network read for question content — only IDs travel through Firestore). This is a clean reuse of the existing `questionsLoader.js` infrastructure, not a new system.

---

## 4. State machine — a new mode alongside the existing one

`App.jsx` currently has one `gameState`. 1v1 can't just be another branch of that same string, because all the solo-game logic (lives, jokers, streak) doesn't apply the same way. I'd suggest:

- A new top-level UI mode, e.g. `appMode: 'solo' | 'match'`, where `appMode === 'match'` renders a fully separate component tree (`MatchView.jsx`) that reads/writes `matches/{matchId}` instead of the local `gameState`
- Inside `MatchView.jsx`, the local display still tracks the phase from `match.status` (`waiting_ready → question_active → reveal → ... → match_over`), but **the source of truth is the Firestore document**, not local `useState`, since both clients need to see the same thing

This is deliberately kept separate from the existing `App.jsx` state rather than woven into it — it prevents 1v1 logic from accidentally snagging solo-game paths (lives/jokers/streak) it doesn't need.

---

## 5. Scoring — reusing the existing formula

`gameBalance.js` already has `BASE_SCORE = 100`, `SPEED_BONUS_PER_SECOND = 10`, `STREAK_MULTIPLIER_STEP = 0.2`. Your decision (B3: speed affects points, B4: same system as solo) means the **existing formula from `App.jsx` is reused verbatim** for every question in the match, computed locally on each client from `questionStartedAt` (a shared timestamp) and each player's own moment of answering — no new formula needed.

**Winner:** the higher `playerXScore` after 10 questions wins. On an equal score (a tie is possible) — **you didn't explicitly choose sudden-death vs. shared win in B4**, so I'd suggest a shared win (tie) as the v1 default, since sudden-death is an extra state-machine branch we can add later without breaking the existing model.

---

## 6. Critical issue: no real server — what that means for fairness

This is the single most important limitation of the whole plan, and it's worth naming explicitly before any code gets written.

The app is **client-only** — there are no Cloud Functions, no authoritative server arbitrating "who answered first" or "has time run out." Everything below relies on **Firestore rules as the only line of defense**, not server-side logic:

- **`questionStartedAt`** — must be set by whichever client reaches that phase *first* (`allow update` with a condition that the field is currently null/unset). A slight race is possible if both clients try simultaneously, but Firestore transactions/rules naturally resolve "only one write goes through," so this is safe, just not "elegant."
- **Detecting who answered first (for the speed bonus)** — each client writes `answeredAt: request.time` (a server timestamp, not the client's local `Date.now()`) to **its own** field (`player1Answer` or `player2Answer`), never the other's. Rules must prevent player 1 from writing `player2Answer`. This is fair because `request.time` is server-side and can't be spoofed.
- **Forfeit (B9, 30s of inactivity)** — this is the biggest gap: **without a Cloud Function, nobody besides the clients themselves checks whether 30s have passed.** In practice, whichever client *remains* in the match has to locally detect that the opponent's `lastActivityAt` hasn't updated in 30s and write `status: 'forfeited'` itself. That works in the normal case, but has a hole: if **both** players close their tabs at the same time, nobody writes the forfeit and the match stays "active" in the database forever (harmless to users, but clutter in the collection — cleanup similar to `presence`, see Plan A §4).
- **Open question for you:** if it later turns out clients can manipulate timing (e.g. spoofing their own `lastActivityAt` to dodge forfeit, or racing `questionStartedAt`), the next step would be adding a Cloud Function as the authority — same pattern as `api/daily-challenge-payout.js`, just triggered on a Firestore write instead of a cron. **I'm not proposing that for v1** since it adds a new deployment target (Firebase Functions, vs. the current Vercel-only setup) — but it's worth knowing as the exit strategy if it's ever needed.

---

## 7. `firestore.rules` — sketch of rules (not final code)

Summary of what the rules need to guarantee, following the existing style (`hasOnly`, diff-based):

- **`matchInvites/{inviteId}`**: create only by `fromUid` targeting themselves; update `status` only by `toUid` (accept/decline) OR by `fromUid` (expire); nobody may change `fromUid`/`toUid`/`category` after creation
- **`matches/{matchId}`**: create only when it follows an accepted invite (checked via `get()` on `matchInvites`, same pattern as `dailyLeaderboards` checking `dailyAttempts`); updates restricted per field:
  - `player1Answer` written ONLY by `player1Uid`, `player2Answer` ONLY by `player2Uid` — diff-based, each player must not touch the other's field
  - `questionStartedAt` written by either participant, but only if currently `null` (prevents overwriting)
  - `currentQuestionIndex`/`status` progression — must be monotonic (new index > old, or an explicit list of allowed status transitions)
  - `lastActivityAt` — either participant may refresh their own heartbeat
  - `winnerUid`/final scores — written only on the transition to `match_over`, and the document becomes effectively immutable after that (same pattern as `dailyAttempts`)

This needs testing against the Firestore emulator before deploying (same as any rules change, per `CLAUDE.md`) — likely **the most complicated rules test written for this project so far**, since it's the first time two different `request.auth.uid` values need to write into the same document with different permissions.

---

## 8. Trophy/achievement integration (B5)

- New achievement(s) in `src/constants/achievements.js` + logic in `src/utils/achievements.js`, e.g. "First 1v1 Win," "Beat 10 Opponents" — follows the existing pattern (condition checked at match end, not per question)
- **No coin/XP payout in v1** (you didn't check the B5 sub-items for that) — the trophy unlocks, but `gameBalance.js` doesn't change. If that turns out to be needed later, adding it is straightforward (a couple of new constants + a call within the `handleAnswer`-equivalent inside `MatchView.jsx`), so this isn't an architectural risk, just a deferred decision.

---

## 9. Match history (B11)

A new collection `matchHistory/{uid}/entries/{matchId}` (or similar) — when a match ends (`match_over`), each client writes its own summary (opponent, result, win/loss, date) into its own history slice. Reading is owner-only (like `users/{uid}`), a pattern that already exists in the project. This is a cheap add-on at the end, doesn't touch core match logic.

---

## 10. UI components (new)

- **`MatchInviteButton`** — embedded into `OnlinePlayersList` from Plan A (the "Invite" button per player); before sending, opens a small category picker (B2)
- **`MatchInviteModal`** — shown to the invited player when a pending invite arrives; Accept/Decline, countdown to the 60s expiry
- **`MatchView.jsx`** — the main container for the entire 1v1 mode, analogous to `App.jsx`'s `PLAYING` render block but driven by the `matches/{matchId}` document instead of local state; includes:
  - Waiting/ready screen
  - Live display of the opponent's status (answered/not, without revealing WHAT they answered before the reveal)
  - Per-question reveal screen (who answered correctly, speed, points)
  - Match-over screen (winner, final score, "Rematch" / "Back to Lobby" buttons)
- **`MatchHistoryList`** — likely a new tab/section in the existing stats/profile view

---

## 11. Implementation steps (order)

**Prerequisite:** Plan A (Online Presence) implemented and deployed — invites directly depend on the online list.

1. **`firestore.rules`** — add the `matchInvites/{inviteId}` and `matches/{matchId}` match blocks; write an emulator test script that simulates two different `request.auth.uid` values (new territory for this project — existing tests assume a single user)
2. **`src/services/matches.js`** (new service layer, parallel to `firebase.js`) — `sendInvite`, `subscribeToIncomingInvites`, `acceptInvite`, `declineInvite`, `createMatch`, `subscribeToMatch`, `submitAnswer`, `advanceQuestion`, `writeForfeit`, `updateMatchHeartbeat`
3. **Question selection helper** — a small function using the existing `questionsLoader.getQuestionsByCategory` to pull 10 question IDs at match creation
4. **`MatchInviteModal.jsx`** + category picker
5. **`MatchInviteButton`** integration into `OnlinePlayersList` (Plan A component)
6. **`MatchView.jsx`** — the full match-state display (waiting → question_active → reveal → match_over cycle), reusing the `SPEED_BONUS_PER_SECOND`/`BASE_SCORE` logic from `App.jsx`
7. **Forfeit detection** — heartbeat check inside `MatchView.jsx` (client-side timeout on the opponent's `lastActivityAt`)
8. **Achievement additions** — `achievements.js`/`constants/achievements.js`
9. **Match history** — new collection + `MatchHistoryList.jsx` + rules
10. **Rematch flow** — a button that calls `sendInvite` again with the same `toUid`/`category`
11. **Manual testing with two browser contexts** (same pattern as `cross-device-sync-check.mjs`, but now **both contexts actively playing at the same time**, not sequentially) — verify: simultaneous answers, forfeit after one tab closes, a race on `questionStartedAt`, and that player 1 genuinely can't read/write `player2Answer` before the reveal
12. **Playwright skill extension** — deferred per your decision (B12), but worth noting that "two simulated players in two browser contexts" will be a natural extension of the `cross-device-sync-check.mjs` pattern whenever it's picked up

---

## 12. Open questions / assumptions I made

- ~~**B4 (tie)**~~ **RESOLVED (2026-08-08): sudden-death.** An equal score after 10 questions triggers an 11th, pre-selected "reserve" question — `questionIds` holds 11 ids chosen once at match creation (same as the other 10), so there's no live re-pick/authority problem. Whoever answers it correctly wins; if both are correct, the earlier `answeredAt` (server timestamp) wins; if both are wrong, falls back to a shared win as a last resort (accepted as a rare edge case for v1).
- **B7:** you chose only "invite from the online list," not link/code — which means 1v1 **isn't possible with someone who isn't currently online** (e.g. sending a friend a link to join later). If that's ever needed, that's a Plan A extension (link-based invite without the online list), not this plan.
- **Category (B2):** I'm assuming the host picks ONE category for the whole match (doesn't change per question) — consistent with how solo mode works.
- ~~**Coins/XP for 1v1**~~ **RESOLVED (2026-08-08): trophy-only for v1**, confirmed explicitly (not an oversight). No changes to `gameBalance.js`.
- ~~**Admin visibility/moderation**~~ **RESOLVED (2026-08-08): none for v1.** Rules and AdminPanel won't have an `isAdmin()` branch on `matches/{matchId}` in this pass — can be added later without a schema change.
