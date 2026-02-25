'use client'

import { useState, useEffect } from 'react'
import type { Agent } from './AgentCard'
import type { AgentFormData } from './CreateAgentDialog'
import { FOLDER_COLORS } from './CreateFolderDialog'

export interface AgentFolder {
  id: string
  name: string
  color: string
  agents: { id: string }[]
}

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [folders, setFolders] = useState<AgentFolder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [agentsRes, foldersRes] = await Promise.all([fetch('/api/agents'), fetch('/api/agent-folders')])
      const [agentsData, foldersData] = await Promise.all([agentsRes.json(), foldersRes.json()])
      if (agentsData.success) setAgents(agentsData.data || [])
      if (Array.isArray(foldersData)) setFolders(foldersData)
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const handleCreateAgent = async (formData: AgentFormData): Promise<boolean> => {
    try {
      const channels = []
      if (formData.channels.whatsapp) channels.push({ channel: 'whatsapp', config: {}, isActive: true })
      if (formData.channels.webchat) channels.push({ channel: 'webchat', config: {}, isActive: true })
      if (formData.channels.email) channels.push({ channel: 'email', config: {}, isActive: true })
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, description: formData.description, systemPrompt: formData.systemPrompt, model: formData.model, temperature: formData.temperature, channels, status: 'active' }),
      })
      const result = await res.json()
      if (result.success) { fetchAll(); return true }
      return false
    } catch { return false }
  }

  const handleToggleStatus = async (agentId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    setAgents((prev) => prev.map((a) => (a.id === agentId ? { ...a, status: newStatus } : a)))
    try {
      await fetch(`/api/agents/${agentId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) })
    } catch { fetchAll() }
  }

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este agente?')) return
    setAgents((prev) => prev.filter((a) => a.id !== agentId))
    try { await fetch(`/api/agents/${agentId}`, { method: 'DELETE' }) } catch { fetchAll() }
  }

  const handleCreateFolder = async (name: string, color: string): Promise<AgentFolder | null> => {
    try {
      const res = await fetch('/api/agent-folders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), color }) })
      const folder = await res.json()
      if (folder.id) { setFolders((prev) => [...prev, folder]); return folder }
      return null
    } catch { return null }
  }

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Excluir pasta? Os agentes serão movidos para "Sem pasta".')) return
    setFolders((prev) => prev.filter((f) => f.id !== folderId))
    setAgents((prev) => prev.map((a) => (a.folderId === folderId ? { ...a, folderId: null, folder: null } : a)))
    try { await fetch(`/api/agent-folders/${folderId}`, { method: 'DELETE' }) } catch { fetchAll() }
  }

  const handleDropAgent = async (draggedAgentId: string, folderId: string | null) => {
    const agent = agents.find((a) => a.id === draggedAgentId)
    if (!agent) return
    if ((folderId === null && agent.folderId === null) || agent.folderId === folderId) return
    setAgents((prev) => prev.map((a) => a.id === draggedAgentId
      ? { ...a, folderId, folder: folderId ? (folders.find((f) => f.id === folderId) || null) : null }
      : a
    ))
    try {
      await fetch(`/api/agents/${draggedAgentId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folderId }) })
    } catch { fetchAll() }
  }

  return {
    agents,
    folders,
    loading,
    FOLDER_COLORS,
    handleCreateAgent,
    handleToggleStatus,
    handleDeleteAgent,
    handleCreateFolder,
    handleDeleteFolder,
    handleDropAgent,
  }
}
