import { useState } from 'react';
import { Flag, X } from 'lucide-react';
import { REPORT_REASONS } from '../constants/reportReasons';
import { submitQuestionReport } from '../services/firebase';

// Lightweight player-facing "report this question" action (the one
// user-facing surface in the whole admin-panel redesign - everything else
// is admin-only). Fire-and-forget in spirit: minimal interruption, no
// blocking of the round beyond the same pause every other modal already
// causes via App.jsx's isAnyModalOpen gate.
export default function ReportQuestionModal({ isOpen, onClose, question, categoryId, uid }) {
    const [reason, setReason] = useState(REPORT_REASONS[0].id);
    const [note, setNote] = useState('');
    const [status, setStatus] = useState('idle'); // idle | sending | sent | error

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('sending');
        const ok = await submitQuestionReport({
            uid: uid || null,
            questionId: question.id,
            categoryId: categoryId || question.category || 'opca_znanje',
            reason,
            ...(note.trim() ? { note: note.trim().slice(0, 500) } : {}),
        });
        setStatus(ok ? 'sent' : 'error');
    };

    const handleClose = () => {
        setReason(REPORT_REASONS[0].id);
        setNote('');
        setStatus('idle');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                        <Flag className="w-4 h-4" /> Prijavi pitanje
                    </h3>
                    <button onClick={handleClose} className="text-slate-500 hover:text-slate-300">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {status === 'sent' ? (
                    <div className="text-center py-4 space-y-3">
                        <p className="text-emerald-400 text-sm font-bold">Hvala, prijava je zaprimljena!</p>
                        <button
                            onClick={handleClose}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-xl text-sm"
                        >
                            Zatvori
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            {REPORT_REASONS.map((r) => (
                                <label key={r.id} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="reason"
                                        value={r.id}
                                        checked={reason === r.id}
                                        onChange={() => setReason(r.id)}
                                    />
                                    {r.labelHr}
                                </label>
                            ))}
                        </div>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            maxLength={500}
                            placeholder="Dodatna napomena (neobavezno)"
                            rows={3}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-amber-400"
                        />
                        {status === 'error' && (
                            <p className="text-rose-400 text-xs">Slanje nije uspjelo. Pokušaj ponovno.</p>
                        )}
                        <button
                            type="submit"
                            disabled={status === 'sending'}
                            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl text-sm disabled:opacity-50"
                        >
                            {status === 'sending' ? 'Slanje...' : 'Pošalji prijavu'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
