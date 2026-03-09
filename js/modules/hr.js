cd /workspaces// ============================================================
// js/modules/hr.js — Feature 4: HR/Dokumentum modul
// Szabály | Irányelv | Kalap + Word import/export
// ============================================================

import { DOC_TYPES } from '../config.js';
import { get } from '../state.js';
import { saveHrDoc, archiveHrDoc, markDocRead, fetchWarrantyFeedback, saveWarrantyFeedback } from '../api.js';
import { toast } from '../components/toast.js';
import { t } from '../i18n.js';

// ── HR főoldal HTML ───────────────────────────────────────────

export function renderHrPage(docs, emps, warrantyJobs) {
  const shopId = get('curShop')?.id;
  const rules      = docs.filter(d => d.doc_type === 'rule');
  const directives = docs.filter(d => d.doc_type === 'directive');
  const hats       = docs.filter(d => d.doc_type === 'hat');

  return `
  <div style="max-width:1000px">
    <!-- Fejléc + műveletek -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px">
      <h2 style="font-size:16px;font-weight:800">📁 HR / Dokumentumok</h2>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="br" onclick="openHrDocModal('rule')">📜 + Szabály</button>
        <button class="br" onclick="openHrDocModal('directive')">📌 + Irányelv</button>
        <button class="br" onclick="openHrDocModal('hat')">🎩 + Kalap</button>
        <button class="bo" onclick="importWordDoc()">📥 Word import</button>
      </div>
    </div>

    <!-- Garancia → HR feedback összesítő -->
    ${warrantyJobs.length > 0 ? renderWarrantyHrSection(warrantyJobs, emps) : ''}

    <!-- Szabályok (közös) -->
    ${renderDocSection('rule', '📜 Szabályok', 'Közös — mindenki látja', rules, emps)}

    <!-- Irányelvek (közös + személyes) -->
    ${renderDocSection('directive', '📌 Irányelvek', 'Közös vagy személyes', directives, emps)}

    <!-- Kalapok (személyes munkakör leírások) -->
    ${renderDocSection('hat', '🎩 Kalapok', 'Személyes munkakör leírás', hats, emps)}
  </div>`;
}

// ── Dokumentum szekció ────────────────────────────────────────

function renderDocSection(type, title, subtitle, docs, emps) {
  const cfg = DOC_TYPES[type];
  const color = type === 'rule' ? '#2196F3' : type === 'directive' ? '#FF9800' : '#9C27B0';

  const cards = docs.filter(d => d.is_active).map(d => renderDocCard(d, emps)).join('');

  return `
  <div class="gc" style="margin-bottom:14px;border-left:3px solid ${color}">
    <div class="gc-top">
      <div>
        <h3 style="font-size:13px;font-weight:700">${title}</h3>
        <div style="font-size:10px;color:#888">${subtitle}</div>
      </div>
      <div style="font-size:11px;color:#888">${docs.length} dokumentum</div>
    </div>
    <div style="padding:10px 14px">
      ${cards || `<div style="color:#aaa;font-size:12px;text-align:center;padding:20px">Nincs dokumentum — kattints + gombra</div>`}
    </div>
  </div>`;
}

function renderDocCard(doc, emps) {
  const cfg   = DOC_TYPES[doc.doc_type];
  const emp   = doc.employees || (emps.find(e => e.id === doc.employee_id));
  const scope = doc.employee_id
    ? `<span style="color:#9C27B0;font-size:9px">🎯 ${emp?.name || 'Egyéni'}</span>`
    : doc.department
    ? `<span style="color:#2196F3;font-size:9px">🏢 ${doc.department}</span>`
    : `<span style="color:#4CAF50;font-size:9px">🌐 Közös</span>`;

  const preview = doc.content.length > 120 ? doc.content.slice(0, 120) + '…' : doc.content;

  return `
  <div style="background:#f9f9fb;border:1px solid #e8e8ec;border-radius:8px;padding:12px;margin-bottom:8px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
      <div>
        <div style="font-size:13px;font-weight:700">${cfg.icon} ${doc.title}</div>
        <div style="display:flex;gap:6px;margin-top:2px">${scope}
          <span style="font-size:9px;color:#aaa">v${doc.version} · ${new Date(doc.created_at).toLocaleDateString('hu')}</span>
        </div>
      </div>
      <div style="display:flex;gap:4px">
        <button class="abr" onclick="openHrDocModal('${doc.doc_type}', '${doc.id}')">✏️</button>
        <button class="abr" onclick="exportDocToWord('${doc.id}')">📤</button>
        <button class="abd" onclick="deleteHrDoc('${doc.id}')">🗑️</button>
      </div>
    </div>
    <div style="font-size:11px;color:#555;line-height:1.5">${preview}</div>
  </div>`;
}

