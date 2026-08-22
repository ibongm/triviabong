import { useEffect, useState } from 'react';
import { getWorstQuestionStats, getAllCategoryStats, recomputeContentInsightStats } from '../../services/firebase';
import { summarizeQuestionAccuracyFromStats, summarizeCategoryPopularityFromStats } from '../../utils/gameplayInsights';
import { getAllCategoryPacks } from '../../data/questionsLoader';
import { CATEGORY_META } from '../../data/categoryMeta';
import { getCachedAdminData, setCachedAdminData, clearCachedAdminData } from '../../utils/adminDataCache';
import { loadCachedAdminSection, saveCachedAdminSection, clearCachedAdminSection } from '../../utils/adminSectionCache';

const CACHE_KEY = 'overview';

export default function AdminOverview() {
    const cached = getCachedAdminData(CACHE_KEY);
    // Read (and, on a hit, mirror into the in-memory cache) synchronously
    // during render rather than in the effect below, so a cache hit never
    // needs a setState call inside the effect - see that effect's comment.
    const localCached = !cached ? loadCachedAdminSection(CACHE_KEY) : null;
    if (localCached && !cached) setCachedAdminData(CACHE_KEY, localCached);
    const initialData = cached ?? localCached;
    const [popularity, setPopularity] = useState(initialData?.popularity ?? []);
    const [accuracy, setAccuracy] = useState(initialData?.accuracy ?? []);
    const [loading, setLoading] = useState(!initialData);

    // Computes the summarized (bounded) accuracy/popularity from the raw
    // fetch, stores it in both caches, and updates state - kept separate
    // from fetchData so a localStorage cache hit can populate state without
    // ever calling Firestore.
    const computeAndStore = (questionStats, categoryStats, packs) => {
        // id -> question text, built from the raw per-category packs (not
        // getAllQuestions(), which dedupes by normalized text and could drop
        // an id if another category's question happens to read identically).
        const map = {};
        for (const pack of Object.values(packs)) {
            for (const q of pack) {
                map[q.id] = q.question;
            }
        }
        const acc = summarizeQuestionAccuracyFromStats(questionStats, map);
        const pop = summarizeCategoryPopularityFromStats(categoryStats);
        setAccuracy(acc);
        setPopularity(pop);
        setLoading(false);
        setCachedAdminData(CACHE_KEY, { popularity: pop, accuracy: acc });
        saveCachedAdminSection(CACHE_KEY, { popularity: pop, accuracy: acc });
    };

    const fetchData = async (cancelledRef) => {
        const [a, r, packs] = await Promise.all([getWorstQuestionStats(), getAllCategoryStats(), getAllCategoryPacks()]);
        if (cancelledRef?.current) return;
        computeAndStore(a, r, packs);
    };

    useEffect(() => {
        // Skip the fetch entirely if this section was already loaded once
        // this admin session (in-memory cache) or within the last 15 minutes
        // on this device (localStorage cache) - both already seeded this
        // component's initial state above, so there's nothing left to do
        // here. AdminPanel unmounts/remounts sections on every tab switch, so
        // without these two caches every revisit - a tab switch or a full page
        // reload - would re-read from scratch.
        // These read the maintained counters, not the unbounded
        // questionAttempts/gameResults scans that drove the ~46k spike in
        // CHANGELOG.md's 2026-08-20 entry and the 6,474 one on 2026-08-22:
        // a fixed ~100 worst questions (see getWorstQuestionStats) plus 8
        // category docs, regardless of how much the game is played. The
        // caches therefore now save a small, fixed cost rather than being the
        // only thing between an admin refresh and the daily quota.
        if (initialData) return;
        const cancelledRef = { current: false };
        fetchData(cancelledRef);
        return () => { cancelledRef.current = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only, mirroring the pre-existing effect this replaces
    }, []);

    const handleRefresh = () => {
        // Clear BOTH caches, not just the in-memory one - fetchData() does
        // overwrite both on success, but if it throws (offline, rules error)
        // a stale persisted entry would otherwise survive the refresh the
        // admin just asked for.
        clearCachedAdminData(CACHE_KEY);
        clearCachedAdminSection(CACHE_KEY);
        setLoading(true);
        fetchData();
    };

    // Rebuild the maintained counters from the raw questionAttempts/gameResults
    // collections. Deliberately manual and confirm-gated: it runs exactly the
    // unbounded scans this whole change exists to keep off the read path, so
    // it's for backfilling history that predates the counters, or correcting
    // drift - never routine. Mirrors handleRecomputeRekordiSummary in
    // AdminLeaderboardsProfiles, including that window.confirm blocks the page
    // (and any attached browser-automation session) until dismissed by hand.
    const [rebuildBusy, setRebuildBusy] = useState(false);
    const [rebuildMessage, setRebuildMessage] = useState(null);

    const handleRebuildStats = async () => {
        if (rebuildBusy) return;
        if (!window.confirm('Ponovno izgraditi statistiku pitanja i kategorija skeniranjem svih zabilježenih pokušaja i partija? Ovo je skupa operacija - koristite je samo za prvo popunjavanje ili ako brojači odstupaju.')) return;

        setRebuildBusy(true);
        setRebuildMessage(null);
        try {
            const { questions, categories } = await recomputeContentInsightStats();
            clearCachedAdminData(CACHE_KEY);
            clearCachedAdminSection(CACHE_KEY);
            setLoading(true);
            await fetchData();
            setRebuildMessage({ type: 'success', text: `Statistika obnovljena (${questions} pitanja, ${categories} kategorija).` });
        } catch (err) {
            console.error('Greška pri obnovi statistike:', err);
            setRebuildMessage({ type: 'error', text: 'Obnova nije uspjela.' });
        } finally {
            setRebuildBusy(false);
        }
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
            <div className="flex justify-end gap-2">
                <button
                    type="button"
                    onClick={handleRebuildStats}
                    disabled={rebuildBusy}
                    title="Ponovno izgradi brojače statistike skeniranjem svih zabilježenih pokušaja i partija (skupo - samo za popunjavanje ili ispravak odstupanja)"
                    className="text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/50 rounded-lg px-3 py-1.5 disabled:opacity-40"
                >
                    {rebuildBusy ? 'Obnavljanje...' : 'Rekonstruiraj statistiku'}
                </button>
                <button
                    type="button"
                    onClick={handleRefresh}
                    className="text-xs text-slate-400 hover:text-amber-400 border border-slate-800 hover:border-amber-500/40 rounded-lg px-3 py-1.5"
                >
                    🔄 Osvježi
                </button>
            </div>
            {rebuildMessage && (
                <div className={`text-sm rounded-lg p-3 ${rebuildMessage.type === 'success' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-red-400 bg-red-500/10 border border-red-500/30'}`}>
                    {rebuildMessage.text}
                </div>
            )}
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
