import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  MAX_LIVES,
  QUESTION_TIME_SECONDS
} from '../constants/gameBalance';
import { getQuestionOptions, shuffleArray } from '../utils/questionUtils';

/**
 * Hook owning round state, currentShuffledOptions derivation via useMemo,
 * and timer refs for round transitions.
 */
export function useGameRound() {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answerLocked, setAnswerLocked] = useState(true);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [streak, setStreak] = useState(0);
  const [correctInRound, setCorrectInRound] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_SECONDS);

  const [jokersUsed, setJokersUsed] = useState({ fiftyFifty: false, plusTen: false, skip: false });
  const [hiddenOptions, setHiddenOptions] = useState([]);
  const [jokerMessage, setJokerMessage] = useState(null);

  const [roundStartTime, setRoundStartTime] = useState(null);
  const [fastAnswerStreak, setFastAnswerStreak] = useState(0);
  const [fiftyFiftyUsedOnIndex, setFiftyFiftyUsedOnIndex] = useState(null);
  const [skipUsedAtLastLife, setSkipUsedAtLastLife] = useState(false);

  const jokerMessageTimer = useRef(null);
  const roundTransitionTimerRef = useRef(null);
  const gameOverTimerRef = useRef(null);

  const clearJokerMessageTimer = useCallback(() => {
    clearTimeout(jokerMessageTimer.current);
    jokerMessageTimer.current = null;
    setJokerMessage(null);
  }, []);

  const clearRoundTransitionTimers = useCallback(() => {
    clearTimeout(roundTransitionTimerRef.current);
    clearTimeout(gameOverTimerRef.current);
    roundTransitionTimerRef.current = null;
    gameOverTimerRef.current = null;
  }, []);

  // Synchronously derive shuffled options for current question using useMemo
  // to eliminate the 1-frame stale options flash on question advance.
  const currentQ = questions[currentIndex] || null;
  const currentShuffledOptions = useMemo(() => {
    if (!currentQ) return [];
    return shuffleArray(getQuestionOptions(currentQ));
  }, [currentIndex, currentQ]);

  // Lock answers briefly on question advance to prevent accidental double-taps
  useEffect(() => {
    setHiddenOptions([]);
    setSelectedOption(null);
    setAnswerLocked(true);
    const unlockTimer = setTimeout(() => setAnswerLocked(false), 300);
    return () => clearTimeout(unlockTimer);
  }, [currentIndex, questions]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearRoundTransitionTimers();
      clearJokerMessageTimer();
    };
  }, [clearRoundTransitionTimers, clearJokerMessageTimer]);

  const showJokerMessage = useCallback((text) => {
    clearTimeout(jokerMessageTimer.current);
    setJokerMessage(text);
    jokerMessageTimer.current = setTimeout(() => setJokerMessage(null), 2000);
  }, []);

  return {
    questions,
    setQuestions,
    currentIndex,
    setCurrentIndex,
    currentQ,
    currentShuffledOptions,
    selectedOption,
    setSelectedOption,
    answerLocked,
    setAnswerLocked,
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
  };
}
