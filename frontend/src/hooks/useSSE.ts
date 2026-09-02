import { useCallback, useEffect, useRef, useState } from 'react'
import type { DashboardEvent, SSEEventType } from '../types'

const MAX_EVENTS = 100
const RECONNECT_DELAY_MS = 3000
const SSE_URL = '/api/v1/sse/events'

let _idCounter = 0
function nextId(): string {
  return `sse-${Date.now()}-${++_idCounter}`
}

export function useSSE(): { events: DashboardEvent[]; connected: boolean } {
  const [events, setEvents] = useState<DashboardEvent[]>([])
  const [connected, setConnected] = useState(false)
  const esRef = useRef<EventSource | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmounted = useRef(false)

  const connect = useCallback(() => {
    if (unmounted.current) return

    const es = new EventSource(SSE_URL)
    esRef.current = es

    es.onopen = () => {
      if (!unmounted.current) setConnected(true)
    }

    es.onmessage = (e: MessageEvent<string>) => {
      if (unmounted.current) return
      try {
        const parsed = JSON.parse(e.data) as {
          type: SSEEventType
          timestamp: string
          data: Record<string, unknown>
        }
        const event: DashboardEvent = {
          id: nextId(),
          type: parsed.type,
          timestamp: parsed.timestamp ?? new Date().toISOString(),
          data: parsed.data ?? {},
        }
        setEvents((prev) => {
          const next = [event, ...prev]
          return next.length > MAX_EVENTS ? next.slice(0, MAX_EVENTS) : next
        })
      } catch {
        // ignore malformed messages
      }
    }

    es.onerror = () => {
      if (unmounted.current) return
      setConnected(false)
      es.close()
      esRef.current = null
      reconnectTimer.current = setTimeout(() => {
        if (!unmounted.current) connect()
      }, RECONNECT_DELAY_MS)
    }
  }, [])

  useEffect(() => {
    unmounted.current = false
    connect()
    return () => {
      unmounted.current = true
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
    }
  }, [connect])

  return { events, connected }
}
