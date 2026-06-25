// 009-usecase-squads — Templates de squad por case de uso para o nicho software_house.
// DADO PURO: sem I/O, sem Prisma, testável de forma isolada.
//
// Cada blueprint define os roleKeys do nicho (CompanyRole.key) mapeados para
// lead / worker / reviewer. O seed resolve roleKey → agentId via CompanyRole.
// Cargos vagos são pulados pelo buildSquadRoster (squad só criado se lead ocupado).

export type SquadMemberRole = 'lead' | 'worker' | 'reviewer'

export interface SquadBlueprintMember {
  roleKey: string
  role: SquadMemberRole
}

export interface SquadBlueprint {
  /** Chave estável para idempotência do seed (gravada em Team.config.squadKey). */
  squadKey: string
  name: string
  /** Descrição curta do case de uso — vai para Team.config.useCase. */
  useCase: string
  members: SquadBlueprintMember[]
}

/** Blueprints do nicho software_house (5 cases de uso). */
const SOFTWARE_HOUSE_BLUEPRINTS: SquadBlueprint[] = [
  {
    squadKey: 'software_house__feature',
    name: 'Squad Feature',
    useCase: 'Implementar feature ponta-a-ponta (spec → código → review → QA)',
    members: [
      { roleKey: 'architect',     role: 'lead' },
      { roleKey: 'backend',       role: 'worker' },
      { roleKey: 'frontend',      role: 'worker' },
      { roleKey: 'qa',            role: 'reviewer' },
    ],
  },
  {
    squadKey: 'software_house__hotfix',
    name: 'Squad Hotfix',
    useCase: 'Corrigir bug crítico com ciclo curto (diagnóstico → patch → validação)',
    members: [
      { roleKey: 'backend',       role: 'lead' },
      { roleKey: 'qa',            role: 'reviewer' },
    ],
  },
  {
    squadKey: 'software_house__discovery',
    name: 'Squad Discovery',
    useCase: 'Levantar requisitos, definir escopo e produzir briefing técnico',
    members: [
      { roleKey: 'pm',            role: 'lead' },
      { roleKey: 'po',            role: 'worker' },
      { roleKey: 'ba',            role: 'worker' },
      { roleKey: 'architect',     role: 'reviewer' },
    ],
  },
  {
    squadKey: 'software_house__security_audit',
    name: 'Squad Security Audit',
    useCase: 'Auditar superfície de ataque e produzir relatório de vulnerabilidades',
    members: [
      { roleKey: 'ciso',          role: 'lead' },
      { roleKey: 'backend',       role: 'worker' },
      { roleKey: 'qa',            role: 'reviewer' },
    ],
  },
  {
    squadKey: 'software_house__data_pipeline',
    name: 'Squad Data Pipeline',
    useCase: 'Projetar, implementar e validar pipeline de dados (ingestão → transformação → sink)',
    members: [
      { roleKey: 'data',          role: 'lead' },
      { roleKey: 'backend',       role: 'worker' },
      { roleKey: 'qa',            role: 'reviewer' },
    ],
  },
]

const BLUEPRINTS_BY_NICHE: Record<string, SquadBlueprint[]> = {
  software_house: SOFTWARE_HOUSE_BLUEPRINTS,
}

/** Retorna os blueprints de um nicho. Retorna lista vazia se nicho desconhecido. */
export function getBlueprintsForNiche(niche: string): SquadBlueprint[] {
  return BLUEPRINTS_BY_NICHE[niche] ?? []
}

/** Lista os nichos com blueprints disponíveis. */
export function listBlueprintNiches(): string[] {
  return Object.keys(BLUEPRINTS_BY_NICHE)
}
