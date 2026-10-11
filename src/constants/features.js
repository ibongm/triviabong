// Feature flags for the engagement features (see
// claude/KvizArena_Engagement_Features_Plan.md in the TriviaWebApp project).
//
// Every flag ships `false`. New code lands dark behind its flag, so it can be
// merged and deployed before the Firestore rules it depends on are deployed;
// the flag is flipped only after the rules are live and verified.
//
// Plain constants rather than remote config: this is a static SPA, and a
// flag flip is a one-line commit + the normal Vercel auto-deploy.
// E2E-only exception to "every flag ships false": scripts/async-duel-check.mjs
// needs the (otherwise dark) async duels UI for non-admin test accounts. It is
// honoured only when the app is ALSO pointed at the Firebase emulator, so a
// production build can never turn the feature on this way. `?.` because this
// file is also imported outside Vite.
const FORCE_ASYNC_DUELS_FOR_E2E = import.meta.env?.VITE_USE_FIREBASE_EMULATOR === 'true'
    && import.meta.env?.VITE_FORCE_ASYNC_DUELS === 'true';

export const FEATURES = Object.freeze({
    MISSION_FALLBACKS: true,
    EXPLANATIONS: false,
    DIFFICULTY: false,
    DIFFICULTY_BADGE: false,
    ASYNC_DUELS: FORCE_ASYNC_DUELS_FOR_E2E,
    // Gate 4: lets only the signed-in admin account see async duels while
    // ASYNC_DUELS is still false, to try them on production before release.
    ASYNC_DUELS_ADMIN_PREVIEW: false,
    WEEKLY_BOARDS: false,
    LEAGUES: false,
});

/**
 * @param {keyof typeof FEATURES} name
 * @returns {boolean}
 */
export const isFeatureEnabled = (name) => FEATURES[name] === true;
