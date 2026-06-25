# Implementation Plan: Squads por Case de Uso sobre Empresas

**Branch**: `009-usecase-squads` | **Date**: 2026-06-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/009-usecase-squads/spec.md`

## Summary

Granularizar a empresa generalista em **squads por case de uso**: unidades enxutas (2-4 agentes) que
resolvem UMA tarefa, em vez de acionar o organograma inteiro (13 agentes) da Feature 005. A descoberta
central do levantamento de código é que **um squad já é, quase inteiramente, um `Team` persistente**:
`TeamMember.agentId` já aponta para o pool de `Agent`, e rodar o squad é **chamar `runTeamAndWait(teamId)`
diretamente** — o coordenador (`runTeam`) permanece INTOCADO (Princípio II), sem nenhum meta-orquestrador
novo. A única peça genuinamente nova é o **WIP=1 global** (uma fila/gate single-flight ANTES do
`runTeamAndWait`), que protege o pool de contas Claude (gargalo real de custo).

Abordagem em uma frase: **uma coluna `companyId` em `Team` (squad = Team de uma empresa) + um gate de fila
single-flight global (`squad-queue.ts`, advisory lock Postgres) + helpers puros de blueprint/roster de squad
+ rotas `withAuth` escopadas por dono + página `/dashboard/empresas` (squads como cards de "Rodar") +
seed de decomposição da ROI Labs** — zero edição no coordenador; `runCompany` (fases SDLC) preservado como
modo opcional.

## Technical Context

**Language/Version**: TypeScript (Next.js 16, App Router, RSC-first) — mesma stack do repo.

**Primary Dependencies**: Prisma/PostgreSQL (singleton `@/lib/prisma`); engine de Times existente
(`runTeamAndWait`, `createTeamWithRoster`) reusada **sem edição**; resiliência 008 (`team-resilience.ts`,
`rate_limited`/`resetAt`/cron) herdada pelos squad-runs; shadcn/ui + Tailwind. Reuso de `CompanyRole.agentId`
para resolver `roleKey → agente do pool` ao semear squads.

**Storage**: PostgreSQL via Prisma. **Uma** alteração de schema: coluna `companyId String?` (nullable, FK,
indexada) em `Team` — `null` = Time avulso legado (byte-idêntico); setado = squad de uma empresa. O texto
"quando usar" (use case) vai em `Team.config` (Json, sem migração extra). A fila WIP usa o próprio
`TeamRun.status='pending'` (sem tabela nova). Migração formal aplicada **manualmente no host real**
`2.24.207.200:5435` antes do push (Princípio III); coluna nova nullable → sem drop, sem precheck.

**Testing**: jest no CI (não local — OneDrive errno -4094). Unit para os helpers puros
(`buildSquadRoster`, `validateSquadBlueprint`) e para a lógica do gate de fila (single-flight: nunca >1
squad-run `running` global). Testes de rota IDOR/auth nas rotas novas de squad.

**Target Platform**: EasyPanel (Docker) em `polarisia.com.br`.

**Project Type**: Web application (Next.js full-stack, single project — `src/`).

**Performance Goals**: N/A de latência. A meta é de **custo/concorrência**: ≤4 agentes ativos por execução
(SC-001), 0 squad-runs concorrentes no escopo global (SC-003), redução ≥60% de consumo por tarefa (SC-002).

**Constraints**: Coordinator intocado (II); migração formal no host real (III); padrões Next.js 16 — params
`Promise`, `auth.id`, prisma singleton, Groq lazy (IV); multi-tenant ownerId-scoped, zero IDOR (V);
execução exclusivamente claude-cli (restrição de custo do projeto).

**Scale/Scope**: Dezenas de squads por empresa; 2-4 membros por squad; **execução estritamente sequencial
(WIP=1 global)** — no máximo 1 squad-run rodando em toda a plataforma. Escopo do ciclo: P1 (rodar squad
enxuto) + P2 (página `/empresas` + WIP/fila) como MVP; P3 (decompor ROI Labs via seed) como refinamento.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Como o design satisfaz |
|-----------|--------|------------------------|
| **I — Ação > Análise** | ✅ PASS | Plano aterrissado no código real: `Team`/`TeamMember`/`runTeamAndWait`/`team-resilience`/`roi-labs-roster` lidos e mapeados; reuso máximo, mínima superfície nova. |
| **II — Coordinator Intocado (NON-NEGOTIABLE)** | ✅ PASS | Squad-run = chamada direta a `runTeamAndWait` (caller existente). A fila WIP é um **gate ANTES** do caller, não dentro de `runTeam`/`team-executor`/`team-coordinator`. Com `Team.companyId = null`, comportamento legado byte-idêntico. |
| **III — Migrations formais no host real (NON-NEGOTIABLE)** | ✅ PASS | 1 coluna nova (`teams.company_id`, nullable + index + FK) via `prisma migrate` formal, `migrate deploy` MANUAL em `2.24.207.200:5435` ANTES do push. Coluna nullable, sem drop → sem precheck de dados. |
| **IV — Padrões Next.js 16 + Type Safety** | ✅ PASS | Rotas novas com `params: Promise<…>` + `await`, `auth.id`, prisma singleton; sem Groq top-level; cast de roles onde aplicável. |
| **V — Segurança/Isolamento Multi-tenant** | ✅ PASS | Rotas de squad são `withAuth` + `ownerId(auth)`, escopadas pela empresa dona (mesmo padrão das rotas de Company da 005). Nenhum novo armazenamento de segredo. |

**Resultado:** Sem violações. **Complexity Tracking** registra a única peça nova não-trivial (o gate de fila
WIP=1 global) com justificativa — é requisito de domínio (proteção de custo), não complexidade gratuita.

## Project Structure

### Documentation (this feature)

```text
specs/009-usecase-squads/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 — decisões técnicas resolvidas (gate de fila, link squad↔company, lazy staffing)
├── data-model.md        # Phase 1 — entidades reusadas/estendidas + estados do squad-run
├── quickstart.md        # Phase 1 — guia de validação E2E (compor squad, rodar, fila WIP=1)
├── contracts/
│   └── api.md           # Phase 1 — contratos das rotas de squad + dispatcher de fila
└── tasks.md             # Phase 2 — gerado pelo /speckit-tasks (NÃO por este comando)
```

### Source Code (repository root)

```text
src/
├── lib/
│   └── companies/                         # estende o núcleo da 005 (NÃO toca o coordinator)
│       ├── squad-blueprint.ts             # NOVO — templates de squad por nicho (case de uso →
│       │                                  #   { key, label, useCase, members:[{roleKey, role}] }) — DADO PURO
│       ├── squad-roster.ts                # NOVO — buildSquadRoster(template, staffing) → RosterInput[] — PURO
│       │                                  #   (resolve roleKey → CompanyRole.agentId, análogo a buildPhaseRoster)
│       ├── squad-queue.ts                 # NOVO — dispatchSquadQueue(): gate single-flight GLOBAL (WIP=1).
│       │                                  #   advisory lock pg → se 0 squad-run 'running', claim do 'pending'
│       │                                  #   mais antigo e dispara runTeamAndWait; senão deixa na fila.
│       │                                  #   Pausa o dreno enquanto o pool está esgotado (integra 008).
│       └── squad-store.ts                 # NOVO — leitura/escopo: listSquadsByCompany, createSquad,
│                                          #   squadRunQueueState (ownerId-scoped) — reuso nas rotas
│
├── app/
│   ├── api/
│   │   └── companies/
│   │       └── [id]/
│   │           └── squads/
│   │               ├── route.ts           # NOVO — GET listar squads da empresa + POST criar squad
│   │               ├── seed/route.ts      # NOVO — POST decompor a empresa em squads do blueprint (US4)
│   │               └── [squadId]/
│   │                   ├── route.ts       # NOVO — GET detalhe + PATCH (nome/useCase/membros) + DELETE
│   │                   └── run/route.ts   # NOVO — POST enfileira squad-run + chama dispatchSquadQueue
│   │   └── cron/
│   │       └── drain-squad-queue/route.ts # NOVO — drena a fila (rede de segurança + pós-conclusão); WIP=1
│   │
│   └── dashboard/
│       ├── empresas/                      # NOVO — superfície OPERACIONAL (separada de /agentes)
│       │   ├── page.tsx                   # galeria de Empresas (guarda-chuva) → entra na empresa
│       │   └── [companyId]/page.tsx       # aba "Squads": cards de squad com "Rodar" + estado da fila;
│       │                                  #   ação opcional "Executar empresa (fases SDLC)" → runCompany legado
│       └── agents/                        # /agentes volta a ser o CATÁLOGO (pool) de definições
│                                          #   (a galeria de Empresas migra p/ /empresas; ver Structure Decision)
│
├── components/dashboard/squads/           # NOVO — SquadCard, SquadComposer (escolher agentes+papéis),
│                                          #   SquadRunButton, QueuePanel (rodando + fila)
│
scripts/
└── seed-roi-labs-squads.ts                # NOVO — idempotente: cria ≥3 squads da ROI Labs referenciando
                                           #   o roster já encaixado (reusa CompanyRole.agentId; 0 duplicação)

