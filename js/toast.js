// ============================================================
// js/components/toast.js — Toast értesítések
// ============================================================

let _toastTimer = null;

export function toast(msg, isError = false) {
  const el = document.getElementById('toastEl');
  if (!el) return;

  el.textContent = msg;
  el.style.display = 'block';
  el.style.background = isError
    ? 'linear-gradient(135deg,#E53935,#FF6B6B)'
    : 'linear-gradient(135deg,#2E7D32,#4CAF50)';
  el.style.color = '#fff';

  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.style.display = 'none'; }, isError ? 3500 : 2000);
}

// Globálisan elérhető (régi kóddal kompatibilis)
window.toast = toast;
