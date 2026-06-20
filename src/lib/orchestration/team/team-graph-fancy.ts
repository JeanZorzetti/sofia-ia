// src/lib/orchestration/team/team-graph-fancy.ts
//
// "Visualizar" (expanded) graph builder — a richer, mission-console / constellation
// styled React Flow graph used ONLY by TeamGraphView.tsx (the fullscreen modal).
// The compact sidebar (TeamGraph.tsx) keeps using the original `buildTeamGraph`,
// which is left 100% untouched (its v22s5/g4/g5 verify invariants still hold).
//
// This is an ORIGINAL implementation — no third-party graph engine, only
// @xyflow/react (already a dep). It emits custom node `type`s ('member' | 'task')
// rendered by graph-parts.tsx, plus a custom 'handoff' edge that draws the live
// signal pulse. Kept pure (type-only @xyflow import, no React/DOM) so
// scripts/graph-fancy-verify.ts can assert the contract directly.
import type { Node, Edge } from '@xyflow/react'
import type { GraphMember, GraphTask, GraphUsage, GraphRelations } from './team-graph-view'

// Re-export the shared input types so the modal/verify import from one place.
export type { GraphMember, GraphTask, GraphUsage, GraphRelations } from './team-graph-view'

// Semantic, role/state-driven palette ("deep-space ops console"). Single source
// of truth shared with the node/edge components in graph-parts.tsx — colors map
// to MEANING (role / status), not decoration.
export const GRAPH_COLORS = {
  lead: '#f5b942', // gold — authority (the crown node)
  worker: '#38e1ff', // cyan — the holographic working signal
  reviewer: '#a78bfa', // violet — judgment
  signal: '#22d3ee', // the live handoff pulse
  status: {
    todo: 'rgba(226,232,252,0.45)',
    doing: '#3b82f6',
    review: '#a855f7',
    done: '#10b981',
    rejected: '#ef4444',
    blocked: '#f59e0b',
  } as Record<string, string>,
  depend: '#f59e0b', // dependency edge (amber)
  related: '#a855f7', // related cross-link (violet)
  edge: 'rgba(150,180,230,0.22)', // subtle structural edges
} as const

export interface FancyGraphOpts {
  handoff?: { fromMemberId: string; toMemberId: string } | null
  running?: boolean
  usageByMember?: GraphUsage[]
  relations?: Map<string, GraphRelations>
}

// `data` payloads consumed by the custom node components (graph-parts.tsx).
export interface FancyMemberData {
  kind: 'member'
  role: string
  name: string
  active: boolean
  thinking: boolean
  tokensLabel: string | null
  [k: string]: unknown
}
export interface FancyTaskData {
  kind: 'task'
  title: string
  status: string
  statusLabel: string
  blocked: boolean
  reviewerName: string | null
  ownerName: string | null
  [k: string]: unknown
}

export interface FancyTeamGraph { nodes: Node[]; edges: Edge[] }

// Layout is deterministic top-down (lead centered → workers row → reviewer →
// task columns under each owner). Deterministic on purpose: tasks stream in
// during a live run, and a force simulation would make every node jump on each
// board update. The bigger console cards just get more breathing room than the
// compact sidebar.
const NODE_W = 184
const TASK_W = 168
const COL_GAP = 248
const ROW_LEAD = 0
const ROW_WORKER = 190
const ROW_REVIEWER = 400
const TASK_BASE = 520
const TASK_GAP = 58
const UNASSIGNED_X = -COL_GAP // tasks with no owner cluster to the left

const STATUS_LABEL: Record<string, string> = {
  todo: 'A fazer', doing: 'Fazendo', review: 'Em review', done: 'Concluído',
  rejected: 'Rejeitado', blocked: 'Bloqueado',
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M tok`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k tok`
  return `${n} tok`
}

const taskNodeId = (id: string) => `task-${id}`

function topoEdge(id: string, source: string, target: string, handoff: boolean, animated: boolean): Edge {
  // The live handoff edge becomes a custom 'handoff' edge (the signal pulse).
  if (handoff) return { id, source, target, type: 'handoff' }
  return { id, source, target, animated, style: { stroke: GRAPH_COLORS.edge, strokeWidth: 1.25 } }
}

/**
 * Build the enriched "Visualizar" graph for a team run.
 *
 * - One member node (`type:'member'`) per member with role accent + active glow,
 *   `thinking` while it is the live worker, and the run token total.
 * - One task node (`type:'task'`) per task, stacked under its owner, colored by
 *   status, with a blocked lock + a reviewer chip while in review.
 * - Edges: member↔member topology (the one matching the live handoff becomes the
 *   custom `handoff` pulse edge), owner→task, task→task dependency (amber dashed)
 *   and symmetric `related` cross-links (violet dashed).
 */
