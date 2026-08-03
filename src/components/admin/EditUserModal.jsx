
export default function EditUserModal({ user, formData, setFormData, onSubmit, onCancel }) {
    if (!user) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#121824] border border-slate-800 text-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                <h3 className="text-lg font-bold text-amber-400 mb-1">
                    Uredi Profil Igrača
                </h3>
                <p className="text-xs text-slate-400 mb-6">{user.email}</p>

                <form onSubmit={onSubmit} className="space-y-4 text-sm">
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
                            onClick={onCancel}
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
    );
}
