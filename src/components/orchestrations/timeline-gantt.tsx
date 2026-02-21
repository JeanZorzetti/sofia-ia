'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock } from 'lucide-react'

interface StepResult {
  agentName: string
  role: string
  startedAt?: string
  completedAt?: string
  durationMs?: number
  tokensUsed?: number
}

interface TimelineGanttProps {
  steps: StepResult[]
  totalDuration: number
}

export function TimelineGantt({ steps, totalDuration }: TimelineGanttProps) {
  if (steps.length === 0 || totalDuration === 0) {
    return null
  }

  // Find earliest start time
  const earliestStart = Math.min(
    ...steps
      .filter(s => s.startedAt)
      .map(s => new Date(s.startedAt!).getTime())
  )

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const getBarPosition = (step: StepResult) => {
    if (!step.startedAt || !step.completedAt) {
      return { left: 0, width: 0 }
    }

    const stepStart = new Date(step.startedAt).getTime()
    const stepEnd = new Date(step.completedAt).getTime()
    const stepDuration = stepEnd - stepStart

    const left = ((stepStart - earliestStart) / totalDuration) * 100
    const width = (stepDuration / totalDuration) * 100

    return { left, width: Math.max(width, 2) } // minimum 2% width for visibility
  }

  const getBarColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-orange-500',
      'bg-teal-500'
    ]
    return colors[index % colors.length]
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Timeline de Execução</CardTitle>
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Clock className="h-4 w-4" />
            <span>Duração Total: {formatDuration(totalDuration)}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {steps.map((step, index) => {
            const { left, width } = getBarPosition(step)
            const barColor = getBarColor(index)

            return (
              <div key={index} className="space-y-1">
                {/* Step Label */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{step.role}</span>
                    <Badge variant="outline" className="text-[10px] border-white/10 text-white/40">
                      {step.agentName}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    {step.durationMs && (
                      <span>{formatDuration(step.durationMs)}</span>
                    )}
                    {step.tokensUsed && step.tokensUsed > 0 && (
                      <Badge variant="secondary" className="text-[10px] bg-purple-500/20 text-purple-300">
                        {step.tokensUsed} tokens
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Timeline Bar */}
                <div className="relative h-8 bg-white/5 rounded-md border border-white/10 overflow-hidden">
                  {/* Time markers (optional, for reference) */}
                  <div className="absolute inset-0 flex">
                    {[0, 25, 50, 75, 100].map((mark) => (
                      <div
                        key={mark}
                        className="absolute h-full border-l border-white/10"
                        style={{ left: `${mark}%` }}
                      />
                    ))}
                  </div>

                  {/* Execution Bar */}
                  {width > 0 && (
                    <div
                      className={`absolute top-0 h-full ${barColor} opacity-80 rounded transition-all flex items-center justify-center text-xs font-medium text-white`}
                      style={{
                        left: `${left}%`,
                        width: `${width}%`
                      }}
                    >
                      {width > 15 && step.durationMs && (
                        <span className="drop-shadow-md">
                          {formatDuration(step.durationMs)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Time Scale */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex justify-between text-xs text-white/40">
            <span>0s</span>
            <span>{formatDuration(totalDuration / 4)}</span>
            <span>{formatDuration(totalDuration / 2)}</span>
            <span>{formatDuration((totalDuration * 3) / 4)}</span>
            <span>{formatDuration(totalDuration)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
