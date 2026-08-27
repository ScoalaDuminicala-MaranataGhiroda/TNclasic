import { listCompetitors, getAttendanceOverview, getOrCreateSession, saveAttendance } from '../api.js';
import { toast } from '../components/toast.js';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export async function renderAttendance(view) {
  const [competitors, overview] = await Promise.all([listCompetitors(), getAttendanceOverview()]);
  const { sessions, records } = overview;

  // total prezențe per concurent
  const totals = new Map();
  for (const c of competitors) totals.set(c.id, 0);
  for (const r of records) {
    if (Number(r.present) === 1) totals.set(r.competitor_id, (totals.get(r.competitor_id) || 0) + 1);
  }

  let selectedDate = todayISO();

  function presenceForDate(date) {
    const session = sessions.find((s) => s.session_date === date);
    const map = new Map();
    if (session) {
      for (const r of records.filter((r) => r.session_id === session.id)) {
        map.set(r.competitor_id, Number(r.present) === 1);
      }
    }
    return map;
  }

  function renderForm() {
    const presence = presenceForDate(selectedDate);
    formHost.innerHTML = `
      <div class="row">
        <div class="field">
          <label>Data întâlnirii</label>
          <input type="date" id="session-date" value="${selectedDate}" />
        </div>
      </div>
      ${competitors.length === 0 ? '<p class="empty-state">Adaugă mai întâi concurenți.</p>' : `
      <table class="responsive">
        <thead><tr><th>Concurent</th><th>Categorie</th><th>Prezent</th></tr></thead>
        <tbody>
          ${competitors.map((c) => `
            <tr>
              <td data-label="Concurent">${c.last_name} ${c.first_name}</td>
              <td data-label="Categorie">${c.category}</td>
              <td data-label="Prezent">
                <input type="checkbox" data-id="${c.id}" class="present-check" ${presence.get(c.id) ? 'checked' : ''} />
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <button class="btn" id="save-attendance" style="margin-top:10px;">Salvează prezența</button>
      `}
    `;

    formHost.querySelector('#session-date').addEventListener('change', (e) => {
      selectedDate = e.target.value;
      renderForm();
    });

    const saveBtn = formHost.querySelector('#save-attendance');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const sessionId = await getOrCreateSession(selectedDate);
        const map = {};
        formHost.querySelectorAll('.present-check').forEach((chk) => {
          map[chk.dataset.id] = chk.checked;
        });
        await saveAttendance(sessionId, map);
        toast('Prezență salvată', 'success');
        renderAttendance(view);
      });
    }
  }

  view.innerHTML = `
    <h1>Prezență</h1>
    <div class="card"><div id="attendance-form"></div></div>
    <div class="card">
      <h2>Total prezențe pe concurent</h2>
      ${competitors.length === 0 ? '<p class="empty-state">—</p>' : `
      <table class="responsive">
        <thead><tr><th>Concurent</th><th>Nr. prezențe</th><th>Din ${sessions.length} întâlniri</th></tr></thead>
        <tbody>
          ${competitors.map((c) => `
            <tr>
              <td data-label="Concurent">${c.last_name} ${c.first_name}</td>
              <td data-label="Nr. prezențe">${totals.get(c.id) || 0}</td>
              <td data-label="Din">${sessions.length}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`}
    </div>
  `;

  const formHost = view.querySelector('#attendance-form');
  renderForm();
}
