# Implementation Plan: Diff de review isolado por task

**Branch**: `010-isolate-reviewer-diff` | **Date**: 2026-06-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/010-isolate-reviewer-diff/spec.md`

## Summary

Hoje o reviewer de um code-run recebe **um único diff global do working tree** (`captureWorkingDiff` → `git diff <base>`) para **todas** as tasks da passada de review, porque os workers acumulam mudanças no mesmo working tree compartilhado. Resultado: rejeições em cascata (cada task julgada contra a soma de tudo).

A correção entrega a cada reviewer **apenas o diff da própria task**, por meio de:
1. **Snapshot por task** dentro da `ChatFn` de code (injeção): cercar o turno de cada worker com `git write-tree` antes/depois e anexar o delta isolado (`scopedDiff`) ao `artifacts` que o worker já retorna.
2. **Serialização** dos workers em code-runs com reviewer, garantida por um **decorator de store** que força `config.maxParallel = 1` no `loadRun` (o coordinator de grafo já respeita esse valor; o linear já é sequencial).
3. **Precedência no helper puro** `buildReviewPrompt`: usar `task.artifacts.scopedDiff` quando presente, com fallback ao diff global legado.
4. **UI read-side** preferindo `scopedDiff`.

Tudo por **injeção** — nenhum coordinator é editado (Princípio II) — e **sem migração** (o `scopedDiff` é uma nova chave na coluna Json `TeamTask.artifacts`).

## Technical Context

**Language/Version**: TypeScript (Next.js 16, App Router) + worker Node.

**Primary Dependencies**: Prisma/PostgreSQL; Sandbox (vps-local / E2B) com `git` CLI; claude-cli em sandbox; orquestração Teams (`team-coordinator`, `team-graph-coordinator`, `code-agent`, `team-store`, `repo-lifecycle`).

**Storage**: PostgreSQL. `TeamTask.artifacts` é coluna **Json** — `scopedDiff` é nova chave, **sem migração** (Princípio III não acionado).

**Testing**: jest no CI (não roda local — OneDrive errno -4094); scripts de verificação no padrão `scripts/c3-verify.ts` / `optionb-verify` com fake sandbox.

**Target Platform**: worker Node (executa o run) + app Next.js (UI da run).

**Project Type**: web / plataforma de orquestração multi-agente.

**Performance Goals**: snapshot adiciona ~2 ops `git` por turno de worker (write-tree + diff), desprezível. A serialização troca paralelismo por correção — aceitável (features multi-fase têm forte dependência entre fases).

**Constraints**: Princípio II (coordinators INTOCADOS); legado byte-idêntico quando a feature não é acionada (chat-runs e code-runs sem repo); caps de diff existentes reutilizados; claude-cli como único provider interno.

**Scale/Scope**: mudança localizada em ~6 arquivos (todos fora dos coordinators) + 1 ajuste read-side de UI.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação | Status |
|---|---|---|
| **I. Ação > Análise** | Causa raiz já confirmada no código; abordagem decidida com o usuário (clarify). | PASS |
| **II. Coordinator Intocado (NON-NEGOTIABLE)** | `team-coordinator.ts` e `team-graph-coordinator.ts` **não** são editados. Mudanças entram via: ChatFn de code (`code-agent.ts`, injetada), decorator de `TeamStore` (injetado), helpers puros (`buildReviewPrompt`, `repo-lifecycle`), e read-side (UI). A serialização usa um gancho já lido pelo coordinator (`config.maxParallel`). | PASS |
| **III. Migrations Formais (NON-NEGOTIABLE)** | `scopedDiff` é nova chave na coluna Json `TeamTask.artifacts` → **sem mudança de schema, sem migração**. | PASS |
| **IV. Padrões Next.js 16 + Type Safety** | Mudança é majoritariamente backend/worker; o toque na UI é read-side (preferir `scopedDiff`). Sem novas rotas. Verificar `tsc --noEmit`. | PASS |
| **V. Segurança & Isolamento** | Sem exposição cross-tenant nova; o diff por task reusa os caps existentes (`DEFAULT_DIFF_CAPS`); conteúdo já era visível ao reviewer do mesmo run. | PASS |

**Resultado**: nenhuma violação → Complexity Tracking vazio.

## Project Structure

### Documentation (this feature)

```text
specs/010-isolate-reviewer-diff/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 — decisões técnicas (mecanismo de snapshot, serialização)
├── data-model.md        # Phase 1 — CodeArtifacts.scopedDiff, precedência, invariantes do store
├── quickstart.md        # Phase 1 — como validar E2E
├── contracts/
│   └── internal-contracts.md  # contratos internos (shape + precedência + invariantes)
└── tasks.md             # Phase 2 (/speckit-tasks — NÃO criado aqui)
```

### Source Code (repository root: `Imob/sofia-next`)

Arquivos **alterados** (todos fora dos coordinators):

```text
src/
├── lib/
│   ├── git/
│   │   └── repo-lifecycle.ts            # + captureTreeDiff(sandbox, {workdir, before, after, caps})
│   │                                    #   e helper de snapshot (git add -A && git write-tree)
│   ├── orchestration/team/
│   │   ├── code-agent.ts                # cercar o worker turn com snapshot → anexar scopedDiff a out.artifacts
│   │   ├── team-prompts.ts              # buildReviewPrompt: preferir task.artifacts.scopedDiff (helper puro)
│   │   ├── team-types.ts                # + scopedDiff?: ChangedFile[] em CodeArtifacts (e TaskRow read-side)
│   │   ├── team-store.ts                # (se necessário) generalizar shallow-merge p/ preservar scopedDiff
│   │   ├── co-location.ts              # REVIEWER_HINT: ajustar texto "o diff DESTA task"
│   │   └── serialize-store.ts           # NOVO: decorator de TeamStore que força config.maxParallel=1 c/ reviewer
│   └── ...
├── worker/
│   └── index.ts                         # envolver createPrismaTeamStore() com o decorator de serialização
└── app/dashboard/teams/[id]/
    └── DiffViewer.tsx / TeamRunView.tsx # read-side: preferir scopedDiff sobre reviewDiff
```

Arquivos **NÃO tocados** (garantia do Princípio II): `team-coordinator.ts`, `team-graph-coordinator.ts`, `team-executor.ts`.

**Structure Decision**: monorepo Next.js existente (`Imob/sofia-next`); a feature adiciona 1 arquivo novo (`serialize-store.ts`) e altera helpers/injeções já existentes, preservando os coordinators.

## Complexity Tracking

> Sem violações de constituição — seção vazia.
