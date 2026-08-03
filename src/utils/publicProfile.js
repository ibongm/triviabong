// Shared shaping/clamping for publicProfiles/{uid} writes.
//
// firestore.rules validates every field of a publicProfiles doc (displayName
// length, ints, ranges) and REJECTS a violating write outright - Firestore
// never clamps for you, it just returns "Missing or insufficient
// permissions". Worse, backfillPublicProfiles writes users in a batch, and a
// batch commit is atomic: one malformed account rejects the whole commit and
// blocks the backfill for everyone. So every path that builds one of these
// payloads has to clamp to exactly the same bounds the rules enforce, which
// is why this lives here instead of being re-derived at each call site.
//
// No React/Firebase imports on purpose, so App.jsx and services/firebase.js
// can both import it without a cycle (App.jsx already imports firebase.js).

// Mirrors the displayName/name size ceiling in firestore.rules.
export const MAX_DISPLAY_NAME_LENGTH = 20;

// Mirrors the achievementCount ceiling in firestore.rules. Deliberately far
// above the 31 achievements defined in src/constants/achievements.js - the
// rule used to cap at exactly 30, leaving zero headroom, so adding the 31st
// (the hidden "Svi smo mi Marija") would have silently broken every
// publicProfiles write (the live sync too, not just the backfill) had the
// ceiling not been raised first. Keep the two in sync.
export const MAX_ACHIEVEMENT_COUNT = 100;

/**
 * The player-facing name, clamped to what the rules accept. Falls back
 * through displayName -> email local-part -> 'Igrač', matching what the app
 * has always shown; the slice is what keeps a long email local-part (e.g.
 * the qa-*-<epoch> accounts the E2E scripts create) from being silently
 * rejected rather than truncated.
 */
export const sanitizeDisplayName = (source) => {
    const raw = source?.displayName || source?.email?.split('@')[0] || 'Igrač';
    const trimmed = String(raw).trim();
    return (trimmed || 'Igrač').slice(0, MAX_DISPLAY_NAME_LENGTH);
};

/**
 * Coerces to an integer at or above `min`, falling back when the value is
 * missing, non-numeric, fractional-and-out-of-range, or below the floor.
 * Guards against admin-entered values (AdminPanel's level/xp inputs are bare
 * type="number", so 2.5 or -3 are reachable) reaching a rule that demands
 * `is int` and a minimum.
 */
const toBoundedInt = (value, min, fallback) => {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) && n >= min ? n : fallback;
};

/**
 * Builds the validated field set for a publicProfiles/{uid} doc from either
 * an auth user + stats pair or a raw users/{uid} document. Callers add their
 * own `updatedAt: serverTimestamp()` - kept out of here so this module stays
 * Firebase-free.
 */
export const buildPublicProfileFields = (source) => ({
    displayName: sanitizeDisplayName(source),
    level: toBoundedInt(source?.level, 1, 1),
    xp: toBoundedInt(source?.xp, 0, 0),
    maxStreak: toBoundedInt(source?.maxStreak, 0, 0),
    dayStreak: toBoundedInt(source?.dayStreak, 0, 0),
    achievementCount: Math.min(
        toBoundedInt(Object.keys(source?.unlockedAchievements || {}).length, 0, 0),
        MAX_ACHIEVEMENT_COUNT
    )
});
