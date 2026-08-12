import { useEffect, useMemo, useState } from 'react';
import { getAllQuestionAttempts, getAllGameResults } from '../../services/firebase';
import { summarizeQuestionAccuracy, summarizeCategoryPopularity } from '../../utils/gameplayInsights';
import { getAllCategoryPacks } from '../../data/questionsLoader';
import { CATEGORY_META } from '../../data/categoryMeta';

export default function AdminOverview() {
    const [attempts, setAttempts] = useState([]);
    const [results, setResults] = useState([]);
    const [questionText, setQuestionText] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const [a, r, packs] = await Promise.all([getAllQuestionAttempts(), getAllGameResults(), getAllCategoryPacks()]);
            if (cancelled) return;
            setAttempts(a);
            setResults(r);
            // id -> question text, built from the raw per-category packs
            // (not getAllQuestions(), which dedupes by normalized text and
            // could drop an id if another category's question happens to
            // read identically).
            const map = {};
            for (const pack of Object.values(packs)) {
                for (const q of pack) {
                    map[q.id] = q.question;
                }
            }
            setQuestionText(map);
            setLoading(false);
        })();
        return () => { cancelled = true; };
    }, []);

    const accuracy = useMemo(() => summarizeQuestionAccuracy(attempts, questionText), [attempts, questionText]);
    const popularity = useMemo(() => summarizeCategoryPopularity(results), [results]);

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
