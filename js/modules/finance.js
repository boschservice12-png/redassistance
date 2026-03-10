// ============================================================
// js/modules/finance.js — Pénzügyi modul
// PANOU-FINAL-HAVI-ZARAS → RedAssistance v2 integráció
// Supabase-perzisztenciával, multi-shop, auth-kompatibilis
// ============================================================

import { SB_URL, SB_KEY } from '../config.js';
import { getState } from '../state.js';
import { toast as showToast } from '../components/toast.js';
import { t } from '../i18n.js';

// ─────────────────────────────────────────────────────────────
// KONSTANSOK
// ─────────────────────────────────────────────────────────────
export const FINANCE_CONFIG = {
  venituriCats: [
    { id: 'atelierMecanic', n: 'Atelier Mecanic',  i: '🔧', c: '#3b82f6' },
    { id: 'atelierLacatus', n: 'Atelier Lăcătuș',  i: '🔨', c: '#8b5cf6' },
    { id: 'comertPiese',    n: 'Comerț Piese',      i: '⚙️', c: '#06b6d4' },
    { id: 'transport',      n: 'Transport',          i: '🚚', c: '#10b981' },
    { id: 'productie',      n: 'Producție',          i: '🏭', c: '#f59e0b' },
    { id: 'ocazional',      n: 'Ocazional',          i: '💼', c: '#ec4899' },
  ],
  cashflowCats: [
    { id: 'atelierMecanic', n: 'Atelier Mecanic', i: '🔧', c: '#3b82f6' },
    { id: 'atelierLacatus', n: 'Atelier Lăcătuș', i: '🔨', c: '#8b5cf6' },
    { id: 'comertPiese',    n: 'Comerț Piese',    i: '⚙️', c: '#06b6d4' },
    { id: 'productie',      n: 'Producție',        i: '🏭', c: '#f59e0b' },
    { id: 'altele',         n: 'Altele',           i: '💼', c: '#ec4899' },
  ],
  cheltuieliDepts: [
    { id: 'conducere',  n: 'Conducere', i: '👔', c: '#3b82f6' },
    { id: 'hr',         n: 'HR',        i: '👥', c: '#8b5cf6' },
    { id: 'marketing',  n: 'Marketing', i: '📢', c: '#ec4899' },
    { id: 'finante',    n: 'Finanțe',   i: '💰', c: '#10b981' },
    { id: 'productie',  n: 'Producție', i: '🏭', c: '#f59e0b' },
    { id: 'transport',  n: 'Transport', i: '🚚', c: '#06b6d4' },
  ],
  months: ['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie',
           'Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie'],
  expectedAnnualHours: 1400, // 140h/lună × 12 - 280h concediu
};

// ─────────────────────────────────────────────────────────────
// HELYI STATE (UI state — nem Supabase)
// ─────────────────────────────────────────────────────────────
let _state = {
  page:         'sumar',   // sumar | venituri | cheltuieli | salarii | cashflow | evzaras
  period:       'luna',    // zi | saptamana | luna | an
  month:        new Date().getMonth(), // 0–11
  year:         new Date().getFullYear(),
  dept:         'conducere',
  showAnnual:   false,
  loading:      false,

  // Adatok (Supabase-ből töltve)
  planTargets:  { ebitda_target: 0, venituri_target: 0, costuri_target: 0 },
  venituri:     {},   // { cat_id: { 0:{plan,real}, 1:{...}, ... } }
  cheltuieli:   [],   // [{ id, dept, name, months:{0:{p,r},...} }]
  cashflow:     {},   // { cat_id: { 0:{emis,inc}, ... } }
  salarii:      [],   // [{ employee_id, name, months:{...} }]
};

