import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

type Page = 'dashboard' | 'customers' | 'appointments'

interface LayoutProps {
  children: ReactNode
  currentPage: Page
  onNavigate: (page: Page) => void
  sseConnected: boolean
}

export function Layout({ children, currentPage, onNavigate, sseConnected }: LayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar currentPage={currentPage} sseConnected={sseConnected} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
