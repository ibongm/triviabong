// Firestore rules test for the 2026-10-16 security audit fixes (H1, H2, H3,
// H4, M2, M4, L1, L4). Run from the repo root:
//   npx firebase emulators:exec --only firestore "node scripts/firestore-rules-security-audit.test.mjs"
// Gotcha (same as the other rules tests): emulators:exec can leave a java
// process holding port 8080 - kill it before re-running.
import {
    initializeTestEnvironment,
    assertSucceeds,
    assertFails,
} from '@firebase/rules-unit-testing';
import {
    doc, setDoc, getDoc, getDocs, updateDoc, collection, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { zagrebDateKey, addDays } from '../src/utils/periods.js';

const RULES = readFileSync('firestore.rules', 'utf8');

const testEnv = await initializeTestEnvironment({
    projectId: 'triviabong-web',
    firestore: { rules: RULES, host: '127.0.0.1', port: 8080 },
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
const seed = (fn) => testEnv.withSecurityRulesDisabled((c) => fn(c.firestore()));
const reset = () => testEnv.clearFirestore();

// ---------------------------------------------------------------------------
console.log('H4 - users/{uid} server-owned fields + key cap');
await reset();
await seed((db) => setDoc(doc(db, 'users', 'alice'), { uid: 'alice', coins: 15, xp: 0, level: 1, dailyWinStreak: 2, lastDailyWinDate: '2026-01-01' }));
const uRef = (db, uid = 'alice') => doc(db, 'users', uid);
await check('owner updates normal stats', () => assertSucceeds(setDoc(uRef(A), { coins: 30, xp: 5 }, { merge: true })));
await check('owner merge that leaves server-owned fields untouched still works', () => assertSucceeds(setDoc(uRef(A), { totalGames: 3, dailyWinStreak: 2 }, { merge: true })));
await check('DENIES owner raising dailyWinStreak', () => assertFails(setDoc(uRef(A), { dailyWinStreak: 6 }, { merge: true })));
await check('DENIES owner forging lastDailyWinDate', () => assertFails(setDoc(uRef(A), { lastDailyWinDate: '2026-10-15' }, { merge: true })));
await check('DENIES owner setting role', () => assertFails(setDoc(uRef(A), { role: 'admin' }, { merge: true })));
await check('DENIES pushing the doc over 40 keys', () => {
    const junk = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`junk${i}`, i]));
    return assertFails(setDoc(uRef(A), junk, { merge: true }));
});
await check('admin can set dailyWinStreak', () => assertSucceeds(setDoc(uRef(admin), { dailyWinStreak: 3 }, { merge: true })));
await check('DENIES create seeded with dailyWinStreak', () => assertFails(setDoc(uRef(B, 'bob'), { uid: 'bob', dailyWinStreak: 7 })));
await check('DENIES create seeded with lastDailyWinDate', () => assertFails(setDoc(uRef(B, 'bob'), { uid: 'bob', lastDailyWinDate: '2026-10-15' })));
await check('DENIES create with more than 40 keys', () => {
    const junk = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`junk${i}`, i]));
    return assertFails(setDoc(uRef(B, 'bob'), { uid: 'bob', ...junk }));
});
await check('plain profile create still works', () => assertSucceeds(setDoc(uRef(B, 'bob'), { uid: 'bob', email: 'bob@example.com', displayName: 'Bob', photoURL: '', lastLogin: serverTimestamp() }, { merge: true })));

