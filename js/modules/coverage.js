// ============================================================
// js/modules/coverage.js — Feature 3: Dupla lefedettségi sáv
// 5 részleg × (lefoglalt óra + kész óra + napi átlag bevétel)
// ============================================================

import { DEPARTMENTS, EFFICIENCY_STATUSES } from '../config.js';
import { get } from '../state.js';
import { saveCoverageTarget } from '../api.js';
import { toast } from '../components/toast.js';
import { t } from '../i18n.js';

// ── Lefedettség kalkuláció ────────────────────────────────────

export function calcCoverage(jobs, emps, coverageTargets) {
  return DEPARTMENTS.map(dept => {
    const deptEmps  = emps.filter(e => e.department === dept.key);
    const deptJobs  = jobs.filter(j => j.employees?.department === dept.key);

    // 1. Lefoglalt óra (minden nem-assigned munka)
    const bookedMin  = deptJobs
      .filter(j => j.status !== 'assigned')
      .reduce((s, j) => s + (j.duration || 0), 0);

    // 2. Kész óra (done + complete státusz, actual_min alapján)
    const doneMin    = deptJobs
      .filter(j => EFFICIENCY_STATUSES.includes(j.status))
      .reduce((s, j) => s + (j.actual_min || j.duration || 0), 0);

    // 3. Napi átlag bevétel (kész munkák bevételéből)
    const doneRevenue = deptJobs
      .filter(j => EFFICIENCY_STATUSES.includes(j.status) && !j.is_warranty)
      .reduce((s, j) => s + (j.actual_revenue || 0), 0);

    // Célok
    const target = coverageTargets.find(c => c.department === dept.key) || {};
    const targetHours   = (target.daily_target_hours || 8) * 60 * Math.max(deptEmps.length, 1);
    const targetRevenue = (target.daily_target_revenue || 1440) * Math.max(deptEmps.length, 1);

    // Százalékok
    const bookedPct = targetHours > 0 ? Math.min(Math.round((bookedMin / targetHours) * 100), 120) : 0;
    const donePct   = targetHours > 0 ? Math.min(Math.round((doneMin   / targetHours) * 100), 120) : 0;
    const revPct    = targetRevenue > 0 ? Math.min(Math.round((doneRevenue / targetRevenue) * 100), 120) : 0;

    return {
      dept:        dept.key,
      icon:        dept.icon,
      color:       dept.color,
      empCount:    deptEmps.length,
      jobCount:    deptJobs.length,

      bookedMin,   bookedH: (bookedMin / 60).toFixed(1),
      doneMin,     doneH:   (doneMin   / 60).toFixed(1),
      doneRevenue,

      targetHours: (targetHours / 60).toFixed(1),
      targetRevenue,

      bookedPct,
      donePct,
      revPct,

      // Státusz: ok / warning / danger
      bookedStatus: bookedPct >= 80 ? 'ok' : bookedPct >= 50 ? 'warn' : 'danger',
      doneStatus:   donePct   >= 80 ? 'ok' : donePct   >= 50 ? 'warn' : 'danger',
      revStatus:    revPct    >= 80 ? 'ok' : revPct    >= 50 ? 'warn' : 'danger',
    };
  });
}

// ── Lefedettségi sáv HTML ─────────────────────────────────────

export function renderCoverageBar(jobs, emps, coverageTargets) {
  const data = calcCoverage(jobs, emps, coverageTargets);

  const bars = data.map(d => {
    const statusColor = (s) => s === 'ok' ? '#4CAF50' : s === 'warn' ? '#FFB020' : '#E53935';

    return `
    <div class="cap-block" style="border-left:3px solid ${d.color}">
      <div class="cap-title" style="color:${d.color}">
        ${d.icon} ${d.dept}
        <span style="font-size:8px;font-weight:400;color:#888;margin-left:4px">${d.empCount} fő · ${d.jobCount} munka</span>
      </div>

      <!-- Sor 1: Lefoglalt óra -->
      <div style="margin-bottom:6px">
        <div style="display:flex;justify-content:space-between;font-size:9px;color:#888;margin-bottom:2px">
          <span>📋 Lefoglalt</span>
          <span style="color:${statusColor(d.bookedStatus)};font-weight:700">${d.bookedH}h / ${d.targetHours}h (${d.bookedPct}%)</span>
        </div>
        <div class="cap-inner">
          <div class="cap-fill" style="width:${Math.min(d.bookedPct, 100)}%;background:${statusColor(d.bookedStatus)};opacity:.7"></div>
        </div>
      </div>

      <!-- Sor 2: Kész óra -->
      <div style="margin-bottom:6px">
        <div style="display:flex;justify-content:space-between;font-size:9px;color:#888;margin-bottom:2px">
          <span>✅ Kész</span>
          <span style="color:${statusColor(d.doneStatus)};font-weight:700">${d.doneH}h / ${d.targetHours}h (${d.donePct}%)</span>
        </div>
        <div class="cap-inner">
          <div class="cap-fill" style="width:${Math.min(d.donePct, 100)}%;background:${statusColor(d.doneStatus)}"></div>
        </div>
      </div>

      <!-- Sor 3: Napi bevétel -->
      ${d.targetRevenue > 0 ? `
      <div>
        <div style="display:flex;justify-content:space-between;font-size:9px;color:#888;margin-bottom:2px">
          <span>💰 Bevétel</span>
          <span style="color:${statusColor(d.revStatus)};font-weight:700">${d.doneRevenue.toLocaleString()} / ${d.targetRevenue.toLocaleString()} RON (${d.revPct}%)</span>
        </div>
        <div class="cap-inner">
          <div class="cap-fill" style="width:${Math.min(d.revPct, 100)}%;background:${statusColor(d.revStatus)};opacity:.85"></div>
        </div>
      </div>` : ''}
    </div>`;
  }).join('');

  return `
  <div style="margin-bottom:14px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <h3 style="font-size:13px;font-weight:700">📊 Lefedettségi sáv</h3>
      <button class="bo" onclick="openCoverageSettings()" style="font-size:9px;padding:3px 8px">⚙️ Célok</button>
    </div>
    <div class="cap-bar">${bars}</div>
  </div>`;
}

