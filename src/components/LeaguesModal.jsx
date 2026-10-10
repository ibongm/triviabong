import { useEffect, useState } from 'react';
import { X, Users, Plus, KeyRound, ChevronRight, RefreshCw, Share2, Copy } from 'lucide-react';
import LeaguePage, { EmojiPicker } from './LeaguePage';
import { createLeague, joinLeague, lookupLeagueCode } from '../services/leagues';
import {
    normalizeLeagueCode, isValidLeagueCode, sanitizeLeagueName, buildLeagueLink,
    LEAGUE_EMOJIS, LEAGUE_NAME_MAX, LEAGUE_CODE_LENGTH, MAX_LEAGUES_PER_PLAYER, MAX_LEAGUE_MEMBERS,
} from '../utils/league';

const JOIN_ERRORS = {
    not_found: 'Liga s tim kodom ne postoji ili je vlasnik promijenio kod. Zatraži novi.',
    rejected: `Pridruživanje nije uspjelo - kod je možda promijenjen ili je liga puna (najviše ${MAX_LEAGUE_MEMBERS} igrača).`,
    already_member: 'Već si član ove lige.',
    limit: `Možeš biti u najviše ${MAX_LEAGUES_PER_PLAYER} liga.`,
    error: 'Nešto je pošlo po zlu. Pokušaj ponovno.',
};

