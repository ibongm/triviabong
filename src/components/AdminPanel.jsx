import React, { useState, useEffect, useMemo } from 'react';
import {
    getAllRegisteredUsers,
    updateUserInFirestore,
    deleteUserFromFirestore,
    getAllScoresForCategory,
    deleteScoreFromFirestore,
    clearLeaderboardForCategory,
    getAllPublicProfiles,
    deletePublicProfile,
    clearAllPublicProfiles,
    backfillPublicProfiles,
    auth
} from '../services/firebase';
import { getAllCategories, getRawCategoryQuestions, getAllQuestions } from '../data/questionsLoader';
import { CATEGORY_META } from '../data/categoryMeta';
import { validateQuestions, detectCategory, mergeQuestions } from '../utils/questionMerge';

const EMPTY_QUESTION_FORM = { question: '', correct_answer: '', incorrect_answers: ['', '', ''] };

export default function AdminPanel({ onClose }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [usersMessage, setUsersMessage] = useState(null);
    const [editingUser, setEditingUser] = useState(null);
    const [formError, setFormError] = useState('');

    // Form state for editing selected user profile
    const [formData, setFormData] = useState({
        displayName: '',
        level: 1,
        xp: 0,
        coins: 0,
        role: 'player'
    });

    const fetchUsers = async () => {
        setLoading(true);
        const userList = await getAllRegisteredUsers();
        setUsers(userList);
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

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

    const handleEditClick = (user) => {
        setEditingUser(user);
        setFormError('');
        setFormData({
            displayName: user.displayName || '',
            level: user.level || 1,
            xp: user.xp || 0,
            coins: user.coins || 0,
            role: user.role || 'player'
        });
    };

    const handleCloseEdit = () => {
        setEditingUser(null);
        setFormError('');
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        if (!editingUser) return;

        const level = Number(formData.level);
        const xp = Number(formData.xp);
        const coins = Number(formData.coins);

        if (!Number.isFinite(level) || !Number.isFinite(xp) || !Number.isFinite(coins)) {
            setFormError('Razina, XP i novčići moraju biti brojevi.');
            return;
        }
        if (level < 1 || xp < 0 || coins < 0) {
            setFormError('Razina mora biti najmanje 1, a XP i novčići ne mogu biti negativni.');
            return;
        }

        setFormError('');
        try {
            await updateUserInFirestore(editingUser.uid, {
                displayName: formData.displayName,
                level: Math.floor(level),
                xp: Math.floor(xp),
                coins: Math.floor(coins),
                role: formData.role
            });

            setEditingUser(null);
            await fetchUsers();
        } catch (err) {
            console.error("Greška pri spremanju korisnika:", err);
            setFormError("Ažuriranje nije uspjelo. Pokušajte ponovno.");
        }
    };

    const handleDeleteUser = async (uid) => {
        if (!window.confirm("Jeste li sigurni da želite izbrisati ovog igrača?")) return;

        setUsersMessage(null);
        try {
            await deleteUserFromFirestore(uid);
            await fetchUsers();
        } catch (err) {
            console.error('Greška pri brisanju korisnika:', err);
            setUsersMessage({ type: 'error', text: 'Brisanje korisnika nije uspjelo.' });
        }
    };

    // --- Manage leaderboards ---
    const [lbCategory, setLbCategory] = useState('');
    const [lbScores, setLbScores] = useState([]);
    const [lbLoading, setLbLoading] = useState(false);
    const [lbBusy, setLbBusy] = useState(false);
    const [lbMessage, setLbMessage] = useState(null);

    const loadLeaderboard = async (key) => {
        setLbCategory(key);
        setLbMessage(null);
        setLbScores([]);
        if (!key) return;
        setLbLoading(true);
        const scores = await getAllScoresForCategory(key);
        setLbScores(scores);
        setLbLoading(false);
    };

    const handleDeleteScore = async (score) => {
        if (lbBusy) return;
        if (!window.confirm(`Izbrisati rezultat "${score.name}" (${score.score} bodova)?`)) return;

        setLbBusy(true);
        setLbMessage(null);
        try {
            await deleteScoreFromFirestore(lbCategory, score.id);
            setLbScores(prev => prev.filter(s => s.id !== score.id));
            setLbMessage({ type: 'success', text: 'Rezultat obrisan.' });
        } catch (err) {
            console.error('Greška pri brisanju rezultata:', err);
            setLbMessage({ type: 'error', text: 'Brisanje nije uspjelo.' });
        } finally {
            setLbBusy(false);
        }
    };

    const handleClearLeaderboard = async () => {
        if (lbBusy || !lbCategory) return;
        const label = CATEGORY_META[lbCategory]?.label || lbCategory;
        if (!window.confirm(`Jeste li sigurni da želite izbrisati CIJELU ljestvicu za "${label}"? Ovo se ne može poništiti.`)) return;

        setLbBusy(true);
        setLbMessage(null);
        try {
            const count = await clearLeaderboardForCategory(lbCategory);
            setLbScores([]);
            setLbMessage({ type: 'success', text: `Izbrisano ${count} rezultata.` });
        } catch (err) {
            console.error('Greška pri brisanju ljestvice:', err);
            setLbMessage({ type: 'error', text: 'Brisanje nije uspjelo.' });
        } finally {
            setLbBusy(false);
        }
    };

    // --- Manage public profiles (Rekordi ranking boards) ---
    const [ppProfiles, setPpProfiles] = useState([]);
    const [ppLoading, setPpLoading] = useState(true);
    const [ppBusy, setPpBusy] = useState(false);
    const [ppMessage, setPpMessage] = useState(null);

    const loadPublicProfiles = async () => {
        setPpLoading(true);
        const profiles = await getAllPublicProfiles();
        setPpProfiles(profiles);
        setPpLoading(false);
    };

    useEffect(() => {
        (async () => {
            await loadPublicProfiles();
        })();
    }, []);

    const handleDeletePublicProfile = async (profile) => {
        if (ppBusy) return;
        if (!window.confirm(`Izbrisati javni profil za "${profile.displayName}"? Ovo ga uklanja sa svih Rekordi ljestvica (ne briše njegov račun).`)) return;

        setPpBusy(true);
        setPpMessage(null);
        try {
            await deletePublicProfile(profile.uid);
            setPpProfiles(prev => prev.filter(p => p.uid !== profile.uid));
            setPpMessage({ type: 'success', text: 'Profil obrisan.' });
        } catch (err) {
            console.error('Greška pri brisanju javnog profila:', err);
            setPpMessage({ type: 'error', text: 'Brisanje nije uspjelo.' });
        } finally {
            setPpBusy(false);
        }
    };

    const handleClearAllPublicProfiles = async () => {
        if (ppBusy) return;
        if (!window.confirm('Jeste li sigurni da želite izbrisati SVE javne profile sa svih Rekordi ljestvica? Ovo se ne može poništiti.')) return;

        setPpBusy(true);
        setPpMessage(null);
        try {
            const count = await clearAllPublicProfiles();
            setPpProfiles([]);
            setPpMessage({ type: 'success', text: `Izbrisano ${count} profila.` });
        } catch (err) {
            console.error('Greška pri brisanju svih javnih profila:', err);
            setPpMessage({ type: 'error', text: 'Brisanje nije uspjelo.' });
        } finally {
            setPpBusy(false);
        }
    };

    const handleBackfillPublicProfiles = async () => {
        if (ppBusy) return;
        if (!window.confirm('Popuniti javne profile za sve registrirane igrače na temelju njihovih trenutnih podataka? Ovo neće obrisati ništa, samo dodati/ažurirati profile.')) return;

        setPpBusy(true);
        setPpMessage(null);
        try {
            const count = await backfillPublicProfiles();
            await loadPublicProfiles();
            setPpMessage({ type: 'success', text: `Popunjeno ${count} profila.` });
        } catch (err) {
            console.error('Greška pri popunjavanju javnih profila:', err);
            setPpMessage({ type: 'error', text: 'Popunjavanje nije uspjelo.' });
        } finally {
            setPpBusy(false);
        }
    };

    return (
        <div className="bg-[#0b0f19] min-h-screen text-white p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-amber-400">Admin Panel</h1>
                    <p className="text-slate-400 text-sm">Upravljanje registriranim igračima i postavkama baze</p>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm text-slate-300"
                    >
                        Zatvori Admin Panel
                    </button>
                )}
            </div>

            {/* BROJ PITANJA PO KATEGORIJI */}
            <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6 mb-8">
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

            {/* UPLOAD PITANJA */}
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

            {/* REGISTRIRANI IGRAČI TABLE */}
            <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6 mb-8">
                <h2 className="text-lg font-semibold text-amber-400 mb-4 flex items-center gap-2">
                    <span>👥</span> Registrirani Igrači
                </h2>

                {usersMessage && (
                    <div className={`text-sm rounded-lg p-3 mb-4 ${usersMessage.type === 'success' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-red-400 bg-red-500/10 border border-red-500/30'}`}>
                        {usersMessage.text}
                    </div>
                )}

                {loading ? (
                    <p className="text-slate-400 text-sm">Učitavanje popisa igrača...</p>
                ) : users.length === 0 ? (
                    <p className="text-slate-400 text-sm">Nema registriranih igrača u bazi podataka.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-slate-800 text-slate-400">
                                    <th className="py-3 px-2">Avatar</th>
                                    <th className="py-3 px-2">Ime / Nadimak</th>
                                    <th className="py-3 px-2">Email</th>
                                    <th className="py-3 px-2">Razina</th>
                                    <th className="py-3 px-2">XP</th>
                                    <th className="py-3 px-2">Novčići</th>
                                    <th className="py-3 px-2">Uloga</th>
                                    <th className="py-3 px-2 text-right">Akcije</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {users.map((u) => (
                                    <tr key={u.uid} className="hover:bg-slate-800/30">
                                        <td className="py-3 px-2">
                                            <img
                                                src={u.photoURL || 'https://via.placeholder.com/32'}
                                                alt="Avatar"
                                                className="w-8 h-8 rounded-full border border-slate-700"
                                            />
                                        </td>
                                        <td className="py-3 px-2 font-medium text-slate-200">{u.displayName || 'Igrač'}</td>
                                        <td className="py-3 px-2 text-slate-400">{u.email}</td>
                                        <td className="py-3 px-2 text-amber-400 font-semibold">{u.level || 1}</td>
                                        <td className="py-3 px-2 text-slate-300">{u.xp || 0}</td>
                                        <td className="py-3 px-2 text-yellow-400 font-semibold">{u.coins || 0}</td>
                                        <td className="py-3 px-2">
                                            <span className={`px-2 py-0.5 text-xs rounded-full ${u.role === 'admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400'}`}>
                                                {u.role || 'player'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2 text-right space-x-2">
                                            <button
                                                onClick={() => handleEditClick(u)}
                                                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded-md text-xs font-medium"
                                            >
                                                Uredi
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(u.uid)}
                                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-md text-xs font-medium"
                                            >
                                                Obriši
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* UPRAVLJAJ LJESTVICAMA */}
            <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6 mb-8">
                <h2 className="text-lg font-semibold text-amber-400 mb-1 flex items-center gap-2">
                    <span>🏆</span> Upravljaj Ljestvicama
                </h2>
                <p className="text-slate-400 text-sm mb-4">
                    Pregledajte i brišite rezultate na ljestvici po kategoriji - uključujući sve rezultate, ne samo top 10 prikazan igračima.
                </p>

                <div className="flex flex-wrap items-end gap-3 mb-4">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-slate-300 text-xs mb-1">Kategorija</label>
                        <select
                            value={lbCategory}
                            onChange={(e) => loadLeaderboard(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                        >
                            <option value="">-- Odaberite kategoriju --</option>
                            {categoryOptions.map((key) => (
                                <option key={key} value={key}>{CATEGORY_META[key]?.label || key}</option>
                            ))}
                        </select>
                    </div>
                    {lbCategory && (
                        <button
                            type="button"
                            onClick={handleClearLeaderboard}
                            disabled={lbBusy || lbLoading || lbScores.length === 0}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-40"
                        >
                            Obriši cijelu ljestvicu
                        </button>
                    )}
                </div>

                {lbMessage && (
                    <div className={`text-sm rounded-lg p-3 mb-4 ${lbMessage.type === 'success' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-red-400 bg-red-500/10 border border-red-500/30'}`}>
                        {lbMessage.text}
                    </div>
                )}

                {lbLoading && <p className="text-slate-400 text-sm">Učitavanje...</p>}

                {!lbLoading && lbCategory && (
                    lbScores.length === 0 ? (
                        <p className="text-slate-400 text-sm">Nema rezultata u ovoj kategoriji.</p>
                    ) : (
                        <div className="overflow-x-auto max-h-96 overflow-y-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-slate-800 text-slate-400">
                                        <th className="py-2 px-2">Ime</th>
                                        <th className="py-2 px-2 text-right">Bodovi</th>
                                        <th className="py-2 px-2">Datum</th>
                                        <th className="py-2 px-2 text-right">Akcije</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {lbScores.map((s) => (
                                        <tr key={s.id}>
                                            <td className="py-2 px-2 text-slate-200">{s.name}</td>
                                            <td className="py-2 px-2 text-right text-amber-400 font-semibold">{s.score}</td>
                                            <td className="py-2 px-2 text-slate-500 text-xs">
                                                {s.createdAt?.toDate ? s.createdAt.toDate().toLocaleString() : ''}
                                            </td>
                                            <td className="py-2 px-2 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteScore(s)}
                                                    disabled={lbBusy}
                                                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-md text-xs font-medium disabled:opacity-40"
                                                >
                                                    Obriši
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </div>

            {/* UPRAVLJAJ JAVNIM PROFILIMA */}
            <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6 mb-8">
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-lg font-semibold text-amber-400 flex items-center gap-2">
                        <span>🥇</span> Upravljaj Javnim Profilima
                    </h2>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleBackfillPublicProfiles}
                            disabled={ppBusy || ppLoading}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-40"
                        >
                            Popuni sve profile
                        </button>
                        <button
                            type="button"
                            onClick={handleClearAllPublicProfiles}
                            disabled={ppBusy || ppLoading || ppProfiles.length === 0}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-40"
                        >
                            Obriši sve profile
                        </button>
                    </div>
                </div>
                <p className="text-slate-400 text-sm mb-4">
                    Podaci koji hrane Rekordi ljestvice (razina, niz, trofeji, dani zaredom). "Popuni sve profile" jednokratno kreira/ažurira profile za sve registrirane igrače na temelju njihovih trenutnih podataka (korisno za igrače koji se nisu ponovno prijavili otkad je ova značajka dodana). Brisanje ovdje uklanja igrača sa svih Rekordi ljestvica, ali ne dira njegov račun.
                </p>

                {ppMessage && (
                    <div className={`text-sm rounded-lg p-3 mb-4 ${ppMessage.type === 'success' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-red-400 bg-red-500/10 border border-red-500/30'}`}>
                        {ppMessage.text}
                    </div>
                )}

                {ppLoading ? (
                    <p className="text-slate-400 text-sm">Učitavanje...</p>
                ) : ppProfiles.length === 0 ? (
                    <p className="text-slate-400 text-sm">Nema javnih profila.</p>
                ) : (
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-slate-800 text-slate-400">
                                    <th className="py-2 px-2">Ime</th>
                                    <th className="py-2 px-2 text-right">Razina</th>
                                    <th className="py-2 px-2 text-right">Niz</th>
                                    <th className="py-2 px-2 text-right">Trofeji</th>
                                    <th className="py-2 px-2 text-right">Dana zaredom</th>
                                    <th className="py-2 px-2 text-right">Akcije</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {ppProfiles.map((p) => (
                                    <tr key={p.uid}>
                                        <td className="py-2 px-2 text-slate-200">{p.displayName}</td>
                                        <td className="py-2 px-2 text-right text-amber-400 font-semibold">{p.level}</td>
                                        <td className="py-2 px-2 text-right text-slate-300">{p.maxStreak}</td>
                                        <td className="py-2 px-2 text-right text-slate-300">{p.achievementCount}</td>
                                        <td className="py-2 px-2 text-right text-slate-300">{p.dayStreak}</td>
                                        <td className="py-2 px-2 text-right">
                                            <button
                                                type="button"
                                                onClick={() => handleDeletePublicProfile(p)}
                                                disabled={ppBusy}
                                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-md text-xs font-medium disabled:opacity-40"
                                            >
                                                Obriši
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* EDIT PLAYER PROFILE MODAL */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#121824] border border-slate-800 text-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-amber-400 mb-1">
                            Uredi Profil Igrača
                        </h3>
                        <p className="text-xs text-slate-400 mb-6">{editingUser.email}</p>

                        {formError && (
                            <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/30 rounded-lg p-2 mb-4">
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleSaveUser} className="space-y-4 text-sm">
                            <div>
                                <label className="block text-slate-300 text-xs mb-1">Ime / Nadimak</label>
                                <input
                                    type="text"
                                    value={formData.displayName}
                                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-slate-300 text-xs mb-1">Razina (Level)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={formData.level}
                                        onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-300 text-xs mb-1">Iskustvo (XP)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={formData.xp}
                                        onChange={(e) => setFormData({ ...formData, xp: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-300 text-xs mb-1">Novčići (Coins)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={formData.coins}
                                        onChange={(e) => setFormData({ ...formData, coins: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-300 text-xs mb-1">Uloga (Role)</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                                >
                                    <option value="player">Igrač (player)</option>
                                    <option value="admin">Administrator (admin)</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={handleCloseEdit}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg font-medium"
                                >
                                    Odustani
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs rounded-lg font-bold"
                                >
                                    Spremi Promjene
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}