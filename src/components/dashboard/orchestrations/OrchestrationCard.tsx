'use client'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  Loader2,
  Globe,
} from 'lucide-react'

interface Execution {
  status: string
  completedAt?: string
  startedAt?: string
}

interface Orchestration {
  id: string
  name: string
  description: string | null
  agents: unknown[]
  strategy: string
  status: string
  isLandingTemplate: boolean
  createdAt: string
  _count: { executions: number }
  executions: Execution[]
}

interface OrchestrationCardProps {
  orchestration: Orchestration
  onView: (id: string) => void
  onDelete: (id: string) => void
  onToggleLanding: (id: string, current: boolean) => void
}

function getStrategyBadge(strategy: string) {
  switch (strategy) {
    case 'sequential':
      return <Badge className="bg-blue-500">Sequencial</Badge>
    case 'parallel':
      return <Badge className="bg-purple-500">Paralelo</Badge>
    case 'consensus':
      return <Badge className="bg-green-500">Consenso</Badge>
    default:
      return <Badge>{strategy}</Badge>
  }
}

function getLastExecutionBadge(orchestration: Orchestration) {
  const lastExec = orchestration.executions?.[0]
  if (!lastExec) return null

  if (lastExec.status === 'completed') {
    const duration =
      lastExec.completedAt && lastExec.startedAt
        ? Math.round(
            (new Date(lastExec.completedAt).getTime() -
              new Date(lastExec.startedAt).getTime()) /
              1000
          )
        : null
    return (
      <Badge variant="outline" className="text-green-400 border-green-400/30 text-xs gap-1">
        <CheckCircle className="w-3 h-3" />
        {duration ? `${duration}s` : 'Sucesso'}
      </Badge>
    )
  }
  if (lastExec.status === 'failed') {
    return (
      <Badge variant="outline" className="text-red-400 border-red-400/30 text-xs gap-1">
        <XCircle className="w-3 h-3" />
        Falhou
      </Badge>
    )
  }
  if (lastExec.status === 'running') {
    return (
      <Badge
        variant="outline"
        className="text-yellow-400 border-yellow-400/30 text-xs gap-1 animate-pulse"
      >
        <Loader2 className="w-3 h-3 animate-spin" />
        Executando
      </Badge>
    )
  }
  return null
}

export function OrchestrationCard({ orchestration, onView, onDelete, onToggleLanding }: OrchestrationCardProps) {
  return (
    <Card className="glass-card hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-white">{orchestration.name}</CardTitle>
              {orchestration.isLandingTemplate && (
                <Badge className="bg-blue-600/80 text-white text-[10px] gap-1 py-0 px-1.5">
                  <Globe className="w-2.5 h-2.5" />
                  Landing
                </Badge>
              )}
            </div>
            <CardDescription className="text-white/60">
              {orchestration.description || 'Sem descrição'}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            {getStrategyBadge(orchestration.strategy)}
            {getLastExecutionBadge(orchestration)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-blue-400" />
          <span className="text-white/60">{orchestration.agents.length} agentes</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-purple-400" />
          <span className="text-white/60">{orchestration._count.executions} execuções</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          {orchestration.status === 'active' ? (
            <CheckCircle className="h-4 w-4 text-green-400" />
          ) : (
            <XCircle className="h-4 w-4 text-gray-400" />
          )}
          <span className="text-white/60">
            {orchestration.status === 'active' ? 'Ativo' : 'Inativo'}
          </span>
        </div>

        <div className="pt-4 border-t border-white/20 flex gap-2">
          <Button size="sm" className="flex-1" onClick={() => onView(orchestration.id)}>
            Ver Detalhes
          </Button>
          <Button
            size="sm"
            variant={orchestration.isLandingTemplate ? 'default' : 'outline'}
            className={orchestration.isLandingTemplate
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'border-white/20 text-white/50 hover:text-white hover:border-white/40'}
            onClick={() => onToggleLanding(orchestration.id, orchestration.isLandingTemplate)}
            title={orchestration.isLandingTemplate ? 'Remover da landing page' : 'Mostrar na landing page'}
          >
            <Globe className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDelete(orchestration.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
