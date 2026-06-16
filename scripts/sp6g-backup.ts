/**
 * SP6g backup — dump das tabelas da engine de Orquestrações ANTES do DROP (insurance).
 * Run: DATABASE_URL='...' npx tsx scripts/sp6g-backup.ts
 */
import { PrismaClient } from '@prisma/client'
import { writeFileSync, mkdirSync } from 'node:fs'

const p = new PrismaClient()
const OUT = 'docs/superpowers/backups/2026-06-16-orchestration-engine-dump.json'

async function main() {
  const agent_orchestrations = await p.$queryRawUnsafe<any[]>('SELECT * FROM agent_orchestrations ORDER BY created_at')
  const orchestration_executions = await p.$queryRawUnsafe<any[]>('SELECT * FROM orchestration_executions ORDER BY started_at')
  const scheduled_executions = await p.$queryRawUnsafe<any[]>('SELECT * FROM scheduled_executions')

  const dump = {
    exportedAt: new Date().toISOString(),
    note: 'SP6g — seed/demo do admin antes do DROP. Recuperável via git. Sem dados de cliente.',
    agent_orchestrations,
    orchestration_executions,
    scheduled_executions,
  }
  mkdirSync('docs/superpowers/backups', { recursive: true })
  writeFileSync(OUT, JSON.stringify(dump, (_k, v) => (typeof v === 'bigint' ? Number(v) : v), 2))
  console.log(`✅ Backup salvo em ${OUT}: ${agent_orchestrations.length} orch, ${orchestration_executions.length} exec, ${scheduled_executions.length} sched`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
