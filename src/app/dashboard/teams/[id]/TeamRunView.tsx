// src/app/dashboard/teams/[id]/TeamRunView.tsx
'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  ArrowLeft, Crown, Hammer, ShieldCheck, Cpu, Send, Loader2, Rocket,
  ClipboardList, MessageSquare, CheckCircle2, XCircle, History, Sparkles,
  Clock, Coins, Repeat, Network, Terminal as TerminalIcon, MessageCircle, Code2,
  GitBranch, GitPullRequest, ExternalLink, ChevronRight, ChevronDown,
  ArrowDownLeft, ArrowUpRight, Link2, Maximize2, ImagePlus, X, MonitorPlay,
} from 'lucide-react'

import { TeamOutputsPanel } from './TeamOutputsPanel'
import { TeamSchedulesPanel } from './TeamSchedulesPanel'
import { MemberActivityPanel } from './MemberActivityPanel'
import { buildRunRequest, type RunMode } from './run-request'
import type { GitMode } from '@/lib/git/git-delivery-plan'
import type { TaskHistoryEvent } from '@/lib/orchestration/team/task-history'
import { taskEventView, type TaskEventIconKey } from '@/lib/orchestration/team/task-event-view'
import { deriveTaskRelations } from '@/lib/orchestration/team/task-relations'

// ReactFlow must be client-only (no SSR) to avoid hydration/measure issues.
const TeamGraph = dynamic(() => import('./TeamGraph'), { ssr: false })
// S5 (V2.2): expanded "Visualizar" graph modal — also client-only (ReactFlow + DOM).
const TeamGraphView = dynamic(() => import('./TeamGraphView'), { ssr: false })
// xterm.js + diff2html are DOM-only → client-only (Sub-projeto C — C2).
const SandboxTerminal = dynamic(() => import('./SandboxTerminal'), { ssr: false })
const DiffViewer = dynamic(() => import('./DiffViewer'), { ssr: false })
// Preview mode (Lovable-style): live iframe of the run's dev server. Polls its own
// endpoint, so it's self-contained — client-only (iframe + DOM).
const PreviewPanel = dynamic(() => import('./PreviewPanel'), { ssr: false })

// S6: image attach constraints (mirror server caps in team-attachments.ts).
const ACCEPT_IMAGES = 'image/png,image/jpeg,image/webp,image/gif'
const MAX_IMAGES = 4

// S6: reusable image-attach bar (pick + chips with remove), shared by the mission and
// live-steering composers. Capped at MAX_IMAGES; the server validates type/size again.
function ImageAttachBar({ images, setImages, disabled }: { images: File[]; setImages: (f: File[]) => void; disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    setImages([...images, ...picked].slice(0, MAX_IMAGES))
    e.target.value = ''
  }
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input ref={inputRef} type="file" accept={ACCEPT_IMAGES} multiple className="hidden" onChange={onPick} disabled={disabled} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || images.length >= MAX_IMAGES}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-white/60 hover:text-white/90 disabled:opacity-40"
      >
        <ImagePlus className="h-3.5 w-3.5" /> Imagem
      </button>
      {images.map((f, i) => (
        <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 text-[11px] text-white/70 max-w-[180px]">
          <span className="truncate">{f.name}</span>
          <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))} className="text-white/40 hover:text-white/80 shrink-0">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  )
}

interface Member { id: string; role: string; model: string | null; effort: string | null; agent: { id: string; name: string } }
interface Team { id: string; name: string; members: Member[] }
interface RunLite { id: string; status: string; mission: string; createdAt: string }
interface BoardTask { id: string; title: string; status: string; assigneeId: string | null; retryCount: number; reviewNote: string | null; dependsOn: string[]; related: string[]; resultPreview: string; historyEvents: TaskHistoryEvent[] }
interface MsgAttachment { name: string; mime: string; key: string }
interface Msg { id: string; fromMemberId: string | null; toMemberId: string | null; kind: string; summary: string | null; content: string; taskId: string | null; attachments?: MsgAttachment[] }
interface Metrics { turnsUsed: number | null; tokensUsed: number | null; estimatedCost: number | null; durationMs: number | null }
interface MemberUsageEntry { memberId: string | null; tokens: number }
interface CommandRun { cmd: string; stdout: string; stderr: string; exitCode: number; ms: number }
interface TerminalTask { taskId: string; title: string; artifacts: { commands: CommandRun[] } }
interface ChangedFile { path: string; status: string; patch?: string; truncated?: boolean; binary?: boolean }
interface Delivery { repoUrl: string | null; branch: string | null; prUrl: string | null; commitSha: string | null; changedFiles: ChangedFile[] }

