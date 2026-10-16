# NOTES

Session handoff file (AGENTS.md §6). Read this first when asked "what's next?".

## Latest Session Wrap-Up

**Date/time:** 2026-10-16 (Europe/Zagreb)

**Tasks completed**
- Security audit (`reports/security-audit-2026-10-16.md`, gitignored) remediated and **deployed**: Firestore rules hardening + client/API fixes in `5ccb332`; rules released to production with `firebase deploy --only firestore:rules`.
- Live 1v1 stall fixed (`ff4014f`): `MatchView.jsx`'s reveal-advance effect depended on the whole `match` object since the 2026-10-11 lint pass, so matches froze after question 1. Same commit refreshed stale E2E selectors and added the security-audit rules suite to CI.
- Dependency remediation (`cb8f904`): `npm audit` 22 -> 8, critical 2 -> 0 (overrides for `@grpc/grpc-js`, `postcss-selector-parser`, `@opentelemetry/core`, `tinypool`).
- Full audit (`reports/full-audit-2026-10-16.md`, gitignored) remediated in local commits, **not pushed yet**:
  - `2979c05` generator/audit workflows open PRs instead of pushing to `main`; `reports/` and root diagnostic artifacts untracked.
  - `ce24adb` one lazy chunk per question category (was a single 5.9 MB `questions-data` chunk).
  - `ed854f9` CI on Node 22, all 7 rules suites, `workflow_dispatch`; `e2e-emulator.yml` deleted.
  - `e58dad7` Season 1 moved to 2026-W48 (Mon 2026-11-23 .. Sun 2027-01-17) in both copies; Daily Challenge payout constants pinned by a test.
  - `c752944` CSP (report-only), immutable `/assets/*` caching, `lang="hr"` + meta, manifest screenshot rename.
  - `8978326` 89 duplicate questions removed (16,012 -> 15,923); `hr_geo_909` kept and reworded, conflicting `hr_geo_1595` removed.
  - Final polish commit: touch targets, `api/questions.js` input checks, dead `reports` rule removed, `rsChangedKeys()` returns a set, "Igrači na mreži", this file.

**Status**
- Unit tests: 402 pass. Lint clean. Build OK (8 category chunks, no `questions-data`).
- All 7 Firestore rules suites pass under `firebase emulators:exec` (356 checks). E2E (golden-path, cross-device, two-player, async-duel) passed on the emulator earlier today; the 1v1 check had one intermittent `questionAttempts` PERMISSION_DENIED in 1 of 3 runs (cause not found, see full audit L3).
- Production E2E not run: `cross-device-sync-check`/`two-player-match-check` need `E2E_PASSWORD`/`E2E_PASSWORD_2`; `golden-path.mjs` writes a leaderboard score, so it isn't run against prod.
- `firestore.rules` changed again in the polish commit (L9/L10) and is **not deployed** yet.
- Uncommitted changes: none after the polish commit.

## Next steps
1. Push `main` (Vercel auto-deploys) and run `firebase deploy --only firestore:rules`. Then sign in with Google and play a round on desktop and phone with DevTools open, and check the console for `Content-Security-Policy-Report-Only` violations; switch the header to enforcing after a clean day.
2. Stop whatever has been dispatching `generate-questions.yml` (281 runs 2026-10-10..15), confirm the next run opens a PR, then turn on branch protection for `main` (audit H3: require `lint-and-build` + `e2e`; route `api/questions.js` admin commits). Enable Dependabot alerts/security updates and dismiss the Firebase web-key secret-scanning alert (key is referrer-restricted).
3. Decide on `FEATURES.WEEKLY_BOARDS` (and `LEAGUES`) before Season 1 starts on 2026-11-23, or move `startWeek` again in both `src/constants/seasons.js` and `api/daily-challenge-payout.js`.
