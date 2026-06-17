// src/lib/orchestration/team/team-graph-agenda.ts
// G2 — agenda state-machine. Pure (no I/O): derives, per task, WHAT to do next
// (`nextAction`) and WHO acts (`actionOwner`). Conceptually ported from
// agent-teams-ai's `agenda.js` (its `buildAgendaItem` derives the same
// nextAction/actionOwner), adapted to Polaris's `TaskStatus` + `dependsOn` DAG.
//
// The graph loop (team-graph-coordinator) routes each bucket to its owner instead
// of running fixed phases. The derivation is behaviour-preserving: it reproduces
// the exact gating/execution/review decisions the G1 loop made inline, so a graph
// run settles to the SAME terminal state (the hard-regression invariant).
import type { AgendaItem, TaskAction, TaskActionOwner, TaskRow } from './team-types'
import { depsSatisfied } from './team-board'

/**
 * Derive the next action + owner for a single task, given the current board.
 *
 * Priority (terminal FIRST — G1 never touches `done`/`rejected`, and a `done`
 * task can carry a stale `reviewNote`, so short-circuiting here avoids ever
 * re-running it):
 *   1. `done` / `rejected`            → terminal      (owner none)
 *   2. `review`                       → review        (owner reviewer)
 *   3. `clarify` (G6)                 → clarify       (owner lead) — a Worker asked
 *      a question and parked here; the Lead answers (escalation). Non-terminal, so
 *      `isBoardSettled` keeps the run alive until it's answered (or maxTurns).
 *   4. deps not all `done`            → wait_dependency(owner none → parked `blocked`)
 *   5. no `assigneeId`                → assign_owner  (owner lead)
 *   6. `reviewNote` + `retryCount>0`  → apply_changes (owner = assignee) — the
 *      review re-queued it as `todo`; apply_changes is DERIVED from that, not a
 *      new status. Same worker path as execute.
 *   7. otherwise (todo/doing/blocked, deps done, owned) → execute (owner = assignee)
 */
export function deriveTaskAction(task: TaskRow, board: TaskRow[]): { nextAction: TaskAction; actionOwner: TaskActionOwner } {
  if (task.status === 'done' || task.status === 'rejected') {
    return { nextAction: 'terminal', actionOwner: 'none' }
  }
  if (task.status === 'review') {
    return { nextAction: 'review', actionOwner: 'reviewer' }
  }
  if (task.status === 'clarify') {
    return { nextAction: 'clarify', actionOwner: 'lead' }
  }
  if (!depsSatisfied(task, board)) {
    return { nextAction: 'wait_dependency', actionOwner: 'none' }
  }
  if (!task.assigneeId) {
    return { nextAction: 'assign_owner', actionOwner: 'lead' }
  }
  if (task.reviewNote != null && task.retryCount > 0) {
    return { nextAction: 'apply_changes', actionOwner: 'owner' }
  }
  return { nextAction: 'execute', actionOwner: 'owner' }
}

/** Classify every task on the board into an agenda item, in board order. The
 *  loop filters this by `nextAction` to route each bucket to its owner. */
export function buildAgenda(board: TaskRow[]): AgendaItem[] {
  return board.map(task => ({ task, ...deriveTaskAction(task, board) }))
}
