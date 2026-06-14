// src/app/dashboard/teams/[id]/TeamRunView.tsx
'use client'

import { useEffect, useRef, useState } from 'react'

interface Member { id: string; role: string; agent: { id: string; name: string } }
interface Team { id: string; name: string; members: Member[] }
interface BoardTask { id: string; title: string; status: string; assigneeId: string | null; retryCount: number; reviewNote: string | null; resultPreview: string }
interface Msg { id: string; fromMemberId: string | null; toMemberId: string | null; kind: string; summary: string | null; content: string }

const COLUMNS: { key: string; label: string }[] = [
  { key: 'todo', label: 'A fazer' },
  { key: 'doing', label: 'Fazendo' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Concluído' },
]

export default function TeamRunView({ teamId }: { teamId: string }) {
  const [team, setTeam] = useState<Team | null>(null)
  const [mission, setMission] = useState('')
  const [runId, setRunId] = useState<string | null>(null)
  const [tasks, setTasks] = useState<BoardTask[]>([])
  const [messages, setMessages] = useState<Msg[]>([])
  const [status, setStatus] = useState<string>('')
  const [output, setOutput] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    fetch(`/api/teams/${teamId}`).then(r => r.json()).then(j => { if (j.success) setTeam(j.data) })
    return () => { esRef.current?.close() }
  }, [teamId])

  function nameFor(memberId: string | null): string {
    if (!memberId) return '—'
    return team?.members.find(m => m.id === memberId)?.agent.name ?? '?'
  }

  function openStream(rid: string) {
    esRef.current?.close()
    const es = new EventSource(`/api/teams/${teamId}/runs/${rid}/stream`)
    esRef.current = es
    es.addEventListener('board', e => setTasks(JSON.parse((e as MessageEvent).data).tasks))
    es.addEventListener('message', e => setMessages(prev => [...prev, JSON.parse((e as MessageEvent).data)]))
    es.addEventListener('status', e => {
      const d = JSON.parse((e as MessageEvent).data)
      setStatus(d.status); setOutput(d.output)
    })
    es.addEventListener('done', () => { es.close(); setRunning(false) })
    es.addEventListener('error', () => { es.close(); setRunning(false) })
  }

  async function startRun() {
    if (!mission.trim()) return
    setRunning(true); setTasks([]); setMessages([]); setOutput(null); setStatus('pending')
    // The POST kicks off the run in the background and returns { runId } immediately.
    // Progress arrives via the SSE stream; `running` stays true until 'done'/'error'.
    try {
      const res = await fetch(`/api/teams/${teamId}/run`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mission }),
      })
      const json = await res.json()
      if (json.success && json.data?.runId) {
        setRunId(json.data.runId)
        openStream(json.data.runId)
      } else {
        setStatus(json.error ?? 'failed')
        setRunning(false)
      }
    } catch {
      setStatus('failed')
      setRunning(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{team?.name ?? 'Time'}</h1>
      <div className="text-sm text-gray-500">
        {team?.members.map(m => `${m.agent.name} (${m.role})`).join(' · ')}
      </div>

      <section className="space-y-2">
        <textarea
          className="border rounded w-full px-3 py-2"
          rows={3}
          placeholder="Descreva a missão do time…"
          value={mission}
          onChange={e => setMission(e.target.value)}
        />
        <button
          className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
          disabled={running || !mission.trim()}
          onClick={startRun}
        >
          {running ? 'Executando…' : 'Disparar missão'}
        </button>
        {status && <span className="ml-3 text-sm text-gray-600">Status: {status}</span>}
      </section>

      <section className="grid grid-cols-4 gap-3">
        {COLUMNS.map(col => (
          <div key={col.key} className="border rounded-lg p-2 min-h-[120px]">
            <div className="text-xs font-semibold uppercase text-gray-500 mb-2">{col.label}</div>
            {tasks.filter(t => t.status === col.key).map(t => (
              <div key={t.id} className="border rounded p-2 mb-2 text-sm bg-white">
                <div className="font-medium">{t.title}</div>
                <div className="text-xs text-gray-500">{nameFor(t.assigneeId)}{t.retryCount > 0 ? ` · retry ${t.retryCount}` : ''}</div>
                {t.reviewNote && <div className="text-xs text-amber-600 mt-1">↩ {t.reviewNote}</div>}
              </div>
            ))}
          </div>
        ))}
      </section>

      <section>
        <h2 className="font-semibold mb-2">Mensagens</h2>
        <div className="space-y-1 max-h-64 overflow-auto text-sm">
          {messages.map(m => (
            <div key={m.id} className="border-b py-1">
              <span className="text-gray-500">{nameFor(m.fromMemberId)} → {nameFor(m.toMemberId)} [{m.kind}]: </span>
              {m.summary ?? m.content}
            </div>
          ))}
        </div>
      </section>

      {output && (
        <section>
          <h2 className="font-semibold mb-2">Entrega final</h2>
          <pre className="whitespace-pre-wrap border rounded p-3 text-sm bg-gray-50">{output}</pre>
        </section>
      )}
    </div>
  )
}
