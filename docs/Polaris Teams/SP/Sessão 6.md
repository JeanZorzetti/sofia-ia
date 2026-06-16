# Migração Orquestrações → Teams — Prompt inicial da Sessão 6

> Cole o bloco abaixo (ou o essencial) ao abrir a nova conversa. Ele dá ao Claude todo o contexto pra continuar sem reexplorar. **Foco desta sessão: SP5 — Templates de time → Teams.**

---

## Contexto pra continuar (programa "Orquestrações → Teams")

Programa de **aposentar a engine de Orquestrações** da Polaris (antiga Sofia = `sofia-next`, deploy EasyPanel em `polarisia.com.br`, GitHub `JeanZorzetti/sofia-ia`), levando suas capacidades exclusivas para o sistema **Teams** (o sucessor). **Design (brainstorming aprovado):** `docs/superpowers/specs/2026-06-15-orchestrations-to-teams-migration-design.md` — leia antes de começar (em especial a seção **"SP5 — Templates de time"**). Cadência: **um sub-projeto (SP) por sessão**; confirmar abordagem antes de executar (regra global).

Decomposição (do design): **SP1** Magic Create · **SP2** Output webhooks · **SP3** Scheduling/cron · **SP4** API pública/v1 · **SP5** Templates de time · **SP6** Teardown (deletar a engine). Sequência SP1→SP6. A engine fica viva (já desplugada da UI desde commit `9fd88fa`) até o Teams ter paridade.

### Restrições transversais do programa (do design — não óbvias, valem p/ todos os SPs)
- **NÃO deletar `src/components/orchestrations/*`** (flow-canvas/nodes) — é compartilhado com o **Workflows builder** (`dashboard/workflows/builder`, `predictive-workflow-builder.tsx`).
- **SP6 (teardown) precisa repontar o Threads** antes de matar a engine: `app/dashboard/threads/campaigns` ("Planejar com IA") e `scripts/create-threads-*-orchestration.ts` usam a engine de Orquestração como motor de planejamento.
- Strategies `parallel`/`consensus` foram **descartadas** (YAGNI) — só o modelo Lead-coordenado do Teams segue em frente.
- **Não há orquestrações reais em produção** → **sem migração de dados, sem dual-write** em nenhum SP.

### O que JÁ foi feito ✅

**SP1 — Magic Create → Teams (2026-06-15, ENTREGUE e validado).** `magic-roster.ts` (parser puro `parseMagicRoster`) + helper `create-team.ts` (`createTeamWithRoster`) + rota `POST /api/teams/magic-create`; `MagicCreateModal` religado no header de `/dashboard/teams`. Plano: `docs/superpowers/plans/2026-06-15-sp1-magic-create-teams.md`.

**SP2 — Output webhooks → Teams (2026-06-15, ENTREGUE; E2E em prod pendente).** `dispatchOutputWebhooks` ganhou 4º arg `opts:{completedLabel,event}` + fix header HMAC `X-Polaris-Signature`; disparo via caller (`src/lib/orchestration/team/team-outputs.ts`, coordinator INTACTO); config em `Team.config.outputWebhooks`, persistência em `TeamRun.outputDispatches`; UI `TeamOutputsPanel.tsx`. Spec/plano `...sp2-output-webhooks-teams-*.md`.

**SP3 — Scheduling/cron → Teams (2026-06-15, ENTREGUE; migração aplicada em prod + pushed; E2E em prod pendente).** Modelo `ScheduledTeamRun` + cron `GET /api/cron/run-scheduled-teams` (`Bearer CRON_SECRET`) + CRUD `/api/teams/[id]/schedules` + UI `TeamSchedulesPanel.tsx` + parser puro `schedule.ts`. **🎁 Presente do SP3:** o helper compartilhado **`start-team-run.ts` (`startTeamRun`)** que o SP4 reusou. Spec/plano `...sp3-scheduling-teams-*.md`.

**SP4 — API pública/v1 → Teams (2026-06-15, ENTREGUE + E2E EM PROD ✅ VALIDADO).** 4 rotas API-key reusando `startTeamRun`: `POST /api/{v1,public}/teams/[id]/run` + `GET` de listagem. Helper puro novo `src/lib/orchestration/team/team-run-api.ts` (`parseTeamRunBody` aliasing `mission>input>message` + `TEAM_RUN_STATUS_BY_CODE` fonte única; a rota de sessão `[id]/run` foi refatorada p/ importar). Resultado via output webhook (SP2), sem endpoint de poll. Docs/copy completos (openapi schemas Team/TeamRun, api-reference, 6 páginas Zapier/Make/n8n). Spec/plano `...sp4-public-api-teams-*.md`. Sem migração, sem dep nova.
- **⚠️ Gotcha reutilizável pego no E2E do SP4 — middleware allowlist:** `src/middleware.ts` tem `isPublicApi` que isenta certos `/api/*` do guard de **sessão JWT**. Só `/api/public/*` estava lá → a rota v1 Bearer dava 401 ANTES do handler (middleware rodava `verifyToken()` na API key `sk_`, que não é JWT). Tive que adicionar `/api/v1/teams` **e** `/api/docs` (openapi) na allowlist (commits `f240328`, `0ed9935`). **Se o SP5 adicionar QUALQUER rota não-sessão (API key / público), conferir a allowlist do middleware.** As rotas do SP5 provavelmente são de **sessão** (`getAuthFromRequest`, dashboard) → não precisam de allowlist, mas confirme.
- **🔐 Higiene:** a API key `sk_live_9fb6e1c1bb...` foi exposta no chat do SP4 → o usuário deve rotacioná-la.

