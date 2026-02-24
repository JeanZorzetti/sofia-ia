'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ArrowLeft,
  Play,
  Square,
  Trash2,
  Users,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Plus,
  Save,
  FastForward,
  Bell,
  Mail,
  Webhook,
  Hash
} from 'lucide-react'
import { toast } from 'sonner'
import { ExecutionLiveView } from '@/components/orchestrations/execution-live-view'
import { ExecutionHistory } from '@/components/orchestrations/execution-history'
import { AnalyticsDashboard } from '@/components/orchestrations/analytics-dashboard'
import { useExecutionNotifications } from '@/hooks/use-execution-notifications'
import { OrchestrationFlowCanvas } from '@/components/orchestrations/flow-canvas'
import { EditableFlowCanvas } from '@/components/orchestrations/editable-flow-canvas'
import { Eye, Pencil } from 'lucide-react'

interface Agent {
  id: string
  name: string
  description: string | null
}

interface AgentStep {
  agentId: string
  role: string
  prompt?: string
}

interface Orchestration {
  id: string
  name: string
  description: string | null
  agents: AgentStep[]
  strategy: string
  config: any
  status: string
  createdAt: string
  executions: any[]
}

type WebhookType = 'webhook' | 'email' | 'slack'
interface OutputWebhook {
  type: WebhookType
  url?: string
  webhookUrl?: string
  to?: string
  subject?: string
  secret?: string
  enabled: boolean
}

