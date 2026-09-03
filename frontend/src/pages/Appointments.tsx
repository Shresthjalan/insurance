import { useState } from 'react'
import { useAppointments } from '../hooks/useDashboard'
import type { AppointmentFilters, AppointmentStatus, InsuranceType } from '../types'

// ─── Badge helpers ────────────────────────────────────────────────────────────
const STATUS_BADGE: Record<AppointmentStatus, string> = {
  requested: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
}

const INSURANCE_BADGE: Record<InsuranceType, string> = {
  car: 'bg-blue-100 text-blue-700',
  health: 'bg-green-100 text-green-700',
  term: 'bg-purple-100 text-purple-700',
  life: 'bg-orange-100 text-orange-700',
}

function StatusBadge({ status }: { status?: AppointmentStatus | string | null }) {
  if (!status) {
    return (
      <span className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full capitalize bg-slate-100 text-slate-600">
        requested
      </span>
    )
  }
  const key = String(status).toLowerCase() as AppointmentStatus
  return (
    <span
      className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full capitalize ${
        STATUS_BADGE[key] ?? 'bg-slate-100 text-slate-600'
      }`}
    >
      {status}
    </span>
  )
}

function InsuranceBadge({ type }: { type?: InsuranceType | string | null }) {
  if (!type) return null
  const key = String(type).toLowerCase() as InsuranceType
  return (
    <span
      className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full capitalize ${
        INSURANCE_BADGE[key] ?? 'bg-slate-100 text-slate-600'
      }`}
    >
      {type}
    </span>
  )
}

function formatDateTime(iso: string | undefined | null): { date: string; time: string } {
  if (!iso) return { date: '—', time: '' }
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return { date: '—', time: '' }
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    }
  } catch {
    return { date: '—', time: '' }
  }
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

// ─── Status filter pills ──────────────────────────────────────────────────────
const STATUS_OPTIONS: { value: AppointmentStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'requested', label: 'Requested' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

// ─── Appointments page ────────────────────────────────────────────────────────
export function Appointments() {
  const [filters, setFilters] = useState<AppointmentFilters>({
    page: 1,
    limit: 20,
    status: '',
  })

  const { data, isLoading, isError } = useAppointments(filters)
  const appointments = data?.data ?? []
  const total = data?.total ?? 0

  function setStatus(status: AppointmentStatus | '') {
    setFilters((prev) => ({ ...prev, status, page: 1 }))
  }

  function setPage(page: number) {
    setFilters((prev) => ({ ...prev, page }))
  }

  return (
    <div className="space-y-4">
      {/* Status filter pills */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map((opt) => {
            const isActive = filters.status === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setStatus(opt.value)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 bg-white'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
            Loading appointments…
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center h-48 text-red-400 text-sm">
            Failed to load appointments
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
            No appointments found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Insurance Type</th>
                  <th className="px-4 py-3 font-medium">Date / Time</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Advisor</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map((appt) => {
                  const { date, time } = formatDateTime(appt.scheduledAt)
                  return (
                    <tr key={appt.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{appt.customerName}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{appt.customerPhone}</td>
                      <td className="px-4 py-3">
                        <InsuranceBadge type={appt.insuranceType} />
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-700 font-medium whitespace-nowrap">{date}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{time}</p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={appt.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {appt.advisorName ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-[200px]">
                        {appt.notes ? (
                          <p className="truncate" title={appt.notes}>
                            {appt.notes}
                          </p>
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
          onChange={setPage}
        />
      )}
    </div>
  )
}
