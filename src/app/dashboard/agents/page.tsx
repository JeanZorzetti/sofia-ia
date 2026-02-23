'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus, Bot, MessageSquare, Mail, Globe, Settings, Trash2,
  Folder, FolderOpen, FolderPlus, ChevronDown, ChevronRight, X, GripVertical
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AgentFolder {
  id: string
  name: string
  color: string
  agents: { id: string }[]
}

interface Agent {
  id: string
  name: string
  description: string | null
  status: string
  model: string
  folderId: string | null
  folder: { id: string; name: string; color: string } | null
  channels: { id: string; channel: string; isActive: boolean }[]
  creator: { id: string; name: string; email: string }
  createdAt: string
}

const FOLDER_COLORS = [
  '#3b82f6', '#a855f7', '#10b981', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
]

export default function AgentsPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<Agent[]>([])
  const [folders, setFolders] = useState<AgentFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set())
  const [draggedAgentId, setDraggedAgentId] = useState<string | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null) // folder id or 'root'
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    channels: { whatsapp: false, webchat: false, email: false }
  })

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [agentsRes, foldersRes] = await Promise.all([
        fetch('/api/agents'),
        fetch('/api/agent-folders'),
      ])
      const [agentsData, foldersData] = await Promise.all([
        agentsRes.json(),
        foldersRes.json(),
      ])
      if (agentsData.success) setAgents(agentsData.data || [])
      if (Array.isArray(foldersData)) setFolders(foldersData)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  // ── Drag & Drop ────────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, agentId: string) => {
    setDraggedAgentId(agentId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggedAgentId(null)
    setDragOverTarget(null)
  }

  const handleDragOver = (e: React.DragEvent, target: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverTarget(target)
  }

  const handleDragLeave = () => {
    setDragOverTarget(null)
  }

  const handleDrop = async (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault()
    setDragOverTarget(null)
    if (!draggedAgentId) return

    const agent = agents.find((a) => a.id === draggedAgentId)
    if (!agent) return

    // No-op if already in the target folder
    if ((folderId === null && agent.folderId === null) || agent.folderId === folderId) return

    // Optimistic update
    setAgents((prev) =>
      prev.map((a) =>
        a.id === draggedAgentId
          ? {
              ...a,
              folderId,
              folder: folderId
                ? (folders.find((f) => f.id === folderId) || null)
                : null,
            }
          : a
      )
    )

    try {
      await fetch(`/api/agents/${draggedAgentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      })
    } catch {
      // revert on error
      fetchAll()
    }
  }

  // ── Agent CRUD ─────────────────────────────────────────────────────────────

  const handleCreateAgent = async () => {
    try {
      const channels = []
      if (formData.channels.whatsapp) channels.push({ channel: 'whatsapp', config: {}, isActive: true })
      if (formData.channels.webchat) channels.push({ channel: 'webchat', config: {}, isActive: true })
      if (formData.channels.email) channels.push({ channel: 'email', config: {}, isActive: true })

      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          systemPrompt: formData.systemPrompt,
          model: formData.model,
          temperature: formData.temperature,
          channels,
          status: 'active',
        }),
      })
      const result = await res.json()
      if (result.success) {
        setCreateDialogOpen(false)
        setFormData({
          name: '', description: '', systemPrompt: '',
          model: 'llama-3.3-70b-versatile', temperature: 0.7,
          channels: { whatsapp: false, webchat: false, email: false },
        })
        fetchAll()
      }
    } catch {
      // silent
    }
  }

  const handleToggleStatus = async (agentId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    setAgents((prev) =>
      prev.map((a) => (a.id === agentId ? { ...a, status: newStatus } : a))
    )
    try {
      await fetch(`/api/agents/${agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
    } catch {
      fetchAll()
    }
  }

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este agente?')) return
    setAgents((prev) => prev.filter((a) => a.id !== agentId))
    try {
      await fetch(`/api/agents/${agentId}`, { method: 'DELETE' })
    } catch {
      fetchAll()
    }
  }

  // ── Folder CRUD ────────────────────────────────────────────────────────────

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      const res = await fetch('/api/agent-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim(), color: newFolderColor }),
      })
      const folder = await res.json()
      if (folder.id) {
        setFolders((prev) => [...prev, folder])
        setFolderDialogOpen(false)
        setNewFolderName('')
        setNewFolderColor(FOLDER_COLORS[0])
      }
    } catch {
      // silent
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Excluir pasta? Os agentes serão movidos para "Sem pasta".')) return
    setFolders((prev) => prev.filter((f) => f.id !== folderId))
    setAgents((prev) =>
      prev.map((a) => (a.folderId === folderId ? { ...a, folderId: null, folder: null } : a))
    )
    try {
      await fetch(`/api/agent-folders/${folderId}`, { method: 'DELETE' })
    } catch {
      fetchAll()
    }
  }

  const toggleFolder = (folderId: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getChannelIcon = (channel: string) => {
    if (channel === 'whatsapp') return <MessageSquare className="h-3.5 w-3.5" />
    if (channel === 'email') return <Mail className="h-3.5 w-3.5" />
    if (channel === 'webchat') return <Globe className="h-3.5 w-3.5" />
    return null
  }

  const unassignedAgents = agents.filter((a) => !a.folderId)

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card border-white/10">
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // ── Agent Card ─────────────────────────────────────────────────────────────

  const AgentCard = ({ agent }: { agent: Agent }) => (
    <Card
      key={agent.id}
      draggable
      onDragStart={(e) => handleDragStart(e, agent.id)}
      onDragEnd={handleDragEnd}
      className={`glass-card hover-scale cursor-grab active:cursor-grabbing transition-opacity ${
        draggedAgentId === agent.id ? 'opacity-40' : ''
      }`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-white text-base truncate">{agent.name}</CardTitle>
              <p className="text-xs text-white/50 truncate">{agent.description || 'Sem descrição'}</p>
            </div>
          </div>
          <GripVertical className="h-4 w-4 text-white/20 shrink-0 mt-1" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {agent.channels.map((ch) => (
            <Badge key={ch.id} variant={ch.isActive ? 'default' : 'secondary'} className="flex items-center gap-1 text-xs">
              {getChannelIcon(ch.channel)}
              {ch.channel}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <Badge variant={agent.status === 'active' ? 'default' : 'secondary'} className="text-xs">
            {agent.status === 'active' ? 'Ativo' : 'Inativo'}
          </Badge>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => router.push(`/dashboard/agents/${agent.id}`)}>
              <Settings className="h-3.5 w-3.5" />
            </Button>
            <Switch checked={agent.status === 'active'} onCheckedChange={() => handleToggleStatus(agent.id, agent.status)} />
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDeleteAgent(agent.id)}>
              <Trash2 className="h-3.5 w-3.5 text-red-400" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // ── Drop Zone ──────────────────────────────────────────────────────────────

  const DropZone = ({ targetId, children }: { targetId: string; children: React.ReactNode }) => {
    const isOver = dragOverTarget === targetId
    return (
      <div
        onDragOver={(e) => handleDragOver(e, targetId)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, targetId === 'root' ? null : targetId)}
        className={`rounded-xl transition-all duration-150 ${
          isOver && draggedAgentId
            ? 'ring-2 ring-blue-400/60 bg-blue-500/5'
            : ''
        }`}
      >
        {children}
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Agentes de IA</h1>
          <p className="text-white/60 mt-1">Gerencie seus assistentes virtuais</p>
        </div>
        <div className="flex items-center gap-2">
          {/* New Folder */}
          <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <FolderPlus className="h-4 w-4" />
                Nova Pasta
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm bg-[#0a0a0b] border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white">Criar Pasta</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label className="text-white">Nome</Label>
                  <Input
                    placeholder="Ex: Suporte, Vendas..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Cor</Label>
                  <div className="flex gap-2 flex-wrap">
                    {FOLDER_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewFolderColor(c)}
                        className={`w-8 h-8 rounded-full transition-transform ${newFolderColor === c ? 'scale-125 ring-2 ring-white/50' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <Button onClick={handleCreateFolder} className="w-full" disabled={!newFolderName.trim()}>
                  Criar Pasta
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* New Agent */}
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Novo Agente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-[#0a0a0b] border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white">Criar Novo Agente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-white">Nome do Agente</Label>
                  <Input
                    placeholder="Ex: Assistente de Vendas"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Descrição</Label>
                  <Textarea
                    placeholder="Descreva o propósito deste agente..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-white/5 border-white/10 text-white min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Instruções do Sistema</Label>
                  <Textarea
                    placeholder="Você é um assistente que..."
                    value={formData.systemPrompt}
                    onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                    className="bg-white/5 border-white/10 text-white min-h-[120px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Canais</Label>
                  <div className="space-y-2">
                    {[
                      { key: 'whatsapp' as const, label: 'WhatsApp', icon: <MessageSquare className="h-4 w-4 text-green-400" /> },
                      { key: 'webchat' as const, label: 'Web Chat', icon: <Globe className="h-4 w-4 text-blue-400" /> },
                      { key: 'email' as const, label: 'Email', icon: <Mail className="h-4 w-4 text-purple-400" /> },
                    ].map(({ key, label, icon }) => (
                      <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                        <div className="flex items-center gap-3">
                          {icon}
                          <span className="text-white">{label}</span>
                        </div>
                        <Switch
                          checked={formData.channels[key]}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, channels: { ...formData.channels, [key]: checked } })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <Button onClick={handleCreateAgent} className="w-full" disabled={!formData.name || !formData.systemPrompt}>
                  Criar Agente
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Empty state */}
      {agents.length === 0 && (
        <Card className="glass-card border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 rounded-full bg-muted/50 p-6">
              <Bot className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-2xl font-semibold text-white">Nenhum agente criado</h3>
            <p className="mb-6 text-center text-white/60 max-w-md">
              Agentes de IA automatizam atendimento, qualificam leads e economizam tempo.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => setCreateDialogOpen(true)} size="lg">
                <Plus className="mr-2 h-4 w-4" />
                Criar Agente
              </Button>
              <Button variant="outline" size="lg" onClick={() => router.push('/dashboard/templates?type=agent')}>
                Ver Templates
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Folders */}
      {folders.map((folder) => {
        const folderAgents = agents.filter((a) => a.folderId === folder.id)
        const isCollapsed = collapsedFolders.has(folder.id)
        const isOver = dragOverTarget === folder.id

        return (
          <DropZone key={folder.id} targetId={folder.id}>
            <div className="space-y-3">
              {/* Folder header */}
              <div
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isOver && draggedAgentId ? 'bg-white/10' : 'bg-white/5'
                }`}
              >
                <button
                  onClick={() => toggleFolder(folder.id)}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  {isCollapsed
                    ? <ChevronRight className="h-4 w-4 text-white/40" />
                    : <ChevronDown className="h-4 w-4 text-white/40" />
                  }
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: folder.color }} />
                  {isCollapsed
                    ? <Folder className="h-4 w-4" style={{ color: folder.color }} />
                    : <FolderOpen className="h-4 w-4" style={{ color: folder.color }} />
                  }
                  <span className="font-medium text-white">{folder.name}</span>
                  <Badge variant="secondary" className="text-xs ml-1">{folderAgents.length}</Badge>
                </button>
                <button
                  onClick={() => handleDeleteFolder(folder.id)}
                  className="text-white/30 hover:text-red-400 transition-colors p-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Folder agents grid */}
              {!isCollapsed && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-4">
                  {folderAgents.map((agent) => (
                    <AgentCard key={agent.id} agent={agent} />
                  ))}
                  {folderAgents.length === 0 && (
                    <div className="col-span-full border border-dashed border-white/10 rounded-xl p-6 text-center text-white/30 text-sm">
                      Arraste agentes para cá
                    </div>
                  )}
                </div>
              )}
            </div>
          </DropZone>
        )
      })}

      {/* Unassigned agents (root zone) */}
      {agents.length > 0 && (
        <DropZone targetId="root">
          <div className="space-y-3">
            {folders.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1">
                <Folder className="h-4 w-4 text-white/30" />
                <span className="text-sm text-white/40 font-medium">Sem pasta</span>
                <Badge variant="secondary" className="text-xs">{unassignedAgents.length}</Badge>
              </div>
            )}
            {unassignedAgents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unassignedAgents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            ) : folders.length > 0 ? (
              <div className="border border-dashed border-white/10 rounded-xl p-6 text-center text-white/20 text-sm">
                Arraste agentes aqui para remover da pasta
              </div>
            ) : null}
          </div>
        </DropZone>
      )}
    </div>
  )
}
