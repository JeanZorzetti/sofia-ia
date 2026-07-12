# Subordinar Polaris ao /teams — tornar Teams a feature única e o resto "Harness"

## Context

Hoje o Polaris (sofia-next) **não** corresponde à visão "Teams é a feature principal, todo o resto é harness a serviço dela". A própria arquitetura de informação prova: na [Sidebar.tsx](Imob/sofia-next/src/components/polaris/Sidebar.tsx) o topo do menu é `Agentes` + `Conversas` (o produto WhatsApp single-agent original), `Threads` tem uma seção inteira só pra ele, `Workflows` é um paradigma de orquestração paralelo, e **`Teams` está enterrado como 6º item da seção "Plataforma"**. O produto se apresenta e funciona como uma suíte de ~4 produtos.

A migração "Orquestrações → Teams" (SP1–SP6) já fez o **bom trabalho de base**: Teams é o único motor de orquestração e já recebeu repoint de templates, marketplace, api-keys, webhooks e scheduling. E `agents`/`skills`/`mcp`/`models`/`knowledge`/`integrations` são naturalmente capacidades que os agentes de um time usam → já são periféricos legítimos. Sobram **três "segundos produtos"** que ainda não servem ao Teams: **Threads**, **Workflows** e **Conversas/WhatsApp**.

**Decisão do usuário:** subordinar funcionalmente — fazer esses três rodarem *através* do Teams, reusando a engine existente (não reposicionar só a UI, nem fazer teardown). Sequência **Threads → Workflows → WhatsApp** (menor → maior risco), **1 fase por sessão** com commit+push limpo.

