import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Crown, Share2, Copy, RefreshCw, Swords, Settings, LogOut, UserMinus, KeyRound } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import {
    loadLeaguePage, updateLeagueDetails, regenerateLeagueCode, kickMember, leaveLeague,
    syncLeagueIndex, removeLeagueIndex,
} from '../services/leagues';
import {
    buildWeeklyTable, buildDailyRanking, lastWeekWinners, buildLeagueLink, formatLastPlayed,
    sanitizeLeagueName, LEAGUE_EMOJIS, LEAGUE_NAME_MAX, MAX_LEAGUE_MEMBERS,
} from '../utils/league';
import { weekKeyFor, addWeeks, zagrebDateKey, msUntilWeekEnd, formatWeekCountdown } from '../utils/periods';

const FAILURE_COPY = {
    not_member: 'Više nisi član ove lige (uklonjen/a si ili je liga obrisana).',
    gone: 'Ova liga više ne postoji.',
    error: 'Liga se nije mogla učitati. Pokušaj ponovno.',
};

function EmojiPicker({ value, onChange }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {LEAGUE_EMOJIS.map((e) => (
                <button
                    key={e}
                    type="button"
                    onClick={() => onChange(e)}
                    className={`w-9 h-9 rounded-xl text-lg border transition-colors ${value === e ? 'bg-amber-500/20 border-amber-500/60' : 'bg-slate-950 border-slate-800 hover:border-slate-600'}`}
                >
                    {e}
                </button>
            ))}
        </div>
    );
}

export { EmojiPicker };

/**
 * One league: weekly table (members with no score yet at the bottom), today's
 * Daily Challenge mini-ranking, last week's crown, the invite code/link, a
 * challenge button per member and - for the owner - settings. Everything
 * comes from one cached `loadLeaguePage` fetch.
 */
