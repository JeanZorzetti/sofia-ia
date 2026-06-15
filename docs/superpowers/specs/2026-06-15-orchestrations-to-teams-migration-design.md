# Design — Migração Orquestrações → Teams (aposentar a engine)

**Data:** 2026-06-15
**Status:** aprovado (brainstorming) — pronto para writing-plans do SP1

## Contexto

Teams (`/dashboard/teams`) é o sucessor de Orquestrações (`AgentOrchestration`). Em 2026-06-15 Orquestrações já saiu da UI do dashboard (Sidebar + páginas → redirect para Teams; commit `9fd88fa`), mas a **engine** segue viva porque 4 capacidades só existem nela e o Workflows builder reutiliza componentes dela.

Objetivo deste programa: **levar essas 4 capacidades ao Teams e então deletar a engine de Orquestrações de vez.**

## Decisões (brainstorming)

1. **Estado final:** matar a engine de Orquestrações por completo (não só esconder).
2. **Dados:** não há orquestrações reais em produção (sem Zapier/Make ativo, sem agendamentos, sem clientes) → **sem migração de dados, sem dual-write, sem janela de convivência.**
3. **Capacidades a portar (todas):** Magic Create, Output webhooks, Scheduling/cron, API pública/v1.  Templates de time também.
4. **Estratégia:** incremental, capacidade-por-vez, **teardown por último**. A engine fica viva (já desplugada da UI) até o Teams ter paridade.
5. **Magic Create — política de Reviewer:** a IA inclui Reviewer **só quando o processo descrito implicar QA/revisão/aprovação**; senão Lead + Workers.
6. **Sequência:** SP1 → SP6, começando por SP1 (Magic Create).

## Restrições transversais (valem para todo o programa)

- **NÃO deletar `src/components/orchestrations/*`** (flow-canvas/nodes) — é compartilhado com o **Workflows builder** (`app/dashboard/workflows/builder/page.tsx`, `predictive-workflow-builder.tsx`). No teardown, preservar (ou realocar para um namespace do Workflows).
- **Dependência do Threads (bloqueia o SP6):** `app/dashboard/threads/campaigns` ("Planejar com IA") e `scripts/create-threads-*-orchestration.ts` usam a engine de Orquestração como motor de planejamento. Matar a engine exige repontar o Threads para Teams (ou para um motor próprio) — resolver dentro do SP6, não some sozinho.
- **Descasamento de paradigma:** Orquestração = pipeline estático (`sequential`/`parallel`/`consensus`). Teams = coordenação dinâmica Lead/Worker/Reviewer. Não é 1:1; as strategies `parallel`/`consensus` **são descartadas** (YAGNI, sem uso real) — o modelo lead-coordenado do Teams é o caminho único daqui pra frente.

## Programa — decomposição (plano de ataque)

Cada sub-projeto é shippável sozinho e terá seu próprio ciclo spec → plano → implementação (1 por sessão).

| # | Sub-projeto | Escopo | Esforço |
|---|---|---|---|
| **SP1** | Magic Create → Teams | Prompt Groq gera **roster** (1 Lead + N Workers + Reviewer-se-implicar) → cria `Team`+`TeamMember`s → modal abre `/dashboard/teams/[id]`. Aposenta o Magic Create de orchestration. | Médio |
| **SP2** | Output webhooks → Teams | `dispatchOutputWebhooks()` já é genérica → guardar `outputWebhooks` em `Team.config` e chamar no fim do Team run; UI de config na sala do time. | Baixo |
| **SP3** | Scheduling → Teams | Re-homar agendamento no `Team` (schema novo limpo, sem dado a preservar); cron dispara `POST /api/teams/[id]/run`; dialog de agendamento na sala do time. | Médio |
| **SP4** | API pública/v1 → Teams | Variante API-key do `POST /api/teams/[id]/run`; atualizar docs/openapi/Zapier/Make. | Médio |
| **SP5** | Templates de time | Galeria de rosters pré-montados (equivalente aos orchestration-templates). | Médio |
| **SP6** | Teardown | Deletar engine (API priv/pub/v1, `lib/orchestration/*` exceto `team/`, modelos `AgentOrchestration`/`OrchestrationExecution`/`ScheduledExecution` antigo via migração), limpar analytics/marketing/docs/openapi/sitemap, **preservar flow-canvas**, **repontar Threads**. | Médio-alto |

### Overviews SP2–SP6 (superficial — design completo vem no spec de cada SP)

