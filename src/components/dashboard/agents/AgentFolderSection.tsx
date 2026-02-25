'use client'

import { Badge } from '@/components/ui/badge'
import { Folder, FolderOpen, ChevronDown, ChevronRight, X } from 'lucide-react'
import { AgentCard, type Agent } from './AgentCard'

interface AgentFolder {
  id: string
  name: string
  color: string
  agents: { id: string }[]
}

interface DragProps {
  draggedAgentId: string | null
  dragOverTarget: string | null
  onDragStart: (e: React.DragEvent, agentId: string) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent, target: string) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, folderId: string | null) => void
}

interface AgentFolderSectionProps {
  folder: AgentFolder
  agents: Agent[]
  isCollapsed: boolean
  onToggleCollapse: (folderId: string) => void
  onDeleteFolder: (folderId: string) => void
  onToggleAgentStatus: (agentId: string, currentStatus: string) => void
  onDeleteAgent: (agentId: string) => void
  onNavigateAgent: (agentId: string) => void
  drag: DragProps
}

export function AgentFolderSection({
  folder,
  agents,
  isCollapsed,
  onToggleCollapse,
  onDeleteFolder,
  onToggleAgentStatus,
  onDeleteAgent,
  onNavigateAgent,
  drag,
}: AgentFolderSectionProps) {
  const isOver = drag.dragOverTarget === folder.id

  return (
    <div
      onDragOver={(e) => drag.onDragOver(e, folder.id)}
      onDragLeave={drag.onDragLeave}
      onDrop={(e) => drag.onDrop(e, folder.id)}
      className={`rounded-xl transition-all duration-150 ${
        isOver && drag.draggedAgentId ? 'ring-2 ring-blue-400/60 bg-blue-500/5' : ''
      }`}
    >
      <div className="space-y-3">
        {/* Folder header */}
        <div
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
            isOver && drag.draggedAgentId ? 'bg-white/10' : 'bg-white/5'
          }`}
        >
          <button
            onClick={() => onToggleCollapse(folder.id)}
            className="flex items-center gap-2 flex-1 text-left"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-white/40" />
            ) : (
              <ChevronDown className="h-4 w-4 text-white/40" />
            )}
            <div className="w-4 h-4 rounded" style={{ backgroundColor: folder.color }} />
            {isCollapsed ? (
              <Folder className="h-4 w-4" style={{ color: folder.color }} />
            ) : (
              <FolderOpen className="h-4 w-4" style={{ color: folder.color }} />
            )}
            <span className="font-medium text-white">{folder.name}</span>
            <Badge variant="secondary" className="text-xs ml-1">
              {agents.length}
            </Badge>
          </button>
          <button
            onClick={() => onDeleteFolder(folder.id)}
            className="text-white/30 hover:text-red-400 transition-colors p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Folder agents grid */}
        {!isCollapsed && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-4">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                draggedAgentId={drag.draggedAgentId}
                onDragStart={drag.onDragStart}
                onDragEnd={drag.onDragEnd}
                onToggleStatus={onToggleAgentStatus}
                onDelete={onDeleteAgent}
                onNavigate={onNavigateAgent}
              />
            ))}
            {agents.length === 0 && (
              <div className="col-span-full border border-dashed border-white/10 rounded-xl p-6 text-center text-white/30 text-sm">
                Arraste agentes para cá
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
