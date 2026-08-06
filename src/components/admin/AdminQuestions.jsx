import { useEffect, useMemo, useState } from 'react';
import { auth } from '../../services/firebase';
import { getAllCategories, getRawCategoryQuestions, getAllQuestions } from '../../data/questionsLoader';
import { CATEGORY_META } from '../../data/categoryMeta';
import { validateQuestions, detectCategory, mergeQuestions } from '../../utils/questionMerge';

const EMPTY_QUESTION_FORM = { question: '', correct_answer: '', incorrect_answers: ['', '', ''] };

// initialFilter/onFilterConsumed: deep-link from the Reports queue (see
// AdminPanel.jsx shell) - {categoryId, questionId} to land straight on the
// reported question, pre-filtered and ready to edit/delete.
export default function AdminQuestions({ initialFilter, onFilterConsumed } = {}) {
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

    // --- Question upload ---
    const [uploadFileName, setUploadFileName] = useState('');
    const [parsedEntries, setParsedEntries] = useState(null); // raw parsed JSON array
    const [parseError, setParseError] = useState('');
    const [validationErrors, setValidationErrors] = useState([]);
    const [validEntries, setValidEntries] = useState([]);
    const [uploadCategory, setUploadCategory] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [uploadError, setUploadError] = useState('');

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadResult(null);
        setUploadError('');
        setUploadFileName(file.name);

        const reader = new FileReader();
        reader.onload = () => {
            let raw;
            try {
                raw = JSON.parse(reader.result);
            } catch {
                setParseError('Datoteka nije valjan JSON.');
                setParsedEntries(null);
                setValidEntries([]);
                setValidationErrors([]);
                return;
            }
            setParseError('');
            setParsedEntries(raw);

            const { valid, errors } = validateQuestions(raw);
            setValidEntries(valid);
            setValidationErrors(errors);

            const detected = detectCategory(valid, file.name);
            setUploadCategory(detected || '');
        };
        reader.readAsText(file);
    };

    // Client-side preview only - the browser compares against its bundled
    // pack, which can lag the repo if an earlier upload already landed.
    // The server re-validates and re-merges against the live GitHub file,
    // so its response (uploadResult) is the authoritative outcome.
    const mergePreview = useMemo(() => {
        if (!uploadCategory || validEntries.length === 0) return null;
        const existing = getRawCategoryQuestions(uploadCategory);
        const { added, skipped } = mergeQuestions(existing, validEntries, uploadCategory);
        return { existingCount: existing.length, added, skipped };
    }, [uploadCategory, validEntries]);

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (isUploading || !uploadCategory || !parsedEntries) return;
        setIsUploading(true);
        setUploadResult(null);
        setUploadError('');

        try {
            const idToken = await auth.currentUser.getIdToken();
            const res = await fetch('/api/questions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ category: uploadCategory, questions: parsedEntries }),
            });
            const data = await res.json();
            if (!res.ok) {
                setUploadError(data.error || 'Slanje nije uspjelo.');
            } else {
                setUploadResult(data);
            }
        } catch {
            setUploadError('Greška u mreži prilikom slanja.');
        } finally {
            setIsUploading(false);
        }
    };

    // --- Manage (search/edit/delete) individual questions ---
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

    useEffect(() => {
        if (!initialFilter) return;
        (() => {
            setManageCategory(initialFilter.categoryId);
            setManageSearch(initialFilter.questionId);
            onFilterConsumed?.();
        })();
    }, [initialFilter, onFilterConsumed]);

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
        <div className="space-y-8">
            {/* BROJ PITANJA PO KATEGORIJI */}
            <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-amber-400 mb-4 flex items-center gap-2">
                    <span>📊</span> Broj Pitanja po Kategoriji
                </h2>
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
            </div>

            {/* UPRAVLJAJ PITANJIMA */}
            <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6">
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

            {/* UPLOAD PITANJA */}
            <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-amber-400 mb-1 flex items-center gap-2">
                    <span>📥</span> Dodaj Pitanja
                </h2>
                <p className="text-slate-400 text-sm mb-4">
                    Učitajte .json datoteku s pitanjima. Nova pitanja se dodaju uz postojeća - ništa se ne briše, a duplikati (isti tekst pitanja) se preskaču.
                </p>

                <form onSubmit={handleUploadSubmit} className="space-y-4">
                    <div>
                        <input
                            type="file"
                            accept=".json,application/json"
                            onChange={handleFileSelect}
                            className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-800 file:text-slate-200 file:text-sm hover:file:bg-slate-700"
                        />
                        {uploadFileName && (
                            <p className="text-xs text-slate-500 mt-1">Odabrano: {uploadFileName}</p>
                        )}
                    </div>

                    {parseError && (
                        <p className="text-red-400 text-sm">{parseError}</p>
                    )}

                    {parsedEntries && !parseError && (
                        <>
                            <div>
                                <label className="block text-slate-300 text-xs mb-1">Kategorija</label>
                                <select
                                    value={uploadCategory}
                                    onChange={(e) => setUploadCategory(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                                >
                                    <option value="">-- Odaberite kategoriju --</option>
                                    {categoryOptions.map((key) => (
                                        <option key={key} value={key}>
                                            {CATEGORY_META[key]?.label || key}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 space-y-1">
                                <p>Ispravnih pitanja: <span className="text-emerald-400 font-semibold">{validEntries.length}</span> / {Array.isArray(parsedEntries) ? parsedEntries.length : 0}</p>
                                {validationErrors.length > 0 && (
                                    <div className="text-rose-400">
                                        <p>{validationErrors.length} neispravnih:</p>
                                        <ul className="list-disc list-inside">
                                            {validationErrors.slice(0, 5).map((e, i) => (
                                                <li key={i}>#{e.index}: {e.reason}</li>
                                            ))}
                                        </ul>
                                        {validationErrors.length > 5 && <p>... i još {validationErrors.length - 5}</p>}
                                    </div>
                                )}
                                {mergePreview && (
                                    <p className="text-slate-400">
                                        Pregled (procjena): {mergePreview.existingCount} postojećih → {' '}
                                        <span className="text-emerald-400 font-semibold">+{mergePreview.added} novih</span>,{' '}
                                        <span className="text-slate-500">{mergePreview.skipped} preskočeno (duplikat)</span>
                                    </p>
                                )}
                                <p className="text-slate-600 italic">Ovo je procjena u pregledniku - konačan rezultat vraća poslužitelj.</p>
                            </div>

                            <button
                                type="submit"
                                disabled={isUploading || !uploadCategory || validEntries.length === 0}
                                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold px-4 py-2 rounded-lg text-sm"
                            >
                                {isUploading ? 'Slanje...' : 'Pošalji i spremi na GitHub'}
                            </button>
                        </>
                    )}

                    {uploadError && (
                        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">{uploadError}</p>
                    )}

                    {uploadResult && (
                        <div className="text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 space-y-1">
                            <p>Dodano: {uploadResult.added}, preskočeno: {uploadResult.skipped}, ukupno u kategoriji: {uploadResult.total}.</p>
                            {uploadResult.commitUrl && (
                                <p>
                                    <a href={uploadResult.commitUrl} target="_blank" rel="noreferrer" className="underline">
                                        Pogledaj commit na GitHubu
                                    </a>
                                    {' '}- stranica će se ponovno objaviti za ~1-2 minute.
                                </p>
                            )}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
