import type {
  AppointmentFilters,
  AppointmentsResponse,
  CallFrequencyResponse,
  CustomerFilters,
  CustomersResponse,
  DashboardStatsResponse,
} from '../types'

const BASE = '/api/v1'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') {
      qs.set(k, String(v))
    }
  }
  const s = qs.toString()
  return s ? `?${s}` : ''
}

// ─── Dashboard stats ─────────────────────────────────────────────────────────
export function fetchDashboardStats(): Promise<DashboardStatsResponse> {
  return get<DashboardStatsResponse>('/dashboard/stats')
}

// ─── Customers ────────────────────────────────────────────────────────────────
export function fetchCustomers(filters: CustomerFilters = {}): Promise<CustomersResponse> {
  const query = buildQuery({
    insuranceType: filters.insuranceType,
    source: filters.source,
    status: filters.status,
    search: filters.search,
    page: filters.page,
    limit: filters.limit,
  })
  return get<CustomersResponse>(`/dashboard/customers${query}`)
}

// ─── Call frequency ───────────────────────────────────────────────────────────
export function fetchCallFrequency(limit = 10): Promise<CallFrequencyResponse> {
  return get<CallFrequencyResponse>(`/dashboard/call-frequency?limit=${limit}`)
}

// ─── Appointments ─────────────────────────────────────────────────────────────
export function fetchAppointments(filters: AppointmentFilters = {}): Promise<AppointmentsResponse> {
  const query = buildQuery({
    status: filters.status,
    page: filters.page,
    limit: filters.limit,
  })
  return get<AppointmentsResponse>(`/dashboard/appointments${query}`)
}
