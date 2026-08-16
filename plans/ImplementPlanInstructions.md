# Instructions for Claude Code — TriviaBong Admin Panel

**Read this file first, then `AdminPanel.jsx-ImplementationPlan.md`.**

---

## What these two documents are

`AdminPanel.jsx-ImplementationPlan.md` is the output of a brainstorming session about redesigning the TriviaBong admin dashboard. It records **decisions that were made** and **features that were agreed on**.

It was written **without access to the codebase**. Every architectural statement in it is secondhand — described by the developer from memory, not read from source. You have the actual repository. **You are the source of truth on how the code works; the plan is the source of truth on what the developer wants.**

Where the plan and the code disagree, the code wins — and you should say so out loud rather than quietly working around it.

---

## Do not write code yet

Your first job is **verification and clarification, not implementation.** Do not create files, do not refactor, do not start Phase 1 until explicitly told to.

---

## Step 1 — Verify the assumptions

Section 0 of the plan lists an assumed architecture. Check each claim against the actual repo:

- Is `src/App.jsx` really a single-component state machine with those states?
- Do the listed files exist at those paths (`questionsLoader.js`, `categoryKeys.js`, `achievements.js`, `leveling.js`, `firebase.js`, `api/questions.js`)?
- Do questions in `src/data/categories/*.json` actually carry stable unique IDs? What is the field called?
- What is the real shape of the player document in Firestore — exact field names for XP, coins, trophies, level?
- How is the admin panel currently access-gated?
- Do questions carry a difficulty field?
- Is `achievements.js` unlock-only, or does anything already remove/re-evaluate trophies?
- Are there existing Firestore security rules, and what do they currently allow?

**Report back what matches, what doesn't, and anything the plan missed entirely.**

---

## Step 2 — Answer what you can from Section 11

Section 11 of the plan lists open items. Most are answerable by reading the code — do that and fill them in.

**One is not answerable by you:** the reward-clawback question in §4.5 (if a trophy earned in real gameplay is later revoked by an admin edit, do already-granted coins get taken back?). That is a product decision. Ask the developer; do not pick a default and proceed.

---

## Step 3 — Raise anything the plan gets wrong or leaves out

Specifically worth flagging if you find it:

- Places where a planned feature is harder than the plan implies, given the real code
- Existing behavior the plan would break
- Anything in the plan already partly implemented
- Missing pieces the plan didn't anticipate

---

## Step 4 — Propose a first slice, then wait

The plan has six phases and sixteen steps. **Do not attempt them all.** Propose one concrete, small, self-contained starting point — with the files it would touch — and wait for approval.

Default entry point is Phase 1 (data schema + security rules + instrumentation), because analytics are worthless until data has been accumulating. But if verification turns up a reason to start elsewhere, say so.

---

## Unresolved design question — do not decide alone

The plan says "restructure `AdminPanel.jsx` into navigable sections" but never settles **whether the file should be split into multiple files.** The developer has an open, unresolved question about modularizing the codebase generally.

When you get to Phase 2, present the options with a recommendation based on what the file actually looks like — do not silently split it or silently keep it monolithic.

---

## Standing rules for this project

1. **Ask before writing.** No code, no file creation, no refactors without explicit approval for that specific piece.
2. **Croatian for all user-facing strings.** The app's UI language is Croatian. Code, comments, and conversation with the developer stay in English.
3. **Questions are not in Firestore.** They are static JSON in the repo, written via the GitHub Contents API. Edits are git commits and likely trigger a redeploy — they are *not* instant. Never build UI implying an instant save for question edits.
4. **Player data is in Firestore.** Those edits *are* instant. The two write paths behave differently; don't unify them carelessly.
5. **Admin-only.** Everything in this plan is behind admin access. No user-facing surface except the "report this question" action.
6. **Full sync must be silent.** When admin edits trigger achievement re-evaluation, suppress every player-facing side effect — no toasts, no unlock animations, no notifications.
7. **Never target questions by array index.** Always by unique ID. Indices shift when questions are added or removed.
8. **Security rules ship with the collections, not after.** No new Firestore collection goes live without rules restricting players to their own data.
9. **The `run-triviabong` skill hits live production Firestore.** Run it manually and deliberately, never as part of an automated loop.

---

## Testing note

There is an existing Claude Code skill at `.claude/skills/run-triviabong/` with:
- `golden-path.mjs` — Playwright E2E test of the full game flow
- `cross-device-sync-check.mjs` — verifies stats sync across devices via the shared BongBotTest account

Both hit **live production Firestore**. Wired to `workflow_dispatch` in CI, not push/PR. Use them for verification after significant changes — but on demand only.

The achievement **revoke** path is new, untested logic with real potential to remove trophies incorrectly. Consider building a dry-run mode that reports what *would* change before anything is written.

---

## Summary of what to do right now

1. Read `AdminPanel.jsx-ImplementationPlan.md`
2. Verify Section 0 against the real code
3. Answer what you can from Section 11; ask the developer about the clawback question
4. Report discrepancies, risks, and anything the plan missed
5. Propose one small first slice
6. **Wait for approval before writing anything**
