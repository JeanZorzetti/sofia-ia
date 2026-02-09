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

interface WhatsAppInstance {
  id: number
  name: string
  phone: string
  status: 'connected' | 'disconnected' | 'connecting'
  qrCode?: string
  lastSeen?: string
}

interface WhatsAppStats {
  total_instances: number
  connected_instances: number
  messages_today: number
  [key: string]: any
}

interface InstanceStats {
  total: number
  connected: number
  disconnected: number
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
        setData(result.conversations || result)
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

export function useWhatsAppInstances() {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([])
  const [stats, setStats] = useState<InstanceStats>({ total: 0, connected: 0, disconnected: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/instances')

      if (response.ok) {
        const result = await response.json()
        const raw = Array.isArray(result.data) ? result.data : []
        // Normalize Evolution API shape: { instance: { instanceName, status }, ... } → flat
        const list = raw.map((item: any) => {
          const inst = item.instance || item
          const status = inst.status === 'open' ? 'connected' : inst.status === 'close' ? 'disconnected' : inst.status || 'unknown'
          return {
            id: inst.instanceName || inst.name || item.instanceName || item.name,
            name: inst.instanceName || inst.name || item.instanceName || item.name,
            phone: inst.owner || item.owner || '',
            status,
            phone_number: inst.owner || item.owner || '',
          }
        })
        setInstances(list)

        const total = list.length
        const connected = list.filter((i: any) => i.status === 'connected').length
        setStats({
          total,
          connected,
          disconnected: total - connected,
        })

        setError(null)
      } else if (response.status === 401) {
        setError('Unauthorized')
      } else {
        setError('Failed to fetch instances')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch instances')
    } finally {
      setLoading(false)
    }
  }, [])

  const createInstance = useCallback(async (name: string, phone: string) => {
    try {
      const response = await fetch('/api/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName: name }),
      })

      if (response.ok) {
        await refresh()
        return { success: true }
      } else {
        const data = await response.json()
        return { success: false, error: data.message || 'Failed to create instance' }
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to create instance' }
    }
  }, [refresh])

  const deleteInstance = useCallback(async (instanceId: string | number) => {
    try {
      const response = await fetch(`/api/instances/${instanceId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await refresh()
        return { success: true }
      } else {
        const data = await response.json()
        return { success: false, error: data.message || 'Failed to delete instance' }
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete instance' }
    }
  }, [refresh])

  const logoutInstance = useCallback(async (instanceId: string | number) => {
    try {
      const response = await fetch(`/api/instances/${instanceId}/logout`, {
        method: 'POST',
      })

      if (response.ok) {
        await refresh()
        return { success: true }
      } else {
        const data = await response.json()
        return { success: false, error: data.message || 'Failed to logout instance' }
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to logout instance' }
    }
  }, [refresh])

  const restartInstance = useCallback(async (instanceId: string | number) => {
    try {
      const response = await fetch(`/api/instances/${instanceId}/restart`, {
        method: 'POST',
      })

      if (response.ok) {
        await refresh()
        return { success: true }
      } else {
        const data = await response.json()
        return { success: false, error: data.message || 'Failed to restart instance' }
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to restart instance' }
    }
  }, [refresh])

  const getQRCode = useCallback(async (instanceId: string | number) => {
    try {
      const response = await fetch(`/api/instances/${instanceId}/qr`)

      if (response.ok) {
        const data = await response.json()
        return { success: true, qrCode: data.qrCode }
      } else {
        const data = await response.json()
        return { success: false, error: data.message || 'Failed to get QR code' }
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to get QR code' }
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30000)
    return () => clearInterval(interval)
  }, [refresh])

  return {
    instances,
    stats,
    loading,
    error,
    refresh,
    createInstance,
    deleteInstance,
    logoutInstance,
    restartInstance,
    getQRCode,
  }
}

export function useWhatsAppStats() {
  const [stats, setStats] = useState<WhatsAppStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/whatsapp/stats')

      if (response.ok) {
        const result = await response.json()
        setStats(result.data || result)
        setError(null)
      } else if (response.status === 401) {
        setError('Unauthorized')
      } else {
        setError('Failed to fetch WhatsApp stats')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch WhatsApp stats')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30000)
    return () => clearInterval(interval)
  }, [refresh])

  return { stats, loading, error, refresh }
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
