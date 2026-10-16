import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import {
  normalizeProgress,
  selectNextBatch,
  getUnaudited,
  recordRun,
  refreshCompletion,
  renderSummary,
} from '../src/utils/auditProgress.js';

const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID;
const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

if (!project) {
  console.error('Error: GCP_PROJECT_ID / GOOGLE_CLOUD_PROJECT is not set.');
  process.exit(1);
}

const ai = new GoogleGenAI({
  vertexAI: true,
  project,
  location,
});

const category = process.argv[2] || 'geografija';
// Number of not-yet-audited questions to check this run (0 = every remaining one).
const maxToProcess = parseInt(process.argv[3] || '0', 10);
const BATCH_SIZE = 25;

const categoriesDir = path.resolve('src/data/categories');
const filePath = path.join(categoriesDir, `${category}.json`);
if (!fs.existsSync(filePath)) {
  console.error(`Category file not found: ${filePath}`);
  process.exit(1);
}

// Which questions earlier runs already audited (audit/progress.json, updated by
// every run and committed with the fixes). Keyed by question id.
const auditDir = path.resolve('audit');
const progressPath = path.join(auditDir, 'progress.json');
const summaryPath = path.join(auditDir, 'PROGRESS.md');

const readProgress = () =>
  normalizeProgress(fs.existsSync(progressPath) ? JSON.parse(fs.readFileSync(progressPath, 'utf8')) : null);

// Writes progress.json and the readable PROGRESS.md summary.
const writeProgress = (progress) => {
  fs.mkdirSync(auditDir, { recursive: true });
  fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2) + '\n', 'utf8');

  const idsByCategory = {};
  for (const file of fs.readdirSync(categoriesDir).filter((f) => f.endsWith('.json'))) {
    const key = file.replace(/\.json$/, '');
    idsByCategory[key] = JSON.parse(fs.readFileSync(path.join(categoriesDir, file), 'utf8')).map((q) => q.id);
  }
  fs.writeFileSync(summaryPath, renderSummary(progress, idsByCategory, new Date().toISOString()), 'utf8');
};

// Values the workflow (and the scheduled task driving it) read after the run.
const setOutputs = (values) => {
  const lines = Object.entries(values).map(([k, v]) => `${k}=${v}`);
  console.log(`Run summary: ${lines.join(', ')}`);
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, lines.join('\n') + '\n');
  }
};

const allQuestions = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const progress = readProgress();
const targetQuestions = selectNextBatch(allQuestions, progress, category, maxToProcess);

if (targetQuestions.length === 0) {
  // Nothing left: record that the category is finished and stop without touching the question file.
  writeProgress(refreshCompletion(progress, category, allQuestions));
  console.log(`Nothing left to audit in "${category}": all ${allQuestions.length} questions were already audited.`);
  setOutputs({ audited: 0, modified: 0, failed_batches: 0, remaining: 0, complete: true });
  process.exit(0);
}

console.log(
  `Starting audit for "${category}": ${targetQuestions.length} questions this run ` +
    `(${getUnaudited(allQuestions, progress, category).length} unaudited of ${allQuestions.length}; chunks of ${BATCH_SIZE})...`
);

const systemPrompt = `
Djeluješ kao vrhunski, nemilosrdni pub kviz sastavljač, lektor i fact-checker za hrvatski jezik.
Tvoj zadatak je revidirati priloženi niz pitanja za aplikaciju KvizArena.

KRITERIJI ZA REVIZIJU:
1. ČINJENIČNA TOČNOST: Ako točan odgovor nije 100% točan ili je sporan, ispravi pitanje ili odgovor.
2. DISTRAKTORI: Ako je neki od ponuđenih netočnih odgovora zapravo točan, djelomično točan ili sinonim, zamijeni ga novim distaktorom.
3. NAVOĐENJE (SPOILER): Ako tekst pitanja sadrži korijen točne riječi ili očiti trag, preformuliraj ga.
4. LENGTH BIAS: Ako je točan odgovor značajno duži ili detaljniji od distaktora, uravnoteži duljine odgovora.
5. VREMENSKA TOČNOST: Ako pitanje ovisi o vremenu (npr. "posljednji", "trenutačni"), dodaj referentnu godinu ili ga preoblikuj da bude trajno točno.
6. HRVATSKI JEZIK: Ukloni loše doslovne prijevode s engleskog, anglizme i pravopisne greške.

PRAVILA ZA ODGOVOR:
- Za svako pitanje vrati objekt s originalnim "id".
- Ako je pitanje potpuno ispravno i ne zahtijeva promjene, postavi "status": "UNCHANGED". Možeš izostaviti "reason".
- Ako pitanje zahtijeva ispravak, postavi "status": "MODIFIED", navedi kratak i jasan "reason" (na hrvatskom), te vrati popravljene vrijednosti za "question", "correct_answer" i "incorrect_answers".
`;

async function auditChunk(chunk) {
  const prompt = `Pregledaj sljedećih ${chunk.length} pitanja i vrati status za svako:\n` + JSON.stringify(chunk);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      { role: 'user', parts: [{ text: systemPrompt + '\n\n' + prompt }] }
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            id: { type: 'STRING' },
            status: { type: 'STRING', enum: ['UNCHANGED', 'MODIFIED'] },
            reason: { type: 'STRING' },
            question: { type: 'STRING' },
            correct_answer: { type: 'STRING' },
            incorrect_answers: {
              type: 'ARRAY',
              items: { type: 'STRING' },
            },
          },
          required: ['id', 'status', 'question', 'correct_answer', 'incorrect_answers'],
        },
      },
    },
  });

  return JSON.parse(response.text);
}

