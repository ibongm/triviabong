// Ad hoc Firestore rules test for the playTime counters and the TTL
// `expiresAt` fields. Run from the repo root:
//   npx firebase emulators:exec --only firestore "node scripts/firestore-rules-playtime.test.mjs"
// Companion to firestore-rules-counters.test.mjs. Gotcha: emulators:exec often
// leaves a java process holding port 8080 - kill it before re-running.
import {
    initializeTestEnvironment,
    assertSucceeds,
    assertFails,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const testEnv = await initializeTestEnvironment({
    projectId: 'triviabong-web',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
});

const OWNER = 'player1';
const owner = testEnv.authenticatedContext(OWNER, { email: 'p1@example.com' }).firestore();
const other = testEnv.authenticatedContext('player2', { email: 'p2@example.com' }).firestore();

let passed = 0, failed = 0;
const check = async (name, fn) => {
    try { await fn(); console.log(`  PASS  ${name}`); passed++; }
    catch (err) { console.error(`  FAIL  ${name}\n        ${err.message}`); failed++; }
};

const seedUser = async (playTime) => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'users', OWNER), {
            uid: OWNER, email: 'p1@example.com', level: 1, xp: 0, coins: 0,
            ...(playTime ? { playTime } : {}),
        });
    });
};

console.log('\nusers/{uid}.playTime');
await seedUser({ total: 100, days: { '2026-08-22': 100 } });

await check('owner may add to playTime (increment)', () =>
    assertSucceeds(updateDoc(doc(owner, 'users', OWNER), {
        'playTime.total': increment(90),
        'playTime.days.2026-08-22': increment(90),
    })));

await seedUser({ total: 100, days: { '2026-08-22': 100 } });
await check('DENIES decreasing playTime.total', () =>
    assertFails(updateDoc(doc(owner, 'users', OWNER), { 'playTime.total': 5 })));

await check('DENIES a negative playTime.total', () =>
    assertFails(updateDoc(doc(owner, 'users', OWNER), { 'playTime.total': -1 })));

await check('DENIES a non-integer playTime.total', () =>
    assertFails(updateDoc(doc(owner, 'users', OWNER), { 'playTime.total': 'lots' })));

await check('DENIES another player writing my playTime', () =>
    assertFails(updateDoc(doc(other, 'users', OWNER), { 'playTime.total': increment(60) })));

await check('owner may still not touch role', () =>
    assertFails(updateDoc(doc(owner, 'users', OWNER), { role: 'admin' })));

await seedUser(null);
await check('owner may create playTime on a doc that had none', () =>
    assertSucceeds(updateDoc(doc(owner, 'users', OWNER), {
        'playTime.total': increment(60),
        'playTime.days.2026-08-22': increment(60),
    })));

console.log('\nTTL expiresAt fields');

await check('session create accepts expiresAt', () =>
    assertSucceeds(setDoc(doc(owner, 'sessions', 's1'), {
        uid: OWNER,
        startedAt: serverTimestamp(),
        lastHeartbeat: serverTimestamp(),
        gameStateSeconds: {},
        expiresAt: new Date(Date.now() + 86400000),
    })));

await check('DENIES a non-timestamp expiresAt on a session', () =>
    assertFails(setDoc(doc(owner, 'sessions', 's2'), {
        uid: OWNER,
        startedAt: serverTimestamp(),
        lastHeartbeat: serverTimestamp(),
        gameStateSeconds: {},
        expiresAt: 'tomorrow',
    })));

await check('presence upsert accepts expiresAt', () =>
    assertSucceeds(setDoc(doc(owner, 'presence', OWNER), {
        uid: OWNER, displayName: 'Igrac', level: 1, status: 'lobby',
        lastHeartbeat: serverTimestamp(),
        expiresAt: new Date(Date.now() + 86400000),
    })));

await check('DENIES an unknown extra field on presence', () =>
    assertFails(setDoc(doc(owner, 'presence', OWNER), {
        uid: OWNER, displayName: 'Igrac', level: 1, status: 'lobby',
        lastHeartbeat: serverTimestamp(),
        expiresAt: new Date(Date.now() + 86400000),
        hacked: true,
    })));

await check('signed-in user may still list presence (filtered online query)', () =>
    assertSucceeds(setDoc(doc(owner, 'presence', OWNER), {
        uid: OWNER, displayName: 'Igrac', level: 2, status: 'playing',
        lastHeartbeat: serverTimestamp(),
        expiresAt: new Date(Date.now() + 86400000),
    })));

await testEnv.cleanup();
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
