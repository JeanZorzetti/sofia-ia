'use client'

import { useState } from 'react'
import { toast } from 'sonner'
// import type ONLY (erased at runtime) — must NOT bundle output-webhooks.ts (imports node:crypto)
import type { OutputWebhookConfig, DispatchRecord } from '@/lib/orchestration/output-webhooks'

type WebhookRow = Extract<OutputWebhookConfig, { type: 'webhook' }>
type EmailRow = Extract<OutputWebhookConfig, { type: 'email' }>
type SlackRow = Extract<OutputWebhookConfig, { type: 'slack' }>

const NEW_BY_TYPE: Record<OutputWebhookConfig['type'], OutputWebhookConfig> = {
  webhook: { type: 'webhook', url: '', enabled: true, secret: '' },
  email: { type: 'email', to: '', subject: '', enabled: true },
  slack: { type: 'slack', webhookUrl: '', enabled: true },
}

export function TeamOutputsPanel({
  teamId,
  initialWebhooks,
  latestDispatches,
}: {
  teamId: string
  initialWebhooks: OutputWebhookConfig[]
  latestDispatches?: DispatchRecord[] | null
}) {
  const [rows, setRows] = useState<OutputWebhookConfig[]>(initialWebhooks ?? [])
  const [saving, setSaving] = useState(false)

  function update(i: number, patch: Partial<OutputWebhookConfig>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? ({ ...r, ...patch } as OutputWebhookConfig) : r)))
  }
  function add(type: OutputWebhookConfig['type']) {
    setRows((prev) => [...prev, { ...NEW_BY_TYPE[type] }])
  }
  function remove(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: { outputWebhooks: rows } }),
      })
      const j = await res.json()
      if (!j.success) throw new Error(j.error || 'Falha ao salvar')
      toast.success('Outputs salvos')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Outputs / Webhooks</h3>
        <div className="flex gap-2">
          <button onClick={() => add('webhook')} className="text-xs rounded border border-white/15 px-2 py-1 hover:bg-white/10">+ Webhook</button>
          <button onClick={() => add('email')} className="text-xs rounded border border-white/15 px-2 py-1 hover:bg-white/10">+ Email</button>
          <button onClick={() => add('slack')} className="text-xs rounded border border-white/15 px-2 py-1 hover:bg-white/10">+ Slack</button>
        </div>
      </div>

      {rows.length === 0 && <p className="text-xs text-white/50">Nenhum output configurado. Disparados quando um run termina com sucesso.</p>}

      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2 rounded border border-white/10 p-2">
          <input type="checkbox" checked={row.enabled} onChange={(e) => update(i, { enabled: e.target.checked })} title="Ativo" />
          <span className="text-xs uppercase text-white/60 w-16">{row.type}</span>
          {row.type === 'webhook' && (
            <>
              <input className="flex-1 bg-transparent border border-white/10 rounded px-2 py-1 text-xs" placeholder="https://..." value={(row as WebhookRow).url} onChange={(e) => update(i, { url: e.target.value })} />
              <input className="w-40 bg-transparent border border-white/10 rounded px-2 py-1 text-xs" placeholder="secret (opcional)" value={(row as WebhookRow).secret ?? ''} onChange={(e) => update(i, { secret: e.target.value })} />
            </>
          )}
          {row.type === 'email' && (
            <>
              <input className="flex-1 bg-transparent border border-white/10 rounded px-2 py-1 text-xs" placeholder="destino@email.com" value={(row as EmailRow).to} onChange={(e) => update(i, { to: e.target.value })} />
              <input className="w-48 bg-transparent border border-white/10 rounded px-2 py-1 text-xs" placeholder="assunto (opcional)" value={(row as EmailRow).subject ?? ''} onChange={(e) => update(i, { subject: e.target.value })} />
            </>
          )}
          {row.type === 'slack' && (
            <input className="flex-1 bg-transparent border border-white/10 rounded px-2 py-1 text-xs" placeholder="https://hooks.slack.com/services/..." value={(row as SlackRow).webhookUrl} onChange={(e) => update(i, { webhookUrl: e.target.value })} />
          )}
          <button onClick={() => remove(i)} className="text-xs text-red-400 hover:text-red-300 px-2">remover</button>
        </div>
      ))}

      <div className="flex items-center justify-between pt-1">
        <button onClick={save} disabled={saving} className="text-xs rounded bg-white/15 px-3 py-1.5 hover:bg-white/25 disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar outputs'}</button>
        {latestDispatches && latestDispatches.length > 0 && (
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[10px] uppercase text-white/40">Última entrega</span>
            {latestDispatches.map((d, i) => (
              <span key={i} className={`text-xs ${d.status === 'sent' ? 'text-emerald-400' : 'text-red-400'}`}>
                {d.status === 'sent' ? '✓' : '✗'} {d.type} {d.destination ? `→ ${d.destination}` : ''}{d.error ? ` (${d.error})` : ''}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
