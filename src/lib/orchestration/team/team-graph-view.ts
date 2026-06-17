// src/lib/orchestration/team/team-graph-view.ts
//
// G4 — pure builder for the Teams execution graph (viz layer).
//
// Turns the live board (members + tasks) into React Flow `{ nodes, edges }` with
// NO React/DOM and NO @xyflow/react runtime dependency (only type-only imports,
// which esbuild/tsx erase) so `scripts/g4-verify.ts` can assert on it directly.
// `TeamGraph.tsx` is a thin renderer that just passes this output to <ReactFlow>.
//
// Invariant: engine is UNTOUCHED — this is pure visualization. The graph is
// BOARD-DRIVEN (renders task nodes whenever the board has tasks, linear or graph);
// a linear run simply has empty `dependsOn` so it grows zero task→task edges.
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

function taskLabel(t: GraphTask, reviewerName: string | null): string {
  const badge = t.status === 'blocked' ? '🔒 ' : ''
  const chip = reviewerName ? ` · 🛡 ${reviewerName}` : ''
  return `${badge}${t.title}${chip}`
}

const SUBTLE_EDGE = { stroke: 'rgba(255,255,255,0.2)' }
const OWNER_EDGE = { stroke: 'rgba(255,255,255,0.25)' }
const DEP_EDGE = { stroke: 'rgba(245,158,11,0.55)', strokeDasharray: '5 4' } // amber dependency

const taskNodeId = (id: string) => `task-${id}`

/**
 * Build the React Flow graph for a team run.
 *
 * - One member node per member (lead/worker/reviewer rows, active highlight).
 * - One task node per task, stacked under its owner, colored by status, with a
 *   🔒 blocked badge and a 🛡 reviewer chip while the task is in review.
 * - Edges: member↔member (existing topology), owner→task (ownership),
 *   task→task (dependency, from each id in `dependsOn`).
 */
export function buildTeamGraph(
  members: GraphMember[],
  tasks: GraphTask[],
  activeId: string | null,
): TeamGraphData {
  const lead = members.find(m => m.role === 'lead')
  const workers = members.filter(m => m.role === 'worker')
  const reviewer = members.find(m => m.role === 'reviewer')
  const reviewerName = reviewer?.name ?? null

  const totalW = Math.max(workers.length, 1) * GAP_X
  const centerX = totalW / 2 - NODE_W / 2

  const nodes: Node[] = []
  const edges: Edge[] = []

  // ── members (same hardcoded topology as before) ──
  const memberX = new Map<string, number>()
  if (lead) {
    memberX.set(lead.id, centerX)
    nodes.push({
      id: lead.id, position: { x: centerX, y: ROW_LEAD_Y },
      data: { kind: 'member', label: memberLabel('lead', lead.name) },
      style: memberStyle(lead.id === activeId), draggable: false, selectable: false,
    })
  }
  workers.forEach((w, i) => {
    const x = i * GAP_X
    memberX.set(w.id, x)
    nodes.push({
      id: w.id, position: { x, y: ROW_WORKER_Y },
      data: { kind: 'member', label: memberLabel('worker', w.name) },
      style: memberStyle(w.id === activeId), draggable: false, selectable: false,
    })
    if (lead) edges.push({ id: `l-${w.id}`, source: lead.id, target: w.id, animated: w.id === activeId, style: SUBTLE_EDGE })
    if (reviewer) edges.push({ id: `${w.id}-r`, source: w.id, target: reviewer.id, animated: w.id === activeId, style: SUBTLE_EDGE })
  })
  if (reviewer) {
    memberX.set(reviewer.id, centerX)
    nodes.push({
      id: reviewer.id, position: { x: centerX, y: ROW_REVIEWER_Y },
      data: { kind: 'member', label: memberLabel('reviewer', reviewer.name) },
      style: memberStyle(reviewer.id === activeId), draggable: false, selectable: false,
    })
    if (lead) edges.push({ id: `r-l`, source: reviewer.id, target: lead.id, animated: reviewer.id === activeId, style: { stroke: 'rgba(255,255,255,0.12)', strokeDasharray: '4 4' } })
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
    nodes.push({
      id: taskNodeId(t.id),
      position: { x: colX, y: TASK_BASE_Y + k * TASK_GAP_Y },
      data: {
        kind: 'task',
        label: taskLabel(t, showReviewer),
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

  return { nodes, edges }
}
