import { useState, useEffect } from 'react';
import {
    getAllRegisteredUsers,
    updateUserInFirestore,
    deleteUserFromFirestore
} from '../../services/firebase';
import AdminSection from './shared/AdminSection';
import EditUserModal from './EditUserModal';

export default function RegisteredUsersSection() {
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
        <>
            <AdminSection icon="👥" title="Registrirani Igrači">
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
            </AdminSection>

            <EditUserModal
                user={editingUser}
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleSaveUser}
                onCancel={() => setEditingUser(null)}
            />
        </>
    );
}
