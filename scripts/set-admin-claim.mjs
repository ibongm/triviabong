// One-off script: grants the Firebase Auth custom claim { admin: true } to a
// specific uid. Run manually, once, from a machine with the service-account
// key available locally (never commit it - see .gitignore's *adminsdk*.json
// pattern). Usage: node scripts/set-admin-claim.mjs <uid>
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'node:fs';

const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (!keyPath) throw new Error('Set FIREBASE_SERVICE_ACCOUNT_PATH to a local, untracked service-account JSON path.');
const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });

const uid = process.argv[2];
if (!uid) throw new Error('Usage: node scripts/set-admin-claim.mjs <uid>');

await getAuth().setCustomUserClaims(uid, { admin: true });
console.log(`Set admin claim for uid ${uid}. They must sign out/in or force-refresh their ID token to see it.`);
