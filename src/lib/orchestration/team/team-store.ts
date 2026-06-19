// src/lib/orchestration/team/team-store.ts
// Persistence port for the coordinator + the Prisma-backed implementation.
// The coordinator depends ONLY on the TeamStore interface, so it can be
// driven by an in-memory store in tests (no DB mock needed).

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type {
  MemberCtx, TaskRow, MessageRow, TaskStatus, RunStatus, MessageKind, TeamRole, CodeArtifacts,
  CapabilityPolicy,
} from './team-types'
// S2.1: pure derivation of the per-task lifecycle timeline. The store appends an
// event right where it already persists each transition, so the coordinator stays
// byte-identical (see task-history.ts).
import {
  appendTaskEvent, taskCreatedEvent, taskEventFromUpdate, type TaskHistoryEvent,
} from './task-history'

export interface LoadedRun {
  runId: string
  teamId: string
  mission: string
  /** `maxParallel` (G3, graph mode) is OPTIONAL on purpose: the test memory-stores
   *  build `config` as a `{ maxTurns, retryCap }` literal, so widening it with a
   *  REQUIRED field would break their typecheck. The graph coordinator reads
   *  `config.maxParallel ?? <default>`; linear (`runTeam`) ignores it. */
  config: { maxTurns: number; retryCap: number; maxParallel?: number }
  members: MemberCtx[]
}

export interface CreateTaskInput {
  title: string
  body?: string | null
  assigneeId?: string | null
  status?: TaskStatus
  position?: number
  /** G1: real task ids this task depends on (graph mode). Defaults to []. */
  dependsOn?: string[]
  /** S3.2: real task ids this task cross-links to (free `related`). DISPLAY-only,
   *  never gates execution. Defaults to []. */
  related?: string[]
}

export interface UpdateTaskInput {
  status?: TaskStatus
  result?: string | null
  reviewNote?: string | null
  retryCount?: number
  assigneeId?: string | null
  /** Code-run side-channel. Partial so a C3 review-diff write (reviewDiff only)
   *  and a C2.1 command-log write (commands only) are each valid on their own;
   *  the store shallow-merges them so neither clobbers the other. */
  artifacts?: Partial<CodeArtifacts>
}

export interface AddMessageInput {
  fromMemberId?: string | null
  toMemberId?: string | null
  summary?: string | null
  content: string
  kind: MessageKind
  taskId?: string | null
}

export interface FinishRunInput {
  status: RunStatus
  output?: string | null
  turnsUsed: number
  tokensUsed: number
  estimatedCost: number
  durationMs: number
  error?: string | null
}

/**
 * True when `err` is a Postgres foreign-key violation (Prisma P2003) on a
 * team-member reference (`from_member_id` / `to_member_id` / `assignee_id`).
 *
 * Why this exists: a run caches its member ids at `loadRun` and then writes
 * messages/tasks across a long async lifetime. If the roster is edited mid-run
 * (`PATCH /api/teams` replaces members via deleteMany+createMany → new ids) or a
 * member's agent is deleted (cascade), those cached ids vanish and the next
 * insert FK-violates. The schema already declares these refs `onDelete: SetNull`
 * — a missing member is meant to degrade to null, not crash the orchestration —
 * so on this specific error the store retries the write with the member refs
 * nulled. Duck-typed (code+meta) so it's unit-testable without a live client.
 * Narrow on purpose: any OTHER FK (e.g. run_id) or error is rethrown, never masked.
 */
export function isMemberFkViolation(err: unknown): boolean {
  const e = err as { code?: string; meta?: { field_name?: unknown; constraint?: unknown; target?: unknown } }
  if (e?.code !== 'P2003') return false
  const m = e.meta ?? {}
  const target = `${m.field_name ?? ''} ${m.constraint ?? ''} ${Array.isArray(m.target) ? m.target.join(' ') : (m.target ?? '')}`.toLowerCase()
  return target.includes('member') || target.includes('assignee')
}

/** Coerce the `history_events` Json column into the read shape. NULL (legacy task)
 *  or any non-array value → undefined, so a task without a timeline reads exactly
 *  as it did before S2.1. */
function coerceHistory(raw: unknown): TaskHistoryEvent[] | undefined {
  return Array.isArray(raw) ? (raw as TaskHistoryEvent[]) : undefined
}

