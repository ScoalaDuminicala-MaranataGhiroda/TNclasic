import { listCompetitors, getChaptersProgress, getUsedQuestionIds, markQuestionsUsed, resetUsedQuestions, createDisciplineEvent, finalizeDisciplineEvent } from '../api.js';
import { pickRandomQuestions, BOOKS } from '../utils/questions.js';
import { openModal } from '../components/modal.js';
import { toast } from '../components/toast.js';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

let sortKey = 'last_name';
let sortDir = 'asc';

export async function renderDiscipline(view) {
  const competitors = await listCompetitors();
  view.innerHTML = `
    <h1>Indisciplină</h1>
    <p class="hint">Notează un incident de indisciplină. Concurentul va primi 3 întrebări din capitolele parcurse; în funcție de câte răspunde corect, primește cartonaș galben sau roșu.</p>
    <div class="card" id="table-host"></div>
  `;

  function drawTable(host, rows) {
    const sorted = [...rows].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? va - vb : vb - va;
    });

    const arrow = (key) => (sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '');

    host.innerHTML = rows.length === 0 ? '<p class="empty-state">Adaugă mai întâi concurenți.</p>' : `
      <table class="responsive">
        <thead>
          <tr>
            <th class="sortable" data-key="last_name">Concurent${arrow('last_name')}</th>
            <th class="sortable" data-key="category">Categorie${arrow('category')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map((c) => `
            <tr data-id="${c.id}">
              <td data-label="Concurent">${c.last_name} ${c.first_name}</td>
              <td data-label="Categorie">${c.category}</td>
              <td data-label=""><button class="btn gold small btn-flag">Notează indisciplină</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    host.querySelectorAll('th.sortable').forEach((th) => {
      th.addEventListener('click', () => {
        const key = th.dataset.key;
        if (sortKey === key) {
          sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          sortKey = key;
          sortDir = 'asc';
        }
        drawTable(host, rows);
      });
    });

    host.querySelectorAll('.btn-flag').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const tr = e.target.closest('tr');
        const id = Number(tr.dataset.id);
        const competitor = competitors.find((c) => c.id === id);
        startDisciplineFlow(competitor);
      });
    });
  }

  drawTable(view.querySelector('#table-host'), competitors);
}

async function startDisciplineFlow(competitor) {
  const [completedChapters, usedIds] = await Promise.all([getChaptersProgress(), getUsedQuestionIds()]);

  if (completedChapters.size === 0) {
    toast('Bifează întâi capitole parcurse ca să existe întrebări disponibile.', 'error');
    return;
  }

  let didReset = false;
  const { questions, insufficient } = pickRandomQuestions({
    completedChapters,
    usedIds,
    count: 3,
    onNeedsReset: () => { didReset = true; },
  });

  if (insufficient) {
    toast('Nu există destule întrebări (minim 3) în capitolele parcurse.', 'error');
    return;
  }

  if (didReset) {
    await resetUsedQuestions();
    toast('Toate întrebările disponibile au fost parcurse — s-au redeblocat.', 'info');
  }

  await markQuestionsUsed(questions.map((q) => q.id), 'indisciplina');
  const eventId = await createDisciplineEvent({ competitorId: competitor.id, date: todayISO() });

  runQuizModal(competitor, questions, eventId);
}

function runQuizModal(competitor, questions, eventId) {
  const answers = [];
  let idx = 0;

  const close = openModal(`<div id="disc-body"></div>`, {
    onMount: (modalEl) => {
      renderStep(modalEl.querySelector('#disc-body'));
    },
  });

  function renderStep(body) {
    const q = questions[idx];
    body.innerHTML = `
      <h2>Indisciplină: ${competitor.last_name} ${competitor.first_name}</h2>
      <p class="quiz-meta">Întrebarea ${idx + 1} din ${questions.length} · ${BOOKS[q.book].label}, cap. ${q.chapter}</p>
      <p><strong>${q.text}</strong></p>
      <div id="disc-options">
        ${q.options.map((opt, i) => `<button class="quiz-option" data-index="${i}">${opt}</button>`).join('')}
      </div>
      <div id="disc-feedback" style="margin-top:8px;"></div>
      <button class="btn" id="disc-continue" style="margin-top:12px; display:none;">Continuă</button>
    `;

    body.querySelectorAll('.quiz-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        const chosen = Number(btn.dataset.index);
        const isCorrect = chosen === q.correct;
        body.querySelectorAll('.quiz-option').forEach((b) => { b.disabled = true; });
        if (isCorrect) {
          btn.classList.add('correct');
        } else {
          btn.classList.add('incorrect');
          body.querySelectorAll('.quiz-option')[q.correct].classList.add('correct');
        }
        answers.push({ questionId: q.id, isCorrect });
        body.querySelector('#disc-feedback').innerHTML = isCorrect
          ? '<strong style="color:#16a34a;">Corect ✅</strong>'
          : '<strong style="color:#dc2626;">Greșit ❌</strong>';
        body.querySelector('#disc-continue').style.display = 'inline-block';
      });
    });

    body.querySelector('#disc-continue').addEventListener('click', async () => {
      idx += 1;
      if (idx < questions.length) {
        renderStep(body);
      } else {
        const correctCount = answers.filter((a) => a.isCorrect).length;
        const card = correctCount >= 2 ? 'galben' : 'rosu';
        await finalizeDisciplineEvent(eventId, answers, card);
        body.innerHTML = `
          <h2>Rezultat</h2>
          <p>${competitor.last_name} ${competitor.first_name} a răspuns corect la <strong>${correctCount} din ${questions.length}</strong> întrebări.</p>
          <p>Cartonaș acordat: <span class="badge ${card === 'rosu' ? 'red' : 'yellow'}">${card === 'rosu' ? 'Cartonaș roșu' : 'Cartonaș galben'}</span></p>
          <button class="btn" id="disc-close">Închide</button>
        `;
        body.querySelector('#disc-close').addEventListener('click', () => close());
        toast(`Indisciplină înregistrată — cartonaș ${card}`, card === 'rosu' ? 'error' : 'success');
      }
    });
  }
}
