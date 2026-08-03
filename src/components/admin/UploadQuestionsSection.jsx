import { useState, useMemo } from 'react';
import { auth } from '../../services/firebase';
import { getAllCategories, getRawCategoryQuestions } from '../../data/questionsLoader';
import { CATEGORY_META } from '../../data/categoryMeta';
import { validateQuestions, detectCategory, mergeQuestions } from '../../utils/questionMerge';

export default function UploadQuestionsSection() {
    const categoryOptions = useMemo(() => getAllCategories(), []);

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

    return (
        <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6 mb-8">
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
    );
}
