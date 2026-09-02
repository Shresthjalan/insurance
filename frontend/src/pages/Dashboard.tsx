import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useCallFrequency, useStats } from '../hooks/useDashboard'
import type { DashboardEvent, InsuranceType, SSEEventType } from '../types'

// ─── Color maps ───────────────────────────────────────────────────────────────
const INSURANCE_COLORS: Record<InsuranceType, string> = {
  car: '#3b82f6',     // blue-500
  health: '#22c55e',  // green-500
  term: '#a855f7',    // purple-500
  life: '#f97316',    // orange-500
}

const SOURCE_COLORS: Record<string, string> = {
  telenow: '#6366f1',   // indigo-500
  whatsapp: '#10b981',  // emerald-500
}

const EVENT_COLORS: Record<SSEEventType, { border: string; badge: string; label: string }> = {
  new_interest: {
    border: 'border-blue-400',
    badge: 'bg-blue-100 text-blue-700',
    label: 'New Interest',
  },
  quotation_requested: {
    border: 'border-purple-400',
    badge: 'bg-purple-100 text-purple-700',
    label: 'Quote Requested',
  },
  quotation_generated: {
    border: 'border-indigo-400',
    badge: 'bg-indigo-100 text-indigo-700',
    label: 'Quote Generated',
  },
  appointment_scheduled: {
    border: 'border-emerald-400',
    badge: 'bg-emerald-100 text-emerald-700',
    label: 'Appointment',
  },
  call_missed: {
    border: 'border-red-400',
    badge: 'bg-red-100 text-red-700',
    label: 'Call Missed',
  },
  customer_created: {
    border: 'border-teal-400',
    badge: 'bg-teal-100 text-teal-700',
    label: 'New Customer',
  },
}

function eventSummary(event: DashboardEvent): string {
  const d = event.data
  const name = (d.customerName ?? d.name ?? d.phone ?? '') as string
  switch (event.type) {
    case 'new_interest':
      return `${name} interested in ${d.insuranceType ?? 'insurance'}`
    case 'quotation_requested':
      return `${name} requested a quote`
    case 'quotation_generated':
      return `Quote generated for ${name}`
    case 'appointment_scheduled':
      return `${name} scheduled an appointment`
    case 'call_missed':
      return `Missed call from ${name || d.phone}`
    case 'customer_created':
      return `New customer: ${name}`
    default:
      return JSON.stringify(event.data).slice(0, 60)
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return iso
  }
}

// ─── Stat card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string
  value: number | undefined
  icon: string
  colorClass: string
  bgClass: string
}

