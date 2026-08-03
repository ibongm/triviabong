// Success/error banner shared by every admin section. Takes the same
// { type, text, commitUrl } shape each section already stored in state.
// commitUrl is only set by the /api/questions writes (which commit to GitHub
// and then trigger a redeploy); the leaderboard/profile sections just omit it.
export default function AdminMessage({ message }) {
    if (!message) return null;

    const tone = message.type === 'success'
        ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
        : 'text-red-400 bg-red-500/10 border border-red-500/30';

    return (
        <div className={`text-sm rounded-lg p-3 mb-4 space-y-1 ${tone}`}>
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
    );
}
