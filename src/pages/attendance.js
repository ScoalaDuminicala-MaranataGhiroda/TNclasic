import { listCompetitors, getAttendanceOverview, getOrCreateSession, saveAttendance } from '../api.js';
import { toast } from '../components/toast.js';
import { openModal } from '../components/modal.js';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export async function renderAttendance(view) {
  const [competitors, overview] = await Promise.all([listCompetitors(), getAttendanceOverview()]);
  const { sessions, records } = overview;

// total prezențe și datele exacte per concurent
  const totals = new Map();
  const presentDates = new Map();
  const sessionDatesMap = new Map(sessions.map(s => [s.id, s.session_date]));

  for (const c of competitors) {
    totals.set(c.id, 0);
    presentDates.set(c.id, []);
  }

  for (const r of records) {
    if (Number(r.present) === 1) {
      totals.set(r.competitor_id, (totals.get(r.competitor_id) || 0) + 1);
      presentDates.get(r.competitor_id).push(sessionDatesMap.get(r.session_id));
    }
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
        <thead><tr><th>Concurent</th><th>Nr. prezențe</th><th>Datele prezențelor</th></tr></thead>
        <tbody>
          ${competitors.map((c) => `
            <tr>
              <td data-label="Concurent">${c.last_name} ${c.first_name}</td>
              <td data-label="Nr. prezențe">${totals.get(c.id) || 0} / ${sessions.length}</td>
              <td data-label="Datele prezențelor">
                ${presentDates.get(c.id).length > 0
      ? `<button class="btn secondary small btn-view-dates" data-id="${c.id}">Vezi datele</button>`
      : '-'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`}
    </div>
  `;

  // Atașăm evenimentele pentru butoanele "Vezi datele"
  view.querySelectorAll('.btn-view-dates').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const compId = Number(e.target.dataset.id);
      const c = competitors.find(x => x.id === compId);
      const dates = presentDates.get(compId).sort();

      const close = openModal(`
        <h2>Prezențe: ${c.last_name} ${c.first_name}</h2>
        <ul style="margin: 16px 0; padding-left: 20px; line-height: 1.6;">
          ${dates.map(d => `<li>${d}</li>`).join('')}
        </ul>
        <button class="btn" id="close-dates-modal">Închide</button>
      `, {
        onMount: (modalEl) => {
          modalEl.querySelector('#close-dates-modal').addEventListener('click', () => close());
        }
      });
    });
  });

  const formHost = view.querySelector('#attendance-form');
  renderForm();
}
