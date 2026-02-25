'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export interface Agent {
  id: string
  name: string
  description: string | null
}

export interface Orchestration {
  id: string
  name: string
  description: string | null
  agents: unknown[]
  strategy: string
  status: string
  createdAt: string
  _count: { executions: number }
  executions: { status: string; completedAt?: string; startedAt?: string }[]
}

export interface AgentStep {
  agentId: string
  role: string
  prompt?: string
}

export interface TemplateInfo {
  id: string
  name: string
  description: string
  category: string
  icon: string
  strategy: string
  agentCount: number
  agentRoles: string[]
  exampleInput: string
  expectedOutput: string
  estimatedDuration: string
  tags: string[]
}

export interface AISuggestion {
  name: string
  description: string
  strategy: string
  estimatedTime: string
  agents: { role: string; prompt: string }[]
  suggestedInput: string
  suggestedTags: string[]
}

export interface OrchestrationForm {
  name: string
  description: string
  strategy: string
  agentSteps: AgentStep[]
}

export const EMPTY_FORM: OrchestrationForm = {
  name: '',
  description: '',
  strategy: 'sequential',
  agentSteps: [],
}

export function useOrchestrations() {
  const router = useRouter()
  const [orchestrations, setOrchestrations] = useState<Orchestration[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [templates, setTemplates] = useState<TemplateInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingFromTemplate, setCreatingFromTemplate] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiCreating, setAiCreating] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null)

  useEffect(() => {
    fetchOrchestrations()
    fetchAgents()
    fetchTemplates()
  }, [])

  const fetchOrchestrations = async () => {
    try {
      const res = await fetch('/api/orchestrations')
      const data = await res.json()
      if (data.success) setOrchestrations(data.data)
    } catch (error) {
      console.error('Error fetching orchestrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents')
      const data = await res.json()
      if (data.success) setAgents(data.data)
    } catch (error) {
      console.error('Error fetching agents:', error)
    }
  }

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/orchestrations/templates')
      const data = await res.json()
      if (data.success) setTemplates(data.data)
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  const handleCreateFromTemplate = async (templateId: string) => {
    try {
      setCreatingFromTemplate(templateId)
      const res = await fetch('/api/orchestrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromTemplate: templateId }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Orquestração criada a partir do template!')
        fetchOrchestrations()
        router.push(`/dashboard/orchestrations/${data.data.id}`)
        return true
      } else {
        toast.error(data.error || 'Erro ao criar orquestração')
        return false
      }
    } catch {
      toast.error('Erro ao criar orquestração')
      return false
    } finally {
      setCreatingFromTemplate(null)
    }
  }

  const handleCreateOrchestration = async (form: OrchestrationForm): Promise<boolean> => {
    if (!form.name.trim() || form.agentSteps.length === 0) {
      toast.error('Nome e pelo menos um agente são obrigatórios')
      return false
    }
    try {
      const res = await fetch('/api/orchestrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          agents: form.agentSteps,
          strategy: form.strategy,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Orquestração criada com sucesso!')
        fetchOrchestrations()
        return true
      } else {
        toast.error(data.error || 'Erro ao criar orquestração')
        return false
      }
    } catch {
      toast.error('Erro ao criar orquestração')
      return false
    }
  }

  const handleAiGenerate = async (description: string) => {
    if (description.trim().length < 10) {
      toast.error('Descreva o processo com pelo menos 10 caracteres.')
      return
    }
    try {
      setAiLoading(true)
      setAiSuggestion(null)
      const res = await fetch('/api/orchestrations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setAiSuggestion(data.data)
      } else {
        toast.error(data.error || 'Erro ao gerar sugestão.')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleCreateFromAi = async (suggestion: AISuggestion): Promise<string | null> => {
    try {
      setAiCreating(true)
      const createdAgentIds: string[] = []
      for (const agentDef of suggestion.agents) {
        const res = await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: agentDef.role,
            description: `Agente criado automaticamente para a orquestração "${suggestion.name}"`,
            systemPrompt: agentDef.prompt,
            model: 'llama-3.3-70b-versatile',
            temperature: 0.5,
            status: 'active',
          }),
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.error || `Erro ao criar agente "${agentDef.role}"`)
        createdAgentIds.push(data.data.id)
      }
      const agentSteps = suggestion.agents.map((a, i) => ({
        agentId: createdAgentIds[i],
        role: a.role,
        prompt: a.prompt,
      }))
      const orchRes = await fetch('/api/orchestrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: suggestion.name,
          description: suggestion.description,
          strategy: suggestion.strategy || 'sequential',
          agents: agentSteps,
        }),
      })
      const orchData = await orchRes.json()
      if (!orchData.success) throw new Error(orchData.error || 'Erro ao criar orquestração')
      toast.success('Orquestração criada com sucesso via IA!')
      fetchOrchestrations()
      fetchAgents()
      return orchData.data.id
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar orquestração.')
      return null
    } finally {
      setAiCreating(false)
    }
  }

  const handleDeleteOrchestration = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta orquestração?')) return
    try {
      const res = await fetch(`/api/orchestrations/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Orquestração excluída')
        fetchOrchestrations()
      }
    } catch {
      toast.error('Erro ao excluir orquestração')
    }
  }

  return {
    orchestrations,
    agents,
    templates,
    loading,
    creatingFromTemplate,
    aiLoading,
    aiCreating,
    aiSuggestion,
    setAiSuggestion,
    handleCreateFromTemplate,
    handleCreateOrchestration,
    handleAiGenerate,
    handleCreateFromAi,
    handleDeleteOrchestration,
    router,
  }
}
