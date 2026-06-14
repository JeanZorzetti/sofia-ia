# Polaris Teams — Prompt inicial da Sessão 5

> Cole o bloco abaixo (ou o essencial) ao abrir a nova conversa. Ele dá ao Claude todo o contexto pra continuar sem reexplorar. **Foco desta sessão: Sub-projeto C — Fatia C2 (Terminal/diff streaming rico).**

---

## Contexto pra continuar (Polaris Teams)

Programa **"Polaris Teams"**: importar conceito/UX/protocolo da **Agent Teams AI** (Electron OSS de orquestração de times de agentes de código, `C:\dev\agent-teams-ai`) pra **Polaris** (antiga Sofia = `sofia-next`, deploy EasyPanel em `polarisia.com.br`, GitHub `JeanZorzetti/sofia-ia`). Roadmap geral em `docs/Polaris Teams/ROADMAP.md` (3 sub-projetos: **A — Teams Core**, **B — Teams UX**, **C — Code Factory**). Cadência: **um sprint por sessão**; confirmar abordagem antes de executar (regra global).

### O que JÁ foi feito ✅ (sessões 1–4)

**Sub-projeto A — Teams Core** (2026-06-13, em prod). Entidade dedicada (`Team/TeamMember/TeamRun/TeamTask/TeamMessage` + `/api/teams/*`). Engine em `src/lib/orchestration/team/`: `team-coordinator.ts` (`runTeam`, loop Lead-orquestrado síncrono), `team-protocol.ts` (`@TASK/@MESSAGE/@DONE/@APPROVE/@REJECT`), `team-prompts.ts`, `team-board.ts`, `team-store.ts` (`TeamStore` = porta injetada → testável sem DB), `team-types.ts`. Reviewer automático.

**Sub-projeto B — Teams UX** (2026-06-14, em prod). Run ao vivo via `after()` + SSE polling do DB (`runs/[runId]/stream`), override modelo/effort por membro, UI no design system (`TeamRunView` = kanban+feed+métricas, `TeamGraph` XY Flow, `RosterEditor`). Pendente só Slice 6 (drag-drop, deferido).

**Sub-projeto C — Fatia C0 (durable code-run + sandbox)** (2026-06-14, em prod). Fila **BullMQ** (sobre `ioredis`, só code-runs) + **worker separado** (`src/worker/index.ts`, `Dockerfile.worker`, `npm run worker`); porta `SandboxProvider` + impl **E2B** (`src/lib/sandbox/`); **code-agent ChatFn** (loop `@RUN`/`@DONE` no sandbox, `src/lib/orchestration/team/code-agent.ts` + `code-protocol.ts`); schema `TeamRun.mode/sandboxId` + `TeamTask.artifacts`; SSE evento `terminal` + painel de terminal. Spec em `Sub-projeto C - C0 spec.md`. **Sandbox é 1-por-run**. Coordinator INTACTO (reuso via injeção do `ChatFn`).

**Sub-projeto C — Fatia C1 (Git → Pull Request)** (2026-06-14, ✅ **VALIDADO EM PROD**). Code-team clonou `JeanZorzetti/repo-de-teste`, criou `hello.txt` e abriu **PR draft #1**. Plano detalhado: `~/.claude/plans/...tranquil-unicorn.md`; resumo no ROADMAP (seção C → C1). Construído:
- **Lifecycle do repo NO WORKER**, em volta do `runTeam` (coordinator **INTACTO**): setup (clone + branch) → `runTeam` (agentes editam no repo via `@RUN`, com `cwd`=workdir `/home/user/repo`) → teardown (commit/push/PR). Módulo `src/lib/git/repo-lifecycle.ts` (`setupRepo`/`commitAndPush`/`openPullRequest` + helpers puros; 23 testes em `scripts/c1-verify.ts`).
- **Segurança:** worker faz clone/push; **token NUNCA no contexto do agente** — via `http.extraHeader` (não persiste no `.git/config`). PR via **GitHub REST API** worker-side (sem `gh`). PAT no env do worker (`GITHUB_TOKEN`), nada no DB.
- **Binding híbrido:** `Team.config.repoUrl/defaultBranch` (campos no editor de time) + override por-run. **1 branch/run** (`polaris/run-<id>`) + **PR draft**.
- **Schema:** `TeamRun` += `repoUrl/baseBranch/branch/commitSha/prUrl/prNumber/changedFiles`. Migração `20260614130000_code_factory_c1` **aplicada em prod**.
- **UI:** painel "Entrega de código" (branch + link do PR + arquivos alterados) + banner de erro da run.
- **Gotchas resolvidos (lembrar no C2):** (a) clone detecta default branch via `ls-remote` (master/main/vazio) e retorna o **base efetivo**; (b) o **agente commita sozinho** → entrega decidida por `rev-list origin/<base>..HEAD` (commits à frente), não por working tree suja; (c) erro de provider em code-run **propaga** (vira `rate_limited`/`failed` honesto, não "Concluído" falso).

**Também entregue na sessão 4 (plataforma):**
- **Provider Ollama** (`ollama/<modelo>` → endpoint OpenAI-compat self-hosted via `OLLAMA_BASE_URL`; `src/lib/ai/ollama.ts` + branch no `chatWithAgent` antes do check de `/`; `providerOf`/availability). Modelo registrado: `ollama/qwen2.5:7b-instruct`.
- **`rawText` p/ code-runs** (`ChatOptions.rawText`): desliga as tools/escrita-de-arquivo do branch OpenRouter em modelos coder/qwen (rodariam na FS do worker, não no sandbox → quebravam o `@RUN`). O code-agent força `rawText:true`.
- Modelos pagos baratos no catálogo: `openai/gpt-4o-mini`, `deepseek/deepseek-chat`.

