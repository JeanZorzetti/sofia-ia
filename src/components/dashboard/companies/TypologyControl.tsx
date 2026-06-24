'use client'

// 005-agentic-companies — faceta Tipologia (FR-008). Propriedade editável da empresa
// (generalista | especialista | híbrida) via PATCH /api/companies/[id]. NÃO é nível do
// organograma — é uma faceta ortogonal.
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Check } from 'lucide-react'

const OPTIONS: { value: string; label: string; desc: string }[] = [
  { value: 'generalist', label: 'Generalista', desc: 'Poucos cargos amplos (Fullstack). Comunicação simples, iteração rápida — ideal para MVPs.' },
  { value: 'specialist', label: 'Especialista', desc: 'Muitos cargos estreitos. Qualidade e paralelismo; orquestração mais complexa — sistemas de larga escala.' },
  { value: 'hybrid', label: 'Híbrida', desc: 'Núcleo generalista + especialistas sob demanda. Equilíbrio velocidade × excelência técnica.' },
]

interface Props {
  companyId: string
  current: string
  onChange?: (typology: string) => void
}

export function TypologyControl({ companyId, current, onChange }: Props) {
  const [value, setValue] = useState(current)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const select = async (next: string) => {
    if (next === value || saving) return
    setSaving(true); setError(null)
    const prev = value
    setValue(next)
    try {
      const res = await fetch(`/api/companies/${companyId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ typology: next }),
      })
      const data = await res.json()
      if (data.success) onChange?.(next)
      else { setValue(prev); setError(data.error || 'Falha ao atualizar tipologia') }
    } catch {
      setValue(prev); setError('Falha ao atualizar tipologia')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-white/50">A tipologia define o estilo da equipa. Generalista expressa-se pela largura dos cargos (não por compartilhar agentes — o encaixe é 1:1).</p>
      {error && <div className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
      <div className="grid gap-3 md:grid-cols-3">
        {OPTIONS.map(opt => {
          const active = value === opt.value
          return (
            <Card
              key={opt.value}
              onClick={() => select(opt.value)}
              className={`cursor-pointer border p-4 transition-colors ${active ? 'border-emerald-400/50 bg-emerald-500/5' : 'border-white/10 bg-card hover:border-white/20'}`}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white">{opt.label}</h4>
                {active && <Check className="h-4 w-4 text-emerald-400" />}
              </div>
              <p className="mt-1.5 text-[11px] text-white/50">{opt.desc}</p>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
