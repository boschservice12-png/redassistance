// ============================================================
// js/api.js — Minden Supabase hívás ITT van. Máshol nincs.
// ============================================================

import { SB_URL, SB_KEY } from './config.js';
import { set, get } from './state.js';

// Supabase kliens (UMD build — CDN-ről töltve az index.html-ben)
export const sb = window.supabase.createClient(SB_URL, SB_KEY);

// ── Auth ──────────────────────────────────────────────────────

export async function loginAdmin(username, password) {
  const { data: admin, error } = await sb
    .from('admins').select('*')
    .eq('username', username).eq('password', password)
    .eq('is_active', true).single();
  if (error || !admin) throw new Error('Hibás belépési adatok');

  const { data: shop } = await sb
    .from('shops').select('*')
    .eq('id', admin.shop_id).eq('is_active', true).single();
  if (!shop) throw new Error('Szerviz nem található');

  return { admin, shop };
}

export async function loginWorker(pin) {
  const shopId = get('curShop')?.id;
  if (!shopId) throw new Error('Nincs szerviz kiválasztva');

  const { data: emp, error } = await sb
    .from('employees').select('*')
    .eq('pin_code', pin).eq('shop_id', shopId)
    .eq('is_active', true).single();
  if (error || !emp) throw new Error('Hibás PIN');
  return emp;
}

// ── Jobs ──────────────────────────────────────────────────────

