const samuel1Files = import.meta.glob('../../data/questions/1-samuel/*.json', { eager: true });
const samuel2Files = import.meta.glob('../../data/questions/2-samuel/*.json', { eager: true });

export const BOOKS = {
  '1SAM': { label: '1 Samuel', chapterCount: 31 },
  '2SAM': { label: '2 Samuel', chapterCount: 24 },
};

let flatCache = null;

// Listă plată [{ id, text, options, correct, book, chapter }]
export function getAllQuestionsFlat() {
  if (flatCache) return flatCache;
  const out = [];

  function processFiles(filesMap, bookKey) {
    for (const path in filesMap) {
      // Extragem numărul capitolului de la finalul numelui fișierului (ex: 1-samuel-15.json -> 15)
      const match = path.match(/(\d+)\.json$/);
      if (!match) continue;

      const chapter = Number(match[1]);
      // Vite pune conținutul JSON în `.default`
      const questions = filesMap[path].default || filesMap[path];

      for (const q of questions) {
        out.push({ ...q, book: bookKey, chapter });
      }
    }
  }

  processFiles(samuel1Files, '1SAM');
  processFiles(samuel2Files, '2SAM');

  flatCache = out;
  return out;
}

// completedChapters: Set<"1SAM-3">
export function getAvailableQuestions(completedChapters) {
  return getAllQuestionsFlat().filter((q) => completedChapters.has(`${q.book}-${q.chapter}`));
}

export function countQuestionsPerBook() {
  const all = getAllQuestionsFlat();
  const counts = { '1SAM': 0, '2SAM': 0 };
  for (const q of all) counts[q.book] += 1;
  return counts;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Alege `count` întrebări unice, aleatoare, din capitolele parcurse, excluzând
// cele deja folosite. Dacă poolul rămas e insuficient, resetează automat
// (deblochează toate întrebările din capitolele parcurse) și reia selecția.
// Întoarce { questions, wasReset }.
export function pickRandomQuestions({ completedChapters, usedIds, count, onNeedsReset }) {
  const available = getAvailableQuestions(completedChapters);
  let remaining = available.filter((q) => !usedIds.has(q.id));
  let wasReset = false;

  if (remaining.length < count) {
    if (available.length < count) {
      // Nu sunt destule întrebări deblocate în total, nici după reset.
      return { questions: shuffle(remaining), wasReset: false, insufficient: true };
    }
    wasReset = true;
    if (onNeedsReset) onNeedsReset(); // caller-ul golește tabela used_questions în DB
    remaining = available;
  }

  return { questions: shuffle(remaining).slice(0, count), wasReset, insufficient: false };
}
