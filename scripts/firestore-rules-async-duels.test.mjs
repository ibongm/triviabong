// Firestore rules test for async duels (engagement plan Phase 4). Run from the
// repo root:
//   npx firebase emulators:exec --only firestore "node scripts/firestore-rules-async-duels.test.mjs"
// Gotcha (same as the other rules tests): emulators:exec can leave a java
// process holding port 8080 - kill it before re-running.
import {
    initializeTestEnvironment,
    assertSucceeds,
    assertFails,
} from '@firebase/rules-unit-testing';
import {
    doc, setDoc, getDoc, updateDoc, writeBatch, serverTimestamp, Timestamp,
    collection, query, where, orderBy, limit, getDocs,
} from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const testEnv = await initializeTestEnvironment({
    projectId: 'triviabong-web',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
});

const ctx = (uid) => testEnv.authenticatedContext(uid, { email: `${uid}@example.com` }).firestore();
const A = ctx('alice');
const B = ctx('bob');
const C = ctx('carol'); // outsider
const anon = testEnv.unauthenticatedContext().firestore();

let passed = 0, failed = 0;
const check = async (name, fn) => {
    try { await fn(); console.log(`  PASS  ${name}`); passed++; }
    catch (err) { console.error(`  FAIL  ${name}\n        ${err.message}`); failed++; }
};

const HOUR = 3600 * 1000;
const inHours = (h) => Timestamp.fromMillis(Date.now() + h * HOUR);
const ids = () => Array.from({ length: 10 }, (_, i) => `q${i}`);
const answers = () => Array.from({ length: 10 }, () => ({ c: true, t: 3000 }));
let n = 0;
const nextId = () => `duel${++n}`;

const direct = (over = {}) => ({
    mode: 'direct', challengerUid: 'alice', challengerName: 'Alice',
    opponentUid: 'bob', opponentName: 'Bob', category: 'geografija',
    questionIds: ids(), status: 'awaiting_opponent',
    createdAt: serverTimestamp(), expiresAt: inHours(48), ...over,
});
const random = (over = {}) => ({
    mode: 'random', challengerUid: 'alice', challengerName: 'Alice',
    opponentUid: null, opponentName: null, category: 'any',
    questionIds: ids(), status: 'open',
    createdAt: serverTimestamp(), expiresAt: inHours(48), ...over,
});
const startResult = (over = {}) => ({
    state: 'in_progress', startedAt: serverTimestamp(), score: 0, correct: 0,
    totalTimeMs: 0, answers: [], rewardClaimed: false, ...over,
});
const finishFields = (score, totalTimeMs, over = {}) => ({
    state: 'done', finishedAt: serverTimestamp(), score, correct: 8, totalTimeMs, answers: answers(), ...over,
});

const duelRef = (db, id) => doc(db, 'asyncDuels', id);
const resRef = (db, id, uid) => doc(db, 'asyncDuels', id, 'results', uid);

// Seeds with rules disabled so each test starts from an exact state.
const seed = async (id, data, results = {}) => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
        const db = c.firestore();
        await setDoc(duelRef(db, id), { createdAt: Timestamp.now(), expiresAt: inHours(48), ...data });
        for (const [uid, r] of Object.entries(results)) await setDoc(resRef(db, id, uid), { rewardClaimed: false, ...r });
    });
};
const doneRes = (score, totalTimeMs, extra = {}) => ({
    state: 'done', startedAt: Timestamp.now(), finishedAt: Timestamp.now(), score, correct: 8, totalTimeMs, answers: answers(), ...extra,
});
const seedBase = (over = {}) => ({
    mode: 'direct', challengerUid: 'alice', challengerName: 'Alice', opponentUid: 'bob', opponentName: 'Bob',
    category: 'geografija', questionIds: ids(), status: 'awaiting_opponent', ...over,
});

// Both finish in one batch, the second finisher completing the parent.
const finishAndComplete = (db, id, myUid, myScore, myTime, winnerUid) => {
    const batch = writeBatch(db);
    batch.update(resRef(db, id, myUid), finishFields(myScore, myTime));
    batch.update(duelRef(db, id), { status: 'complete', winnerUid, completedAt: serverTimestamp() });
    return batch.commit();
};