export interface TeamStore {
  loadRun(runId: string): Promise<LoadedRun | null>
  getRunStatus(runId: string): Promise<RunStatus | null>
  setRunRunning(runId: string): Promise<void>
  finishRun(runId: string, data: FinishRunInput): Promise<void>
  listTasks(runId: string): Promise<TaskRow[]>
  createTask(runId: string, data: CreateTaskInput): Promise<TaskRow>
  updateTask(taskId: string, data: UpdateTaskInput): Promise<void>
  listMessages(runId: string): Promise<MessageRow[]>
  addMessage(runId: string, data: AddMessageInput): Promise<void>
}

function parseConfig(raw: unknown): { maxTurns: number; retryCap: number; maxParallel?: number } {
  const c = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const maxTurns = typeof c.maxTurns === 'number' && c.maxTurns > 0 ? c.maxTurns : 6
  const retryCap = typeof c.retryCap === 'number' && c.retryCap >= 0 ? c.retryCap : 2
  // G3 (graph mode): fan-out cap. Absent → the coordinator falls back to the
  // roster width (`workers.length`). Only a positive number opts into a fixed cap.
  const maxParallel = typeof c.maxParallel === 'number' && c.maxParallel > 0 ? Math.floor(c.maxParallel) : undefined
  return { maxTurns, retryCap, ...(maxParallel !== undefined ? { maxParallel } : {}) }
}

