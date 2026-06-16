'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import dynamic from 'next/dynamic'
import { Loader2, Download, TrendingUp, Users, Workflow as WorkflowIcon, Target } from 'lucide-react'
import { NaturalLanguageQuery } from '@/components/analytics/nl-query'

// recharts is heavy + DOM-only → code-split, load client-side on demand.
// All charts resolve to the same module so recharts loads once, in a lazy chunk.
const CHART_LOADING = () => <div className="h-[300px] w-full animate-pulse rounded-lg bg-white/5" />
const AgentPerformanceChart = dynamic(() => import('./AnalyticsCharts').then(m => m.AgentPerformanceChart), { ssr: false, loading: CHART_LOADING })
const AgentResolutionChart = dynamic(() => import('./AnalyticsCharts').then(m => m.AgentResolutionChart), { ssr: false, loading: CHART_LOADING })
const WorkflowExecutionsChart = dynamic(() => import('./AnalyticsCharts').then(m => m.WorkflowExecutionsChart), { ssr: false, loading: CHART_LOADING })
const LeadsFunnelChart = dynamic(() => import('./AnalyticsCharts').then(m => m.LeadsFunnelChart), { ssr: false, loading: CHART_LOADING })
const LeadsSourcePie = dynamic(() => import('./AnalyticsCharts').then(m => m.LeadsSourcePie), { ssr: false, loading: CHART_LOADING })
const LeadsTimelineChart = dynamic(() => import('./AnalyticsCharts').then(m => m.LeadsTimelineChart), { ssr: false, loading: CHART_LOADING })

interface AnalyticsData {
  overview: any
  agents: any[]
  workflows: any[]
  leads: any
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<string>('7d')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData>({
    overview: null,
    agents: [],
    workflows: [],
    leads: null,
  })

