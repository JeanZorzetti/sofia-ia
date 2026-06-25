// 009-usecase-squads — Helpers de leitura/escopo/criação de squads.
// Squad = Team com companyId != null e status='active'.
// Princípio II: não toca o coordinator (runTeam). Princípio V: todas as
// operações são escopadas por Company.createdBy == ownerId(auth).
import { prisma } from '@/lib/prisma'
import { createTeamWithRoster } from '@/lib/orchestration/team/create-team'
import type { JWTPayload } from '@/lib/auth'
import { ownerId } from '@/lib/authz'

// ─── Predicado / Shape ────────────────────────────────────────────────────────

/** Predicado Prisma: seleciona squads (companyId setado + status active). */
export function isSquadWhere(companyId: string) {
  return { companyId, status: 'active' as const }
}

/** Config JSON persistida num squad (Team.config). */
export interface SquadConfig {
  useCase?: string
  squadKey?: string
  [key: string]: unknown
}

/** Membro no DTO de resposta (leitura, sem DB ids extras). */
export interface SquadMemberDTO {
  agentId: string
  name: string
  role: string
  model: string
}

export interface LastRunDTO {
  id: string
  status: string
  createdAt: string
}

export interface SquadDTO {
  id: string
  name: string
  useCase: string
  squadKey?: string
  members: SquadMemberDTO[]
  lastRun?: LastRunDTO
}

/** Shape de include padrão para squads (membros + último run). */
const SQUAD_INCLUDE = {
  members: {
    orderBy: { position: 'asc' as const },
    include: { agent: { select: { id: true, name: true, model: true } } },
  },
  runs: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: { id: true, status: true, createdAt: true },
  },
} as const

type SquadWithIncludes = Awaited<ReturnType<typeof prisma.team.findFirst>> & {
  members: { agentId: string; role: string; agent: { id: string; name: string; model: string }; model?: string | null }[]
  runs: { id: string; status: string; createdAt: Date }[]
} | null

export function toSquadDTO(squad: NonNullable<SquadWithIncludes>): SquadDTO {
  const cfg = (squad.config ?? {}) as SquadConfig
  return {
    id: squad.id,
    name: squad.name,
    useCase: cfg.useCase ?? '',
    squadKey: cfg.squadKey,
    members: squad.members.map(m => ({
      agentId: m.agentId,
      name: m.agent.name,
      role: m.role,
      model: m.model ?? m.agent.model,
    })),
    lastRun: squad.runs[0]
      ? { id: squad.runs[0].id, status: squad.runs[0].status, createdAt: squad.runs[0].createdAt.toISOString() }
      : undefined,
  }
}

// ─── Validação de domínio ────────────────────────────────────────────────────

export interface SquadMemberInput {
  agentId: string
  role: 'lead' | 'worker' | 'reviewer'
}

export interface ValidateSquadCompositionOptions {
  SQUAD_SIZE_WARN?: number
}

export type ValidateSquadResult =
  | { ok: true }
  | { ok: false; error: string }

/** Valida composição de squad: 1 lead obrigatório; role válida; teto sugerido. */
export function validateSquadComposition(
  members: SquadMemberInput[],
  opts: ValidateSquadCompositionOptions = {}
): ValidateSquadResult {
  const { SQUAD_SIZE_WARN = 4 } = opts
  const leads = members.filter(m => m.role === 'lead')
  if (leads.length !== 1) {
    return { ok: false, error: `Squad deve ter exatamente 1 lead (encontrou ${leads.length})` }
  }
  const workers = members.filter(m => m.role === 'worker')
  if (workers.length === 0) {
    return { ok: false, error: 'Squad deve ter pelo menos 1 worker' }
  }
  if (members.length > SQUAD_SIZE_WARN) {
    console.warn(`[squad-store] Squad com ${members.length} membros excede o teto sugerido de ${SQUAD_SIZE_WARN} (SC-001)`)
  }
  return { ok: true }
}

// ─── Escopo por dono ─────────────────────────────────────────────────────────

/** Verifica se a empresa pertence ao dono e retorna o id. null → não encontrada / não pertence. */
export async function resolveCompanyForOwner(companyId: string, auth: JWTPayload): Promise<string | null> {
  const company = await prisma.company.findFirst({
    where: { id: companyId, createdBy: ownerId(auth) },
    select: { id: true },
  })
  return company?.id ?? null
}

// ─── Leitura ──────────────────────────────────────────────────────────────────

/** Lista squads de uma empresa escopados ao dono. */
export async function listSquadsByCompany(companyId: string, auth: JWTPayload): Promise<SquadDTO[] | null> {
  const ownedId = await resolveCompanyForOwner(companyId, auth)
  if (!ownedId) return null

  const squads = await prisma.team.findMany({
    where: isSquadWhere(companyId),
    orderBy: { createdAt: 'desc' },
    include: SQUAD_INCLUDE,
  })
  return squads.map(s => toSquadDTO(s as unknown as NonNullable<SquadWithIncludes>))
}

