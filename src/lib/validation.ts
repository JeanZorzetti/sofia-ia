import { z, type ZodType } from 'zod'

/**
 * Validacao de input com zod — Sprint 1 (arquitetura).
 *
 * `parseJson` le o corpo da requisicao e valida contra um schema, devolvendo um
 * resultado discriminado (`ok`) sem lancar. As rotas mutadoras passam a validar
 * o input em vez de confiar no `request.json()` cru.
 *
 * Os schemas espelham as validacoes manuais ja existentes (mesmos campos
 * obrigatorios) para nao mudar o contrato com o cliente — apenas formalizam e
 * tipam o que ja era aceito. `z.object` por padrao remove chaves desconhecidas
 * (nao rejeita), entao payloads com campos extras continuam funcionando.
 */

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export async function parseJson<T>(
  request: Request,
  schema: ZodType<T>
): Promise<ParseResult<T>> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return { ok: false, error: 'Corpo da requisicao invalido (JSON esperado)' }
  }
  const result = schema.safeParse(raw)
  if (!result.success) {
    const issue = result.error.issues[0]
    const path = issue?.path?.join('.')
    return { ok: false, error: path ? `${path}: ${issue.message}` : issue?.message ?? 'Dados invalidos' }
  }
  return { ok: true, data: result.data }
}

// --- Auth ------------------------------------------------------------------

export const loginSchema = z.object({
  username: z.string().min(1, 'Username and password are required'),
  password: z.string().min(1, 'Username and password are required'),
})

export const registerSchema = z.object({
  name: z.string().min(1, 'Nome, email e senha sao obrigatorios'),
  email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email invalido'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
  referredBy: z.string().optional(),
})

// --- Agents ----------------------------------------------------------------

const agentChannelSchema = z.object({
  channel: z.string(),
  config: z.any().optional(),
  isActive: z.boolean().optional(),
})

export const createAgentSchema = z.object({
  name: z.string().min(1, 'name is required and must be a string'),
  systemPrompt: z.string().min(1, 'systemPrompt is required and must be a string'),
  description: z.string().nullish(),
  model: z.string().optional(),
  temperature: z.number().optional(),
  status: z.string().optional(),
  config: z.any().optional(),
  channels: z.array(agentChannelSchema).optional(),
})

export const updateAgentSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullish(),
  systemPrompt: z.string().min(1).optional(),
  model: z.string().optional(),
  temperature: z.number().optional(),
  status: z.string().optional(),
  config: z.any().optional(),
  knowledgeBaseId: z.string().nullish(),
  folderId: z.string().nullish(),
  channels: z.array(agentChannelSchema).optional(),
})

// --- Teams -----------------------------------------------------------------
// Permissivo de proposito: `validateRoster`/`createTeamWithRoster` continuam
// fazendo a validacao de dominio; aqui so garantimos os tipos basicos.

// S1.3 (Teams V2 — Tema A): per-member tool-capability policy. Without this field the
// `z.object` parse would silently DROP `capabilities` from the payload (z.object strips
// unknown keys), so nothing would persist. Shape mirrors `CapabilityPolicy` in team-types.
const capabilityPolicySchema = z.object({
  tools: z.boolean().optional(),
  mcpAllowlist: z.array(z.string()).optional(),
  toolSkills: z.boolean().optional(),
  filesystem: z.boolean().optional(),
})

const teamMemberSchema = z.object({
  agentId: z.string(),
  role: z.string(),
  model: z.string().nullish(),
  effort: z.string().nullish(),
  position: z.number().optional(),
  capabilities: capabilityPolicySchema.nullish(),
  // S3.1 (Teams V2.1 — Tema F1): per-member custom workflow instruction. Without this
  // field z.object would strip it from the payload (unknown keys dropped), so nothing
  // would persist. Nullish so a legacy member omitting it parses unchanged.
  workflow: z.string().nullish(),
})

export const createTeamSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  members: z.array(teamMemberSchema).optional(),
})

export const updateTeamSchema = createTeamSchema

// --- Companies (005-agentic-companies) --------------------------------------
// Validação de input das rotas de Empresa. A validação de DOMÍNIO (regra de ouro
// da RACI, 1:1 cargo↔agente, roster por fase) continua nos helpers puros
// (validateRaci, createCompanyFromNiche, buildPhaseRoster); aqui só os tipos básicos.

const typologySchema = z.enum(['generalist', 'specialist', 'hybrid'])
const raciValueSchema = z.enum(['R', 'A', 'C', 'I'])

export const createCompanySchema = z.object({
  name: z.string().min(1, 'name é obrigatório'),
  niche: z.string().min(1, 'niche é obrigatório'),
  typology: typologySchema.optional(),
  description: z.string().nullish(),
})

export const patchCompanySchema = z.object({
  name: z.string().min(1).optional(),
  typology: typologySchema.optional(),
  description: z.string().nullish(),
})

export const cloneCompanySchema = z.object({
  name: z.string().min(1, 'name é obrigatório'),
})

// FR-005: adicionar/remover cargos além do template do nicho.
const addRoleSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  layer: z.enum(['strategic', 'tactical', 'operational']),
  department: z.string().nullish(),
})
export const putRolesSchema = z.object({
  add: z.array(addRoleSchema).optional(),
  removeKeys: z.array(z.string()).optional(),
})

export const staffRoleSchema = z.object({
  agentId: z.string().min(1, 'agentId é obrigatório'),
})

// RACI: { [phaseKey]: { [roleKey]: 'R'|'A'|'C'|'I' } } — regra de ouro validada por validateRaci.
export const putRaciSchema = z.object({
  raci: z.record(z.string(), z.record(z.string(), raciValueSchema)),
})

// SOPs por cargo (FR-011) — persistido em Company.config.sops.
export const putSopsSchema = z.object({
  sops: z.record(z.string(), z.string()),
})

// Infra: só a flag sandbox por cargo é escrita in-company (MCP é leitura+deep-link, C2).
export const putInfrastructureSchema = z.record(
  z.string(),
  z.object({ sandbox: z.boolean().optional() })
)

export const runCompanySchema = z.object({
  mission: z.string().min(1, 'mission é obrigatória'),
})
