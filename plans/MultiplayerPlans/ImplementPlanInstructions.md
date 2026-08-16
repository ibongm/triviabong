# ImplementPlanInstructions.md

**Companion to:** `Plan-A-OnlinePresence-EN.md` and `Plan-B-LiveInvite1v1-EN.md`
**Audience:** Claude Code, working in the `ibongm/triviabong` repository.
**Author's intent:** These plans were written in a design session against a read-only clone of the repo. They are grounded in real files, but they were never executed. Treat them as a well-researched proposal, not as verified fact.

---

## 0. Read this before touching anything

1. Read `CLAUDE.md` first. It is the highest-signal orientation document in this repo and it already covers commands, architecture, the Firestore rules deployment procedure, and several non-obvious gotchas that these plans depend on.
2. Read the plan you are implementing, end to end, including its final "Open questions / assumptions I made" section.
3. **Do not write code yet.** Complete Section 1 (Verification) and Section 2 (Blocking decisions) below first, and report back.

The order matters. Plan A is a prerequisite for Plan B — the 1v1 invite button lives inside Plan A's `OnlinePlayersList` component, and Plan B's data model assumes the `presence/{uid}` collection exists. Do not implement both in one pass.

---

## 1. Verification step (required before any code)

The plans make specific claims about this codebase. Verify each one and report which hold and which do not. Where a claim is wrong, **stop and say so** rather than adapting the plan silently — a wrong assumption in the design is more useful to surface than to route around.

Verify:

- [ ] `src/hooks/useSessionTracking.js` exists and uses a 30s heartbeat + Page Visibility pausing. Plan A proposes mirroring its structure for `usePresence`. Confirm the pattern is actually reusable as described.
- [ ] `firestore.rules` contains a `sessions/{sessionId}` block using `lastHeartbeat == request.time`. Plan A copies this constraint.
- [ ] `publicProfiles/{uid}` exists and holds `displayName` and `level`. Plan A deliberately denormalizes these into `presence/{uid}` instead of joining — confirm the reasoning still applies.
- [ ] `src/constants/gameBalance.js` exports `BASE_SCORE`, `SPEED_BONUS_PER_SECOND`, `STREAK_MULTIPLIER_STEP`, `QUESTION_TIME_SECONDS = 20`, `QUESTIONS_PER_ROUND = 10`. Plan B reuses the solo scoring formula verbatim and assumes these names.
- [ ] The scoring formula in `App.jsx` is extractable/reusable without dragging in solo-only concerns (lives, jokers, streak state). Plan B §5 assumes it is. If it is tangled into `handleAnswer` in a way that resists reuse, say so — that changes the effort estimate.
- [ ] `src/data/questionsLoader.js` exposes `getQuestionsByCategory`, and question objects carry a stable `id`. Plan B §3 depends on IDs being stable and resolvable client-side from bundled JSON.
- [ ] `handlePlayerLogout` in `src/App.jsx` (~line 965) is the single logout path. Plan A adds a `deletePresence(uid)` call there. Confirm there is no second sign-out path that would bypass it.
- [ ] Note the aggregate-category behavior documented in `CLAUDE.md`: `getQuestionsByCategory('opca_znanje')` returns **all** questions, not just that file's. If a 1v1 match is created on Opće znanje, confirm the 10 selected IDs resolve correctly on both clients.

---

## 2. Blocking decisions — ask Bong, do not choose

These are genuinely unresolved. They were flagged in the design session and never answered. **Do not pick a default and proceed.** Ask, wait, then implement.

### Plan A
1. **`busy` status semantics.** The field is in the schema but nothing sets it in Plan A alone. Should it stay inert until Plan B, or does it need meaning now (e.g. a manual "do not disturb" toggle)?
2. **90-second online threshold.** This is an unverified estimate (3× the heartbeat interval), not a decision Bong made. Confirm the number.
3. **`allow read: if true` on `presence`.** This lets signed-out visitors list every online player. It follows Bong's stated "public list" decision, but the signed-out case was never explicitly discussed. Confirm before deploying, since loosening rules later is easy and tightening them after launch is not.

