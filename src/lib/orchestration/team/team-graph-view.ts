// src/lib/orchestration/team/team-graph-view.ts
//
// G4 — pure builder for the Teams execution graph (viz layer).
// G5 — live handoff animation + per-member "thinking" state (still pure).
//
// Turns the live board (members + tasks) into React Flow `{ nodes, edges }` with
// NO React/DOM and NO @xyflow/react runtime dependency (only type-only imports,
// which esbuild/tsx erase) so `scripts/g4-verify.ts` / `g5-verify.ts` can assert
// on it directly. `TeamGraph.tsx` is a thin renderer that just passes this output
// to <ReactFlow>.
//
// Invariant: engine is UNTOUCHED — this is pure visualization. The graph is
// BOARD-DRIVEN (renders task nodes whenever the board has tasks, linear or graph);
// a linear run simply has empty `dependsOn` so it grows zero task→task edges.
// Handoffs (assignment/review) happen in linear runs too, so G5 animation is NOT
// gated on topology.
//
// Layout is MANUAL (no dagre/elk/d3): members keep their hardcoded rows
// (lead top → workers middle → reviewer below), and each task is stacked in a
// vertical column under its owner (assignee), below the member band.
import type { CSSProperties } from 'react'
import type { Node, Edge } from '@xyflow/react'

export interface GraphMember { id: string; role: string; name: string }
export interface GraphTask {
  id: string
  title: string
  status: string // 'todo' | 'doing' | 'review' | 'done' | 'rejected' | 'blocked'
  assigneeId: string | null
  dependsOn: string[]
}

// G5: the current live handoff (Lead→Worker on assignment, Worker→Reviewer on
// review) plus whether the run is still live. Optional 4th param so the G4
// positional signature `buildTeamGraph(members, tasks, activeId)` keeps working.
//
// V2.2 S5 ("Visualizar"): the expanded graph view layers extra context on top of
// the same board-driven layout. ALL of it is gated on `expanded` — when the flag
// is off (the compact sidebar `TeamGraph.tsx` path) the output is byte-identical
// to the G4/G5 graph, so `scripts/v22s5-verify.ts` can assert that invariant.
export interface GraphUsage { memberId: string | null; tokens: number }
export interface GraphRelations { blocks: string[]; related: string[] }
export interface TeamGraphOpts {
  handoff?: { fromMemberId: string; toMemberId: string } | null
  running?: boolean
  /** S5: opt into the enriched "Visualizar" rendering (token/owner/status labels +
   *  `related` edges). Omitted/false → compact output unchanged. */
  expanded?: boolean
  /** S5: per-member token totals for the run (memberId → tokens). Shown on member
   *  nodes only when `expanded`. */
  usageByMember?: GraphUsage[]
  /** S5: derived display relations (`deriveTaskRelations` output) — adds the
   *  symmetric `related` edges between task nodes when `expanded`. `blocks` is the
   *  inverse of `dependsOn`, already drawn as dependency edges, so it is NOT
   *  re-drawn here. */
  relations?: Map<string, GraphRelations>
}

export interface TeamGraphData { nodes: Node[]; edges: Edge[] }

// Status palette — mirrors the kanban semantics in TeamRunView (doing=blue,
// review=purple, done=emerald, rejected=red, todo=white/30) plus blocked=amber.
// blocked is graph-mode only and gets an extra 🔒 badge + amber so a parked
// dependency reads at a glance (decision G4: amber = "waiting", distinct from the
// red of an actively rejected task).
const TASK_PALETTE: Record<string, { bg: string; border: string }> = {
  todo: { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.3)' },
  doing: { bg: 'rgba(59,130,246,0.18)', border: 'rgba(59,130,246,0.7)' },
  review: { bg: 'rgba(168,85,247,0.18)', border: 'rgba(168,85,247,0.7)' },
  done: { bg: 'rgba(16,185,129,0.18)', border: 'rgba(16,185,129,0.7)' },
  rejected: { bg: 'rgba(239,68,68,0.18)', border: 'rgba(239,68,68,0.7)' },
  blocked: { bg: 'rgba(245,158,11,0.18)', border: 'rgba(245,158,11,0.7)' },
}