### Infra de Teams que você vai tocar (recap)
- **Helper de criação (o motor do SP5):** `src/lib/orchestration/team/create-team.ts` → **`createTeamWithRoster({ name, description?, config?, members: RosterInput[], userId })`** valida nome + roster (`validateRoster` em `team-roster.ts`: exatamente 1 lead, ≥1 worker, ≤1 reviewer) + existência dos agents, cria `Team` + `TeamMember`s. **Exige `members[].agentId`** → o caller precisa **criar os Agents ANTES**.
- **Padrão de referência (copie):** `src/app/api/teams/magic-create/route.ts` faz exatamente o fluxo do SP5 — loop `prisma.agent.create` (1 por membro, `config:{ role, createdByMagic:true }`) → monta `RosterInput[]` com os `agentId` → chama `createTeamWithRoster`. **Só troca a fonte do roster:** SP1 = Groq; SP5 = template estático.
- **Modelos:** `Team` (id, name, description?, config Json, status, createdBy), `TeamMember` (teamId, agentId, role, model?, effort?, position), `Agent` (compartilhado pelo app todo).
- **Invariante do programa:** coordinator (`runTeam`) e `startTeamRun` **INTACTOS** — o SP5 nem encosta neles (é criação de time, não execução).

### ⚠️ Gotchas de ambiente desta máquina (crítico)
- Projeto no **OneDrive**, que corrompe `node_modules`: **`npm install`, `prisma generate`, `jest`, `next build` e `require('pg')` TRAVAM** localmente. NÃO rodá-los.
  - Dep nova sem instalar: **`npm install --package-lock-only`** (+ fixar versão via `npm view <pkg> version`). **SP5 provavelmente NÃO precisa de dep nova** (templates estáticos em código).
- Verificação confiável local: **`npx tsc --noEmit`** (só LÊ; aceitar só erros de módulo não instalado / client Prisma stale — `bullmq`/`e2b`/`@xterm/*`/`diff2html` e drift do schema aparecem e somem no build do EasyPanel) + **`npx tsx scripts/*.ts`** com `node:assert` e imports **relativos** pra lógica pura.
- **🟢 SP5 provavelmente NÃO mexe no schema** (templates são estáticos em código, como os de orchestration — sem DB, sem modelo novo) → **sem `migrate deploy` manual**. Confirme ao desenhar; se mexer no schema, a regra volta (migração formal + `migrate deploy` manual no host real ANTES do push — lição SP2/SP3).
- **Gate real = deploy no EasyPanel** (push na `main` → redeploya **app + worker**, 2 serviços; o container dá 502 "Service is not reachable" por ~1-2min durante o rebuild antes de ficar healthy). **E2E autenticado fica com o usuário.** **Commitar só os arquivos da fatia** (a árvore tem mudanças não relacionadas — logos/docs — que NÃO entram). Caminhos com `[id]` no git: pathspec `:(literal)` ou aspas. Commit multi-linha: heredoc no Bash tool, terminar com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

### Banco de produção / segredos
- **Host real de prod (só se mexer no schema — provavelmente não):** `postgres://sofia_db:<senha>@2.24.207.200:5435/sofia_db?sslmode=disable` (o `.env` aponta p/ `bot@31.97.23.166:5499`, que **dá timeout** — NÃO usar). Migração: **`node node_modules/prisma/build/index.js migrate deploy`** com `DATABASE_URL` inline (`npx prisma` dá "não reconhecido").
- 🔐 **Rotacionar (higiene — expostos no chat):** senha Postgres (`PAzo18**`), `E2B_API_KEY`, `GITHUB_TOKEN`, `CRON_SECRET`, **API key `sk_live_9fb6e1...` (SP4)**.

---

## Foco desta sessão: SP5 — Templates de time → Teams 🔜

> Gancho: ler a tabela do programa + a seção **SP5** no design (`...migration-design.md`).

**Objetivo (do design):** uma **galeria de rosters de time pré-montados** (Lead/Worker/Reviewer p/ casos comuns) — equivalente aos orchestration-templates — para o usuário criar um Team com 1 clique. Re-homa os templates da engine de Orquestrações no Teams.