// ─────────────────────────────────────────────────────────────
// SUPABASE HELPERS
// ─────────────────────────────────────────────────────────────
const db = async (path, opts = {}) => {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': opts.prefer || 'return=representation',
    },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DB error: ${res.status} — ${err}`);
  }
  if (res.status === 204) return null;
  return res.json();
};

const upsert = (table, data, onConflict) =>
  db(`${table}?on_conflict=${onConflict}`, {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=representation',
    body: JSON.stringify(data),
  });

const get = (table, filter) =>
  db(`${table}?${filter}`);

const del = (table, filter) =>
  db(`${table}?${filter}`, { method: 'DELETE', prefer: 'return=minimal' });

const getShopId = () => getState().shopId || getState().currentShop?.id;

// ─────────────────────────────────────────────────────────────
// FORMÁZÓK
// ─────────────────────────────────────────────────────────────
const fmt = n => new Intl.NumberFormat('ro-RO').format(Math.round(n || 0));

const difColor = (dif, isExpense = false) => {
  // Bevételnél: pozitív = zöld, negatív = piros
  // Kiadásnál: pozitív (megtakarítás) = zöld, negatív (túllépés) = piros
  const pct = Math.abs(dif) / (Math.abs(dif) + 0.01) * 100;
  if (Math.abs(dif) < 0.01) return { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.3)' };
  if (dif > 0) return { color: '#10b981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)' };
  return { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)' };
};

const getMult = () => ({
  zi: 1 / 22, saptamana: 1 / 4.33, luna: 1, an: 12
}[_state.period] || 1);

// ─────────────────────────────────────────────────────────────
// ADATBETÖLTÉS (Supabase → _state)
// ─────────────────────────────────────────────────────────────
export const loadFinanceData = async () => {
  const shopId = getShopId();
  if (!shopId) return;
  const { year } = _state;

  try {
    _state.loading = true;

    // 1. Plan targets
    const pt = await get('financial_plan_targets',
      `shop_id=eq.${shopId}&year=eq.${year}`);
    _state.planTargets = pt?.[0] || { ebitda_target: 0, venituri_target: 0, costuri_target: 0 };

    // 2. Venituri
    const vRows = await get('financial_venituri',
      `shop_id=eq.${shopId}&year=eq.${year}&order=month.asc`);
    _state.venituri = {};
    FINANCE_CONFIG.venituriCats.forEach(cat => {
      _state.venituri[cat.id] = {};
      for (let m = 0; m < 12; m++) _state.venituri[cat.id][m] = { plan: 0, real: 0 };
    });
    (vRows || []).forEach(row => {
      if (_state.venituri[row.category]) {
        _state.venituri[row.category][row.month - 1] = {
          plan: parseFloat(row.plan_ron) || 0,
          real: parseFloat(row.real_ron) || 0,
        };
      }
    });

    // 3. Cheltuieli
    const chRows = await get('financial_cheltuieli',
      `shop_id=eq.${shopId}&year=eq.${year}&order=dept.asc,name.asc,month.asc`);
    // Groupolás: shop+year+dept+name azonosítja a számlát
    const chMap = {};
    (chRows || []).forEach(row => {
      const key = `${row.dept}|||${row.name}|||${row.id.slice(0,8)}`;
      // Megkeresünk egy meglévő "bill group"-ot
      let bill = _state.cheltuieli.find(b => b._key === `${row.dept}|||${row.name}` && !b._months_filled?.[row.month - 1]);
      if (!bill) {
        bill = {
          id: row.id,
          _key: `${row.dept}|||${row.name}`,
          dept: row.dept,
          name: row.name,
          months: {},
          _dbRows: {},
        };
        for (let m = 0; m < 12; m++) bill.months[m] = { p: 0, r: 0 };
        _state.cheltuieli.push(bill);
      }
      bill.months[row.month - 1] = { p: parseFloat(row.plan_ron) || 0, r: parseFloat(row.real_ron) || 0 };
      bill._dbRows[row.month - 1] = row.id;
      bill._months_filled = bill._months_filled || {};
      bill._months_filled[row.month - 1] = true;
    });

    // 4. Cashflow
    const cfRows = await get('financial_cashflow',
      `shop_id=eq.${shopId}&year=eq.${year}&order=month.asc`);
    _state.cashflow = {};
    FINANCE_CONFIG.cashflowCats.forEach(cat => {
      _state.cashflow[cat.id] = {};
      for (let m = 0; m < 12; m++) _state.cashflow[cat.id][m] = { emis: 0, inc: 0 };
    });
    (cfRows || []).forEach(row => {
      if (_state.cashflow[row.category]) {
        _state.cashflow[row.category][row.month - 1] = {
          emis: parseFloat(row.emis_ron) || 0,
          inc:  parseFloat(row.incasat_ron) || 0,
        };
      }
    });

    // 5. Salarii (employees + pénzügyi adatok)
    const state = getState();
    const empList = state.employees || [];
    const salRows = await get('financial_salarii',
      `shop_id=eq.${shopId}&year=eq.${year}&order=month.asc`);
    
    _state.salarii = empList.map(emp => {
      const sal = {
        employee_id: emp.id,
        name:     emp.name || emp.full_name || emp.id,
        functie:  emp.role  || emp.functie || '',
        dept:     emp.department || 'conducere',
        months:   {},
      };
      for (let m = 0; m < 12; m++) {
        sal.months[m] = { oreP:160, oreR:0, venitR:0, salR:0, bonR:0, alteBon:0, cardAv:0, taxeR:0, zileP:22, zileR:0 };
      }
      (salRows || []).filter(r => r.employee_id === emp.id).forEach(row => {
        sal.months[row.month - 1] = {
          oreP:   parseFloat(row.ore_plan)   || 160,
          oreR:   parseFloat(row.ore_real)   || 0,
          venitR: parseFloat(row.venit_real) || 0,
          salR:   parseFloat(row.sal_real)   || 0,
          bonR:   parseFloat(row.bon_real)   || 0,
          alteBon:parseFloat(row.alte_bon)   || 0,
          cardAv: parseFloat(row.card_avans) || 0,
          taxeR:  parseFloat(row.taxe_real)  || 0,
          zileP:  parseInt(row.zile_plan)    || 22,
          zileR:  parseInt(row.zile_real)    || 0,
        };
      });
      return sal;
    });

  } catch (e) {
    console.error('Finance load error:', e);
    showToast('Eroare la încărcarea datelor financiare', 'error');
  } finally {
    _state.loading = false;
  }
};

// ─────────────────────────────────────────────────────────────
// MENTÉSI FÜGGVÉNYEK
// ─────────────────────────────────────────────────────────────
const savePlanTargets = async (type, val) => {
  const shopId = getShopId();
  _state.planTargets[`${type}_target`] = Number(val);

  // Auto-kalkuláció
  if (type === 'ebitda') {
    _state.planTargets.venituri_target = _state.planTargets.ebitda_target + _state.planTargets.costuri_target;
  } else {
    _state.planTargets.ebitda_target = _state.planTargets.venituri_target - _state.planTargets.costuri_target;
  }

  try {
    await upsert('financial_plan_targets',
      { shop_id: shopId, year: _state.year, ..._state.planTargets },
      'shop_id,year');
    renderFinancePage();
  } catch (e) {
    showToast('Eroare salvare target', 'error');
  }
};
window._finSavePlan = savePlanTargets;

const saveVenituri = async (catId, field, val) => {
  const shopId = getShopId();
  const m = _state.month;
  _state.venituri[catId][m][field] = Number(val);
  const row = _state.venituri[catId][m];
  try {
    await upsert('financial_venituri', {
      shop_id: shopId, year: _state.year,
      month: m + 1, category: catId,
      plan_ron: row.plan, real_ron: row.real,
    }, 'shop_id,year,month,category');
    renderFinanceSumar();
  } catch (e) {
    showToast('Eroare salvare venituri', 'error');
  }
};
window._finSaveVen = saveVenituri;

const saveCheltuiala = async (billKey, monthIdx, field, val) => {
  const shopId = getShopId();
  const bill = _state.cheltuieli.find(b => b._key === billKey);
  if (!bill) return;
  bill.months[monthIdx][field] = Number(val);
  try {
    await upsert('financial_cheltuieli', {
      shop_id: shopId, year: _state.year,
      month: monthIdx + 1, dept: bill.dept, name: bill.name,
      plan_ron: bill.months[monthIdx].p,
      real_ron: bill.months[monthIdx].r,
    }, 'shop_id,year,month,dept,name');
    renderFinanceSumar();
  } catch (e) {
    showToast('Eroare salvare cheltuieli', 'error');
  }
};
window._finSaveChelt = saveCheltuiala;

const saveCheltuialaName = async (billKey, newName) => {
  const shopId = getShopId();
  const bill = _state.cheltuieli.find(b => b._key === billKey);
  if (!bill) return;
  const oldName = bill.name;
  bill.name = newName;
  bill._key = `${bill.dept}|||${newName}`;
  // Update all 12 month rows
  try {
    for (const [mi, row] of Object.entries(bill._dbRows || {})) {
      await db(`financial_cheltuieli?id=eq.${row}`, {
        method: 'PATCH', body: JSON.stringify({ name: newName }),
      });
    }
  } catch (e) {
    showToast('Eroare redenumire', 'error');
  }
};
window._finSaveCheltName = saveCheltuialaName;

const addCheltuiala = async (dept) => {
  const shopId = getShopId();
  const newBill = {
    id: `new_${Date.now()}`,
    _key: `${dept}|||`,
    dept,
    name: '',
    months: {},
    _dbRows: {},
  };
  for (let m = 0; m < 12; m++) newBill.months[m] = { p: 0, r: 0 };
  _state.cheltuieli.push(newBill);
  renderCheltuieli();
};
window._finAddChelt = addCheltuiala;

const deleteCheltuiala = async (billKey) => {
  const shopId = getShopId();
  const bill = _state.cheltuieli.find(b => b._key === billKey);
  if (!bill) return;
  try {
    for (const rowId of Object.values(bill._dbRows || {})) {
      await del('financial_cheltuieli', `id=eq.${rowId}`);
    }
    _state.cheltuieli = _state.cheltuieli.filter(b => b._key !== billKey);
    renderCheltuieli();
    showToast('Factură ștearsă', 'success');
  } catch (e) {
    showToast('Eroare ștergere', 'error');
  }
};
window._finDelChelt = deleteCheltuiala;

const saveCashflow = async (catId, field, val) => {
  const shopId = getShopId();
  const m = _state.month;
  _state.cashflow[catId][m][field] = Number(val);
  const row = _state.cashflow[catId][m];
  try {
    await upsert('financial_cashflow', {
      shop_id: shopId, year: _state.year,
      month: m + 1, category: catId,
      emis_ron: row.emis, incasat_ron: row.inc,
    }, 'shop_id,year,month,category');
  } catch (e) {
    showToast('Eroare salvare cashflow', 'error');
  }
};
window._finSaveCF = saveCashflow;

const saveSalariu = async (empId, field, val) => {
  const shopId = getShopId();
  const emp = _state.salarii.find(e => e.employee_id === empId);
  if (!emp) return;
  const m = _state.month;
  emp.months[m][field] = Number(val);
  const row = emp.months[m];
  try {
    await upsert('financial_salarii', {
      shop_id: shopId, employee_id: empId,
      year: _state.year, month: m + 1,
      ore_plan:   row.oreP,  ore_real:   row.oreR,
      venit_real: row.venitR, sal_real:   row.salR,
      bon_real:   row.bonR,  alte_bon:   row.alteBon,
      card_avans: row.cardAv, taxe_real: row.taxeR,
      zile_plan:  row.zileP, zile_real:  row.zileR,
    }, 'shop_id,employee_id,year,month');
    renderFinanceSumar();
  } catch (e) {
    showToast('Eroare salvare salariu', 'error');
  }
};
window._finSaveSal = saveSalariu;

// ─────────────────────────────────────────────────────────────
// KALKULÁCIÓ (összes adat → aggregátumok)
// ─────────────────────────────────────────────────────────────
const calcTotals = () => {
  // Éves összesítők
  let tvr12 = 0;   // Total Venituri 12 hónap
  Object.values(_state.venituri).forEach(cat => {
    Object.values(cat).forEach(m => { tvr12 += m.real || 0; });
  });

  let tcr12 = 0;   // Total Cheltuieli (számlák) 12 hónap
  _state.cheltuieli.forEach(bill => {
    Object.values(bill.months).forEach(m => { tcr12 += m.r || 0; });
  });

  let tsp12 = 0;   // Total Salarii (bér+bon+alteBon+card) 12 hónap
  let ttp12 = 0;   // Total Taxe 12 hónap
  _state.salarii.forEach(emp => {
    Object.values(emp.months).forEach(m => {
      tsp12 += (m.salR||0) + (m.bonR||0) + (m.alteBon||0) + (m.cardAv||0);
      ttp12 += m.taxeR || 0;
    });
  });

  const tcostr12 = tcr12 + tsp12 + ttp12;
  const er12     = tvr12 - tcostr12;

  return { tvr12, tcr12, tsp12, ttp12, tcostr12, er12 };
};

// ─────────────────────────────────────────────────────────────
// RENDER: SUMAR (EBITDA dashboard)
// ─────────────────────────────────────────────────────────────
const renderFinanceSumar = () => {
  const container = document.getElementById('fin-sumar');
  if (!container) return;

  const { tvr12, tcostr12, er12 } = calcTotals();
  const pt = _state.planTargets;

  const ebitdaDif = er12  - (pt.ebitda_target   || 0);
  const venDif    = tvr12 - (pt.venituri_target  || 0);
  const costDif   = (pt.costuri_target || 0) - tcostr12; // megtakarítás pozitív
  const venDifC   = difColor(venDif);
  const costDifC  = difColor(costDif);
  const ebitdaDifC= difColor(ebitdaDif);

  container.innerHTML = `
    <!-- EBITDA kártya -->
    <div style="background:linear-gradient(135deg,#c84040,#b03636);border-radius:12px;padding:2.5rem;margin-bottom:2rem;text-align:center;color:#fff;box-shadow:0 4px 16px rgba(200,64,64,0.3);">
      <div style="font-size:0.875rem;font-weight:700;opacity:0.85;margin-bottom:1rem;">
        EBITDA — ${_state.year} (${_state.period.toUpperCase()})
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:2rem;max-width:900px;margin:0 auto;">
        <div>
          <div style="font-size:0.75rem;opacity:0.8;margin-bottom:0.5rem;font-weight:600;">PLANIFICAT</div>
          <input type="number" value="${pt.ebitda_target||0}"
            onchange="window._finSavePlan('ebitda',this.value)"
            style="width:100%;padding:0.75rem;font-size:1.5rem;font-weight:800;text-align:center;background:#ffffff22;border:2px solid #ffffff44;border-radius:10px;color:#fff;outline:none;">
        </div>
        <div>
          <div style="font-size:0.75rem;opacity:0.8;margin-bottom:0.5rem;font-weight:600;">REALIZAT</div>
          <div style="font-size:2rem;font-weight:800;color:#fff;">${fmt(er12)} RON</div>
        </div>
        <div>
          <div style="font-size:0.75rem;opacity:0.8;margin-bottom:0.5rem;font-weight:600;">DIFERENȚĂ</div>
          <div style="font-size:2rem;font-weight:800;color:${ebitdaDif>=0?'#86efac':'#fca5a5'};">
            ${ebitdaDif>=0?'+':''}${fmt(ebitdaDif)} RON
          </div>
        </div>
      </div>
    </div>

    <!-- Venituri + Costuri -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;">
      <div style="background:#fff;border-radius:12px;padding:1.5rem;border:2px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
        <div style="color:#3b82f6;font-size:0.8rem;font-weight:700;margin-bottom:1rem;">💰 TOTAL VENITURI</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
          <div>
            <div style="color:#64748b;font-size:0.7rem;font-weight:600;margin-bottom:0.4rem;">PLANIFICAT</div>
            <input type="number" value="${pt.venituri_target||0}"
              onchange="window._finSavePlan('venituri',this.value)"
              style="width:100%;padding:0.65rem;font-size:1.1rem;font-weight:800;text-align:right;background:#fff;border:2px solid #3b82f6;border-radius:8px;color:#1e293b;outline:none;">
          </div>
          <div>
            <div style="color:#64748b;font-size:0.7rem;font-weight:600;margin-bottom:0.4rem;">REALIZAT</div>
            <div style="font-size:1.5rem;font-weight:800;color:#3b82f6;">${fmt(tvr12)}</div>
          </div>
        </div>
        <div style="padding:0.75rem;background:${venDifC.bg};border:1px solid ${venDifC.border};border-radius:8px;text-align:center;">
          <div style="font-size:0.7rem;color:#64748b;font-weight:600;">DIFERENȚĂ</div>
          <div style="font-size:1.25rem;font-weight:800;color:${venDifC.color};">${venDif>=0?'+':''}${fmt(venDif)} RON</div>
        </div>
      </div>
      <div style="background:#fff;border-radius:12px;padding:1.5rem;border:2px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
        <div style="color:#ef4444;font-size:0.8rem;font-weight:700;margin-bottom:1rem;">💸 TOTAL COSTURI <span style="font-size:0.65rem;color:#64748b;font-weight:500;">(🟢Ec | 🟡±5% | 🔴Dep)</span></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
          <div>
            <div style="color:#64748b;font-size:0.7rem;font-weight:600;margin-bottom:0.4rem;">PLANIFICAT</div>
            <input type="number" value="${pt.costuri_target||0}"
              onchange="window._finSavePlan('costuri',this.value)"
              style="width:100%;padding:0.65rem;font-size:1.1rem;font-weight:800;text-align:right;background:#fff;border:2px solid #ef4444;border-radius:8px;color:#1e293b;outline:none;">
          </div>
          <div>
            <div style="color:#64748b;font-size:0.7rem;font-weight:600;margin-bottom:0.4rem;">REALIZAT</div>
            <div style="font-size:1.5rem;font-weight:800;color:#ef4444;">${fmt(tcostr12)}</div>
          </div>
        </div>
        <div style="padding:0.75rem;background:${costDifC.bg};border:1px solid ${costDifC.border};border-radius:8px;text-align:center;">
          <div style="font-size:0.7rem;color:#64748b;font-weight:600;">ECONOMIE (Plan − Realizat)</div>
          <div style="font-size:1.25rem;font-weight:800;color:${costDifC.color};">${costDif>=0?'+':''}${fmt(costDif)} RON</div>
        </div>
      </div>
    </div>
  `;
};

// ─────────────────────────────────────────────────────────────
// RENDER: VENITURI
// ─────────────────────────────────────────────────────────────
const renderVenituri = () => {
  const container = document.getElementById('fin-venituri');
  if (!container) return;
  const { months, venituriCats } = FINANCE_CONFIG;
  const m = _state.month;

  const monthTotal = venituriCats.reduce((s, cat) => s + (_state.venituri[cat.id]?.[m]?.real || 0), 0);
  const yearTotal  = venituriCats.reduce((s, cat) =>
    s + Object.values(_state.venituri[cat.id]||{}).reduce((ss, row) => ss + (row.real||0), 0), 0);

  let html = `
    ${_monthSelector()}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem;">
      <div style="background:rgba(59,130,246,0.1);border:2px solid rgba(59,130,246,0.4);border-radius:12px;padding:1.5rem;text-align:center;">
        <div style="color:#64748b;font-size:0.75rem;font-weight:600;margin-bottom:0.5rem;">${months[m].toUpperCase()}</div>
        <div style="font-size:1.75rem;font-weight:800;color:#3b82f6;">${fmt(monthTotal)} RON</div>
      </div>
      <div style="background:rgba(16,185,129,0.1);border:2px solid rgba(16,185,129,0.4);border-radius:12px;padding:1.5rem;text-align:center;">
        <div style="color:#64748b;font-size:0.75rem;font-weight:600;margin-bottom:0.5rem;">TOTAL ANUAL</div>
        <div style="font-size:1.75rem;font-weight:800;color:#10b981;">${fmt(yearTotal)} RON</div>
      </div>
    </div>
  `;

  venituriCats.forEach(cat => {
    const row    = _state.venituri[cat.id]?.[m] || { plan: 0, real: 0 };
    const dif    = row.real - row.plan;
    const dc     = difColor(dif);
    const catYear = Object.values(_state.venituri[cat.id]||{}).reduce((s, r) => s + (r.real||0), 0);

    html += `
      <div style="background:#fff;border-radius:12px;padding:1.5rem;margin-bottom:1rem;border:2px solid ${cat.c}22;box-shadow:0 1px 3px rgba(0,0,0,0.06);display:grid;grid-template-columns:auto 1fr auto;gap:1.5rem;align-items:center;">
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <div style="width:52px;height:52px;background:${cat.c}18;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;">${cat.i}</div>
          <div>
            <div style="font-size:1rem;font-weight:700;color:${cat.c};">${cat.n}</div>
            <div style="font-size:0.75rem;color:#94a3b8;margin-top:0.2rem;">Anual: ${fmt(catYear)} RON</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
          <div>
            <label style="display:block;color:#64748b;font-size:0.7rem;font-weight:600;margin-bottom:0.3rem;">PLANIFICAT (${months[m]})</label>
            <input type="number" value="${row.plan}"
              onchange="window._finSaveVen('${cat.id}','plan',this.value)"
              style="width:100%;padding:0.6rem;border:2px solid ${cat.c}66;border-radius:8px;font-size:0.95rem;font-weight:700;text-align:right;outline:none;">
          </div>
          <div>
            <label style="display:block;color:#64748b;font-size:0.7rem;font-weight:600;margin-bottom:0.3rem;">REALIZAT (${months[m]})</label>
            <input type="number" value="${row.real}"
              onchange="window._finSaveVen('${cat.id}','real',this.value)"
              style="width:100%;padding:0.6rem;border:2px solid ${cat.c}66;border-radius:8px;font-size:0.95rem;font-weight:700;text-align:right;outline:none;">
          </div>
        </div>
        <div style="min-width:130px;text-align:right;padding:0.75rem;background:${dc.bg};border:1px solid ${dc.border};border-radius:8px;">
          <div style="font-size:1.25rem;font-weight:800;color:${dc.color};">${dif>=0?'+':''}${fmt(dif)}</div>
          <div style="font-size:0.7rem;color:#94a3b8;">RON diferență</div>
        </div>
      </div>
    `;
  });

  if (_state.showAnnual) html += _renderVenAnnualTable();
  container.innerHTML = html;
};

const _renderVenAnnualTable = () => {
  const { months, venituriCats } = FINANCE_CONFIG;
  return `
    <div style="background:#fff;border-radius:12px;padding:2rem;margin-top:1.5rem;border:2px solid #e2e8f0;">
      <h3 style="color:#c84040;margin-bottom:1.5rem;font-size:1.4rem;">📊 RAPORT ANUAL VENITURI</h3>
      ${venituriCats.map(cat => {
        const rows = _state.venituri[cat.id] || {};
        const yearTotal = Object.values(rows).reduce((s,r) => s+(r.real||0), 0);
        return `
          <div style="margin-bottom:1.5rem;background:#f8fafc;border-radius:10px;padding:1.25rem;border:2px solid ${cat.c}33;">
            <h4 style="color:${cat.c};margin-bottom:1rem;">${cat.i} ${cat.n}</h4>
            <table style="width:100%;border-collapse:collapse;">
              <thead><tr style="background:#e2e8f0;">
                <th style="padding:0.6rem;text-align:left;color:#475569;font-size:0.8rem;">Luna</th>
                <th style="padding:0.6rem;text-align:right;color:#475569;font-size:0.8rem;">Planificat</th>
                <th style="padding:0.6rem;text-align:right;color:#475569;font-size:0.8rem;">Realizat</th>
                <th style="padding:0.6rem;text-align:right;color:#475569;font-size:0.8rem;">Diferență</th>
              </tr></thead>
              <tbody>
                ${months.map((mn, i) => {
                  const r = rows[i] || { plan:0, real:0 };
                  const d = r.real - r.plan;
                  const dc = difColor(d);
                  return `<tr style="background:${i%2===0?'#fff':'#f8fafc'};border-bottom:1px solid #e2e8f0;">
                    <td style="padding:0.5rem;color:#64748b;font-weight:600;">${mn}</td>
                    <td style="padding:0.5rem;text-align:right;color:#94a3b8;">${fmt(r.plan)}</td>
                    <td style="padding:0.5rem;text-align:right;color:${cat.c};font-weight:700;">${fmt(r.real)}</td>
                    <td style="padding:0.5rem;text-align:right;color:${dc.color};font-weight:800;">${d>=0?'+':''}${fmt(d)}</td>
                  </tr>`;
                }).join('')}
                <tr style="background:#e2e8f0;font-weight:800;">
                  <td style="padding:0.6rem;">TOTAL</td>
                  <td style="padding:0.6rem;text-align:right;color:#64748b;">${fmt(Object.values(rows).reduce((s,r)=>s+(r.plan||0),0))}</td>
                  <td style="padding:0.6rem;text-align:right;color:${cat.c};">${fmt(yearTotal)}</td>
                  <td style="padding:0.6rem;text-align:right;color:${difColor(yearTotal - Object.values(rows).reduce((s,r)=>s+(r.plan||0),0)).color};">
                    ${yearTotal - Object.values(rows).reduce((s,r)=>s+(r.plan||0),0) >= 0?'+':''}${fmt(yearTotal - Object.values(rows).reduce((s,r)=>s+(r.plan||0),0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        `;
      }).join('')}
    </div>
  `;
};

// ─────────────────────────────────────────────────────────────
// RENDER: CHELTUIELI
// ─────────────────────────────────────────────────────────────
const renderCheltuieli = () => {
  const container = document.getElementById('fin-cheltuieli');
  if (!container) return;
  const { months, cheltuieliDepts } = FINANCE_CONFIG;
  const m = _state.month;
  const dept = _state.dept;

  const deptBtns = cheltuieliDepts.map(d => `
    <button onclick="window._finSetDept('${d.id}')"
      style="padding:0.75rem 1rem;background:${d.id===dept?d.c:'#fff'};color:${d.id===dept?'#fff':'#475569'};border:2px solid ${d.id===dept?d.c:'#e2e8f0'};border-radius:8px;font-weight:600;cursor:pointer;transition:all 0.2s;font-size:0.85rem;">
      ${d.i} ${d.n}
    </button>
  `).join('');

  const deptBills = _state.cheltuieli.filter(b => b.dept === dept);
  const mTotal = deptBills.reduce((s, b) => s + (b.months[m]?.r || 0), 0);
  const yTotal = deptBills.reduce((s, b) =>
    s + Object.values(b.months).reduce((ss, row) => ss + (row.r || 0), 0), 0);

  let html = `
    <div style="display:flex;flex-wrap:wrap;gap:0.75rem;margin-bottom:1.5rem;">${deptBtns}</div>
    ${_monthSelector()}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem;">
      <div style="background:#f8fafc;border:2px solid #3b82f6;border-radius:12px;padding:1.25rem;text-align:center;">
        <div style="color:#64748b;font-size:0.75rem;font-weight:600;margin-bottom:0.4rem;">${months[m].toUpperCase()}</div>
        <div style="font-size:1.5rem;font-weight:800;color:#3b82f6;">${fmt(mTotal)} RON</div>
      </div>
      <div style="background:#f8fafc;border:2px solid #ef4444;border-radius:12px;padding:1.25rem;text-align:center;">
        <div style="color:#64748b;font-size:0.75rem;font-weight:600;margin-bottom:0.4rem;">TOTAL ANUAL</div>
        <div style="font-size:1.5rem;font-weight:800;color:#ef4444;">${fmt(yTotal)} RON</div>
      </div>
    </div>
    <div style="background:#fff;border-radius:12px;padding:1.5rem;border:2px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;">
        <h3 style="font-size:1.25rem;font-weight:800;color:#c84040;">${cheltuieliDepts.find(d=>d.id===dept)?.i} ${cheltuieliDepts.find(d=>d.id===dept)?.n}</h3>
        <button onclick="window._finAddChelt('${dept}')" style="padding:0.6rem 1.25rem;background:#c84040;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">+ Factură Nouă</button>
      </div>
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 48px;gap:0.75rem;padding:0.75rem;background:#e2e8f0;border-radius:8px;margin-bottom:0.75rem;font-size:0.8rem;font-weight:700;color:#475569;">
        <div>FACTURĂ</div><div style="text-align:right;">PLANIFICAT</div><div style="text-align:right;">REALIZAT</div>
        <div style="text-align:right;">DIF (P−R) 🟢/🟡/🔴</div><div></div>
      </div>
  `;

  deptBills.forEach(bill => {
    const row = bill.months[m] || { p: 0, r: 0 };
    const dif = row.p - row.r;  // megtakarítás pozitív
    const pct = row.p > 0 ? (dif / row.p) * 100 : 0;
    let dc;
    if (Math.abs(pct) <= 5) dc = { color:'#f59e0b', bg:'rgba(245,158,11,0.15)', border:'rgba(245,158,11,0.4)' };
    else dc = difColor(dif);
    const yBill = Object.values(bill.months).reduce((s,r) => s+(r.r||0), 0);

    html += `
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 48px;gap:0.75rem;padding:0.75rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:0.5rem;align-items:center;">
        <div>
          <input type="text" value="${bill.name}" placeholder="Nume factură..."
            onchange="window._finSaveCheltName('${bill._key}',this.value)"
            style="width:100%;padding:0.5rem;border:2px solid #e2e8f0;border-radius:6px;font-size:0.9rem;font-weight:600;">
          <div style="font-size:0.7rem;color:#94a3b8;margin-top:0.2rem;">Anual: ${fmt(yBill)} RON</div>
        </div>
        <input type="number" value="${row.p}"
          onchange="window._finSaveChelt('${bill._key}',${m},'p',this.value)"
          style="padding:0.5rem;text-align:right;border:2px solid #e2e8f0;border-radius:6px;font-weight:700;">
        <input type="number" value="${row.r}"
          onchange="window._finSaveChelt('${bill._key}',${m},'r',this.value)"
          style="padding:0.5rem;text-align:right;border:2px solid #e2e8f0;border-radius:6px;font-weight:700;">
        <div style="padding:0.5rem;background:${dc.bg};border:1px solid ${dc.border};border-radius:6px;color:${dc.color};font-weight:800;text-align:right;">
          ${dif>=0?'+':''}${fmt(dif)}
        </div>
        <button onclick="window._finDelChelt('${bill._key}')"
          style="padding:0.4rem;background:#fee2e2;border:none;border-radius:6px;cursor:pointer;font-size:1rem;">🗑️</button>
      </div>
    `;
  });

  if (deptBills.length === 0) {
    html += `<div style="text-align:center;padding:2.5rem;color:#94a3b8;font-style:italic;">Nu există facturi</div>`;
  }
  html += `</div>`;
  container.innerHTML = html;
};
window._finSetDept = d => { _state.dept = d; renderCheltuieli(); };

// ─────────────────────────────────────────────────────────────
// RENDER: SALARII
// ─────────────────────────────────────────────────────────────
const renderSalarii = () => {
  const container = document.getElementById('fin-salarii');
  if (!container) return;
  const { months } = FINANCE_CONFIG;
  const m = _state.month;

  // Éves összesítők
  const yOre   = _state.salarii.reduce((s,e) => s + Object.values(e.months).reduce((ss,mo) => ss+(mo.oreR||0), 0), 0);
  const yVenit  = _state.salarii.reduce((s,e) => s + Object.values(e.months).reduce((ss,mo) => ss+(mo.venitR||0), 0), 0);
  const yTotalCost = _state.salarii.reduce((s,e) => s + Object.values(e.months).reduce((ss,mo) =>
    ss+(mo.salR||0)+(mo.bonR||0)+(mo.alteBon||0)+(mo.cardAv||0)+(mo.taxeR||0), 0), 0);
  const yProfit = yVenit - yTotalCost;
  const profPct = yVenit > 0 ? (yProfit / yVenit) * 100 : 0;
  const profC = profPct > 5 ? '#10b981' : profPct < -5 ? '#ef4444' : '#f59e0b';
  const profBg = profPct > 5 ? 'rgba(16,185,129,0.15)' : profPct < -5 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)';

  let html = `
    ${_monthSelector()}
    <!-- Éves statisztika kártyák -->
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:1rem;margin-bottom:1.5rem;">
      ${[
        ['NR. ORE', fmt(yOre), '#3b82f6', '12 luni'],
        ['VENIT',   fmt(yVenit)+' RON', '#06b6d4', 'Anual'],
        ['CHELTUIELI', fmt(yTotalCost)+' RON', '#ef4444', 'Anual'],
        ['PROFIT', (yProfit>=0?'+':'')+fmt(yProfit)+' RON', yProfit>=0?'#10b981':'#ef4444', 'Anual'],
        ['PROFIT %', (profPct>=0?'+':'')+profPct.toFixed(1)+'%', profC, profPct>5?'🟢 Excelent':profPct<-5?'🔴 Pierdere':'🟡 Neutru'],
      ].map(([lbl,val,c,sub]) => `
        <div style="background:#fff;border:2px solid ${c}44;border-radius:12px;padding:1.25rem;text-align:center;">
          <div style="color:#64748b;font-size:0.75rem;font-weight:600;margin-bottom:0.4rem;">${lbl}</div>
          <div style="font-size:1.25rem;font-weight:800;color:${c};">${val}</div>
          <div style="font-size:0.7rem;color:#94a3b8;margin-top:0.2rem;">${sub}</div>
        </div>
      `).join('')}
    </div>

    <!-- Editare angajați -->
    <div style="background:#fff;border-radius:12px;padding:1.5rem;border:2px solid #e2e8f0;margin-bottom:1.5rem;overflow-x:auto;">
      <h3 style="color:#c84040;margin-bottom:1.25rem;font-size:1.25rem;">✏️ ${months[m]} — Date Angajați</h3>
      <div style="min-width:1400px;">
        <div style="display:grid;grid-template-columns:160px 110px 75px 75px 100px 90px 85px 85px 85px 85px 70px 70px 100px;gap:0.4rem;padding:0.6rem;background:#e2e8f0;border-radius:8px;margin-bottom:0.6rem;font-size:0.72rem;font-weight:700;color:#475569;text-transform:uppercase;">
          <div>Nume</div><div>Funcție</div><div>Ore P</div><div>Ore R</div><div>Venit R</div>
          <div>Salariu</div><div>Bonif</div><div>Alte B</div><div>Card Av</div><div>Taxe</div>
          <div>Z.Plan</div><div>Z.Real</div><div>PROFIT</div>
        </div>
  `;

  _state.salarii.forEach(emp => {
    const row = emp.months[m];
    const totalCost = (row.salR||0)+(row.bonR||0)+(row.alteBon||0)+(row.cardAv||0)+(row.taxeR||0);
    const profit = (row.venitR||0) - totalCost;
    const pc = difColor(profit);
    const oreColor = (row.oreR||0) > 140 ? '#10b981' : (row.oreR||0) === 140 ? '#f59e0b' : '#ef4444';

    html += `
      <div style="display:grid;grid-template-columns:160px 110px 75px 75px 100px 90px 85px 85px 85px 85px 70px 70px 100px;gap:0.4rem;padding:0.6rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:0.4rem;align-items:center;">
        <div style="font-weight:700;font-size:0.85rem;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${emp.name}">${emp.name}</div>
        <div style="font-size:0.8rem;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${emp.functie||''}</div>
        ${['oreP','oreR','venitR','salR','bonR','alteBon','cardAv','taxeR','zileP','zileR'].map(f => `
          <input type="number" step="any" value="${row[f]||0}"
            onchange="window._finSaveSal('${emp.employee_id}','${f}',this.value)"
            style="padding:0.4rem;font-size:0.85rem;font-weight:700;text-align:right;border:2px solid ${f==='oreR'?oreColor+'88':'#e2e8f0'};border-radius:6px;color:#1e293b;width:100%;background:#fff;">
        `).join('')}
        <div style="padding:0.4rem;background:${pc.bg};border:1px solid ${pc.border};border-radius:6px;color:${pc.color};font-weight:800;font-size:0.85rem;text-align:right;">
          ${profit>=0?'+':''}${fmt(profit)}
        </div>
      </div>
    `;
  });

  html += `</div></div>`;

  if (_state.showAnnual) html += _renderSalAnnualTable();
  container.innerHTML = html;
};

const _renderSalAnnualTable = () => {
  const { months } = FINANCE_CONFIG;
  return `
    <div style="background:#fff;border-radius:12px;padding:1.5rem;border:2px solid #e2e8f0;">
      <h3 style="color:#c84040;margin-bottom:1.25rem;font-size:1.25rem;">📊 Raport Anual Angajați</h3>
      ${_state.salarii.map(emp => {
        const yV = Object.values(emp.months).reduce((s,m) => s+(m.venitR||0), 0);
        const yC = Object.values(emp.months).reduce((s,m) => s+(m.salR||0)+(m.bonR||0)+(m.alteBon||0)+(m.cardAv||0)+(m.taxeR||0), 0);
        const yP = yV - yC;
        return `
          <div style="background:#f8fafc;border-radius:10px;padding:1.25rem;margin-bottom:1.25rem;border:2px solid #e2e8f0;">
            <h4 style="color:#c84040;margin-bottom:0.75rem;">${emp.name} — ${emp.functie||''}</h4>
            <table style="width:100%;border-collapse:collapse;">
              <thead><tr style="background:#e2e8f0;">
                ${['Luna','Ore','Venit','Salariu','Bonif','Alte B','Card','Taxe','COST','PROFIT'].map(h =>
                  `<th style="padding:0.5rem;font-size:0.75rem;color:#475569;text-align:right;${h==='Luna'?'text-align:left;':''}">${h}</th>`
                ).join('')}
              </tr></thead>
              <tbody>
                ${months.map((mn, i) => {
                  const r = emp.months[i];
                  const cost = (r.salR||0)+(r.bonR||0)+(r.alteBon||0)+(r.cardAv||0)+(r.taxeR||0);
                  const prof = (r.venitR||0) - cost;
                  return `<tr style="background:${i%2===0?'#fff':'#f8fafc'};border-bottom:1px solid #e2e8f0;">
                    <td style="padding:0.4rem;color:#64748b;font-weight:600;">${mn}</td>
                    <td style="padding:0.4rem;text-align:right;color:#3b82f6;">${r.oreR||0}</td>
                    <td style="padding:0.4rem;text-align:right;color:#06b6d4;font-weight:700;">${fmt(r.venitR)}</td>
                    <td style="padding:0.4rem;text-align:right;color:#94a3b8;">${fmt(r.salR)}</td>
                    <td style="padding:0.4rem;text-align:right;color:#94a3b8;">${fmt(r.bonR)}</td>
                    <td style="padding:0.4rem;text-align:right;color:#94a3b8;">${fmt(r.alteBon)}</td>
                    <td style="padding:0.4rem;text-align:right;color:#94a3b8;">${fmt(r.cardAv)}</td>
                    <td style="padding:0.4rem;text-align:right;color:#94a3b8;">${fmt(r.taxeR)}</td>
                    <td style="padding:0.4rem;text-align:right;color:#ef4444;font-weight:700;">${fmt(cost)}</td>
                    <td style="padding:0.4rem;text-align:right;color:${prof>=0?'#10b981':'#ef4444'};font-weight:800;">${prof>=0?'+':''}${fmt(prof)}</td>
                  </tr>`;
                }).join('')}
                <tr style="background:#e2e8f0;font-weight:800;">
                  <td style="padding:0.6rem;">TOTAL</td>
                  <td style="padding:0.6rem;text-align:right;color:#3b82f6;">${Object.values(emp.months).reduce((s,m)=>s+(m.oreR||0),0)}</td>
                  <td style="padding:0.6rem;text-align:right;color:#06b6d4;">${fmt(yV)}</td>
                  <td colspan="5" style="padding:0.6rem;text-align:center;color:#94a3b8;">—</td>
                  <td style="padding:0.6rem;text-align:right;color:#ef4444;">${fmt(yC)}</td>
                  <td style="padding:0.6rem;text-align:right;color:${yP>=0?'#10b981':'#ef4444'};font-size:1rem;">${yP>=0?'+':''}${fmt(yP)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        `;
      }).join('')}
    </div>
  `;
};

// ─────────────────────────────────────────────────────────────
// RENDER: CASH FLOW
// ─────────────────────────────────────────────────────────────
const renderCashFlow = () => {
  const container = document.getElementById('fin-cashflow');
  if (!container) return;
  const { months, cashflowCats } = FINANCE_CONFIG;
  const m = _state.month;

  const mTotFe  = cashflowCats.reduce((s, cat) => s + (_state.cashflow[cat.id]?.[m]?.emis||0), 0);
  const mTotInc = cashflowCats.reduce((s, cat) => s + (_state.cashflow[cat.id]?.[m]?.inc||0),  0);
  const mDif    = mTotInc - mTotFe;
  const yTotFe  = cashflowCats.reduce((s,cat) => s + Object.values(_state.cashflow[cat.id]||{}).reduce((ss,r)=>ss+(r.emis||0),0), 0);
  const yTotInc = cashflowCats.reduce((s,cat) => s + Object.values(_state.cashflow[cat.id]||{}).reduce((ss,r)=>ss+(r.inc||0),0), 0);
  const yDif    = yTotInc - yTotFe;

  let html = `
    ${_monthSelector()}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.25rem;margin-bottom:1.5rem;">
      <div style="background:rgba(59,130,246,0.1);border:2px solid rgba(59,130,246,0.4);border-radius:12px;padding:1.25rem;text-align:center;">
        <div style="color:#64748b;font-size:0.75rem;font-weight:600;">EMISE ${months[m].toUpperCase()}</div>
        <div style="font-size:1.5rem;font-weight:800;color:#3b82f6;">${fmt(mTotFe)} RON</div>
      </div>
      <div style="background:rgba(16,185,129,0.1);border:2px solid rgba(16,185,129,0.4);border-radius:12px;padding:1.25rem;text-align:center;">
        <div style="color:#64748b;font-size:0.75rem;font-weight:600;">ÎNCASATE ${months[m].toUpperCase()}</div>
        <div style="font-size:1.5rem;font-weight:800;color:#10b981;">${fmt(mTotInc)} RON</div>
      </div>
      <div style="background:${mDif>=0?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)'};border:2px solid ${mDif>=0?'rgba(16,185,129,0.4)':'rgba(239,68,68,0.4)'};border-radius:12px;padding:1.25rem;text-align:center;">
        <div style="color:#64748b;font-size:0.75rem;font-weight:600;">DIFERENȚĂ ${months[m].toUpperCase()}</div>
        <div style="font-size:1.5rem;font-weight:800;color:${mDif>=0?'#10b981':'#ef4444'};">${mDif>=0?'+':''}${fmt(mDif)} RON</div>
      </div>
    </div>
    <!-- Anual summary -->
    <div style="background:#fff;border-radius:12px;padding:1.25rem;margin-bottom:1.5rem;border:2px solid #e2e8f0;">
      <div style="color:#64748b;font-size:0.8rem;font-weight:700;margin-bottom:1rem;">RAPORT ANUAL (12 LUNI)</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;">
        <div style="text-align:center;padding:1rem;background:rgba(59,130,246,0.08);border-radius:8px;">
          <div style="color:#94a3b8;font-size:0.75rem;">Total Emise</div>
          <div style="color:#3b82f6;font-weight:800;font-size:1.1rem;">${fmt(yTotFe)} RON</div>
        </div>
        <div style="text-align:center;padding:1rem;background:rgba(16,185,129,0.08);border-radius:8px;">
          <div style="color:#94a3b8;font-size:0.75rem;">Total Încasate</div>
          <div style="color:#10b981;font-weight:800;font-size:1.1rem;">${fmt(yTotInc)} RON</div>
        </div>
        <div style="text-align:center;padding:1rem;background:${yDif>=0?'rgba(16,185,129,0.08)':'rgba(239,68,68,0.08)'};border-radius:8px;">
          <div style="color:#94a3b8;font-size:0.75rem;">Diferență Anuală</div>
          <div style="color:${yDif>=0?'#10b981':'#ef4444'};font-weight:800;font-size:1.1rem;">${yDif>=0?'+':''}${fmt(yDif)} RON</div>
        </div>
      </div>
    </div>
  `;

  cashflowCats.forEach(cat => {
    const row = _state.cashflow[cat.id]?.[m] || { emis: 0, inc: 0 };
    const dif = row.inc - row.emis;
    const dc  = difColor(dif);
    const yInc = Object.values(_state.cashflow[cat.id]||{}).reduce((s,r)=>s+(r.inc||0),0);
    html += `
      <div style="display:grid;grid-template-columns:auto 1fr 200px 200px 160px;gap:1rem;padding:1rem;background:#fff;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:0.75rem;align-items:center;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
        <div style="width:44px;height:44px;background:${cat.c}18;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.4rem;">${cat.i}</div>
        <div>
          <div style="color:${cat.c};font-size:1rem;font-weight:700;">${cat.n}</div>
          <div style="color:#94a3b8;font-size:0.75rem;">Anual încasat: ${fmt(yInc)} RON</div>
        </div>
        <div>
          <label style="display:block;color:#64748b;font-size:0.7rem;font-weight:600;margin-bottom:0.3rem;">EMISE</label>
          <input type="number" value="${row.emis}"
            onchange="window._finSaveCF('${cat.id}','emis',this.value)"
            style="width:100%;padding:0.6rem;border:2px solid rgba(59,130,246,0.4);border-radius:8px;font-weight:700;text-align:right;outline:none;">
        </div>
        <div>
          <label style="display:block;color:#64748b;font-size:0.7rem;font-weight:600;margin-bottom:0.3rem;">ÎNCASATE</label>
          <input type="number" value="${row.inc}"
            onchange="window._finSaveCF('${cat.id}','inc',this.value)"
            style="width:100%;padding:0.6rem;border:2px solid rgba(16,185,129,0.4);border-radius:8px;font-weight:700;text-align:right;outline:none;">
        </div>
        <div style="padding:0.75rem;background:${dc.bg};border:1px solid ${dc.border};border-radius:8px;color:${dc.color};font-weight:800;text-align:right;font-size:1.1rem;">
          ${dif>=0?'+':''}${fmt(dif)}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
};

