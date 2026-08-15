# Changelog

## 2026-08-15

- **Files Changed**: `src/services/firebase.js`, `firestore.rules`, `src/components/SubmitQuestionModal.jsx` (new), `src/components/admin/AdminQuestionSubmissions.jsx` (new), `src/components/AdminPanel.jsx`, `src/App.jsx`, `src/screens/LobbyScreen.jsx`
  **Details**: Added the player question-submission feature - a "Predloži pitanje" entry point in the Lobby (signed-in only) writing to a new `questionSubmissions` Firestore collection, plus a "Predložena pitanja" admin review queue that approves straight into the existing `/api/questions` GitHub-commit merge pipeline.

- **Files Changed**: `src/constants/gameBalance.js`, `src/utils/leveling.js`, `src/utils/leveling.test.js`, `src/constants/levelTitles.js` (new), `src/constants/levelTitles.test.js` (new), `src/services/statsStore.js`, `src/utils/gameLogic.js`, `src/utils/gameLogic.test.js`, `src/constants/achievements.js` (audited, no changes needed), `src/App.jsx`, `src/components/GuideModal.jsx`
  **Details**: Economy rebalance - new quadratic XP curve (`25 * (level-1)^2`), streak coin milestones (3/5/10) replacing the old fixed-interval bonus, new joker prices (15/10/30), tiered level-up coin rewards (`getCoinsForLevelUp`), 50 Croatian level titles, achievement payouts (5xp/5coins normal, 10xp/10coins hidden - previously achievements paid nothing), a v1->v2 stats migration (xp/level reset, coins preserved), and a new level-up toast in `App.jsx` (there was none before - the `LEVEL_UP` event `gameLogic.js` emitted was previously discarded unread). Removed round-completion/perfect-round income (`COIN_PER_ROUND_COMPLETE`, `COIN_PERFECT_ROUND_BONUS`, `PERFECT_ROUND_XP_BONUS`).

- **Files Changed**: `src/services/firebase.js`, `src/components/admin/AdminQuestionSubmissions.jsx`
  **Details**: Community-question-approval reward - admin approving a submission now credits the submitter `+25 XP` / `+5 coins` via `awardCommunityQuestionReward`.

- **Files Changed**: `firestore.rules`
  **Details**: Added `users/{uid}/missions/{dateKey}` subcollection rule (owner-only read/write, date-format validated). Verified via Firestore emulator test (owner CRUD succeeds; non-owner/anonymous reads and writes denied; malformed date rejected) before deploying.

- **Files Changed**: `src/constants/missions.js` (new), `src/hooks/useDailyMissions.js` (new), `src/components/DailyMissionsModal.jsx` (new), `src/screens/LobbyScreen.jsx`, `src/App.jsx`, `src/hooks/useOneVsOne.js`, `src/hooks/useScoreSaving.js`, `src/components/MatchView.jsx`, `src/components/SubmitQuestionModal.jsx`
  **Details**: Daily micro-missions - 7-day rotating 3-slot schedule (2 coins/slot, +5 clean-sweep bonus), tracked in `users/{uid}/missions/{dateKey}` with a localStorage-first, write-through hook. Wired trigger events into 1v1 match completion (`useOneVsOne.js`, plus new 1v1 win XP/coins that hadn't been wired anywhere before), Daily Challenge completion (`useScoreSaving.js`, plus new Daily Challenge participation XP), category-correct/streak tracking (`App.jsx`'s `handleAnswer`), and question submission (`SubmitQuestionModal.jsx`). Added a Lobby widget (completed-slot count + Zagreb-midnight countdown) and a claim modal.

- **Files Changed**: `api/daily-challenge-payout.js`, `src/hooks/useDailyChallenge.js`, `src/components/GuideModal.jsx`
  **Details**: Daily Challenge payout expanded from single-winner-only to top-3 placement (tiered coins/XP, ties handled per-tier) plus a consecutive-1st-place win-streak coin bonus (`dailyWinStreak`/`lastDailyWinDate` on the user doc). Fixed the "you won yesterday" lobby banner, which read a `prizeEach` field this change removed, to instead compute the rank-1 prize from the new tiered/streak data.