// ---------------------------------------------------------------------------
console.log('\nM4 - users/{uid}/missions/{dateKey} shape');
await reset();
const today = zagrebDateKey();
const mRef = (db, key = today, uid = 'alice') => doc(db, 'users', uid, 'missions', key);
const slot = { progress: 0, claimed: false };
const mission = (over = {}) => ({ dateKey: today, slots: { slot1: slot, slot2: slot, slot3: slot }, cleanSweepClaimed: false, ...over });
await check('owner writes a fresh mission state', () => assertSucceeds(setDoc(mRef(A), mission())));
await check('owner reads it back', () => assertSucceeds(getDoc(mRef(A))));
await check('DENIES another player reading it', () => assertFails(getDoc(mRef(B))));
await check('DENIES another player writing it', () => assertFails(setDoc(mRef(B), mission())));
await check('DENIES an unknown top-level key', () => assertFails(setDoc(mRef(A), mission({ coins: 999 }))));
await check('DENIES dateKey not matching the doc id', () => assertFails(setDoc(mRef(A), mission({ dateKey: '2026-01-01' }))));
await check('DENIES a fourth slot', () => assertFails(setDoc(mRef(A), mission({ slots: { slot1: slot, slot2: slot, slot3: slot, slot4: slot } }))));
await check('DENIES non-bool cleanSweepClaimed', () => assertFails(setDoc(mRef(A), mission({ cleanSweepClaimed: 'yes' }))));
await check('DENIES slots that is not a map', () => assertFails(setDoc(mRef(A), mission({ slots: 'x' }))));
await check('DENIES a malformed dateKey', () => assertFails(setDoc(mRef(A, 'today'), mission({ dateKey: 'today' }))));

// ---------------------------------------------------------------------------
console.log('\nL4 - publicProfiles get vs list');
await reset();
await seed((db) => setDoc(doc(db, 'publicProfiles', 'alice'), { displayName: 'Alice', level: 3, xp: 10, maxStreak: 2, dayStreak: 1, achievementCount: 1, updatedAt: new Date() }));
await check('anyone gets a single profile', () => assertSucceeds(getDoc(doc(anon, 'publicProfiles', 'alice'))));
await check('DENIES a signed-out list (uid enumeration)', () => assertFails(getDocs(collection(anon, 'publicProfiles'))));
await check('signed-in users can list', () => assertSucceeds(getDocs(collection(A, 'publicProfiles'))));

// ---------------------------------------------------------------------------
console.log('\nH1 - records/fastestPerfect');
await reset();
const fpRef = (db) => doc(db, 'records', 'fastestPerfect');
const fpEntry = (i, over = {}) => ({ category: 'sport', name: `P${i}`, uid: `u${i}`, elapsedMs: 30000 + i * 1000, createdAt: Date.now(), ...over });
const fpEntries = (n) => Array.from({ length: n }, (_, i) => fpEntry(i));
await check('DENIES an anonymous write', () => assertFails(setDoc(fpRef(anon), { entries: fpEntries(1), updatedAt: serverTimestamp() })));
await check('signed-in user creates the board', () => assertSucceeds(setDoc(fpRef(A), { entries: fpEntries(3), updatedAt: serverTimestamp() })));
await check('signed-in user grows it to a full 10', () => assertSucceeds(setDoc(fpRef(A), { entries: fpEntries(10), updatedAt: serverTimestamp() })));
await check('DENIES shrinking the list (wiping the board)', () => assertFails(setDoc(fpRef(A), { entries: [], updatedAt: serverTimestamp() })));
await check('DENIES dropping one entry', () => assertFails(setDoc(fpRef(A), { entries: fpEntries(9), updatedAt: serverTimestamp() })));
await check('DENIES an 11th entry', () => assertFails(setDoc(fpRef(A), { entries: fpEntries(11), updatedAt: serverTimestamp() })));
await check('DENIES an entry with an unknown key', () => assertFails(setDoc(fpRef(A), { entries: [...fpEntries(9), fpEntry(9, { html: '<b>x</b>' })], updatedAt: serverTimestamp() })));
await check('DENIES an entry with a 21-char name', () => assertFails(setDoc(fpRef(A), { entries: [...fpEntries(9), fpEntry(9, { name: 'x'.repeat(21) })], updatedAt: serverTimestamp() })));
await check('DENIES an entry with a non-int elapsedMs', () => assertFails(setDoc(fpRef(A), { entries: [...fpEntries(9), fpEntry(9, { elapsedMs: 'fast' })], updatedAt: serverTimestamp() })));
await check('DENIES a non-map entry', () => assertFails(setDoc(fpRef(A), { entries: [...fpEntries(9), 'junk'], updatedAt: serverTimestamp() })));
await check('accepts a null-uid (legacy anonymous) entry', () => assertSucceeds(setDoc(fpRef(A), { entries: [...fpEntries(9), fpEntry(9, { uid: null })], updatedAt: serverTimestamp() })));
await check('admin rebuild may shrink it', () => assertSucceeds(setDoc(fpRef(admin), { entries: fpEntries(2), updatedAt: serverTimestamp() })));
await check('anyone reads it', () => assertSucceeds(getDoc(fpRef(anon))));

