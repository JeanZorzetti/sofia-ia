# Design — SP5: Templates de time → Teams

**Data:** 2026-06-16
**Status:** aprovado (brainstorming) — pronto para writing-plans
**Programa:** Migração Orquestrações → Teams (ver `2026-06-15-orchestrations-to-teams-migration-design.md`)

## Contexto

Quinto sub-projeto do programa que aposenta a engine de Orquestrações levando suas capacidades ao Teams. SP1–SP4 entregues (Magic Create, Output webhooks, Scheduling, API pública/v1). Falta dar ao Teams uma **galeria de rosters pré-montados** — equivalente aos `ORCHESTRATION_TEMPLATES` — para o usuário criar um time com 1 clique. SP6 (teardown) deleta a engine depois.

**Invariante do programa:** SP5 é **criação de time**, não execução — o coordinator (`runTeam`) e `startTeamRun` ficam **INTACTOS**, o SP5 não os toca.

## Decisões (confirmadas com o usuário)

1. **Curadoria:** portar **todos os 8** `ORCHESTRATION_TEMPLATES` (já curados, distintos, cobrem as categorias úteis).
2. **Mapeamento pipeline → time:** cada template ganha um **Lead sintético** (coordenador/delegador, novo); os passos do pipeline viram **Workers**; o passo final vira **Reviewer SÓ quando é QA/revisão/aprovação real** — fiel à política do Magic Create (programa, decisão 5).
3. **UI:** **dialog enxuto** (botão "Templates" no header de `/dashboard/teams` → cards → "Usar template" → cria e navega), no padrão visual do `MagicCreateModal`.
4. **Shape do template:** membros já em formato de roster, validável por `validateRoster`.
5. **Endpoints:** `GET /api/teams/templates` (resumo) + `POST /api/teams/templates/[id]/deploy` — **auth de sessão** (`getAuthFromRequest`), **sem allowlist de middleware** (lição SP4: só rotas API-key/públicas precisam).
6. **Helper compartilhado:** extrair `instantiateRoster()` (loop criar Agents + `createTeamWithRoster`) e religar o magic-create nele (DRY, fronteira justificada).
7. **Sem DB / sem migração / sem dep nova** — templates estáticos em código.

## Estado atual (referência — NÃO tocar, morre no SP6)

- `src/lib/orchestration/orchestration-templates.ts` (~31KB): `ORCHESTRATION_TEMPLATES: OrchestrationTemplate[]` — **8** pipelines sequenciais (`{ id, name, description, category, icon, strategy, agents:{role,prompt,order}[], exampleInput, expectedOutput, estimatedDuration, tags }`). Sem Lead (pipelines lineares).
- `GET /api/orchestrations/templates`: resumo dos templates, auth de sessão. (deixa de ser usado; deletado no SP6.)
- A UI antiga `TemplatePickerDialog` **já não existe** (deletada no commit `9fd88fa`) → o picker é **recriado do zero** (como o `TeamOutputsPanel` no SP2).

## Infra reaproveitada (já existe)

- `createTeamWithRoster({ name, description?, config?, members: RosterInput[], userId })` em `src/lib/orchestration/team/create-team.ts`: valida nome + `validateRoster` + existência dos agents → cria `Team` + `TeamMember`s. Exige `members[].agentId` (agents criados ANTES).
- `validateRoster(members)` em `team-roster.ts`: exatamente 1 lead, ≥1 worker, ≤1 reviewer, todo membro com `agentId`.
- Padrão de referência: `src/app/api/teams/magic-create/route.ts` — loop `prisma.agent.create` (1 por membro, `config:{ role, createdByMagic:true }`) → monta `RosterInput[]` → `createTeamWithRoster`. **O deploy de template é idêntico, só troca a fonte do roster** (template estático em vez de Groq).
- Header de `/dashboard/teams/page.tsx`: já tem botões **Magic Create** (`setMagicOpen`) e **Criar time** (`openCreate`) — o botão **Templates** entra ao lado.

---

## Arquitetura

### 1. Dados — `src/lib/orchestration/team/team-templates.ts` (novo, estático)

```ts
export type TeamTemplateRole = 'lead' | 'worker' | 'reviewer'

export interface TeamTemplateMember {
  role: TeamTemplateRole
  name: string
  systemPrompt: string
  model: string
}

export interface TeamTemplate {
  id: string
  name: string
  description: string
  category: string   // marketing | suporte | pesquisa | juridico | rh | ecommerce | saude | financas
  icon: string       // emoji, como nos orchestration-templates
  tags: string[]
  members: TeamTemplateMember[]
}

export const TEAM_TEMPLATES: TeamTemplate[]

export function getTeamTemplateById(id: string): TeamTemplate | undefined
export function summarizeTemplate(t: TeamTemplate): TeamTemplateSummary  // sem systemPrompt
```

