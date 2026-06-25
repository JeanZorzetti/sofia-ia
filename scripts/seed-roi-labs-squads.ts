/**
 * Seed — Squads da empresa ROI Labs (Feature 009-usecase-squads).
 *
 * Gera os squads por case de uso a partir dos blueprints do nicho software_house,
 * resolvendo os roleKeys para agentes reais da empresa ROI Labs.
 *
 * Idempotente: pulado se squad com mesmo squadKey já existe na empresa.
 *
 * Uso (host REAL de produção):
 *   ROI_LABS_COMPANY_ID='<uuid>' \
 *   DATABASE_URL='postgresql://<user>:<pass>@2.24.207.200:5435/<db>' \
 *   npx tsx scripts/seed-roi-labs-squads.ts
 *
 *   Sem ROI_LABS_COMPANY_ID → descobre a única empresa de nicho software_house.
 */

import { PrismaClient } from '@prisma/client'
import { getBlueprintsForNiche } from '../src/lib/companies/squad-blueprint'
import { buildSquadRoster, validateSquadBlueprint } from '../src/lib/companies/squad-roster'
import type { Staffing } from '../src/lib/companies/phase-roster'

const prisma = new PrismaClient()

async function resolveCompanyId(): Promise<string> {
  const envId = process.env.ROI_LABS_COMPANY_ID
  const arg = process.argv.find(a => a.startsWith('--company='))?.split('=')[1]
  if (envId) return envId
  if (arg) return arg
  const companies = await prisma.company.findMany({
    where: { niche: 'software_house' },
    select: { id: true, name: true },
  })
  if (companies.length === 0) throw new Error('Nenhuma empresa software_house encontrada — crie a ROI Labs primeiro.')
  if (companies.length > 1) throw new Error(`Mais de 1 empresa software_house encontrada (${companies.map(c => c.name).join(', ')}). Passe ROI_LABS_COMPANY_ID.`)
  return companies[0].id
}

async function main() {
  const companyId = await resolveCompanyId()
  console.log(`\n🏢 Empresa: ${companyId}`)

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { niche: true, createdBy: true } })
  if (!company) throw new Error(`Empresa ${companyId} não encontrada.`)

  const blueprints = getBlueprintsForNiche(company.niche)
  console.log(`📐 Blueprints do nicho "${company.niche}": ${blueprints.length}`)

  // Staffing: roleKey → agentId (apenas cargos ocupados).
  const roles = await prisma.companyRole.findMany({
    where: { companyId, agentId: { not: null } },
    select: { key: true, agentId: true },
  })
  const staffing: Staffing = Object.fromEntries(
    roles.filter(r => r.agentId).map(r => [r.key, r.agentId as string])
  )
  console.log(`👥 Cargos ocupados: ${roles.length} (${Object.keys(staffing).join(', ')})`)

  // Existing squad keys (idempotência).
  const existing = await prisma.team.findMany({
    where: { companyId, status: 'active' },
    select: { config: true, name: true },
  })
  const existingKeys = new Set(
    existing.map(t => (t.config as Record<string, unknown>)?.squadKey).filter((k): k is string => typeof k === 'string')
  )
  console.log(`🔑 Squads já existentes: ${existingKeys.size} (${[...existingKeys].join(', ') || 'nenhum'})`)

  let created = 0, skipped = 0
  for (const blueprint of blueprints) {
    const valid = validateSquadBlueprint(blueprint)
    if (!valid.ok) { console.log(`  ⚠ Blueprint inválido "${blueprint.squadKey}": ${valid.error}`); skipped++; continue }
    if (existingKeys.has(blueprint.squadKey)) { console.log(`  ↩ Já existe: ${blueprint.squadKey}`); skipped++; continue }

    const rosterResult = buildSquadRoster(blueprint, staffing)
    if (!rosterResult.ok) { console.log(`  ⏭ Pulado: ${rosterResult.reason}`); skipped++; continue }

    // Criar Team + vincular à empresa.
    const team = await prisma.team.create({
      data: {
        name: blueprint.name,
        config: { useCase: blueprint.useCase, squadKey: blueprint.squadKey },
        status: 'active',
        createdBy: company.createdBy,
        companyId,
      },
    })
    await prisma.teamMember.createMany({
      data: rosterResult.roster.map(r => ({ teamId: team.id, agentId: r.agentId, role: r.role, position: r.position })),
    })
    console.log(`  ✓ Criado: ${blueprint.name} (${rosterResult.roster.length} membros)`)
    created++
  }

  console.log(`\n✅ Concluído: ${created} criados, ${skipped} pulados.\n`)
}

main().catch(err => { console.error(err); process.exit(1) }).finally(() => prisma.$disconnect())