console.log('\nH1 - records/rekordiSummary');
await reset();
const rsRef = (db) => doc(db, 'records', 'rekordiSummary');
const prof = (f, n) => Array.from({ length: n }, (_, i) => ({ uid: `u${i}`, displayName: `P${i}`, [f]: 100 - i }));
const best = (n) => Array.from({ length: n }, (_, i) => ({ category: 'sport', name: `P${i}`, uid: i % 2 ? null : `u${i}`, score: 5000 - i }));
const fullSummary = () => ({
    level: prof('level', 10), maxStreak: prof('maxStreak', 10), achievementCount: prof('achievementCount', 10),
    dayStreak: prof('dayStreak', 10), bestScore: best(10), updatedAt: serverTimestamp(),
});
await check('DENIES an anonymous write', () => assertFails(setDoc(rsRef(anon), { bestScore: best(1), updatedAt: serverTimestamp() }, { merge: true })));
await check('signed-in creates the bestScore board alone (merge)', () => assertSucceeds(setDoc(rsRef(A), { bestScore: best(1), updatedAt: serverTimestamp() }, { merge: true })));
await check('signed-in adds the four profile boards (merge)', () => assertSucceeds(setDoc(rsRef(A), {
    level: prof('level', 1), maxStreak: prof('maxStreak', 1), achievementCount: prof('achievementCount', 1), dayStreak: prof('dayStreak', 1), updatedAt: serverTimestamp(),
}, { merge: true })));
// Expression-limit pins (1000 per evaluation). The heaviest real writes:
// the profile sync rewrites the four profile lists (40 entries), and a
// score save rewrites bestScore - both against an already-full doc.
await seed((db) => setDoc(rsRef(db), { ...fullSummary(), updatedAt: new Date() }));
await check('profile sync rewriting 4 full lists (40 entries) stays under the expression limit', () => {
    const bump = (f) => prof(f, 10).map((e, i) => (i === 0 ? { ...e, [f]: e[f] + 1 } : e));
    return assertSucceeds(setDoc(rsRef(A), {
        level: bump('level'), maxStreak: bump('maxStreak'), achievementCount: bump('achievementCount'), dayStreak: bump('dayStreak'), updatedAt: serverTimestamp(),
    }, { merge: true }));
});
await check('score save rewriting a full bestScore list is accepted', () =>
    assertSucceeds(setDoc(rsRef(A), { bestScore: [{ category: 'sport', name: 'Top', uid: 'alice', score: 9000 }, ...best(9)], updatedAt: serverTimestamp() }, { merge: true })));
await check('DENIES shrinking bestScore', () => assertFails(setDoc(rsRef(A), { bestScore: best(9), updatedAt: serverTimestamp() }, { merge: true })));
await check('DENIES wiping a profile board', () => assertFails(setDoc(rsRef(A), { level: [], updatedAt: serverTimestamp() }, { merge: true })));
// Profile-board ENTRIES are not validated (expression budget - see the rules
// comment); their list bounds are. Entry content there is a documented residual.
await check('DENIES an 11-entry profile board', () => assertFails(setDoc(rsRef(A), { dayStreak: prof('dayStreak', 11), updatedAt: serverTimestamp() }, { merge: true })));
await check('DENIES a profile board that is not a list', () => assertFails(setDoc(rsRef(A), { level: 'x', updatedAt: serverTimestamp() }, { merge: true })));
await check('DENIES a bestScore entry carrying another field', () => assertFails(setDoc(rsRef(A), { bestScore: [...best(9), { category: 'sport', name: 'X', uid: 'x', score: 1, html: '<b>' }], updatedAt: serverTimestamp() }, { merge: true })));
await check('DENIES a bestScore entry with a 21-char name', () => assertFails(setDoc(rsRef(A), { bestScore: [...best(9), { category: 'sport', name: 'x'.repeat(21), uid: 'x', score: 1 }], updatedAt: serverTimestamp() }, { merge: true })));
await check('DENIES a bestScore above 10000', () => assertFails(setDoc(rsRef(A), { bestScore: [...best(9), { category: 'sport', name: 'X', uid: 'x', score: 10001 }], updatedAt: serverTimestamp() }, { merge: true })));
await check('DENIES an unknown top-level key', () => assertFails(setDoc(rsRef(A), { hacked: true, updatedAt: serverTimestamp() }, { merge: true })));
await check('admin rebuild may shrink everything', () => assertSucceeds(setDoc(rsRef(admin), { level: [], maxStreak: [], achievementCount: [], dayStreak: [], bestScore: [], updatedAt: serverTimestamp() })));

