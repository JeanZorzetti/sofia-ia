// src/lib/orchestration/team/task-event-view.ts
// PURE read-side formatting for the per-task lifecycle timeline (Teams V2.1 — S2.2).
//
// S2.1 persists the events (shape in task-history.ts); the SSE route ships them to
// the client; this maps each `TaskHistoryEvent` to a human label + tone + icon KEY.
// Kept pure (no React, no DB) so scripts/v21s4-verify.ts can assert it directly —
// the component owns only the iconKey→lucide-component and actor-name lookups, which
// need React/team context and aren't testable here. Same pattern as task-history.ts.

import type { TaskEventType, TaskHistoryEvent } from './task-history'

/** Board/task status (todo/doing/review/done/rejected) → pt-BR label. */
const TASK_STATUS_LABELS: Record<string, string> = {
  todo: 'A fazer',
  doing: 'Fazendo',
  review: 'Review',
  done: 'Concluído',
  rejected: 'Rejeitado',
}

/** pt-BR label for a task status, falling back to the raw value for the unknown. */
export function taskStatusLabel(status: unknown): string {
  return typeof status === 'string' ? (TASK_STATUS_LABELS[status] ?? status) : '—'
}

/** Icon key — the component maps it to a lucide component (not pure-testable). */
export type TaskEventIconKey =
  | 'created' | 'status' | 'owner' | 'review_requested' | 'approved' | 'changes'

export interface TaskEventView {
  /** Human, self-contained label (status transitions embed `from → to`). */
  label: string
  /** Tailwind text-color class for the row's icon/accent. */
  tone: string
  iconKey: TaskEventIconKey
}

const BASE: Record<TaskEventType, { tone: string; iconKey: TaskEventIconKey }> = {
  task_created: { tone: 'text-white/50', iconKey: 'created' },
  status_changed: { tone: 'text-blue-400', iconKey: 'status' },
  owner_changed: { tone: 'text-amber-400', iconKey: 'owner' },
  review_requested: { tone: 'text-purple-400', iconKey: 'review_requested' },
  review_approved: { tone: 'text-emerald-400', iconKey: 'approved' },
  review_changes_requested: { tone: 'text-red-400', iconKey: 'changes' },
}

/**
 * Map a persisted lifecycle event to its display view. The label is self-contained
 * except for member NAMES (owner_changed's new owner) — the component appends those
 * since they need the team roster. `from`/`to` for a status change come off `detail`.
 */
export function taskEventView(event: TaskHistoryEvent): TaskEventView {
  const base = BASE[event.type] ?? { tone: 'text-white/50', iconKey: 'status' as const }
  const detail = (event.detail ?? {}) as Record<string, unknown>

  let label: string
  switch (event.type) {
    case 'task_created':
      label = 'Task criada'
      break
    case 'status_changed':
      label = `${taskStatusLabel(detail.from)} → ${taskStatusLabel(detail.to)}`
      break
    case 'owner_changed':
      // First assignment vs reassignment; the component appends the new owner's name.
      label = detail.from == null ? 'Atribuída a' : 'Reatribuída para'
      break
    case 'review_requested':
      label = 'Enviada para review'
      break
    case 'review_approved':
      label = 'Aprovada no review'
      break
    case 'review_changes_requested':
      label = 'Mudanças solicitadas'
      break
    default:
      label = event.type
  }

  return { label, tone: base.tone, iconKey: base.iconKey }
}
