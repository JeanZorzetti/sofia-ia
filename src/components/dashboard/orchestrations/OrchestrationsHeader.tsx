'use client'

import { Button } from '@/components/ui/button'
import { History, Sparkles, Wand2, Plus } from 'lucide-react'

interface OrchestrationsHeaderProps {
  onHistoryClick: () => void
  onTemplateClick: () => void
  onAIClick: () => void
  onCreateClick: () => void
}

export function OrchestrationsHeader({
  onHistoryClick,
  onTemplateClick,
  onAIClick,
  onCreateClick,
}: OrchestrationsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-white">Multi-Agent Orchestration</h1>
        <p className="text-white/60 mt-1">
          Configure múltiplos agentes para colaborar em tarefas complexas
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onHistoryClick} className="gap-2">
          <History className="h-4 w-4" />
          Histórico
        </Button>
        <Button variant="outline" onClick={onTemplateClick} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Usar Template
        </Button>
        <Button
          variant="outline"
          onClick={onAIClick}
          className="gap-2 border-purple-500/40 text-purple-300 hover:bg-purple-500/10 hover:border-purple-400"
        >
          <Wand2 className="h-4 w-4" />
          Gerar com IA
        </Button>
        <Button onClick={onCreateClick} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Orquestração
        </Button>
      </div>
    </div>
  )
}
