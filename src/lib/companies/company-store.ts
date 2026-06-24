// 005-agentic-companies — Helpers de leitura/escopo e seeding de nicho.
// Escopo multi-tenant: `ownerId` segue o padrão do repo (`@/lib/authz`): admin → undefined
// (Prisma ignora o filtro → vê todas), demais → auth.id. Reuso central nas rotas de Empresa.
import { prisma } from '@/lib/prisma'
import { getNicheBlueprint, type RaciMatrix } from './company-blueprint'

/** Inclui cargos (com o agente encaixado) ordenados — shape do organograma. */
const ROLES_INCLUDE = {
  roles: {
    orderBy: [{ layer: 'asc' as const }, { position: 'asc' as const }],
    include: { agent: { select: { id: true, name: true, model: true, status: true } } },
  },
}

/** Lista empresas do dono (admin → todas). Inclui cargos para contagem ocupados/vagos. */
export async function listCompanies(ownerId: string | undefined) {
  return prisma.company.findMany({
    where: { createdBy: ownerId },
    orderBy: { createdAt: 'desc' },
    include: ROLES_INCLUDE,
  })
}

/** Detalhe de uma empresa escopado ao dono (admin → qualquer). null se não-dono/inexistente. */
export async function getCompanyForOwner(id: string, ownerId: string | undefined) {
  return prisma.company.findFirst({
    where: { id, createdBy: ownerId },
    include: ROLES_INCLUDE,
  })
}

export interface CreateCompanyInput {
  name: string
  niche: string
  typology?: string
  description?: string | null
  userId: string
}

/**
 * Cria uma empresa a partir de um nicho: semeia CompanyRole[] + a RACI pré-preenchida
 * do blueprint. Resultado discriminado (como createTeamWithRoster) — o caller mapeia
 * o erro para 400. Cargos nascem VAGOS (agentId null).
 */
export async function createCompanyFromNiche(input: CreateCompanyInput) {
  if (!input.name?.trim()) return { ok: false as const, error: 'Nome é obrigatório' }

  const blueprint = getNicheBlueprint(input.niche)
  if (!blueprint) return { ok: false as const, error: `Nicho desconhecido: ${input.niche}` }

  const typology = ['generalist', 'specialist', 'hybrid'].includes(input.typology ?? '')
    ? (input.typology as string)
    : 'hybrid'

  const company = await prisma.company.create({
    data: {
      name: input.name.trim(),
      niche: blueprint.niche,
      typology,
      description: input.description ?? null,
      raci: blueprint.raci as object,
      config: {},
      createdBy: input.userId,
      roles: {
        create: blueprint.roles.map(r => ({
          key: r.key,
          title: r.title,
          layer: r.layer,
          department: r.department,
          position: r.position,
        })),
      },
    },
    include: ROLES_INCLUDE,
  })
  return { ok: true as const, company }
}

/**
 * Clona a estrutura (cargos) + RACI de uma empresa para uma nova (FR-019). Cargos nascem
 * VAGOS — agentes não migram (1:1 global + isolamento de tenant). O novo dono é `userId`.
 */
export async function cloneCompany(source: { niche: string; typology: string; raci: unknown; roles: { key: string; title: string; layer: string; department: string | null; position: number }[] }, name: string, userId: string) {
  return prisma.company.create({
    data: {
      name: name.trim(),
      niche: source.niche,
      typology: source.typology,
      raci: (source.raci ?? {}) as object,
      config: {},
      createdBy: userId,
      roles: {
        create: source.roles.map(r => ({
          key: r.key,
          title: r.title,
          layer: r.layer,
          department: r.department,
          position: r.position,
        })),
      },
    },
    include: ROLES_INCLUDE,
  })
}

/** Tipo da RACI persistida (re-export conveniente para as rotas). */
export type { RaciMatrix }
