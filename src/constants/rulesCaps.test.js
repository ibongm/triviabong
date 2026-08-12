import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { ACHIEVEMENTS } from './achievements';

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
});