**Estado atual (a substituir / referência — NÃO tocar, morre no SP6):**
- **Dados:** `src/lib/orchestration/orchestration-templates.ts` (~31KB) — `ORCHESTRATION_TEMPLATES: OrchestrationTemplate[]`, interface com `{ id, name, description, category, icon, strategy, agents: {role,prompt,order}[], exampleInput, expectedOutput, estimatedDuration, tags }`. São **pipelines sequenciais** (Pesquisador→Copywriter→Revisor etc.) → mapeiam bem p/ Lead + Workers (e Reviewer só onde há etapa de QA/revisão).
- **Rota de listagem:** `GET /api/orchestrations/templates` ([route](../../../src/app/api/orchestrations/templates/route.ts)) — retorna resumo (sem prompts) dos templates, **auth de sessão** (`getAuthFromRequest`).
- **Rotas CRUD/deploy genéricas:** `api/templates/route.ts`, `api/templates/[id]/route.ts`, `api/templates/[id]/deploy/route.ts` — **ATENÇÃO:** essas são de **outra coisa** (templates de `data/templates.ts`, usados na landing/test-drive), NÃO dos orchestration-templates. Confirmar antes de assumir reuso.
- **⚠️ A UI antiga `TemplatePickerDialog` JÁ NÃO EXISTE** — foi deletada junto com `src/components/dashboard/orchestrations/*` no commit `9fd88fa`. O design cita ela, mas **a UI do picker é recriada do zero** (como o `TeamOutputsPanel` foi no SP2).

**A boa notícia (reuso máximo):** criar um time a partir de um template é **idêntico ao magic-create**, só trocando a fonte do roster (template estático em vez de Groq). O loop `prisma.agent.create` por membro + `createTeamWithRoster` já existe em `magic-create/route.ts` — dá pra **extrair um helper compartilhado** (`instantiateRoster`/`createTeamFromMemberSpecs`) que o magic-create E o deploy-de-template reusam (boundary justificada, DRY).

### Decisões pra confirmar com o usuário ANTES de spec/código
1. **Formato do template (`TeamTemplate`):** `{ id, name, description, category, icon, tags, members: { role:'lead'|'worker'|'reviewer', name, systemPrompt, model }[] }` (members já no shape de roster do Teams, validável por `validateRoster`). → confirmar shape.
2. **Curadoria — quantos/quais:** portar um **subconjunto curado** dos `ORCHESTRATION_TEMPLATES` (os sequenciais viram Lead+Workers; Reviewer só onde a pipeline tem etapa de revisão/QA), ou escrever um conjunto novo enxuto? Recomendado: **curar ~6-8** cobrindo as categorias úteis (marketing/suporte/pesquisa/vendas...), não portar os 31KB inteiros. → confirmar.
3. **Endpoints:** `GET /api/teams/templates` (lista resumo) + `POST /api/teams/templates/[id]/deploy` (instancia agents+time, retorna `{ teamId }`)? Ou um único `POST /api/teams/from-template` com `{ templateId }`? **Auth de sessão** (`getAuthFromRequest`, dashboard) → **sem allowlist de middleware** (lição SP4). → confirmar shape/rotas.
4. **Helper compartilhado:** extrair `instantiateRoster`/`createTeamFromMemberSpecs` (loop de criar Agents + `createTeamWithRoster`) p/ DRY com o magic-create, e religar o magic-create nele? Ou deixar magic-create como está e só duplicar o loop no deploy? Recomendado: **extrair** (melhoria de fronteira pequena e justificada). → confirmar.
5. **UI:** entrada "criar a partir de template" na lista `/dashboard/teams` (botão no header, ao lado do Magic Create) + **picker/galeria recriado do zero** (cards com nome/categoria/ícone/membros → "Usar template" → cria e navega pra sala). Mínimo viável vs galeria rica. → confirmar escopo de UI.
6. **Sem DB / sem migração / sem dep nova** (templates estáticos em `src/lib/orchestration/team/team-templates.ts`, como os de orchestration). → confirmar (recomendado — mantém o SP leve).

### O que fazer nesta sessão
1. **Brainstorm + spec + plano do SP5** (skills superpowers: brainstorming → writing-plans). **Confirmar as decisões acima comigo PRIMEIRO.**
2. Seguir o **padrão SP1-SP4:** **reuso máximo** (copiar o fluxo do `magic-create`: criar Agents → `createTeamWithRoster`), **coordinator INTACTO** (o SP5 nem toca em execução). Lógica pura/borda testável onde fizer sentido (ex.: validar que cada template estático passa em `validateRoster`; mapear template→roster) via `scripts/sp5-verify.ts` (tsx, `node:assert`, imports relativos); bordas (rotas/UI) via `tsc` + E2E.
3. **Provavelmente sem migração** (confirmar no design). Se surgir mudança de schema, migração formal + `migrate deploy` manual no host real ANTES do push.
4. **Um sprint por sessão; commit limpo por fatia; push ao concluir** (push na `main` = deploy app+worker). **E2E com o usuário** (abrir `/dashboard/teams`, criar um time a partir de um template, abrir a sala, conferir membros/papéis corretos).

> Comece confirmando comigo o **escopo e as decisões do SP5** antes de escrever spec ou código.