export function buildFancyTeamGraph(
  members: GraphMember[],
  tasks: GraphTask[],
  activeId: string | null,
  opts?: FancyGraphOpts,
): FancyTeamGraph {
  const running = !!opts?.running
  const hf = opts?.handoff ?? null
  const isHandoff = (s: string, t: string) =>
    running && hf != null && hf.fromMemberId === s && hf.toMemberId === t

  const lead = members.find(m => m.role === 'lead')
  const workers = members.filter(m => m.role === 'worker')
  const reviewer = members.find(m => m.role === 'reviewer')
  const reviewerName = reviewer?.name ?? null

  const usageMap = new Map<string, number>()
  for (const u of opts?.usageByMember ?? []) {
    if (u.memberId) usageMap.set(u.memberId, (usageMap.get(u.memberId) ?? 0) + u.tokens)
  }
  const tokensLabelOf = (id: string) => (usageMap.has(id) ? fmtTokens(usageMap.get(id)!) : null)
  const memberName = new Map(members.map(m => [m.id, m.name]))

  const totalW = Math.max(workers.length, 1) * COL_GAP
  const centerX = totalW / 2 - NODE_W / 2

  const nodes: Node[] = []
  const edges: Edge[] = []
  const memberX = new Map<string, number>()

  const pushMember = (m: GraphMember, role: string, x: number, y: number) => {
    const active = m.id === activeId
    memberX.set(m.id, x)
    const data: FancyMemberData = {
      kind: 'member', role, name: m.name, active,
      thinking: running && active, tokensLabel: tokensLabelOf(m.id),
    }
    nodes.push({ id: m.id, type: 'member', position: { x, y }, data, style: { width: NODE_W }, draggable: false, selectable: true })
  }

  if (lead) pushMember(lead, 'lead', centerX, ROW_LEAD)
  workers.forEach((w, i) => {
    pushMember(w, 'worker', i * COL_GAP, ROW_WORKER)
    if (lead) {
      const hand = isHandoff(lead.id, w.id)
      edges.push(topoEdge(`l-${w.id}`, lead.id, w.id, hand, hand || w.id === activeId))
    }
    if (reviewer) {
      const hand = isHandoff(w.id, reviewer.id)
      edges.push(topoEdge(`${w.id}-r`, w.id, reviewer.id, hand, hand || w.id === activeId))
    }
  })
  if (reviewer) pushMember(reviewer, 'reviewer', centerX, ROW_REVIEWER)

  // ── tasks: one node each, stacked in a column under the owner ──
  const memberIds = new Set(members.map(m => m.id))
  const taskIds = new Set(tasks.map(t => t.id))
  const colCount = new Map<number, number>()
  for (const t of tasks) {
    const owned = t.assigneeId != null && memberIds.has(t.assigneeId)
    const colX = owned ? (memberX.get(t.assigneeId!) ?? UNASSIGNED_X) : UNASSIGNED_X
    const k = colCount.get(colX) ?? 0
    colCount.set(colX, k + 1)
    const ownerName = owned ? (memberName.get(t.assigneeId!) ?? null) : null
    const reviewerChip = t.status === 'review' ? reviewerName : null
    const data: FancyTaskData = {
      kind: 'task', title: t.title, status: t.status,
      statusLabel: STATUS_LABEL[t.status] ?? t.status,
      blocked: t.status === 'blocked', reviewerName: reviewerChip, ownerName,
    }
    nodes.push({
      id: taskNodeId(t.id), type: 'task',
      position: { x: colX + (NODE_W - TASK_W) / 2, y: TASK_BASE + k * TASK_GAP },
      data, style: { width: TASK_W }, draggable: false, selectable: true,
    })
    if (owned) {
      edges.push({ id: `o-${t.id}`, source: t.assigneeId!, target: taskNodeId(t.id), style: { stroke: GRAPH_COLORS.edge } })
    }
    for (const depId of t.dependsOn ?? []) {
      if (!taskIds.has(depId)) continue
      edges.push({
        id: `d-${depId}-${t.id}`, source: taskNodeId(depId), target: taskNodeId(t.id),
        animated: true, style: { stroke: GRAPH_COLORS.depend, strokeDasharray: '5 4', strokeWidth: 1.5 },
      })
    }
  }

  // ── symmetric `related` cross-links (de-duped by unordered pair) ──
  if (opts?.relations) {
    const seen = new Set<string>()
    for (const t of tasks) {
      for (const otherId of opts.relations.get(t.id)?.related ?? []) {
        if (otherId === t.id || !taskIds.has(otherId)) continue
        const [a, b] = t.id < otherId ? [t.id, otherId] : [otherId, t.id]
        const key = `${a}|${b}`
        if (seen.has(key)) continue
        seen.add(key)
        edges.push({ id: `rel-${a}-${b}`, source: taskNodeId(a), target: taskNodeId(b), style: { stroke: GRAPH_COLORS.related, strokeDasharray: '2 4', strokeWidth: 1.25 } })
      }
    }
  }

  return { nodes, edges }
}
