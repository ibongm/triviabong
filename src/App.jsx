import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Heart, Zap, RefreshCw, Flame, Award,
  Scissors, FastForward, Clock, Crown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getQuestionsByCategory, getAllCategories } from './data/questionsLoader';
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
import { evaluateAchievements, mergeUnlockedAchievements, computeDayStreakUpdate, mentionsHarryPotter } from './utils/achievements';
import { ACHIEVEMENTS, SVI_SMO_MI_MARIJA_ID } from './constants/achievements';
import { sound } from './utils/sound';
import { sanitizeDisplayName } from './utils/publicProfile';
import { getCategoryDetails } from './utils/categoryDetails';
import { shuffleArray, getQuestionOptions, checkIsCorrect } from './utils/quizQuestions';
import { ADMIN_EMAIL, isAdminPath } from './utils/adminAccess';
import AdminPanel from './components/admin/AdminPanel';
import AuthModal from './components/AuthModal';
import StatsModal from './components/StatsModal';
import GuideModal from './components/GuideModal';
import AchievementsModal from './components/AchievementsModal';
import RekordiModal from './components/RekordiModal';
import SecretAchievementOverlay from './components/SecretAchievementOverlay';
import TimerRing from './components/TimerRing';
import AppHeader from './components/screens/AppHeader';
import LobbyScreen from './components/screens/LobbyScreen';
import CategoryLeaderboardScreen from './components/screens/CategoryLeaderboardScreen';
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
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  // Briefly ignored right after a new question mounts, since answer buttons
  // keep the same DOM node (key={idx}) across the transition - without this,
  // a duplicate/delayed mobile tap landing as the button re-enables gets
  // recorded as a real answer to the new question instead of being dropped.
  const [answerLocked, setAnswerLocked] = useState(true);

  const [currentShuffledOptions, setCurrentShuffledOptions] = useState([]);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [streak, setStreak] = useState(0);
  const [correctInRound, setCorrectInRound] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_SECONDS);
  // Round-scoped tracking for achievements only - reset in launchQuizRound.
  const [roundStartTime, setRoundStartTime] = useState(null);
  const [fastAnswerStreak, setFastAnswerStreak] = useState(0);
  const [fiftyFiftyUsedOnIndex, setFiftyFiftyUsedOnIndex] = useState(null);
  const [skipUsedAtLastLife, setSkipUsedAtLastLife] = useState(false);
  const [globalStats, setGlobalStats] = useState(() => {
    const saved = localStorage.getItem('triviabong_global_stats');
    // Merge over defaults (not replace) so a field added to DEFAULT_GLOBAL_STATS
    // after a player already has saved stats shows up as its real default
    // instead of undefined - otherwise every new stat field silently breaks
    // for existing players until they happen to overwrite it.
    return saved ? { ...DEFAULT_GLOBAL_STATS, ...JSON.parse(saved) } : DEFAULT_GLOBAL_STATS;
  });

  const [jokersUsed, setJokersUsed] = useState({ fiftyFifty: false, plusTen: false, skip: false });
  const [hiddenOptions, setHiddenOptions] = useState([]);
  const [jokerMessage, setJokerMessage] = useState(null);
  const jokerMessageTimer = useRef(null);
  const showJokerMessage = (text) => {
    clearTimeout(jokerMessageTimer.current);
    setJokerMessage(text);
    jokerMessageTimer.current = setTimeout(() => setJokerMessage(null), 2000);
  };

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

  // Sync options on index change
  useEffect(() => {
    setHiddenOptions([]);
    setSelectedOption(null);
    setAnswerLocked(true);
    if (questions[currentIndex]) {
      const rawOpts = getQuestionOptions(questions[currentIndex]);
      setCurrentShuffledOptions(shuffleArray(rawOpts));
    }
    const unlockTimer = setTimeout(() => setAnswerLocked(false), 300);
    return () => clearTimeout(unlockTimer);
  }, [currentIndex, questions]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Block syncing until this account's own stats have loaded below -
      // otherwise the outgoing account's in-memory globalStats can get
      // written into the new account's profile before the fetch resolves.
      setStatsReadyForUid(null);
      setCurrentUser(user);
      if (user) {
        if (user.displayName) setNickname(user.displayName);
        const cloudStats = await getUserStatsFromFirestore(user.uid);
        setGlobalStats(prev => {
          const next = {
            ...prev,
            // No existing doc means this account has never saved stats before -
            // reset every field instead of inheriting whatever the previous
            // account left in memory.
            ...(cloudStats || DEFAULT_GLOBAL_STATS)
          };
          const newlyUnlocked = evaluateAchievements(next, { isSignedIn: true });
          next.unlockedAchievements = mergeUnlockedAchievements(next, newlyUnlocked);
          return next;
        });
        setStatsReadyForUid(user.uid);
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

  // Save state
  useEffect(() => {
    localStorage.setItem('triviabong_leaderboards', JSON.stringify(leaderboards));
  }, [leaderboards]);

  useEffect(() => {
    localStorage.setItem('triviabong_global_stats', JSON.stringify(globalStats));
    if (currentUser?.uid && statsReadyForUid === currentUser.uid) {
      syncUserStatsToFirestore(currentUser.uid, globalStats);
      syncPublicProfile(currentUser.uid, getPlayerDisplayName(currentUser), globalStats);
    }
  }, [globalStats, currentUser, statsReadyForUid]);

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
    (async () => {
      await refreshRekordiData();
    })();
  }, []);

  // Timer
  useEffect(() => {
    if (gameState !== 'PLAYING' || selectedOption !== null) return;

    if (timeLeft <= 0) {
      handleAnswerTimeout();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 4 && prev > 1) sound.playTick();
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, gameState, selectedOption]);

  const selectCategory = async (catKey) => {
    sound.playClick();
    setSelectedCategory(catKey);
    setGameState('LEADERBOARD');
    setIsLoadingLeaderboard(true);

    const remoteScores = await getLeaderboardFromFirestore(catKey);
    if (remoteScores.length > 0) {
      setActiveCategoryLeaderboard(remoteScores);
    } else {
      setActiveCategoryLeaderboard(leaderboards[catKey] || []);
    }
    setIsLoadingLeaderboard(false);
  };

  const launchQuizRound = () => {
    sound.playClick();
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

    // Drop any reveal left over from an abandoned round (e.g. the header
    // logo dumping the player back to the lobby mid-overlay). Deliberately
    // does NOT reset secretCelebratedRef - that's mount-scoped.
    clearTimeout(secretRevealTimer.current);
    pendingAdvanceRef.current = null;
    secretPausedAtRef.current = null;
    setSecretAchievement(null);

    setGlobalStats(prev => {
      const { dayStreak, lastPlayedDate } = computeDayStreakUpdate(prev);
      const next = {
        ...prev,
        totalGames: (prev.totalGames || 0) + 1,
        dayStreak,
        lastPlayedDate
      };
      const newlyUnlocked = evaluateAchievements(next, {});
      next.unlockedAchievements = mergeUnlockedAchievements(next, newlyUnlocked);
      return next;
    });
  };

  const updateCategoryStats = (isCorrect) => {
    const cat = selectedCategory || 'opca_znanje';
    setGlobalStats(prev => {
      const prevCat = prev.categoryStats?.[cat] || { total: 0, correct: 0 };
      const newStreak = isCorrect ? streak + 1 : 0;

      const next = {
        ...prev,
        totalAnswered: (prev.totalAnswered || 0) + 1,
        totalCorrect: (prev.totalCorrect || 0) + (isCorrect ? 1 : 0),
        maxStreak: Math.max(prev.maxStreak || 0, newStreak),
        totalScore: (prev.totalScore || 0) + (isCorrect ? score : 0),
        categoryStats: {
          ...prev.categoryStats,
          [cat]: {
            total: prevCat.total + 1,
            correct: prevCat.correct + (isCorrect ? 1 : 0)
          }
        }
      };
      // Only cumulative/category-total achievements are checkable here - the
      // rest need round/answer-scoped context this function doesn't have,
      // and get evaluated at their own checkpoints instead.
      const newlyUnlocked = evaluateAchievements(next, {});
      next.unlockedAchievements = mergeUnlockedAchievements(next, newlyUnlocked);
      return next;
    });
  };

  // Round-end coin/XP payout, called once from every place a round can end.
  // isPerfect (all QUESTIONS_PER_ROUND answered correctly - no wrong answers,
  // timeouts, or skips) is only ever true from handleAnswer's own VICTORY
  // path; every other call site passes false, since GAMEOVER, a timeout, or
  // a skip each structurally rule out a perfect round.
  //
  // jokersUsedSnapshot/skipUsedAtLastLifeSnapshot are passed in explicitly
  // rather than read from the jokersUsed/skipUsedAtLastLife state closures
  // here, because activateSkip's own VICTORY call site calls this in the same
  // tick it also calls setJokersUsed/setSkipUsedAtLastLife - React state
  // updates aren't visible to a closure until the next render, so reading
  // the state variables directly at that one call site would see stale
  // pre-update values. Every other call site can safely pass the state
  // variables straight through, since they weren't just mutated this tick.
  const applyRoundEndRewards = (isPerfect, { isVictory = false, finalScore, jokersUsedSnapshot, skipUsedAtLastLifeSnapshot } = {}) => {
    setGlobalStats(prev => {
      const newXp = prev.xp + (isPerfect ? PERFECT_ROUND_XP_BONUS : 0);
      const prevLevel = prev.level || 1;
      const newLevel = Math.max(prevLevel, computeLevelFromXp(newXp));
      const leveledUp = newLevel > prevLevel;

      const coinsEarned = COIN_PER_ROUND_COMPLETE
        + (isPerfect ? COIN_PERFECT_ROUND_BONUS : 0)
        + (leveledUp ? COIN_LEVEL_UP_BONUS : 0);

      const next = {
        ...prev,
        xp: newXp,
        level: newLevel,
        coins: prev.coins + coinsEarned,
        consecutivePerfectRounds: isPerfect ? (prev.consecutivePerfectRounds || 0) + 1 : 0
      };

      const jokers = jokersUsedSnapshot || { fiftyFifty: false, plusTen: false, skip: false };
      const ctx = {
        isPerfect,
        finalScore,
        hour: new Date().getHours(),
        isVictory,
        noJokersUsed: !jokers.fiftyFifty && !jokers.plusTen && !jokers.skip,
        skipUsedAtLastLife: skipUsedAtLastLifeSnapshot,
        roundElapsedMs: roundStartTime ? Date.now() - roundStartTime : undefined
      };
      const newlyUnlocked = evaluateAchievements(next, ctx);
      next.unlockedAchievements = mergeUnlockedAchievements(next, newlyUnlocked);
      return next;
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

    updateCategoryStats(correct);

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
      // A fast answer (<3s elapsed, i.e. >17s left on the 20s clock) extends
      // the achievement run; anything slower breaks it - for Sonic Speed.
      const newFastAnswerStreak = timeLeft > 17 ? fastAnswerStreak + 1 : 0;
      setFastAnswerStreak(newFastAnswerStreak);

      const isLastQuestion = currentIndex === questions.length - 1;
      const isLivingDangerously = isLastQuestion
        && jokersUsed.fiftyFifty && jokersUsed.plusTen && jokersUsed.skip;
      const isLifeSaverHit = fiftyFiftyUsedOnIndex === currentIndex;

      setGlobalStats(prev => {
        const newXp = prev.xp + XP_PER_CORRECT_ANSWER;
        const prevLevel = prev.level || 1;
        // Only ever moves level up from gameplay, never down - preserves
        // an admin's manual override (AdminPanel) until the player's own
        // xp naturally earns a higher level.
        const newLevel = Math.max(prevLevel, computeLevelFromXp(newXp));
        const leveledUp = newLevel > prevLevel;

        const coinsEarned = (newStreak % COIN_STREAK_BONUS_INTERVAL === 0 ? COIN_STREAK_BONUS_AMOUNT : 0)
          + (leveledUp ? COIN_LEVEL_UP_BONUS : 0);

        const next = {
          ...prev,
          xp: newXp,
          level: newLevel,
          coins: prev.coins + coinsEarned
        };

        const ctx = {
          timeLeft,
          newStreak,
          fastAnswerStreak: newFastAnswerStreak,
          isLifeSaverHit,
          isLivingDangerously,
          isPotterQuestion
        };
        const newlyUnlocked = evaluateAchievements(next, ctx);
        next.unlockedAchievements = mergeUnlockedAchievements(next, newlyUnlocked);
        return next;
      });
    } else {
      sound.playWrong();
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
        setTimeout(() => setGameState('GAMEOVER'), 1000);
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
          skipUsedAtLastLifeSnapshot: skipUsedAtLastLife
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
      setTimeout(advanceOrFinish, 1200);
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
    updateCategoryStats(false);
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
      setTimeout(() => setGameState('GAMEOVER'), 1000);
      return;
    }

    setTimeout(() => {
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

  // Checks/merges the Tactician achievement (all 3 jokers used in one round)
  // right when the state transitions to "all true" - jokersUsedAfter must be
  // the freshly-computed object, not the jokersUsed state variable, since
  // every caller here calls this in the same tick it also calls
  // setJokersUsed (stale-closure trap otherwise).
  const checkTacticianOnJokerUse = (jokersUsedAfter) => {
    setGlobalStats(prev => {
      const ctx = {
        allJokersUsedThisRound: jokersUsedAfter.fiftyFifty && jokersUsedAfter.plusTen && jokersUsedAfter.skip
      };
      const newlyUnlocked = evaluateAchievements(prev, ctx);
      if (newlyUnlocked.length === 0) return prev;
      return { ...prev, unlockedAchievements: mergeUnlockedAchievements(prev, newlyUnlocked) };
    });
  };

  const activateFiftyFifty = () => {
    const currentQ = questions[currentIndex];
    if (jokersUsed.fiftyFifty || globalStats.coins < JOKER_COSTS.fiftyFifty || !currentQ) return;

    sound.playClick();
    const correctAns = currentQ.correct_answer || currentQ.correctAnswer;
    const incorrects = currentShuffledOptions.filter(opt => opt !== correctAns);
    const toHide = shuffleArray(incorrects).slice(0, 2);

    setHiddenOptions(toHide);
    const newJokersUsed = { ...jokersUsed, fiftyFifty: true };
    setJokersUsed(newJokersUsed);
    setFiftyFiftyUsedOnIndex(currentIndex);
    setGlobalStats(g => ({ ...g, coins: g.coins - JOKER_COSTS.fiftyFifty }));
    checkTacticianOnJokerUse(newJokersUsed);
  };

  const activatePlusTen = () => {
    if (jokersUsed.plusTen || globalStats.coins < JOKER_COSTS.plusTen) return;
    sound.playClick();
    setTimeLeft(t => t + PLUS_TEN_SECONDS);
    const newJokersUsed = { ...jokersUsed, plusTen: true };
    setJokersUsed(newJokersUsed);
    setGlobalStats(g => ({ ...g, coins: g.coins - JOKER_COSTS.plusTen }));
    checkTacticianOnJokerUse(newJokersUsed);
  };

  const activateSkip = () => {
    if (jokersUsed.skip || globalStats.coins < JOKER_COSTS.skip) return;
    sound.playClick();
    const newJokersUsed = { ...jokersUsed, skip: true };
    const isLastLifeSkip = lives === 1;
    setJokersUsed(newJokersUsed);
    if (isLastLifeSkip) setSkipUsedAtLastLife(true);
    setGlobalStats(g => ({ ...g, coins: g.coins - JOKER_COSTS.skip }));
    checkTacticianOnJokerUse(newJokersUsed);
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

    const currentList = leaderboards[catKey] || [];
    const newList = [...currentList, { name: entryName, score, date: new Date().toLocaleDateString() }]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    setLeaderboards({ ...leaderboards, [catKey]: newList });

    try {
      const elapsedMs = roundStartTime ? Date.now() - roundStartTime : null;
      const isPerfect = correctInRound === QUESTIONS_PER_ROUND;
      const success = await saveScoreToFirestore(catKey, entryName, score, currentUser?.uid || null, elapsedMs, isPerfect);
      if (!success) throw new Error('Firestore save failed');
      setScoreSaved(true);
      sound.playClick();
      refreshRekordiData();
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

  const currentQ = questions[currentIndex];
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

      <AppHeader
        globalStats={globalStats}
        currentUser={currentUser}
        isAdminUser={isAdminUser}
        onGoToLobby={() => setGameState('LOBBY')}
        onOpenStats={() => setShowStatsModal(true)}
        onOpenAchievements={() => setShowAchievementsModal(true)}
        onOpenGuide={() => setShowGuideModal(true)}
        onOpenAdmin={() => setShowAdminPanel(true)}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handlePlayerLogout}
      />

      {/* Main Content */}
      <main className="w-full max-w-2xl mx-auto px-4 py-8 flex-1 flex flex-col justify-center">

        {gameState === 'LOBBY' && (
          <LobbyScreen
            categoriesList={categoriesList}
            rekordiData={rekordiData}
            onSelectCategory={selectCategory}
            onOpenRekordi={() => setShowRekordiModal(true)}
          />
        )}

        {gameState === 'LEADERBOARD' && (
          <CategoryLeaderboardScreen
            selectedCategory={selectedCategory}
            isLoadingLeaderboard={isLoadingLeaderboard}
            activeCategoryLeaderboard={activeCategoryLeaderboard}
            onStart={launchQuizRound}
            onBack={() => setGameState('LOBBY')}
          />
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
                  const isHidden = hiddenOptions.includes(option);
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
                      className={`w-full p-4 rounded-2xl border text-left font-semibold text-sm transition-all flex justify-between items-center ${btnStyle}`}
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
                  className={`px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 disabled:opacity-40 flex items-center gap-1 ${!fiftyFiftyLocked && fiftyFiftyShort ? 'opacity-40' : ''}`}
                >
                  <Scissors className="w-3.5 h-3.5 text-amber-400" /> 50:50 ({JOKER_COSTS.fiftyFifty}c)
                </button>
                <button
                  disabled={plusTenLocked}
                  onClick={() => {
                    if (plusTenShort) { showJokerMessage(`Nemaš dovoljno zlatnika (potrebno ${JOKER_COSTS.plusTen}c)`); return; }
                    activatePlusTen();
                  }}
                  className={`px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 disabled:opacity-40 flex items-center gap-1 ${!plusTenLocked && plusTenShort ? 'opacity-40' : ''}`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> +{PLUS_TEN_SECONDS}s ({JOKER_COSTS.plusTen}c)
                </button>
                <button
                  disabled={skipLocked}
                  onClick={() => {
                    if (skipShort) { showJokerMessage(`Nemaš dovoljno zlatnika (potrebno ${JOKER_COSTS.skip}c)`); return; }
                    activateSkip();
                  }}
                  className={`px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 disabled:opacity-40 flex items-center gap-1 ${!skipLocked && skipShort ? 'opacity-40' : ''}`}
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
                  className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold py-3 rounded-xl text-sm transition-colors"
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
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl text-sm transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {isSaving ? 'Spremanje...' : 'Spremi Rezultat'}
                </button>
              </form>
            )}

            <button
              onClick={() => { sound.playClick(); setGameState('LOBBY'); }}
              className="w-full bg-slate-800 hover:bg-slate-750 text-slate-100 font-bold py-3.5 rounded-2xl transition-colors flex justify-center items-center gap-2 border border-slate-700/80 text-sm"
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
        <AdminPanel
          onClose={() => {
            setShowAdminPanel(false);
            if (isAdminPath()) {
              window.history.pushState({}, '', '/');
            }
          }}
        />
      )}

      <footer className="text-center py-4 text-xs text-slate-600 font-medium">
        TriviaBong &bull; Vibe Coding Web Game
      </footer>

    </div>
  );
}