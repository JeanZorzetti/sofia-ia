# Research — Company Run Resilience (Phase 0)

## R1 — Detecção de esgotamento (dupla)

**Decisão**: Após `runTeamAndWait` numa fase, considerar **esgotada** quando:
```
result.status === 'rate_limited'
  || (result.status === 'completed' && isClaudeRateLimit(result.output))
```
`isClaudeRateLimit()` é **exportado** de `src/lib/ai/claude-token-pool.ts` (regex de fonte única,
linha 103) e casa "session/usage/weekly limit", "todas as contas no limite", "resets … (utc)", "429",
"quota" — com word boundaries (sem falso-positivo de "rate limiter"/"limite" solto).

**Racional**: na run do encurtador, o esgotamento chegou como **output** de um run `completed` (exit 0),
não como status `rate_limited` — por isso as fases viraram "completed" falso. O 2º ramo cobre exatamente
isso; o 1º cobre quando o run já sinaliza `rate_limited`.

**Rejeitado**: detectar só por `status` → não pega o caso real (output mascarado). Criar regex novo →
duplicaria a fonte única do pool.

## R2 — Estado e colunas

**Decisão**: `'blocked'` já é status válido em CompanyRun/CompanyPhaseRun (a 005 usa para cargo essencial
vago). Reusar. Adicionar:
- `CompanyRun.resetAt DateTime?` — campo **dedicado e indexável** (o cron filtra `resetAt <= now`).
- `CompanyPhaseRun.usage Json?` — proxy de consumo da fase.

`CompanyRun.currentPhase` (existente) já marca a fase de parada.

**Racional**: `resetAt` como coluna (não Json) porque o cron precisa filtrar/ordenar por ela.
`usage` como Json porque é um agregado flexível por fase, não consultado por valor.

**Rejeitado**: pôr `resetAt` no `error`/Json → cron não filtra eficientemente. Tabela separada de usage →
overkill; o dado é 1:1 com a fase.

## R3 — Retomada (manual + automática)

**Decisão**: `runCompany(companyRunId)` vira **retomável e idempotente**:
1. Carrega `phaseRuns` existentes (ordenadas por `position`).
2. As `completed` são **puladas**; `prevArtifact` = `outputArtifact` da última `completed`.
3. Recomeça o loop da 1ª fase não-`completed`: uma `blocked`/`failed`/`pending` existente é **reusada**
   (resetada para `pending`/`running`), e fases ainda inexistentes são criadas como hoje.
4. Guarda de concorrência: só age se a run está `pending`/`running`/`blocked`; marca `running` ao iniciar.

- **Manual**: `POST /api/companies/[id]/runs/[runId]/resume` valida ownership + status `blocked`, limpa
  `resetAt`, marca `running` e dispara `runCompany(runId)` via `after()` (mesmo padrão do `run/route.ts`).
- **Automática**: cron `GET /api/cron/resume-blocked-companies` busca `status='blocked' AND resetAt<=now`
  e chama o mesmo caminho de resume para cada (take limitado).

**Racional**: reusa o encadeamento N→N+1 já existente; não reexecuta o concluído (SC-003). Varredura
periódica é mais simples/resiliente que agendar um job no horário exato.

**Rejeitado**: recomeçar do zero (perde o trabalho); agendador de job exato por run (mais frágil que a
varredura).

## R4 — Proxy de consumo persistido

**Decisão**: ao terminar cada fase (qualquer status), gravar `CompanyPhaseRun.usage`:
```jsonc
{
  "turns": 1,                 // TeamRun.turnsUsed
  "durationMs": 4731000,      // TeamRun.durationMs (fallback: completedAt-startedAt)
  "byModel": { "claude-sonnet-4-6": 8, "claude-opus-4-8": 5 }, // turns × modelWeight por membro
  "weightedUnits": 13,        // soma — proxy de "esforço" comparável entre fases
  "blocked": false            // true se a fase bloqueou por limite
}
```
`modelWeight`: opus=5, sonnet=1 (Opus pesa ~5× na janela). `weightedUnits` é a métrica comparável de
consumo (independe do token-count que subconta). Persistido por fase → consultável por fase e por missão
(via CompanyRun).

**Racional**: honesto sobre a subcontagem; usa só sinais confiáveis (turns, duração, modelos do roster).
Forma a base para estimativa simples futura (sem ML).

**Rejeitado**: confiar em `TeamRun.tokensUsed`/`TeamMemberUsage` como verdade (subcontam — 3 fases=0).

## R5 — Cron de auto-resume

**Decisão**: replicar `api/cron/run-scheduled-teams/route.ts`: `verifyCronAuth(request)` (Bearer
CRON_SECRET), `dynamic='force-dynamic'`, `maxDuration=300`, `take: 50`, retorna JSON `{processed,results}`.
Registrar no cron-job.org junto dos demais crons.

## R6 — stats-cache.json (deferido)

**Investigação**: o `stats-cache.json` do Claude Code vive em `~/.claude/` **no worker** (vps-local) que
roda o claude-cli, e o pool troca de conta (`CLAUDE_CODE_OAUTH_TOKEN`) por chamada — o cache local não
agrega o consumo das N contas de forma fiel, e o `company-run.ts` roda no processo Next (não no worker),
sem acesso direto ao FS do worker. **Decisão**: o proxy (R4) é a base desta entrega; instrumentar
stats-cache fica como **follow-up** (exigiria coletá-lo no worker e propagá-lo no resultado do run) se
provar fiel. Não é pré-requisito (alinhado à Q2: proxy persistido).
