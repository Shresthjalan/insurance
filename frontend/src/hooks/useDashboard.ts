import { useQuery } from '@tanstack/react-query'
import {
  fetchAppointments,
  fetchCallFrequency,
  fetchCustomers,
  fetchDashboardStats,
} from '../api/dashboard'
import type {
  AppointmentFilters,
  CustomerFilters,
} from '../types'

const REFETCH_INTERVAL = 30_000 // 30 s

export function useStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: REFETCH_INTERVAL,
    select: (res) => res.data,
  })
}

export function useCustomers(filters: CustomerFilters = {}) {
  return useQuery({
    queryKey: ['dashboard', 'customers', filters],
    queryFn: () => fetchCustomers(filters),
    refetchInterval: REFETCH_INTERVAL,
  })
}

export function useCallFrequency(limit = 10) {
  return useQuery({
    queryKey: ['dashboard', 'call-frequency', limit],
    queryFn: () => fetchCallFrequency(limit),
    refetchInterval: REFETCH_INTERVAL,
    select: (res) => res.data,
  })
}

export function useAppointments(filters: AppointmentFilters = {}) {
  return useQuery({
    queryKey: ['dashboard', 'appointments', filters],
    queryFn: () => fetchAppointments(filters),
    refetchInterval: REFETCH_INTERVAL,
  })
}
