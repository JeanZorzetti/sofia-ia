// src/lib/orchestration/team/instantiate-roster.ts
// Shared "create N Agents + create Team" path used by magic-create (SP1) and
// template deploy (SP5). Callers pass member specs WITHOUT agentId — this
// creates one Agent per member, then delegates to createTeamWithRoster.
import { prisma } from '@/lib/prisma'
import { createTeamWithRoster } from './create-team'
import type { RosterInput } from './team-roster'

export interface RosterMemberSpec {
  role: string
  name: string
  systemPrompt: string
  model: string
}

export interface InstantiateRosterInput {
  name: string
  description?: string | null
  teamConfig?: Record<string, unknown>
  members: RosterMemberSpec[]
  userId: string
  agentDescription: string
  agentConfigExtra?: Record<string, unknown>
}

/**
 * Creates one Agent per member (config: { role, ...agentConfigExtra }), then the
 * Team via createTeamWithRoster. Returns the same discriminated result so callers
 * map the error to whatever HTTP status they want.
 */
export async function instantiateRoster(input: InstantiateRosterInput) {
  const roster: RosterInput[] = []
  for (const [i, m] of input.members.entries()) {
    const agent = await prisma.agent.create({
      data: {
        name: m.name,
        description: input.agentDescription,
        systemPrompt: m.systemPrompt,
        model: m.model,
        temperature: 0.7,
        status: 'active',
        createdBy: input.userId,
        config: { role: m.role, ...(input.agentConfigExtra ?? {}) },
      },
    })
    roster.push({ agentId: agent.id, role: m.role, model: m.model, position: i })
  }

  return createTeamWithRoster({
    name: input.name,
    description: input.description ?? null,
    config: input.teamConfig ?? {},
    members: roster,
    userId: input.userId,
  })
}
