# Implementation Plan: Executor self-hosted na VPS + co-localização de lead/reviewer

**Branch**: `003-vps-executor-colocation` | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-vps-executor-colocation/spec.md`

## Summary

Adicionar um segundo backend de execução para o code-mode dos Teams — um **`VpsLocalProvider`** que satisfaz o port existente `SandboxProvider`/`Sandbox` ([src/lib/sandbox/types.ts](../../src/lib/sandbox/types.ts)) — onde o "sandbox" passa a ser um **diretório de trabalho por run** dentro do container do worker (que já roda na VPS). Isso remove o teto de ~1h do E2B (FR-002) e, por co-localizar o repositório num diretório local, permite que lead e reviewer enxerguem o estado real que o worker produziu (FR-006/FR-007). A seleção é por env (`SANDBOX_PROVIDER=vps-local`), com o E2B preservado como opção (FR-003).

Abordagem fiel ao Princípio II (coordinator intocado): toda capacidade entra por **injeção** — um provider novo atrás do port, um campo opcional `rootDir` no port para namespacing por run, e o enriquecimento de contexto de lead/reviewer dentro do **`code-agent.ts`** (o ChatFn injetado, NÃO o `runTeam`) guiado por um dep injetado `resolveMemberRole`. Com a feature não acionada (sem `workdir`/sem role resolvido, ou provider=e2b), o comportamento é byte-idêntico ao legado.

Escopo = **Fase 1**: provider + co-localização, com **preview off** (a missão de dogfooding 002 usa preview off). Fora de escopo: proxy de preview self-hosted (Fase 2) e provider de container por run para repos não-confiáveis (Fase 3).

## Technical Context

**Language/Version**: TypeScript (Next.js 16 App Router + worker BullMQ standalone via `tsx`), Node ≥ 20.

**Primary Dependencies**: BullMQ (fila `code-run`), Prisma (singleton), `e2b` (provider existente, preservado), Claude Code CLI (in-sandbox via `runClaudeInSandbox` + local-spawn via `ClaudeCliService`), Groq SDK (lead/reviewer chat). **Novo**: apenas `node:child_process` + `node:fs/promises` + `node:path` (sem dependência externa nova) para o `VpsLocalProvider`.

**Storage**: PostgreSQL via Prisma — **SEM mudança de schema** (Princípio III não acionado). Reusa colunas existentes: `TeamRun.sandboxId` (passa a guardar o id do diretório de run), `TeamMember.role` (lido pelo `resolveMemberRole`). Novo armazenamento efêmero: **diretórios de run no filesystem do worker** (`${VPS_RUNS_DIR}/<runId>/repo`), em um volume da VPS.

**Testing**: scripts `tsx` de verificação (padrão do motor — `c0..c3-verify`, `sp5-verify`, `v2sN`, `v21sN`; jest só roda no CI por causa do OneDrive errno -4094). Novos: `scripts/vps-local-verify.ts` (namespacing por run, `setTimeout` no-op, `close` = rm-rf, `connect` reanexa) e `scripts/colocation-verify.ts` (enriquecimento do lead injetado; reviewer mantém diff+verificação; worker e turno-sem-workdir byte-idênticos).

**Target Platform**: container Linux no EasyPanel (VPS), o **worker como serviço dedicado** (separado do `app`), start `npm run worker` (`Dockerfile.worker`).

**Project Type**: web-service (Next.js) + background worker no mesmo repo. Esta feature é 100% no worker + libs compartilhadas (`src/lib/sandbox`, `src/lib/orchestration/team`); zero rota nova na Fase 1.

**Performance Goals**: missões podem ultrapassar 60 min contínuos sem interrupção por teto (FR-002); concorrência conservadora (`CODE_RUN_CONCURRENCY`, default 2; recomendar 1–2 na VPS compartilhada). Enriquecimento do lead acrescenta ≤ ~1 leitura de árvore + N leituras de arquivos-chave por planejamento (barato).

**Constraints**: `runTeam` byte-idêntico quando a feature não é acionada (Princípio II); sem migração (Princípio III); isolamento por diretório de run (FR-005); limpeza agressiva de dirs (FR-012); falha explícita em provider desconhecido (FR-004) e em continuação cujo dir sumiu (FR-013).

**Scale/Scope**: uma VPS, poucos code-runs concorrentes, repositórios próprios e confiáveis (modelo de confiança decidido). Port mantido aberto para um `VpsDockerProvider` futuro (Fase 3) sem reescrita.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Como o design cumpre |
|---|---|---|
| **I. Ação > Análise** | ✅ PASS | Abordagem confirmada com o usuário no brainstorming (2 forks decididos) antes de codar. Execução por fatias verificáveis. |
| **II. Coordinator Intocado — Extensão por Injeção (NON-NEGOTIABLE)** | ✅ PASS | `runTeam` e `team-graph-coordinator` **não são editados**. Capacidades entram por: (a) provider novo atrás do port; (b) campo **opcional** `rootDir` no port `Sandbox` (E2B omite → default legado); (c) enriquecimento no **`code-agent.ts`** (ChatFn injetado — mesmo seam de C1/C2/C3/S1.3/S6) guiado por dep injetado `resolveMemberRole` no worker. Sem `workdir`/sem role/provider=e2b ⇒ comportamento byte-idêntico. |
| **III. Migrations Formais no Host Real (NON-NEGOTIABLE)** | ✅ PASS (não acionado) | **Zero** mudança de schema. Reusa `TeamRun.sandboxId` e `TeamMember.role`. Nenhuma migração a aplicar. |
| **IV. Padrões Next.js 16 + Type Safety** | ✅ PASS | Sem rota nova na Fase 1 (sem `params` Promise a errar). Provider usa lazy/Node APIs; Prisma só via singleton no dep `resolveMemberRole`; nenhum `new PrismaClient()`. `prisma generate` no build inalterado. |
| **V. Segurança e Isolamento Multi-tenant** | ✅ PASS | Sem nova superfície de tenant. Dirs keyed por `runId`; `resolveMemberRole` escopado ao run/member já carregado. Token de git continua só no worker (header HTTP, `repo-lifecycle`), nunca no contexto do agente. Modelo de confiança (repos próprios) documentado; isolamento forte por container fica para Fase 3. |

**Resultado**: nenhum desvio. **Complexity Tracking vazio** (sem violação a justificar).

## Project Structure

### Documentation (this feature)

```text
specs/003-vps-executor-colocation/
├── plan.md              # Este arquivo (/speckit-plan)
├── spec.md              # /speckit-specify
├── research.md          # Fase 0 (decisões técnicas)
├── data-model.md        # Fase 1 (entidades/port/layout de dirs; sem schema DB)
├── quickstart.md        # Fase 1 (guia de validação E2E)
├── contracts/
│   ├── sandbox-provider.md   # Contrato do port + semântica VpsLocal + env
│   └── co-location.md        # Contrato do resolveMemberRole + enriquecimento
└── checklists/
    └── requirements.md  # /speckit-specify (qualidade do spec)
