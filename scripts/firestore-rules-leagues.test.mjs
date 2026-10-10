// Firestore rules test for private leagues (engagement plan Phase 6). Run from
// the repo root:
//   npx firebase emulators:exec --only firestore "node scripts/firestore-rules-leagues.test.mjs"
// Gotcha (same as the other rules tests): emulators:exec can leave a java
// process holding port 8080 - kill it before re-running.
import {
    initializeTestEnvironment,
    assertSucceeds,
    assertFails,
} from '@firebase/rules-unit-testing';
import {
    doc, setDoc, getDoc, getDocs, collection, writeBatch, serverTimestamp, increment, deleteDoc, updateDoc, Timestamp,
} from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const testEnv = await initializeTestEnvironment({
    projectId: 'triviabong-web',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
});

const ctx = (uid, extra = {}) => testEnv.authenticatedContext(uid, { email: `${uid}@example.com`, ...extra }).firestore();
const OWNER = ctx('olga');
const MEMBER = ctx('mia');
const JOINER = ctx('nik');
const OUTSIDER = ctx('oto');
const ADMIN = ctx('boss', { email: 'ivanm.ploce@gmail.com', email_verified: true });
const anon = testEnv.unauthenticatedContext().firestore();

let passed = 0, failed = 0;
const check = async (name, fn) => {
    try { await fn(); console.log(`  PASS  ${name}`); passed++; }
    catch (err) { console.error(`  FAIL  ${name}\n        ${err.message}`); failed++; }
};

const CODE = 'ABC234';
const L = 'league1';
const lRef = (db, id = L) => doc(db, 'leagues', id);
const mRef = (db, uid, id = L) => doc(db, 'leagues', id, 'members', uid);
const cRef = (db, code = CODE) => doc(db, 'leagueCodes', code);
const iRef = (db, uid, id = L) => doc(db, 'users', uid, 'leagues', id);

const leagueData = (over = {}) => ({ name: 'Kviz klub', emoji: '🏆', ownerUid: 'olga', code: CODE, memberCount: 1, createdAt: serverTimestamp(), ...over });
const memberData = (name, code = CODE, over = {}) => ({ name, joinedAt: serverTimestamp(), code, ...over });
const codeData = (over = {}) => ({ leagueId: L, name: 'Kviz klub', emoji: '🏆', ...over });
const indexData = (over = {}) => ({ name: 'Kviz klub', emoji: '🏆', joinedAt: Timestamp.now(), ...over });

const reset = () => testEnv.clearFirestore();

// Seeds (rules disabled) so each test starts from an exact state.
const seedLeague = async ({ id = L, code = CODE, count = 2, members = ['olga', 'mia'], ownerUid = 'olga', withCode = true } = {}) => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
        const db = c.firestore();
        await setDoc(lRef(db, id), { name: 'Kviz klub', emoji: '🏆', ownerUid, code, memberCount: count, createdAt: Timestamp.now() });
        for (const u of members) await setDoc(mRef(db, u, id), { name: u, joinedAt: Timestamp.now(), code });
        if (withCode) await setDoc(cRef(db, code), { leagueId: id, name: 'Kviz klub', emoji: '🏆' });
    });
};

const createBatch = (db, uid, { id = L, code = CODE, league = {}, withMember = true, withCodeDoc = true, codeDoc = {} } = {}) => {
    const b = writeBatch(db);
    b.set(lRef(db, id), leagueData({ ownerUid: uid, code, ...league }));
    if (withMember) b.set(mRef(db, uid, id), memberData(uid, code));
    if (withCodeDoc) b.set(cRef(db, code), codeData({ leagueId: id, ...codeDoc }));
    b.set(iRef(db, uid, id), indexData());
    return b.commit();
};

const joinBatch = (db, uid, { code = CODE, bump = increment(1), withMember = true, memberOver = {}, leagueExtra = {} } = {}) => {
    const b = writeBatch(db);
    if (withMember) b.set(mRef(db, uid), memberData(uid, code, memberOver));
    b.update(lRef(db), { memberCount: bump, ...leagueExtra });
    b.set(iRef(db, uid), indexData());
    return b.commit();
};