**A engine de Teams já expõe a porta de entrada limpa que vamos reusar em todas as fases:**
- `startTeamRun(teamId, input)` — [start-team-run.ts:31](Imob/sofia-next/src/lib/orchestration/team/start-team-run.ts#L31). Valida dono/roster/missão, cria `TeamRun`, roda em background (`after()` no modo chat / fila Redis no modo code) e dispara `dispatchTeamOutputs` (webhooks de saída, SP2). Já chamada por 4 rotas.
- `runTeam(runId, deps)` — coordinator [team-coordinator.ts:25](Imob/sofia-next/src/lib/orchestration/team/team-coordinator.ts#L25). **MANTER INTACTO** (disciplina do SP6: subordinação chama a engine via callers/injeção, não modifica o coordinator).
- `createTeamWithRoster` ([create-team.ts:19](Imob/sofia-next/src/lib/orchestration/team/create-team.ts#L19)) / `instantiateRoster` ([instantiate-roster.ts:31](Imob/sofia-next/src/lib/orchestration/team/instantiate-roster.ts#L31)) + templates de time (`team-templates.ts`, SP5, inclui um template `marketing-content`).
- `chatWithAgent` ([groq.ts:104](Imob/sofia-next/src/lib/ai/groq.ts#L104)) já injeta a ferramenta `delegate_to_agent` (delegação multi-agente até 3 níveis, linhas ~204-208) — base do modo conversa.

## Disciplina obrigatória (vale para todas as fases)

- **Migrações de schema** (Fases 1 e 3): o standalone do Next **NÃO** aplica `db push`/migrações no deploy (lição registrada). Toda alteração de schema exige `prisma migrate` formal + `migrate deploy` **MANUAL no host real de produção ANTES do push**. Host de prod das migrações recentes de Teams = **`sofia_db@2.24.207.200:5435`** (⚠️ o `CLAUDE.md`/.env citam `31.97.23.166:5499`/`bot@...` — **confirmar qual é o de produção atual antes de aplicar**).
- **Coordinator `runTeam` intocado.** Extensões via callers e injeção.
- **1 fase por sessão**, `tsc`/`build` limpos, commit+push ao concluir cada fase. Gate real = E2E autenticado em prod (EasyPanel). jest não roda local (OneDrive errno -4094) → confiar no gate de CI.
- **Reuso > código novo**: `startTeamRun`, `createTeamWithRoster`, templates SP5, `dispatchTeamOutputs` (SP2), `delegate_to_agent`.

---

## Fase 1 — Threads vira um "Team de conteúdo" (menor risco, valida o padrão)

**Estado:** ~20%. `ThreadsCampaign` não tem `teamId`; "Planejar com IA" só **linka** pro `/dashboard/teams`. Campanhas/calendário/analytics são surfaces próprias.

**Alvo:** uma campanha de Threads é **lastreada por um Team de geração de conteúdo**. Ativar a campanha roda o time; o output do time vira os `ThreadsCampaignPost` do calendário.

**Passos:**
1. **Schema** (`prisma/schema.prisma`): `ThreadsCampaign.teamId String?` + relação `team Team?`; back-relation `Team.threadsCampaigns`. Migração formal + `migrate deploy` manual no host de prod **antes do push**.
2. **Criar/linkar o time**: o botão "Planejar com IA" (em [threads/campaigns/page.tsx](Imob/sofia-next/src/app/dashboard/threads/campaigns/page.tsx)) passa a **instanciar um time de conteúdo** via `instantiateRoster`/`createTeamWithRoster` (reusar o template `marketing-content` do SP5) e gravar `campaign.teamId`, em vez de só redirecionar.
3. **Auto-disparo ao ativar**: na rota que muda `status → 'active'` (`api/threads/campaigns/[id]`), chamar `startTeamRun(campaign.teamId, { mission: <brief da campanha>, mode: 'chat', userId })`.
4. **Ingestão do output (reusa SP2)**: adicionar uma URL interna em `team.config.outputWebhooks` (helper `dispatchTeamOutputs`) apontando para uma rota nova `POST /api/threads/campaigns/[id]/ingest-run`, que parseia o `TeamRun.output` e cria `ThreadsCampaignPost`/`ThreadsScheduledPost`. **Sem tocar no coordinator.**
5. **UI**: campanha mostra o time vinculado + status da run + link pra ela; remover o beco-sem-saída "vá planejar em outro lugar". Calendário já lista `ThreadsScheduledPost` — agora elas vêm do time.

**Verificação:** em prod, criar campanha → "Planejar com IA" cria um time → ativar → posts aparecem no calendário gerados pela run.

---

## Fase 2 — Workflows vira "automação que aciona Teams" (já 60%)

**Estado:** ~60%. O node `action_team` existe ([flow-engine/nodes/actions.ts:337-426](Imob/sofia-next/src/lib/flow-engine/nodes/actions.ts#L337)) **mas roda um loop próprio de `chatWithAgent`** (não a engine real); Teams é 1 ação entre 24 node types.

**Alvo:** o node de team passa a usar a **engine real** e Workflows se reposiciona como camada de *trigger/composição de teams* — os outros node types (http, if, loop, transform…) viram **encanamento a serviço de team runs**, não um motor concorrente. **Não removemos os outros nodes** (são harness legítimo de automação).

**Passos:**
1. **Religar `action_team` à engine real**: trocar o loop bespoke por uma execução de team de verdade. Como o node precisa do resultado **inline** (pra alimentar o próximo node) e `startTeamRun` no modo chat roda em background, criar um helper síncrono fino `runTeamAndWait(teamId, input)` (cria a run e aguarda/poll até completar, com timeout limitado) **sem alterar `runTeam`**. O node passa a persistir um `TeamRun` real (tasks/messages no banco) em vez do loop ad-hoc.
2. **Triggers → team runs**: os triggers existentes (manual/webhook/cron/event) já podem acionar o node; confirmar e documentar o caminho.
3. **Reposicionamento (copy/UX leve)**: rotular a surface como automação de teams e dar destaque ao node de team na paleta ([components/flows/node-palette.tsx](Imob/sofia-next/src/components/flows/)). Sem remover node types.

**Verificação:** montar um workflow com node de team, rodar, confirmar que cria um `TeamRun` real (via coordinator) e que o output alimenta o node seguinte.

---

## Fase 3 — Conversas/WhatsApp atendidas por um "Team em modo conversa" (maior impacto/risco, por último)

**Estado:** ~0%. `handleIncomingMessage` ([whatsapp-cloud-service.ts:210](Imob/sofia-next/src/lib/whatsapp-cloud-service.ts#L210)) chama `chatWithAgent(agent.id, …)` em [whatsapp-cloud-service.ts:393](Imob/sofia-next/src/lib/whatsapp-cloud-service.ts#L393); `Conversation` tem `agentId`, sem `teamId`.

**Alvo (modelo escolhido — delegação no ciclo de resposta):** uma conversa pode ser atendida por um Team. Quando for, a mensagem é respondida pelo **agente LÍDER** do time, que pode `delegate_to_agent` aos membros especialistas **dentro do mesmo ciclo de resposta** — mesma latência de hoje, sem o loop pesado de tarefas. O modelo Team só define o roster que o líder pode acionar.

**Pré-requisito de execução (sub-exploração no início da sessão):** ler a implementação de `delegate_to_agent` em [groq.ts](Imob/sofia-next/src/lib/ai/groq.ts) (~204-208 + handler do tool-call) para confirmar **como ele descobre os agentes delegáveis** e como escopar o alvo da delegação ao roster do time.

**Passos:**
1. **Schema** (`prisma/schema.prisma`): `Conversation.teamId String?` + relação `team Team?` (coexiste com `agentId`). Migração formal + `migrate deploy` manual no host de prod **antes do push**.
2. **Config do canal**: na configuração do canal WhatsApp/agente ([dashboard/whatsapp](Imob/sofia-next/src/app/dashboard/whatsapp/) / AgentChannel), permitir escolher "Single Agent" (atual) **ou** "Team". Persistir a escolha.
3. **Roteamento no ponto de decisão** ([whatsapp-cloud-service.ts:393](Imob/sofia-next/src/lib/whatsapp-cloud-service.ts#L393)): se `conversation.teamId` (ou canal configurado p/ team), resolver o **agente líder** do time e chamar `chatWithAgent(leadAgentId, messageHistory, leadContext, options)` passando o roster do time para **escopar o `delegate_to_agent`** aos membros (worker/reviewer). Senão, manter o caminho single-agent atual.
4. **UI** ([conversations/page.tsx](Imob/sofia-next/src/app/dashboard/conversations/page.tsx)): badge "Team" vs "Agent" na conversa; opção de atribuir um Team à conversa.
5. **Observabilidade (leve)**: a resposta continua um `Message`; opcionalmente registrar qual membro respondeu. Manter mínimo no v1.

**Verificação:** em prod, configurar um canal WhatsApp p/ um Team, enviar mensagem, confirmar resposta em latência de chat e que o líder delegou a um especialista quando apropriado.

---

## Fase 4 (leve, opcional) — Realinhar a arquitetura de informação ao Teams

Com os três surfaces rodando através do Teams, fechar o payoff visível: elevar `Teams` na [Sidebar.tsx](Imob/sofia-next/src/components/polaris/Sidebar.tsx) (topo/posição de destaque), reapresentar Threads/Workflows/Conversas como "powered by Teams", e ajustar o onboarding. Como a decisão foi **subordinação funcional** (não reposicionamento puro), esta fase é o fechamento — não o foco — e pode ser adiada.

---

## Verificação geral (por fase)

1. `npm run typecheck` / `npm run build` limpos (checar bugs recorrentes: params `Promise`+`await`; `auth.id` ≠ `auth.userId`).
2. Fases com schema (1 e 3): migração formal + `migrate deploy` manual no host de prod **antes do push**; confirmar a coluna/tabela no DB real.
3. Smoke E2E autenticado em prod (EasyPanel) — gate real é o fluxo afetado funcionando.
4. Commit + push ao concluir cada fase (1 por sessão; não encadear automaticamente).