`TeamTemplateSummary = { id, name, description, category, icon, tags, members: { role, name }[] }` — o que a galeria precisa, sem mandar os prompts (~31KB) pro cliente.

**Os 8 templates** (Lead sintético + workers do pipeline original + reviewer-se-QA). `model` de todos = `llama-3.3-70b-versatile` (igual ao magic-create). `id` reaproveita os slugs originais (`marketing-content`, etc.) para rastreabilidade.

| id | Lead (novo) | Workers | Reviewer |
|---|---|---|---|
| `marketing-content` | Coordenador de Conteúdo | Pesquisador, Copywriter | **Revisor** ✓ |
| `suporte-inteligente` | Coordenador de Suporte | Triagem, Atendente L1 | **Escalação** ✓ |
| `pesquisa-analise` | Coordenador de Pesquisa | Coletor, Analista, Sintetizador | — |
| `juridico-analise-contrato` | Coordenador Jurídico | Analista Jurídico, Compliance, Negociador | — |
| `rh-pipeline-contratacao` | Coordenador de RH | Job Design, Triagem, Entrevistador | — |
| `ecommerce-lancamento-produto` | Coordenador de Lançamento | Copywriter de Produto, Precificação, Estrategista | — |
| `saude-triagem-orientacao` | Coordenador de Triagem | Triador, Orientador, Preparador | — |
| `financas-analise-investimento` | Coordenador Financeiro | Perfil, Ativos, Alocação | — |

**Critério de reviewer:** só `marketing-content` (Revisor = editor que revisa/aprova o artigo) e `suporte-inteligente` (Escalação = supervisor que avalia/refina/aprova a resposta do L1) têm passo final de QA/revisão/aprovação. Os outros 6 terminam em síntese/planejamento (passo de produção, não de revisão) → sem reviewer (viram Workers).

**Workers e Reviewer reaproveitam os system prompts originais** dos `ORCHESTRATION_TEMPLATES` (não reescrever — só re-rotular o papel). O **Lead é prompt novo** (~100-150 palavras) por template: coordena/delega aos workers, garante o output final, não executa as etapas ele mesmo.

### 2. Helper compartilhado — `instantiateRoster()`

Extrair de `magic-create/route.ts` o miolo "criar Agents + criar Team" para um arquivo novo `src/lib/orchestration/team/instantiate-roster.ts` (mantém `create-team.ts` focado em só validar+criar o Team a partir de `agentId`s já existentes). Recebe specs de membro **sem `agentId`** (porque cria os agents), retorna o resultado do `createTeamWithRoster`.

```ts
export interface RosterMemberSpec {
  role: string
  name: string
  systemPrompt: string
  model: string
}

export interface InstantiateRosterInput {
  name: string
  description?: string | null
  teamConfig?: Record<string, unknown>     // vira Team.config
  members: RosterMemberSpec[]
  userId: string
  agentDescription: string                 // descrição dos Agents criados
  agentConfigExtra?: Record<string, unknown> // ex.: { createdByMagic:true } ou { createdFromTemplate:id }
}

export async function instantiateRoster(input: InstantiateRosterInput):
  Promise<{ ok: true; team: ... } | { ok: false; error: string }>
```

Comportamento: para cada membro, `prisma.agent.create` com `config: { role, ...agentConfigExtra }`, monta `RosterInput[]` com `{ agentId, role, model, position:i }`, chama `createTeamWithRoster({ name, description, config: teamConfig, members, userId })`, propaga o resultado.

**Magic-create religado:** passa `agentConfigExtra:{ createdByMagic:true }`, `agentDescription` = `Criado automaticamente via Magic Create para "<nome>"`, `teamConfig:{ createdByMagic:true, originalDescription }` — **preservando byte-a-byte** o comportamento atual (a única mudança é mover o loop para o helper).

**Deploy de template:** passa `agentConfigExtra:{ createdFromTemplate: template.id }`, `agentDescription` = `Criado a partir do template "<template.name>"`, `teamConfig:{ createdFromTemplate: template.id }`.

### 3. Rotas

**`GET /api/teams/templates`** — `getAuthFromRequest` (401 se não autenticado) → `{ success:true, data: TEAM_TEMPLATES.map(summarizeTemplate) }`. Sem prompts no payload.

