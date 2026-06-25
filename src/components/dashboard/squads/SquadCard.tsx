'use client'

// 009-usecase-squads — Card de um squad com nome, use case e botão "Rodar".
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Zap } from 'lucide-react'
import { SquadRunButton } from './SquadRunButton'

export interface SquadCardData {
  id: string
  name: string
  useCase: string
  members: { agentId: string; name: string; role: string }[]
  lastRun?: { id: string; status: string; createdAt: string }
}

const STATUS_COLOR: Record<string, string> = {
  completed: 'bg-green-500/15 text-green-700 border-green-200',
  running:   'bg-blue-500/15 text-blue-700 border-blue-200',
  pending:   'bg-yellow-500/15 text-yellow-700 border-yellow-200',
  failed:    'bg-red-500/15 text-red-700 border-red-200',
  rate_limited: 'bg-orange-500/15 text-orange-700 border-orange-200',
}

interface Props {
  companyId: string
  squad: SquadCardData
  onRunStarted?: (runId: string, queued: boolean, position: number) => void
}

export function SquadCard({ companyId, squad, onRunStarted }: Props) {
  const leadCount = squad.members.filter(m => m.role === 'lead').length
  const workerCount = squad.members.filter(m => m.role === 'worker').length
  const reviewerCount = squad.members.filter(m => m.role === 'reviewer').length

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{squad.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{squad.useCase}</p>
          </div>
          {squad.lastRun && (
            <Badge variant="outline" className={`text-xs shrink-0 ${STATUS_COLOR[squad.lastRun.status] ?? ''}`}>
              {squad.lastRun.status}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {squad.members.length} membros
          </span>
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {leadCount}L · {workerCount}W{reviewerCount > 0 ? ` · ${reviewerCount}R` : ''}
          </span>
        </div>

        <SquadRunButton
          companyId={companyId}
          squadId={squad.id}
          squadName={squad.name}
          onRunStarted={onRunStarted}
        />
      </CardContent>
    </Card>
  )
}