export default function OrchestrationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [orchestration, setOrchestration] = useState<Orchestration | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Execution State
  const [executeDialogOpen, setExecuteDialogOpen] = useState<boolean>(false)
  const [executionInput, setExecutionInput] = useState<string>('')
  const [executing, setExecuting] = useState<boolean>(false)

  // Graph Edit Mode
  const [isEditingGraph, setIsEditingGraph] = useState<boolean>(false)
  const [savingGraph, setSavingGraph] = useState<boolean>(false)

  // Continue from step State
  const [continueDialogOpen, setContinueDialogOpen] = useState<boolean>(false)
  const [continueFromStepIndex, setContinueFromStepIndex] = useState<number>(0)

  // Output Webhooks State
  const [outputWebhooks, setOutputWebhooks] = useState<OutputWebhook[]>([])
  const [savingWebhooks, setSavingWebhooks] = useState<boolean>(false)
  const [newWebhookType, setNewWebhookType] = useState<WebhookType>('webhook')
  const [newWebhookValue, setNewWebhookValue] = useState<string>('')

  // Edit State
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false)
  const [editingOrchestration, setEditingOrchestration] = useState<{
    name: string
    description: string
    strategy: string
    agentSteps: AgentStep[]
  }>({
    name: '',
    description: '',
    strategy: 'sequential',
    agentSteps: []
  })

  useEffect(() => {
    fetchOrchestration()
    fetchAgents()
  }, [resolvedParams.id])

  // Initialize output webhooks from config when orchestration loads
  useEffect(() => {
    if (orchestration?.config?.outputWebhooks) {
      setOutputWebhooks(orchestration.config.outputWebhooks)
    }
  }, [orchestration?.id])

  // Enable execution notifications
  // TEMPORARILY DISABLED - causing performance issues with long-running queries
  // useExecutionNotifications({
  //   orchestrationId: resolvedParams.id,
  //   enabled: true
  // })

  const fetchOrchestration = async () => {
    try {
      const response = await fetch(`/api/orchestrations/${resolvedParams.id}`)
      const data = await response.json()
      if (data.success) {
        setOrchestration(data.data)

        // Auto-stop executing loading state if status changed to completed/failed
        if (executing) {
          const latest = data.data.executions[0]
          if (latest && latest.status !== 'running') {
            setExecuting(false)
            if (executeDialogOpen) {
              setExecuteDialogOpen(false)
              toast.success(`Execução finalizada: ${latest.status === 'completed' ? 'Sucesso' : 'Falha'}`)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching orchestration:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents')
      const data = await response.json()
      if (data.success) {
        setAgents(data.data)
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
    }
  }

  // Edit Handlers
  const handleOpenEdit = () => {
    if (!orchestration) return
    setEditingOrchestration({
      name: orchestration.name,
      description: orchestration.description || '',
      strategy: orchestration.strategy,
      agentSteps: [...orchestration.agents]
    })
    setEditDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!editingOrchestration.name.trim() || editingOrchestration.agentSteps.length === 0) {
      toast.error('Nome e pelo menos um agente são obrigatórios')
      return
    }

    try {
      const response = await fetch(`/api/orchestrations/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editingOrchestration.name,
          description: editingOrchestration.description,
          agents: editingOrchestration.agentSteps,
          strategy: editingOrchestration.strategy
        })
      })

      const data = await response.json()

      if (data.success) {
        setOrchestration(data.data)
        setEditDialogOpen(false)
        toast.success('Orquestração atualizada com sucesso!')
      } else {
        toast.error(data.error || 'Erro ao atualizar orquestração')
      }
    } catch (error) {
      console.error('Error updating orchestration:', error)
      toast.error('Erro ao atualizar orquestração')
    }
  }

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (executing || (orchestration?.executions?.[0]?.status === 'running')) {
      interval = setInterval(() => {
        fetchOrchestration()
      }, 2000)
    }
    return () => clearInterval(interval)
  }, [executing, orchestration?.executions?.[0]?.status])

  useEffect(() => {
    if (orchestration) {
      // Check if latest execution is running
      const latestExec = orchestration.executions[0]
      if (latestExec && latestExec.status === 'running') {
        // If we just loaded the page and it's running, set executing true to trigger UI polling visibility
        // setExecuting(true) // Might cause re-renders loop if not careful.
      }
    }
  }, [orchestration])




  // Output Webhooks handlers
  const handleAddWebhook = () => {
    const value = newWebhookValue.trim()
    if (!value) return
    const entry: OutputWebhook =
      newWebhookType === 'webhook'
        ? { type: 'webhook', url: value, enabled: true }
        : newWebhookType === 'slack'
        ? { type: 'slack', webhookUrl: value, enabled: true }
        : { type: 'email', to: value, enabled: true }
    setOutputWebhooks((prev) => [...prev, entry])
    setNewWebhookValue('')
  }

  const handleRemoveWebhook = (index: number) => {
    setOutputWebhooks((prev) => prev.filter((_, i) => i !== index))
  }

  const handleToggleWebhook = (index: number) => {
    setOutputWebhooks((prev) =>
      prev.map((w, i) => (i === index ? { ...w, enabled: !w.enabled } : w))
    )
  }

  const handleSaveWebhooks = async () => {
    if (!orchestration) return
    setSavingWebhooks(true)
    try {
      const newConfig = { ...(orchestration.config || {}), outputWebhooks }
      const response = await fetch(`/api/orchestrations/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: newConfig }),
      })
      const data = await response.json()
      if (data.success) {
        setOrchestration(data.data)
        toast.success('Outputs salvos com sucesso!')
      } else {
        toast.error(data.error || 'Erro ao salvar outputs')
      }
    } catch {
      toast.error('Erro ao salvar outputs')
    } finally {
      setSavingWebhooks(false)
    }
  }

  // Find agent name helper
  const getAgentName = (id: string) => agents.find(a => a.id === id)?.name || 'Agente Desconhecido'

  const addAgentStep = () => {
    setEditingOrchestration({
      ...editingOrchestration,
      agentSteps: [
        ...editingOrchestration.agentSteps,
        { agentId: '', role: '' }
      ]
    })
  }

  const updateAgentStep = (index: number, field: string, value: string) => {
    const updatedSteps = [...editingOrchestration.agentSteps]
    updatedSteps[index] = { ...updatedSteps[index], [field]: value }
    setEditingOrchestration({ ...editingOrchestration, agentSteps: updatedSteps })
  }

  const removeAgentStep = (index: number) => {
    const updatedSteps = editingOrchestration.agentSteps.filter((_, i) => i !== index)
    setEditingOrchestration({ ...editingOrchestration, agentSteps: updatedSteps })
  }

  const handleToggle = async () => {
    if (!orchestration) return
    const newStatus = orchestration.status === 'active' ? 'inactive' : 'active'

    try {
      const response = await fetch(`/api/orchestrations/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        setOrchestration({ ...orchestration, status: newStatus })
        toast.success(`Orquestração ${newStatus === 'active' ? 'ativada' : 'desativada'}`)
      }
    } catch (error) {
      console.error('Error toggling orchestration:', error)
      toast.error('Erro ao alterar status')
    }
  }

  const handleExecute = async (startFromStep?: number, customInput?: string) => {
    if (!orchestration) return

    setExecuting(true)
    setExecuteDialogOpen(false)
    setContinueDialogOpen(false)
    toast.info(startFromStep !== undefined ? `Continuando a partir do step ${startFromStep + 1}...` : 'Iniciando execução...')

    try {
      const response = await fetch(`/api/orchestrations/${resolvedParams.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: customInput ?? executionInput,
          startFromStep
        })
      })

      const data = await response.json()

      if (data.success) {
        fetchOrchestration()
      } else {
        toast.error(data.error || 'Erro ao executar')
        setExecuting(false)
      }
    } catch (error) {
      console.error('Error executing:', error)
      toast.error('Erro ao executar orquestração')
      setExecuting(false)
    }
  }

  const handleStopExecution = async () => {
    try {
      toast.loading('Parando execução...', { id: 'stop-exec' })
      const response = await fetch(`/api/orchestrations/${resolvedParams.id}/execute`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Execução cancelada!', { id: 'stop-exec' })
        setExecuting(false)
        fetchOrchestration()
      } else {
        toast.error(data.error || 'Erro ao parar', { id: 'stop-exec' })
      }
    } catch (error) {
      console.error('Error stopping execution:', error)
      toast.error('Erro ao parar execução', { id: 'stop-exec' })
    }
  }

  const handleContinueFromStep = () => {
    if (!orchestration || !latestExecution) return
    const results = latestExecution.agentResults || []
    // Use the last available output as input for the selected step
    const lastResult = results[results.length - 1]
    const lastOutput = lastResult?.output || executionInput || ''
    handleExecute(continueFromStepIndex, lastOutput)
  }

  // Render Agent Step Status
  const renderExecutionProgress = (execution: any) => {
    if (!orchestration) return null
    const results = execution.agentResults || []
    const isRunning = execution.status === 'running'

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <Badge variant={isRunning ? "default" : "outline"} className={isRunning ? "bg-blue-500 animate-pulse" : ""}>
            {isRunning ? "Executando em Tempo Real" : "Finalizado"}
          </Badge>
          <div className="text-xs text-white/40">ID: {execution.id}</div>
        </div>

        <div className="relative border-l border-white/20 ml-4 space-y-8 pb-4">
          {orchestration.agents.map((step: any, index: number) => {
            const result = results.find((r: any) => r.role === step.role) // Assuming role is unique enough or use index logic mapping if roles duplicate
            // Better mapping would be by index if we stored it, but sequential usually pushes in order.
            // Let's assume sequential mapping for now if sequential strategy.
            const stepResult = results[index]
            const isCompleted = !!stepResult
            const isCurrent = isRunning && !stepResult && (index === 0 || !!results[index - 1])

            const agent = agents.find(a => a.id === step.agentId)

            return (
              <div key={index} className="relative pl-8">
                {/* Dot indicator */}
                <div className={`absolute -left-[5px] top-0 h-2.5 w-2.5 rounded-full border-2 ${isCompleted ? 'bg-green-500 border-green-500' :
                  isCurrent ? 'bg-blue-500 border-blue-500 animate-ping' :
                    'bg-zinc-900 border-white/20'
                  }`} />

                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${isCurrent ? 'text-blue-400' : 'text-white'}`}>
                      {step.role}
                    </span>
                    <Badge variant="outline" className="text-[10px] h-5 border-white/10 text-white/40">
                      {agent?.name}
                    </Badge>
                  </div>

                  {isCurrent && (
                    <p className="text-xs text-blue-300/80 animate-pulse">
                      Processando...
                    </p>
                  )}

                  {isCompleted && (
                    <div className="mt-2 text-sm bg-white/5 rounded-md p-3 border border-white/10">
                      <p className="text-xs text-white/40 mb-1 font-mono">Input:</p>
                      <div className="text-white/80 line-clamp-2 text-xs mb-2 font-mono bg-black/20 p-1 rounded">
                        {typeof stepResult.input === 'string' ? stepResult.input : JSON.stringify(stepResult.input)}
                      </div>
                      <p className="text-xs text-white/40 mb-1 font-mono">Output:</p>
                      <div className="text-white/90 whitespace-pre-wrap">
                        {stepResult.output}
                      </div>
                      <div className="mt-2 flex gap-2">
                        {stepResult.model && (
                          <Badge variant="secondary" className="text-[10px] bg-white/10 text-white/60">
                            {stepResult.model}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir esta orquestração?')) return

    try {
      const response = await fetch(`/api/orchestrations/${resolvedParams.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Orquestração excluída')
        router.push('/dashboard/orchestrations')
      }
    } catch (error) {
      console.error('Error deleting orchestration:', error)
      toast.error('Erro ao excluir orquestração')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500 text-white">Sucesso</Badge>
      case 'failed':
        return <Badge className="bg-red-500 text-white">Falha</Badge>
      case 'running':
        return <Badge className="bg-blue-500 text-white">Executando</Badge>
      default:
        return <Badge className="bg-gray-500 text-white">Pendente</Badge>
    }
  }

  const getStrategyDescription = (strategy: string) => {
    switch (strategy) {
      case 'sequential':
        return 'Agentes executam em ordem, cada um recebe a saída do anterior'
      case 'parallel':
        return 'Todos os agentes executam simultaneamente com a mesma entrada'
      case 'consensus':
        return 'Agentes votam e a resposta mais comum é escolhida'
      default:
        return ''
    }
  }

  const getStrategyBadge = (strategy: string) => {
    switch (strategy) {
      case 'sequential':
        return <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/50">Sequencial</Badge>
      case 'parallel':
        return <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/50">Paralelo</Badge>
      case 'consensus':
        return <Badge variant="outline" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/50">Consenso</Badge>
      default:
        return <Badge variant="outline">Desconhecido</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('pt-BR')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-white">Carregando orquestração...</div>
      </div>
    )
  }

  if (!orchestration) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-white">Orquestração não encontrada</div>
      </div>
    )
  }

  const latestExecution = orchestration?.executions?.[0]

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header logic same */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">{orchestration.name}</h1>
            <p className="text-white/60 mt-1">
              {orchestration.description || 'Sem descrição'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setExecuteDialogOpen(true)} className="gap-2 bg-green-600 hover:bg-green-700">
            <Play className="h-4 w-4" />
            Executar
          </Button>
          {executing && (
            <Button
              onClick={handleStopExecution}
              variant="destructive"
              className="gap-2"
            >
              <Square className="h-4 w-4" />
              Parar
            </Button>
          )}
          {latestExecution && latestExecution.agentResults?.length > 0 && (
            <Button
              onClick={() => {
                setContinueFromStepIndex(0)
                setContinueDialogOpen(true)
              }}
              variant="outline"
              className="gap-2 border-blue-500/50 text-blue-300 hover:bg-blue-500/20 hover:text-blue-200"
            >
              <FastForward className="h-4 w-4" />
              Continuar
            </Button>
          )}
          <Button variant="destructive" onClick={handleDelete} size="icon">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Orchestration Flow Graph — View/Edit Toggle */}
      <Card className="bg-gray-900/50 border-white/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg text-white">Pipeline de Agentes</CardTitle>
              {getStrategyBadge(orchestration.strategy)}
              <span className="text-xs text-white/40">
                {orchestration.agents.length} agente{orchestration.agents.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-800 rounded-lg p-0.5 border border-white/10">
                <button
                  onClick={() => setIsEditingGraph(false)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${!isEditingGraph
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-white/50 hover:text-white/80'
                    }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Visualizar
                </button>
                <button
                  onClick={() => setIsEditingGraph(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${isEditingGraph
                    ? 'bg-blue-500/20 text-blue-300 shadow-sm'
                    : 'text-white/50 hover:text-white/80'
                    }`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isEditingGraph ? (
            <EditableFlowCanvas
              steps={orchestration.agents}
              agents={agents}
              strategy={orchestration.strategy}
              saving={savingGraph}
              onSave={async (newSteps) => {
                setSavingGraph(true)
                try {
                  const response = await fetch(`/api/orchestrations/${resolvedParams.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name: orchestration.name,
                      description: orchestration.description,
                      agents: newSteps,
                      strategy: orchestration.strategy
                    })
                  })
                  const data = await response.json()
                  if (data.success) {
                    setOrchestration(data.data)
                    setIsEditingGraph(false)
                    toast.success('Pipeline atualizado com sucesso!')
                  } else {
                    toast.error(data.error || 'Erro ao atualizar')
                  }
                } catch (error) {
                  console.error('Error saving graph:', error)
                  toast.error('Erro ao salvar pipeline')
                } finally {
                  setSavingGraph(false)
                }
              }}
              onCancel={() => setIsEditingGraph(false)}
            />
          ) : (
            <OrchestrationFlowCanvas
              steps={orchestration.agents.map(s => ({
                ...s,
                agentName: getAgentName(s.agentId)
              }))}
              results={latestExecution?.agentResults}
              isRunning={latestExecution?.status === 'running'}
              strategy={orchestration.strategy}
            />
          )}
        </CardContent>
      </Card>

      {/* Live Execution View */}
      <ExecutionLiveView
        orchestrationId={resolvedParams.id}
        orchestrationName={orchestration.name}
        agentSteps={orchestration.agents}
        agents={agents}
        executionId={latestExecution?.id}
        initialStatus={latestExecution?.status}
        strategy={orchestration.strategy}
      />

      {/* Analytics Dashboard */}
      <AnalyticsDashboard orchestrationId={resolvedParams.id} />

      {/* Output Webhooks */}
      <Card className="bg-gray-900/50 border-white/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <CardTitle className="text-lg text-white">Outputs & Notificações</CardTitle>
            </div>
            <Button
              size="sm"
              onClick={handleSaveWebhooks}
              disabled={savingWebhooks}
              className="gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              {savingWebhooks ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
          <CardDescription className="text-white/50 text-xs">
            Envie o resultado da execução para webhook, e-mail ou Slack automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* List of configured outputs */}
          {outputWebhooks.length > 0 ? (
            <div className="space-y-2">
              {outputWebhooks.map((wh, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 rounded-lg bg-white/5 border border-white/10 px-3 py-2"
                >
                  <div className="flex-shrink-0">
                    {wh.type === 'email' ? (
                      <Mail className="h-4 w-4 text-blue-400" />
                    ) : wh.type === 'slack' ? (
                      <Hash className="h-4 w-4 text-purple-400" />
                    ) : (
                      <Webhook className="h-4 w-4 text-green-400" />
                    )}
                  </div>
                  <span className="flex-1 text-sm text-white/80 truncate font-mono">
                    {wh.type === 'email' ? wh.to : wh.type === 'slack' ? wh.webhookUrl : wh.url}
                  </span>
                  <Switch
                    checked={wh.enabled}
                    onCheckedChange={() => handleToggleWebhook(idx)}
                    className="flex-shrink-0"
                  />
                  <button
                    onClick={() => handleRemoveWebhook(idx)}
                    className="flex-shrink-0 text-white/30 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/30 text-center py-2">Nenhum output configurado.</p>
          )}

          {/* Dispatch history from last executions */}
          {(() => {
            const dispatches: any[] = []
            for (const exec of (orchestration.executions || []).slice(0, 5)) {
              const wh = exec?.output?.webhookDispatches
              if (Array.isArray(wh)) {
                wh.forEach((d: any) => dispatches.push({ ...d, executionId: exec.id }))
              }
            }
            if (!dispatches.length) return null
            return (
              <div className="pt-1">
                <p className="text-[11px] text-white/40 uppercase tracking-wider mb-2">Histórico de disparos</p>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {dispatches.slice(0, 10).map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-white/60">
                      {d.status === 'sent'
                        ? <CheckCircle className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                        : <XCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />}
                      <span className="capitalize text-white/50">{d.type}</span>
                      <span className="truncate flex-1 font-mono">{d.destination}</span>
                      {d.error && <span className="text-red-400 truncate max-w-[120px]">{d.error}</span>}
                      <span className="text-white/30 flex-shrink-0">{d.sentAt ? new Date(d.sentAt).toLocaleTimeString('pt-BR') : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Add new output */}
          <div className="flex gap-2 pt-1">
            <Select value={newWebhookType} onValueChange={(v) => setNewWebhookType(v as 'webhook' | 'email' | 'slack')}>
              <SelectTrigger className="w-32 bg-white/5 border-white/10 text-white text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10">
                <SelectItem value="webhook">Webhook</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="slack">Slack</SelectItem>
              </SelectContent>
            </Select>
            <Input
              className="flex-1 bg-white/5 border-white/10 text-white text-xs h-8 placeholder:text-white/30"
              placeholder={
                newWebhookType === 'email'
                  ? 'email@exemplo.com'
                  : 'https://...'
              }
              value={newWebhookValue}
              onChange={(e) => setNewWebhookValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddWebhook()}
            />
            <Button size="sm" variant="outline" onClick={handleAddWebhook} className="h-8 px-3">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Execution History with Filters */}
      <ExecutionHistory orchestrationId={resolvedParams.id} />

      {/* Execution Dialog */}
      < Dialog open={executeDialogOpen} onOpenChange={setExecuteDialogOpen} >
        <DialogContent className="bg-gray-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Executar Orquestração</DialogTitle>
            <DialogDescription className="text-white/60">
              Digite a entrada que será processada pelos agentes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={executionInput}
              onChange={(e) => setExecutionInput(e.target.value)}
              className="bg-white/5 border-white/10 text-white min-h-[150px]"
              placeholder="Ex: Analisar o seguinte texto e extrair insights chave..."
            />
            <p className="text-xs text-white/40">
              Esta entrada será processada pelos {orchestration.agents.length} agentes
              usando a estratégia <strong>{orchestration.strategy}</strong>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExecuteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => handleExecute()} disabled={executing}>
              {executing ? 'Executando...' : 'Executar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >

      {/* Continue From Step Dialog */}
      <Dialog open={continueDialogOpen} onOpenChange={setContinueDialogOpen}>
        <DialogContent className="bg-gray-900 border-white/20 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Continuar Execução</DialogTitle>
            <DialogDescription className="text-white/60">
              Escolha a partir de qual agente enviar o último output
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Last execution summary */}
            {latestExecution && (
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <p className="text-xs text-white/40 mb-2">Última execução ({latestExecution.status}):</p>
                <div className="space-y-1">
                  {(latestExecution.agentResults || []).map((r: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className={r.output ? 'text-green-400' : 'text-red-400'}>
                        {r.output ? '✓' : '✗'}
                      </span>
                      <span className="text-white/70">{r.role}</span>
                      <span className="text-white/30">—</span>
                      <span className="text-white/40 truncate max-w-[200px]">
                        {r.output ? `${r.output.substring(0, 50)}...` : '(sem output)'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step picker */}
            <div className="space-y-2">
              <Label className="text-white/80">Enviar output para:</Label>
              <Select
                value={String(continueFromStepIndex)}
                onValueChange={(v) => setContinueFromStepIndex(Number(v))}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-white/10">
                  {orchestration.agents.map((step, idx) => (
                    <SelectItem key={idx} value={String(idx)} className="text-white hover:bg-white/10">
                      Step {idx + 1}: {step.role} ({getAgentName(step.agentId)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview of the input that will be sent */}
            {latestExecution?.agentResults?.length > 0 && (
              <div className="space-y-2">
                <Label className="text-white/80 text-xs">Input que será enviado (último output):</Label>
                <div className="bg-black/30 rounded-md p-2 text-xs text-white/60 max-h-[100px] overflow-y-auto font-mono">
                  {((latestExecution.agentResults as any[])[(latestExecution.agentResults as any[]).length - 1]?.output || '(vazio)').substring(0, 300)}
                  {((latestExecution.agentResults as any[])[(latestExecution.agentResults as any[]).length - 1]?.output || '').length > 300 && '...'}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContinueDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleContinueFromStep}
              disabled={executing}
              className="gap-2 bg-blue-600 hover:bg-blue-500"
            >
              <FastForward className="h-4 w-4" />
              {executing ? 'Executando...' : 'Continuar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      < Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen} >
        <DialogContent className="bg-gray-900 border-white/20 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Orquestração</DialogTitle>
            <DialogDescription className="text-white/60">
              Atualize as configurações e agentes desta orquestração
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={editingOrchestration.name}
                onChange={(e) => setEditingOrchestration({ ...editingOrchestration, name: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div>
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={editingOrchestration.description}
                onChange={(e) => setEditingOrchestration({ ...editingOrchestration, description: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div>
              <Label htmlFor="edit-strategy">Estratégia</Label>
              <Select
                value={editingOrchestration.strategy}
                onValueChange={(value) => setEditingOrchestration({ ...editingOrchestration, strategy: value })}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  <SelectItem value="sequential">Sequencial</SelectItem>
                  <SelectItem value="parallel">Paralelo</SelectItem>
                  <SelectItem value="consensus">Consenso</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-white/40 mt-1">
                {getStrategyDescription(editingOrchestration.strategy)}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Agentes</Label>
                <Button size="sm" variant="outline" onClick={addAgentStep}>
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar Agente
                </Button>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {editingOrchestration.agentSteps.map((step, index) => (
                  <div key={index} className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-white/60">#{index + 1}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeAgentStep(index)}
                        className="ml-auto h-6 px-2"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Agente</Label>
                        <Select
                          value={step.agentId}
                          onValueChange={(value) => updateAgentStep(index, 'agentId', value)}
                        >
                          <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-white/10">
                            {agents.map(agent => (
                              <SelectItem key={agent.id} value={agent.id}>
                                {agent.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Papel</Label>
                        <Input
                          value={step.role}
                          onChange={(e) => updateAgentStep(index, 'role', e.target.value)}
                          className="bg-white/5 border-white/10 text-white h-8 text-xs"
                          placeholder="Ex: Pesquisador"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >
    </div >
  )
}