console.log('create a league');
await reset();
await check('owner creates league + own member doc + code doc + index in one batch', () => assertSucceeds(createBatch(OWNER, 'olga')));
await reset();
await check('DENIES a league without the owner\'s member doc in the batch', () => assertFails(createBatch(OWNER, 'olga', { withMember: false })));
await check('DENIES memberCount 2 on create', () => assertFails(createBatch(OWNER, 'olga', { league: { memberCount: 2 } })));
await check('DENIES naming someone else as owner', () => assertFails(createBatch(OWNER, 'olga', { league: { ownerUid: 'mia' } })));
await check('DENIES a code with an ambiguous character (0)', () => assertFails(createBatch(OWNER, 'olga', { code: 'ABC230' })));
await check('DENIES a 5-character code', () => assertFails(createBatch(OWNER, 'olga', { code: 'ABC23' })));
await check('DENIES a lowercase code', () => assertFails(createBatch(OWNER, 'olga', { code: 'abc234' })));
await check('DENIES a 31-character name', () => assertFails(createBatch(OWNER, 'olga', { league: { name: 'x'.repeat(31) } })));
await check('DENIES an empty name', () => assertFails(createBatch(OWNER, 'olga', { league: { name: '' } })));
await check('DENIES a 9-character emoji', () => assertFails(createBatch(OWNER, 'olga', { league: { emoji: '123456789' } })));
await check('DENIES an extra field on the league', () => assertFails(createBatch(OWNER, 'olga', { league: { verified: true } })));
await check('DENIES a code doc whose name differs from the league', () => assertFails(createBatch(OWNER, 'olga', { codeDoc: { name: 'Drugo ime' } })));
await check('DENIES a client-supplied createdAt', () => assertFails(createBatch(OWNER, 'olga', { league: { createdAt: Timestamp.fromMillis(0) } })));

console.log('\nleague codes');
await reset();
await seedLeague();
await check('DENIES creating a league whose code is already another league\'s (collision)', () =>
    assertFails(createBatch(OUTSIDER, 'oto', { id: 'league2', code: CODE })));
await check('DENIES a code doc pointing at somebody else\'s league', async () => {
    await seedLeague({ id: 'leagueX', code: 'XYZ789', withCode: false, members: ['olga'], count: 1 });
    await assertFails(setDoc(cRef(OUTSIDER, 'XYZ789'), codeData({ leagueId: 'leagueX' })));
});
await check('signed-in user can get a code doc', () => assertSucceeds(getDoc(cRef(OUTSIDER))));
await check('DENIES a signed-out get of a code doc', () => assertFails(getDoc(cRef(anon))));
await check('DENIES listing leagueCodes (no enumeration)', () => assertFails(getDocs(collection(OUTSIDER, 'leagueCodes'))));
await check('DENIES a non-owner deleting a code doc', () => assertFails(deleteDoc(cRef(OUTSIDER))));
await check('DENIES a plain member deleting the code doc', () => assertFails(deleteDoc(cRef(MEMBER))));

console.log('\njoin');
await reset();
await seedLeague({ count: 1, members: ['olga'] });
await check('joiner joins with the current code (member doc + count +1 + index)', () => assertSucceeds(joinBatch(JOINER, 'nik')));
await reset();
await seedLeague({ count: 1, members: ['olga'] });
await check('DENIES joining with a stale code', () => assertFails(joinBatch(JOINER, 'nik', { code: 'ZZZ999' })));
await check('DENIES joining without raising memberCount', async () => {
    const b = writeBatch(JOINER);
    b.set(mRef(JOINER, 'nik'), memberData('nik'));
    await assertFails(b.commit());
});
await check('DENIES raising memberCount by 2 when joining', () => assertFails(joinBatch(JOINER, 'nik', { bump: increment(2) })));
await check('DENIES raising memberCount without a member doc (faking the count)', () => assertFails(joinBatch(JOINER, 'nik', { withMember: false })));
await check('DENIES joining as somebody else', () => assertFails(joinBatch(JOINER, 'mia')));
await check('DENIES changing other league fields while joining', () => assertFails(joinBatch(JOINER, 'nik', { leagueExtra: { name: 'Moja liga sada' } })));
await check('DENIES a client-supplied joinedAt', () => assertFails(joinBatch(JOINER, 'nik', { memberOver: { joinedAt: Timestamp.fromMillis(0) } })));
await check('DENIES a member doc with an extra field', () => assertFails(joinBatch(JOINER, 'nik', { memberOver: { admin: true } })));
await reset();
await seedLeague({ count: 50, members: ['olga'] });
await check('DENIES joining a full league (50)', () => assertFails(joinBatch(JOINER, 'nik')));
await reset();
await seedLeague({ count: 49, members: ['olga'] });
await check('the 50th member can still join', () => assertSucceeds(joinBatch(JOINER, 'nik')));
await reset();
await seedLeague({ count: 2, members: ['olga', 'mia'] });
await check('DENIES joining twice (member doc already exists)', () => assertFails(joinBatch(MEMBER, 'mia')));

