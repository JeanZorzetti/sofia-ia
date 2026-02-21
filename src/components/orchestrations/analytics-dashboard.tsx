'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts'
import {
  TrendingUp,
  Clock,
  DollarSign,
  Users,
  CheckCircle,
  XCircle,
  Activity
} from 'lucide-react'

interface ExecutionMetrics {
  totalExecutions: number
  successRate: number
  avgDuration: number
  totalTokens: number
  estimatedCost: number
  mostUsedAgent: {
    name: string
    count: number
  }
  executionsOverTime: Array<{
    date: string
    success: number
    failed: number
  }>
  stepFailureRate: Array<{
    step: string
    agentName: string
    failureCount: number
    totalCount: number
    failureRate: number
  }>
}

interface AnalyticsDashboardProps {
  orchestrationId: string
}

export function AnalyticsDashboard({ orchestrationId }: AnalyticsDashboardProps) {
  const [metrics, setMetrics] = useState<ExecutionMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
  }, [orchestrationId])

  const fetchMetrics = async () => {
    try {
      const response = await fetch(`/api/orchestrations/${orchestrationId}/analytics`)
      const data = await response.json()

      if (data.success) {
        setMetrics(data.data)
      }
    } catch (error) {
      console.error('Error fetching metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Activity className="h-8 w-8 text-blue-400 animate-spin" />
      </div>
    )
  }

  if (!metrics) {
    return (
      <Card className="glass-card">
        <CardContent className="py-12">
          <p className="text-center text-white/60">Nenhum dado disponível</p>
        </CardContent>
      </Card>
    )
  }

  // Cost per 1M tokens (example rates for different models)
  const costPerMillionTokens = 0.5 // $0.50 per 1M tokens (adjust based on your model)
  const estimatedCost = (metrics.totalTokens / 1000000) * costPerMillionTokens

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Success Rate */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white/60">Taxa de Sucesso</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{metrics.successRate.toFixed(1)}%</div>
            <p className="text-xs text-white/40 mt-1">
              {metrics.totalExecutions} execuções totais
            </p>
            <div className="mt-2 flex gap-2">
              <Badge className="bg-green-500/20 text-green-300 text-[10px]">
                <CheckCircle className="h-3 w-3 mr-1" />
                {Math.round((metrics.successRate / 100) * metrics.totalExecutions)}
              </Badge>
              <Badge className="bg-red-500/20 text-red-300 text-[10px]">
                <XCircle className="h-3 w-3 mr-1" />
                {metrics.totalExecutions - Math.round((metrics.successRate / 100) * metrics.totalExecutions)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Average Duration */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white/60">Duração Média</CardTitle>
            <Clock className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {metrics.avgDuration < 1000
                ? `${metrics.avgDuration.toFixed(0)}ms`
                : `${(metrics.avgDuration / 1000).toFixed(2)}s`}
            </div>
            <p className="text-xs text-white/40 mt-1">Por execução</p>
          </CardContent>
        </Card>

        {/* Total Tokens */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white/60">Custo Estimado</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${estimatedCost.toFixed(4)}</div>
            <p className="text-xs text-white/40 mt-1">
              {metrics.totalTokens.toLocaleString()} tokens
            </p>
          </CardContent>
        </Card>

        {/* Most Used Agent */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white/60">Agente Mais Usado</CardTitle>
            <Users className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-white truncate">
              {metrics.mostUsedAgent.name}
            </div>
            <p className="text-xs text-white/40 mt-1">
              {metrics.mostUsedAgent.count} execuções
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Executions Over Time Chart */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Execuções ao Longo do Tempo</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics.executionsOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis
                dataKey="date"
                stroke="rgba(255,255,255,0.4)"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="rgba(255,255,255,0.4)"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(17, 24, 39, 0.95)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Legend
                wrapperStyle={{ color: '#fff' }}
              />
              <Line
                type="monotone"
                dataKey="success"
                stroke="#22c55e"
                strokeWidth={2}
                name="Sucesso"
                dot={{ fill: '#22c55e' }}
              />
              <Line
                type="monotone"
                dataKey="failed"
                stroke="#ef4444"
                strokeWidth={2}
                name="Falha"
                dot={{ fill: '#ef4444' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Step Failure Heatmap */}
      {metrics.stepFailureRate.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Heatmap de Falhas por Step</CardTitle>
            <p className="text-xs text-white/60">Steps com maior taxa de falha</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.stepFailureRate}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="step"
                  stroke="rgba(255,255,255,0.4)"
                  style={{ fontSize: '11px' }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.4)"
                  style={{ fontSize: '12px' }}
                  label={{ value: 'Taxa de Falha (%)', angle: -90, position: 'insideLeft', style: { fill: 'rgba(255,255,255,0.6)' } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: any) => {
                    if (value === undefined || value === null) return ['', '']
                    return [`${(value as number).toFixed(1)}%`, 'Taxa de Falha']
                  }}
                />
                <Bar dataKey="failureRate" name="Taxa de Falha">
                  {metrics.stepFailureRate.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.failureRate > 50
                          ? '#ef4444'
                          : entry.failureRate > 25
                          ? '#f59e0b'
                          : '#10b981'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Legend for heatmap */}
            <div className="flex items-center justify-center gap-4 mt-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10b981' }} />
                <span className="text-white/60">&lt; 25% Falha</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f59e0b' }} />
                <span className="text-white/60">25-50% Falha</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }} />
                <span className="text-white/60">&gt; 50% Falha</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
