import { useState, useEffect } from 'react'

export interface KnowledgeBase {
  id: string
  name: string
  agentId: string | null
  type: string
  config: any
  createdAt: string
  documentCount: number
  processedCount: number
  processingCount: number
  errorCount: number
  documents: {
    id: string
    title: string
    status: string
    fileType: string | null
    createdAt: string
  }[]
}

export interface Agent {
  id: string
  name: string
}

export function useKnowledge() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchKnowledgeBases()
    fetchAgents()
  }, [])

  const fetchKnowledgeBases = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/knowledge')
      const result = await response.json()
      if (result.knowledgeBases) {
        setKnowledgeBases(result.knowledgeBases)
      }
    } catch (error) {
      console.error('Error fetching knowledge bases:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents')
      const result = await response.json()
      if (result.success && result.data) {
        setAgents(result.data)
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
    }
  }

  const handleDeleteKnowledgeBase = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta base de conhecimento?')) return
    try {
      const response = await fetch(`/api/knowledge/${id}`, { method: 'DELETE' })
      if (response.ok) fetchKnowledgeBases()
    } catch (error) {
      console.error('Error deleting knowledge base:', error)
    }
  }

  const getAgentName = (agentId: string | null) => {
    if (!agentId) return 'Nenhum agente'
    const agent = agents.find((a) => a.id === agentId)
    return agent ? agent.name : 'Agente desconhecido'
  }

  return {
    knowledgeBases,
    agents,
    loading,
    fetchKnowledgeBases,
    handleDeleteKnowledgeBase,
    getAgentName,
  }
}
