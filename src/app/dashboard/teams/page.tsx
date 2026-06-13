// src/app/dashboard/teams/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface AgentLite { id: string; name: string }
interface TeamLite { id: string; name: string; description: string | null; _count: { runs: number } }
type Role = 'lead' | 'worker' | 'reviewer'
interface RosterRow { agentId: string; role: Role }

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamLite[]>([])
  const [agents, setAgents] = useState<AgentLite[]>([])
  const [name, setName] = useState('')
  const [roster, setRoster] = useState<RosterRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const [tRes, aRes] = await Promise.all([fetch('/api/teams'), fetch('/api/agents')])
    const t = await tRes.json()
    const a = await aRes.json()
    if (t.success) setTeams(t.data)
    // /api/agents may return {data:[...]} or an array; normalize.
    const agentList: AgentLite[] = Array.isArray(a) ? a : a.data ?? []
    setAgents(agentList)
  }

  useEffect(() => { load() }, [])

  function toggleAgent(agentId: string) {
    setRoster(prev =>
      prev.some(r => r.agentId === agentId)
        ? prev.filter(r => r.agentId !== agentId)
        : [...prev, { agentId, role: prev.length === 0 ? 'lead' : 'worker' }],
    )
  }
  function setRole(agentId: string, role: Role) {
    setRoster(prev => prev.map(r => (r.agentId === agentId ? { ...r, role } : r)))
  }

  async function createTeam() {
    setError(null); setSaving(true)
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, members: roster }),
      })
      const json = await res.json()
      if (!json.success) { setError(json.error); return }
      setName(''); setRoster([])
      await load()
    } finally { setSaving(false) }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Times</h1>

      <section className="border rounded-lg p-4 space-y-3">
        <h2 className="font-semibold">Novo time</h2>
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Nome do time"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <div className="space-y-2">
          <p className="text-sm text-gray-500">Selecione agentes e atribua papéis (1 Lead, ≥1 Worker, Reviewer opcional):</p>
          {agents.map(a => {
            const row = roster.find(r => r.agentId === a.id)
            return (
              <div key={a.id} className="flex items-center gap-3">
                <label className="flex items-center gap-2 flex-1">
                  <input type="checkbox" checked={!!row} onChange={() => toggleAgent(a.id)} />
                  {a.name}
                </label>
                {row && (
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={row.role}
                    onChange={e => setRole(a.id, e.target.value as Role)}
                  >
                    <option value="lead">Lead</option>
                    <option value="worker">Worker</option>
                    <option value="reviewer">Reviewer</option>
                  </select>
                )}
              </div>
            )
          })}
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
          disabled={saving || !name.trim() || roster.length === 0}
          onClick={createTeam}
        >
          {saving ? 'Criando…' : 'Criar time'}
        </button>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Seus times</h2>
        {teams.length === 0 && <p className="text-gray-500 text-sm">Nenhum time ainda.</p>}
        {teams.map(t => (
          <Link key={t.id} href={`/dashboard/teams/${t.id}`} className="block border rounded-lg p-4 hover:bg-gray-50">
            <div className="font-medium">{t.name}</div>
            <div className="text-sm text-gray-500">{t._count.runs} runs</div>
          </Link>
        ))}
      </section>
    </div>
  )
}
