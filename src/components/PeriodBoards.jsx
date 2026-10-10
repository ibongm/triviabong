import { useEffect, useState } from 'react';
import { RefreshCw, Clock, Trophy, Info } from 'lucide-react';
import { SEASONS, WEEKLY_TOP3_COINS, WEEKLY_TOP3_XP } from '../constants/seasons';
import {
    weekKeyFor, seasonForWeek, nextSeasonAfter, seasonEndWeek, weekStartDateKey, weekEndDateKey,
    addDays, zagrebMidnightMs, msUntilWeekEnd, formatWeekCountdown,
} from '../utils/periods';
import { badgeLabel, bestBadgePerSeason } from '../utils/periodBoards';
import {
    getWeeklyBoard, getSeasonBoard, getMyBoardEntry, getMyBoardRank, getBadgesForUids,
} from '../services/periodBoards';

const BOARD_SIZE = 20;
const CACHE_TTL_MS = 60 * 1000;

// Tab switches and reopening the modal within a minute reuse the last fetch -
// each fresh load is a 20-doc query plus a get (see services/periodBoards.js).
const boardCache = new Map();

const formatDateKey = (dateKey) => {
    const [y, m, d] = dateKey.split('-');
    return `${d}.${m}.${y}.`;
};

// Ties share a rank ("1, 1, 3"), same rule the payouts use.
const withRanks = (entries) => entries.map((entry, idx) => {
    let rank = idx + 1;
    if (idx > 0 && entries[idx - 1].total === entry.total) rank = entries[idx - 1].displayRank;
    entry.displayRank = rank;
    return entry;
});

async function loadBoard(kind, key, uid) {
    const cacheKey = `${kind}:${key}:${uid || ''}`;
    const cached = boardCache.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

    const entries = withRanks(kind === 'season' ? await getSeasonBoard(key, BOARD_SIZE) : await getWeeklyBoard(key, BOARD_SIZE));
    const inTop = uid ? entries.find((e) => e.uid === uid) : null;
    let mine = inTop || null;
    let myRank = inTop ? inTop.displayRank : null;
    if (uid && !inTop) {
        mine = await getMyBoardEntry(kind, key, uid);
        if (mine && mine.total > 0) myRank = await getMyBoardRank(kind, key, mine.total);
    }
    const badges = kind === 'season'
        ? await getBadgesForUids(Array.from(new Set([...entries.map((e) => e.uid), ...(uid ? [uid] : [])])))
        : {};
    const data = { entries, mine, myRank, badges };
    boardCache.set(cacheKey, { at: Date.now(), data });
    return data;
}

function BadgeIcons({ items }) {
    const best = bestBadgePerSeason(items);
    if (best.length === 0) return null;
    return (
        <span className="inline-flex gap-0.5 shrink-0">
            {best.map((id) => {
                const label = badgeLabel(id, SEASONS);
                return label ? <span key={id} title={label}>{label.split(' ')[0]}</span> : null;
            })}
        </span>
    );
}

function Row({ entry, rank, isMe, badges }) {
    return (
        <li className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isMe ? 'bg-amber-500/10 border border-amber-500/30' : ''}`}>
            <span className={`text-xs font-extrabold w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${rank === 1 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                {rank ?? '–'}
            </span>
            <span className="truncate text-slate-200 font-semibold">{entry.name}</span>
            {badges && <BadgeIcons items={badges} />}
            <span className="ml-auto text-amber-400 font-bold shrink-0">{entry.total}</span>
        </li>
    );
}

/**
 * Weekly ("weekly") or seasonal ("season") board. Self-contained: fetches on
 * mount / when the tab or the week changes (the surrounding modal only mounts
 * it while open), never subscribes.
 */
