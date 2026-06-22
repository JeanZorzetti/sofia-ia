# Tasks: Executor self-hosted na VPS + co-localização de lead/reviewer

**Input**: Design documents from `specs/003-vps-executor-colocation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: o projeto não usa TDD-first para o motor de Teams; usa **verify-scripts `tsx`** como gate (padrão `c0..c3-verify`, `sp5-verify`, etc. — jest só no CI por causa do OneDrive). Cada user story inclui seu verify-script como tarefa de gate.

**Organization**: tarefas agrupadas por user story (independentes e testáveis isoladamente).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 / US2 / US3 (mapeia o spec.md)

## Path Conventions

Projeto único Next.js + worker em `Imob/sofia-next/`. Paths abaixo são relativos a essa raiz.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: documentação de configuração que ambas as stories usam.

- [x] T001 [P] Documentar as novas env vars (`SANDBOX_PROVIDER`, `VPS_RUNS_DIR`, e relembrar `CODE_RUN_CONCURRENCY`) em `.env.example`, com comentário de que `vps-local` exige um volume montado em `VPS_RUNS_DIR`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: a adição ao port que TANTO o provider (US1) quanto o worker (US1) dependem.

**⚠️ CRITICAL**: bloqueia a US1.

- [x] T002 Adicionar `readonly rootDir?: string` (opcional, additive) à interface `Sandbox` em `src/lib/sandbox/types.ts`, com doc-comment: E2B omite (→ default `/home/user`); VpsLocal retorna `${VPS_RUNS_DIR}/<id>`. **Não** alterar `e2b.ts` (continua sem `rootDir`).

**Checkpoint**: port pronto — US1 pode começar.

---

## Phase 3: User Story 1 - Missão longa não é morta por teto de tempo (Priority: P1) 🎯 MVP

**Goal**: um executor self-hosted (`VpsLocalProvider`) roda missões de code-mode sem teto de tempo, selecionável por env, com o E2B preservado.

**Independent Test**: com `SANDBOX_PROVIDER=vps-local`, uma missão que ultrapassa 60 min conclui (`completed` + commit/diff); uma missão curta entrega idêntica ao E2B (Cenário A do quickstart).

### Implementation for User Story 1

- [x] T003 [P] [US1] Criar `VpsLocalProvider` em `src/lib/sandbox/vps-local.ts` implementando `SandboxProvider`/`Sandbox`: `create` (uuid + `mkdir -p ${VPS_RUNS_DIR}/<id>`, `rootDir` setado); `exec(cmd,{cwd,env,timeoutMs})` via `node:child_process` (`bash -lc`, env mesclado, timeout real kill→SIGKILL, **nunca lança** em exit≠0); `writeFile` via `node:fs/promises` (mkdir recursivo); `setTimeout` **no-op**; `close` → `rm -rf` idempotente; `connect(id)` → valida existência e reanexa, senão lança erro claro; `getPreviewUrl` → lança `Error('preview self-hosted indisponível (Fase 2)')`. Lazy/sem dep externa nova. (contrato: `contracts/sandbox-provider.md`)
- [x] T004 [US1] Registrar `case 'vps-local': return createVpsLocalProvider()` em `getSandboxProvider()` (`src/lib/sandbox/index.ts`); manter o `default` que lança erro claro para provider desconhecido. (depende de T003)
- [x] T005 [US1] Em `src/worker/index.ts`, substituir a constante de módulo `const WORKDIR = '/home/user/repo'` por derivação `const workdir = \`${sandbox.rootDir ?? '/home/user'}/repo\`` **após** criar/conectar o sandbox, e propagar `workdir` aos call-sites (`runWithRepo`, `continueWithRepo`, C0, `captureWorkingDiff`, `startRunPreview`). E2B mantém `/home/user/repo` (byte-idêntico). (depende de T002)
- [x] T006 [US1] Em `src/worker/index.ts`, adicionar **sweep de boot** que remove diretórios órfãos em `${VPS_RUNS_DIR}/*` (sem run ativo / mais velhos que um limiar); adaptar o cron `src/app/api/cron/reap-preview-sandboxes/route.ts` para também varrer dirs locais quando `SANDBOX_PROVIDER=vps-local`. (FR-012)
- [x] T007 [US1] Escrever `scripts/vps-local-verify.ts` (asserts: namespacing por run isola dois runs; `setTimeout` é no-op; `close` faz rm-rf; `connect` reanexa dir existente e lança em dir ausente; `getPreviewUrl` lança) e rodar verde via `npx tsx scripts/vps-local-verify.ts`.