### Plan B
4. **Tie handling.** Sudden-death extra question, or shared win? Never answered. Affects the state machine, so it needs answering before `MatchView.jsx` is built, not after.
5. **Coins/XP for 1v1.** The plan assumes trophy-only for v1 because the coin/XP boxes were left unchecked — but that may have been an oversight rather than a decision. Confirm explicitly. See the hard blocker in §3 before assuming "trophy-only" is the cheap option.
6. **Admin moderation of active matches.** Not discussed at all. Should an admin be able to view or terminate a live match? Easy to add as an `isAdmin()` branch now, awkward to retrofit into rules later.

---

## 3. Hard blocker: the achievement cap is already full

**This must be resolved before Plan B §8 (1v1 achievements) is implemented. It is not optional and it is not obvious from reading the plan alone.**

Current state, verified against the repo:

- `src/constants/achievements.js` → `ACHIEVEMENTS` contains **exactly 30 entries**
- `firestore.rules` line ~49, the `users/{uid}` update rule → caps `achievementCount <= 30`
- `scripts/check-rules-caps.mjs` line 9 → asserts `ACHIEVEMENTS.length <= 30`
- `publicProfiles/{uid}` (line ~124) → was already raised to `<= 100`, mirrored by `MAX_ACHIEVEMENT_COUNT` in `src/utils/publicProfile.js`

So `publicProfiles` was given headroom, but **`users/{uid}` was not**, and the count is sitting exactly on the ceiling.

Adding even one 1v1 achievement will:
1. Fail `scripts/check-rules-caps.mjs`, and
2. Once any player actually earns the 31st achievement, cause their `users/{uid}` stat sync write to be **rejected by rules** — surfacing as a swallowed permission error with no user-visible symptom. This is precisely the failure mode `CLAUDE.md` describes for the earlier `publicProfiles` version of this same bug.

Required fix, before adding any achievement:
- Raise the `users/{uid}` `achievementCount` cap in `firestore.rules` to match the `publicProfiles` ceiling (100), with the same headroom rationale
- Update the assertion in `scripts/check-rules-caps.mjs` to match
- Deploy the rules change (`firebase deploy --only firestore:rules`) **before** shipping any client code that can produce a 31st achievement
- Re-run `node scripts/check-rules-caps.mjs` and confirm it passes

Report this to Bong as its own change rather than folding it silently into the 1v1 work — it is a pre-existing latent bug that 1v1 merely triggers, and it affects any future achievement regardless of this feature.

---

## 4. Firestore rules: non-negotiable requirements

Per `CLAUDE.md`, there is no rules test suite checked into this repo; ad-hoc emulator tests are written per rules change using `@firebase/rules-unit-testing` and run via:

```
firebase emulators:exec --only firestore "node <test-script>.mjs"
```

Requirements for this work:

- **Never deploy a rules change untested.** Both plans add new collections; both need emulator coverage before `firebase deploy`.
- **Plan B needs a new kind of test that does not yet exist in this repo:** two *different* authenticated uids writing into the *same* document with different permissions. Every existing test pattern assumes a single user. Budget for this — it is the highest-risk part of Plan B.
- Plan B's rules must be tested for the adversarial cases specifically, not just the happy path:
  - player1 **cannot** write `player2Answer` (and vice versa)
  - player1 **cannot** read player2's answer before the reveal phase — if the shared-document design cannot actually prevent this, **stop and report it**, because it undermines the fairness of the whole feature and may force a schema change (e.g. per-player subcollections) before any UI is built
  - `questionStartedAt` cannot be overwritten once set
  - `currentQuestionIndex` / `status` transitions are monotonic and cannot be rewound
  - a `match_over` document is effectively immutable afterward
- Match the existing rules style: `hasOnly()` key allowlists, explicit per-field type and range validation, diff-based protection for fields that must never change. Do not write a permissive rule intending to tighten it later.
- If you change `ADMIN_EMAIL` for any reason, `CLAUDE.md` requires updating it in `src/App.jsx`, `api/questions.js`, **and** `firestore.rules` together.

---

## 5. Known architectural limitation — do not "fix" it unasked

Plan B §6 documents that this app has **no server-side authority**: no Cloud Functions, client-only except the single Vercel function `api/questions.js` and the Daily Challenge payout job.

