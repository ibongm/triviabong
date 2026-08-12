import { useEffect, useMemo, useState } from 'react';
import { getAllReports, updateReportsStatusForQuestion } from '../../services/firebase';
import { getAllCategoryPacks } from '../../data/questionsLoader';
import { CATEGORY_META } from '../../data/categoryMeta';
import { reportReasonLabel } from '../../constants/reportReasons';

const toMillis = (value) => {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.toDate === 'function') return value.toDate().getTime();
    return new Date(value).getTime() || 0;
};

// onNavigateToQuestion: deep-link into Baza pitanja (see AdminPanel.jsx
// shell) - clicking a report jumps straight to that question, ready to
// edit or delete, per the original plan's cross-section requirement.
export default function AdminReports({ onNavigateToQuestion }) {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAll, setShowAll] = useState(false);
    const [busyQuestionId, setBusyQuestionId] = useState(null);
    const [message, setMessage] = useState(null);

    const fetchReports = async () => {
        setLoading(true);
        const data = await getAllReports();
        setReports(data);
        setLoading(false);
    };

    const [questionText, setQuestionText] = useState({});

    useEffect(() => {
        (async () => {
            await fetchReports();
        })();
    }, []);

    // id -> question text, built from the raw per-category packs (same
    // approach as AdminOverview - not getAllQuestions(), which dedupes by
    // normalized text and could drop an id).
    useEffect(() => {
        let cancelled = false;
        getAllCategoryPacks().then((packs) => {
            if (cancelled) return;
            const map = {};
            for (const pack of Object.values(packs)) {
                for (const q of pack) {
                    map[q.id] = q.question;
                }
            }
            setQuestionText(map);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    // Grouped by question - the admin fixes (or dismisses) the question
    // once, so every report against it should resolve together, not one
    // click per report. Most-recently-reported first.
    const groups = useMemo(() => {
        const byQuestion = {};
        for (const r of reports) {
            const entry = byQuestion[r.questionId] || {
                questionId: r.questionId,
                categoryId: r.categoryId,
                reportIds: [],
                reasons: {},
                latestMs: 0,
                pendingCount: 0,
            };
            entry.reportIds.push(r.id);
            entry.reasons[r.reason] = (entry.reasons[r.reason] || 0) + 1;
            const createdMs = toMillis(r.createdAt);
            if (createdMs > entry.latestMs) entry.latestMs = createdMs;
            if (r.status === 'pending') entry.pendingCount += 1;
            byQuestion[r.questionId] = entry;
        }
        let list = Object.values(byQuestion);
        if (!showAll) list = list.filter((g) => g.pendingCount > 0);
        return list.sort((a, b) => b.latestMs - a.latestMs);
    }, [reports, showAll]);

    const handleResolve = async (group, status) => {
        setBusyQuestionId(group.questionId);
        setMessage(null);
        try {
            await updateReportsStatusForQuestion(group.reportIds, status);
            await fetchReports();
            setMessage({
                type: 'success',
                text: `Pitanje ${group.questionId} označeno kao ${status === 'resolved' ? 'riješeno' : 'odbačeno'}.`,
            });
        } catch (err) {
            console.error('Greška pri ažuriranju prijava:', err);
            setMessage({ type: 'error', text: 'Ažuriranje nije uspjelo.' });
        } finally {
            setBusyQuestionId(null);
        }
    };

    return (
        <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-semibold text-amber-400 flex items-center gap-2">
                    <span>🚩</span> Prijave
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
                Prijave pitanja od igrača, grupirane po pitanju. Pitanje s niskom preciznošću (vidi Pregled) i prijavama zajedno je najjači signal da je pitanje loše.
            </p>

            {message && (
                <div className={`text-sm rounded-lg p-3 mb-4 ${message.type === 'success' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-red-400 bg-red-500/10 border border-red-500/30'}`}>
                    {message.text}
                </div>
            )}

            {loading ? (
                <p className="text-slate-400 text-sm">Učitavanje...</p>
            ) : groups.length === 0 ? (
                <p className="text-slate-500 text-sm">{showAll ? 'Nema prijava.' : 'Nema prijava na čekanju.'}</p>
            ) : (
                <div className="space-y-2">
                    {groups.map((g) => (
                        <div key={g.questionId} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-slate-200 text-sm truncate" title={questionText[g.questionId]}>
                                        {questionText[g.questionId] || g.questionId}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {CATEGORY_META[g.categoryId]?.label || g.categoryId} · {g.reportIds.length} prijava
                                        {g.pendingCount === 0 && <span className="text-emerald-400"> · riješeno</span>}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {Object.entries(g.reasons).map(([reason, count]) => `${reportReasonLabel(reason)} (${count})`).join(', ')}
                                    </p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => onNavigateToQuestion(g.categoryId, g.questionId)}
                                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-md text-xs font-medium"
                                    >
                                        Uredi pitanje
                                    </button>
                                    {g.pendingCount > 0 && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => handleResolve(g, 'resolved')}
                                                disabled={busyQuestionId === g.questionId}
                                                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-md text-xs font-medium disabled:opacity-40"
                                            >
                                                Riješi
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleResolve(g, 'dismissed')}
                                                disabled={busyQuestionId === g.questionId}
                                                className="bg-slate-800 hover:bg-slate-700 text-slate-400 px-2.5 py-1 rounded-md text-xs font-medium disabled:opacity-40"
                                            >
                                                Odbaci
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
