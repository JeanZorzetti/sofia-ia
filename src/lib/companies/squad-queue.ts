// 009-usecase-squads — Gate de fila global de squad-runs (WIP=1).
//
// Contrato público:
//   enqueueSquadRun(squadId, mission) → TeamRun.id
//   dispatchSquadQueue()              → void
//   cancelSquadRun(runId, auth)       → encerra um run (pending/running) do dono
//
// Princípio II: nunca edita o coordinator (runTeam/team-executor).
// Integra resiliência 008: pausa se há rate_limited com resetAt futuro.
import { prisma } from '@/lib/prisma'
import { isClaudeRateLimit } from '@/lib/ai/claude-token-pool'
import { ownerId } from '@/lib/authz'
import type { JWTPayload } from '@/lib/auth'

// Chave de advisory lock fixada para a fila de squad-runs (valor arbitrário único).
const SQUAD_QUEUE_LOCK = BigInt(1_299_009)

/** Predicado Prisma que identifica squad-runs (time com companyId != null e status active). */
function squadRunWhere(status: string) {
  return {
    status,
    team: { companyId: { not: null }, status: 'active' },
  }
}

/**
 * Tenta atomicamente reivindicar o próximo run pending.
 * Usa pg_advisory_xact_lock para garantir WIP=1 global entre instâncias/requests.
 * Retorna o run reivindicado ou null se nada a fazer.
 */
async function claimNextRun(): Promise<{ id: string; teamId: string; mission: string } | null> {
  return prisma.$transaction(async (tx) => {
    // Lock exclusivo — bloqueia até que outra instância que tenha o lock termine.
    // pg_advisory_xact_lock retorna `void`; usar $executeRaw (retorna contagem) e NÃO
    // $queryRaw, que tenta desserializar a coluna void e lança P2010.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${SQUAD_QUEUE_LOCK}::bigint)`

    // Re-check WIP=1 sob o lock.
    const running = await tx.teamRun.findFirst({ where: squadRunWhere('running'), select: { id: true } })
    if (running) return null

    const next = await tx.teamRun.findFirst({
      where: squadRunWhere('pending'),
      orderBy: { createdAt: 'asc' },
      select: { id: true, teamId: true, mission: true },
    })
    if (!next) return null

    // Claim: eleva a running dentro da mesma transação — lock liberado no commit.
    await tx.teamRun.update({
      where: { id: next.id },
      data: { status: 'running', startedAt: new Date() },
    })
    return next
  })
}

/**
 * Enfileira um squad-run: cria TeamRun com status 'pending'.
 * Retorna o runId criado.
 */
export async function enqueueSquadRun(squadId: string, mission: string): Promise<string> {
  const run = await prisma.teamRun.create({
    data: { teamId: squadId, mission: mission.trim(), status: 'pending', mode: 'chat' },
  })
  return run.id
}

/**
 * Retorna a posição do run na fila (0 = próximo a rodar).
 * Usado pela rota /run para informar ao caller se ficou enfileirado.
 */
export async function getQueuePosition(runId: string): Promise<number> {
  const run = await prisma.teamRun.findUnique({ where: { id: runId }, select: { createdAt: true } })
  if (!run) return 0
  const ahead = await prisma.teamRun.count({
    where: { ...squadRunWhere('pending'), createdAt: { lt: run.createdAt } },
  })
  return ahead
}

/**
 * Dispatcher de fila. Chamado via after() após enqueue ou por cron.
 * WIP=1 é garantido atomicamente via pg_advisory_xact_lock.
 */
export async function dispatchSquadQueue(): Promise<void> {
  // Pausa se pool esgotado (integra resiliência 008).
  const rateLimited = await prisma.teamRun.findFirst({
    where: { ...squadRunWhere('rate_limited'), resetAt: { gt: new Date() } },
    select: { id: true },
  })
  if (rateLimited) {
    console.log('[squad-queue] Pool esgotado (rate_limited) — dispatcher pausado')
    return
  }

  const next = await claimNextRun()
  if (!next) return

  try {
    // Executa O PRÓPRIO run da fila (já criado + claimed). Usar runTeamAndWait aqui
    // criaria um SEGUNDO TeamRun (duplicação) — o coordinator roda sobre next.id.
    const { executeTeamRunInline } = await import('@/lib/orchestration/team/start-team-run')
    const result = await executeTeamRunInline(next.id)

    const exhausted = result.status === 'rate_limited' || (result.status === 'completed' && isClaudeRateLimit(result.output))
    if (exhausted) {
      console.log(`[squad-queue] Pool esgotado durante run ${next.id}`)
    }
  } catch (err) {
    console.error(`[squad-queue] executeTeamRunInline falhou para ${next.id}:`, err)
    await prisma.teamRun.update({
      where: { id: next.id },
      data: { status: 'failed', error: err instanceof Error ? err.message : 'Erro inesperado' },
    }).catch(() => {})
  }

  // Drena o próximo pending (chain).
  await dispatchSquadQueue().catch(err => console.error('[squad-queue] chain dispatch falhou:', err))
}

/** Estado global da fila para a rota GET /api/squad-runs/queue. */
export interface QueueState {
  running?: { runId: string; squadId: string; companyId: string | null; startedAt: string }
  queue: { runId: string; squadId: string; companyId: string | null; position: number; createdAt: string }[]
}

export async function getSquadQueueState(): Promise<QueueState> {
  const [runningRun, pendingRuns] = await Promise.all([
    prisma.teamRun.findFirst({
      where: squadRunWhere('running'),
      select: { id: true, teamId: true, startedAt: true, team: { select: { companyId: true } } },
    }),
    prisma.teamRun.findMany({
      where: squadRunWhere('pending'),
      orderBy: { createdAt: 'asc' },
      select: { id: true, teamId: true, createdAt: true, team: { select: { companyId: true } } },
    }),
  ])

  return {
    running: runningRun
      ? { runId: runningRun.id, squadId: runningRun.teamId, companyId: runningRun.team.companyId, startedAt: runningRun.startedAt.toISOString() }
      : undefined,
    queue: pendingRuns.map((r, i) => ({
      runId: r.id, squadId: r.teamId, companyId: r.team.companyId, position: i, createdAt: r.createdAt.toISOString(),
    })),
  }
}

export type CancelSquadRunResult =
  | { ok: true }
  | { ok: false; status: number; error: string }

/**
 * Encerra um squad-run. Escopado ao dono (Company.createdBy == ownerId) → IDOR vira 404.
 * Só cancela runs em andamento (pending/running/rate_limited); finalizados → 400.
 * Após cancelar, dispara o dispatcher para drenar o próximo da fila (libera o slot WIP=1).
 */
export async function cancelSquadRun(runId: string, auth: JWTPayload): Promise<CancelSquadRunResult> {
  const run = await prisma.teamRun.findFirst({
    where: {
      id: runId,
      team: { companyId: { not: null }, company: { createdBy: ownerId(auth) } },
    },
    select: { id: true, status: true },
  })
  if (!run) return { ok: false, status: 404, error: 'Run not found' }
  if (run.status !== 'pending' && run.status !== 'running' && run.status !== 'rate_limited') {
    return { ok: false, status: 400, error: 'Run já finalizado — não pode ser encerrado' }
  }

  await prisma.teamRun.update({
    where: { id: runId },
    data: { status: 'cancelled', completedAt: new Date(), error: 'Encerrado pelo usuário' },
  })
  return { ok: true }
}