### ⚠️ Operar modelos no code-team (aprendido na sessão 4)
- **Groq free** = rate limit fácil. **OpenRouter `:free`** = **429** sob a rajada de chamadas do code-team (Lead + Worker em loop + Reviewer + consolidação) — **não é cobrança**, é cota do tier free.
- **Recomendado p/ code-team:** modelo cloud **pago barato** (`openai/gpt-4o-mini` ou `deepseek/deepseek-chat`, precisa crédito no OpenRouter). **Ollama** = fallback self-hosted (sem limite, mas lento na CPU 7B). URL Ollama: `https://sofia-ollama.7c17iw.easypanel.host` (mesmo projeto EasyPanel; sem auth).
- **Pendência opcional:** expor `maxTurns`/`retryCap` no editor de time (hoje default 6/2, fixo) p/ enxugar nº de chamadas.

### ⚠️ Gotchas de ambiente desta máquina (crítico)
- Projeto no **OneDrive**, que corrompe `node_modules`: **`npm install`, `prisma generate`, `jest`, `next build` e `require('pg')` TRAVAM** localmente. NÃO rodá-los.
  - Dep nova sem instalar: **`npm install --package-lock-only`** (+ fixar versão via `npm view <pkg> version`).
  - Migration: **`node node_modules/prisma/build/index.js migrate deploy`** com `DATABASE_URL` inline (o `npx prisma` dá "não reconhecido"). `prisma migrate` via Rust engine FUNCIONA (não usa `pg`).
- Verificação confiável local: **`npx tsc --noEmit`** (só LÊ; aceitar só erros de módulo não instalado / client Prisma não regenerado — `bullmq`, campos novos do schema aparecem como erro e somem no build do EasyPanel) + **`npx tsx scripts/*.ts`** com `node:assert` e **imports relativos** pra lógica pura (fake sandbox + fake fetch).
- **Gate real = deploy no EasyPanel** (Linux limpo). Deploy = **push na `main`** → auto-deploy redeploya **app + worker** (2 serviços). **E2E autenticado fica com o usuário** (sem login no ambiente do Claude). Caminhos com `[id]`/`[runId]` no git: pathspec `:(literal)`. Commit multi-linha: heredoc no Bash tool.
- **Query no banco p/ diagnóstico:** `prisma.$queryRawUnsafe(...)` num script tsx (bypassa o client stale) com `DATABASE_URL` inline funciona — útil pra ler `TeamRun.error`.

### Banco de produção / segredos
- Real e alcançável: **`postgres://sofia_db:<senha>@2.24.207.200:5435/sofia_db?sslmode=disable`** (mesmo VPS do Compass). O `.env` aponta pra host que dá timeout — usar o de cima pra migrate/diagnóstico.
- Envs do worker (EasyPanel): `DATABASE_URL`, `REDIS_URL`, `E2B_API_KEY`, `GITHUB_TOKEN`, `OPENROUTER_API_KEY`/`GROQ_API_KEY`, `OLLAMA_BASE_URL`, opcionais `SANDBOX_PROVIDER=e2b`, `CODE_RUN_CONCURRENCY`, `GIT_AUTHOR_NAME`/`GIT_AUTHOR_EMAIL`.
- 🔐 **Rotacionar (higiene — expostos no chat):** senha Postgres, `E2B_API_KEY`, `GITHUB_TOKEN` (PAT `ghp_…`), e os segredos antigos do Compass.

---

## Foco desta sessão: Sub-projeto C — Fatia C2 (Terminal/diff streaming rico) 🔜

> Gancho: ler a seção **"Sub-projeto C → Fatias do Sub-projeto C → C2"** em `docs/Polaris Teams/ROADMAP.md` antes de começar — o plano e as **6 decisões** estão lá.

**Objetivo (do ROADMAP):** substituir o terminal "pre" simples e a lista de nomes do C1 por **terminal estilo xterm** (mono, cores, agrupado por task) + **diff viewer** (lado a lado / unificado) das mudanças, idealmente com **streaming incremental** (comandos/saída e diffs surgindo durante a run, não só no fim).

**Reusa tudo do C0/C1** (sandbox/worker/code-agent/fila; evento SSE `terminal`; painel "Entrega de código"; `git diff` no sandbox). **Net-new:** captura do **conteúdo do diff** (`git diff origin/<base>..HEAD`), diff viewer, terminal com render melhor, e opcionalmente streaming incremental (artifacts parciais mid-loop).

## O que fazer nesta sessão
1. **Brainstorm + spec do C2** (skills superpowers: brainstorming → writing-plans). **Confirmar escopo + as 6 decisões comigo PRIMEIRO** (estão no ROADMAP, seção C2): (1) escopo de streaming (incremental vs batch melhorado); (2) diff viewer (próprio vs lib); (3) terminal (CSS vs `xterm.js`); (4) fonte/armazenamento do diff (persistir vs buscar do PR); (5) granularidade/limites do diff; (6) modelo de dados (estender, sem tabelas novas).
2. **Não** detalhar nada além do escopo confirmado. Um sprint por sessão; commit limpo por fatia; push ao concluir.
3. Lembrar dos gotchas de ambiente (acima): `--package-lock-only` p/ dep nova, migration via binário node, `tsc --noEmit`/`tsx` como gate local, EasyPanel como gate real, E2E com o usuário (repo de teste: `JeanZorzetti/repo-de-teste`; usar modelo pago barato no time p/ não tomar 429).

> Comece confirmando comigo o **escopo do C2** (as 6 decisões) antes de escrever spec ou código.
