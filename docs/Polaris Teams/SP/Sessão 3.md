# Migração Orquestrações → Teams — Prompt inicial da Sessão 3

> Cole o bloco abaixo (ou o essencial) ao abrir a nova conversa. Ele dá ao Claude todo o contexto pra continuar sem reexplorar. **Foco desta sessão: SP2 — Output webhooks → Teams.**

---

## Contexto pra continuar (programa "Orquestrações → Teams")

Programa de **aposentar a engine de Orquestrações** da Polaris (antiga Sofia = `sofia-next`, deploy EasyPanel em `polarisia.com.br`, GitHub `JeanZorzetti/sofia-ia`), levando suas capacidades exclusivas para o sistema **Teams** (o sucessor). **Design (brainstorming aprovado):** `docs/superpowers/specs/2026-06-15-orchestrations-to-teams-migration-design.md` — leia antes de começar. Cadência: **um sub-projeto (SP) por sessão**; confirmar abordagem antes de executar (regra global).

Decomposição (do design): **SP1** Magic Create · **SP2** Output webhooks · **SP3** Scheduling/cron · **SP4** API pública/v1 · **SP5** Templates de time · **SP6** Teardown (deletar a engine). Sequência SP1→SP6. A engine fica viva (já desplugada da UI desde commit `9fd88fa`) até o Teams ter paridade.

### Restrições transversais do programa (do design — não óbvias, valem p/ todos os SPs)
- **NÃO deletar `src/components/orchestrations/*`** (flow-canvas/nodes) — é compartilhado com o **Workflows builder** (`dashboard/workflows/builder`, `predictive-workflow-builder.tsx`).
- **SP6 (teardown) precisa repontar o Threads** antes de matar a engine: `app/dashboard/threads/campaigns` ("Planejar com IA") e `scripts/create-threads-*-orchestration.ts` usam a engine de Orquestração como motor de planejamento.
- Strategies `parallel`/`consensus` foram **descartadas** (YAGNI) — só o modelo Lead-coordenado do Teams segue em frente.
- **Não há orquestrações reais em produção** → **sem migração de dados, sem dual-write** em nenhum SP.

### O que JÁ foi feito ✅

