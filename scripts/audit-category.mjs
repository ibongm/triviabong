import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

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
const maxToProcess = parseInt(process.argv[3] || '0', 10); // 0 = audit all
const BATCH_SIZE = 25;

const filePath = path.resolve(`src/data/categories/${category}.json`);
if (!fs.existsSync(filePath)) {
  console.error(`Category file not found: ${filePath}`);
  process.exit(1);
}

const allQuestions = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const targetQuestions = maxToProcess > 0 ? allQuestions.slice(0, maxToProcess) : allQuestions;

console.log(`Starting audit for "${category}": ${targetQuestions.length} total questions (chunks of ${BATCH_SIZE})...`);

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

  for (let i = 0; i < targetQuestions.length; i += BATCH_SIZE) {
    const chunk = targetQuestions.slice(i, i + BATCH_SIZE);
    const chunkIndex = Math.floor(i / BATCH_SIZE) + 1;
    const totalChunks = Math.ceil(targetQuestions.length / BATCH_SIZE);

    console.log(`Processing batch ${chunkIndex}/${totalChunks} (items ${i + 1} to ${i + chunk.length})...`);

    try {
      const results = await auditChunk(chunk);

      for (const res of results) {
        if (res.status === 'MODIFIED') {
          const original = updatedQuestionsMap.get(res.id);
          if (original) {
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
    } catch (err) {
      console.error(`Error processing batch ${chunkIndex}:`, err);
    }
  }

  // 1. Write updated database back to the category JSON
  const finalDatabase = Array.from(updatedQuestionsMap.values());
  fs.writeFileSync(filePath, JSON.stringify(finalDatabase, null, 4) + '\n', 'utf8');
  console.log(`Successfully updated ${filePath}. Total questions modified: ${changes.length}`);

  // 2. Generate Markdown Review Report
  const reportsDir = path.resolve('reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const reportDate = new Date().toISOString().split('T')[0];
  const reportPath = path.join(reportsDir, `audit_${category}_${reportDate}.md`);

  let md = `# KvizArena Audit Izvještaj: ${category.toUpperCase()}\n\n`;
  md += `- **Datum revizije:** ${new Date().toLocaleString('hr-HR')}\n`;
  md += `- **Ukupno pregledano:** ${targetQuestions.length} pitanja\n`;
  md += `- **Broj ispravljenih pitanja:** ${changes.length}\n\n`;
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
