import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Heart, Trophy, Zap, RefreshCw, Flame, Award, ChevronRight, HelpCircle,
  Scissors, FastForward, Clock, Crown, Coins, User, LogOut, ShieldCheck, Play, Star, Medal, Flag, CalendarDays, Swords
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getQuestionsByCategory, getAllCategories } from './data/questionsLoader';
import { getDailyChallengeQuestions } from './utils/dailySeed';
import { resolveCategoryKey } from './data/categoryKeys';
import { CATEGORY_META } from './data/categoryMeta';
import { DEFAULT_GLOBAL_STATS } from './constants/defaultGlobalStats';
import {
  MAX_LIVES,
  QUESTIONS_PER_ROUND,
  QUESTION_TIME_SECONDS,
  PLUS_TEN_SECONDS,
  BASE_SCORE,
  SPEED_BONUS_PER_SECOND,
  STREAK_MULTIPLIER_STEP,
  XP_PER_CORRECT_ANSWER,
  PERFECT_ROUND_XP_BONUS,
  COIN_STREAK_BONUS_INTERVAL,
  COIN_STREAK_BONUS_AMOUNT,
  COIN_PER_ROUND_COMPLETE,
  COIN_PERFECT_ROUND_BONUS,
  COIN_LEVEL_UP_BONUS,
  JOKER_COSTS
} from './constants/gameBalance';
import { computeLevelFromXp } from './utils/leveling';
import { evaluateAchievements, mergeUnlockedAchievements, computeDayStreakUpdate, mentionsHarryPotter, getZagrebDateString } from './utils/achievements';
import { ACHIEVEMENTS, SVI_SMO_MI_MARIJA_ID } from './constants/achievements';
import { mergeMonotonicStats } from './utils/statsMerge';
import { loadStats, saveStats, migrateStats, getStorageKey } from './services/statsStore';
import { sound } from './utils/sound';
import { sanitizeDisplayName } from './utils/publicProfile';
const AdminPanel = React.lazy(() => import('./components/AdminPanel'));
import AuthModal from './components/AuthModal';
import StatsModal from './components/StatsModal';
import GuideModal from './components/GuideModal';
import AchievementsModal from './components/AchievementsModal';
import RekordiModal from './components/RekordiModal';
import RekordiBoards from './components/RekordiBoards';
import SecretAchievementOverlay from './components/SecretAchievementOverlay';
import ReportQuestionModal from './components/ReportQuestionModal';
import TimerRing from './components/TimerRing';
import { applyAnswer } from './utils/gameLogic';
import { useGameRound } from './hooks/useGameRound';
import { useSessionTracking } from './hooks/useSessionTracking';
import { usePresence } from './hooks/usePresence';
import { filterOnlinePlayers } from './components/OnlinePlayersList';
import OnlinePlayersModal from './components/OnlinePlayersModal';
import MatchInviteModal from './components/MatchInviteModal';
import MatchView from './components/MatchView';
import {
  sendMatchInvite,
  subscribeToIncomingInvites,
  subscribeToSentInvite,
  subscribeToMatchByInviteId,
  createMatch,
  writeMatchHistoryEntry,
} from './services/matches';
import { shuffleArray } from './utils/questionUtils';
import {
  auth,
  logoutUser,
  getUserStatsFromFirestore,
  syncUserStatsToFirestore,
  syncPublicProfile,
  saveScoreToFirestore,
  getLeaderboardFromFirestore,
  getPublicProfileLeaderboard,
  getBestScoresAcrossCategories,
  getFastestPerfectRounds,
  logQuestionAttempt,
  logGameResult,
  getDailyAttemptStatus,
  startDailyAttempt,
  submitDailyScore,
  getDailyLeaderboard,
  getDailyMeta,
  deletePresence,
  subscribeToOnlinePlayers
} from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const ADMIN_EMAIL = 'ivanm.ploce@gmail.com';

const isAdminPath = () => {
  const path = window.location.pathname;
  return path === '/admin' || path === '/admin/';
};

// Firestore's leaderboard/publicProfiles rules cap name/displayName at 20
// chars - without the slice, a long email local-part (no displayName set)
// gets silently rejected by the rules ("Missing or insufficient permissions")
// rather than truncated, so both writes that ever reach Firestore quietly fail.
// Delegates to the shared sanitizer so this and the publicProfiles write path
// in services/firebase.js can't drift to different bounds.
const getPlayerDisplayName = (user) => sanitizeDisplayName(user);

// Short beat between answering and the secret-achievement overlay, so the
// green "correct" highlight registers before the overlay covers the board.
const SECRET_REVEAL_DELAY_MS = 700;