console.log('\ncreate duel');
await check('direct duel by the challenger', () => assertSucceeds(setDoc(duelRef(A, nextId()), direct())));
await check('random open duel by the challenger', () => assertSucceeds(setDoc(duelRef(A, nextId()), random())));
await check('DENIES creating as someone else', () => assertFails(setDoc(duelRef(C, nextId()), direct())));
await check('DENIES challenging yourself', () => assertFails(setDoc(duelRef(A, nextId()), direct({ opponentUid: 'alice' }))));
await check('DENIES unauthenticated create', () => assertFails(setDoc(duelRef(anon, nextId()), direct())));
await check('DENIES 9 questions', () => assertFails(setDoc(duelRef(A, nextId()), direct({ questionIds: ids().slice(1) }))));
await check('DENIES 11 questions', () => assertFails(setDoc(duelRef(A, nextId()), direct({ questionIds: [...ids(), 'q10'] }))));
await check('DENIES a direct duel already marked complete', () => assertFails(setDoc(duelRef(A, nextId()), direct({ status: 'complete' }))));
await check('DENIES a random duel that is pre-claimed', () => assertFails(setDoc(duelRef(A, nextId()), random({ opponentUid: 'bob', opponentName: 'Bob', status: 'awaiting_opponent' }))));
await check('DENIES a 7-day expiry', () => assertFails(setDoc(duelRef(A, nextId()), direct({ expiresAt: inHours(24 * 7) }))));
await check('DENIES a 1-hour expiry', () => assertFails(setDoc(duelRef(A, nextId()), direct({ expiresAt: inHours(1) }))));
await check('DENIES a client-supplied createdAt', () => assertFails(setDoc(duelRef(A, nextId()), direct({ createdAt: Timestamp.fromMillis(1) }))));
await check('DENIES a name over 20 chars', () => assertFails(setDoc(duelRef(A, nextId()), direct({ challengerName: 'x'.repeat(21) }))));
await check('DENIES smuggling a winnerUid at creation', () => assertFails(setDoc(duelRef(A, nextId()), direct({ winnerUid: 'alice' }))));

console.log('\nreading duels');
{
    const id = nextId();
    await seed(id, seedBase());
    await check('challenger can read', () => assertSucceeds(getDoc(duelRef(A, id))));
    await check('opponent can read', () => assertSucceeds(getDoc(duelRef(B, id))));
    await check('DENIES an outsider reading a direct duel', () => assertFails(getDoc(duelRef(C, id))));
    await check('DENIES unauthenticated read', () => assertFails(getDoc(duelRef(anon, id))));
}
{
    const id = nextId();
    await seed(id, seedBase({ mode: 'random', opponentUid: null, opponentName: null, status: 'open', category: 'any' }));
    await check('any signed-in user can read an unclaimed random duel', () => assertSucceeds(getDoc(duelRef(C, id))));
}
await check('inbox queries (as challenger / as opponent) are allowed', async () => {
    await assertSucceeds(getDocs(query(collection(A, 'asyncDuels'), where('challengerUid', '==', 'alice'), orderBy('createdAt', 'desc'), limit(20))));
    await assertSucceeds(getDocs(query(collection(B, 'asyncDuels'), where('opponentUid', '==', 'bob'), orderBy('createdAt', 'desc'), limit(20))));
});
await check('random-pool query is allowed', () =>
    assertSucceeds(getDocs(query(collection(C, 'asyncDuels'), where('mode', '==', 'random'), where('status', '==', 'open'), where('category', '==', 'any'), orderBy('createdAt'), limit(3)))));
await check('DENIES an unfiltered list of all duels', () => assertFails(getDocs(collection(C, 'asyncDuels'))));

