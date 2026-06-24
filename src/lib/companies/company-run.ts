// 005-agentic-companies — META-ORQUESTRADOR (R1). Para cada fase do SDLC, monta o roster
// (buildPhaseRoster), cria um Time `internal` (createTeamWithRoster — reusa os agentes
// ENCAIXADOS, não cria agentes novos) e CHAMA `runTeamAndWait` por fase, encadeando o
// artefato N→N+1. NUNCA importa/edita o coordinator (`runTeam`/`team-executor`) — Princípio II.
import { prisma } from '@/lib/prisma'
import { SDLC_PHASES } from './sdlc'
import { buildPhaseRoster, phaseMission, type Staffing } from './phase-roster'
import type { RaciMatrix } from './raci'
import { createTeamWithRoster } from '@/lib/orchestration/team/create-team'
import { runTeamAndWait } from '@/lib/orchestration/team/start-team-run'

/**
 * Executa uma CompanyRun percorrendo as 7 fases sequencialmente. Idempotência simples:
 * só roda se o run ainda estiver `pending`/`running`. Persiste cada CompanyPhaseRun.
 */
export async function runCompany(companyRunId: string): Promise<void> {
  const run = await prisma.companyRun.findUnique({
    where: { id: companyRunId },
    include: { company: { include: { roles: true } } },
  })
  if (!run) { console.error('[company-run] CompanyRun não encontrado:', companyRunId); return }

  const company = run.company
  const raci = (company.raci ?? {}) as RaciMatrix
  // Mapa roleKey → agentId apenas dos cargos OCUPADOS.
  const staffing: Staffing = {}
  for (const role of company.roles) if (role.agentId) staffing[role.key] = role.agentId

  await prisma.companyRun.update({
    where: { id: companyRunId },
    data: { status: 'running', startedAt: new Date() },
  })

  let prevArtifact: string | null = null
  let finalOutput: string | null = null

  try {
    for (let i = 0; i < SDLC_PHASES.length; i++) {
      const phase = SDLC_PHASES[i]
      const phaseRun = await prisma.companyPhaseRun.create({
        data: { companyRunId, phase: phase.key, position: i, status: 'pending', inputArtifact: prevArtifact },
      })
      await prisma.companyRun.update({ where: { id: companyRunId }, data: { currentPhase: phase.key } })

      const built = buildPhaseRoster(raci, phase.key, staffing)
      if (!built.ok) {
        // Fase essencial vaga → bloqueia o run inteiro (A1). Não-essencial → pula.
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

      // U1: o loop revisor (QA=reviewer) é nativo; o status terminal do TeamRun reflete a
      // convergência (`completed`) vs falha/teto de iterações (`failed`/`rate_limited`/`cancelled`).
      const ok = result.status === 'completed'
      await prisma.companyPhaseRun.update({
        where: { id: phaseRun.id },
        data: {
          status: ok ? 'completed' : 'failed',
          teamRunId: result.runId,
          outputArtifact: result.output,
          error: ok ? null : (result.error ?? `Fase terminou em status "${result.status}"`),
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
