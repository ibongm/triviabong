import CategoryCountsSection from './CategoryCountsSection';
import ManageQuestionsSection from './ManageQuestionsSection';
import UploadQuestionsSection from './UploadQuestionsSection';
import RegisteredUsersSection from './RegisteredUsersSection';
import LeaderboardsSection from './LeaderboardsSection';
import PublicProfilesSection from './PublicProfilesSection';

// Each section owns its own state and Firestore calls - they share nothing but
// the category list, so adding a new admin section means adding a file here and
// one line below, not threading more state through this component.
export default function AdminPanel({ onClose }) {
    return (
        <div className="bg-[#0b0f19] min-h-screen text-white p-6">
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

            <CategoryCountsSection />
            <ManageQuestionsSection />
            <UploadQuestionsSection />
            <RegisteredUsersSection />
            <LeaderboardsSection />
            <PublicProfilesSection />
        </div>
    );
}