console.log('\nclaiming a random duel');
const openRandom = async () => {
    const id = nextId();
    await seed(id, seedBase({ mode: 'random', opponentUid: null, opponentName: null, status: 'open', category: 'any' }));
    return id;
};
await check('another player can claim it', async () => {
    const id = await openRandom();
    await assertSucceeds(updateDoc(duelRef(B, id), { opponentUid: 'bob', opponentName: 'Bob', status: 'awaiting_opponent' }));
});
await check('DENIES the challenger claiming their own duel', async () => {
    const id = await openRandom();
    await assertFails(updateDoc(duelRef(A, id), { opponentUid: 'alice', opponentName: 'Alice', status: 'awaiting_opponent' }));
});
await check('DENIES claiming it for someone else', async () => {
    const id = await openRandom();
    await assertFails(updateDoc(duelRef(B, id), { opponentUid: 'carol', opponentName: 'Carol', status: 'awaiting_opponent' }));
});
await check('DENIES claiming an already-claimed duel', async () => {
    const id = nextId();
    await seed(id, seedBase({ mode: 'random', opponentUid: 'carol', opponentName: 'Carol', status: 'awaiting_opponent' }));
    await assertFails(updateDoc(duelRef(B, id), { opponentUid: 'bob', opponentName: 'Bob', status: 'awaiting_opponent' }));
});
await check('DENIES a claim that also rewrites the questions', async () => {
    const id = await openRandom();
    await assertFails(updateDoc(duelRef(B, id), { opponentUid: 'bob', opponentName: 'Bob', status: 'awaiting_opponent', questionIds: ids().reverse() }));
});
await check('DENIES claiming an expired open duel', async () => {
    const id = nextId();
    await seed(id, seedBase({ mode: 'random', opponentUid: null, opponentName: null, status: 'open', category: 'any', expiresAt: Timestamp.fromMillis(Date.now() - HOUR) }));
    await assertFails(updateDoc(duelRef(B, id), { opponentUid: 'bob', opponentName: 'Bob', status: 'awaiting_opponent' }));
});

console.log('\nstarting a run');
{
    const id = nextId();
    await seed(id, seedBase());
    await check('challenger starts a run', () => assertSucceeds(setDoc(resRef(A, id, 'alice'), startResult())));
    await check('DENIES a second create (no retry until good)', () => assertFails(setDoc(resRef(A, id, 'alice'), startResult())));
    await check('opponent starts a run', () => assertSucceeds(setDoc(resRef(B, id, 'bob'), startResult())));
    await check('DENIES an outsider starting a run', () => assertFails(setDoc(resRef(C, id, 'carol'), startResult())));
    await check('DENIES starting a run in someone else\'s slot', async () => {
        const id2 = nextId();
        await seed(id2, seedBase());
        await assertFails(setDoc(resRef(A, id2, 'bob'), startResult()));
    });
}
await check('DENIES a pre-filled score at start', async () => {
    const id = nextId(); await seed(id, seedBase());
    await assertFails(setDoc(resRef(A, id, 'alice'), startResult({ score: 5000 })));
});
await check('DENIES a client-supplied startedAt', async () => {
    const id = nextId(); await seed(id, seedBase());
    await assertFails(setDoc(resRef(A, id, 'alice'), startResult({ startedAt: Timestamp.fromMillis(1) })));
});
await check('DENIES starting a run on an expired duel', async () => {
    const id = nextId(); await seed(id, seedBase({ expiresAt: Timestamp.fromMillis(Date.now() - HOUR) }));
    await assertFails(setDoc(resRef(A, id, 'alice'), startResult()));
});
await check('DENIES starting a run on a complete duel', async () => {
    const id = nextId(); await seed(id, seedBase({ status: 'complete', winnerUid: 'alice' }));
    await assertFails(setDoc(resRef(A, id, 'alice'), startResult()));
});
await check('DENIES the challenger running an unclaimed random duel as the opponent', async () => {
    const id = nextId();
    await seed(id, seedBase({ mode: 'random', opponentUid: null, opponentName: null, status: 'open', category: 'any' }));
    await assertFails(setDoc(resRef(B, id, 'bob'), startResult()));
});