// ---------------------------------------------------------------------------
console.log('\nH2 - dailyAttempts / dailyLeaderboards');
await reset();
const yesterday = addDays(today, -1);
const tomorrow = addDays(today, 1);
const aRef = (db, id) => doc(db, 'dailyAttempts', id);
const attempt = (uid, date) => ({ uid, date, attemptsUsed: 1, updatedAt: serverTimestamp() });
await check(`owner creates today's attempt (${today})`, () => assertSucceeds(setDoc(aRef(A, `${today}_alice`), attempt('alice', today))));
await check('DENIES pre-creating another player\'s attempt doc (lockout)', () => assertFails(setDoc(aRef(A, `${today}_bob`), attempt('alice', today))));
await check('DENIES the same with the victim\'s uid in the body', () => assertFails(setDoc(aRef(A, `${today}_bob`), attempt('bob', today))));
await check('DENIES a doc id whose date differs from the body date', () => assertFails(setDoc(aRef(B, `${tomorrow}_bob`), attempt('bob', today))));
await check(`DENIES yesterday's attempt (${yesterday})`, () => assertFails(setDoc(aRef(B, `${yesterday}_bob`), attempt('bob', yesterday))));
await check(`DENIES tomorrow's attempt (${tomorrow})`, () => assertFails(setDoc(aRef(B, `${tomorrow}_bob`), attempt('bob', tomorrow))));
await check('DENIES a malformed date', () => assertFails(setDoc(aRef(B, 'today_bob'), attempt('bob', 'today'))));
await check('bob can still start today after the failed lockout', () => assertSucceeds(setDoc(aRef(B, `${today}_bob`), attempt('bob', today))));

const dRef = (db, date, uid) => doc(db, 'dailyLeaderboards', date, 'scores', uid);
const dScore = (uid, score) => ({ uid, name: uid, score, createdAt: serverTimestamp() });
await check('owner posts today\'s score after starting', () => assertSucceeds(setDoc(dRef(A, today, 'alice'), dScore('alice', 2400))));
await seed((db) => setDoc(aRef(db, `${yesterday}_alice`), { uid: 'alice', date: yesterday, attemptsUsed: 1, updatedAt: new Date() }));
await check('DENIES posting to yesterday\'s board even with an attempt doc', () => assertFails(setDoc(dRef(A, yesterday, 'alice'), dScore('alice', 9000))));

// ---------------------------------------------------------------------------
console.log('\nH3 / M2 / L1 - matches/{matchId}');
const MATCH = 'm1';
const matchRef = (db) => doc(db, 'matches', MATCH);
const baseMatch = (over = {}) => ({
    player1Uid: 'alice', player2Uid: 'bob', player1DisplayName: 'Alice', player2DisplayName: 'Bob',
    category: 'sport', questionIds: Array.from({ length: 11 }, (_, i) => `q${i}`), status: 'reveal',
    currentQuestionIndex: 9, questionStartedAt: new Date(), player1Answer: null, player2Answer: null,
    player1Score: 1000, player2Score: 500, player1Correct: 5, player2Correct: 3, lastActivityAt: new Date(),
    winnerUid: null, createdAt: new Date(), inviteId: 'inv1', countdownStartedAt: new Date(), ...over,
});
const seedMatch = async (over) => { await reset(); await seed((db) => setDoc(matchRef(db), baseMatch(over))); };
const finish = (db, winnerUid) => updateDoc(matchRef(db), { status: 'match_over', winnerUid, lastActivityAt: serverTimestamp() });

