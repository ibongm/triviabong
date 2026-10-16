import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Trophy, HelpCircle, Coins, User, LogOut, ShieldCheck, Volume2, VolumeX
} from 'lucide-react';
import confetti from 'canvas-confetti';
import kvizArenaLogo from './assets/kvizarena-logo.png';
import { getQuestionsByCategory, getAllCategories } from './data/questionsLoader';
import { getDailyChallengeQuestions } from './utils/dailySeed';
import { checkIsCorrect } from './utils/categoryDisplay';
import {
  MAX_LIVES,
  QUESTIONS_PER_ROUND,
  QUESTION_TIME_SECONDS,
  PLUS_TEN_SECONDS,
  BASE_SCORE,
  SPEED_BONUS_PER_SECOND,
  STREAK_MULTIPLIER_STEP,
  JOKER_COSTS
} from './constants/gameBalance';
import { getCoinsForLevelUp } from './utils/leveling';
import { getTitleForLevel } from './constants/levelTitles';
import { evaluateAchievements, mergeUnlockedAchievements, mentionsHarryPotter, getZagrebDateString } from './utils/achievements';
import { ACHIEVEMENTS, SVI_SMO_MI_MARIJA_ID } from './constants/achievements';
import { mergeMonotonicStats } from './utils/statsMerge';
import { loadStats, migrateStats } from './services/statsStore';
import { sound } from './utils/sound';
import { sanitizeDisplayName } from './utils/publicProfile';
import { loadCachedRekordi, saveCachedRekordi } from './utils/rekordiCache';
// Lazily loaded: each is rendered unconditionally in JSX but self-gates via
// an `isOpen` prop, so the surrounding render call is also changed to
// {showX && (<Suspense><LazyX/></Suspense>)} - without that, React would
// still mount (and download the chunk for) the lazy component on first
// render regardless of isOpen, defeating the point.
const AdminPanel = React.lazy(() => import('./components/AdminPanel'));
const GuideModal = React.lazy(() => import('./components/GuideModal'));
const WhatsNewModal = React.lazy(() => import('./components/WhatsNewModal'));
const AchievementsModal = React.lazy(() => import('./components/AchievementsModal'));
const DailyMissionsModal = React.lazy(() => import('./components/DailyMissionsModal'));
// MatchView is already conditionally rendered (activeMatchId && currentUser
// ? <MatchView/> : ...), so lazy-loading it is a plain import swap.
const MatchView = React.lazy(() => import('./components/MatchView'));
import AuthModal from './components/AuthModal';
import StatsModal from './components/StatsModal';
import LevelBadge from './components/LevelBadge';
import LobbyScreen from './screens/LobbyScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import PlayingScreen from './screens/PlayingScreen';
import GameOverScreen from './screens/GameOverScreen';
import RekordiModal from './components/RekordiModal';
import SecretAchievementOverlay from './components/SecretAchievementOverlay';
import ReportQuestionModal from './components/ReportQuestionModal';
import SubmitQuestionModal from './components/SubmitQuestionModal';
import ConfirmModal from './components/ConfirmModal';
import { applyAnswer } from './utils/gameLogic';
import { useGameRound } from './hooks/useGameRound';
import { useSessionTracking } from './hooks/useSessionTracking';
import { usePresence } from './hooks/usePresence';
import { useOneVsOne } from './hooks/useOneVsOne';
import { useDailyChallenge } from './hooks/useDailyChallenge';
import { useScoreSaving } from './hooks/useScoreSaving';
import { useDailyMissions } from './hooks/useDailyMissions';
import { useAsyncDuels } from './hooks/useAsyncDuels';
import { usePreviousWeekSummary } from './hooks/usePreviousWeekSummary';
import { useLeagues } from './hooks/useLeagues';
import LeaguesModal from './components/LeaguesModal';
import { ANY_CATEGORY } from './utils/asyncDuel';
import AsyncDuelScreen from './screens/AsyncDuelScreen';
import AsyncDuelsModal from './components/AsyncDuelsModal';
import OnlinePlayersModal from './components/OnlinePlayersModal';
import MatchInviteModal from './components/MatchInviteModal';
import { shuffleArray } from './utils/questionUtils';
import { composeRound } from './utils/roundComposer';
import { effectiveTier, measuredAccuracyPercent } from './utils/difficulty';
import { isFeatureEnabled } from './constants/features';
import {
  auth,
  logoutUser,
  getUserStatsFromFirestore,
  pruneUserPlayTimeDays,
  syncUserProfile,
  syncUserStatsToFirestore,
  syncPublicProfile,
  getLeaderboardFromFirestore,
  getRekordiSummary,
  getFastestPerfectRounds,
  logQuestionAttempt,
  logGameResult,
  getDailyAttemptStatus,
  startDailyAttempt,
  deletePresence
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

export default function App() {
  const [gameState, setGameState] = useState('LOBBY');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isMuted, setIsMuted] = useState(() => sound.muted);
  const [roundHistory, setRoundHistory] = useState([]);

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
    lockAnswersBriefly,
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

  // Total time this round spent paused (secret-achievement overlay, answer
  // explanations). Subtracted from the round's elapsed time so reading
  // doesn't count as answering - for the speed_demon achievement and the
  // Rekordi fastest-perfect elapsedMs. A ref, not a roundStartTime shift:
  // the deferred advance callbacks close over an older render's
  // roundStartTime, so a state shift never reached applyRoundEndRewards.
  const pausedMsRef = useRef(0);
  // The round's active-play duration, captured once at round end. The score
  // save used to compute Date.now() - roundStartTime at SAVE time, which also
  // counted time on the game-over screen - e.g. playing signed out and
  // signing in to save minutes later could exceed the rules' elapsedMs cap
  // and get the whole leaderboard write rejected.
  const [finalRoundElapsedMs, setFinalRoundElapsedMs] = useState(null);

  // Answer explanations (FEATURES.EXPLANATIONS, plan Phase 2). After an
  // answer to a question that has an explanation, the round holds - the
  // deferred advance sits in explanationAdvanceRef - until the player taps
  // "Dalje". Never in the Daily Challenge (equal pacing for everyone).
  const explanationsEnabled = isFeatureEnabled('EXPLANATIONS');
  // Difficulty tiers (FEATURES.DIFFICULTY, plan Phase 3): shape the round
  // (3 easy / 4 medium / 3 hard, easy -> hard) and show the "N% got this
  // right" line; FEATURES.DIFFICULTY_BADGE adds the tier chip on top.
  const difficultyEnabled = isFeatureEnabled('DIFFICULTY');
  const difficultyBadgeEnabled = difficultyEnabled && isFeatureEnabled('DIFFICULTY_BADGE');
  const [explanationPaused, setExplanationPaused] = useState(false);
  const explanationAdvanceRef = useRef(null);
  const explanationPausedAtRef = useRef(null);

  useEffect(() => () => clearTimeout(secretRevealTimer.current), []);

  // Level-up toast. Detected by diffing globalStats.level across commits
  // (a useEffect keyed on the level value itself) rather than reading the
  // `events` array applyAnswer returns at each of its call sites - level is
  // a pure function of the resulting xp, so the toast's content
  // (title/coins) can be derived straight from the new level with
  // getTitleForLevel/getCoinsForLevelUp, with no risk of the StrictMode
  // double-invoked-updater duplication the secret-achievement reveal above
  // has to guard against with a ref (see its comment) - an effect only
  // fires once per real commit, not once per updater invocation.
  const prevLevelRef = useRef(globalStats.level || 1);
  const [levelUpToast, setLevelUpToast] = useState(null);
  const levelUpToastTimerRef = useRef(null);
  // Set to true immediately before a setGlobalStats call that's hydrating
  // state from storage/network (auth resolve, sign-out, cross-tab merge)
  // rather than producing it from gameplay - the diff effect below reads
  // this to adopt the incoming level as the new baseline silently instead
  // of treating a placeholder -> real-account (or cross-tab) jump as a
  // level-up. Effects run after commit, so the flag set just before the
  // triggering setGlobalStats call is guaranteed readable here.
  const hydratingStatsRef = useRef(false);
  useEffect(() => {
    const level = globalStats.level || 1;
    if (hydratingStatsRef.current) {
      hydratingStatsRef.current = false;
    } else if (level > prevLevelRef.current) {
      setLevelUpToast({ level, coins: getCoinsForLevelUp(level), title: getTitleForLevel(level) });
      clearTimeout(levelUpToastTimerRef.current);
      levelUpToastTimerRef.current = setTimeout(() => setLevelUpToast(null), 4000);
    }
    prevLevelRef.current = level;
  }, [globalStats.level]);
  useEffect(() => () => clearTimeout(levelUpToastTimerRef.current), []);

  const [leaderboards, setLeaderboards] = useState(() => {
    const saved = localStorage.getItem('triviabong_leaderboards');
    return saved ? JSON.parse(saved) : {};
  });
  const [activeCategoryLeaderboard, setActiveCategoryLeaderboard] = useState([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);


  const [nickname, setNickname] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [showRekordiModal, setShowRekordiModal] = useState(false);
  const [showOnlinePlayersModal, setShowOnlinePlayersModal] = useState(false);
  const [showAsyncDuelsModal, setShowAsyncDuelsModal] = useState(false);
  const [showLeaguesModal, setShowLeaguesModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSubmitQuestionModal, setShowSubmitQuestionModal] = useState(false);
  const [showMissionsModal, setShowMissionsModal] = useState(false);
  const [showDailyConfirm, setShowDailyConfirm] = useState(false);

  // One-time "what's new" announcement for the 2026-08-15 economy rebalance
  // (see WhatsNewModal.jsx) - shown once automatically, gated by a
  // localStorage flag, same one-time-ack idiom as
  // triviabong_daily_win_ack_*. Not tied to sign-in - anonymous stats are
  // migrated too. The lazy useState initializer (not an effect) means the
  // very first render already knows whether to show it, so there's no
  // flash of the lobby before the modal pops in.
  const WHATS_NEW_SEEN_KEY = 'triviabong_seen_economy_v2_announcement';
  const [showWhatsNewModal, setShowWhatsNewModal] = useState(() => !localStorage.getItem(WHATS_NEW_SEEN_KEY));
  const dismissWhatsNewModal = () => {
    localStorage.setItem(WHATS_NEW_SEEN_KEY, '1');
    setShowWhatsNewModal(false);
  };

  // Lobby banner reminder of the same announcement, visible for a fixed
  // window after ship rather than tied to the modal's one-time flag (the
  // user wants it to keep surfacing as a standing reminder even after the
  // modal's been dismissed) - independently dismissible via its own flag.
  const ECONOMY_V2_BANNER_CUTOFF = new Date('2026-08-18T00:00:00');
  const ECONOMY_V2_BANNER_DISMISSED_KEY = 'triviabong_dismissed_economy_v2_banner';
  const [economyV2BannerDismissed, setEconomyV2BannerDismissed] = useState(
    () => !!localStorage.getItem(ECONOMY_V2_BANNER_DISMISSED_KEY)
  );
  const showEconomyV2Banner = !economyV2BannerDismissed && new Date() < ECONOMY_V2_BANNER_CUTOFF;
  const dismissEconomyV2Banner = () => {
    localStorage.setItem(ECONOMY_V2_BANNER_DISMISSED_KEY, '1');
    setEconomyV2BannerDismissed(true);
  };
  // Fetched once on app mount (not re-fetched on every LOBBY visit within
  // the same session - see refreshRekordiData's comment) and refreshed
  // after a score save so a player's own new record shows up promptly.
  // Powers both the compact lobby preview and the full RekordiModal, which
  // is why the fetch can't be deferred until the modal actually opens.
  const [rekordiData, setRekordiData] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [hasAdminClaim, setHasAdminClaim] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    currentUser.getIdTokenResult().then((result) => {
      if (!cancelled) setHasAdminClaim(result.claims?.admin === true);
    }).catch(() => {
      if (!cancelled) setHasAdminClaim(false);
    });
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  // Daily Challenge state/effects - see useDailyChallenge.js. Does not own
  // startDailyChallengeAttempt/submitDaily/launchDailyChallengeRound, which
  // stay below since they're shared crossroads with the non-daily round
  // path (resetRoundState, saveScore).
  const {
    dailyChallengeMode,
    setDailyChallengeMode,
    dailyDateKey,
    setDailyDateKey,
    dailyAttemptStatus,
    setDailyAttemptStatus,
    dailySubmitResult,
    setDailySubmitResult,
    dailyLeaderboard,
    setDailyLeaderboard,
    dailyLobbyMessage,
    showDailyLobbyMessage,
    dailyWinAnnouncement,
    dismissDailyWinAnnouncement,
  } = useDailyChallenge(currentUser, gameState);

  // One-time "Prošli tjedan" lobby card (weekly boards, behind WEEKLY_BOARDS).
  const { summary: previousWeekSummary, dismiss: dismissPreviousWeekSummary } = usePreviousWeekSummary(currentUser);

  // Daily micro-missions (see hooks/useDailyMissions.js) - a no-op while
  // signed out, same as Daily Challenge itself.
  const {
    missionState,
    missionsToday,
    recordMatchComplete,
    recordAsyncDuelPlayed,
    recordAsyncDuelResolved,
    recordDailyComplete,
    recordCorrectCategory,
    recordStreak,
    recordQuestionSubmitted,
    recordSoloRoundComplete,
    recordQuestionReported,
    claimSlot,
    claimCleanSweep,
  } = useDailyMissions(currentUser?.uid, setGlobalStats);

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

  // Plan B: 1v1 live invite state - see useOneVsOne.js for the full
  // subscription/handler set. total1v1Wins stat update on a win is the
  // one place it reaches into shared globalStats.
  const {
    onlinePlayers,
    onlinePlayersCount,
    incomingInvites,
    sentInvite,
    activeMatchId,
    setActiveMatchId,
    setAcceptedInviteId,
    handleSendInvite,
    cancelSentInvite,
    handleMatchOver,
  } = useOneVsOne(currentUser, setGlobalStats, recordMatchComplete, gameState);

  // Async duels (FEATURES.ASYNC_DUELS, plan Phase 4): a separate subsystem from
  // live 1v1 above - see hooks/useAsyncDuels.js. ASYNC_DUELS_ADMIN_PREVIEW
  // lets only the verified admin account see it while the flag is still off
  // (the real boundary is firestore.rules, this just hides the UI).
  const asyncDuelsEnabled = isFeatureEnabled('ASYNC_DUELS')
    || (isFeatureEnabled('ASYNC_DUELS_ADMIN_PREVIEW') && !!currentUser && currentUser.email === ADMIN_EMAIL && !!currentUser.emailVerified);
  const {
    duels: asyncDuels,
    myResults: asyncMyResults,
    isLoading: asyncDuelsLoading,
    busy: asyncDuelsBusy,
    message: asyncDuelsMessage,
    pendingChallengeCount,
    challengeLimitReached: asyncChallengeLimitReached,
    activeDuel,
    summary: duelSummary,
    refresh: refreshAsyncDuels,
    openDuel,
    playDuelById,
    saveProgress: saveDuelProgress,
    finishActiveDuel,
    exitDuelScreen,
    challengePlayer,
    playRandomOpponent,
  } = useAsyncDuels({
    currentUser,
    enabled: asyncDuelsEnabled,
    gameState,
    setGameState,
    setGlobalStats,
    recordAsyncDuelPlayed,
    recordAsyncDuelResolved,
  });

  const handleOpenAsyncDuel = async (duel) => {
    setShowAsyncDuelsModal(false);
    await openDuel(duel);
  };
  const handleChallengePlayer = async (player, category) => {
    const duelId = await challengePlayer(player, category);
    if (duelId) {
      setShowAsyncDuelsModal(false);
      await playDuelById(duelId);
    }
  };
  const handlePlayRandomOpponent = async (category) => {
    const duelId = await playRandomOpponent(category);
    if (duelId) {
      setShowAsyncDuelsModal(false);
      await playDuelById(duelId);
    }
  };

  // Private leagues (FEATURES.LEAGUES, plan Phase 6) - see hooks/useLeagues.js.
  // A /liga/CODE invite link opens the modal on "join" once auth has settled.
  const {
    enabled: leaguesEnabled,
    leagues: myLeagues,
    loading: leaguesLoading,
    refresh: refreshLeagues,
    pendingCode: pendingLeagueCode,
    clearPendingCode: clearPendingLeagueCode,
    linkReady: leagueLinkReady,
  } = useLeagues(currentUser);
  const leaguesModalOpen = leaguesEnabled && (showLeaguesModal || leagueLinkReady);
  const openLeaguesModal = () => {
    if (!currentUser) { setShowAuthModal(true); return; }
    setShowLeaguesModal(true);
    refreshLeagues();
  };
  const closeLeaguesModal = () => {
    setShowLeaguesModal(false);
    clearPendingLeagueCode();
  };
  // "Izazovi" next to a league member: a direct async duel (any category), then play it.
  const handleChallengeLeagueMember = async (member) => {
    closeLeaguesModal();
    const duelId = await challengePlayer(member, ANY_CATEGORY);
    if (duelId) await playDuelById(duelId);
    else setShowAsyncDuelsModal(true); // surfaces the reason (e.g. too many open challenges)
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
        syncUserProfile(user); // refresh lastLogin on restored sessions too, not just explicit logins
        const cloudStats = await getUserStatsFromFirestore(user.uid);

        // If another auth event fired while we were fetching, this
        // result is stale — drop it so the newer handler wins.
        if (myGeneration !== authGeneration) return;

        // Trim playTime day buckets outside the retention window. Piggybacks
        // on the read above rather than doing its own, so pruning is free;
        // fire-and-forget, since a failure just leaves extra map keys.
        pruneUserPlayTimeDays(user.uid, cloudStats);

        hydratingStatsRef.current = true;
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
        hydratingStatsRef.current = true;
        setGlobalStats(loadStats(null));
      }

      if (isAdminPath()) {
        const isVerifiedAdminEmail = user && user.email === ADMIN_EMAIL && user.emailVerified;
        if (isVerifiedAdminEmail) {
          setShowAdminPanel(true);
          setShowAuthModal(false);
        } else if (user) {
          user.getIdTokenResult().then((result) => {
            if (result.claims?.admin === true) {
              setShowAdminPanel(true);
              setShowAuthModal(false);
            } else {
              setShowAdminPanel(false);
              setShowAuthModal(true);
            }
          }).catch(() => {
            setShowAdminPanel(false);
            setShowAuthModal(true);
          });
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
          hydratingStatsRef.current = true;
          setGlobalStats(current => mergeMonotonicStats(current, incoming));
        } catch (err) {
          console.error('Error handling storage event for global stats:', err);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // force=true (score-save call site) always re-fetches and refreshes the
  // cache; force=false (mount effect) serves the cached result within
  // REKORDI_CACHE_TTL_MS instead of re-fetching on every single page load -
  // see rekordiCache.js. The fetch itself is now 2 bounded reads (one
  // maintained doc each for the 5 profile/score boards, one for
  // fastestPerfect) rather than the 6-query, up-to-121-read fan-out this
  // replaced - see getRekordiSummary's comment in services/firebase.js.
  const refreshRekordiData = async (force = false) => {
    if (!force) {
      const cached = loadCachedRekordi();
      if (cached) {
        await Promise.resolve();
        setRekordiData(cached);
        return;
      }
    }
    const [summary, fastestPerfect] = await Promise.all([
      getRekordiSummary(),
      getFastestPerfectRounds(10)
    ]);
    const data = { ...summary, fastestPerfect };
    setRekordiData(data);
    saveCachedRekordi(data);
  };

  // Score-saving state/logic - see useScoreSaving.js. Does not own
  // resetRoundState/handleAnswer, which stay below (shared round-start/
  // round-end crossroads, not save-only state).
  const {
    scoreSaved,
    setScoreSaved,
    roundHighlight,
    setRoundHighlight,
    isSaving,
    autoSaveFailed,
    setAutoSaveFailed,
    saveScore,
    handleSaveScore,
  } = useScoreSaving({
    gameState,
    currentUser,
    dailyChallengeMode,
    score,
    selectedCategory,
    roundElapsedMs: finalRoundElapsedMs,
    correctInRound,
    dailyDateKey,
    nickname,
    leaderboards,
    setLeaderboards,
    refreshRekordiData,
    setDailyLeaderboard,
    setDailySubmitResult,
    recordDailyComplete,
    setGlobalStats,
  });

  // Fetched once on mount, not per lobby visit or on modal open: the
  // compact RekordiBoards preview is always visible on the LOBBY screen
  // (not just inside the modal), so gating this fetch behind opening the
  // modal left the lobby preview stuck on "Učitavanje..." until the player
  // saved a score (the only other refreshRekordiData() call site).
  useEffect(() => {
    queueMicrotask(() => {
      refreshRekordiData();
    });
  }, []);

  const isAnyModalOpen = showAdminPanel || showStatsModal || showGuideModal || showAchievementsModal || showRekordiModal || showOnlinePlayersModal || showAsyncDuelsModal || leaguesModalOpen || showAuthModal || showReportModal || showSubmitQuestionModal || showMissionsModal || showWhatsNewModal || showDailyConfirm;

  const returnToLobby = () => {
    sound.playClick();
    clearRoundTransitionTimers();
    explanationAdvanceRef.current = null;
    explanationPausedAtRef.current = null;
    setExplanationPaused(false);
    clearJokerMessageTimer();
    setDailyChallengeMode(false);
    setDailySubmitResult(null);
    setGameState('LOBBY');
  };

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
    lockAnswersBriefly();
    setScoreSaved(false);
    setAutoSaveFailed(false);
    setDailySubmitResult(null);
    setRoundHighlight(null);
    setRoundHistory([]);
    setGameState('PLAYING');

    setRoundStartTime(Date.now());
    pausedMsRef.current = 0;
    setFinalRoundElapsedMs(null);
    explanationAdvanceRef.current = null;
    explanationPausedAtRef.current = null;
    setExplanationPaused(false);
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

  const launchQuizRound = async () => {
    sound.playClick();
    clearRoundTransitionTimers();
    clearJokerMessageTimer();
    const loadedQuestions = await getQuestionsByCategory(selectedCategory);
    // With the flag off this is exactly the old uniform random slice.
    const shuffled = difficultyEnabled
      ? composeRound(loadedQuestions, { count: QUESTIONS_PER_ROUND })
      : shuffleArray(loadedQuestions).slice(0, QUESTIONS_PER_ROUND);
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
  const startDailyChallengeAttempt = async () => {
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
    resetRoundState(await getDailyChallengeQuestions(dateKey));
  };

  // Public entry point (the lobby's "Dnevni izazov" card): gates the actual
  // attempt-consuming start behind a confirm dialog when a fresh attempt is
  // genuinely available, since startDailyChallengeAttempt above burns the
  // day's one shot the instant it's called, before any question is even
  // shown - an accidental tap or a crashed session otherwise costs the
  // attempt for nothing. Signed-out and already-played cases are unchanged
  // (nothing to confirm - there's either no attempt to lose yet, or none
  // left to warn about).
  const launchDailyChallengeRound = () => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    if (dailyAttemptStatus && !dailyAttemptStatus.canPlay) {
      startDailyChallengeAttempt();
      return;
    }
    setShowDailyConfirm(true);
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
    const roundElapsedMs = roundStartTime ? Math.max(0, Date.now() - roundStartTime - pausedMsRef.current) : undefined;
    setFinalRoundElapsedMs(roundElapsedMs ?? null);
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

    // Mission fallbacks: a FINISHED solo round (victory or game over - this
    // function only runs at round end, never on quitting) feeds the solo
    // alt paths. Daily Challenge rounds have their own mission events
    // (recordDailyComplete) and don't count as solo rounds. Called from the
    // function body, not inside a setState updater, so StrictMode can't
    // double-fire it.
    if (!dailyChallengeMode) {
      const jokers = jokersUsedSnapshot || {};
      recordSoloRoundComplete({
        correct: correctCountSnapshot,
        jokersUsed: !!(jokers.fiftyFifty || jokers.plusTen || jokers.skip),
      });
    }
  };

  // Schedules the post-answer transition. When the answered question has an
  // explanation (and the feature is on, outside the Daily Challenge), the
  // transition is held until continueAfterExplanation instead of firing on
  // the usual timer - the player reads at their own pace.
  const scheduleAfterAnswer = (question, timerRef, delayMs, fn) => {
    if (explanationsEnabled && !dailyChallengeMode && question?.explanation) {
      explanationAdvanceRef.current = fn;
      explanationPausedAtRef.current = Date.now();
      setExplanationPaused(true);
      return;
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      fn();
    }, delayMs);
  };

  const continueAfterExplanation = () => {
    const advance = explanationAdvanceRef.current;
    if (!advance) return; // guards a double-tap on "Dalje"
    explanationAdvanceRef.current = null;
    sound.playClick();
    const pausedMs = Date.now() - (explanationPausedAtRef.current || Date.now());
    explanationPausedAtRef.current = null;
    if (pausedMs > 0) pausedMsRef.current += pausedMs;
    setExplanationPaused(false);
    advance();
  };

  // Enter/Space continues past an answer explanation (mirrors the 1-4/A-D
  // answer shortcuts above).
  useEffect(() => {
    if (!explanationPaused || gameState !== 'PLAYING' || isAnyModalOpen) return;
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        continueAfterExplanation();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleAnswer = (option) => {
    if (selectedOption !== null || answerLocked) return;
    setSelectedOption(option);

    const currentQ = questions[currentIndex];
    const correct = checkIsCorrect(currentQ, option);

    setRoundHistory(prev => [
      ...prev,
      {
        questionId: currentQ.id,
        questionText: currentQ.question || currentQ.tekst || currentQ.pitanje,
        selectedOption: option,
        isCorrect: correct,
        correctOption: currentQ.correct_answer || currentQ.correctAnswer,
        explanation: currentQ.explanation || null,
      }
    ]);

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

      // Daily missions: Category Forcer / Streak slots (see
      // hooks/useDailyMissions.js) - currentQ.category (not selectedCategory)
      // so an Opće znanje round's per-question origin category still counts,
      // same reasoning as logQuestionAttempt's categoryId above.
      recordCorrectCategory(currentQ.category || selectedCategory || 'opca_znanje');
      recordStreak(newStreak);
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
        scheduleAfterAnswer(currentQ, gameOverTimerRef, 1000, () => setGameState('GAMEOVER'));
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
        lockAnswersBriefly();
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
      scheduleAfterAnswer(currentQ, roundTransitionTimerRef, 1200, advanceOrFinish);
    }
  };

  const dismissSecretAchievement = () => {
    const advance = pendingAdvanceRef.current;
    if (!advance) return; // guards a double-tap on "Nastavi"
    pendingAdvanceRef.current = null;
    sound.playClick();
    setSecretAchievement(null);

    // Time spent staring at the overlay isn't time spent answering - see
    // pausedMsRef for why this is a ref rather than a roundStartTime shift.
    const pausedMs = Date.now() - (secretPausedAtRef.current || Date.now());
    secretPausedAtRef.current = null;
    if (pausedMs > 0) pausedMsRef.current += pausedMs;

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
    setRoundHistory(prev => [
      ...prev,
      {
        questionId: currentQ?.id || null,
        questionText: currentQ ? (currentQ.question || currentQ.tekst || currentQ.pitanje) : 'Pitanje',
        selectedOption: 'TIMEOUT',
        isCorrect: false,
        correctOption: currentQ ? (currentQ.correct_answer || currentQ.correctAnswer) : '',
        explanation: currentQ?.explanation || null,
      }
    ]);
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
      scheduleAfterAnswer(currentQ, gameOverTimerRef, 1000, () => setGameState('GAMEOVER'));
      return;
    }

    scheduleAfterAnswer(currentQ, roundTransitionTimerRef, 1200, () => {
      setSelectedOption(null);
      setHiddenOptions([]);
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(c => c + 1);
        lockAnswersBriefly();
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
    });
  };

  const handleAnswerRef = useRef(handleAnswer);
  const handleAnswerTimeoutRef = useRef(handleAnswerTimeout);

  useEffect(() => {
    handleAnswerRef.current = handleAnswer;
    handleAnswerTimeoutRef.current = handleAnswerTimeout;
  });

  useEffect(() => {
    if (gameState !== 'PLAYING' || selectedOption !== null || isAnyModalOpen) return;

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
  }, [gameState, selectedOption, isAnyModalOpen, currentIndex, setTimeLeft]);

  // Fire the timeout exactly once when the countdown reaches 0. This lives in
  // its own effect (keyed on timeLeft) because the interval effect above is
  // intentionally NOT keyed on timeLeft and therefore can't observe the tick
  // that hits zero. handleAnswerTimeout() sets selectedOption ('TIMEOUT'),
  // which flips the guard below and prevents any re-fire.
  useEffect(() => {
    if (gameState !== 'PLAYING' || selectedOption !== null || isAnyModalOpen) return;
    if (timeLeft <= 0) {
      queueMicrotask(() => {
        handleAnswerTimeoutRef.current?.();
      });
    }
  }, [timeLeft, gameState, selectedOption, isAnyModalOpen]);

  useEffect(() => {
    if (gameState !== 'PLAYING' || selectedOption !== null || isAnyModalOpen || !currentQ) return;

    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      let optionIdx = -1;
      if (['1', 'a', 'A'].includes(e.key)) optionIdx = 0;
      else if (['2', 'b', 'B'].includes(e.key)) optionIdx = 1;
      else if (['3', 'c', 'C'].includes(e.key)) optionIdx = 2;
      else if (['4', 'd', 'D'].includes(e.key)) optionIdx = 3;

      if (optionIdx >= 0 && currentShuffledOptions[optionIdx] !== undefined) {
        if (!hiddenOptions.includes(optionIdx)) {
          handleAnswerRef.current?.(currentShuffledOptions[optionIdx]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, selectedOption, isAnyModalOpen, currentQ, currentShuffledOptions, hiddenOptions]);

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
      lockAnswersBriefly();
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

  const isAdminUser = currentUser && (hasAdminClaim || (currentUser.email === ADMIN_EMAIL && currentUser.emailVerified));

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
          <img
            src={kvizArenaLogo}
            alt="KvizArena"
            className="h-20 w-auto object-contain group-hover:scale-105 transition-transform shrink-0"
          />
        </div>

        <div className="flex items-center flex-wrap justify-end gap-2 min-w-0">
          <button
            onClick={() => { sound.playClick(); setShowStatsModal(true); }}
            className="flex items-center gap-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 px-3 py-2.5 rounded-xl text-amber-400 transition-colors shadow-sm active:scale-95 active:brightness-95 min-h-[44px]"
            title={`Razina i Statistika — ${getTitleForLevel(globalStats.level || 1)}`}
          >
            <span className="flex items-center gap-1.5 text-xs font-bold">
              <LevelBadge level={globalStats.level || 1} size="micro" showStars={false} />
              <span className="hidden sm:inline">Raz.</span>
            </span>
            <span className="w-px h-3.5 bg-slate-800" />
            <span className="flex items-center gap-1.5 text-xs font-bold">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>{globalStats.coins}</span>
            </span>
          </button>

          <button
            onClick={() => { sound.playClick(); setShowAchievementsModal(true); }}
            className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 px-3 py-2.5 rounded-xl text-xs font-bold text-amber-400 transition-colors shadow-sm active:scale-95 active:brightness-95 min-h-[44px]"
            title="Trofeji"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>{Object.keys(globalStats.unlockedAchievements || {}).length}</span>
          </button>

          <button
            onClick={() => { sound.playClick(); setShowGuideModal(true); }}
            className="flex items-center justify-center gap-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-300 transition-colors active:scale-95 active:brightness-95 min-h-[44px] min-w-[44px]"
            title="Kako Igrati"
          >
            <HelpCircle className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Vodič</span>
          </button>

          <button
            onClick={() => {
              const muted = sound.toggleMute();
              setIsMuted(muted);
            }}
            className="flex items-center justify-center gap-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-300 transition-colors active:scale-95 active:brightness-95 min-h-[44px] min-w-[44px]"
            title={isMuted ? "Zvuk je isključen (Klikni za uključivanje)" : "Zvuk je uključen (Klikni za isključivanje)"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {isAdminUser && (
            <button
              onClick={() => setShowAdminPanel(true)}
              className="flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors active:scale-95 active:brightness-95 min-h-[44px]"
              title="Otvori Admin Panel"
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}

          {currentUser ? (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl min-h-[44px]">
              <span className="text-xs font-bold text-slate-200 truncate max-w-[160px]">
                {currentUser.displayName || currentUser.email.split('@')[0]}
              </span>
              <button
                onClick={handlePlayerLogout}
                className="text-slate-500 hover:text-rose-400 transition-colors p-1.5 rounded-lg active:scale-90"
                title="Odjava"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { sound.playClick(); setShowAuthModal(true); }}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-md shadow-amber-500/10 active:scale-95 active:brightness-95 min-h-[44px]"
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
          <React.Suspense fallback={null}>
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
          </React.Suspense>
        ) : (
        <>
        {gameState === 'LOBBY' && (
          <LobbyScreen
            sentInvite={sentInvite}
            onCancelSentInvite={cancelSentInvite}
            dailyWinAnnouncement={dailyWinAnnouncement}
            onDismissDailyWinAnnouncement={dismissDailyWinAnnouncement}
            previousWeekSummary={previousWeekSummary}
            onDismissPreviousWeekSummary={dismissPreviousWeekSummary}
            onLaunchDailyChallenge={launchDailyChallengeRound}
            currentUser={currentUser}
            dailyAttemptStatus={dailyAttemptStatus}
            onShowAuthModal={() => setShowAuthModal(true)}
            onShowOnlinePlayersModal={() => setShowOnlinePlayersModal(true)}
            onlinePlayersCount={onlinePlayersCount}
            dailyLobbyMessage={dailyLobbyMessage}
            categoriesList={categoriesList}
            onSelectCategory={selectCategory}
            onShowRekordiModal={() => setShowRekordiModal(true)}
            rekordiData={rekordiDataWithDaily}
            onShowSubmitQuestionModal={() => setShowSubmitQuestionModal(true)}
            onShowMissionsModal={() => setShowMissionsModal(true)}
            missionState={missionState}
            showEconomyV2Banner={showEconomyV2Banner}
            onDismissEconomyV2Banner={dismissEconomyV2Banner}
            onShowGuideModal={() => setShowGuideModal(true)}
            asyncDuelsEnabled={asyncDuelsEnabled}
            pendingChallengeCount={pendingChallengeCount}
            onShowAsyncDuelsModal={() => { setShowAsyncDuelsModal(true); refreshAsyncDuels(); }}
            leaguesEnabled={leaguesEnabled}
            onShowLeaguesModal={openLeaguesModal}
          />
        )}

        {gameState === 'ASYNC_DUEL' && currentUser && (
          <AsyncDuelScreen
            activeDuel={activeDuel}
            summary={duelSummary}
            currentUid={currentUser.uid}
            onProgress={saveDuelProgress}
            onFinish={finishActiveDuel}
            onExit={exitDuelScreen}
          />
        )}

        {gameState === 'LEADERBOARD' && (
          <LeaderboardScreen
            selectedCategory={selectedCategory}
            isLoadingLeaderboard={isLoadingLeaderboard}
            activeCategoryLeaderboard={activeCategoryLeaderboard}
            onReturnToLobby={returnToLobby}
            onLaunchQuizRound={launchQuizRound}
          />
        )}

        {gameState === 'PLAYING' && currentQ && (
          <PlayingScreen
            lives={lives}
            timeLeft={timeLeft}
            score={score}
            currentQ={currentQ}
            selectedCategory={selectedCategory}
            currentIndex={currentIndex}
            questionsLength={questions.length}
            onShowReportModal={() => setShowReportModal(true)}
            currentShuffledOptions={currentShuffledOptions}
            hiddenOptions={hiddenOptions}
            selectedOption={selectedOption}
            answerLocked={answerLocked}
            onAnswer={handleAnswer}
            fiftyFiftyLocked={fiftyFiftyLocked}
            fiftyFiftyShort={fiftyFiftyShort}
            plusTenLocked={plusTenLocked}
            plusTenShort={plusTenShort}
            skipLocked={skipLocked}
            skipShort={skipShort}
            coins={globalStats.coins}
            onShowJokerMessage={showJokerMessage}
            onActivateFiftyFifty={activateFiftyFifty}
            onActivatePlusTen={activatePlusTen}
            onActivateSkip={activateSkip}
            jokerMessage={jokerMessage}
            explanation={explanationsEnabled && !dailyChallengeMode && selectedOption !== null ? (currentQ?.explanation || null) : null}
            explanationPaused={explanationPaused}
            onContinueAfterExplanation={continueAfterExplanation}
            difficultyTier={difficultyBadgeEnabled && currentQ ? effectiveTier(currentQ) : null}
            accuracyPercent={difficultyEnabled && selectedOption !== null && currentQ ? measuredAccuracyPercent(currentQ) : null}
          />
        )}

        {(gameState === 'GAMEOVER' || gameState === 'VICTORY') && (
          <GameOverScreen
            gameState={gameState}
            score={score}
            dailyChallengeMode={dailyChallengeMode}
            scoreSaved={scoreSaved}
            dailySubmitResult={dailySubmitResult}
            dailyLeaderboard={dailyLeaderboard}
            currentUser={currentUser}
            roundHighlight={roundHighlight}
            autoSaveFailed={autoSaveFailed}
            onRetrySave={() => {
              setAutoSaveFailed(false);
              saveScore(getPlayerDisplayName(currentUser)).catch(() => setAutoSaveFailed(true));
            }}
            nickname={nickname}
            onNicknameChange={setNickname}
            onSaveScoreSubmit={handleSaveScore}
            isSaving={isSaving}
            roundHistory={roundHistory}
            onPlayAgain={launchQuizRound}
            onReturnToLobby={returnToLobby}
          />
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
      {showAchievementsModal && (
        <React.Suspense fallback={null}>
          <AchievementsModal
            isOpen={showAchievementsModal}
            onClose={() => setShowAchievementsModal(false)}
            stats={globalStats}
          />
        </React.Suspense>
      )}

      {/* Secret achievement reveal - pauses the round until dismissed. The
          gameState check matters: the header logo can drop the player to the
          lobby mid-overlay, and without it the overlay would follow them. */}
      <SecretAchievementOverlay
        isOpen={!!secretAchievement && gameState === 'PLAYING'}
        achievement={secretAchievement}
        onClose={dismissSecretAchievement}
      />

      {/* Level-up toast - auto-dismisses (see levelUpToastTimerRef), does not
          pause the round the way the secret-achievement overlay does. */}
      {levelUpToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3 bg-slate-900 border border-amber-500/40 text-white rounded-2xl px-5 py-3 shadow-2xl">
            <LevelBadge level={levelUpToast.level} size="lg" className="shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-400">Razina {levelUpToast.level}: {levelUpToast.title}</p>
              <p className="text-xs text-slate-400">+{levelUpToast.coins} novčića</p>
            </div>
            <button
              onClick={() => setLevelUpToast(null)}
              className="text-slate-500 hover:text-slate-300 ml-2"
              aria-label="Zatvori"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Rekordi Modal */}
      <RekordiModal
        isOpen={showRekordiModal}
        onClose={() => setShowRekordiModal(false)}
        data={rekordiDataWithDaily}
        currentUser={currentUser}
      />

      {currentUser && (
        <OnlinePlayersModal
          isOpen={showOnlinePlayersModal}
          onClose={() => setShowOnlinePlayersModal(false)}
          currentUid={currentUser.uid}
          onInvite={handleSendInvite}
          players={onlinePlayers}
        />
      )}

      {currentUser && asyncDuelsEnabled && (
        <AsyncDuelsModal
          isOpen={showAsyncDuelsModal}
          onClose={() => setShowAsyncDuelsModal(false)}
          currentUid={currentUser.uid}
          onlinePlayers={onlinePlayers}
          duels={asyncDuels}
          myResults={asyncMyResults}
          isLoading={asyncDuelsLoading}
          busy={asyncDuelsBusy}
          message={asyncDuelsMessage}
          challengeLimitReached={asyncChallengeLimitReached}
          onRefresh={refreshAsyncDuels}
          onOpenDuel={handleOpenAsyncDuel}
          onChallenge={handleChallengePlayer}
          onPlayRandom={handlePlayRandomOpponent}
        />
      )}

      {leaguesEnabled && (
        <LeaguesModal
          isOpen={leaguesModalOpen}
          onClose={closeLeaguesModal}
          currentUser={currentUser}
          myName={currentUser ? getPlayerDisplayName(currentUser) : ''}
          leagues={myLeagues}
          loading={leaguesLoading}
          onRefresh={refreshLeagues}
          pendingCode={pendingLeagueCode}
          onClearPendingCode={clearPendingLeagueCode}
          onShowAuthModal={() => setShowAuthModal(true)}
          canChallenge={asyncDuelsEnabled}
          onChallengeMember={handleChallengeLeagueMember}
        />
      )}

      {/* Report Question Modal */}
      <ReportQuestionModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        question={currentQ}
        categoryId={currentQ?.category || selectedCategory}
        uid={currentUser?.uid}
        onReported={recordQuestionReported}
      />

      {/* Submit Question Modal */}
      <SubmitQuestionModal
        isOpen={showSubmitQuestionModal}
        onClose={() => setShowSubmitQuestionModal(false)}
        uid={currentUser?.uid}
        onSubmitted={recordQuestionSubmitted}
      />

      {/* Daily Missions Modal */}
      {showMissionsModal && (
        <React.Suspense fallback={null}>
          <DailyMissionsModal
            isOpen={showMissionsModal}
            onClose={() => setShowMissionsModal(false)}
            missionsToday={missionsToday}
            missionState={missionState}
            onClaimSlot={claimSlot}
            onClaimCleanSweep={claimCleanSweep}
          />
        </React.Suspense>
      )}

      {/* What's New Modal (economy rebalance announcement) */}
      {showWhatsNewModal && (
        <React.Suspense fallback={null}>
          <WhatsNewModal
            isOpen={showWhatsNewModal}
            onClose={dismissWhatsNewModal}
            onOpenGuide={() => { dismissWhatsNewModal(); setShowGuideModal(true); }}
          />
        </React.Suspense>
      )}

      <ConfirmModal
        isOpen={showDailyConfirm}
        onClose={() => setShowDailyConfirm(false)}
        onConfirm={() => { setShowDailyConfirm(false); startDailyChallengeAttempt(); }}
        title="Pokreni dnevni izazov?"
        message="Ovo troši tvoj jedini dnevni pokušaj, čak i ako ne završiš rundu. Nastaviti?"
        confirmLabel="Da, kreni"
      />

      {/* Guide Modal */}
      {showGuideModal && (
        <React.Suspense fallback={null}>
          <GuideModal
            isOpen={showGuideModal}
            onClose={() => setShowGuideModal(false)}
          />
        </React.Suspense>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          if (user.displayName) setNickname(user.displayName);
          if (isAdminPath()) {
            if (user.email === ADMIN_EMAIL && user.emailVerified) {
              setShowAdminPanel(true);
            } else {
              user.getIdTokenResult().then((result) => {
                if (result.claims?.admin === true) {
                  setShowAdminPanel(true);
                }
              }).catch(() => {});
            }
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
        KvizArena &bull; Powered by Bong
      </footer>

    </div>
  );
}