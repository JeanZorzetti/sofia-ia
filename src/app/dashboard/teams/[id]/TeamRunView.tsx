// src/app/dashboard/teams/[id]/TeamRunView.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  ArrowLeft, Crown, Hammer, ShieldCheck, Cpu, Send, Loader2, Rocket,
  ClipboardList, MessageSquare, CheckCircle2, XCircle, History, Sparkles,
  Clock, Coins, Repeat, Network,
} from 'lucide-react'

// ReactFlow must be client-only (no SSR) to avoid hydration/measure issues.
const TeamGraph = dynamic(() => import('./TeamGraph'), { ssr: false })

interface Member { id: string; role: string; model: string | null; effort: string | null; agent: { id: string; name: string } }
interface Team { id: string; name: string; members: Member[] }
interface RunLite { id: string; status: string; mission: string; createdAt: string }
interface BoardTask { id: string; title: string; status: string; assigneeId: string | null; retryCount: number; reviewNote: string | null; resultPreview: string }
interface Msg { id: string; fromMemberId: string | null; toMemberId: string | null; kind: string; summary: string | null; content: string; taskId: string | null }
interface Metrics { turnsUsed: number | null; tokensUsed: number | null; estimatedCost: number | null; durationMs: number | null }

const COLUMNS: { key: string; label: string; dot: string }[] = [
  { key: 'todo', label: 'A fazer', dot: 'bg-white/30' },
  { key: 'doing', label: 'Fazendo', dot: 'bg-blue-400' },
  { key: 'review', label: 'Review', dot: 'bg-purple-400' },
  { key: 'done', label: 'Concluído', dot: 'bg-emerald-400' },
]

const ROLE_ICON: Record<string, typeof Crown> = { lead: Crown, worker: Hammer, reviewer: ShieldCheck }
const ROLE_CHIP: Record<string, string> = {
  lead: 'bg-amber-500/20 text-amber-400',
  worker: 'bg-blue-500/20 text-blue-400',
  reviewer: 'bg-purple-500/20 text-purple-400',
}

const NON_TERMINAL = new Set(['pending', 'running'])
const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-white/10 text-white/60',
  running: 'bg-blue-500/20 text-blue-400',
  completed: 'bg-emerald-500/20 text-emerald-400',
  failed: 'bg-red-500/20 text-red-400',
  rate_limited: 'bg-amber-500/20 text-amber-400',
  cancelled: 'bg-white/10 text-white/50',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'Na fila', running: 'Executando', completed: 'Concluído',
  failed: 'Falhou', rate_limited: 'Rate limit', cancelled: 'Cancelado',
}

