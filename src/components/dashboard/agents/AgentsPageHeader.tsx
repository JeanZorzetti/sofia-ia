'use client'

import { Button } from '@/components/ui/button'
import { Plus, FolderPlus } from 'lucide-react'

interface AgentsPageHeaderProps {
  onNewFolder: () => void
  onNewAgent: () => void
}

export function AgentsPageHeader({ onNewFolder, onNewAgent }: AgentsPageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-white">Agentes de IA</h1>
        <p className="text-white/60 mt-1">Gerencie seus assistentes virtuais</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" className="flex items-center gap-2" onClick={onNewFolder}>
          <FolderPlus className="h-4 w-4" />
          Nova Pasta
        </Button>
        <Button className="flex items-center gap-2" onClick={onNewAgent}>
          <Plus className="h-4 w-4" />
          Novo Agente
        </Button>
      </div>
    </div>
  )
}
