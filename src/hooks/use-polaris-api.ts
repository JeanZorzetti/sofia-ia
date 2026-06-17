'use client'

import { useState, useEffect, useCallback } from 'react'

interface DashboardData {
  stats: {
    total_messages: number
    active_conversations: number
    qualified_leads: number
    conversion_rate: number
    growth_percentage: number
  }
  activity_chart: Array<{ day: string; messages: number }>
  leads_by_status: Array<{ status: string; count: number; color: string }>
}

interface Conversation {
  id: number
  contactName: string
  contactPhone: string
  lastMessage: string
  timestamp: string
  status: string
  unreadCount: number
}

interface HealthData {
  status: string
  timestamp: string
  services: {
    database: boolean
    whatsapp: boolean
  }
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard/overview')

      if (response.ok) {
        const result = await response.json()
        setData(result.data || result)
        setError(null)
      } else if (response.status === 401) {
        setError('Unauthorized')
      } else {
        setError('Failed to fetch dashboard data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30000)
    return () => clearInterval(interval)
  }, [refresh])

  return { data, loading, error, refresh }
}

export function useRecentConversations() {
  const [data, setData] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/conversations/recent')

      if (response.ok) {
        const result = await response.json()
        setData(Array.isArray(result.data) ? result.data : Array.isArray(result) ? result : [])
        setError(null)
      } else if (response.status === 401) {
        setError('Unauthorized')
      } else {
        setError('Failed to fetch conversations')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch conversations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 15000)
    return () => clearInterval(interval)
  }, [refresh])

  return { data, loading, error, refresh }
}

export interface WabaAccountView {
  id: string
  phoneNumberId: string
  wabaId: string
  displayPhoneNumber: string | null
  verifiedName: string | null
  status: string
  agentId: string | null
  createdAt: string
}

/** Contas WABA (Cloud API oficial) conectadas via Embedded Signup. */
export function useWhatsAppAccounts() {
  const [accounts, setAccounts] = useState<WabaAccountView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/whatsapp/accounts')
      const result = await response.json()
      if (response.ok && result.success) {
        setAccounts(Array.isArray(result.data) ? result.data : [])
        setError(null)
      } else {
        setError(result.error || `HTTP ${response.status}`)
        setAccounts([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch accounts')
    } finally {
      setLoading(false)
    }
  }, [])

  const connect = useCallback(
    async (payload: { code: string; wabaId: string; phoneNumberId: string; agentId?: string }) => {
      try {
        const response = await fetch('/api/whatsapp/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await response.json()
        if (response.ok && data.success) {
          await refresh()
          return { success: true }
        }
        return { success: false, error: data.error || `HTTP ${response.status}` }
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Failed to connect' }
      }
    },
    [refresh]
  )

  const disconnect = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`/api/whatsapp/accounts/${id}`, { method: 'DELETE' })
        if (response.ok) {
          await refresh()
          return { success: true }
        }
        const data = await response.json().catch(() => ({}))
        return { success: false, error: data.error || 'Failed to disconnect' }
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Failed to disconnect' }
      }
    },
    [refresh]
  )

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30000)
    return () => clearInterval(interval)
  }, [refresh])

  return { accounts, loading, error, refresh, connect, disconnect }
}

export function useApiHealth() {
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [isHealthy, setIsHealthy] = useState(false)

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/health')

      if (response.ok) {
        const data = await response.json()
        setHealthData(data)
        setIsHealthy(data.status === 'ok' || data.status === 'healthy')
      } else {
        setIsHealthy(false)
      }
    } catch (err) {
      setIsHealthy(false)
    }
  }, [])

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 60000)
    return () => clearInterval(interval)
  }, [checkHealth])

  return { isHealthy, healthData, checkHealth }
}
