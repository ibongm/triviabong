import { useEffect, useMemo, useState } from 'react';
import { auth, getAllQuestionSubmissions, updateQuestionSubmissionStatus } from '../../services/firebase';
import { CATEGORY_META } from '../../data/categoryMeta';

const toMillis = (value) => {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.toDate === 'function') return value.toDate().getTime();
    return new Date(value).getTime() || 0;
};

// Admin review queue for player-proposed questions (Baza pitanja ->
// Predložena pitanja). Modeled on AdminReports.jsx's fetch-on-mount /
// per-row-action / busy+message structure. Approve reuses the existing
// /api/questions `action: 'add'` contract verbatim (a one-item questions
// array) - no server changes needed, since that endpoint already does
// admin-auth, re-validation, GitHub-commit merge, and dedup.
export default function AdminQuestionSubmissions() {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAll, setShowAll] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const [message, setMessage] = useState(null);

    const fetchSubmissions = async () => {
        setLoading(true);
        const data = await getAllQuestionSubmissions();
        setSubmissions(data);
        setLoading(false);
    };

    useEffect(() => {
        (async () => {
            await fetchSubmissions();
        })();
    }, []);

    const visible = useMemo(() => {
        let list = submissions;
        if (!showAll) list = list.filter((s) => s.status === 'pending');
        return [...list].sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
    }, [submissions, showAll]);

    const handleApprove = async (submission) => {
        setBusyId(submission.id);
        setMessage(null);
        try {
            const idToken = await auth.currentUser.getIdToken();
            const res = await fetch('/api/questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({
                    action: 'add',
                    category: submission.category,
                    questions: [{
                        question: submission.question,
                        correct_answer: submission.correct_answer,
                        incorrect_answers: submission.incorrect_answers,
                    }],
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setMessage({ type: 'error', text: data.error || 'Odobravanje nije uspjelo.' });
                return;
            }
            // added === 0 means the server-side dedup caught it as a duplicate
            // of an already-existing question - still resolve the queue entry
            // rather than leaving it stuck pending forever.
            await updateQuestionSubmissionStatus(submission.id, 'approved');
            await fetchSubmissions();
            setMessage({
                type: 'success',
                text: data.added > 0
                    ? `Pitanje dodano u kategoriju ${CATEGORY_META[submission.category]?.label || submission.category}.`
                    : 'Pitanje je već postojalo (duplikat) - prijava označena kao odobrena.',
                commitUrl: data.commitUrl,
            });
        } catch {
            setMessage({ type: 'error', text: 'Greška u mreži prilikom odobravanja.' });
        } finally {
            setBusyId(null);
        }
    };

    const handleReject = async (submission) => {
        setBusyId(submission.id);
        setMessage(null);
        try {
            await updateQuestionSubmissionStatus(submission.id, 'rejected');
            await fetchSubmissions();
            setMessage({ type: 'success', text: 'Prijedlog odbačen.' });
        } catch {
            setMessage({ type: 'error', text: 'Odbacivanje nije uspjelo.' });
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-semibold text-amber-400 flex items-center gap-2">
                    <span>📝</span> Predložena pitanja
                </h2>
                <button
                    type="button"
                    onClick={() => setShowAll((s) => !s)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-medium"
                >
                    {showAll ? 'Prikaži samo na čekanju' : 'Prikaži sve'}
                </button>
            </div>
            <p className="text-slate-400 text-sm mb-4">
                Pitanja koja su predložili igrači. Odobravanje ih odmah šalje u kategorijsku JSON datoteku (isti tok kao Dodaj Pitanja).
            </p>

            {message && (
                <div className={`text-sm rounded-lg p-3 mb-4 space-y-1 ${message.type === 'success' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-red-400 bg-red-500/10 border border-red-500/30'}`}>
                    <p>{message.text}</p>
                    {message.commitUrl && (
                        <p>
                            <a href={message.commitUrl} target="_blank" rel="noreferrer" className="underline">
                                Pogledaj commit na GitHubu
                            </a>
                            {' '}- stranica će se ponovno objaviti za ~1-2 minute.
                        </p>
                    )}
                </div>
            )}

            {loading ? (
                <p className="text-slate-400 text-sm">Učitavanje...</p>
            ) : visible.length === 0 ? (
                <p className="text-slate-500 text-sm">{showAll ? 'Nema prijedloga.' : 'Nema prijedloga na čekanju.'}</p>
            ) : (
                <div className="space-y-2">
                    {visible.map((s) => (
                        <div key={s.id} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs text-slate-500 mb-1">
                                        {CATEGORY_META[s.category]?.label || s.category}
                                        {s.uid && <span> · {s.uid}</span>}
                                        {s.status !== 'pending' && (
                                            <span className={s.status === 'approved' ? 'text-emerald-400' : 'text-rose-400'}> · {s.status === 'approved' ? 'odobreno' : 'odbačeno'}</span>
                                        )}
                                    </p>
                                    <p className="text-slate-200 text-sm">{s.question}</p>
                                    <p className="text-emerald-400 text-xs mt-1">✓ {s.correct_answer}</p>
                                    <p className="text-slate-500 text-xs">✗ {(s.incorrect_answers || []).join(' · ')}</p>
                                    {s.note && <p className="text-slate-500 text-xs mt-1 italic">{s.note}</p>}
                                </div>
                                {s.status === 'pending' && (
                                    <div className="flex gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => handleApprove(s)}
                                            disabled={busyId === s.id}
                                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-md text-xs font-medium disabled:opacity-40"
                                        >
                                            Odobri
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleReject(s)}
                                            disabled={busyId === s.id}
                                            className="bg-slate-800 hover:bg-slate-700 text-slate-400 px-2.5 py-1 rounded-md text-xs font-medium disabled:opacity-40"
                                        >
                                            Odbaci
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
