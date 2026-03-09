// ============================================================
// js/components/modal.js — Modal kezelés
// ============================================================

export function openModal(html) {
  const box = document.getElementById('mbox');
  const mod = document.getElementById('modal');
  if (!box || !mod) return;
  box.innerHTML = html;
  mod.classList.add('open');
}

export function closeModal() {
  const mod = document.getElementById('modal');
  if (mod) mod.classList.remove('open');
}

// Globálisan elérhető (régi kóddal kompatibilis)
window.openModal  = openModal;
window.closeModal = closeModal;

// Kattintás háttérre → bezárás
document.getElementById('modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'modal') closeModal();
});
