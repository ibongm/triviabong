import React, { useState, useEffect, useMemo } from 'react';
import {
  Heart, Trophy, Zap, RefreshCw, Flame, Award, ChevronRight,
  Globe, Film, History, BookOpen, Music, Brain, Sparkles, Utensils, Atom, HelpCircle,
  Scissors, FastForward, Clock, Crown, Coins, User, LogOut, ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import questionsData from './data/questions.json';
import { sound } from './utils/sound';
import AdminPanel from './components/AdminPanel';
import AuthModal from './components/AuthModal';
import { auth, logoutUser } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const ADMIN_EMAIL = 'ivanm.ploce@gmail.com';

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

// Shuffles options cleanly
const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5);

// Safely extracts all options (correct_answer + incorrect_answers) and shuffles them
const getQuestionOptions = (q) => {
  if (!q) return [];

  // If options are already bundled
  if (Array.isArray(q.options)) return q.options;

  // Combine correct_answer and incorrect_answers from standard schema
  const correct = q.correct_answer || q.correctAnswer;
  const incorrects = q.incorrect_answers || q.incorrectAnswers || [];

  if (correct !== undefined) {
    return [correct, ...incorrects];
  }

  return [];
};

// Checks if selected option matches the correct answer string
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

  // Active shuffled options for the current active question
  const [currentShuffledOptions, setCurrentShuffledOptions] = useState([]);

  const [score, setScore] = useState(0);
  const [hp, setHp] = useState(100);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [globalStats, setGlobalStats] = useState(() => {
    const saved = localStorage.getItem('triviabong_global_stats');
    return saved ? JSON.parse(saved) : { level: 1, xp: 0, coins: 15 };
  });

  const [jokersUsed, setJokersUsed] = useState({ fiftyFifty: false, plusTen: false, skip: false });
  const [hiddenOptions, setHiddenOptions] = useState([]);

  const [leaderboards, setLeaderboards] = useState(() => {
    const saved = localStorage.getItem('triviabong_leaderboards');
    return saved ? JSON.parse(saved) : {};
  });
  const [nickname, setNickname] = useState('');
  const [scoreSaved, setScoreSaved] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Synchronously reset question interaction states & shuffle options on index change
  useEffect(() => {
    setHiddenOptions([]);
    setSelectedOption(null);
    if (questions[currentIndex]) {
      const rawOpts = getQuestionOptions(questions[currentIndex]);
      setCurrentShuffledOptions(shuffleArray(rawOpts));
    }
  }, [currentIndex, questions]);

  // Handle Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user && user.displayName) {
        setNickname(user.displayName);
      }

      // If user navigated to /admin route, verify their email
      if (window.location.pathname.includes('/admin')) {
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

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem('triviabong_leaderboards', JSON.stringify(leaderboards));
  }, [leaderboards]);

  useEffect(() => {
    localStorage.setItem('triviabong_global_stats', JSON.stringify(globalStats));
  }, [globalStats]);

  // Timer loop
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

  const startCategory = (catKey) => {
    sound.playClick();
    const safeData = Array.isArray(questionsData) ? questionsData : [];
    const filtered = safeData.filter(q => q && q.category && q.category.toLowerCase() === catKey.toLowerCase());
    const pool = filtered.length > 0 ? filtered : safeData;
    const shuffled = [...pool].sort(() => 0.5 - Math.random()).slice(0, 10);

    setQuestions(shuffled);
    setSelectedCategory(catKey);
    setCurrentIndex(0);
    setScore(0);
    setHp(100);
    setStreak(0);
    setTimeLeft(15);
    setJokersUsed({ fiftyFifty: false, plusTen: false, skip: false });
    setHiddenOptions([]);
    setSelectedOption(null);
    setScoreSaved(false);
    setGameState('PLAYING');
  };

  const handleAnswer = (option) => {
    if (selectedOption !== null) return;
    setSelectedOption(option);

    const currentQ = questions[currentIndex];
    const correct = checkIsCorrect(currentQ, option);

    if (correct) {
      sound.playCorrect();
      const speedBonus = timeLeft * 10;
      const streakMultiplier = 1 + streak * 0.2;
      const earned = Math.round((100 + speedBonus) * streakMultiplier);

      setScore(s => s + earned);
      setStreak(s => s + 1);

      setGlobalStats(prev => ({
        ...prev,
        xp: prev.xp + 50,
        coins: prev.coins + (streak > 0 && streak % 3 === 0 ? 5 : 2)
      }));

      if ((streak + 1) % 3 === 0) {
        setHp(h => Math.min(100, h + 15));
      }
    } else {
      sound.playWrong();
      setStreak(0);
      const newHp = hp - 25;
      setHp(newHp);

      if (newHp <= 0) {
        setTimeout(() => setGameState('GAMEOVER'), 1000);
        return;
      }
    }

    setTimeout(() => {
      setSelectedOption(null);
      setHiddenOptions([]);

      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(c => c + 1);
        setTimeLeft(15);
      } else {
        sound.playCorrect();
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        setGameState('VICTORY');
      }
    }, 1200);
  };

  const handleAnswerTimeout = () => {
    sound.playWrong();
    setStreak(0);
    const newHp = hp - 25;
    setHp(newHp);
    setSelectedOption('TIMEOUT');

    if (newHp <= 0) {
      setTimeout(() => setGameState('GAMEOVER'), 1000);
      return;
    }

    setTimeout(() => {
      setSelectedOption(null);
      setHiddenOptions([]);
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(c => c + 1);
        setTimeLeft(15);
      } else {
        setGameState('VICTORY');
      }
    }, 1200);
  };

  const useFiftyFifty = () => {
    const currentQ = questions[currentIndex];
    if (jokersUsed.fiftyFifty || globalStats.coins < 1 || !currentQ) return;

    sound.playClick();
    const correctAns = currentQ.correct_answer || currentQ.correctAnswer;

    // Hide incorrect choices
    const incorrects = currentShuffledOptions.filter(opt => opt !== correctAns);
    const shuffledIncorrects = shuffleArray(incorrects);

    // Hide up to 2 incorrect choices
    const toHide = shuffledIncorrects.slice(0, 2);

    setHiddenOptions(toHide);
    setJokersUsed(j => ({ ...j, fiftyFifty: true }));
    setGlobalStats(g => ({ ...g, coins: g.coins - 1 }));
  };

  const usePlusTen = () => {
    if (jokersUsed.plusTen || globalStats.coins < 1) return;
    sound.playClick();
    setTimeLeft(t => t + 10);
    setJokersUsed(j => ({ ...j, plusTen: true }));
    setGlobalStats(g => ({ ...g, coins: g.coins - 1 }));
  };

  const useSkip = () => {
    if (jokersUsed.skip || globalStats.coins < 2) return;
    sound.playClick();
    setJokersUsed(j => ({ ...j, skip: true }));
    setGlobalStats(g => ({ ...g, coins: g.coins - 2 }));

    setHiddenOptions([]);
    setSelectedOption(null);
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(c => c + 1);
      setTimeLeft(15);
    } else {
      setGameState('VICTORY');
    }
  };

  const handleSaveScore = (e) => {
    e.preventDefault();
    if (!nickname.trim() || scoreSaved) return;

    const catKey = selectedCategory || 'Opće znanje';
    const currentList = leaderboards[catKey] || [];
    const newList = [...currentList, { name: nickname.trim(), score, date: new Date().toLocaleDateString() }]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    setLeaderboards({ ...leaderboards, [catKey]: newList });
    setScoreSaved(true);
    sound.playClick();
  };

  const handlePlayerLogout = async () => {
    await logoutUser();
    setShowAdminPanel(false);
    sound.playClick();
  };

  const categoriesList = useMemo(() => {
    const safeData = Array.isArray(questionsData) ? questionsData : [];
    const set = new Set(safeData.map(q => q && q.category ? q.category.toLowerCase() : 'opca_znanje'));
    return Array.from(set);
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

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800/80 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-400">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>{globalStats.coins}</span>
          </div>

          {/* Admin Quick Action Button (Only visible if logged in as Admin) */}
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
              <span className="text-xs font-bold text-slate-200 truncate max-w-[120px]">
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
                    onClick={() => startCategory(catKey)}
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

        {gameState === 'PLAYING' && currentQ && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-2xl text-xs font-bold">
              <div className="flex items-center gap-2 text-rose-400">
                <Heart className="w-4 h-4 fill-rose-400" />
                <span>{hp} HP</span>
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
                <span className="uppercase tracking-wider">{selectedCategory}</span>
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
                      disabled={selectedOption !== null}
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
                  disabled={jokersUsed.fiftyFifty || selectedOption !== null || globalStats.coins < 1}
                  onClick={useFiftyFifty}
                  className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 disabled:opacity-40 flex items-center gap-1"
                >
                  <Scissors className="w-3.5 h-3.5 text-amber-400" /> 50:50 (1c)
                </button>
                <button
                  disabled={jokersUsed.plusTen || selectedOption !== null || globalStats.coins < 1}
                  onClick={usePlusTen}
                  className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 disabled:opacity-40 flex items-center gap-1"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> +10s (1c)
                </button>
                <button
                  disabled={jokersUsed.skip || selectedOption !== null || globalStats.coins < 2}
                  onClick={useSkip}
                  className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 disabled:opacity-40 flex items-center gap-1"
                >
                  <FastForward className="w-3.5 h-3.5 text-amber-400" /> Preskoči (2c)
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
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl text-sm transition-colors shadow-lg shadow-amber-500/20"
                >
                  Spremi Rezultat
                </button>
              </form>
            ) : (
              <p className="text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 py-3 rounded-xl">
                <Award className="w-4 h-4" /> Rezultat uspješno spremljen!
              </p>
            )}

            <div className="text-left pt-2">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">
                Top 5 Ljestvica
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

      </main>

      {/* Auth Modal for Players */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          if (user.displayName) setNickname(user.displayName);
          if (user.email === ADMIN_EMAIL && window.location.pathname.includes('/admin')) {
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
            if (window.location.pathname.includes('/admin')) {
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