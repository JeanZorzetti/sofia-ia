# Phase 0 — Research & Decisions

Feature: `003-vps-executor-colocation`. Todas as questões abertas foram resolvidas (zero `NEEDS CLARIFICATION`). Os dois grandes forks já tinham sido decididos no brainstorming.

---

## D1 — Backend self-hosted: novo provider atrás do port existente

- **Decisão**: criar `VpsLocalProvider` em `src/lib/sandbox/vps-local.ts` implementando o port `SandboxProvider`/`Sandbox` (já existente). O "sandbox" é um diretório de trabalho por run no filesystem do worker. Seleção por `SANDBOX_PROVIDER=vps-local` no factory `getSandboxProvider()`.
- **Rationale**: o port foi **desenhado** para isso (comentário em `types.ts`: "the E2B impl can be swapped for Docker-per-run later without touching the code-agent"). Worker, `repo-lifecycle`, `captureWorkingDiff` e `code-agent` dependem só do port → nenhum deles muda. Remove o teto de 1h (limite de plano do E2B, não heartbeat ausente — `startSandboxHeartbeat` já renova).
- **Alternativas rejeitadas**: (a) trocar e2b por outro SaaS de sandbox → mantém dependência externa + custo + teto; (b) editar o worker para clonar/executar inline sem o port → quebraria o desacoplamento e o caminho do preview/continuação.

## D2 — Namespacing por run: campo opcional `rootDir` no port

- **Decisão**: adicionar `readonly rootDir?: string` à interface `Sandbox`. E2B **omite** (cada micro-VM é isolada; `/home/user/repo` já é por-sandbox). VpsLocal retorna `${VPS_RUNS_DIR}/<id>`. O worker passa a derivar `const workdir = `${sandbox.rootDir ?? '/home/user'}/repo``.
- **Rationale**: no VpsLocal todos os runs compartilham o FS do worker; um `WORKDIR` fixo (`/home/user/repo`) colidiria entre runs concorrentes (viola FR-005). `rootDir` opcional é aditivo: ausente ⇒ caminho legado byte-idêntico (E2B). É a menor mudança que dá isolamento por run.
- **Alternativas rejeitadas**: (a) remapear caminhos absolutos dentro do VpsLocal (hacky, frágil); (b) variável de ambiente global de workdir (não escala p/ concorrência).
- **`connect` (continuação)**: `TeamRun.sandboxId` guarda o `<id>` do dir; `connect(id)` reanexa a `${VPS_RUNS_DIR}/<id>` se existir, senão lança erro claro (FR-013).

## D3 — Semântica de cada método do `Sandbox` no VpsLocal

- **Decisão** (detalhada no contrato): `create` → `mkdir -p ${VPS_RUNS_DIR}/<uuid>`; `exec(cmd,{cwd,env,timeoutMs})` → `child_process` com `cwd`/`env`/timeout (mata o processo no estouro, retorna exitCode — nunca lança em saída não-zero, igual ao port); `writeFile` → `fs.writeFile` criando dirs-pai; `setTimeout` → **no-op** (sem ciclo de vida externo ⇒ remove o teto de 1h, FR-002); `close` → `rm -rf` do dir do run (idempotente); `connect(id)` → reanexa; `getPreviewUrl(port)` → **lança erro claro** "preview self-hosted ainda não disponível (Fase 2)".
- **Rationale**: alinha 1:1 com o que o worker já chama. `setTimeout` no-op torna o heartbeat inofensivo (segue chamando, sem efeito) sem editar o heartbeat. `getPreviewUrl` que lança é seguro porque `startRunPreview` no worker é best-effort (engole erro → `previewStatus='failed'`), satisfazendo o edge case "preview degrada de forma clara".
- **Timeout de comando**: usar timeout real do `child_process` (kill + SIGKILL de fallback) para honrar `perCommandTimeoutMs` do code-agent.

## D4 — Co-localização de lead/reviewer: onde injetar

- **Decisão**: enriquecer **dentro do `code-agent.ts`**, no caminho dos turnos **não-worker** (sem `taskId`) quando há `workdir`. O papel (lead/reviewer) é resolvido por um dep injetado `resolveMemberRole(opts)` (worker fornece a impl Prisma via `ChatOptions.memberId`, que o coordinator **já** preenche hoje). A lógica de leitura/verificação fica em `co-location.ts` (puro, recebe `sandbox`+`workdir`+`role`).
- **Rationale**: `code-agent.ts` é o **ChatFn injetado**, não o coordinator — é o seam sancionado (C1/C2/C3/S1.3/S6 editaram-no). `ChatOptions.memberId` já existe e é forwarded pelo coordinator → não preciso adicionar `role` ao `ChatOptions` (o que exigiria editar `runTeam`). `runTeam` fica **intocado** (Princípio II).
- **Alternativas rejeitadas**: (a) adicionar `role` ao `ChatOptions` populado pelo coordinator → editaria `runTeam` ❌; (b) novo `RunTeamDeps.getLeadContext` consumido por `runTeam` → editaria `runTeam` ❌; (c) enriquecer no worker envolvendo `baseChat` → o `baseChat` também é chamado nos passos @RUN do worker, contaminaria o loop ❌.

