// 005-agentic-companies — META-ORQUESTRADOR (R1). Para cada fase do SDLC, monta o roster
// (buildPhaseRoster), cria um Time `internal` (createTeamWithRoster — reusa os agentes
// ENCAIXADOS, não cria agentes novos) e CHAMA `runTeamAndWait` por fase, encadeando o
// artefato N→N+1. NUNCA importa/edita o coordinator (`runTeam`/`team-executor`) — Princípio II.
//
// 007-company-run-resilience: (a) esgotamento do pool numa fase → fase `blocked` (não
// `completed`/`failed`), run `blocked` + resetAt, PARA (não queima as fases seguintes);
// (b) `runCompany` é RETOMÁVEL — pula fases `completed` e recomeça da 1ª não-concluída;
// (c) grava um proxy de consumo por fase (independe do token-count que subconta o claude-cli).
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { SDLC_PHASES } from './sdlc'
import { buildPhaseRoster, phaseMission, type Staffing } from './phase-roster'
import type { RaciMatrix } from './raci'
import { createTeamWithRoster } from '@/lib/orchestration/team/create-team'
import { runTeamAndWait } from '@/lib/orchestration/team/start-team-run'
import { isPhaseExhausted, parseResetAt, computeUsageProxy } from './company-resilience'

/**
 * Executa (ou RETOMA) uma CompanyRun percorrendo as 7 fases do SDLC sequencialmente.
 * Retomável: só age se a run está `pending`/`running`/`blocked`; pula fases já `completed`
 * (reusando o artefato encadeado) e recomeça da primeira fase não-concluída.
 */