  useEffect(() => {
    async function fetchAllAnalytics() {
      setLoading(true)
      try {
        const token = localStorage.getItem('token')
        const headers = { Authorization: `Bearer ${token}` }

        const [overviewRes, agentsRes, workflowsRes, leadsRes] = await Promise.all([
          fetch(`/api/analytics/overview?period=${period}`, { headers }),
          fetch(`/api/analytics/agents?period=${period}`, { headers }),
          fetch(`/api/analytics/workflows?period=${period}`, { headers }),
          fetch(`/api/analytics/leads?period=${period}`, { headers }),
        ])

        const [overview, agents, workflows, leads] = await Promise.all([
          overviewRes.json(),
          agentsRes.json(),
          workflowsRes.json(),
          leadsRes.json(),
        ])

        setData({
          overview: overview.overview,
          agents: agents.agents || [],
          workflows: workflows.workflows || [],
          leads,
        })
      } catch (error) {
        console.error('Error fetching analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAllAnalytics()
  }, [period])

  const exportCSV = () => {
    // Implementação básica de exportação CSV
    const csvContent = `Analytics Export - ${period}\n\n`
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-${period}-${new Date().toISOString()}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    )
  }

  // Preparar dados para gráficos
  const agentChartData = data.agents.map(a => ({
    name: a.agent.name,
    conversas: a.metrics.conversations,
    resolucao: a.metrics.resolutionRate,
  }))

  const workflowChartData = data.workflows.map(w => ({
    name: w.workflow.name,
    execucoes: w.metrics.executions,
    sucesso: w.metrics.successRate,
  }))

  const leadsFunnelData = data.leads?.funnel || []
  const leadsSourceData = data.leads?.sourceDistribution || []
  const leadsTimelineData = data.leads?.timeline || []

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics</h1>
          <p className="text-white/60 mt-1">Dashboards detalhados e insights</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecione período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Natural Language Query */}
      <NaturalLanguageQuery />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <TrendingUp className="h-4 w-4 mr-2" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="agents">
            <Users className="h-4 w-4 mr-2" />
            Agentes
          </TabsTrigger>
          <TabsTrigger value="workflows">
            <WorkflowIcon className="h-4 w-4 mr-2" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="leads">
            <Target className="h-4 w-4 mr-2" />
            Leads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white text-sm">Total de Conversas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-white">{data.overview?.conversationsStarted || 0}</p>
                <p className="text-sm text-white/60 mt-2">
                  {data.overview?.conversationsCompleted || 0} completadas
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white text-sm">Total de Mensagens</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-white">{data.overview?.messagesTotal || 0}</p>
                <p className="text-sm text-white/60 mt-2">
                  {data.overview?.aiInteractions || 0} interações IA
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white text-sm">Leads Criados</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-white">{data.overview?.leadsCreated || 0}</p>
                <p className="text-sm text-white/60 mt-2">
                  {data.overview?.conversionRate || 0}% convertidos
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Performance por Agente</CardTitle>
            </CardHeader>
            <CardContent>
              <AgentPerformanceChart data={agentChartData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Métricas por Agente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.agents.map((agent, index) => (
                  <div
                    key={agent.agent.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="h-12 w-12 rounded-full flex items-center justify-center text-white font-semibold"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      >
                        {agent.agent.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-medium">{agent.agent.name}</p>
                        <p className="text-sm text-white/60">{agent.agent.description || 'Sem descrição'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-8 text-right">
                      <div>
                        <p className="text-2xl font-bold text-white">{agent.metrics.conversations}</p>
                        <p className="text-xs text-white/60">Conversas</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-400">{agent.metrics.resolutionRate}%</p>
                        <p className="text-xs text-white/60">Resolução</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-yellow-400">{agent.metrics.avgResponseTime}s</p>
                        <p className="text-xs text-white/60">Tempo Resp.</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Taxa de Resolução por Agente</CardTitle>
            </CardHeader>
            <CardContent>
              <AgentResolutionChart data={agentChartData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Execuções de Workflows</CardTitle>
            </CardHeader>
            <CardContent>
              <WorkflowExecutionsChart data={workflowChartData} />
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Detalhes dos Workflows</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.workflows.map((workflow, index) => (
                  <div
                    key={workflow.workflow.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="h-12 w-12 rounded-full flex items-center justify-center text-white font-semibold"
                        style={{ backgroundColor: COLORS[(index + 3) % COLORS.length] }}
                      >
                        <WorkflowIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{workflow.workflow.name}</p>
                        <p className="text-sm text-white/60">{workflow.workflow.description || 'Sem descrição'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-8 text-right">
                      <div>
                        <p className="text-2xl font-bold text-white">{workflow.metrics.executions}</p>
                        <p className="text-xs text-white/60">Execuções</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-400">{workflow.metrics.successRate}%</p>
                        <p className="text-xs text-white/60">Sucesso</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-400">{workflow.metrics.failureRate}%</p>
                        <p className="text-xs text-white/60">Falha</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white">Funil de Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <LeadsFunnelChart data={leadsFunnelData} />
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white">Distribuição por Fonte</CardTitle>
              </CardHeader>
              <CardContent>
                <LeadsSourcePie data={leadsSourceData} />
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Criação de Leads ao Longo do Tempo</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadsTimelineChart data={leadsTimelineData} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white text-sm">Taxa de Qualificação</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-purple-400">
                  {data.leads?.summary?.qualificationRate || 0}%
                </p>
                <p className="text-sm text-white/60 mt-2">
                  {data.leads?.summary?.leadsQualified || 0} leads qualificados
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white text-sm">Taxa de Conversão</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-400">
                  {data.leads?.summary?.conversionRate || 0}%
                </p>
                <p className="text-sm text-white/60 mt-2">
                  {data.leads?.summary?.leadsConverted || 0} leads convertidos
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white text-sm">Taxa de Perda</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-400">
                  {data.leads?.summary?.lossRate || 0}%
                </p>
                <p className="text-sm text-white/60 mt-2">
                  {data.leads?.summary?.leadsLost || 0} leads perdidos
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
