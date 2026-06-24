/**
 * Relatório de consumo de uma CompanyRun (Feature 007).
 *
 * Lê uma execução de empresa e imprime: status REAL por fase (distinguindo concluída de
 * BLOQUEADA-por-limite), tokens/custo/turns/duração + proxy de consumo (weightedUnits) por
 * fase, agregados por modelo e por agente/cargo, total, e a fase/motivo de parada.
 *
 * Uso:
 *   DATABASE_URL='postgres://…@2.24.207.200:5435/sofia_db?sslmode=disable' \
 *   npx tsx scripts/report-company-run.ts --run <runId>
 *   npx tsx scripts/report-company-run.ts --company <companyId>     (usa a última run)
 *   (sem args: usa ROI_LABS_COMPANY_ID)
 *
 * Read-only. Degrada com "—" em dados ausentes.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const fmt = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('pt-BR'))
const secs = (a?: Date | null, b?: Date | null) => (a && b ? `${((+b - +a) / 1000).toFixed(0)}s` : '—')

interface UsageProxy { turns?: number; durationMs?: number | null; byModel?: Record<string, number>; weightedUnits?: number; blocked?: boolean }

async function resolveRunId(): Promise<string | null> {
  const explicit = argValue('--run')
  if (explicit) return explicit
  const companyId = argValue('--company') || process.env.ROI_LABS_COMPANY_ID
  if (!companyId) return null
  const last = await prisma.companyRun.findFirst({ where: { companyId }, orderBy: { createdAt: 'desc' }, select: { id: true } })
  return last?.id ?? null
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL ausente.')
  const runId = await resolveRunId()
  if (!runId) { console.log('Passe --run <id> ou --company <id> (ou defina ROI_LABS_COMPANY_ID).'); return }

  const run = await prisma.companyRun.findUnique({
    where: { id: runId },
    include: { phaseRuns: { orderBy: { position: 'asc' } }, company: { select: { name: true } } },
  })
  if (!run) { console.log(`Execução ${runId} não encontrada.`); return }

  console.log('═══════════════════════════════════════════════════════════')
  console.log(`RUN ${run.id} · empresa "${run.company.name}"`)
  console.log(`missão: ${run.mission.slice(0, 90)}`)
  console.log(`status: ${run.status}${run.status === 'blocked' ? '  ⛔ (bloqueada por limite)' : ''}  ·  fase de parada: ${run.currentPhase ?? '—'}`)
  if (run.resetAt) console.log(`reset da janela: ${run.resetAt.toISOString()} (retomável manual ou via cron após esse horário)`)
  console.log(`duração total: ${secs(run.startedAt, run.completedAt)}`)
  if (run.error) console.log(`motivo: ${run.error.slice(0, 200)}`)
  console.log('═══════════════════════════════════════════════════════════\n')

  let grandTokens = 0, grandCost = 0, grandWeighted = 0
  const byModel = new Map<string, number>()
  const byAgent = new Map<string, { tokens: number; role: string }>()
  const statusIcon: Record<string, string> = { completed: '✅', blocked: '⛔', failed: '❌', skipped: '⏭️', running: '⏳', pending: '·' }

  console.log('FASES DO SDLC:')
  for (const ph of run.phaseRuns) {
    const u = (ph.usage ?? {}) as UsageProxy
    let tr = null
    if (ph.teamRunId) {
      tr = await prisma.teamRun.findUnique({
        where: { id: ph.teamRunId },
        include: { memberUsages: true, team: { include: { members: { include: { agent: { select: { name: true } } } } } } },
      })
    }
    const memberById = new Map(tr?.team.members.map(m => [m.id, m]) ?? [])
    for (const usg of tr?.memberUsages ?? []) {
      const m = usg.memberId ? memberById.get(usg.memberId) : undefined
      const model = usg.model ?? m?.model ?? '?'
      byModel.set(model, (byModel.get(model) ?? 0) + usg.tokens)
      const aname = m?.agent.name ?? '(removido)'
      const cur = byAgent.get(aname) ?? { tokens: 0, role: m?.role ?? '?' }
      cur.tokens += usg.tokens
      byAgent.set(aname, cur)
    }
    grandTokens += tr?.tokensUsed ?? 0
    grandCost += tr?.estimatedCost ?? 0
    grandWeighted += u.weightedUnits ?? 0
    console.log(
      `  ${String(ph.position)}. ${(statusIcon[ph.status] ?? '?')} ${ph.phase.padEnd(15)} [${ph.status.padEnd(9)}] ` +
      `tokens=${fmt(tr?.tokensUsed)} cost=$${(tr?.estimatedCost ?? 0).toFixed(4)} turns=${fmt(tr?.turnsUsed)} ` +
      `dur=${tr?.durationMs ? (tr.durationMs / 1000).toFixed(0) + 's' : secs(ph.startedAt, ph.completedAt)} · proxy=${fmt(u.weightedUnits)}u`,
    )
    if (ph.status === 'blocked') console.log(`        └─ ${(ph.error ?? '').slice(0, 200)}`)
  }

  console.log(`\nTOTAL: ~${fmt(grandTokens)} tokens medidos · ~$${grandCost.toFixed(4)} · proxy ${fmt(grandWeighted)} unidades de esforço`)

  if (byModel.size) {
    console.log('\nPOR MODELO (tokens medidos):')
    for (const [model, t] of [...byModel.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${model.padEnd(22)} ${fmt(t)}`)
  }
  if (byAgent.size) {
    console.log('\nPOR AGENTE/CARGO (tokens medidos):')
    for (const [name, info] of [...byAgent.entries()].sort((a, b) => b[1].tokens - a[1].tokens)) console.log(`  ${name.padEnd(42)} ${info.role.padEnd(8)} ${fmt(info.tokens)}`)
  }
  console.log('\nNota: "tokens medidos" subcontam o claude-cli; o "proxy de esforço" (turns × peso-do-modelo) é a base comparável.')
}

main().catch(e => console.error('ERR:', e instanceof Error ? e.message : e)).finally(() => prisma.$disconnect())
