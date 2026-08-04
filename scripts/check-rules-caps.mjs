import { ACHIEVEMENTS } from '../src/constants/achievements.js';
import * as fs from 'node:fs';
import assert from 'node:assert';

const rulesText = fs.readFileSync('./firestore.rules', 'utf8');

// Assert achievement count in rules covers all defined ACHIEVEMENTS
assert.ok(
  ACHIEVEMENTS.length <= 30,
  `ACHIEVEMENTS length (${ACHIEVEMENTS.length}) exceeds firestore.rules cap of 30!`
);

// Assert firestore.rules contains expected magic number limits
assert.ok(rulesText.includes('achievementCount <= 30'), 'firestore.rules missing achievementCount <= 30 cap!');
assert.ok(rulesText.includes('score <= 10000'), 'firestore.rules missing score <= 10000 cap!');
assert.ok(rulesText.includes('elapsedMs <= 200000'), 'firestore.rules missing elapsedMs <= 200000 cap!');

console.log(`Rules caps assertion check passed: ${ACHIEVEMENTS.length} achievements defined (rules cap: 30)`);
