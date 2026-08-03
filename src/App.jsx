import React, { useState, useEffect, useMemo } from 'react';
import {
  Heart, Trophy, Zap, RefreshCw, Flame, Award, ChevronRight, HelpCircle,
  Scissors, FastForward, Clock, Crown, Coins, User, LogOut, ShieldCheck, Play, BarChart2
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
  COIN_PER_CORRECT_ANSWER,
  COIN_BONUS_STREAK_INTERVAL,
  COIN_BONUS_AMOUNT,
  JOKER_COSTS
} from './constants/gameBalance';
import { computeLevelFromXp } from './utils/leveling';
import { sound } from './utils/sound';
import AdminPanel from './components/AdminPanel';
import AuthModal from './components/AuthModal';
import StatsModal from './components/StatsModal';
import GuideModal from './components/GuideModal';
import {
  auth,
  logoutUser,
  getUserStatsFromFirestore,
  syncUserStatsToFirestore,
  saveScoreToFirestore,
  getLeaderboardFromFirestore
} from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const ADMIN_EMAIL = 'ivanm.ploce@gmail.com';

const isAdminPath = () => {
  const path = window.location.pathname;
  return path === '/admin' || path === '/admin/';
};

const getCategoryDetails = (catKey) => {
  // Resolve through the same alias map getQuestionsByCategory uses, so a
  // question's raw `category` field (which can be an alias spelling, e.g.
  // legacy data using the filename-style "znanost_i_tehnologija" instead of
  // the canonical pack key "znanost") still finds its CATEGORY_META entry
  // instead of falling through to the raw-string fallback below.
  const resolvedKey = resolveCategoryKey(catKey);
  return CATEGORY_META[resolvedKey] || {
    label: catKey ? catKey.replace(/_/g, ' ') : 'Kategorija',
    icon: HelpCircle
  };
};

const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5);

const getQuestionOptions = (q) => {
  if (!q) return [];
  if (Array.isArray(q.options)) return q.options;
  const correct = q.correct_answer || q.correctAnswer;
  const incorrects = q.incorrect_answers || q.incorrectAnswers || [];
  if (correct !== undefined) {
    return [correct, ...incorrects];
  }
  return [];
};

