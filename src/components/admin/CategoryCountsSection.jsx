import { useMemo } from 'react';
import { getAllCategories, getRawCategoryQuestions, getAllQuestions } from '../../data/questionsLoader';
import { CATEGORY_META } from '../../data/categoryMeta';
import AdminSection from './shared/AdminSection';

export default function CategoryCountsSection() {
    const categoryOptions = useMemo(() => getAllCategories(), []);

    // Counts reflect whatever's in the currently deployed bundle - after an
    // upload lands, these won't move until the site's next redeploy (~1-2
    // min), same as everywhere else questions come from static JSON.
    const categoryCounts = useMemo(() => {
        const counts = {};
        for (const key of categoryOptions) {
            counts[key] = getRawCategoryQuestions(key).length;
        }
        return counts;
    }, [categoryOptions]);
    const aggregateTotal = useMemo(() => getAllQuestions().length, []);

    return (
        <AdminSection icon="📊" title="Broj Pitanja po Kategoriji">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                            <th className="py-2 px-2">Kategorija</th>
                            <th className="py-2 px-2 text-right">Broj pitanja</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {categoryOptions.map((key) => (
                            <tr key={key}>
                                <td className="py-2 px-2 text-slate-200">
                                    {CATEGORY_META[key]?.label || key}
                                    {key === 'opca_znanje' && (
                                        <span className="text-slate-500 text-xs"> (vlastita pitanja)</span>
                                    )}
                                </td>
                                <td className="py-2 px-2 text-right text-amber-400 font-semibold">{categoryCounts[key]}</td>
                            </tr>
                        ))}
                        <tr>
                            <td className="py-2 px-2 text-slate-300 font-semibold">
                                Opće znanje - ukupno u fondu (sve kategorije)
                            </td>
                            <td className="py-2 px-2 text-right text-emerald-400 font-bold">{aggregateTotal}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p className="text-slate-600 text-xs italic mt-2">
                Opće znanje vuče pitanja iz svih kategorija (uključujući vlastita) - taj zbroj je prikazan posebno iznad.
            </p>
        </AdminSection>
    );
}