export function createPrismaTeamStore(): TeamStore {
  return {
    async loadRun(runId) {
      const run = await prisma.teamRun.findUnique({
        where: { id: runId },
        include: {
          team: {
            include: {
              members: {
                orderBy: { position: 'asc' },
                include: { agent: { select: { name: true } } },
              },
            },
          },
        },
      })
      if (!run) return null
      return {
        runId: run.id,
        teamId: run.teamId,
        mission: run.mission,
        config: parseConfig(run.team.config),
        members: run.team.members.map(m => ({
          id: m.id,
          agentId: m.agentId,
          agentName: m.agent.name,
          role: m.role as TeamRole,
          model: m.model,
          effort: m.effort,
          // S1.1: per-member capability policy. The column is a Json blob; coerce to
          // the policy shape (null when unset → legacy behavior downstream).
          capabilities: (m.capabilities ?? null) as CapabilityPolicy | null,
          // V2.1 S3.1: per-member workflow instruction. Null → legacy (Agent prompt only).
          workflow: m.workflow ?? null,
        })),
      }
    },

    async getRunStatus(runId) {
      const r = await prisma.teamRun.findUnique({ where: { id: runId }, select: { status: true } })
      return (r?.status as RunStatus) ?? null
    },

    async setRunRunning(runId) {
      await prisma.teamRun.update({ where: { id: runId }, data: { status: 'running' } })
    },

    async finishRun(runId, data) {
      await prisma.teamRun.update({
        where: { id: runId },
        data: {
          status: data.status,
          output: data.output ?? null,
          error: data.error ?? null,
          turnsUsed: data.turnsUsed,
          tokensUsed: data.tokensUsed,
          estimatedCost: data.estimatedCost,
          durationMs: data.durationMs,
          completedAt: new Date(),
        },
      })
    },

    async listTasks(runId) {
      const rows = await prisma.teamTask.findMany({
        where: { runId },
        orderBy: { position: 'asc' },
      })
      return rows.map(t => ({
        id: t.id, title: t.title, body: t.body, status: t.status as TaskStatus,
        assigneeId: t.assigneeId, result: t.result, reviewNote: t.reviewNote,
        retryCount: t.retryCount, position: t.position, dependsOn: t.dependsOn,
        related: t.related,
        historyEvents: coerceHistory(t.historyEvents),
      }))
    },

    async createTask(runId, data) {
      const count = await prisma.teamTask.count({ where: { runId } })
      const status = data.status ?? 'todo'
      const assigneeId = data.assigneeId ?? null
      // S2.1: seed the timeline with `task_created` (coordinator unchanged — the
      // event is derived here from the data the store already receives).
      const seedHistory = (aid: string | null): Prisma.InputJsonValue =>
        [taskCreatedEvent({ assigneeId: aid, status }, new Date().toISOString())] as unknown as Prisma.InputJsonValue
      const base = {
        runId,
        title: data.title.slice(0, 500),
        body: data.body ?? null,
        assigneeId,
        status,
        position: data.position ?? count,
        dependsOn: data.dependsOn ?? [],
        related: data.related ?? [],
        historyEvents: seedHistory(assigneeId),
      }
      let t
      try {
        t = await prisma.teamTask.create({ data: base })
      } catch (err) {
        // Assignee deleted mid-run (roster edited / agent cascade) → create it
        // unassigned (matching `onDelete: SetNull`) instead of crashing the run.
        if (!isMemberFkViolation(err)) throw err
        console.warn('[TeamStore] createTask: assignee no longer exists, creating task unassigned')
        t = await prisma.teamTask.create({ data: { ...base, assigneeId: null, historyEvents: seedHistory(null) } })
      }
      return {
        id: t.id, title: t.title, body: t.body, status: t.status as TaskStatus,
        assigneeId: t.assigneeId, result: t.result, reviewNote: t.reviewNote,
        retryCount: t.retryCount, position: t.position, dependsOn: t.dependsOn,
        related: t.related,
        historyEvents: coerceHistory(t.historyEvents),
      }
    },

    async updateTask(taskId, data) {
      // `artifacts` is a Prisma Json column; only touch it when explicitly provided
      // (undefined = leave as-is, so chat-runs never write the field).
      const { artifacts, ...rest } = data
      const onlyReviewDiff = artifacts !== undefined && artifacts.commands === undefined && artifacts.reviewDiff !== undefined
      // We must read the prior row to (a) shallow-merge a reviewDiff-only artifacts
      // write (C3) and/or (b) derive the S2.1 lifecycle event for a status/owner
      // transition. Fetch once, only when one of those applies (a pure result/retry
      // write needs no read — same as before).
      const needsPrev = onlyReviewDiff || data.status !== undefined || data.assigneeId !== undefined
      const prev = needsPrev
        ? await prisma.teamTask.findUnique({
            where: { id: taskId },
            select: { status: true, assigneeId: true, artifacts: true, historyEvents: true },
          })
        : null

      let artifactsData: Prisma.InputJsonValue | undefined
      if (artifacts !== undefined) {
        // C3: a review-diff write must NOT clobber the command log the code-agent
        // already streamed (C2.1), and vice-versa. Shallow-merge with the current
        // artifacts so each key (`commands` / `reviewDiff`) is preserved.
        if (onlyReviewDiff) {
          const prevArt = (prev?.artifacts && typeof prev.artifacts === 'object' ? prev.artifacts : {}) as Record<string, unknown>
          artifactsData = { ...prevArt, reviewDiff: artifacts.reviewDiff } as unknown as Prisma.InputJsonValue
        } else {
          artifactsData = artifacts as unknown as Prisma.InputJsonValue
        }
      }

      // S2.1: append the lifecycle event for this transition. `taskEventFromUpdate`
      // returns null when the update isn't a trackable transition (e.g. a reviewDiff-
      // or retryCount-only write) → historyEvents left untouched (run stays identical).
      let historyData: Prisma.InputJsonValue | undefined
      if (prev) {
        const event = taskEventFromUpdate(
          { status: prev.status, assigneeId: prev.assigneeId },
          { status: data.status, assigneeId: data.assigneeId },
          new Date().toISOString(),
        )
        if (event) {
          historyData = appendTaskEvent(prev.historyEvents, event) as unknown as Prisma.InputJsonValue
        }
      }

      await prisma.teamTask.update({
        where: { id: taskId },
        data: {
          ...rest,
          ...(artifactsData !== undefined ? { artifacts: artifactsData } : {}),
          ...(historyData !== undefined ? { historyEvents: historyData } : {}),
        },
      })
    },

    async listMessages(runId) {
      const rows = await prisma.teamMessage.findMany({
        where: { runId },
        orderBy: { createdAt: 'asc' },
      })
      return rows.map(m => ({
        id: m.id, fromMemberId: m.fromMemberId, toMemberId: m.toMemberId,
        summary: m.summary, content: m.content, kind: m.kind as MessageKind, taskId: m.taskId,
      }))
    },

    async addMessage(runId, data) {
      const base = {
        runId,
        fromMemberId: data.fromMemberId ?? null,
        toMemberId: data.toMemberId ?? null,
        summary: data.summary ?? null,
        content: data.content,
        kind: data.kind,
        taskId: data.taskId ?? null,
      }
      try {
        await prisma.teamMessage.create({ data: base })
      } catch (err) {
        // from/to member deleted mid-run (roster edited / agent cascade). The
        // message is a best-effort activity log whose member refs are SetNull —
        // retry with them nulled so a roster change can't crash the whole run.
        if (!isMemberFkViolation(err)) throw err
        console.warn('[TeamStore] addMessage: member ref no longer exists, logging without member attribution')
        await prisma.teamMessage.create({ data: { ...base, fromMemberId: null, toMemberId: null } })
      }
    },
  }
}