## D5 — O que cada papel recebe (escopo do enriquecimento na Fase 1)

- **Lead** (turno de planejamento): injetar um **retrato do repositório** — árvore (`git ls-files` / `find` limitado) + conteúdo dos **arquivos-chave** (os specs/contratos e arquivos-alvo citados na missão/diretrizes). Resolve a real cegueira do lead (hoje planeja só pelo texto) → FR-007.
- **Reviewer**: **já** recebe o diff real (C3 `getTaskDiff` via `runTeam`, em `messages`) e, em code-mode, **já** tem `@RUN` no sandbox (o caminho não-Option-B aplica `CODE_PROTOCOL_PROMPT`). O enriquecimento aqui é **tornar explícito**: hint para rodar verificação read-only (`npm test`/`build`/`grep`) no repo vivo + (opcional) anexar resultado de um teste leve se existir script. Satisfaz FR-006 sem custo novo obrigatório.
- **Worker** e **turnos sem workdir**: **nenhum** enriquecimento → byte-idêntico (FR-009).
- **Rationale**: foca o gasto onde há lacuna real (lead). O reviewer já estava 80% co-localizado via diff+@RUN; só falta dirigi-lo. Independe do modelo (funciona com Groq) → FR-008.

## D6 — claude-cli para lead/reviewer: habilitado pelo design, FORA da Fase 1

- **Decisão**: **não** implementar agora o spawn do claude-cli de lead/reviewer com `cwd=workdir`. Documentar que o VpsLocal **torna isso seguro** (o workdir é local → o CLI pode apontar pra ele em vez do `/app` intocado, eliminando a "regra de ouro").
- **Rationale**: o default decidido é lead/reviewer = chat barato (Groq) por custo (FR-008, US2 cenário 3). O caminho local-spawn (`ClaudeCliService`) hoje roda no `/app`; mudar o `cwd` dele é um trabalho separado no caminho de chat, não exigido pelos critérios de aceite da US2. Fica como follow-up de baixo risco.
- **Alternativas rejeitadas**: forçar claude-cli em lead/reviewer agora → triplica custo de claude e expõe mais a rate-limit, contra a preferência registrada ("Teams: Claude CLI, nunca free; lead/reviewer = chat pago barato").

## D7 — Limpeza de diretórios (disco)

- **Decisão**: (a) `close()` faz `rm -rf` do dir ao fim do run sem preview (caminho normal); (b) **sweep no boot do worker** + adaptar o cron `reap-preview-sandboxes` para remover dirs `${VPS_RUNS_DIR}/*` órfãos (sem run ativo / mais velhos que um limiar) — cobre worker que morreu mid-run. FR-012.
- **Rationale**: no VpsLocal não há auto-destruição do provedor externo; o disco é responsabilidade nossa. Como na Fase 1 o preview fica off, quase todo dir é removido pelo `close()`; o sweep é a rede de segurança para crashes.
- **Alternativas rejeitadas**: confiar só no `close()` (vaza em crash); TTL no FS via cron isolado novo (reusar o reaper existente é mais simples).

## D8 — Recursos da VPS e concorrência

- **Decisão**: documentar `CODE_RUN_CONCURRENCY` conservador (1–2) e o worker como **serviço EasyPanel dedicado** (isola CPU/RAM/disco do `app`), com um volume para `${VPS_RUNS_DIR}`. `npm install`/`build` por run é o gargalo.
- **Rationale**: clonar + instalar + buildar repos reais é pesado numa VPS compartilhada; a constituição exige precheck/observabilidade. Sem container por run (Fase 3), o limite de blast-radius é a concorrência baixa + limpeza agressiva.

## D9 — Pré-requisito: worker deployado

- **Decisão**: tratar o deploy do worker (com `GITHUB_TOKEN`, `CLAUDE_CODE_OAUTH_TOKEN(S)`, `REDIS_URL`, `DATABASE_URL`, `SANDBOX_PROVIDER=vps-local`, `VPS_RUNS_DIR`) como **passo 0** operacional, documentado no quickstart e na nota da 002. Sem ele, runs ficam `pending` para sempre — independente do provider.
- **Rationale**: forte indício de que o Code Factory worker nunca foi a produção (`docker-compose` só sobe app+pg+redis; `.env` sem as chaves). É o gargalo real para a missão de dogfooding rodar.
