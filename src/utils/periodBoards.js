// Pure logic behind the weekly / seasonal leaderboards (engagement plan
// Phase 5): top-5 round insertion, weekly -> season roll-up, podium tiers and
// badge ids. No React/Firebase imports - the service layer
// (services/periodBoards.js) only does I/O around these functions, and the
// tests pin them.
//
// Ranking metric (decision D3): a player's weekly total is the sum of their
// five best rounds that week; their season total is the sum of their five
// best weekly totals in the season. Both are monotonic - a new round can
// only raise a total - which is exactly what firestore.rules relies on to
// bound a forged write (see the weeklyBoards / seasonBoards blocks there).
import { BEST_ROUNDS_PER_WEEK, BEST_WEEKS_PER_SEASON } from '../constants/seasons.js';

export const WEEKLY_SLOT_KEYS = Array.from({ length: BEST_ROUNDS_PER_WEEK }, (_, i) => `s${i + 1}`);

const asScore = (v) => (Number.isInteger(v) && v > 0 ? v : 0);
const sum = (list) => list.reduce((a, b) => a + b, 0);

/** The five stored round scores of a weekly doc as a descending array (0 = unused slot). */
export const scoresFromWeeklyDoc = (doc) =>
    WEEKLY_SLOT_KEYS.map((k) => asScore(doc?.[k])).sort((a, b) => b - a);

/**
 * Inserts one round score into a player's top-5.
 * A score that doesn't beat the current 5th-best (a tie changes nothing) or
 * isn't positive leaves the list untouched.
 * @param {number[]} scores - descending, length BEST_ROUNDS_PER_WEEK
 * @returns {{ scores: number[], changed: boolean }}
 */
export const insertTopScore = (scores, newScore) => {
    const current = [...scores].sort((a, b) => b - a);
    while (current.length < BEST_ROUNDS_PER_WEEK) current.push(0);
    const score = asScore(newScore);
    if (score === 0 || score <= current[BEST_ROUNDS_PER_WEEK - 1]) {
        return { scores: current, changed: false };
    }
    const next = [...current, score].sort((a, b) => b - a).slice(0, BEST_ROUNDS_PER_WEEK);
    return { scores: next, changed: true };
};

/** { s1..s5, total } for a descending score list. */
export const weeklyFields = (scores) => {
    const fields = {};
    WEEKLY_SLOT_KEYS.forEach((k, i) => { fields[k] = scores[i] || 0; });
    fields.total = sum(WEEKLY_SLOT_KEYS.map((k) => fields[k]));
    return fields;
};

/**
 * Applies a finished round to a player's weekly doc.
 * @param {object|null} existing - the stored weekly doc data, or null
 * @param {number} score
 * @returns {{ changed: boolean, fields: object }} `fields` are the s1..s5 + total
 *   to store (equal to the existing ones when nothing changed)
 */
export const applyRoundToWeekly = (existing, score) => {
    const { scores, changed } = insertTopScore(scoresFromWeeklyDoc(existing), score);
    return { changed, fields: weeklyFields(scores) };
};

/** Sum of the `n` largest values of a { weekKey: weeklyTotal } map. */
export const seasonTotalFromWeeks = (weeks, n = BEST_WEEKS_PER_SEASON) =>
    sum(Object.values(weeks || {}).map(asScore).sort((a, b) => b - a).slice(0, n));

/**
 * Rolls a (raised) weekly total into the player's season doc.
 * @param {object|null} existing - stored season doc data ({ weeks, total }), or null
 * @param {string} weekKey
 * @param {number} weeklyTotal
 * @returns {{ changed: boolean, weeks: Record<string, number>, total: number }}
 */
export const applyWeeklyTotalToSeason = (existing, weekKey, weeklyTotal) => {
    const weeks = { ...(existing?.weeks || {}) };
    const known = asScore(weeks[weekKey]);
    const next = asScore(weeklyTotal);
    if (next <= known) {
        return { changed: false, weeks, total: seasonTotalFromWeeks(weeks) };
    }
    weeks[weekKey] = next;
    return { changed: true, weeks, total: seasonTotalFromWeeks(weeks) };
};

