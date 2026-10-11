# AUDIT REPORT — ibongm/triviabong (KvizArena)

Date: 2026-10-11 · Branch audited: `main` (local is 10 commits behind `origin/main`, with 6 uncommitted files) · Repo visibility: **public**

Method: `gh` CLI (runs, PRs, issues, alerts, repo settings), `npm audit`, `npm test`, `npm run lint`, `git log --all` / `git grep` over every commit, and static checks against the boundaries in `AGENTS.md`. `npm run build` and the E2E scripts were **not** run locally.

## Executive summary

| Area | Status | One-line verdict |
|---|---|---|
| 1. GitHub Actions / CI | ![FAIL](https://img.shields.io/badge/FAIL-red) | `main` CI is red on 3 of the last 7 runs: the `two-player-match-check` E2E step is intermittent |
| 2a. Dependencies (`npm audit`) | ![WARN](https://img.shields.io/badge/WARN-orange) | 38 advisories (1 critical, 23 high), nearly all in dev/CLI tooling and not shipped in the browser bundle |
| 2b. Remote security alerts | ![WARN](https://img.shields.io/badge/WARN-orange) | Dependabot is disabled and code scanning is not set up; 1 open secret-scanning alert (Firebase web key) |
| 2c. Secrets in git history | ![PASS](https://img.shields.io/badge/PASS-green) | No private keys, tokens or service-account files in any commit; only the public Firebase web API key |
| 3a. Unit tests | ![PASS](https://img.shields.io/badge/PASS-green) | 29 files, 395 tests, all passing |
| 3b. Lint | ![FAIL](https://img.shields.io/badge/FAIL-red) | 8 errors, 4 warnings, all in `src/App.jsx` and `src/components/MatchView.jsx`; CI ignores them (`continue-on-error`) |
| 3c. AGENTS.md boundaries | ![WARN](https://img.shields.io/badge/WARN-orange) | State machine, sound routing and question-loader rules hold; stale hardcoded question counts in comments, two non-merge `setDoc` calls |
| 4. PRs / issues / branches | ![WARN](https://img.shields.io/badge/WARN-orange) | 0 open PRs, 0 issues, but 11 remote branches (9 stale or merged), no branch protection |

**Overall: WARN.** Nothing is actively exploitable or leaking, but the main CI pipeline is unreliable and the lint gate is switched off, so regressions can land unnoticed.

## Prioritized action items

| # | Priority | Item | Area |
|---|---|---|---|
| 1 | **High** | Fix or quarantine the flaky `two-player-match-check` step so `main` CI is trustworthy | CI |
| 2 | **High** | Enable Dependabot alerts/security updates (currently disabled) and run `npm audit fix` | Security |
| 3 | **High** | Resolve the 3 `react-hooks/immutability` and `set-state-in-effect` errors in `App.jsx` (without extracting the round loop) and make lint blocking | Quality |
| 4 | Medium | Triage the open secret-scanning alert #1: confirm the Firebase key is restricted (HTTP referrer and API scope) and close it as "used in tests / public by design" | Security |
| 5 | Medium | Protect `main`: require the CI check, because three workflows push straight to `main` | Repo |
| 6 | Medium | Add `permissions:` to `ci.yml`; move GCP auth to workload identity; stop interpolating `inputs.*` into `run:` in `audit-category.yml` | CI |
| 7 | Low | Delete merged branches; commit or discard the 6 uncommitted files; pull the 10 missing commits | Repo |
| 8 | Low | Remove unused imports in `App.jsx`; replace hardcoded question counts in comments | Quality |
| 9 | Low | Move CI and generation workflows off Node 20 and pin actions by SHA | CI |

---

## 1. GitHub Actions and CI/CD — FAIL

### Recent runs (`gh run list --limit 40`)

| Workflow | Success | Failure | In progress |
|---|---|---|---|
| Generate Category Questions | 31 | 1 | 1 |
| CI | 4 | 3 | 0 |

### Failure A — CI, `e2e` job, step "Run two-player match check" (3 runs)
Runs `38108633649`, `38105146937`, `38102557525` (all on `main` push).
- Log: both browser contexts sign in, send and accept the invite and reach `waiting_ready`, then after about 63 s `FAIL - A reached a final screen` and `FAIL - B reached a final screen`. There were 0 console errors.
- The lint-and-build job passed in the two runs I inspected (`38108633649`, `38102557525`).
- Runs alternate between pass and fail across consecutive commits (01:35 pass, 01:39 fail, 02:25 pass, 02:26 fail). That points to a timing flake and not a deterministic regression, but this is an inference: I did not reproduce it.
- Impact: a red check on every second push. CI will not warn about a real regression in live 1v1.

### Failure B — Generate Category Questions `38112884501`
`TypeError: fetch failed … ECONNRESET` against Vertex AI. This is a transient network error, and the next 9 runs succeeded. No action is needed, but the generator has no retry.

### Workflow review

| File | Finding | Severity |
|---|---|---|
| `ci.yml` | No top-level `permissions:` block, so the token gets repo defaults. Add `permissions: contents: read`. | Medium |
| `ci.yml` | `npm run lint` has `continue-on-error: true`, so 8 lint errors are invisible. | Medium |
| `ci.yml` | No `concurrency:` group, so a push and a PR build can duplicate the 3-minute E2E job. | Low |
| `ci.yml`, `e2e-emulator.yml` | Pending local edits (not yet committed) add `VITE_FORCE_ASYNC_DUELS` and the `async-duel-check.mjs` step. They have never run on GitHub. | Info |
| `audit-category.yml` | `${{ inputs.category }}` and `${{ inputs.count }}` are interpolated directly into `run:`. `count` is free text, so it is a shell-injection vector for anyone who can dispatch. The other workflows already use the safe `env:` pattern. | Medium |
| `audit-category.yml` | `git commit` runs unconditionally, so a run that changes nothing fails with "nothing to commit". The sibling workflow already guards this. | Low |
| `audit-category.yml`, `generate-*.yml` | `google-github-actions/auth@v2` with a long-lived `GCP_SA_KEY` JSON secret. Workload Identity Federation would remove the stored key. | Medium |
| `generate-questions.yml`, `audit-category.yml` | Push directly to `main` with `contents: write`; branch protection is off. | Medium |
| `ci.yml`, `e2e-emulator.yml` | Pin Node 20 while the generators use Node 22. GitHub already warns that Node 20 actions are forced to Node 24. | Low |
| All | Actions pinned by tag (`@v4`, `@v2`), not commit SHA. No deprecated action versions found. | Low |
| `e2e-emulator.yml` | Duplicates the whole `e2e` job of `ci.yml`. Last manual run was 2026-08-16. | Low |

YAML syntax: read all six files and found no syntax problems. `ci.yml` and `generate-questions.yml` have run successfully on GitHub; `audit-category.yml`, `compute-difficulty.yml` and `generate-explanations.yml` did not appear in the last 40 runs, so they are read-only reviewed.

## 2. Security and vulnerabilities

### 2a. `npm audit` — WARN
Total 38: **1 critical, 23 high, 14 moderate, 0 low**.

| Severity | Package (path) | Reachable in production bundle? |
|---|---|---|
| Critical | `proxy-addr` (via `express`, from `firebase-tools`) | No, CLI only |
| High, direct | `firebase` → `@firebase/firestore` → `@grpc/grpc-js` | Only the browser build of `firebase` ships; the `@grpc/grpc-js` advisory covers the Node transport |
| High, direct | `@firebase/rules-unit-testing` (via `firebase`) | No, test-only |
| High, direct | `firebase-tools` (via `@google-cloud/pubsub`) | No, CLI only |
| High, direct | `tailwindcss` (via `chokidar`, `braces`, `micromatch`) | Build-time only. Suggested fix is a major bump to Tailwind 4, which conflicts with the "Tailwind v3" rule in `AGENTS.md`. |
| High | `undici`, `brace-expansion`, `js-yaml`, `source-map-js`, `fast-uri`, `compression`, `basic-ftp`, `get-uri`, `pac-proxy-agent`, `proxy-agent`, `fast-glob`, `@fastify/busboy`, `@modelcontextprotocol/sdk` | Transitive dev tooling |
| Moderate | `vitest` / `@vitest/mocker`, `qs`, `express`, `body-parser`, `hono`, `ip-address`, `morgan`, `csv-parse`, `stream-json`, `postcss-*`, `@opentelemetry/core`, `@google-cloud/pubsub` | Dev tooling |

- `fixAvailable: true` for most entries, so a plain `npm audit fix` should clear the non-breaking ones.
- Two entries need judgement: the `firebase` fix npm proposes is **9.14.0**, which is a downgrade from the installed `^12.17.0` and should not be taken. The `tailwindcss` fix is a major upgrade that conflicts with the v3 rule.
- Server-side code in `api/*.js` uses `firebase-admin` and `jose`, neither of which appears in the audit output.

### 2b. Remote alerts — WARN

| Source | Result |
|---|---|
| Dependabot alerts | **Disabled** for the repo (HTTP 403). `security_and_analysis.dependabot_security_updates` = disabled. |
| Code scanning | **No analysis found** (HTTP 404). CodeQL is not configured. |
| Secret scanning | Enabled, push protection enabled. **1 open alert** (#1, see below). |

Secret-scanning alert #1: Google API key in `src/services/firebase.js:22`, first seen in commit `544133e`, state `open`, `publicly_leaked: true`. This is the **Firebase web API key**, which is public by design for web apps. It is safe only if it is restricted (HTTP referrers and API allow-list) in Google Cloud Console and if `firestore.rules` do the real access control. I cannot check the restriction from here. The same key is in `scripts/rotate-e2e-passwords.mjs:33`. The key value is intentionally not repeated in this report.

Note: reading this alert through the API printed the raw key into the terminal session. It is the public web key, so no rotation is implied.

### 2c. Secrets in git history — PASS
Scanned every commit on all branches (`git grep` over `git rev-list --all`) and all file names ever committed.

| Pattern | Result |
|---|---|
| GitHub tokens (`ghp_`, `gho_`, `github_pat_`) | none |
| OpenAI-style `sk-…`, AWS `AKIA…`, Slack `xox…` | none |
| `BEGIN … PRIVATE KEY`, `"private_key"` (service-account JSON) | none |
| Google `AIza…` | only the Firebase web key in `src/services/firebase.js` and `scripts/rotate-e2e-passwords.mjs` |
| `.env*`, `*adminsdk*.json`, `.pem`, `.key`, `gha-creds*` files ever committed | none |
| `.claude/skills/run-triviabong/e2eCredentials.mjs` | Name matched only my filename filter. Contents: emails plus a deliberately fake local-only password; real passwords are read from env vars and the script refuses non-localhost targets without them. |

`.gitignore` covers `.env*`, `*adminsdk*.json`, `.vercel`, `/reports/`, `/plans/`, `/docs/`.

Carried-over item from project memory: the E2E test passwords were once committed to this public repo before being moved to env vars (commit history is not rewritten). They should still be **rotated** if that has not been done. This audit did not re-verify that.

## 3. Architecture and code quality

### 3a. Tests — PASS
`npm test`: 29 test files, **395 tests passed**, 0 failed, 1.26 s.

### 3b. Lint — FAIL
`npm run lint`: **12 problems (8 errors, 4 warnings)**.

| File:line | Rule | Problem |
|---|---|---|
| `src/App.jsx:10, 19, 24, 27, 27` | `no-unused-vars` (5 errors) | Unused imports: `DEFAULT_GLOBAL_STATS`, `XP_PER_CORRECT_ANSWER`, `computeDayStreakUpdate`, `saveStats`, `getStorageKey` |
| `src/App.jsx:664` | `react-hooks/set-state-in-effect` (error) | `setState` called synchronously inside an effect |
| `src/App.jsx:693` | `react-hooks/immutability` (error) | `handleAnswerTimeout` is used in an effect before its declaration (declared around line 1190) |
| `src/App.jsx:711` | `react-hooks/immutability` (error) | `handleAnswer` is used in an effect before its declaration (declared at line 966) |
| `src/App.jsx:683, 695, 718` | `exhaustive-deps` (warnings) | Missing deps `setTimeLeft`, `handleAnswerTimeout`, `handleAnswer` |
| `src/components/MatchView.jsx:269` | `exhaustive-deps` (warning) | Missing deps `match`, `matchId` |

The three hook errors involve the round loop that `AGENTS.md` forbids extracting. Fix them in place (for example by reordering declarations or keeping the latest handler in a ref), not by splitting `App.jsx`. The unused imports are safe to delete.

### 3c. AGENTS.md boundary audit — WARN

| Boundary | Result | Evidence |
|---|---|---|
| Zero URL routing | PASS | No `react-router` in `src` or `package.json`. The only history call is `window.history.pushState({}, '', '/')` at `App.jsx:1740`, which just clears the `/admin` path when the Admin Panel closes. |
| Props-only screens | PASS | `src/screens/` holds Lobby, Leaderboard, Playing, GameOver, AsyncDuel screens. |
| `App.jsx` core loop not extracted | PASS | `handleAnswer`, `handleAnswerTimeout` and round logic are still in `App.jsx` (1,752 lines). |
| Question reads via `questionsLoader.js` | PASS | No imports of `src/data/categories/*.json` outside the loader. `questionMerge.js` only mentions the path in comments. |
| `getRawCategoryQuestions` for admin | WARN | `AdminQuestions.jsx:49` defines its own local `getRawCategoryQuestions` over `categoryPacks` instead of importing the loader's function at `questionsLoader.js:95`. Behavior matches the rule, but the name shadows the real helper. |
| No hardcoded question total | WARN | No logic uses a fixed total. Comments contain stale figures: `questionsLoader.js:54` ("~1500"), `firebase.js:581` and `gameplayInsights.js:14` ("5,949"). Update or remove the numbers. |
| Sound via `utils/sound.js` | PASS | No `new Audio` / `AudioContext` outside `sound.js`. |
| Profile updates use `{ merge: true }` | WARN | `firebase.js:82` and `:256` (user documents) use merge. `firebase.js:1030` (`publicProfiles` payload) and `:1217` (`setDoc(... profilePayload(user))`) overwrite without merge. These are derived public-profile docs, not the `users` document, so likely intentional, but they are not documented as exceptions. |
| Admin boundary in sync | PASS | `ADMIN_EMAIL` in `api/questions.js:24` and the literal in `firestore.rules:22` both read `ivanm.ploce@gmail.com`. The rules also require `email_verified`. |
| Croatian-only UI copy | PASS (sampled) | Pattern search for common English UI words (Loading, Cancel, Save, Delete, Sign in, …) in JSX text and attributes found no hits, including in the Admin Panel. This is a keyword spot-check, not a full copy review. |
| Test account rule | PASS | E2E credentials file uses the two fixed accounts `bongbottest@` and `bongbottest2@`. |
| CHANGELOG logging | PASS | `CHANGELOG.md` is current through 2026-10-11 (it has 25 uncommitted lines). |

Open items already recorded in `siteaudit.md` by earlier audits (not re-verified here): stale `playTime` rejected by rules (H1), `records/*` writable without auth (H2), and 63 cross-pack duplicate questions.

## 4. Issues, pull requests and branches — WARN

- **Pull requests:** 11 total (#1 to #11), **0 open**, all merged. Latest: #11 Engagement Phase 6, merged 2026-10-10.
- **Issues:** none, open or closed. The tracker is unused.
- **Merge conflicts:** none, since there are no open PRs.
- **Branch protection on `main`:** none ("Branch not protected").
- **Local state:** `main` is 10 commits behind `origin/main` (0 ahead); 6 files modified and uncommitted (`SKILL.md`, both E2E workflows, `CHANGELOG.md`, `DailyMissionsModal.jsx`, `LobbyScreen.jsx`).

Remote branches (11 besides `main`):

| Branch | Behind main | Ahead | Last commit | Note |
|---|---|---|---|---|
| `feature/engagement-phase-0` … `-phase-6` (7 branches) | 40 to 66 | 0 | 2026-10-10 | PRs merged; safe to delete |
| `claude/plan-review-ogg5vn` | 176 | 1 | 2026-08-16 | PR #4 merged; stale |
| `docs/handoff` | 32 | 1 | 2026-10-11 | One unmerged commit |
| `chore/rename-to-kvizarena` | 8 | 2 | 2026-10-11 | Two unmerged commits; the rebrand is recorded as complete, so check whether these are leftovers |

No `difficulty/*` or `explanations/*` branches exist.

## Suggested fix order

1. Reproduce the two-player flake locally (`node two-player-match-check.mjs` against the emulator) and raise or replace its 60 s wait; until fixed, mark that step `continue-on-error` so `main` is not red.
2. Settings (no code): enable Dependabot alerts and security updates, enable CodeQL, add a branch-protection rule for `main`.
3. `npm audit fix` (not `--force`); re-run `npm test` and `npm run build`; leave the `firebase` and `tailwindcss` suggestions alone.
4. Fix the 8 lint errors, then delete `continue-on-error` from the lint step.
5. Workflow hygiene: `permissions:` block, env-var inputs in `audit-category.yml`, empty-commit guard, `concurrency:`.
6. Housekeeping: delete merged branches, `git pull`, commit the pending work, refresh stale count comments.
