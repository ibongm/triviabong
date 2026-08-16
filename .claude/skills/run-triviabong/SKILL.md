---
name: run-triviabong
description: Start the TriviaBong Vite dev server and run it end-to-end in headless Chromium (pick a category, play through questions, use jokers, reach game-over/victory, save a score), verify stats sync correctly across devices, and/or verify the 1v1 live-invite match flow with two concurrently active browser contexts. Use when asked to run, start, screenshot, or verify TriviaBong's UI works after a change.
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
npm install                                             # repo root - app deps (includes firebase-tools)
cd .claude/skills/run-triviabong && npm install         # script's own deps (playwright)
npx playwright install chromium                          # downloads the browser binary (~115MB)
```

## Start the Firebase emulators, then the dev server

All three scripts drive the app purely through the browser (no direct
Firebase SDK import), so they transparently follow wherever the app's
own `firebase.js` is pointed. Point it at the local Firebase Emulator
Suite instead of live production by starting the emulators first and
setting `VITE_USE_FIREBASE_EMULATOR=true` before starting the dev
server — this is now the recommended way to run this skill, since it
means no run touches production data (see Gotchas).

```bash
npx firebase emulators:start --only firestore,auth &
timeout 30 bash -c 'until curl -sf http://127.0.0.1:8080 >/dev/null; do sleep 1; done'
timeout 30 bash -c 'until curl -sf http://127.0.0.1:9250 >/dev/null; do sleep 1; done'

VITE_USE_FIREBASE_EMULATOR=true npm run dev &
timeout 30 bash -c 'until curl -sf http://localhost:5173 >/dev/null; do sleep 1; done'
```

Emulator UI (inspect what got written) is at `http://127.0.0.1:4000`.
Emulator state doesn't persist between runs, so each session starts
from an empty project — all three scripts already handle this via
their login-or-register fallback for `BongBotTest`/`BongBotTest2`, no
seeding needed.

Omitting `VITE_USE_FIREBASE_EMULATOR` (or starting the dev server
without the emulators running) still works exactly as before — the
app falls back to live production `triviabong-web`. Only reach for
that when you specifically need to verify against real prod data.

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

Signs in as the shared **BongBotTest** email/password account in one
headless browser context (creating it the first time it's ever run
against a project), plays a partial round, then logs in with the same
credentials in a second, independent fresh context (simulating a
second device) and asserts the stats (games played, per-category
accuracy) match. The account is fixed rather than per-run: throwaway
accounts piled up in production forever, and their generated names
were long enough to trip the 20-char `displayName` cap in
`firestore.rules`, which silently broke the admin "Popuni sve
profile" backfill for everyone. Stats accumulating across runs is
harmless — the assertions compare the two contexts within one run.
Against the emulator, both accounts auto-register fresh each session
(emulator state doesn't persist), so no provider setup is needed.
Against live production, this requires the Email/Password sign-in
provider to be enabled on the `triviabong-web` Firebase project
(Console → Authentication → Sign-in method) — if it's off you'll see
`auth/operation-not-allowed` in the script's error output rather than
a real assertion failure.

## Run the two-player 1v1 match check

```bash
cd .claude/skills/run-triviabong
node two-player-match-check.mjs
```

The one script in this skill that genuinely needs **two distinct
signed-in uids at once**: signs in as **BongBotTest** (host/player1)
and **BongBotTest2** (invitee/player2) in two separate, concurrently
active browser contexts, then drives the full Plan B flow — A invites
B from the online-players list, B accepts, both click "Spreman!",
then **both contexts play every question simultaneously** (via
`Promise.all`, not sequentially — this is what distinguishes it from
`cross-device-sync-check.mjs`, which only ever has one context active
at a time) until the match ends. Asserts both contexts land on a
final screen, agree on the final score (from each one's own point of
view — A's score must equal what B displays as the opponent's score,
and vice versa), and land on complementary outcomes (one "Pobjeda!"
+ one "Poraz", or both "Neriješeno!"). Also fails on any console
error, same as the other two scripts — this is exactly the kind of
check that would catch a `matches/{matchId}` rules regression, since
two real uids writing into the same shared doc is the highest-risk
surface in the whole app.

**Second fixed account.** Same reasoning as `BongBotTest` (see the
cross-device section above) — `BongBotTest2` (12 characters) is a
second **permanent**, reused account, not a per-run throwaway.
Credentials are in the script itself (`bongbottest2@example.com` /
`BongBotTest2123!`); registered automatically on first run against a
project, same login-or-register fallback as `BongBotTest`.

**Leaves real, permanent Firestore clutter — if run against production.**
A run creates a `matches/{matchId}` document that **can never be
deleted** by design (`allow delete: if false` in `firestore.rules` —
see that file's comment on `matches/{matchId}`; cleanup is explicitly
deferred, same as `presence/{uid}`'s stale-doc handling). It also
writes one `matchInvites` doc (self-deletable, but the script doesn't
bother) and one `matchHistory` entry per player. Against the
emulator this is a non-issue (emulator state doesn't persist between
sessions), which is why running with `VITE_USE_FIREBASE_EMULATOR=true`
is now the recommended default — loop or automate freely there. Only
avoid looping this script when deliberately pointed at live
production.

**Timing note:** the moment either context's own write makes
`match.status` become `'match_over'`/`'forfeited'`, that client
re-renders immediately from its local Firestore cache — but the
*opponent's* very last write might still be in flight over the
network at that exact instant. The script waits ~1.5s after first
seeing the final screen before reading it, specifically to distinguish
that harmless rendering lag from an actual stored-data disagreement.
If you see the symmetric-score assertion fail even after that wait,
that's a real bug, not a timing artifact — this is exactly how the
atomic answer+score write fix (see `matches.js`'s `submitMatchAnswer`
comment) was originally found and confirmed fixed.

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
- **Firestore calls follow wherever `firebase.js` is pointed** — the
  emulator when `VITE_USE_FIREBASE_EMULATOR=true` was set before
  `npm run dev` started (see "Start the Firebase emulators" above),
  otherwise the real `triviabong-web` project. Either way it's a real
  write/read against the same `firestore.rules` at the repo root
  (the emulator loads the identical rules file), so the script still
  fails on any console error: a rules regression shows up as
  `permission-denied` in both modes.
- **Against live production**, a run that reaches "save score" adds a
  real (harmless, ~few hundred point) row to that category's live
  leaderboard, under the nickname `BongBotTest`, and
  `cross-device-sync-check.mjs`/`two-player-match-check.mjs` write to
  the real BongBotTest/BongBotTest2 Auth users + Firestore docs.
  Fine for occasional manual verification; don't loop any of the
  three scripts unattended in this mode. Against the emulator, none
  of this applies — loop freely.
- **`page.reload({ waitUntil: 'networkidle' })` (or `.goto` with the
  same option) can hang indefinitely once Firestore's SDK has
  established its persistent connection** — that connection never
  goes idle by Playwright's definition, so `networkidle` waits forever
  on any navigation *after* the page has done real Firestore work.
  Use `'domcontentloaded'` plus an explicit `waitForSelector`/poll
  instead. This now includes the very first `page.goto` too: the
  LOBBY screen fetches the Rekordi ranking boards from Firestore on
  mount (unconditionally, before any user interaction), so Firestore's
  persistent connection is established immediately and `networkidle`
  on the initial nav hangs the same way. `golden-path.mjs` uses
  `domcontentloaded` for its initial goto for this reason.
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
