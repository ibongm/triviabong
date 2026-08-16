// Scheduled Vercel Cron endpoint: pays out top-3 placement coins/XP (all
// ties within a tier, in full) on yesterday's Daily Challenge leaderboard,
// once Zagreb's calendar day has rolled over, plus a consecutive-days-at-
// rank-1 win-streak coin bonus for whoever placed 1st.
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

// mirrors src/constants/gameBalance.js - keep in sync manually (see that
// file's Phase 11 note on why these are inlined rather than imported: this
// serverless function isn't guaranteed to resolve ESM imports from src/).
const DAILY_CHALLENGE_TOP3_COINS = { 1: 20, 2: 10, 3: 5 };
const DAILY_CHALLENGE_TOP3_XP = { 1: 30, 2: 15, 3: 10 };
const DAILY_CHALLENGE_WIN_STREAK_COINS = { 1: 1, 2: 3, 3: 5, 4: 10, 5: 20, 6: 25, 7: 50 };

const getAdminDb = () => {
    if (getApps().length === 0) {
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set.');
        const serviceAccount = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
        initializeApp({ credential: cert(serviceAccount) });
    }
    return getFirestore();
};

// Calendar-date arithmetic on a YYYY-MM-DD string, treated as a pure
// calendar day (UTC-anchored, no timezone conversion) - used only to check
// "was yesterday's win-streak date the day immediately before today's
// payout date", which is a calendar comparison, not a timezone one (the
// Zagreb-vs-UTC conversion already happened once, in
// getYesterdayZagrebDateKey, when the date string was produced).
export const addDaysToDateKey = (dateKey, delta) => {
    const [y, m, d] = dateKey.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + delta);
    return dt.toISOString().slice(0, 10);
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
export const getYesterdayZagrebDateKey = (now = new Date()) => {
    // Convert now -> Zagreb calendar date exactly once, then step back one
    // calendar day as a pure string operation (no second timezone conversion).
    const todayZagreb = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zagreb' }).format(now);
    return addDaysToDateKey(todayZagreb, -1);
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
    const previousDate = addDaysToDateKey(date, -1);
    const metaRef = db.collection('dailyMeta').doc(date);

    try {
        const result = await db.runTransaction(async (tx) => {
            const metaSnap = await tx.get(metaRef);
            if (metaSnap.exists && metaSnap.data().payoutProcessed) {
                return { alreadyProcessed: true, winners: metaSnap.data().winners || [] };
            }

            // Ties are rare but the payout rule ("every tied player in a
            // tier gets that tier's full reward, no split") means we can't
            // just take the top 3 docs - fetch a generous window and group
            // by distinct score into up to 3 tiers. 100 players across the
            // top 3 distinct scores combined is not a realistic scenario for
            // this app's scale.
            const topSnap = await tx.get(
                db.collection('dailyLeaderboards').doc(date).collection('scores')
                    .orderBy('score', 'desc')
                    .limit(100)
            );

            if (topSnap.empty) {
                tx.set(metaRef, {
                    payoutProcessed: true,
                    winners: [],
                    processedAt: FieldValue.serverTimestamp()
                });
                return { alreadyProcessed: false, winners: [] };
            }

            const tiers = [];
            for (const doc of topSnap.docs) {
                const { score, uid, name } = doc.data();
                let tier = tiers.find(t => t.score === score);
                if (!tier) {
                    if (tiers.length >= 3) continue; // already have 3 distinct-score tiers
                    tier = { rank: tiers.length + 1, score, players: [] };
                    tiers.push(tier);
                }
                tier.players.push({ uid, name });
            }

            // Firestore transactions require every read before any write -
            // rank-1 players' current win-streak state has to be read here,
            // before the payout writes below.
            const rank1 = tiers.find(t => t.rank === 1);
            const rank1UserSnaps = rank1
                ? await Promise.all(rank1.players.map(p => tx.get(db.collection('users').doc(p.uid))))
                : [];

            // Top-3 placement coins/XP - every player in every tier.
            for (const tier of tiers) {
                const coins = DAILY_CHALLENGE_TOP3_COINS[tier.rank] || 0;
                const xp = DAILY_CHALLENGE_TOP3_XP[tier.rank] || 0;
                for (const p of tier.players) {
                    const userRef = db.collection('users').doc(p.uid);
                    // set+merge rather than update: a winner's users/{uid}
                    // doc should always exist (Daily Challenge requires
                    // sign-in), but merge avoids a hard failure on the
                    // unlikely case it doesn't, instead of aborting the
                    // whole payout transaction.
                    tx.set(userRef, { coins: FieldValue.increment(coins), xp: FieldValue.increment(xp) }, { merge: true });
                }
            }

            // Win-streak bonus - rank-1 only. A streak continues only if
            // the player's last 1st-place win was exactly yesterday
            // (relative to this payout's date); any gap resets it to 1.
            const winStreakAwards = [];
            if (rank1) {
                rank1.players.forEach((p, i) => {
                    const snap = rank1UserSnaps[i];
                    const prevStreak = snap.exists ? (snap.data().dailyWinStreak || 0) : 0;
                    const prevWinDate = snap.exists ? snap.data().lastDailyWinDate : null;
                    const newStreak = prevWinDate === previousDate ? prevStreak + 1 : 1;
                    const streakCoins = DAILY_CHALLENGE_WIN_STREAK_COINS[Math.min(newStreak, 7)] || 0;

                    const userRef = db.collection('users').doc(p.uid);
                    tx.set(userRef, {
                        dailyWinStreak: newStreak,
                        lastDailyWinDate: date,
                        coins: FieldValue.increment(streakCoins),
                    }, { merge: true });
                    winStreakAwards.push({ uid: p.uid, newStreak, streakCoins });
                });
            }

            const winners = tiers.flatMap(t => t.players.map(p => ({ ...p, rank: t.rank })));

            tx.set(metaRef, {
                payoutProcessed: true,
                winners,
                tiers: tiers.map(t => ({ rank: t.rank, score: t.score, count: t.players.length })),
                winStreakAwards,
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
