'use client'

// 005-agentic-companies — Matriz RACI editável (cargo × fase). Célula cicla —/R/A/C/I ao
// clicar. Destaca a coluna (fase) que viola a regra de ouro (≠ 1 A). Salvar valida no
// servidor (validateRaci → 409) e o erro é exibido.
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'
import type { CompanyRoleDTO, RaciMatrix as RaciMatrixType, SdlcPhaseDTO } from './types'
import type { RaciValue } from '@/lib/companies/sdlc'

const CYCLE: (RaciValue | '')[] = ['', 'R', 'A', 'C', 'I']
const CELL_STYLE: Record<string, string> = {
  '': 'text-white/20',
  R: 'bg-blue-500/20 text-blue-200',
  A: 'bg-emerald-500/25 text-emerald-200 font-semibold',
  C: 'bg-amber-500/20 text-amber-200',
  I: 'bg-white/5 text-white/40',
}

interface Props {
  roles: Pick<CompanyRoleDTO, 'key' | 'title' | 'layer'>[]
  phases: SdlcPhaseDTO[]
  initialRaci: RaciMatrixType
  onSave: (raci: RaciMatrixType) => Promise<{ ok: boolean; error?: string }>
}

export function RaciMatrix({ roles, phases, initialRaci, onSave }: Props) {
  const [matrix, setMatrix] = useState<RaciMatrixType>(() => structuredClone(initialRaci ?? {}))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const cellValue = (phase: string, role: string): RaciValue | '' => matrix[phase]?.[role] ?? ''
  const aCount = (phase: string) => Object.values(matrix[phase] ?? {}).filter(v => v === 'A').length

  const cycle = (phase: string, role: string) => {
    setSavedAt(null)
    setMatrix(prev => {
      const next = structuredClone(prev)
      const cur = next[phase]?.[role] ?? ''
      const idx = CYCLE.indexOf(cur as RaciValue | '')
      const val = CYCLE[(idx + 1) % CYCLE.length]
      next[phase] = next[phase] ?? {}
      if (val === '') delete next[phase][role]
      else next[phase][role] = val
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true); setError(null)
    try {
      const res = await onSave(matrix)
      if (res.ok) setSavedAt(Date.now())
      else setError(res.error || 'Falha ao salvar a RACI')
    } finally { setSaving(false) }
  }

  const invalidPhases = phases.filter(p => aCount(p.key) !== 1)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-white/50">Clique numa célula para ciclar — / R (Responsável) / A (Aprovador) / C (Consultado) / I (Informado). Regra de ouro: exatamente 1 <span className="text-emerald-300">A</span> por fase.</p>
        <div className="flex items-center gap-3 shrink-0">
          {savedAt && <span className="text-xs text-emerald-300">Salvo</span>}
          <Button size="sm" disabled={saving} onClick={handleSave}><Save className="mr-1.5 h-3.5 w-3.5" />{saving ? 'Salvando…' : 'Salvar RACI'}</Button>
        </div>
      </div>

      {error && <div className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
      {!error && invalidPhases.length > 0 && (
        <div className="rounded-md border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Fases com nº de A ≠ 1: {invalidPhases.map(p => p.label).join(', ')}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-white/5">
              <th className="sticky left-0 z-10 bg-[#0f1116] px-3 py-2 text-left text-xs font-medium text-white/60">Cargo</th>
              {phases.map(p => (
                <th key={p.key} className={`px-2 py-2 text-center text-[11px] font-medium ${aCount(p.key) !== 1 ? 'text-amber-300' : 'text-white/60'}`} title={p.objective}>
                  {p.label}
                  <div className="text-[10px] font-normal text-white/30">{aCount(p.key)}A</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map(role => (
              <tr key={role.key} className="border-t border-white/5">
                <td className="sticky left-0 z-10 bg-[#0f1116] px-3 py-1.5 text-xs text-white/80 whitespace-nowrap">{role.title}</td>
                {phases.map(p => {
                  const v = cellValue(p.key, role.key)
                  return (
                    <td key={p.key} className="px-1 py-1 text-center">
                      <button
                        onClick={() => cycle(p.key, role.key)}
                        className={`h-7 w-9 rounded text-xs transition-colors hover:ring-1 hover:ring-white/30 ${CELL_STYLE[v]}`}
                        title={`${role.title} × ${p.label}`}
                      >
                        {v || '—'}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
