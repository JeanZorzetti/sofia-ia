'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ExecutionDetailDrawer } from '@/components/orchestrations/execution-detail-drawer'
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Play,
  GitBranch,
  RefreshCw,
  Filter,
  Activity
} from 'lucide-react'
import { toast } from 'sonner'

interface StepResult {
  agentId: string
  agentName: string
  role: string
  input: any
  output: string
  timestamp: string
  model?: string
  startedAt?: string
  completedAt?: string
  durationMs?: number
  tokensUsed?: number
}

interface Execution {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rate_limited' | 'cancelled'
  input: any
  output: any
  error: string | null
  startedAt: string
  completedAt: string | null
  agentResults: StepResult[]
  orchestrationId: string
  orchestration?: {
    id: string
    name: string
    strategy: string
    agents: any[]
  }
}

interface Counts {
  all: number
  completed: number
  failed: number
  running: number
  pending: number
  rate_limited: number
  cancelled: number
}

export default function OrchestrationHistoryPage() {
  const router = useRouter()
  const [executions, setExecutions] = useState<Execution[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [orchestrationFilter, setOrchestrationFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [counts, setCounts] = useState<Counts>({
    all: 0,
    completed: 0,
    failed: 0,
    running: 0,
    pending: 0,
    rate_limited: 0,
    cancelled: 0
  })

  // Unique orchestrations for filter
  const [orchestrations, setOrchestrations] = useState<{ id: string; name: string }[]>([])

  const fetchExecutions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      })

      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (orchestrationFilter !== 'all') params.append('orchestrationId', orchestrationFilter)
      if (searchQuery.trim()) params.append('search', searchQuery.trim())

      const response = await fetch(`/api/orchestrations/executions?${params}`)
      const data = await response.json()

      if (data.success) {
        setExecutions(data.data)
        setTotalPages(data.pagination?.totalPages || 1)
        setCounts(data.counts || counts)

        // Extract unique orchestrations for filter
        const orchMap = new Map<string, string>()
        data.data.forEach((exec: Execution) => {
          if (exec.orchestration) {
            orchMap.set(exec.orchestration.id, exec.orchestration.name)
          }
        })
        setOrchestrations(Array.from(orchMap.entries()).map(([id, name]) => ({ id, name })))
      }
    } catch (error) {
      console.error('Error fetching executions:', error)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, orchestrationFilter, searchQuery])

  useEffect(() => {
    fetchExecutions()
  }, [page, statusFilter, orchestrationFilter])

  const handleSearch = () => {
    setPage(1)
    fetchExecutions()
  }

  const handleReExecute = async (executionId: string) => {
    const execution = executions.find(e => e.id === executionId)
    if (!execution) return

    try {
      toast.loading('Iniciando re-execucao...', { id: 'reexecute' })
      const response = await fetch(`/api/orchestrations/${execution.orchestrationId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: execution.input })
      })
      const data = await response.json()

      if (data.success) {
        toast.success('Re-execucao iniciada! Redirecionando...', { id: 'reexecute' })
        setDrawerOpen(false)
        setTimeout(() => {
          router.push(`/dashboard/orchestrations/${execution.orchestrationId}`)
        }, 1500)
      } else {
        toast.error(data.error || 'Erro ao re-executar', { id: 'reexecute' })
      }
    } catch (error) {
      console.error('Error re-executing:', error)
      toast.error('Erro ao re-executar', { id: 'reexecute' })
    }
  }

  const handleReExecuteFromStep = async (executionId: string, stepIndex: number) => {
    const execution = executions.find(e => e.id === executionId)
    if (!execution) return

    try {
      toast.loading(`Re-executando a partir do step ${stepIndex + 1}...`, { id: 'reexecute-step' })
      const response = await fetch(`/api/orchestrations/${execution.orchestrationId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: execution.input, startFromStep: stepIndex })
      })
      const data = await response.json()

      if (data.success) {
        toast.success('Re-execucao iniciada!', { id: 'reexecute-step' })
        setDrawerOpen(false)
        setTimeout(() => {
          router.push(`/dashboard/orchestrations/${execution.orchestrationId}`)
        }, 1500)
      } else {
        toast.error(data.error || 'Erro ao re-executar', { id: 'reexecute-step' })
      }
    } catch (error) {
      console.error('Error re-executing from step:', error)
      toast.error('Erro ao re-executar', { id: 'reexecute-step' })
    }
  }

  const handleResume = async (executionId: string, resumeFromTask: string) => {
    const execution = executions.find(e => e.id === executionId)
    if (!execution) return

    try {
      toast.loading('Continuando execucao...', { id: 'resume' })
      const response = await fetch(`/api/orchestrations/${execution.orchestrationId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: execution.input, resumeFromTask })
      })
      const data = await response.json()

      if (data.success) {
        toast.success('Execucao retomada!', { id: 'resume' })
        setDrawerOpen(false)
        setTimeout(() => {
          router.push(`/dashboard/orchestrations/${execution.orchestrationId}`)
        }, 1500)
      } else {
        toast.error(data.error || 'Erro ao retomar', { id: 'resume' })
      }
    } catch (error) {
      console.error('Error resuming:', error)
      toast.error('Erro ao retomar execucao', { id: 'resume' })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Sucesso
          </Badge>
        )
      case 'failed':
        return (
          <Badge className="bg-red-500/20 text-red-300 border-red-500/30 gap-1">
            <XCircle className="h-3 w-3" />
            Falha
          </Badge>
        )
      case 'running':
        return (
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Executando
          </Badge>
        )
      case 'rate_limited':
        return (
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 gap-1">
            <Clock className="h-3 w-3" />
            Limite atingido
          </Badge>
        )
      case 'cancelled':
        return (
          <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/30 gap-1">
            <XCircle className="h-3 w-3" />
            Cancelado
          </Badge>
        )
      default:
        return <Badge variant="outline">Pendente</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR')
  }

  const formatDuration = (startedAt: string, completedAt: string | null) => {
    if (!completedAt) return '-'
    const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime()
    if (duration < 1000) return `${duration}ms`
    return `${(duration / 1000).toFixed(1)}s`
  }

  const getTotalTokens = (agentResults: StepResult[]) => {
    return agentResults.reduce((sum, r) => sum + (r.tokensUsed || 0), 0)
  }

  const getStrategyBadge = (strategy: string) => {
    switch (strategy) {
      case 'sequential':
        return <Badge variant="outline" className="text-[10px] text-blue-300 border-blue-500/30">Sequencial</Badge>
      case 'parallel':
        return <Badge variant="outline" className="text-[10px] text-purple-300 border-purple-500/30">Paralelo</Badge>
      case 'consensus':
        return <Badge variant="outline" className="text-[10px] text-yellow-300 border-yellow-500/30">Consenso</Badge>
      default:
        return null
    }
  }

  const totalSuccessRate = counts.all > 0
    ? Math.round((counts.completed / counts.all) * 100)
    : 0

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Historico de Execucoes</h1>
            <p className="text-white/60 mt-1">Todas as execucoes de orquestracoes com replay e analise</p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchExecutions} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/60 mb-1">Total</p>
                <p className="text-2xl font-bold text-white">{counts.all}</p>
              </div>
              <Activity className="h-8 w-8 text-white/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/60 mb-1">Sucesso</p>
                <p className="text-2xl font-bold text-green-400">{counts.completed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-400/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/60 mb-1">Falha</p>
                <p className="text-2xl font-bold text-red-400">{counts.failed}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-400/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/60 mb-1">Taxa de sucesso</p>
                <p className="text-2xl font-bold text-white">{totalSuccessRate}%</p>
              </div>
              <div className="h-8 w-8 rounded-full flex items-center justify-center bg-white/5">
                <span className="text-xs font-bold text-white/60">{totalSuccessRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-white/40" />
            <span className="text-sm text-white/60 font-medium">Filtros</span>
          </div>

          {/* Status Tabs */}
          <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
            <TabsList className="bg-white/5 border border-white/10 w-full justify-start flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="all" className="gap-1 text-xs">
                Todos
                <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded">{counts.all}</span>
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-1 text-xs">
                Sucesso
                <span className="text-[10px] bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded">{counts.completed}</span>
              </TabsTrigger>
              <TabsTrigger value="failed" className="gap-1 text-xs">
                Falha
                <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded">{counts.failed}</span>
              </TabsTrigger>
              <TabsTrigger value="running" className="gap-1 text-xs">
                Executando
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">{counts.running}</span>
              </TabsTrigger>
              <TabsTrigger value="rate_limited" className="gap-1 text-xs">
                Limite
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">{counts.rate_limited}</span>
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="gap-1 text-xs">
                Cancelado
                <span className="text-[10px] bg-gray-500/20 text-gray-300 px-1.5 py-0.5 rounded">{counts.cancelled}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search + Orchestration filter */}
          <div className="flex gap-2 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                placeholder="Buscar no input, output ou nome da orquestracao..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9 bg-white/5 border-white/10 text-white"
              />
            </div>
            {orchestrations.length > 0 && (
              <Select value={orchestrationFilter} onValueChange={(v) => { setOrchestrationFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[220px] bg-white/5 border-white/10 text-white">
                  <GitBranch className="h-3.5 w-3.5 mr-2 text-white/40" />
                  <SelectValue placeholder="Todas as orquestracoes" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  <SelectItem value="all">Todas as orquestracoes</SelectItem>
                  {orchestrations.map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button onClick={handleSearch} variant="outline">
              Buscar
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Executions List */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            </div>
          ) : executions.length === 0 ? (
            <div className="text-center py-16">
              <Activity className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/60">
                {searchQuery || statusFilter !== 'all'
                  ? 'Nenhuma execucao encontrada com esses filtros'
                  : 'Nenhuma execucao realizada ainda'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push('/dashboard/orchestrations')}
                >
                  Ir para Orquestracoes
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {executions.map((execution) => (
                <button
                  key={execution.id}
                  onClick={() => {
                    setSelectedExecution(execution)
                    setDrawerOpen(true)
                  }}
                  className="w-full p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-left"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(execution.status)}
                      {execution.orchestration && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/dashboard/orchestrations/${execution.orchestration!.id}`)
                          }}
                          className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white/90 transition-colors"
                        >
                          <GitBranch className="h-3 w-3" />
                          {execution.orchestration.name}
                        </button>
                      )}
                      {execution.orchestration && getStrategyBadge(execution.orchestration.strategy)}
                    </div>
                    <span className="text-xs text-white/40 flex-shrink-0">
                      {formatDate(execution.startedAt)}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-[10px] text-white/40 mb-0.5">Duracao</p>
                      <p className="text-sm text-white font-medium">
                        {formatDuration(execution.startedAt, execution.completedAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 mb-0.5">Steps</p>
                      <p className="text-sm text-white font-medium">
                        {execution.agentResults.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 mb-0.5">Tokens</p>
                      <p className="text-sm text-white font-medium">
                        {getTotalTokens(execution.agentResults).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 mb-0.5">Agentes</p>
                      <p className="text-sm text-white font-medium">
                        {execution.orchestration?.agents?.length || '-'}
                      </p>
                    </div>
                  </div>

                  {/* Input preview */}
                  {execution.input && (
                    <div className="mt-3 p-2 rounded bg-white/5 border border-white/5">
                      <p className="text-[10px] text-white/30 mb-1">Input:</p>
                      <p className="text-xs text-white/50 line-clamp-1 font-mono">
                        {typeof execution.input === 'string'
                          ? execution.input
                          : JSON.stringify(execution.input)}
                      </p>
                    </div>
                  )}

                  {/* Error preview */}
                  {execution.error && (
                    <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                      <p className="text-xs text-red-400 line-clamp-1">{execution.error}</p>
                    </div>
                  )}

                  {/* Replay button hint */}
                  {(execution.status === 'completed' || execution.status === 'failed' || execution.status === 'rate_limited') && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-white/30">
                      <Play className="h-3 w-3" />
                      <span>Clique para ver detalhes e replay</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <span className="text-sm text-white/60">
                Pagina {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Proxima
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Execution Detail Drawer */}
      <ExecutionDetailDrawer
        execution={selectedExecution}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onReExecute={handleReExecute}
        onReExecuteFromStep={handleReExecuteFromStep}
        onResume={handleResume}
      />
    </div>
  )
}
