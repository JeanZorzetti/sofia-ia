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