console.log('\nreads');
await reset();
await seedLeague();
await check('a member reads the league', () => assertSucceeds(getDoc(lRef(MEMBER))));
await check('the owner reads the league', () => assertSucceeds(getDoc(lRef(OWNER))));
await check('DENIES a non-member reading the league', () => assertFails(getDoc(lRef(OUTSIDER))));
await check('DENIES a signed-out read of the league', () => assertFails(getDoc(lRef(anon))));
await check('DENIES a non-admin listing leagues', () => assertFails(getDocs(collection(MEMBER, 'leagues'))));
await check('admin lists leagues', () => assertSucceeds(getDocs(collection(ADMIN, 'leagues'))));
await check('a member lists the members', () => assertSucceeds(getDocs(collection(MEMBER, 'leagues', L, 'members'))));
await check('DENIES a non-member listing the members', () => assertFails(getDocs(collection(OUTSIDER, 'leagues', L, 'members'))));
await check('DENIES a signed-out members read', () => assertFails(getDocs(collection(anon, 'leagues', L, 'members'))));
await check('owner reads and writes own league index', async () => {
    await assertSucceeds(setDoc(iRef(MEMBER, 'mia'), indexData()));
    await assertSucceeds(getDoc(iRef(MEMBER, 'mia')));
});
await check('DENIES reading somebody else\'s league index', () => assertFails(getDoc(iRef(OUTSIDER, 'mia'))));
await check('DENIES writing somebody else\'s league index', () => assertFails(setDoc(iRef(OUTSIDER, 'mia'), indexData())));
await check('DENIES a league index with an oversized name', () => assertFails(setDoc(iRef(MEMBER, 'mia'), indexData({ name: 'x'.repeat(31) }))));

