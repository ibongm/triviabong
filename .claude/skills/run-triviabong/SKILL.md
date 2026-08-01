---
name: run-triviabong
description: Start the TriviaBong Vite dev server and run it end-to-end in headless Chromium (pick a category, play through questions, use jokers, reach game-over/victory, save a score) and/or verify stats sync correctly across devices. Use when asked to run, start, screenshot, or verify TriviaBong's UI works after a change.
---

TriviaBong is a React SPA (Vite dev server, no backend). There's no
`chromium-cli` or `tmux` on this Windows dev machine, and — see
Gotchas — a long-lived process that keeps reading commands from stdin
after launching a headless Chromium child process is unreliable here.
So this skill is a single **run-to-completion script**,
`golden-path.mjs`, rather than an interactive REPL: it drives the
whole flow in one go and prints PASS/FAIL for each step.

All paths below are relative to the repo root unless noted.

## Prerequisites (one-time)

```bash
npm install                                             # repo root - app deps
cd .claude/skills/run-triviabong && npm install         # script's own deps (playwright)
npx playwright install chromium                          # downloads the browser binary (~115MB)
```

## Start the dev server

```bash
npm run dev &
timeout 30 bash -c 'until curl -sf http://localhost:5173 >/dev/null; do sleep 1; done'
```

## Run the golden-path check

```bash
cd .claude/skills/run-triviabong
node golden-path.mjs
```

Optional args: `node golden-path.mjs <url> <category-button-text>` —
e.g. `node golden-path.mjs http://localhost:5173 Povijest` to exercise
a different category. Exit code is 0 if every step passed and no
console errors were seen, 1 otherwise.

Screenshots land in `%TEMP%\triviabong-shots\` (override with
`SCREENSHOT_DIR`), one per stage (lobby, leaderboard, quiz, jokers,
end screen, score-saved, stats modal, back-to-lobby). After a run,
actually open the PNGs — a blank or error-boundary frame won't show
up as a script error.

## Run the cross-device sync check

```bash
cd .claude/skills/run-triviabong
node cross-device-sync-check.mjs
```

Registers a throwaway email/password account in one headless browser
context, plays a partial round, then logs in with the same
credentials in a second, independent fresh context (simulating a
second device) and asserts the stats (games played, per-category
accuracy) match. Requires the Email/Password sign-in provider to be
enabled on the `triviabong-web` Firebase project (Console →
Authentication → Sign-in method) — if it's off you'll see
`auth/operation-not-allowed` in the script's error output rather than
a real assertion failure.

## Stop the dev server

No `lsof` on this Windows/Git-Bash setup — find the listener by port and kill by PID:

```bash
netstat -ano | grep ':5173' | grep LISTENING     # note the PID in the last column
powershell -Command "Stop-Process -Id <PID> -Force"
```

(`$!` after `npm run dev &` is just the npm wrapper's PID — npm doesn't forward
signals to the Vite process it spawns, so killing `$!` alone won't free the port.)

## What it checks (the golden path)

Lobby loads → pick a category → its leaderboard loads → start quiz →
answer a few questions (asserts the score header updates) → try all
three jokers (50:50, +10s, skip) → keep answering until a
GAMEOVER/VICTORY screen appears → fill the nickname field and save
the score (asserts the "successfully saved" confirmation text
appears) → back to lobby. Each stage prints `PASS`/`FAIL`; the script
also collects every browser console message and fails the run if any
`[error]`/`[pageerror]` line showed up, e.g. a Firestore
`permission-denied` from a rules regression.

## Gotchas

- **All UI copy is Croatian.** The script matches exact strings like
  `Započni Kviz` (Start Quiz), `Spremi Rezultat` (Save Score),
  `Povratak u Izbornik` (Back to Menu), `Preskoči` (Skip joker). If a
  step reports `NOT_FOUND`, check `src/App.jsx` for copy that changed.
- **Quiz answer buttons have no stable selector** — options are
  shuffled per question. `clickFirstAnswer()` in the script matches
  by the two Tailwind classes (`rounded-2xl` + `text-left`) that are
  unique to answer buttons while `gameState === 'PLAYING'`; update
  that filter if the markup changes.
- **The app auto-advances ~1.2–1.5s after an answer click**
  (`setTimeout` in `App.jsx`) — the script always waits 1500ms after
  clicking an answer before reading the next state.
- **Firestore calls hit the real `triviabong-web` project, even in
  local dev** — there's no emulator wired into the dev server.
  Saving a score or loading a leaderboard is a real write/read
  against the deployed `firestore.rules` at the repo root. That's
  exactly why the script fails on any console error: a rules
  regression would show up as `permission-denied` here.
- **A run that reaches "save score" adds a real (harmless, ~few
  hundred point) row to that category's live leaderboard.**
  `cross-device-sync-check.mjs` similarly creates a real throwaway
  Firebase Auth user + Firestore doc. Fine for occasional manual
  verification; don't loop either script unattended.
- **`page.reload({ waitUntil: 'networkidle' })` (or `.goto` with the
  same option) can hang indefinitely once Firestore's SDK has
  established its persistent connection** — that connection never
  goes idle by Playwright's definition, so `networkidle` waits forever
  on any navigation *after* the page has done real Firestore work.
  Use `'domcontentloaded'` plus an explicit `waitForSelector`/poll
  instead. The very first `page.goto` on a fresh page is usually fine
  (Firestore isn't touched until something actually queries it).
- **A brand-new client's first stats read after login can race a
  concurrent profile write** — see `CLAUDE.md`'s "Stats-read race"
  note and `firebase.js`'s `getUserStatsFromFirestore` comment.
  `cross-device-sync-check.mjs` is what caught this; if it starts
  failing again after a `firebase.js` change, check that fix is still
  intact before assuming the test itself is wrong.
- **Don't build this as an interactive REPL fed via heredoc/stdin.**
  That was tried first: a long-lived Node process reading commands
  off stdin, one Playwright action per line. It reliably ran the
  *first* queued command (e.g. `launch`) but every command after
  that silently produced no output — even a trivial synchronous
  `help` command — while the process still exited cleanly. The
  common factor was always "a Chromium child process got spawned,
  then the same process tried to keep processing more stdin-driven
  commands afterward"; a plain sequential script (spawn browser, do
  everything, exit) never hit it. If a future need for interactive
  step-by-step driving comes up, budget time to root-cause this
  properly (or reach for `chromium-cli`/tmux if either becomes
  available) rather than assuming a small tweak will fix the REPL
  shape.

## Troubleshooting

- **Port 5173 already in use:** an earlier dev server is still
  running — see Stop above.
- **Script hangs on `page.goto`:** the dev server isn't actually up
  yet — re-run the `curl` poll from Start, don't just `sleep` a fixed
  amount.
- **`ERESOLVE` on `npm install` in this folder:** keep this folder's
  `playwright` version aligned with whatever `npx playwright install
  chromium` downloaded in Prerequisites.
