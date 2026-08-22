import { useEffect, useMemo, useState } from 'react';
import { getAllRegisteredUsers, updateUserInFirestore, deleteUserFromFirestore, resetAllPlayerProgression } from '../../services/firebase';
import { summarizePlayTimeByUid, formatDuration } from '../../utils/sessionStats';
import { computeLevelFromXp } from '../../utils/leveling';
import { evaluateAchievements, mergeUnlockedAchievements, revokeStaleAchievements } from '../../utils/achievements';
import { ACHIEVEMENTS } from '../../constants/achievements';
import AdminPlayerDetail from './AdminPlayerDetail';
import { getCachedAdminData, setCachedAdminData } from '../../utils/adminDataCache';

const USERS_CACHE_KEY = 'players.users';

const toMillis = (value) => {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.toDate === 'function') return value.toDate().getTime();
    return new Date(value).getTime() || 0;
};

const COLUMNS = [
    { key: 'displayName', label: 'Ime / Nadimak' },
    { key: 'email', label: 'Email' },
    { key: 'level', label: 'Razina' },
    { key: 'xp', label: 'XP' },
    { key: 'coins', label: 'Novčići' },
    { key: 'trophyCount', label: 'Trofeji' },
    { key: 'dailyTimeSeconds', label: 'Danas' },
    { key: 'weeklyTimeSeconds', label: 'Tjedan' },
    { key: 'totalTimeSeconds', label: 'Ukupno vrijeme' },
    { key: 'lastActiveMs', label: 'Zadnja aktivnost' },
    { key: 'role', label: 'Uloga' },
];

