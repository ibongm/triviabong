// Lists questions whose text is an exact duplicate (after the same
// normalization the merge uses: lowercase, collapsed whitespace, trimmed)
// anywhere in the bank - within one category file or across categories.
//
// Read-only: it never edits a category file. Deciding which copy to remove
// is left to a human, since ids are referenced by questionStats, match docs
// and reports.
//
// Usage: node scripts/report-duplicate-questions.mjs [--out reports/duplicates.md]
import fs from 'fs';
import path from 'path';
import { CATEGORY_FILES, normalizeText } from '../src/utils/questionMerge.js';

const outIndex = process.argv.indexOf('--out');
const outPath = outIndex !== -1 ? process.argv[outIndex + 1] : null;

const categoriesDir = path.resolve('src/data/categories');
const byText = new Map();

for (const file of Object.values(CATEGORY_FILES)) {
  const filePath = path.join(categoriesDir, file);
  if (!fs.existsSync(filePath)) continue;
  const questions = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  for (const q of questions) {
    const key = normalizeText(q?.question);
    if (!key) continue;
    if (!byText.has(key)) byText.set(key, []);
    byText.get(key).push({ id: q.id, file, question: q.question, correct_answer: q.correct_answer });
  }
}

const groups = [...byText.values()]
  .filter((entries) => entries.length > 1)
  .sort((a, b) => b.length - a.length || String(a[0].id).localeCompare(String(b[0].id)));

const extraCopies = groups.reduce((sum, g) => sum + g.length - 1, 0);
const crossCategory = groups.filter((g) => new Set(g.map((e) => e.file)).size > 1).length;

const lines = [
  '# Duplicate questions',
  '',
  `- Duplicate groups: **${groups.length}** (${crossCategory} span more than one category)`,
  `- Extra copies (removable without losing a question): **${extraCopies}**`,
  '',
];
for (const g of groups) {
  const answersDiffer = new Set(g.map((e) => normalizeText(e.correct_answer))).size > 1;
  lines.push(`## ${g[0].question}${answersDiffer ? '  ⚠️ different correct answers' : ''}`);
  for (const e of g) lines.push(`- \`${e.id}\` (${e.file}) → ${e.correct_answer}`);
  lines.push('');
}

const report = lines.join('\n');
if (outPath) {
  fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
  fs.writeFileSync(outPath, report, 'utf8');
  console.log(`Wrote ${groups.length} duplicate groups (${extraCopies} extra copies) to ${outPath}`);
} else {
  console.log(report);
}
