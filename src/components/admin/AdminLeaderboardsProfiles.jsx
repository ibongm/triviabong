import { useEffect, useState } from 'react';
import {
    getAllScoresForCategory,
    deleteScoreFromFirestore,
    clearLeaderboardForCategory,
    recomputeFastestPerfectRecord,
    getAllPublicProfiles,
    deletePublicProfile,
    clearAllPublicProfiles,
    backfillPublicProfiles,
} from '../../services/firebase';
import { getAllCategories } from '../../data/questionsLoader';
import { CATEGORY_META } from '../../data/categoryMeta';

export default function AdminLeaderboardsProfiles() {
    const categoryOptions = getAllCategories();

    // --- Manage leaderboards ---
    const [lbCategory, setLbCategory] = useState('');
    const [lbScores, setLbScores] = useState([]);
    const [lbLoading, setLbLoading] = useState(false);
    const [lbBusy, setLbBusy] = useState(false);
    const [lbMessage, setLbMessage] = useState(null);
    const [rbBusy, setRbBusy] = useState(false);
    const [rbMessage, setRbMessage] = useState(null);

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

    const handleRecomputeFastestPerfect = async () => {
        if (rbBusy) return;
        if (!window.confirm('Ponovno izgraditi zapis "najbrži savršeni krug" skeniranjem svih ljestvica? Koristite ovo samo ako je zapis zastario nakon brisanja rezultata.')) return;

        setRbBusy(true);
        setRbMessage(null);
        try {
            const count = await recomputeFastestPerfectRecord();
            setRbMessage({ type: 'success', text: `Rekord obnovljen (${count} zapisa).` });
        } catch (err) {
            console.error('Greška pri obnovi rekorda:', err);
            setRbMessage({ type: 'error', text: 'Obnova nije uspjela.' });
        } finally {
            setRbBusy(false);
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
            const { succeeded, failed } = await backfillPublicProfiles();
            await loadPublicProfiles();
            if (failed.length === 0) {
                setPpMessage({ type: 'success', text: `Popunjeno ${succeeded} profila.` });
            } else {
                // Name the accounts that were skipped - a generic failure
                // message here used to leave no way to tell WHICH user was
                // breaking the backfill.
                const names = failed.slice(0, 3).map(f => f.displayName || f.uid).join(', ');
                const more = failed.length > 3 ? ` i još ${failed.length - 3}` : '';
                setPpMessage({
                    type: 'error',
                    text: `Popunjeno ${succeeded} profila, ${failed.length} preskočeno: ${names}${more}.`
                });
            }
        } catch (err) {
            console.error('Greška pri popunjavanju javnih profila:', err);
            setPpMessage({ type: 'error', text: 'Popunjavanje nije uspjelo.' });
        } finally {
            setPpBusy(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* UPRAVLJAJ LJESTVICAMA */}
            <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-lg font-semibold text-amber-400 flex items-center gap-2">
                        <span>🏆</span> Upravljaj Ljestvicama
                    </h2>
                    <button
                        type="button"
                        onClick={handleRecomputeFastestPerfect}
                        disabled={rbBusy}
                        title="Ponovno izgradi Rekordi zapis najbržeg savršenog kruga (koristi nakon brisanja rezultata)"
                        className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-40"
                    >
                        Rekonstruiraj rekorde
                    </button>
                </div>
                <p className="text-slate-400 text-sm mb-4">
                    Pregledajte i brišite rezultate na ljestvici po kategoriji - uključujući sve rezultate, ne samo top 10 prikazan igračima.
                </p>

                {rbMessage && (
                    <div className={`text-sm rounded-lg p-3 mb-4 ${rbMessage.type === 'success' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-red-400 bg-red-500/10 border border-red-500/30'}`}>
                        {rbMessage.text}
                    </div>
                )}

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
            <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6">
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
        </div>
    );
}
