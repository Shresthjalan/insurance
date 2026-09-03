import { useState } from 'react'
import { useCustomers } from '../hooks/useDashboard'
import type {
  Customer,
  CustomerFilters,
  InsuranceType,
  LeadSource,
  LeadStatus,
  Policy,
  PolicyStatus,
} from '../types'

// ─── Local storage helpers ────────────────────────────────────────────────────
const LS_KEY = 'crm_manual_customers'

function getLocalCustomers(): Customer[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveLocalCustomers(customers: Customer[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(customers))
}

// ─── Badge helpers ────────────────────────────────────────────────────────────
const INSURANCE_BADGE: Record<InsuranceType, string> = {
  car: 'bg-blue-100 text-blue-700',
  health: 'bg-green-100 text-green-700',
  term: 'bg-purple-100 text-purple-700',
  life: 'bg-orange-100 text-orange-700',
}

const SOURCE_BADGE: Record<LeadSource, string> = {
  telenow: 'bg-indigo-100 text-indigo-700',
  whatsapp: 'bg-emerald-100 text-emerald-700',
  manual: 'bg-slate-100 text-slate-600',
}

const STATUS_BADGE: Record<LeadStatus, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-cyan-100 text-cyan-700',
  qualified: 'bg-teal-100 text-teal-700',
  proposal: 'bg-violet-100 text-violet-700',
  negotiation: 'bg-amber-100 text-amber-700',
  closed_won: 'bg-green-100 text-green-700',
  closed_lost: 'bg-red-100 text-red-700',
}

const POLICY_STATUS_BADGE: Record<PolicyStatus, string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  expired: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
}

function InsuranceBadge({ type }: { type: InsuranceType }) {
  return (
    <span
      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
        INSURANCE_BADGE[type] ?? 'bg-slate-100 text-slate-600'
      }`}
    >
      {type}
    </span>
  )
}

function SourceBadge({ source }: { source: LeadSource }) {
  return (
    <span
      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
        SOURCE_BADGE[source] ?? 'bg-slate-100 text-slate-600'
      }`}
    >
      {source}
    </span>
  )
}

function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
        STATUS_BADGE[status] ?? 'bg-slate-100 text-slate-600'
      }`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  )
}

function PolicyStatusBadge({ status }: { status: PolicyStatus }) {
  return (
    <span
      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
        POLICY_STATUS_BADGE[status] ?? 'bg-slate-100 text-slate-600'
      }`}
    >
      {status}
    </span>
  )
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ─── Customer detail drawer ───────────────────────────────────────────────────
interface DrawerProps {
  customer: Customer | null
  onClose: () => void
}