**`POST /api/teams/templates/[id]/deploy`** — Next 16 async params (`{ params }: { params: Promise<{ id:string }> }`, `const { id } = await params`). Fluxo:
1. `getAuthFromRequest` → 401 se ausente.
2. `getTeamTemplateById(id)` → 404 `{ error:'Template não encontrado' }` se inexistente.
3. `instantiateRoster({ name: tpl.name, description: tpl.description, members: tpl.members, userId: auth.id, agentDescription, agentConfigExtra:{ createdFromTemplate: tpl.id }, teamConfig:{ createdFromTemplate: tpl.id } })`.
4. `result.ok === false` → 422 `{ error: result.error }` (defensivo; não deve ocorrer com template estático válido).
5. → `{ success:true, data:{ teamId: result.team.id, team:{ id, name, description, members } } }`.

**Auth de sessão → NÃO precisa de allowlist no `middleware.ts`** (lição SP4: só rotas API-key/públicas eram barradas pelo guard de sessão).

### 4. UI — `src/app/dashboard/teams/TeamTemplatesDialog.tsx` (novo)

- Client component. Ao abrir, `GET /api/teams/templates` → estado de loading/erro/lista.
- Renderiza **cards** (grid): ícone + nome + categoria + descrição curta + badges dos papéis dos membros (Lead/Worker×N/Reviewer). Padrão visual e classes do `MagicCreateModal` (overlay `fixed inset-0 z-50 bg-black/60`, painel do design system).
- "Usar template" no card → `POST /api/teams/templates/[id]/deploy` (estado "deploying" por card, desabilita o botão) → sucesso → `router.push('/dashboard/teams/' + data.teamId)`; erro → toast/mensagem inline.
- `page.tsx`: import do dialog, estado `templatesOpen`, botão **"Templates"** no header (entre Magic Create e Criar time, mesmo estilo de botão secundário), render `<TeamTemplatesDialog open={templatesOpen} onOpenChange={setTemplatesOpen} />`.

## Fluxo de dados

```
[Header /dashboard/teams] —"Templates"→ TeamTemplatesDialog
  └─ GET /api/teams/templates → summarizeTemplate(TEAM_TEMPLATES) → cards
  └─ "Usar template" → POST /api/teams/templates/[id]/deploy
        └─ getTeamTemplateById(id) → instantiateRoster(specs)
              └─ N× prisma.agent.create → createTeamWithRoster → Team+TeamMembers
        └─ { teamId } → router.push(/dashboard/teams/[teamId])  (sala do time)
```

Magic-create passa a usar o **mesmo** `instantiateRoster` (só muda a fonte do roster: Groq vs estático).

## Tratamento de erros

| Situação | Resposta |
|---|---|
| Não autenticado (ambas rotas) | 401 |
| `id` de template inexistente (deploy) | 404 `Template não encontrado` |
| Roster inválido (defensivo, deploy) | 422 com a mensagem do `validateRoster` |
| Falha do Prisma (deploy) | 500 `Erro ao criar o time a partir do template.` |
| Deploy falha na UI | mensagem inline/toast no card, botão re-habilitado |

## Testes

- **`scripts/sp5-verify.ts`** (tsx, `node:assert`, **imports relativos** — lógica pura, sem DB):
  - cada `TEAM_TEMPLATES` passa em `validateRoster` (mapeando members → `{ agentId: String(i), role }`): exatamente 1 lead, ≥1 worker, ≤1 reviewer.
  - `id`s únicos; todo membro com `name`/`systemPrompt`/`model` não-vazios.
  - **política de reviewer:** `marketing-content` e `suporte-inteligente` têm reviewer; os outros 6 não.
  - `summarizeTemplate(t)` não vaza `systemPrompt` e preserva `members[].role`/`name`.
- **Gate local:** `npx tsc --noEmit` (baseline pré-existente de Teams/worker/sandbox à parte; aceitar só erros de módulo não instalado / client Prisma stale).
- **E2E manual (com o usuário, gate real = EasyPanel):** abrir `/dashboard/teams` → "Templates" → escolher um template (ex.: marketing-content) → confirmar criação → na sala do time, conferir membros e papéis corretos (Lead + 2 Workers + Reviewer).

## Fora de escopo

- Deletar a engine, rotas/modelos de orchestration, `orchestration-templates.ts`, `GET /api/orchestrations/templates` (SP6).
- Migração de dados (não há) e qualquer mudança de schema/dep nova.
- Galeria rica (rota dedicada, filtros, preview de prompts, busca) — YAGNI por ora; o dialog enxuto cobre o caso.
- Editar/duplicar template dentro do picker antes de criar (o usuário edita o time depois, no `RosterEditor` já existente).

## Verificação

Fecha com `tsc --noEmit` limpo + `scripts/sp5-verify.ts` verde + E2E manual no dashboard de prod (gate real = EasyPanel, por causa da corrupção do `node_modules` local com OneDrive). Commit limpo só com os arquivos da fatia (a árvore tem mudanças não relacionadas — logos/docs — que NÃO entram). Push na `main` = deploy app+worker.
