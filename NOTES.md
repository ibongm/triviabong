# NOTES

Session handoff file (AGENTS.md §6). Read this first when asked "what's next?".

## Latest Session Wrap-Up

**Date/time:** 2026-10-11 ~04:30 (Europe/Zagreb)

**Tasks completed**
- Wrote `scripts/async-duel-check.mjs`: Playwright E2E for the full async duel lifecycle (`BongBotTest` challenges `BongBotTest2`, B plays, A finishes, duel resolves). B answers all correctly and A all wrong, so the winner is deterministic. Also verifies via the Firestore emulator REST API: `winnerUid`, `rewardClaimed` on both results, both `matchHistory` entries (`async: true`), winner's `total1v1Wins`. Fails on any console error; refuses non-localhost URLs. Commit `a080fb0`.
- `src/constants/features.js`: `ASYNC_DUELS` is true only when both `VITE_USE_FIREBASE_EMULATOR=true` and `VITE_FORCE_ASYNC_DUELS=true` are set; default and production stay `false`.
- Committed the async duels UI polish (`AsyncDuelsModal.jsx`, `AsyncDuelScreen.jsx`), `06f1948`.
- Pushed to origin (`1e2a076..06f1948`, including the earlier `536c464`); Vercel auto-deploys.

**Files modified:** `scripts/async-duel-check.mjs` (new), `src/constants/features.js`, `src/components/AsyncDuelsModal.jsx`, `src/screens/AsyncDuelScreen.jsx`, `CHANGELOG.md`, `NOTES.md`.

**Status**
- Unit tests: 395 pass. Build passes. Lint at the 12-problem baseline.
- `async-duel-check.mjs` passed 4 consecutive runs against the emulators with 0 console errors. One earlier run failed at "A starts their run"; cause not diagnosed (suspected live reload from concurrent edits to the two UI files). Re-run it if it flakes.
- To run: `npx firebase emulators:start --only firestore,auth`, then `VITE_USE_FIREBASE_EMULATOR=true VITE_FORCE_ASYNC_DUELS=true npm run dev`, then `node scripts/async-duel-check.mjs`. Emulator data persists within a session and the script expects exactly one duel, so wipe or restart the emulators between runs.
- Not verified: async duels on production (the flag is still `false`); MISSION_FALLBACKS in a real browser; the nightly cron's new branches.
- Uncommitted changes: `NOTES.md` only (this update).

## Next steps
1. Wire `async-duel-check.mjs` into `.github/workflows/e2e-emulator.yml` (the dev-server step also needs `VITE_FORCE_ASYNC_DUELS=true`), and add a short section to `.claude/skills/run-triviabong/SKILL.md`.
2. Smoke-test missions on production now that `MISSION_FALLBACKS` is live (revert the flag if anything misbehaves); try async duels on production with `ASYNC_DUELS_ADMIN_PREVIEW`.
3. Check Vercel logs for the first nightly cron run (`sweepExpiredDuels` / `runPeriodPayouts`), then plan `WEEKLY_BOARDS` + `LEAGUES` together (confirm Season 1 start, D6).