const DEFAULT_CATEGORY_COLOR = { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', hoverBorder: 'hover:border-amber-500/50', groupHoverText: 'group-hover:text-amber-400' };

const getCategoryDetails = (catKey) => {
  const resolvedKey = resolveCategoryKey(catKey);
  return CATEGORY_META[resolvedKey] || {
    label: catKey ? catKey.replace(/_/g, ' ') : 'Kategorija',
    icon: HelpCircle,
    color: DEFAULT_CATEGORY_COLOR
  };
};

const checkIsCorrect = (q, option) => {
  if (!q || option === undefined) return false;
  const correct = String(q.correct_answer || q.correctAnswer || '').trim().toLowerCase();
  return String(option).trim().toLowerCase() === correct;
};

export default function App() {
  const [gameState, setGameState] = useState('LOBBY');
  const [selectedCategory, setSelectedCategory] = useState(null);

  const {
    questions,
    setQuestions,
    currentIndex,
    setCurrentIndex,
    currentQ,
    currentShuffledOptions,
    selectedOption,
    setSelectedOption,
    answerLocked,
    score,
    setScore,
    lives,
    setLives,
    streak,
    setStreak,
    correctInRound,
    setCorrectInRound,
    timeLeft,
    setTimeLeft,
    jokersUsed,
    setJokersUsed,
    hiddenOptions,
    setHiddenOptions,
    jokerMessage,
    showJokerMessage,
    roundStartTime,
    setRoundStartTime,
    fastAnswerStreak,
    setFastAnswerStreak,
    fiftyFiftyUsedOnIndex,
    setFiftyFiftyUsedOnIndex,
    skipUsedAtLastLife,
    setSkipUsedAtLastLife,
    clearRoundTransitionTimers,
    clearJokerMessageTimer,
    roundTransitionTimerRef,
    gameOverTimerRef
  } = useGameRound();

  // Bumped on every selectCategory() call so an in-flight fetch from a
  // superseded call (rapid category switching) can detect it lost the
  // race instead of overwriting the current category's leaderboard.
  const categoryFetchIdRef = useRef(0);

  const [globalStats, setGlobalStats] = useState(() => loadStats(null));

  // Secret-achievement reveal. The round is paused while this is set: the
  // countdown already stopped when the answer was selected, and the deferred
  // "advance to next question" work sits in pendingAdvanceRef until the
  // player dismisses the overlay. secretCelebratedRef is mount-scoped (NOT
  // reset per round) so the reveal can't replay within a session.
  const [secretAchievement, setSecretAchievement] = useState(null);
  const pendingAdvanceRef = useRef(null);
  const secretCelebratedRef = useRef(false);
  const secretRevealTimer = useRef(null);
  const secretPausedAtRef = useRef(null);

  useEffect(() => () => clearTimeout(secretRevealTimer.current), []);

  const [leaderboards, setLeaderboards] = useState(() => {
    const saved = localStorage.getItem('triviabong_leaderboards');
    return saved ? JSON.parse(saved) : {};
  });
  const [activeCategoryLeaderboard, setActiveCategoryLeaderboard] = useState([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  // Daily Challenge: dailyChallengeMode gates the shared PLAYING/GAMEOVER/
  // VICTORY render blocks and save-score effect toward the daily submission
  // path instead of the normal per-category one (selectedCategory stays
  // null throughout a daily round). One free attempt per Zagreb calendar
  // day - dailyDateKey is captured at round start and carried through to
  // submitDailyScore at round end. dailyAttemptStatus powers the lobby's
  // "already played today" state; dailySubmitResult is the post-round rank.
  const [dailyChallengeMode, setDailyChallengeMode] = useState(false);
  const [dailyDateKey, setDailyDateKey] = useState(null);
  const [dailyAttemptStatus, setDailyAttemptStatus] = useState(null);
  const [dailySubmitResult, setDailySubmitResult] = useState(null);
  const [dailyLeaderboard, setDailyLeaderboard] = useState([]);
  // Separate from jokerMessage/showJokerMessage - that one only renders
  // inside the PLAYING screen, but a blocked daily attempt (cap reached,
  // insufficient coins) is discovered from the LOBBY, before a round starts.
  const [dailyLobbyMessage, setDailyLobbyMessage] = useState(null);
  // "You won yesterday's Daily Challenge" banner - checked once per login
  // against dailyMeta/{yesterday}, which only api/daily-challenge-payout.js
  // (Admin SDK) ever writes. Dismissal is tracked in localStorage (keyed by
  // date+uid) rather than any Firestore write, since it's purely cosmetic -
  // no server needs to know a player has seen their own win announcement.
  const [dailyWinAnnouncement, setDailyWinAnnouncement] = useState(null);
  const dailyLobbyMessageTimer = useRef(null);
  const showDailyLobbyMessage = (text) => {
    clearTimeout(dailyLobbyMessageTimer.current);
    setDailyLobbyMessage(text);
    dailyLobbyMessageTimer.current = setTimeout(() => setDailyLobbyMessage(null), 3000);
  };
  useEffect(() => () => clearTimeout(dailyLobbyMessageTimer.current), []);

  const [nickname, setNickname] = useState('');
  const [scoreSaved, setScoreSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveFailed, setAutoSaveFailed] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [showRekordiModal, setShowRekordiModal] = useState(false);
  const [showOnlinePlayersModal, setShowOnlinePlayersModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  // Fetched once on app mount (not re-fetched on every LOBBY visit within
  // the same session - getFastestPerfectRounds/getBestScoresAcrossCategories
  // read every category's leaderboard, so refetching constantly would be
  // wasteful) and refreshed after a score save so a player's own new record
  // shows up promptly. Powers both the compact lobby preview and the full
  // RekordiModal, which is why the fetch can't be deferred until the modal
  // actually opens.
  const [rekordiData, setRekordiData] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Admin-only beta-insights instrumentation (see hooks/useSessionTracking.js)
  // - a no-op while signed out.
  useSessionTracking(currentUser?.uid, gameState);

  // Publicly-visible online-players presence (see hooks/usePresence.js) -
  // also a no-op while signed out.
  // getPlayerDisplayName (not raw currentUser.displayName) - an
  // email/password account with no Google profile has a null Auth
  // displayName, which would otherwise fall through to upsertPresence's
  // generic 'Igrač' fallback for every such player, making the online list
  // useless for telling them apart. Matches the fallback already used for
  // publicProfiles sync and match invites (email local-part, then 'Igrač').
  usePresence(currentUser?.uid, getPlayerDisplayName(currentUser), globalStats.level, gameState);

  // Lightweight count-only subscription for the lobby's "1v1 Dvoboj" CTA
  // subtitle - OnlinePlayersList does its own identical subscription for
  // the full list, but that only mounts once the OnlinePlayersModal is
  // open, so the CTA needs this separately to show a live count up front.
  const [onlinePlayersCount, setOnlinePlayersCount] = useState(0);
  useEffect(() => {
    if (!currentUser?.uid) return undefined;
    const unsubscribe = subscribeToOnlinePlayers((players) => {
      setOnlinePlayersCount(filterOnlinePlayers(players, currentUser.uid, Date.now()).length);
    });
    return () => {
      unsubscribe();
      setOnlinePlayersCount(0);
    };
  }, [currentUser?.uid]);

  // --- Plan B: 1v1 live invite state ---
  // Pending invites addressed to ME (shows MatchInviteModal for the oldest).
  const [incomingInvites, setIncomingInvites] = useState([]);
  // The invite I just SENT, while waiting for the other player to respond -
  // only the sender needs this (to detect 'accepted' and create the match).
  const [sentInvite, setSentInvite] = useState(null);
  // The match currently being played, if any - non-null switches the main
  // render area over to <MatchView>, a fully separate tree from the normal
  // gameState machine (see Plan B - a new top-level mode, not woven into
  // the existing single-player state machine).
  const [activeMatchId, setActiveMatchId] = useState(null);
  // Guards against creating the match doc twice if subscribeToSentInvite
  // fires more than once for the same accepted invite (e.g. a reconnect).
  const matchCreatedForInviteRef = useRef(null);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsubscribe = subscribeToIncomingInvites(currentUser.uid, setIncomingInvites);
    // On sign-out (or switching accounts), drop whatever the previous
    // subscription had loaded rather than leaving a stale invite visible -
    // done in the cleanup, not the effect body, since a cleanup function is
    // exactly where an external subscription is meant to be torn down.
    return () => {
      unsubscribe();
      setIncomingInvites([]);
    };
  }, [currentUser?.uid]);

  // Sender side: watch the invite I sent. Once it's accepted, create the
  // match (only the host/player1 may, per firestore.rules) and switch into
  // it. If declined/expired, just clear it so the "waiting" UI clears too.
  useEffect(() => {
    if (!sentInvite?.id) return;
    const unsubscribe = subscribeToSentInvite(sentInvite.id, async (invite) => {
      if (!invite) return;
      if (invite.status === 'accepted' && matchCreatedForInviteRef.current !== invite.id) {
        let matchId = await createMatch(invite);
        if (!matchId) {
          await new Promise(r => setTimeout(r, 500));
          matchId = await createMatch(invite);
        }
        if (matchId) {
          matchCreatedForInviteRef.current = invite.id;
          setActiveMatchId(matchId);
          setSentInvite(null);
        } else {
          console.error('Failed to create match for accepted invite:', invite);
        }
      } else if (invite.status === 'declined' || invite.status === 'expired') {
        setSentInvite(null);
      }
    });
    return unsubscribe;
  }, [sentInvite?.id]);

  // Invitee side: after I accept, wait for the host's client to create the
  // match doc referencing the invite I just accepted (see MatchInviteModal).
  const [acceptedInviteId, setAcceptedInviteId] = useState(null);
  useEffect(() => {
    if (!acceptedInviteId || !currentUser?.uid) return;
    const unsubscribe = subscribeToMatchByInviteId(acceptedInviteId, currentUser.uid, (match) => {
      if (match) {
        setActiveMatchId(match.id);
        setAcceptedInviteId(null);
      }
    });
    return unsubscribe;
  }, [acceptedInviteId, currentUser?.uid]);

  const handleSendInvite = async (toUid, category) => {
    if (!currentUser?.uid) return;
    const inviteId = await sendMatchInvite(currentUser.uid, getPlayerDisplayName(currentUser), toUid, category);
    if (inviteId) {
      setSentInvite({ id: inviteId, fromUid: currentUser.uid, toUid, category });
      matchCreatedForInviteRef.current = null;
    }
  };

  const handleMatchOver = ({ result, myScore, opponentScore, opponentUid, opponentDisplayName, category, forfeited }) => {
    if (!currentUser?.uid) return;
    writeMatchHistoryEntry(currentUser.uid, activeMatchId, {
      opponentUid, opponentDisplayName, result, myScore, opponentScore, category, forfeited: forfeited || false,
    });
    if (result === 'win') {
      setGlobalStats(prev => {
        const next = { ...prev, total1v1Wins: (prev.total1v1Wins || 0) + 1 };
        const newlyUnlocked = evaluateAchievements(next, {});
        next.unlockedAchievements = mergeUnlockedAchievements(next, newlyUnlocked);
        return next;
      });
    }
  };

  // Tracks which uid the in-memory globalStats has actually been loaded for.
  // Firestore sync is gated on this so a still-loading account switch can't
  // write the previous account's stats into the new account's profile. It's
  // state (not a ref) specifically so that flipping it re-runs the save-state
  // effect below with the CURRENT globalStats - otherwise any gameplay change
  // that happens in the gap before this becomes ready would be silently
  // dropped (the effect it would have triggered a sync from already ran and
  // no-opped while blocked, and nothing re-fires it once ready flips true).
  const [statsReadyForUid, setStatsReadyForUid] = useState(null);

  // Auth Listener
  useEffect(() => {
    // Guard for the account-switch race: if a new auth event fires while
    // a previous getUserStatsFromFirestore is still in flight, the stale
    // fetch must not overwrite the newer account's state or strand
    // statsReadyForUid on the wrong uid.  Bumping this counter on every
    // auth event lets the fetch callback detect it was superseded.
    let authGeneration = 0;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const myGeneration = ++authGeneration;

      // Block syncing until this account's own stats have loaded below -
      // otherwise the outgoing account's in-memory globalStats can get
      // written into the new account's profile before the fetch resolves.
      setStatsReadyForUid(null);
      setCurrentUser(user);

      if (user) {
        if (user.displayName) setNickname(user.displayName);
        const cloudStats = await getUserStatsFromFirestore(user.uid);

        // If another auth event fired while we were fetching, this
        // result is stale — drop it so the newer handler wins.
        if (myGeneration !== authGeneration) return;

        setGlobalStats(_prev => {
          // Strip non-stat metadata fields that syncUserProfile writes
          // into the same users/{uid} doc (uid, email, displayName,
          // photoURL, lastLogin, updatedAt, role).  Spreading these into
          // globalStats pollutes it and degrades Firestore Timestamps on
          // the localStorage round-trip.
          const raw = cloudStats || {};
          const {
            uid: _uid, email: _email, displayName: _dn, photoURL: _ph,
            lastLogin: _ll, updatedAt: _ua, role: _role,
            ...statsOnly
          } = raw;

          const localAccountStats = loadStats(user.uid);
          const baseStats = cloudStats
            ? { ...localAccountStats, ...statsOnly }
            : localAccountStats;
          const next = migrateStats(baseStats);

          const newlyUnlocked = evaluateAchievements(next, { isSignedIn: true });
          next.unlockedAchievements = mergeUnlockedAchievements(next, newlyUnlocked);
          return next;
        });
        setStatsReadyForUid(user.uid);
      } else {
        // Sign-out: load 'anon' stats using account-scoped key
        setGlobalStats(loadStats(null));
      }

      if (isAdminPath()) {
        if (user && user.email === ADMIN_EMAIL) {
          setShowAdminPanel(true);
          setShowAuthModal(false);
        } else {
          setShowAdminPanel(false);
          setShowAuthModal(true);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('triviabong_leaderboards', JSON.stringify(leaderboards));
  }, [leaderboards]);

  useEffect(() => {
    localStorage.setItem('triviabong_global_stats', JSON.stringify(globalStats));
    if (currentUser?.uid && statsReadyForUid === currentUser.uid) {
      const syncTimer = setTimeout(() => {
        syncUserStatsToFirestore(currentUser.uid, globalStats);
        syncPublicProfile(currentUser.uid, getPlayerDisplayName(currentUser), globalStats);
      }, 2000);
      return () => clearTimeout(syncTimer);
    }
  }, [globalStats, currentUser, statsReadyForUid]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'triviabong_global_stats' && e.newValue) {
        try {
          const incoming = JSON.parse(e.newValue);
          setGlobalStats(current => mergeMonotonicStats(current, incoming));
        } catch (err) {
          console.error('Error handling storage event for global stats:', err);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const refreshRekordiData = async () => {
    const [level, bestScore, fastestPerfect, maxStreak, achievementCount, dayStreak] = await Promise.all([
      getPublicProfileLeaderboard('level', 10),
      getBestScoresAcrossCategories(10),
      getFastestPerfectRounds(10),
      getPublicProfileLeaderboard('maxStreak', 10),
      getPublicProfileLeaderboard('achievementCount', 10),
      getPublicProfileLeaderboard('dayStreak', 10)
    ]);
    setRekordiData({ level, bestScore, fastestPerfect, maxStreak, achievementCount, dayStreak });
  };

  // Fetched once on mount, not per lobby visit or on modal open: the
  // compact RekordiBoards preview is always visible on the LOBBY screen
  // (not just inside the modal), so gating this fetch behind opening the
  // modal left the lobby preview stuck on "Učitavanje..." until the player
  // saved a score (the only other refreshRekordiData() call site).
  useEffect(() => {
    refreshRekordiData();
  }, []);

  const isAnyModalOpen = showAdminPanel || showStatsModal || showGuideModal || showAchievementsModal || showRekordiModal || showOnlinePlayersModal || showAuthModal || showReportModal;

  useEffect(() => {
    if (gameState !== 'PLAYING' || selectedOption !== null || isAnyModalOpen) return;

    if (timeLeft <= 0) {
      handleAnswerTimeout();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 4 && next > 0) {
          sound.playTick();
        }
        return Math.max(0, next);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, selectedOption, isAnyModalOpen, currentIndex]);

  const returnToLobby = () => {
    sound.playClick();
    clearRoundTransitionTimers();
    clearJokerMessageTimer();
    setDailyChallengeMode(false);
    setDailySubmitResult(null);
    setGameState('LOBBY');
  };

  // Refreshes the lobby's Daily Challenge card (attempts used / next cost)
  // whenever a signed-in player is looking at it - including right after
  // returning from a round, so the card reflects the attempt that was just
  // consumed without needing a page reload.
  useEffect(() => {
    if (!currentUser || gameState !== 'LOBBY') return;
    let cancelled = false;
    (async () => {
      const status = await getDailyAttemptStatus(currentUser.uid, getZagrebDateString());
      if (!cancelled) setDailyAttemptStatus(status);
    })();
    return () => { cancelled = true; };
  }, [currentUser, gameState]);

  // Pure Y-M-D calendar-string arithmetic, deliberately not going back
  // through Intl/timeZone conversion (that's already done once to produce
  // dateKey) - avoids any risk of a double timezone shift landing on the
  // wrong day.
  const getYesterdayDateKey = (dateKey) => {
    const [y, m, d] = dateKey.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() - 1);
    return dt.toISOString().slice(0, 10);
  };

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    (async () => {
      const yesterday = getYesterdayDateKey(getZagrebDateString());
      const ackKey = `triviabong_daily_win_ack_${yesterday}_${currentUser.uid}`;
      if (localStorage.getItem(ackKey)) return;

      const meta = await getDailyMeta(yesterday);
      if (cancelled || !meta?.payoutProcessed) return;

      const won = (meta.winners || []).some(w => w.uid === currentUser.uid);
      if (won) setDailyWinAnnouncement({ date: yesterday, prize: meta.prizeEach });
    })();
    return () => { cancelled = true; };
  }, [currentUser]);

  const dismissDailyWinAnnouncement = () => {
    if (dailyWinAnnouncement && currentUser) {
      localStorage.setItem(`triviabong_daily_win_ack_${dailyWinAnnouncement.date}_${currentUser.uid}`, '1');
    }
    setDailyWinAnnouncement(null);
  };

  // Refreshes the Rekordi "Dnevni izazov" board whenever the lobby is
  // visible - public read, no sign-in required to view. Kept as its own
  // dailyLeaderboard state (not folded into rekordiData) since rekordiData
  // is only ever fetched once on mount elsewhere; this one needs to reflect
  // live standings (locked design decision) and stay correct across a
  // Zagreb midnight rollover without a page reload.
  useEffect(() => {
    if (gameState !== 'LOBBY') return;
    let cancelled = false;
    (async () => {
      const board = await getDailyLeaderboard(getZagrebDateString(), 10);
      if (!cancelled) setDailyLeaderboard(board);
    })();
    return () => { cancelled = true; };
  }, [gameState]);

  const selectCategory = async (catKey) => {
    sound.playClick();
    setSelectedCategory(catKey);
    setGameState('LEADERBOARD');
    setIsLoadingLeaderboard(true);

    const fetchId = ++categoryFetchIdRef.current;
    const remoteScores = await getLeaderboardFromFirestore(catKey);

    // A newer selectCategory call (rapid category switching) superseded
    // this one while the fetch was in flight - drop the stale result
    // instead of showing the wrong category's scores under the right header.
    if (fetchId !== categoryFetchIdRef.current) return;

    if (remoteScores.length > 0) {
      setActiveCategoryLeaderboard(remoteScores);
    } else {
      setActiveCategoryLeaderboard(leaderboards[catKey] || []);
    }
    setIsLoadingLeaderboard(false);
  };

  // Shared by launchQuizRound and launchDailyChallengeRound - everything
  // about starting a round except sourcing the question list, which differs
  // (category random slice vs. deterministic daily set) and, for daily,
  // needs an awaited Firestore call (startDailyAttempt) before this can run.
  const resetRoundState = (loadedQuestions) => {
    setQuestions(loadedQuestions);
    setCurrentIndex(0);
    setScore(0);
    setLives(MAX_LIVES);
    setStreak(0);
    setCorrectInRound(0);
    setTimeLeft(QUESTION_TIME_SECONDS);
    setJokersUsed({ fiftyFifty: false, plusTen: false, skip: false });
    setHiddenOptions([]);
    setSelectedOption(null);
    setScoreSaved(false);
    setAutoSaveFailed(false);
    setDailySubmitResult(null);
    setGameState('PLAYING');

    setRoundStartTime(Date.now());
    setFastAnswerStreak(0);
    setFiftyFiftyUsedOnIndex(null);
    setSkipUsedAtLastLife(false);

    // Drop any reveal left over from an abandoned round (e.g. the header
    // logo dumping the player back to the lobby mid-overlay). Deliberately
    // does NOT reset secretCelebratedRef - that's mount-scoped.
    clearTimeout(secretRevealTimer.current);
    pendingAdvanceRef.current = null;
    secretPausedAtRef.current = null;
    setSecretAchievement(null);

    setGlobalStats(prev => {
      const { stats } = applyAnswer(prev, {}, { type: 'START_ROUND' });
      return stats;
    });
  };

  const launchQuizRound = () => {
    sound.playClick();
    clearRoundTransitionTimers();
    clearJokerMessageTimer();
    const loadedQuestions = getQuestionsByCategory(selectedCategory);
    const shuffled = [...loadedQuestions].sort(() => 0.5 - Math.random()).slice(0, QUESTIONS_PER_ROUND);
    setDailyChallengeMode(false);
    resetRoundState(shuffled);
  };

  // Daily Challenge entry point: consumes the single daily attempt FIRST
  // (via startDailyAttempt, which re-validates "already played today"
  // server-side regardless of what dailyAttemptStatus's stale client read
  // shows), and only starts the round if that succeeds - consuming on
  // start, not on submit, per the locked design decision (an abandoned
  // round still uses up the day's one shot). selectedCategory is
  // deliberately left null/unchanged; daily rounds aren't tied to a
  // category, and applyRoundEndRewards/logGameResult already fall back to
  // 'opca_znanje' when it's unset.
  const launchDailyChallengeRound = async () => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    sound.playClick();
    const dateKey = getZagrebDateString();
    const result = await startDailyAttempt(currentUser.uid, dateKey);
    if (!result.success) {
      showDailyLobbyMessage(
        result.reason === 'already_played'
          ? 'Već si odigrao/la dnevni izazov danas. Vrati se sutra!'
          : 'Došlo je do greške, pokušaj ponovno.'
      );
      setDailyAttemptStatus(await getDailyAttemptStatus(currentUser.uid, dateKey));
      return;
    }

    clearRoundTransitionTimers();
    clearJokerMessageTimer();
    setDailyChallengeMode(true);
    setDailyDateKey(dateKey);
    resetRoundState(getDailyChallengeQuestions(dateKey));
  };

  const updateCategoryStats = (isCorrect, pointsEarned = 0, newStreak = 0) => {
    const cat = selectedCategory || 'opca_znanje';
    setGlobalStats(prev => {
      const { stats } = applyAnswer(prev, {}, {
        type: 'ANSWER',
        isCorrect,
        pointsEarned,
        category: cat,
        newStreak
      });
      return stats;
    });
  };

  const applyRoundEndRewards = (isPerfect, { isVictory = false, finalScore, jokersUsedSnapshot, skipUsedAtLastLifeSnapshot, correctCountSnapshot = correctInRound } = {}) => {
    const roundElapsedMs = roundStartTime ? Date.now() - roundStartTime : undefined;
    setGlobalStats(prev => {
      const jokers = jokersUsedSnapshot || { fiftyFifty: false, plusTen: false, skip: false };
      const { stats } = applyAnswer(prev, {}, {
        type: 'ROUND_END',
        isPerfect,
        finalScore,
        jokersUsed: jokers,
        skipUsedAtLastLife: skipUsedAtLastLifeSnapshot,
        roundElapsedMs,
        isVictory
      });
      return stats;
    });

    // Admin-only content-insights logging (question accuracy/category
    // popularity dashboard) - fire-and-forget, see logGameResult's comment.
    logGameResult({
      uid: currentUser?.uid || null,
      outcome: isVictory ? 'VICTORY' : 'GAMEOVER',
      category: selectedCategory || 'opca_znanje',
      score: finalScore ?? score,
      questionsAnswered: currentIndex + 1,
      correctAnswers: correctCountSnapshot,
      durationMs: roundElapsedMs ? Math.round(roundElapsedMs) : undefined,
    });
  };

  const handleAnswer = (option) => {
    if (selectedOption !== null || answerLocked) return;
    setSelectedOption(option);

    const currentQ = questions[currentIndex];
    const correct = checkIsCorrect(currentQ, option);

    // Decided HERE, in the event handler body, rather than inside the
    // setGlobalStats updater below that actually unlocks it: StrictMode
    // double-invokes updaters, so firing confetti/sound/setState from in
    // there would double-fire. This condition is equivalent to what the
    // updater evaluates (ctx.isPotterQuestion === true, plus
    // evaluateAchievements skipping ids already in unlockedAchievements) -
    // keep the two in sync. secretCelebratedRef closes the one remaining
    // gap: a Firestore stats load landing mid-round for a returning player
    // who already owns the trophy.
    const isPotterQuestion = correct && mentionsHarryPotter(currentQ);
    const revealsSecret = isPotterQuestion
      && !globalStats.unlockedAchievements?.[SVI_SMO_MI_MARIJA_ID]
      && !secretCelebratedRef.current;

    let newCorrectInRound = correctInRound;
    let newScore = score;

    // Admin-only content-insights logging (question accuracy/category
    // popularity dashboard) - fire-and-forget, see logQuestionAttempt's
    // comment. Uses currentQ's own category (not selectedCategory) since
    // Opće znanje is an aggregate pool - see getCategoryDetails' comment.
    logQuestionAttempt({
      uid: currentUser?.uid || null,
      questionId: currentQ.id,
      categoryId: currentQ.category || selectedCategory || 'opca_znanje',
      correct,
      timeLeft,
      livesRemaining: correct ? lives : lives - 1,
    });

    if (correct) {
      sound.playCorrect();
      const speedBonus = timeLeft * SPEED_BONUS_PER_SECOND;
      const streakMultiplier = 1 + streak * STREAK_MULTIPLIER_STEP;
      const earned = Math.round((BASE_SCORE + speedBonus) * streakMultiplier);

      newScore = score + earned;
      setScore(newScore);
      setStreak(s => s + 1);
      newCorrectInRound = correctInRound + 1;
      setCorrectInRound(newCorrectInRound);

      const newStreak = streak + 1;
      const newFastAnswerStreak = timeLeft > 17 ? fastAnswerStreak + 1 : 0;
      setFastAnswerStreak(newFastAnswerStreak);

      const isLastQuestion = currentIndex === questions.length - 1;
      const isLivingDangerously = isLastQuestion
        && jokersUsed.fiftyFifty && jokersUsed.plusTen && jokersUsed.skip;
      const isLifeSaverHit = fiftyFiftyUsedOnIndex === currentIndex;

      setGlobalStats(prev => {
        const { stats } = applyAnswer(prev, {}, {
          type: 'ANSWER',
          isCorrect: true,
          pointsEarned: earned,
          category: selectedCategory || 'opca_znanje',
          timeLeft,
          isLivingDangerously,
          isLifeSaverHit,
          fastAnswerStreak: newFastAnswerStreak,
          newStreak,
          isPotterQuestion
        });
        return stats;
      });
    } else {
      sound.playWrong();
      updateCategoryStats(false, 0, 0);
      setStreak(0);
      setFastAnswerStreak(0);
      const newLives = lives - 1;
      setLives(newLives);

      if (newLives <= 0) {
        applyRoundEndRewards(false, {
          isVictory: false,
          jokersUsedSnapshot: jokersUsed,
          skipUsedAtLastLifeSnapshot: skipUsedAtLastLife
        });
        gameOverTimerRef.current = setTimeout(() => {
          gameOverTimerRef.current = null;
          setGameState('GAMEOVER');
        }, 1000);
        return;
      }
    }

    // Extracted so the secret-achievement path can DEFER it instead of
    // duplicating it. Defined here (not hoisted) so it captures this
    // invocation's newCorrectInRound/newScore/currentIndex/joker snapshots -
    // see applyRoundEndRewards' comment above for why that matters.
    const advanceOrFinish = () => {
      setSelectedOption(null);
      setHiddenOptions([]);

      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(c => c + 1);
        setTimeLeft(QUESTION_TIME_SECONDS);
      } else {
        sound.playCorrect();
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        applyRoundEndRewards(newCorrectInRound === QUESTIONS_PER_ROUND, {
          isVictory: true,
          finalScore: newScore,
          jokersUsedSnapshot: jokersUsed,
          skipUsedAtLastLifeSnapshot: skipUsedAtLastLife,
          correctCountSnapshot: newCorrectInRound
        });
        setGameState('VICTORY');
      }
    };

    if (revealsSecret) {
      // Hold the round open on the reveal. Nothing else needs pausing: the
      // countdown interval was already torn down by setSelectedOption, the
      // answer buttons and all three jokers are disabled while
      // selectedOption is set, and handleAnswerTimeout can't fire.
      secretCelebratedRef.current = true;
      pendingAdvanceRef.current = advanceOrFinish;
      secretRevealTimer.current = setTimeout(() => {
        secretPausedAtRef.current = Date.now();
        setSecretAchievement(ACHIEVEMENTS.find(a => a.id === SVI_SMO_MI_MARIJA_ID));
      }, SECRET_REVEAL_DELAY_MS);
    } else {
      roundTransitionTimerRef.current = setTimeout(() => {
        roundTransitionTimerRef.current = null;
        advanceOrFinish();
      }, 1200);
    }
  };

  const dismissSecretAchievement = () => {
    const advance = pendingAdvanceRef.current;
    if (!advance) return; // guards a double-tap on "Nastavi"
    pendingAdvanceRef.current = null;
    sound.playClick();
    setSecretAchievement(null);

    // Time spent staring at the overlay isn't time spent answering. Shifting
    // roundStartTime forward by the paused duration keeps it out of BOTH of
    // its readers - the speed_demon check and the elapsedMs written to the
    // Rekordi "fastest perfect round" board - so a pause can't cost the
    // player that achievement or post a bogus record time.
    const pausedMs = Date.now() - (secretPausedAtRef.current || Date.now());
    secretPausedAtRef.current = null;
    if (pausedMs > 0) setRoundStartTime(t => (t ? t + pausedMs : t));

    advance();
  };

  const handleAnswerTimeout = () => {
    sound.playWrong();
    updateCategoryStats(false, 0, 0);
    setStreak(0);
    setFastAnswerStreak(0);
    const newLives = lives - 1;
    setLives(newLives);
    setSelectedOption('TIMEOUT');

    const currentQ = questions[currentIndex];
    logQuestionAttempt({
      uid: currentUser?.uid || null,
      questionId: currentQ.id,
      categoryId: currentQ.category || selectedCategory || 'opca_znanje',
      correct: false,
      timeLeft: 0,
      livesRemaining: newLives,
    });

    if (newLives <= 0) {
      applyRoundEndRewards(false, {
        isVictory: false,
        jokersUsedSnapshot: jokersUsed,
        skipUsedAtLastLifeSnapshot: skipUsedAtLastLife
      });
      gameOverTimerRef.current = setTimeout(() => {
        gameOverTimerRef.current = null;
        setGameState('GAMEOVER');
      }, 1000);
      return;
    }

    roundTransitionTimerRef.current = setTimeout(() => {
      roundTransitionTimerRef.current = null;
      setSelectedOption(null);
      setHiddenOptions([]);
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(c => c + 1);
        setTimeLeft(QUESTION_TIME_SECONDS);
      } else {
        applyRoundEndRewards(false, {
          isVictory: true,
          finalScore: score,
          jokersUsedSnapshot: jokersUsed,
          skipUsedAtLastLifeSnapshot: skipUsedAtLastLife
        });
        setGameState('VICTORY');
      }
    }, 1200);
  };

  const checkTacticianOnJokerUse = (jokersUsedAfter, cost = 0) => {
    setGlobalStats(prev => {
      const { stats } = applyAnswer(prev, {}, {
        type: 'USE_JOKER',
        cost,
        jokersUsedAfter
      });
      return stats;
    });
  };

  const activateFiftyFifty = () => {
    const currentQ = questions[currentIndex];
    if (dailyChallengeMode || jokersUsed.fiftyFifty || globalStats.coins < JOKER_COSTS.fiftyFifty || !currentQ) return;

    sound.playClick();
    const correctAns = currentQ.correct_answer || currentQ.correctAnswer;
    const incorrectIndices = currentShuffledOptions
      .map((opt, i) => (opt !== correctAns ? i : -1))
      .filter(i => i !== -1);
    const toHide = shuffleArray(incorrectIndices).slice(0, 2);

    setHiddenOptions(toHide);
    const newJokersUsed = { ...jokersUsed, fiftyFifty: true };
    setJokersUsed(newJokersUsed);
    setFiftyFiftyUsedOnIndex(currentIndex);
    checkTacticianOnJokerUse(newJokersUsed, JOKER_COSTS.fiftyFifty);
  };

  const activatePlusTen = () => {
    if (dailyChallengeMode || jokersUsed.plusTen || globalStats.coins < JOKER_COSTS.plusTen) return;
    sound.playClick();
    setTimeLeft(t => t + PLUS_TEN_SECONDS);
    const newJokersUsed = { ...jokersUsed, plusTen: true };
    setJokersUsed(newJokersUsed);
    checkTacticianOnJokerUse(newJokersUsed, JOKER_COSTS.plusTen);
  };

  const activateSkip = () => {
    if (dailyChallengeMode || jokersUsed.skip || globalStats.coins < JOKER_COSTS.skip) return;
    sound.playClick();
    const newJokersUsed = { ...jokersUsed, skip: true };
    const isLastLifeSkip = lives === 1;
    setJokersUsed(newJokersUsed);
    if (isLastLifeSkip) setSkipUsedAtLastLife(true);
    checkTacticianOnJokerUse(newJokersUsed, JOKER_COSTS.skip);
    setFastAnswerStreak(0);

    setHiddenOptions([]);
    setSelectedOption(null);
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(c => c + 1);
      setTimeLeft(QUESTION_TIME_SECONDS);
    } else {
      applyRoundEndRewards(false, {
        isVictory: true,
        finalScore: score,
        jokersUsedSnapshot: newJokersUsed,
        skipUsedAtLastLifeSnapshot: isLastLifeSkip || skipUsedAtLastLife
      });
      setGameState('VICTORY');
    }
  };

  // Daily Challenge submission requires sign-in (locked design decision -
  // launchDailyChallengeRound already gates entry on currentUser, so
  // dailyChallengeMode is only ever true here for a signed-in player), and
  // writes to dailyLeaderboards/{date}/scores/{uid} instead of the normal
  // per-category leaderboards collection - see submitDailyScore's rules-side
  // upsert-on-improvement logic in firestore.rules.
  const submitDaily = async () => {
    setIsSaving(true);
    try {
      const success = await submitDailyScore(
        currentUser.uid, dailyDateKey, getPlayerDisplayName(currentUser), score
      );
      if (!success) throw new Error('Daily score submit failed');
      setScoreSaved(true);
      sound.playClick();
      const board = await getDailyLeaderboard(dailyDateKey, 50);
      setDailyLeaderboard(board);
      const rankIdx = board.findIndex(entry => entry.uid === currentUser.uid);
      setDailySubmitResult({ rank: rankIdx >= 0 ? rankIdx + 1 : null, isTop: rankIdx === 0 });
    } catch (err) {
      console.error('Failed to submit daily score:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const saveScore = async (entryName) => {
    if (!entryName || scoreSaved || isSaving) return;
    if (dailyChallengeMode) {
      await submitDaily();
      return;
    }
    setIsSaving(true);

    const catKey = selectedCategory || 'opca_znanje';

    let previousLeaderboards;
    setLeaderboards(prev => {
      previousLeaderboards = prev;
      const currentList = prev[catKey] || [];
      const newList = [...currentList, { name: entryName, score, date: new Date().toLocaleDateString() }]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      return { ...prev, [catKey]: newList };
    });

    try {
      const elapsedMs = roundStartTime ? Date.now() - roundStartTime : null;
      const isPerfect = correctInRound === QUESTIONS_PER_ROUND;
      const success = await saveScoreToFirestore(catKey, entryName, score, currentUser?.uid || null, elapsedMs, isPerfect);
      if (!success) throw new Error('Firestore save failed');
      setScoreSaved(true);
      sound.playClick();
      refreshRekordiData();
    } catch (err) {
      if (previousLeaderboards) {
        setLeaderboards(previousLeaderboards);
      }
      console.error('Failed to save score:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveScore = (e) => {
    e.preventDefault();
    saveScore(nickname.trim()).catch(() => {});
  };

  // Signed-in players already have a displayName - skip the manual nickname
  // form and save automatically once a round ends. Only anonymous play still
  // shows the form (the player has no account-derived name to fall back to).
  useEffect(() => {
    if ((gameState === 'GAMEOVER' || gameState === 'VICTORY') && currentUser && !scoreSaved) {
      (async () => {
        try {
          await saveScore(getPlayerDisplayName(currentUser));
        } catch {
          setAutoSaveFailed(true);
        }
      })();
    }
  }, [gameState, currentUser, scoreSaved]);

  const handlePlayerLogout = async () => {
    if (currentUser?.uid) {
      await deletePresence(currentUser.uid);
    }
    await logoutUser();
    setShowAdminPanel(false);
    sound.playClick();
  };

  const categoriesList = useMemo(() => {
    return getAllCategories();
  }, []);

  // Merges the separately-live-fetched daily board into the once-fetched
  // rekordiData for RekordiBoards/RekordiModal - see the dailyLeaderboard
  // effect above for why 'daily' can't just be a key inside rekordiData
  // itself. Stays null (not a partial object) while rekordiData's own
  // initial fetch hasn't landed yet, so RekordiBoards' "Učitavanje..."
  // state still shows instead of every OTHER board looking prematurely empty.
  const rekordiDataWithDaily = useMemo(
    () => (rekordiData ? { ...rekordiData, daily: dailyLeaderboard } : null),
    [rekordiData, dailyLeaderboard]
  );

  const isAdminUser = currentUser && currentUser.email === ADMIN_EMAIL;

  // Split each joker's "disabled" reason: already used / mid-answer is truly
  // inert (native disabled, nothing to explain), but "not enough coins" stays
  // clickable so activateFiftyFifty/activatePlusTen/activateSkip's own click can surface a
  // message instead of just silently dimming - the player might not otherwise
  // know *why* it's greyed out.
  // Daily Challenge disables all three jokers outright (native `disabled`,
  // folded into *Locked* rather than *Short*) - unlike "not enough coins",
  // it isn't a state a click-to-explain message can help the player
  // recover from mid-round.
  const fiftyFiftyLocked = dailyChallengeMode || jokersUsed.fiftyFifty || selectedOption !== null;
  const fiftyFiftyShort = globalStats.coins < JOKER_COSTS.fiftyFifty;
  const plusTenLocked = dailyChallengeMode || jokersUsed.plusTen || selectedOption !== null;
  const plusTenShort = globalStats.coins < JOKER_COSTS.plusTen;
  const skipLocked = dailyChallengeMode || jokersUsed.skip || selectedOption !== null;
  const skipShort = globalStats.coins < JOKER_COSTS.skip;

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-amber-500 selection:text-slate-950">

      {/* Header */}
      <header className="w-full max-w-4xl mx-auto px-4 py-4 flex justify-between items-center border-b border-slate-900">
        <div
          onClick={returnToLobby}
          className="flex items-center gap-2 cursor-pointer group min-w-0"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform shrink-0">
            TB
          </div>
          <span className="hidden sm:inline font-black text-xl tracking-tight bg-gradient-to-r from-white to-amber-400 bg-clip-text text-transparent">
            TriviaBong
          </span>
        </div>

        <div className="flex items-center gap-1.5 min-w-0">
          <button
            onClick={() => { sound.playClick(); setShowStatsModal(true); }}
            className="flex items-center gap-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 px-2 py-1.5 rounded-xl text-amber-400 transition-colors shadow-sm active:scale-95 active:brightness-95"
            title="Razina i Statistika"
          >
            <span className="flex items-center gap-1.5 text-xs font-bold">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span><span className="hidden sm:inline">Lvl </span>{globalStats.level || 1}</span>
            </span>
            <span className="w-px h-3.5 bg-slate-800" />
            <span className="flex items-center gap-1.5 text-xs font-bold">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>{globalStats.coins}</span>
            </span>
          </button>

          <button
            onClick={() => { sound.playClick(); setShowAchievementsModal(true); }}
            className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 px-2 py-1.5 rounded-xl text-xs font-bold text-amber-400 transition-colors shadow-sm active:scale-95 active:brightness-95"
            title="Trofeji"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>{Object.keys(globalStats.unlockedAchievements || {}).length}</span>
          </button>

          <button
            onClick={() => { sound.playClick(); setShowGuideModal(true); }}
            className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-2 py-1.5 rounded-xl text-xs font-bold text-slate-300 transition-colors active:scale-95 active:brightness-95"
            title="Kako Igrati"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Vodič</span>
          </button>

          {isAdminUser && (
            <button
              onClick={() => setShowAdminPanel(true)}
              className="flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 px-2 py-1.5 rounded-xl text-xs font-bold transition-colors active:scale-95 active:brightness-95"
              title="Otvori Admin Panel"
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}

          {currentUser ? (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-2 py-1.5 rounded-xl">
              <span className="text-xs font-bold text-slate-200 truncate max-w-[60px]">
                {currentUser.displayName || currentUser.email.split('@')[0]}
              </span>
              <button
                onClick={handlePlayerLogout}
                className="text-slate-500 hover:text-rose-400 transition-colors p-0.5 active:scale-90"
                title="Odjava"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { sound.playClick(); setShowAuthModal(true); }}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 px-2 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-md shadow-amber-500/10 active:scale-95 active:brightness-95"
            >
              <User className="w-3.5 h-3.5" />
              <span>Prijava</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-2xl mx-auto px-4 py-8 flex-1 flex flex-col justify-center">

        {activeMatchId && currentUser ? (
          <MatchView
            matchId={activeMatchId}
            currentUid={currentUser.uid}
            onExit={() => setActiveMatchId(null)}
            onMatchOver={handleMatchOver}
            onRematch={(opponentUid, category) => {
              setActiveMatchId(null);
              handleSendInvite(opponentUid, category);
            }}
          />
        ) : (
        <>
        {gameState === 'LOBBY' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                Izaberi Kategoriju Kvizova
              </h1>
              <p className="text-slate-400 text-sm">
                Testirajte svoje znanje, skupljajte bodove i penjite se na ljestvicu!
              </p>
            </div>

            {dailyWinAnnouncement && (
              <div className="flex items-center justify-between gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
                <p className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <Crown className="w-5 h-5 shrink-0" />
                  Osvojio/la si jučerašnji Dnevni izazov! +{dailyWinAnnouncement.prize} zlatnika je već na tvom računu.
                </p>
                <button
                  onClick={dismissDailyWinAnnouncement}
                  className="text-xs font-bold text-amber-400/80 hover:text-amber-300 shrink-0"
                >
                  OK
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={launchDailyChallengeRound}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-500/15 to-amber-500/5 hover:from-amber-500/25 hover:to-amber-500/10 border border-amber-500/30 rounded-2xl transition-all group shadow-sm active:scale-[0.97] active:brightness-95"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 group-hover:scale-110 transition-transform">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="font-black text-white text-sm block">Dnevni izazov</span>
                    <span className="text-xs text-amber-300/80">
                      {!currentUser
                        ? 'Prijavi se za igranje'
                        : !dailyAttemptStatus
                          ? 'Isti kviz za sve, jedan besplatan pokušaj dnevno'
                          : !dailyAttemptStatus.canPlay
                            ? 'Odigrano danas - vrati se sutra'
                            : 'Besplatno - jedan pokušaj dnevno'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-500/60 group-hover:text-amber-400 transition-colors" />
              </button>

              <button
                onClick={() => {
                  if (!currentUser) { setShowAuthModal(true); return; }
                  sound.playClick();
                  setShowOnlinePlayersModal(true);
                }}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 hover:from-emerald-500/25 hover:to-emerald-500/10 border border-emerald-500/30 rounded-2xl transition-all group shadow-sm active:scale-[0.97] active:brightness-95"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 group-hover:scale-110 transition-transform">
                    <Swords className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="font-black text-white text-sm block">1v1 Dvoboj</span>
                    <span className="text-xs text-emerald-300/80">
                      {!currentUser
                        ? 'Prijavi se da izazoveš druge igrače'
                        : onlinePlayersCount === 0
                          ? 'Nitko trenutno nije online'
                          : `${onlinePlayersCount} ${onlinePlayersCount === 1 ? 'igrač' : 'igrača'} online`}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-500/60 group-hover:text-emerald-400 transition-colors" />
              </button>
            </div>
            {dailyLobbyMessage && (
              <p className="text-center text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl py-2">
                {dailyLobbyMessage}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {categoriesList.map(catKey => {
                const details = getCategoryDetails(catKey);
                const IconComponent = details.icon;
                const color = details.color || DEFAULT_CATEGORY_COLOR;
                return (
                  <button
                    key={catKey}
                    onClick={() => selectCategory(catKey)}
                    className={`flex items-center justify-between p-4 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 ${color.hoverBorder} rounded-2xl transition-all group shadow-sm active:scale-[0.97] active:brightness-95`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`p-3 rounded-xl ${color.bg} border ${color.border} ${color.text} group-hover:scale-110 transition-transform`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-slate-200 capitalize text-sm">{details.label}</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-slate-600 ${color.groupHoverText} transition-colors`} />
                  </button>
                );
              })}
            </div>

            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Medal className="w-4 h-4 text-amber-400" /> Rekordi
                </h2>
                <button
                  onClick={() => { sound.playClick(); setShowRekordiModal(true); }}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors active:scale-95"
                >
                  Vidi sve →
                </button>
              </div>
              <RekordiBoards data={rekordiDataWithDaily} limitPerBoard={3} compact />
            </div>
          </div>
        )}

        {gameState === 'LEADERBOARD' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Trophy className="w-8 h-8" />
              </div>
              <div className="text-left">
                <h2 className="text-2xl font-black text-white">
                  {getCategoryDetails(selectedCategory).label}
                </h2>
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Najbolji Rezultati
                </p>
              </div>
            </div>

            <div className="bg-slate-950/60 rounded-2xl border border-slate-800 overflow-hidden divide-y divide-slate-800/80 min-h-[160px] flex flex-col justify-center">
              {isLoadingLeaderboard ? (
                <div className="p-6 text-slate-400 text-sm animate-pulse flex justify-center items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Učitavanje ljestvice...</span>
                </div>
              ) : activeCategoryLeaderboard.length > 0 ? (
                activeCategoryLeaderboard.slice(0, 5).map((entry, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3.5 text-sm px-5">
                    <span className="font-semibold text-slate-300 flex items-center gap-3">
                      <span className={`text-xs font-extrabold w-6 h-6 rounded-lg flex items-center justify-center ${idx === 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                        #{idx + 1}
                      </span>
                      <span>{entry.name}</span>
                    </span>
                    <span className="text-amber-400 font-bold">{entry.score} bod.</span>
                  </div>
                ))
              ) : (
                <div className="p-6 text-slate-500 text-xs">
                  Još nema zabilježenih rezultata za ovu kategoriju. Budite prvi!
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={returnToLobby}
                className="flex-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold py-3.5 rounded-2xl transition-colors text-sm active:scale-[0.97] active:brightness-95"
              >
                Natrag
              </button>
              <button
                onClick={launchQuizRound}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3.5 rounded-2xl transition-colors shadow-lg shadow-amber-500/20 flex justify-center items-center gap-2 text-sm active:scale-[0.97] active:brightness-95"
              >
                <Play className="w-4 h-4 fill-slate-950" /> Započni Kviz
              </button>
            </div>
          </div>
        )}

        {gameState === 'PLAYING' && currentQ && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-2xl text-xs font-bold">
              <div className="flex items-center gap-1">
                {Array.from({ length: MAX_LIVES }, (_, i) => (
                  <Heart
                    key={i}
                    className={i < lives ? 'w-4 h-4 text-rose-500 fill-rose-500' : 'w-4 h-4 text-slate-700 fill-none'}
                  />
                ))}
              </div>
              <TimerRing timeLeft={timeLeft} totalTime={QUESTION_TIME_SECONDS} />
              <div className="flex items-center gap-1.5 text-slate-300">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Bodovi: {score}</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex justify-between items-center text-xs text-slate-400 font-bold">
                {/* Opće znanje is an aggregate pool (see questionsLoader.js), so
                    show each question's real source category rather than the
                    generic "Opće znanje" label for every question. */}
                <span className="uppercase tracking-wider">{getCategoryDetails(currentQ.category || selectedCategory).label}</span>
                <div className="flex items-center gap-2">
                  <span>{currentIndex + 1} / {questions.length}</span>
                  <button
                    type="button"
                    onClick={() => { sound.playClick(); setShowReportModal(true); }}
                    className="flex items-center gap-1 text-slate-600 hover:text-rose-400 transition-colors px-1 py-0.5 active:scale-90"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Prijavi pitanje</span>
                  </button>
                </div>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">
                {currentQ.question || currentQ.tekst || currentQ.pitanje}
              </h2>

              <div className="grid grid-cols-1 gap-3">
                {currentShuffledOptions.map((option, idx) => {
                  const isHidden = hiddenOptions.includes(idx);
                  if (isHidden) return null;

                  const isCorrect = checkIsCorrect(currentQ, option);

                  let btnStyle = "bg-slate-950/60 hover:bg-slate-800 border-slate-800 text-slate-200";
                  if (selectedOption !== null) {
                    if (isCorrect) {
                      if (selectedOption === option) {
                        btnStyle = "bg-emerald-500/30 border-emerald-400 text-emerald-300 font-bold shadow-lg shadow-emerald-500/10";
                      } else {
                        btnStyle = "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold";
                      }
                    } else if (option === selectedOption) {
                      btnStyle = "bg-rose-500/30 border-rose-500 text-rose-300 font-bold";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={selectedOption !== null || answerLocked}
                      onClick={() => handleAnswer(option)}
                      className={`w-full p-4 rounded-2xl border text-left font-semibold text-sm transition-all flex justify-between items-center active:scale-[0.97] active:brightness-95 ${btnStyle}`}
                    >
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-center gap-2 pt-2 border-t border-slate-800/80">
                <button
                  disabled={fiftyFiftyLocked}
                  onClick={() => {
                    if (fiftyFiftyShort) { showJokerMessage(`Nemaš dovoljno zlatnika (potrebno ${JOKER_COSTS.fiftyFifty}c)`); return; }
                    activateFiftyFifty();
                  }}
                  className={`px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 disabled:opacity-40 flex items-center gap-1 active:scale-95 active:brightness-95 ${!fiftyFiftyLocked && fiftyFiftyShort ? 'opacity-40' : ''}`}
                >
                  <Scissors className="w-3.5 h-3.5 text-amber-400" /> 50:50 ({JOKER_COSTS.fiftyFifty}c)
                </button>
                <button
                  disabled={plusTenLocked}
                  onClick={() => {
                    if (plusTenShort) { showJokerMessage(`Nemaš dovoljno zlatnika (potrebno ${JOKER_COSTS.plusTen}c)`); return; }
                    activatePlusTen();
                  }}
                  className={`px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 disabled:opacity-40 flex items-center gap-1 active:scale-95 active:brightness-95 ${!plusTenLocked && plusTenShort ? 'opacity-40' : ''}`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> +{PLUS_TEN_SECONDS}s ({JOKER_COSTS.plusTen}c)
                </button>
                <button
                  disabled={skipLocked}
                  onClick={() => {
                    if (skipShort) { showJokerMessage(`Nemaš dovoljno zlatnika (potrebno ${JOKER_COSTS.skip}c)`); return; }
                    activateSkip();
                  }}
                  className={`px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 disabled:opacity-40 flex items-center gap-1 active:scale-95 active:brightness-95 ${!skipLocked && skipShort ? 'opacity-40' : ''}`}
                >
                  <FastForward className="w-3.5 h-3.5 text-amber-400" /> Preskoči ({JOKER_COSTS.skip}c)
                </button>
              </div>
              {jokerMessage && (
                <p className="text-center text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl py-2">
                  {jokerMessage}
                </p>
              )}
            </div>
          </div>
        )}

        {(gameState === 'GAMEOVER' || gameState === 'VICTORY') && (
          <div className={`bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6 ${gameState === 'GAMEOVER' ? 'animate-shake animate-flash-red ring-1 ring-rose-500/40' : 'animate-fade-in'}`}>
            <div className={`inline-flex items-center justify-center p-4 rounded-2xl ${gameState === 'VICTORY' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'}`}>
              {gameState === 'VICTORY' ? <Crown className="w-10 h-10" /> : <Flame className="w-10 h-10" />}
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {gameState === 'VICTORY' ? 'Čestitamo! Pobjeda!' : 'Kraj Igre!'}
              </h2>
              <p className="text-slate-400 text-sm">
                Osvojili ste ukupno <span className="text-amber-400 font-bold">{score}</span> bodova.
              </p>
            </div>

            {dailyChallengeMode && scoreSaved && dailySubmitResult && (
              <div className="space-y-3">
                <p className={`text-xs font-bold flex items-center justify-center gap-1.5 py-3 rounded-xl border ${dailySubmitResult.isTop ? 'text-amber-300 bg-amber-500/10 border-amber-500/30' : 'text-slate-300 bg-slate-800/60 border-slate-700/60'}`}>
                  <CalendarDays className="w-4 h-4" />
                  {dailySubmitResult.isTop
                    ? 'Trenutno si na 1. mjestu dnevnog izazova!'
                    : dailySubmitResult.rank
                      ? `Trenutno si na ${dailySubmitResult.rank}. mjestu dnevnog izazova.`
                      : 'Rezultat je zabilježen na dnevnoj ljestvici.'}
                </p>
                {dailyLeaderboard.length > 0 && (
                  <div className="bg-slate-950/60 rounded-2xl border border-slate-800 overflow-hidden divide-y divide-slate-800/80 text-left">
                    {dailyLeaderboard.slice(0, 5).map((entry, idx) => (
                      <div
                        key={entry.uid || idx}
                        className={`flex justify-between items-center p-3 text-sm px-4 ${entry.uid === currentUser?.uid ? 'bg-amber-500/10' : ''}`}
                      >
                        <span className="font-semibold text-slate-300 flex items-center gap-3">
                          <span className={`text-xs font-extrabold w-6 h-6 rounded-lg flex items-center justify-center ${idx === 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                            #{idx + 1}
                          </span>
                          <span>{entry.name}</span>
                        </span>
                        <span className="text-amber-400 font-bold">{entry.score} bod.</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {scoreSaved ? (
              <p className="text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 py-3 rounded-xl">
                <Award className="w-4 h-4" /> Rezultat uspješno spremljen!
              </p>
            ) : currentUser ? (
              autoSaveFailed ? (
                <button
                  type="button"
                  onClick={() => {
                    setAutoSaveFailed(false);
                    saveScore(getPlayerDisplayName(currentUser)).catch(() => setAutoSaveFailed(true));
                  }}
                  className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold py-3 rounded-xl text-sm transition-colors active:scale-[0.97] active:brightness-95"
                >
                  Spremanje nije uspjelo. Pokušaj ponovno.
                </button>
              ) : (
                <p className="text-slate-400 text-xs font-bold animate-pulse py-3">Spremanje rezultata...</p>
              )
            ) : (
              <form onSubmit={handleSaveScore} className="space-y-3">
                <input
                  type="text"
                  placeholder="Unesite nadimak (Nickname)"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={15}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center text-white font-bold text-sm focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl text-sm transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50 active:scale-[0.97] active:brightness-95"
                >
                  {isSaving ? 'Spremanje...' : 'Spremi Rezultat'}
                </button>
              </form>
            )}

            <button
              onClick={returnToLobby}
              className="w-full bg-slate-800 hover:bg-slate-750 text-slate-100 font-bold py-3.5 rounded-2xl transition-colors flex justify-center items-center gap-2 border border-slate-700/80 text-sm active:scale-[0.97] active:brightness-95"
            >
              <RefreshCw className="w-4 h-4 text-slate-400" /> Povratak u Izbornik
            </button>
          </div>
        )}
        </>
        )}

      </main>

      {/* Incoming 1v1 invite - suppressed while already in a match. Only
          the oldest pending invite is shown; if more than one arrives,
          declining/accepting the first reveals the next on re-render. */}
      {!activeMatchId && incomingInvites.length > 0 && (
        <MatchInviteModal
          invite={incomingInvites[0]}
          onAccepted={(invite) => setAcceptedInviteId(invite.id)}
          onDismiss={() => {}}
        />
      )}

      {/* Stats Modal */}
      <StatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        stats={globalStats}
        onOpenAchievements={() => setShowAchievementsModal(true)}
        uid={currentUser?.uid}
      />

      {/* Achievements Modal */}
      <AchievementsModal
        isOpen={showAchievementsModal}
        onClose={() => setShowAchievementsModal(false)}
        stats={globalStats}
      />

      {/* Secret achievement reveal - pauses the round until dismissed. The
          gameState check matters: the header logo can drop the player to the
          lobby mid-overlay, and without it the overlay would follow them. */}
      <SecretAchievementOverlay
        isOpen={!!secretAchievement && gameState === 'PLAYING'}
        achievement={secretAchievement}
        onClose={dismissSecretAchievement}
      />

      {/* Rekordi Modal */}
      <RekordiModal
        isOpen={showRekordiModal}
        onClose={() => setShowRekordiModal(false)}
        data={rekordiDataWithDaily}
      />

      {currentUser && (
        <OnlinePlayersModal
          isOpen={showOnlinePlayersModal}
          onClose={() => setShowOnlinePlayersModal(false)}
          currentUid={currentUser.uid}
          onInvite={handleSendInvite}
        />
      )}

      {/* Report Question Modal */}
      <ReportQuestionModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        question={currentQ}
        categoryId={currentQ?.category || selectedCategory}
        uid={currentUser?.uid}
      />

      {/* Guide Modal */}
      <GuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          if (user.displayName) setNickname(user.displayName);
          if (user.email === ADMIN_EMAIL && isAdminPath()) {
            setShowAdminPanel(true);
          }
        }}
      />

      {/* Admin Panel Gate */}
      {showAdminPanel && isAdminUser && (
        <React.Suspense fallback={null}>
          <AdminPanel
            onClose={() => {
              setShowAdminPanel(false);
              if (isAdminPath()) {
                window.history.pushState({}, '', '/');
              }
            }}
          />
        </React.Suspense>
      )}

      <footer className="text-center py-4 text-xs text-slate-600 font-medium">
        TriviaBong &bull; Vibe Coding Web Game
      </footer>

    </div>
  );
}