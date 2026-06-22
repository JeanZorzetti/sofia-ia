# Handoff — 003 VPS executor + co-localização

**Data**: 2026-06-22 · **Estado**: **US1 (MVP) ENTREGUE e no gate verde.** Falta US2, US3 e Polish. Implementação parou no **checkpoint da US1** (T001–T007), conforme pedido.

## O que foi feito nesta sessão (T001–T007 = US1)

Executor self-hosted (`vps-local`) atrás do port `Sandbox` existente, selecionável por env, com E2B preservado byte-idêntico.

- **T001** — `.env.example`: nova seção "CODE-RUN EXECUTOR" documentando `SANDBOX_PROVIDER` (e2b|vps-local), `VPS_RUNS_DIR` (exige volume montado) e `CODE_RUN_CONCURRENCY`.
- **T002** — `src/lib/sandbox/types.ts`: `readonly rootDir?: string` (aditivo) no port `Sandbox`. E2B omite → consumidor faz `sandbox.rootDir ?? '/home/user'`.
- **T003** — `src/lib/sandbox/vps-local.ts` (NOVO): `createVpsLocalProvider()`. `create`=uuid+`mkdir -p`; `exec`=`bash -lc` via `node:child_process` (env mesclado, timeout real SIGTERM→SIGKILL, **nunca lança**, falha de spawn→exitCode 127); `writeFile`=fs+mkdir recursivo; `setTimeout`=**no-op**; `close`=`fs.rm` recursivo idempotente; `connect`=valida `existsSync`/reanexa/lança claro; `getPreviewUrl`=lança "Fase 2". + helper exportado `sweepVpsRunDirs({maxAgeMs,activeIds})` e `vpsRunsBaseDir()`.
- **T004** — `src/lib/sandbox/index.ts`: `case 'vps-local'` no factory; mensagem de erro do default agora lista `e2b, vps-local`.
- **T005** — `src/worker/index.ts`: removida a constante de módulo `WORKDIR`; agora `const workdir = \`${sandbox.rootDir ?? '/home/user'}/repo\`` derivado **após** criar/conectar o sandbox e passado a `runWithRepo`/`continueWithRepo`/`startRunPreview` (todas ganharam param `workdir`). Usos internos de `WORKDIR` (setupRepo, createCodeChatFn, captureWorkingDiff, commitAndPush, previewWorkdir) repontados.
- **T006** — sweep de órfãos: helper `sweepVpsRunDirs` (sweep se NÃO está em `activeIds` E mais velho que `maxAgeMs`, default 6h via `VPS_SWEEP_MAX_AGE_MS`). Chamado no **boot do worker** (IIFE best-effort, só se `SANDBOX_PROVIDER=vps-local`, protege runs `pending|running`) e no **cron** `reap-preview-sandboxes/route.ts` (mesma proteção; resposta agora inclui `sweptDirs`).
- **T007** — `scripts/vps-local-verify.ts` (NOVO): 8 asserts (namespacing/isolamento, setTimeout no-op, close rm-rf idempotente, connect reanexa/lança, getPreviewUrl lança, exec never-throws, sweep age+activeIds, factory resolve vps-local). **Verde.**

## Gate (verde nesta sessão)

- `npx tsx scripts/vps-local-verify.ts` → **8/8**.
- `c0`(12) `c1`(23) `c2`(20) `c3`(15) verifies → **todos verdes** = coordinator/code-agent INTOCADOS (Princípio II).
- `npm run typecheck` → **limpo** (é o gate bloqueante do pre-commit).
- Commit + push na `main` feitos (slice US1).

## Decisões de implementação (e por quê)

- **Caminho C0 (sem repo)** recebe `workdir: sandbox.rootDir` (NÃO o `…/repo`): no E2B `rootDir` é `undefined` → `createCodeChatFn` mantém o comportamento C0 legado (byte-idêntico); no VpsLocal vira o dir isolado do run, evitando que o agente rode no cwd do **processo do worker** (o próprio repo sofia-next na VPS). Os caminhos COM repo usam `…/repo`. Isto concilia "E2B byte-idêntico" + "VpsLocal isolado por run (FR-005)".
  - ⚠️ Efeito colateral aceito (Fase 1): no VpsLocal + C0 + worker claude-cli, o `CLI_REPO_PREAMBLE` é injetado (workdir presente) mesmo sem repo clonado — frase "repo já clonado" imprecisa, baixo impacto (missões C0 não mexem em repo). Reavaliar se virar problema.
