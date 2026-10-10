// Firestore rules test for the weekly / seasonal leaderboards (engagement plan
// Phase 5). Run from the repo root:
//   npx firebase emulators:exec --only firestore "node scripts/firestore-rules-weekly-boards.test.mjs"
// Gotcha (same as the other rules tests): emulators:exec can leave a java
// process holding port 8080 - kill it before re-running.
import {
    initializeTestEnvironment,
    assertSucceeds,
    assertFails,
} from '@firebase/rules-unit-testing';
import {
    doc, setDoc, getDoc, deleteDoc, serverTimestamp, runTransaction,
    collection, query, orderBy, limit, getDocs, getCountFromServer, where,
} from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const testEnv = await initializeTestEnvironment({
    projectId: 'triviabong-web',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
});

const ctx = (uid, extra = {}) => testEnv.authenticatedContext(uid, { email: `${uid}@example.com`, ...extra }).firestore();
const A = ctx('alice');
const B = ctx('bob');
const admin = ctx('boss', { email: 'ivanm.ploce@gmail.com', email_verified: true });
const anon = testEnv.unauthenticatedContext().firestore();

let passed = 0, failed = 0;
const check = async (name, fn) => {
    try { await fn(); console.log(`  PASS  ${name}`); passed++; }
    catch (err) { console.error(`  FAIL  ${name}\n        ${err.message}`); failed++; }
};

const WEEK = '2026-W44';
const wRef = (db, uid, week = WEEK) => doc(db, 'weeklyBoards', week, 'players', uid);
const sRef = (db, uid, season = 's1') => doc(db, 'seasonBoards', season, 'players', uid);

const weekly = (scores, over = {}) => {
    const [s1 = 0, s2 = 0, s3 = 0, s4 = 0, s5 = 0] = scores;
    return { name: 'Alice', s1, s2, s3, s4, s5, total: s1 + s2 + s3 + s4 + s5, updatedAt: serverTimestamp(), ...over };
};
const season = (weeks, over = {}) => {
    const total = Object.values(weeks).sort((a, b) => b - a).slice(0, 5).reduce((a, b) => a + b, 0);
    return { name: 'Alice', weeks, total, updatedAt: serverTimestamp(), ...over };
};

// Seeds with rules disabled so each test starts from an exact state.
const seedWeekly = (uid, scores, week = WEEK) => testEnv.withSecurityRulesDisabled(async (c) => {
    const [s1 = 0, s2 = 0, s3 = 0, s4 = 0, s5 = 0] = scores;
    await setDoc(wRef(c.firestore(), uid, week), { name: uid, s1, s2, s3, s4, s5, total: s1 + s2 + s3 + s4 + s5, updatedAt: new Date() });
});
const seedSeason = (uid, weeks) => testEnv.withSecurityRulesDisabled(async (c) => {
    const total = Object.values(weeks).sort((a, b) => b - a).slice(0, 5).reduce((a, b) => a + b, 0);
    await setDoc(sRef(c.firestore(), uid), { name: uid, weeks, total, updatedAt: new Date() });
});
const reset = () => testEnv.clearFirestore();

console.log('weekly player docs - create');
await reset();
await check('owner creates a first-round doc', () => assertSucceeds(setDoc(wRef(A, 'alice'), weekly([1500]))));
await reset();
await check('DENIES writing someone else\'s doc', () => assertFails(setDoc(wRef(B, 'alice'), weekly([1500]))));
await check('DENIES an anonymous write', () => assertFails(setDoc(wRef(anon, 'alice'), weekly([1500]))));
await check('DENIES a first doc that already has five rounds (forged week)', () => assertFails(setDoc(wRef(A, 'alice'), weekly([9000, 9000, 9000, 9000, 9000]))));
await check('DENIES a first doc with two rounds', () => assertFails(setDoc(wRef(A, 'alice'), weekly([1500, 1000]))));
await check('DENIES an empty first doc (s1 = 0)', () => assertFails(setDoc(wRef(A, 'alice'), weekly([0]))));
await check('DENIES a forged total', () => assertFails(setDoc(wRef(A, 'alice'), weekly([1500], { total: 9000 }))));
await check('DENIES a score above 10000', () => assertFails(setDoc(wRef(A, 'alice'), weekly([10001]))));
await check('DENIES a negative score', () => assertFails(setDoc(wRef(A, 'alice'), weekly([-5], { total: -5 }))));
await check('DENIES a non-integer score', () => assertFails(setDoc(wRef(A, 'alice'), weekly([1500.5], { total: 1500.5 }))));
await check('DENIES an unsorted list (s2 > s1)', () => assertFails(setDoc(wRef(A, 'alice'), { name: 'Alice', s1: 100, s2: 900, s3: 0, s4: 0, s5: 0, total: 1000, updatedAt: serverTimestamp() })));
await check('DENIES a name over 20 chars', () => assertFails(setDoc(wRef(A, 'alice'), weekly([1500], { name: 'x'.repeat(21) }))));
await check('DENIES an empty name', () => assertFails(setDoc(wRef(A, 'alice'), weekly([1500], { name: '' }))));
await check('DENIES a client-supplied updatedAt', () => assertFails(setDoc(wRef(A, 'alice'), weekly([1500], { updatedAt: new Date('2020-01-01') }))));
await check('DENIES an unknown field', () => assertFails(setDoc(wRef(A, 'alice'), weekly([1500], { rank: 1 }))));
await check('DENIES a malformed week key', () => assertFails(setDoc(wRef(A, 'alice', '2026-44'), weekly([1500]))));
await check('DENIES a week key with junk appended', () => assertFails(setDoc(wRef(A, 'alice', '2026-W44-x'), weekly([1500]))));