await seedMatch();
await check('H3: DENIES the losing player naming themselves winner', () => assertFails(finish(B, 'bob')));
await check('H3: DENIES declaring a draw when scores differ', () => assertFails(finish(B, null)));
await check('H3: score leader is accepted as winner (from either client)', () => assertSucceeds(finish(B, 'alice')));
await seedMatch({ currentQuestionIndex: 3 });
await check('H3: DENIES finishing early (question 4 reveal)', () => assertFails(finish(A, 'alice')));
await seedMatch({ player1Score: 800, player2Score: 800 });
await check('H3: DENIES finishing a tie at question 10 (sudden death is next)', () => assertFails(finish(A, null)));
await seedMatch({ currentQuestionIndex: 10, player1Score: 800, player2Score: 800 });
await check('H3: sudden-death tie finishes as a draw', () => assertSucceeds(finish(A, null)));
await seedMatch({ currentQuestionIndex: 10, player1Score: 800, player2Score: 800 });
await check('H3: DENIES a winner on a sudden-death tie', () => assertFails(finish(A, 'alice')));
await seedMatch({ currentQuestionIndex: 10, player1Score: 800, player2Score: 1600 });
await check('H3: sudden-death leader (player 2) wins', () => assertSucceeds(finish(A, 'bob')));

const answer = (db, isP1, scoreDelta, withAnswer = true) => {
    const p = isP1 ? 'player1' : 'player2';
    const base = isP1 ? 1000 : 500;
    const patch = { [`${p}Score`]: base + scoreDelta, lastActivityAt: serverTimestamp() };
    if (withAnswer) {
        patch[`${p}Answer`] = { optionIndex: 1, answeredAt: serverTimestamp() };
        patch[`${p}Correct`] = (isP1 ? 5 : 3) + 1;
    }
    return updateDoc(matchRef(db), patch);
};
await seedMatch({ status: 'question_active', currentQuestionIndex: 4 });
await check('M2: player1 answer + 900 points (one-answer max) accepted', () => assertSucceeds(answer(A, true, 900)));
await check('M2: player2 answer + 300 points accepted', () => assertSucceeds(answer(B, false, 300)));
await seedMatch({ status: 'question_active', currentQuestionIndex: 4 });
await check('M2: DENIES player1 +901 in one answer', () => assertFails(answer(A, true, 901)));
await check('M2: DENIES player2 +7500 in one answer', () => assertFails(answer(B, false, 7500)));
await check('M2: DENIES a score bump without an answer', () => assertFails(answer(A, true, 100, false)));
await check('M2: DENIES player1 writing player2\'s score', () => assertFails(answer(A, false, 100)));

const hbRef = (db, uid) => doc(db, 'matches', MATCH, 'heartbeats', uid);
const forfeit = (db, winnerUid, forfeitReason) => updateDoc(matchRef(db), { status: 'forfeited', winnerUid, forfeitReason, lastActivityAt: serverTimestamp() });
await seedMatch({ status: 'question_active', currentQuestionIndex: 4 });
await seed((db) => setDoc(hbRef(db, 'bob'), { heartbeatAt: Timestamp.fromMillis(Date.now() - 60000) }));
await check('L1: timeout win accepted when opponent heartbeat is 60s stale', () => assertSucceeds(forfeit(A, 'alice', 'timeout')));
await seedMatch({ status: 'question_active', currentQuestionIndex: 4 });
await seed((db) => setDoc(hbRef(db, 'bob'), { heartbeatAt: Timestamp.fromMillis(Date.now() - 10000) }));
await check('L1: DENIES timeout win while opponent heartbeat is fresh (10s)', () => assertFails(forfeit(A, 'alice', 'timeout')));
await check('L1: DENIES a self-win labelled manual', () => assertFails(forfeit(A, 'alice', 'manual')));
await check('L1: DENIES a self-win with no reason', () => assertFails(updateDoc(matchRef(A), { status: 'forfeited', winnerUid: 'alice', lastActivityAt: serverTimestamp() })));
await check('L1: manual concession (winner = opponent) still works', () => assertSucceeds(forfeit(A, 'bob', 'manual')));
await seedMatch({ status: 'question_active', currentQuestionIndex: 4 });
await check('L1: DENIES timeout win when the opponent never heartbeated (no doc)', () => assertFails(forfeit(A, 'alice', 'timeout')));
await seed((db) => setDoc(hbRef(db, 'alice'), { heartbeatAt: Timestamp.fromMillis(Date.now() - 60000) }));
await check('L1: player2 timeout win checks player1\'s heartbeat', () => assertSucceeds(forfeit(B, 'bob', 'timeout')));

