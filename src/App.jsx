import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Heart, Trophy, Zap, RefreshCw, Flame, Award, ChevronRight, HelpCircle,
  Scissors, FastForward, Clock, Crown, Coins, User, LogOut, ShieldCheck, Play, Star, Medal
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getQuestionsByCategory, getAllCategories } from './data/questionsLoader';
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
import { evaluateAchievements, mergeUnlockedAchievements, computeDayStreakUpdate } from './utils/achievements';
import { mergeMonotonicStats } from './utils/statsMerge';
import { loadStats, saveStats, migrateStats, getStorageKey } from './services/statsStore';
import { sound } from './utils/sound';
const AdminPanel = React.lazy(() => import('./components/AdminPanel'));
import AuthModal from './components/AuthModal';
import StatsModal from './components/StatsModal';
import GuideModal from './components/GuideModal';
import AchievementsModal from './components/AchievementsModal';
import RekordiModal from './components/RekordiModal';
import RekordiBoards from './components/RekordiBoards';
import TimerRing from './components/TimerRing';
import { applyAnswer } from './utils/gameLogic';
import { useGameRound } from './hooks/useGameRound';
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
  getFastestPerfectRounds
} from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const ADMIN_EMAIL = 'ivanm.ploce@gmail.com';

const isAdminPath = () => {
  const path = window.location.pathname;
  return path === '/admin' || path === '/admin/';
};