const GAP_X = 170 // horizontal spacing between worker columns (matches member graph)
const NODE_W = 140
const TASK_W = 130
const ROW_LEAD_Y = 0
const ROW_WORKER_Y = 130
const ROW_REVIEWER_Y = 260
const TASK_BASE_Y = 360 // first task row, clear of the reviewer row
const TASK_GAP_Y = 64 // vertical spacing between stacked tasks of one owner
const UNASSIGNED_X = -GAP_X // tasks with no owner sit in a column to the left

function memberStyle(active: boolean): CSSProperties {
  return {
    background: active ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.05)',
    border: `1px solid ${active ? 'rgba(59,130,246,0.7)' : 'rgba(255,255,255,0.15)'}`,
    color: 'white',
    borderRadius: 12,
    fontSize: 12,
    padding: '6px 10px',
    width: NODE_W,
    textAlign: 'center',
    boxShadow: active ? '0 0 16px rgba(59,130,246,0.35)' : 'none',
  }
}

function taskStyle(status: string): CSSProperties {
  const p = TASK_PALETTE[status] ?? TASK_PALETTE.todo
  return {
    background: p.bg,
    border: `1px solid ${p.border}`,
    color: 'white',
    borderRadius: 10,
    fontSize: 11,
    padding: '5px 8px',
    width: TASK_W,
    textAlign: 'center',
  }
}

const memberLabel = (role: string, name: string) => {
  const g = role === 'lead' ? '👑' : role === 'reviewer' ? '🛡' : '🛠'
  return `${g} ${name}`
}

// S5: in the expanded view the task node also spells out its owner (🛠 name) and a
// readable status label; the compact branch returns the byte-identical G4 label.
function taskLabel(
  t: GraphTask, reviewerName: string | null, expanded: boolean, ownerName: string | null,
): string {
  const badge = t.status === 'blocked' ? '🔒 ' : ''
  const chip = reviewerName ? ` · 🛡 ${reviewerName}` : ''
  if (!expanded) return `${badge}${t.title}${chip}`
  const owner = ownerName ? ` · 🛠 ${ownerName}` : ''
  return `${badge}${t.title}${owner} · ${statusLabel(t.status)}${chip}`
}

const SUBTLE_EDGE = { stroke: 'rgba(255,255,255,0.2)' }
const OWNER_EDGE = { stroke: 'rgba(255,255,255,0.25)' }
const DEP_EDGE = { stroke: 'rgba(245,158,11,0.55)', strokeDasharray: '5 4' } // amber dependency
// S5 (expanded only): the symmetric `related` cross-link — purple, finely dashed,
// intentionally distinct from the amber dependency edge so the two read apart.
const RELATED_EDGE = { stroke: 'rgba(168,85,247,0.55)', strokeDasharray: '2 4' }

// S5: status labels (expanded task nodes). Mirrors the kanban copy in TeamRunView
// (todo/doing/review/done) plus the graph-only rejected/blocked states.
const STATUS_LABEL_PT: Record<string, string> = {
  todo: 'A fazer', doing: 'Fazendo', review: 'Review', done: 'Concluído',
  rejected: 'Rejeitado', blocked: 'Bloqueado',
}
const statusLabel = (s: string) => STATUS_LABEL_PT[s] ?? s

// S5: compact token formatting for member nodes (e.g. 12_345 → "12.3k tok").
function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M tok`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k tok`
  return `${n} tok`
}
// G5: the live handoff edge — vivid cyan + thicker stroke, intentionally distinct
// from the subtle white glow the active member's edges already get via `animated`.
const HANDOFF_EDGE = { stroke: '#22d3ee', strokeWidth: 3 }

const taskNodeId = (id: string) => `task-${id}`

