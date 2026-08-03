import { useMemo } from 'react';
import { getAllCategories } from '../../../data/questionsLoader';
import { CATEGORY_META } from '../../../data/categoryMeta';

// The category dropdown used by the manage / upload / leaderboard sections.
// Owns the getAllCategories() lookup so the three call sites don't each keep
// their own copy of the list.
export default function CategorySelect({ value, onChange, label = 'Kategorija', className = '' }) {
    const categoryOptions = useMemo(() => getAllCategories(), []);

    return (
        <div className={className}>
            {label && <label className="block text-slate-300 text-xs mb-1">{label}</label>}
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
            >
                <option value="">-- Odaberite kategoriju --</option>
                {categoryOptions.map((key) => (
                    <option key={key} value={key}>{CATEGORY_META[key]?.label || key}</option>
                ))}
            </select>
        </div>
    );
}