// ── Dokumentum szerkesztő modal ───────────────────────────────

export function openHrDocModal(type, docId = null) {
  const docs    = get('hrDocs') || [];
  const emps    = get('emps') || [];
  const shopId  = get('curShop')?.id;
  const doc     = docId ? docs.find(d => d.id === docId) : null;
  const cfg     = DOC_TYPES[type];
  const isHat   = type === 'hat';
  const isRule  = type === 'rule';

  const empOptions = emps.map(e =>
    `<option value="${e.id}" ${doc?.employee_id === e.id ? 'selected' : ''}>${e.name} (${e.department})</option>`
  ).join('');

  window.openModal(`
    <h3>${cfg.icon} ${doc ? 'Szerkesztés' : 'Új'}: ${cfg.hu} <button onclick="closeModal()">✕</button></h3>

    <div class="fl">
      <label>Cím *</label>
      <input id="hdTitle" value="${doc?.title || ''}" placeholder="Dokumentum neve">
    </div>

    ${!isRule && !isHat ? `
    <div class="fl">
      <label>Hatókör</label>
      <select id="hdScope">
        <option value="common" ${!doc?.employee_id ? 'selected' : ''}>🌐 Közös (mindenki)</option>
        <option value="dept"   ${doc?.department && !doc?.employee_id ? 'selected' : ''}>🏢 Részleg</option>
        <option value="emp"    ${doc?.employee_id ? 'selected' : ''}>🎯 Egyéni</option>
      </select>
    </div>
    <div id="hdDeptRow" style="display:none" class="fl">
      <label>Részleg</label>
      <select id="hdDept">
        ${['Admin','Technic','Body','Transport','Auxiliar'].map(d =>
          `<option value="${d}" ${doc?.department === d ? 'selected' : ''}>${d}</option>`
        ).join('')}
      </select>
    </div>
    <div id="hdEmpRow" style="display:none" class="fl">
      <label>Munkavállaló</label>
      <select id="hdEmp"><option value="">Válassz…</option>${empOptions}</select>
    </div>
    ` : ''}

    ${isHat ? `
    <div class="fl">
      <label>Munkavállaló * (Kalap = személyes)</label>
      <select id="hdEmpHat"><option value="">Válassz…</option>${empOptions}</select>
    </div>
    <div class="fl">
      <label>Részleg</label>
      <select id="hdDeptHat">
        ${['Admin','Technic','Body','Transport','Auxiliar'].map(d =>
          `<option value="${d}" ${doc?.department === d ? 'selected' : ''}>${d}</option>`
        ).join('')}
      </select>
    </div>
    ` : ''}

    <div class="fl">
      <label>Tartalom *
        <span style="font-size:9px;color:#888;float:right">
          📥 <button onclick="document.getElementById('hdImportBtn').click()" style="border:none;background:none;color:#2196F3;cursor:pointer;font-size:9px">Word beillesztés</button>
          <input id="hdImportBtn" type="file" accept=".docx" style="display:none" onchange="importWordToEditor(this)">
        </span>
      </label>
      <textarea id="hdContent" rows="8"
        style="width:100%;padding:9px;border:1px solid #ddd;border-radius:7px;font-size:12px;line-height:1.6;resize:vertical"
        placeholder="Ide írd vagy illeszd be a dokumentum tartalmát...">${doc?.content || ''}</textarea>
    </div>

    <div class="mbts">
      <button class="mc" onclick="closeModal()">Mégse</button>
      ${doc ? `<button class="ms" onclick="window._saveHrDoc('${type}','${docId}')">💾 Mentés</button>` : ''}
      ${!doc ? `<button class="ms" onclick="window._saveHrDoc('${type}',null)">➕ Létrehozás</button>` : ''}
    </div>
  `);

  // Hatókör váltó (directive esetén)
  if (!isRule && !isHat) {
    const scopeEl = document.getElementById('hdScope');
    if (scopeEl) {
      const _toggleScope = () => {
        const v = scopeEl.value;
        document.getElementById('hdDeptRow').style.display = v === 'dept' ? '' : 'none';
        document.getElementById('hdEmpRow').style.display  = v === 'emp'  ? '' : 'none';
      };
      scopeEl.addEventListener('change', _toggleScope);
      _toggleScope();
    }
  }

  // Mentés callback
  window._saveHrDoc = async (docType, existingId) => {
    const title   = document.getElementById('hdTitle')?.value?.trim();
    const content = document.getElementById('hdContent')?.value?.trim();
    if (!title || !content) { toast('⚠️ Cím és tartalom kötelező', true); return; }

    let empId = null, dept = null;

    if (docType === 'hat') {
      empId = document.getElementById('hdEmpHat')?.value || null;
      dept  = document.getElementById('hdDeptHat')?.value || null;
      if (!empId) { toast('⚠️ Válassz munkavállalót', true); return; }
    } else if (docType === 'directive') {
      const scope = document.getElementById('hdScope')?.value;
      if (scope === 'emp')  empId = document.getElementById('hdEmp')?.value || null;
      if (scope === 'dept') dept  = document.getElementById('hdDept')?.value || null;
    }

    const payload = {
      shop_id: shopId, doc_type: docType, title, content,
      employee_id: empId || null, department: dept || null,
      is_active: true,
      version: (docs.find(d => d.id === existingId)?.version || 0) + 1,
      created_by: get('curAdmin')?.name || '',
    };

    try {
      await saveHrDoc(payload, existingId);
      toast('✅ Mentve');
      window.closeModal();
      window.dispatchEvent(new CustomEvent('hrDocsChanged'));
    } catch (err) {
      toast('❌ ' + err.message, true);
    }
  };
}

