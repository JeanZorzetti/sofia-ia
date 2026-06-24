'use client'

// 005-agentic-companies — progressão fase-a-fase de uma CompanyRun (FR-016). Faz polling
// enquanto o run está pending/running. Cada fase mostra status, artefato e a referência do
// TeamRun real (rastreabilidade). O TeamRun é `internal` (fora da UI de Times).
import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle, Loader2, XCircle, SkipForward, Ban } from 'lucide-react'
import { SDLC_PHASES } from '@/lib/companies/sdlc'

interface PhaseRun {
  id: string
  phase: string
  position: number
  status: string
  teamRunId: string | null
  inputArtifact: string | null
  outputArtifact: string | null
  error: string | null
}
interface RunDTO {
  id: string
  mission: string
  status: string
  currentPhase: string | null
  output: string | null
  error: string | null
}

const PHASE_LABEL: Record<string, string> = Object.fromEntries(SDLC_PHASES.map(p => [p.key, p.label]))

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pendente', cls: 'border-white/20 text-white/50' },
  running: { label: 'Executando', cls: 'border-blue-400/40 text-blue-200' },
  completed: { label: 'Concluído', cls: 'border-emerald-400/40 text-emerald-200' },
  failed: { label: 'Falhou', cls: 'border-red-400/40 text-red-300' },
  skipped: { label: 'Pulado', cls: 'border-white/15 text-white/40' },
  blocked: { label: 'Bloqueado', cls: 'border-amber-400/40 text-amber-200' },
}

function PhaseIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle2 className="h-4 w-4 text-emerald-400" />
  if (status === 'running') return <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
  if (status === 'failed') return <XCircle className="h-4 w-4 text-red-400" />
  if (status === 'skipped') return <SkipForward className="h-4 w-4 text-white/30" />
  if (status === 'blocked') return <Ban className="h-4 w-4 text-amber-400" />
  return <Circle className="h-4 w-4 text-white/20" />
}

export function RunTimeline({ companyRunId }: { companyRunId: string }) {
  const [run, setRun] = useState<RunDTO | null>(null)
  const [phaseRuns, setPhaseRuns] = useState<PhaseRun[]>([])

  const fetchRun = useCallback(async () => {
    const res = await fetch(`/api/company-runs/${companyRunId}`)
    const data = await res.json()
    if (data.success) { setRun(data.data.run); setPhaseRuns(data.data.phaseRuns) }
    return data?.data?.run?.status as string | undefined
  }, [companyRunId])

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout>
    const tick = async () => {
      const status = await fetchRun()
      if (active && (status === 'pending' || status === 'running')) {
        timer = setTimeout(tick, 3000)
      }
    }
    tick()
    return () => { active = false; clearTimeout(timer) }
  }, [fetchRun])

  if (!run) return <p className="text-sm text-white/40">Carregando execução…</p>

  const runBadge = STATUS_BADGE[run.status] ?? STATUS_BADGE.pending

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-white/40">Missão</p>
          <p className="text-sm text-white/80 line-clamp-2">{run.mission}</p>
        </div>
        <Badge variant="outline" className={`shrink-0 ${runBadge.cls}`}>{runBadge.label}</Badge>
      </div>

      {run.error && <div className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{run.error}</div>}

      <div className="space-y-2">
        {phaseRuns.map(pr => {
          const badge = STATUS_BADGE[pr.status] ?? STATUS_BADGE.pending
          return (
            <Card key={pr.id} className="border border-white/10 bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 min-w-0">
                  <PhaseIcon status={pr.status} />
                  <span className="text-sm font-medium text-white">{PHASE_LABEL[pr.phase] ?? pr.phase}</span>
                </span>
                <Badge variant="outline" className={`text-[10px] ${badge.cls}`}>{badge.label}</Badge>
              </div>
              {pr.error && <p className="mt-1.5 text-[11px] text-red-300">{pr.error}</p>}
              {pr.outputArtifact && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] text-white/50 hover:text-white/70">Artefato de saída</summary>
                  <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-black/30 p-2 text-[11px] text-white/70">{pr.outputArtifact}</pre>
                </details>
              )}
              {pr.teamRunId && <p className="mt-1.5 font-mono text-[10px] text-white/30">TeamRun: {pr.teamRunId}</p>}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
