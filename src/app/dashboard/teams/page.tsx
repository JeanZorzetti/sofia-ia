// src/app/dashboard/teams/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Plus, Crown, Hammer, ShieldCheck, Loader2, ArrowRight, Cpu } from 'lucide-react'
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface AgentLite { id: string; name: string }
interface TeamLite { id: string; name: string; description: string | null; _count: { runs: number } }
interface ModelOption { id: string; name: string; provider: string }
type Role = 'lead' | 'worker' | 'reviewer'
interface RosterRow { agentId: string; role: Role; model: string; effort: string }

const INHERIT = 'inherit'
const EFFORTS = [
  { value: INHERIT, label: 'Effort: auto' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const ROLE_META: Record<Role, { label: string; icon: typeof Crown; chip: string }> = {
  lead: { label: 'Lead', icon: Crown, chip: 'bg-amber-500/20 text-amber-400' },
  worker: { label: 'Worker', icon: Hammer, chip: 'bg-blue-500/20 text-blue-400' },
  reviewer: { label: 'Reviewer', icon: ShieldCheck, chip: 'bg-purple-500/20 text-purple-400' },
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamLite[]>([])
  const [agents, setAgents] = useState<AgentLite[]>([])
  const [models, setModels] = useState<ModelOption[]>([])
  const [name, setName] = useState('')
  const [roster, setRoster] = useState<RosterRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  async function load() {
    const [tRes, aRes, mRes] = await Promise.all([
      fetch('/api/teams'), fetch('/api/agents'), fetch('/api/models'),
    ])
    const t = await tRes.json()
    const a = await aRes.json()
    const m = await mRes.json()
    if (t.success) setTeams(t.data)
    const agentList: AgentLite[] = Array.isArray(a) ? a : a.data ?? []
    setAgents(agentList)
    if (m.success) setModels(m.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const providers = Array.from(new Set(models.map(m => m.provider)))

  function toggleAgent(agentId: string) {
    setRoster(prev =>
      prev.some(r => r.agentId === agentId)
        ? prev.filter(r => r.agentId !== agentId)
        : [...prev, { agentId, role: prev.length === 0 ? 'lead' : 'worker', model: INHERIT, effort: INHERIT }],
    )
  }
  const patchRow = (agentId: string, patch: Partial<RosterRow>) =>
    setRoster(prev => prev.map(r => (r.agentId === agentId ? { ...r, ...patch } : r)))

  async function createTeam() {
    setError(null); setSaving(true)
    try {
      const members = roster.map((r, i) => ({
        agentId: r.agentId,
        role: r.role,
        model: r.model === INHERIT ? null : r.model,
        effort: r.effort === INHERIT ? null : r.effort,
        position: i,
      }))
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, members }),
      })
      const json = await res.json()
      if (!json.success) { setError(json.error); return }
      setName(''); setRoster([])
      await load()
    } catch {
      setError('Erro de conexão')
    } finally { setSaving(false) }
  }

  const triggerCls = 'h-8 bg-white/5 border-white/10 text-white text-xs'
  const contentCls = 'bg-[#0a0a0b] border-white/10 text-white'

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-white/10">
          <Users className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Times</h1>
          <p className="text-white/60 text-sm">Squads de agentes que coordenam, executam e revisam missões juntos.</p>
        </div>
      </div>

      {/* Novo time */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-blue-400" />
          <h2 className="font-semibold text-white">Novo time</h2>
        </div>

        <input
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
          placeholder="Nome do time"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <div className="space-y-2">
          <p className="text-xs text-white/40 uppercase tracking-wider">
            Selecione agentes e configure papel · modelo · effort (1 Lead, ≥1 Worker, Reviewer opcional)
          </p>

          {loading && <p className="text-white/40 text-sm flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando agentes…</p>}
          {!loading && agents.length === 0 && <p className="text-white/40 text-sm">Nenhum agente disponível. Crie um agente primeiro.</p>}

          {agents.map(a => {
            const row = roster.find(r => r.agentId === a.id)
            const selected = !!row
            return (
              <div
                key={a.id}
                className={`rounded-lg border p-3 transition-colors ${selected ? 'border-white/20 bg-white/[0.07]' : 'border-white/10 bg-white/[0.02]'}`}
              >
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-blue-500"
                    checked={selected}
                    onChange={() => toggleAgent(a.id)}
                  />
                  <span className="text-sm text-white font-medium flex-1">{a.name}</span>
                  {row && (
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${ROLE_META[row.role].chip}`}>
                      {ROLE_META[row.role].label}
                    </span>
                  )}
                </label>

                {row && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 pl-7">
                    {/* Role */}
                    <Select value={row.role} onValueChange={v => patchRow(a.id, { role: v as Role })}>
                      <SelectTrigger className={`${triggerCls} w-[120px]`}><SelectValue /></SelectTrigger>
                      <SelectContent className={contentCls}>
                        <SelectItem value="lead">Lead</SelectItem>
                        <SelectItem value="worker">Worker</SelectItem>
                        <SelectItem value="reviewer">Reviewer</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Model */}
                    <div className="flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5 text-white/30" />
                      <Select value={row.model} onValueChange={v => patchRow(a.id, { model: v })}>
                        <SelectTrigger className={`${triggerCls} w-[190px]`}><SelectValue /></SelectTrigger>
                        <SelectContent className={contentCls}>
                          <SelectItem value={INHERIT}>Herdar do agente</SelectItem>
                          {providers.map(prov => (
                            <SelectGroup key={prov}>
                              <SelectLabel className="text-white/40 text-[11px] uppercase tracking-wider">{prov}</SelectLabel>
                              {models.filter(m => m.provider === prov).map(m => (
                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Effort */}
                    <Select value={row.effort} onValueChange={v => patchRow(a.id, { effort: v })}>
                      <SelectTrigger className={`${triggerCls} w-[120px]`}><SelectValue /></SelectTrigger>
                      <SelectContent className={contentCls}>
                        {EFFORTS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )
          })}
          <p className="text-[11px] text-white/30">
            Effort só afeta modelos de raciocínio (Claude/OpenRouter); ignorado nos demais.
          </p>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
          disabled={saving || !name.trim() || roster.length === 0}
          onClick={createTeam}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {saving ? 'Criando…' : 'Criar time'}
        </button>
      </div>

      {/* Seus times */}
      <div className="space-y-3">
        <h2 className="font-semibold text-white">Seus times</h2>
        {!loading && teams.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
            <Users className="h-8 w-8 text-white/20 mx-auto mb-2" />
            <p className="text-white/40 text-sm">Nenhum time ainda. Crie o primeiro acima.</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {teams.map(t => (
            <Link
              key={t.id}
              href={`/dashboard/teams/${t.id}`}
              className="group rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/[0.08] hover:border-white/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-white truncate">{t.name}</div>
                  {t.description && <p className="text-white/50 text-sm mt-0.5 line-clamp-2">{t.description}</p>}
                </div>
                <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-white/70 transition-colors flex-shrink-0" />
              </div>
              <div className="mt-3 text-xs text-white/40">{t._count.runs} {t._count.runs === 1 ? 'execução' : 'execuções'}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
