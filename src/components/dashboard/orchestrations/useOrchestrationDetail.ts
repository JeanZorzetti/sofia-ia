import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

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

export function useOrchestrationDetail(orchestrationId: string) {
  const router = useRouter()

  const [orchestration, setOrchestration] = useState<Orchestration | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  // Execution state
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false)
  const [executionInput, setExecutionInput] = useState('')
  const [executing, setExecuting] = useState(false)

  // Graph edit state
  const [isEditingGraph, setIsEditingGraph] = useState(false)
  const [savingGraph, setSavingGraph] = useState(false)

  // Continue state
  const [continueDialogOpen, setContinueDialogOpen] = useState(false)
  const [continueFromStepIndex, setContinueFromStepIndex] = useState(0)

  // Webhook state
  const [outputWebhooks, setOutputWebhooks] = useState<OutputWebhook[]>([])
  const [savingWebhooks, setSavingWebhooks] = useState(false)

  // Schedule state
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingOrchestration, setEditingOrchestration] = useState<{
    name: string
    description: string
    strategy: string
    agentSteps: AgentStep[]
  }>({ name: '', description: '', strategy: 'sequential', agentSteps: [] })

  useEffect(() => {
    fetchOrchestration()
    fetchAgents()
  }, [orchestrationId])

  useEffect(() => {
    if (orchestration?.config?.outputWebhooks) {
      setOutputWebhooks(orchestration.config.outputWebhooks)
    }
  }, [orchestration?.id])

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (executing || orchestration?.executions?.[0]?.status === 'running') {
      interval = setInterval(fetchOrchestration, 2000)
    }
    return () => clearInterval(interval)
  }, [executing, orchestration?.executions?.[0]?.status])

  const fetchOrchestration = async () => {
    try {
      const response = await fetch(`/api/orchestrations/${orchestrationId}`)
      const data = await response.json()
      if (data.success) {
        setOrchestration(data.data)
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
      if (data.success) setAgents(data.data)
    } catch (error) {
      console.error('Error fetching agents:', error)
    }
  }

  const handleOpenEdit = () => {
    if (!orchestration) return
    setEditingOrchestration({
      name: orchestration.name,
      description: orchestration.description || '',
      strategy: orchestration.strategy,
      agentSteps: [...orchestration.agents],
    })
    setEditDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!editingOrchestration.name.trim() || editingOrchestration.agentSteps.length === 0) {
      toast.error('Nome e pelo menos um agente são obrigatórios')
      return
    }
    try {
      const response = await fetch(`/api/orchestrations/${orchestrationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingOrchestration.name,
          description: editingOrchestration.description,
          agents: editingOrchestration.agentSteps,
          strategy: editingOrchestration.strategy,
        }),
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

  const handleExecute = async (startFromStep?: number, customInput?: string) => {
    if (!orchestration) return
    setExecuting(true)
    setExecuteDialogOpen(false)
    setContinueDialogOpen(false)
    toast.info(startFromStep !== undefined ? `Continuando a partir do step ${startFromStep + 1}...` : 'Iniciando execução...')
    try {
      const response = await fetch(`/api/orchestrations/${orchestrationId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: customInput ?? executionInput, startFromStep }),
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
      const response = await fetch(`/api/orchestrations/${orchestrationId}/execute`, { method: 'DELETE' })
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
    if (!orchestration) return
    const latestExecution = orchestration.executions?.[0]
    const results = latestExecution?.agentResults || []
    const lastResult = results[results.length - 1]
    const lastOutput = lastResult?.output || executionInput || ''
    handleExecute(continueFromStepIndex, lastOutput)
  }

  const handleSaveWebhooks = async () => {
    if (!orchestration) return
    setSavingWebhooks(true)
    try {
      const newConfig = { ...(orchestration.config || {}), outputWebhooks }
      const response = await fetch(`/api/orchestrations/${orchestrationId}`, {
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

  const handleToggle = async () => {
    if (!orchestration) return
    const newStatus = orchestration.status === 'active' ? 'inactive' : 'active'
    try {
      const response = await fetch(`/api/orchestrations/${orchestrationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
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

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir esta orquestração?')) return
    try {
      const response = await fetch(`/api/orchestrations/${orchestrationId}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Orquestração excluída')
        router.push('/dashboard/orchestrations')
      }
    } catch (error) {
      console.error('Error deleting orchestration:', error)
      toast.error('Erro ao excluir orquestração')
    }
  }

  const addAgentStep = () => {
    setEditingOrchestration({
      ...editingOrchestration,
      agentSteps: [...editingOrchestration.agentSteps, { agentId: '', role: '' }],
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

  const getAgentName = (id: string) => agents.find((a) => a.id === id)?.name || 'Agente Desconhecido'

  const handleSaveGraph = async (newSteps: AgentStep[]) => {
    if (!orchestration) return
    setSavingGraph(true)
    try {
      const response = await fetch(`/api/orchestrations/${orchestrationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orchestration.name,
          description: orchestration.description,
          agents: newSteps,
          strategy: orchestration.strategy,
        }),
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
  }

  return {
    // Data
    orchestration, setOrchestration,
    agents,
    loading,
    // Execution
    executeDialogOpen, setExecuteDialogOpen,
    executionInput, setExecutionInput,
    executing,
    // Graph
    isEditingGraph, setIsEditingGraph,
    savingGraph,
    // Continue
    continueDialogOpen, setContinueDialogOpen,
    continueFromStepIndex, setContinueFromStepIndex,
    // Webhooks
    outputWebhooks, setOutputWebhooks,
    savingWebhooks,
    // Schedule
    scheduleDialogOpen, setScheduleDialogOpen,
    // Edit
    editDialogOpen, setEditDialogOpen,
    editingOrchestration, setEditingOrchestration,
    // Handlers
    fetchOrchestration,
    handleOpenEdit,
    handleUpdate,
    handleExecute,
    handleStopExecution,
    handleContinueFromStep,
    handleSaveWebhooks,
    handleToggle,
    handleDelete,
    handleSaveGraph,
    addAgentStep,
    updateAgentStep,
    removeAgentStep,
    getAgentName,
  }
}