```

### Source Code (repository root: `Imob/sofia-next/`)

```text
src/lib/sandbox/
├── types.ts             # MODIFICAR: + `readonly rootDir?: string` (opcional) no Sandbox
├── index.ts             # MODIFICAR: + case 'vps-local' no getSandboxProvider()
├── e2b.ts               # INTOCADO (rootDir ausente → default legado)
└── vps-local.ts         # CRIAR: VpsLocalProvider (child_process + fs)

src/lib/orchestration/team/
├── co-location.ts       # CRIAR: helpers puros (snapshot do repo p/ lead; hint de verificação p/ reviewer) — testáveis com sandbox fake
├── code-agent.ts        # MODIFICAR: turnos não-worker c/ workdir → enriquecer via resolveMemberRole + co-location.ts (runTeam NÃO tocado)
├── team-coordinator.ts  # INTOCADO (Princípio II)
└── team-executor.ts     # INTOCADO (ou no máx. passthrough de dep; preferir intocado)

src/worker/
└── index.ts             # MODIFICAR: derivar WORKDIR de sandbox.rootDir; injetar resolveMemberRole; sweep de dirs órfãos no boot

scripts/
├── vps-local-verify.ts  # CRIAR
└── colocation-verify.ts # CRIAR

# Ops / docs (sem código de runtime)
specs/002-teams-dashboard/polaris-team-setup.md  # ATUALIZAR nota: SANDBOX_PROVIDER=vps-local + worker dedicado
.env.example                                     # ATUALIZAR: SANDBOX_PROVIDER, VPS_RUNS_DIR
```

**Structure Decision**: projeto único Next.js + worker. A feature concentra-se em `src/lib/sandbox/` (provider + port) e `src/lib/orchestration/team/` (co-localização via ChatFn injetado). O coordinator (`team-coordinator.ts`, `team-graph-coordinator.ts`) e o `team-executor.ts` permanecem intocados — a injeção é feita no **worker** (caller) e no **code-agent** (ChatFn), exatamente como nos ciclos anteriores.

## Complexity Tracking

> Sem violações de Constituição. Nada a justificar.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
