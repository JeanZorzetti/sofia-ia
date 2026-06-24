'use client'

// 005-agentic-companies — faceta Infraestrutura (FR-013). MCP por cargo é LEITURA + deep-link
// para a config MCP do próprio agente (C2). Só a flag sandbox por cargo é escrita aqui.
import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Save, Server, ExternalLink } from 'lucide-react'
import type { CompanyRoleDTO } from './types'

interface InfraEntry {
  agentId: string | null
  agentName: string | null
  mcpServers: { id: string; name: string; enabled: boolean }[]
  sandbox: boolean
}

interface Props {
  companyId: string
  roles: Pick<CompanyRoleDTO, 'key' | 'title' | 'agentId'>[]
}

export function InfraPanel({ companyId, roles }: Props) {
  const [data, setData] = useState<Record<string, InfraEntry>>({})
  const [sandbox, setSandbox] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchInfra = useCallback(async () => {
    const res = await fetch(`/api/companies/${companyId}/infrastructure`)
    const json = await res.json()
    if (json.success) {
      setData(json.data)
      setSandbox(Object.fromEntries(Object.entries(json.data as Record<string, InfraEntry>).map(([k, v]) => [k, v.sandbox])))
    }
  }, [companyId])

  useEffect(() => { fetchInfra() }, [fetchInfra])

  const handleSave = async () => {
    setSaving(true); setError(null)
    const payload = Object.fromEntries(Object.entries(sandbox).map(([k, v]) => [k, { sandbox: v }]))
    try {
      const res = await fetch(`/api/companies/${companyId}/infrastructure`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success) setSavedAt(Date.now())
      else setError(json.error || 'Falha ao salvar')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/50">MCP é gerido na config do próprio agente (deep-link). Aqui você ativa o sandbox por cargo (execução isolada).</p>
        <div className="flex items-center gap-3 shrink-0">
          {savedAt && <span className="text-xs text-emerald-300">Salvo</span>}
          <Button size="sm" disabled={saving} onClick={handleSave}><Save className="mr-1.5 h-3.5 w-3.5" />{saving ? 'Salvando…' : 'Salvar Infra'}</Button>
        </div>
      </div>
      {error && <div className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}

      <div className="space-y-2">
        {roles.map(role => {
          const entry = data[role.key]
          return (
            <Card key={role.key} className="border border-white/10 bg-card p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{role.title}</p>
                  <p className="text-[11px] text-white/40">{entry?.agentName ?? 'Vaga vazia'}</p>
                </div>
                <label className="flex items-center gap-2 text-xs text-white/60 shrink-0">
                  Sandbox
                  <Switch checked={!!sandbox[role.key]} onCheckedChange={(v) => setSandbox(prev => ({ ...prev, [role.key]: v }))} />
                </label>
              </div>
              {role.agentId && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Server className="h-3.5 w-3.5 text-white/30" />
                  {entry && entry.mcpServers.length > 0 ? (
                    entry.mcpServers.map(s => (
                      <Badge key={s.id} variant="outline" className={`text-[10px] ${s.enabled ? 'border-blue-400/40 text-blue-200' : 'border-white/15 text-white/40'}`}>{s.name}</Badge>
                    ))
                  ) : (
                    <span className="text-[11px] text-white/30">Sem MCP vinculado</span>
                  )}
                  <a href={`/dashboard/agents/${role.agentId}/mcp`} className="ml-1 inline-flex items-center gap-1 text-[11px] text-blue-300 hover:underline">
                    Gerir MCP <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
