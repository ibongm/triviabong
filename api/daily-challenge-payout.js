// Scheduled Vercel Cron endpoint: pays out top-3 placement coins/XP (all
// ties within a tier, in full) on yesterday's Daily Challenge leaderboard,
// once Zagreb's calendar day has rolled over, plus a consecutive-days-at-
// rank-1 win-streak coin bonus for whoever placed 1st.
//
// The same run also settles the WEEKLY board (top-3 coins/XP) once an ISO week
// has ended and awards SEASON badges when a season's last week has ended - see
// runPeriodPayouts below (engagement plan Phase 5). Those two steps are
// independent of the daily payout: they never throw and can't fail it.
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
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

// mirrors src/constants/gameBalance.js - keep in sync manually (see that
// file's Phase 11 note on why these are inlined rather than imported: this
// serverless function isn't guaranteed to resolve ESM imports from src/).
const DAILY_CHALLENGE_TOP3_COINS = { 1: 20, 2: 10, 3: 5 };
const DAILY_CHALLENGE_TOP3_XP = { 1: 30, 2: 15, 3: 10 };
const DAILY_CHALLENGE_WIN_STREAK_COINS = { 1: 1, 2: 3, 3: 5, 4: 10, 5: 20, 6: 25, 7: 50 };

// --- Weekly / seasonal boards (engagement plan Phase 5) ---------------------
// Everything in this block is an INLINED COPY of src/constants/seasons.js and
// src/utils/{periods,periodBoards}.js (same reason as the constants above:
// this function isn't guaranteed to resolve imports from src/). Keep in sync -
// src/utils/periodPayout.test.js pins the copies against the originals.
export const WEEKLY_TOP3_COINS = { 1: 30, 2: 15, 3: 10 };
export const WEEKLY_TOP3_XP = { 1: 30, 2: 15, 3: 10 };
export const SEASONS = [{ id: 's1', name: 'Sezona 1', startWeek: '2026-W44', weekCount: 8 }];
export const SEASON_TOP_BADGE_COUNT = 10;
const MAX_BADGES_PER_PLAYER = 50;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const parseDateKeyMs = (dateKey) => {
    const [y, m, d] = dateKey.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
};

export const weekKeyForDateKey = (dateKey) => {
    const ms = parseDateKeyMs(dateKey);
    const day = new Date(ms).getUTCDay() || 7;
    const thursday = ms + (4 - day) * MS_PER_DAY;
    const weekYear = new Date(thursday).getUTCFullYear();
    const jan1 = Date.UTC(weekYear, 0, 1);
    const week = Math.ceil(((thursday - jan1) / MS_PER_DAY + 1) / 7);
    return `${weekYear}-W${String(week).padStart(2, '0')}`;
};

export const weekStartDateKey = (weekKey) => {
    const year = Number(weekKey.slice(0, 4));
    const week = Number(weekKey.slice(6));
    const jan4 = Date.UTC(year, 0, 4);
    const jan4Day = new Date(jan4).getUTCDay() || 7;
    const week1Monday = jan4 - (jan4Day - 1) * MS_PER_DAY;
    return new Date(week1Monday + (week - 1) * 7 * MS_PER_DAY).toISOString().slice(0, 10);
};

export const addWeeks = (weekKey, delta) =>
    weekKeyForDateKey(new Date(parseDateKeyMs(weekStartDateKey(weekKey)) + delta * 7 * MS_PER_DAY).toISOString().slice(0, 10));

export const seasonEndWeek = (season) => addWeeks(season.startWeek, season.weekCount - 1);

// The most recent ISO week that is completely over as of `dateKey` being
// "yesterday". On a Sunday's run that is the week that just ended; on any
// other day it is the week before the one containing yesterday - which is what
// lets a missed Sunday-night run be caught up on the following days (the
// payout itself is idempotent).
export const lastEndedWeek = (dateKey) => {
    const isSunday = new Date(parseDateKeyMs(dateKey)).getUTCDay() === 0;
    const week = weekKeyForDateKey(dateKey);
    return isSunday ? week : addWeeks(week, -1);
};

// Rows must be sorted best-first. Ties share a tier and are paid in full;
// zero totals are never ranked.
export const groupIntoTiers = (rows, maxTiers = 3) => {
    const tiers = [];
    for (const row of rows) {
        if (!(row.total > 0)) continue;
        let tier = tiers.find((t) => t.value === row.total);
        if (!tier) {
            if (tiers.length >= maxTiers) continue;
            tier = { rank: tiers.length + 1, value: row.total, players: [] };
            tiers.push(tier);
        }
        tier.players.push(row);
    }
    return tiers;
};

export const planWeeklyPayout = (rows) => {
    const tiers = groupIntoTiers(rows, 3);
    const winners = tiers.flatMap((t) => t.players.map((p) => ({ uid: p.uid, name: p.name || '', rank: t.rank })));
    const awards = winners.map((w) => ({ uid: w.uid, coins: WEEKLY_TOP3_COINS[w.rank] || 0, xp: WEEKLY_TOP3_XP[w.rank] || 0 }));
    return { tiers: tiers.map((t) => ({ rank: t.rank, total: t.value, count: t.players.length })), winners, awards };
};

const MEDALS = { 1: 'gold', 2: 'silver', 3: 'bronze' };
export const planSeasonBadges = (seasonId, rows, topCount = SEASON_TOP_BADGE_COUNT) => {
    const ranked = rows.filter((r) => r.total > 0);
    const badges = {};
    const give = (uid, id) => { (badges[uid] ||= []).push(id); };
    for (const tier of groupIntoTiers(ranked, 3)) {
        for (const p of tier.players) give(p.uid, `${seasonId}_${MEDALS[tier.rank]}`);
    }
    const cutoff = ranked[topCount - 1]?.total ?? ranked[ranked.length - 1]?.total ?? 0;
    for (const r of ranked) {
        if (cutoff > 0 && r.total >= cutoff) give(r.uid, `${seasonId}_top10`);
    }
    return badges;
};

