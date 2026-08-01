
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build locally
- `npm run lint` — run ESLint over the project

There is no test suite configured in this repository.

## Project overview

TriviaBong is a client-only React SPA (Vite, no backend/server code) — a Croatian-language trivia quiz game. All UI copy and question content is in Croatian. It deploys to Vercel as a static site; there is no API layer, so anything that looks like "server logic" (stats sync, leaderboards, admin actions) goes directly from the browser to Firebase.

## Architecture

**Single-component state machine.** Nearly all game logic and state lives in `src/App.jsx`. There's no router — the app is a state machine driven by one `gameState` value: `LOBBY -> LEADERBOARD -> PLAYING -> GAMEOVER/VICTORY`, each rendered as a conditional block in the same component. When extending game flow, add a new `gameState` value and a corresponding render branch rather than introducing routing.

**Question data.** Questions live as static JSON files under `src/data/categories/*.json` (one file per category, Croatian question/answer text, shape `{ id, category, question, correct_answer, incorrect_answers[] }`). `src/data/questionsLoader.js` is the only access point (`getQuestionsByCategory`, `getAllCategories`, `getAllQuestions`) and owns an alias map (`CATEGORY_ALIASES`) that reconciles mismatches between JSON filenames, internal pack keys, and category keys used elsewhere in the app (e.g. the file `znanost_i_tehnologija.json` and key `science` both resolve to pack key `znanost`; `knjizevnost_i_umjetnost.json` resolves to `knjizevnost`). When adding a category, add the JSON file, register it in `categoryPacks`, and add any alias spellings to `CATEGORY_ALIASES` — then add matching display metadata (label/icon) to `CATEGORY_MAP` in `App.jsx` and `CATEGORY_NAMES` in `StatsModal.jsx` (these two maps are kept in sync by hand, not derived from the loader).

**Firebase (`src/services/firebase.js`).** Provides Auth (Google + email/password) and Firestore for: user profile/stats (`users/{uid}`), and per-category leaderboards (`leaderboards/{category}/scores`). Firebase config/API key is committed in this file — it's a public client-side Firebase key (expected for this SDK), not a secret. Player stats and leaderboard scores are cached in `localStorage` (`triviabong_global_stats`, `triviabong_leaderboards`) and synced to Firestore opportunistically when a user is signed in; anonymous play works entirely off localStorage. `src/leaderboard.js` is a separate, unused localStorage-only leaderboard module left over from an earlier implementation — the active leaderboard logic is inline in `App.jsx` plus `firebase.js`. Don't extend `src/leaderboard.js`; if touching leaderboard behavior, it's in `App.jsx`.

**Admin panel.** Gated entirely client-side: `ADMIN_EMAIL` is hardcoded in `App.jsx`, and the panel opens when the signed-in user's email matches *and* the URL path includes `/admin` (checked in `App.jsx`'s auth listener, not a real router route). `AdminPanel.jsx` manages Firestore user records (edit level/xp/coins/role, delete users) directly from the client. There are no Firestore security rules in this repo — access control for admin actions depends on whatever rules are configured in the Firebase console, not on anything visible here.

**Styling.** Tailwind CSS v3 is what's actually wired up — `src/index.css` uses `@tailwind` directives, `postcss.config.js` runs the `tailwindcss`/`autoprefixer` PostCSS plugins, and `tailwind.config.js` is v3-style. The `@tailwindcss/vite` and `@tailwindcss/postcss` (v4) packages are present in `package.json` but unused (`vite.config.js` only registers the `@vitejs/plugin-react` plugin) — don't assume a v4 migration is in progress from their presence alone.

**Sound.** `src/utils/sound.js` is a small singleton wrapping the Web Audio API (`sound.playClick/playCorrect/playWrong/playTick`), lazily creating an `AudioContext` on first use to respect browser autoplay policies.
