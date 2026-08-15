import { useState } from 'react';
import { PenSquare, X } from 'lucide-react';
import { PRIMARY_CATEGORIES } from '../data/categoryKeys';
import { validateEntry } from '../utils/questionMerge';
import { submitQuestionSubmission } from '../services/firebase';

const EMPTY_FORM = {
    category: PRIMARY_CATEGORIES[0].key,
    question: '',
    correct_answer: '',
    incorrect_answer_1: '',
    incorrect_answer_2: '',
    incorrect_answer_3: '',
    note: '',
};

// Player-facing "propose a new question" form, modeled on
// ReportQuestionModal.jsx's structure (isOpen/onClose, idle|sending|sent|error
// state machine, same modal chrome). Requires sign-in - App.jsx only opens
// this after LobbyScreen's entry point has already gated on currentUser,
// same pattern as the 1v1 Dvoboj card.
export default function SubmitQuestionModal({ isOpen, onClose, uid, onSubmitted }) {
    const [form, setForm] = useState(EMPTY_FORM);
    const [status, setStatus] = useState('idle'); // idle | sending | sent | error
    const [errorReason, setErrorReason] = useState('');

    if (!isOpen) return null;

    const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        const entry = {
            question: form.question.trim(),
            correct_answer: form.correct_answer.trim(),
            incorrect_answers: [form.incorrect_answer_1, form.incorrect_answer_2, form.incorrect_answer_3].map((a) => a.trim()),
        };

        const result = validateEntry(entry);
        if (!result.valid) {
            setStatus('error');
            setErrorReason(result.reason);
            return;
        }

        setStatus('sending');
        const ok = await submitQuestionSubmission({
            uid,
            category: form.category,
            ...entry,
            ...(form.note.trim() ? { note: form.note.trim().slice(0, 500) } : {}),
        });
        if (ok) {
            setStatus('sent');
            // Fires the SUBMIT_QUESTION daily-mission slot on successful
            // submission, not on later admin approval - see useDailyMissions.js
            // and the locked design decision this mirrors.
            onSubmitted?.();
        } else {
            setStatus('error');
            setErrorReason('Slanje nije uspjelo. Pokušaj ponovno.');
        }
    };

    const handleClose = () => {
        setForm(EMPTY_FORM);
        setStatus('idle');
        setErrorReason('');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                        <PenSquare className="w-4 h-4" /> Predloži pitanje
                    </h3>
                    <button onClick={handleClose} className="text-slate-500 hover:text-slate-300">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {status === 'sent' ? (
                    <div className="text-center py-4 space-y-3">
                        <p className="text-emerald-400 text-sm font-bold">Hvala, pitanje je poslano na pregled!</p>
                        <p className="text-slate-400 text-xs">Admin će ga provjeriti prije nego postane dio igre.</p>
                        <button
                            onClick={handleClose}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-xl text-sm"
                        >
                            Zatvori
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Kategorija</label>
                            <select
                                value={form.category}
                                onChange={update('category')}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                            >
                                {PRIMARY_CATEGORIES.map((c) => (
                                    <option key={c.key} value={c.key}>{c.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Pitanje</label>
                            <textarea
                                value={form.question}
                                onChange={update('question')}
                                maxLength={500}
                                rows={2}
                                required
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-amber-400"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Točan odgovor</label>
                            <input
                                type="text"
                                value={form.correct_answer}
                                onChange={update('correct_answer')}
                                maxLength={200}
                                required
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Netočni odgovori (3)</label>
                            <div className="space-y-2">
                                {['incorrect_answer_1', 'incorrect_answer_2', 'incorrect_answer_3'].map((field, i) => (
                                    <input
                                        key={field}
                                        type="text"
                                        value={form[field]}
                                        onChange={update(field)}
                                        maxLength={200}
                                        required
                                        placeholder={`Netočan odgovor ${i + 1}`}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                                    />
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Izvor / napomena (neobavezno)</label>
                            <textarea
                                value={form.note}
                                onChange={update('note')}
                                maxLength={500}
                                rows={2}
                                placeholder="Npr. link na izvor koji potvrđuje odgovor"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-amber-400"
                            />
                        </div>

                        {status === 'error' && (
                            <p className="text-rose-400 text-xs">{errorReason}</p>
                        )}

                        <button
                            type="submit"
                            disabled={status === 'sending'}
                            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl text-sm disabled:opacity-50"
                        >
                            {status === 'sending' ? 'Slanje...' : 'Pošalji pitanje'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
