import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { supabase, unwrap } from '../db';
import type { Request, Response } from 'express';

const router = Router();

// ── /api/v1/dashboard/stats ────────────────────────────────────────────────
router.get('/stats', asyncHandler(async (_req: Request, res: Response) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  const [
    totalCustomers,
    newToday,
    activeLeads,
    quotationsToday,
    appointmentsPending,
    appointmentsConfirmed,
    byInsuranceType,
    bySource,
    recentConversations,
  ] = await Promise.all([
    supabase.from('customers').select('*', { count: 'exact', head: true }),
    supabase.from('customers').select('*', { count: 'exact', head: true }).gte('createdAt', todayIso),
    supabase.from('leads').select('*', { count: 'exact', head: true }).not('status', 'in', '(converted,closed,lost)'),
    supabase.from('quotation_requests').select('*', { count: 'exact', head: true }).gte('createdAt', todayIso),
    supabase.from('advisor_appointments').select('*', { count: 'exact', head: true }).eq('status', 'requested'),
    supabase.from('advisor_appointments').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
    supabase.from('leads').select('primaryInsuranceType').not('primaryInsuranceType', 'is', null),
    supabase.from('leads').select('source'),
    supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('status', 'active'),
  ]);

  // Tally insurance type distribution from leads
  const insuranceTypeCounts: Record<string, number> = {};
  for (const row of (byInsuranceType.data ?? [])) {
    const t = (row as Record<string, string>).primaryInsuranceType;
    if (t) insuranceTypeCounts[t] = (insuranceTypeCounts[t] ?? 0) + 1;
  }

  // Tally source distribution
  const sourceCounts: Record<string, number> = {};
  for (const row of (bySource.data ?? [])) {
    const s = (row as Record<string, string>).source;
    if (s) sourceCounts[s] = (sourceCounts[s] ?? 0) + 1;
  }

  res.json({
    success: true,
    data: {
      totalCustomers: totalCustomers.count ?? 0,
      newCustomersToday: newToday.count ?? 0,
      activeLeads: activeLeads.count ?? 0,
      quotationsToday: quotationsToday.count ?? 0,
      appointmentsPending: appointmentsPending.count ?? 0,
      appointmentsConfirmed: appointmentsConfirmed.count ?? 0,
      activeConversations: recentConversations.count ?? 0,
      insuranceTypeDistribution: insuranceTypeCounts,
      sourceDistribution: sourceCounts,
    },
  });
}));

// ── /api/v1/dashboard/customers ───────────────────────────────────────────
router.get('/customers', asyncHandler(async (req: Request, res: Response) => {
  const page  = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Number(req.query.limit ?? 50));
  const from  = (page - 1) * limit;
  const insuranceType = req.query.insuranceType as string | undefined;
  const source        = req.query.source as string | undefined;
  const status        = req.query.status as string | undefined;
  const search        = req.query.search as string | undefined;

  // Fetch customers joined with latest lead info
  let customersQuery = supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .order('lastContactAt', { ascending: false, nullsFirst: false })
    .range(from, from + limit - 1);

  if (search) {
    customersQuery = customersQuery.or(
      `normalizedPhoneNumber.ilike.%${search}%,name.ilike.%${search}%`,
    );
  }

  const { data: customers, count, error } = await customersQuery;
  if (error) throw error;

  if (!customers || customers.length === 0) {
    res.json({ success: true, data: [], total: 0, page, limit });
    return;
  }

  const customerIds = customers.map((c: Record<string, unknown>) => c.id as string);

  // Fetch leads for these customers
  let leadsQuery = supabase
    .from('leads')
    .select('customerId, primaryInsuranceType, source, status')
    .in('customerId', customerIds);
  if (insuranceType) leadsQuery = leadsQuery.eq('primaryInsuranceType', insuranceType);
  if (source)        leadsQuery = leadsQuery.eq('source', source);
  if (status)        leadsQuery = leadsQuery.eq('status', status);
  const { data: leads } = await leadsQuery;

  // Fetch call counts (conversations per customer)
  const { data: convCounts } = await supabase
    .from('conversations')
    .select('customerId')
    .in('customerId', customerIds);

  // Fetch latest appointment per customer
  const { data: appointments } = await supabase
    .from('advisor_appointments')
    .select('customerId, requestedDate, requestedTime, status')
    .in('customerId', customerIds)
    .order('createdAt', { ascending: false });

  // Map into enriched rows
  const leadsMap: Record<string, Record<string, unknown>[]> = {};
  for (const l of (leads ?? [])) {
    const id = (l as Record<string, unknown>).customerId as string;
    (leadsMap[id] ??= []).push(l as Record<string, unknown>);
  }
  const convCountMap: Record<string, number> = {};
  for (const c of (convCounts ?? [])) {
    const id = (c as Record<string, unknown>).customerId as string;
    convCountMap[id] = (convCountMap[id] ?? 0) + 1;
  }
  const apptMap: Record<string, Record<string, unknown>> = {};
  for (const a of (appointments ?? [])) {
    const id = (a as Record<string, unknown>).customerId as string;
    if (!apptMap[id]) apptMap[id] = a as Record<string, unknown>;
  }

  const enriched = customers
    .map((c: Record<string, unknown>) => {
      const id = c.id as string;
      const customerLeads = leadsMap[id] ?? [];
      // If filter was applied, drop customers with no matching lead
      if ((insuranceType || source || status) && customerLeads.length === 0) return null;
      const interests = [...new Set(customerLeads.map((l) => l.primaryInsuranceType).filter(Boolean))];
      const latestStatus = customerLeads[0]?.status ?? null;
      return {
        ...c,
        interests,
        leadSource: customerLeads[0]?.source ?? null,
        leadStatus: latestStatus,
        callCount: convCountMap[id] ?? 0,
        upcomingAppointment: apptMap[id] ?? null,
      };
    })
    .filter(Boolean);

  res.json({ success: true, data: enriched, total: count ?? 0, page, limit });
}));

// ── /api/v1/dashboard/call-frequency ─────────────────────────────────────
router.get('/call-frequency', asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(100, Number(req.query.limit ?? 20));

  const { data } = await supabase
    .from('conversations')
    .select('customerId, customers(name, normalizedPhoneNumber)');

  const freq: Record<string, { customerId: string; phone: string; name: string | null; count: number }> = {};
  for (const row of (data ?? [])) {
    const r = row as Record<string, unknown>;
    const id = r.customerId as string;
    const cust = r.customers as Record<string, unknown> | null;
    if (!freq[id]) {
      freq[id] = { customerId: id, phone: (cust?.normalizedPhoneNumber as string) ?? '', name: (cust?.name as string) ?? null, count: 0 };
    }
    freq[id].count++;
  }

  const sorted = Object.values(freq).sort((a, b) => b.count - a.count).slice(0, limit);
  res.json({ success: true, data: sorted });
}));

// ── /api/v1/dashboard/appointments ────────────────────────────────────────
router.get('/appointments', asyncHandler(async (req: Request, res: Response) => {
  const page  = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Number(req.query.limit ?? 20));
  const from  = (page - 1) * limit;
  const status = req.query.status as string | undefined;

  let query = supabase
    .from('advisor_appointments')
    .select('*, customers(name, normalizedPhoneNumber)', { count: 'exact' })
    .order('createdAt', { ascending: false })
    .range(from, from + limit - 1);

  if (status) query = query.eq('status', status);

  const { data, count, error } = await query;
  if (error) throw error;

  res.json({ success: true, data: data ?? [], total: count ?? 0, page, limit });
}));

export { router as dashboardRoutes };
