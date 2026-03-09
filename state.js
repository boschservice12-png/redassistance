// ============================================================
// js/state.js — Központi State Management
// Minden adat EGY helyen van. Sehol máshol nem tárolunk adatot.
// ============================================================

const _state = {
  // Auth
  curAdmin: null,
  curShop:  null,
  isWorker: false,       // app.html = worker mód

  // Nézet
  lang:    'hu',
  curView: 'daily',      // daily | weekly | monthly | yearly
  curDate: todayStr(),

  // Adatok
  jobs:     [],
  emps:     [],
  tools:    [],
  toolCats: [],
  hrDocs:   [],
  coverage: [],          // coverage_targets

  // UI
  loading: false,
  lastError: null,
};

// ── Getters ──────────────────────────────────────────────────

export const getState  = ()    => ({ ..._state });
export const get       = (key) => _state[key];

// ── Setters ──────────────────────────────────────────────────

export function set(key, value) {
  _state[key] = value;
  _notify(key, value);
}

export function setMany(patch) {
  Object.assign(_state, patch);
  Object.keys(patch).forEach(k => _notify(k, _state[k]));
}

// ── Subscribers (reaktív frissítés) ──────────────────────────

const _subs = {};

export function subscribe(key, fn) {
  if (!_subs[key]) _subs[key] = [];
  _subs[key].push(fn);
  return () => { _subs[key] = _subs[key].filter(f => f !== fn); };
}

function _notify(key, value) {
  (_subs[key] || []).forEach(fn => fn(value));
  (_subs['*']  || []).forEach(fn => fn(key, value));
}

// ── Job helpers ───────────────────────────────────────────────

export function getJobById(id) {
  return _state.jobs.find(j => j.id === id) || null;
}

export function getEmpById(id) {
  return _state.emps.find(e => e.id === id) || null;
}

export function getJobsByStatus(status) {
  return _state.jobs.filter(j => j.status === status);
}

export function getWarrantyJobs() {
  return _state.jobs.filter(j => j.is_warranty === true);
}

export function getNormalJobs() {
  return _state.jobs.filter(j => !j.is_warranty);
}

export function updateJobLocally(id, patch) {
  const idx = _state.jobs.findIndex(j => j.id === id);
  if (idx !== -1) {
    _state.jobs[idx] = { ..._state.jobs[idx], ...patch };
    _notify('jobs', _state.jobs);
  }
}

// ── Lang helper ───────────────────────────────────────────────

export function getLang() { return _state.lang; }

// ── Utils ─────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
