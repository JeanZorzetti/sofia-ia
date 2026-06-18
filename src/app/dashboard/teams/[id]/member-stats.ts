// src/app/dashboard/teams/[id]/member-stats.ts
// Teams V2 — fatia S2.1 (Tema D2): PURE per-member aggregation, extracted out of
// MemberActivityPanel.tsx (a 'use client' component) so scripts/v2s4-verify.ts can assert it
// via tsx without dragging React in — same pattern as model-capabilities.ts (S1.2) and
// roster-mapping.ts (S1.3). No React, no DB, no SSE, no side effects.
//
// ⚠️ Key insight (Sessão 4): the per-member data is ALREADY on the client. The SSE stream
// delivers `messages` (appended log) + `tasks` (current snapshot) + `team.members`. S2.1 only
// DERIVES and renders; it adds no route, event or query. The grouping key is `TeamMember.id`
// (what flows in fromMemberId/toMemberId/assigneeId), NOT agentId — the name comes from
// member.agent.name. fromMemberId/toMemberId/assigneeId can all be null (system / synthetic
// lead / unassigned); null never leaks into any member's bucket.

/** Minimal member shape this module needs — structurally satisfied by the client's `Member`
 *  ({ id, role, model, effort, agent: { id, name } }). Extra fields are ignored. */
export interface MemberLike {
  id: string
  role: string
  agent: { name: string }
}

/** Minimal message shape — structurally satisfied by the client's `Msg`. `kind` is a plain
 *  string here (the SSE sends 'message' | 'assignment' | 'review' | 'system'); we bucket
 *  dynamically so a new kind never crashes the aggregation. */
export interface MessageLike {
  id: string
  fromMemberId: string | null
  toMemberId: string | null
  kind: string
  summary: string | null
  content: string
  taskId: string | null
}

/** Minimal task shape — structurally satisfied by the client's `BoardTask`. */
export interface TaskLike {
  id: string
  title: string
  status: string
  assigneeId: string | null
  retryCount: number
}

/** One entry in a member's activity timeline (messages it sent or received, in arrival order). */
export interface TimelineEntry {
  id: string
  kind: string
  /** 'sent' when the member is the author (fromMemberId === memberId), else 'received'. */
  direction: 'sent' | 'received'
  /** The other member id (toMemberId for sent, fromMemberId for received), or null. */
  counterpartId: string | null
  /** Resolved counterpart name, or '—' when the counterpart is null/unknown. */
  counterpartName: string
  /** summary || content (content arrives truncated to 500; summary is the short recap). */
  text: string
  taskId: string | null
}

/** Aggregated activity for a single team member. Every member in the roster gets one of these,
 *  even with zero activity (so an idle member stays visible rather than disappearing). */
export interface MemberStat {
  memberId: string
  name: string
  role: string
  /** Messages authored by this member (fromMemberId === memberId). */
  sent: number
  /** Messages addressed to this member (toMemberId === memberId). */
  received: number
  /** Breakdown of SENT messages by kind (what this member produced). */
  sentByKind: Record<string, number>
  /** Breakdown of RECEIVED messages by kind (what was addressed to this member). */
  receivedByKind: Record<string, number>
  /** Tasks currently assigned to this member (assigneeId === memberId). */
  tasks: TaskLike[]
  /** Count of this member's tasks by status (todo/doing/review/done/rejected/blocked/clarify). */
  tasksByStatus: Record<string, number>
  /** Sum of retryCount across this member's tasks. */
  retries: number
  /** This member's messages (sent + received) in arrival order. */
  timeline: TimelineEntry[]
}

/** Aggregate the SSE-delivered messages/tasks per member. Pure: re-derives on every render,
 *  cheap, persists nothing. Robust to null fromMemberId/toMemberId/assigneeId (they map to no
 *  member, so they never leak into a bucket). */
export function computeMemberStats(
  members: MemberLike[],
  messages: MessageLike[],
  tasks: TaskLike[],
): MemberStat[] {
  const nameById = new Map<string, string>()
  for (const m of members) nameById.set(m.id, m.agent.name)

  // Seed one stat per member so an idle member stays in the list with zeros.
  const stats = new Map<string, MemberStat>()
  for (const m of members) {
    stats.set(m.id, {
      memberId: m.id,
      name: m.agent.name,
      role: m.role,
      sent: 0,
      received: 0,
      sentByKind: {},
      receivedByKind: {},
      tasks: [],
      tasksByStatus: {},
      retries: 0,
      timeline: [],
    })
  }

  const counterpartName = (id: string | null): string =>
    id ? nameById.get(id) ?? '?' : '—'

  // Messages preserve arrival order (the client appends them), so the timeline is in order.
  for (const msg of messages) {
    const from = msg.fromMemberId ? stats.get(msg.fromMemberId) : undefined
    if (from) {
      from.sent++
      from.sentByKind[msg.kind] = (from.sentByKind[msg.kind] ?? 0) + 1
      from.timeline.push({
        id: msg.id,
        kind: msg.kind,
        direction: 'sent',
        counterpartId: msg.toMemberId,
        counterpartName: counterpartName(msg.toMemberId),
        text: msg.summary || msg.content,
        taskId: msg.taskId,
      })
    }
    const to = msg.toMemberId ? stats.get(msg.toMemberId) : undefined
    if (to) {
      to.received++
      to.receivedByKind[msg.kind] = (to.receivedByKind[msg.kind] ?? 0) + 1
      // A self-addressed message (from === to) is already in the timeline as 'sent'; don't
      // double-list it. Otherwise record the received side.
      if (msg.fromMemberId !== msg.toMemberId) {
        to.timeline.push({
          id: msg.id,
          kind: msg.kind,
          direction: 'received',
          counterpartId: msg.fromMemberId,
          counterpartName: counterpartName(msg.fromMemberId),
          text: msg.summary || msg.content,
          taskId: msg.taskId,
        })
      }
    }
  }

  for (const task of tasks) {
    const owner = task.assigneeId ? stats.get(task.assigneeId) : undefined
    if (!owner) continue
    owner.tasks.push(task)
    owner.tasksByStatus[task.status] = (owner.tasksByStatus[task.status] ?? 0) + 1
    owner.retries += task.retryCount
  }

  // Preserve roster order.
  return members.map(m => stats.get(m.id)!)
}
