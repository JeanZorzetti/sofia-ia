// src/app/dashboard/teams/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Plus, Loader2, ArrowRight, Pencil, Trash2, X, GitBranch } from 'lucide-react'
import RosterEditor, {
  INHERIT, rosterToMembers, type AgentLite, type ModelOption, type RosterRow,
} from './RosterEditor'

interface TeamLite { id: string; name: string; description: string | null; _count: { runs: number } }

// Merge optional repo binding (Sub-projeto C — C1) into a team's config Json,
// preserving any other keys (e.g. maxTurns/retryCap) and dropping empty values.
function mergeRepoConfig(base: Record<string, unknown>, repoUrl: string, defaultBranch: string): Record<string, unknown> {
  const cfg = { ...base }
  const r = repoUrl.trim(); const b = defaultBranch.trim()
  if (r) cfg.repoUrl = r; else delete cfg.repoUrl
  if (b) cfg.defaultBranch = b; else delete cfg.defaultBranch
  return cfg
}

// Optional repo binding fields, shared by the create form and the edit modal.
function RepoBindingFields({ repoUrl, defaultBranch, onRepoUrl, onDefaultBranch }: {
  repoUrl: string; defaultBranch: string; onRepoUrl: (v: string) => void; onDefaultBranch: (v: string) => void
}) {
  const inputCls = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30'
  return (
    <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <p className="text-xs text-white/40 uppercase tracking-wider flex items-center gap-1.5">
        <GitBranch className="h-3.5 w-3.5" /> Repositório · code-runs (opcional)
      </p>
      <input className={inputCls} placeholder="github.com/owner/repo" value={repoUrl} onChange={e => onRepoUrl(e.target.value)} />
      <input className={inputCls} placeholder="Branch base (default: main)" value={defaultBranch} onChange={e => onDefaultBranch(e.target.value)} />
      <p className="text-[11px] text-white/30">
        Se preenchido, missões em modo <span className="text-white/50">Código</span> clonam este repo e abrem um Pull Request com as mudanças. O token do GitHub fica só no servidor (worker), nunca exposto aos agentes.
      </p>
    </div>
  )
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamLite[]>([])
  const [agents, setAgents] = useState<AgentLite[]>([])
  const [models, setModels] = useState<ModelOption[]>([])
  const [loading, setLoading] = useState(true)

  // create
  const [name, setName] = useState('')
  const [roster, setRoster] = useState<RosterRow[]>([])
  const [repoUrl, setRepoUrl] = useState('')
  const [defaultBranch, setDefaultBranch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // edit modal
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editRoster, setEditRoster] = useState<RosterRow[]>([])
  const [editConfig, setEditConfig] = useState<Record<string, unknown>>({})
  const [editRepoUrl, setEditRepoUrl] = useState('')
  const [editDefaultBranch, setEditDefaultBranch] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function load() {
    const [tRes, aRes, mRes] = await Promise.all([
      fetch('/api/teams'), fetch('/api/agents'), fetch('/api/models'),
    ])
    const t = await tRes.json(); const a = await aRes.json(); const m = await mRes.json()
    if (t.success) setTeams(t.data)
    setAgents(Array.isArray(a) ? a : a.data ?? [])
    if (m.success) setModels(m.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function createTeam() {
    setError(null); setSaving(true)
    try {
      const res = await fetch('/api/teams', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, members: rosterToMembers(roster), config: mergeRepoConfig({}, repoUrl, defaultBranch) }),
      })
      const json = await res.json()
      if (!json.success) { setError(json.error); return }
      setName(''); setRoster([]); setRepoUrl(''); setDefaultBranch('')
      await load()
    } catch {
      setError('Erro de conexão')
    } finally { setSaving(false) }
  }

  async function openEdit(teamId: string) {
    setEditId(teamId); setEditError(null); setEditName(''); setEditRoster([])
    setEditConfig({}); setEditRepoUrl(''); setEditDefaultBranch('')
    const res = await fetch(`/api/teams/${teamId}`)
    const json = await res.json()
    if (json.success) {
      setEditName(json.data.name)
      setEditRoster((json.data.members ?? []).map((m: { agentId: string; role: RosterRow['role']; model: string | null; effort: string | null }) => ({
        agentId: m.agentId, role: m.role, model: m.model ?? INHERIT, effort: m.effort ?? INHERIT,
      })))
      const cfg = (json.data.config && typeof json.data.config === 'object' ? json.data.config : {}) as Record<string, unknown>
      setEditConfig(cfg)
      setEditRepoUrl(typeof cfg.repoUrl === 'string' ? cfg.repoUrl : '')
      setEditDefaultBranch(typeof cfg.defaultBranch === 'string' ? cfg.defaultBranch : '')
    }
  }

  async function saveEdit() {
    if (!editId) return
    setEditError(null); setEditSaving(true)
    try {
      const res = await fetch(`/api/teams/${editId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName, members: rosterToMembers(editRoster),
          config: mergeRepoConfig(editConfig, editRepoUrl, editDefaultBranch),
        }),
      })
      const json = await res.json()
      if (!json.success) { setEditError(json.error); return }
      setEditId(null)
      await load()
    } catch {
      setEditError('Erro de conexão')
    } finally { setEditSaving(false) }
  }

  async function deleteTeam(teamId: string, teamName: string) {
    if (!confirm(`Arquivar o time "${teamName}"? Ele some da lista mas o histórico de execuções é mantido.`)) return
    setDeletingId(teamId)
    try {
      await fetch(`/api/teams/${teamId}`, { method: 'DELETE' })
      await load()
    } finally { setDeletingId(null) }
  }

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
          {loading
            ? <p className="text-white/40 text-sm flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando agentes…</p>
            : <RosterEditor agents={agents} models={models} value={roster} onChange={setRoster} />}
          <p className="text-[11px] text-white/30">
            Effort só afeta modelos de raciocínio (Claude/OpenRouter). Disponibilidade dos modelos em <Link href="/dashboard/models" className="text-blue-400 hover:underline">Modelos</Link>.
          </p>
        </div>
        <RepoBindingFields repoUrl={repoUrl} defaultBranch={defaultBranch} onRepoUrl={setRepoUrl} onDefaultBranch={setDefaultBranch} />
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
            <div key={t.id} className="group rounded-xl border border-white/10 bg-white/5 p-4 hover:border-white/20 transition-colors flex flex-col">
              <Link href={`/dashboard/teams/${t.id}`} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-white truncate">{t.name}</div>
                  {t.description && <p className="text-white/50 text-sm mt-0.5 line-clamp-2">{t.description}</p>}
                </div>
                <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-white/70 transition-colors flex-shrink-0" />
              </Link>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-white/40">{t._count.runs} {t._count.runs === 1 ? 'execução' : 'execuções'}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(t.id)}
                    className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                    title="Editar time"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deleteTeam(t.id, t.name)}
                    disabled={deletingId === t.id}
                    className="p-1.5 rounded-md text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    title="Arquivar time"
                  >
                    {deletingId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit modal */}
      {editId && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto" onClick={() => setEditId(null)}>
          <div
            className="mt-12 w-full max-w-2xl rounded-xl border border-white/10 bg-[#0a0a0b] p-5 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white flex items-center gap-2"><Pencil className="h-4 w-4 text-blue-400" /> Editar time</h2>
              <button onClick={() => setEditId(null)} className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/10"><X className="h-4 w-4" /></button>
            </div>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
              placeholder="Nome do time"
              value={editName}
              onChange={e => setEditName(e.target.value)}
            />
            <RosterEditor agents={agents} models={models} value={editRoster} onChange={setEditRoster} />
            <RepoBindingFields repoUrl={editRepoUrl} defaultBranch={editDefaultBranch} onRepoUrl={setEditRepoUrl} onDefaultBranch={setEditDefaultBranch} />
            {editError && <p className="text-red-400 text-sm">{editError}</p>}
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setEditId(null)} className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors">Cancelar</button>
              <button
                onClick={saveEdit}
                disabled={editSaving || !editName.trim() || editRoster.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
