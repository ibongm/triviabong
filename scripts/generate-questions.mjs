// Generates new questions for one category with Gemini (Vertex AI) and
// merges them into src/data/categories/<file>.json.
//
// Usage: node scripts/generate-questions.mjs <category-file-stem> <count> [--dry-run]
//   e.g. node scripts/generate-questions.mjs znanost_i_tehnologija 20
//
// Every generated entry goes through the SAME validation and merge logic as
// the admin upload (src/utils/questionMerge.js) - this script used to write
// straight to the file, which let in entries the upload path would reject,
// used its own id prefixes (hr_his_/hr_spo_ instead of hr_hist_/hr_sport_),
// and only deduped via the prompt. Now:
//   - validateEntry rejects malformed entries (logged with the reason);
//   - mergeQuestions assigns ids from ID_PREFIXES and stamps `addedOn`
//     (today in Zagreb), which keeps today's Daily Challenge set stable;
//   - duplicates are skipped against the WHOLE bank (every category), not
//     just the target file.
// --dry-run prints what would be added without writing the file.
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import {
  validateEntry,
  mergeQuestions,
  buildQuestionTextIndex,
  CATEGORY_FILES,
  getZagrebDateKey,
  EXPLANATION_MAX_LENGTH,
} from '../src/utils/questionMerge.js';
import { resolveCategoryKey } from '../src/data/categoryKeys.js';
import { isDifficultyLevel } from '../src/utils/difficulty.js';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const positional = args.filter((a) => !a.startsWith('--'));
const categoryStem = positional[0] || 'geografija';
const count = parseInt(positional[1] || '10', 10);

const packKey = resolveCategoryKey(categoryStem);
if (!packKey || !CATEGORY_FILES[packKey]) {
  console.error(`Unknown category: "${categoryStem}"`);
  process.exit(1);
}
if (!Number.isInteger(count) || count < 1 || count > 200) {
  console.error(`Count must be an integer between 1 and 200 (got "${positional[1]}").`);
  process.exit(1);
}

const categoriesDir = path.resolve('src/data/categories');
const filePath = path.join(categoriesDir, CATEGORY_FILES[packKey]);
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const readPack = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const existingQuestions = readPack(filePath);

// Normalized texts of every OTHER category, for cross-bank dedupe.
const otherPacks = Object.values(CATEGORY_FILES)
  .filter((file) => file !== CATEGORY_FILES[packKey])
  .map((file) => path.join(categoriesDir, file))
  .filter((p) => fs.existsSync(p))
  .map(readPack);
const otherQuestionTexts = buildQuestionTextIndex(...otherPacks);

const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID;
const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

if (!project) {
  console.error('Error: Project ID is not set.');
  process.exit(1);
}

const ai = new GoogleGenAI({
  vertexAI: true,
  project,
  location,
});

const sampledRecent = existingQuestions
  .slice(-60)
  .map((q) => q.question)
  .join('\n- ');

const prompt = `
Generiraj točno ${count} unikatnih, provjerenih i točnih kviz pitanja na hrvatskom jeziku za kategoriju "${categoryStem}".
Uvjeti:
- Pitanja moraju biti na prirodnom i gramatički ispravnom hrvatskom jeziku.
- 'correct_answer' mora biti točan i nedvosmislen odgovor.
- 'incorrect_answers' mora sadržavati točno 3 uvjerljiva netočna odgovora.
- 'explanation': 1-2 kratke rečenice (najviše ${EXPLANATION_MAX_LENGTH} znakova) koje objašnjavaju ZAŠTO je točan odgovor točan. Bez ponavljanja pitanja, bez dodatnih zanimljivosti koje ne podupiru odgovor. Ako se činjenica s vremenom mijenja (rekordi, nositelji titula, brojke), navedi godinu stanja, npr. "(stanje 2024.)".
- 'difficulty_guess': tvoja procjena težine za prosječnog hrvatskog igrača: "easy" (većina zna, ~75%+ točnih), "medium" ili "hard" (većina griješi, ispod ~45% točnih). Budi realan; otprilike 30% easy, 40% medium, 30% hard.
- Nemoj ponavljati niti postavljati varijacije ovih postojećih pitanja:
- ${sampledRecent}
`;

async function run() {
  console.log(`Generating ${count} questions for category "${categoryStem}" (pack "${packKey}")${dryRun ? ' [dry run]' : ''}...`);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            question: { type: 'STRING' },
            correct_answer: { type: 'STRING' },
            incorrect_answers: {
              type: 'ARRAY',
              items: { type: 'STRING' },
            },
            explanation: { type: 'STRING' },
            difficulty_guess: { type: 'STRING', enum: ['easy', 'medium', 'hard'] },
          },
          required: ['question', 'correct_answer', 'incorrect_answers', 'explanation', 'difficulty_guess'],
        },
      },
    },
  });

  const rawData = JSON.parse(response.text);
  if (!Array.isArray(rawData)) {
    throw new Error('Model response was not a JSON array.');
  }

  const trimmed = rawData.map((item) => ({
    question: String(item?.question ?? '').trim(),
    correct_answer: String(item?.correct_answer ?? '').trim(),
    incorrect_answers: Array.isArray(item?.incorrect_answers)
      ? item.incorrect_answers.map((a) => String(a ?? '').trim())
      : item?.incorrect_answers,
    // An over-long or empty explanation shouldn't cost us an otherwise good
    // question: drop the explanation (logged) and keep the question.
    ...(typeof item?.explanation === 'string' && item.explanation.trim() ? { explanation: item.explanation.trim() } : {}),
    // Stored as `difficulty` (source 'guess' is stamped by mergeQuestions);
    // scripts/compute-difficulty.mjs replaces it once real stats exist.
    // An unusable value is simply dropped - it never costs the question.
    ...(isDifficultyLevel(item?.difficulty_guess) ? { difficulty: item.difficulty_guess } : {}),
  })).map((entry, i) => {
    if (entry.explanation && entry.explanation.length > EXPLANATION_MAX_LENGTH) {
      console.warn(`  Dropped over-long explanation on #${i + 1} (${entry.explanation.length} chars).`);
      const rest = { ...entry };
      delete rest.explanation;
      return rest;
    }
    return entry;
  });

  const valid = [];
  trimmed.forEach((entry, i) => {
    const result = validateEntry(entry);
    if (result.valid) {
      valid.push(entry);
    } else {
      console.warn(`  Rejected #${i + 1}: ${result.reason} - "${entry.question}"`);
    }
  });

  const addedOn = getZagrebDateKey();
  const { merged, added, skipped } = mergeQuestions(existingQuestions, valid, packKey, {
    addedOn,
    otherQuestionTexts,
  });

  console.log(`Generated ${rawData.length}: ${valid.length} valid, ${added} new, ${skipped} duplicate(s) skipped, ${rawData.length - valid.length} rejected.`);

  if (added === 0) {
    console.log('Nothing new to write.');
    return;
  }

  if (dryRun) {
    merged.slice(-added).forEach((q) => console.log(`  + ${q.id}: ${q.question}`));
    return;
  }

  fs.writeFileSync(filePath, JSON.stringify(merged, null, 4) + '\n', 'utf8');
  console.log(`Appended ${added} questions to ${filePath} (addedOn ${addedOn}).`);
}

run().catch((err) => {
  console.error('Generation failed:', err);
  process.exit(1);
});
