# TriviaBong

TriviaBong is a Croatian-language trivia quiz game — a client-only React SPA (Vite) that deploys to Vercel as a static site, with Firebase (Auth + Firestore) handling everything that looks like "backend logic" (stats sync, leaderboards, 1v1 live matches, admin actions). All UI copy and question content is in Croatian.

For architecture, data flow, and the reasoning behind non-obvious decisions, see [`CLAUDE.md`](./CLAUDE.md) — that's the real docs for this repo.

## Commands

- `npm run dev` — start the Vite dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build locally
- `npm run lint` — run ESLint over the project
- `npm test` — run the unit test suite (Vitest)

## Testing

Unit tests (`src/**/*.test.js`, run via `npm test`) cover the app's pure logic — scoring, XP/leveling, achievements, stats merging, question validation, etc. They're wired into CI as a blocking step.

There's a separate, deliberately manual end-to-end suite in `.claude/skills/run-triviabong/` (Playwright scripts driving a real headless browser against a real Firebase project). Those scripts write real data to production, so they're not run automatically — see that folder's `SKILL.md` and `CLAUDE.md`'s "Commands" section for how and when to run them.

## Deploying

Deploys to Vercel automatically on push to `main`. The one serverless piece, `api/questions.js` (used by the admin question-upload feature), needs `GITHUB_TOKEN`, `GITHUB_REPO`, and `GITHUB_BRANCH` set in Vercel's environment variables — see `CLAUDE.md`'s "Admin question upload" section for details.

Firestore security rules live in `firestore.rules` and deploy separately via `firebase deploy --only firestore:rules` (not part of the Vercel deploy).
