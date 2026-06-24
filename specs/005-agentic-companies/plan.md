# Implementation Plan: Empresas Agênticas (Agentic Companies)

**Branch**: `005-agentic-companies` | **Date**: 2026-06-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-agentic-companies/spec.md`

## Summary

Introduzir a entidade **Empresa** (Company) como camada de organização sobre os Agentes existentes:
um **organograma** em 3 camadas (cada cargo encaixa 1 agente, relação **1:1**) + 4 facetas ortogonais
(**Tipologia**, **Governança/RACI**, **SDLC de 7 fases**, **Infraestrutura**). A **execução** roda a
empresa instanciando **um Time por fase do SDLC, sequencialmente**, via um **meta-orquestrador** que é
puro *caller* do engine de Times existente (`runTeamAndWait`) — o **coordenador (`runTeam`/
`team-executor`/`team-coordinator`) permanece INTOCADO** (Princípio II). Entrega o nicho semente
**"Software House"** com cargos e **RACI pré-preenchida** do blueprint
(`docs/empresa_agentica_notebook_lm/`).

Abordagem técnica em uma frase: **novas tabelas (`Company`, `CompanyRole`, `CompanyRun`,
`CompanyPhaseRun`) + helpers puros (`buildPhaseRoster`, `validateRaci`) + um meta-orquestrador caller +
rotas `withAuth` escopadas por dono + transformação da página `/dashboard/agents`** — zero edição no
coordenador.

## Technical Context

**Language/Version**: TypeScript (Next.js 16, App Router, RSC-first) — mesma stack do repo.

**Primary Dependencies**: Prisma/PostgreSQL (singleton `@/lib/prisma`), engine de Times existente
(`runTeamAndWait`, `createTeamWithRoster`), Groq SDK / multi-provider (já usados pelos Times), shadcn/ui
+ Tailwind. Reuso de `AgentMcpServer`/`McpServer` para a faceta Infraestrutura.

**Storage**: PostgreSQL via Prisma. 4 tabelas novas + a matriz RACI como **Json tipado** na `Company`
(matriz limitada ~13×7; validação em nível de app). Migração formal aplicada **manualmente no host
real** `2.24.207.200:5435` antes do push (Princípio III).

**Testing**: jest no CI (não local — OneDrive errno -4094). Testes de unidade para os helpers puros
(`buildPhaseRoster`, `validateRaci`) e testes de rota IDOR/auth para os endpoints de Empresa.

**Target Platform**: EasyPanel (Docker) em `polarisia.com.br`.

**Project Type**: Web application (Next.js full-stack, single project — `src/`).

**Performance Goals**: N/A crítico (ferramenta interna autenticada). Execução é assíncrona/sequencial;
sem metas de latência/throughput. SC mensuráveis são de UX (criar empresa < 2 min, etc.).

**Constraints**: Coordinator intocado (II); migração formal no host real (III); padrões Next.js 16
(params Promise, `auth.id`, prisma singleton, Groq lazy) (IV); multi-tenant ownerId-scoped, zero IDOR,
credenciais cifradas (V).

**Scale/Scope**: Dezenas de empresas por usuário; ~13 cargos × 7 fases por empresa; runs sequenciais de
7 fases. Escopo do ciclo: **P1+P2+P3** (organograma/staffing + governança/SDLC + execução); P4
(tipologia já é faceta, infra-binding, clonagem) entra como refinamento dentro do ciclo.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Como o design satisfaz |
|-----------|--------|------------------------|
| **I — Ação > Análise** | ✅ PASS | Plano aterrissado no código real (helpers/rotas existentes mapeados); sem exploração especulativa. |
| **II — Coordinator Intocado (NON-NEGOTIABLE)** | ✅ PASS | Execução = meta-orquestrador *caller* que chama `runTeamAndWait` por fase. **Nenhuma** edição em `team-coordinator.ts`/`team-executor.ts`/`runTeam`. Comportamento legado de Times byte-idêntico. |
| **III — Migrations formais no host real (NON-NEGOTIABLE)** | ✅ PASS | 4 tabelas novas via `prisma migrate` formal, aplicada com `migrate deploy` MANUAL em `2.24.207.200:5435` ANTES do push. Sem `db push`. (Tabelas novas, sem drop → sem precheck de dados.) |
| **IV — Padrões Next.js 16 + Type Safety** | ✅ PASS | Rotas novas usam `params: Promise<…>` + `await`, `auth.id`, prisma singleton; sem Groq no top-level. |
| **V — Segurança/Isolamento Multi-tenant** | ✅ PASS | Todas as rotas `withAuth` + `ownerId(auth)` (admin vê todas, como Agentes — FR-018). Infra reusa credenciais cifradas existentes (não cria novo armazenamento de segredo). |

**Resultado:** Sem violações. **Complexity Tracking** vazio (as 4 tabelas novas são entidades de
domínio legítimas, não complexidade injustificada; a constituição não restringe nº de tabelas, apenas
exige migração formal).

## Project Structure

### Documentation (this feature)

```text
specs/005-agentic-companies/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 — decisões técnicas resolvidas
├── data-model.md        # Phase 1 — entidades, campos, relações, validações
├── quickstart.md        # Phase 1 — guia de validação E2E
├── contracts/
│   └── api.md           # Phase 1 — contratos das rotas de Empresa
├── checklists/
│   └── requirements.md  # (do /speckit-specify)
└── tasks.md             # Phase 2 — gerado pelo /speckit-tasks (NÃO por este comando)
```

### Source Code (repository root)

```text
src/
├── lib/
│   └── companies/                        # NÚCLEO da feature (helpers puros + meta-orquestrador)
│       ├── company-blueprint.ts          # Dados estáticos do nicho "Software House":
│       │                                 #   camadas, departamentos, cargos, fases SDLC, RACI semente
│       ├── sdlc.ts                        # As 7 fases canônicas (constantes) + objetivos/artefatos
│       ├── raci.ts                        # validateRaci (regra de ouro: 1 A/fase) — PURO
│       ├── phase-roster.ts                # buildPhaseRoster(raci, phase, staffing) → RosterInput[] — PURO
│       ├── company-run.ts                 # Meta-orquestrador: loop sequencial de fases (CALLER de runTeamAndWait)
│       └── company-store.ts               # Helpers de leitura/escopo (ownerId) — reuso nas rotas
│
├── app/
│   ├── api/
│   │   └── companies/
│   │       ├── route.ts                  # GET (listar) + POST (criar de nicho)
│   │       ├── niches/route.ts           # GET nichos disponíveis (semente)
│   │       └── [id]/
│   │           ├── route.ts              # GET detalhe + PATCH (nome/tipologia/desc) + DELETE
│   │           ├── clone/route.ts        # POST clonar como novo nicho
│   │           ├── roles/route.ts        # GET cargos + PUT (add/remove cargo)
│   │           ├── roles/[roleKey]/staff/route.ts  # POST encaixar agente + DELETE desencaixar (1:1)
│   │           ├── raci/route.ts         # GET + PUT matriz (valida 1 A/fase)
│   │           ├── infrastructure/route.ts # GET + PUT vínculos MCP/sandbox por cargo
│   │           ├── run/route.ts          # POST iniciar CompanyRun (dispara meta-orquestrador)
│   │           └── runs/route.ts         # GET runs da empresa
│   │   └── company-runs/[id]/route.ts    # GET status fase-a-fase de uma execução
│   │
│   └── dashboard/
│       └── agents/                       # TRANSFORMAÇÃO da página existente
│           ├── page.tsx                  # → galeria de Empresas (cards por nicho) + view "Todos os agentes"
│           ├── empresa/[companyId]/page.tsx  # detalhe: abas Organograma|Tipologia|Governança|SDLC|Infra|Execuções
│           └── [id]/…                     # detalhe do AGENTE — INTOCADO (segmento estático `empresa` coexiste com `[id]`)
│
└── components/dashboard/companies/        # OrgChart, RaciMatrix, SdlcPipeline, InfraPanel, CompanyCard, RunTimeline

prisma/
├── schema.prisma                          # + Company, CompanyRole, CompanyRun, CompanyPhaseRun
└── migrations/
    └── <ts>_add_agentic_companies/        # migração formal (host real, manual)
```

**Structure Decision**: **Single web project** (`src/`), seguindo a estrutura existente. A página
`/dashboard/agents` (lista) é **transformada** na galeria de Empresas; o detalhe da empresa vive em
`/dashboard/agents/empresa/[companyId]` — o segmento estático `empresa` coexiste com o dinâmico `[id]`
(detalhe do agente, **intocado**), evitando colisão de rota e honrando o pedido literal de "transformar
a `/dashboard/agents`". A lista chapada de agentes vira uma view secundária ("Todos os agentes"/staff)
na mesma página (FR-006: agentes continuam acessíveis). O núcleo lógico fica em `src/lib/companies/`
(espelhando `src/lib/orchestration/team/`), com **helpers puros** testáveis e um **meta-orquestrador
caller** — o coordenador de Times não é tocado.

## Complexity Tracking

> Sem violações de constituição. Nada a justificar.