Consequences that are **accepted, deliberate, and in scope**:
- Forfeit detection is client-side. If both players close their tabs simultaneously, the match document is orphaned in an "active" state. This is acceptable clutter for v1.
- `questionStartedAt` is set by whichever client arrives first, resolved by rules rather than by a server.
- Score is client-computed, exactly as it already is for the existing leaderboard (see the rules' own comment on this: bounding damage, not establishing trust).

**Do not introduce Firebase Cloud Functions as part of this work.** That adds a new deployment target to a Vercel-only project and is explicitly out of scope. If you conclude during implementation that a feature genuinely cannot be made fair without server authority, stop and report it as a design finding — that is a decision for Bong, not a refactor to perform.

Orphaned-document cleanup (both `presence` and `matches`) is deferred. Firestore native TTL is the noted preferred future fix. Do not build a cleanup mechanism in this pass.

---

## 6. Repo conventions to follow

- **All user-facing copy is Croatian.** Every string a player sees — status labels, invite modal text, empty states, match results, achievement names/descriptions — must be Croatian. Code, comments, and identifiers stay English, matching the existing codebase.
- **Croatian diacritics:** use `encoding='utf-8'` for any script that reads or writes JSON.
- **No router.** This app is a state machine, not a routed SPA. Plan B introduces a parallel `appMode` rather than routes — keep it that way.
- **`gameBalance.js` is the single source of truth for balance numbers,** imported by both gameplay and the in-app guide (`GuideModal.jsx`) so the guide can never drift from behavior. If 1v1 introduces any new balance number, it goes there — and check whether `GuideModal.jsx` needs a corresponding update.
- **Comment the *why*, not the *what*.** This codebase's comments are unusually good at explaining non-obvious reasoning (see the stats-read race in `getUserStatsFromFirestore`, or the `Math.max` level guard in `leveling.js`). Match that standard, especially for anything race-related in the match flow.
- **Verify with the E2E skill, not just build/lint.** `npm run build` and `npm run lint` passing means very little here. Use `.claude/skills/run-triviabong/` (`golden-path.mjs`) to confirm nothing regressed.

---

## 7. Testing expectations

**Be aware: the Playwright scripts hit live production Firestore.** There is no staging environment and no emulator wired into the E2E scripts. Run them deliberately, never in a loop, and use the shared `BongBotTest` account rather than minting new accounts (see `CLAUDE.md` for why — generated names previously exceeded the 20-char `displayName` cap and silently broke the admin backfill).

- After Plan A: run `golden-path.mjs` to confirm the lobby changes didn't regress the solo flow.
- Plan A manual test: two browser contexts, two different signed-in users, verify mutual visibility, `lobby → playing` status transitions, and that a closed tab disappears from the list after the heartbeat threshold.
- Plan B manual test: two browser contexts playing **concurrently** (not sequentially, unlike `cross-device-sync-check.mjs`). Exercise simultaneous answers, one player closing their tab mid-match, and the `questionStartedAt` race.
- Extending the Playwright skill with a two-player script is explicitly deferred (Bong's decision). Do not build it in this pass; note it as a follow-up.

---

## 8. Definition of done

**Plan A is done when:** rules deployed and emulator-tested; `usePresence` running alongside `useSessionTracking`; the online list renders in the lobby with correct status, level, and an empty state; presence is deleted on logout; `golden-path.mjs` passes.

**Plan B is done when:** the achievement cap blocker (§3) is resolved and deployed; rules deployed with adversarial two-uid emulator coverage; invite → accept → 10 questions → reveal → result works end-to-end between two real browser contexts; forfeit fires after 30s; rematch works; match history is written and readable; `golden-path.mjs` still passes.

---

## 9. If something in the plan is wrong

The plans were written without executing anything. If a file is not where the plan says, a function has a different signature, or an approach turns out to be unworkable — **report it and stop.** Do not silently substitute a different design. A surfaced mismatch is cheap; a plausible-looking implementation built on a wrong assumption is expensive, and this codebase already contains at least one hard-won bug (the stats-read race) that came from exactly that kind of gap.
