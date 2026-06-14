# Polaris Teams — Prompt inicial da Sessão 6

> Cole o bloco abaixo (ou o essencial) ao abrir a nova conversa. Ele dá ao Claude todo o contexto pra continuar sem reexplorar. **Foco desta sessão: Sub-projeto C — Fatia C3 (Code-review com diff).**

---

## Contexto pra continuar (Polaris Teams)

Programa **"Polaris Teams"**: importar conceito/UX/protocolo da **Agent Teams AI** (Electron OSS de orquestração de times de agentes de código, `C:\dev\agent-teams-ai`) pra **Polaris** (antiga Sofia = `sofia-next`, deploy EasyPanel em `polarisia.com.br`, GitHub `JeanZorzetti/sofia-ia`). Roadmap geral em `docs/Polaris Teams/ROADMAP.md` (3 sub-projetos: **A — Teams Core**, **B — Teams UX**, **C — Code Factory**). Cadência: **um sprint por sessão**; confirmar abordagem antes de executar (regra global).

### O que JÁ foi feito ✅ (sessões 1–5)

**Sub-projeto A — Teams Core** (2026-06-13, em prod). Entidade dedicada (`Team/TeamMember/TeamRun/TeamTask/TeamMessage` + `/api/teams/*`). Engine em `src/lib/orchestration/team/`: `team-coordinator.ts` (`runTeam`, loop Lead-orquestrado síncrono **com loop de reviewer**: task vira `status:'review'` → reviewer dá `@APPROVE`/`@REJECT` → retry), `team-protocol.ts` (`@TASK/@MESSAGE/@DONE/@APPROVE/@REJECT`), `team-prompts.ts`, `team-board.ts`, `team-store.ts` (`TeamStore` = porta injetada → testável sem DB), `team-types.ts`. Coordinator recebe `TeamStore` + `chat` (`ChatFn`) injetados.

**Sub-projeto B — Teams UX** (2026-06-14, em prod). Run ao vivo via `after()` + SSE polling do DB (`runs/[runId]/stream`), override modelo/effort por membro, UI no design system (`TeamRunView` = kanban+feed+métricas, `TeamGraph` XY Flow, `RosterEditor`). Pendente só Slice 6 (drag-drop, deferido).

**Sub-projeto C — Code Factory** (2026-06-14, **C0+C1+C2+C2.1 EM PROD**):
- **C0 (durable code-run + sandbox):** fila **BullMQ** (sobre `ioredis`, só code-runs) + **worker separado** (`src/worker/index.ts`, `Dockerfile.worker`, `npm run worker`); porta `SandboxProvider` + impl **E2B** (`src/lib/sandbox/`); **code-agent ChatFn** (loop `@RUN`/`@DONE` no sandbox, `code-agent.ts` + `code-protocol.ts`); schema `TeamRun.mode/sandboxId` + `TeamTask.artifacts`. Sandbox é **1-por-run**. Coordinator **INTACTO** (reuso via injeção do `ChatFn`).
- **C1 (Git → PR):** lifecycle do repo NO WORKER em volta do `runTeam` (setup clone+branch → runTeam → teardown commit/push/PR). `src/lib/git/repo-lifecycle.ts`. Token NUNCA no contexto do agente (via `http.extraHeader`); PR via GitHub REST API worker-side; PAT no env do worker (`GITHUB_TOKEN`). Schema `TeamRun` += `repoUrl/baseBranch/branch/commitSha/prUrl/prNumber/changedFiles`. PR draft #1 validado.
- **C2 (terminal/diff rico):** captura do **conteúdo do diff** no teardown (`commitAndPush` roda `git diff origin/<base>..HEAD`, `splitUnifiedDiff` por arquivo, `capPatch` com budgets, mescla nos itens de `changedFiles` → `{path,status,patch?,truncated?,binary?}`, **best-effort**). UI **xterm.js** (`SandboxTerminal.tsx`) + **diff2html** (`DiffViewer.tsx`, toggle side-by-side/unificado), em `src/app/dashboard/teams/[id]/`. **Sem migração** (reusa `changedFiles` Json) e **sem mudança no SSE** (diff pega carona no evento `status`). Deps novas pinadas: `@xterm/xterm@6.0.0`, `@xterm/addon-fit@0.11.0`, `diff2html@3.4.56`.
- **C2.1 (streaming incremental):** **(A)** terminal **ao vivo** — code-agent persiste artifacts **parciais após cada comando** (best-effort); o SSE já faz poll por tamanho do `artifacts` → streama sem mudar o SSE. **(B1)** diff/PR no fim **sem reload** — o SSE mantém o code-run aberto após `completed` até o teardown gravar `changedFiles`/`prUrl` (grace 45s). **Crux:** o `taskId` chega ao code-agent pelo **`options` (4º param do `ChatFn`)**, NÃO pelo `leadContext` — `chatWithAgent` só lê `model/effort/rawText/useVectorSearch` e ignora chaves extras → chat-run A/B **provadamente intacto**. Coordinator = **1 linha aditiva** (`runTeam` intacto); worker compartilha **um** `TeamStore` entre `runTeam` e `createCodeChatFn`.

### ⚠️ Operar modelos no code-team (aprendido)
- **OpenRouter `:free`** = **429** sob a rajada do code-team (Lead + Worker + Reviewer em loop) — não é cobrança, é cota free. **Groq free** = rate limit fácil.
- **Recomendado:** modelo cloud **pago barato** (`openai/gpt-4o-mini` ou `deepseek/deepseek-chat`, precisa crédito no OpenRouter). **Ollama** = fallback self-hosted (`https://sofia-ollama.7c17iw.easypanel.host`, sem auth, lento na CPU 7B).
- Pendência opcional: expor `maxTurns`/`retryCap` no editor de time (hoje default 6/2, fixo).

