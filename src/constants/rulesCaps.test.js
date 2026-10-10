import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { ACHIEVEMENTS } from './achievements';
import { MAX_ROUND_ELAPSED_MS } from './gameBalance';
import { EXPLANATION_MAX_LENGTH } from '../utils/questionMerge';
import { MAX_DUEL_SCORE, MAX_DUEL_TOTAL_TIME_MS, DUEL_QUESTION_COUNT, DUEL_TTL_MS } from '../utils/asyncDuel';

// Ported from the orphaned scripts/check-rules-caps.mjs (never wired into
// any npm script or CI job) - path resolved via import.meta.url instead of
// a repo-root-relative string, so it works regardless of vitest's cwd.
const __dirname = dirname(fileURLToPath(import.meta.url));
const rulesPath = resolve(__dirname, '../../firestore.rules');
const rulesText = fs.readFileSync(rulesPath, 'utf8');

describe('firestore.rules caps stay in sync with the app', () => {
    it('ACHIEVEMENTS never exceeds the achievementCount cap firestore.rules enforces', () => {
        expect(ACHIEVEMENTS.length).toBeLessThanOrEqual(100);
    });

    it('firestore.rules still declares the expected numeric caps', () => {
        expect(rulesText).toContain('achievementCount <= 100');
        expect(rulesText).toContain('score <= 10000');
        expect(rulesText).toContain('elapsedMs <= 200000');
    });

    it('app-side caps match the numbers firestore.rules enforces', () => {
        expect(rulesText).toContain(`elapsedMs <= ${MAX_ROUND_ELAPSED_MS}`);
        expect(rulesText).toContain(`explanation.size() <= ${EXPLANATION_MAX_LENGTH}`);
    });

    it('async duel result caps match the numbers firestore.rules enforces', () => {
        expect(rulesText).toContain(`request.resource.data.score <= ${MAX_DUEL_SCORE}`);
        expect(rulesText).toContain(`request.resource.data.totalTimeMs <= ${MAX_DUEL_TOTAL_TIME_MS}`);
        expect(rulesText).toContain(`request.resource.data.questionIds.size() == ${DUEL_QUESTION_COUNT}`);
        expect(rulesText).toContain(`request.resource.data.answers.size() == ${DUEL_QUESTION_COUNT}`);
        expect(DUEL_TTL_MS).toBe(48 * 3600 * 1000);
        expect(rulesText).toContain("duration.value(48, 'h')");
    });
});
