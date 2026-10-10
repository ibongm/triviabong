import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { ACHIEVEMENTS } from './achievements';
import { MAX_ROUND_ELAPSED_MS } from './gameBalance';
import { EXPLANATION_MAX_LENGTH } from '../utils/questionMerge';
import { SEASONS, BEST_ROUNDS_PER_WEEK, MAX_SEASON_WEEKS_STORED } from './seasons';
import { MAX_LEAGUE_MEMBERS, LEAGUE_NAME_MAX, LEAGUE_EMOJI_MAX, LEAGUE_CODE_PATTERN, LEAGUE_EMOJIS } from '../utils/league';
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

    it('weekly / season board caps match the numbers firestore.rules enforces', () => {
        expect(BEST_ROUNDS_PER_WEEK).toBe(5); // s1..s5 are spelled out in the rules
        expect(rulesText).toContain('d.s1 <= 10000');
        expect(rulesText).toContain('d.total == d.s1 + d.s2 + d.s3 + d.s4 + d.s5');
        expect(rulesText).toContain('request.resource.data.total - resource.data.total <= 10000');
        expect(rulesText).toContain(`d.weeks.size() <= ${MAX_SEASON_WEEKS_STORED}`);
        for (const season of SEASONS) {
            expect(season.weekCount).toBeLessThanOrEqual(MAX_SEASON_WEEKS_STORED);
            expect(season.id).toMatch(/^s[0-9]{1,3}$/); // the rules' season-id pattern
        }
        expect(rulesText).toContain("seasonId.matches('^s[0-9]{1,3}$')");
        expect(rulesText).toContain("weekKey.matches('^[0-9]{4}-W[0-9]{2}$')");
    });

    it('league caps and the code alphabet match firestore.rules', () => {
        expect(rulesText).toContain(`d.memberCount <= ${MAX_LEAGUE_MEMBERS}`);
        expect(rulesText).toContain(`leagueAfter().memberCount <= ${MAX_LEAGUE_MEMBERS}`);
        expect(rulesText).toContain(`d.name.size() <= ${LEAGUE_NAME_MAX}`);
        expect(rulesText).toContain(`d.emoji.size() <= ${LEAGUE_EMOJI_MAX}`);
        // The code pattern is written out in the rules several times; it must be the app's.
        const rulesPattern = "'^[A-HJ-NP-Z2-9]{6}$'";
        expect(LEAGUE_CODE_PATTERN.source).toBe('^[A-HJ-NP-Z2-9]{6}$');
        expect(rulesText.split(rulesPattern).length - 1).toBeGreaterThanOrEqual(3);
        for (const e of LEAGUE_EMOJIS) expect(e.length).toBeLessThanOrEqual(LEAGUE_EMOJI_MAX);
    });
});
