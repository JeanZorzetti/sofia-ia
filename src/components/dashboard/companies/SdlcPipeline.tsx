'use client'

// 005-agentic-companies — pipeline das 7 fases do SDLC. Cada fase mostra objetivo,
// artefatos de saída e os cargos atuantes DERIVADOS da RACI (A/R/C). É a leitura do
// processo; a RACI é a fonte da verdade (editada na aba Governança).
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowDown } from 'lucide-react'
import type { CompanyRoleDTO, RaciMatrix as RaciMatrixType, SdlcPhaseDTO } from './types'

interface Props {
  phases: SdlcPhaseDTO[]
  raci: RaciMatrixType
  roles: Pick<CompanyRoleDTO, 'key' | 'title'>[]
}

const VALUE_LABEL: Record<string, string> = { A: 'Aprovador', R: 'Responsável', C: 'Consultado' }
const VALUE_STYLE: Record<string, string> = {
  A: 'border-emerald-400/40 text-emerald-200',
  R: 'border-blue-400/40 text-blue-200',
  C: 'border-amber-400/40 text-amber-200',
}

export function SdlcPipeline({ phases, raci, roles }: Props) {
  const titleOf = (key: string) => roles.find(r => r.key === key)?.title ?? key

  return (
    <div className="space-y-2">
      {phases.map((phase, i) => {
        const cells = raci?.[phase.key] ?? {}
        const actors = (['A', 'R', 'C'] as const).flatMap(v =>
          Object.entries(cells).filter(([, val]) => val === v).map(([roleKey]) => ({ roleKey, value: v }))
        )
        return (
          <div key={phase.key}>
            <Card className="p-4 border border-white/10 bg-card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs text-white/70">{i + 1}</span>
                  <h4 className="text-sm font-semibold text-white">{phase.label}</h4>
                  <Badge variant={phase.essential ? 'default' : 'secondary'} className="text-[10px]">
                    {phase.essential ? 'Essencial' : 'Opcional'}
                  </Badge>
                </div>
              </div>
              <p className="mt-1.5 text-xs text-white/60">{phase.objective}</p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {actors.length === 0 ? (
                  <span className="text-[11px] text-amber-300">Nenhum cargo atuante (R/A/C) — fase inválida para execução</span>
                ) : actors.map(a => (
                  <Badge key={`${a.roleKey}-${a.value}`} variant="outline" className={`text-[10px] ${VALUE_STYLE[a.value]}`}>
                    {a.value} · {titleOf(a.roleKey)} <span className="ml-1 opacity-60">({VALUE_LABEL[a.value]})</span>
                  </Badge>
                ))}
              </div>

              {phase.outputArtifacts.length > 0 && (
                <p className="mt-2 text-[11px] text-white/40">Saída: {phase.outputArtifacts.join(' · ')}</p>
              )}
            </Card>
            {i < phases.length - 1 && (
              <div className="flex justify-center py-1"><ArrowDown className="h-4 w-4 text-white/20" /></div>
            )}
          </div>
        )
      })}
    </div>
  )
}
