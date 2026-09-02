const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  customers: 'Customers',
  appointments: 'Appointments',
}

interface TopBarProps {
  currentPage: string
  sseConnected: boolean
}

export function TopBar({ currentPage, sseConnected }: TopBarProps) {
  const title = PAGE_TITLES[currentPage] ?? 'InsuranceCRM'

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
      <div className="flex items-center gap-3">
        {/* SSE status */}
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              sseConnected
                ? 'bg-emerald-500 shadow-[0_0_6px_2px_rgba(16,185,129,0.4)]'
                : 'bg-slate-400'
            }`}
            title={sseConnected ? 'Live feed connected' : 'Live feed disconnected'}
          />
          <span className={sseConnected ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
            {sseConnected ? 'Live' : 'Disconnected'}
          </span>
        </div>

        {/* Time */}
        <span className="text-sm text-slate-400 border-l border-slate-200 pl-3">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>
    </header>
  )
}
