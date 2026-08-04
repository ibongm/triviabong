import { DEFAULT_GLOBAL_STATS } from '../constants/defaultGlobalStats';
import {
  XP_PER_CORRECT_ANSWER,
  COIN_STREAK_BONUS_INTERVAL,
  COIN_STREAK_BONUS_AMOUNT,
  COIN_LEVEL_UP_BONUS,
  COIN_PER_ROUND_COMPLETE,
  COIN_PERFECT_ROUND_BONUS,
  PERFECT_ROUND_XP_BONUS,
  QUESTION_TIME_SECONDS
} from '../constants/gameBalance';
import { computeLevelFromXp } from './leveling';
import { evaluateAchievements, mergeUnlockedAchievements, computeDayStreakUpdate } from './achievements';

/**
 * Pure function to apply game state updates to globalStats and round state.
 * Replaces scattered inline setGlobalStats logic across gameplay functions.
 *
 * @param {Object} stats - Current globalStats
 * @param {Object} round - Current round state (score, streak, lives, etc.)
 * @param {Object} action - Action object describing the event:
 *   - { type: 'START_ROUND' }
 *   - { type: 'ANSWER', isCorrect, pointsEarned, category, timeLeft, isLastQuestion, isLivingDangerously, isLifeSaverHit, fastAnswerStreak, newStreak }
 *   - { type: 'ROUND_END', isPerfect, finalScore, jokersUsed, skipUsedAtLastLife, roundElapsedMs, isVictory }
 *   - { type: 'USE_JOKER', cost, jokersUsedAfter }
 *
 * @returns {{ stats: Object, round: Object, events: Array }}
 */
export function applyAnswer(stats = DEFAULT_GLOBAL_STATS, round = {}, action = {}) {
  let nextStats = { ...stats };
  let nextRound = { ...round };
  const events = [];

  switch (action.type) {
    case 'START_ROUND': {
      const { dayStreak, lastPlayedDate } = computeDayStreakUpdate(nextStats);
      nextStats = {
        ...nextStats,
        totalGames: (nextStats.totalGames || 0) + 1,
        dayStreak,
        lastPlayedDate
      };
      const newlyUnlocked = evaluateAchievements(nextStats, {});
      if (newlyUnlocked.length > 0) {
        nextStats.unlockedAchievements = mergeUnlockedAchievements(nextStats, newlyUnlocked);
        events.push({ type: 'ACHIEVEMENTS_UNLOCKED', achievements: newlyUnlocked });
      }
      break;
    }

    case 'ANSWER': {
      const {
        isCorrect,
        pointsEarned = 0,
        category = 'opca_znanje',
        timeLeft = QUESTION_TIME_SECONDS,
        isLivingDangerously = false,
        isLifeSaverHit = false,
        fastAnswerStreak = 0,
        newStreak = 0
      } = action;

      const prevCat = nextStats.categoryStats?.[category] || { total: 0, correct: 0 };

      let xp = nextStats.xp || 0;
      let level = nextStats.level || 1;
      let coins = nextStats.coins || 0;

      if (isCorrect) {
        xp += XP_PER_CORRECT_ANSWER;
        const computedLevel = computeLevelFromXp(xp);
        const leveledUp = computedLevel > level;
        level = Math.max(level, computedLevel);

        const streakCoins = (newStreak % COIN_STREAK_BONUS_INTERVAL === 0 ? COIN_STREAK_BONUS_AMOUNT : 0);
        const levelCoins = leveledUp ? COIN_LEVEL_UP_BONUS : 0;
        coins += streakCoins + levelCoins;

        if (leveledUp) events.push({ type: 'LEVEL_UP', level });
      }

      nextStats = {
        ...nextStats,
        xp,
        level,
        coins,
        totalAnswered: (nextStats.totalAnswered || 0) + 1,
        totalCorrect: (nextStats.totalCorrect || 0) + (isCorrect ? 1 : 0),
        maxStreak: Math.max(nextStats.maxStreak || 0, newStreak),
        totalScore: (nextStats.totalScore || 0) + pointsEarned,
        categoryStats: {
          ...nextStats.categoryStats,
          [category]: {
            total: prevCat.total + 1,
            correct: prevCat.correct + (isCorrect ? 1 : 0)
          }
        }
      };

      const ctx = {
        timeLeft: Math.min(timeLeft, QUESTION_TIME_SECONDS),
        newStreak,
        fastAnswerStreak,
        isLifeSaverHit,
        isLivingDangerously
      };

      const newlyUnlocked = evaluateAchievements(nextStats, ctx);
      if (newlyUnlocked.length > 0) {
        nextStats.unlockedAchievements = mergeUnlockedAchievements(nextStats, newlyUnlocked);
        events.push({ type: 'ACHIEVEMENTS_UNLOCKED', achievements: newlyUnlocked });
      }
      break;
    }

    case 'ROUND_END': {
      const {
        isPerfect = false,
        finalScore = 0,
        jokersUsed = { fiftyFifty: false, plusTen: false, skip: false },
        skipUsedAtLastLife = false,
        roundElapsedMs,
        isVictory = false
      } = action;

      const newXp = (nextStats.xp || 0) + (isPerfect ? PERFECT_ROUND_XP_BONUS : 0);
      const prevLevel = nextStats.level || 1;
      const newLevel = Math.max(prevLevel, computeLevelFromXp(newXp));
      const leveledUp = newLevel > prevLevel;

      const coinsEarned = COIN_PER_ROUND_COMPLETE
        + (isPerfect ? COIN_PERFECT_ROUND_BONUS : 0)
        + (leveledUp ? COIN_LEVEL_UP_BONUS : 0);

      nextStats = {
        ...nextStats,
        xp: newXp,
        level: newLevel,
        coins: (nextStats.coins || 0) + coinsEarned,
        consecutivePerfectRounds: isPerfect ? (nextStats.consecutivePerfectRounds || 0) + 1 : 0
      };

      if (leveledUp) events.push({ type: 'LEVEL_UP', level: newLevel });

      const ctx = {
        isPerfect,
        finalScore,
        hour: new Date().getHours(),
        isVictory,
        noJokersUsed: !jokersUsed.fiftyFifty && !jokersUsed.plusTen && !jokersUsed.skip,
        skipUsedAtLastLife,
        roundElapsedMs
      };

      const newlyUnlocked = evaluateAchievements(nextStats, ctx);
      if (newlyUnlocked.length > 0) {
        nextStats.unlockedAchievements = mergeUnlockedAchievements(nextStats, newlyUnlocked);
        events.push({ type: 'ACHIEVEMENTS_UNLOCKED', achievements: newlyUnlocked });
      }
      break;
    }

    case 'USE_JOKER': {
      const { cost = 0, jokersUsedAfter = {} } = action;
      nextStats = {
        ...nextStats,
        coins: Math.max(0, (nextStats.coins || 0) - cost)
      };

      const ctx = {
        allJokersUsedThisRound: jokersUsedAfter.fiftyFifty && jokersUsedAfter.plusTen && jokersUsedAfter.skip
      };
      const newlyUnlocked = evaluateAchievements(nextStats, ctx);
      if (newlyUnlocked.length > 0) {
        nextStats.unlockedAchievements = mergeUnlockedAchievements(nextStats, newlyUnlocked);
        events.push({ type: 'ACHIEVEMENTS_UNLOCKED', achievements: newlyUnlocked });
      }
      break;
    }

    default:
      break;
  }

  return { stats: nextStats, round: nextRound, events };
}