/** Detalhe de um squad escopado ao dono (via empresa). null → não encontrado / IDOR. */
export async function getSquadForOwner(companyId: string, squadId: string, auth: JWTPayload): Promise<SquadDTO | null> {
  const ownedId = await resolveCompanyForOwner(companyId, auth)
  if (!ownedId) return null

  const squad = await prisma.team.findFirst({
    where: { id: squadId, ...isSquadWhere(companyId) },
    include: SQUAD_INCLUDE,
  })
  if (!squad) return null
  return toSquadDTO(squad as unknown as NonNullable<SquadWithIncludes>)
}

// ─── Criação / Mutação ────────────────────────────────────────────────────────

export interface CreateSquadInput {
  name: string
  useCase: string
  members: SquadMemberInput[]
}

export type CreateSquadResult =
  | { ok: true; squadId: string }
  | { ok: false; error: string }

/**
 * Cria um squad vinculado a uma empresa. Valida composição + agentes do dono,
 * depois delega ao createTeamWithRoster (rota Foundational — coordinator INTOCADO).
 */
export async function createSquad(
  companyId: string,
  input: CreateSquadInput,
  auth: JWTPayload
): Promise<CreateSquadResult> {
  const ownedId = await resolveCompanyForOwner(companyId, auth)
  if (!ownedId) return { ok: false, error: 'Empresa não encontrada' }

  const compositionCheck = validateSquadComposition(input.members)
  if (!compositionCheck.ok) return { ok: false, error: compositionCheck.error }

  // Verifica que todos os agentes pertencem ao dono (Princípio V).
  const agentIds = input.members.map(m => m.agentId)
  const owned = await prisma.agent.count({ where: { id: { in: agentIds }, createdBy: auth.id } })
  if (owned !== agentIds.length) {
    return { ok: false, error: 'Um ou mais agentes não pertencem ao seu perfil' }
  }

  const created = await createTeamWithRoster({
    name: input.name.trim(),
    config: { useCase: input.useCase.trim(), companyId } as Record<string, unknown>,
    members: input.members.map((m, i) => ({ agentId: m.agentId, role: m.role, position: i })),
    userId: auth.id,
    status: 'active',
  })
  if (!created.ok) return { ok: false, error: created.error }

  // Vincular o squad à empresa (companyId não é suportado em createTeamWithRoster — patch pós-criação).
  await prisma.team.update({ where: { id: created.team.id }, data: { companyId } })

  return { ok: true, squadId: created.team.id }
}

export interface PatchSquadInput {
  name?: string
  useCase?: string
  members?: SquadMemberInput[]
}

export type PatchSquadResult =
  | { ok: true; squad: SquadDTO }
  | { ok: false; error: string }

/** Edita nome/useCase/membros de um squad. Revalida composição se membros mudam. */
export async function patchSquad(
  companyId: string,
  squadId: string,
  input: PatchSquadInput,
  auth: JWTPayload
): Promise<PatchSquadResult> {
  const ownedId = await resolveCompanyForOwner(companyId, auth)
  if (!ownedId) return { ok: false, error: 'Empresa não encontrada' }

  const existing = await prisma.team.findFirst({
    where: { id: squadId, ...isSquadWhere(companyId) },
    include: { members: true },
  })
  if (!existing) return { ok: false, error: 'Squad não encontrado' }

  if (input.members) {
    const check = validateSquadComposition(input.members)
    if (!check.ok) return { ok: false, error: check.error }

    const agentIds = input.members.map(m => m.agentId)
    const owned = await prisma.agent.count({ where: { id: { in: agentIds }, createdBy: auth.id } })
    if (owned !== agentIds.length) return { ok: false, error: 'Um ou mais agentes não pertencem ao seu perfil' }
  }

  const existingCfg = (existing.config ?? {}) as SquadConfig
  const newCfg: SquadConfig = {
    ...existingCfg,
    ...(input.useCase !== undefined ? { useCase: input.useCase.trim() } : {}),
  }

  await prisma.$transaction(async tx => {
    await tx.team.update({
      where: { id: squadId },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        config: newCfg as object,
      },
    })
    if (input.members) {
      await tx.teamMember.deleteMany({ where: { teamId: squadId } })
      await tx.teamMember.createMany({
        data: input.members.map((m, i) => ({
          teamId: squadId, agentId: m.agentId, role: m.role, position: i,
        })),
      })
    }
  })

  const updated = await prisma.team.findFirst({
    where: { id: squadId, ...isSquadWhere(companyId) },
    include: SQUAD_INCLUDE,
  })
  return { ok: true, squad: toSquadDTO(updated as unknown as NonNullable<SquadWithIncludes>) }
}

/** Remove um squad (Team). Runs históricos seguem a cascata existente de Team. */
export async function deleteSquad(
  companyId: string,
  squadId: string,
  auth: JWTPayload
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ownedId = await resolveCompanyForOwner(companyId, auth)
  if (!ownedId) return { ok: false, error: 'Empresa não encontrada' }

  const { count } = await prisma.team.deleteMany({
    where: { id: squadId, ...isSquadWhere(companyId) },
  })
  if (count === 0) return { ok: false, error: 'Squad não encontrado' }
  return { ok: true }
}
