export function openModal(innerHtml, { onMount } = {}) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<div class="modal">${innerHtml}</div>`;
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) backdrop.remove();
  });
  document.body.appendChild(backdrop);
  const close = () => backdrop.remove();
  if (onMount) onMount(backdrop.querySelector('.modal'), close);
  return close;
}