function Shell({ onClose, children }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 relative max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">Lige</h2>
                            <p className="text-xs text-slate-400">Privatne ljestvice za tvoju ekipu</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors" aria-label="Zatvori">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

function CreatedPanel({ created, onOpen }) {
    const [message, setMessage] = useState(null);
    const link = buildLeagueLink(window.location.origin, created.code);
    const share = async () => {
        const text = `Pridruži se ligi „${created.name}" na KvizArena! Kod: ${created.code}`;
        try {
            if (navigator.share) {
                await navigator.share({ title: 'KvizArena liga', text, url: link });
                return;
            }
        } catch (error) {
            if (error?.name === 'AbortError') return;
        }
        try {
            await navigator.clipboard.writeText(`${text}\n${link}`);
            setMessage('Poveznica je kopirana.');
        } catch {
            setMessage(`Kopiraj ručno: ${link}`);
        }
    };
    return (
        <div className="space-y-4 text-center">
            <p className="text-3xl">{created.emoji}</p>
            <h3 className="text-lg font-black text-white">{created.name}</h3>
            <p className="text-sm text-slate-400">Liga je stvorena. Pošalji prijateljima kod ili poveznicu:</p>
            <p className="font-mono text-3xl font-black text-amber-400 tracking-widest">{created.code}</p>
            <div className="flex gap-2 justify-center">
                <button onClick={share} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-black">
                    <Share2 className="w-4 h-4" /> Podijeli
                </button>
                <button
                    onClick={async () => { try { await navigator.clipboard.writeText(created.code); setMessage('Kod je kopiran.'); } catch { setMessage(`Kod: ${created.code}`); } }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-bold"
                >
                    <Copy className="w-4 h-4" /> Kopiraj kod
                </button>
            </div>
            {message && <p className="text-xs font-bold text-emerald-400">{message}</p>}
            <button onClick={onOpen} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold py-3 rounded-xl text-sm border border-slate-700/80">
                Otvori ligu
            </button>
        </div>
    );
}

function CreateForm({ uid, myName, count, onCreated, onBack }) {
    const [name, setName] = useState('');
    const [emoji, setEmoji] = useState(LEAGUE_EMOJIS[0]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const result = await createLeague({ uid, memberName: myName, name, emoji, currentCount: count });
        setBusy(false);
        if (result.ok) onCreated(result);
        else setError(JOIN_ERRORS[result.reason] || JOIN_ERRORS.error);
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider" htmlFor="league-name">Ime lige</label>
                <input
                    id="league-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={LEAGUE_NAME_MAX}
                    placeholder="npr. Kviz klub"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/60"
                    autoFocus
                />
            </div>
            <div className="space-y-1.5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ikona</p>
                <EmojiPicker value={emoji} onChange={setEmoji} />
            </div>
            {error && <p className="text-xs font-bold text-red-400">{error}</p>}
            <div className="flex gap-2">
                <button type="button" onClick={onBack} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-xl text-sm">Natrag</button>
                <button
                    type="submit"
                    disabled={busy || !sanitizeLeagueName(name)}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black py-3 rounded-xl text-sm"
                >
                    {busy ? 'Stvaram...' : 'Stvori ligu'}
                </button>
            </div>
        </form>
    );
}

function JoinForm({ uid, myName, currentIds, initialCode, onJoined, onBack }) {
    const [code, setCode] = useState(initialCode || '');
    const [lookup, setLookup] = useState(null);
    // An invite link arrives with a valid code already filled in: start in the
    // "looking it up" state and resolve it once (below).
    const [busy, setBusy] = useState(!!initialCode);
    const [error, setError] = useState(null);

    const find = async (raw) => {
        const normalized = normalizeLeagueCode(raw);
        setCode(normalized);
        setLookup(null);
        setError(null);
        if (!isValidLeagueCode(normalized)) {
            setError(`Kod ima ${LEAGUE_CODE_LENGTH} znakova.`);
            return;
        }
        setBusy(true);
        const found = await lookupLeagueCode(normalized);
        setBusy(false);
        if (found) setLookup(found);
        else setError(JOIN_ERRORS.not_found);
    };

    useEffect(() => {
        if (!initialCode) return undefined;
        let cancelled = false;
        lookupLeagueCode(initialCode).then((found) => {
            if (cancelled) return;
            setBusy(false);
            if (found) setLookup(found);
            else setError(JOIN_ERRORS.not_found);
        });
        return () => { cancelled = true; };
    }, [initialCode]);

    const join = async () => {
        setBusy(true);
        setError(null);
        const result = await joinLeague({ uid, memberName: myName, code, lookup, currentIds });
        setBusy(false);
        if (result.ok) onJoined(result.leagueId);
        else setError(JOIN_ERRORS[result.reason] || JOIN_ERRORS.error);
    };

    return (
        <div className="space-y-4">
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider" htmlFor="league-code">Kod lige</label>
                <div className="flex gap-2">
                    <input
                        id="league-code"
                        value={code}
                        onChange={(e) => { setCode(normalizeLeagueCode(e.target.value).slice(0, LEAGUE_CODE_LENGTH)); setLookup(null); setError(null); }}
                        maxLength={LEAGUE_CODE_LENGTH + 2}
                        placeholder="ABC234"
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 font-mono text-lg tracking-widest text-white uppercase focus:outline-none focus:border-amber-500/60"
                        autoFocus={!initialCode}
                    />
                    <button
                        onClick={() => find(code)}
                        disabled={busy || code.length === 0}
                        className="px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-100 font-bold rounded-xl text-sm"
                    >
                        Pronađi
                    </button>
                </div>
            </div>
            {busy && !lookup && (
                <p className="text-xs text-slate-400 animate-pulse flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" /> Tražim ligu...</p>
            )}
            {lookup && (
                <div className="bg-slate-950/60 border border-amber-500/30 rounded-2xl p-4 text-center space-y-3">
                    <p className="text-3xl">{lookup.emoji}</p>
                    <p className="text-lg font-black text-white">{lookup.name}</p>
                    <button
                        onClick={join}
                        disabled={busy}
                        className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black py-3 rounded-xl text-sm"
                    >
                        {busy ? 'Pridružujem...' : 'Pridruži se'}
                    </button>
                </div>
            )}
            {error && <p className="text-xs font-bold text-red-400">{error}</p>}
            <button onClick={onBack} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-xl text-sm">Natrag</button>
        </div>
    );
}

// Mounted only while the modal is open, so each opening starts from the right
// view (a /liga/CODE link lands directly on "Pridruži se").
function LeaguesBody({
    onClose, currentUser, myName, leagues, loading, onRefresh, pendingCode, onClearPendingCode, onShowAuthModal,
    canChallenge, onChallengeMember,
}) {
    const uid = currentUser?.uid || null;
    const [view, setView] = useState(pendingCode ? 'join' : 'list');
    const [activeId, setActiveId] = useState(null);
    const [created, setCreated] = useState(null);

    const goList = () => { setView('list'); setActiveId(null); setCreated(null); onRefresh(); };
    const openLeague = (id) => { setActiveId(id); setView('league'); };

    if (!uid) {
        return (
            <Shell onClose={onClose}>
                <div className="text-center space-y-4 py-4">
                    <p className="text-sm text-slate-300">
                        {pendingCode ? 'Pozvan/a si u ligu! Za pridruživanje se prijavi.' : 'Lige su dostupne prijavljenim igračima.'}
                    </p>
                    <button onClick={onShowAuthModal} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-3 rounded-xl text-sm">
                        Prijavi se
                    </button>
                </div>
            </Shell>
        );
    }

    return (
        <Shell onClose={onClose}>
            {view === 'list' && (
                <div className="space-y-3">
                    {loading && leagues.length === 0 ? (
                        <p className="p-4 text-sm text-slate-400 animate-pulse text-center">Učitavanje...</p>
                    ) : leagues.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-3">Još nisi ni u jednoj ligi. Stvori svoju ili se pridruži kodom.</p>
                    ) : (
                        <ul className="space-y-2">
                            {leagues.map((l) => (
                                <li key={l.id}>
                                    <button
                                        onClick={() => openLeague(l.id)}
                                        className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-800 bg-slate-950/60 hover:border-amber-500/40 transition-colors"
                                    >
                                        <span className="flex items-center gap-3 min-w-0">
                                            <span className="text-2xl">{l.emoji}</span>
                                            <span className="font-bold text-slate-100 truncate">{l.name}</span>
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                            onClick={() => setView('create')}
                            disabled={leagues.length >= MAX_LEAGUES_PER_PLAYER}
                            className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black py-3 rounded-xl text-sm"
                        >
                            <Plus className="w-4 h-4" /> Nova liga
                        </button>
                        <button
                            onClick={() => setView('join')}
                            disabled={leagues.length >= MAX_LEAGUES_PER_PLAYER}
                            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-100 font-bold py-3 rounded-xl text-sm"
                        >
                            <KeyRound className="w-4 h-4" /> Pridruži se kodom
                        </button>
                    </div>
                    {leagues.length >= MAX_LEAGUES_PER_PLAYER && (
                        <p className="text-xs text-slate-500 text-center">Možeš biti u najviše {MAX_LEAGUES_PER_PLAYER} liga.</p>
                    )}
                </div>
            )}

            {view === 'create' && !created && (
                <CreateForm
                    uid={uid}
                    myName={myName}
                    count={leagues.length}
                    onBack={goList}
                    onCreated={(result) => { setCreated(result); onRefresh(); }}
                />
            )}
            {view === 'create' && created && (
                <CreatedPanel created={created} onOpen={() => openLeague(created.leagueId)} />
            )}

            {view === 'join' && (
                <JoinForm
                    uid={uid}
                    myName={myName}
                    currentIds={leagues.map((l) => l.id)}
                    initialCode={pendingCode}
                    onBack={() => { onClearPendingCode(); goList(); }}
                    onJoined={(id) => { onClearPendingCode(); onRefresh(); openLeague(id); }}
                />
            )}

            {view === 'league' && activeId && (
                <LeaguePage
                    leagueId={activeId}
                    uid={uid}
                    myIndex={leagues.find((l) => l.id === activeId)}
                    onBack={goList}
                    onLeft={goList}
                    canChallenge={canChallenge}
                    onChallengeMember={onChallengeMember}
                />
            )}
        </Shell>
    );
}

export default function LeaguesModal({ isOpen, ...rest }) {
    if (!isOpen) return null;
    return <LeaguesBody {...rest} />;
}