// ─────────────────────────────────────────────────────────────
// RENDER: ÉVZÁRÁS
// ─────────────────────────────────────────────────────────────
const renderEvzaras = () => {
  const container = document.getElementById('fin-evzaras');
  if (!container) return;
  const { months, expectedAnnualHours } = FINANCE_CONFIG;
  const { tvr12, tcostr12, er12 } = calcTotals();
  const profit = tvr12 - tcostr12;
  const margin = tvr12 > 0 ? (profit / tvr12) * 100 : 0;
  const pc = difColor(profit);

  let html = `
    <div style="background:linear-gradient(135deg,#1e293b,#334155);border-radius:12px;padding:2.5rem;margin-bottom:2rem;text-align:center;color:#fff;">
      <div style="font-size:1.5rem;font-weight:800;margin-bottom:0.5rem;">📋 ÉVZÁRÁS — ${_state.year}</div>
      <div style="font-size:0.9rem;color:#94a3b8;">Raport Financiar Complet</div>
    </div>

    <!-- P&L Summary -->
    <div style="background:#fff;border-radius:12px;padding:2rem;margin-bottom:1.5rem;border:2px solid rgba(59,130,246,0.3);">
      <h3 style="color:#3b82f6;font-size:1.25rem;margin-bottom:1.5rem;">1️⃣ Situație Financiară Generală</h3>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;">
        <div style="background:rgba(16,185,129,0.1);border:2px solid rgba(16,185,129,0.4);border-radius:12px;padding:1.5rem;text-align:center;">
          <div style="color:#94a3b8;font-size:0.8rem;margin-bottom:0.5rem;">💰 VENITURI ANUALE</div>
          <div style="font-size:2rem;font-weight:800;color:#10b981;">${fmt(tvr12)} RON</div>
        </div>
        <div style="background:rgba(239,68,68,0.1);border:2px solid rgba(239,68,68,0.4);border-radius:12px;padding:1.5rem;text-align:center;">
          <div style="color:#94a3b8;font-size:0.8rem;margin-bottom:0.5rem;">💸 COSTURI ANUALE</div>
          <div style="font-size:2rem;font-weight:800;color:#ef4444;">${fmt(tcostr12)} RON</div>
        </div>
        <div style="background:${pc.bg};border:2px solid ${pc.border};border-radius:12px;padding:1.5rem;text-align:center;">
          <div style="color:#94a3b8;font-size:0.8rem;margin-bottom:0.5rem;">${profit>=0?'✅ PROFIT':'⚠️ PIERDERE'}</div>
          <div style="font-size:2rem;font-weight:800;color:${pc.color};">${profit>=0?'+':''}${fmt(profit)} RON</div>
          <div style="color:#94a3b8;font-size:0.75rem;margin-top:0.5rem;">Marjă: <strong style="color:${pc.color};">${margin.toFixed(1)}%</strong></div>
        </div>
      </div>
    </div>

    <!-- Lunar bontás -->
    <div style="background:#fff;border-radius:12px;padding:2rem;margin-bottom:1.5rem;border:2px solid rgba(245,158,11,0.3);">
      <h3 style="color:#f59e0b;font-size:1.25rem;margin-bottom:1.5rem;">2️⃣ Evoluție Lunară</h3>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr style="background:#e2e8f0;">
            <th style="padding:0.75rem;text-align:left;font-size:0.8rem;color:#475569;">Luna</th>
            <th style="padding:0.75rem;text-align:right;font-size:0.8rem;color:#475569;">Venituri</th>
            <th style="padding:0.75rem;text-align:right;font-size:0.8rem;color:#475569;">Costuri</th>
            <th style="padding:0.75rem;text-align:right;font-size:0.8rem;color:#475569;">Profit</th>
            <th style="padding:0.75rem;text-align:right;font-size:0.8rem;color:#475569;">Marjă%</th>
          </tr></thead>
          <tbody>
            ${months.map((mn, i) => {
              const mV = FINANCE_CONFIG.venituriCats.reduce((s,c) => s+(_state.venituri[c.id]?.[i]?.real||0), 0);
              const mChelt = _state.cheltuieli.reduce((s,b) => s+(b.months[i]?.r||0), 0);
              const mSal   = _state.salarii.reduce((s,e) => {
                const r = e.months[i];
                return s+(r.salR||0)+(r.bonR||0)+(r.alteBon||0)+(r.cardAv||0)+(r.taxeR||0);
              }, 0);
              const mC = mChelt + mSal;
              const mP = mV - mC;
              const mM = mV > 0 ? (mP/mV*100) : 0;
              const pc2 = difColor(mP);
              return `<tr style="background:${i%2===0?'#fff':'#f8fafc'};border-bottom:1px solid #e2e8f0;">
                <td style="padding:0.65rem;color:#64748b;font-weight:600;">${mn}</td>
                <td style="padding:0.65rem;text-align:right;color:#10b981;font-weight:700;">${fmt(mV)}</td>
                <td style="padding:0.65rem;text-align:right;color:#ef4444;">${fmt(mC)}</td>
                <td style="padding:0.65rem;text-align:right;color:${pc2.color};font-weight:800;">${mP>=0?'+':''}${fmt(mP)}</td>
                <td style="padding:0.65rem;text-align:right;color:${pc2.color};font-weight:700;">${mM.toFixed(1)}%</td>
              </tr>`;
            }).join('')}
            <tr style="background:#c84040;color:#fff;font-weight:800;">
              <td style="padding:0.75rem;">TOTAL ${_state.year}</td>
              <td style="padding:0.75rem;text-align:right;">${fmt(tvr12)}</td>
              <td style="padding:0.75rem;text-align:right;">${fmt(tcostr12)}</td>
              <td style="padding:0.75rem;text-align:right;">${profit>=0?'+':''}${fmt(profit)}</td>
              <td style="padding:0.75rem;text-align:right;">${margin.toFixed(1)}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Teljesítmény angajați -->
    <div style="background:#fff;border-radius:12px;padding:2rem;border:2px solid rgba(139,92,246,0.3);">
      <h3 style="color:#8b5cf6;font-size:1.25rem;margin-bottom:1rem;">3️⃣ Producție pe Angajați (${expectedAnnualHours}h așteptate/an)</h3>
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 80px;gap:0.75rem;padding:0.75rem;background:#e2e8f0;border-radius:8px;margin-bottom:0.75rem;font-size:0.8rem;font-weight:700;color:#475569;">
        <div>Angajat</div><div style="text-align:right;">Ore Așteptate</div><div style="text-align:right;">Ore Lucrate</div>
        <div style="text-align:right;">Diferență</div><div style="text-align:center;">% Realizare</div><div style="text-align:center;">Status</div>
      </div>
      ${_state.salarii.map(emp => {
        const oreLuc = Object.values(emp.months).reduce((s,m) => s+(m.oreR||0), 0);
        const difOre = oreLuc - expectedAnnualHours;
        const pct    = (oreLuc / expectedAnnualHours) * 100;
        const sc     = pct > 100 ? '#10b981' : pct >= 95 ? '#f59e0b' : '#ef4444';
        const si     = pct > 100 ? '🟢' : pct >= 95 ? '🟡' : '🔴';
        return `
          <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 80px;gap:0.75rem;padding:0.75rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:0.5rem;align-items:center;">
            <div style="font-weight:700;color:#1e293b;">${emp.name}</div>
            <div style="text-align:right;color:#94a3b8;">${fmt(expectedAnnualHours)} h</div>
            <div style="text-align:right;color:${sc};font-weight:800;">${fmt(oreLuc)} h</div>
            <div style="text-align:right;color:${difOre>=0?'#10b981':'#ef4444'};font-weight:800;">${difOre>=0?'+':''}${fmt(difOre)} h</div>
            <div style="text-align:center;padding:0.4rem;background:${sc}22;border-radius:6px;color:${sc};font-weight:800;">${pct.toFixed(1)}%</div>
            <div style="text-align:center;font-size:1.5rem;">${si}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  container.innerHTML = html;
};