### ⚠️ Gotchas de ambiente desta máquina (crítico)
- Projeto no **OneDrive**, que corrompe `node_modules`: **`npm install`, `prisma generate`, `jest`, `next build` e `require('pg')` TRAVAM** localmente. NÃO rodá-los.
  - Dep nova sem instalar: **`npm install --package-lock-only`** (+ fixar versão via `npm view <pkg> version`).
  - Migration: **`node node_modules/prisma/build/index.js migrate deploy`** com `DATABASE_URL` inline (`npx prisma` dá "não reconhecido"). `prisma migrate` (Rust engine) FUNCIONA (não usa `pg`).
- Verificação confiável local: **`npx tsc --noEmit`** (só LÊ; aceitar só erros de módulo não instalado / client Prisma não regenerado — `bullmq`, `e2b`, `@xterm/*`, `diff2html`, e campos novos do schema aparecem como erro e somem no build do EasyPanel) + **`npx tsx scripts/*.ts`** com `node:assert` e **imports relativos** pra lógica pura (fake sandbox + fake store + fake fetch). Os testes do C vivem em `scripts/c1-verify.ts` e `scripts/c2-verify.ts`.
- **Gate real = deploy no EasyPanel** (Linux limpo). Deploy = **push na `main`** → auto-deploy redeploya **app + worker** (2 serviços). **E2E autenticado fica com o usuário** (sem login no ambiente do Claude). Caminhos com `[id]`/`[runId]` no git: pathspec `:(literal)`. Commit multi-linha: heredoc no Bash tool. **Commitar só os arquivos da fatia** (a árvore tem mudanças não relacionadas — logos/docs — que NÃO devem entrar no commit).
- **Query no banco p/ diagnóstico:** `prisma.$queryRawUnsafe(...)` num script tsx (bypassa o client stale) com `DATABASE_URL` inline — útil pra ler `TeamRun.error`/`changedFiles`.

### Banco de produção / segredos
- Real e alcançável: **`postgres://sofia_db:<senha>@2.24.207.200:5435/sofia_db?sslmode=disable`** (mesmo VPS do Compass). O `.env` aponta pra host que dá timeout — usar o de cima pra migrate/diagnóstico.
- Envs do worker (EasyPanel): `DATABASE_URL`, `REDIS_URL`, `E2B_API_KEY`, `GITHUB_TOKEN`, `OPENROUTER_API_KEY`/`GROQ_API_KEY`, `OLLAMA_BASE_URL`, opcionais `SANDBOX_PROVIDER=e2b`, `CODE_RUN_CONCURRENCY`, `GIT_AUTHOR_NAME`/`GIT_AUTHOR_EMAIL`.
- 🔐 **Rotacionar (higiene — expostos no chat):** senha Postgres, `E2B_API_KEY`, `GITHUB_TOKEN` (PAT `ghp_…`), e os segredos antigos do Compass.

---

## Foco desta sessão: Sub-projeto C — Fatia C3 (Code-review com diff) 🔜

> Gancho: ler a seção **"Sub-projeto C → Fatias do Sub-projeto C → C3"** em `docs/Polaris Teams/ROADMAP.md` antes de começar — o plano e as **6 decisões** estão lá.

**Objetivo (do ROADMAP):** o **Reviewer** do time deixa de avaliar só o **texto** do worker e passa a avaliar o **diff real** das mudanças — um gate de aprovação sobre o que de fato mudou, antes do PR.

**Reusa tudo do C0/C1/C2/C2.1.** O **loop de reviewer já existe** no coordinator (`runTeam`: `status:'review'` → reviewer → `@APPROVE`/`@REJECT` → retry) e o **conteúdo do diff por-arquivo já é capturado** (C2: `changedFiles[].patch`). **Net-new:** dar o diff ao reviewer (injetar no prompt, com teto de tokens), eventualmente capturar diff **por-task**, e ajustar o gate pra considerar o diff.

## O que fazer nesta sessão
1. **Brainstorm + spec do C3** (skills superpowers: brainstorming → writing-plans). **Confirmar escopo + as 6 decisões comigo PRIMEIRO** (estão no ROADMAP, seção C3): (1) fonte do diff (final do run vs por-task); (2) o que entra no prompt (patch bruto truncado vs resumo estruturado); (3) granularidade do gate (run inteiro vs por-arquivo/task); (4) reviewer = code-agent (roda `git diff`/testes no sandbox) vs chat puro (raciocina sobre o diff pronto); (5) modelo de dados (estender, sem tabelas novas); (6) custo/limites (teto de tokens do diff, reusar `capPatch`).
2. **Não** detalhar nada além do escopo confirmado. Um sprint por sessão; commit limpo por fatia; push ao concluir.
3. Lembrar dos gotchas de ambiente (acima): `--package-lock-only` p/ dep nova, migration via binário node, `tsc --noEmit`/`tsx` como gate local, EasyPanel como gate real, E2E com o usuário (repo de teste: `JeanZorzetti/repo-de-teste`; usar modelo pago barato no time p/ não tomar 429). **Manter o coordinator o mais intacto possível** (invariante do sub-projeto C — extensões via injeção).

> Comece confirmando comigo o **escopo do C3** (as 6 decisões) antes de escrever spec ou código.
