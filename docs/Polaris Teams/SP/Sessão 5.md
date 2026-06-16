# Migração Orquestrações → Teams — Prompt inicial da Sessão 5

> Cole o bloco abaixo (ou o essencial) ao abrir a nova conversa. Ele dá ao Claude todo o contexto pra continuar sem reexplorar. **Foco desta sessão: SP4 — API pública/v1 → Teams.**

---

## Contexto pra continuar (programa "Orquestrações → Teams")

Programa de **aposentar a engine de Orquestrações** da Polaris (antiga Sofia = `sofia-next`, deploy EasyPanel em `polarisia.com.br`, GitHub `JeanZorzetti/sofia-ia`), levando suas capacidades exclusivas para o sistema **Teams** (o sucessor). **Design (brainstorming aprovado):** `docs/superpowers/specs/2026-06-15-orchestrations-to-teams-migration-design.md` — leia antes de começar (em especial a seção **"SP4 — API pública/v1 → Teams"**). Cadência: **um sub-projeto (SP) por sessão**; confirmar abordagem antes de executar (regra global).

Decomposição (do design): **SP1** Magic Create · **SP2** Output webhooks · **SP3** Scheduling/cron · **SP4** API pública/v1 · **SP5** Templates de time · **SP6** Teardown (deletar a engine). Sequência SP1→SP6. A engine fica viva (já desplugada da UI desde commit `9fd88fa`) até o Teams ter paridade.

### Restrições transversais do programa (do design — não óbvias, valem p/ todos os SPs)
- **NÃO deletar `src/components/orchestrations/*`** (flow-canvas/nodes) — é compartilhado com o **Workflows builder** (`dashboard/workflows/builder`, `predictive-workflow-builder.tsx`).
- **SP6 (teardown) precisa repontar o Threads** antes de matar a engine: `app/dashboard/threads/campaigns` ("Planejar com IA") e `scripts/create-threads-*-orchestration.ts` usam a engine de Orquestração como motor de planejamento.
- Strategies `parallel`/`consensus` foram **descartadas** (YAGNI) — só o modelo Lead-coordenado do Teams segue em frente.
- **Não há orquestrações reais em produção** → **sem migração de dados, sem dual-write** em nenhum SP.

### O que JÁ foi feito ✅

**SP1 — Magic Create → Teams (2026-06-15, ENTREGUE e validado).** `magic-roster.ts` (parser puro `parseMagicRoster`) + helper `create-team.ts` (`createTeamWithRoster`) + rota `POST /api/teams/magic-create`; `MagicCreateModal` religado no header de `/dashboard/teams`. Plano: `docs/superpowers/plans/2026-06-15-sp1-magic-create-teams.md`.

**SP2 — Output webhooks → Teams (2026-06-15, ENTREGUE; E2E em prod pendente).** `dispatchOutputWebhooks` ganhou 4º arg `opts:{completedLabel,event}` + fix header HMAC `X-Polaris-Signature`; disparo via caller (`src/lib/orchestration/team/team-outputs.ts`, coordinator INTACTO); config em `Team.config.outputWebhooks`, persistência em `TeamRun.outputDispatches`; UI `TeamOutputsPanel.tsx`. Spec/plano `...sp2-output-webhooks-teams-*.md`.

**SP3 — Scheduling/cron → Teams (2026-06-15, ENTREGUE; migração aplicada em prod + pushed; E2E em prod pendente).** Spec `docs/superpowers/specs/2026-06-15-sp3-scheduling-teams-design.md`, plano `docs/superpowers/plans/2026-06-15-sp3-scheduling-teams.md`. Commits `5c5e5a6..afa071c`.
- Modelo novo `ScheduledTeamRun` (migração formal `20260615130000_add_scheduled_team_runs`, **aplicada MANUAL** no host real antes do push). Cron `GET /api/cron/run-scheduled-teams` (`Bearer CRON_SECRET`) varre vencidos e dispara via helper. CRUD `/api/teams/[id]/schedules` (+`[scheduleId]`) + UI `TeamSchedulesPanel.tsx`. Parser puro `src/lib/orchestration/team/schedule.ts`.
- **🎁 O presente do SP3 para o SP4:** extraí o disparo inline da rota de sessão `POST /api/teams/[id]/run` para um **helper compartilhado** `src/lib/orchestration/team/start-team-run.ts` → **`startTeamRun(teamId, { mission, mode, userId, repoUrl?, base? })`** + classe `TeamRunError` (código tipado → o caller mapeia pro seu transporte). Já foi desenhado **explicitamente para o SP4 reusar**. Cria o `TeamRun` + dispara `after()` (chat) / fila BullMQ (code), valida ownership (`createdBy === userId`) + roster (lead+worker), resolve repo do `Team.config` p/ code. **Semântica de status assíncrono:** o caller só sabe se DISPAROU, não o resultado final (igual ao cron do SP3).
- **E2E do SP3 ainda pendente com o usuário** (criar agendamento, bater no cron com `CRON_SECRET`, confirmar `TeamRun` disparado + `nextRunAt` avançou; cadastrar URL no cron-job.org). Não bloqueia o SP4.