export async function fetchJobs(shopId, dateFilter) {
  let q = sb.from('jobs')
    .select('*, employees(name, role, hourly_rate, department)')
    .eq('shop_id', shopId)
    .order('start_time', { ascending: true });

  if (dateFilter.type === 'daily')   q = q.eq('date', dateFilter.date);
  if (dateFilter.type === 'weekly')  q = q.gte('date', dateFilter.from).lte('date', dateFilter.to);
  if (dateFilter.type === 'monthly') q = q.gte('date', dateFilter.from).lte('date', dateFilter.to);
  if (dateFilter.type === 'yearly')  q = q.gte('date', dateFilter.from).lte('date', dateFilter.to);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function saveJob(payload, id = null) {
  const { data, error } = id
    ? await sb.from('jobs').update(payload).eq('id', id).select().single()
    : await sb.from('jobs').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function deleteJob(id) {
  const { error } = await sb.from('jobs').delete().eq('id', id);
  if (error) throw error;
}

// ── Státusz váltás (Feature 1 + 2) ────────────────────────────

export async function advanceStatus(jobId, newStatus, extra = {}) {
  const payload = {
    status: newStatus,
    status_updated_at: new Date().toISOString(),
    status_updated_by: get('curAdmin')?.username || get('curEmployee')?.name || 'system',
    ...extra,
  };
  return saveJob(payload, jobId);
}

// ── Employees ─────────────────────────────────────────────────

export async function fetchEmployees(shopId) {
  const { data, error } = await sb
    .from('employees').select('*')
    .eq('shop_id', shopId).eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function saveEmployee(payload, id = null) {
  const { data, error } = id
    ? await sb.from('employees').update(payload).eq('id', id).select().single()
    : await sb.from('employees').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function softDeleteEmployee(id) {
  const { error } = await sb.from('employees').update({ is_active: false }).eq('id', id);
  if (error) throw error;
}

// ── Tools ─────────────────────────────────────────────────────

export async function fetchTools(shopId) {
  const [cats, items] = await Promise.all([
    sb.from('tool_categories').select('*').eq('shop_id', shopId).order('sort_order'),
    sb.from('tools').select('*, tool_categories(name, icon)').eq('shop_id', shopId).eq('is_active', true).order('name'),
  ]);
  return { cats: cats.data || [], items: items.data || [] };
}

// ── Coverage (Feature 3) ──────────────────────────────────────

export async function fetchCoverageTargets(shopId) {
  const { data, error } = await sb
    .from('coverage_targets').select('*')
    .eq('shop_id', shopId);
  if (error) throw error;
  return data || [];
}

export async function saveCoverageTarget(payload, id = null) {
  const { data, error } = id
    ? await sb.from('coverage_targets').update(payload).eq('id', id).select().single()
    : await sb.from('coverage_targets').insert(payload).select().single();
  if (error) throw error;
  return data;
}

// ── HR Documents (Feature 4) ──────────────────────────────────

export async function fetchHrDocs(shopId, filters = {}) {
  let q = sb.from('hr_documents').select(`
    *, employees(name, department)
  `).eq('shop_id', shopId).eq('is_active', true).order('created_at', { ascending: false });

  if (filters.docType)    q = q.eq('doc_type', filters.docType);
  if (filters.employeeId) q = q.or(`employee_id.eq.${filters.employeeId},employee_id.is.null`);
  if (filters.department) q = q.or(`department.eq.${filters.department},department.is.null`);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function saveHrDoc(payload, id = null) {
  const { data, error } = id
    ? await sb.from('hr_documents').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    : await sb.from('hr_documents').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function archiveHrDoc(id) {
  const { error } = await sb.from('hr_documents').update({ is_active: false }).eq('id', id);
  if (error) throw error;
}

export async function markDocRead(documentId, employeeId) {
  const { error } = await sb.from('hr_document_reads')
    .upsert({ document_id: documentId, employee_id: employeeId, read_at: new Date().toISOString() });
  if (error) throw error;
}

export async function fetchDocReads(shopId, employeeId = null) {
  let q = sb.from('hr_document_reads').select('*, hr_documents!inner(shop_id, title)');
  if (employeeId) q = q.eq('employee_id', employeeId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

// ── Warranty Feedback ─────────────────────────────────────────

export async function saveWarrantyFeedback(payload) {
  const { data, error } = await sb.from('warranty_feedback').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function fetchWarrantyFeedback(shopId) {
  const { data, error } = await sb
    .from('warranty_feedback')
    .select('*, jobs(title, date), employees(name)')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ── Bulk load ─────────────────────────────────────────────────

export async function loadAll(shopId, dateFilter) {
  const [jobs, emps, coverage, hrDocs] = await Promise.all([
    fetchJobs(shopId, dateFilter),
    fetchEmployees(shopId),
    fetchCoverageTargets(shopId),
    fetchHrDocs(shopId),
  ]);
  return { jobs, emps, coverage, hrDocs };
}

// ── Finance Module API ─────────────────────────────────────────
// PANOU-FINAL-HAVI-ZARAS integráció — Supabase hívások
// A részletes logika: js/modules/finance.js
// Ezek az egyszerű wrapper-ek az api.js egységességéért

export async function fetchFinancePlanTargets(shopId, year) {
  const { data, error } = await sb
    .from('financial_plan_targets')
    .select('*')
    .eq('shop_id', shopId)
    .eq('year', year)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertFinancePlanTargets(shopId, year, payload) {
  const { data, error } = await sb
    .from('financial_plan_targets')
    .upsert({ shop_id: shopId, year, ...payload }, { onConflict: 'shop_id,year' })
    .select().single();
  if (error) throw error;
  return data;
}

export async function fetchFinanceVenituri(shopId, year) {
  const { data, error } = await sb
    .from('financial_venituri')
    .select('*')
    .eq('shop_id', shopId)
    .eq('year', year)
    .order('month', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function upsertFinanceVenituri(shopId, year, month, category, planRon, realRon) {
  const { data, error } = await sb
    .from('financial_venituri')
    .upsert(
      { shop_id: shopId, year, month, category, plan_ron: planRon, real_ron: realRon },
      { onConflict: 'shop_id,year,month,category' }
    )
    .select().single();
  if (error) throw error;
  return data;
}

export async function fetchFinanceCheltuieli(shopId, year) {
  const { data, error } = await sb
    .from('financial_cheltuieli')
    .select('*')
    .eq('shop_id', shopId)
    .eq('year', year)
    .order('dept', { ascending: true })
    .order('name', { ascending: true })
    .order('month', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function upsertFinanceCheltuiala(shopId, year, month, dept, name, planRon, realRon) {
  const { data, error } = await sb
    .from('financial_cheltuieli')
    .upsert(
      { shop_id: shopId, year, month, dept, name, plan_ron: planRon, real_ron: realRon },
      { onConflict: 'shop_id,year,month,dept,name' }
    )
    .select().single();
  if (error) throw error;
  return data;
}

export async function deleteFinanceCheltuiala(rowId) {
  const { error } = await sb
    .from('financial_cheltuieli')
    .delete()
    .eq('id', rowId);
  if (error) throw error;
}

export async function fetchFinanceCashflow(shopId, year) {
  const { data, error } = await sb
    .from('financial_cashflow')
    .select('*')
    .eq('shop_id', shopId)
    .eq('year', year)
    .order('month', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function upsertFinanceCashflow(shopId, year, month, category, emisRon, incasatRon) {
  const { data, error } = await sb
    .from('financial_cashflow')
    .upsert(
      { shop_id: shopId, year, month, category, emis_ron: emisRon, incasat_ron: incasatRon },
      { onConflict: 'shop_id,year,month,category' }
    )
    .select().single();
  if (error) throw error;
  return data;
}

export async function fetchFinanceSalarii(shopId, year) {
  const { data, error } = await sb
    .from('financial_salarii')
    .select('*, employees(name, role, department)')
    .eq('shop_id', shopId)
    .eq('year', year)
    .order('month', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function upsertFinanceSalariu(shopId, employeeId, year, month, payload) {
  const { data, error } = await sb
    .from('financial_salarii')
    .upsert(
      { shop_id: shopId, employee_id: employeeId, year, month, ...payload },
      { onConflict: 'shop_id,employee_id,year,month' }
    )
    .select().single();
  if (error) throw error;
  return data;
}

export async function fetchFinanceAll(shopId, year) {
  const [planTargets, venituri, cheltuieli, cashflow, salarii] = await Promise.all([
    fetchFinancePlanTargets(shopId, year),
    fetchFinanceVenituri(shopId, year),
    fetchFinanceCheltuieli(shopId, year),
    fetchFinanceCashflow(shopId, year),
    fetchFinanceSalarii(shopId, year),
  ]);
  return { planTargets, venituri, cheltuieli, cashflow, salarii };
}