#### SP2 — Output webhooks → Teams
A função `dispatchOutputWebhooks()` ([output-webhooks.ts](../../../src/lib/orchestration/output-webhooks.ts)) já é quase genérica: recebe `{id, name, config}` + resumo da execução + output final, lê `config.outputWebhooks[]` e dispara **webhook (HMAC) / email (Resend) / slack**. Plano: guardar `outputWebhooks` em `Team.config` (campo JSON que já existe) e chamar a função **ao fim do Team run** — no worker (code-runs) e no caminho `after()`/conclusão do `runTeam` (chat-runs). Generalização mínima dos tipos `OrchestrationSummary`/`ExecutionSummary` → resumo de Team/TeamRun. UI: gerenciador de webhooks na sala do time (recriar o padrão do antigo `OutputWebhooksManager`, já deletado). **Sem migração.** Gotcha a corrigir no porte: o header está com nome bugado `X-Polaris IA-Signature` (espaço) — normalizar para `X-Polaris-Signature`.

#### SP3 — Scheduling / cron → Teams
Hoje: modelo `ScheduledExecution` (FK → `AgentOrchestration`) + rota `cron/run-scheduled` ([route](../../../src/app/api/cron/run-scheduled/route.ts)) que roda um **executor sequencial inline** próprio. Plano: como não há dado a preservar, redesenhar limpo — novo modelo `ScheduledTeamRun` (`teamId`, `cronExpr`, `mission`/`inputTemplate`, `nextRunAt`, `lastRunAt`, `lastStatus`, `isActive`) ou re-homar `ScheduledExecution` no `Team`. O cron acha os agendamentos vencidos e dispara o **trigger de Team run que já existe** (`POST /api/teams/[id]/run` via `after()`/fila) em vez do executor inline. Reaproveitar o parser `getNextRunAt`. cron-job.org continua batendo no endpoint. UI: dialog de agendamento na sala do time. **Migração:** criar modelo novo (e dropar o antigo no SP6).

#### SP4 — API pública/v1 → Teams
Hoje: `v1/orchestrations/[id]/execute` ([route](../../../src/app/api/v1/orchestrations/[id]/execute/route.ts), auth por API key via `getAuthFromApiKey`) + `public/orchestrations/[id]/run`, ambos fire-and-forget. Plano: criar `v1/teams/[id]/run` (e variante public) com auth de API key, chamando o **mesmo trigger** do Team run. Como o `POST /api/teams/[id]/run` de sessão já existe, extrair o disparo para um helper compartilhado pelas duas rotas (sessão + API key). Atualizar `api/docs/openapi.json`, a página `api-reference` e a **copy das integrações Zapier/Make**. **Esforço médio.**

#### SP5 — Templates de time
Hoje: `orchestration-templates.ts` (~31KB de pipelines pré-montados) + `templates/route.ts` + `TemplatePickerDialog`. Plano: definir um conjunto curado de **rosters de time** (Lead/Worker/Reviewer para casos comuns) em `team-templates.ts` (estático/código, como os de orchestration — **sem DB**). UI: entrada "criar a partir de template" na lista de Teams + picker. Cada template instancia agents + time reaproveitando o `createTeamWithRoster()` extraído no SP1. **Esforço médio.**

#### SP6 — Teardown
Só depois de SP1–SP5 entregues e o Teams com paridade. **Deletar:** `app/api/orchestrations/**`, `app/api/public/orchestrations/**`, `app/api/v1/orchestrations/**`, os stubs de redirect em `app/dashboard/orchestrations/**`, `lib/orchestration/{orchestration-templates,output-webhooks,task-parser}.ts` (após portados/obsoletos), e os modelos Prisma `AgentOrchestration`/`OrchestrationExecution`/`ScheduledExecution` antigo (migração que **dropa as tabelas**). **Preservar:** `src/components/orchestrations/*` (flow-canvas — Workflows builder); avaliar realocar para um namespace do Workflows. **Limpar referências cruzadas:** eventos de analytics (`first_orchestration_created`/`_executed` em `lib/analytics.ts`), `api/admin/metrics`, páginas públicas (`(public)/features/orchestrations`, integrations Zapier/Make, docs/getting-started, documentacao), `sitemap.ts`, `openapi.json`, strings i18n. **Repontar Threads (maior incógnita):** `threads/campaigns` ("Planejar com IA") + 6 `scripts/create-threads-*-orchestration.ts` usam a engine como motor de planejamento → migrar pra Teams ou pra um planner próprio do Threads; **exige investigação própria no início do SP6.** **Esforço médio-alto.**

---

## Design detalhado — SP1: Magic Create → Teams

