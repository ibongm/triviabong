// Scheduled Vercel Cron endpoint: pays out DAILY_CHALLENGE_WINNER_PRIZE
// coins to whoever held rank #1 (all ties, in full) on yesterday's Daily
// Challenge leaderboard, once Zagreb's calendar day has rolled over.
//
// Uses the Firebase Admin SDK (not the client SDK) because crediting coins
// to an arbitrary uid is something no browser client should ever be able to
// do - firestore.rules' `users/{uid}` rule intentionally only lets the
// owner or an admin write that doc, and the Admin SDK is the only way for a
// server job to legitimately bypass that. This is genuinely new
// infrastructure for this project: api/questions.js deliberately avoids a
// service-account key (see its header comment) since it doesn't need one.
// This endpoint does.
//
// Env vars required (Vercel project settings, Production only - crons don't
// run in Preview):
//   FIREBASE_SERVICE_ACCOUNT_KEY - full service-account JSON, base64-encoded
//                                  (Firebase Console -> Project Settings ->
//                                  Service Accounts -> Generate new private key)
//   CRON_SECRET - shared secret; Vercel automatically sends
//                 "Authorization: Bearer $CRON_SECRET" on cron-triggered
//                 invocations once this env var exists, so this doubles as
//                 both the Vercel-side and our-side check.
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const DAILY_CHALLENGE_WINNER_PRIZE = 20; // mirrors src/constants/gameBalance.js - keep in sync manually

const getAdminDb = () => {
    if (getApps().length === 0) {
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set.');
        const serviceAccount = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
        initializeApp({ credential: cert(serviceAccount) });
    }
    return getFirestore();
};

// Yesterday's Zagreb calendar date - the day that just fully rolled over by
// the time this cron fires. vercel.json schedules this at 23:10 UTC, which
// is always AFTER actual Zagreb midnight regardless of DST (CET midnight =
// 23:00 UTC in winter, CEST midnight = 22:00 UTC in summer) - a fixed UTC
// cron can't track the DST-shifting local midnight exactly, but scheduling
// after the latest-possible boundary means this function's own
// Intl.DateTimeFormat-based "what is yesterday in Zagreb right now" check
// is always correct at execution time, even though the cron itself fires
// 10-70 minutes later than midnight depending on the season.
const getYesterdayZagrebDateKey = () => {
    const now = new Date();
    const zagrebNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Zagreb' }));
    zagrebNow.setDate(zagrebNow.getDate() - 1);
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zagreb' }).format(zagrebNow);
};

export default async function handler(req, res) {
    const authHeader = req.headers.authorization || '';
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        res.status(401).json({ error: 'Unauthorized.' });
        return;
    }

    let db;
    try {
        db = getAdminDb();
    } catch (error) {
        res.status(500).json({ error: 'Server nije ispravno konfiguriran (nedostaje FIREBASE_SERVICE_ACCOUNT_KEY).', details: error.message });
        return;
    }

    const date = getYesterdayZagrebDateKey();
    const metaRef = db.collection('dailyMeta').doc(date);

    try {
        const result = await db.runTransaction(async (tx) => {
            const metaSnap = await tx.get(metaRef);
            if (metaSnap.exists && metaSnap.data().payoutProcessed) {
                return { alreadyProcessed: true, winners: metaSnap.data().winners || [] };
            }

            // Ties are rare but the payout rule ("every tied player gets the
            // full prize, no split") means we can't just take the single
            // top doc - fetch a generous window and filter down to the
            // actual top score. 100 simultaneous #1 ties in one day is not a
            // realistic scenario for this app's scale.
            const topSnap = await tx.get(
                db.collection('dailyLeaderboards').doc(date).collection('scores')
                    .orderBy('score', 'desc')
                    .limit(100)
            );

            if (topSnap.empty) {
                tx.set(metaRef, {
                    payoutProcessed: true,
                    winners: [],
                    prizeEach: DAILY_CHALLENGE_WINNER_PRIZE,
                    processedAt: FieldValue.serverTimestamp()
                });
                return { alreadyProcessed: false, winners: [] };
            }

            const topScore = topSnap.docs[0].data().score;
            const winnerDocs = topSnap.docs.filter(d => d.data().score === topScore);
            const winners = winnerDocs.map(d => ({ uid: d.data().uid, name: d.data().name }));

            for (const w of winnerDocs) {
                const userRef = db.collection('users').doc(w.data().uid);
                // set+merge rather than update: a winner's users/{uid} doc
                // should always exist (Daily Challenge requires sign-in),
                // but merge avoids a hard failure on the unlikely case it
                // doesn't, instead of aborting the whole payout transaction.
                tx.set(userRef, { coins: FieldValue.increment(DAILY_CHALLENGE_WINNER_PRIZE) }, { merge: true });
            }

            tx.set(metaRef, {
                payoutProcessed: true,
                winners,
                topScore,
                prizeEach: DAILY_CHALLENGE_WINNER_PRIZE,
                processedAt: FieldValue.serverTimestamp()
            });

            return { alreadyProcessed: false, winners };
        });

        res.status(200).json({ date, ...result });
    } catch (error) {
        console.error('Daily challenge payout failed:', error);
        res.status(500).json({ error: 'Payout failed.', details: error.message });
    }
}
