// Rulează cu: npm run validate-questions
// Verifică fișierele data/questions/1-samuel.json și 2-samuel.json:
//  - id-uri unice global
//  - fiecare întrebare are text, minim 3 opțiuni, "correct" valid
//  - capitolele sunt în intervalul corect (1-31 pentru 1 Samuel, 1-24 pentru 2 Samuel)
// Util mai ales pentru că vei adăuga manual 2000+ întrebări treptat.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FILES = [
  { path: '../data/questions/1-samuel.json', book: '1SAM', maxChapter: 31 },
  { path: '../data/questions/2-samuel.json', book: '2SAM', maxChapter: 24 },
];

let errors = 0;
let total = 0;
const seenIds = new Set();

for (const f of FILES) {
  const fullPath = path.join(__dirname, f.path);
  const raw = JSON.parse(readFileSync(fullPath, 'utf-8'));

  if (raw.book !== f.book) {
    console.error(`[${f.path}] câmpul "book" ar trebui să fie "${f.book}", e "${raw.book}"`);
    errors += 1;
  }

  for (const [chapterStr, questions] of Object.entries(raw.chapters || {})) {
    const chapter = Number(chapterStr);
    if (!Number.isInteger(chapter) || chapter < 1 || chapter > f.maxChapter) {
      console.error(`[${f.path}] capitol invalid: "${chapterStr}" (trebuie 1-${f.maxChapter})`);
      errors += 1;
    }

    questions.forEach((q, i) => {
      total += 1;
      const loc = `${f.book} cap.${chapterStr} #${i + 1}`;

      if (!q.id) { console.error(`${loc}: lipsește "id"`); errors += 1; }
      else if (seenIds.has(q.id)) { console.error(`${loc}: id duplicat "${q.id}"`); errors += 1; }
      else seenIds.add(q.id);

      if (!q.text || !q.text.trim()) { console.error(`${loc}: lipsește "text"`); errors += 1; }

      if (!Array.isArray(q.options) || q.options.length < 3 || q.options.length > 4) {
        console.error(`${loc}: "options" trebuie să aibă 3 sau 4 variante`); errors += 1;
      }

      if (typeof q.correct !== 'number' || q.correct < 0 || (q.options && q.correct >= q.options.length)) {
        console.error(`${loc}: "correct" invalid (trebuie index valid în options)`); errors += 1;
      }
    });
  }
}

console.log(`\nTotal întrebări verificate: ${total}`);
if (errors > 0) {
  console.error(`\n❌ ${errors} erori găsite.`);
  process.exit(1);
} else {
  console.log('\n✅ Totul e în regulă.');
}