console.log('\nleave and kick');
await reset();
await seedLeague({ count: 3, members: ['olga', 'mia', 'nik'] });
await check('a member leaves (own member doc deleted + count -1)', async () => {
    const b = writeBatch(MEMBER);
    b.update(lRef(MEMBER), { memberCount: increment(-1) });
    b.delete(mRef(MEMBER, 'mia'));
    await assertSucceeds(b.commit());
});
await check('DENIES lowering the count without deleting your own member doc', async () => {
    const b = writeBatch(JOINER);
    b.update(lRef(JOINER), { memberCount: increment(-1) });
    await assertFails(b.commit());
});
await check('DENIES a non-owner kicking another member', async () => {
    const b = writeBatch(JOINER);
    b.update(lRef(JOINER), { memberCount: increment(-1) });
    b.delete(mRef(JOINER, 'olga'));
    await assertFails(b.commit());
});
await check('DENIES a non-owner deleting another member doc on its own', () => assertFails(deleteDoc(mRef(JOINER, 'olga'))));
await check('DENIES an outsider deleting a member doc', () => assertFails(deleteDoc(mRef(OUTSIDER, 'nik'))));
await check('the owner kicks a member', async () => {
    const b = writeBatch(OWNER);
    b.update(lRef(OWNER), { memberCount: increment(-1) });
    b.delete(mRef(OWNER, 'nik'));
    await assertSucceeds(b.commit());
});
await reset();
await seedLeague({ count: 2, members: ['olga', 'mia'] });
await check('the owner hands the league to a member and leaves', async () => {
    const b = writeBatch(OWNER);
    b.update(lRef(OWNER), { ownerUid: 'mia', memberCount: increment(-1) });
    b.delete(mRef(OWNER, 'olga'));
    b.delete(iRef(OWNER, 'olga'));
    await assertSucceeds(b.commit());
});
await reset();
await seedLeague({ count: 2, members: ['olga', 'mia'] });
await check('DENIES handing the league to a non-member', async () => {
    const b = writeBatch(OWNER);
    b.update(lRef(OWNER), { ownerUid: 'oto', memberCount: increment(-1) });
    b.delete(mRef(OWNER, 'olga'));
    await assertFails(b.commit());
});
await check('DENIES a non-owner changing ownerUid (taking over)', () => assertFails(updateDoc(lRef(MEMBER), { ownerUid: 'mia' })));
await check('DENIES the owner lowering the count by 2', () => assertFails(updateDoc(lRef(OWNER), { memberCount: 0 })));
await check('DENIES the owner raising the count by hand (faking memberCount)', () => assertFails(updateDoc(lRef(OWNER), { memberCount: 3 })));
await check('DENIES the owner deleting a league that still has other members', () => assertFails(deleteDoc(lRef(OWNER))));
await check('DENIES a member deleting the league', () => assertFails(deleteDoc(lRef(MEMBER))));
await check('DENIES editing a member doc (immutable)', () => assertFails(updateDoc(mRef(MEMBER, 'mia'), { name: 'Nova' })));
await reset();
await seedLeague({ count: 1, members: ['olga'] });
await check('the last member deletes the league, its code doc and own member doc', async () => {
    const b = writeBatch(OWNER);
    b.delete(lRef(OWNER));
    b.delete(cRef(OWNER));
    b.delete(mRef(OWNER, 'olga'));
    b.delete(iRef(OWNER, 'olga'));
    await assertSucceeds(b.commit());
});
await reset();
await seedLeague({ count: 2 });
await check('admin deletes any league and its code (moderation)', async () => {
    const b = writeBatch(ADMIN);
    b.delete(lRef(ADMIN));
    b.delete(cRef(ADMIN));
    await assertSucceeds(b.commit());
});

console.log('\nowner edits');
await reset();
await seedLeague();
await check('owner renames the league and syncs the code doc', async () => {
    const b = writeBatch(OWNER);
    b.update(lRef(OWNER), { name: 'Novo ime', emoji: '🦁' });
    b.set(cRef(OWNER), codeData({ name: 'Novo ime', emoji: '🦁' }));
    await assertSucceeds(b.commit());
});
await check('DENIES a non-owner renaming the league', () => assertFails(updateDoc(lRef(MEMBER), { name: 'Hakirano' })));
await check('DENIES the owner using a 31-character name', () => assertFails(updateDoc(lRef(OWNER), { name: 'x'.repeat(31) })));
await check('DENIES the owner changing createdAt', () => assertFails(updateDoc(lRef(OWNER), { createdAt: Timestamp.fromMillis(0) })));
await check('DENIES a non-owner rewriting the code doc', () => assertFails(setDoc(cRef(MEMBER), codeData({ name: 'Hakirano' }))));
await reset();
await seedLeague();
const NEW_CODE = 'NEW234';
await check('owner regenerates the code (league code, old code doc deleted, new one created)', async () => {
    const b = writeBatch(OWNER);
    b.update(lRef(OWNER), { code: NEW_CODE });
    b.delete(cRef(OWNER, CODE));
    b.set(cRef(OWNER, NEW_CODE), codeData());
    await assertSucceeds(b.commit());
});
await check('after regenerating, joining with the OLD code is denied', () => assertFails(joinBatch(JOINER, 'nik', { code: CODE })));
await check('after regenerating, joining with the NEW code works', () => assertSucceeds(joinBatch(JOINER, 'nik', { code: NEW_CODE })));
await reset();
await seedLeague();
await check('DENIES a non-owner regenerating the code', async () => {
    const b = writeBatch(MEMBER);
    b.update(lRef(MEMBER), { code: NEW_CODE });
    b.set(cRef(MEMBER, NEW_CODE), codeData());
    await assertFails(b.commit());
});
await check('DENIES the owner putting a malformed code on the league', () => assertFails(updateDoc(lRef(OWNER), { code: 'abc' })));

console.log(`\n${passed} passed, ${failed} failed`);
await testEnv.cleanup();
process.exit(failed ? 1 : 0);
