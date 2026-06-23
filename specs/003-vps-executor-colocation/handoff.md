# Handoff — 003 VPS executor + co-localização

**Data**: 2026-06-22 · **Estado**: 🏁 **CÓDIGO COMPLETO (US1 + US2 + US3 + Polish T013/T014).** Só falta **T015 (dogfooding em prod)**, que é **gated no PASSO 0 manual** (deploy do worker dedicado). Gate verde, tudo na `main`.

## Commits (na `main` de `JeanZorzetti/sofia-ia`)

- `eee71ca` — **US1** (T001–T007): `VpsLocalProvider` + port `rootDir` + workdir por run + sweep + `vps-local-verify`.
- `ca5de78` — **US2** (T008–T011): co-localização lead/reviewer (`co-location.ts` + `code-agent` + dep no worker + `colocation-verify`).
- `c7038bc` — **US3 + Polish** (T012–T014): asserts de seleção FR-004 no `vps-local-verify`, nota de infra na 002, gate de regressão.
- `<follow-up>` — **co-located CLI lead/reviewer** (pós-ciclo): os 3 agentes podem ser claude-cli (subscription).

## Follow-up (pós-ciclo, 2026-06-22): TODOS os agentes em claude-cli

**Problema:** subscription (claude-cli) é muito mais barato que API paga, mas Lead/Reviewer em claude-cli faziam **local-spawn no `/app`** (`groq.ts:317`, `cwd=process.cwd()`) → liam a árvore intocada → `@REJECT` em loop. `vps-local` por si só NÃO consertava (cwd continuava `/app`).