### Infra de Teams que você vai tocar (recap)
- Engine em `src/lib/orchestration/team/`: `team-coordinator.ts` (`runTeam`, loop Lead-orquestrado), `team-store.ts` (`TeamStore` = porta injetada), **`start-team-run.ts` (`startTeamRun` — o disparo compartilhado que o SP4 reusa)**.
- **Invariante do programa:** manter o **coordinator (`runTeam`) INTACTO** — estender via injeção ou no caller (a nova rota API-key é um caller, igual ao cron do SP3).
- Modelos: `Team` (tem `config Json`), `TeamMember`, `TeamRun` (tem `mission`, `mode`, `status`, `outputDispatches`), `TeamTask`, `TeamMessage`.
- Run trigger de sessão: **`POST /api/teams/[id]/run`** já refatorado p/ chamar `startTeamRun`. **SP4 = mais um caller do MESMO helper, só que autenticado por API key.**

### ⚠️ Gotchas de ambiente desta máquina (crítico)
- Projeto no **OneDrive**, que corrompe `node_modules`: **`npm install`, `prisma generate`, `jest`, `next build` e `require('pg')` TRAVAM** localmente. NÃO rodá-los.
  - Dep nova sem instalar: **`npm install --package-lock-only`** (+ fixar versão via `npm view <pkg> version`). **SP4 provavelmente não precisa de dep nova.**
- Verificação confiável local: **`npx tsc --noEmit`** (só LÊ; aceitar só erros de módulo não instalado / client Prisma stale — `bullmq`/`e2b`/`@xterm/*`/`diff2html` e campos novos do schema aparecem e somem no build do EasyPanel) + **`npx tsx scripts/*.ts`** com `node:assert` e imports **relativos** pra lógica pura.
- **🟢 SP4 provavelmente NÃO mexe no schema** (reusa `startTeamRun`/`TeamRun`, sem modelo novo) → **a lição de migração do SP2/SP3 não se aplica desta vez** (sem `migrate deploy` manual). Confirme isso ao desenhar; se mexer no schema, a regra volta (migração formal + `migrate deploy` manual no host real ANTES do push).
- **Gate real = deploy no EasyPanel** (push na `main` → redeploya **app + worker**, 2 serviços). **E2E autenticado fica com o usuário.** **Commitar só os arquivos da fatia** (a árvore tem mudanças não relacionadas — logos/docs — que NÃO entram). Caminhos com `[id]` no git: pathspec `:(literal)` ou aspas. Commit multi-linha: heredoc no Bash tool, terminar com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

### Banco de produção / segredos
- **Host real de prod (só se mexer no schema — provavelmente não):** `postgres://sofia_db:<senha>@2.24.207.200:5435/sofia_db?sslmode=disable` (o `.env` aponta p/ `bot@31.97.23.166:5499`, que **dá timeout** — NÃO usar). Migração: **`node node_modules/prisma/build/index.js migrate deploy`** com `DATABASE_URL` inline (`npx prisma` dá "não reconhecido").
- 🔐 **Rotacionar (higiene — expostos no chat):** senha Postgres (`PAzo18**`), `E2B_API_KEY`, `GITHUB_TOKEN`, `CRON_SECRET`.

---

## Foco desta sessão: SP4 — API pública/v1 → Teams 🔜

> Gancho: ler a tabela do programa + a seção **SP4** no design (`...migration-design.md`).

**Objetivo (do design):** permitir **disparar um Team run por API key** (de fora — Zapier/Make/n8n/integrações), re-homando a "API pública" da engine de Orquestrações no Teams. Como o disparo de Team run **já existe e está extraído** (`startTeamRun`), o SP4 é essencialmente **fiação de auth-por-API-key → `startTeamRun`** + atualização de docs/openapi/copy. É o SP mais "barato" até aqui porque o executor já está pronto.

