import { useEffect, useState } from 'react';
import { isFeatureEnabled } from '../constants/features';
import { WEEKLY_TOP3_COINS, WEEKLY_TOP3_XP } from '../constants/seasons';
import { weekKeyFor, addWeeks } from '../utils/periods';
import { getMyBoardEntry, getMyBoardRank, getWeeklyMeta } from '../services/periodBoards';

const ackKeyFor = (uid) => `triviabong_prevweek_ack_${uid}`;

const readAck = (uid) => {
    try { return localStorage.getItem(ackKeyFor(uid)); } catch { return null; }
};
const writeAck = (uid, weekKey) => {
    try { localStorage.setItem(ackKeyFor(uid), weekKey); } catch { /* storage unavailable: card may show again, harmless */ }
};

/**
 * The lobby's one-time "Prošli tjedan: 7. mjesto" card (engagement plan
 * Phase 5). The first time a signed-in player opens the app in a new week it
 * reads their own entry on LAST week's board (1 get, plus one count
 * aggregation for the rank) and, if they played, offers a summary; the
 * acknowledgment is remembered in localStorage so every later open that week
 * costs nothing - not even a read.
 *
 * Returns { summary, dismiss }. `summary` is null when there is nothing to
 * show, otherwise { weekKey, rank, total, prize } where `prize` is the
 * { coins, xp } the weekly payout credited (null if not a podium finish, or
 * the cron has not run yet and `prizePending` is true for podium ranks).
 */
export function usePreviousWeekSummary(currentUser) {
    const [summary, setSummary] = useState(null);
    const uid = currentUser?.uid || null;

    useEffect(() => {
        if (!uid || !isFeatureEnabled('WEEKLY_BOARDS')) return undefined;
        let cancelled = false;
        (async () => {
            const thisWeek = weekKeyFor(new Date());
            if (readAck(uid) === thisWeek) return;
            const lastWeek = addWeeks(thisWeek, -1);

            const mine = await getMyBoardEntry('weekly', lastWeek, uid);
            if (cancelled) return;
            if (!mine || !(mine.total > 0)) {
                writeAck(uid, thisWeek);
                return;
            }
            const rank = await getMyBoardRank('weekly', lastWeek, mine.total);
            const meta = rank && rank <= 3 ? await getWeeklyMeta(lastWeek) : null;
            if (cancelled || !rank) return; // rank lookup failed: try again next open

            const podium = rank <= 3;
            const paid = podium && meta && Array.isArray(meta.winners)
                && meta.winners.some((w) => w.uid === uid);
            setSummary({
                weekKey: lastWeek,
                rank,
                total: mine.total,
                prize: paid ? { coins: WEEKLY_TOP3_COINS[rank], xp: WEEKLY_TOP3_XP[rank] } : null,
                prizePending: podium && !paid,
            });
        })().catch((error) => console.error('Failed to load previous week summary:', error));
        return () => { cancelled = true; };
    }, [uid]);

    const dismiss = () => {
        if (uid) writeAck(uid, weekKeyFor(new Date()));
        setSummary(null);
    };

    return { summary, dismiss };
}