console.log('\nfinishing a run');
{
    const id = nextId();
    await seed(id, seedBase(), { alice: { state: 'in_progress', startedAt: Timestamp.now(), score: 0, correct: 0, totalTimeMs: 0, answers: [] } });
    await check('owner finishes in_progress -> done', () => assertSucceeds(updateDoc(resRef(A, id, 'alice'), finishFields(2100, 40000))));
    await check('DENIES finishing twice (done is final)', () => assertFails(updateDoc(resRef(A, id, 'alice'), finishFields(9000, 1000))));
}
const inProgress = { state: 'in_progress', startedAt: Timestamp.now(), score: 0, correct: 0, totalTimeMs: 0, answers: [] };
await check('DENIES a score over 10000', async () => {
    const id = nextId(); await seed(id, seedBase(), { alice: inProgress });
    await assertFails(updateDoc(resRef(A, id, 'alice'), finishFields(10001, 40000)));
});
await check('DENIES a negative or float score', async () => {
    const id = nextId(); await seed(id, seedBase(), { alice: inProgress });
    await assertFails(updateDoc(resRef(A, id, 'alice'), finishFields(-1, 40000)));
    await assertFails(updateDoc(resRef(A, id, 'alice'), finishFields(10.5, 40000)));
});
await check('DENIES totalTimeMs over 200000', async () => {
    const id = nextId(); await seed(id, seedBase(), { alice: inProgress });
    await assertFails(updateDoc(resRef(A, id, 'alice'), finishFields(1000, 200001)));
});
await check('DENIES correct over 10 and an answers list that is not 10 long', async () => {
    const id = nextId(); await seed(id, seedBase(), { alice: inProgress });
    await assertFails(updateDoc(resRef(A, id, 'alice'), finishFields(1000, 40000, { correct: 11 })));
    await assertFails(updateDoc(resRef(A, id, 'alice'), finishFields(1000, 40000, { answers: [] })));
});
await check('DENIES a client-supplied finishedAt', async () => {
    const id = nextId(); await seed(id, seedBase(), { alice: inProgress });
    await assertFails(updateDoc(resRef(A, id, 'alice'), finishFields(1000, 40000, { finishedAt: Timestamp.fromMillis(1) })));
});
await check('DENIES finishing someone else\'s run', async () => {
    const id = nextId(); await seed(id, seedBase(), { alice: inProgress });
    await assertFails(updateDoc(resRef(B, id, 'alice'), finishFields(1000, 40000)));
});
await check('DENIES also flipping rewardClaimed while finishing', async () => {
    const id = nextId(); await seed(id, seedBase(), { alice: inProgress });
    await assertFails(updateDoc(resRef(A, id, 'alice'), finishFields(1000, 40000, { rewardClaimed: true })));
});

console.log('\nhiding the first score');
{
    const id = nextId();
    await seed(id, seedBase(), { alice: doneRes(2400, 30000), bob: { state: 'in_progress', startedAt: Timestamp.now(), score: 0, correct: 0, totalTimeMs: 0, answers: [] } });
    await check('owner reads their own result', () => assertSucceeds(getDoc(resRef(A, id, 'alice'))));
    await check('DENIES the opponent reading the challenger\'s result while their own run is in_progress', () => assertFails(getDoc(resRef(B, id, 'alice'))));
    await check('DENIES an outsider reading either result', async () => {
        await assertFails(getDoc(resRef(C, id, 'alice')));
        await assertFails(getDoc(resRef(C, id, 'bob')));
    });
    await check('DENIES listing the results subcollection', () => assertFails(getDocs(collection(A, 'asyncDuels', id, 'results'))));
}
{
    const id = nextId();
    await seed(id, seedBase(), { alice: doneRes(2400, 30000) });
    await check('DENIES the opponent reading before they have started at all', () => assertFails(getDoc(resRef(B, id, 'alice'))));
}
{
    const id = nextId();
    await seed(id, seedBase(), { alice: doneRes(2400, 30000), bob: doneRes(1800, 35000) });
    await check('the opponent CAN read once their own run is done (even before complete)', () => assertSucceeds(getDoc(resRef(B, id, 'alice'))));
    await check('and the challenger can read the opponent\'s', () => assertSucceeds(getDoc(resRef(A, id, 'bob'))));
}

