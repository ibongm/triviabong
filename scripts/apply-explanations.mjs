// Merges a REVIEWED explanations file into the category JSON files.
//
// Usage: node scripts/apply-explanations.mjs <review-file.json> [--force]
//   review file: [{ id, explanation, ... }] as written by
//   scripts/generate-explanations.mjs (extra fields such as question /
//   correct_answer are there for the reviewer and are ignored here).
//
// Matches by id across every category file, never overwrites an existing
// explanation unless --force, and skips invalid lines with a reason
// (see applyExplanationsToPack in src/utils/questionMerge.js). Files are
// rewritten with the same formatting the rest of the tooling uses
// (UTF-8, 4-space indent, trailing newline).
import fs from 'fs';
import path from 'path';
import { CATEGORY_FILES, applyExplanationsToPack } from '../src/utils/questionMerge.js';

const args = process.argv.slice(2);
const force = args.includes('--force');
const reviewPath = args.find((a) => !a.startsWith('--'));
if (!reviewPath || !fs.existsSync(reviewPath)) {
  console.error('Usage: node scripts/apply-explanations.mjs <review-file.json> [--force]');
  process.exit(1);
}

const entries = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
if (!Array.isArray(entries)) {
  console.error('Review file must contain a JSON array.');
  process.exit(1);
}

const categoriesDir = path.resolve('src/data/categories');
const seen = new Set();
let totalApplied = 0;

for (const file of Object.values(CATEGORY_FILES)) {
  const filePath = path.join(categoriesDir, file);
  if (!fs.existsSync(filePath)) continue;
  const pack = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  pack.forEach((q) => seen.add(q.id));
  const { merged, applied, skipped } = applyExplanationsToPack(pack, entries, { force });
  skipped.forEach((s) => console.warn(`  skipped ${s.id}: ${s.reason}`));
  if (applied.length) {
    fs.writeFileSync(filePath, JSON.stringify(merged, null, 4) + '\n', 'utf8');
    console.log(`${file}: applied ${applied.length}`);
    totalApplied += applied.length;
  }
}

const unknown = entries.filter((e) => !seen.has(e?.id));
unknown.forEach((e) => console.warn(`  unknown id: ${e?.id}`));
console.log(`Done: ${totalApplied} explanation(s) applied, ${unknown.length} unknown id(s).`);
