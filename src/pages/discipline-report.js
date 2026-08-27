import { getDisciplineReport } from '../api.js';

let sortKey = 'total';
let sortDir = 'desc';

export async function renderDisciplineReport(view) {
  const rows = await getDisciplineReport();
  view.innerHTML = `
    <h1>Raport indisciplină</h1>
    <div class="card" id="report-host"></div>
  `;
  drawTable(view.querySelector('#report-host'), rows);
}

function drawTable(host, rows) {
  const sorted = [...rows].sort((a, b) => {
    const va = a[sortKey];
    const vb = b[sortKey];
    if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortDir === 'asc' ? va - vb : vb - va;
  });

  const arrow = (key) => (sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');

  host.innerHTML = `
    ${rows.length === 0 ? '<p class="empty-state">Niciun eveniment de indisciplină înregistrat.</p>' : `
    <table class="responsive">
      <thead>
        <tr>
          <th class="sortable" data-key="lastName">Concurent${arrow('lastName')}</th>
          <th class="sortable" data-key="category">Categorie${arrow('category')}</th>
          <th class="sortable" data-key="total">Total indiscipline${arrow('total')}</th>
          <th class="sortable" data-key="red">Cartonașe roșii${arrow('red')}</th>
          <th class="sortable" data-key="yellow">Cartonașe galbene${arrow('yellow')}</th>
        </tr>
      </thead>
      <tbody>
        ${sorted.map((r) => `
          <tr>
            <td data-label="Concurent">${r.lastName} ${r.firstName}</td>
            <td data-label="Categorie">${r.category}</td>
            <td data-label="Total">${r.total}</td>
            <td data-label="Roșii"><span class="badge red">${r.red}</span></td>
            <td data-label="Galbene"><span class="badge yellow">${r.yellow}</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>`}
  `;

  host.querySelectorAll('th.sortable').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.key;
      if (sortKey === key) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        sortKey = key;
        sortDir = 'desc';
      }
      drawTable(host, rows);
    });
  });
}