// ─────────────────────────────────────────────────────────────
// SEGÉD: HÓNAP SELECTOR + ÉVES TOGGLE
// ─────────────────────────────────────────────────────────────
const _monthSelector = () => {
  const { months } = FINANCE_CONFIG;
  return `
    <div style="background:#fff;padding:1rem 1.25rem;border-radius:10px;border:2px solid #e2e8f0;margin-bottom:1.25rem;display:flex;justify-content:space-between;align-items:center;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
      <div style="display:flex;align-items:center;gap:0.75rem;">
        <label style="color:#64748b;font-size:0.875rem;font-weight:700;">Luna:</label>
        <select onchange="window._finSetMonth(parseInt(this.value))"
          style="padding:0.6rem 1rem;font-size:0.9rem;border-radius:8px;border:2px solid #e2e8f0;background:#fff;min-width:160px;">
          ${months.map((mn, i) => `<option value="${i}" ${i===_state.month?'selected':''}>${mn}</option>`).join('')}
        </select>
      </div>
      <button onclick="window._finToggleAnnual()"
        style="padding:0.6rem 1.25rem;background:${_state.showAnnual?'#c84040':'#f1f5f9'};color:${_state.showAnnual?'#fff':'#475569'};border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:0.875rem;">
        ${_state.showAnnual ? '📅 Vedere Lunară' : '📊 Vedere Anuală'}
      </button>
    </div>
  `;
};