**Checkpoint**: US1 funcional — missões rodam no executor self-hosted sem teto.

---

## Phase 4: User Story 2 - Lead e reviewer enxergam o repositório real (Priority: P2)

**Goal**: lead recebe um retrato real do repo ao planejar; reviewer é dirigido a verificar contra o repo vivo (além do diff) — tudo via `code-agent.ts`, com `runTeam` intocado.

**Independent Test**: numa missão com mudanças reais, as `@TASK` do lead referenciam arquivos existentes e o reviewer reflete verificação executada, sem loop de rejeição falsa (Cenário C do quickstart).

### Implementation for User Story 2

- [x] T008 [P] [US2] Criar helper puro `src/lib/orchestration/team/co-location.ts`: `buildColocationContext({role, sandbox, workdir, keyFiles?})` → texto a prepender (lead: árvore capada + `cat` dos `keyFiles`; reviewer: bloco "como verificar" read-only) ou `null`. Reutilizar a filosofia de caps do C2 (`DIFF_MAX_*`). Testável com sandbox fake. (contrato: `contracts/co-location.md`)
- [x] T009 [US2] Em `src/lib/orchestration/team/code-agent.ts`, adicionar `resolveMemberRole?` a `CodeChatFnOptions` e, no caminho **não-worker** (sem `taskId`) **com** `workdir`, resolver o papel e prepender `buildColocationContext(...)` na 1ª mensagem `user` ANTES do `injectProtocol`/`baseChat`. Sem workdir / sem dep / role indefinido ⇒ caminho atual byte-idêntico. **Não** tocar `team-coordinator.ts`. (depende de T008)
- [x] T010 [US2] Em `src/worker/index.ts`, implementar a impl Prisma de `resolveMemberRole` (lê `TeamMember.role` por `ChatOptions.memberId`; best-effort → `null` em falha) e injetá-la nos **3** call-sites de `createCodeChatFn` (`runWithRepo`, `continueWithRepo`, C0). (depende de T009)
- [x] T011 [US2] Escrever `scripts/colocation-verify.ts` (asserts: turno worker = sem enriquecimento; lead = árvore/arquivos injetados; reviewer = bloco de verificação, diff preservado; sem workdir OU sem `resolveMemberRole` = byte-idêntico ao legado) e rodar verde via `npx tsx scripts/colocation-verify.ts`.

**Checkpoint**: US1 + US2 funcionais e independentes.

---

## Phase 5: User Story 3 - Trocar o backend de execução por config (Priority: P3)

**Goal**: backend selecionável por env, falha clara em desconhecido, coordinator/code-agent inalterados na troca.

**Independent Test**: alternar `SANDBOX_PROVIDER` entre `e2b`/`vps-local`/`foo` e ver o fluxo rodar no escolhido / falhar claro no inválido, sem mudança no coordinator (Cenário B do quickstart).

### Implementation for User Story 3

- [x] T012 [US3] Acrescentar ao `scripts/vps-local-verify.ts` (ou um `provider-select-verify.ts`) asserts de seleção: `getSandboxProvider()` resolve `vps-local` para o novo provider e **lança erro claro** para `SANDBOX_PROVIDER` desconhecido (FR-004); rodar os verifies do motor existentes (`c0..c3`) verdes para comprovar `runTeam` intocado (FR-003/Princípio II).

