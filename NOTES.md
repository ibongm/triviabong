# NOTES

Session handoff file (AGENTS.md §6). Read this first when asked "what's next?".

## Latest Session Wrap-Up

**Date/time:** 2026-10-11 03:52 (Europe/Zagreb)

**Tasks completed**
- Verified all 6 Firestore rules suites against the emulator (async-duels 80, weekly-boards 58, leagues 71, explanations 11, counters 21, playtime 12) - no `firestore.rules` changes needed.
- Created root `firestore.indexes.json` (4 `asyncDuels` composite indexes; live set was empty), wired into `firebase.json`, removed `firestore.indexes.async-duels.json`. Commit `6f8aa72`.
- Deployed `firestore.rules` + indexes to `triviabong-web`; all 4 indexes are `READY`.
- Committed `HANDOFF.md`, `AGENTS.md`, `CLAUDE.md` (now points to AGENTS.md), `triviabong.code-workspace`. Commit `98f3d5d`.
- Flipped `FEATURES.MISSION_FALLBACKS` to `true` and pushed (`1e2a076`); Vercel auto-deploys. Rollback = set it back to `false`.

**Files modified:** `firestore.indexes.json`, `firebase.json`, `api/daily-challenge-payout.js` (comment), `src/constants/features.js`, `CHANGELOG.md`, `HANDOFF.md`, `AGENTS.md`, `CLAUDE.md`, `NOTES.md`.

**Status**
- Unit tests: 395 pass. Build passes. `npm run lint` not re-run this session (baseline must stay at 12 problems).
- Not verified: MISSION_FALLBACKS in a real browser; signed-in flows for async duels / weekly boards / leagues; the nightly cron's new branches (check Vercel function logs after the first run).
- Uncommitted changes: none after the wrap-up commit. All other flags in `features.js` are still `false`.

## Next steps
1. Smoke-test missions on production (browser console + Firestore usage) now that `MISSION_FALLBACKS` is live; revert the flag if anything misbehaves.
2. Try async duels on production with `ASYNC_DUELS_ADMIN_PREVIEW` and the two E2E accounts (`BongBotTest`/`BongBotTest2`); consider writing `async-duel-check.mjs`.
3. Check Vercel logs for the first nightly cron run (`sweepExpiredDuels` / `runPeriodPayouts`), then plan `WEEKLY_BOARDS` + `LEAGUES` together (confirm Season 1 start, D6).