export async function runCompany(companyRunId: string): Promise<void> {
  const run = await prisma.companyRun.findUnique({
    where: { id: companyRunId },
    include: { company: { include: { roles: true } }, phaseRuns: true },
  })
  if (!run) { console.error('[company-run] CompanyRun não encontrado:', companyRunId); return }

  // Guarda de idempotência/concorrência: só roda se ainda há trabalho (pending/running/blocked).
  if (!['pending', 'running', 'blocked'].includes(run.status)) {
    console.warn(`[company-run] run ${companyRunId} em status "${run.status}" — nada a executar`)
    return
  }

  const company = run.company
  const raci = (company.raci ?? {}) as RaciMatrix
  // Mapa roleKey → agentId apenas dos cargos OCUPADOS.
  const staffing: Staffing = {}
  for (const role of company.roles) if (role.agentId) staffing[role.key] = role.agentId

  // Retomada: indexa as fases já persistidas por posição.
  const existingByPos = new Map<number, (typeof run.phaseRuns)[number]>()
  for (const pr of run.phaseRuns) existingByPos.set(pr.position, pr)

  // Ao (re)iniciar: status running, limpa o bloqueio anterior (resetAt/error).
  await prisma.companyRun.update({
    where: { id: companyRunId },
    data: { status: 'running', startedAt: run.startedAt ?? new Date(), resetAt: null, error: null },
  })

  let prevArtifact: string | null = null
  let finalOutput: string | null = null

  try {
    for (let i = 0; i < SDLC_PHASES.length; i++) {
      const phase = SDLC_PHASES[i]
      const existing = existingByPos.get(i)

      // Retomada: fase já concluída → pula, mas reconstrói o artefato encadeado.
      if (existing && existing.status === 'completed') {
        if (existing.outputArtifact) { prevArtifact = existing.outputArtifact; finalOutput = existing.outputArtifact }
        continue
      }
      // Fase não-essencial já pulada anteriormente → mantém pulada.
      if (existing && existing.status === 'skipped') continue

      // Cria a fase (1ª execução) ou reusa a linha existente (retomada), zerando o estado anterior.
      const phaseRun = existing
        ? await prisma.companyPhaseRun.update({
            where: { id: existing.id },
            data: { status: 'pending', inputArtifact: prevArtifact, teamRunId: null, outputArtifact: null, error: null, usage: Prisma.JsonNull, startedAt: null, completedAt: null },
          })
        : await prisma.companyPhaseRun.create({
            data: { companyRunId, phase: phase.key, position: i, status: 'pending', inputArtifact: prevArtifact },
          })
      await prisma.companyRun.update({ where: { id: companyRunId }, data: { currentPhase: phase.key } })

      const built = buildPhaseRoster(raci, phase.key, staffing)
      if (!built.ok) {
        // Fase essencial vaga → bloqueia o run inteiro (A1). Não-essencial → pula.
        // (Bloqueio por cargo vago não tem resetAt: não se resolve esperando — não é auto-retomável.)
        if (phase.essential) {
          await prisma.companyPhaseRun.update({ where: { id: phaseRun.id }, data: { status: 'blocked', error: built.error, completedAt: new Date() } })
          await prisma.companyRun.update({ where: { id: companyRunId }, data: { status: 'blocked', error: built.error, completedAt: new Date() } })
          return
        }
        await prisma.companyPhaseRun.update({ where: { id: phaseRun.id }, data: { status: 'skipped', error: built.error, completedAt: new Date() } })
        continue
      }

      // Materializa o Time da fase como `internal` (fora da UI de Times — R3).
      const created = await createTeamWithRoster({
        name: `${company.name} — ${phase.label}`,
        members: built.roster,
        userId: run.createdBy,
        status: 'internal',
        config: { companyId: company.id, companyRunId, phase: phase.key },
      })
      if (!created.ok) {
        await prisma.companyPhaseRun.update({ where: { id: phaseRun.id }, data: { status: 'failed', error: created.error, completedAt: new Date() } })
        await prisma.companyRun.update({ where: { id: companyRunId }, data: { status: 'failed', error: `Fase ${phase.label}: ${created.error}`, completedAt: new Date() } })
        return
      }

      await prisma.companyPhaseRun.update({ where: { id: phaseRun.id }, data: { status: 'running', startedAt: new Date() } })

      const mission = phaseMission(phase, run.mission, prevArtifact)
      const result = await runTeamAndWait(created.team.id, { mission })

      // 007: o esgotamento do pool chega como status 'rate_limited' OU como 'completed' com a
      // assinatura de limite no output (exit 0 — o bug que marcava a fase como concluída).
      const exhausted = isPhaseExhausted(result)

      // Proxy de consumo da fase (turns × peso-do-modelo por membro do roster).
      const teamRun = await prisma.teamRun.findUnique({
        where: { id: result.runId },
        select: { turnsUsed: true, durationMs: true, team: { select: { members: { select: { model: true, agent: { select: { model: true } } } } } } },
      })
      const members = (teamRun?.team.members ?? []).map(m => ({ model: m.model ?? m.agent.model }))
      const usage = computeUsageProxy({ turnsUsed: teamRun?.turnsUsed ?? null, durationMs: teamRun?.durationMs ?? null, members, blocked: exhausted })
      const usageJson = usage as unknown as Prisma.InputJsonValue

      if (exhausted) {
        // U2 (007): fase bloqueada por LIMITE (distinto de falha). Para o run, expõe o reset, NÃO segue.
        const resetAt = parseResetAt(result.output)
        await prisma.companyPhaseRun.update({
          where: { id: phaseRun.id },
          data: { status: 'blocked', teamRunId: result.runId, outputArtifact: result.output, error: `Pool Claude esgotado (rate limit)${result.error ? `: ${result.error}` : ''}`, usage: usageJson, completedAt: new Date() },
        })
        await prisma.companyRun.update({
          where: { id: companyRunId },
          data: { status: 'blocked', resetAt, error: `Fase ${phase.label} bloqueada por limite de cota${resetAt ? ` · reset ${resetAt.toISOString()}` : ' (reset desconhecido)'}`, completedAt: new Date() },
        })
        return
      }

      // U1: o loop revisor (QA=reviewer) é nativo; o status terminal do TeamRun reflete a
      // convergência (`completed`) vs falha/teto de iterações (`failed`/`cancelled`).
      const ok = result.status === 'completed'
      await prisma.companyPhaseRun.update({
        where: { id: phaseRun.id },
        data: {
          status: ok ? 'completed' : 'failed',
          teamRunId: result.runId,
          outputArtifact: result.output,
          error: ok ? null : (result.error ?? `Fase terminou em status "${result.status}"`),
          usage: usageJson,
          completedAt: new Date(),
        },
      })

      if (!ok) {
        await prisma.companyRun.update({
          where: { id: companyRunId },
          data: { status: 'failed', error: `Fase ${phase.label} falhou: ${result.error ?? result.status}`, completedAt: new Date() },
        })
        return
      }

      // Encadeia o artefato para a próxima fase.
      if (result.output) { prevArtifact = result.output; finalOutput = result.output }
    }

    await prisma.companyRun.update({
      where: { id: companyRunId },
      data: { status: 'completed', output: finalOutput, currentPhase: null, completedAt: new Date() },
    })
  } catch (err) {
    console.error('[company-run] execução falhou:', err)
    await prisma.companyRun.update({
      where: { id: companyRunId },
      data: { status: 'failed', error: err instanceof Error ? err.message : 'Erro inesperado', completedAt: new Date() },
    }).catch(() => {})
  }
}
