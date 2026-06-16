/**
 * SP6g verify — confirma que as 3 tabelas da engine foram DROPADAS em prod.
 * Run: DATABASE_URL='...' npx tsx scripts/sp6g-verify.ts
 */
import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const rows = await p.$queryRawUnsafe<any[]>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name IN ('agent_orchestrations','orchestration_executions','scheduled_executions')`,
  )
  if (rows.length === 0) {
    console.log('✅ As 3 tabelas da engine de Orquestrações NÃO existem mais. Drop confirmado.')
  } else {
    console.error('❌ Ainda existem:', rows.map(r => r.table_name))
    process.exit(1)
  }
  // sanity: scheduled_team_runs (SP3) e teams seguem vivos
  const kept = await p.$queryRawUnsafe<any[]>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('scheduled_team_runs','teams','team_runs')`,
  )
  console.log('   Preservadas:', kept.map(r => r.table_name).sort().join(', '))
}
main().catch(e => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
