// Feature flags for the engagement features (see
// claude/KvizArena_Engagement_Features_Plan.md in the TriviaWebApp project).
//
// Every flag ships `false`. New code lands dark behind its flag, so it can be
// merged and deployed before the Firestore rules it depends on are deployed;
// the flag is flipped only after the rules are live and verified.
//
// Plain constants rather than remote config: this is a static SPA, and a
// flag flip is a one-line commit + the normal Vercel auto-deploy.
export const FEATURES = Object.freeze({
    MISSION_FALLBACKS: true,
    EXPLANATIONS: false,
    DIFFICULTY: false,
    DIFFICULTY_BADGE: false,
    ASYNC_DUELS: false,
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
