'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, Play, Clock, RefreshCw } from 'lucide-react'
import type { QueueState } from '@/lib/companies/squad-queue'

interface Props {
  companyId: string
  pollIntervalMs?: number
}

type QueueEntry = QueueState['queue'][number]

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s atrás`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}min atrás`
  return `${Math.floor(m / 60)}h atrás`
}

export function QueuePanel({ companyId, pollIntervalMs = 5000 }: Props) {
  const [state, setState] = useState<QueueState | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)

  const fetch_ = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/squad-runs/queue')
      const data = await res.json()
      if (data.success) {
        setState(data.data)
        setLastFetch(new Date())
      }
    } catch { /* silent */ } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch_()
    const id = setInterval(() => fetch_(true), pollIntervalMs)
    return () => clearInterval(id)
  }, [fetch_, pollIntervalMs])

  // Filter to this company's runs only.
  const companyRunning = state?.running?.companyId === companyId ? state.running : undefined
  const companyQueue: QueueEntry[] = (state?.queue ?? []).filter(r => r.companyId === companyId)

  const globalQueue: QueueEntry[] = (state?.queue ?? []).filter(r => r.companyId !== companyId)
  const globalRunning = state?.running && state.running.companyId !== companyId ? state.running : undefined

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-12" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Fila global de squads</h3>
          <p className="text-xs text-muted-foreground mt-0.5">WIP=1 — apenas 1 squad-run executa por vez em toda a plataforma</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => fetch_()}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Running */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Em execução</p>
        {companyRunning ? (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 flex items-center gap-3">
            <Loader2 className="h-4 w-4 text-green-500 animate-spin flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-700">Este squad está rodando</p>
              <p className="text-xs text-muted-foreground">Run ID: {companyRunning.runId}</p>
            </div>
            <Badge variant="outline" className="text-green-600 border-green-500/50">
              {formatRelative(companyRunning.startedAt)}
            </Badge>
          </div>
        ) : globalRunning ? (
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3 flex items-center gap-3">
            <Loader2 className="h-4 w-4 text-blue-400 animate-spin flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Outro squad em execução</p>
              <p className="text-xs text-muted-foreground">Pool ocupado · seus runs aguardam a fila</p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed px-4 py-3 text-center text-sm text-muted-foreground">
            <Play className="h-4 w-4 mx-auto mb-1 opacity-40" />
            Nenhum squad rodando
          </div>
        )}
      </div>

      {/* Queue for this company */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Fila — esta empresa {companyQueue.length > 0 && <span className="text-foreground">({companyQueue.length})</span>}
        </p>
        {companyQueue.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Sem runs pendentes</p>
        ) : (
          <div className="space-y-1.5">
            {companyQueue.map((r) => (
              <div key={r.runId} className="rounded border px-3 py-2 flex items-center gap-2 text-sm">
                <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="flex-1 truncate text-xs text-muted-foreground">Run {r.runId.slice(-8)}</span>
                <Badge variant="secondary">#{r.position + 1} na fila</Badge>
                <span className="text-xs text-muted-foreground">{formatRelative(r.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Global queue summary */}
      {globalQueue.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Fila global — outras empresas ({globalQueue.length})
          </p>
          <p className="text-xs text-muted-foreground">
            {globalQueue.length} run{globalQueue.length > 1 ? 's' : ''} de outras empresas aguardando
          </p>
        </div>
      )}

      {lastFetch && (
        <p className="text-xs text-muted-foreground text-right">
          Atualizado {formatRelative(lastFetch.toISOString())} · polling a cada {pollIntervalMs / 1000}s
        </p>
      )}
    </div>
  )
}