console.log('\nweekly player docs - update (single top-5 insertion)');
await reset();
await seedWeekly('alice', [900, 800, 700]);
await check('owner inserts a new best round', () => assertSucceeds(setDoc(wRef(A, 'alice'), weekly([1200, 900, 800, 700]))));
await reset();
await seedWeekly('alice', [900, 800, 700, 600, 500]);
await check('owner replaces the 5th best', () => assertSucceeds(setDoc(wRef(A, 'alice'), weekly([900, 800, 700, 650, 600]))));
await check('DENIES lowering a slot (dropping a round)', () => assertFails(setDoc(wRef(A, 'alice'), weekly([900, 800, 700, 600, 100]))));
await check('DENIES lowering the total', () => assertFails(setDoc(wRef(A, 'alice'), weekly([900, 800, 700, 600, 400]))));
await check('DENIES other players updating it', () => assertFails(setDoc(wRef(B, 'alice'), weekly([1200, 900, 800, 700, 600]))));
await check('DENIES growing the total by more than one round (10000)', () => assertFails(setDoc(wRef(A, 'alice'), weekly([10000, 10000, 10000, 10000, 10000]))));
await check('DENIES a slot that jumps above the old slot above it (not an insertion)', () => assertFails(setDoc(wRef(A, 'alice'), weekly([900, 900, 900, 900, 900]))));
await check('DENIES a forged total on update', () => assertFails(setDoc(wRef(A, 'alice'), weekly([1200, 900, 800, 700, 600], { total: 9999 }))));
await check('DENIES deleting your own doc', () => assertFails(deleteDoc(wRef(A, 'alice'))));
await check('admin can delete a doc', () => assertSucceeds(deleteDoc(wRef(admin, 'alice'))));

console.log('\nweekly board reads');
await reset();
await seedWeekly('alice', [900]);
await seedWeekly('bob', [1500, 700]);
await check('anyone (even signed out) reads a player doc', () => assertSucceeds(getDoc(wRef(anon, 'alice'))));
await check('anyone lists the top of a week', () => assertSucceeds(getDocs(query(collection(anon, 'weeklyBoards', WEEK, 'players'), orderBy('total', 'desc'), limit(20)))));
await check('anyone can count players above a total (rank lookup)', async () => {
    const snap = await assertSucceeds(getCountFromServer(query(collection(anon, 'weeklyBoards', WEEK, 'players'), where('total', '>', 900))));
    if (snap.data().count !== 1) throw new Error(`expected 1, got ${snap.data().count}`);
});
await check('reads the payout meta doc', () => assertSucceeds(getDoc(doc(anon, 'weeklyBoards', WEEK))));

console.log('\nweekly meta doc is Admin-SDK only');
await check('DENIES a client writing payout meta', () => assertFails(setDoc(doc(A, 'weeklyBoards', WEEK), { paidAt: serverTimestamp() })));
await check('DENIES even the admin account from the client', () => assertFails(setDoc(doc(admin, 'weeklyBoards', WEEK), { paidAt: serverTimestamp() })));

