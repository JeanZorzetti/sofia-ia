# Sessão 3 — Kickoff: Fase 3 (WhatsApp → "Conversa atendida por Team em modo conversa")

> Cole este arquivo inteiro como primeira mensagem de um chat novo. Ele re-estabelece o contexto (a sessão começa fria) e manda executar **só a Fase 3** — a última e de maior risco.

---

## Contexto do programa

Projeto: **Polaris (sofia-next)** em `c:\Users\jeanz\OneDrive\Desktop\ROI Labs\Imob\sofia-next` (Next.js 16 + Prisma + Groq; deploy EasyPanel `polarisia.com.br`; repo `JeanZorzetti/sofia-ia`).

Programa **"Subordinação ao /teams"**: tornar **Teams a feature única e principal**; todo o resto é **Harness a serviço dela**. Decisão do usuário: subordinar **funcionalmente** (rodar os produtos concorrentes *através* do Teams, reusando a engine — **não** só reposicionar UI, **não** fazer teardown). Sequência **Threads → Workflows → WhatsApp** (menor→maior risco), **1 fase por sessão**, commit+push limpo ao concluir.

Roadmap completo (fonte de verdade): **[docs/Harness/harness.md](harness.md)** — leia a seção **"Fase 3"**. Histórico/decisões na memória: `project_polaris_teams.md` (programa "Subordinação ao /teams", 2026-06-17).

**Disciplina obrigatória (todas as fases):**
- **Coordinator `runTeam` ([src/lib/orchestration/team/team-coordinator.ts:25](../../src/lib/orchestration/team/team-coordinator.ts)) INTOCADO.** Subordinação chama a engine via *callers*/injeção, nunca altera o coordinator.
- **Reuso > código novo:** `chatWithAgent` ([src/lib/ai/groq.ts:104](../../src/lib/ai/groq.ts)) com a tool `delegate_to_agent` já embutida, `createTeamWithRoster`/`instantiateRoster`, templates SP5.
- **Gate local:** `npm run typecheck` limpo (pre-commit husky roda isso). **jest NÃO roda local** (OneDrive errno -4094) e **`next build` é flaky local** → gate real = EasyPanel + E2E autenticado em prod. Bugs recorrentes a checar: params `Promise`+`await` no Next 16; `auth.id` (NÃO `auth.userId`); Groq SDK lazy init; `import { prisma } from '@/lib/prisma'` (nunca `new PrismaClient()`).
- **Buscas recursivas (Glob/ripgrep) estouram timeout** nesta máquina (OneDrive) → preferir listar diretórios rasos (PowerShell `Get-ChildItem`) e ler por caminho conhecido.
- **⚠️ A Fase 3 TEM schema → TEM migração.** O standalone do Next **NÃO** aplica `db push`/migração no deploy → criar migração formal (`prisma migrate`) e rodar **`migrate deploy` MANUAL no host real de produção `sofia_db@2.24.207.200:5435` ANTES do push** (o `CLAUDE.md`/.env citam `31.97.23.166:5499`/`bot@...`, que dá timeout — **o host de prod das migrações de Teams é o `2.24.207.200:5435`**). Local, `prisma migrate`/`generate` travam por OneDrive — usar o **binário** `node node_modules/prisma/build/index.js migrate deploy` com `DATABASE_URL` inline, não `npx`/`pg`.
- **Não encadear:** fazer **só a Fase 3** e parar. (Depois dela só resta a **Fase 4 opcional/leve** — realinhar a arquitetura de informação/Sidebar ao Teams; não fazer sem instrução.)

## Fases 1 e 2 — JÁ ENTREGUES

**Fase 1 (Threads) — commit `b5e9862`, migração aplicada em prod.** Threads virou Team de conteúdo: campanha tem `teamId`, "Planejar com IA" instancia um time (template dedicado `threads-campaign`, que emite os posts como **JSON na consolidação do líder** em `team-coordinator.ts:206`) e `src/lib/threads/campaign-ingest.ts` cria os posts no calendário. **As-built divergiu do plano original do harness.md** (template dedicado, não `marketing-content`; geração no "Planejar com IA", não no "ativar"; ingestão same-process via hook `onComplete` no `startTeamRun`, não webhook-pra-si-mesmo). E2E em prod ainda pendente com o usuário.

**Fase 2 (Workflows) — commit `59c6e86`, sem schema.** O node `action_team` ([src/lib/flow-engine/nodes/actions.ts:337](../../src/lib/flow-engine/nodes/actions.ts)) deixou de rodar um loop bespoke de `chatWithAgent` e passou a usar a **engine real** via novo caller `runTeamAndWait(teamId, {mission})` ([start-team-run.ts](../../src/lib/orchestration/team/start-team-run.ts)) — cria um `TeamRun` de verdade, roda `runTeam` **inline** (sem `after()`, sem poll — o `execute()` do node já é `await`ado dentro de `executeFlow`) e devolve o output. Paleta destaca o node de Time (badge "Principal"). E2E em prod pendente.

> ⚠️ **A Fase 3 NÃO reusa `runTeam`/`runTeamAndWait`.** O modelo escolhido para WhatsApp é **leve** (delegação no ciclo de resposta), não o loop pesado/assíncrono de tarefas do coordinator. Reusa-se o `chatWithAgent` + `delegate_to_agent`, não a engine de team-run.

---

