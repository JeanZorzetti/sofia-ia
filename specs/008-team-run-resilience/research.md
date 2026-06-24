# Research — Team Run Resilience (Phase 0)

## R1 — Ponto exato do "completed falso" (marcação)

**Achado**: em `src/lib/ai/groq.ts`, o caminho claude-cli faz:
```ts
const response = await withClaudeTokenFailover(
  (token) => ClaudeCliService.generate(...),
  { isLimited: (e) => isClaudeRateLimit(String((e as Error)?.message ?? e)) },
)
return { message: response.content, ... }
} catch (error) {
  return { message: `Erro na execução do Claude CLI: ${...}`, ... }  // ← engole o rate-limit
}
```
Quando o pool esgota, `withClaudeTokenFailover` lança `ClaudeRateLimitError`. O `catch` o transforma em
`{ message: 'Erro na execução…' }` — uma "resposta" normal. O coordinator recebe isso como resposta → não
detecta esgotamento → `finish('completed')` falso.

**Decisão**: no `catch`, se o erro é rate-limit (`error instanceof ClaudeRateLimitError ||
isClaudeRateLimit(msg)`), **re-lançar** (não retornar como message). O coordinator já trata:
`catch (e) { if (isRateLimit(e)) finish('rate_limited') }`, e `team-board.isRateLimit` reconhece
`name === 'ClaudeRateLimitError'`. Aplicar o mesmo no ramo opencode-cli se houver. **Não** toca o
coordinator.

**Rejeitado**: alargar o regex de `team-board.isRateLimit` p/ cobrir "session limit" → editaria um helper
do coordinator (zona do Princípio II) e trataria o sintoma, não a causa (o erro engolido).

## R2 — Captura do horário de reset sem tocar o coordinator

**Problema**: o coordinator finaliza com `error='Rate limit durante <fase>'` (string fixa, sem o reset).
O reset ("resets 5pm (UTC)") está na mensagem do `ClaudeRateLimitError`, que o coordinator descarta.

**Decisão**: wrapper de chat injetado `withRateLimitCapture(chat)` (composto com `withUsageTracking` no
dispatch): chama o `chat`; no `catch`, se rate-limit, faz `parseResetAt(err.message)` (reusa o helper da
007) e grava `TeamRun.resetAt` via `opts.runId`, depois **re-lança**. Como `finishRun` do coordinator não
escreve `resetAt`, o valor sobrevive. Tudo fora do coordinator.

**Rejeitado**: fazer `groq.ts` escrever no TeamRun → acopla o chat genérico ao schema de Teams.

## R3 — Retomada por re-dispatch (o coordinator é retomável)

**Achado**: `runTeam` relê `store.listTasks(runId)` a cada turno e executa só `status==='todo'`; tarefas
`done` não são recriadas (o lead as vê via `buildLeadContext`).

**Decisão**: retomar = (a) `resetRunForResume(runId)`: tasks `doing`→`todo` (a interrompida re-executa),
run `rate_limited`→`pending`, `resetAt`→null; (b) `dispatchTeamRun(runId)`: re-dispara o coordinator no
mesmo run. `setRunRunning` do coordinator assume daí; o lead continua do pendente.

**Rejeitado**: criar um run novo herdando tasks → duplicaria estado; re-planejar do zero perde trabalho.

## R4 — Dispatch centralizado (`dispatchTeamRun`)

**Decisão**: extrair o bloco `after(() => runTeamByTopology(...))` (chat) + `enqueueCodeRun` (code) do
`start-team-run.ts` para `dispatchTeamRun(runId)`. `start-team-run` passa a chamá-lo (refator puro, mesmo
comportamento) e o resume/cron o reusam. Inclui `withRateLimitCapture` na composição da ChatFn.

**Rejeitado**: duplicar o setup do `after()` no resume → divergência futura.

## R5 — Schema

`TeamRun.resetAt DateTime?` + `@@index([status, resetAt])`. `rate_limited` já é status terminal. Migração
formal no host real.

## R6 — Cron de auto-resume

Replica `api/cron/resume-blocked-companies` (007): `verifyCronAuth`, busca
`status='rate_limited' AND resetAt != null AND resetAt<=now` (`take`), `resetRunForResume` +
`dispatchTeamRun` cada. Registrar no cron-job.org.

## R7 — Escopo: só chat-runs precisam da correção de marcação

Code-runs (sandbox-cli-agent) já lançam `ClaudeRateLimitError` (inclusive exit-0-banner) → já marcam
`rate_limited`. A correção R1 é só do caminho chat. A retomada (R3) e o reset (R5) servem ambos os modos.