// `thinking` (G5) only ever fires for the active member while the run is live, so
// it visually stacks on top of the active-member glow. The pulse animation itself
// lives in TeamGraph.tsx (CSS keyframe) keyed off this `rf-thinking` className;
// the builder stays pure and only emits the className string + data flag.
function buildMemberNode(
  m: GraphMember, role: string, x: number, y: number, active: boolean, thinking: boolean,
  expanded: boolean, tokens: number | null,
): Node {
  // S5: the expanded view appends the member's run token total when available;
  // compact (or no usage) keeps the original `memberLabel` byte-for-byte.
  const base = memberLabel(role, m.name)
  const label = expanded && tokens != null ? `${base} · ${fmtTokens(tokens)}` : base
  return {
    id: m.id,
    position: { x, y },
    data: { kind: 'member', label, thinking },
    style: memberStyle(active),
    className: thinking ? 'rf-thinking' : undefined,
    draggable: false,
    selectable: false,
  }
}

/**
 * Build the React Flow graph for a team run.
 *
 * - One member node per member (lead/worker/reviewer rows, active highlight, and
 *   G5 `data.thinking` + `rf-thinking` className on the active member while live).
 * - One task node per task, stacked under its owner, colored by status, with a
 *   🔒 blocked badge and a 🛡 reviewer chip while the task is in review.
 * - Edges: member↔member (existing topology; the one matching the live handoff is
 *   animated with the cyan HANDOFF_EDGE style — G5), owner→task (ownership),
 *   task→task (dependency, from each id in `dependsOn`).
 *
 * @param opts G5 — optional handoff `{ fromMemberId, toMemberId }` and `running`
 *   flag. Omitted (G4 positional callers) → no handoff edge, no thinking state.
 */