## TAREFA DESTA SESSÃO: Fase 3 — Conversas/WhatsApp atendidas por um "Team em modo conversa"

**Estado atual (~0%):** uma conversa de WhatsApp é atendida por **um agente único**. O ponto de decisão é `handleIncomingMessage` ([src/lib/whatsapp-cloud-service.ts:210](../../src/lib/whatsapp-cloud-service.ts)), que em [whatsapp-cloud-service.ts:393-399](../../src/lib/whatsapp-cloud-service.ts) chama `chatWithAgent(agent.id, messageHistory, { leadName, leadPhone, leadStatus })`. O modelo `Conversation` (schema.prisma:84) tem `agentId String?` (SetNull) e **não tem `teamId`**.

**Modelo escolhido (delegação no ciclo de resposta):** uma conversa pode ser atendida por um **Team**. Quando for, a mensagem é respondida pelo **agente LÍDER** do time, que pode `delegate_to_agent` aos membros especialistas **dentro do mesmo ciclo de resposta** — mesma latência de hoje, sem o loop pesado de `runTeam`. O modelo Team só define o **roster** que o líder pode acionar.

**Fatos já confirmados nesta exploração (para a próxima sessão não repetir):**
- `chatWithAgent(agentId, messages, leadContext?, options?)`. A tool `delegate_to_agent` é **injetada no system prompt** em [groq.ts:204-208](../../src/lib/ai/groq.ts), gated por `leadContext?.delegationDepth ?? 0` (< 3). O `leadContext` hoje carrega `leadName/leadPhone/leadStatus` (+ `userId/leadId` p/ memória + `delegationDepth`); o `options` (4º param) só lê `model/effort/rawText/useVectorSearch` e **ignora chaves extras** (lição do C2.1).
- `@/lib/groq` (usado no WhatsApp, linha 393) é só um **barrel re-export** de `@/lib/ai/groq` — é a **mesma** `chatWithAgent`. Sem conflito; pode importar de qualquer um.

**Pré-requisito de execução (sub-exploração OBRIGATÓRIA no início da sessão, ANTES de codar):** o injetar-no-prompt em `groq.ts:204-208` é só metade. Achar o **handler do tool-call `delegate_to_agent`** (a outra metade, em algum ponto do `chatWithAgent`/loop de tools no `groq.ts`) e confirmar **como ele descobre/resolve o `toAgentId`** — hoje o líder pode delegar para *qualquer* agente. A Fase 3 precisa **escopar o alvo da delegação ao roster do time** (workers/reviewer), e o canal por onde isso desce até o handler (provável: um campo novo no `leadContext`, p.ex. `allowedAgentIds`/`teamRoster`, já que `options` ignora chaves extras). Sem entender o handler, não dá pra escopar com segurança.

**Passos (ver detalhe em [harness.md](harness.md) §Fase 3):**
1. **Schema** (`prisma/schema.prisma`): `Conversation.teamId String?` + relação `team Team?` (coexiste com `agentId`) + back-relation `Team.conversations`. Migração formal + `migrate deploy` **manual** no host de prod `sofia_db@2.24.207.200:5435` **antes do push**.
2. **Config do canal:** na configuração do canal WhatsApp/agente (`src/app/dashboard/whatsapp/` / AgentChannel), permitir escolher **"Single Agent" (atual)** ou **"Team"**. Persistir a escolha.
3. **Roteamento no ponto de decisão** ([whatsapp-cloud-service.ts:393](../../src/lib/whatsapp-cloud-service.ts)): se a conversa/canal estiver ligada a um team, resolver o **agente líder** do time e chamar `chatWithAgent(leadAgentId, messageHistory, leadContext, options)` passando o roster do time para **escopar o `delegate_to_agent`** aos membros. Senão, manter o caminho single-agent atual. **Coordinator INTOCADO.**
4. **UI** (`src/app/dashboard/conversations/page.tsx`): badge "Team" vs "Agent" na conversa; opção de atribuir um Team à conversa.
5. **Observabilidade (leve, v1 mínimo):** a resposta continua um `Message`; opcionalmente registrar qual membro respondeu.

**Antes de codar:** como é mudança de comportamento de um sistema existente e de maior risco (regra do usuário: confirmar abordagem em tarefas de estratégia/sistema), **faça a sub-exploração do handler `delegate_to_agent` primeiro**, depois **descreva a abordagem em 1-2 frases e confirme com o usuário** — especialmente: (a) como escopar a delegação ao roster (campo no `leadContext`?), (b) onde fica o flag Single/Team (no `AgentChannel`/canal ou na `Conversation`?), (c) o que acontece com conversas já existentes (default Single). Use plan mode se fizer sentido.

**Verificação:** migração confirmada na tabela `conversations` do DB real (coluna `team_id`); `npm run typecheck` limpo; em prod, configurar um canal WhatsApp p/ um Team, enviar mensagem, confirmar resposta em latência de chat e que o líder delegou a um especialista quando apropriado. Commit + push ao concluir (`feat(whatsapp): answer conversations with a Team in conversation mode (Phase 3 of Teams subordination)`), depois **parar**.

**Próximo (NÃO nesta sessão):** Fase 4 (leve, opcional) — realinhar a arquitetura de informação ao Teams (elevar Teams na `Sidebar.tsx`, reapresentar Threads/Workflows/Conversas como "powered by Teams"). Fechamento, não foco; só com instrução explícita.