**Checkpoint**: todas as user stories independentes e verdes.

---

## Phase N: Polish & Cross-Cutting Concerns

- [x] T013 [P] Atualizar a nota de infra em `specs/002-teams-dashboard/polaris-team-setup.md`: `SANDBOX_PROVIDER=vps-local`, worker como serviço EasyPanel dedicado, volume em `VPS_RUNS_DIR`, `CODE_RUN_CONCURRENCY` conservador.
- [x] T014 [P] Rodar o gate de regressão: `npm run typecheck` + suíte de verifies (`c0..c3`, `vps-local`, `colocation`) toda verde.
- [ ] T015 Executar o Cenário D do `quickstart.md` (dogfooding 002 pela própria Polaris) — **gated** no passo 0 operacional (deploy do worker dedicado com segredos), que é manual do usuário. Critério de fechamento: novo commit na `main` de `sofia-ia` com `route.ts` + `page.tsx`, build verde, coordinator inalterado.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001)**: sem dependência.
- **Foundational (T002)**: bloqueia a US1.
- **US1 (T003–T007)**: depende de T002. T003→T004 (factory importa o provider); T005 depende de T002.
- **US2 (T008–T011)**: T008 é independente (pode começar junto da US1); T008→T009→T010.
- **US3 (T012)**: depende de T004 (factory) existir.
- **Polish (T013–T015)**: depende das stories desejadas.

### Within Each User Story

- US1: T003 e T005/T006 são arquivos diferentes (provider vs worker), mas T005 e T006 tocam o mesmo `worker/index.ts` → sequenciais entre si. T007 (verify) por último.
- US2: T008 (helper) → T009 (code-agent) → T010 (worker) → T011 (verify).

### Parallel Opportunities

- T001 [P] (docs) solto.
- Após T002: **T003 [US1]** e **T008 [US2]** podem ir em paralelo (arquivos distintos: `vps-local.ts` vs `co-location.ts`).
- ⚠️ Cuidado: T005, T006, T010 tocam todos `src/worker/index.ts` → **não** paralelizar entre si (mesmo arquivo).
- T013 [P] e T014 [P] no polish.

---

## Parallel Example

```bash
# Depois de T002 (port pronto), duas frentes em arquivos distintos:
Task: "T003 [US1] Criar VpsLocalProvider em src/lib/sandbox/vps-local.ts"
Task: "T008 [US2] Criar helper puro src/lib/orchestration/team/co-location.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. T001 (setup) → T002 (port) → T003–T007 (US1).
2. **STOP & VALIDATE**: `vps-local-verify` verde + missão >60 min conclui (Cenário A).
3. US1 já entrega o valor central (sem teto de 1h) e desbloqueia rodar missões longas.

### Incremental Delivery

1. US1 → executor self-hosted no ar (MVP).
2. US2 → lead/reviewer co-localizados (qualidade do output).
3. US3 → confirma troca por config (operabilidade; quase emergente da US1).
4. Polish → docs + gate de regressão + dogfooding 002 (gated no deploy do worker).

### Nota operacional (fora do código)

O **passo 0** — deployar o worker dedicado no EasyPanel com `GITHUB_TOKEN`, `CLAUDE_CODE_OAUTH_TOKEN(S)`, `REDIS_URL`, `DATABASE_URL`, `SANDBOX_PROVIDER=vps-local`, `VPS_RUNS_DIR` + volume — é manual do usuário e **gate real** para T015. Sem ele, nenhuma missão roda (independe deste código).

---

## Notes

- [P] = arquivos diferentes, sem dependência. `src/worker/index.ts` é tocado por T005/T006/T010 → serializar.
- `runTeam`/coordinator e `e2b.ts` permanecem **intocados** (Princípio II); o gate c0..c3 comprova.
- Sem migração (Princípio III não acionado).
- Commit por tarefa ou grupo lógico; push ao fechar a entrega (feedback do usuário).
- Gate real = E2E autenticado em produção (Cenário D), não os verifies locais.