console.log('\ncompleting the duel');
const readyToComplete = async (aScore, aTime, bScore, bTime) => {
    const id = nextId();
    await seed(id, seedBase(), {
        alice: doneRes(aScore, aTime),
        bob: { state: 'in_progress', startedAt: Timestamp.now(), score: 0, correct: 0, totalTimeMs: 0, answers: [] },
    });
    return id;
};
await check('second finisher completes with the correct winner (higher score)', async () => {
    const id = await readyToComplete(2400, 30000);
    await assertSucceeds(finishAndComplete(B, id, 'bob', 1800, 35000, 'alice'));
});
await check('second finisher is the higher score -> they are the winner', async () => {
    const id = await readyToComplete(1800, 30000);
    await assertSucceeds(finishAndComplete(B, id, 'bob', 2400, 35000, 'bob'));
});
await check('tie on score -> lower total time wins', async () => {
    const id = await readyToComplete(2000, 30000);
    await assertSucceeds(finishAndComplete(B, id, 'bob', 2000, 25000, 'bob'));
});
await check('exact tie -> draw (winnerUid null)', async () => {
    const id = await readyToComplete(2000, 30000);
    await assertSucceeds(finishAndComplete(B, id, 'bob', 2000, 30000, null));
});
await check('DENIES claiming a win the numbers do not support', async () => {
    const id = await readyToComplete(2400, 30000);
    await assertFails(finishAndComplete(B, id, 'bob', 1800, 35000, 'bob'));
});
await check('DENIES calling a decided duel a draw', async () => {
    const id = await readyToComplete(2400, 30000);
    await assertFails(finishAndComplete(B, id, 'bob', 1800, 35000, null));
});
await check('DENIES a winner who is not a participant', async () => {
    const id = await readyToComplete(2400, 30000);
    await assertFails(finishAndComplete(B, id, 'bob', 1800, 35000, 'carol'));
});
await check('DENIES completing while the other run is not done', async () => {
    const id = nextId();
    await seed(id, seedBase(), {
        alice: { state: 'in_progress', startedAt: Timestamp.now(), score: 0, correct: 0, totalTimeMs: 0, answers: [] },
        bob: { state: 'in_progress', startedAt: Timestamp.now(), score: 0, correct: 0, totalTimeMs: 0, answers: [] },
    });
    await assertFails(finishAndComplete(B, id, 'bob', 1800, 35000, 'bob'));
});
await check('DENIES completing without finishing your own run in the same write', async () => {
    const id = await readyToComplete(2400, 30000);
    await assertFails(updateDoc(duelRef(B, id), { status: 'complete', winnerUid: 'alice', completedAt: serverTimestamp() }));
});
await check('an outsider cannot complete someone else\'s duel', async () => {
    const id = nextId();
    await seed(id, seedBase(), { alice: doneRes(2400, 30000), bob: doneRes(1800, 35000) });
    await assertFails(updateDoc(duelRef(C, id), { status: 'complete', winnerUid: 'alice', completedAt: serverTimestamp() }));
});
await check('either participant can reconcile when both are already done', async () => {
    const id = nextId();
    await seed(id, seedBase(), { alice: doneRes(2400, 30000), bob: doneRes(1800, 35000) });
    await assertSucceeds(updateDoc(duelRef(A, id), { status: 'complete', winnerUid: 'alice', completedAt: serverTimestamp() }));
});
await check('DENIES completing twice', async () => {
    const id = nextId();
    await seed(id, seedBase({ status: 'complete', winnerUid: 'alice' }), { alice: doneRes(2400, 30000), bob: doneRes(1800, 35000) });
    await assertFails(updateDoc(duelRef(B, id), { status: 'complete', winnerUid: 'bob', completedAt: serverTimestamp() }));
});