// ── Törlés ────────────────────────────────────────────────────

export async function deleteHrDoc(id) {
  if (!confirm('Biztosan archiválod ezt a dokumentumot?')) return;
  try {
    await archiveHrDoc(id);
    toast('🗑️ Archiválva');
    window.dispatchEvent(new CustomEvent('hrDocsChanged'));
  } catch (err) {
    toast('❌ ' + err.message, true);
  }
}

// ── Word Import (mammoth.js) ──────────────────────────────────

export async function importWordToEditor(input) {
  const file = input?.files?.[0];
  if (!file) return;

  // mammoth.js — CDN-ről töltve
  if (!window.mammoth) {
    toast('⚠️ mammoth.js nem töltődött be', true);
    return;
  }

  try {
    toast('📥 Feldolgozás…');
    const arrayBuffer = await file.arrayBuffer();
    const result = await window.mammoth.extractRawText({ arrayBuffer });
    const textarea = document.getElementById('hdContent');
    if (textarea) {
      textarea.value = result.value;
      toast('✅ Word importálva');
    }
  } catch (err) {
    toast('❌ Import hiba: ' + err.message, true);
  }
}

// ── Word Export (docx.js) ─────────────────────────────────────

export async function exportDocToWord(docId) {
  const docs = get('hrDocs') || [];
  const doc  = docs.find(d => d.id === docId);
  if (!doc) return;

  // Egyszerű .txt export (docx.js nélkül is működik)
  const content = `${doc.title}\n${'='.repeat(doc.title.length)}\n\n${doc.content}`;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${doc.title.replace(/\s+/g, '_')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  toast('📤 Exportálva');
}

// ── Garancia → HR feedback szekció ───────────────────────────

function renderWarrantyHrSection(warrantyJobs, emps) {
  const doneWarranty = warrantyJobs.filter(j => ['done','complete'].includes(j.status));
  if (doneWarranty.length === 0) return '';

  const totalLoss = warrantyJobs.reduce((s, j) => s + (j.warranty_cost || 0), 0);

  return `
  <div class="gc" style="margin-bottom:14px;border-left:3px solid #FF6B9D">
    <div class="gc-top" style="background:rgba(255,107,157,.04)">
      <h3 style="color:#FF6B9D">🛡️ Garancia → HR elemzés</h3>
      <div style="font-size:11px;color:#888">
        ${warrantyJobs.length} garancia munka · ${totalLoss > 0 ? `💸 ${totalLoss.toLocaleString()} RON veszteség` : ''}
      </div>
    </div>
    <div style="padding:10px 14px">
      ${doneWarranty.map(j => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f0f0f0">
          <div>
            <div style="font-size:12px;font-weight:600">${j.title || j.car_plate || 'Garancia'}</div>
            <div style="font-size:10px;color:#888">${j.employees?.name || ''} · ${j.date}</div>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            ${j.warranty_cost > 0 ? `<span style="font-size:10px;color:#FF6B9D">−${j.warranty_cost} RON</span>` : ''}
            <button class="abr" onclick="openWarrantyFeedbackModal('${j.id}')">📋 Feedback</button>
          </div>
        </div>
      `).join('')}
    </div>
  </div>`;
}

// ── Garancia Feedback Modal ───────────────────────────────────

export function openWarrantyFeedbackModal(jobId) {
  const shopId = get('curShop')?.id;
  const jobs   = get('jobs') || [];
  const job    = jobs.find(j => j.id === jobId);
  if (!job) return;

  window.openModal(`
    <h3>🛡️ Garancia HR Feedback <button onclick="closeModal()">✕</button></h3>
    <p style="font-size:11px;color:#888;margin-bottom:10px">
      Munka: <b>${job.title || job.car_plate || jobId}</b> · ${job.employees?.name || ''}
    </p>

    <div class="fl">
      <label>Mi okozta a garanciát?</label>
      <select id="wfCause">
        <option value="">Válassz…</option>
        <option>Munkahiba (szerelő)</option>
        <option>Anyaghiba (gyártói)</option>
        <option>Kommunikációs hiba</option>
        <option>Dokumentáció hiánya</option>
        <option>Egyéb</option>
      </select>
    </div>

    <div class="fl">
      <label>Megelőzhető lett volna?</label>
      <select id="wfPrev">
        <option value="">—</option>
        <option value="true">✅ Igen</option>
        <option value="false">❌ Nem</option>
      </select>
    </div>

    <div class="fl">
      <label>HR intézkedés / tanulság</label>
      <textarea id="wfAction" rows="3"
        style="width:100%;padding:8px;border:1px solid #ddd;border-radius:7px;font-size:12px"
        placeholder="Pl: Képzés szükséges, folyamat módosítás, stb."></textarea>
    </div>

    <div class="mbts">
      <button class="mc" onclick="closeModal()">Mégse</button>
      <button class="ms" onclick="window._saveWarrantyFb('${jobId}')">💾 Mentés</button>
    </div>
  `);

  window._saveWarrantyFb = async (jId) => {
    const job = (get('jobs') || []).find(j => j.id === jId);
    try {
      await saveWarrantyFeedback({
        shop_id:     shopId,
        job_id:      jId,
        employee_id: job?.employee_id || null,
        root_cause:  document.getElementById('wfCause')?.value || null,
        preventable: document.getElementById('wfPrev')?.value === 'true' ? true
                   : document.getElementById('wfPrev')?.value === 'false' ? false : null,
        hr_action:   document.getElementById('wfAction')?.value || null,
      });
      toast('✅ Feedback mentve');
      window.closeModal();
    } catch (err) {
      toast('❌ ' + err.message, true);
    }
  };
}

// ── Kalap (Hat) — Munkakör leírás generátor AI ───────────────

export async function generateHatContent(empName, role, dept, tasks = []) {
  // Strukturált sablon — AI fejlesztéssel bővíthető
  return `MUNKAKÖR LEÍRÁS — ${empName}
Pozíció: ${role}
Részleg: ${dept}

FELADATOK:
${tasks.length > 0 ? tasks.map((t, i) => `${i+1}. ${t}`).join('\n') : '- [Feladatok meghatározása szükséges]'}

HOGYAN:
- Minden munka a rendszerben rögzítve legyen (RedAssistance)
- Státuszok naprakészen tartva
- Garancia eseteknél azonnali jelzés

MIVEL:
- RedAssistance rendszer
- Szerviz eszközök és berendezések

MIKOR:
- Munkaidő: [meghatározandó]
- Napi riport: munkanap végén

Verziószám: 1.0
Dátum: ${new Date().toLocaleDateString('hu')}`;
}
