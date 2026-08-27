const routes = {};

export function registerRoute(path, renderFn) {
  routes[path] = renderFn;
}

function currentPath() {
  const hash = window.location.hash.replace(/^#\//, '');
  return hash || 'concurenti';
}

function updateActiveNav(path) {
  document.querySelectorAll('#main-nav a').forEach((a) => {
    a.classList.toggle('active', a.dataset.route === path);
  });
}

export async function renderRoute() {
  const path = currentPath();
  const view = document.getElementById('view');
  const render = routes[path] || routes['concurenti'];
  updateActiveNav(path in routes ? path : 'concurenti');
  view.innerHTML = '<p class="hint">Se încarcă…</p>';
  try {
    await render(view);
  } catch (err) {
    console.error(err);
    view.innerHTML = `<div class="card"><p>A apărut o eroare la încărcarea paginii.</p><p class="hint">${err.message || err}</p></div>`;
  }
  document.getElementById('main-nav').classList.remove('open');
}

export function startRouter() {
  window.addEventListener('hashchange', renderRoute);
  renderRoute();
}
