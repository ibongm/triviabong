import { useEffect, useState } from 'react';
import { Users, Circle, Gamepad2, Clock, Swords } from 'lucide-react';
import { getAllCategories } from '../data/questionsLoader';
import { CATEGORY_META } from '../data/categoryMeta';
import { getTitleForLevel } from '../constants/levelTitles';
import LevelBadge from './LevelBadge';

import { filterOnlinePlayers } from '../utils/presenceUtils';

const STATUS_META = {
    lobby: { label: 'Dostupan', dotClass: 'text-emerald-400' },
    playing: { label: 'U igri', dotClass: 'text-amber-400' },
    busy: { label: 'Zauzet', dotClass: 'text-slate-400' },
};

// Lobby-only, publicly-listable (to signed-in players) online-players
// panel - see Plan A. Filters presence docs to the online threshold
// client-side rather than via a Firestore query, since a
// where('lastHeartbeat', '>', ...) query would need a value that keeps
// moving every render and would need a composite index for no real benefit
// at beta scale.
//
// Plan B adds the "Pozovi" (invite) button here, inline rather than a
// separate modal - only shown for players currently in 'lobby' status
// (inviting someone mid-round would just sit unseen until they finish).
//
// `players` is passed down from useOneVsOne's single shared `presence`
// subscription (see that hook's comment) rather than subscribed to again
// here - this component used to open its own identical onSnapshot listener
// on mount, doubling the read/listener cost for as long as the
// OnlinePlayersModal stayed open.
export default function OnlinePlayersList({ currentUid, onInvite, players }) {
    const [now, setNow] = useState(() => Date.now());
    const [invitingUid, setInvitingUid] = useState(null);
    const [pickerCategory, setPickerCategory] = useState('');
    const [sendingTo, setSendingTo] = useState(null);

    const categories = getAllCategories();

    // Re-evaluate the online threshold periodically so a ghost entry
    // (heartbeat stopped, doc not yet deleted) actually disappears instead
    // of only updating on the next unrelated re-render.
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 10000);
        return () => clearInterval(interval);
    }, []);

    if (players === null) {
        return null;
    }

    const onlinePlayers = filterOnlinePlayers(players, currentUid, now)
        .sort((a, b) => (b.level || 0) - (a.level || 0));

    const openPicker = (uid) => {
        setInvitingUid(uid);
        setPickerCategory(categories[0] || '');
    };

    const closePicker = () => {
        setInvitingUid(null);
        setPickerCategory('');
    };

    const confirmInvite = async (toUid, toDisplayName) => {
        if (!pickerCategory || !onInvite) return;
        setSendingTo(toUid);
        await onInvite(toUid, pickerCategory, toDisplayName);
        setSendingTo(null);
        closePicker();
    };

    return (
        <div className="space-y-3 pt-4">
            <h2 className="text-sm font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" /> Online igrači
            </h2>

            {onlinePlayers.length === 0 ? (
                <p className="text-sm text-slate-500 bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-center">
                    Trenutno nema drugih igrača na mreži.
                </p>
            ) : (
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl divide-y divide-slate-800">
                    {onlinePlayers.map(player => {
                        const meta = STATUS_META[player.status] || STATUS_META.lobby;
                        const isPicking = invitingUid === player.uid;
                        return (
                            <div key={player.uid} className="p-3.5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Circle className={`w-2.5 h-2.5 fill-current ${meta.dotClass}`} />
                                        <LevelBadge level={player.level} size="micro" showStars={false} title={getTitleForLevel(player.level)} />
                                        <div>
                                            <span className="font-bold text-slate-200 text-sm block">{player.displayName}</span>
                                            <span className="text-xs text-slate-500">Razina {player.level}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                            {player.status === 'playing'
                                                ? <Gamepad2 className="w-3.5 h-3.5" />
                                                : <Clock className="w-3.5 h-3.5" />}
                                            {meta.label}
                                        </span>
                                        {onInvite && player.status === 'lobby' && (
                                            <button
                                                onClick={() => isPicking ? closePicker() : openPicker(player.uid)}
                                                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2.5 py-1.5 transition-colors active:scale-95"
                                            >
                                                <Swords className="w-3.5 h-3.5" /> Pozovi
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {isPicking && (
                                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                                        <select
                                            value={pickerCategory}
                                            onChange={(e) => setPickerCategory(e.target.value)}
                                            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 px-2 py-1.5 capitalize"
                                        >
                                            {categories.map(catKey => (
                                                <option key={catKey} value={catKey}>{CATEGORY_META[catKey]?.label || catKey}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => confirmInvite(player.uid, player.displayName)}
                                            disabled={sendingTo === player.uid}
                                            className="text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg px-3 py-1.5 disabled:opacity-50 transition-colors"
                                        >
                                            {sendingTo === player.uid ? '...' : 'Pošalji'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
