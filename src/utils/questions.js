// ---------------------------------------------------------------------------
// Banca de întrebări e statică și e "împachetată" în build (import JSON),
// deci nu costă nimic din limita de citiri Turso. Structura fișierelor:
//   data/questions/1-samuel.json  -> { book: "1SAM", chapters: { "1": [...], "2": [...] } }
//   data/questions/2-samuel.json  -> { book: "2SAM", chapters: { "1": [...], ... } }
// Fiecare întrebare: { id, text, options: string[], correct: number }
// id-ul TREBUIE să fie unic global (convenție: "1SAM-3-012" = cartea-capitol-secvență)
// ---------------------------------------------------------------------------
import book1Samuel from '../../data/questions/1-samuel.json';
import book2Samuel from '../../data/questions/2-samuel.json';

export const BOOKS = {
  '1SAM': { label: '1 Samuel', chapterCount: 31, data: book1Samuel },
  '2SAM': { label: '2 Samuel', chapterCount: 24, data: book2Samuel },
};

let flatCache = null;

// Listă plată [{ id, text, options, correct, book, chapter }]
export function getAllQuestionsFlat() {
  if (flatCache) return flatCache;
  const out = [];
  for (const bookKey of Object.keys(BOOKS)) {
    const chapters = BOOKS[bookKey].data.chapters || {};
    for (const chapterStr of Object.keys(chapters)) {
      for (const q of chapters[chapterStr]) {
        out.push({ ...q, book: bookKey, chapter: Number(chapterStr) });
      }
    }
  }
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
