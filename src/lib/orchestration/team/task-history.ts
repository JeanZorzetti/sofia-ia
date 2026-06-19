// src/lib/orchestration/team/task-history.ts
// PURE helpers for the per-task lifecycle timeline (Teams V2.1 — S2.1, Tema E).
//
// The coordinator already drives EVERY status/owner/review transition through
// `store.createTask` / `store.updateTask` (see team-coordinator.ts). This module
// derives an append-only history event from each transition WITHOUT the coordinator
// knowing about it — the Prisma store calls these helpers right where it already
// persists the transition, so `team-coordinator.ts` stays byte-identical.
//
// Everything here is pure (no DB/IO) so scripts/v21s4-verify.ts can assert it
// directly (no jest — OneDrive errno -4094), same pattern as model-capabilities.ts
// / cli-tool-flags.ts / team-board.ts.

export type TaskEventType =
  | 'task_created'
  | 'status_changed'
  | 'owner_changed'
  | 'review_requested'
  | 'review_approved'
  | 'review_changes_requested'

export interface TaskHistoryEvent {
  type: TaskEventType
  /** TeamMember id of who acted, OR a role sentinel when the acting member id is
   *  not derivable from the task row alone. The store-level plumbing only knows the
   *  task's assignee — not the lead/reviewer ids — so lead- and reviewer-driven
   *  transitions are attributed to ACTOR_LEAD / ACTOR_REVIEWER. */
  actor: string
  /** ISO-8601 timestamp. */
  at: string
  /** Transition payload, e.g. `{ from, to }` for a status change. */
  detail?: Record<string, unknown>
}

/** Actor sentinels for transitions whose acting member isn't on the task row.
 *  (Sentinels, never a real `TeamMember.id` — uuids never collide with these.) */
export const ACTOR_LEAD = 'lead'
export const ACTOR_REVIEWER = 'reviewer'

/** Prior task state the store reads before an update, to diff the transition. */
export interface TaskEventPrev {
  status: string
  assigneeId: string | null
}

/** The subset of an update that can be a trackable transition. */
export interface TaskEventUpdate {
  status?: string
  assigneeId?: string | null
}

/**
 * Immutable append. `history` is whatever the `history_events` Json column held —
 * possibly `null` (legacy task) or, defensively, a non-array — so coerce to `[]`
 * before appending. The original array is never mutated.
 */
export function appendTaskEvent(history: unknown, event: TaskHistoryEvent): TaskHistoryEvent[] {
  const prev = Array.isArray(history) ? (history as TaskHistoryEvent[]) : []
  return [...prev, event]
}

/** Event for a freshly-created task. Creation is always trackable. */
export function taskCreatedEvent(
  input: { assigneeId?: string | null; status?: string },
  at: string,
): TaskHistoryEvent {
  return {
    type: 'task_created',
    actor: ACTOR_LEAD, // the Lead seeds the board (and the anti-stall sentinel is system → lead)
    at,
    detail: {
      status: input.status ?? 'todo',
      ...(input.assigneeId ? { assigneeId: input.assigneeId } : {}),
    },
  }
}

/**
 * Derive the lifecycle event for a task UPDATE, or `null` when the update is not a
 * trackable transition (e.g. a reviewDiff-/result-/retryCount-only write — exactly
 * the writes the coordinator does that must NOT pollute the timeline).
 *
 * Priority: a status transition first (review verdicts are the transitions that
 * LEAVE 'review', disambiguated by `prev.status === 'review'`), then a pure owner
 * change. In the real coordinator status and assignee never change in the same
 * `updateTask` call, so this ordering only matters defensively.
 */
export function taskEventFromUpdate(
  prev: TaskEventPrev,
  data: TaskEventUpdate,
  at: string,
): TaskHistoryEvent | null {
  const statusChanged = data.status !== undefined && data.status !== prev.status
  const assigneeChanged = data.assigneeId !== undefined && data.assigneeId !== prev.assigneeId

  if (statusChanged) {
    const from = prev.status
    const to = data.status!
    const detail: Record<string, unknown> = { from, to }

    // Review verdicts: the only transitions OUT of 'review'.
    if (from === 'review') {
      if (to === 'done') return { type: 'review_approved', actor: ACTOR_REVIEWER, at, detail }
      // review → todo (retry) or review → rejected (cap exhausted): both "changes requested".
      return { type: 'review_changes_requested', actor: ACTOR_REVIEWER, at, detail }
    }
    // Worker delivered the task for review.
    if (to === 'review') {
      return { type: 'review_requested', actor: prev.assigneeId ?? ACTOR_LEAD, at, detail }
    }
    // Everything else (todo→doing start, doing→done with no reviewer, …) is a plain
    // status change, attributed to the assignee carrying the task.
    return {
      type: 'status_changed',
      actor: data.assigneeId ?? prev.assigneeId ?? ACTOR_LEAD,
      at,
      detail,
    }
  }

  if (assigneeChanged) {
    return {
      type: 'owner_changed',
      actor: ACTOR_LEAD,
      at,
      detail: { from: prev.assigneeId, to: data.assigneeId ?? null },
    }
  }

  return null
}
