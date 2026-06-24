# Contract — Company Run Resilience (Phase 1)

## C1 — Helpers puros (`src/lib/companies/company-resilience.ts`)

```ts
// Esgotamento do pool? (reusa isClaudeRateLimit do claude-token-pool)
export function isPhaseExhausted(result: { status: string; output: string | null }): boolean
//   true se status==='rate_limited' OU (status==='completed' && isClaudeRateLimit(output))

// Extrai o reset (UTC) de um texto "… resets 4:30pm (UTC)" → Date | null (puro, à prova de ausência)
export function parseResetAt(text: string | null | undefined, now?: Date): Date | null

// Proxy de consumo de uma fase a partir de sinais confiáveis
export function computeUsageProxy(input: {
  turnsUsed: number | null; durationMs: number | null;
  members: { model: string | null }[]; blocked: boolean
}): { turns: number; durationMs: number | null; byModel: Record<string, number>; weightedUnits: number; blocked: boolean }

export const MODEL_WEIGHT: (model: string | null) => number  // opus→5, sonnet→1, default 1
```

**Invariantes (testáveis sem DB)**:

| # | Invariante |
|---|---|
| INV-1 | `isPhaseExhausted({status:'completed', output:'…todas as contas no limite · resets 5pm (UTC)'})` === true |
| INV-2 | `isPhaseExhausted({status:'rate_limited', output:null})` === true |
| INV-3 | `isPhaseExhausted({status:'completed', output:'Entreguei o código do rate limiter.'})` === false (sem falso-positivo) |
| INV-4 | `isPhaseExhausted({status:'failed', output:'erro de compilação'})` === false (erro real ≠ esgotamento) |
| INV-5 | `parseResetAt('resets 4:30pm (UTC)')` retorna um Date hoje às 16:30 UTC (futuro→hoje, passado→+1 dia) |
| INV-6 | `parseResetAt('sem reset aqui')` === null |
| INV-7 | `computeUsageProxy({turnsUsed:1, members:[{model:'claude-opus-4-8'},{model:'claude-sonnet-4-6'}], …})` ⇒ `weightedUnits = 1*5 + 1*1 = 6` |
| INV-8 | `MODEL_WEIGHT('claude-opus-4-8')===5`, `MODEL_WEIGHT('claude-sonnet-4-6')===1` |

## C2 — `runCompany` (modificado, em `company-run.ts`)

**Pós-condições**:
- Fase esgotada ⇒ `CompanyPhaseRun.status='blocked'`, `usage.blocked=true`; `CompanyRun.status='blocked'`,
  `resetAt` setado (se o CLI reportou), `currentPhase` = fase; **nenhuma** fase posterior iniciada.
- Erro não-limite ⇒ `status='failed'` (inalterado).
- Caminho feliz ⇒ idêntico ao legado (todas as fases `completed`, run `completed`).
- Toda fase concluída/bloqueada grava `usage` (proxy).
- **Retomada**: ao ser chamado para uma run com phaseRuns existentes, pula `completed`, reusa a 1ª
  não-completed; nunca duplica phaseRuns (única por `position`).

## C3 — `POST /api/companies/[id]/runs/[runId]/resume`

- Auth: `withAuth` + ownership da empresa (404 se não-dono). Espelha `run/route.ts`.
- Pré: run pertence à empresa e `status === 'blocked'` (senão 409 com motivo).
- Efeito: limpa `resetAt`, marca `running`, dispara `runCompany(runId)` via `after()`; responde `202`.
- Idempotência: se já `running`, não redispara (409).

## C4 — `GET /api/cron/resume-blocked-companies`

- Auth: `verifyCronAuth` (Bearer CRON_SECRET) → 401 senão.
- Busca: `companyRun` `status='blocked' AND resetAt != null AND resetAt <= now` (`take: 50`).
- Efeito: para cada, mesmo caminho do resume (marca `running`, `after(runCompany)`); retorna
  `{ processed, results: [{runId, status}] }`. Runs sem `resetAt` (reset desconhecido) **não** entram.

## C5 — `scripts/report-company-run.ts` (read-only, permanente)

- Entrada: `--run <id>` ou `--company <id>` (usa a última run) ou `ROI_LABS_COMPANY_ID`.
- Saída: por fase (status real, tokens/custo/turns/duração, `usage.weightedUnits`), agregados por modelo e
  por agente/cargo, total, e fase/motivo de parada (incl. `blocked` + `resetAt`).
- Degrada com "—" em dados ausentes; nunca quebra se faltar run/usage.

## C6 — Coordinator (NON-NEGOTIABLE)

Nenhum arquivo em `src/lib/orchestration/team/{team-coordinator,team-executor,graph-coordinator}` é
modificado. `runTeamAndWait` é apenas **consumido**. Verificação: diff vazio nesses arquivos (gate T).
