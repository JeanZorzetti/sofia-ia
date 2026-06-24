# Implementation Plan: Resiliência a Esgotamento + Observabilidade de Consumo (CompanyRun)

**Branch**: `007-company-run-resilience` | **Date**: 2026-06-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/007-company-run-resilience/spec.md`

## Summary

Tornar o esgotamento do pool Claude um estado **explícito e recuperável** no meta-orquestrador de
Empresas, e dar **observabilidade de consumo** confiável. Toda a lógica vive em `company-run.ts` + helpers
puros + 2 rotas (resume manual, cron de auto-resume) + 1 script — o coordinator `runTeam` **não é tocado**
(Princípio II). A detecção reusa `isClaudeRateLimit()` (já exportado do `claude-token-pool`), cobrindo os
dois jeitos que o esgotamento chega: `result.status === 'rate_limited'` **ou** `completed` com a
assinatura de limite no `output` (o caso que marcou as fases do encurtador como "completed" falsamente).
Schema ganha 2 campos (`CompanyRun.resetAt`, `CompanyPhaseRun.usage`) — **migração formal aplicada no host
real** antes do push (Princípio III).

## Technical Context

**Language/Version**: TypeScript 5 / Next.js 16 (App Router, RSC) + Node (script `tsx`).

**Primary Dependencies**: Prisma; `@/lib/ai/claude-token-pool` (`isClaudeRateLimit`); `runTeamAndWait`
(consumido, não editado); `verifyCronAuth`, `after()` (padrões existentes); `src/lib/companies/*` (005).

**Storage**: PostgreSQL/Prisma. **Mudança de schema**: `company_runs.reset_at` (TIMESTAMPTZ null) +
`company_phase_runs.usage` (JSONB null). Status `'blocked'` já é valor válido (sem coluna nova). Migração
formal `migrate deploy` no host real `2.24.207.200:5435`.

**Testing**: jest no CI. Teste unitário **puro** dos helpers (`parseResetAt`, `detectExhaustion`,
`computeUsageProxy`) sem DB. Gate real: E2E (forçar esgotamento → blocked → resume).

**Target Platform**: EasyPanel (Docker) `polarisia.com.br`; worker vps-local roda o claude-cli.

**Project Type**: Web service (Next.js single project) — robustez + observabilidade do meta-orquestrador.

**Performance Goals**: N/A (orquestração; o gargalo é o rate limit do pool, não CPU).

**Constraints**: Coordinator intocado (II); claude-cli only (sem API/chat pago); migração no host real
(III); multi-tenant (resume valida ownership; cron via CRON_SECRET).

**Scale/Scope**: 1 empresa ativa hoje; varredura de resume processa N runs bloqueadas (take limitado).

## Constitution Check

| Princípio | Conformidade |
|---|---|
| **I. Ação > Análise** | Abordagem confirmada (clarify: retomada=ambas, consumo=proxy). Reusa detector/cron/after existentes. ✅ |
| **II. Coordinator Intocado (NON-NEGOTIABLE)** | Detecção/bloqueio/retomada/proxy ficam em `company-run.ts` + helpers puros + rotas/cron. `runTeam`/executor **não** editados (apenas `runTeamAndWait` é **consumido**, como já era). ✅ |
| **III. Migração Formal no Host Real (NON-NEGOTIABLE)** | 2 colunas novas → migração formal `add_company_run_resilience` aplicada via `migrate deploy` no host real **antes** do push. ✅ |
| **IV. Next.js 16 + Type Safety** | Rotas novas com `params: Promise<…>` + `await`; `auth.id`; `prisma` singleton; sem instanciação top-level. `tsc` 0 erros é gate. ✅ |
| **V. Multi-tenant** | `resume` valida ownership (espelha `run/route.ts`); cron protegido por `verifyCronAuth` (CRON_SECRET). ✅ |

**Resultado**: PASS. A única complexidade adicional (cron de auto-resume) é justificada pela decisão
"retomada = ambas".

## Project Structure

### Documentation (this feature)

```text
specs/007-company-run-resilience/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/resilience-contract.md
├── checklists/requirements.md
└── tasks.md            (/speckit-tasks)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                                   # +CompanyRun.resetAt, +CompanyPhaseRun.usage
└── migrations/20260624xxxxxx_add_company_run_resilience/migration.sql   # NOVO

src/lib/companies/
├── company-run.ts                                  # MOD: detecção exaustão→blocked+resetAt; retomada; grava usage proxy
└── company-resilience.ts                           # NOVO (puro): detectExhaustion, parseResetAt, computeUsageProxy, resumePlan

src/app/api/companies/[id]/runs/[runId]/resume/route.ts   # NOVO: retomada manual (ownership)
src/app/api/cron/resume-blocked-companies/route.ts        # NOVO: varredura (verifyCronAuth)

scripts/report-company-run.ts                        # NOVO: relatório permanente (read-only)
src/__tests__/lib/company-resilience.test.ts         # NOVO: helpers puros
```

**Structure Decision**: Single project. Lógica de robustez concentrada em `company-run.ts` (o
meta-orquestrador) + um módulo **puro** `company-resilience.ts` (testável sem DB). Rotas seguem os padrões
existentes (`run/route.ts`, `cron/run-scheduled-teams/route.ts`). Zero toque no engine de Teams.

## Phase 0 — Research

Ver [research.md](./research.md). Decisões:

- **R1 — Detecção dupla**: esgotamento = `result.status === 'rate_limited'` **OR** (`status==='completed'`
  **&&** `isClaudeRateLimit(result.output)`). O 2º ramo é o bug do encurtador (erro chega como output,
  exit 0). Reusa `isClaudeRateLimit` (fonte única do regex). Específico → sem falso-positivo de "limite".
- **R2 — Estado/colunas**: `'blocked'` já é status válido. Adicionar `CompanyRun.resetAt` (DateTime?,
  indexável p/ o cron) e `CompanyPhaseRun.usage` (Json? proxy). `currentPhase` (existente) marca a fase de
  parada. Migração formal no host real.
- **R3 — Retomada**: `runCompany` passa a ser **idempotente/retomável** — lê as phaseRuns existentes, pula
  `completed` (reconstrói `prevArtifact` da última completed), e recomeça da 1ª não-completed (a `blocked`
  vira `pending` de novo). Manual: `POST …/resume` (após validar status `blocked`, dispara `runCompany`
  via `after()`). Auto: cron varre `status='blocked' AND resetAt <= now` e chama o mesmo caminho.
- **R4 — Proxy de consumo**: por fase, gravar em `CompanyPhaseRun.usage` um proxy calculado de sinais
  confiáveis: `{ turns, durationMs, byModel: { <model>: weightedUnits }, blocked }`, onde
  `weightedUnits = turns × modelWeight` (opus=5, sonnet=1) — independente da contagem de tokens que
  subconta. `report-company-run.ts` lê isso + os dados existentes. `stats-cache.json` fica como
  investigação (R6), não pré-requisito.
- **R5 — Cron**: replica `run-scheduled-teams` (`verifyCronAuth`, `force-dynamic`, `maxDuration=300`,
  `take`); registrar no cron-job.org como os demais.
- **R6 — stats-cache.json**: investigado e **deferido** — vive no worker (vps-local) e o pool troca de
  conta por chamada, então não reflete o consumo agregado de forma fiel a partir do servidor Next. O proxy
  (R4) é a base desta entrega; refinar com stats-cache fica como follow-up se provar fiel.

## Phase 1 — Design

- **Data model**: [data-model.md](./data-model.md) — 2 campos novos + shape do `usage` proxy + máquina de
  estados da CompanyRun (running → blocked → running → completed).
- **Contracts**: [contracts/resilience-contract.md](./contracts/resilience-contract.md) — assinaturas dos
  helpers puros, contrato do `resume` e do cron, invariantes verificáveis.
- **Quickstart**: [quickstart.md](./quickstart.md) — aplicar migração no host real; reproduzir
  esgotamento; retomar (manual e via cron); rodar o relatório.

### Re-check Constitution após design

Sem novas violações. PASS (engine intocado; migração formal planejada; multi-tenant preservado).

## Complexity Tracking

> Sem violações a justificar. O cron de auto-resume é exigência da decisão "retomada = ambas", não
> complexidade gratuita; reusa o padrão de cron existente.
