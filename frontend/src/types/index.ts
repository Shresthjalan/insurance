// ─── Insurance type ──────────────────────────────────────────────────────────
export type InsuranceType = 'car' | 'health' | 'term' | 'life'

// ─── Lead status ─────────────────────────────────────────────────────────────
export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'closed_won'
  | 'closed_lost'

// ─── Source ──────────────────────────────────────────────────────────────────
export type LeadSource = 'telenow' | 'whatsapp' | 'manual'

// ─── Policy ──────────────────────────────────────────────────────────────────
export type PolicyStatus = 'active' | 'pending' | 'expired' | 'cancelled'

export interface Policy {
  id: string
  insuranceType: InsuranceType
  company: string
  tenure: number
  tenureUnit: 'months' | 'years'
  premium: number
  status: PolicyStatus
  createdAt: string
}

// ─── Appointment status ───────────────────────────────────────────────────────
export type AppointmentStatus =
  | 'requested'
  | 'confirmed'
  | 'completed'
  | 'cancelled'

// ─── Dashboard stats ─────────────────────────────────────────────────────────
export interface DashboardStats {
  totalCustomers: number
  newCustomersToday: number
  activeLeads: number
  quotationsToday: number
  appointmentsPending: number
  appointmentsConfirmed: number
  activeConversations: number
  insuranceTypeDistribution: Record<InsuranceType, number>
  sourceDistribution: Record<LeadSource, number>
}

export interface DashboardStatsResponse {
  data: DashboardStats
}

// ─── Customer ────────────────────────────────────────────────────────────────
export interface CustomerInterest {
  id: string
  insuranceType: InsuranceType
  status: string
  createdAt: string
}

export interface UpcomingAppointment {
  id: string
  scheduledAt: string
  status: AppointmentStatus
  insuranceType: InsuranceType
  advisorName?: string
  notes?: string
}

export interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  leadStatus: LeadStatus
  leadSource: LeadSource
  callCount: number
  interests: CustomerInterest[]
  policies?: Policy[]
  upcomingAppointment?: UpcomingAppointment
  createdAt: string
  updatedAt: string
  lastContactedAt?: string
}

export interface CustomersResponse {
  data: Customer[]
  total: number
  page: number
  limit: number
}

export interface CustomerFilters {
  insuranceType?: InsuranceType | ''
  source?: LeadSource | ''
  status?: LeadStatus | ''
  search?: string
  page?: number
  limit?: number
}

// ─── Call frequency ───────────────────────────────────────────────────────────
export interface CallFrequencyEntry {
  customerId: string
  phone: string
  name: string
  count: number
}

export interface CallFrequencyResponse {
  data: CallFrequencyEntry[]
}

// ─── Appointments ─────────────────────────────────────────────────────────────
export interface Appointment {
  id: string
  customerId: string
  customerName: string
  customerPhone: string
  insuranceType: InsuranceType
  scheduledAt: string
  status: AppointmentStatus
  advisorName?: string
  notes?: string
  createdAt: string
}

export interface AppointmentsResponse {
  data: Appointment[]
  total: number
  page: number
  limit: number
}

export interface AppointmentFilters {
  status?: AppointmentStatus | ''
  page?: number
  limit?: number
}

// ─── SSE events ───────────────────────────────────────────────────────────────
export type SSEEventType =
  | 'new_interest'
  | 'quotation_requested'
  | 'quotation_generated'
  | 'appointment_scheduled'
  | 'call_missed'
  | 'customer_created'

export interface DashboardEvent {
  id: string
  type: SSEEventType
  timestamp: string
  data: Record<string, unknown>
}
