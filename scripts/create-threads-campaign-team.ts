/**
 * SP6a: cria o Team "Planejamento de Campanha Threads" reusando os agentes
 * EXISTENTES do Threads (preserva plugins/skills/MCP). Substitui o script legado
 * scripts/create-threads-campaign-orchestration.ts (que criava uma AgentOrchestration).
 *
 * Run (host com acesso ao banco real de prod):
 *   DATABASE_URL="postgres://sofia_db:<senha>@2.24.207.200:5435/sofia_db?sslmode=disable" \
 *     npx tsx scripts/create-threads-campaign-team.ts
 */
import { PrismaClient } from '@prisma/client'
import { validateRoster } from '../src/lib/orchestration/team/team-roster'
import {
  CAMPAIGN_TEAM_NAME,
  CAMPAIGN_TEAM_DESCRIPTION,
  CAMPAIGN_TEAM_CONFIG,
  CAMPAIGN_AGENT_IDS,
  CAMPAIGN_LEAD_SPEC,
  buildCampaignRoster,
} from './threads-campaign-roster'

const prisma = new PrismaClient()
const ADMIN_ID = '46212883-7220-41bf-bd8b-e676bfd1baaf'

async function main() {
  // 1. Os agentes existentes (com tools) precisam existir.
  const workerIds = Object.values(CAMPAIGN_AGENT_IDS)
  const found = await prisma.agent.findMany({
    where: { id: { in: workerIds } },
    select: { id: true, name: true },
  })
  if (found.length !== workerIds.length) {
    const missing = workerIds.filter(id => !found.some(a => a.id === id))
    console.error('❌ Agentes do Threads não encontrados:', missing)
    process.exit(1)
  }
  console.log('✅ Agentes do Threads verificados:', found.map(a => a.name).join(', '))

  // 2. Idempotência: não recriar se já existe.
  const existing = await prisma.team.findFirst({
    where: { name: CAMPAIGN_TEAM_NAME, createdBy: ADMIN_ID },
  })
  if (existing) {
    console.log(`⏭️  Team já existe: ${existing.id} — nada a fazer.`)
    return
  }

  // 3. Lead sintético (coordena; não precisa de tools).
  const lead = await prisma.agent.create({
    data: {
      name: CAMPAIGN_LEAD_SPEC.name,
      description: 'Lead coordenador do time de Planejamento de Campanha Threads (SP6a).',
      systemPrompt: CAMPAIGN_LEAD_SPEC.systemPrompt,
      model: CAMPAIGN_LEAD_SPEC.model,
      temperature: 0.7,
      status: 'active',
      createdBy: ADMIN_ID,
      config: { role: 'lead', createdBy: 'sp6a-threads-repoint' },
    },
  })

  // 4. Roster + validação (mesma regra de POST /api/teams).
  const roster = buildCampaignRoster(lead.id)
  const err = validateRoster(roster)
  if (err) {
    console.error('❌ Roster inválido:', err)
    process.exit(1)
  }

  // 5. Cria o Team com os membros.
  const team = await prisma.team.create({
    data: {
      name: CAMPAIGN_TEAM_NAME,
      description: CAMPAIGN_TEAM_DESCRIPTION,
      config: CAMPAIGN_TEAM_CONFIG,
      createdBy: ADMIN_ID,
      members: {
        create: roster.map(m => ({
          agentId: m.agentId,
          role: m.role,
          model: m.model ?? null,
          position: m.position,
        })),
      },
    },
    include: { members: true },
  })

  console.log(`\n✅ Team criado: ${team.id} (${team.members.length} membros)`)
  console.log(`🔗 /dashboard/teams/${team.id}`)
}

main()
  .catch(e => {
    console.error('❌ Erro:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
