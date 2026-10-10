// Drafts answer explanations for existing questions that don't have one,
// with Gemini (Vertex AI), into a REVIEW FILE - it never edits a category
// file. A human reviews/edits the file, then applies it with
// scripts/apply-explanations.mjs.
//
// Usage: node scripts/generate-explanations.mjs <category-file-stem> [limit] [--batch=20]
//   e.g. node scripts/generate-explanations.mjs geografija 100
// Output: reports/explanations_<stem>_<YYYY-MM-DD>.json
//   [{ id, question, correct_answer, explanation }]
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { CATEGORY_FILES, EXPLANATION_MAX_LENGTH, getZagrebDateKey } from '../src/utils/questionMerge.js';
import { resolveCategoryKey } from '../src/data/categoryKeys.js';

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--'));
const batchArg = args.find((a) => a.startsWith('--batch='));
const categoryStem = positional[0];
const limit = parseInt(positional[1] || '50', 10);
const batchSize = batchArg ? parseInt(batchArg.split('=')[1], 10) : 20;

const packKey = resolveCategoryKey(categoryStem);
if (!packKey || !CATEGORY_FILES[packKey]) {
  console.error(`Unknown category: "${categoryStem}"`);
  process.exit(1);
}
if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
  console.error('Limit must be an integer between 1 and 1000.');
  process.exit(1);
}
if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 50) {
  console.error('--batch must be between 1 and 50.');
  process.exit(1);
}

const filePath = path.resolve('src/data/categories', CATEGORY_FILES[packKey]);
const pack = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const targets = pack.filter((q) => !q.explanation).slice(0, limit);
if (targets.length === 0) {
  console.log('Every question in this category already has an explanation.');
  process.exit(0);
}

const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID;
if (!project) {
  console.error('Error: Project ID is not set.');
  process.exit(1);
}
const ai = new GoogleGenAI({ vertexAI: true, project, location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1' });

const promptFor = (chunk) => `
Za svako kviz pitanje ispod napiši kratko objašnjenje na hrvatskom jeziku.
Pravila:
- 1-2 rečenice, najviše ${EXPLANATION_MAX_LENGTH} znakova.
- Objasni ZAŠTO je navedeni točan odgovor točan. Ne ponavljaj pitanje i ne dodaji zanimljivosti koje ne podupiru odgovor.
- Ako se činjenica s vremenom mijenja (rekordi, nositelji titula, brojke), navedi godinu stanja, npr. "(stanje 2024.)".
- Ako smatraš da navedeni točan odgovor NIJE točan, umjesto objašnjenja vrati tekst koji počinje s "PROVJERITI:" i ukratko navedi zašto.
- Vrati isti "id" za svako pitanje.

Pitanja (JSON):
${JSON.stringify(chunk.map((q) => ({ id: q.id, question: q.question, correct_answer: q.correct_answer })), null, 1)}
`;

async function run() {
  console.log(`Drafting explanations for ${targets.length} question(s) in "${categoryStem}" (batches of ${batchSize})...`);
  const out = [];
  const flagged = [];
  for (let i = 0; i < targets.length; i += batchSize) {
    const chunk = targets.slice(i, i + batchSize);
    const ids = new Set(chunk.map((q) => q.id));
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptFor(chunk),
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: { id: { type: 'STRING' }, explanation: { type: 'STRING' } },
              required: ['id', 'explanation'],
            },
          },
        },
      });
      const rows = JSON.parse(response.text);
      for (const row of Array.isArray(rows) ? rows : []) {
        const text = typeof row?.explanation === 'string' ? row.explanation.trim() : '';
        if (!ids.has(row?.id) || !text) continue;
        const q = chunk.find((c) => c.id === row.id);
        if (text.startsWith('PROVJERITI:')) {
          flagged.push({ id: q.id, question: q.question, correct_answer: q.correct_answer, note: text });
          continue;
        }
        if (text.length > EXPLANATION_MAX_LENGTH) {
          console.warn(`  ${q.id}: draft too long (${text.length}) - left out`);
          continue;
        }
        out.push({ id: q.id, question: q.question, correct_answer: q.correct_answer, explanation: text });
      }
      console.log(`  batch ${Math.floor(i / batchSize) + 1}: ${out.length} drafted so far`);
    } catch (err) {
      console.error(`  batch starting at ${i} failed:`, err.message || err);
    }
  }

  const date = getZagrebDateKey();
  fs.mkdirSync('reports', { recursive: true });
  const reviewPath = path.join('reports', `explanations_${categoryStem}_${date}.json`);
  fs.writeFileSync(reviewPath, JSON.stringify(out, null, 4) + '\n', 'utf8');
  console.log(`Wrote ${out.length} draft(s) to ${reviewPath}`);
  if (flagged.length) {
    const flaggedPath = path.join('reports', `explanations_${categoryStem}_${date}_PROVJERITI.json`);
    fs.writeFileSync(flaggedPath, JSON.stringify(flagged, null, 4) + '\n', 'utf8');
    console.log(`${flagged.length} question(s) the model thinks may have a wrong answer: ${flaggedPath}`);
  }
}

run().catch((err) => {
  console.error('Explanation drafting failed:', err);
  process.exit(1);
});
