# Handoff — 007-company-run-resilience

**Data**: 2026-06-24 · **Status**: código entregue, `tsc` 0 erros, **migração aplicada no host real**, coordinator intocado. Falta E2E + registrar o cron.

## O que foi feito

Fluxo Spec Kit completo (specify→clarify→plan→tasks→implement) para resolver as 2 lacunas expostas pela run do encurtador (esgotamento silencioso + consumo invisível).

- **`src/lib/companies/company-resilience.ts`** (NOVO, puro): `isPhaseExhausted` (status `rate_limited` OU `completed`+`isClaudeRateLimit(output)`), `parseResetAt` ("resets 4:30pm (UTC)"→Date), `computeUsageProxy` (turns × peso-modelo), `MODEL_WEIGHT` (opus 5 / sonnet 1).
- **`src/lib/companies/company-run.ts`** (MOD): fase esgotada → `blocked` + `resetAt` + `usage.blocked`, run `blocked`, **PARA** (não queima fases seguintes); `runCompany` agora **retomável** (pula `completed`, reconstrói o artefato encadeado, recomeça da 1ª não-concluída; guarda de status); grava `usage` proxy por fase.
- **`POST /api/companies/[id]/runs/[runId]/resume`** (NOVO): retomada manual (ownership + status `blocked` → 202 + `after(runCompany)`).
- **`GET /api/cron/resume-blocked-companies`** (NOVO): varredura (`verifyCronAuth`) que retoma runs `blocked` com `resetAt<=now`.
- **`scripts/report-company-run.ts`** (NOVO, permanente): relatório de consumo por fase/modelo/cargo + ponto de parada (substitui o script temporário).
- **`src/__tests__/lib/company-resilience.test.ts`** (NOVO): INV-1..8 (CI).
- **Schema + migração** `20260624140000_add_company_run_resilience`: `CompanyRun.resetAt` + `@@index([status, resetAt])` e `CompanyPhaseRun.usage`. **Aplicada via `migrate deploy` no host real `2.24.207.200:5435`** (status: "successfully applied").

## Decisões (clarify)

- **Retomada = ambas** (manual + automática). Automática via **varredura periódica** (cron) em vez de agendar job exato — mais simples/resiliente. Reusa o padrão de `cron/run-scheduled-teams`.
- **Consumo = proxy persistido** (`CompanyPhaseRun.usage`): turns × peso-modelo. `stats-cache.json` ficou **deferido** (vive no worker com pool de N contas → não reflete consumo agregado de forma fiel a partir do Next; ver research R6).
- **Detecção dupla** é o cerne: o bug do encurtador era o esgotamento chegando como `output` de um run `completed` (exit 0), não como `rate_limited`.

## Próximos passos (em ordem)

1. **Deploy** (push dispara EasyPanel). O client foi regenerado com `resetAt`/`usage`.
2. **Registrar o cron** `GET /api/cron/resume-blocked-companies` no cron-job.org (Bearer `CRON_SECRET`), junto dos demais — ex.: a cada 15–30 min.
3. **E2E** (quickstart): forçar esgotamento → confirmar fase `blocked` (não `completed`), run `blocked` + `resetAt`, 0 fases seguintes; retomar manual e via cron; rodar o relatório.
4. **CI verde** (teste `company-resilience` + tsc).

## Pendências / gotchas

- A run `15f3966c` (encurtador) ficou `completed` falso no banco (pré-007). Para reaproveitá-la, dá para corrigir o status manualmente para `blocked` e retomar — mas as fases 4-6 já existem como `completed` vazias; mais limpo é disparar uma run nova agora que o pipeline está correto.
- `after()` no cron: roda fora do request; no EasyPanel (processo persistente) funciona — mesmo padrão do `run/route.ts`. Em serverless puro não funcionaria.
- Coordinator (`src/lib/orchestration/team/*`) **intocado** (diff vazio verificado). `runTeamAndWait` só é consumido.
- jest não roda local (OneDrive errno -4094) → CI. `tsc --noEmit` = 0 erros (cobre `scripts/` também).
