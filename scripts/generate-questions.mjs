import fs from 'fs';
import path from 'path';
import pkg from '@google-cloud/vertexai';

const { VertexAI } = pkg;

const project = process.env.GCP_PROJECT_ID;
const location = process.env.GCP_REGION || 'europe-west1';

if (!project) {
  console.error('Error: GCP_PROJECT_ID is not set.');
  process.exit(1);
}

const vertexAI = new VertexAI({ project, location });
const model = vertexAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  generationConfig: {
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
            minItems: 3,
            maxItems: 3,
          },
        },
        required: ['question', 'correct_answer', 'incorrect_answers'],
      },
    },
  },
});

// Category slug mapping to short ID prefix
const PREFIX_MAP = {
  geografija: 'hr_geo',
  glazba: 'hr_mus',
  knjizevnost_i_umjetnost: 'hr_art',
  opca_znanje: 'hr_gen',
  pop_kultura: 'hr_pop',
  povijest: 'hr_his',
  sport: 'hr_spo',
  znanost_i_tehnologija: 'hr_sci',
};

const category = process.argv[2] || 'geografija';
const count = parseInt(process.argv[3] || '10', 10);
const filePath = path.resolve(`src/data/categories/${category}.json`);

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const existingQuestions = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Determine the starting ID index
const prefix = PREFIX_MAP[category] || `hr_${category.substring(0, 3)}`;
let highestIndex = 0;
for (const q of existingQuestions) {
  const match = q.id?.match(/_(\d+)$/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num > highestIndex) highestIndex = num;
  }
}

// Sample recent questions to prevent duplicates
const sampledRecent = existingQuestions
  .slice(-60)
  .map((q) => q.question)
  .join('\n- ');

const prompt = `
Generiraj točno ${count} unikatnih, provjerenih i točnih kviz pitanja na hrvatskom jeziku za kategoriju "${category}".
Uvjeti:
- Pitanja moraju biti na prirodnom i gramatički ispravnom hrvatskom jeziku.
- 'correct_answer' mora biti točan i nedvosmislen odgovor.
- 'incorrect_answers' mora sadržavati točno 3 uvjerljiva netočna odgovora.
- Nemoj ponavljati niti postavljati varijacije ovih postojećih pitanja:
- ${sampledRecent}
`;

async function run() {
  console.log(`Generating ${count} questions for category: "${category}" (current max ID: ${highestIndex})...`);
  const response = await model.generateContent(prompt);
  const rawData = JSON.parse(response.response.candidates[0].content.parts[0].text);

  const formattedQuestions = rawData.map((item) => {
    highestIndex += 1;
    return {
      id: `${prefix}_${highestIndex}`,
      category,
      question: item.question.trim(),
      correct_answer: item.correct_answer.trim(),
      incorrect_answers: item.incorrect_answers.map((a) => a.trim()),
    };
  });

  const updatedDatabase = [...existingQuestions, ...formattedQuestions];
  fs.writeFileSync(filePath, JSON.stringify(updatedDatabase, null, 4) + '\n', 'utf8');

  console.log(`Successfully appended ${formattedQuestions.length} questions to ${filePath}!`);
}

run().catch((err) => {
  console.error('Generation failed:', err);
  process.exit(1);
});