prisma/
├── schema.prisma                          # + Team.companyId (String? @db.Uuid, FK companies, @@index)
└── migrations/
    └── <ts>_add_team_company_id/          # migração formal (host real, manual)
```

**Structure Decision**: **Single web project** (`src/`). A superfície de Empresas/Squads é **movida para
uma rota dedicada `/dashboard/empresas`** (atendendo ao pedido literal "página `/empresas` separada de
`/agentes`"); `/dashboard/agents` volta a ser o **catálogo do pool** de agentes. A página de detalhe da
empresa da 005 (`/dashboard/agents/empresa/[companyId]`) é **portada** para `/dashboard/empresas/[companyId]`
e ganha a aba **"Squads"** (cards com "Rodar" + estado da fila); a execução por fases SDLC (`runCompany`)
vira uma **ação opcional** na mesma tela. O núcleo lógico fica em `src/lib/companies/` (ao lado dos helpers
da 005), com **helpers puros** (`squad-blueprint`, `squad-roster`) e o **gate de fila** (`squad-queue`) —
tudo *caller/pré-gate*, jamais editando o coordenador de Times.

## Complexity Tracking

> Única peça nova não-trivial — justificada (requisito de domínio).

| Decisão | Por que é necessária | Alternativa mais simples rejeitada porque |
|---------|----------------------|-------------------------------------------|
| Gate de fila WIP=1 **global** com advisory lock Postgres (`squad-queue.ts`) | É o requisito que de fato corta custo (FR-008/SC-003): garantir ≤1 squad-run no pool por vez, atômico entre requests/processos. `runWithConcurrency` é só fan-out em memória (per-processo) — não serializa entre requisições. | Confiar em `runWithConcurrency` ou num flag em memória não sobrevive a múltiplos requests/instâncias → 2 squads concorrentes estouram o pool. Tabela de fila dedicada foi descartada: `TeamRun.status='pending'` + ordenação por `createdAt` já é a fila; só falta o claim atômico (advisory lock), sem schema novo. |
| Coluna `Team.companyId` (vs guardar tudo em `Team.config` Json) | A listagem de squads por empresa (FR-005) precisa de filtro/índice eficiente no read-path. | Filtro por JSON path em `config` não indexa bem e complica as queries da galeria; uma coluna nullable + índice é a mudança mínima e idiomática. |
