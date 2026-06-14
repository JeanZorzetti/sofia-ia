# Polaris Teams — Prompt inicial da Sessão 4

> Cole o bloco abaixo (ou o essencial) ao abrir a nova conversa. Ele dá ao Claude todo o contexto pra continuar sem reexplorar. **Foco desta sessão: Sub-projeto C — Fatia C1 (Git → Pull Request).**

---

## Contexto pra continuar (Polaris Teams)

Programa **"Polaris Teams"**: importar conceito/UX/protocolo da **Agent Teams AI** (Electron OSS de orquestração de times de agentes de código, `C:\dev\agent-teams-ai`) pra **Polaris** (antiga Sofia = `sofia-next`, deploy EasyPanel em `polarisia.com.br`, GitHub `JeanZorzetti/sofia-ia`). Roadmap geral em `docs/Polaris Teams/ROADMAP.md` (3 sub-projetos: **A — Teams Core**, **B — Teams UX**, **C — Code Factory**). Cadência: **um sprint por sessão**; confirmar abordagem antes de executar (regra global).

### O que JÁ foi feito ✅ (sessões 1–3)

**Sub-projeto A — Teams Core** (2026-06-13, em prod). Entidade dedicada (`Team/TeamMember/TeamRun/TeamTask/TeamMessage` + `/api/teams/*`). Engine em `src/lib/orchestration/team/`: `team-coordinator.ts` (`runTeam`, loop Lead-orquestrado síncrono), `team-protocol.ts` (diretivas por linha `@TASK/@MESSAGE/@DONE/@APPROVE/@REJECT`), `team-prompts.ts`, `team-board.ts`, `team-store.ts` (`TeamStore` = porta injetada → testável sem DB), `team-types.ts`. Reviewer automático.

**Sub-projeto B — Teams UX** (2026-06-14, em prod). Run ao vivo via `after()` + SSE polling do DB (`runs/[runId]/stream`), override modelo/effort por membro (`ChatFn` 4º param), UI no design system (lista/criar/editar, `TeamRunView` = kanban+feed+métricas, `TeamGraph` XY Flow). Gestão (excluir/editar via `RosterEditor`) + disponibilidade de modelo (`model-availability.ts`, `/dashboard/models`) + nav no Sidebar — todos feitos. Pendente só Slice 6 (drag-drop, deferido).

**Sub-projeto C — Fatia C0 (Durable code-run + sandbox)** (2026-06-14, ✅ **VALIDADO EM PROD**). Um code-team roda comandos shell num sandbox isolado. Spec em `docs/Polaris Teams/Sub-projeto C - C0 spec.md`. Construído:
- **Seam preservado:** `runTeam` (coordinator) **INTACTO**. Reuso via injeção — um **code-agent ChatFn** (`src/lib/orchestration/team/code-agent.ts`) embrulha o `chatWithAgent` num loop agêntico: membro emite `@RUN <cmd>`/`@DONE` (parser puro `code-protocol.ts`), executa no sandbox, realimenta stdout/stderr, repete até `@DONE`/`maxSteps`. `ChatResult` ganhou `artifacts` (logs); coordinator só repassa ao `updateTask`.
- **Sandbox:** porta `SandboxProvider` (`src/lib/sandbox/types.ts`) + impl **E2B** (`src/lib/sandbox/e2b.ts`, lazy init, adapter defensivo) + factory por env (`src/lib/sandbox/index.ts`). **Sandbox é 1-por-run** (compartilhado entre tasks → filesystem persiste).
- **Fila:** **BullMQ** (`src/lib/queue/`) sobre o `ioredis` do stack; **worker separado** `src/worker/index.ts` (cria sandbox → `runTeam` com codeChatFn → `close()` no `finally`). **Só code-runs** vão pra fila; chat-runs seguem no `after()`.
- **Dados:** `TeamRun.mode` ('chat'|'code') + `TeamRun.sandboxId` + `TeamTask.artifacts` (Json). Migração `20260614120000_code_factory_c0` **aplicada em prod**.
- **UI:** run route enfileira no modo code; SSE evento `terminal`; `TeamRunView` ganhou toggle Chat/Código + painel de terminal do sandbox.
- **Deploy do worker:** serviço EasyPanel separado, mesmo repo, build via **`Dockerfile.worker`** (node_modules completo + src + tsx — o standalone do app não roda `tsx`), start `npm run worker`. Envs do worker: `DATABASE_URL`, `REDIS_URL` (o MESMO do app), `E2B_API_KEY`, `GROQ_API_KEY`/`OPENROUTER_API_KEY`/`HUGGINGFACE_API_KEY`, opcionais `SANDBOX_PROVIDER=e2b`, `CODE_RUN_CONCURRENCY`.