async function run() {
  const changes = [];
  const updatedQuestionsMap = new Map(allQuestions.map(q => [q.id, q]));
  // Only ids from batches that came back usable are recorded as audited; a
  // failed batch stays unaudited so the next run retries it.
  const auditedIds = [];
  let failedBatches = 0;

  for (let i = 0; i < targetQuestions.length; i += BATCH_SIZE) {
    const chunk = targetQuestions.slice(i, i + BATCH_SIZE);
    const chunkIndex = Math.floor(i / BATCH_SIZE) + 1;
    const totalChunks = Math.ceil(targetQuestions.length / BATCH_SIZE);

    console.log(`Processing batch ${chunkIndex}/${totalChunks} (items ${i + 1} to ${i + chunk.length})...`);

    try {
      const results = await auditChunk(chunk);
      const chunkIds = new Set(chunk.map(q => q.id));

      for (const res of results) {
        // Ignore anything the model returned that was not in this chunk.
        if (!res || !chunkIds.has(res.id)) continue;

        if (res.status === 'UNCHANGED') {
          auditedIds.push(res.id);
          chunkIds.delete(res.id);
        } else if (res.status === 'MODIFIED') {
          const original = updatedQuestionsMap.get(res.id);
          const usable =
            typeof res.question === 'string' &&
            typeof res.correct_answer === 'string' &&
            Array.isArray(res.incorrect_answers) &&
            res.incorrect_answers.every(a => typeof a === 'string');
          if (original && usable) {
            auditedIds.push(res.id);
            chunkIds.delete(res.id);
            changes.push({
              id: res.id,
              reason: res.reason || 'Kvizmaster optimizacija formulacije i odgovora',
              original: { ...original },
              updated: {
                id: res.id,
                category: original.category,
                question: res.question.trim(),
                correct_answer: res.correct_answer.trim(),
                incorrect_answers: res.incorrect_answers.map(a => a.trim()),
              },
            });

            // Update main question map
            updatedQuestionsMap.set(res.id, {
              ...original,
              question: res.question.trim(),
              correct_answer: res.correct_answer.trim(),
              incorrect_answers: res.incorrect_answers.map(a => a.trim()),
            });
          }
        }
      }
      // Questions the model skipped or returned unusably stay unaudited.
      if (chunkIds.size > 0) {
        failedBatches += 1;
        console.warn(`Batch ${chunkIndex}: ${chunkIds.size} question(s) not usably audited; they will be retried next run.`);
      }
    } catch (err) {
      failedBatches += 1;
      console.error(`Error processing batch ${chunkIndex}:`, err);
    }
  }

  // A run that audited nothing must fail loudly instead of looking like a
  // clean run, otherwise a persistent error would stall the category silently.
  if (auditedIds.length === 0) {
    console.error(`No question could be audited this run (${failedBatches} failed batch(es)). Nothing was written.`);
    process.exit(1);
  }

  // 1. Write updated database back to the category JSON
  const finalDatabase = Array.from(updatedQuestionsMap.values());
  fs.writeFileSync(filePath, JSON.stringify(finalDatabase, null, 4) + '\n', 'utf8');
  console.log(`Successfully updated ${filePath}. Total questions modified: ${changes.length}`);

  // 1b. Record what this run audited (audit/progress.json + audit/PROGRESS.md)
  const updatedProgress = recordRun(
    progress,
    category,
    {
      runId: process.env.GITHUB_RUN_ID || 'local',
      date: new Date().toISOString().split('T')[0],
      auditedIds,
      modifiedIds: changes.map(c => c.id),
      failedBatches,
    },
    finalDatabase
  );
  writeProgress(updatedProgress);
  const remaining = getUnaudited(finalDatabase, updatedProgress, category).length;
  setOutputs({
    audited: auditedIds.length,
    modified: changes.length,
    failed_batches: failedBatches,
    remaining,
    complete: remaining === 0,
  });

  // 2. Generate Markdown Review Report
  const reportsDir = path.resolve('reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const reportDate = new Date().toISOString().split('T')[0];
  const reportPath = path.join(reportsDir, `audit_${category}_${reportDate}.md`);

  let md = `# KvizArena Audit Izvještaj: ${category.toUpperCase()}\n\n`;
  md += `- **Datum revizije:** ${new Date().toLocaleString('hr-HR')}\n`;
  md += `- **Ukupno pregledano:** ${auditedIds.length} pitanja\n`;
  md += `- **Broj ispravljenih pitanja:** ${changes.length}\n`;
  md += `- **Neuspjelih serija (pitanja se ponavljaju u sljedećem prolazu):** ${failedBatches}\n`;
  md += `- **Preostalo za reviziju u kategoriji:** ${remaining}\n\n`;
  md += `---\n\n`;

  if (changes.length === 0) {
    md += `Nema pronađenih grešaka. Sva pitanja zadovoljavaju kriterije točnosti i stila.\n`;
  } else {
    for (const change of changes) {
      md += `### Pitanje \`${change.id}\`\n\n`;
      md += `**Razlog promjene:** *${change.reason}*\n\n`;
      md += `| Polje | Prije | Poslije |\n`;
      md += `| :--- | :--- | :--- |\n`;
      md += `| **Pitanje** | ${change.original.question} | **${change.updated.question}** |\n`;
      md += `| **Točan odgovor** | ${change.original.correct_answer} | **${change.updated.correct_answer}** |\n`;
      md += `| **Netočni odgovori** | ${change.original.incorrect_answers.join(' // ')} | ${change.updated.incorrect_answers.join(' // ')} |\n\n`;
      md += `---\n\n`;
    }
  }

  fs.writeFileSync(reportPath, md, 'utf8');
  console.log(`Audit report generated at: ${reportPath}`);
}

run().catch((err) => {
  console.error('Audit run failed:', err);
  process.exit(1);
});
