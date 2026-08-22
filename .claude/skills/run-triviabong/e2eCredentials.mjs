// Shared credential resolution for the E2E driver scripts.
//
// The two accounts below are FIXED rather than per-run throwaways - see
// cross-device-sync-check.mjs's comment for why (generated names blew the
// 20-char displayName cap in firestore.rules and silently broke the admin
// "Popuni sve profile" backfill). The emails are identifiers, not secrets, and
// the scripts assert on them, so they stay in source. The passwords do not:
// this repo is public.
//
// The guard below matters as much as the env lookup. signIn() in both scripts
// is login-OR-REGISTER: against production, a wrong or missing password
// doesn't fail, it quietly creates a new account - exactly the junk-account
// accumulation CLAUDE.md records. So a non-local target with no credentials
// must refuse to start rather than guess.
//
// Emulator runs (the CI path, and the default when no URL is passed) need no
// configuration at all: emulator state is wiped between runs, so the password
// is arbitrary and the register-on-first-use path handles it.

export const P1_EMAIL = 'bongbottest@example.com';
export const P2_EMAIL = 'bongbottest2@example.com';

// Deliberately obvious: this is never a real credential anywhere, and only
// reaches a throwaway emulator account.
const LOCAL_ONLY_PASSWORD = 'local-emulator-only';

const isLocalTarget = (url) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(url || '');

const requirePassword = (envVar, url) => {
    const value = process.env[envVar];
    if (value) return value;
    if (isLocalTarget(url)) return LOCAL_ONLY_PASSWORD;
    throw new Error(
        `Refusing to run against ${url} without ${envVar}.\n` +
        `  These scripts register the account if sign-in fails, so guessing a password\n` +
        `  against a real project silently creates a junk user. Set the real password:\n` +
        `    ${envVar}=... node <script>.mjs ${url}\n` +
        `  No credentials are needed for emulator runs (omit the URL, or pass a localhost one).`,
    );
};

/** Credentials for the single shared account (cross-device-sync-check). */
export const resolvePrimaryCredentials = (url) => ({
    email: P1_EMAIL,
    password: requirePassword('E2E_PASSWORD', url),
});

/** Both accounts, for the scripts that need two genuinely distinct uids. */
export const resolveBothCredentials = (url) => ({
    p1: { email: P1_EMAIL, password: requirePassword('E2E_PASSWORD', url) },
    p2: { email: P2_EMAIL, password: requirePassword('E2E_PASSWORD_2', url) },
});