### ⚠️ Gotchas de ambiente desta máquina (crítico — confirmados de novo no C0)
- Projeto no **OneDrive**, que corrompe `node_modules`: **`npm install`, `prisma generate`, `jest`, `next build` e `require('pg')` TRAVAM** localmente. NÃO rodá-los.
  - Para atualizar o `package-lock.json` sem instalar: **`npm install --package-lock-only`** (não escreve a árvore → não trava). Obrigatório quando adicionar dep, senão o `npm ci` do build quebra.
  - Para migration: **`node node_modules/prisma/build/index.js migrate deploy`** (o `npx prisma` deu "prisma não reconhecido"). Com `DATABASE_URL` inline.
  - Versão de dep nova: pegar com `npm view <pkg> version` (metadata, não instala) e fixar no `package.json` na mão.
- Verificação confiável local: **`npx tsc --noEmit`** (só LÊ, não trava — aceitar como esperados só os erros de módulo não instalado / campo de client não regenerado) + **`npx tsx <script>.ts`** com `node:assert` e **imports relativos** (tsx não resolve `@/` em script, mas resolve no runtime do worker via tsconfig paths) pra lógica pura.
- **Gate real de build/jest = deploy no EasyPanel** (Linux limpo). Deploy = **push na `main`** → auto-deploy. **Worker é um 2º serviço** — push na main redeploya os dois. **E2E autenticado fica com o usuário** (sem credenciais de login no ambiente do Claude).
- Caminhos com `[id]`/`[runId]` no git: pathspec `:(literal)`. Commits multi-linha no PowerShell: here-string **em variável** (`$msg = @' ... '@; git commit -m $msg`).

### Banco de produção / segredos
- Real e alcançável: **`postgres://sofia_db:<senha>@2.24.207.200:5435/sofia_db?sslmode=disable`** (mesmo VPS do Compass). O `.env` aponta pra `bot@31.97.23.166:5499` que **dá timeout** — usar o de cima pra migrate.
- 🔐 Senha do Postgres + chaves (E2B, etc.) já expostas no chat — **rotacionar** (higiene).

---

## Foco desta sessão: Sub-projeto C — Fatia C1 (Git → Pull Request) 🔜

> Gancho: ler a seção **"Sub-projeto C → Fatias do Sub-projeto C → C1"** em `docs/Polaris Teams/ROADMAP.md` antes de começar. O plano e as 6 decisões estão lá.

**Objetivo (do ROADMAP):** o code-team deixa de operar num sandbox vazio e passa a trabalhar sobre um **repositório real** — clona, cria branch, agentes editam arquivos (já via `@RUN`), e o trabalho vira **commit + push + Pull Request**. Transforma o C0 ("roda comando") em "entrega código de verdade".

**Reusa tudo do C0** (sandbox/worker/code-agent/fila/terminal). O que muda é **lifecycle do repo** em volta do `runTeam` (clone no setup, commit/push/PR no teardown) + **auth/segredo git** (ponto sensível: o agente roda comando arbitrário no sandbox).

**Net-new:** provisionamento do repo no sandbox; auth git + manejo de segredo; teardown commit/push/PR; captura básica de diff (arquivos alterados + link do PR; diff visual rico é C2); `TeamRun.repoUrl/branch/commitSha/prUrl` + binding em `Team.config`; UI com branch/PR/arquivos alterados.

## O que fazer nesta sessão
1. **Brainstorm + spec do C1** (skills superpowers: brainstorming → writing-plans). **Confirmar escopo + as 6 decisões comigo PRIMEIRO** (estão no ROADMAP, seção C1): (1) provider git (GitHub-only?); (2) auth (PAT vs GitHub App, onde guardar); (3) binding do repo (Team-level vs por-run); (4) **push/PR por worker vs agente** — decisão de segurança (recomendação: worker faz push, token nunca entra no sandbox); (5) estratégia branch/commit/PR; (6) modelo de dados (estender `TeamRun` + `Team.config`).
2. **Não** detalhar nada além do escopo confirmado. Um sprint por sessão; commit limpo por fatia; push ao concluir.
3. Lembrar dos gotchas de ambiente (acima): `--package-lock-only` pra qualquer dep nova, migration via binário node, `tsc --noEmit` como gate local, EasyPanel como gate real.

> Comece confirmando comigo o **escopo do C1** (provider git + as decisões de auth/segredo) antes de escrever spec ou código.