function CustomerDrawer({ customer, onClose }: DrawerProps) {
  if (!customer) return null

  const hasPolicies = customer.policies && customer.policies.length > 0

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">{customer.name}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{customer.phone}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Status</p>
              <StatusBadge status={customer.leadStatus} />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Source</p>
              <SourceBadge source={customer.leadSource} />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Calls</p>
              <p className="text-slate-700 font-medium">{customer.callCount}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Created</p>
              <p className="text-slate-700">{formatDate(customer.createdAt)}</p>
            </div>
            {customer.email && (
              <div className="col-span-2">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Email</p>
                <p className="text-slate-700 truncate">{customer.email}</p>
              </div>
            )}
            <div className="col-span-2">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Last Contacted</p>
              <p className="text-slate-700">{formatDate(customer.lastContactedAt)}</p>
            </div>
          </div>

          {/* Policies (rich detail for manually added customers) */}
          {hasPolicies && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Policies</p>
              <div className="space-y-3">
                {customer.policies!.map((policy) => (
                  <div
                    key={policy.id}
                    className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50"
                  >
                    <div className="flex items-center justify-between">
                      <InsuranceBadge type={policy.insuranceType} />
                      <PolicyStatusBadge status={policy.status} />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{policy.company}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div>
                        <span className="text-slate-400">Type</span>
                        <p className="text-slate-700 font-medium capitalize mt-0.5">
                          {policy.insuranceType} Insurance
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Tenure</span>
                        <p className="text-slate-700 font-medium mt-0.5">
                          {policy.tenure} {policy.tenureUnit}
                        </p>
                      </div>
                      <div className="col-span-2 mt-1">
                        <span className="text-slate-400">Premium</span>
                        <p className="text-slate-700 font-semibold text-sm mt-0.5">
                          ₹{policy.premium.toLocaleString('en-IN')}
                          <span className="text-xs font-normal text-slate-400"> / year</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interests (fallback for API-loaded customers without policy detail) */}
          {!hasPolicies && customer.interests.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Interests</p>
              <div className="space-y-2">
                {customer.interests.map((interest) => (
                  <div
                    key={interest.id}
                    className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2"
                  >
                    <InsuranceBadge type={interest.insuranceType} />
                    <span className="text-xs text-slate-400">{formatDate(interest.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming appointment */}
          {customer.upcomingAppointment && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Upcoming Appointment</p>
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <InsuranceBadge type={customer.upcomingAppointment.insuranceType} />
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                      customer.upcomingAppointment.status === 'confirmed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {customer.upcomingAppointment.status}
                  </span>
                </div>
                <p className="text-slate-700 font-medium">
                  {new Date(customer.upcomingAppointment.scheduledAt).toLocaleString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                {customer.upcomingAppointment.advisorName && (
                  <p className="text-slate-500">Advisor: {customer.upcomingAppointment.advisorName}</p>
                )}
                {customer.upcomingAppointment.notes && (
                  <p className="text-slate-500 italic">{customer.upcomingAppointment.notes}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Add Customer Modal ───────────────────────────────────────────────────────
interface PolicyForm {
  _key: string
  insuranceType: InsuranceType
  company: string
  tenure: string
  tenureUnit: 'months' | 'years'
  premium: string
  status: PolicyStatus
}

interface CustomerForm {
  name: string
  phone: string
  email: string
  leadStatus: LeadStatus
  leadSource: LeadSource
  policies: PolicyForm[]
}

function makeEmptyPolicy(): PolicyForm {
  return {
    _key: Math.random().toString(36).slice(2),
    insuranceType: 'life',
    company: '',
    tenure: '',
    tenureUnit: 'years',
    premium: '',
    status: 'active',
  }
}

const EMPTY_FORM: CustomerForm = {
  name: '',
  phone: '',
  email: '',
  leadStatus: 'new',
  leadSource: 'manual',
  policies: [],
}

interface AddCustomerModalProps {
  onClose: () => void
  onAdd: (customer: Customer) => void
}

function AddCustomerModal({ onClose, onAdd }: AddCustomerModalProps) {
  const [form, setForm] = useState<CustomerForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function setField(key: keyof Omit<CustomerForm, 'policies'>, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => { const n = { ...e }; delete n[key]; return n })
  }

  function addPolicy() {
    setForm((f) => ({ ...f, policies: [...f.policies, makeEmptyPolicy()] }))
  }

  function removePolicy(key: string) {
    setForm((f) => ({ ...f, policies: f.policies.filter((p) => p._key !== key) }))
  }

  function setPolicyField(key: string, field: keyof PolicyForm, value: string) {
    setForm((f) => ({
      ...f,
      policies: f.policies.map((p) => (p._key === key ? { ...p, [field]: value } : p)),
    }))
    setErrors((e) => { const n = { ...e }; delete n[`p_${key}_${field}`]; return n })
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!form.phone.trim()) errs.phone = 'Phone is required'
    for (const p of form.policies) {
      if (!p.company.trim()) errs[`p_${p._key}_company`] = 'Company required'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    const now = new Date().toISOString()
    const policies: Policy[] = form.policies.map((p) => ({
      id: p._key,
      insuranceType: p.insuranceType,
      company: p.company.trim(),
      tenure: Number(p.tenure) || 0,
      tenureUnit: p.tenureUnit,
      premium: Number(p.premium) || 0,
      status: p.status,
      createdAt: now,
    }))
    const customer: Customer = {
      id: `manual_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      leadStatus: form.leadStatus,
      leadSource: form.leadSource,
      callCount: 0,
      interests: policies.map((p) => ({
        id: p.id,
        insuranceType: p.insuranceType,
        status: p.status,
        createdAt: now,
      })),
      policies,
      createdAt: now,
      updatedAt: now,
    }
    onAdd(customer)
  }

  const inputCls = (err?: string) =>
    `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white ${
      err ? 'border-red-400' : 'border-slate-200'
    }`

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
            <h2 className="text-lg font-semibold text-slate-800">Add Customer</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Form body */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Customer info */}
              <section className="space-y-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Customer Info
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setField('name', e.target.value)}
                      placeholder="Full name"
                      className={inputCls(errors.name)}
                    />
                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Phone <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setField('phone', e.target.value)}
                      placeholder="+91 9876543210"
                      className={inputCls(errors.phone)}
                    />
                    {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setField('email', e.target.value)}
                      placeholder="email@example.com"
                      className={inputCls()}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Lead Status</label>
                    <select
                      value={form.leadStatus}
                      onChange={(e) => setField('leadStatus', e.target.value)}
                      className={inputCls()}
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="proposal">Proposal</option>
                      <option value="negotiation">Negotiation</option>
                      <option value="closed_won">Closed Won</option>
                      <option value="closed_lost">Closed Lost</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Source</label>
                    <select
                      value={form.leadSource}
                      onChange={(e) => setField('leadSource', e.target.value)}
                      className={inputCls()}
                    >
                      <option value="manual">Manual</option>
                      <option value="telenow">Telenow</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Policies */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Policies
                  </h3>
                  <button
                    type="button"
                    onClick={addPolicy}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add Policy
                  </button>
                </div>

                {form.policies.length === 0 && (
                  <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400">
                    No policies yet — click "Add Policy" to attach insurance details
                  </div>
                )}

                {form.policies.map((policy, idx) => (
                  <div key={policy._key} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">Policy {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removePolicy(policy._key)}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors font-medium"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Insurance Type</label>
                        <select
                          value={policy.insuranceType}
                          onChange={(e) => setPolicyField(policy._key, 'insuranceType', e.target.value)}
                          className={inputCls()}
                        >
                          <option value="life">Life</option>
                          <option value="health">Health</option>
                          <option value="car">Car</option>
                          <option value="term">Term</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Company <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={policy.company}
                          onChange={(e) => setPolicyField(policy._key, 'company', e.target.value)}
                          placeholder="e.g. LIC, HDFC ERGO"
                          className={inputCls(errors[`p_${policy._key}_company`])}
                        />
                        {errors[`p_${policy._key}_company`] && (
                          <p className="text-xs text-red-500 mt-1">{errors[`p_${policy._key}_company`]}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Tenure</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            value={policy.tenure}
                            onChange={(e) => setPolicyField(policy._key, 'tenure', e.target.value)}
                            placeholder="0"
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                          />
                          <select
                            value={policy.tenureUnit}
                            onChange={(e) => setPolicyField(policy._key, 'tenureUnit', e.target.value)}
                            className="px-2 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white shrink-0"
                          >
                            <option value="years">Yrs</option>
                            <option value="months">Mo</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Premium (₹ / yr)</label>
                        <input
                          type="number"
                          min="0"
                          value={policy.premium}
                          onChange={(e) => setPolicyField(policy._key, 'premium', e.target.value)}
                          placeholder="0"
                          className={inputCls()}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Policy Status</label>
                        <select
                          value={policy.status}
                          onChange={(e) => setPolicyField(policy._key, 'status', e.target.value)}
                          className={inputCls()}
                        >
                          <option value="active">Active</option>
                          <option value="pending">Pending</option>
                          <option value="expired">Expired</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
              >
                Add Customer
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────
interface PaginationProps {
  page: number
  total: number
  limit: number
  onChange: (page: number) => void
}

function Pagination({ page, total, limit, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const from = Math.min((page - 1) * limit + 1, total)
  const to = Math.min(page * limit, total)

  return (
    <div className="flex items-center justify-between text-sm text-slate-500">
      <span>{total > 0 ? `${from}–${to} of ${total}` : '0 results'}</span>
      <div className="flex gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
        >
          &#8592; Prev
        </button>
        <span className="px-3 py-1.5 font-medium text-slate-700">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
        >
          Next &#8594;
        </button>
      </div>
    </div>
  )
}

// ─── Customers page ───────────────────────────────────────────────────────────
export function Customers() {
  const [filters, setFilters] = useState<CustomerFilters>({
    page: 1,
    limit: 20,
    search: '',
    insuranceType: '',
    source: '',
    status: '',
  })
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [localCustomers, setLocalCustomers] = useState<Customer[]>(() => getLocalCustomers())

  const { data, isLoading } = useCustomers(filters)
  const apiCustomers = data?.data ?? []
  const apiTotal = data?.total ?? 0

  // Merge: local customers first, then API (filter out dupes by id)
  const apiIds = new Set(apiCustomers.map((c) => c.id))
  const filteredLocals = localCustomers.filter((lc) => {
    if (apiIds.has(lc.id)) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!lc.name.toLowerCase().includes(q) && !lc.phone.includes(q)) return false
    }
    if (filters.insuranceType && !lc.interests.some((i) => i.insuranceType === filters.insuranceType)) return false
    if (filters.source && lc.leadSource !== filters.source) return false
    if (filters.status && lc.leadStatus !== filters.status) return false
    return true
  })

  const customers = [...filteredLocals, ...apiCustomers]
  const total = filteredLocals.length + apiTotal

  function updateFilter(key: keyof CustomerFilters, value: string | number) {
    setFilters((prev) => ({ ...prev, [key]: value, page: key !== 'page' ? 1 : Number(value) }))
  }

  function resetFilters() {
    setFilters({ page: 1, limit: 20, search: '', insuranceType: '', source: '', status: '' })
  }

  function handleAddCustomer(customer: Customer) {
    const updated = [customer, ...localCustomers]
    setLocalCustomers(updated)
    saveLocalCustomers(updated)
    setShowAddModal(false)
  }

  const hasActiveFilters =
    !!filters.search || !!filters.insuranceType || !!filters.source || !!filters.status

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search name or phone…"
              value={filters.search ?? ''}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-slate-50"
            />
          </div>

          {/* Insurance type */}
          <select
            value={filters.insuranceType ?? ''}
            onChange={(e) => updateFilter('insuranceType', e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">All Types</option>
            <option value="car">Car</option>
            <option value="health">Health</option>
            <option value="term">Term</option>
            <option value="life">Life</option>
          </select>

          {/* Source */}
          <select
            value={filters.source ?? ''}
            onChange={(e) => updateFilter('source', e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">All Sources</option>
            <option value="manual">Manual</option>
            <option value="telenow">Telenow</option>
            <option value="whatsapp">WhatsApp</option>
          </select>

          {/* Status */}
          <select
            value={filters.status ?? ''}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="proposal">Proposal</option>
            <option value="negotiation">Negotiation</option>
            <option value="closed_won">Closed Won</option>
            <option value="closed_lost">Closed Lost</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-sm px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors font-medium"
            >
              Reset
            </button>
          )}

          {/* Add customer button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="ml-auto flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Customer
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading && filteredLocals.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
            Loading customers…
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400 text-sm">
            <p>No customers found</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-indigo-600 hover:text-indigo-700 font-medium text-sm underline underline-offset-2"
            >
              Add your first customer
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3 font-medium">Name / Phone</th>
                  <th className="px-4 py-3 font-medium">Policies / Interests</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Calls</th>
                  <th className="px-4 py-3 font-medium">Last Contact</th>
                  <th className="px-4 py-3 font-medium">Appointment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((customer) => {
                  const displayInterests =
                    customer.policies && customer.policies.length > 0
                      ? customer.policies.map((p) => ({ id: p.id, insuranceType: p.insuranceType }))
                      : customer.interests.map((i) => ({ id: i.id, insuranceType: i.insuranceType }))

                  return (
                    <tr
                      key={customer.id}
                      onClick={() => setSelectedCustomer(customer)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{customer.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{customer.phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {displayInterests.slice(0, 3).map((i) => (
                            <InsuranceBadge key={i.id} type={i.insuranceType} />
                          ))}
                          {displayInterests.length > 3 && (
                            <span className="text-xs text-slate-400 self-center">
                              +{displayInterests.length - 3}
                            </span>
                          )}
                          {displayInterests.length === 0 && (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <SourceBadge source={customer.leadSource} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={customer.leadStatus} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-slate-700 font-medium">{customer.callCount}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {formatDate(customer.lastContactedAt)}
                      </td>
                      <td className="px-4 py-3">
                        {customer.upcomingAppointment ? (
                          <div>
                            <p className="text-slate-700 text-xs font-medium whitespace-nowrap">
                              {new Date(customer.upcomingAppointment.scheduledAt).toLocaleDateString(
                                'en-US',
                                { month: 'short', day: 'numeric' },
                              )}
                            </p>
                            <span
                              className={`text-xs font-medium px-1.5 py-0.5 rounded-full capitalize ${
                                customer.upcomingAppointment.status === 'confirmed'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {customer.upcomingAppointment.status}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && total > 0 && (
        <Pagination
          page={filters.page ?? 1}
          total={total}
          limit={filters.limit ?? 20}
          onChange={(p) => updateFilter('page', p)}
        />
      )}

      {/* Drawer */}
      <CustomerDrawer customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} />

      {/* Add Customer Modal */}
      {showAddModal && (
        <AddCustomerModal onClose={() => setShowAddModal(false)} onAdd={handleAddCustomer} />
      )}
    </div>
  )
}
