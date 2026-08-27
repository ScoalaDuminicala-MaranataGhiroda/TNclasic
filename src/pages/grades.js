import { listCompetitors, listGrades, addGrade, deleteGrade } from '../api.js';
import { toast } from '../components/toast.js';
import Chart from 'chart.js/auto';

let chartInstance = null;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export async function renderGrades(view) {
  const [competitors, grades] = await Promise.all([listCompetitors(), listGrades()]);

  let selectedId = competitors[0]?.id ?? null;

  view.innerHTML = `
    <h1>Note</h1>
    <div class="card">
      <h2>Adaugă notă</h2>
      ${competitors.length === 0 ? '<p class="empty-state">Adaugă mai întâi concurenți.</p>' : `
      <form id="grade-form" class="row">
        <div class="field">
          <label>Concurent</label>
          <select name="competitorId" required>
            ${competitors.map((c) => `<option value="${c.id}">${c.last_name} ${c.first_name}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Data</label>
          <input type="date" name="date" value="${todayISO()}" required />
        </div>
        <div class="field">
          <label>Notă (0-100)</label>
          <input type="number" name="score" min="0" max="100" step="1" required />
        </div>
        <div class="field" style="flex:0;">
          <button class="btn" type="submit">Adaugă</button>
        </div>
      </form>`}
    </div>

    <div class="card">
      <h2>Detaliu pe concurent</h2>
      ${competitors.length === 0 ? '<p class="empty-state">—</p>' : `
      <div class="field" style="max-width:320px;">
        <label>Alege concurent</label>
        <select id="detail-select">
          ${competitors.map((c) => `<option value="${c.id}">${c.last_name} ${c.first_name}</option>`).join('')}
        </select>
      </div>
      <div id="detail-host"></div>`}
    </div>
  `;

  if (competitors.length === 0) return;

  view.querySelector('#grade-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const score = Number(fd.get('score'));
    if (!Number.isInteger(score) || score < 0 || score > 100) {
      toast('Nota trebuie să fie un număr întreg între 0 și 100', 'error');
      return;
    }
    await addGrade({ competitorId: Number(fd.get('competitorId')), date: fd.get('date'), score });
    toast('Notă adăugată', 'success');
    renderGrades(view);
  });

  const detailSelect = view.querySelector('#detail-select');
  const detailHost = view.querySelector('#detail-host');

  function renderDetail(competitorId) {
    const rows = grades
      .filter((g) => g.competitor_id === Number(competitorId))
      .sort((a, b) => a.grade_date.localeCompare(b.grade_date));

    const avg = rows.length ? (rows.reduce((s, r) => s + r.score, 0) / rows.length).toFixed(1) : '—';

    detailHost.innerHTML = `
      <p><strong>Medie:</strong> ${avg} &nbsp; <strong>Nr. note:</strong> ${rows.length}</p>
      <div class="competitor-detail-chart"><canvas id="grade-chart" height="120"></canvas></div>
      ${rows.length === 0 ? '<p class="empty-state">Nicio notă încă.</p>' : `
      <table class="responsive" style="margin-top:14px;">
        <thead><tr><th>Data</th><th>Notă</th><th></th></tr></thead>
        <tbody>
          ${rows.map((r) => `
            <tr data-id="${r.id}">
              <td data-label="Data">${r.grade_date}</td>
              <td data-label="Notă">${r.score}</td>
              <td data-label=""><button class="btn danger small btn-del-grade">Șterge</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>`}
    `;

    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    if (rows.length) {
      const ctx = detailHost.querySelector('#grade-chart').getContext('2d');
      chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: rows.map((r) => r.grade_date),
          datasets: [{
            label: 'Evoluție note',
            data: rows.map((r) => r.score),
            borderColor: '#2b4c7e',
            backgroundColor: 'rgba(43,76,126,0.15)',
            tension: 0.25,
            fill: true,
          }],
        },
        options: {
          responsive: true,
          scales: { y: { min: 0, max: 100 } },
          plugins: { legend: { display: false } },
        },
      });
    }

    detailHost.querySelectorAll('.btn-del-grade').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = Number(e.target.closest('tr').dataset.id);
        if (!confirm('Ștergi această notă?')) return;
        await deleteGrade(id);
        toast('Notă ștearsă', 'success');
        renderGrades(view);
      });
    });
  }

  detailSelect.addEventListener('change', (e) => renderDetail(e.target.value));
  renderDetail(selectedId);
}
