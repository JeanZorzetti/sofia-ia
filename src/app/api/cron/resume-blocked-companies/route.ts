// 007-company-run-resilience — GET /api/cron/resume-blocked-companies
// Varredura periódica (cron-job.org, Bearer CRON_SECRET): retoma automaticamente as
// CompanyRun bloqueadas por limite cujo horário de reset já passou. Runs sem resetAt
// (reset desconhecido) NÃO entram. Espelha o padrão de api/cron/run-scheduled-teams.
import { NextRequest, NextResponse, after } from 'next/server'
import { safeErrorMessage } from '@/lib/api-response'
import { prisma } from '@/lib/prisma'
import { verifyCronAuth } from '@/lib/authz'
import { runCompany } from '@/lib/companies/company-run'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    console.warn('[cron/resume-blocked-companies] Unauthorized attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const results: Array<{ runId: string; status: string }> = []

  try {
    const due = await prisma.companyRun.findMany({
      where: { status: 'blocked', resetAt: { not: null, lte: now } },
      take: 50,
      select: { id: true },
    })
    console.log(`[cron/resume-blocked-companies] ${due.length} due at ${now.toISOString()}`)

    for (const run of due) {
      // Marca running ANTES do dispatch (uma próxima varredura não re-seleciona a mesma run).
      await prisma.companyRun.update({ where: { id: run.id }, data: { status: 'running', resetAt: null, error: null } })
      after(async () => {
        try { await runCompany(run.id) }
        catch (err) { console.error(`[cron/resume-blocked-companies] runCompany ${run.id} falhou:`, err) }
      })
      results.push({ runId: run.id, status: 'resumed' })
    }

    return NextResponse.json({ processed: due.length, results, timestamp: now.toISOString() })
  } catch (error) {
    console.error('[cron/resume-blocked-companies] Fatal error:', error)
    return NextResponse.json({ error: 'Internal server error', details: safeErrorMessage(error) }, { status: 500 })
  }
}
