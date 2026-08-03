import { useState, useMemo } from 'react';
import { auth } from '../../services/firebase';
import { getAllCategories, getRawCategoryQuestions } from '../../data/questionsLoader';
import { CATEGORY_META } from '../../data/categoryMeta';

const EMPTY_QUESTION_FORM = { question: '', correct_answer: '', incorrect_answers: ['', '', ''] };

export default function ManageQuestionsSection() {
    const categoryOptions = useMemo(() => getAllCategories(), []);

    const [manageCategory, setManageCategory] = useState('');
    const [manageSearch, setManageSearch] = useState('');
    // ids removed/edited this session but not yet reflected in the bundled
    // JSON (that only updates on the next redeploy) - applied on top of
    // getRawCategoryQuestions() so the list doesn't show stale rows/text.
    const [manageDeletedIds, setManageDeletedIds] = useState(() => new Set());
    const [manageEdits, setManageEdits] = useState({});
    const [manageEditingId, setManageEditingId] = useState(null);
    const [manageEditForm, setManageEditForm] = useState(EMPTY_QUESTION_FORM);
    const [isManageBusy, setIsManageBusy] = useState(false);
    const [manageMessage, setManageMessage] = useState(null); // { type: 'success'|'error', text, commitUrl? }

    const handleManageCategoryChange = (key) => {
        setManageCategory(key);
        setManageSearch('');
        setManageEditingId(null);
        setManageMessage(null);
    };

    const manageMatches = useMemo(() => {
        if (!manageCategory) return [];
        const pool = getRawCategoryQuestions(manageCategory).filter((q) => !manageDeletedIds.has(q.id));
        const term = manageSearch.trim().toLowerCase();
        if (!term) return pool;
        return pool.filter((q) => q.id.toLowerCase().includes(term) || q.question.toLowerCase().includes(term));
    }, [manageCategory, manageSearch, manageDeletedIds]);

    const manageVisible = manageMatches.slice(0, 50);

    const withManageEdit = (q) => (manageEdits[q.id] ? { ...q, ...manageEdits[q.id] } : q);

    const openManageEdit = (q) => {
        const current = withManageEdit(q);
        setManageEditingId(q.id);
        setManageEditForm({
            question: current.question,
            correct_answer: current.correct_answer,
            incorrect_answers: [...current.incorrect_answers],
        });
        setManageMessage(null);
    };

    const setManageIncorrectAnswer = (idx, value) => {
        setManageEditForm((prev) => {
            const next = [...prev.incorrect_answers];
            next[idx] = value;
            return { ...prev, incorrect_answers: next };
        });
    };

    const handleManageDelete = async (q) => {
        if (isManageBusy) return;
        if (!window.confirm(`Jeste li sigurni da želite izbrisati pitanje "${q.question}"?`)) return;

        setIsManageBusy(true);
        setManageMessage(null);
        try {
            const idToken = await auth.currentUser.getIdToken();
            const res = await fetch('/api/questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ action: 'delete', category: manageCategory, id: q.id }),
            });
            const data = await res.json();
            if (!res.ok) {
                setManageMessage({ type: 'error', text: data.error || 'Brisanje nije uspjelo.' });
            } else {
                setManageDeletedIds((prev) => new Set(prev).add(q.id));
                setManageMessage({ type: 'success', text: `Pitanje ${q.id} obrisano.`, commitUrl: data.commitUrl });
            }
        } catch {
            setManageMessage({ type: 'error', text: 'Greška u mreži prilikom brisanja.' });
        } finally {
            setIsManageBusy(false);
        }
    };

    const handleManageEditSubmit = async (e) => {
        e.preventDefault();
        if (isManageBusy || !manageEditingId) return;

        setIsManageBusy(true);
        setManageMessage(null);
        try {
            const idToken = await auth.currentUser.getIdToken();
            const res = await fetch('/api/questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ action: 'edit', category: manageCategory, id: manageEditingId, question: manageEditForm }),
            });
            const data = await res.json();
            if (!res.ok) {
                setManageMessage({ type: 'error', text: data.error || 'Uređivanje nije uspjelo.' });
            } else {
                setManageEdits((prev) => ({ ...prev, [manageEditingId]: manageEditForm }));
                setManageMessage({ type: 'success', text: `Pitanje ${manageEditingId} uređeno.`, commitUrl: data.commitUrl });
                setManageEditingId(null);
            }
        } catch {
            setManageMessage({ type: 'error', text: 'Greška u mreži prilikom uređivanja.' });
        } finally {
            setIsManageBusy(false);
        }
    };

    return (
        <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-amber-400 mb-1 flex items-center gap-2">
                <span>🔍</span> Upravljaj Pitanjima
            </h2>
            <p className="text-slate-400 text-sm mb-4">
                Pronađite pitanje po kategoriji i tekstu/ID-u, pa ga uredite ili obrišite.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                    <label className="block text-slate-300 text-xs mb-1">Kategorija</label>
                    <select
                        value={manageCategory}
                        onChange={(e) => handleManageCategoryChange(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                    >
                        <option value="">-- Odaberite kategoriju --</option>
                        {categoryOptions.map((key) => (
                            <option key={key} value={key}>{CATEGORY_META[key]?.label || key}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-slate-300 text-xs mb-1">Pretraga (tekst ili ID)</label>
                    <input
                        type="text"
                        value={manageSearch}
                        onChange={(e) => setManageSearch(e.target.value)}
                        disabled={!manageCategory}
                        placeholder="npr. Hajduk ili hr_sport_142"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm disabled:opacity-40"
                    />
                </div>
            </div>

            {manageMessage && (
                <div className={`text-sm rounded-lg p-3 mb-4 space-y-1 ${manageMessage.type === 'success' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-red-400 bg-red-500/10 border border-red-500/30'}`}>
                    <p>{manageMessage.text}</p>
                    {manageMessage.commitUrl && (
                        <p>
                            <a href={manageMessage.commitUrl} target="_blank" rel="noreferrer" className="underline">
                                Pogledaj commit na GitHubu
                            </a>
                            {' '}- stranica će se ponovno objaviti za ~1-2 minute.
                        </p>
                    )}
                </div>
            )}

            {manageCategory && (
                <>
                    <p className="text-xs text-slate-500 mb-2">
                        {manageMatches.length === 0
                            ? 'Nema rezultata.'
                            : manageMatches.length > manageVisible.length
                                ? `Prikazano prvih ${manageVisible.length} od ${manageMatches.length} rezultata.`
                                : `${manageMatches.length} rezultata.`}
                    </p>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {manageVisible.map((q) => {
                            const display = withManageEdit(q);
                            const isEditingRow = manageEditingId === q.id;
                            return (
                                <div key={q.id} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-slate-500 text-xs font-mono shrink-0">{q.id}</span>
                                        <span className="text-slate-200 text-sm truncate flex-1" title={display.question}>
                                            {display.question}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => (isEditingRow ? setManageEditingId(null) : openManageEdit(q))}
                                            disabled={isManageBusy}
                                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-md text-xs font-medium disabled:opacity-40 shrink-0"
                                        >
                                            {isEditingRow ? 'Odustani' : 'Uredi'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleManageDelete(q)}
                                            disabled={isManageBusy}
                                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-md text-xs font-medium disabled:opacity-40 shrink-0"
                                        >
                                            Obriši
                                        </button>
                                    </div>

                                    {isEditingRow && (
                                        <form onSubmit={handleManageEditSubmit} className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                                            <div>
                                                <label className="block text-slate-400 text-xs mb-1">Pitanje</label>
                                                <input
                                                    type="text"
                                                    value={manageEditForm.question}
                                                    onChange={(e) => setManageEditForm((prev) => ({ ...prev, question: e.target.value }))}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-emerald-400 text-xs mb-1">Točan odgovor</label>
                                                <input
                                                    type="text"
                                                    value={manageEditForm.correct_answer}
                                                    onChange={(e) => setManageEditForm((prev) => ({ ...prev, correct_answer: e.target.value }))}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm"
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                {manageEditForm.incorrect_answers.map((ans, idx) => (
                                                    <div key={idx}>
                                                        <label className="block text-slate-500 text-xs mb-1">Netočan {idx + 1}</label>
                                                        <input
                                                            type="text"
                                                            value={ans}
                                                            onChange={(e) => setManageIncorrectAnswer(idx, e.target.value)}
                                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex justify-end gap-2 pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setManageEditingId(null)}
                                                    disabled={isManageBusy}
                                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg font-medium disabled:opacity-40"
                                                >
                                                    Odustani
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={isManageBusy}
                                                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs rounded-lg font-bold disabled:opacity-40"
                                                >
                                                    {isManageBusy ? 'Spremanje...' : 'Spremi'}
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