console.log('\nseason player docs');
await reset();
await check('owner creates a first season doc', () => assertSucceeds(setDoc(sRef(A, 'alice'), season({ [WEEK]: 1500 }))));
await reset();
await check('DENIES writing someone else\'s season doc', () => assertFails(setDoc(sRef(B, 'alice'), season({ [WEEK]: 1500 }))));
await check('DENIES a first doc with an absurd total', () => assertFails(setDoc(sRef(A, 'alice'), season({ [WEEK]: 1500 }, { total: 200000 }))));
await check('accepts a first doc carrying a full week (weekly doc existed before it)', () => assertSucceeds(setDoc(sRef(A, 'alice'), season({ [WEEK]: 31000 }))));
await reset();
await check('DENIES a first doc above a full week\'s ceiling', () => assertFails(setDoc(sRef(A, 'alice'), season({ [WEEK]: 51000 }))));
await reset();
await check('DENIES a first doc claiming several weeks', () => assertFails(setDoc(sRef(A, 'alice'), season({ '2026-W44': 1500, '2026-W45': 1500 }))));
await check('DENIES an empty weeks map', () => assertFails(setDoc(sRef(A, 'alice'), { name: 'Alice', weeks: {}, total: 0, updatedAt: serverTimestamp() })));
await check('DENIES weeks that is not a map', () => assertFails(setDoc(sRef(A, 'alice'), { name: 'Alice', weeks: 'x', total: 100, updatedAt: serverTimestamp() })));
await check('DENIES an unknown field', () => assertFails(setDoc(sRef(A, 'alice'), season({ [WEEK]: 1500 }, { badge: 'gold' }))));
await check('DENIES a malformed season id', () => assertFails(setDoc(sRef(A, 'alice', 'season-one'), season({ [WEEK]: 1500 }))));
await check('DENIES a client-supplied updatedAt', () => assertFails(setDoc(sRef(A, 'alice'), season({ [WEEK]: 1500 }, { updatedAt: new Date('2020-01-01') }))));

await reset();
await seedSeason('alice', { '2026-W44': 1500 });
await check('owner raises the total by one round', () => assertSucceeds(setDoc(sRef(A, 'alice'), season({ '2026-W44': 2300 }))));
await check('owner adds a second week', () => assertSucceeds(setDoc(sRef(A, 'alice'), season({ '2026-W44': 1500, '2026-W45': 900 }))));
await check('DENIES lowering the total', () => assertFails(setDoc(sRef(A, 'alice'), season({ '2026-W44': 1000 }))));
await check('DENIES raising the total by more than 10000 in one write', () => assertFails(setDoc(sRef(A, 'alice'), season({ '2026-W44': 15000 }, { total: 13500 }))));
await check('DENIES other players updating it', () => assertFails(setDoc(sRef(B, 'alice'), season({ '2026-W44': 2300 }))));
await check('anyone reads the season board', () => assertSucceeds(getDocs(query(collection(anon, 'seasonBoards', 's1', 'players'), orderBy('total', 'desc'), limit(20)))));
await check('DENIES a client writing season meta', () => assertFails(setDoc(doc(A, 'seasonBoards', 's1'), { paidAt: serverTimestamp() })));

console.log('\nthe real client write: one transaction touching both docs');
await reset();
const recordRound = (db, uid, weeklyFields, seasonFields) => runTransaction(db, async (tx) => {
    await tx.get(wRef(db, uid));
    await tx.get(sRef(db, uid));
    tx.set(wRef(db, uid), weeklyFields);
    tx.set(sRef(db, uid), seasonFields);
});
await check('first round writes weekly + season together', () =>
    assertSucceeds(recordRound(A, 'alice', weekly([1500]), season({ [WEEK]: 1500 }))));
await check('a better round updates both together', () =>
    assertSucceeds(recordRound(A, 'alice', weekly([1900, 1500]), season({ [WEEK]: 3400 }))));
await check('the transaction fails as a whole if the season half is forged', async () => {
    await assertFails(recordRound(A, 'alice', weekly([2000, 1900, 1500]), season({ [WEEK]: 5400 }, { total: 200000 })));
    const snap = await getDoc(wRef(A, 'alice'));
    if (snap.data().total !== 3400) throw new Error('weekly half was written despite the failure');
});

console.log('\nbadges are Admin-SDK only');
await reset();
await check('anyone reads a badges doc', () => assertSucceeds(getDoc(doc(anon, 'badges', 'alice'))));
await check('DENIES a player granting themselves a badge', () => assertFails(setDoc(doc(A, 'badges', 'alice'), { items: ['s1_gold'] })));
await check('DENIES a player editing someone else\'s badges', () => assertFails(setDoc(doc(A, 'badges', 'bob'), { items: ['s1_gold'] })));
await check('DENIES the admin account from the client (Admin SDK only)', () => assertFails(setDoc(doc(admin, 'badges', 'alice'), { items: ['s1_gold'] })));

console.log(`\n${passed} passed, ${failed} failed`);
await testEnv.cleanup();
process.exit(failed ? 1 : 0);
