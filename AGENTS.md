# AGENTS.md

Unified guidelines, architectural boundaries, and commands for all AI coding agents (Claude Code, Gemini / Zoo Code, Grok Build).

## Operational Workflow & Change Logging
- **Mandatory File Update**: Whenever you modify, create, or delete any code or config file, immediately log the change in `CHANGELOG.md` in the exact same tool turn.
- **Log Entry Structure**:
  - `Date`: YYYY-MM-DD
  - `Files Changed`: Exact relative file paths
  - `Details`: Terse, high-precision summary of the logic or UI adjustment
- **Language**: All UI copy, question content, game feedback, jokers, and categories MUST be in authentic Croatian (`hr-HR`). Code comments and commit messages remain in English.

---

## Commands & Verification

- `npm run dev` — Start Vite dev server (does NOT serve `/api/*`; use `npx vercel dev` to test serverless uploads)
- `npm run build` — Production build to `dist/` (blocking in CI)
- `npm run preview` — Preview production build locally
- `npm run lint` — ESLint verification (non-blocking)
- `npm test` — Run Vitest unit suite (`src/**/*.test.js`, pure logic only)
- `node golden-path.mjs` — E2E headless Chromium test for complete round flow
- `node cross-device-sync-check.mjs` — E2E test verifying multi-device stats sync
- `node two-player-match-check.mjs` — E2E test verifying concurrent 1v1 live-invite matches

### Test Account Rule
E2E testing strictly uses the two fixed production accounts: `BongBotTest` and `BongBotTest2`. **Never generate dynamic/throwaway usernames**, as generated names exceeding the 20-character `displayName` cap will violate `firestore.rules`.

---

## Architecture & Hard Boundaries

### 1. State Machine & Routing (STRICT)
- **Zero URL Routing**: Do NOT introduce `react-router` or client routing libraries. The entire app is a state machine driven by `gameState`: `LOBBY -> LEADERBOARD -> PLAYING -> GAMEOVER/VICTORY`.
- **Props-Only Screens**: Game states render through dedicated components in `src/screens/{Lobby,Leaderboard,Playing,GameOver}Screen.jsx`.
- **App.jsx Core Loop**: Do NOT mechanically extract or decompose `App.jsx`'s round orchestration (`resetRoundState`, `handleAnswer`, `handleAnswerTimeout`, jokers, `applyRoundEndRewards`). They share interconnected refs and states; extracting them risks subtle scoring and XP race conditions.

### 2. Question Data Management
- Question files live as static JSON under `src/data/categories/*.json`.
- All question reads must go through `src/data/questionsLoader.js` and resolve keys via `src/data/categoryKeys.js`.
- **`opca_znanje` is an aggregate pool**: Calling `getQuestionsByCategory('opca_znanje')` aggregates all categories dynamically. It is not an isolated deck.
- **Dynamic Question Count**: Never hardcode a static total question count anywhere.
- **Admin Tooling**: Any preview or bulk tooling that needs an individual category file's exact contents must use `getRawCategoryQuestions` to bypass the aggregate behavior.

### 3. Firebase & Security Boundaries
- **Admin Boundary**: Admin UI and operations are keyed to `ADMIN_EMAIL` (`ivanm.ploce@gmail.com`). If modified, `api/questions.js` and `firestore.rules` must be updated and redeployed simultaneously.
- **Profile Updates**: Always update Firestore user documents with `{ merge: true }`.
- **Stats Read Sequencing**: When fetching user stats on login (`getUserStatsFromFirestore`), check `docSnap.metadata.hasPendingWrites` after fetch; wait for pending writes and refetch to avoid reading stale local state.

### 4. Admin Question Upload
- Files dropped into AdminPanel are validated client-side via `src/utils/questionMerge.js` and submitted to the Vercel serverless function `api/questions.js`.
- The serverless function re-validates and commits new entries to `main` via the GitHub Contents API. Uploads only append new questions; they never delete or overwrite existing entries.

### 5. Styling & Audio
- **Styling**: Tailwind CSS v3 utility classes exclusively.
- **Sound**: Audio effects must route through `src/utils/sound.js` (Web Audio API singleton with lazy `AudioContext` initialization).