'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Activity,
  Database,
  Server,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  Clock
} from 'lucide-react'

interface ServiceHealth {
  status: string
  [key: string]: any
}

interface HealthCheck {
  timestamp: string
  status: string
  services: {
    database?: ServiceHealth
    monitoring?: ServiceHealth
    memory?: ServiceHealth
  }
  environment?: {
    nodeEnv: string
    version: string
  }
}

export default function MonitoringPage() {
  const [healthCheck, setHealthCheck] = useState<HealthCheck | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    fetchHealthCheck()

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchHealthCheck()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const fetchHealthCheck = async () => {
    try {
      setRefreshing(true)
      const response = await fetch('/api/monitoring')
      const data = await response.json()

      if (data.success) {
        setHealthCheck(data.data)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Error fetching health check:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'ok':
        return <Badge className="bg-green-500 text-white">Healthy</Badge>
      case 'degraded':
        return <Badge className="bg-yellow-500 text-white">Degraded</Badge>
      case 'unhealthy':
        return <Badge className="bg-red-500 text-white">Unhealthy</Badge>
      default:
        return <Badge className="bg-gray-500 text-white">Unknown</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'ok':
        return <CheckCircle className="h-8 w-8 text-green-400" />
      case 'degraded':
        return <AlertCircle className="h-8 w-8 text-yellow-400" />
      case 'unhealthy':
        return <AlertCircle className="h-8 w-8 text-red-400" />
      default:
        return <Activity className="h-8 w-8 text-gray-400" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-white">Carregando status do sistema...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">System Monitoring</h1>
          <p className="text-white/60 mt-1">
            Status e saúde dos serviços da plataforma
          </p>
        </div>
        <Button onClick={fetchHealthCheck} disabled={refreshing} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Status Geral</p>
                <p className="text-2xl font-bold text-white mt-2 capitalize">
                  {healthCheck?.status || 'Unknown'}
                </p>
              </div>
              {getStatusIcon(healthCheck?.status || 'unknown')}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Banco de Dados</p>
                <p className="text-sm font-medium text-white mt-2 capitalize">
                  {healthCheck?.services?.database?.status || 'Unknown'}
                </p>
              </div>
              <Database className={`h-8 w-8 ${
                healthCheck?.services?.database?.status === 'healthy'
                  ? 'text-green-400'
                  : 'text-red-400'
              }`} />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Monitoramento</p>
                <p className="text-sm font-medium text-white mt-2">
                  {healthCheck?.services?.monitoring?.sentry ? 'Sentry Ativo' : 'Console'}
                </p>
              </div>
              <Activity className={`h-8 w-8 ${
                healthCheck?.services?.monitoring?.sentry
                  ? 'text-blue-400'
                  : 'text-gray-400'
              }`} />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Última Atualização</p>
                <p className="text-xs font-medium text-white mt-2">
                  {lastUpdate.toLocaleTimeString('pt-BR')}
                </p>
              </div>
              <Clock className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white">Serviços</CardTitle>
            <CardDescription className="text-white/60">
              Status detalhado de cada serviço
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {healthCheck?.services?.database && (
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-blue-400" />
                    <span className="font-medium text-white">PostgreSQL Database</span>
                  </div>
                  {getStatusBadge(healthCheck.services.database.status)}
                </div>
                {healthCheck.services.database.error && (
                  <p className="text-xs text-red-400 mt-2">
                    {healthCheck.services.database.error}
                  </p>
                )}
              </div>
            )}

            {healthCheck?.services?.monitoring && (
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-purple-400" />
                    <span className="font-medium text-white">Monitoring Service</span>
                  </div>
                  {getStatusBadge(healthCheck.services.monitoring.status)}
                </div>
                <div className="text-xs text-white/60 mt-2 space-y-1">
                  <p>Sentry: {healthCheck.services.monitoring.sentry ? 'Enabled' : 'Disabled'}</p>
                  <p>Database Logging: {healthCheck.services.monitoring.database ? 'Enabled' : 'Disabled'}</p>
                </div>
              </div>
            )}

            {healthCheck?.services?.memory && (
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Server className="h-5 w-5 text-green-400" />
                    <span className="font-medium text-white">Memory Usage</span>
                  </div>
                  {getStatusBadge(healthCheck.services.memory.status)}
                </div>
                <div className="text-xs text-white/60 mt-2 space-y-1">
                  <p>Heap Used: {healthCheck.services.memory.heapUsed}</p>
                  <p>Heap Total: {healthCheck.services.memory.heapTotal}</p>
                  <p>RSS: {healthCheck.services.memory.rss}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white">Informações do Sistema</CardTitle>
            <CardDescription className="text-white/60">
              Configuração e ambiente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <p className="text-sm text-white/60 mb-2">Ambiente</p>
              <p className="text-white font-mono">
                {healthCheck?.environment?.nodeEnv || 'unknown'}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <p className="text-sm text-white/60 mb-2">Versão</p>
              <p className="text-white font-mono">
                {healthCheck?.environment?.version || 'unknown'}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <p className="text-sm text-white/60 mb-2">Timestamp</p>
              <p className="text-white text-xs font-mono">
                {healthCheck?.timestamp || 'N/A'}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-blue-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-400 mb-1">
                    Sistema Operacional
                  </p>
                  <p className="text-xs text-white/60">
                    Todos os serviços estão respondendo normalmente. O monitoramento
                    está configurado e ativo.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white">Sobre o Monitoramento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-white/60">
            <p>
              O sistema de monitoramento verifica continuamente a saúde dos serviços
              da plataforma, incluindo banco de dados, APIs externas e recursos do sistema.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="font-medium text-green-400 mb-1">Healthy</p>
                <p className="text-xs">Serviço operando normalmente</p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="font-medium text-yellow-400 mb-1">Degraded</p>
                <p className="text-xs">Serviço com problemas não críticos</p>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="font-medium text-red-400 mb-1">Unhealthy</p>
                <p className="text-xs">Serviço indisponível ou com erro crítico</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