function StatCard({ label, value, icon, colorClass, bgClass }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${bgClass}`}>
        <span
          className={`w-6 h-6 ${colorClass}`}
          dangerouslySetInnerHTML={{ __html: icon }}
        />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-800 leading-tight">
          {value !== undefined ? value.toLocaleString() : '—'}
        </p>
        <p className="text-sm text-slate-500 mt-0.5 truncate">{label}</p>
      </div>
    </div>
  )
}

// ─── Custom tooltip for bar chart ─────────────────────────────────────────────
function BarTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-medium text-slate-700 capitalize">{label}</p>
      <p className="text-slate-500">{payload[0].value} leads</p>
    </div>
  )
}

// ─── Custom tooltip for pie chart ─────────────────────────────────────────────
function PieTooltip({ active, payload }: {
  active?: boolean
  payload?: { name: string; value: number }[]
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-medium text-slate-700 capitalize">{payload[0].name}</p>
      <p className="text-slate-500">{payload[0].value} leads</p>
    </div>
  )
}

// ─── Dashboard component ──────────────────────────────────────────────────────
interface DashboardProps {
  events: DashboardEvent[]
}

export function Dashboard({ events }: DashboardProps) {
  const { data: stats, isLoading: statsLoading } = useStats()
  const { data: callFreq, isLoading: callLoading } = useCallFrequency(10)

  // Prepare bar chart data
  const insuranceBarData = stats
    ? (['car', 'health', 'term', 'life'] as InsuranceType[]).map((type) => ({
        name: type.charAt(0).toUpperCase() + type.slice(1),
        type,
        value: stats.insuranceTypeDistribution[type] ?? 0,
      }))
    : []

  // Prepare pie chart data
  const sourceData = stats
    ? Object.entries(stats.sourceDistribution).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        key: name,
        value,
      }))
    : []

  const statCards: StatCardProps[] = [
    {
      label: 'Total Customers',
      value: stats?.totalCustomers,
      colorClass: 'text-indigo-600',
      bgClass: 'bg-indigo-50',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    },
    {
      label: 'New Today',
      value: stats?.newCustomersToday,
      colorClass: 'text-blue-600',
      bgClass: 'bg-blue-50',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>`,
    },
    {
      label: 'Active Leads',
      value: stats?.activeLeads,
      colorClass: 'text-amber-600',
      bgClass: 'bg-amber-50',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    },
    {
      label: 'Quotations Today',
      value: stats?.quotationsToday,
      colorClass: 'text-purple-600',
      bgClass: 'bg-purple-50',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    },
    {
      label: 'Appointments Pending',
      value: stats?.appointmentsPending,
      colorClass: 'text-orange-600',
      bgClass: 'bg-orange-50',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    },
    {
      label: 'Active Conversations',
      value: stats?.activeConversations,
      colorClass: 'text-emerald-600',
      bgClass: 'bg-emerald-50',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    },
  ]

  return (
    <div className="space-y-6">
      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* ── Middle row: Charts + Activity Feed ──────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left 2/3: charts */}
        <div className="xl:col-span-2 space-y-6">
          {/* Insurance type distribution */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-700 mb-4">
              Insurance Type Distribution
            </h2>
            {statsLoading ? (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                Loading…
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={insuranceBarData}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={56}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22}>
                    {insuranceBarData.map((entry) => (
                      <Cell
                        key={entry.type}
                        fill={INSURANCE_COLORS[entry.type as InsuranceType]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Source distribution + Top Called */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Source pie */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-700 mb-4">Lead Sources</h2>
              {statsLoading ? (
                <div className="h-44 flex items-center justify-center text-slate-400 text-sm">
                  Loading…
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={sourceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={74}
                        dataKey="value"
                        paddingAngle={3}
                        nameKey="name"
                      >
                        {sourceData.map((entry) => (
                          <Cell
                            key={entry.key}
                            fill={SOURCE_COLORS[entry.key] ?? '#94a3b8'}
                            stroke="white"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Legend */}
                  <div className="flex gap-4 mt-1">
                    {sourceData.map((entry) => (
                      <div key={entry.key} className="flex items-center gap-1.5 text-sm">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: SOURCE_COLORS[entry.key] ?? '#94a3b8' }}
                        />
                        <span className="text-slate-600 capitalize">{entry.name}</span>
                        <span className="text-slate-400 font-medium">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Top called numbers */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-700 mb-4">
                Top Called Numbers
              </h2>
              {callLoading ? (
                <div className="h-44 flex items-center justify-center text-slate-400 text-sm">
                  Loading…
                </div>
              ) : !callFreq?.length ? (
                <div className="h-44 flex items-center justify-center text-slate-400 text-sm">
                  No data
                </div>
              ) : (
                <div className="overflow-auto max-h-52">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                        <th className="pb-2 font-medium">Name / Phone</th>
                        <th className="pb-2 font-medium text-right">Calls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {callFreq.map((row) => (
                        <tr key={row.customerId} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 pr-2">
                            <p className="font-medium text-slate-700 truncate max-w-[160px]">
                              {row.name || '—'}
                            </p>
                            <p className="text-slate-400 text-xs">{row.phone}</p>
                          </td>
                          <td className="py-2 text-right">
                            <span className="inline-flex items-center justify-center w-8 h-6 bg-indigo-50 text-indigo-700 font-semibold text-xs rounded">
                              {row.count}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 1/3: Live activity feed */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full min-h-[520px]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-700">Live Activity</h2>
              <span className="text-xs text-slate-400">{events.length} events</span>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
              {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-sm gap-2">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="w-8 h-8 opacity-40"
                  >
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                  <p>Waiting for events…</p>
                </div>
              ) : (
                events.map((event) => {
                  const style = EVENT_COLORS[event.type] ?? {
                    border: 'border-slate-300',
                    badge: 'bg-slate-100 text-slate-600',
                    label: event.type,
                  }
                  return (
                    <div
                      key={event.id}
                      className={`flex gap-3 px-4 py-3 border-l-4 ${style.border} hover:bg-slate-50 transition-colors`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${style.badge}`}
                          >
                            {style.label}
                          </span>
                          <span className="text-xs text-slate-400 ml-auto shrink-0">
                            {formatTime(event.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1 truncate">
                          {eventSummary(event)}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