const checkIsCorrect = (q, option) => {
  if (!q || option === undefined) return false;
  const correct = String(q.correct_answer || q.correctAnswer || '').trim().toLowerCase();
  return String(option).trim().toLowerCase() === correct;
};

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
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_SECONDS);
  const [globalStats, setGlobalStats] = useState(() => {
    const saved = localStorage.getItem('triviabong_global_stats');
    return saved ? JSON.parse(saved) : DEFAULT_GLOBAL_STATS;
  });

  const [jokersUsed, setJokersUsed] = useState({ fiftyFifty: false, plusTen: false, skip: false });
  const [hiddenOptions, setHiddenOptions] = useState([]);

  const [leaderboards, setLeaderboards] = useState(() => {
    const saved = localStorage.getItem('triviabong_leaderboards');
    return saved ? JSON.parse(saved) : {};
  });
  const [activeCategoryLeaderboard, setActiveCategoryLeaderboard] = useState([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  const [nickname, setNickname] = useState('');
  const [scoreSaved, setScoreSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

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
        setGlobalStats(prev => ({
          ...prev,
          // No existing doc means this account has never saved stats before -
          // reset every field instead of inheriting whatever the previous
          // account left in memory.
          ...(cloudStats || DEFAULT_GLOBAL_STATS)
        }));
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
    }
  }, [globalStats, currentUser, statsReadyForUid]);

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
    setTimeLeft(QUESTION_TIME_SECONDS);
    setJokersUsed({ fiftyFifty: false, plusTen: false, skip: false });
    setHiddenOptions([]);
    setSelectedOption(null);
    setScoreSaved(false);
    setGameState('PLAYING');

    setGlobalStats(prev => ({
      ...prev,
      totalGames: (prev.totalGames || 0) + 1
    }));
  };

  const updateCategoryStats = (isCorrect) => {
    const cat = selectedCategory || 'opca_znanje';
    setGlobalStats(prev => {
      const prevCat = prev.categoryStats?.[cat] || { total: 0, correct: 0 };
      const newStreak = isCorrect ? streak + 1 : 0;

      return {
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
    });
  };

  const handleAnswer = (option) => {
    if (selectedOption !== null || answerLocked) return;
    setSelectedOption(option);

    const currentQ = questions[currentIndex];
    const correct = checkIsCorrect(currentQ, option);

    updateCategoryStats(correct);

    if (correct) {
      sound.playCorrect();
      const speedBonus = timeLeft * SPEED_BONUS_PER_SECOND;
      const streakMultiplier = 1 + streak * STREAK_MULTIPLIER_STEP;
      const earned = Math.round((BASE_SCORE + speedBonus) * streakMultiplier);

      setScore(s => s + earned);
      setStreak(s => s + 1);

      setGlobalStats(prev => {
        const newXp = prev.xp + XP_PER_CORRECT_ANSWER;
        return {
          ...prev,
          xp: newXp,
          // Only ever moves level up from gameplay, never down - preserves
          // an admin's manual override (AdminPanel) until the player's own
          // xp naturally earns a higher level.
          level: Math.max(prev.level || 1, computeLevelFromXp(newXp)),
          coins: prev.coins + (streak > 0 && streak % COIN_BONUS_STREAK_INTERVAL === 0 ? COIN_BONUS_AMOUNT : COIN_PER_CORRECT_ANSWER)
        };
      });
    } else {
      sound.playWrong();
      setStreak(0);
      const newLives = lives - 1;
      setLives(newLives);

      if (newLives <= 0) {
        setTimeout(() => setGameState('GAMEOVER'), 1000);
        return;
      }
    }

    setTimeout(() => {
      setSelectedOption(null);
      setHiddenOptions([]);

      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(c => c + 1);
        setTimeLeft(QUESTION_TIME_SECONDS);
      } else {
        sound.playCorrect();
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        setGameState('VICTORY');
      }
    }, 1200);
  };

  const handleAnswerTimeout = () => {
    sound.playWrong();
    updateCategoryStats(false);
    setStreak(0);
    const newLives = lives - 1;
    setLives(newLives);
    setSelectedOption('TIMEOUT');

    if (newLives <= 0) {
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
        setGameState('VICTORY');
      }
    }, 1200);
  };

  const useFiftyFifty = () => {
    const currentQ = questions[currentIndex];
    if (jokersUsed.fiftyFifty || globalStats.coins < JOKER_COSTS.fiftyFifty || !currentQ) return;

    sound.playClick();
    const correctAns = currentQ.correct_answer || currentQ.correctAnswer;
    const incorrects = currentShuffledOptions.filter(opt => opt !== correctAns);
    const toHide = shuffleArray(incorrects).slice(0, 2);

    setHiddenOptions(toHide);
    setJokersUsed(j => ({ ...j, fiftyFifty: true }));
    setGlobalStats(g => ({ ...g, coins: g.coins - JOKER_COSTS.fiftyFifty }));
  };

  const usePlusTen = () => {
    if (jokersUsed.plusTen || globalStats.coins < JOKER_COSTS.plusTen) return;
    sound.playClick();
    setTimeLeft(t => t + PLUS_TEN_SECONDS);
    setJokersUsed(j => ({ ...j, plusTen: true }));
    setGlobalStats(g => ({ ...g, coins: g.coins - JOKER_COSTS.plusTen }));
  };

  const useSkip = () => {
    if (jokersUsed.skip || globalStats.coins < JOKER_COSTS.skip) return;
    sound.playClick();
    setJokersUsed(j => ({ ...j, skip: true }));
    setGlobalStats(g => ({ ...g, coins: g.coins - JOKER_COSTS.skip }));

    setHiddenOptions([]);
    setSelectedOption(null);
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(c => c + 1);
      setTimeLeft(QUESTION_TIME_SECONDS);
    } else {
      setGameState('VICTORY');
    }
  };

  const handleSaveScore = async (e) => {
    e.preventDefault();
    if (!nickname.trim() || scoreSaved || isSaving) return;
    setIsSaving(true);

    const catKey = selectedCategory || 'opca_znanje';
    const entryName = nickname.trim();

    const currentList = leaderboards[catKey] || [];
    const newList = [...currentList, { name: entryName, score, date: new Date().toLocaleDateString() }]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    setLeaderboards({ ...leaderboards, [catKey]: newList });

    try {
      await saveScoreToFirestore(catKey, entryName, score, currentUser?.uid || null);
      setScoreSaved(true);
      sound.playClick();
    } finally {
      setIsSaving(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-amber-500 selection:text-slate-950">

      {/* Header */}
      <header className="w-full max-w-4xl mx-auto px-4 py-4 flex justify-between items-center border-b border-slate-900">
        <div
          onClick={() => { sound.playClick(); setGameState('LOBBY'); }}
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
          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800/80 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-400">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>{globalStats.coins}</span>
          </div>

          <button
            onClick={() => { sound.playClick(); setShowGuideModal(true); }}
            className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 transition-colors"
            title="Kako Igrati"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Vodič</span>
          </button>

          <button
            onClick={() => { sound.playClick(); setShowStatsModal(true); }}
            className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 transition-colors"
            title="Statistika i Profil"
          >
            <BarChart2 className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Statistika</span>
          </button>

          {isAdminUser && (
            <button
              onClick={() => setShowAdminPanel(true)}
              className="flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
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
                className="text-slate-500 hover:text-rose-400 transition-colors p-0.5"
                title="Odjava"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { sound.playClick(); setShowAuthModal(true); }}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-md shadow-amber-500/10"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {categoriesList.map(catKey => {
                const details = getCategoryDetails(catKey);
                const IconComponent = details.icon;
                return (
                  <button
                    key={catKey}
                    onClick={() => selectCategory(catKey)}
                    className="flex items-center justify-between p-4 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl transition-all group shadow-sm hover:shadow-amber-500/5"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-slate-200 capitalize text-sm">{details.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors" />
                  </button>
                );
              })}
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
                onClick={() => { sound.playClick(); setGameState('LOBBY'); }}
                className="flex-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold py-3.5 rounded-2xl transition-colors text-sm"
              >
                Natrag
              </button>
              <button
                onClick={launchQuizRound}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3.5 rounded-2xl transition-colors shadow-lg shadow-amber-500/20 flex justify-center items-center gap-2 text-sm"
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
              <div className="flex items-center gap-1.5 text-amber-400">
                <Clock className="w-4 h-4" />
                <span className={timeLeft <= 4 ? 'text-rose-500 animate-pulse font-black' : ''}>{timeLeft}s</span>
              </div>
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
                  disabled={jokersUsed.fiftyFifty || selectedOption !== null || globalStats.coins < JOKER_COSTS.fiftyFifty}
                  onClick={useFiftyFifty}
                  className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 disabled:opacity-40 flex items-center gap-1"
                >
                  <Scissors className="w-3.5 h-3.5 text-amber-400" /> 50:50 ({JOKER_COSTS.fiftyFifty}c)
                </button>
                <button
                  disabled={jokersUsed.plusTen || selectedOption !== null || globalStats.coins < JOKER_COSTS.plusTen}
                  onClick={usePlusTen}
                  className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 disabled:opacity-40 flex items-center gap-1"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> +{PLUS_TEN_SECONDS}s ({JOKER_COSTS.plusTen}c)
                </button>
                <button
                  disabled={jokersUsed.skip || selectedOption !== null || globalStats.coins < JOKER_COSTS.skip}
                  onClick={useSkip}
                  className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 disabled:opacity-40 flex items-center gap-1"
                >
                  <FastForward className="w-3.5 h-3.5 text-amber-400" /> Preskoči ({JOKER_COSTS.skip}c)
                </button>
              </div>
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

            {!scoreSaved ? (
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
            ) : (
              <p className="text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 py-3 rounded-xl">
                <Award className="w-4 h-4" /> Rezultat uspješno spremljen!
              </p>
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
          globalStats={globalStats}
          setGlobalStats={setGlobalStats}
          leaderboards={leaderboards}
          setLeaderboards={setLeaderboards}
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