**Estado atual (a substituir / referência — NÃO tocar, morre no SP6):**
- **v1 (Bearer):** `src/app/api/v1/orchestrations/[id]/execute/route.ts` — auth `getAuthFromApiKey(request)` (`@/lib/api-key-auth`, header `Authorization: Bearer sk-...`, retorna **`auth.userId`**). Body `{ input?, variables? }`. Cria `OrchestrationExecution` e **dispara via hack de fetch interno** (`fetch('/api/orchestrations/[id]/execute', { headers: 'x-internal-user-id' })`). Retorna `202 { executionId, status:'pending', orchestrationId }`. Lista em `v1/orchestrations/route.ts`.
- **public (X-API-Key):** `src/app/api/public/orchestrations/[id]/run/route.ts` — auth `authenticateApiKey(getApiKeyFromRequest(request))` (`@/lib/api-key`, header `X-API-Key: sk_...`, retorna **`user.id`**). Body `{ input | message }`. Cria `OrchestrationExecution` `pending` e retorna `202 { success, data:{ executionId, ... } }`. Lista em `public/orchestrations/route.ts`.
- **⚠️ Dois mecanismos de API key distintos** (Bearer `getAuthFromApiKey`→`.userId` vs `X-API-Key` `authenticateApiKey`→`.id`). Decidir no SP4 se a variante Teams espelha os dois ou consolida em um.
- Docs/copy a atualizar: `src/app/api/docs/openapi.json/route.ts` (OpenAPI servido), página `src/app/(public)/api-reference/page.tsx`, e a copy de integrações **Zapier/Make/n8n** (`src/app/(public)/integrations/{zapier,make,n8n}/page.tsx` + `src/app/dashboard/integrations/*`).

**A boa notícia (reuso máximo):** `startTeamRun(teamId, { mission, mode, userId })` já cria o `TeamRun` + dispara assíncrono (`after()`/fila) + valida ownership/roster + mapeia erros (`TeamRunError`). A nova rota só precisa: **autenticar a API key → pegar o `userId` → chamar `startTeamRun` → traduzir `TeamRunError.code` pro HTTP.** O **hack de fetch interno** da v1 de orchestration **NÃO é necessário** (chamada direta ao helper é mais limpa e robusta).

### Decisões pra confirmar com o usuário ANTES de spec/código
1. **Escopo das rotas:** criar **`POST /api/v1/teams/[id]/run`** (Bearer) **e** **`POST /api/public/teams/[id]/run`** (X-API-Key) pra paridade com as duas de orchestration? Ou **consolidar em uma só** (escolher um esquema de auth)? → confirmar. (Recomendado: espelhar as duas, pq a copy de Zapier/Make/n8n já referencia ambos os estilos e o esforço é baixo.)
2. **Auth:** reusar `getAuthFromApiKey` (Bearer, `.userId`) na v1 e `authenticateApiKey`/`getApiKeyFromRequest` (X-API-Key, `.id`) na public — **sem mexer nesses helpers**. → confirmar (recomendado).
3. **Body / mapeamento:** o Team run consome **`mission`** (texto), não `input`/`variables`. Aceitar `{ mission }` e, p/ compat com templates Zapier/Make existentes, **mapear `input`/`message` → `mission`**? E `mode` ('chat'|'code', default 'chat')? → confirmar shape.
4. **Resposta:** `202 { success, data:{ runId, status:'pending', mode } }` (espelha a rota de sessão + o estilo das rotas public). → confirmar.
5. **Helper:** chamar `startTeamRun` **direto** (sem o hack de fetch interno da orchestration v1). → confirmar (recomendado).
6. **Docs/copy:** atualizar `openapi.json`, `api-reference` e a copy Zapier/Make/n8n p/ apontar pro Teams **nesta sessão**, ou deixar a copy de marketing pro SP6 (teardown)? → confirmar escopo (o design pede atualizar no SP4; mínimo viável = openapi + api-reference; copy de integrações pode ser incremental).
7. **Sem migração / sem dep nova** (reusa `startTeamRun`/`TeamRun`). → confirmar (recomendado — mantém o SP leve, sem o passo de migração manual).

### O que fazer nesta sessão
1. **Brainstorm + spec + plano do SP4** (skills superpowers: brainstorming → writing-plans). **Confirmar as decisões acima comigo PRIMEIRO.**
2. Seguir o **padrão SP1/SP2/SP3:** **reuso máximo** (`startTeamRun` é o motor; a rota é fina), **coordinator INTACTO** (a rota API-key é só um caller). Lógica pura/borda testável onde fizer sentido (ex.: mapeamento de body `input→mission`, tradução de erro→HTTP) via `scripts/sp4-verify.ts` (tsx, `node:assert`, imports relativos); bordas (rotas/auth) via `tsc` + E2E.
3. **Provavelmente sem migração** (confirmar no design). Se surgir mudança de schema, migração formal + `migrate deploy` manual no host real ANTES do push (lição SP2/SP3).
4. **Um sprint por sessão; commit limpo por fatia; push ao concluir** (push na `main` = deploy app+worker). **E2E com o usuário** (criar/usar uma API key, `curl` na nova rota com a key, confirmar que um `TeamRun` foi disparado; conferir openapi/api-reference atualizados).

> Comece confirmando comigo o **escopo e as decisões do SP4** antes de escrever spec ou código.
