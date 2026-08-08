import { useEffect, useState } from 'react';
import { Swords, X, Check } from 'lucide-react';
import { CATEGORY_META } from '../data/categoryMeta';
import { acceptMatchInvite, declineMatchInvite } from '../services/matches';

// Shown to the INVITEE when a pending matchInvites doc addressed to them
// appears (see App.jsx's subscribeToIncomingInvites). Accept/decline only -
// the invitee never creates the match doc themselves (firestore.rules
// requires the host/player1 to), they just flip status and wait for
// App.jsx's subscribeToMatchByInviteId to pick up the match the host
// creates in response.
export default function MatchInviteModal({ invite, onAccepted, onDismiss }) {
    const [busy, setBusy] = useState(false);

    // Countdown display derived directly from invite.expiresAt on every
    // tick, rather than local counting state - avoids needing to reset
    // anything when a new invite replaces the old one (no per-invite effect
    // needed at all). The actual expiry is written by the SENDER's client
    // (firestore.rules only allows fromUid to expire their own invite); if
    // it expires before the invitee responds, the invite just stops
    // appearing as 'pending' and this modal is dismissed by the parent's
    // subscription naturally dropping it from the list.
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    if (!invite) return null;

    const categoryLabel = CATEGORY_META[invite.category]?.label || invite.category;
    const expiresAtMs = invite.expiresAt?.toMillis?.() ?? (now + 60000);
    const secondsLeft = Math.max(0, Math.round((expiresAtMs - now) / 1000));

    const handleAccept = async () => {
        setBusy(true);
        const ok = await acceptMatchInvite(invite.id);
        if (ok) onAccepted(invite);
        setBusy(false);
    };

    const handleDecline = async () => {
        setBusy(true);
        await declineMatchInvite(invite.id);
        setBusy(false);
        onDismiss(invite.id);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-5 text-center">
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
                        <Swords className="w-4 h-4" /> Poziv na 1v1
                    </h3>
                    <button onClick={handleDecline} disabled={busy} className="text-slate-500 hover:text-slate-300">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-1">
                    <p className="text-sm text-slate-300">
                        <span className="font-bold text-white">{invite.fromDisplayName}</span> te poziva na 1v1 dvoboj!
                    </p>
                    <p className="text-xs text-slate-500">Kategorija: <span className="text-slate-300 font-bold capitalize">{categoryLabel}</span></p>
                    <p className="text-xs text-slate-600">Poziv istječe za {secondsLeft}s</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleDecline}
                        disabled={busy}
                        className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-colors disabled:opacity-50"
                    >
                        Odbij
                    </button>
                    <button
                        onClick={handleAccept}
                        disabled={busy}
                        className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                        <Check className="w-4 h-4" /> Prihvati
                    </button>
                </div>
            </div>
        </div>
    );
}
