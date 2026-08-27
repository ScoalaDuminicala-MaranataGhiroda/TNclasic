import { getChaptersProgress, toggleChapter } from '../api.js';
import { BOOKS, countQuestionsPerBook } from '../utils/questions.js';
import { toast } from '../components/toast.js';

export async function renderChapters(view) {
  const completed = await getChaptersProgress(); // Set<"1SAM-3">
  const qCounts = countQuestionsPerBook();

  function bookBlock(bookKey) {
    const book = BOOKS[bookKey];
    const chips = [];
    for (let ch = 1; ch <= book.chapterCount; ch += 1) {
      const key = `${bookKey}-${ch}`;
      chips.push(`<div class="chapter-chip ${completed.has(key) ? 'done' : ''}" data-book="${bookKey}" data-chapter="${ch}">${ch}</div>`);
    }
    return `
      <h2>${book.label} <span class="hint">(${qCounts[bookKey] || 0} întrebări în bancă)</span></h2>
      <div class="chapters-grid">${chips.join('')}</div>
    `;
  }

  view.innerHTML = `
    <h1>Capitole parcurse</h1>
    <p class="hint">Bifează capitolele deja predate. Doar întrebările din capitolele bifate apar la Quiz / Indisciplină. E o setare globală (pentru toți concurenții).</p>
    <div class="card">${bookBlock('1SAM')}</div>
    <div class="card">${bookBlock('2SAM')}</div>
  `;

  view.querySelectorAll('.chapter-chip').forEach((chip) => {
    chip.addEventListener('click', async () => {
      const book = chip.dataset.book;
      const chapter = Number(chip.dataset.chapter);
      const isDone = chip.classList.contains('done');
      chip.classList.toggle('done');
      try {
        await toggleChapter(book, chapter, !isDone);
      } catch (err) {
        chip.classList.toggle('done'); // revert la eroare
        toast('Eroare la salvare', 'error');
      }
    });
  });
}