const EMPTY_DELIVERY: Delivery = { repoUrl: null, branch: null, prUrl: null, commitSha: null, changedFiles: [] }
const FILE_STATUS_COLOR: Record<string, string> = {
  A: 'text-emerald-400', M: 'text-amber-400', D: 'text-red-400', R: 'text-blue-400',
}

const COLUMNS: { key: string; label: string; dot: string }[] = [
  { key: 'todo', label: 'A fazer', dot: 'bg-white/30' },
  { key: 'doing', label: 'Fazendo', dot: 'bg-blue-400' },
  { key: 'review', label: 'Review', dot: 'bg-purple-400' },
  { key: 'done', label: 'Concluído', dot: 'bg-emerald-400' },
]

const ROLE_ICON: Record<string, typeof Crown> = { lead: Crown, worker: Hammer, reviewer: ShieldCheck }
// S2.2: lucide icon per task lifecycle event (iconKey from the pure taskEventView).
const EVENT_ICON: Record<TaskEventIconKey, typeof Crown> = {
  created: ClipboardList, status: Repeat, owner: Hammer,
  review_requested: ShieldCheck, approved: CheckCircle2, changes: XCircle,
}
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
  const [mode, setMode] = useState<RunMode>('chat')
  const [gitMode, setGitMode] = useState<GitMode>('pr')
  const [previewEnabled, setPreviewEnabled] = useState(false) // Preview mode: live iframe after a code-run
  const [runId, setRunId] = useState<string | null>(null)
  const [tasks, setTasks] = useState<BoardTask[]>([])
  const [terminal, setTerminal] = useState<TerminalTask[]>([])
  const [delivery, setDelivery] = useState<Delivery>(EMPTY_DELIVERY)
  const [messages, setMessages] = useState<Msg[]>([])
  const [status, setStatus] = useState<string>('')
  const [output, setOutput] = useState<string | null>(null)
  const [runError, setRunError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<Metrics>({ turnsUsed: null, tokensUsed: null, estimatedCost: null, durationMs: null })
  const [usageByMember, setUsageByMember] = useState<MemberUsageEntry[]>([])
  const [running, setRunning] = useState(false)
  const [steer, setSteer] = useState('') // S4: live-steering input (message injected mid-run)
  const [steerSending, setSteerSending] = useState(false)
  const [missionImages, setMissionImages] = useState<File[]>([]) // S6: images attached to the mission
  const [steerImages, setSteerImages] = useState<File[]>([]) // S6: images attached to a live steering message
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null) // S2.2: task whose history timeline is open
  const [graphOpen, setGraphOpen] = useState(false) // S5: expanded "Visualizar" graph modal open
  const [highlightId, setHighlightId] = useState<string | null>(null) // S3.2: relation-target task flashed on navigation
  const esRef = useRef<EventSource | null>(null)
  const feedRef = useRef<HTMLDivElement | null>(null)
  const missionRef = useRef<HTMLTextAreaElement | null>(null)
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map()) // S3.2: task id → card el, for scroll-to navigation
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // S3.2: derive each task's DISPLAY relations — `blocks` (inverse of dependsOn) and the
  // symmetric `related` cross-links. Pure helper; never touches the agenda/DAG. taskById
  // resolves a relation id → its title for the navigation chips.
  const taskById = useMemo(() => new Map(tasks.map(t => [t.id, t])), [tasks])
  const relations = useMemo(
    () => deriveTaskRelations(tasks.map(t => ({ id: t.id, dependsOn: t.dependsOn ?? [], related: t.related ?? [] }))),
    [tasks],
  )

  // S3.2: scroll the related card into view and flash it for 1.5s.
  function gotoTask(id: string) {
    const el = cardRefs.current.get(id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightId(id)
    if (highlightTimer.current) clearTimeout(highlightTimer.current)
    highlightTimer.current = setTimeout(() => setHighlightId(cur => (cur === id ? null : cur)), 1500)
  }

  async function loadTeam() {
    const r = await fetch(`/api/teams/${teamId}`)
    const j = await r.json()
    if (j.success) { setTeam(j.data); setHistory(j.data.runs ?? []) }
  }

  useEffect(() => {
    loadTeam()
    return () => { esRef.current?.close(); if (highlightTimer.current) clearTimeout(highlightTimer.current) }
  }, [teamId])

  // Deep-link from the "Rodar" button on the teams grid (?focus=mission):
  // focus the composer and scroll it into view. Read window.location instead of
  // useSearchParams to avoid the Next 16 Suspense boundary requirement.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (new URLSearchParams(window.location.search).get('focus') === 'mission') {
      missionRef.current?.focus()
      missionRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [])

  // Auto-scroll the activity feed as messages arrive.
  useEffect(() => { feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight }) }, [messages])

  function memberOf(id: string | null): Member | null {
    if (!id) return null
    return team?.members.find(m => m.id === id) ?? null
  }
  function nameFor(id: string | null): string {
    return memberOf(id)?.agent.name ?? (id ? '?' : '—')
  }
  // S2.2: resolve a timeline event's actor. It's a TeamMember id OR a role sentinel
  // (`lead`/`reviewer`) when the store couldn't derive the member id from the task row;
  // map the sentinels to the role's agent name, falling back to the role label.
  function actorName(actor: string): string {
    const m = memberOf(actor)
    if (m) return m.agent.name
    if (actor === 'lead') return team?.members.find(x => x.role === 'lead')?.agent.name ?? 'Lead'
    if (actor === 'reviewer') return team?.members.find(x => x.role === 'reviewer')?.agent.name ?? 'Reviewer'
    return actor
  }
  function fmtEventTime(at: string): string {
    const d = new Date(at)
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  function openStream(rid: string, assumeRunning: boolean) {
    esRef.current?.close()
    setTasks([]); setMessages([]); setOutput(null); setRunError(null); setTerminal([]); setDelivery(EMPTY_DELIVERY)
    setMetrics({ turnsUsed: null, tokensUsed: null, estimatedCost: null, durationMs: null })
    setUsageByMember([])
    setRunning(assumeRunning)
    const es = new EventSource(`/api/teams/${teamId}/runs/${rid}/stream`)
    esRef.current = es
    es.addEventListener('board', e => setTasks(JSON.parse((e as MessageEvent).data).tasks))
    es.addEventListener('terminal', e => setTerminal(JSON.parse((e as MessageEvent).data).tasks))
    es.addEventListener('message', e => setMessages(prev => [...prev, JSON.parse((e as MessageEvent).data)]))
    es.addEventListener('status', e => {
      const d = JSON.parse((e as MessageEvent).data)
      setStatus(d.status); setOutput(d.output); setRunError(d.error ?? null)
      setMetrics({ turnsUsed: d.turnsUsed, tokensUsed: d.tokensUsed, estimatedCost: d.estimatedCost, durationMs: d.durationMs })
      setDelivery({
        repoUrl: d.repoUrl ?? null, branch: d.branch ?? null, prUrl: d.prUrl ?? null,
        commitSha: d.commitSha ?? null, changedFiles: Array.isArray(d.changedFiles) ? d.changedFiles : [],
      })
      if (Array.isArray(d.usageByMember)) setUsageByMember(d.usageByMember)
    })
    es.addEventListener('done', () => { es.close(); setRunning(false); loadTeam() })
    es.addEventListener('error', () => { es.close(); setRunning(false) })
  }

  async function startRun() {
    if (!mission.trim()) return
    setRunning(true); setStatus('pending')
    try {
      // S6: send multipart when the mission carries images (chat or code); JSON otherwise.
      const req = buildRunRequest({ mission, mode, gitMode, previewEnabled })
      const useForm = missionImages.length > 0
      let res: Response
      if (useForm) {
        const fd = new FormData()
        for (const [k, v] of Object.entries(req)) if (v != null) fd.append(k, String(v))
        for (const f of missionImages) fd.append('images', f)
        res = await fetch(`/api/teams/${teamId}/run`, { method: 'POST', body: fd })
      } else {
        res = await fetch(`/api/teams/${teamId}/run`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req),
        })
      }
      const json = await res.json()
      if (json.success && json.data?.runId) {
        setMissionImages([])
        setRunId(json.data.runId)
        openStream(json.data.runId, true)
      } else {
        setStatus(json.error ?? 'failed'); setRunning(false)
      }
    } catch {
      setStatus('failed'); setRunning(false)
    }
  }

  // S4: inject a steering message into the live run. The Lead surfaces it next turn
  // (cooperative — never interrupts a call). The SSE stream delivers the persisted
  // message back into the feed (~1s), so there's no optimistic insert to dedup.
  async function sendSteer() {
    const text = steer.trim()
    if ((!text && steerImages.length === 0) || !runId || steerSending) return
    setSteerSending(true)
    try {
      // S6: multipart when images are attached; JSON for text-only steering (S4 path).
      let res: Response
      if (steerImages.length > 0) {
        const fd = new FormData()
        fd.append('content', text)
        for (const f of steerImages) fd.append('images', f)
        res = await fetch(`/api/teams/${teamId}/runs/${runId}/messages`, { method: 'POST', body: fd })
      } else {
        res = await fetch(`/api/teams/${teamId}/runs/${runId}/messages`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text }),
        })
      }
      const json = await res.json()
      if (json.success) { setSteer(''); setSteerImages([]) } // keep on failure so the user can retry
    } catch { /* network error — keep the text for retry */ }
    finally { setSteerSending(false) }
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

  // G5: the live handoff is derived from the latest assignment/review message
  // (Lead→Worker on assignment, Worker→Reviewer on review). It re-derives as each
  // message arrives and vanishes once the run is no longer running.
  const lastHandoffMsg = running
    ? [...messages].reverse().find(m => (m.kind === 'assignment' || m.kind === 'review') && m.fromMemberId && m.toMemberId)
    : undefined
  const handoff = lastHandoffMsg
    ? { fromMemberId: lastHandoffMsg.fromMemberId!, toMemberId: lastHandoffMsg.toMemberId! }
    : null

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

      {/* Outputs panel: configure webhook/email/slack outputs fired on run completion */}
      {team && (
        <TeamOutputsPanel
          teamId={teamId}
          initialWebhooks={(((team as any).config?.outputWebhooks) ?? []) as any}
          latestDispatches={((history?.[0] as any)?.outputDispatches) ?? null}
        />
      )}

      {/* Schedules panel: recurring runs (SP3) */}
      {team && <TeamSchedulesPanel teamId={teamId} />}

      {/* Mission composer */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
        {/* Run mode: chat (LLM only) vs code (runs in a sandbox — Sub-projeto C) */}
        <div className="inline-flex rounded-lg border border-white/10 bg-white/5 p-0.5 text-xs">
          {([
            { key: 'chat', label: 'Chat', Icon: MessageCircle },
            { key: 'code', label: 'Código', Icon: Code2 },
          ] as const).map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              disabled={running}
              onClick={() => setMode(key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors disabled:opacity-50 ${
                mode === key ? 'bg-blue-500/20 text-blue-300' : 'text-white/50 hover:text-white/80'
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
          {mode === 'code' && (
            <span className="inline-flex items-center gap-1 px-2 text-[11px] text-white/40">
              <TerminalIcon className="h-3 w-3" /> roda em sandbox isolado
            </span>
          )}
        </div>
        {/* Git delivery mode (code-runs — Teams V2 S3.2): PR (review on GitHub) vs commit
            straight to the base. Default PR. Inert in chat-run / code-run C0 (no repo bound),
            so the toggle is harmless even for a team without a repo (S3.2 gotcha). */}
        {mode === 'code' && (
          <div className="flex flex-col gap-1.5">
            <div className="inline-flex self-start rounded-lg border border-white/10 bg-white/5 p-0.5 text-xs">
              {([
                { key: 'pr', label: 'Abrir PR (revisar no GitHub)', Icon: GitPullRequest },
                { key: 'direct', label: 'Commit direto na main', Icon: GitBranch },
              ] as const).map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  disabled={running}
                  onClick={() => setGitMode(key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors disabled:opacity-50 ${
                    gitMode === key ? 'bg-blue-500/20 text-blue-300' : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>
            {gitMode === 'direct' && (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-400/80">
                ⚠️ commita direto na main, sem PR — autônomo, sem revisão
              </span>
            )}
          </div>
        )}
        {/* Preview mode (Lovable-style): after a repo-bound code-run, boot the dev server in
            the sandbox and embed it in an iframe. Needs a repo (inert otherwise — gated server
            side in startTeamRun). Keeps the sandbox alive ~15min (E2B cost), so it's opt-in. */}
        {mode === 'code' && (
          <label className="inline-flex items-center gap-2 self-start text-xs text-white/60 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={previewEnabled}
              disabled={running}
              onChange={e => setPreviewEnabled(e.target.checked)}
              className="accent-cyan-500 h-3.5 w-3.5"
            />
            <MonitorPlay className="h-3.5 w-3.5 text-cyan-400" /> Preview ao vivo
            <span className="text-white/35">— sobe o site num iframe após o run (precisa de repo; mantém sandbox ~15min)</span>
          </label>
        )}
        <textarea
          ref={missionRef}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-y"
          rows={3}
          placeholder="Descreva a missão do time…"
          value={mission}
          onChange={e => setMission(e.target.value)}
          disabled={running}
        />
        {/* S6: attach images to the mission (chat + code; code-runs sync them into the sandbox) */}
        <ImageAttachBar images={missionImages} setImages={setMissionImages} disabled={running} />
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
                  // S2.2: per-task lifecycle timeline (legacy / event-less tasks degrade to
                  // a non-interactive card, exactly like before — no toggle, no crash).
                  const events = Array.isArray(t.historyEvents) ? t.historyEvents : []
                  const expanded = expandedTaskId === t.id
                  // S3.2: navigation chips. `depende de` = this task's dependsOn (filtered to
                  // tasks still on the board); `bloqueia` = derived inverse; `relacionada` =
                  // symmetric cross-links. Empty groups → no chips (legacy card unchanged).
                  const rel = relations.get(t.id) ?? { blocks: [], related: [] }
                  const relGroups: { key: string; label: string; Icon: typeof Crown; tone: string; ids: string[] }[] = [
                    { key: 'dep', label: 'depende de', Icon: ArrowDownLeft, tone: 'border-amber-400/30 text-amber-300/80 hover:bg-amber-400/10', ids: (t.dependsOn ?? []).filter(id => taskById.has(id)) },
                    { key: 'blk', label: 'bloqueia', Icon: ArrowUpRight, tone: 'border-red-400/30 text-red-300/80 hover:bg-red-400/10', ids: rel.blocks },
                    { key: 'rel', label: 'relacionada', Icon: Link2, tone: 'border-sky-400/30 text-sky-300/80 hover:bg-sky-400/10', ids: rel.related },
                  ]
                  const hasRelations = relGroups.some(g => g.ids.length > 0)
                  const highlighted = highlightId === t.id
                  return (
                    <div
                      key={t.id}
                      ref={el => { if (el) cardRefs.current.set(t.id, el); else cardRefs.current.delete(t.id) }}
                      className={`rounded-lg border p-2.5 text-sm transition-shadow ${rejected ? 'border-red-500/30 bg-red-500/5' : 'border-white/10 bg-white/5'} ${highlighted ? 'ring-2 ring-blue-400/70 ring-offset-1 ring-offset-[#0b0b0f]' : ''}`}
                    >
                      <div className="font-medium text-white/90 text-[13px] leading-snug">{t.title}</div>
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-white/40">
                        <span>{nameFor(t.assigneeId)}</span>
                        {t.retryCount > 0 && <span className="text-amber-400/70">retry {t.retryCount}</span>}
                        {rejected && <span className="inline-flex items-center gap-0.5 text-red-400"><XCircle className="h-3 w-3" />rejeitado</span>}
                      </div>
                      {hasRelations && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {relGroups.flatMap(g => g.ids.map(id => (
                            <button
                              key={`${g.key}:${id}`}
                              type="button"
                              onClick={() => gotoTask(id)}
                              title={`${g.label}: ${taskById.get(id)?.title ?? ''}`}
                              className={`inline-flex items-center gap-1 max-w-[160px] rounded-full border px-1.5 py-0.5 text-[10px] transition-colors ${g.tone}`}
                            >
                              <g.Icon className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">{taskById.get(id)?.title ?? '—'}</span>
                            </button>
                          )))}
                        </div>
                      )}
                      {t.reviewNote && <div className="mt-1.5 text-[11px] text-amber-400/80 border-l-2 border-amber-400/40 pl-2">↩ {t.reviewNote}</div>}
                      {t.resultPreview && t.status === 'done' && (
                        <div className="mt-1.5 text-[11px] text-white/40 line-clamp-2">{t.resultPreview}</div>
                      )}
                      {events.length > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={() => setExpandedTaskId(expanded ? null : t.id)}
                            className="mt-2 inline-flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70 transition-colors"
                            aria-expanded={expanded}
                          >
                            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            <History className="h-3 w-3" /> Histórico ({events.length})
                          </button>
                          {expanded && (
                            <ol className="mt-1.5 space-y-1.5 border-l border-white/10 pl-2.5">
                              {events.map((ev, i) => {
                                const view = taskEventView(ev)
                                const Icon = EVENT_ICON[view.iconKey] ?? Repeat
                                const owner = ev.type === 'owner_changed'
                                  ? nameFor((ev.detail?.to as string | undefined) ?? null)
                                  : null
                                return (
                                  <li key={i} className="flex items-start gap-1.5 text-[11px] leading-relaxed">
                                    <Icon className={`h-3 w-3 mt-0.5 shrink-0 ${view.tone}`} />
                                    <span className="min-w-0 flex-1 text-white/70">
                                      {view.label}{owner ? ` ${owner}` : ''}
                                      <span className="text-white/30"> · {actorName(ev.actor)}</span>
                                    </span>
                                    <span className="shrink-0 text-white/30 tabular-nums">{fmtEventTime(ev.at)}</span>
                                  </li>
                                )
                              })}
                            </ol>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Terminal (code-runs only): per-task sandbox command transcripts — xterm.js (C2) */}
      {terminal.length > 0 && <SandboxTerminal tasks={terminal} />}

      {/* Code delivery (code-runs bound to a repo — Sub-projeto C C1): branch + PR + changed files */}
      {(delivery.branch || delivery.prUrl || delivery.changedFiles.length > 0) && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <h2 className="font-semibold text-white text-sm flex items-center gap-2">
            <GitPullRequest className="h-4 w-4 text-blue-400" /> Entrega de código
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {delivery.branch && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/70 font-mono">
                <GitBranch className="h-3 w-3" /> {delivery.branch}
              </span>
            )}
            {delivery.commitSha && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 font-mono">
                {delivery.commitSha.slice(0, 7)}
              </span>
            )}
            {delivery.prUrl ? (
              <a
                href={delivery.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors font-medium"
              >
                <GitPullRequest className="h-3 w-3" /> Abrir Pull Request <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              running && delivery.branch && <span className="text-white/40">PR será aberto ao concluir…</span>
            )}
          </div>
          {delivery.changedFiles.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-white/40 mb-1.5">
                {delivery.changedFiles.length} arquivo(s) alterado(s)
              </div>
              <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar pr-1 font-mono text-[12px]">
                {delivery.changedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`w-4 text-center ${FILE_STATUS_COLOR[f.status] ?? 'text-white/40'}`}>{f.status}</span>
                    <span className="text-white/70 break-all">{f.path}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Diff viewer (code-runs — Sub-projeto C C2): per-file patches via diff2html */}
      {delivery.changedFiles.some(f => f.patch) && <DiffViewer changedFiles={delivery.changedFiles} />}

      {/* Preview mode (Lovable-style): live iframe of the dev server. Self-contained —
          renders nothing unless the run opted in (it polls its own endpoint). */}
      {runId && <PreviewPanel teamId={teamId} runId={runId} />}

      {/* Activity feed + history */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="font-semibold text-white text-sm mb-3 flex items-center gap-2"><MessageSquare className="h-4 w-4 text-white/40" /> Atividade do time</h2>
          <div ref={feedRef} className="space-y-2 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
            {messages.length === 0 && <p className="text-white/30 text-sm">Sem atividade ainda. Dispare uma missão para ver os agentes coordenarem.</p>}
            {messages.map(m => {
              // S4: a `user` message is human steering injected mid-run — render it
              // distinctly ("Você → Lead", emerald) so it stands out in the feed.
              const isUser = m.kind === 'user'
              const Icon = m.kind === 'assignment' ? ClipboardList : m.kind === 'review' ? CheckCircle2 : isUser ? MessageCircle : MessageSquare
              const tint = m.kind === 'assignment' ? 'text-blue-400 border-blue-400/30'
                : m.kind === 'review' ? 'text-purple-400 border-purple-400/30'
                : isUser ? 'text-emerald-400 border-emerald-400/40'
                : 'text-white/50 border-white/10'
              return (
                <div key={m.id} className={`rounded-lg border-l-2 bg-white/[0.03] px-3 py-2 ${tint.split(' ')[1]}`}>
                  <div className="flex items-center gap-1.5 text-[11px] text-white/40">
                    <Icon className={`h-3 w-3 ${tint.split(' ')[0]}`} />
                    <span className="text-white/60">{isUser ? 'Você' : nameFor(m.fromMemberId)}</span>
                    <span>→ {isUser ? 'Lead' : nameFor(m.toMemberId)}</span>
                    <span className="ml-auto uppercase tracking-wider">{isUser ? 'steering' : m.kind}</span>
                  </div>
                  <div className="text-[13px] text-white/80 mt-1 whitespace-pre-wrap break-words">{m.summary || m.content}</div>
                  {/* S6: render attached images (vision) via the auth'd proxy GET by key. */}
                  {m.attachments && m.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.attachments.map(a => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <a key={a.key} href={`/api/teams/${teamId}/runs/${runId}/attachment?key=${encodeURIComponent(a.key)}`} target="_blank" rel="noreferrer">
                          <img
                            src={`/api/teams/${teamId}/runs/${runId}/attachment?key=${encodeURIComponent(a.key)}`}
                            alt={a.name}
                            className="h-24 w-24 object-cover rounded-md border border-white/10 hover:border-white/30 transition-colors"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {/* S4: live steering composer — only while the run is in flight. Sends a
              message the Lead picks up on its next planning turn (coordinator intacto). */}
          {running && runId && (
            <div className="mt-3 border-t border-white/10 pt-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={steer}
                  onChange={e => setSteer(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendSteer() } }}
                  placeholder="Enviar instrução ao time durante a execução…"
                  disabled={steerSending}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={sendSteer}
                  disabled={steerSending || (!steer.trim() && steerImages.length === 0)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-500/90 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {steerSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Enviar
                </button>
              </div>
              {/* S6: attach images to a live steering message (vision) */}
              <ImageAttachBar images={steerImages} setImages={setSteerImages} disabled={steerSending} />
            </div>
          )}
        </div>

        <div className="space-y-4">
          {team && team.members.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-white text-sm flex items-center gap-2"><Network className="h-4 w-4 text-white/40" /> Topologia</h2>
                {/* S5: open the enriched fullscreen graph (tokens / owner / status / relations). */}
                <button
                  type="button"
                  onClick={() => setGraphOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Maximize2 className="h-3.5 w-3.5" /> Visualizar
                </button>
              </div>
              <TeamGraph
                members={team.members.map(m => ({ id: m.id, role: m.role, name: m.agent.name }))}
                tasks={tasks.map(t => ({ id: t.id, title: t.title, status: t.status, assigneeId: t.assigneeId, dependsOn: t.dependsOn ?? [] }))}
                activeId={activeId}
                handoff={handoff}
                running={running}
              />
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

      {/* Per-member activity (Teams V2 — S2.1): additive section grouping the SSE-delivered
          messages/tasks by member. No new route/query — derives from state already on the client. */}
      {team && team.members.length > 0 && (
        <MemberActivityPanel members={team.members} messages={messages} tasks={tasks} usageByMember={usageByMember} runStatus={status} runError={runError} />
      )}

      {/* Run error (failed / rate-limited / git delivery error) */}
      {runError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] p-4">
          <h2 className="font-semibold text-white text-sm mb-2 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-400" /> Erro
          </h2>
          <pre className="whitespace-pre-wrap break-words text-[13px] text-red-300/90 font-mono">{runError}</pre>
        </div>
      )}

      {/* Final delivery */}
      {output && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
          <h2 className="font-semibold text-white text-sm mb-3 flex items-center gap-2"><Rocket className="h-4 w-4 text-emerald-400" /> Entrega final</h2>
          <pre className="whitespace-pre-wrap break-words text-sm text-white/80 font-sans">{output}</pre>
        </div>
      )}

      {/* S5: expanded "Visualizar" graph modal — enriched + interactive, reuses the
          same state already on the client (no new route/query). */}
      {graphOpen && team && team.members.length > 0 && (
        <TeamGraphView
          members={team.members.map(m => ({ id: m.id, role: m.role, name: m.agent.name }))}
          tasks={tasks.map(t => ({ id: t.id, title: t.title, status: t.status, assigneeId: t.assigneeId, dependsOn: t.dependsOn ?? [] }))}
          activeId={activeId}
          handoff={handoff}
          running={running}
          usageByMember={usageByMember}
          relations={relations}
          onClose={() => setGraphOpen(false)}
        />
      )}
    </div>
  )
}
