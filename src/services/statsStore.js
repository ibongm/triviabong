import { DEFAULT_GLOBAL_STATS } from '../constants/defaultGlobalStats';
import { xpForLevel } from '../utils/leveling';

export const CURRENT_STATS_VERSION = 2;

/**
 * Account-scoped localStorage key generator.
 */
export const getStorageKey = (uid) => `triviabong_global_stats:${uid || 'anon'}`;

/**
 * Ordered list of schema migrations.
 * Migration 0 -> 1: XP Rebalance Migration (Level preservation)
 */
export const MIGRATIONS = [
  (stats) => {
    const currentLevel = Math.max(1, typeof stats.level === 'number' ? stats.level : 1);
    const currentXp = typeof stats.xp === 'number' ? stats.xp : 0;

    // Level-preservation policy: preserve existing level and rebase XP to match new curve threshold if below
    const minXpForLevel = xpForLevel(currentLevel);
    const safeXp = Math.max(currentXp, minXpForLevel);

    return {
      ...stats,
      level: currentLevel,
      xp: safeXp,
      statsVersion: 1
    };
  },
  // Migration 1 -> 2: Honest level/XP reset for the economy rebalance's new
  // XP curve (see leveling.js). Coins are preserved - only xp/level restart
  // from scratch, since the old curve's XP totals have no honest mapping
  // onto the new one. Any broader reset (including coins) is a manual admin
  // action, not something this migration does.
  (stats) => ({
    ...stats,
    xp: 0,
    level: 1,
    statsVersion: 2
  })
];

/**
 * Migrates raw stats object to current schema version.
 */
export const migrateStats = (rawStats = {}) => {
  const base = { ...DEFAULT_GLOBAL_STATS, ...(rawStats || {}) };
  let currentVersion = typeof base.statsVersion === 'number' ? base.statsVersion : 0;

  let migrated = { ...base };
  while (currentVersion < CURRENT_STATS_VERSION) {
    const migrationFn = MIGRATIONS[currentVersion];
    if (typeof migrationFn === 'function') {
      migrated = migrationFn(migrated);
    }
    currentVersion += 1;
  }

  migrated.statsVersion = CURRENT_STATS_VERSION;
  return migrated;
};

/**
 * Loads stats for a given UID from account-scoped localStorage with automatic schema migration.
 */
export const loadStats = (uid) => {
  const key = getStorageKey(uid);
  try {
    const saved = localStorage.getItem(key);
    if (!saved) {
      // Legacy fallback: check un-scoped key if loading anon stats
      if (!uid) {
        const legacy = localStorage.getItem('triviabong_global_stats');
        if (legacy) {
          const parsedLegacy = JSON.parse(legacy);
          const migrated = migrateStats(parsedLegacy);
          saveStats(uid, migrated);
          return migrated;
        }
      }
      const initial = migrateStats(DEFAULT_GLOBAL_STATS);
      saveStats(uid, initial);
      return initial;
    }
    const parsed = JSON.parse(saved);
    const migrated = migrateStats(parsed);
    if (migrated.statsVersion !== parsed.statsVersion) {
      saveStats(uid, migrated);
    }
    return migrated;
  } catch (err) {
    console.error(`Error loading stats for key ${key}:`, err);
    return migrateStats(DEFAULT_GLOBAL_STATS);
  }
};

/**
 * Saves stats for a given UID to account-scoped localStorage.
 */
export const saveStats = (uid, stats) => {
  const key = getStorageKey(uid);
  try {
    const dataToSave = { ...stats, statsVersion: CURRENT_STATS_VERSION };
    localStorage.setItem(key, JSON.stringify(dataToSave));
  } catch (err) {
    console.error(`Error saving stats for key ${key}:`, err);
  }
};
