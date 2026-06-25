import { withAuth } from '@/lib/with-auth'
import { apiOk, apiNotFound, apiError } from '@/lib/api-response'
import { prisma } from '@/lib/prisma'
import { getBlueprintsForNiche } from '@/lib/companies/squad-blueprint'
import { buildSquadRoster, validateSquadBlueprint } from '@/lib/companies/squad-roster'
import { ownerId } from '@/lib/authz'
import type { JWTPayload } from '@/lib/auth'
import type { Staffing } from '@/lib/companies/phase-roster'

interface RouteParams { params: Promise<{ id: string }> }

export const POST = withAuth(async (_request, auth: JWTPayload, { params }: RouteParams) => {
  const { id: companyId } = await params

  // Scope check: empresa deve pertencer ao caller.
  const company = await prisma.company.findFirst({
    where: { id: companyId, createdBy: ownerId(auth) },
    select: { id: true, niche: true },
  })
  if (!company) return apiNotFound('Company not found')

  const blueprints = getBlueprintsForNiche(company.niche)
  if (blueprints.length === 0) return apiError(`Nenhum blueprint disponível para o nicho "${company.niche}"`, 400)

  // Build staffing map from CompanyRole (roleKey → agentId for occupied roles).
  const roles = await prisma.companyRole.findMany({
    where: { companyId, agentId: { not: null } },
    select: { key: true, agentId: true },
  })
  const staffing: Staffing = Object.fromEntries(
    roles.filter(r => r.agentId).map(r => [r.key, r.agentId as string])
  )

  // Fetch existing squad keys for idempotency.
  const existing = await prisma.team.findMany({
    where: { companyId, status: 'active' },
    select: { config: true },
  })
  const existingKeys = new Set(
    existing
      .map(t => (t.config as Record<string, unknown>)?.squadKey)
      .filter((k): k is string => typeof k === 'string')
  )

  let created = 0
  let skipped = 0

  for (const blueprint of blueprints) {
    // Skip invalid blueprints (data-level guard).
    const valid = validateSquadBlueprint(blueprint)
    if (!valid.ok) { skipped++; continue }

    // Skip already seeded squads (idempotent).
    if (existingKeys.has(blueprint.squadKey)) { skipped++; continue }

    // Resolve staffing → roster.
    const rosterResult = buildSquadRoster(blueprint, staffing)
    if (!rosterResult.ok) { skipped++; continue }

    // Create squad: Team + TeamMembers + companyId.
    const { createTeamWithRoster } = await import('@/lib/orchestration/team/create-team')
    const result = await createTeamWithRoster({
      name: blueprint.name,
      config: { useCase: blueprint.useCase, squadKey: blueprint.squadKey },
      members: rosterResult.roster,
      userId: auth.id,
      status: 'active',
    })
    if (!result.ok) { skipped++; continue }

    await prisma.team.update({
      where: { id: result.team.id },
      data: { companyId },
    })
    created++
  }

  return apiOk({ created, skipped })
})
