// ============================================================
// js/modules/status.js — Feature 1+2: Státusz logika + Garancia
// ============================================================

import { STATUS_FLOW, WARRANTY_STATUS_FLOW, STATUS_CSS, EFFICIENCY_STATUSES } from '../config.js';
import { getJobById, updateJobLocally } from '../state.js';
import { advanceStatus } from '../api.js';
import { toast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';
import { t } from '../i18n.js';

// ── Státusz badge HTML ────────────────────────────────────────

export function statusBadge(status, isWarranty = false) {
  const cfg = STATUS_FLOW[status] || {};
  const css = STATUS_CSS[status] || '';
  const warTag = isWarranty
    ? `<span style="font-size:8px;background:rgba(255,107,157,.15);color:#FF6B9D;padding:1px 4px;border-radius:4px;margin-left:3px">🛡️ GAR</span>`
    : '';
  return `<span class="bg ${css}">${cfg.icon || ''} ${cfg.label?.[window._lang] || status}${warTag}</span>`;
}

// ── Szerelő jogosultság ellenőrzés ───────────────────────────
// Szerelő: max done-ig léphet
// Admin: szabad flow

export function canAdvance(job, isWorker = false) {
  if (!job) return false;
  const flow = job.is_warranty ? WARRANTY_STATUS_FLOW : STATUS_FLOW;
  const cfg = flow[job.status];
  if (!cfg || !cfg.next) return false;            // már végállapot
  if (isWorker && job.status === 'done') return false;  // szerelő csak done-ig
  return true;
}

export function getNextStatus(job) {
  const flow = job.is_warranty ? WARRANTY_STATUS_FLOW : STATUS_FLOW;
  return flow[job.status]?.next || null;
}

// ── Státusz előre lépés gomb ──────────────────────────────────

export async function doAdvanceStatus(jobId, isWorker = false) {
  const job = getJobById(jobId);
  if (!job) return;
  if (!canAdvance(job, isWorker)) {
    toast(t('noAdvance'), true);
    return;
  }

  const nextStatus = getNextStatus(job);
  const flow = job.is_warranty ? WARRANTY_STATUS_FLOW : STATUS_FLOW;
  const needsActualMin = flow[job.status]?.requiresActualMin;

  // Ha done felé lépünk: actual_min kötelező
  if (needsActualMin) {
    openActualMinModal(job, nextStatus, isWorker);
    return;
  }

  await _executeAdvance(job, nextStatus);
}

// ── actual_min bekérő modal ───────────────────────────────────

function openActualMinModal(job, nextStatus, isWorker) {
  const suggestedMin = job.duration || 60;

  openModal(`
    <h3>⏱️ ${t('actualMinTitle')} <button onclick="closeModal()">✕</button></h3>
    <p style="font-size:12px;color:#888;margin-bottom:14px">
      ${t('actualMinDesc')} <b>${suggestedMin} perc</b> ${t('booked')}.
      ${job.is_warranty ? `<br><span style="color:#FF6B9D">🛡️ ${t('warrantyJob')}</span>` : ''}
    </p>

    <div class="fl">
      <label>${t('actualMin')} *</label>
      <input id="amMin" type="number" min="1" max="999" value="${suggestedMin}"
             style="font-size:20px;font-weight:700;text-align:center">
    </div>
    <div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap" id="amPresets"></div>

    ${job.is_warranty ? `
    <div class="fl" style="margin-top:10px">
      <label>${t('warrantyCost')} (RON)</label>
      <input id="amWarCost" type="number" min="0" value="${job.warranty_cost || 0}">
    </div>
    <div class="fl">
      <label>${t('warrantyNote')}</label>
      <textarea id="amWarNote" rows="2" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:7px;font-size:12px">${job.warranty_note || ''}</textarea>
    </div>
    ` : ''}

    <div class="mbts">
      <button class="mc" onclick="closeModal()">${t('cancel')}</button>
      <button class="ms" onclick="window._confirmActualMin('${job.id}','${nextStatus}')">
        ${STATUS_FLOW[nextStatus]?.icon || '✅'} ${t('setDone')}
      </button>
    </div>
  `);

  // Preset gombok
  const presets = [suggestedMin, 30, 60, 90, 120, 180, 240].filter((v, i, a) => a.indexOf(v) === i);
  const presetEl = document.getElementById('amPresets');
  if (presetEl) {
    presetEl.innerHTML = presets.map(p =>
      `<button class="time-pre" onclick="document.getElementById('amMin').value=${p}">${p}'</button>`
    ).join('');
  }

  // Global callback
  window._confirmActualMin = async (jId, nStatus) => {
    const actualMin = parseInt(document.getElementById('amMin')?.value) || 0;
    if (!actualMin || actualMin < 1) { toast('⚠️ ' + t('actualMinRequired'), true); return; }

    const extra = { actual_min: actualMin };
    if (job.is_warranty) {
      extra.warranty_cost = parseFloat(document.getElementById('amWarCost')?.value) || 0;
      extra.warranty_note = document.getElementById('amWarNote')?.value || '';
    }

    closeModal();
    await _executeAdvance(getJobById(jId), nStatus, extra);
  };
}

// ── Tényleges DB hívás ────────────────────────────────────────

async function _executeAdvance(job, nextStatus, extra = {}) {
  try {
    const updated = await advanceStatus(job.id, nextStatus, extra);
    updateJobLocally(job.id, { status: nextStatus, ...extra });
    toast(`${STATUS_FLOW[nextStatus]?.icon} → ${STATUS_FLOW[nextStatus]?.label?.[window._lang]}`);

    // Trigger oldal újrarajzolás
    window.dispatchEvent(new CustomEvent('jobsChanged'));
  } catch (err) {
    toast('❌ ' + err.message, true);
  }
}

// ── Hatékonyság kalkuláció ────────────────────────────────────
// CSAK done + complete státuszú munkák számítanak

export function calcEfficiency(jobs, emps) {
  const activeJobs = jobs.filter(j => EFFICIENCY_STATUSES.includes(j.status));
  const normalJobs = activeJobs.filter(j => !j.is_warranty);
  const warrantyJobs = activeJobs.filter(j => j.is_warranty);

  const totalActualMin = activeJobs.reduce((s, j) => s + (j.actual_min || j.duration || 0), 0);
  const totalBookedMin = jobs.filter(j => j.status !== 'assigned').reduce((s, j) => s + (j.duration || 0), 0);

  const productionEff = totalBookedMin > 0
    ? Math.round((totalActualMin / totalBookedMin) * 100) : 0;

  const totalRevenue = normalJobs.reduce((s, j) => s + (j.actual_revenue || 0), 0);
  const warrantyLoss  = warrantyJobs.reduce((s, j) => s + (j.warranty_cost || 0), 0);

  return {
    productionEff,
    totalActualMin,
    totalBookedMin,
    totalRevenue,
    warrantyJobs:   warrantyJobs.length,
    warrantyLoss,
    normalJobs:     normalJobs.length,
    doneCount:      jobs.filter(j => j.status === 'done').length,
    completeCount:  jobs.filter(j => j.status === 'complete').length,
  };
}

// ── Státusz összesítő (KPI kártyákhoz) ───────────────────────

export function calcStatusSummary(jobs) {
  return {
    assigned: jobs.filter(j => j.status === 'assigned').length,
    progress: jobs.filter(j => j.status === 'progress').length,
    done:     jobs.filter(j => j.status === 'done').length,
    paid:     jobs.filter(j => j.status === 'paid').length,
    complete: jobs.filter(j => j.status === 'complete').length,
    warranty: jobs.filter(j => j.is_warranty).length,
    total:    jobs.length,
  };
}

// ── Garancia összesítő ────────────────────────────────────────

export function calcWarrantySummary(jobs) {
  const wJobs = jobs.filter(j => j.is_warranty);
  return {
    count:       wJobs.length,
    totalLoss:   wJobs.reduce((s, j) => s + (j.warranty_cost || 0), 0),
    done:        wJobs.filter(j => ['done','complete'].includes(j.status)).length,
    open:        wJobs.filter(j => ['assigned','progress'].includes(j.status)).length,
    byEmployee:  _groupByEmployee(wJobs),
  };
}

function _groupByEmployee(wJobs) {
  const map = {};
  wJobs.forEach(j => {
    const name = j.employees?.name || 'N/A';
    if (!map[name]) map[name] = { count: 0, loss: 0 };
    map[name].count++;
    map[name].loss += j.warranty_cost || 0;
  });
  return Object.entries(map).map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.count - a.count);
}

// ── Garancia összesítő HTML ───────────────────────────────────

export function renderWarrantySummaryHTML(jobs) {
  const s = calcWarrantySummary(jobs);
  if (s.count === 0) return '';

  return `
  <div class="gc" style="border-color:rgba(255,107,157,.3)">
    <div class="gc-top" style="background:rgba(255,107,157,.04)">
      <h3>🛡️ ${t('warranty')} — ${s.count} munka</h3>
      <div class="gc-info">
        <span>🔓 Nyitott: <b>${s.open}</b></span>
        <span>✅ Kész: <b>${s.done}</b></span>
        <span style="color:#FF6B9D">💸 Veszteség: <b>${s.totalLoss.toLocaleString()} RON</b></span>
      </div>
    </div>
    <div style="padding:10px 14px">
      ${s.byEmployee.map(e => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #f0f0f0">
          <span style="font-size:12px;font-weight:600">${e.name}</span>
          <span>
            <span style="font-size:10px;color:#888">${e.count}× garancia</span>
            ${e.loss > 0 ? `<span style="font-size:10px;color:#FF6B9D;margin-left:6px">−${e.loss} RON</span>` : ''}
          </span>
        </div>
      `).join('')}
    </div>
  </div>`;
}
