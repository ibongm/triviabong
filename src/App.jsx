import React, { useState, useEffect, useMemo } from 'react';
import {
  Heart, Trophy, Zap, RefreshCw, ArrowLeft, Flame, Award, ChevronRight,
  Globe, Film, History, BookOpen, Music, Brain, Sparkles, Utensils, Atom, HelpCircle,
  Scissors, FastForward, Clock, Play, Crown, Star, Coins
} from 'lucide-react';
import confetti from 'canvas-confetti';
import questionsData from './data/questions.json';
import { sound } from './utils/sound';

const CATEGORY_MAP = {
  geografija: { label: 'Geografija', icon: Globe },
  film: { label: 'Film', icon: Film },
  povijest: { label: 'Povijest', icon: History },
  knjizevnost: { label: 'Književnost', icon: BookOpen },
  sport: { label: 'Sport', icon: Trophy },
  znanost: { label: 'Znanost', icon: Atom },
  glazba: { label: 'Glazba', icon: Music },
  opca_znanje: { label: 'Opće znanje', icon: Brain },
  pop_kultura: { label: 'Pop kultura', icon: Sparkles },
  gastronomija: { label: 'Gastronomija', icon: Utensils },
};

const getCategoryDetails = (catKey) => {
  const normalizedKey = (catKey || '').toLowerCase();
  return CATEGORY_MAP[normalizedKey] || {
    label: catKey ? catKey.replace('_', ' ') : 'Kategorija',
    icon: HelpCircle
  };
};

const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5);

const LEVEL_THRESHOLDS = [
  { level: 0, xp: 0, coins: 0 },
  { level: 1, xp: 20, coins: 3 },
  { level: 2, xp: 50, coins: 5 },
  { level: 3, xp: 100, coins: 10 },
  { level: 4, xp: 999999, coins: 0 } // Placeholder for future levels
];

const ACHIEVEMENTS_DATA = {
  savrsen_kviz: { id: 'savrsen_kviz', name: 'Savršen kviz', xp: 2, coins: 1 },
  brzi_prst: { id: 'brzi_prst', name: 'Brzi prst', xp: 2, coins: 1 },
  gospodar_niza: { id: 'gospodar_niza', name: 'Gospodar niza', xp: 3, coins: 2 },
  maratonac: { id: 'maratonac', name: 'Maratonac', xp: 10, coins: 1 }
};

