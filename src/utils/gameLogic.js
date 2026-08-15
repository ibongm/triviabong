import { DEFAULT_GLOBAL_STATS } from '../constants/defaultGlobalStats';
import {
  XP_PER_CORRECT_ANSWER,
  COIN_STREAK_MILESTONES,
  ACHIEVEMENT_NORMAL_XP,
  ACHIEVEMENT_NORMAL_COINS,
  ACHIEVEMENT_HIDDEN_XP,
  ACHIEVEMENT_HIDDEN_COINS,
  QUESTION_TIME_SECONDS
} from '../constants/gameBalance';
import { ACHIEVEMENTS } from '../constants/achievements';
import { computeLevelFromXp, getCoinsForLevelUp } from './leveling';
import { getTitleForLevel } from '../constants/levelTitles';
import { evaluateAchievements, mergeUnlockedAchievements, computeDayStreakUpdate } from './achievements';

/**
 * Applies the xp/coins reward for a batch of newly-unlocked achievement ids
 * (normal vs hidden payout, per constants/gameBalance.js) on top of `stats`,
 * and folds in any level-up(s) the reward xp itself triggers - so an
 * achievement earned right at a level boundary still pays out the level-up
 * coin bonus and pushes its own LEVEL_UP event, same as XP from an answer
 * would. Returns the updated stats plus any LEVEL_UP events to push.
 */
const applyAchievementRewards = (stats, newlyUnlockedIds) => {
  let xp = stats.xp || 0;
  let coins = stats.coins || 0;
  let level = stats.level || 1;
  const levelUpEvents = [];

  for (const id of newlyUnlockedIds) {
    const isHidden = ACHIEVEMENTS.find((a) => a.id === id)?.hidden === true;
    xp += isHidden ? ACHIEVEMENT_HIDDEN_XP : ACHIEVEMENT_NORMAL_XP;
    coins += isHidden ? ACHIEVEMENT_HIDDEN_COINS : ACHIEVEMENT_NORMAL_COINS;

    const computedLevel = computeLevelFromXp(xp);
    if (computedLevel > level) {
      const levelCoins = getCoinsForLevelUp(computedLevel);
      coins += levelCoins;
      levelUpEvents.push({ type: 'LEVEL_UP', level: computedLevel, coins: levelCoins, title: getTitleForLevel(computedLevel) });
      level = computedLevel;
    }
  }

  return { stats: { ...stats, xp, coins, level }, levelUpEvents };
};

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
        const { stats: rewarded, levelUpEvents } = applyAchievementRewards(nextStats, newlyUnlocked);
        nextStats = { ...rewarded, unlockedAchievements: mergeUnlockedAchievements(nextStats, newlyUnlocked) };
        events.push({ type: 'ACHIEVEMENTS_UNLOCKED', achievements: newlyUnlocked });
        events.push(...levelUpEvents);
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
        newStreak = 0,
        isPotterQuestion = false
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

        // newStreak increments by exactly 1 each correct answer, so each of
        // COIN_STREAK_MILESTONES' keys (3/5/10) fires exactly once per round
        // naturally - no extra tracking needed.
        const streakCoins = COIN_STREAK_MILESTONES[newStreak] ?? 0;
        const levelCoins = leveledUp ? getCoinsForLevelUp(level) : 0;
        coins += streakCoins + levelCoins;

        if (leveledUp) events.push({ type: 'LEVEL_UP', level, coins: levelCoins, title: getTitleForLevel(level) });
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
        isLivingDangerously,
        isPotterQuestion
      };

      const newlyUnlocked = evaluateAchievements(nextStats, ctx);
      if (newlyUnlocked.length > 0) {
        const { stats: rewarded, levelUpEvents } = applyAchievementRewards(nextStats, newlyUnlocked);
        nextStats = { ...rewarded, unlockedAchievements: mergeUnlockedAchievements(nextStats, newlyUnlocked) };
        events.push({ type: 'ACHIEVEMENTS_UNLOCKED', achievements: newlyUnlocked });
        events.push(...levelUpEvents);
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

      // Round-completion/perfect-round income was cut in the economy
      // rebalance (2026-08) - xp only grows per-answer now (see the ANSWER
      // case above), and the only coin source left here is a level-up that
      // crossed the finish line on the round's last correct answer without
      // having already fired from the ANSWER case (defensive: ANSWER already
      // handles the common case, this only covers a stats shape where xp
      // grew without going through ANSWER, e.g. future non-gameplay callers).
      const newXp = nextStats.xp || 0;
      const prevLevel = nextStats.level || 1;
      const newLevel = Math.max(prevLevel, computeLevelFromXp(newXp));
      const leveledUp = newLevel > prevLevel;
      const coinsEarned = leveledUp ? getCoinsForLevelUp(newLevel) : 0;

      nextStats = {
        ...nextStats,
        xp: newXp,
        level: newLevel,
        coins: (nextStats.coins || 0) + coinsEarned,
        consecutivePerfectRounds: isPerfect ? (nextStats.consecutivePerfectRounds || 0) + 1 : 0
      };

      if (leveledUp) events.push({ type: 'LEVEL_UP', level: newLevel, coins: coinsEarned, title: getTitleForLevel(newLevel) });

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
        const { stats: rewarded, levelUpEvents } = applyAchievementRewards(nextStats, newlyUnlocked);
        nextStats = { ...rewarded, unlockedAchievements: mergeUnlockedAchievements(nextStats, newlyUnlocked) };
        events.push({ type: 'ACHIEVEMENTS_UNLOCKED', achievements: newlyUnlocked });
        events.push(...levelUpEvents);
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
        const { stats: rewarded, levelUpEvents } = applyAchievementRewards(nextStats, newlyUnlocked);
        nextStats = { ...rewarded, unlockedAchievements: mergeUnlockedAchievements(nextStats, newlyUnlocked) };
        events.push({ type: 'ACHIEVEMENTS_UNLOCKED', achievements: newlyUnlocked });
        events.push(...levelUpEvents);
      }
      break;
    }

    default:
      break;
  }

  return { stats: nextStats, round: nextRound, events };
}