export default function TeamRunView({ teamId }: { teamId: string }) {
  const [team, setTeam] = useState<Team | null>(null)
  const [history, setHistory] = useState<RunLite[]>([])
  const [mission, setMission] = useState('')
  const [runId, setRunId] = useState<string | null>(null)
  const [tasks, setTasks] = useState<BoardTask[]>([])
  const [messages, setMessages] = useState<Msg[]>([])
  const [status, setStatus] = useState<string>('')
  const [output, setOutput] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<Metrics>({ turnsUsed: null, tokensUsed: null, estimatedCost: null, durationMs: null })
  const [running, setRunning] = useState(false)
  const esRef = useRef<EventSource | null>(null)
  const feedRef = useRef<HTMLDivElement | null>(null)

  async function loadTeam() {
    const r = await fetch(`/api/teams/${teamId}`)
    const j = await r.json()
    if (j.success) { setTeam(j.data); setHistory(j.data.runs ?? []) }
  }

  useEffect(() => {
    loadTeam()
    return () => { esRef.current?.close() }
  }, [teamId])

  // Auto-scroll the activity feed as messages arrive.
  useEffect(() => { feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight }) }, [messages])

  function memberOf(id: string | null): Member | null {
    if (!id) return null
    return team?.members.find(m => m.id === id) ?? null
  }
  function nameFor(id: string | null): string {
    return memberOf(id)?.agent.name ?? (id ? '?' : '—')
  }

  function openStream(rid: string, assumeRunning: boolean) {
    esRef.current?.close()
    setTasks([]); setMessages([]); setOutput(null)
    setMetrics({ turnsUsed: null, tokensUsed: null, estimatedCost: null, durationMs: null })
    setRunning(assumeRunning)
    const es = new EventSource(`/api/teams/${teamId}/runs/${rid}/stream`)
    esRef.current = es
    es.addEventListener('board', e => setTasks(JSON.parse((e as MessageEvent).data).tasks))
    es.addEventListener('message', e => setMessages(prev => [...prev, JSON.parse((e as MessageEvent).data)]))
    es.addEventListener('status', e => {
      const d = JSON.parse((e as MessageEvent).data)
      setStatus(d.status); setOutput(d.output)
      setMetrics({ turnsUsed: d.turnsUsed, tokensUsed: d.tokensUsed, estimatedCost: d.estimatedCost, durationMs: d.durationMs })
    })
    es.addEventListener('done', () => { es.close(); setRunning(false); loadTeam() })
    es.addEventListener('error', () => { es.close(); setRunning(false) })
  }

  async function startRun() {
    if (!mission.trim()) return
    setRunning(true); setStatus('pending')
    try {
      const res = await fetch(`/api/teams/${teamId}/run`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mission }),
      })
      const json = await res.json()
      if (json.success && json.data?.runId) {
        setRunId(json.data.runId)
        openStream(json.data.runId, true)
      } else {
        setStatus(json.error ?? 'failed'); setRunning(false)
      }
    } catch {
      setStatus('failed'); setRunning(false)
    }
  }

  function selectRun(run: RunLite) {
    setRunId(run.id)
    setStatus(run.status)
    setMission(run.mission)
    openStream(run.id, NON_TERMINAL.has(run.status))
  }

  const done = tasks.filter(t => t.status === 'done').length
  const total = tasks.length
  const pct = total ? Math.round((done / total) * 100) : (running ? 8 : 0)

  // The "active" member drives the graph highlight: whoever holds a doing task,
  // else the latest message sender — only while the run is live.
  const doingTask = tasks.find(t => t.status === 'doing')
  const lastMsg = messages[messages.length - 1]
  const activeId = running ? (doingTask?.assigneeId ?? lastMsg?.fromMemberId ?? null) : null

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-3">
        <Link href="/dashboard/teams" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Times
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-white/10">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">{team?.name ?? 'Time'}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {team?.members.map(m => {
            const Icon = ROLE_ICON[m.role] ?? Hammer
            return (
              <span key={m.id} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${ROLE_CHIP[m.role] ?? 'bg-white/10 text-white/60'}`}>
                <Icon className="h-3 w-3" />
                {m.agent.name}
                {m.model && (
                  <span className="inline-flex items-center gap-0.5 text-white/50">
                    · <Cpu className="h-2.5 w-2.5" /> {m.model.split('/').pop()}
                  </span>
                )}
                {m.effort && <span className="text-white/40">· {m.effort}</span>}
              </span>
            )
          })}
        </div>
      </div>

      {/* Mission composer */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
        <textarea
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-y"
          rows={3}
          placeholder="Descreva a missão do time…"
          value={mission}
          onChange={e => setMission(e.target.value)}
          disabled={running}
        />
        <div className="flex items-center gap-3 flex-wrap">
          <button
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
            disabled={running || !mission.trim()}
            onClick={startRun}
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {running ? 'Executando…' : 'Disparar missão'}
          </button>
          {status && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_BADGE[status] ?? 'bg-white/10 text-white/60'}`}>
              {STATUS_LABEL[status] ?? status}
            </span>
          )}
          <div className="flex items-center gap-3 ml-auto text-xs text-white/40">
            {metrics.turnsUsed != null && <span className="inline-flex items-center gap-1"><Repeat className="h-3 w-3" />{metrics.turnsUsed} turnos</span>}
            {metrics.tokensUsed != null && <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3" />{metrics.tokensUsed.toLocaleString()} tok</span>}
            {metrics.estimatedCost != null && <span className="inline-flex items-center gap-1"><Coins className="h-3 w-3" />${metrics.estimatedCost.toFixed(4)}</span>}
            {metrics.durationMs != null && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{(metrics.durationMs / 1000).toFixed(1)}s</span>}
          </div>
        </div>
        {(running || total > 0) && (
          <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${running ? 'bg-blue-500' : 'bg-emerald-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => col.key === 'done' ? (t.status === 'done' || t.status === 'rejected') : t.status === col.key)
          return (
            <div key={col.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 min-h-[140px]">
              <div className="flex items-center gap-2 mb-3">
                <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                <span className="text-xs font-semibold uppercase tracking-wider text-white/50">{col.label}</span>
                <span className="text-xs text-white/30 ml-auto">{colTasks.length}</span>
              </div>
              <div className="space-y-2">
                {colTasks.map(t => {
                  const rejected = t.status === 'rejected'
                  return (
                    <div key={t.id} className={`rounded-lg border p-2.5 text-sm ${rejected ? 'border-red-500/30 bg-red-500/5' : 'border-white/10 bg-white/5'}`}>
                      <div className="font-medium text-white/90 text-[13px] leading-snug">{t.title}</div>
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-white/40">
                        <span>{nameFor(t.assigneeId)}</span>
                        {t.retryCount > 0 && <span className="text-amber-400/70">retry {t.retryCount}</span>}
                        {rejected && <span className="inline-flex items-center gap-0.5 text-red-400"><XCircle className="h-3 w-3" />rejeitado</span>}
                      </div>
                      {t.reviewNote && <div className="mt-1.5 text-[11px] text-amber-400/80 border-l-2 border-amber-400/40 pl-2">↩ {t.reviewNote}</div>}
                      {t.resultPreview && t.status === 'done' && (
                        <div className="mt-1.5 text-[11px] text-white/40 line-clamp-2">{t.resultPreview}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Activity feed + history */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="font-semibold text-white text-sm mb-3 flex items-center gap-2"><MessageSquare className="h-4 w-4 text-white/40" /> Atividade do time</h2>
          <div ref={feedRef} className="space-y-2 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
            {messages.length === 0 && <p className="text-white/30 text-sm">Sem atividade ainda. Dispare uma missão para ver os agentes coordenarem.</p>}
            {messages.map(m => {
              const Icon = m.kind === 'assignment' ? ClipboardList : m.kind === 'review' ? CheckCircle2 : MessageSquare
              const tint = m.kind === 'assignment' ? 'text-blue-400 border-blue-400/30'
                : m.kind === 'review' ? 'text-purple-400 border-purple-400/30'
                : 'text-white/50 border-white/10'
              return (
                <div key={m.id} className={`rounded-lg border-l-2 bg-white/[0.03] px-3 py-2 ${tint.split(' ')[1]}`}>
                  <div className="flex items-center gap-1.5 text-[11px] text-white/40">
                    <Icon className={`h-3 w-3 ${tint.split(' ')[0]}`} />
                    <span className="text-white/60">{nameFor(m.fromMemberId)}</span>
                    <span>→ {nameFor(m.toMemberId)}</span>
                    <span className="ml-auto uppercase tracking-wider">{m.kind}</span>
                  </div>
                  <div className="text-[13px] text-white/80 mt-1 whitespace-pre-wrap break-words">{m.summary || m.content}</div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-4">
          {team && team.members.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h2 className="font-semibold text-white text-sm mb-2 flex items-center gap-2"><Network className="h-4 w-4 text-white/40" /> Topologia</h2>
              <TeamGraph members={team.members.map(m => ({ id: m.id, role: m.role, name: m.agent.name }))} activeId={activeId} />
            </div>
          )}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="font-semibold text-white text-sm mb-3 flex items-center gap-2"><History className="h-4 w-4 text-white/40" /> Execuções</h2>
          <div className="space-y-2 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
            {history.length === 0 && <p className="text-white/30 text-sm">Nenhuma execução ainda.</p>}
            {history.map(r => (
              <button
                key={r.id}
                onClick={() => selectRun(r)}
                className={`w-full text-left rounded-lg border p-2.5 transition-colors ${r.id === runId ? 'border-blue-500/40 bg-blue-500/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_BADGE[r.status] ?? 'bg-white/10 text-white/60'}`}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                  <span className="text-[10px] text-white/30">{new Date(r.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="text-[12px] text-white/70 mt-1 line-clamp-2">{r.mission}</div>
              </button>
            ))}
          </div>
          </div>
        </div>
      </div>

      {/* Final delivery */}
      {output && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
          <h2 className="font-semibold text-white text-sm mb-3 flex items-center gap-2"><Rocket className="h-4 w-4 text-emerald-400" /> Entrega final</h2>
          <pre className="whitespace-pre-wrap break-words text-sm text-white/80 font-sans">{output}</pre>
        </div>
      )}
    </div>
  )
}