console.log(`\n${passed} passed, ${failed} failed (main ruleset)`);
await testEnv.cleanup();

// ---------------------------------------------------------------------------
// CEL compatibility probe for the date helpers. The real rules only ever see
// TODAY's date/week, which can't exercise zero-padded "08"/"09" parts, month
// and year boundaries, or 53-week years. So this appends a probe collection
// to the REAL firestore.rules text (same helper code, not a copy) that only
// allows a write when the helper's result equals a client-computed expected
// timestamp - a positive equality test, so a CEL parse error (deny) and a
// wrong answer (deny) both fail the check.
console.log('\nCEL probe - zagrebDayStart / isoWeekStart on padded and edge inputs');
const lastBrace = RULES.lastIndexOf('}');
const secondLastBrace = RULES.lastIndexOf('}', lastBrace - 1);
const probeRules = RULES.slice(0, secondLastBrace) + `
    match /probeDay/{d} {
      allow create: if zagrebDayStart(d) == request.resource.data.expected;
    }
    match /probeWeek/{w} {
      allow create: if isoWeekStart(w) == request.resource.data.expected;
    }
  ` + RULES.slice(secondLastBrace);

const probeEnv = await initializeTestEnvironment({
    projectId: 'audit-probe',
    firestore: { rules: probeRules, host: '127.0.0.1', port: 8080 },
});
await probeEnv.clearFirestore(); // probe ids are fixed; leftovers would turn creates into denied updates
const P = probeEnv.authenticatedContext('prober').firestore();
const atUtc = (y, m, d) => Timestamp.fromMillis(Date.UTC(y, m - 1, d));

for (const [key, y, m, d] of [
    ['2026-08-09', 2026, 8, 9], ['2026-09-08', 2026, 9, 8], ['2026-01-01', 2026, 1, 1],
    ['2026-12-31', 2026, 12, 31], ['2024-02-29', 2024, 2, 29], ['2026-10-16', 2026, 10, 16],
]) {
    await check(`zagrebDayStart('${key}') == ${key}T00:00Z`, () => assertSucceeds(setDoc(doc(P, 'probeDay', key), { expected: atUtc(y, m, d) })));
}
await check('zagrebDayStart: wrong expected value is denied (probe is not vacuous)', () =>
    assertFails(setDoc(doc(P, 'probeDay', '2026-08-10'), { expected: atUtc(2026, 8, 9) })));

// ISO week Monday 00:00 UTC, cross-checked against src/utils/periods.js
// semantics: 2026-W01 starts Mon 2025-12-29; 2020 has 53 weeks.
for (const [key, y, m, d] of [
    ['2026-W01', 2025, 12, 29], ['2026-W08', 2026, 2, 16], ['2026-W09', 2026, 2, 23],
    ['2026-W42', 2026, 10, 12], ['2026-W44', 2026, 10, 26], ['2020-W53', 2020, 12, 28],
    ['2021-W01', 2021, 1, 4], ['2027-W01', 2027, 1, 4],
]) {
    await check(`isoWeekStart('${key}') == ${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T00:00Z`, () =>
        assertSucceeds(setDoc(doc(P, 'probeWeek', key), { expected: atUtc(y, m, d) })));
}
await check('isoWeekStart: wrong expected value is denied (probe is not vacuous)', () =>
    assertFails(setDoc(doc(P, 'probeWeek', '2026-W10'), { expected: atUtc(2026, 2, 23) })));
await probeEnv.cleanup();

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
