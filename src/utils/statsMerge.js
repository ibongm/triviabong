/**
 * Interim multi-tab mitigation: merges incoming stats from another tab's
 * `storage` event with current stats, taking the maximum for monotonic numeric
 * fields and merging achievement dictionaries so multi-tab last-write-wins data
 * loss is prevented.
 * 
 * NOTE: This interim logic will be superseded by Phase 2 Commit 4
 * (statsStore.js + atomic increment() on Firestore).
 */
export const mergeMonotonicStats = (current = {}, incoming = {}) => {
  if (!incoming || typeof incoming !== 'object') return current || {};

  const merged = { ...current, ...incoming };

  // Monotonic numeric fields: take max of current and incoming values
  const numericKeys = [
    'level',
    'xp',
    'coins',
    'totalGames',
    'totalAnswered',
    'totalCorrect',
    'maxStreak',
    'totalScore',
    'dayStreak',
    'consecutivePerfectRounds'
  ];

  for (const key of numericKeys) {
    const curVal = typeof current[key] === 'number' ? current[key] : 0;
    const incVal = typeof incoming[key] === 'number' ? incoming[key] : 0;
    merged[key] = Math.max(curVal, incVal);
  }

  // Merge unlockedAchievements dictionary (union of unlocked IDs)
  merged.unlockedAchievements = {
    ...(current.unlockedAchievements || {}),
    ...(incoming.unlockedAchievements || {})
  };

  // Merge categoryStats dictionary per category key
  const currentCat = current.categoryStats || {};
  const incomingCat = incoming.categoryStats || {};
  const allCatKeys = Array.from(new Set([...Object.keys(currentCat), ...Object.keys(incomingCat)]));

  if (allCatKeys.length > 0) {
    merged.categoryStats = { ...(current.categoryStats || {}) };
    for (const catKey of allCatKeys) {
      const curObj = currentCat[catKey] || {};
      const incObj = incomingCat[catKey] || {};
      merged.categoryStats[catKey] = {
        ...curObj,
        ...incObj,
        answered: Math.max(curObj.answered || 0, incObj.answered || 0),
        correct: Math.max(curObj.correct || 0, incObj.correct || 0),
        games: Math.max(curObj.games || 0, incObj.games || 0)
      };
    }
  }

  return merged;
};