const getPlayerDisplayName = (user) => (user.displayName || user.email?.split('@')[0] || 'Igrač').slice(0, 20);

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

  const [leaderboards, setLeaderboards] = useState(() => {
    const saved = localStorage.getItem('triviabong_leaderboards');
    return saved ? JSON.parse(saved) : {};
  });
  const [activeCategoryLeaderboard, setActiveCategoryLeaderboard] = useState([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  const [nickname, setNickname] = useState('');
  const [scoreSaved, setScoreSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveFailed, setAutoSaveFailed] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [showRekordiModal, setShowRekordiModal] = useState(false);
  // Fetched once (not re-fetched every lobby visit - getFastestPerfectRounds/
  // getBestScoresAcrossCategories read every category's leaderboard, so
  // refetching on every mount would be wasteful) and refreshed after a score
  // save so a player's own new record shows up promptly.
  const [rekordiData, setRekordiData] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

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

  useEffect(() => {
    if (showRekordiModal && !rekordiData) {
      refreshRekordiData();
    }
  }, [showRekordiModal, rekordiData]);

  const isAnyModalOpen = showAdminPanel || showStatsModal || showGuideModal || showAchievementsModal || showRekordiModal || showAuthModal;

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

  const launchQuizRound = () => {
    sound.playClick();
    clearRoundTransitionTimers();
    clearJokerMessageTimer();
    const loadedQuestions = getQuestionsByCategory(selectedCategory);
    const shuffled = [...loadedQuestions].sort(() => 0.5 - Math.random()).slice(0, QUESTIONS_PER_ROUND);

    setQuestions(shuffled);
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
    setGameState('PLAYING');

    setRoundStartTime(Date.now());
    setFastAnswerStreak(0);
    setFiftyFiftyUsedOnIndex(null);
    setSkipUsedAtLastLife(false);

    setGlobalStats(prev => {
      const { stats } = applyAnswer(prev, {}, { type: 'START_ROUND' });
      return stats;
    });
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

  const applyRoundEndRewards = (isPerfect, { isVictory = false, finalScore, jokersUsedSnapshot, skipUsedAtLastLifeSnapshot } = {}) => {
    setGlobalStats(prev => {
      const jokers = jokersUsedSnapshot || { fiftyFifty: false, plusTen: false, skip: false };
      const { stats } = applyAnswer(prev, {}, {
        type: 'ROUND_END',
        isPerfect,
        finalScore,
        jokersUsed: jokers,
        skipUsedAtLastLife: skipUsedAtLastLifeSnapshot,
        roundElapsedMs: roundStartTime ? Date.now() - roundStartTime : undefined,
        isVictory
      });
      return stats;
    });
  };

  const handleAnswer = (option) => {
    if (selectedOption !== null || answerLocked) return;
    setSelectedOption(option);

    const currentQ = questions[currentIndex];
    const correct = checkIsCorrect(currentQ, option);

    let newCorrectInRound = correctInRound;
    let newScore = score;

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
          newStreak
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

    roundTransitionTimerRef.current = setTimeout(() => {
      roundTransitionTimerRef.current = null;
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
          skipUsedAtLastLifeSnapshot: skipUsedAtLastLife
        });
        setGameState('VICTORY');
      }
    }, 1200);
  };

  const handleAnswerTimeout = () => {
    sound.playWrong();
    updateCategoryStats(false, 0, 0);
    setStreak(0);
    setFastAnswerStreak(0);
    const newLives = lives - 1;
    setLives(newLives);
    setSelectedOption('TIMEOUT');

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
    if (jokersUsed.fiftyFifty || globalStats.coins < JOKER_COSTS.fiftyFifty || !currentQ) return;

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
    if (jokersUsed.plusTen || globalStats.coins < JOKER_COSTS.plusTen) return;
    sound.playClick();
    setTimeLeft(t => t + PLUS_TEN_SECONDS);
    const newJokersUsed = { ...jokersUsed, plusTen: true };
    setJokersUsed(newJokersUsed);
    checkTacticianOnJokerUse(newJokersUsed, JOKER_COSTS.plusTen);
  };

  const activateSkip = () => {
    if (jokersUsed.skip || globalStats.coins < JOKER_COSTS.skip) return;
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

  const saveScore = async (entryName) => {
    if (!entryName || scoreSaved || isSaving) return;
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
    await logoutUser();
    setShowAdminPanel(false);
    sound.playClick();
  };

  const categoriesList = useMemo(() => {
    return getAllCategories();
  }, []);

  const isAdminUser = currentUser && currentUser.email === ADMIN_EMAIL;

  // Split each joker's "disabled" reason: already used / mid-answer is truly
  // inert (native disabled, nothing to explain), but "not enough coins" stays
  // clickable so activateFiftyFifty/activatePlusTen/activateSkip's own click can surface a
  // message instead of just silently dimming - the player might not otherwise
  // know *why* it's greyed out.
  const fiftyFiftyLocked = jokersUsed.fiftyFifty || selectedOption !== null;
  const fiftyFiftyShort = globalStats.coins < JOKER_COSTS.fiftyFifty;
  const plusTenLocked = jokersUsed.plusTen || selectedOption !== null;
  const plusTenShort = globalStats.coins < JOKER_COSTS.plusTen;
  const skipLocked = jokersUsed.skip || selectedOption !== null;
  const skipShort = globalStats.coins < JOKER_COSTS.skip;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-amber-500 selection:text-slate-950">

      {/* Header */}
      <header className="w-full max-w-4xl mx-auto px-4 py-4 flex justify-between items-center border-b border-slate-900">
        <div
          onClick={returnToLobby}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
            TB
          </div>
          <span className="font-black text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            TriviaBong
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => { sound.playClick(); setShowStatsModal(true); }}
            className="flex items-center gap-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 rounded-xl text-amber-400 transition-colors shadow-sm active:scale-95 active:brightness-95"
            title="Razina i Statistika"
          >
            <span className="flex items-center gap-1.5 text-xs font-bold">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Lvl {globalStats.level || 1}</span>
            </span>
            <span className="w-px h-3.5 bg-slate-800" />
            <span className="flex items-center gap-1.5 text-xs font-bold">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>{globalStats.coins}</span>
            </span>
          </button>

          <button
            onClick={() => { sound.playClick(); setShowGuideModal(true); }}
            className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 transition-colors active:scale-95 active:brightness-95"
            title="Kako Igrati"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Vodič</span>
          </button>

          {isAdminUser && (
            <button
              onClick={() => setShowAdminPanel(true)}
              className="flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors active:scale-95 active:brightness-95"
              title="Otvori Admin Panel"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin</span>
            </button>
          )}

          {currentUser ? (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
              <span className="text-xs font-bold text-slate-200 truncate max-w-[100px]">
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
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-md shadow-amber-500/10 active:scale-95 active:brightness-95"
            >
              <User className="w-3.5 h-3.5" />
              <span>Prijava</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-2xl mx-auto px-4 py-8 flex-1 flex flex-col justify-center">

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

            {(() => {
              // Opće znanje draws from every category's questions combined
              // (see questionsLoader.js AGGREGATE_CATEGORIES) - it's the
              // biggest, most-replayable pool, so it gets a full-width
              // featured card above the grid instead of blending into it
              // as one more same-weight tile.
              const featuredKey = 'opca_znanje';
              const featured = getCategoryDetails(featuredKey);
              const FeaturedIcon = featured.icon;
              const restCategories = categoriesList.filter(k => k !== featuredKey);

              return (
                <>
                  <button
                    onClick={() => selectCategory(featuredKey)}
                    className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 rounded-2xl transition-all group shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:brightness-105 active:scale-[0.97] active:brightness-95"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 rounded-xl bg-slate-950/10 border border-slate-950/10 group-hover:scale-110 transition-transform">
                        <FeaturedIcon className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <span className="font-black text-base block">{featured.label}</span>
                        <span className="text-xs font-bold text-slate-950/70">Pitanja iz svih kategorija - najveći fond</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-950/60 group-hover:text-slate-950 transition-colors" />
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {restCategories.map(catKey => {
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
                </>
              );
            })()}

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
              <RekordiBoards data={rekordiData} limitPerBoard={3} compact />
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
                <span>{currentIndex + 1} / {questions.length}</span>
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
                      btnStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold";
                    } else if (option === selectedOption) {
                      btnStyle = "bg-rose-500/20 border-rose-500 text-rose-300 font-bold";
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
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6">
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

      </main>

      {/* Stats Modal */}
      <StatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        stats={globalStats}
        onOpenAchievements={() => setShowAchievementsModal(true)}
      />

      {/* Achievements Modal */}
      <AchievementsModal
        isOpen={showAchievementsModal}
        onClose={() => setShowAchievementsModal(false)}
        stats={globalStats}
      />

      {/* Rekordi Modal */}
      <RekordiModal
        isOpen={showRekordiModal}
        onClose={() => setShowRekordiModal(false)}
        data={rekordiData}
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