import React, { useState, useEffect } from 'react';
import {
    getAllRegisteredUsers,
    updateUserInFirestore,
    deleteUserFromFirestore
} from '../services/firebase';

export default function AdminPanel({ onClose }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState(null);

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

    const handleEditClick = (user) => {
        setEditingUser(user);
        setFormData({
            displayName: user.displayName || '',
            level: user.level || 1,
            xp: user.xp || 0,
            coins: user.coins || 0,
            role: user.role || 'player'
        });
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        if (!editingUser) return;

        try {
            await updateUserInFirestore(editingUser.uid, {
                displayName: formData.displayName,
                level: Number(formData.level),
                xp: Number(formData.xp),
                coins: Number(formData.coins),
                role: formData.role
            });

            setEditingUser(null);
            await fetchUsers();
        } catch (err) {
            console.error("Greška pri spremanju korisnika:", err);
            alert("Ažuriranje nije uspjelo.");
        }
    };

    const handleDeleteUser = async (uid) => {
        if (window.confirm("Jeste li sigurni da želite izbrisati ovog igrača?")) {
            await deleteUserFromFirestore(uid);
            await fetchUsers();
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

            {/* REGISTRIRANI IGRAČI TABLE */}
            <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6 mb-8">
                <h2 className="text-lg font-semibold text-amber-400 mb-4 flex items-center gap-2">
                    <span>👥</span> Registrirani Igrači
                </h2>

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

            {/* EDIT PLAYER PROFILE MODAL */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#121824] border border-slate-800 text-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-amber-400 mb-1">
                            Uredi Profil Igrača
                        </h3>
                        <p className="text-xs text-slate-400 mb-6">{editingUser.email}</p>

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
                                        value={formData.level}
                                        onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-300 text-xs mb-1">Iskustvo (XP)</label>
                                    <input
                                        type="number"
                                        value={formData.xp}
                                        onChange={(e) => setFormData({ ...formData, xp: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-300 text-xs mb-1">Novčići (Coins)</label>
                                    <input
                                        type="number"
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
                                    onClick={() => setEditingUser(null)}
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