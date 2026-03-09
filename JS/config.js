// ============================================================
// js/config.js — Központi konfiguráció
// ============================================================

export const SB_URL = 'https://zwsjfzqtskicrukidaog.supabase.co';
export const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3c2pmenF0c2tpY3J1a2lkYW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwODc3NjUsImV4cCI6MjA4ODY2Mzc2NX0.Qe-5G_TDkXinqc49FzaB-YezWNajefteQI0vnZSPah0';

// Státusz flow konfiguráció
export const STATUS_FLOW = {
  assigned: { next: 'progress', label: { hu:'Lefoglalt', ro:'Atribuit',  en:'Assigned'  }, color: '#E53935', icon: '📋' },
  progress: { next: 'done',     label: { hu:'Folyamatban', ro:'În lucru', en:'In Progress'}, color: '#FFB020', icon: '🔧' },
  done:     { next: 'paid',     label: { hu:'Kész',     ro:'Gata',      en:'Done'      }, color: '#4CAF50', icon: '✅', requiresActualMin: true },
  paid:     { next: 'complete', label: { hu:'Számlázva', ro:'Facturat',  en:'Invoiced'  }, color: '#2196F3', icon: '💳' },
  complete: { next: null,       label: { hu:'Lezárva',  ro:'Complet',   en:'Complete'  }, color: '#9C27B0', icon: '🏁' },
};

// Garancia flow (nincs paid lépés)
export const WARRANTY_STATUS_FLOW = {
  assigned: { next: 'progress' },
  progress: { next: 'done'     },
  done:     { next: 'complete', requiresActualMin: true },
  complete: { next: null       },
};

// Részlegek
export const DEPARTMENTS = [
  { key: 'Admin',     icon: '📋', color: '#FFB020' },
  { key: 'Technic',   icon: '🔧', color: '#2196F3' },
  { key: 'Body',      icon: '🎨', color: '#FF6B9D' },
  { key: 'Transport', icon: '🚛', color: '#00D4AA' },
  { key: 'Auxiliar',  icon: '🧹', color: '#AB47BC' },
];

// Státusz CSS osztályok (kompatibilis a régi rendszerrel)
export const STATUS_CSS = {
  assigned: 'bga',
  progress: 'bgp',
  done:     'bgd',
  paid:     'bgk',
  complete: 'bgc',
};

// Hatékonyság — done + complete számít
export const EFFICIENCY_STATUSES = ['done', 'complete'];

// HR Dokumentum típusok
export const DOC_TYPES = {
  rule:      { hu: 'Szabály',    ro: 'Regulă',     en: 'Rule',      icon: '📜', shared: true  },
  directive: { hu: 'Irányelv',   ro: 'Directivă',  en: 'Directive', icon: '📌', shared: 'both' },
  hat:       { hu: 'Kalap',      ro: 'Rol',        en: 'Hat',       icon: '🎩', shared: false },
};

// KPI célok
export const KPI_TARGETS = {
  monthlyHours: 168,
  minHours: 140,
  baseRevPerHour: 180,
  baseMonthlyRev: 25200,   // 140 × 180
  targetMonthlyRev: 30240, // 168 × 180
};