**Fix (coordinator intocado, byte-idêntico fora do gatilho):**
- `ChatOptions.claudeCliCwd?` (novo, opcional) em `team-types.ts`.
- `code-agent.ts`: em turno **não-worker** (sem `taskId`) com **`sandbox.rootDir`** (vps-local) + `workdir`, seta `claudeCliCwd = workdir`. Worker / E2B (sem rootDir) / sem workdir ⇒ unset.
- `groq.ts` (rota claude-cli): usa `claudeCliCwd` como `cwd` do `ClaudeCliService.generate`; quando setado, **força read-only** passando `capabilities: capabilityPolicy ?? {}` — no contexto `chat-run`, qualquer policy vira read-only (`--permission-mode plan`, bloqueia Write/Edit/**Bash**) → o lead/reviewer **não suja o diff** do worker.
- `scripts/colocated-cli-verify.ts` (6 asserts) + docs `polaris-team-setup.md` repontadas (3 agentes claude-cli com vps-local).

**Decisão:** reviewer roda read-only **estático** (lê a árvore real + o diff do C3), **sem Bash** — rodar `npm test`/`build` escreveria arquivos e corromperia o diff. É a troca certa: melhor que ler `/app`, sem risco ao diff.

**Não mexeu** em `cli-tool-flags.ts`/`claude-cli-service.ts` (o read-only do `chat-run` já existia). Gate: colocated-cli(6)+c0..c3+vps-local(10)+colocation(11)+typecheck verdes. Ver [[polaris_teams_use_claude_cli]].

## O que cada fatia entregou

### US1 — executor self-hosted (sem teto de tempo)
- `src/lib/sandbox/types.ts`: `readonly rootDir?` aditivo no port.
- `src/lib/sandbox/vps-local.ts`: provider (sem dep nova; lifecycle via `fs`, `exec` via `bash -lc` nunca lança) + `sweepVpsRunDirs`/`vpsRunsBaseDir`.
- `src/lib/sandbox/index.ts`: `case 'vps-local'`.
- `src/worker/index.ts`: `workdir` derivado de `sandbox.rootDir` por run (C0 usa `sandbox.rootDir`); sweep de boot.
- `src/app/api/cron/reap-preview-sandboxes/route.ts`: sweep também varre dirs locais (vps-local).
- `.env.example`: seção CODE-RUN EXECUTOR (e `.gitignore` destravou `!.env.example`).

### US2 — lead/reviewer enxergam o repo real
- `src/lib/orchestration/team/co-location.ts` (puro): `buildColocationContext` — lead: árvore capada + keyFiles; reviewer: bloco de verificação read-only. Caps espelham os do C2.
- `code-agent.ts`: `resolveMemberRole?` em `CodeChatFnOptions`; enriquece a 1ª msg `user` **antes** do `injectProtocol`, só em turno **não-worker** (sem `taskId`) **com** `workdir` e role ∈ {lead,reviewer}. Sem dep/workdir/worker/role-outro ⇒ byte-idêntico.
- `worker/index.ts`: impl Prisma de `resolveMemberRole` injetada nos **3** call-sites.
- Dispara também no E2B quando o dep é injetado (lê via `sandbox.exec` no sandbox certo) — melhoria intencional p/ ambos os providers.

### US3 — troca por config
- `vps-local-verify.ts`: asserts de seleção (`vps-local`→novo provider, `e2b` preservado, **desconhecido lança claro** FR-004). c0..c3 verdes provam `runTeam` intocado.

### Polish
- T013: nota de infra na `specs/002-teams-dashboard/polaris-team-setup.md` (vps-local + volume em `VPS_RUNS_DIR` + concorrência conservadora + nota da co-localização US2).
- T014: gate de regressão completo verde.

## Gate (verde nesta sessão)
- `npm run typecheck` limpo (gate bloqueante do pre-commit).
- `c0`(12)·`c1`(23)·`c2`(20)·`c3`(15) → **coordinator/code-agent INTOCADOS** (Princípio II).
- `vps-local-verify`(10) · `colocation-verify`(11).
- `e2b.ts` intocado; E2B byte-idêntico quando `rootDir`/dep ausentes.

## Decisões de implementação (carregadas)
- **C0 (sem repo)** usa `workdir: sandbox.rootDir` (não `…/repo`): E2B `undefined`→C0 legado; VpsLocal→dir isolado (não roda no cwd do worker). ⚠️ efeito menor: em VpsLocal+C0+reviewer claude-cli o hint de verificação aparece sem repo — baixo impacto.
- **Lifecycle via `node:fs`** (create/close/writeFile); só `exec` usa `bash -lc` (alvo Linux) → verify roda no Windows sem bash.
- **`sweepVpsRunDirs`** compartilhado (boot+cron): protege `activeIds` (runs `pending|running`) + limiar de idade (`VPS_SWEEP_MAX_AGE_MS`, default 6h). Default `VPS_RUNS_DIR=/runs`.
- **Co-localização** vale p/ E2B também (desejável). "Byte-idêntico ao legado" só vale quando o dep **não** é injetado (testes/legado) — por isso os c0..c3 (sem dep) seguem verdes.

## Próximo passo (ÚNICO restante) — T015, bloqueado no usuário

**PASSO 0 (manual, gate real):** deployar o **worker como serviço EasyPanel dedicado** com:
- `SANDBOX_PROVIDER=vps-local`, `VPS_RUNS_DIR=/runs` (ou outro) **+ volume montado** nesse path.
- `GITHUB_TOKEN` (push na `main` de `sofia-ia`), `CLAUDE_CODE_OAUTH_TOKEN(S)`, `REDIS_URL`, `DATABASE_URL`.
- `CODE_RUN_CONCURRENCY=1` (ou 2). `E2B_API_KEY` não é necessária com vps-local.

Depois: **T015 / Cenário D do quickstart** — rodar o dogfooding da 002 pela própria Polaris (setup pronto em `specs/002-teams-dashboard/polaris-team-setup.md`). Critério de fechamento: novo commit na `main` de `sofia-ia` com `route.ts` + `page.tsx`, build verde, coordinator inalterado. **+ E2E autenticado em prod** de US1/US2 (Cenários A e C do quickstart): missão >60 min conclui; lead/reviewer referenciam arquivos reais.

## Gotchas do ambiente
- jest NÃO roda local (OneDrive errno -4094) → verifies `tsx`. `npm run typecheck` é o gate.
- `exec` do VpsLocal assume container Linux (`bash -lc`); no dev Windows o verify não depende disso.
- Sem migração nesta feature (Princípio III não acionado).
- E2B continua selecionável (`SANDBOX_PROVIDER=e2b`); `e2b.ts` intocado.
