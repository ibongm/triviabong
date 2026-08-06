import { useState } from 'react';
import AdminOverview from './admin/AdminOverview';
import AdminPlayers from './admin/AdminPlayers';
import AdminQuestions from './admin/AdminQuestions';
import AdminLeaderboardsProfiles from './admin/AdminLeaderboardsProfiles';
import AdminReports from './admin/AdminReports';

// Thin shell: owns section navigation plus the one piece of cross-section
// state the original plan called for - a report clicked in Prijave must
// deep-link into Baza pitanja filtered to that exact question. Each
// section still otherwise manages its own data/state independently (see
// src/components/admin/*.jsx) - switching tabs unmounts the previous
// section, so leaving and returning to a tab re-fetches fresh data rather
// than caching stale state across the visit.
const SECTIONS = [
    { key: 'overview', label: 'Pregled', icon: '📈' },
    { key: 'players', label: 'Igrači', icon: '👥' },
    { key: 'questions', label: 'Baza pitanja', icon: '📚' },
    { key: 'leaderboards', label: 'Ljestvice / Profili', icon: '🏆' },
    { key: 'reports', label: 'Prijave', icon: '🚩' },
];

export default function AdminPanel({ onClose }) {
    const [activeSection, setActiveSection] = useState('overview');
    const [questionFilter, setQuestionFilter] = useState(null);

    const navigateToQuestion = (categoryId, questionId) => {
        setQuestionFilter({ categoryId, questionId });
        setActiveSection('questions');
    };

    return (
        <div className="bg-[#0b0f19] min-h-screen text-white p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
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

            {/* Section nav */}
            <nav className="flex flex-wrap gap-2 mb-8">
                {SECTIONS.map((s) => (
                    <button
                        key={s.key}
                        type="button"
                        onClick={() => setActiveSection(s.key)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                            s.key === activeSection
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-[#121824] text-slate-300 border border-slate-800 hover:bg-slate-800'
                        }`}
                    >
                        <span>{s.icon}</span>
                        <span>{s.label}</span>
                    </button>
                ))}
            </nav>

            {activeSection === 'overview' && <AdminOverview />}
            {activeSection === 'players' && <AdminPlayers />}
            {activeSection === 'questions' && (
                <AdminQuestions
                    initialFilter={questionFilter}
                    onFilterConsumed={() => setQuestionFilter(null)}
                />
            )}
            {activeSection === 'leaderboards' && <AdminLeaderboardsProfiles />}
            {activeSection === 'reports' && <AdminReports onNavigateToQuestion={navigateToQuestion} />}
        </div>
    );
}
