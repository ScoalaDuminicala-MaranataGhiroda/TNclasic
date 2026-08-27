import { getChaptersProgress, getUsedQuestionIds, markQuestionsUsed, resetUsedQuestions } from '../api.js';
import { pickRandomQuestions, BOOKS } from '../utils/questions.js';
import { toast } from '../components/toast.js';

export async function renderQuiz(view) {
  view.innerHTML = `
    <h1>Întrebare</h1>
    <div class="card" id="quiz-host"><p class="hint">Se pregătește o întrebare…</p></div>
  `;
  const host = view.querySelector('#quiz-host');
  await loadNextQuestion(host);
}

async function loadNextQuestion(host) {
  const [completedChapters, usedIds] = await Promise.all([getChaptersProgress(), getUsedQuestionIds()]);

  if (completedChapters.size === 0) {
    host.innerHTML = '<p class="empty-state">Nu ai bifat încă niciun capitol parcurs. Mergi la pagina „Capitole parcurse”.</p>';
    return;
  }

  let didReset = false;
  const { questions, insufficient } = pickRandomQuestions({
    completedChapters,
    usedIds,
    count: 1,
    onNeedsReset: () => { didReset = true; },
  });

  if (insufficient) {
    host.innerHTML = '<p class="empty-state">Nu există nicio întrebare pentru capitolele parcurse. Adaugă întrebări pentru aceste capitole.</p>';
    return;
  }

  if (didReset) {
    await resetUsedQuestions();
    toast('Toate întrebările disponibile au fost parcurse — s-au redeblocat.', 'info');
  }

  const q = questions[0];
  await markQuestionsUsed([q.id], 'quiz');
  renderQuestion(host, q);
}

function renderQuestion(host, q) {
  const bookLabel = BOOKS[q.book].label;
  host.innerHTML = `
    <div class="quiz-meta">${bookLabel}, capitolul ${q.chapter}</div>
    <h2>${q.text}</h2>
    <div id="options">
      ${q.options.map((opt, i) => `<button class="quiz-option" data-index="${i}">${opt}</button>`).join('')}
    </div>
    <div id="quiz-feedback" style="margin-top:10px;"></div>
    <button class="btn secondary" id="next-question" style="margin-top:12px; display:none;">Întrebare nouă</button>
  `;

  host.querySelectorAll('.quiz-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const chosen = Number(btn.dataset.index);
      host.querySelectorAll('.quiz-option').forEach((b) => { b.disabled = true; });
      const feedback = host.querySelector('#quiz-feedback');
      if (chosen === q.correct) {
        btn.classList.add('correct');
        feedback.innerHTML = '<strong style="color:#16a34a;">Răspuns corect! ✅</strong>';
      } else {
        btn.classList.add('incorrect');
        host.querySelectorAll('.quiz-option')[q.correct].classList.add('correct');
        feedback.innerHTML = '<strong style="color:#dc2626;">Răspuns greșit ❌</strong>';
      }
      host.querySelector('#next-question').style.display = 'inline-block';
    });
  });

  host.querySelector('#next-question').addEventListener('click', () => loadNextQuestion(host));
}
