import { useState } from 'react';
import {
    getAllScoresForCategory,
    deleteScoreFromFirestore,
    clearLeaderboardForCategory,
    recomputeFastestPerfectRecord
} from '../../services/firebase';
import { CATEGORY_META } from '../../data/categoryMeta';
import AdminSection from './shared/AdminSection';
import AdminMessage from './shared/AdminMessage';
import CategorySelect from './shared/CategorySelect';

export default function LeaderboardsSection() {
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

    return (
        <AdminSection
            icon="🏆"
            title="Upravljaj Ljestvicama"
            description="Pregledajte i brišite rezultate na ljestvici po kategoriji - uključujući sve rezultate, ne samo top 10 prikazan igračima."
            action={
                <button
                    type="button"
                    onClick={handleRecomputeFastestPerfect}
                    disabled={rbBusy}
                    title="Ponovno izgradi Rekordi zapis najbržeg savršenog kruga (koristi nakon brisanja rezultata)"
                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-40"
                >
                    Rekonstruiraj rekorde
                </button>
            }
        >
            <AdminMessage message={rbMessage} />

            <div className="flex flex-wrap items-end gap-3 mb-4">
                <CategorySelect
                    value={lbCategory}
                    onChange={loadLeaderboard}
                    className="flex-1 min-w-[200px]"
                />
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

            <AdminMessage message={lbMessage} />

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
        </AdminSection>
    );
}
