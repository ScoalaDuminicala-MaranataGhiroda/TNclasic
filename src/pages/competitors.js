import { listCompetitors, addCompetitor, deleteCompetitor, CATEGORIES } from '../api.js';
import { toast } from '../components/toast.js';

export async function renderCompetitors(view) {
  const competitors = await listCompetitors();

  view.innerHTML = `
    <h1>Concurenți</h1>
    <div class="card">
      <h2>Adaugă concurent</h2>
      <form id="add-form" class="row">
        <div class="field">
          <label>Prenume</label>
          <input name="firstName" required />
        </div>
        <div class="field">
          <label>Nume</label>
          <input name="lastName" required />
        </div>
        <div class="field">
          <label>Categorie</label>
          <select name="category" required>
            ${CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
        <div class="field" style="flex: 0;">
          <button class="btn" type="submit">Adaugă</button>
        </div>
      </form>
    </div>

    <div class="card">
      <h2>Lista concurenților (${competitors.length})</h2>
      ${competitors.length === 0 ? '<p class="empty-state">Nu există concurenți încă.</p>' : `
      <table class="responsive">
        <thead><tr><th>Nume</th><th>Prenume</th><th>Categorie</th><th></th></tr></thead>
        <tbody>
          ${competitors.map((c) => `
            <tr data-id="${c.id}">
              <td data-label="Nume">${c.last_name}</td>
              <td data-label="Prenume">${c.first_name}</td>
              <td data-label="Categorie">${c.category}</td>
              <td data-label=""><button class="btn danger small btn-delete">Șterge</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>`}
    </div>
  `;

  view.querySelector('#add-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await addCompetitor({
      firstName: fd.get('firstName').trim(),
      lastName: fd.get('lastName').trim(),
      category: fd.get('category'),
    });
    toast('Concurent adăugat', 'success');
    renderCompetitors(view);
  });

  view.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const tr = e.target.closest('tr');
      const id = Number(tr.dataset.id);
      if (!confirm('Ștergi acest concurent și tot istoricul lui (prezențe, note, indisciplină)?')) return;
      await deleteCompetitor(id);
      toast('Concurent șters', 'success');
      renderCompetitors(view);
    });
  });
}