// ── Kompakt összesítő (dashboard teteje) ─────────────────────

export function renderCoverageSummaryRow(jobs, emps, coverageTargets) {
  const data = calcCoverage(jobs, emps, coverageTargets);
  const totalBooked  = data.reduce((s, d) => s + parseFloat(d.bookedH), 0).toFixed(1);
  const totalDone    = data.reduce((s, d) => s + parseFloat(d.doneH),   0).toFixed(1);
  const totalRevenue = data.reduce((s, d) => s + d.doneRevenue, 0);
  const avgDonePct   = Math.round(data.reduce((s, d) => s + d.donePct, 0) / data.length);

  return `
  <div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">
    ${data.map(d => `
      <div style="flex:1;min-width:80px;background:#fff;border:1px solid #e8e8ec;border-radius:8px;padding:8px;text-align:center;border-top:3px solid ${d.color}">
        <div style="font-size:16px">${d.icon}</div>
        <div style="font-size:9px;font-weight:700;color:${d.color}">${d.dept}</div>
        <div style="font-size:14px;font-weight:800;margin:2px 0">${d.donePct}%</div>
        <div style="font-size:8px;color:#888">${d.doneH}h kész</div>
      </div>
    `).join('')}
  </div>`;
}

// ── Coverage Settings Modal ───────────────────────────────────

export function openCoverageSettings() {
  const targets = get('coverage') || [];
  const shopId  = get('curShop')?.id;

  const rows = DEPARTMENTS.map(dept => {
    const t = targets.find(x => x.department === dept.key) || {};
    return `
    <tr>
      <td style="padding:6px 8px;font-weight:600">${dept.icon} ${dept.key}</td>
      <td style="padding:4px"><input type="number" min="0" step="0.5"
        id="ct_h_${dept.key}" value="${t.daily_target_hours || 8}"
        style="width:70px;padding:5px;border:1px solid #ddd;border-radius:5px;text-align:center"></td>
      <td style="padding:4px"><input type="number" min="0" step="100"
        id="ct_r_${dept.key}" value="${t.daily_target_revenue || 0}"
        style="width:90px;padding:5px;border:1px solid #ddd;border-radius:5px;text-align:center"></td>
    </tr>`;
  }).join('');

  window.openModal(`
    <h3>⚙️ Lefedettségi célok <button onclick="closeModal()">✕</button></h3>
    <p style="font-size:11px;color:#888;margin-bottom:10px">Részlegenkénti napi célok beállítása</p>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="font-size:10px;color:#888">
          <th style="text-align:left;padding:4px 8px">Részleg</th>
          <th style="padding:4px">Napi cél (h)</th>
          <th style="padding:4px">Napi bevétel (RON)</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="mbts">
      <button class="mc" onclick="closeModal()">Mégse</button>
      <button class="ms" onclick="window._saveCoverageTargets()">💾 Mentés</button>
    </div>
  `);

  window._saveCoverageTargets = async () => {
    try {
      for (const dept of DEPARTMENTS) {
        const h = parseFloat(document.getElementById(`ct_h_${dept.key}`)?.value) || 0;
        const r = parseFloat(document.getElementById(`ct_r_${dept.key}`)?.value) || 0;
        const existing = targets.find(x => x.department === dept.key);
        await saveCoverageTarget(
          { shop_id: shopId, department: dept.key, daily_target_hours: h, daily_target_revenue: r },
          existing?.id || null
        );
      }
      toast('✅ Célok mentve');
      window.closeModal();
      window.dispatchEvent(new CustomEvent('coverageChanged'));
    } catch (err) {
      toast('❌ ' + err.message, true);
    }
  };
}
