import { Star, Zap, Medal, Flame, Trophy, CalendarCheck, CalendarDays } from 'lucide-react';
import { CATEGORY_META } from '../data/categoryMeta';

const REKORDI_BOARDS = [
    // 'daily' is a live, date-scoped board (today's Daily Challenge
    // standings) - unlike every other board here, it's NOT part of the
    // once-on-mount fetch in App.jsx's refreshRekordiData, since "today"
    // can change while the app stays open across a Zagreb midnight
    // rollover. App.jsx refetches it separately and merges it into the
    // `data` object passed down here.
    { key: 'daily', title: 'Dnevni izazov (danas)', icon: CalendarDays, unit: 'dailyScore', signedInOnly: false },
    { key: 'level', title: 'Najviša razina', icon: Star, unit: 'level', signedInOnly: true },
    { key: 'bestScore', title: 'Najbolji rezultat', icon: Zap, unit: 'score', signedInOnly: false },
    { key: 'fastestPerfect', title: 'Najbrža savršena runda', icon: Medal, unit: 'time', signedInOnly: false },
    { key: 'maxStreak', title: 'Najduži niz', icon: Flame, unit: 'streak', signedInOnly: true },
    { key: 'achievementCount', title: 'Najviše trofeja', icon: Trophy, unit: 'trophies', signedInOnly: true },
    { key: 'dayStreak', title: 'Najduži niz dana', icon: CalendarCheck, unit: 'days', signedInOnly: true },
];

const formatEntry = (board, entry) => {
    const categoryLabel = CATEGORY_META[entry.category]?.label || entry.category;
    switch (board.unit) {
        case 'score':
            return `${entry.name} — ${entry.score} bodova (${categoryLabel})`;
        case 'dailyScore':
            return `${entry.name} — ${entry.score} bodova`;
        case 'time':
            return `${entry.name} — ${(entry.elapsedMs / 1000).toFixed(1)}s (${categoryLabel})`;
        case 'level':
            return `${entry.displayName} — Razina ${entry.level}`;
        case 'streak':
            return `${entry.displayName} — ${entry.maxStreak}x niz`;
        case 'trophies':
            return `${entry.displayName} — ${entry.achievementCount} trofeja`;
        case 'days':
            return `${entry.displayName} — ${entry.dayStreak} dana zaredom`;
        default:
            return '';
    }
};

// Pure presentational - data is fetched once in App.jsx (not re-fetched every
// time this mounts) since getFastestPerfectRounds/getBestScoresAcrossCategories
// read every category's leaderboard; refetching on every lobby visit would be
// wasteful. `data` is null while that initial fetch is still in flight.
export default function RekordiBoards({ data, limitPerBoard = 10, compact = false }) {
    if (data === null) {
        return <p className="text-slate-400 text-sm text-center py-4">Učitavanje...</p>;
    }

    return (
        <div className={compact ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-4'}>
            {REKORDI_BOARDS.map((board) => {
                const entries = (data[board.key] || []).slice(0, limitPerBoard);
                const Icon = board.icon;
                return (
                    <div key={board.key} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                        <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                            <Icon className="w-4 h-4 text-amber-400" /> {board.title}
                        </h3>
                        {entries.length === 0 ? (
                            <p className="text-xs text-slate-500 italic">Još nema rezultata.</p>
                        ) : (
                            <ol className="text-xs text-slate-300 space-y-1">
                                {entries.map((entry, idx) => (
                                    // idx is always part of the key, not just a last-resort
                                    // fallback: getBestScoresAcrossCategories/
                                    // getFastestPerfectRounds merge separate per-category
                                    // queries, so the SAME uid can legitimately appear more
                                    // than once in one board's top N (e.g. a player's best
                                    // score in two different categories) - entry.id/entry.uid
                                    // alone isn't guaranteed unique within this list.
                                    <li key={`${entry.id || entry.uid || 'x'}-${idx}`} className="flex gap-2">
                                        <span className="text-amber-400 font-bold w-4 shrink-0">{idx + 1}.</span>
                                        <span className="truncate">{formatEntry(board, entry)}</span>
                                    </li>
                                ))}
                            </ol>
                        )}
                        {board.signedInOnly && (
                            <p className="text-xs text-slate-600 italic">Samo prijavljeni igrači.</p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
