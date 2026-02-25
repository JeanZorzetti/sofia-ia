'use client'

import { Card, CardContent } from '@/components/ui/card'
import { GitBranch, CheckCircle, Play } from 'lucide-react'

interface Orchestration {
  status: string
  _count: { executions: number }
}

interface OrchestrationsStatsProps {
  orchestrations: Orchestration[]
}

export function OrchestrationsStats({ orchestrations }: OrchestrationsStatsProps) {
  const totalExecutions = orchestrations.reduce((sum, o) => sum + o._count.executions, 0)
  const activeOrchestrations = orchestrations.filter((o) => o.status === 'active').length

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60">Orquestrações</p>
              <p className="text-3xl font-bold text-white mt-2">{orchestrations.length}</p>
            </div>
            <GitBranch className="h-12 w-12 text-blue-400" />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60">Ativas</p>
              <p className="text-3xl font-bold text-white mt-2">{activeOrchestrations}</p>
            </div>
            <CheckCircle className="h-12 w-12 text-green-400" />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60">Execuções Totais</p>
              <p className="text-3xl font-bold text-white mt-2">{totalExecutions}</p>
            </div>
            <Play className="h-12 w-12 text-purple-400" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
