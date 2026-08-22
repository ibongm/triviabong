// Ad hoc Firestore rules test for the Phase 2 counter collections.
// Run from the repo root:
//   npx firebase emulators:exec --only firestore "node <this file>"
// Per CLAUDE.md there is no checked-in rules suite; this validates the
// questionStats/categoryStats blocks before `firebase deploy --only firestore:rules`.
import {
    initializeTestEnvironment,
    assertSucceeds,
    assertFails,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const ADMIN_EMAIL = 'ivanm.ploce@gmail.com';

const testEnv = await initializeTestEnvironment({
    projectId: 'triviabong-web',
    firestore: {
        rules: readFileSync('firestore.rules', 'utf8'),
        host: '127.0.0.1',
        port: 8080,
    },
});

const anon = testEnv.unauthenticatedContext().firestore();
const player = testEnv.authenticatedContext('player1', { email: 'p@example.com' }).firestore();
// isAdmin() accepts either an `admin: true` custom claim or the hardcoded
// admin email with email_verified. Test both - the email path is the one the
// real admin actually signs in through.
const admin = testEnv.authenticatedContext('adminuid', { admin: true }).firestore();
const adminByEmail = testEnv
    .authenticatedContext('adminuid2', { email: ADMIN_EMAIL, email_verified: true, admin: false })
    .firestore();

let passed = 0;
let failed = 0;
const check = async (name, fn) => {
    try {
        await fn();
        console.log(`  PASS  ${name}`);
        passed += 1;
    } catch (err) {
        console.error(`  FAIL  ${name}\n        ${err.message}`);
        failed += 1;
    }
};

// Seed a known-good starting state, bypassing rules.
const seed = async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'questionStats', 'seeded'), {
            categoryId: 'geografija', total: 10, correct: 4, wrong: 6,
        });
        await setDoc(doc(db, 'categoryStats', 'sport'), {
            plays: 5, totalScore: 1000, victories: 2,
        });
    });
};

console.log('\nquestionStats');
await seed();

await check('anonymous may create a first attempt (total=1, correct+wrong=1)', () =>
    assertSucceeds(setDoc(doc(anon, 'questionStats', 'newq'), {
        categoryId: 'sport', total: 1, correct: 0, wrong: 1,
    })));

await check('anonymous may increment by exactly +1 (wrong answer)', () =>
    assertSucceeds(setDoc(doc(anon, 'questionStats', 'seeded'), {
        categoryId: 'geografija', total: 11, correct: 4, wrong: 7,
    })));

await seed();
await check('anonymous may increment by exactly +1 (correct answer)', () =>
    assertSucceeds(setDoc(doc(player, 'questionStats', 'seeded'), {
        categoryId: 'geografija', total: 11, correct: 5, wrong: 6,
    })));

await seed();
await check('DENIES a +5 jump on total', () =>
    assertFails(setDoc(doc(anon, 'questionStats', 'seeded'), {
        categoryId: 'geografija', total: 15, correct: 4, wrong: 11,
    })));

await check('DENIES desyncing wrong from total - correct', () =>
    assertFails(setDoc(doc(anon, 'questionStats', 'seeded'), {
        categoryId: 'geografija', total: 11, correct: 4, wrong: 999,
    })));

await check('DENIES incrementing correct by more than 1', () =>
    assertFails(setDoc(doc(anon, 'questionStats', 'seeded'), {
        categoryId: 'geografija', total: 11, correct: 9, wrong: 2,
    })));

await check('DENIES decrementing total', () =>
    assertFails(setDoc(doc(anon, 'questionStats', 'seeded'), {
        categoryId: 'geografija', total: 9, correct: 4, wrong: 5,
    })));

await check('DENIES switching a question to another category', () =>
    assertFails(setDoc(doc(anon, 'questionStats', 'seeded'), {
        categoryId: 'sport', total: 11, correct: 4, wrong: 7,
    })));

await check('DENIES smuggling an extra field', () =>
    assertFails(setDoc(doc(anon, 'questionStats', 'seeded'), {
        categoryId: 'geografija', total: 11, correct: 4, wrong: 7, hacked: true,
    })));

await check('DENIES a create that does not start at total=1', () =>
    assertFails(setDoc(doc(anon, 'questionStats', 'bogus'), {
        categoryId: 'sport', total: 500, correct: 250, wrong: 250,
    })));

await check('anyone may read (admin panel + public aggregate only)', () =>
    assertSucceeds(getDoc(doc(anon, 'questionStats', 'seeded'))));

await check('admin (custom claim) MAY write absolute values (recompute rebuild)', () =>
    assertSucceeds(setDoc(doc(admin, 'questionStats', 'seeded'), {
        categoryId: 'geografija', total: 500, correct: 250, wrong: 250,
    })));

console.log('\ncategoryStats');
await seed();

await check('anonymous may create a first play', () =>
    assertSucceeds(setDoc(doc(anon, 'categoryStats', 'glazba'), {
        plays: 1, totalScore: 300, victories: 1,
    })));

await check('anonymous may increment plays by +1 with a plausible score', () =>
    assertSucceeds(setDoc(doc(anon, 'categoryStats', 'sport'), {
        plays: 6, totalScore: 1300, victories: 2,
    })));

await seed();
await check('DENIES a +5 jump on plays', () =>
    assertFails(setDoc(doc(anon, 'categoryStats', 'sport'), {
        plays: 10, totalScore: 1300, victories: 2,
    })));

await check('DENIES a totalScore jump beyond one max-score game', () =>
    assertFails(setDoc(doc(anon, 'categoryStats', 'sport'), {
        plays: 6, totalScore: 9999999, victories: 2,
    })));

await check('DENIES lowering totalScore', () =>
    assertFails(setDoc(doc(anon, 'categoryStats', 'sport'), {
        plays: 6, totalScore: 0, victories: 2,
    })));

await check('DENIES incrementing victories by more than 1', () =>
    assertFails(setDoc(doc(anon, 'categoryStats', 'sport'), {
        plays: 6, totalScore: 1300, victories: 5,
    })));

await check('admin (custom claim) MAY write absolute values (recompute rebuild)', () =>
    assertSucceeds(setDoc(doc(admin, 'categoryStats', 'sport'), {
        plays: 999, totalScore: 123456, victories: 111,
    })));

console.log('\nadmin via email claim (the path the real admin signs in through)');
await seed();

await check('admin-by-email MAY rebuild questionStats', () =>
    assertSucceeds(setDoc(doc(adminByEmail, 'questionStats', 'seeded'), {
        categoryId: 'geografija', total: 500, correct: 250, wrong: 250,
    })));

await check('admin-by-email MAY rebuild categoryStats', () =>
    assertSucceeds(setDoc(doc(adminByEmail, 'categoryStats', 'sport'), {
        plays: 999, totalScore: 123456, victories: 111,
    })));

await testEnv.cleanup();

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
