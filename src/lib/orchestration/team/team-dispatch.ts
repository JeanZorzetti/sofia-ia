// 008-team-run-resilience — re-dispatch de um TeamRun EXISTENTE para RETOMADA (resume
// manual + cron). Espelha o dispatch do start-team-run, mas a partir de um runId já criado:
// o coordinator (runTeam) relê o board e continua do pendente. NÃO toca o coordinator.
import { after } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runWithOwnerClaudeToken } from '@/lib/settings/claude-token-service'

/**
 * Re-dispara o coordinator para um TeamRun (após resetRunForResume). Code-runs voltam à
 * fila durável; chat-runs rodam o coordinator após a resposta (mesmo wrapper-stack do
 * start: withRateLimitCapture(withUsageTracking(chatWithAgent))).
 */
export async function dispatchTeamRun(runId: string): Promise<void> {
  const run = await prisma.teamRun.findUnique({
    where: { id: runId },
    select: { id: true, mode: true, team: { select: { config: true, createdBy: true } } },
  })
  if (!run) throw new Error(`TeamRun ${runId} não encontrado`)

  if (run.mode === 'code') {
    const { enqueueCodeRun } = await import('@/lib/queue/code-run-queue')
    await enqueueCodeRun(runId)
    return
  }

  // chat-run: roda o coordinator após a resposta (mesmo padrão do start-team-run).
  after(async () => {
    try {
      const { runTeamByTopology } = await import('@/lib/orchestration/team/team-executor')
      const { createPrismaTeamStore } = await import('@/lib/orchestration/team/team-store')
      const { chatWithAgent } = await import('@/lib/ai/groq')
      const { withUsageTracking } = await import('@/lib/orchestration/team/member-usage-recorder')
      const { withRateLimitCapture } = await import('@/lib/orchestration/team/team-resilience')
      const { readTeamSystemPrompt } = await import('@/lib/orchestration/team/team-system-prompt')
      const { materializeRunAttachments } = await import('@/lib/orchestration/team/materialize-attachments')
      const teamSystemPrompt = readTeamSystemPrompt(run.team.config)
      const attachmentDir = await materializeRunAttachments(runId)
      // 011-byos: a resumed BYOS run must retry with the owner's token (set inside after()
      // — ALS doesn't cross the boundary). No token → byte-identical to the pool resume.
      await runWithOwnerClaudeToken(run.team.createdBy, () => runTeamByTopology(runId, {
        store: createPrismaTeamStore(),
        chat: withRateLimitCapture(withUsageTracking((agentId, messages, ctx, opts) => chatWithAgent(agentId, messages as never, ctx, { ...opts, teamSystemPrompt, attachmentDir }))),
      }))
      const { dispatchTeamOutputs } = await import('@/lib/orchestration/team/team-outputs')
      await dispatchTeamOutputs(runId)
    } catch (err) {
      console.error('[Teams] resume dispatch failed:', err)
    }
  })
}
