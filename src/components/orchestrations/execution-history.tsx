'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExecutionDetailDrawer } from './execution-detail-drawer'
import { ExecutionCompare } from './execution-compare'
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowLeftRight,
  Play
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
  status: 'pending' | 'running' | 'completed' | 'failed'
  input: any
  output: any
  error: string | null
  startedAt: string
  completedAt: string | null
  agentResults: StepResult[]
}

interface ExecutionHistoryProps {
  orchestrationId: string
}

export function ExecutionHistory({ orchestrationId }: ExecutionHistoryProps) {
  const [executions, setExecutions] = useState<Execution[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Comparison mode
  const [compareMode, setCompareMode] = useState(false)
  const [compareExecutions, setCompareExecutions] = useState<[Execution | null, Execution | null]>([null, null])
  const [compareOpen, setCompareOpen] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [counts, setCounts] = useState({
    all: 0,
    completed: 0,
    failed: 0,
    running: 0,
    pending: 0
  })

  const fetchExecutions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      })

      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }

      const response = await fetch(`/api/orchestrations/${orchestrationId}?${params}`)
      const data = await response.json()

      if (data.success) {
        setExecutions(data.data.executions || [])
        setTotalPages(data.pagination?.totalPages || 1)
        setCounts(data.counts || counts)
      }
    } catch (error) {
      console.error('Error fetching executions:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExecutions()
  }, [orchestrationId, statusFilter, page])

  const handleSearch = () => {
    setPage(1)
    fetchExecutions()
  }

  const handleExecutionClick = (execution: Execution) => {
    if (compareMode) {
      // Add to comparison list
      if (!compareExecutions[0]) {
        setCompareExecutions([execution, null])
      } else if (!compareExecutions[1]) {
        setCompareExecutions([compareExecutions[0], execution])
        // Auto-open comparison dialog
        setCompareOpen(true)
      } else {
        // Reset and start over
        setCompareExecutions([execution, null])
      }
    } else {
      setSelectedExecution(execution)
      setDrawerOpen(true)
    }
  }

  const handleToggleCompareMode = () => {
    setCompareMode(!compareMode)
    setCompareExecutions([null, null])
  }

  const handleCompareClose = () => {
    setCompareOpen(false)
    setCompareMode(false)
    setCompareExecutions([null, null])
  }

  const handleReExecute = async (executionId: string) => {
    const execution = executions.find(e => e.id === executionId)
    if (!execution) return

    try {
      toast.loading('Iniciando re-execução...', { id: 'reexecute' })

      const response = await fetch(`/api/orchestrations/${orchestrationId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: execution.input })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Re-execução iniciada com sucesso!', { id: 'reexecute' })
        setDrawerOpen(false)
        // Refresh the list
        setTimeout(() => fetchExecutions(), 1000)
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

      // Send the ORIGINAL execution input — the backend will seed conversation
      // history from previous results automatically (accumulated context model)
      const response = await fetch(`/api/orchestrations/${orchestrationId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: execution.input,
          startFromStep: stepIndex
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Re-execução iniciada a partir do step!', { id: 'reexecute-step' })
        setDrawerOpen(false)
        setTimeout(() => fetchExecutions(), 1000)
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
      toast.loading('Continuando execução...', { id: 'resume' })

      const response = await fetch(`/api/orchestrations/${orchestrationId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: execution.input,
          resumeFromTask
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Execução retomada com sucesso!', { id: 'resume' })
        setDrawerOpen(false)
        setTimeout(() => fetchExecutions(), 1000)
      } else {
        toast.error(data.error || 'Erro ao retomar execução', { id: 'resume' })
      }
    } catch (error) {
      console.error('Error resuming execution:', error)
      toast.error('Erro ao retomar execução', { id: 'resume' })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-500 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Sucesso
          </Badge>
        )
      case 'failed':
        return (
          <Badge className="bg-red-500 gap-1">
            <XCircle className="h-3 w-3" />
            Falha
          </Badge>
        )
      case 'running':
        return (
          <Badge className="bg-blue-500 gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Executando
          </Badge>
        )
      case 'rate_limited':
        return (
          <Badge className="bg-amber-500 gap-1">
            <Clock className="h-3 w-3" />
            Limite atingido
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
    return `${(duration / 1000).toFixed(2)}s`
  }

  return (
    <>
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Histórico de Execuções</CardTitle>
            <Button
              size="sm"
              variant={compareMode ? 'default' : 'outline'}
              onClick={handleToggleCompareMode}
              className="gap-1"
            >
              <ArrowLeftRight className="h-4 w-4" />
              {compareMode ? 'Cancelar Comparação' : 'Comparar'}
            </Button>
          </div>

          {/* Status Tabs */}
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
            <TabsList className="bg-white/5 border border-white/10 w-full justify-start">
              <TabsTrigger value="all" className="gap-1">
                Todos
                <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded">{counts.all}</span>
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-1">
                Sucesso
                <span className="text-[10px] bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded">
                  {counts.completed}
                </span>
              </TabsTrigger>
              <TabsTrigger value="failed" className="gap-1">
                Falha
                <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded">
                  {counts.failed}
                </span>
              </TabsTrigger>
              <TabsTrigger value="running" className="gap-1">
                Executando
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">
                  {counts.running}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search */}
          <div className="flex gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                placeholder="Buscar no input ou output..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9 bg-white/5 border-white/10 text-white"
              />
            </div>
            <Button onClick={handleSearch} variant="outline">
              Buscar
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Executions Table */}
          <div className="space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
              </div>
            ) : executions.length === 0 ? (
              <p className="text-center text-white/60 py-12">
                {searchQuery ? 'Nenhuma execução encontrada' : 'Nenhuma execução ainda'}
              </p>
            ) : (
              executions.map((execution) => {
                const isSelected = compareMode && (
                  compareExecutions[0]?.id === execution.id ||
                  compareExecutions[1]?.id === execution.id
                )
                const selectedIndex = compareExecutions[0]?.id === execution.id ? 1 :
                  compareExecutions[1]?.id === execution.id ? 2 : 0

                return (
                  <button
                    key={execution.id}
                    onClick={() => handleExecutionClick(execution)}
                    className={`w-full p-4 rounded-lg transition-colors text-left border ${isSelected
                      ? 'bg-blue-500/20 border-blue-500 hover:bg-blue-500/30'
                      : 'bg-white/5 hover:bg-white/10 border-white/10'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <Badge className="bg-blue-500 text-[10px]">
                            {selectedIndex}
                          </Badge>
                        )}
                        {getStatusBadge(execution.status)}
                      </div>
                      <span className="text-xs text-white/60">
                        {formatDate(execution.startedAt)}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-white/40">Duração</p>
                        <p className="text-sm text-white">
                          {formatDuration(execution.startedAt, execution.completedAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-white/40">Steps</p>
                        <p className="text-sm text-white">{execution.agentResults.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/40">Tokens</p>
                        <p className="text-sm text-white">
                          {execution.agentResults
                            .reduce((sum, r) => sum + (r.tokensUsed || 0), 0)
                            .toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {execution.error && (
                      <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                        <p className="text-xs text-red-400 line-clamp-1">{execution.error}</p>
                      </div>
                    )}

                    {execution.output && !execution.error && (
                      <div className="mt-2 p-2 rounded bg-green-500/10 border border-green-500/20">
                        <p className="text-xs text-green-400 font-mono line-clamp-1">
                          {typeof execution.output === 'string'
                            ? execution.output.substring(0, 100)
                            : JSON.stringify(execution.output).substring(0, 100)}
                          ...
                        </p>
                      </div>
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>

              <span className="text-sm text-white/60">
                Página {page} de {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Próxima
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      <ExecutionDetailDrawer
        execution={selectedExecution}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onReExecute={handleReExecute}
        onReExecuteFromStep={handleReExecuteFromStep}
        onResume={handleResume}
      />

      {/* Compare Dialog */}
      <ExecutionCompare
        execution1={compareExecutions[0]}
        execution2={compareExecutions[1]}
        open={compareOpen}
        onClose={handleCompareClose}
      />
    </>
  )
}
