// src/lib/orchestration/team/create-team.ts
// Shared team creation used by POST /api/teams and POST /api/teams/magic-create.
import { prisma } from '@/lib/prisma'
import { validateRoster, type RosterInput } from './team-roster'

export interface CreateTeamInput {
  name?: string
  description?: string | null
  config?: Record<string, unknown>
  members?: RosterInput[]
  userId: string
}

/**
 * Validates name + roster + agent existence, then creates the Team with members.
 * Returns a discriminated result; callers map the error to the HTTP status they want
 * (POST /api/teams → 400; magic-create → 422).
 */
export async function createTeamWithRoster(input: CreateTeamInput) {
  if (!input.name?.trim()) {
    return { ok: false as const, error: 'Nome é obrigatório' }
  }

  const members = input.members ?? []
  const rosterError = validateRoster(members)
  if (rosterError) return { ok: false as const, error: rosterError }

  // Verify all referenced agents exist (agents are shared across the app).
  const agentIds = [...new Set(members.map(m => m.agentId))]
  const existing = await prisma.agent.count({ where: { id: { in: agentIds } } })
  if (existing !== agentIds.length) {
    return { ok: false as const, error: 'Algum agente selecionado não existe' }
  }

  const team = await prisma.team.create({
    data: {
      name: input.name.trim(),
      description: input.description ?? null,
      config: (input.config ?? {}) as object,
      createdBy: input.userId,
      members: {
        create: members.map((m, i) => ({
          agentId: m.agentId,
          role: m.role,
          model: m.model ?? null,
          effort: m.effort ?? null,
          position: m.position ?? i,
          // S1.3: persist the policy when present; omit (→ SQL NULL = legacy) otherwise.
          // `as object` mirrors the `config` cast above (Prisma Json input).
          capabilities: m.capabilities ? (m.capabilities as object) : undefined,
          // S3.1: persist the workflow when non-empty; omit (→ SQL NULL = legacy) otherwise.
          workflow: m.workflow?.trim() ? m.workflow.trim() : undefined,
        })),
      },
    },
    include: { members: { include: { agent: { select: { name: true } } }, orderBy: { position: 'asc' } } },
  })
  return { ok: true as const, team }
}
