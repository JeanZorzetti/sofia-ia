# Implementation Plan: Dashboard Teams-first (Analytics de Teams)

**Branch**: `main` (sem branch dedicada — convenção do projeto) | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-teams-dashboard/spec.md`

## Summary

Reescrever a home (`src/app/dashboard/page.tsx`) de um painel de atendimento WhatsApp ("Sofia", legado) para um painel **Teams-first**: remover os widgets de atendimento e exibir analytics de Teams (KPIs, execuções recentes, métricas ricas) derivados, **somente-leitura**, das tabelas que já existem (`TeamRun`, `TeamTask`, `TeamMemberUsage`, `Team`). Um novo endpoint `GET /api/teams/overview` agrega as métricas, escopado por `team.createdBy = auth.id`, espelhando o padrão de `GET /api/analytics/overview` (auth + cache + rate-limit + `parsePeriod`). **Sem migração** e **coordinator `runTeam` intocado** (apenas queries read-side).

## Technical Context

**Language/Version**: TypeScript / Next.js 16 (App Router, RSC-first)

**Primary Dependencies**: Prisma ORM + PostgreSQL; recharts (gráfico, code-split client-side); Tailwind + shadcn/ui; middlewares internos `withAll`/`withAuth`, `rateLimiters`, `TTL`/cache; `getAuthFromRequest`.

**Storage**: PostgreSQL via Prisma — tabelas **existentes** `teams`, `team_runs`, `team_tasks`, `team_member_usage`. **Nenhuma migração.**

**Testing**: jest roda no CI (não local — OneDrive errno -4094). Validação desta feature = `quickstart.md` (manual/E2E) + gate de build.

**Target Platform**: Web, dashboard desktop-first (a home já é desktop-first).

**Project Type**: Web app full-stack (Next.js App Router monolito).

**Performance Goals**: conteúdo principal de Teams na home em < 2s (SC-004); endpoint com cache (`TTL.MEDIUM`) + rate-limit.

**Constraints**: multi-tenant por `team.createdBy = auth.id` (zero IDOR); coordinator `runTeam` **intocado**; sem migração; Next 16 (params `Promise` + `await` quando houver `[id]`); `auth.id` (nunca `auth.userId`); Prisma só via singleton.

**Scale/Scope**: 1 página reescrita + 1 endpoint de leitura novo (+ componentes de apresentação). Agregações sobre tabelas existentes; volume por conta tipicamente baixo (dezenas–centenas de runs).

## Constitution Check

*GATE: deve passar antes da Phase 0. Re-checado após a Phase 1.*

| Princípio | Avaliação | Status |
|-----------|-----------|--------|
| I — Ação > Análise | Plano fundamentado em leitura mínima e dirigida (schema + 2 rotas-padrão); sem exploração excessiva. | ✅ |
| II — Coordinator intocado (NON-NEGOTIABLE) | Feature é 100% read-side sobre `TeamRun`/`TeamTask`/`TeamMemberUsage`; `runTeam` e o pipeline de execução **não** são tocados. | ✅ |
| III — Migrations formais no host real (NON-NEGOTIABLE) | **Sem migração** — usa tabelas existentes. Nenhum `db push`/`migrate` envolvido. | ✅ (N/A) |
| IV — Padrões Next 16 + type safety | Endpoint `GET /api/teams/overview` **sem** `[id]` dinâmico; usa `getAuthFromRequest`→`auth.id`, Prisma singleton, sem Groq. Decimais (`estimatedCost: Float`) convertidos com `Number()`. | ✅ |
| V — Isolamento multi-tenant | Todas as queries escopadas por `team: { createdBy: auth.id }`; recent-runs e por-membro idem. Zero vazamento entre tenants. | ✅ |

**Resultado**: nenhuma violação. Sem necessidade de Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-teams-dashboard/
├── plan.md              # Este arquivo
├── research.md          # Decisões técnicas (Phase 0)
├── data-model.md        # View-models read-side (Phase 1)
├── quickstart.md        # Roteiro de validação (Phase 1)
├── contracts/
│   └── teams-overview.md  # Contrato do GET /api/teams/overview
├── checklists/
│   └── requirements.md  # Checklist de qualidade do spec
└── tasks.md             # Phase 2 (/speckit-tasks — NÃO criado aqui)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── dashboard/
│   │   ├── page.tsx                 # REESCRITO: home Teams-first (remove atendimento)
│   │   └── TeamsActivityChart.tsx   # NOVO (US3): gráfico recharts (espelha DashboardActivityChart)
│   └── api/
│       └── teams/
│           └── overview/
│               └── route.ts         # NOVO: GET agregador read-side (withAll + auth.id + parsePeriod)
└── components/
    └── dashboard/
        └── teams-overview/          # NOVO (opcional): cards/listas de apresentação extraídos da page
```

**Structure Decision**: Monolito Next.js App Router. Reaproveita o padrão de `src/app/api/analytics/overview/route.ts` (`withAll` + `parsePeriod` + `getAuthFromRequest`) para o novo `src/app/api/teams/overview/route.ts`, e o padrão de code-split do `DashboardActivityChart` para o gráfico de Teams. A reescrita concentra-se em `src/app/dashboard/page.tsx`; componentes de apresentação podem ser extraídos para `src/components/dashboard/teams-overview/` para manter a page enxuta.

## Complexity Tracking

> Nenhuma violação de constituição — seção intencionalmente vazia.