export default function App() {
  const [gameState, setGameState] = useState('LOBBY');
  const [selectedCategory, setSelectedCategory] = useState(null);

  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [energy, setEnergy] = useState(100);
  const [streak, setStreak] = useState(0);
  const [maxStreakInRound, setMaxStreakInRound] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const [roundStats, setRoundStats] = useState({ totalAnswered: 0, correct: 0 });
  const [fastStreak, setFastStreak] = useState(0);
  const [achievedThisRound, setAchievedThisRound] = useState([]);

  // Lifelines restrict to 1 use per round, but now cost coins
  const [lifelines, setLifelines] = useState({ fiftyFifty: true, skip: true, extraTime: true });
  const [disabledAnswers, setDisabledAnswers] = useState([]);

  const [leaderboards, setLeaderboards] = useState({});
  const [playerName, setPlayerName] = useState('');
  const [hasSavedScore, setHasSavedScore] = useState(false);

  const defaultStats = {
    gamesPlayed: 0, validGamesPlayed: 0, totalAnswered: 0, totalCorrect: 0, totalPoints: 0,
    xp: 0, level: 0, coins: 0, achievements: []
  };
  const [globalStats, setGlobalStats] = useState(defaultStats);

  const categories = Array.from(new Set(questionsData.map(q => q.category)));

  useEffect(() => {
    const savedLeaderboards = localStorage.getItem('triviabong_leaderboards');
    if (savedLeaderboards) {
      try { setLeaderboards(JSON.parse(savedLeaderboards)); } catch (e) { console.error(e); }
    }

    const savedGlobalStats = localStorage.getItem('triviabong_global_stats');
    if (savedGlobalStats) {
      try {
        const parsed = JSON.parse(savedGlobalStats);
        setGlobalStats(prev => ({ ...prev, ...parsed }));
      } catch (e) { console.error(e); }
    }
  }, []);

  const hallOfFame = useMemo(() => {
    let globalHighScore = { name: '-', score: 0, category: '-' };
    let globalMaxStreak = { name: '-', streak: 0 };
    const firstPlaceCounts = {};

    Object.entries(leaderboards).forEach(([catKey, entries]) => {
      if (!entries || entries.length === 0) return;
      const topEntry = entries[0];
      if (topEntry) {
        firstPlaceCounts[topEntry.name] = (firstPlaceCounts[topEntry.name] || 0) + 1;
        if (topEntry.score > globalHighScore.score) {
          const { label } = getCategoryDetails(catKey);
          globalHighScore = { name: topEntry.name, score: topEntry.score, category: label };
        }
      }
      entries.forEach(entry => {
        if (entry.maxStreak && entry.maxStreak > globalMaxStreak.streak) {
          globalMaxStreak = { name: entry.name, streak: entry.maxStreak };
        }
      });
    });

    let categoryKing = { name: '-', crowns: 0 };
    Object.entries(firstPlaceCounts).forEach(([name, crowns]) => {
      if (crowns > categoryKing.crowns) {
        categoryKing = { name, crowns };
      }
    });

    return { globalHighScore, categoryKing, globalMaxStreak };
  }, [leaderboards]);

  // Timer logic
  useEffect(() => {
    if (gameState !== 'PLAYING' || isAnswered) return;
    if (timeLeft <= 0) {
      sound.playWrong();
      handleAnswerSelect(null);
      return;
    }
    if (timeLeft <= 5 && timeLeft > 0) sound.playTick();

    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [gameState, timeLeft, isAnswered]);

  const activeQuestion = currentQuestions[currentIndex];

  const shuffledAnswers = useMemo(() => {
    if (!activeQuestion) return [];
    return shuffleArray([activeQuestion.correct_answer, ...activeQuestion.incorrect_answers]);
  }, [activeQuestion]);

  const selectCategory = (cat) => {
    sound.playClick();
    setSelectedCategory(cat);
    setGameState('LEADERBOARD');
  };

  const startPlaying = () => {
    sound.playClick();
    const filtered = questionsData.filter(q => q.category === selectedCategory);
    if (filtered.length === 0) return;

    // Hard limit: 10 questions max per round
    setCurrentQuestions(shuffleArray(filtered).slice(0, 10));
    setCurrentIndex(0);
    setScore(0);
    setEnergy(100);
    setStreak(0);
    setMaxStreakInRound(0);
    setRoundStats({ totalAnswered: 0, correct: 0 });
    setFastStreak(0);
    setAchievedThisRound([]);
    setHasSavedScore(false);
    setIsAnswered(false);
    setSelectedAnswer(null);
    setTimeLeft(15);
    setDisabledAnswers([]);
    setLifelines({ fiftyFifty: true, skip: true, extraTime: true });
    setGameState('PLAYING');
  };

  const handleAnswerSelect = (answer) => {
    if (isAnswered || !activeQuestion) return;
    setIsAnswered(true);
    setSelectedAnswer(answer);

    const isCorrect = answer === activeQuestion.correct_answer;

    setRoundStats(prev => ({
      totalAnswered: prev.totalAnswered + 1,
      correct: isCorrect ? prev.correct + 1 : prev.correct
    }));

    if (isCorrect) {
      sound.playCorrect();
      const points = 100 + (timeLeft * 10) * (streak >= 3 ? 1.5 : 1);
      setScore(prev => Math.round(prev + points));

      const newStreak = streak + 1;
      setStreak(newStreak);
      setMaxStreakInRound(prev => Math.max(prev, newStreak));

      if (newStreak % 3 === 0) setEnergy(prev => Math.min(100, prev + 15));

      if (timeLeft > 10) {
        setFastStreak(prev => {
          const next = prev + 1;
          if (next === 5 && !globalStats.achievements.includes('brzi_prst') && !achievedThisRound.includes('brzi_prst')) {
            setAchievedThisRound(curr => [...curr, 'brzi_prst']);
          }
          return next;
        });
      } else {
        setFastStreak(0);
      }

    } else {
      sound.playWrong();
      setStreak(0);
      setFastStreak(0);
      const newEnergy = Math.max(0, energy - 25);
      setEnergy(newEnergy);

      if (newEnergy <= 0) {
        setTimeout(() => triggerGameOver(score, roundStats.totalAnswered + 1, roundStats.correct), 1200);
        return;
      }
    }

    setTimeout(() => advanceNextQuestion(), 1200);
  };

  const advanceNextQuestion = () => {
    if (currentIndex + 1 < currentQuestions.length) {
      setCurrentIndex(prev => prev + 1);
      setIsAnswered(false);
      setSelectedAnswer(null);
      setTimeLeft(15);
      setDisabledAnswers([]);
    } else {
      // Pass the fully updated values strictly to the Game Over compute engine
      triggerGameOver(score, roundStats.totalAnswered, roundStats.correct);
    }
  };

  const triggerGameOver = (finalScore, roundAnswered, roundCorrect) => {
    setGameState('GAME_OVER');

    setGlobalStats(prev => {
      let newXp = prev.xp;
      let newCoins = prev.coins;
      let newValidGames = prev.validGamesPlayed;
      const newAchievements = [...prev.achievements];
      let newlyUnlocked = [...achievedThisRound];

      // 1. Accuracy XP Base
      newXp += roundCorrect;

      // 2. Volume Logic (Valid rounds require >= 3 answered questions)
      if (roundAnswered >= 3) {
        newValidGames += 1;
        if (newValidGames % 5 === 0) newXp += 2;
      }

      // 3. Post-Round Achievement Evaluation
      if (roundCorrect === 10 && !newAchievements.includes('savrsen_kviz')) newlyUnlocked.push('savrsen_kviz');
      if (maxStreakInRound >= 10 && !newAchievements.includes('gospodar_niza')) newlyUnlocked.push('gospodar_niza');
      if (newValidGames >= 25 && !newAchievements.includes('maratonac')) newlyUnlocked.push('maratonac');

      newlyUnlocked.forEach(id => {
        if (!newAchievements.includes(id)) {
          newAchievements.push(id);
          newXp += ACHIEVEMENTS_DATA[id].xp;
          newCoins += ACHIEVEMENTS_DATA[id].coins;
        }
      });

      // 4. Level Up Execution Pipeline
      let newLevel = prev.level;
      while (true) {
        const nextLevelData = LEVEL_THRESHOLDS.find(l => l.level === newLevel + 1);
        if (nextLevelData && newXp >= nextLevelData.xp) {
          newLevel = nextLevelData.level;
          newCoins += nextLevelData.coins;
        } else {
          break;
        }
      }

      const updated = {
        ...prev,
        gamesPlayed: prev.gamesPlayed + 1,
        validGamesPlayed: newValidGames,
        totalAnswered: prev.totalAnswered + roundAnswered,
        totalCorrect: prev.totalCorrect + roundCorrect,
        totalPoints: prev.totalPoints + finalScore,
        xp: newXp,
        level: newLevel,
        coins: newCoins,
        achievements: newAchievements
      };
      localStorage.setItem('triviabong_global_stats', JSON.stringify(updated));
      return updated;
    });
  };

  // Economy Functions
  const useFiftyFifty = () => {
    if (!lifelines.fiftyFifty || isAnswered || !activeQuestion || globalStats.coins < 1) return;
    sound.playClick();
    setGlobalStats(prev => ({ ...prev, coins: prev.coins - 1 }));
    const incorrect = activeQuestion.incorrect_answers;
    setDisabledAnswers(shuffleArray(incorrect).slice(0, 2));
    setLifelines(prev => ({ ...prev, fiftyFifty: false }));
  };

  const useExtraTime = () => {
    if (!lifelines.extraTime || isAnswered || globalStats.coins < 1) return;
    sound.playClick();
    setGlobalStats(prev => ({ ...prev, coins: prev.coins - 1 }));
    setTimeLeft(prev => prev + 10);
    setLifelines(prev => ({ ...prev, extraTime: false }));
  };

  const useSkip = () => {
    if (!lifelines.skip || isAnswered || globalStats.coins < 2 || !activeQuestion) return;
    sound.playClick();
    setGlobalStats(prev => ({ ...prev, coins: prev.coins - 2 }));
    setLifelines(prev => ({ ...prev, skip: false }));

    // Treat Skip strictly as a Correct Answer
    setIsAnswered(true);
    setSelectedAnswer(activeQuestion.correct_answer);

    setRoundStats(prev => ({ totalAnswered: prev.totalAnswered + 1, correct: prev.correct + 1 }));
    sound.playCorrect();
    const points = 100 + (timeLeft * 10) * (streak >= 3 ? 1.5 : 1);
    setScore(prev => Math.round(prev + points));

    const newStreak = streak + 1;
    setStreak(newStreak);
    setMaxStreakInRound(prev => Math.max(prev, newStreak));
    if (newStreak % 3 === 0) setEnergy(prev => Math.min(100, prev + 15));

    if (timeLeft > 10) {
      setFastStreak(prev => {
        const next = prev + 1;
        if (next === 5 && !globalStats.achievements.includes('brzi_prst') && !achievedThisRound.includes('brzi_prst')) {
          setAchievedThisRound(curr => [...curr, 'brzi_prst']);
        }
        return next;
      });
    }

    setTimeout(() => advanceNextQuestion(), 1200);
  };

  const saveHighScore = (e) => {
    e.preventDefault();
    if (!playerName.trim() || hasSavedScore) return;
    sound.playClick();

    const catScores = leaderboards[selectedCategory] || [];
    const previousTopScore = catScores[0]?.score || 0;

    const newScores = [
      ...catScores,
      { name: playerName, score, maxStreak: maxStreakInRound, date: new Date().toLocaleDateString() }
    ].sort((a, b) => b.score - a.score).slice(0, 10);

    const updatedLeaderboards = { ...leaderboards, [selectedCategory]: newScores };
    setLeaderboards(updatedLeaderboards);
    localStorage.setItem('triviabong_leaderboards', JSON.stringify(updatedLeaderboards));
    setHasSavedScore(true);

    if (score > 0 && score >= previousTopScore) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#f59e0b', '#fbbf24', '#38bdf8'] });
    }
  };

  const activeCategoryDetails = getCategoryDetails(selectedCategory);

  // Progress bar logic
  const nextLevelData = LEVEL_THRESHOLDS.find(l => l.level === globalStats.level + 1) || { xp: globalStats.xp };
  const prevLevelData = globalStats.level === 0 ? { xp: 0 } : LEVEL_THRESHOLDS.find(l => l.level === globalStats.level);
  const xpRequiredForNext = nextLevelData.xp - prevLevelData.xp;
  const currentLevelXp = globalStats.xp - prevLevelData.xp;
  const xpPercent = xpRequiredForNext > 0 ? Math.min(100, (currentLevelXp / xpRequiredForNext) * 100) : 100;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-amber-500 selection:text-slate-950">

      {gameState === 'LOBBY' && (
        <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">

          <div className="flex justify-between items-start mb-6">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full w-max">
                LVL {globalStats.level}
              </span>
              <div className="w-32 bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
                <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${xpPercent}%` }} />
              </div>
              <span className="text-[10px] text-slate-500 font-semibold">{globalStats.xp} XP</span>
            </div>

            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-4 py-2 rounded-xl">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="font-black text-slate-200">{globalStats.coins}</span>
            </div>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500">
              TRIVIABONG
            </h1>
            <p className="text-slate-400 text-sm mt-1 font-medium">Odaberi kategoriju i započni kviz!</p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 mb-6 shadow-inner">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-400" /> Kuća Slavnih
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 flex flex-col items-center">
                <p className="text-[10px] font-extrabold uppercase text-amber-400 tracking-tight">Kralj Kat.</p>
                <p className="text-sm font-black text-slate-100 mt-1 truncate max-w-full">{hallOfFame.categoryKing.name}</p>
                <p className="text-[10px] text-slate-400 font-semibold">{hallOfFame.categoryKing.crowns > 0 ? `${hallOfFame.categoryKing.crowns} kat.` : '-'}</p>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 flex flex-col items-center">
                <p className="text-[10px] font-extrabold uppercase text-amber-400 tracking-tight">Rekord</p>
                <p className="text-sm font-black text-amber-400 mt-1 truncate max-w-full">{hallOfFame.globalHighScore.score > 0 ? hallOfFame.globalHighScore.score : '-'}</p>
                <p className="text-[10px] text-slate-400 font-semibold truncate max-w-full">{hallOfFame.globalHighScore.name}</p>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 flex flex-col items-center">
                <p className="text-[10px] font-extrabold uppercase text-amber-400 tracking-tight">Najveći Niz</p>
                <p className="text-sm font-black text-emerald-400 mt-1 truncate max-w-full">{hallOfFame.globalMaxStreak.streak > 0 ? `${hallOfFame.globalMaxStreak.streak}x` : '-'}</p>
                <p className="text-[10px] text-slate-400 font-semibold truncate max-w-full">{hallOfFame.globalMaxStreak.name}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
            {categories.map((catKey) => {
              const { label, icon: IconComponent } = getCategoryDetails(catKey);
              const topEntry = leaderboards[catKey]?.[0];
              return (
                <button
                  key={catKey}
                  onClick={() => selectCategory(catKey)}
                  className="group bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-400/60 p-4 rounded-2xl text-left transition-all shadow-md flex justify-between items-center"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-700/50 text-amber-400 group-hover:border-amber-400/40 group-hover:bg-amber-500/10 transition-colors">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-200 group-hover:text-amber-400 transition-colors text-base">{label}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Najbolji: {topEntry ? <span className="text-amber-400 font-semibold">{topEntry.name}</span> : <span className="text-slate-500">-</span>}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {gameState === 'LEADERBOARD' && (
        <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => { sound.playClick(); setGameState('LOBBY'); }}
              className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 transition-colors flex items-center gap-2 text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" /> Natrag
            </button>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
              {React.createElement(activeCategoryDetails.icon, { className: "w-4 h-4 inline" })}
              {activeCategoryDetails.label}
            </span>
          </div>

          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center p-3 bg-slate-800 border border-slate-700 rounded-2xl mb-2 text-amber-400">
              <Trophy className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-slate-100">Top 10 Ljestvica</h2>
          </div>

          <div className="bg-slate-950/60 rounded-2xl border border-slate-800 overflow-hidden divide-y divide-slate-800/80 mb-6">
            {(leaderboards[selectedCategory] || []).length === 0 ? (
              <p className="p-5 text-xs text-slate-500 text-center">Još nema rezultata. Budi prvi!</p>
            ) : (
              (leaderboards[selectedCategory] || []).map((entry, idx) => (
                <div key={idx} className="flex justify-between items-center p-3.5 text-sm px-4">
                  <span className="font-semibold text-slate-300 flex items-center gap-2.5">
                    <span className={`text-xs font-extrabold w-6 h-6 flex items-center justify-center rounded-lg ${idx === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        idx === 1 ? 'bg-slate-700/50 text-slate-300 border border-slate-600/30' :
                          idx === 2 ? 'bg-amber-900/30 text-amber-600 border border-amber-800/30' :
                            'bg-slate-900 text-slate-500'
                      }`}>#{idx + 1}</span>
                    {entry.name}
                  </span>
                  <div className="text-right">
                    <p className="text-amber-400 font-bold">{entry.score} bod.</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            onClick={startPlaying}
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black py-4 rounded-2xl transition-all shadow-lg flex justify-center items-center gap-2 text-base tracking-wide"
          >
            <Play className="w-5 h-5 fill-slate-950" /> Započni Kviz
          </button>
        </div>
      )}

      {gameState === 'PLAYING' && activeQuestion && (
        <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => { sound.playClick(); setGameState('LOBBY'); }}
              className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-amber-400" /> Niz: {streak}
              </span>
              <span className="text-sm font-extrabold text-slate-200 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
                Bodovi: <span className="text-amber-400">{score}</span>
              </span>
            </div>
          </div>

          {/* JOKERS WITH COIN COSTS */}
          <div className="flex justify-between gap-2 mb-4 bg-slate-950/40 p-2 rounded-2xl border border-slate-800">
            <button
              onClick={useFiftyFifty}
              disabled={!lifelines.fiftyFifty || isAnswered || globalStats.coins < 1}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${lifelines.fiftyFifty && !isAnswered && globalStats.coins >= 1
                  ? 'bg-slate-800 hover:bg-amber-500/10 border-slate-700 text-slate-200 hover:text-amber-400'
                  : 'bg-slate-900/50 border-slate-800/80 text-slate-600 cursor-not-allowed'
                }`}
            >
              <Scissors className="w-3.5 h-3.5" /> 50:50 (1 <Coins className="w-3 h-3 inline" />)
            </button>
            <button
              onClick={useExtraTime}
              disabled={!lifelines.extraTime || isAnswered || globalStats.coins < 1}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${lifelines.extraTime && !isAnswered && globalStats.coins >= 1
                  ? 'bg-slate-800 hover:bg-amber-500/10 border-slate-700 text-slate-200 hover:text-amber-400'
                  : 'bg-slate-900/50 border-slate-800/80 text-slate-600 cursor-not-allowed'
                }`}
            >
              <Clock className="w-3.5 h-3.5" /> +10s (1 <Coins className="w-3 h-3 inline" />)
            </button>
            <button
              onClick={useSkip}
              disabled={!lifelines.skip || isAnswered || globalStats.coins < 2}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${lifelines.skip && !isAnswered && globalStats.coins >= 2
                  ? 'bg-slate-800 hover:bg-amber-500/10 border-slate-700 text-slate-200 hover:text-amber-400'
                  : 'bg-slate-900/50 border-slate-800/80 text-slate-600 cursor-not-allowed'
                }`}
            >
              <FastForward className="w-3.5 h-3.5" /> Preskoči (2 <Coins className="w-3 h-3 inline" />)
            </button>
          </div>

          <div className="mb-5 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-slate-400 flex items-center gap-1.5"><Heart className="w-4 h-4 text-rose-500 fill-rose-500" /> Energija</span>
              <span className={energy > 30 ? "text-slate-300" : "text-rose-400 animate-pulse font-extrabold"}>{energy}%</span>
            </div>
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-700">
              <div className={`h-full rounded-full transition-all duration-500 ${energy > 50 ? 'bg-emerald-500' : energy > 25 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${energy}%` }} />
            </div>
          </div>

          <div className="bg-slate-950/40 rounded-2xl p-5 mb-3 border border-slate-800">
            <div className="flex justify-between items-center text-xs text-slate-400 mb-2 font-medium">
              <span className="uppercase tracking-wider font-bold text-amber-400 flex items-center gap-1.5">
                {React.createElement(activeCategoryDetails.icon, { className: "w-4 h-4 inline" })} {activeCategoryDetails.label}
              </span>
              <span>Pitanje {currentIndex + 1} od {currentQuestions.length}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold leading-snug text-slate-100">{activeQuestion.question}</h2>
          </div>

          <div className="w-full bg-slate-800 h-1.5 rounded-full mb-6 overflow-hidden">
            <div className={`h-full transition-all duration-1000 ${timeLeft > 5 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, (timeLeft / 15) * 100)}%` }} />
          </div>

          <div className="grid grid-cols-1 gap-3">
            {shuffledAnswers.map((ans, idx) => {
              const isDisabled = disabledAnswers.includes(ans);
              let btnStyle = "bg-slate-800/70 hover:bg-slate-800 border-slate-700 text-slate-200";
              if (isDisabled) btnStyle = "bg-slate-950/40 border-slate-900 text-slate-700 opacity-20 cursor-not-allowed";
              else if (isAnswered) {
                if (ans === activeQuestion.correct_answer) btnStyle = "bg-emerald-600/90 border-emerald-500 text-white font-bold";
                else if (ans === selectedAnswer) btnStyle = "bg-rose-600/90 border-rose-500 text-white font-bold";
                else btnStyle = "bg-slate-900 border-slate-800 text-slate-600 opacity-40";
              }

              return (
                <button
                  key={idx}
                  disabled={isAnswered || isDisabled}
                  onClick={() => handleAnswerSelect(ans)}
                  className={`p-4 rounded-2xl border text-left font-medium transition-all flex justify-between ${btnStyle}`}
                >
                  <span className="pr-2">{ans}</span>
                  <span className="text-xs font-black text-slate-400 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">
                    {['A', 'B', 'C', 'D'][idx]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {gameState === 'GAME_OVER' && (
        <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
          <div className="inline-flex items-center justify-center p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-4">
            <Trophy className="w-12 h-12 text-amber-400" />
          </div>

          <h2 className="text-3xl font-black text-slate-100 mb-1">Kraj Kviza!</h2>
          <p className="text-slate-400 text-sm mb-6">Kategorija: <span className="text-amber-400 font-bold">{activeCategoryDetails.label}</span></p>

          <div className="bg-slate-950/60 rounded-2xl p-4 mb-6 border border-slate-800 flex justify-around">
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Ukupno Bodova</p>
              <p className="text-3xl font-black text-amber-400">{score}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Najveći Niz</p>
              <p className="text-3xl font-black text-emerald-400">{maxStreakInRound}x</p>
            </div>
          </div>

          {!hasSavedScore ? (
            <form onSubmit={saveHighScore} className="mb-6 flex gap-2">
              <input
                type="text"
                placeholder="Unesi nadimak..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={15}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 text-sm font-medium"
              />
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-3 rounded-xl transition-colors text-sm shadow-lg"
              >
                Spremi
              </button>
            </form>
          ) : (
            <p className="text-emerald-400 text-sm font-bold mb-6 flex items-center justify-center gap-1.5">
              <Award className="w-4 h-4" /> Rezultat uspješno spremljen!
            </p>
          )}

          <div className="mb-6 text-left">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">
              TOP 10 Ljestvica
            </h3>
            <div className="bg-slate-950/60 rounded-2xl border border-slate-800 overflow-hidden divide-y divide-slate-800/80">
              {(leaderboards[selectedCategory] || []).slice(0, 5).map((entry, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 text-sm px-4">
                  <span className="font-semibold text-slate-300 flex items-center gap-2">
                    <span className={`text-xs font-bold w-5 ${idx === 0 ? 'text-amber-400' : 'text-slate-500'}`}>#{idx + 1}</span>
                    {entry.name}
                  </span>
                  <span className="text-amber-400 font-bold">{entry.score} bod.</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => { sound.playClick(); setGameState('LOBBY'); }}
            className="w-full bg-slate-800 hover:bg-slate-750 text-slate-100 font-bold py-3.5 rounded-2xl transition-colors flex justify-center items-center gap-2 border border-slate-700/80 text-sm"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" /> Povratak u Izbornik
          </button>
        </div>
      )}

    </div>
  );
}