// ─────────────────────────────────────────────────────────────
// NAVIGÁCIÓ
// ─────────────────────────────────────────────────────────────
window._finSetMonth = m => {
  _state.month = m;
  renderFinancePage();
};

window._finToggleAnnual = () => {
  _state.showAnnual = !_state.showAnnual;
  renderFinancePage();
};

window._finSetPage = async page => {
  _state.page = page;
  // Frissítsd a nav gombokat
  document.querySelectorAll('[data-fin-nav]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.finNav === page);
  });
  document.querySelectorAll('[data-fin-page]').forEach(p => {
    p.style.display = p.dataset.finPage === page ? 'block' : 'none';
  });
  renderFinancePage();
};

window._finSetYear = async y => {
  _state.year = parseInt(y);
  await loadFinanceData();
  renderFinancePage();
};

// ─────────────────────────────────────────────────────────────
// MASTER RENDER
// ─────────────────────────────────────────────────────────────
export const renderFinancePage = () => {
  renderFinanceSumar(); // Sumar mindig frissül
  switch (_state.page) {
    case 'venituri':    renderVenituri();   break;
    case 'cheltuieli':  renderCheltuieli(); break;
    case 'salarii':     renderSalarii();    break;
    case 'cashflow':    renderCashFlow();   break;
    case 'evzaras':     renderEvzaras();    break;
  }
};

