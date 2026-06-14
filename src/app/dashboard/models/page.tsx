// src/app/dashboard/models/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Cpu, CheckCircle2, XCircle, HelpCircle, Loader2, Zap } from 'lucide-react'

type Status = 'available' | 'unavailable' | 'unknown'
interface ModelRow { id: string; name: string; provider: string; availability: Status; availabilityReason: string }
interface LiveResult { status: Status; reason: string; latencyMs: number }

const STATUS_META: Record<Status, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  available: { label: 'Disponível', cls: 'bg-emerald-500/20 text-emerald-400', Icon: CheckCircle2 },
  unavailable: { label: 'Indisponível', cls: 'bg-red-500/20 text-red-400', Icon: XCircle },
  unknown: { label: 'A verificar', cls: 'bg-amber-500/20 text-amber-400', Icon: HelpCircle },
}

export default function ModelsPage() {
  const [models, setModels] = useState<ModelRow[]>([])
  const [loading, setLoading] = useState(true)
  const [live, setLive] = useState<Record<string, LiveResult>>({})
  const [testing, setTesting] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch('/api/models').then(r => r.json()).then(j => {
      if (j.success) setModels(j.data ?? [])
      setLoading(false)
    })
  }, [])

  async function test(id: string) {
    setTesting(t => ({ ...t, [id]: true }))
    try {
      const r = await fetch('/api/models/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ modelId: id }),
      })
      const j = await r.json()
      if (j.success) setLive(prev => ({ ...prev, [id]: j.data }))
    } finally {
      setTesting(t => ({ ...t, [id]: false }))
    }
  }

  async function testAll() { await Promise.all(models.map(m => test(m.id))) }

  const providers = Array.from(new Set(models.map(m => m.provider)))
  const anyTesting = Object.values(testing).some(Boolean)

  function statusFor(m: ModelRow): { status: Status; reason: string; latencyMs?: number; live: boolean } {
    const l = live[m.id]
    if (l) return { status: l.status, reason: l.reason, latencyMs: l.latencyMs, live: true }
    return { status: m.availability, reason: m.availabilityReason, live: false }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-white/10">
            <Cpu className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Modelos</h1>
            <p className="text-white/60 text-sm">Verifique a disponibilidade antes de montar times — um modelo indisponível faz a missão falhar.</p>
          </div>
        </div>
        <button
          onClick={testAll}
          disabled={anyTesting || loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {anyTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          Testar todos
        </button>
      </div>

      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-white/80">
        Status <strong className="text-white">por configuração</strong> (chave/integração presente) é instantâneo. Modelos via CLI aparecem como <span className="text-amber-400">A verificar</span> — use <strong className="text-white">Testar</strong> para um ping ao vivo (API) ou confirme no host.
      </div>

      {loading && <p className="text-white/40 text-sm flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando modelos…</p>}

      {providers.map(prov => (
        <div key={prov} className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40">{prov}</h2>
          <div className="space-y-2">
            {models.filter(m => m.provider === prov).map(m => {
              const s = statusFor(m)
              const meta = STATUS_META[s.status]
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white font-medium truncate">{m.name}</div>
                    <div className="text-[11px] text-white/40 truncate font-mono">{m.id}</div>
                  </div>
                  <div className="text-right hidden sm:block max-w-[40%]">
                    <div className="text-[11px] text-white/40 truncate">{s.reason}{s.latencyMs != null ? ` · ${s.latencyMs}ms` : ''}</div>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full font-medium ${meta.cls}`}>
                    <meta.Icon className="h-3 w-3" />
                    {meta.label}{s.live ? ' (ao vivo)' : ''}
                  </span>
                  <button
                    onClick={() => test(m.id)}
                    disabled={!!testing[m.id]}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-50 transition-colors"
                  >
                    {testing[m.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                    Testar
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
