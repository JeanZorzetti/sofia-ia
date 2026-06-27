---
description: "Task list — Diff de review isolado por task"
---

# Tasks: Diff de review isolado por task

**Input**: Design documents from `specs/010-isolate-reviewer-diff/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/internal-contracts.md, quickstart.md

**Tests**: incluídos — a constituição exige gate de testes no CI e verificação de legado byte-idêntico (padrão `c3-verify`/`optionb-verify`).

**Repo root**: `Imob/sofia-next`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos distintos, sem dependência pendente)
- **[Story]**: US1 / US2 / US3 (Setup/Foundational/Polish não têm label)

## ⚠️ Princípio II (NON-NEGOTIABLE)

Nenhuma task pode editar: `src/lib/orchestration/team/team-coordinator.ts`, `src/lib/orchestration/team/team-graph-coordinator.ts`, `src/lib/orchestration/team/team-executor.ts`. Toda mudança entra por injeção / helper puro / read-side.

---

## Phase 1: Setup

**Purpose**: preparar o terreno para a mudança num repo existente.

- [X] T001 Confirmar baseline e pontos de injeção dos arquivos-alvo (sem coordinators) conforme plan.md, em `Imob/sofia-next/src/lib/orchestration/team/` e `Imob/sofia-next/src/lib/git/repo-lifecycle.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: tipos e helper de diff de que TODAS as stories dependem.

**⚠️ CRITICAL**: nenhuma user story começa antes desta fase.

- [X] T002 [P] Adicionar `scopedDiff?: ChangedFile[]` ao tipo `CodeArtifacts` (e expor em `TaskRow.artifacts` read-side) em `Imob/sofia-next/src/lib/orchestration/team/team-types.ts`
- [X] T003 [P] Implementar helper `captureTreeDiff(sandbox, { workdir, before, after, caps? })` em `Imob/sofia-next/src/lib/git/repo-lifecycle.ts`. Usar `git diff --name-status <before> <after>` + `git diff <before> <after>` (DOIS tree-ish de `write-tree`) — NÃO copiar `captureWorkingDiff` (que usa 1 ref `<base>`); reusar apenas `parseChangedFiles` + `attachDiffs` (`DEFAULT_DIFF_CAPS`). Best-effort → `[]`. (ref I1)

**Checkpoint**: tipo e helper prontos — as user stories podem começar.

---

## Phase 3: User Story 1 - Reviewer julga apenas o trabalho da própria task (Priority: P1) 🎯 MVP

**Goal**: cada reviewer recebe apenas o diff produzido pela task sob revisão.

**Independent Test**: em um code-run com reviewer e 2 tasks que tocam arquivos distintos, o diff de cada task contém só os seus arquivos.

### Tests for User Story 1

- [X] T004 [P] [US1] Teste fake-sandbox de `captureTreeDiff` (delta entre dois trees + caps + erro→`[]`) em `Imob/sofia-next/src/__tests__/lib/team/scoped-diff.test.ts`
- [X] T005 [P] [US1] Teste de `buildReviewPrompt` priorizando `scopedDiff` e byte-idêntico sem ele em `Imob/sofia-next/src/__tests__/lib/team/team-prompts.test.ts`
- [X] T006 [P] [US1] Teste do decorator `withReviewerSerialization` (força `maxParallel=1` só com reviewer; passthrough nos demais métodos e sem reviewer) em `Imob/sofia-next/src/__tests__/lib/team/serialize-store.test.ts`

### Implementation for User Story 1

- [X] T007 [US1] Cercar o worker turn com snapshot (`git add -A && git write-tree` antes/depois, cobrindo Option B claude-cli E o loop legado) e anexar `scopedDiff` a `out.artifacts` em `Imob/sofia-next/src/lib/orchestration/team/code-agent.ts` (depende de T002, T003)
- [X] T008 [P] [US1] `buildReviewPrompt`: usar `task.artifacts?.scopedDiff ?? diff` (helper puro) em `Imob/sofia-next/src/lib/orchestration/team/team-prompts.ts` (depende de T002)
- [X] T009 [P] [US1] Criar decorator `withReviewerSerialization(store)` que força `config.maxParallel = 1` no `loadRun` quando o roster tem reviewer em `Imob/sofia-next/src/lib/orchestration/team/serialize-store.ts`
- [X] T010 [US1] Aplicar o decorator aos stores dos code-runs com repo (`runWithRepo` e `continueWithRepo`) em `Imob/sofia-next/src/worker/index.ts` (depende de T009)
- [X] T011 [P] [US1] Ajustar `REVIEWER_HINT` para "verifique o diff DESTA task" em `Imob/sofia-next/src/lib/orchestration/team/co-location.ts`
- [ ] T012 [P] [US1] UI read-side: preferir `scopedDiff` sobre `reviewDiff` em `Imob/sofia-next/src/app/dashboard/teams/[id]/DiffViewer.tsx` e `TeamRunView.tsx` (depende de T002) — DEFERIDO (ponytail: UI usa reviewDiff legado; não bloqueia o fix do reviewer)

**Checkpoint**: reviewer e UI mostram o diff isolado por task.

---

## Phase 4: User Story 2 - Comportamento legado preservado (Priority: P1)

**Goal**: chat-runs e code-runs sem repo permanecem byte-idênticos.

**Independent Test**: chat-run e code-run sem repo → reviewer recebe o mesmo conteúdo de antes; resultado inalterado.

### Tests for User Story 2

