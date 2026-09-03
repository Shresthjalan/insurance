import { useState } from 'react'
import { useCustomers } from '../hooks/useDashboard'
import type {
  Customer,
  CustomerFilters,
  InsuranceType,
  LeadSource,
  LeadStatus,
} from '../types'

// ─── Badge helpers ────────────────────────────────────────────────────────────
const INSURANCE_BADGE: Record<string, string> = {
  car: 'bg-blue-100 text-blue-700',
  health: 'bg-green-100 text-green-700',
  term: 'bg-purple-100 text-purple-700',
  life: 'bg-orange-100 text-orange-700',
}

const SOURCE_BADGE: Record<string, string> = {
  telenow: 'bg-indigo-100 text-indigo-700',
  whatsapp: 'bg-emerald-100 text-emerald-700',
}

const STATUS_BADGE: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-cyan-100 text-cyan-700',
  qualified: 'bg-teal-100 text-teal-700',
  proposal: 'bg-violet-100 text-violet-700',
  negotiation: 'bg-amber-100 text-amber-700',
  closed_won: 'bg-green-100 text-green-700',
  closed_lost: 'bg-red-100 text-red-700',
  quotation_requested: 'bg-purple-100 text-purple-700',
  advisor_requested: 'bg-amber-100 text-amber-700',
}

function InsuranceBadge({ type }: { type?: InsuranceType | string | null }) {
  if (!type) return null
  const key = String(type).toLowerCase()
  return (
    <span
      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
        INSURANCE_BADGE[key] ?? 'bg-slate-100 text-slate-600'
      }`}
    >
      {type}
    </span>
  )
}

function SourceBadge({ source }: { source?: LeadSource | string | null }) {
  if (!source) {
    return (
      <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full capitalize bg-slate-100 text-slate-600">
        direct
      </span>
    )
  }
  const key = String(source).toLowerCase()
  return (
    <span
      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
        SOURCE_BADGE[key] ?? 'bg-slate-100 text-slate-600'
      }`}
    >
      {source}
    </span>
  )
}

function StatusBadge({ status }: { status?: LeadStatus | string | null }) {
  if (!status) {
    return (
      <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full capitalize bg-slate-100 text-slate-600">
        new
      </span>
    )
  }
  const str = String(status)
  const label = str.replace(/_/g, ' ')
  const key = str.toLowerCase()
  return (
    <span
      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
        STATUS_BADGE[key] ?? 'bg-slate-100 text-slate-600'
      }`}
    >
      {label}
    </span>
  )
}

function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return '—'
  }
}

// ─── Customer detail drawer ───────────────────────────────────────────────────
interface DrawerProps {
  customer: Customer | null
  onClose: () => void
}

function CustomerDrawer({ customer, onClose }: DrawerProps) {
  if (!customer) return null

  const phone = customer.phone || (customer as any).phoneNumber || (customer as any).normalizedPhoneNumber || '—'
  const name = customer.name || (phone !== '—' ? phone : 'Unnamed Customer')
  const rawInterests = Array.isArray(customer.interests) ? customer.interests : []
  const interestList = rawInterests.map((item: any) =>
    typeof item === 'string' ? item : item?.insuranceType
  ).filter(Boolean)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">{name}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{phone}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-5 h-5"
            >
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
              <p className="text-slate-700 font-medium">{customer.callCount ?? 0}</p>
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
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                Last Contacted
              </p>
              <p className="text-slate-700">
                {formatDate(customer.lastContactedAt || (customer as any).lastContactAt)}
              </p>
            </div>
          </div>

          {/* Interests */}
          {interestList.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Interests</p>
              <div className="space-y-2">
                {interestList.map((type: string, idx: number) => (
                  <div
                    key={`drawer-interest-${type}-${idx}`}
                    className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2"
                  >
                    <InsuranceBadge type={type as InsuranceType} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming appointment */}
          {customer.upcomingAppointment && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">
                Upcoming Appointment
              </p>
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
                    {customer.upcomingAppointment.status ?? 'requested'}
                  </span>
                </div>
                <p className="text-slate-700 font-medium">
                  {formatDate(customer.upcomingAppointment.scheduledAt)}
                </p>
                {customer.upcomingAppointment.advisorName && (
                  <p className="text-slate-500">
                    Advisor: {customer.upcomingAppointment.advisorName}
                  </p>
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
      <span>
        {total > 0 ? `${from}–${to} of ${total}` : '0 results'}
      </span>
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

  const { data, isLoading, isError } = useCustomers(filters)
  const customers = data?.data ?? []
  const total = data?.total ?? 0

  function updateFilter(key: keyof CustomerFilters, value: string | number) {
    setFilters((prev) => ({ ...prev, [key]: value, page: key !== 'page' ? 1 : Number(value) }))
  }

  function resetFilters() {
    setFilters({ page: 1, limit: 20, search: '', insuranceType: '', source: '', status: '' })
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
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-4 h-4"
              >
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
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
            Loading customers…
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center h-48 text-red-400 text-sm">
            Failed to load customers
          </div>
        ) : customers.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
            No customers found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3 font-medium">Name / Phone</th>
                  <th className="px-4 py-3 font-medium">Interests</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Calls</th>
                  <th className="px-4 py-3 font-medium">Last Contact</th>
                  <th className="px-4 py-3 font-medium">Appointment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((customer) => {
                  const phone = customer.phone || (customer as any).phoneNumber || (customer as any).normalizedPhoneNumber || '—'
                  const name = customer.name || (phone !== '—' ? phone : 'Unnamed Customer')
                  const rawInterests = Array.isArray(customer.interests) ? customer.interests : []
                  const interestTypes = rawInterests.map((item: any) =>
                    typeof item === 'string' ? item : item?.insuranceType
                  ).filter(Boolean)
                  const lastContact = formatDate(customer.lastContactedAt || (customer as any).lastContactAt || (customer as any).updatedAt)

                  return (
                    <tr
                      key={customer.id}
                      onClick={() => setSelectedCustomer(customer)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {interestTypes.slice(0, 3).map((type: string, idx: number) => (
                            <InsuranceBadge key={`table-interest-${customer.id}-${type}-${idx}`} type={type as InsuranceType} />
                          ))}
                          {interestTypes.length > 3 && (
                            <span className="text-xs text-slate-400 self-center">
                              +{interestTypes.length - 3}
                            </span>
                          )}
                          {interestTypes.length === 0 && (
                            <span className="text-xs text-slate-300">—</span>
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
                        <span className="text-slate-700 font-medium">{customer.callCount ?? 0}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {lastContact}
                      </td>
                      <td className="px-4 py-3">
                        {customer.upcomingAppointment ? (
                          <div>
                            <p className="text-slate-700 text-xs font-medium whitespace-nowrap">
                              {formatDate(customer.upcomingAppointment.scheduledAt)}
                            </p>
                            <span
                              className={`text-xs font-medium px-1.5 py-0.5 rounded-full capitalize ${
                                customer.upcomingAppointment.status === 'confirmed'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {customer.upcomingAppointment.status ?? 'requested'}
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
      <CustomerDrawer
        customer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
      />
    </div>
  )
}
