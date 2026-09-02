type Page = 'dashboard' | 'customers' | 'appointments'

interface SidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
}

const navItems: { id: Page; label: string; icon: string }[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  },
  {
    id: 'appointments',
    label: 'Appointments',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  },
]

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="flex flex-col w-64 min-h-screen bg-slate-800 text-slate-100 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-700">
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5 text-white"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <span className="font-bold text-white text-lg tracking-tight">InsuranceCRM</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Main Menu
        </p>
        {navItems.map((item) => {
          const isActive = currentPage === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <span
                className="shrink-0"
                dangerouslySetInnerHTML={{ __html: item.icon }}
              />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-700 text-xs text-slate-400">
        &copy; {new Date().getFullYear()} InsuranceCRM
      </div>
    </aside>
  )
}
