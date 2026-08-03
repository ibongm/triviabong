import { useState, useEffect } from 'react';
import {
    getAllPublicProfiles,
    deletePublicProfile,
    clearAllPublicProfiles,
    backfillPublicProfiles
} from '../../services/firebase';
import AdminSection from './shared/AdminSection';
import AdminMessage from './shared/AdminMessage';

export default function PublicProfilesSection() {
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
        <AdminSection
            icon="🥇"
            title="Upravljaj Javnim Profilima"
            description={'Podaci koji hrane Rekordi ljestvice (razina, niz, trofeji, dani zaredom). "Popuni sve profile" jednokratno kreira/ažurira profile za sve registrirane igrače na temelju njihovih trenutnih podataka (korisno za igrače koji se nisu ponovno prijavili otkad je ova značajka dodana). Brisanje ovdje uklanja igrača sa svih Rekordi ljestvica, ali ne dira njegov račun.'}
            action={
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
            }
        >
            <AdminMessage message={ppMessage} />

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
        </AdminSection>
    );
}