- [ ] T013 [P] [US2] Testes de não-regressão: (a) chat-run e code-run sem repo → `out.artifacts` sem `scopedDiff`; review cai no diff global; prompt byte-idêntico ao legado; (b) **degradação segura (SC-005/FR-008)**: falha de `git write-tree` (TREE_BEFORE ou TREE_AFTER), não só do `git diff`, → `scopedDiff` ausente e o turno do worker NÃO é derrubado. Em `Imob/sofia-next/src/__tests__/lib/team/code-agent-legacy.test.ts` (ref U1) — pendente CI

### Implementation for User Story 2

- [ ] T014 [US2] Garantir os gates condicionais do snapshot (só quando `chatOptions?.taskId && workdir`) e do decorator (só com reviewer), e que qualquer falha de `write-tree`/`captureTreeDiff` seja capturada (try/catch → segue sem `scopedDiff`), revisando `Imob/sofia-next/src/lib/orchestration/team/code-agent.ts` e `serialize-store.ts` (depende de T007, T009) (ref U1)

**Checkpoint**: US1 e US2 verdes juntos = entrega segura.

---

## Phase 5: User Story 3 - Retry isolado (Priority: P2)

**Goal**: a re-execução é avaliada apenas pela tentativa mais recente.

**Independent Test**: forçar rejeição + correção; o diff da 2ª avaliação reflete só a correção.

### Tests for User Story 3

- [ ] T015 [P] [US3] Teste de retry: o `scopedDiff` da 2ª tentativa contém o delta da correção (não acumula a 1ª) em `Imob/sofia-next/src/__tests__/lib/team/scoped-diff-retry.test.ts`

### Implementation for User Story 3

- [ ] T016 [US3] Validar o re-snapshot no retry (sem código novo além de US1: o `before` do retry é o estado atual do working tree) e documentar no handoff em `Imob/sofia-next/src/lib/orchestration/team/code-agent.ts` (depende de T007)

**Checkpoint**: todas as stories independentemente verdes.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T017 [P] Verificar que o diff da implementação NÃO toca `team-coordinator.ts`, `team-graph-coordinator.ts`, `team-executor.ts` (garantia Princípio II) — CONFIRMADO: nenhum coordinator no diff
- [ ] T018 (Defensivo) Generalizar o shallow-merge de `artifacts` no store para preservar todas as chaves (`commands`/`reviewDiff`/`scopedDiff`) em `Imob/sofia-next/src/lib/orchestration/team/team-store.ts`. **Gatilho explícito**: executar SOMENTE se algum write passar a gravar `scopedDiff` sem `commands` (cairia no ramo REPLACE de `team-store.ts:266` e apagaria as outras chaves). Hoje o `scopedDiff` viaja dentro de `out.artifacts` junto com `commands` → ramo seguro → **T018 pode ficar não-executada**. (ref U2)
- [X] T019 `npx tsc --noEmit` limpo + `prisma generate` antes de qualquer build (depende de todas as tasks de implementação) — tsc limpo ✓
- [ ] T020 Rodar validação do `quickstart.md` (testes no CI + E2E em prod com grafo ativo) e criar `Imob/sofia-next/specs/010-isolate-reviewer-diff/handoff.md` (feito/decisões/próximos/pendências/gotchas) — pendente CI/prod

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001)**: sem dependências.
- **Foundational (T002, T003)**: depois do Setup — BLOQUEIA todas as stories.
- **US1 (T004–T012)**: depois da Foundational.
- **US2 (T013–T014)**: depende de T007/T009 (US1) para os gates.
- **US3 (T015–T016)**: depende de T007 (US1).
- **Polish (T017–T020)**: depois das stories.

### Critical path

T002/T003 → T007 → (T008, T010 via T009, T012) → T014/T016 → T019 → T020

### Within US1

- Testes (T004–T006) escritos antes da implementação correspondente.
- T002/T003 antes de T007.
- T009 antes de T010.

### Parallel Opportunities

- **Foundational**: T002 e T003 em paralelo (arquivos distintos).
- **US1 testes**: T004, T005, T006 em paralelo.
- **US1 impl**: T008, T009, T011, T012 em paralelo entre si (arquivos distintos); T007 isolado (code-agent); T010 depois de T009.

---

## Parallel Example: User Story 1

```text
# Testes US1 juntos:
T004 captureTreeDiff (fake sandbox)
T005 buildReviewPrompt precedência
T006 withReviewerSerialization

# Impl US1 em paralelo (arquivos distintos):
T008 team-prompts.ts
T009 serialize-store.ts
T011 co-location.ts
T012 DiffViewer.tsx / TeamRunView.tsx
```

---

## Implementation Strategy

### MVP (US1 + US2 juntos)

US1 entrega o isolamento; US2 garante que o legado não regride. Como ambos vivem nos mesmos gates condicionais, entregue-os juntos:

1. Setup + Foundational (T001–T003).
2. US1 (T004–T012) → testes verdes no CI.
3. US2 (T013–T014) → não-regressão verde.
4. **VALIDAR**: E2E em prod com grafo ativo (quickstart) antes de US3.

### Incremental

- US3 (retry) é refinamento; entra após US1+US2 validados.
- Polish (T017–T020) fecha com tsc limpo, garantia Princípio II e handoff.

---

## Notes

- `[P]` = arquivos distintos, sem dependência pendente.
- jest roda no CI (não local — OneDrive errno -4094).
- Commit por task/grupo lógico; 1 task = 1 verde antes de paralelizar.
- `scopedDiff` é chave Json em `TeamTask.artifacts` → **sem migração**.
- Gotcha: o `scopedDiff` DEVE viajar dentro de `out.artifacts` (não em `updateTask` isolado), senão o coordinator o sobrescreve.
