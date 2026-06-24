// 008-team-run-resilience — Injeção (fora do coordinator) para tratar esgotamento do
// pool num TeamRun: captura o reset e torna o run retomável. NÃO toca runTeam/team-board.
import type { ChatFn } from './team-types'
import { prisma } from '@/lib/prisma'
import { isClaudeRateLimit, ClaudeRateLimitError } from '@/lib/ai/claude-token-pool'
import { parseResetAt } from '@/lib/companies/company-resilience'

/**
 * Envolve uma ChatFn: quando uma chamada estoura por rate-limit, grava o horário de
 * reset (UTC) no TeamRun (via opts.runId) e RE-LANÇA — o coordinator já classifica o
 * throw como rate_limited (team-board.isRateLimit reconhece ClaudeRateLimitError).
 * Sem rate-limit: passthrough byte-idêntico. `finishRun` do coordinator não escreve
 * resetAt → o valor sobrevive.
 */
export function withRateLimitCapture(inner: ChatFn): ChatFn {
  return async (agentId, messages, ctx, opts) => {
    try {
      return await inner(agentId, messages, ctx, opts)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const isLimit = err instanceof ClaudeRateLimitError || isClaudeRateLimit(msg)
      if (isLimit && opts?.runId) {
        const resetAt = parseResetAt(msg)
        if (resetAt) {
          try {
            await prisma.teamRun.update({ where: { id: opts.runId }, data: { resetAt } })
          } catch {
            /* best-effort — nunca interrompe o run por causa do registro do reset */
          }
        }
      }
      throw err
    }
  }
}

/** Um TeamRun é retomável quando terminou por esgotamento. */
export function isResumable(run: { status: string }): boolean {
  return run.status === 'rate_limited'
}

/**
 * Prepara um TeamRun esgotado para re-execução (read-side; o coordinator não é tocado):
 *  - guarda ATÔMICA de concorrência: só age se ainda 'rate_limited' (updateMany);
 *  - tarefas 'doing' (interrompidas pelo limite) voltam a 'todo' para reexecução;
 *  - tarefas 'done' são preservadas (o coordinator relê o board e pula o concluído).
 * Retorna false se o run não estava esgotado (já retomado / estado inválido).
 */
export async function resetRunForResume(runId: string): Promise<boolean> {
  const { count } = await prisma.teamRun.updateMany({
    where: { id: runId, status: 'rate_limited' },
    data: { status: 'running', resetAt: null, error: null },
  })
  if (count === 0) return false
  await prisma.teamTask.updateMany({ where: { runId, status: 'doing' }, data: { status: 'todo' } })
  return true
}