export default function PeriodBoards({ kind, currentUser }) {
    const uid = currentUser?.uid || null;
    const [nowMs, setNowMs] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNowMs(Date.now()), 30000);
        return () => clearInterval(id);
    }, []);

    const weekKey = weekKeyFor(new Date(nowMs));
    const season = seasonForWeek(weekKey, SEASONS);
    const upcoming = season ? null : nextSeasonAfter(weekKey, SEASONS);
    const boardKey = kind === 'season' ? season?.id : weekKey;

    const [state, setState] = useState({ key: null, data: null });
    useEffect(() => {
        if (!boardKey) return undefined;
        let cancelled = false;
        loadBoard(kind, boardKey, uid)
            .then((data) => { if (!cancelled) setState({ key: `${kind}:${boardKey}:${uid || ''}`, data }); })
            .catch(() => { if (!cancelled) setState({ key: `${kind}:${boardKey}:${uid || ''}`, data: { entries: [], mine: null, myRank: null, badges: {} } }); });
        return () => { cancelled = true; };
    }, [kind, boardKey, uid]);

    // ---- No active season ----
    if (kind === 'season' && !season) {
        return (
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 text-center space-y-1">
                <Trophy className="w-6 h-6 text-amber-400 mx-auto" />
                <p className="text-sm font-bold text-white">Trenutno nema aktivne sezone</p>
                {upcoming && (
                    <p className="text-xs text-slate-400">
                        {upcoming.name} počinje {formatDateKey(weekStartDateKey(upcoming.startWeek))}
                    </p>
                )}
            </div>
        );
    }

    const loaded = state.data && state.key === `${kind}:${boardKey}:${uid || ''}`;
    const data = loaded ? state.data : null;

    const endsInMs = kind === 'season'
        ? zagrebMidnightMs(addDays(weekEndDateKey(seasonEndWeek(season)), 1)) - nowMs
        : msUntilWeekEnd(nowMs);

    const myInTop = data && uid && data.entries.some((e) => e.uid === uid);

    return (
        <div className="space-y-3">
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-black text-white">
                        {kind === 'season' ? season.name : `Tjedan ${weekKey.slice(6)}`}
                    </h3>
                    <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Završava za {formatWeekCountdown(endsInMs)}
                    </span>
                </div>
                <p className="text-xs text-slate-400 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    {kind === 'season'
                        ? 'Zbroj tvojih 5 najboljih tjedana u sezoni. Najbolji dobivaju bedževe.'
                        : `Zbroj tvojih 5 najboljih rundi ovaj tjedan. Top 3 dobivaju ${WEEKLY_TOP3_COINS[1]}/${WEEKLY_TOP3_COINS[2]}/${WEEKLY_TOP3_COINS[3]} zlatnika i ${WEEKLY_TOP3_XP[1]}/${WEEKLY_TOP3_XP[2]}/${WEEKLY_TOP3_XP[3]} XP.`}
                </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-2 min-h-[120px]">
                {!data ? (
                    <div className="p-6 text-slate-400 text-sm animate-pulse flex justify-center items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                        <span>Učitavanje ljestvice...</span>
                    </div>
                ) : data.entries.length === 0 ? (
                    <p className="p-5 text-xs text-slate-500 text-center">
                        Još nema rezultata. Odigraj rundu i budi prvi!
                    </p>
                ) : (
                    <ol className="space-y-1">
                        {data.entries.map((entry) => (
                            <Row
                                key={entry.uid}
                                entry={entry}
                                rank={entry.displayRank}
                                isMe={entry.uid === uid}
                                badges={data.badges[entry.uid]}
                            />
                        ))}
                        {uid && data.mine && !myInTop && (
                            <>
                                <li className="text-center text-slate-600 text-xs leading-none">⋯</li>
                                <Row entry={data.mine} rank={data.myRank} isMe badges={data.badges[uid]} />
                            </>
                        )}
                    </ol>
                )}
            </div>

            {!uid && (
                <p className="text-xs text-slate-500 text-center italic">
                    Prijavi se da bi tvoji rezultati bili upisani na ljestvicu.
                </p>
            )}
            {uid && data && !data.mine && (
                <p className="text-xs text-slate-500 text-center italic">
                    {kind === 'season' ? 'Još nisi upisan/a u ovu sezonu.' : 'Odigraj rundu da se upišeš na tjednu ljestvicu.'}
                </p>
            )}
        </div>
    );
}