**SP1 — Magic Create → Teams (2026-06-15, ENTREGUE e pushed na `main`, 8 commits `429ad20..bcab0f9`; E2E manual em prod pendente com o usuário).** Plano: `docs/superpowers/plans/2026-06-15-sp1-magic-create-teams.md`.
- `src/lib/orchestration/team/magic-roster.ts` — parser **puro** `parseMagicRoster` (JSON do LLM → roster; reusa `validateRoster`; fence-strip **ancorado** p/ não corromper `systemPrompt` com ```).
- `src/lib/orchestration/team/create-team.ts` — helper **compartilhado** `createTeamWithRoster({name,description,config,members,userId})` → `{ok:true,team}|{ok:false,error}`. Usado por `POST /api/teams` (mapeia erro→**400**) e por magic-create (→**422**).
- `src/app/api/teams/magic-create/route.ts` — Groq → `parseMagicRoster` → cria 1 `Agent`/membro → `createTeamWithRoster`. Retorna `{teamId, team:{id,name,description,members}}`.
- `src/components/sofia/MagicCreateModal.tsx` reescrito p/ Team e **religado** no header de `/dashboard/teams` (estava órfão).
- CTA do email Drip3 (`src/lib/email.ts`) → `/dashboard/teams`.
- Gate: `scripts/sp1-verify.ts` (11 asserts, tsx puro) + `tsc` limpo nos arquivos do SP1. Política Reviewer = **soft** (só no system prompt: inclui Reviewer só se o processo implicar QA); composição **hard** (≤1 reviewer no `validateRoster`).
- **Padrão estabelecido p/ os próximos SPs:** lógica pura num módulo testável (`scripts/spN-verify.ts`, `node:assert`, imports **relativos** `../src/...`); bordas de DB/rede verificadas por `tsc` + E2E (o projeto NÃO tem framework de teste); reuso máximo (extrair helper compartilhado quando a lógica já existe na engine de orchestration).

### Infra de Teams que você vai tocar (recap)
- Engine em `src/lib/orchestration/team/`: `team-coordinator.ts` (`runTeam`, loop Lead-orquestrado síncrono **com loop de reviewer**), `team-store.ts` (`TeamStore` = porta injetada → testável sem DB), `team-types.ts`, `team-protocol.ts`, `team-prompts.ts`, `team-roster.ts` (`validateRoster`).
- **Invariante do programa (do sub-projeto C):** manter o **coordinator (`runTeam`) o mais INTACTO possível** — estender via **injeção** (deps no `RunTeamDeps`) ou no **caller** (run route / worker), não dentro do loop.
- Modelos: `Team` (tem `config Json` — guardar settings aqui, **sem migração**), `TeamMember`, `TeamRun`, `TeamTask`, `TeamMessage`.
- Run: `POST /api/teams/[id]/run` dispara `runTeam` via `after()` (chat-runs) ou **fila BullMQ + worker** (`src/worker/index.ts`, code-runs). `PATCH /api/teams/[id]` faz **merge** de `config` (já usado pelo `repoUrl`/`defaultBranch`). SSE em `runs/[runId]/stream`. UI da sala em `src/app/dashboard/teams/[id]/`.

### ⚠️ Gotchas de ambiente desta máquina (crítico)
- Projeto no **OneDrive**, que corrompe `node_modules`: **`npm install`, `prisma generate`, `jest`, `next build` e `require('pg')` TRAVAM** localmente. NÃO rodá-los.
  - Dep nova sem instalar: **`npm install --package-lock-only`** (+ fixar versão via `npm view <pkg> version`).
  - Migration (se precisar): **`node node_modules/prisma/build/index.js migrate deploy`** com `DATABASE_URL` inline (`npx prisma` dá "não reconhecido"). SP2 provavelmente **não precisa de migração** (usa `Team.config` Json).
- Verificação confiável local: **`npx tsc --noEmit`** (só LÊ; aceitar só erros de módulo não instalado / client Prisma stale — `bullmq`/`e2b`/`@xterm/*`/`diff2html` e campos novos do schema aparecem e somem no build do EasyPanel) + **`npx tsx scripts/*.ts`** com `node:assert` e imports **relativos** pra lógica pura.
- **Gate real = deploy no EasyPanel** (Linux limpo). Deploy = **push na `main`** → auto-deploy redeploya **app + worker** (2 serviços). **E2E autenticado fica com o usuário** (sem login no ambiente do Claude). **Commitar só os arquivos da fatia** (a árvore tem mudanças não relacionadas — logos/docs — que NÃO devem entrar no commit). Commit multi-linha: heredoc no Bash tool; caminhos com `[id]` no git: pathspec `:(literal)`.

### Banco de produção / segredos
- Real e alcançável p/ migrate/diagnóstico: **`postgres://sofia_db:<senha>@2.24.207.200:5435/sofia_db?sslmode=disable`** (o `.env` aponta pra host que dá timeout).
- 🔐 **Rotacionar (higiene — expostos no chat):** senha Postgres, `E2B_API_KEY`, `GITHUB_TOKEN`, segredos antigos do Compass.

---

## Foco desta sessão: SP2 — Output webhooks → Teams 🔜

> Gancho: ler a tabela do programa + (se houver) a seção do SP2 no design `docs/superpowers/specs/2026-06-15-orchestrations-to-teams-migration-design.md`.

**Objetivo (do design):** quando um **Team run** termina com sucesso, disparar os mesmos outputs que a orquestração disparava (webhook HTTP assinado por HMAC, email via Resend, Slack incoming webhook), configurados na sala do time.

**A boa notícia — reuso quase total:** a função `dispatchOutputWebhooks()` em `src/lib/orchestration/output-webhooks.ts` **já é genérica**:
- Assinatura: `dispatchOutputWebhooks(orchestration: {id, name, config}, execution: {id, durationMs, tokensUsed}, finalOutput): Promise<DispatchRecord[]>`.
- Lê `config.outputWebhooks: OutputWebhookConfig[]` (cada item `{type:'webhook'|'email'|'slack', enabled, ...}`), dispara só os `enabled`, **trata erro por-output** (`Promise.allSettled`, nunca quebra o run), e devolve `DispatchRecord[]` (`{type,destination,status:'sent'|'failed',error?,sentAt}`).
- Ponto de referência: a engine de orchestration a chama em `src/app/api/orchestrations/[id]/execute/route.ts:734` (depois que a execução conclui), passando `{id, name, config}` da orchestration.

**Onde o Team run termina:** no `team-coordinator.ts`, helper `finish(status, output, error)` (≈ linha 44) → `store.finishRun(runId, {status, output, error, ...})`. Os callers do `runTeam` são o run route (`after()`, chat-runs) e o worker (`src/worker/index.ts`, code-runs).

### Decisões pra confirmar com o usuário ANTES de spec/código
1. **Onde disparar** (mantendo o coordinator intacto): no **caller** depois que `runTeam` resolve (run route p/ chat-runs + worker p/ code-runs), lendo o `TeamRun` final — **recomendado** (preserva o invariante "coordinator INTACTO") — vs. injetar uma dep no coordinator. → confirmar.
2. **Só em sucesso?** Disparar apenas quando `status === 'completed'` (não em `failed`/`cancelled`/`rate_limited`). → confirmar.
3. **Onde guardar a config:** `Team.config.outputWebhooks` (Json, **sem migração**), editado via `PATCH /api/teams/[id]` (que já faz merge de config). → confirmar.
4. **Copy/payload:** reusar `dispatchOutputWebhooks` **como está** (o texto diz "Orquestração concluída", `event:'orchestration.completed'`) — barato — vs. generalizar o copy/evento p/ "Team"/"team.completed". → confirmar (recomendo generalizar leve, pois é a marca que o cliente vê).
5. **`finalOutput`:** mapear o `TeamRun.output` (resultado consolidado do Lead) pro 3º arg; `execution` = `{id: runId, durationMs: TeamRun.durationMs, tokensUsed: TeamRun.tokensUsed}`. → confirmar.
6. **UI:** painel "Outputs / Webhooks" na sala do time (`src/app/dashboard/teams/[id]/`) escrevendo `Team.config.outputWebhooks` — espelhar a UI que a orchestration tinha. → confirmar escopo (quais tipos expor de cara).
7. **Persistência do `DispatchRecord[]`:** a orchestration grava no output da execução; no Team, gravar em `TeamRun` (campo/Json) ou só logar? → confirmar (talvez fora de escopo do SP2 mínimo).

### O que fazer nesta sessão
1. **Brainstorm + spec do SP2** (skills superpowers: brainstorming → writing-plans). **Confirmar as decisões acima comigo PRIMEIRO.**
2. Seguir o **padrão do SP1**: lógica nova/pura num módulo testável + `scripts/sp2-verify.ts` (tsx, `node:assert`, imports relativos, fakes — ex.: fake `fetch` p/ asserir payload/HMAC/seleção de `enabled`); bordas (dispatch real + UI) via `tsc` + E2E. **Reuso máximo** do `output-webhooks.ts` (não reimplementar).
3. **Um sprint por sessão; commit limpo por fatia; push ao concluir** (push na `main` = deploy app+worker). **E2E com o usuário** (criar um webhook receiver de teste, rodar um Team, confirmar POST assinado / email / Slack).
4. Lembrar dos gotchas de ambiente (acima) e do invariante **coordinator INTACTO**.

> Comece confirmando comigo o **escopo e as decisões do SP2** antes de escrever spec ou código.