console.log('\nexpiring');
const stale = () => Timestamp.fromMillis(Date.now() - HOUR);
await check('a participant can expire a duel past expiresAt', async () => {
    const id = nextId(); await seed(id, seedBase({ expiresAt: stale() }));
    await assertSucceeds(updateDoc(duelRef(B, id), { status: 'expired' }));
});
await check('the challenger can expire their unclaimed random duel past expiresAt', async () => {
    const id = nextId();
    await seed(id, seedBase({ mode: 'random', opponentUid: null, opponentName: null, status: 'open', category: 'any', expiresAt: stale() }));
    await assertSucceeds(updateDoc(duelRef(A, id), { status: 'expired' }));
});
await check('DENIES expiring before expiresAt', async () => {
    const id = nextId(); await seed(id, seedBase());
    await assertFails(updateDoc(duelRef(B, id), { status: 'expired' }));
});
await check('DENIES an outsider expiring', async () => {
    const id = nextId(); await seed(id, seedBase({ expiresAt: stale() }));
    await assertFails(updateDoc(duelRef(C, id), { status: 'expired' }));
});
await check('DENIES expiring a complete duel', async () => {
    const id = nextId(); await seed(id, seedBase({ status: 'complete', winnerUid: 'alice', expiresAt: stale() }));
    await assertFails(updateDoc(duelRef(A, id), { status: 'expired' }));
});

console.log('\nreward claim');
await check('owner claims once the duel is complete', async () => {
    const id = nextId();
    await seed(id, seedBase({ status: 'complete', winnerUid: 'alice' }), { alice: doneRes(2400, 30000), bob: doneRes(1800, 35000) });
    await assertSucceeds(updateDoc(resRef(A, id, 'alice'), { rewardClaimed: true }));
});
await check('DENIES claiming twice', async () => {
    const id = nextId();
    await seed(id, seedBase({ status: 'complete', winnerUid: 'alice' }), { alice: doneRes(2400, 30000, { rewardClaimed: true }) });
    await assertFails(updateDoc(resRef(A, id, 'alice'), { rewardClaimed: true }));
});
await check('DENIES claiming before the duel is complete', async () => {
    const id = nextId();
    await seed(id, seedBase(), { alice: doneRes(2400, 30000) });
    await assertFails(updateDoc(resRef(A, id, 'alice'), { rewardClaimed: true }));
});
await check('DENIES claiming for the other player', async () => {
    const id = nextId();
    await seed(id, seedBase({ status: 'complete', winnerUid: 'alice' }), { alice: doneRes(2400, 30000), bob: doneRes(1800, 35000) });
    await assertFails(updateDoc(resRef(A, id, 'bob'), { rewardClaimed: true }));
});
await check('DENIES editing the score while claiming', async () => {
    const id = nextId();
    await seed(id, seedBase({ status: 'complete', winnerUid: 'alice' }), { alice: doneRes(2400, 30000) });
    await assertFails(updateDoc(resRef(A, id, 'alice'), { rewardClaimed: true, score: 9999 }));
});

console.log('\nmatchHistory async marker');
const histRef = (db, uid, id) => doc(db, 'matchHistory', uid, 'entries', id);
const hist = (over = {}) => ({
    opponentUid: 'bob', opponentDisplayName: 'Bob', result: 'win', myScore: 2400, opponentScore: 1800,
    category: 'geografija', createdAt: serverTimestamp(), ...over,
});
await check('accepts an entry with async: true', () => assertSucceeds(setDoc(histRef(A, 'alice', 'd1'), hist({ async: true }))));
await check('still accepts an entry without it (live 1v1)', () => assertSucceeds(setDoc(histRef(A, 'alice', 'd2'), hist())));
await check('DENIES a non-boolean async', () => assertFails(setDoc(histRef(A, 'alice', 'd3'), hist({ async: 'yes' }))));
await check('DENIES other unknown fields (hasOnly still strict)', () => assertFails(setDoc(histRef(A, 'alice', 'd4'), hist({ rewarded: true }))));

console.log(`\n${passed} passed, ${failed} failed`);
await testEnv.cleanup();
process.exit(failed ? 1 : 0);
