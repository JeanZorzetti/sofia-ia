/**
 * Seed — 13 Agentes da empresa ROI Labs (Feature 006-roi-labs-agents).
 *
 * Cria a pasta "ROI Labs" + os 13 agentes (harness completo, modelos Claude CLI),
 * vincula capacidades (skills built-in; MCP do dono quando existir) e encaixa cada
 * agente 1:1 no cargo correspondente da empresa ROI Labs (Company da Feature 005).
 *
 * NÃO altera schema (sem migração) nem o coordinator (Princípio II).
 * Idempotente: chave estável = Agent.config.roiLabsRole + createdBy(dono da company).
 *
 * Uso (host REAL de produção — onde vive a Company):
 *   ROI_LABS_COMPANY_ID='0e7d636a-...' \
 *   DATABASE_URL='postgresql://<user>:<pass>@2.24.207.200:5435/<db>' \
 *   npx tsx scripts/seed-roi-labs-agents.ts
 *
 *   (ou: npx tsx scripts/seed-roi-labs-agents.ts --company 0e7d636a-...)
 *   Sem id → descobre a única empresa de nicho software_house (erro se 0 ou >1).
 */

import { PrismaClient, Prisma } from '@prisma/client'
import {
  ROI_LABS_ROSTER,
  buildSystemPrompt,
  validateRoster,
  blueprintRoleKeys,
  ROI_LABS_NICHE,
  type RoiLabsAgentDef,
} from '../src/lib/companies/roi-labs-roster'
import { BUILTIN_SKILLS } from '../src/lib/skills/registry'

const prisma = new PrismaClient()

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : undefined
}

