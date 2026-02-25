'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Bot, Plus, Folder } from 'lucide-react'

import { AgentsPageHeader } from '@/components/dashboard/agents/AgentsPageHeader'
import { AgentCard } from '@/components/dashboard/agents/AgentCard'
import { AgentFolderSection } from '@/components/dashboard/agents/AgentFolderSection'
import { CreateAgentDialog, type AgentFormData } from '@/components/dashboard/agents/CreateAgentDialog'
import { CreateFolderDialog, FOLDER_COLORS } from '@/components/dashboard/agents/CreateFolderDialog'
import { useAgents } from '@/components/dashboard/agents/useAgents'

const EMPTY_FORM: AgentFormData = {
  name: '', description: '', systemPrompt: '',
  model: 'llama-3.3-70b-versatile', temperature: 0.7,
  channels: { whatsapp: false, webchat: false, email: false },
}

export default function AgentsPage() {
  const router = useRouter()
  const {
    agents, folders, loading,
    handleCreateAgent, handleToggleStatus, handleDeleteAgent,
    handleCreateFolder, handleDeleteFolder, handleDropAgent,
  } = useAgents()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set())
  const [draggedAgentId, setDraggedAgentId] = useState<string | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0])
  const [formData, setFormData] = useState<AgentFormData>(EMPTY_FORM)

  const handleDragStart = (e: React.DragEvent, agentId: string) => {
    setDraggedAgentId(agentId)
    e.dataTransfer.effectAllowed = 'move'
  }
  const handleDragEnd = () => { setDraggedAgentId(null); setDragOverTarget(null) }
  const handleDragOver = (e: React.DragEvent, target: string) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverTarget(target)
  }
  const handleDragLeave = () => { setDragOverTarget(null) }
  const handleDrop = async (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault(); setDragOverTarget(null)
    if (draggedAgentId) await handleDropAgent(draggedAgentId, folderId)
  }

  const toggleFolder = (id: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next
    })
  }

  const dragProps = { draggedAgentId, dragOverTarget, onDragStart: handleDragStart, onDragEnd: handleDragEnd, onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop }
  const unassignedAgents = agents.filter((a) => !a.folderId)

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-48" /><Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card border-white/10">
              <CardHeader><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-full" /></CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <AgentsPageHeader onNewFolder={() => setFolderDialogOpen(true)} onNewAgent={() => setCreateDialogOpen(true)} />

      {agents.length === 0 && (
        <Card className="glass-card border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 rounded-full bg-muted/50 p-6"><Bot className="h-12 w-12 text-muted-foreground" /></div>
            <h3 className="mb-2 text-2xl font-semibold text-white">Nenhum agente criado</h3>
            <p className="mb-6 text-center text-white/60 max-w-md">Agentes de IA automatizam atendimento, qualificam leads e economizam tempo.</p>
            <div className="flex gap-3">
              <Button onClick={() => setCreateDialogOpen(true)} size="lg"><Plus className="mr-2 h-4 w-4" />Criar Agente</Button>
              <Button variant="outline" size="lg" onClick={() => router.push('/dashboard/templates?type=agent')}>Ver Templates</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {folders.map((folder) => (
        <AgentFolderSection
          key={folder.id}
          folder={folder}
          agents={agents.filter((a) => a.folderId === folder.id)}
          isCollapsed={collapsedFolders.has(folder.id)}
          onToggleCollapse={toggleFolder}
          onDeleteFolder={handleDeleteFolder}
          onToggleAgentStatus={handleToggleStatus}
          onDeleteAgent={handleDeleteAgent}
          onNavigateAgent={(id) => router.push(`/dashboard/agents/${id}`)}
          drag={dragProps}
        />
      ))}

      {agents.length > 0 && (
        <div
          onDragOver={(e) => handleDragOver(e, 'root')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, null)}
          className={`rounded-xl transition-all duration-150 ${dragOverTarget === 'root' && draggedAgentId ? 'ring-2 ring-blue-400/60 bg-blue-500/5' : ''}`}
        >
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
                  <AgentCard key={agent.id} agent={agent} draggedAgentId={draggedAgentId} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onToggleStatus={handleToggleStatus} onDelete={handleDeleteAgent} onNavigate={(id) => router.push(`/dashboard/agents/${id}`)} />
                ))}
              </div>
            ) : folders.length > 0 ? (
              <div className="border border-dashed border-white/10 rounded-xl p-6 text-center text-white/20 text-sm">Arraste agentes aqui para remover da pasta</div>
            ) : null}
          </div>
        </div>
      )}

      <CreateAgentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        formData={formData}
        onChange={setFormData}
        onSubmit={async () => {
          const ok = await handleCreateAgent(formData)
          if (ok) { setCreateDialogOpen(false); setFormData(EMPTY_FORM) }
        }}
      />
      <CreateFolderDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
        name={newFolderName}
        color={newFolderColor}
        onNameChange={setNewFolderName}
        onColorChange={setNewFolderColor}
        onSubmit={async () => {
          const folder = await handleCreateFolder(newFolderName, newFolderColor)
          if (folder) { setFolderDialogOpen(false); setNewFolderName(''); setNewFolderColor(FOLDER_COLORS[0]) }
        }}
      />
    </div>
  )
}
