// ============================================================
// js/i18n.js — Fordítások
// ============================================================

import { getLang } from './state.js';

const TRANS = {
  hu: {
    // Státusz
    assigned: 'Lefoglalt', progress: 'Folyamatban', done: 'Kész',
    paid: 'Számlázva', complete: 'Lezárva',
    // Garancia
    warranty: 'Garancia', warrantyJob: 'Garancia munka',
    warrantyCost: 'Garancia veszteség (RON)', warrantyNote: 'Megjegyzés',
    // actual_min
    actualMinTitle: 'Tényleges idő megadása',
    actualMinDesc: 'Lefoglalt volt:',
    actualMinRequired: 'Tényleges perc megadása kötelező!',
    actualMin: 'Tényleges idő (perc)',
    setDone: 'Kész!',
    booked: 'lefoglalva',
    noAdvance: 'Nincs következő lépés',
    // HR
    hrDocs: 'Dokumentumok', rule: 'Szabály', directive: 'Irányelv', hat: 'Kalap',
    // Általános
    save: 'Mentés', cancel: 'Mégse', create: 'Létrehozás',
    delete: 'Törlés', edit: 'Szerkesztés', close: 'Bezárás',
  },
  ro: {
    assigned: 'Atribuit', progress: 'În lucru', done: 'Gata',
    paid: 'Facturat', complete: 'Complet',
    warranty: 'Garanție', warrantyJob: 'Lucrare garanție',
    warrantyCost: 'Pierdere garanție (RON)', warrantyNote: 'Notă',
    actualMinTitle: 'Introduceți timpul real',
    actualMinDesc: 'Programat:',
    actualMinRequired: 'Timpul real este obligatoriu!',
    actualMin: 'Timp real (min)',
    setDone: 'Gata!',
    booked: 'programat',
    noAdvance: 'Nicio etapă următoare',
    hrDocs: 'Documente', rule: 'Regulă', directive: 'Directivă', hat: 'Rol',
    save: 'Salvare', cancel: 'Anulare', create: 'Creare',
    delete: 'Ștergere', edit: 'Editare', close: 'Închide',
  },
  en: {
    assigned: 'Assigned', progress: 'In Progress', done: 'Done',
    paid: 'Invoiced', complete: 'Complete',
    warranty: 'Warranty', warrantyJob: 'Warranty job',
    warrantyCost: 'Warranty loss (RON)', warrantyNote: 'Note',
    actualMinTitle: 'Enter actual time',
    actualMinDesc: 'Booked:',
    actualMinRequired: 'Actual minutes are required!',
    actualMin: 'Actual time (min)',
    setDone: 'Done!',
    booked: 'booked',
    noAdvance: 'No next step',
    hrDocs: 'Documents', rule: 'Rule', directive: 'Directive', hat: 'Hat',
    save: 'Save', cancel: 'Cancel', create: 'Create',
    delete: 'Delete', edit: 'Edit', close: 'Close',
  },
  ne: {
    assigned: 'तोकिएको', progress: 'काम गर्दै', done: 'सकियो',
    paid: 'बिल गरिएको', complete: 'सम्पन्न',
    warranty: 'ग्यारेन्टी', warrantyJob: 'ग्यारेन्टी काम',
    warrantyCost: 'ग्यारेन्टी नोक्सान (RON)', warrantyNote: 'नोट',
    actualMinTitle: 'वास्तविक समय',
    actualMinDesc: 'कार्यक्रम:',
    actualMinRequired: 'वास्तविक मिनेट आवश्यक!',
    actualMin: 'वास्तविक समय (मिनेट)',
    setDone: 'सकियो!',
    booked: 'कार्यक्रम',
    noAdvance: 'अर्को चरण छैन',
    hrDocs: 'कागजात', rule: 'नियम', directive: 'निर्देशिका', hat: 'भूमिका',
    save: 'सुरक्षित', cancel: 'रद्द', create: 'सिर्जना',
    delete: 'मेटाउनुहोस्', edit: 'सम्पादन', close: 'बन्द',
  },
};

export function t(key) {
  const lang = getLang() || 'hu';
  return TRANS[lang]?.[key] || TRANS['hu']?.[key] || key;
}

// Globális (régi kóddal kompatibilis)
window._t = t;
window._lang = 'hu';
export function setLang(lang) {
  const { set } = window._stateModule || {};
  localStorage.setItem('lang', lang);
  window._lang = lang;
  document.querySelectorAll('.lang-btn,.lang-mini').forEach(b => {
    b.classList.toggle('on', b.textContent.trim().toLowerCase() === lang);
  });
}

export const langs = ['hu', 'ro', 'en'];

export function getLangCurrent() {
  return localStorage.getItem('lang') || 'hu';
}