/**
 * One finished round -> what to write to the weekly and season docs.
 * Season part is null outside a season. Nothing is written for a round that
 * doesn't raise the weekly total.
 */
export const planPeriodWrites = ({ weeklyDoc, seasonDoc, weekKey, season, score }) => {
    const weekly = applyRoundToWeekly(weeklyDoc, score);
    if (!weekly.changed) return { weekly: null, season: null };
    const seasonPlan = season
        ? applyWeeklyTotalToSeason(seasonDoc, weekKey, weekly.fields.total)
        : null;
    return {
        weekly: weekly.fields,
        season: seasonPlan && seasonPlan.changed ? { weeks: seasonPlan.weeks, total: seasonPlan.total } : null,
    };
};

/** 1-based rank given how many players have a strictly higher total. */
export const rankFromHigherCount = (higherCount) => (Number.isInteger(higherCount) && higherCount >= 0 ? higherCount + 1 : null);

/**
 * Groups rows (already sorted best-first) into podium tiers by distinct
 * value, ties sharing a tier and being paid in full - same rule as the
 * Daily Challenge payout. Rows with a value <= 0 are never ranked.
 * @returns {{ rank: number, value: number, players: object[] }[]}
 */
export const groupIntoTiers = (rows, maxTiers = 3, getValue = (r) => r.total) => {
    const tiers = [];
    for (const row of rows) {
        const value = getValue(row);
        if (!(value > 0)) continue;
        let tier = tiers.find((t) => t.value === value);
        if (!tier) {
            if (tiers.length >= maxTiers) continue;
            tier = { rank: tiers.length + 1, value, players: [] };
            tiers.push(tier);
        }
        tier.players.push(row);
    }
    return tiers;
};

const MEDALS = { 1: 'gold', 2: 'silver', 3: 'bronze' };

/**
 * Badge ids a season-board finisher earns: a medal for podium tiers 1-3,
 * plus `top10` for everyone in the first `topCount` positions (players tied
 * with the last of them included).
 * @param {string} seasonId
 * @param {{ uid: string, total: number }[]} rows - sorted best-first
 * @returns {Record<string, string[]>} uid -> badge ids
 */
export const seasonBadgesFor = (seasonId, rows, topCount = 10) => {
    const ranked = rows.filter((r) => r.total > 0);
    const badges = {};
    const give = (uid, id) => { (badges[uid] ||= []).push(id); };
    for (const tier of groupIntoTiers(ranked, 3)) {
        for (const p of tier.players) give(p.uid, `${seasonId}_${MEDALS[tier.rank]}`);
    }
    const cutoff = ranked[topCount - 1]?.total ?? ranked[ranked.length - 1]?.total ?? 0;
    for (const r of ranked) {
        if (r.total >= cutoff && cutoff > 0) give(r.uid, `${seasonId}_top10`);
    }
    return badges;
};

const BADGE_PATTERN = /^([a-z0-9]+)_(gold|silver|bronze|top10)$/;
const BADGE_ICONS = { gold: '🥇', silver: '🥈', bronze: '🥉', top10: '🏅' };

/**
 * Display text for a badge id, e.g. "🥇 Sezona 1". Unknown ids -> null so
 * the UI skips them rather than showing a raw key.
 */
export const badgeLabel = (badgeId, seasons) => {
    const m = BADGE_PATTERN.exec(String(badgeId));
    if (!m) return null;
    const season = seasons.find((s) => s.id === m[1]);
    if (!season) return null;
    return m[2] === 'top10'
        ? `${BADGE_ICONS.top10} ${season.name} · Top 10`
        : `${BADGE_ICONS[m[2]]} ${season.name}`;
};

/** The most prestigious badge per season only (gold > silver > bronze > top10). */
export const bestBadgePerSeason = (items) => {
    const order = ['gold', 'silver', 'bronze', 'top10'];
    const best = {};
    for (const id of items || []) {
        const m = BADGE_PATTERN.exec(String(id));
        if (!m) continue;
        const cur = best[m[1]];
        if (!cur || order.indexOf(m[2]) < order.indexOf(cur)) best[m[1]] = m[2];
    }
    return Object.entries(best).map(([seasonId, kind]) => `${seasonId}_${kind}`);
};