export default function AdminPlayers() {
    // users stays in-memory-cached only, deliberately: it's bounded by
    // registered-player count (tens), and its docs carry Firestore Timestamps
    // (lastLogin, read through toMillis below) which JSON.stringify turns into
    // plain { seconds, nanoseconds } - toMillis would then read them as 0 and
    // the "Zadnja aktivnost" column would silently sort and render as "—".
    // Not worth normalizing for a scan this cheap.
    const cachedUsers = getCachedAdminData(USERS_CACHE_KEY);
    const [users, setUsers] = useState(cachedUsers ?? []);
    const [loading, setLoading] = useState(!cachedUsers);
    const [usersMessage, setUsersMessage] = useState(null);
    const [editingUser, setEditingUser] = useState(null);
    const [formError, setFormError] = useState('');
    const [detailUser, setDetailUser] = useState(null);
    const [sortKey, setSortKey] = useState('displayName');
    const [sortDirection, setSortDirection] = useState('asc');

    const [formData, setFormData] = useState({
        displayName: '',
        level: 1,
        xp: 0,
        coins: 0,
        role: 'player',
        unlockedAchievements: {}
    });

    // Always hits Firestore fresh and refreshes the cache - called both for
    // the initial (cache-miss) load and after edit/delete/reset mutations,
    // where showing stale data would hide the admin's own just-made change.
    const fetchUsers = async () => {
        setLoading(true);
        const userList = await getAllRegisteredUsers();
        setUsers(userList);
        setLoading(false);
        setCachedAdminData(USERS_CACHE_KEY, userList);
    };

    // Danas/Tjedan/Ukupno now come from the playTime counters maintained on
    // each user doc (see addPlayTime in services/firebase.js), derived from
    // `users` which this component already fetched - so these columns cost
    // ZERO extra reads. They previously came from getAllSessions(), an
    // unbounded scan over every session doc ever written and, by its own
    // comment, the most expensive read in the panel.
    //
    // summarizePlayTimeByUid needs a "now" to pick today's/this week's
    // buckets. Captured once via a lazy useState initializer rather than read
    // during render, so the derivation stays pure across re-renders (React's
    // purity rule - same concern as useOneVsOne's online-count comment) without
    // calling setState from an effect. Freezing it at mount matches the old
    // behaviour, where totals were computed once per fetch.
    const [derivedAt] = useState(() => new Date());
    const totalTimeByUid = useMemo(
        () => summarizePlayTimeByUid(users, derivedAt),
        [users, derivedAt],
    );

    useEffect(() => {
        // Skip the re-fetch if this section was already loaded once this admin
        // session - AdminPanel unmounts/remounts sections on every tab switch,
        // so without this a revisit re-scans the users collection every time.
        (async () => {
            if (!cachedUsers) await fetchUsers();
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleRefresh = () => {
        fetchUsers();
    };

    const handleSort = (key) => {
        if (key === sortKey) {
            setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }
    };

    const sortedUsers = useMemo(() => {
        const rows = users.map((u) => ({
            ...u,
            trophyCount: Object.keys(u.unlockedAchievements || {}).length,
            dailyTimeSeconds: totalTimeByUid.daily?.[u.uid] || 0,
            weeklyTimeSeconds: totalTimeByUid.weekly?.[u.uid] || 0,
            totalTimeSeconds: totalTimeByUid.all?.[u.uid] || 0,
            lastActiveMs: toMillis(u.lastLogin),
        }));
        rows.sort((a, b) => {
            const av = a[sortKey];
            const bv = b[sortKey];
            if (typeof av === 'string' || typeof bv === 'string') {
                return String(av || '').localeCompare(String(bv || ''), 'hr', { sensitivity: 'base' });
            }
            return (av || 0) - (bv || 0);
        });
        if (sortDirection === 'desc') rows.reverse();
        return rows;
    }, [users, totalTimeByUid, sortKey, sortDirection]);

    const handleEditClick = (user) => {
        setEditingUser(user);
        setFormError('');
        setFormData({
            displayName: user.displayName || '',
            level: user.level || 1,
            xp: user.xp || 0,
            coins: user.coins || 0,
            role: user.role || 'player',
            unlockedAchievements: { ...(user.unlockedAchievements || {}) }
        });
    };

    const handleCloseEdit = () => {
        setEditingUser(null);
        setFormError('');
    };

    // Toggling a statOnly trophy on here can get immediately reversed by
    // the full-sync revoke pass on save if the underlying stat doesn't
    // support it (see handleSaveUser) - that's intentional, not a bug, but
    // it does mean manual toggling is only reliably meaningful for the
    // non-statOnly (event-based) trophies, which sync can never touch.
    const toggleTrophy = (id) => {
        setFormData((prev) => {
            const next = { ...prev.unlockedAchievements };
            if (next[id]) {
                delete next[id];
            } else {
                next[id] = new Date().toISOString();
            }
            return { ...prev, unlockedAchievements: next };
        });
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        if (!editingUser) return;

        const xp = Number(formData.xp);
        const coins = Number(formData.coins);

        if (!Number.isFinite(xp) || !Number.isFinite(coins)) {
            setFormError('XP i novčići moraju biti brojevi.');
            return;
        }
        if (xp < 0 || coins < 0) {
            setFormError('XP i novčići ne mogu biti negativni.');
            return;
        }

        setFormError('');

        // Full sync (per the confirmed design): Level is always re-derived
        // from XP, never taken from the form's own Level field directly -
        // see the disabled Level input's note. Then re-run achievement
        // unlock/revoke against the resulting full stat set, silently (no
        // reward on sync-unlock, no toast/animation - this path never
        // touches App.jsx's player-facing gameplay code at all). Revoke
        // only ever considers statOnly achievements - see
        // revokeStaleAchievements' comment for why the rest must never be
        // auto-revoked from a static snapshot.
        const syncedLevel = computeLevelFromXp(Math.floor(xp));
        const mergedStats = {
            ...editingUser,
            xp: Math.floor(xp),
            coins: Math.floor(coins),
            level: syncedLevel,
            unlockedAchievements: formData.unlockedAchievements
        };
        const newlyUnlocked = evaluateAchievements(mergedStats, {});
        const afterUnlock = mergeUnlockedAchievements(mergedStats, newlyUnlocked);
        const revokedIds = revokeStaleAchievements({ ...mergedStats, unlockedAchievements: afterUnlock });
        const finalUnlocked = { ...afterUnlock };
        for (const id of revokedIds) delete finalUnlocked[id];

        try {
            await updateUserInFirestore(editingUser.uid, {
                displayName: formData.displayName,
                level: syncedLevel,
                xp: Math.floor(xp),
                coins: Math.floor(coins),
                role: formData.role,
                unlockedAchievements: finalUnlocked
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

    // One-off maintenance action (economy rebalance, 2026-08-15) - resets
    // level/xp/achievements/every derived stat counter for EVERY registered
    // player, coins/identity untouched. Irreversible and affects every real
    // account, so it's gated behind a type-to-confirm prompt rather than a
    // plain window.confirm, unlike every other action in this file.
    const [resetBusy, setResetBusy] = useState(false);
    const handleResetAllProgression = async () => {
        if (resetBusy) return;
        const typed = window.prompt(
            `Ovo će vratiti razinu, XP i trofeje SVIH ${users.length} registriranih igrača na početak (novčići ostaju netaknuti). Ovo se NE MOŽE poništiti.\n\nUpiši RESET za potvrdu:`
        );
        if (typed !== 'RESET') return;

        setResetBusy(true);
        setUsersMessage(null);
        try {
            const { succeeded, failed } = await resetAllPlayerProgression();
            await fetchUsers();
            if (failed.length === 0) {
                setUsersMessage({ type: 'success', text: `Napredak resetiran za ${succeeded} igrača.` });
            } else {
                const names = failed.slice(0, 3).map(f => f.displayName || f.uid).join(', ');
                const more = failed.length > 3 ? ` i još ${failed.length - 3}` : '';
                setUsersMessage({
                    type: 'error',
                    text: `Resetirano ${succeeded}, ${failed.length} preskočeno: ${names}${more}.`
                });
            }
        } catch (err) {
            console.error('Greška pri resetiranju napretka:', err);
            setUsersMessage({ type: 'error', text: 'Resetiranje nije uspjelo.' });
        } finally {
            setResetBusy(false);
        }
    };

    return (
        <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-amber-400 flex items-center gap-2">
                    <span>👥</span> Registrirani Igrači
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleRefresh}
                        className="text-xs text-slate-400 hover:text-amber-400 border border-slate-800 hover:border-amber-500/40 rounded-lg px-3 py-1.5"
                    >
                        🔄 Osvježi
                    </button>
                    <button
                        type="button"
                        onClick={handleResetAllProgression}
                        disabled={resetBusy || loading || users.length === 0}
                        title="Resetira razinu/XP/trofeje SVIH igrača (novčići ostaju) - koristi samo nakon velike promjene ekonomije"
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-40"
                    >
                        {resetBusy ? 'Resetiranje...' : 'Resetiraj napredak svih igrača'}
                    </button>
                </div>
            </div>

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
                                {COLUMNS.map((col) => (
                                    <th
                                        key={col.key}
                                        onClick={() => handleSort(col.key)}
                                        className="py-3 px-2 cursor-pointer select-none hover:text-slate-200"
                                        title="Klikni za sortiranje"
                                    >
                                        {col.label}
                                        {sortKey === col.key ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}
                                    </th>
                                ))}
                                <th className="py-3 px-2 text-right">Akcije</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {sortedUsers.map((u) => (
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
                                    <td className="py-3 px-2 text-slate-300">{u.trophyCount}</td>
                                    <td className="py-3 px-2 text-slate-300">{formatDuration(u.dailyTimeSeconds)}</td>
                                    <td className="py-3 px-2 text-slate-300">{formatDuration(u.weeklyTimeSeconds)}</td>
                                    <td className="py-3 px-2 text-slate-300">{formatDuration(u.totalTimeSeconds)}</td>
                                    <td className="py-3 px-2 text-slate-400 text-xs">
                                        {u.lastActiveMs ? new Date(u.lastActiveMs).toLocaleDateString() : '—'}
                                    </td>
                                    <td className="py-3 px-2">
                                        <span className={`px-2 py-0.5 text-xs rounded-full ${u.role === 'admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400'}`}>
                                            {u.role || 'player'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-2 text-right space-x-2">
                                        <button
                                            onClick={() => setDetailUser(u)}
                                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded-md text-xs font-medium"
                                        >
                                            Detalji
                                        </button>
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

            {detailUser && (
                <AdminPlayerDetail
                    user={detailUser}
                    onClose={() => setDetailUser(null)}
                    onEdit={(u) => {
                        setDetailUser(null);
                        handleEditClick(u);
                    }}
                />
            )}

            {editingUser && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#121824] border border-slate-800 text-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
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
                                    <label className="block text-slate-300 text-xs mb-1">Razina (auto, iz XP-a)</label>
                                    <input
                                        type="number"
                                        value={computeLevelFromXp(Number(formData.xp) || 0)}
                                        disabled
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-400 cursor-not-allowed"
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

                            <div>
                                <label className="block text-slate-300 text-xs mb-1">
                                    Trofeji <span className="text-slate-500">(oznake s * temeljene su na statistici i mogu se automatski uskladiti pri spremanju)</span>
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto p-1">
                                    {ACHIEVEMENTS.map((a) => {
                                        const isUnlocked = !!formData.unlockedAchievements[a.id];
                                        return (
                                            <label
                                                key={a.id}
                                                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs cursor-pointer ${
                                                    isUnlocked
                                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                                        : 'bg-slate-950/40 border-slate-800 text-slate-500'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isUnlocked}
                                                    onChange={() => toggleTrophy(a.id)}
                                                    className="shrink-0"
                                                />
                                                <span className="truncate">{a.nameHr}{a.statOnly ? ' *' : ''}</span>
                                            </label>
                                        );
                                    })}
                                </div>
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
