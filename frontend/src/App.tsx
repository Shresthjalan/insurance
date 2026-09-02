import { useState } from 'react'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './pages/Dashboard'
import { Customers } from './pages/Customers'
import { Appointments } from './pages/Appointments'
import { useSSE } from './hooks/useSSE'

type Page = 'dashboard' | 'customers' | 'appointments'

export function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const { events, connected } = useSSE()

  function renderPage() {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard events={events} />
      case 'customers':
        return <Customers />
      case 'appointments':
        return <Appointments />
    }
  }

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      sseConnected={connected}
    >
      {renderPage()}
    </Layout>
  )
}
