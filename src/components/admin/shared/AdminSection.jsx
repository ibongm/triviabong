// The card shell every admin section renders. `action` is the optional
// top-right button slot (used by the leaderboard and public-profile sections);
// `description` is the explanatory paragraph under the heading.
export default function AdminSection({ icon, title, description, action, children }) {
    return (
        <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6 mb-8">
            {/* Sections without a description carry the heading's own bottom
                margin instead, so both shapes leave the same gap above the body. */}
            <div className={`flex items-center justify-between ${description ? 'mb-1' : 'mb-4'}`}>
                <h2 className="text-lg font-semibold text-amber-400 flex items-center gap-2">
                    <span>{icon}</span> {title}
                </h2>
                {action}
            </div>
            {description && (
                <p className="text-slate-400 text-sm mb-4">{description}</p>
            )}
            {children}
        </div>
    );
}
