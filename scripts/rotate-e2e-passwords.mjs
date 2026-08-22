// One-off script: rotates the passwords on the two shared E2E accounts.
//
// Why this exists: those accounts use @example.com addresses, an IANA-reserved
// domain that accepts no mail, so the Firebase console's "Reset password" sends
// a link that can never arrive. There is no "set password" in the console UI
// either. This signs in with the CURRENT password and calls updatePassword,
// which needs no service-account key - unlike scripts/set-admin-claim.mjs,
// which does. (If you'd rather use the Admin SDK, getAuth().updateUser(uid,
// { password }) works without knowing the current one.)
//
// Rotation matters because the old passwords were committed to a PUBLIC repo
// (see CHANGELOG 2026-08-22). They remain in git history, so until they're
// changed anyone can sign in as these accounts - or change the password
// themselves and lock you out.
//
// Passwords are read from the environment; none are stored in this file.
// Firebase enforces a 6-character minimum.
//
// Usage (PowerShell):
//   $env:E2E_PASSWORD='<current>'; $env:E2E_NEW_PASSWORD='<new>'
//   $env:E2E_PASSWORD_2='<current2>'; $env:E2E_NEW_PASSWORD_2='<new2>'
//   node scripts/rotate-e2e-passwords.mjs
//
// Rotate one account only by setting just that pair. Afterwards, set
// E2E_PASSWORD / E2E_PASSWORD_2 to the NEW values when running the E2E
// scripts against production (see .claude/skills/run-triviabong/SKILL.md).
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, updatePassword, signOut } from 'firebase/auth';

// Same public client config as src/services/firebase.js. A Firebase web API
// key is not a secret; access is governed by firestore.rules and Auth.
const app = initializeApp({
    apiKey: 'AIzaSyAlWaXV43v307yaC85OaABp62U6Z7m8OiA',
    authDomain: 'triviabong-web.firebaseapp.com',
    projectId: 'triviabong-web',
});
const auth = getAuth(app);

const targets = [
    { email: 'bongbottest@example.com', currentVar: 'E2E_PASSWORD', newVar: 'E2E_NEW_PASSWORD' },
    { email: 'bongbottest2@example.com', currentVar: 'E2E_PASSWORD_2', newVar: 'E2E_NEW_PASSWORD_2' },
];

const selected = targets.filter(t => process.env[t.currentVar] || process.env[t.newVar]);
if (selected.length === 0) {
    console.error('Nothing to do. Set at least one pair, e.g. E2E_PASSWORD (current) + E2E_NEW_PASSWORD (new).');
    process.exit(1);
}

let failed = 0;
for (const { email, currentVar, newVar } of selected) {
    const current = process.env[currentVar];
    const next = process.env[newVar];
    if (!current || !next) {
        console.error(`SKIP  ${email} - needs both ${currentVar} (current) and ${newVar} (new).`);
        failed++;
        continue;
    }
    if (current === next) {
        console.error(`SKIP  ${email} - ${newVar} is identical to ${currentVar}; that rotates nothing.`);
        failed++;
        continue;
    }
    if (next.length < 6) {
        console.error(`SKIP  ${email} - ${newVar} is under Firebase's 6-character minimum.`);
        failed++;
        continue;
    }
    try {
        const { user } = await signInWithEmailAndPassword(auth, email, current);
        await updatePassword(user, next);
        await signOut(auth);
        console.log(`OK    ${email} - password rotated.`);
    } catch (error) {
        // auth/invalid-credential => the current password is already wrong,
        // which may mean someone else rotated it first.
        console.error(`FAIL  ${email} - ${error.code || error.message}`);
        failed++;
    }
}

console.log(
    failed === 0
        ? '\nDone. Now set E2E_PASSWORD / E2E_PASSWORD_2 to the new values for production E2E runs.'
        : `\n${failed} account(s) not rotated - see above.`,
);
process.exit(failed === 0 ? 0 : 1);
