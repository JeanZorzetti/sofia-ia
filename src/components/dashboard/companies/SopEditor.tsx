'use client'

// 005-agentic-companies — editor de SOP (formato de saída esperado) por cargo (FR-011 / C1).
// Ligado ao PUT /api/companies/[id]/sops (Company.config.sops).
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Save } from 'lucide-react'
import type { CompanyRoleDTO } from './types'

interface Props {
  roles: Pick<CompanyRoleDTO, 'key' | 'title'>[]
  initialSops: Record<string, string>
  onSave: (sops: Record<string, string>) => Promise<{ ok: boolean; error?: string }>
}

export function SopEditor({ roles, initialSops, onSave }: Props) {
  const [sops, setSops] = useState<Record<string, string>>(() => ({ ...(initialSops ?? {}) }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const handleSave = async () => {
    setSaving(true); setError(null)
    // Remove SOPs vazios para não poluir o config.
    const clean = Object.fromEntries(Object.entries(sops).filter(([, v]) => v.trim()))
    try {
      const res = await onSave(clean)
      if (res.ok) setSavedAt(Date.now())
      else setError(res.error || 'Falha ao salvar SOPs')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/50">Defina o formato de saída padrão (SOP) que cada cargo deve produzir — força saída estruturada em vez de prosa livre.</p>
        <div className="flex items-center gap-3 shrink-0">
          {savedAt && <span className="text-xs text-emerald-300">Salvo</span>}
          <Button size="sm" disabled={saving} onClick={handleSave}><Save className="mr-1.5 h-3.5 w-3.5" />{saving ? 'Salvando…' : 'Salvar SOPs'}</Button>
        </div>
      </div>
      {error && <div className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {roles.map(role => (
          <div key={role.key} className="space-y-1">
            <label className="text-xs font-medium text-white/70">{role.title}</label>
            <Textarea
              rows={2}
              value={sops[role.key] ?? ''}
              onChange={e => setSops(prev => ({ ...prev, [role.key]: e.target.value }))}
              placeholder="ex.: Entregar PRD em Markdown com seções Objetivo, Escopo, Histórias de Utilizador…"
              className="text-xs"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
