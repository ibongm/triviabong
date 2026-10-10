// Ad hoc Firestore rules test for the optional `explanation` field on
// questionSubmissions (engagement plan Phase 2). Run from the repo root:
//   npx firebase emulators:exec --only firestore "node scripts/firestore-rules-explanations.test.mjs"
// Gotcha (same as the other rules tests): emulators:exec can leave a java
// process holding port 8080 - kill it before re-running.
import {
    initializeTestEnvironment,
    assertSucceeds,
    assertFails,
} from '@firebase/rules-unit-testing';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const testEnv = await initializeTestEnvironment({
    projectId: 'triviabong-web',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
});

const UID = 'player1';
const player = testEnv.authenticatedContext(UID, { email: 'p1@example.com' }).firestore();

let passed = 0, failed = 0;
const check = async (name, fn) => {
    try { await fn(); console.log(`  PASS  ${name}`); passed++; }
    catch (err) { console.error(`  FAIL  ${name}\n        ${err.message}`); failed++; }
};

const submission = (extra = {}) => ({
    uid: UID,
    category: 'geografija',
    question: 'Koji je glavni grad Hrvatske?',
    correct_answer: 'Zagreb',
    incorrect_answers: ['Split', 'Rijeka', 'Osijek'],
    status: 'pending',
    createdAt: serverTimestamp(),
    ...extra,
});

const submit = (data) => addDoc(collection(player, 'questionSubmissions'), data);

console.log('\nquestionSubmissions.explanation');

await check('allows a submission without explanation (unchanged behavior)', () =>
    assertSucceeds(submit(submission())));

await check('allows a submission with a short explanation', () =>
    assertSucceeds(submit(submission({ explanation: 'Zagreb je glavni grad od 1557.' }))));

await check('allows an explanation of exactly 220 characters', () =>
    assertSucceeds(submit(submission({ explanation: 'a'.repeat(220) }))));

await check('DENIES an explanation over 220 characters', () =>
    assertFails(submit(submission({ explanation: 'a'.repeat(221) }))));

await check('DENIES an empty explanation', () =>
    assertFails(submit(submission({ explanation: '' }))));

await check('DENIES a non-string explanation', () =>
    assertFails(submit(submission({ explanation: 42 }))));

await check('still DENIES unknown fields', () =>
    assertFails(submit(submission({ difficulty: 'hard' }))));

await check('still DENIES submitting as someone else', () =>
    assertFails(submit(submission({ uid: 'someone-else', explanation: 'x' }))));

console.log('\nreports.reason = wrong_explanation');

const report = (reason) => ({
    uid: UID,
    questionId: 'hr_geo_1',
    categoryId: 'geografija',
    reason,
    status: 'pending',
    createdAt: serverTimestamp(),
});

await check('allows the new wrong_explanation reason', () =>
    assertSucceeds(addDoc(collection(player, 'reports'), report('wrong_explanation'))));

await check('still allows an existing reason', () =>
    assertSucceeds(addDoc(collection(player, 'reports'), report('typo'))));

await check('still DENIES an unknown reason', () =>
    assertFails(addDoc(collection(player, 'reports'), report('boring'))));

await testEnv.cleanup();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