export default function LeaguePage({ leagueId, uid, myIndex, onBack, onLeft, canChallenge, onChallengeMember }) {
    // Wall-clock snapshots taken once per mount (render stays pure).
    const [nowMs] = useState(() => Date.now());
    const weekKey = useMemo(() => weekKeyFor(new Date(nowMs)), [nowMs]);
    const previousWeekKey = useMemo(() => addWeeks(weekKey, -1), [weekKey]);
    const dateKey = useMemo(() => zagrebDateKey(new Date(nowMs)), [nowMs]);

    const [page, setPage] = useState(null);
    const [reloadToken, setReloadToken] = useState(0);
    const [tab, setTab] = useState('week');
    const [message, setMessage] = useState(null);
    const [busy, setBusy] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [nameDraft, setNameDraft] = useState('');
    const [emojiDraft, setEmojiDraft] = useState(LEAGUE_EMOJIS[0]);
    const [confirm, setConfirm] = useState(null); // { type: 'leave' | 'kick' | 'code', member? }

    useEffect(() => {
        let cancelled = false;
        loadLeaguePage({ leagueId, weekKey, previousWeekKey, dateKey, force: reloadToken > 0 })
            .then((result) => {
                if (cancelled) return;
                setPage(result);
                if (result.status === 'ok') {
                    setNameDraft(result.league.name);
                    setEmojiDraft(result.league.emoji);
                    syncLeagueIndex({ uid, league: result.league, myIndex });
                }
            });
        return () => { cancelled = true; };
        // myIndex only seeds the one-off index sync; it must not retrigger the fetch.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [leagueId, weekKey, previousWeekKey, dateKey, reloadToken, uid]);

    const reload = () => { setPage(null); setReloadToken((n) => n + 1); };

    const ok = page?.status === 'ok' ? page : null;
    const league = ok?.league;
    const isOwner = !!league && league.ownerUid === uid;

    const table = useMemo(() => (ok ? buildWeeklyTable(ok.members, ok.weekly) : []), [ok]);
    const daily = useMemo(() => (ok ? buildDailyRanking(ok.members, ok.daily) : []), [ok]);
    const crowned = useMemo(() => new Set(ok ? lastWeekWinners(ok.members, ok.previous) : []), [ok]);

    const link = league ? buildLeagueLink(window.location.origin, league.code) : '';

    const share = async () => {
        const text = `Pridruži se ligi „${league.name}" na KvizArena! Kod: ${league.code}`;
        try {
            if (navigator.share) {
                await navigator.share({ title: 'KvizArena liga', text, url: link });
                return;
            }
        } catch (error) {
            if (error?.name === 'AbortError') return; // the person closed the share sheet
        }
        try {
            await navigator.clipboard.writeText(`${text}\n${link}`);
            setMessage({ type: 'success', text: 'Poveznica je kopirana.' });
        } catch {
            setMessage({ type: 'error', text: `Kopiraj ručno: ${link}` });
        }
    };

    const copyCode = async () => {
        try {
            await navigator.clipboard.writeText(league.code);
            setMessage({ type: 'success', text: 'Kod je kopiran.' });
        } catch {
            setMessage({ type: 'error', text: `Kod: ${league.code}` });
        }
    };

    const saveDetails = async () => {
        setBusy(true);
        const result = await updateLeagueDetails({ league, name: nameDraft, emoji: emojiDraft });
        setBusy(false);
        if (result.ok) {
            setMessage({ type: 'success', text: 'Liga je spremljena.' });
            setSettingsOpen(false);
            reload();
        } else {
            setMessage({ type: 'error', text: 'Spremanje nije uspjelo. Pokušaj ponovno.' });
        }
    };

    const runConfirmed = async () => {
        const action = confirm;
        setConfirm(null);
        if (!action) return;
        setBusy(true);
        if (action.type === 'code') {
            const result = await regenerateLeagueCode({ league });
            setMessage(result.ok
                ? { type: 'success', text: 'Novi kod je spreman. Stare poveznice više ne rade.' }
                : { type: 'error', text: 'Novi kod nije napravljen. Pokušaj ponovno.' });
            if (result.ok) reload();
        } else if (action.type === 'kick') {
            const result = await kickMember({ league, memberUid: action.member.uid });
            setMessage(result.ok
                ? { type: 'success', text: `${action.member.name} je uklonjen/a iz lige.` }
                : { type: 'error', text: 'Uklanjanje nije uspjelo.' });
            if (result.ok) reload();
        } else if (action.type === 'leave') {
            const result = await leaveLeague({ uid, league, members: ok.members });
            if (result.ok) {
                onLeft(league.id);
                setBusy(false);
                return;
            }
            setMessage({ type: 'error', text: 'Napuštanje nije uspjelo. Pokušaj ponovno.' });
        }
        setBusy(false);
    };

    const dropBrokenLeague = async () => {
        await removeLeagueIndex(uid, leagueId);
        onLeft(leagueId);
    };

    if (!page) {
        return (
            <div className="p-8 text-slate-400 text-sm animate-pulse flex justify-center items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                <span>Učitavanje lige...</span>
            </div>
        );
    }

    if (!ok) {
        return (
            <div className="space-y-4 text-center">
                <p className="text-sm text-slate-300">{FAILURE_COPY[page.status] || FAILURE_COPY.error}</p>
                {page.status === 'error' ? (
                    <button onClick={reload} className="bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm">Pokušaj ponovno</button>
                ) : (
                    <button onClick={dropBrokenLeague} className="bg-slate-800 text-slate-100 font-bold px-4 py-2 rounded-xl text-sm">Ukloni s popisa</button>
                )}
                <div><button onClick={onBack} className="text-xs text-slate-400 hover:text-white">← Natrag</button></div>
            </div>
        );
    }

    const lastMember = ok.members.length <= 1;
    const confirmCopy = {
        leave: lastMember
            ? { title: 'Obrisati ligu?', message: 'Ti si zadnji član. Napuštanjem se liga briše.', label: 'Obriši ligu' }
            : { title: 'Napustiti ligu?', message: isOwner ? 'Vlasništvo prelazi na člana koji je najduže u ligi.' : 'Možeš se vratiti samo s važećim kodom.', label: 'Napusti' },
        kick: { title: 'Ukloniti člana?', message: confirm?.member ? `${confirm.member.name} više neće vidjeti ligu.` : '', label: 'Ukloni' },
        code: { title: 'Novi kod?', message: 'Stari kod i sve stare poveznice prestaju raditi. Postojeći članovi ostaju.', label: 'Generiraj' },
    }[confirm?.type || 'leave'];

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl" aria-label="Natrag">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                    <h3 className="text-lg font-black text-white truncate">{league.emoji} {league.name}</h3>
                    <p className="text-xs text-slate-400">
                        {ok.members.length}/{MAX_LEAGUE_MEMBERS} članova · tjedan završava za {formatWeekCountdown(msUntilWeekEnd(nowMs))}
                    </p>
                </div>
            </div>

            {message && (
                <p className={`text-xs font-bold text-center ${message.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>{message.text}</p>
            )}

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Kod lige</p>
                    <p className="font-mono text-lg font-black text-amber-400 tracking-widest">{league.code}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                    <button onClick={copyCode} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200" aria-label="Kopiraj kod"><Copy className="w-4 h-4" /></button>
                    <button onClick={share} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black">
                        <Share2 className="w-4 h-4" /> Podijeli
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-1 bg-slate-950/60 border border-slate-800 rounded-xl p-1" role="tablist">
                {[['week', 'Ovaj tjedan'], ['day', 'Dnevni izazov']].map(([key, label]) => (
                    <button
                        key={key}
                        role="tab"
                        aria-selected={tab === key}
                        onClick={() => setTab(key)}
                        className={`py-2 rounded-lg text-xs font-bold ${tab === key ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {tab === 'week' ? (
                <ol className="space-y-1">
                    {table.map((row) => {
                        const isMe = row.uid === uid;
                        const last = formatLastPlayed(row.lastPlayedMs, nowMs);
                        const member = ok.members.find((m) => m.uid === row.uid);
                        return (
                            <li key={row.uid} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isMe ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-slate-950/40'}`}>
                                <span className={`text-xs font-extrabold w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${row.rank === 1 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                                    {row.rank ?? '–'}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-slate-200 font-semibold flex items-center gap-1">
                                        {crowned.has(row.uid) && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-label="Pobjednik prošlog tjedna" />}
                                        <span className="truncate">{row.name}{isMe ? ' (ti)' : ''}</span>
                                    </p>
                                    <p className="text-[11px] text-slate-500">{last ? `zadnja igra ${last}` : 'još nije igrao/la ovaj tjedan'}</p>
                                </div>
                                <span className="text-amber-400 font-bold shrink-0">{row.total}</span>
                                {canChallenge && !isMe && (
                                    <button
                                        onClick={() => onChallengeMember({ uid: row.uid, name: row.name })}
                                        className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 shrink-0"
                                        aria-label={`Izazovi ${row.name}`}
                                    >
                                        <Swords className="w-4 h-4" />
                                    </button>
                                )}
                                {isOwner && !isMe && member && (
                                    <button
                                        onClick={() => setConfirm({ type: 'kick', member: { uid: row.uid, name: row.name } })}
                                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 shrink-0"
                                        aria-label={`Ukloni ${row.name}`}
                                    >
                                        <UserMinus className="w-4 h-4" />
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ol>
            ) : (
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-2">
                    {daily.length === 0 ? (
                        <p className="p-4 text-xs text-slate-500 text-center">Nitko iz lige još nije odigrao današnji Dnevni izazov.</p>
                    ) : (
                        <ol className="space-y-1">
                            {daily.map((row) => (
                                <li key={row.uid} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${row.uid === uid ? 'bg-amber-500/10 border border-amber-500/30' : ''}`}>
                                    <span className="text-xs font-extrabold w-7 h-7 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center">{row.rank}</span>
                                    <span className="truncate text-slate-200 font-semibold flex-1">{row.name}{row.uid === uid ? ' (ti)' : ''}</span>
                                    <span className="text-amber-400 font-bold">{row.score}</span>
                                </li>
                            ))}
                        </ol>
                    )}
                </div>
            )}

            {isOwner && (
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 space-y-3">
                    <button onClick={() => setSettingsOpen((o) => !o)} className="w-full flex items-center justify-between text-sm font-bold text-slate-300">
                        <span className="flex items-center gap-2"><Settings className="w-4 h-4 text-amber-400" /> Postavke lige</span>
                        <span className="text-xs text-slate-500">{settingsOpen ? 'Sakrij' : 'Prikaži'}</span>
                    </button>
                    {settingsOpen && (
                        <div className="space-y-3">
                            <input
                                value={nameDraft}
                                onChange={(e) => setNameDraft(e.target.value)}
                                maxLength={LEAGUE_NAME_MAX}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/60"
                                aria-label="Ime lige"
                            />
                            <EmojiPicker value={emojiDraft} onChange={setEmojiDraft} />
                            <div className="flex gap-2">
                                <button
                                    onClick={saveDetails}
                                    disabled={busy || !sanitizeLeagueName(nameDraft)}
                                    className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black py-2 rounded-xl text-sm"
                                >
                                    Spremi
                                </button>
                                <button
                                    onClick={() => setConfirm({ type: 'code' })}
                                    disabled={busy}
                                    className="flex items-center justify-center gap-1.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-100 font-bold rounded-xl text-sm"
                                >
                                    <KeyRound className="w-4 h-4" /> Novi kod
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <button
                onClick={() => setConfirm({ type: 'leave' })}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-red-400 py-2"
            >
                <LogOut className="w-4 h-4" /> {lastMember ? 'Obriši ligu' : 'Napusti ligu'}
            </button>

            <ConfirmModal
                isOpen={!!confirm}
                onClose={() => setConfirm(null)}
                onConfirm={runConfirmed}
                title={confirmCopy.title}
                message={confirmCopy.message}
                confirmLabel={confirmCopy.label}
            />
        </div>
    );
}
