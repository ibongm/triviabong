// Computes question difficulty tiers from real play data.
//
// Reads the public per-question counters (questionStats/{questionId},
// { total, correct, wrong }) over Firestore's REST API - no credentials
// needed, the collection is publicly readable - and, for every question with
// at least MIN_ATTEMPTS attempts, writes into the category JSON files:
//   difficulty          'easy' (>=75% correct) | 'medium' | 'hard' (<45%)
//   difficultyAccuracy  correct share, 2 decimals
//   difficultySource    'stats'
// Questions below the attempt threshold are left alone (including a
// generator's 'guess' tier). Accuracy-only drifts under 3 points are not
// rewritten, to keep the diff - and the Vercel redeploy it triggers - small.
//
// It also writes reports/suspect_questions_<date>.md listing questions with
// enough attempts and under 15% correct: worse than a random guess among four
// options, which usually means a wrong answer key or an ambiguous question.
// Those need a human; this script only reports them.
//
// Usage: node scripts/compute-difficulty.mjs [--dry-run] [--stats-file=<json>]
//   --stats-file  read { "<id>": { "total": n, "correct": n } } from a file
//                 instead of Firestore (offline runs and tests).
import fs from 'fs';
import path from 'path';
import { CATEGORY_FILES, getZagrebDateKey } from '../src/utils/questionMerge.js';
import { applyDifficultyFromStats, MIN_ATTEMPTS } from '../src/utils/difficulty.js';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const statsFileArg = args.find((a) => a.startsWith('--stats-file='));
const projectId = process.env.FIREBASE_PROJECT_ID || 'triviabong-web';

const intOf = (field) => Number(field?.integerValue ?? field?.doubleValue ?? NaN);

async function fetchStatsFromFirestore() {
    const out = {};
    let pageToken = '';
    let pages = 0;
    do {
        const url = new URL(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/questionStats`);
        url.searchParams.set('pageSize', '300');
        if (pageToken) url.searchParams.set('pageToken', pageToken);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Firestore REST ${res.status}: ${(await res.text()).slice(0, 300)}`);
        const body = await res.json();
        for (const doc of body.documents || []) {
            const id = doc.name.split('/').pop();
            out[id] = { total: intOf(doc.fields?.total), correct: intOf(doc.fields?.correct) };
        }
        pageToken = body.nextPageToken || '';
        pages += 1;
    } while (pageToken && pages < 200);
    return out;
}

async function run() {
    const statsById = statsFileArg
        ? JSON.parse(fs.readFileSync(statsFileArg.split('=')[1], 'utf8'))
        : await fetchStatsFromFirestore();
    console.log(`Loaded stats for ${Object.keys(statsById).length} question(s) (measuring those with >= ${MIN_ATTEMPTS} attempts).`);

    const categoriesDir = path.resolve('src/data/categories');
    const allSuspects = [];
    let totalChanged = 0;
    let totalMeasured = 0;

    for (const [packKey, file] of Object.entries(CATEGORY_FILES)) {
        const filePath = path.join(categoriesDir, file);
        const pack = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const { pack: next, changed, measured, suspects } = applyDifficultyFromStats(pack, statsById);
        totalChanged += changed;
        totalMeasured += measured;
        allSuspects.push(...suspects.map((s) => ({ ...s, packKey })));
        console.log(`  ${packKey}: ${measured} measured, ${changed} updated, ${suspects.length} suspect`);
        if (changed > 0 && !dryRun) {
            fs.writeFileSync(filePath, JSON.stringify(next, null, 4) + '\n', 'utf8');
        }
    }

    console.log(`Total: ${totalMeasured} measured, ${totalChanged} ${dryRun ? 'would be ' : ''}updated.`);

    if (allSuspects.length && !dryRun) {
        const date = getZagrebDateKey();
        fs.mkdirSync('reports', { recursive: true });
        const reportPath = path.join('reports', `suspect_questions_${date}.md`);
        const lines = [
            `# Sumnjiva pitanja (${date})`,
            '',
            `Pitanja s najmanje ${MIN_ATTEMPTS} odgovora i manje od 15% točnih - lošije od nasumičnog pogađanja (25%).`,
            'Najčešće je kriv ključ točnog odgovora ili je pitanje dvosmisleno. Provjeri ručno.',
            '',
            '| ID | Kategorija | Točno | Odgovora | Pitanje | Označeni točan odgovor |',
            '|---|---|---|---|---|---|',
            ...allSuspects
                .sort((a, b) => a.accuracy - b.accuracy)
                .map((s) => `| ${s.id} | ${s.packKey} | ${Math.round(s.accuracy * 100)}% | ${s.total} | ${s.question.replace(/\|/g, '\\|')} | ${s.correct_answer.replace(/\|/g, '\\|')} |`),
            '',
        ];
        fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
        console.log(`${allSuspects.length} suspect question(s) written to ${reportPath}`);
    }
}

run().catch((err) => {
    console.error('Difficulty computation failed:', err);
    process.exit(1);
});
