// Rulează cu: node scripts/generate-json/generate-jsons.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configurația pentru cele 2 cărți
const CONFIG = [
    { bookId: '1SAM', prefix: '1-samuel', file: '1-samuel.xlsx', outDir: '../../data/questions/1-samuel' },
    { bookId: '2SAM', prefix: '2-samuel', file: '2-samuel.xlsx', outDir: '../../data/questions/2-samuel' }
];

// Transformă 'A' în 0, 'B' în 1, etc.
function letterToIndex(letter) {
    if (!letter) return -1;
    const map = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
    return map[String(letter).toUpperCase().trim()];
}

for (const config of CONFIG) {
    const filePath = path.join(__dirname, config.file);
    const outDir = path.join(__dirname, config.outDir);

    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  Fișierul ${config.file} nu a fost găsit în folderul scripts/.`);
        continue;
    }

    // Creăm folderul dacă nu există
    fs.mkdirSync(outDir, { recursive: true });

    const workbook = XLSX.readFile(filePath);

    for (const sheetName of workbook.SheetNames) {
        // Extragem numărul capitolului din numele sheet-ului
        const chapterMatch = sheetName.match(/\d+/);
        if (!chapterMatch) continue;
        const chapter = Number(chapterMatch[0]);

        // Citim rândurile (ignorând primul rând de cap de tabel)
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        const questions = [];

        rows.forEach((row, index) => {
            const qText = row['Intrebare'] || row['Întrebare'];
            if (!qText) return; // Sărim peste rândurile goale

            const options = [];
            if (row['A']) options.push(String(row['A']).trim());
            if (row['B']) options.push(String(row['B']).trim());
            if (row['C']) options.push(String(row['C']).trim());
            if (row['D']) options.push(String(row['D']).trim());

            const correctIndex = letterToIndex(row['Corect']);

            // Generăm automat ID-ul (ex: 1SAM-14-003)
            const seq = String(index + 1).padStart(3, '0');
            const qId = `${config.bookId}-${chapter}-${seq}`;

            questions.push({
                id: qId,
                text: String(qText).trim(),
                options: options,
                correct: correctIndex
            });
        });

        if (questions.length > 0) {
            const outFilePath = path.join(outDir, `${config.prefix}-${chapter}.json`);
            fs.writeFileSync(outFilePath, JSON.stringify(questions, null, 2), 'utf-8');
            console.log(`✅ Generat: ${config.prefix}-${chapter}.json (${questions.length} întrebări)`);
        }
    }
}

console.log("\n🚀 Generare completă! Rulează acum 'npm run validate-questions' pentru o verificare finală.");