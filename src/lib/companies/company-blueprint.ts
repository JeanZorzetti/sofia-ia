// 005-agentic-companies — Dados estáticos dos nichos semente (espelha team-templates.ts).
// Camadas, departamentos, cargos e a RACI PRÉ-PREENCHIDA derivada do blueprint
// (docs/empresa_agentica_notebook_lm/Organograma de Empresa Agêntica.md).
//
// CORREÇÃO (research R5): a seção 7 do blueprint tem a linha "Ciclo de Iteração de
// Desalucinação Comunicativa" com DOIS "A" (Gerente de Projetos = A E QA = A/C), o que
// viola a regra de ouro (1 A/fase). Normalizamos para UM Accountable: o Gerente de
// Projetos (scrum_master) detém o A na fase `testing`; o QA fica como R (executor da
// revisão → roteado a reviewer por buildPhaseRoster). O seed é válido por construção
// (validateRaci o aprova).

import type { RaciValue } from './sdlc'

export type CompanyLayer = 'strategic' | 'tactical' | 'operational'

export interface BlueprintRole {
  key: string
  title: string
  layer: CompanyLayer
  department: string
  position: number
}

/** Matriz RACI: { [phaseKey]: { [roleKey]: 'R'|'A'|'C'|'I' } }. Células ausentes = I implícito. */
export type RaciMatrix = Record<string, Record<string, RaciValue>>

export interface NicheBlueprint {
  niche: string
  label: string
  roles: BlueprintRole[]
  /** RACI semente — exatamente 1 A por fase (regra de ouro), editável depois. */
  raci: RaciMatrix
}

// --- Software House ----------------------------------------------------------

const SOFTWARE_HOUSE_ROLES: BlueprintRole[] = [
  // Camada Estratégica (C-level)
  { key: 'ceo', title: 'Chief Executive Officer (CEO)', layer: 'strategic', department: 'Executivo', position: 0 },
  { key: 'cto', title: 'Chief Technology Officer (CTO)', layer: 'strategic', department: 'Executivo', position: 1 },
  { key: 'ciso', title: 'Chief Information Security Officer (CISO)', layer: 'strategic', department: 'QA & Segurança', position: 2 },
  // Camada Tático-Gerencial
  { key: 'pm', title: 'Gerente de Produto (PM)', layer: 'tactical', department: 'Produto & Negócios', position: 0 },
  { key: 'ba', title: 'Analista de Negócios (BA)', layer: 'tactical', department: 'Produto & Negócios', position: 1 },
  { key: 'po', title: 'Dono do Produto (PO)', layer: 'tactical', department: 'Produto & Negócios', position: 2 },
  { key: 'architect', title: 'Arquiteto de Software', layer: 'tactical', department: 'Arquitetura & Engenharia', position: 3 },
  { key: 'scrum_master', title: 'Gerente de Projetos / Scrum Master', layer: 'tactical', department: 'Orquestração', position: 4 },
  // Camada Operacional
  { key: 'backend', title: 'Engenheiro de Software Backend', layer: 'operational', department: 'Arquitetura & Engenharia', position: 0 },
  { key: 'frontend', title: 'Engenheiro de Software Frontend', layer: 'operational', department: 'Arquitetura & Engenharia', position: 1 },
  { key: 'qa', title: 'Engenheiro de Qualidade (QA)', layer: 'operational', department: 'QA & Segurança', position: 2 },
  { key: 'devops', title: 'Engenheiro DevOps / Operações', layer: 'operational', department: 'Operações & Infraestrutura', position: 3 },
  { key: 'data', title: 'Engenheiro / Cientista de Dados', layer: 'operational', department: 'Especializada', position: 4 },
]

// RACI semente — 1 A por fase. Células omitidas = I implícito.
// Mapeamento das 9 linhas-tarefa do blueprint → 7 fases canônicas (research R5):
//   Conceptualização→planning · PRD→requirements · Modelação DB/Arquitetura→design ·
//   (Decomposição + Codificação)→implementation · (Testes Unitários + Desalucinação)→testing ·
//   (Empacotamento + Implantação/Aceitação)→deployment · maintenance (nova).
const SOFTWARE_HOUSE_RACI: RaciMatrix = {
  planning: { ceo: 'A', ba: 'R', pm: 'C', cto: 'C' },
  requirements: { ceo: 'A', pm: 'R', ba: 'R', po: 'C', architect: 'C' },
  design: { ceo: 'A', architect: 'R', cto: 'C', devops: 'C', data: 'C', pm: 'C' },
  implementation: { scrum_master: 'A', backend: 'R', frontend: 'R', architect: 'C', qa: 'C' },
  // testing: scrum_master detém o ÚNICO A (normalização do double-A do blueprint);
  // qa é R → roteado a reviewer (loop de desalucinação) por buildPhaseRoster.
  testing: { scrum_master: 'A', qa: 'R', backend: 'R', frontend: 'R', ciso: 'C', devops: 'C' },
  deployment: { ceo: 'A', devops: 'R', scrum_master: 'R', qa: 'C', ciso: 'C' },
  maintenance: { devops: 'A', backend: 'R', qa: 'C', data: 'C', ceo: 'I' },
}

const SOFTWARE_HOUSE: NicheBlueprint = {
  niche: 'software_house',
  label: 'Software House',
  roles: SOFTWARE_HOUSE_ROLES,
  raci: SOFTWARE_HOUSE_RACI,
}

/** Registro de nichos semente (extensível; só software_house no MVP). */
export const NICHE_BLUEPRINTS: Record<string, NicheBlueprint> = {
  [SOFTWARE_HOUSE.niche]: SOFTWARE_HOUSE,
}

export function getNicheBlueprint(niche: string): NicheBlueprint | undefined {
  return NICHE_BLUEPRINTS[niche]
}

/** Resumo para a galeria/picker de nichos (GET /api/companies/niches). */
export function listNiches(): { niche: string; label: string; layers: CompanyLayer[]; roleCount: number }[] {
  return Object.values(NICHE_BLUEPRINTS).map(b => ({
    niche: b.niche,
    label: b.label,
    layers: [...new Set(b.roles.map(r => r.layer))],
    roleCount: b.roles.length,
  }))
}
