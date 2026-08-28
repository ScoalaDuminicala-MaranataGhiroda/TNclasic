// Rulează cu: npm run validate-questions
// Verifică fișierele din folderele data/questions/1-samuel/ și data/questions/2-samuel/
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BOOKS_CONFIG = [
  { dir: '../data/questions/1-samuel', book: '1SAM', maxChapter: 31 },
  { dir: '../data/questions/2-samuel', book: '2SAM', maxChapter: 24 },
];

let errors = 0;
let total = 0;
const seenIds = new Set();

for (const config of BOOKS_CONFIG) {
  const fullDirPath = path.join(__dirname, config.dir);
  let files = [];

  try {
    files = readdirSync(fullDirPath).filter(f => f.endsWith('.json'));
  } catch (e) {
    console.error(`Avertisment: Nu am putut citi directorul ${fullDirPath} (probabil nu a fost creat încă)`);
    continue;
  }

  for (const file of files) {
    const filePath = path.join(fullDirPath, file);
    let raw;
    try {
      raw = JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch (e) {
      console.error(`[${file}] Eroare de sintaxă JSON!`);
      errors += 1;
      continue;
    }

    // Dedus din numele fișierului (ex: 1-samuel-5.json)
    const match = file.match(/(\d+)\.json$/);
    if (!match) {
      console.error(`[${file}] Numele fișierului nu se termină cu un număr de capitol (ex corect: 1-samuel-5.json)`);
      errors += 1;
      continue;
    }

    const chapter = Number(match[1]);
    if (!Number.isInteger(chapter) || chapter < 1 || chapter > config.maxChapter) {
      console.error(`[${file}] Capitol invalid: "${chapter}" (trebuie să fie între 1 și ${config.maxChapter})`);
      errors += 1;
    }

    if (!Array.isArray(raw)) {
      console.error(`[${file}] Conținutul fișierului trebuie să fie un array [...] de întrebări.`);
      errors += 1;
      continue;
    }

    raw.forEach((q, i) => {
      total += 1;
      const loc = `${config.book} cap.${chapter} #${i + 1}`;

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