- **Lifecycle via `node:fs`** (create/close/writeFile), **não** `bash` — cross-platform, idempotente, sem dependência de shell para o ciclo de vida. Só `exec` usa `bash -lc` (alvo = container Linux). Por isso o verify roda verde no Windows (não chama bash nas asserções; em `exec` só checa o invariante "never throws / exitCode numérico").
- **`sweepVpsRunDirs` compartilhado** (boot + cron) com proteção por `activeIds` (runs `pending|running` no DB) + limiar de idade → não varre o dir de uma missão longa em andamento. Default 6h cobre missões longas; cron (5min) limpa debris de crash.
- **Default `VPS_RUNS_DIR=/runs`** (conforme data-model). **`e2b.ts` INTOCADO**; E2B continua selecionável.

## Próximos passos (em ordem)

1. **US2 (T008–T011)** — co-localização lead/reviewer via `code-agent.ts` (coordinator intocado):
   - T008 `src/lib/orchestration/team/co-location.ts` (helper puro `buildColocationContext`, testável com sandbox fake; reusar caps do C2).
   - T009 `code-agent.ts`: `resolveMemberRole?` em `CodeChatFnOptions`; no caminho **não-worker** (sem `taskId`) **com** `workdir`, prepender contexto na 1ª msg `user` ANTES do `injectProtocol`/`baseChat`. Sem workdir/dep/role ⇒ byte-idêntico.
   - T010 `src/worker/index.ts`: impl Prisma de `resolveMemberRole` (lê `TeamMember.role` por `ChatOptions.memberId`; best-effort→null) injetada nos **3** call-sites de `createCodeChatFn`. ⚠️ mesmo arquivo do T005 — sequencial.
   - T011 `scripts/colocation-verify.ts`.
2. **US3 (T012)** — acrescentar ao verify asserts de seleção: factory **lança claro** em `SANDBOX_PROVIDER` desconhecido (já implementado no factory; falta o assert) + rodar c0..c3 verdes (FR-003/FR-004). (A seleção positiva já é coberta pelo vps-local-verify.)
3. **Polish (T013–T015)** — T013 nota de infra em `specs/002-teams-dashboard/polaris-team-setup.md`; T014 gate de regressão completo; T015 dogfooding 002 (gated no PASSO 0).

## Pendências / bloqueios (decisão/ação do usuário)

- **PASSO 0 (gate real, MANUAL)**: deployar o **worker como serviço EasyPanel dedicado** com `GITHUB_TOKEN`, `CLAUDE_CODE_OAUTH_TOKEN(S)`, `REDIS_URL`, `DATABASE_URL`, `SANDBOX_PROVIDER=vps-local`, `VPS_RUNS_DIR` + **volume montado**. Sem isso, missões ficam `pending` (independe do código). É o gate para T015.
- **E2E em produção** das mudanças da US1 (uma missão >60 min concluir; uma missão curta idêntica ao E2B — Cenário A do quickstart) — pendente, exige o PASSO 0.
- T015 (dogfooding 002) = critério de fechamento (commit na `main` de `sofia-ia` com `route.ts` + `page.tsx`).

## Gotchas do ambiente

- jest NÃO roda local (OneDrive errno -4094) → usar verifies `tsx`. `npm run typecheck` é o gate bloqueante (pre-commit).
- `exec` do VpsLocal usa `bash -lc` → assume container Linux. No dev Windows o bash pode faltar; o verify não depende disso (só checa "never throws").
- Sem migração nesta feature (Princípio III não acionado). Se uma fase futura exigir schema: `migrate deploy` MANUAL no host real `2.24.207.200:5435` ANTES do push.
- ⚠️ `T005/T006/T010` tocam todos `src/worker/index.ts` → **não** paralelizar entre si (T005/T006 já feitos; T010 pendente).
- E2B continua selecionável (`SANDBOX_PROVIDER=e2b`); `e2b.ts` intocado.
