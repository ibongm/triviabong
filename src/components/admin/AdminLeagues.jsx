import { useEffect, useState } from 'react';
import { adminListLeagues, adminDeleteLeague } from '../../services/leagues';
import { toMillis } from '../../utils/league';

// Read-only list of private leagues (engagement plan Phase 6) plus the one
// moderation action: delete a league (offensive name). Deleting removes the
// league and its code doc; members' own index entries drop out of their
// "Lige" list the next time they open it (the league page reports
// "not found" and offers to remove it). Not cached: it is a rarely opened
// section and a stale list would hide a just-made deletion.
export default function AdminLeagues() {
    const [leagues, setLeagues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [message, setMessage] = useState(null);

    const load = async () => {
        setLoading(true);
        setLeagues(await adminListLeagues());
        setLoading(false);
    };

    useEffect(() => {
        let cancelled = false;
        adminListLeagues().then((list) => {
            if (cancelled) return;
            setLeagues(list);
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, []);

    const handleDelete = async (league) => {
        if (!window.confirm(`Obrisati ligu "${league.name}" (${league.memberCount} članova)? Ovo se ne može poništiti.`)) return;
        setBusyId(league.id);
        const result = await adminDeleteLeague(league);
        setBusyId(null);
        setMessage(result.ok ? { type: 'ok', text: `Liga "${league.name}" je obrisana.` } : { type: 'error', text: 'Brisanje nije uspjelo.' });
        if (result.ok) await load();
    };

    const totalMembers = leagues.reduce((sum, l) => sum + (l.memberCount || 0), 0);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Lige</h2>
                <button onClick={load} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg">Osvježi</button>
            </div>
            <p className="text-sm text-slate-400">
                {loading ? 'Učitavanje...' : `${leagues.length} liga, ${totalMembers} članstava ukupno.`}
            </p>
            {message && <p className={`text-sm ${message.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{message.text}</p>}
            <div className="bg-[#121824] border border-slate-800 rounded-xl overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase text-slate-500 border-b border-slate-800">
                        <tr>
                            <th className="px-3 py-2">Liga</th>
                            <th className="px-3 py-2">Članova</th>
                            <th className="px-3 py-2">Vlasnik (uid)</th>
                            <th className="px-3 py-2">Stvorena</th>
                            <th className="px-3 py-2" />
                        </tr>
                    </thead>
                    <tbody>
                        {leagues.map((l) => (
                            <tr key={l.id} className="border-b border-slate-800/60 last:border-0">
                                <td className="px-3 py-2 text-slate-100">{l.emoji} {l.name}</td>
                                <td className="px-3 py-2 text-slate-300">{l.memberCount}</td>
                                <td className="px-3 py-2 text-slate-500 font-mono text-xs">{l.ownerUid}</td>
                                <td className="px-3 py-2 text-slate-400">{toMillis(l.createdAt) ? new Date(toMillis(l.createdAt)).toLocaleDateString('hr-HR') : '-'}</td>
                                <td className="px-3 py-2 text-right">
                                    <button
                                        onClick={() => handleDelete(l)}
                                        disabled={busyId === l.id}
                                        className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg disabled:opacity-50"
                                    >
                                        Obriši
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {!loading && leagues.length === 0 && (
                            <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Još nema liga.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