// Pays a finished week's podium exactly once. The meta doc weeklyBoards/{weekKey}
// (`paidAt`) is read INSIDE the transaction, so two overlapping runs can't both
// pay: the second one sees paidAt and does nothing.
export const payoutWeek = async (db, weekKey) => {
    const metaRef = db.collection('weeklyBoards').doc(weekKey);
    return db.runTransaction(async (tx) => {
        const metaSnap = await tx.get(metaRef);
        if (metaSnap.exists && metaSnap.data().paidAt) return { weekKey, alreadyPaid: true };

        const topSnap = await tx.get(metaRef.collection('players').orderBy('total', 'desc').limit(100));
        const rows = topSnap.docs.map((d) => ({ uid: d.id, ...d.data() }));
        const plan = planWeeklyPayout(rows);

        for (const award of plan.awards) {
            tx.set(db.collection('users').doc(award.uid), {
                coins: FieldValue.increment(award.coins),
                xp: FieldValue.increment(award.xp),
            }, { merge: true });
        }
        tx.set(metaRef, { paidAt: FieldValue.serverTimestamp(), tiers: plan.tiers, winners: plan.winners });
        return { weekKey, alreadyPaid: false, winners: plan.winners.length };
    });
};

// Awards a finished season's badges exactly once (seasonBoards/{id}.paidAt).
// Badges are arrayUnion'd into badges/{uid}, which only this Admin-SDK code
// can write (firestore.rules denies every client write), so a re-run could
// never duplicate one anyway; the meta doc just avoids redoing the reads.
export const awardSeasonBadges = async (db, season) => {
    const metaRef = db.collection('seasonBoards').doc(season.id);
    const metaSnap = await metaRef.get();
    if (metaSnap.exists && metaSnap.data().paidAt) return { seasonId: season.id, alreadyAwarded: true };

    const topSnap = await metaRef.collection('players').orderBy('total', 'desc').limit(200).get();
    const rows = topSnap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    const badges = planSeasonBadges(season.id, rows);

    const batch = db.batch();
    for (const [uid, ids] of Object.entries(badges)) {
        batch.set(db.collection('badges').doc(uid), { items: FieldValue.arrayUnion(...ids.slice(0, MAX_BADGES_PER_PLAYER)) }, { merge: true });
    }
    batch.set(metaRef, {
        paidAt: FieldValue.serverTimestamp(),
        winners: Object.entries(badges).map(([uid, ids]) => ({ uid, badges: ids })),
    });
    await batch.commit();
    return { seasonId: season.id, alreadyAwarded: false, badged: Object.keys(badges).length };
};

// Settles the last fully finished week (and, if it was a season's final week,
// that season). Independent of the daily payout and NEVER throws: a missing
// board, a quota error or a rules/index problem is reported in the response
// and tried again on the next night's run.
export const runPeriodPayouts = async (db, dateKey) => {
    const result = { weekKey: null, weekly: null, seasons: [] };
    try {
        const weekKey = lastEndedWeek(dateKey);
        result.weekKey = weekKey;
        result.weekly = await payoutWeek(db, weekKey);
        for (const season of SEASONS) {
            if (seasonEndWeek(season) !== weekKey) continue;
            try {
                result.seasons.push(await awardSeasonBadges(db, season));
            } catch (error) {
                console.error(`Season ${season.id} badge award failed:`, error);
                result.seasons.push({ seasonId: season.id, error: error.message });
            }
        }
    } catch (error) {
        console.error('Weekly payout failed:', error);
        result.error = error.message;
    }
    return result;
};

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

// Async-duel expiry sweep (engagement plan Phase 4, decision D2): marks duels
// whose 48 h window has passed and that nobody decided as `expired` - no
// winner, no rewards. Clients also expire duels they happen to look at; this
// catches the ones nobody opens again (notably unclaimed random duels, which
// otherwise sit in the pool until someone's query skips them).
//
// Bounded (SWEEP_LIMIT per run - the next night's run takes the rest), uses
// the (status, expiresAt) composite index from firestore.indexes.json,
// and NEVER throws: it runs independently of the Daily Challenge payout so a
// failure here (missing index, quota) can't block or fail the payout.
const SWEEP_LIMIT = 500;
export const sweepExpiredDuels = async (db, nowMs = Date.now()) => {
    try {
        const snap = await db.collection('asyncDuels')
            .where('status', 'in', ['open', 'awaiting_opponent'])
            .where('expiresAt', '<', Timestamp.fromMillis(nowMs))
            .orderBy('expiresAt')
            .limit(SWEEP_LIMIT)
            .get();
        if (snap.empty) return { expired: 0 };
        const batch = db.batch();
        snap.docs.forEach((d) => batch.update(d.ref, { status: 'expired' }));
        await batch.commit();
        return { expired: snap.size };
    } catch (error) {
        console.error('Async duel expiry sweep failed:', error);
        return { expired: 0, error: error.message };
    }
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

        const duelSweep = await sweepExpiredDuels(db);
        const periodPayouts = await runPeriodPayouts(db, date);
        res.status(200).json({ date, ...result, duelSweep, periodPayouts });
    } catch (error) {
        console.error('Daily challenge payout failed:', error);
        const duelSweep = await sweepExpiredDuels(db);
        const periodPayouts = await runPeriodPayouts(db, date);
        res.status(500).json({ error: 'Payout failed.', details: error.message, duelSweep, periodPayouts });
    }
}
