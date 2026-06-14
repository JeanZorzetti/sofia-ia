// src/lib/orchestration/team/team-store.ts
// Persistence port for the coordinator + the Prisma-backed implementation.
// The coordinator depends ONLY on the TeamStore interface, so it can be
// driven by an in-memory store in tests (no DB mock needed).

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type {
  MemberCtx, TaskRow, MessageRow, TaskStatus, RunStatus, MessageKind, TeamRole, CodeArtifacts,
} from './team-types'

export interface LoadedRun {
  runId: string
  teamId: string
  mission: string
  config: { maxTurns: number; retryCap: number }
  members: MemberCtx[]
}

export interface CreateTaskInput {
  title: string
  body?: string | null
  assigneeId?: string | null
  status?: TaskStatus
  position?: number
}

export interface UpdateTaskInput {
  status?: TaskStatus
  result?: string | null
  reviewNote?: string | null
  retryCount?: number
  assigneeId?: string | null
  /** Code-run side-channel (commands executed in the sandbox). */
  artifacts?: CodeArtifacts
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

function parseConfig(raw: unknown): { maxTurns: number; retryCap: number } {
  const c = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const maxTurns = typeof c.maxTurns === 'number' && c.maxTurns > 0 ? c.maxTurns : 6
  const retryCap = typeof c.retryCap === 'number' && c.retryCap >= 0 ? c.retryCap : 2
  return { maxTurns, retryCap }
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
        retryCount: t.retryCount, position: t.position,
      }))
    },

    async createTask(runId, data) {
      const count = await prisma.teamTask.count({ where: { runId } })
      const t = await prisma.teamTask.create({
        data: {
          runId,
          title: data.title.slice(0, 500),
          body: data.body ?? null,
          assigneeId: data.assigneeId ?? null,
          status: data.status ?? 'todo',
          position: data.position ?? count,
        },
      })
      return {
        id: t.id, title: t.title, body: t.body, status: t.status as TaskStatus,
        assigneeId: t.assigneeId, result: t.result, reviewNote: t.reviewNote,
        retryCount: t.retryCount, position: t.position,
      }
    },

    async updateTask(taskId, data) {
      // `artifacts` is a Prisma Json column; only touch it when explicitly provided
      // (undefined = leave as-is, so chat-runs never write the field).
      const { artifacts, ...rest } = data
      await prisma.teamTask.update({
        where: { id: taskId },
        data: {
          ...rest,
          ...(artifacts !== undefined
            ? { artifacts: artifacts as unknown as Prisma.InputJsonValue }
            : {}),
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
      await prisma.teamMessage.create({
        data: {
          runId,
          fromMemberId: data.fromMemberId ?? null,
          toMemberId: data.toMemberId ?? null,
          summary: data.summary ?? null,
          content: data.content,
          kind: data.kind,
          taskId: data.taskId ?? null,
        },
      })
    },
  }
}
