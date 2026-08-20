import { useEffect, useState } from 'react';
import { getAllQuestionAttempts, getAllGameResults } from '../../services/firebase';
import { summarizeQuestionAccuracy, summarizeCategoryPopularity } from '../../utils/gameplayInsights';
import { getAllCategoryPacks } from '../../data/questionsLoader';
import { CATEGORY_META } from '../../data/categoryMeta';
import { getCachedAdminData, setCachedAdminData, clearCachedAdminData } from '../../utils/adminDataCache';
import { loadCachedAdminOverview, saveCachedAdminOverview } from '../../utils/adminOverviewCache';

const CACHE_KEY = 'overview';

export default function AdminOverview() {
    const cached = getCachedAdminData(CACHE_KEY);
    // Read (and, on a hit, mirror into the in-memory cache) synchronously
    // during render rather than in the effect below, so a cache hit never
    // needs a setState call inside the effect - see that effect's comment.
    const localCached = !cached ? loadCachedAdminOverview() : null;
    if (localCached && !cached) setCachedAdminData(CACHE_KEY, localCached);
    const initialData = cached ?? localCached;
    const [popularity, setPopularity] = useState(initialData?.popularity ?? []);
    const [accuracy, setAccuracy] = useState(initialData?.accuracy ?? []);
    const [loading, setLoading] = useState(!initialData);

    // Computes the summarized (bounded) accuracy/popularity from the raw
    // fetch, stores it in both caches, and updates state - kept separate
    // from fetchData so a localStorage cache hit can populate state without
    // ever calling Firestore.
    const computeAndStore = (attempts, results, packs) => {
        // id -> question text, built from the raw per-category packs (not
        // getAllQuestions(), which dedupes by normalized text and could drop
        // an id if another category's question happens to read identically).
        const map = {};
        for (const pack of Object.values(packs)) {
            for (const q of pack) {
                map[q.id] = q.question;
            }
        }
        const acc = summarizeQuestionAccuracy(attempts, map);
        const pop = summarizeCategoryPopularity(results);
        setAccuracy(acc);
        setPopularity(pop);
        setLoading(false);
        setCachedAdminData(CACHE_KEY, { popularity: pop, accuracy: acc });
        saveCachedAdminOverview({ popularity: pop, accuracy: acc });
    };

    const fetchData = async (cancelledRef) => {
        const [a, r, packs] = await Promise.all([getAllQuestionAttempts(), getAllGameResults(), getAllCategoryPacks()]);
        if (cancelledRef?.current) return;
        computeAndStore(a, r, packs);
    };

    useEffect(() => {
        // Skip the fetch entirely if this section was already loaded once
        // this admin session (in-memory cache) or within the last 15 minutes
        // on this device (localStorage cache) - both already seeded this
        // component's initial state above, so there's nothing left to do
        // here. AdminPanel unmounts/remounts sections on every tab switch,
        // and questionAttempts/gameResults are unbounded, ever-growing
        // collections (one doc per question answered / game played, across
        // all players), so without these two caches every revisit - whether
        // a tab switch or a full page reload - would re-scan both
        // collections from scratch. A single debugging session with a
        // handful of page reloads drove a ~46k read spike this way; see
        // CHANGELOG.md's 2026-08-20 admin-overview entry.
        if (initialData) return;
        const cancelledRef = { current: false };
        fetchData(cancelledRef);
        return () => { cancelledRef.current = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only, mirroring the pre-existing effect this replaces
    }, []);

    const handleRefresh = () => {
        clearCachedAdminData(CACHE_KEY);
        setLoading(true);
        fetchData();
    };

    const categoryLabel = (key) => CATEGORY_META[key]?.label || key;

    if (loading) {
        return (
            <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6">
                <p className="text-slate-400 text-sm">Učitavanje...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleRefresh}
                    className="text-xs text-slate-400 hover:text-amber-400 border border-slate-800 hover:border-amber-500/40 rounded-lg px-3 py-1.5"
                >
                    🔄 Osvježi
                </button>
            </div>
            {/* Category popularity */}
            <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-amber-400 mb-1 flex items-center gap-2">
                    <span>📈</span> Popularnost Kategorija
                </h2>
                <p className="text-slate-400 text-sm mb-4">
                    Koje kategorije igrači najčešće biraju, s prosječnim bodovima i postotkom pobjeda po kategoriji.
                </p>
                {popularity.length === 0 ? (
                    <p className="text-slate-500 text-sm">Još nema odigranih partija.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-slate-800 text-slate-400">
                                    <th className="py-2 px-2">Kategorija</th>
                                    <th className="py-2 px-2 text-right">Partije</th>
                                    <th className="py-2 px-2 text-right">Prosj. bodovi</th>
                                    <th className="py-2 px-2 text-right">Postotak pobjeda</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {popularity.map((p) => (
                                    <tr key={p.category}>
                                        <td className="py-2 px-2 text-slate-200">{categoryLabel(p.category)}</td>
                                        <td className="py-2 px-2 text-right text-amber-400 font-semibold">{p.plays}</td>
                                        <td className="py-2 px-2 text-right text-slate-300">{p.avgScore}</td>
                                        <td className="py-2 px-2 text-right text-emerald-400">{Math.round(p.winRate * 100)}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Question accuracy */}
            <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-amber-400 mb-1 flex items-center gap-2">
                    <span>🎯</span> Preciznost Pitanja
                </h2>
                <p className="text-slate-400 text-sm mb-4">
                    Pitanja na koja igrači najčešće odgovaraju netočno (najlošija prva) - visok postotak netočnih može značiti da je pitanje preteško ili loše formulirano.
                </p>
                {accuracy.length === 0 ? (
                    <p className="text-slate-500 text-sm">Još nema zabilježenih pokušaja.</p>
                ) : (
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-slate-800 text-slate-400">
                                    <th className="py-2 px-2">Pitanje</th>
                                    <th className="py-2 px-2">Kategorija</th>
                                    <th className="py-2 px-2 text-right">Pokušaji</th>
                                    <th className="py-2 px-2 text-right">Točno</th>
                                    <th className="py-2 px-2 text-right">Postotak</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {accuracy.map((q) => (
                                    <tr key={q.questionId}>
                                        <td className="py-2 px-2 text-slate-200 max-w-xs truncate" title={q.question}>{q.question}</td>
                                        <td className="py-2 px-2 text-slate-400 text-xs">{categoryLabel(q.categoryId)}</td>
                                        <td className="py-2 px-2 text-right text-slate-300">{q.totalAttempts}</td>
                                        <td className="py-2 px-2 text-right text-slate-300">{q.correctCount}</td>
                                        <td className={`py-2 px-2 text-right font-semibold ${q.accuracy < 0.5 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                            {Math.round(q.accuracy * 100)}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