/** Material normativo do cargo persistido na knowledge base (FR-010). */
function normativeDoc(def: RoiLabsAgentDef): string {
  return [
    `# ${def.name}`,
    '',
    `**Camada:** ${def.layer}`,
    `**Papel (Role):** ${def.role}`,
    `**Objetivo (Goal):** ${def.goal}`,
    '',
    `## Responsabilidades`,
    def.responsibilities,
    '',
    `## Backstory / Especialização`,
    def.backstory,
    '',
    def.sop ? `## SOP (formato de saída)\n${def.sop}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL ausente — aponte para o host real da Company.')

  // 1) Resolver a empresa-alvo.
  const companyId = process.env.ROI_LABS_COMPANY_ID || argValue('--company')
  let company = companyId
    ? await prisma.company.findUnique({
        where: { id: companyId },
        include: { roles: true, creator: { select: { id: true, email: true } } },
      })
    : null

  if (!company && !companyId) {
    const candidates = await prisma.company.findMany({
      where: { niche: ROI_LABS_NICHE },
      include: { roles: true, creator: { select: { id: true, email: true } } },
    })
    if (candidates.length === 1) company = candidates[0]
    else throw new Error(`Passe --company <id>: encontrei ${candidates.length} empresas de nicho ${ROI_LABS_NICHE}.`)
  }
  if (!company) throw new Error(`Empresa não encontrada${companyId ? ` (id ${companyId})` : ''}.`)

  const owner = company.createdBy
  const blueprintKeys = blueprintRoleKeys()

  // 2) A empresa precisa ter exatamente os 13 cargos do blueprint.
  const companyKeys = new Set(company.roles.map(r => r.key))
  const missing = blueprintKeys.filter(k => !companyKeys.has(k))
  if (missing.length) throw new Error(`A empresa não tem os cargos do blueprint. Faltando: ${missing.join(', ')}`)

  // 3) Validar o roster (INV-1..8) antes de qualquer escrita.
  const builtinToolNames = BUILTIN_SKILLS
    .map(s => (s.toolDefinition as { name?: string } | undefined)?.name)
    .filter((n): n is string => Boolean(n))
  const v = validateRoster(ROI_LABS_ROSTER, blueprintKeys, builtinToolNames)
  if (!v.ok) throw new Error(`Roster inválido:\n - ${v.errors.join('\n - ')}`)

  console.log(`ROI Labs roster — company ${company.id} "${company.name}" (dono: ${company.creator?.email ?? owner})\n`)

  // 4) Pasta "ROI Labs" (idempotente por name + userId).
  let folder = await prisma.agentFolder.findFirst({ where: { name: 'ROI Labs', userId: owner } })
  if (!folder) {
    folder = await prisma.agentFolder.create({ data: { name: 'ROI Labs', color: '#6366f1', userId: owner } })
    console.log('  Folder "ROI Labs" .......... created')
  } else {
    console.log('  Folder "ROI Labs" .......... reused')
  }

  // 5) Skills built-in disponíveis no banco → map toolName → skillId.
  const dbSkills = await prisma.skill.findMany({ where: { isBuiltin: true }, select: { id: true, toolDefinition: true } })
  const skillByTool = new Map<string, string>()
  for (const s of dbSkills) {
    const tn = (s.toolDefinition as { name?: string } | null)?.name
    if (tn) skillByTool.set(tn, s.id)
  }

  // 6) MCP servers do dono (vinculados por heurística de nome ↔ categoria desejada).
  const ownerMcp = await prisma.mcpServer.findMany({ where: { createdBy: owner }, select: { id: true, name: true } })

  let staffed = 0
  for (const def of ROI_LABS_ROSTER) {
    // 6a) Agent — upsert por config.roiLabsRole + createdBy.
    const existing = await prisma.agent.findFirst({
      where: { createdBy: owner, config: { path: ['roiLabsRole'], equals: def.roleKey } },
      select: { id: true },
    })
    const missingSkills = def.skills.filter(s => !skillByTool.has(s))
    const linkedMcp = ownerMcp.filter(m => def.intendedMcp.some(cat => m.name.toLowerCase().includes(cat)))
    const config: Prisma.InputJsonValue = {
      roiLabsRole: def.roleKey,
      companyId: company.id,
      layer: def.layer,
      delegatesTo: def.delegatesTo,
      receivesFrom: def.receivesFrom,
      peers: def.peers,
      intendedTools: { mcp: def.intendedMcp, missingSkills },
    }
    const agentData = {
      name: def.name,
      description: def.description,
      systemPrompt: buildSystemPrompt(def),
      model: def.model,
      temperature: def.temperature,
      memoryEnabled: def.memoryEnabled,
      folderId: folder.id,
      status: 'active',
      config,
    }

    let agentId: string
    if (existing) {
      await prisma.agent.update({ where: { id: existing.id }, data: agentData })
      agentId = existing.id
    } else {
      const created = await prisma.agent.create({ data: { ...agentData, createdBy: owner } })
      agentId = created.id
    }

    // 6b) Skills (idempotente via @@unique[agentId, skillId]).
    let skillCount = 0
    for (const tool of def.skills) {
      const skillId = skillByTool.get(tool)
      if (!skillId) continue // ausência → registrada em intendedTools.missingSkills (FR-013b)
      await prisma.agentSkill.upsert({
        where: { agentId_skillId: { agentId, skillId } },
        create: { agentId, skillId },
        update: {},
      })
      skillCount++
    }

    // 6c) MCP (vincular o que existir; ausência fica em intendedTools).
    for (const m of linkedMcp) {
      await prisma.agentMcpServer.upsert({
        where: { agentId_mcpServerId: { agentId, mcpServerId: m.id } },
        create: { agentId, mcpServerId: m.id },
        update: {},
      })
    }

    // 6d) Knowledge base normativa (FR-010). Embeddings ficam a cargo do pipeline RAG.
    let kb = await prisma.knowledgeBase.findFirst({ where: { agentId } })
    if (!kb) {
      kb = await prisma.knowledgeBase.create({
        data: { name: `${def.shortTitle} — Base Normativa`, agentId, type: 'role-normative', createdBy: owner },
      })
    }
    const hasDoc = await prisma.knowledgeDocument.findFirst({ where: { knowledgeBaseId: kb.id }, select: { id: true } })
    if (!hasDoc) {
      await prisma.knowledgeDocument.create({
        data: {
          knowledgeBaseId: kb.id,
          title: `Norma do cargo: ${def.shortTitle}`,
          content: normativeDoc(def),
          fileType: 'text/markdown',
          status: 'processing',
        },
      })
    }
    await prisma.agent.update({ where: { id: agentId }, data: { knowledgeBaseId: kb.id } })

    // 6e) Encaixe 1:1 no cargo (mesma regra do staff/route.ts).
    const role = await prisma.companyRole.findUnique({
      where: { companyId_key: { companyId: company.id, key: def.roleKey } },
      select: { id: true, agentId: true },
    })
    if (role && role.agentId !== agentId) {
      await prisma.companyRole.update({ where: { id: role.id }, data: { agentId } })
    }
    staffed++

    const mcpNote = linkedMcp.length ? `${linkedMcp.length}` : `0 (intended: ${def.intendedMcp.join(',')})`
    const miss = missingSkills.length ? ` · skills ausentes: ${missingSkills.join(',')}` : ''
    console.log(
      `  ${def.roleKey.padEnd(13)} → ${existing ? 'updated' : 'created'}  (${def.model})  staffed ✓  skills: ${skillCount}  mcp: ${mcpNote}${miss}`,
    )
  }

  const vagas = await prisma.companyRole.count({ where: { companyId: company.id, agentId: null } })
  console.log(`\nDone: ${staffed}/13 cargos preenchidos · ${vagas} vagas · idempotente.`)
  if (vagas > 0) console.warn('⚠️ Ainda há cargos vagos — verifique se a empresa tem exatamente os 13 cargos do blueprint.')
}

main()
  .catch(e => {
    console.error('Erro:', e instanceof Error ? e.message : e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