// ─────────────────────────────────────────────────────────────
// HTML SABLON — ezt illeszd be az index.html-be
// ─────────────────────────────────────────────────────────────
export const getFinanceTabHTML = () => `
  <!-- ═══════════════════════════════════════════════════════
       FINANCE TAB — RedAssistance v2
       Illesszd be az index.html fő tab-szekciójába
  ════════════════════════════════════════════════════════ -->
  <div id="tab-finance" class="tab-content" style="display:none;">

    <!-- Finance nav -->
    <div style="display:flex;gap:0.75rem;flex-wrap:wrap;background:#fff;padding:0.75rem;border-radius:12px;margin-bottom:1.5rem;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      ${[
        ['sumar','📊 Sumar'],['venituri','💰 Venituri'],['cheltuieli','💸 Cheltuieli'],
        ['salarii','👥 Salarii'],['cashflow','💵 Cash Flow'],['evzaras','📋 Évzárás'],
      ].map(([id, label]) => `
        <button data-fin-nav="${id}" onclick="window._finSetPage('${id}')"
          style="flex:1 1 auto;min-width:100px;padding:0.75rem 1rem;font-size:0.875rem;font-weight:600;background:transparent;color:#64748b;border:none;border-radius:8px;cursor:pointer;transition:all 0.2s;"
          class="${id==='sumar'?'active':''}">
          ${label}
        </button>
      `).join('')}
      <!-- Év választó -->
      <select onchange="window._finSetYear(this.value)"
        style="padding:0.65rem 1rem;border:2px solid #e2e8f0;border-radius:8px;font-weight:700;color:#1e293b;background:#fff;outline:none;">
        ${[new Date().getFullYear()-1, new Date().getFullYear(), new Date().getFullYear()+1].map(y =>
          `<option value="${y}" ${y===new Date().getFullYear()?'selected':''}>${y}</option>`
        ).join('')}
      </select>
    </div>

    <!-- Sumar (always visible) -->
    <div id="fin-sumar" style="margin-bottom:1.5rem;"></div>

    <!-- Sub-pages -->
    <div data-fin-page="venituri"   id="fin-venituri"   style="display:none;"></div>
    <div data-fin-page="cheltuieli" id="fin-cheltuieli" style="display:none;"></div>
    <div data-fin-page="salarii"    id="fin-salarii"    style="display:none;"></div>
    <div data-fin-page="cashflow"   id="fin-cashflow"   style="display:none;"></div>
    <div data-fin-page="evzaras"    id="fin-evzaras"    style="display:none;"></div>
  </div>
`;

// ─────────────────────────────────────────────────────────────
// INIT — hívd meg az index.html betöltésekor
// ─────────────────────────────────────────────────────────────
export const initFinance = async () => {
  _state.month = new Date().getMonth();
  _state.year  = new Date().getFullYear();
  _state.page  = 'sumar';
  await loadFinanceData();
  renderFinancePage();
  // Nav active state CSS
  const style = document.createElement('style');
  style.textContent = `
    [data-fin-nav].active { background:#c84040 !important; color:#fff !important; box-shadow:0 2px 8px rgba(200,64,64,0.2); }
    [data-fin-nav]:hover:not(.active) { color:#c84040 !important; }
  `;
  document.head.appendChild(style);
};