export function buildTeamGraph(
  members: GraphMember[],
  tasks: GraphTask[],
  activeId: string | null,
  opts?: TeamGraphOpts,
): TeamGraphData {
  const hf = opts?.handoff ?? null
  const running = !!opts?.running
  // A member↔member edge is "the live handoff" when its direction matches the
  // current handoff and the run is still live (the handoff vanishes on terminal).
  const isHandoff = (source: string, target: string) =>
    running && hf != null && hf.fromMemberId === source && hf.toMemberId === target

  const lead = members.find(m => m.role === 'lead')
  const workers = members.filter(m => m.role === 'worker')
  const reviewer = members.find(m => m.role === 'reviewer')
  const reviewerName = reviewer?.name ?? null

  // S5: enriched "Visualizar" rendering. All of this is inert when `expanded` is
  // false (compact sidebar path) → byte-identical output.
  const expanded = !!opts?.expanded
  // memberId → run token total (summed; null memberId / non-expanded ignored).
  const usageMap = new Map<string, number>()
  if (expanded && opts?.usageByMember) {
    for (const u of opts.usageByMember) {
      if (u.memberId) usageMap.set(u.memberId, (usageMap.get(u.memberId) ?? 0) + u.tokens)
    }
  }
  const tokensOf = (id: string): number | null => (expanded && usageMap.has(id) ? usageMap.get(id)! : null)
  // memberId → display name, for the owner chip on expanded task nodes.
  const memberName = new Map(members.map(m => [m.id, m.name]))

  const totalW = Math.max(workers.length, 1) * GAP_X
  const centerX = totalW / 2 - NODE_W / 2

  const nodes: Node[] = []
  const edges: Edge[] = []

  // ── members (same hardcoded topology as before) ──
  const memberX = new Map<string, number>()
  if (lead) {
    memberX.set(lead.id, centerX)
    nodes.push(buildMemberNode(lead, 'lead', centerX, ROW_LEAD_Y, lead.id === activeId, running && lead.id === activeId, expanded, tokensOf(lead.id)))
  }
  workers.forEach((w, i) => {
    const x = i * GAP_X
    memberX.set(w.id, x)
    nodes.push(buildMemberNode(w, 'worker', x, ROW_WORKER_Y, w.id === activeId, running && w.id === activeId, expanded, tokensOf(w.id)))
    if (lead) {
      const hand = isHandoff(lead.id, w.id)
      edges.push({ id: `l-${w.id}`, source: lead.id, target: w.id, animated: hand || w.id === activeId, style: hand ? HANDOFF_EDGE : SUBTLE_EDGE })
    }
    if (reviewer) {
      const hand = isHandoff(w.id, reviewer.id)
      edges.push({ id: `${w.id}-r`, source: w.id, target: reviewer.id, animated: hand || w.id === activeId, style: hand ? HANDOFF_EDGE : SUBTLE_EDGE })
    }
  })
  if (reviewer) {
    memberX.set(reviewer.id, centerX)
    nodes.push(buildMemberNode(reviewer, 'reviewer', centerX, ROW_REVIEWER_Y, reviewer.id === activeId, running && reviewer.id === activeId, expanded, tokensOf(reviewer.id)))
    if (lead) {
      const hand = isHandoff(reviewer.id, lead.id)
      edges.push({ id: `r-l`, source: reviewer.id, target: lead.id, animated: hand || reviewer.id === activeId, style: hand ? HANDOFF_EDGE : { stroke: 'rgba(255,255,255,0.12)', strokeDasharray: '4 4' } })
    }
  }

  // ── tasks: one node each, stacked in a column under the owner ──
  const memberIds = new Set(members.map(m => m.id))
  const taskIds = new Set(tasks.map(t => t.id))
  const columnCount = new Map<number, number>() // colX → how many tasks already stacked

  for (const t of tasks) {
    const owned = t.assigneeId != null && memberIds.has(t.assigneeId)
    const colX = owned ? (memberX.get(t.assigneeId!) ?? UNASSIGNED_X) : UNASSIGNED_X
    const k = columnCount.get(colX) ?? 0
    columnCount.set(colX, k + 1)

    const showReviewer = t.status === 'review' ? reviewerName : null
    const ownerName = owned ? (memberName.get(t.assigneeId!) ?? null) : null
    nodes.push({
      id: taskNodeId(t.id),
      position: { x: colX, y: TASK_BASE_Y + k * TASK_GAP_Y },
      data: {
        kind: 'task',
        label: taskLabel(t, showReviewer, expanded, ownerName),
        status: t.status,
        blocked: t.status === 'blocked',
        reviewer: showReviewer,
      },
      style: taskStyle(t.status),
      draggable: false, selectable: false,
    })

    // owner → task (ownership)
    if (owned) {
      edges.push({ id: `o-${t.id}`, source: t.assigneeId!, target: taskNodeId(t.id), style: OWNER_EDGE })
    }
    // task → task (dependency): the dependency points at the dependent task.
    for (const depId of t.dependsOn ?? []) {
      if (!taskIds.has(depId)) continue // skip dangling/stale deps
      edges.push({
        id: `d-${depId}-${t.id}`, source: taskNodeId(depId), target: taskNodeId(t.id),
        animated: true, style: DEP_EDGE,
      })
    }
  }

  // ── S5 (expanded): symmetric `related` cross-link edges ──
  // `related` is symmetric (each pair shows on both cards), so we de-dupe by the
  // unordered id pair to draw a single edge. `blocks` is intentionally skipped: it
  // is the inverse of `dependsOn`, already rendered above as dependency edges.
  if (expanded && opts?.relations) {
    const seen = new Set<string>()
    for (const t of tasks) {
      for (const otherId of opts.relations.get(t.id)?.related ?? []) {
        if (otherId === t.id || !taskIds.has(otherId)) continue
        const [a, b] = t.id < otherId ? [t.id, otherId] : [otherId, t.id]
        const key = `${a}|${b}`
        if (seen.has(key)) continue
        seen.add(key)
        edges.push({ id: `rel-${a}-${b}`, source: taskNodeId(a), target: taskNodeId(b), style: RELATED_EDGE })
      }
    }
  }

  return { nodes, edges }
}