### Comportamento atual (a substituir)
`POST /api/orchestrations/magic-create` ([route](../../../src/app/api/orchestrations/magic-create/route.ts)): NL → Groq (`llama-3.3-70b-versatile`) retorna `{name, description, agents[], connections[]}` → cria N `Agent`s → cria `AgentOrchestration` (strategy `sequential`). `MagicCreateModal` mostra preview e navega para `/dashboard/orchestrations/[id]`.

### Comportamento novo
A mesma jornada (descreve processo → IA monta tudo → preview → abrir), porém o artefato final é um **Team**.

#### 1. Schema gerado pela IA
O prompt passa a exigir um **roster** compatível com `validateRoster` ([team-roster.ts](../../../src/lib/orchestration/team/team-roster.ts)): exatamente **1 lead**, **≥1 worker**, **0-1 reviewer**.

```json
{
  "name": "Nome do time",
  "description": "Descrição breve",
  "members": [
    { "role": "lead",     "name": "Coordenador", "systemPrompt": "...", "model": "llama-3.3-70b-versatile" },
    { "role": "worker",   "name": "Pesquisador", "systemPrompt": "...", "model": "llama-3.3-70b-versatile" },
    { "role": "reviewer", "name": "Revisor",     "systemPrompt": "...", "model": "llama-3.3-70b-versatile" }
  ]
}
```
Regras no prompt: 1 lead obrigatório (coordena/delega); cada passo do processo vira um worker; incluir reviewer **só** se a descrição implicar QA/revisão/aprovação; system prompts específicos (100-200 palavras); PT-BR.

#### 2. Persistência (reuso máximo)
- Cria os `Agent`s como hoje (um por membro; `config.role`, `createdByMagic: true`).
- Em vez de `AgentOrchestration`, cria **Team + TeamMembers** reaproveitando a lógica de `POST /api/teams` ([route](../../../src/app/api/teams/route.ts)): montar `members: [{agentId, role, model, position}]`, validar com `validateRoster`, criar via `prisma.team.create` com `members.create`.
- Para evitar duplicação, extrair a criação de time para um helper reutilizável (ex.: `createTeamWithRoster()` em `src/lib/orchestration/team/`), chamado tanto pela rota `POST /api/teams` quanto pelo magic-create. (Melhoria de fronteira justificada: hoje a criação vive inline na rota.)
- Endpoint novo: `POST /api/teams/magic-create` (substitui o de orchestration). Retorna `{ teamId, team: {...} }`.

#### 3. UI
- `MagicCreateModal` ([componente](../../../src/components/sofia/MagicCreateModal.tsx)): mantém preview (nome, membros como badges, system prompts). Trocar tipos `GeneratedOrchestration`→`GeneratedTeam`, copy "Orquestração"→"Time", endpoint, e `router.push('/dashboard/teams/' + result.id)`.
- Badges de membros mostram o papel (Lead/Worker/Reviewer).

#### 4. Erros
- Reaproveitar o tratamento atual: JSON inválido do LLM → 422 "tente novamente"; roster inválido (falha no `validateRoster`) → 422 com a mensagem do validador; faltou descrição → 400.

#### 5. Aposentadoria do antigo
- O `magic-create` de orchestration e seu uso some. Remover `MagicCreateModal`→orchestration (já o reescrevemos), e o CTA de e-mail (`lib/email.ts:239`) reaponta para Teams. (O `app/api/orchestrations/magic-create` em si só é deletado no SP6, junto com o resto da engine — mas deixa de ser chamado já no SP1.)

### Testes (SP1)
- Script tsx (padrão do projeto, ex.: `scripts/sp1-verify.ts`) com Groq fake: valida o **parse do roster** + que o roster gerado passa em `validateRoster` (1 lead / ≥1 worker / ≤1 reviewer); caso "processo com QA" inclui reviewer, caso sem QA não inclui.
- Gate local: `tsc --noEmit` (baseline pré-existente de Teams/worker/sandbox à parte).
- E2E manual: criar um time pelo Magic Create no dashboard e abrir a sala do time.

### Fora de escopo do SP1
- Webhooks/scheduling/API/templates (SP2-SP5).
- Deletar a engine e qualquer modelo/rota de orchestration (SP6).
- Migração de dados (não há).

## Verificação do programa
Cada SP fecha com `tsc` limpo + script tsx de verificação + E2E manual no dashboard de prod (gate real = EasyPanel, por causa da corrupção do node_modules local com OneDrive). Teardown (SP6) só após SP1-SP5 entregues e o Teams com paridade.
