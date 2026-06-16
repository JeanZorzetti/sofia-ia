# Design — SP4: API pública/v1 → Teams

**Data:** 2026-06-15
**Status:** aprovado (brainstorming) — pronto para writing-plans
**Programa:** Migração Orquestrações → Teams (ver `2026-06-15-orchestrations-to-teams-migration-design.md`, seção SP4)

## Contexto

Quarto sub-projeto do programa que aposenta a engine de Orquestrações da Polaris levando suas
capacidades para o sistema **Teams**. O SP4 re-homa a **API pública** (disparo de execução por
API key, de fora — Zapier/Make/n8n) no Teams.

É o SP mais barato até aqui porque o **executor já existe e está extraído**: o SP3 deixou
`startTeamRun(teamId, { mission, mode, userId, repoUrl?, base? })`
([start-team-run.ts](../../../src/lib/orchestration/team/start-team-run.ts)) que cria o `TeamRun`,
dispara assíncrono (`after()` p/ chat, fila BullMQ p/ code), valida ownership (`createdBy === userId`)
+ roster (lead+worker) e mapeia erros via `TeamRunError` (código tipado). A rota de sessão
`POST /api/teams/[id]/run` já é só um caller dele. **SP4 = mais callers do MESMO helper, autenticados
por API key** em vez de sessão.

**Invariante do programa:** coordinator (`runTeam`) e `startTeamRun` ficam **INTACTOS**; estende-se
via novos callers.

## Estado atual (a substituir — NÃO deletar, morre no SP6)

- **v1 (Bearer):** `src/app/api/v1/orchestrations/[id]/execute/route.ts` — auth `getAuthFromApiKey(request)`
  (`@/lib/api-key-auth`, header `Authorization: Bearer sk-...`, retorna `auth.userId`). Body `{ input?, variables? }`.
  Cria `OrchestrationExecution` e dispara via **hack de fetch interno**. Lista em `v1/orchestrations/route.ts`.
- **public (X-API-Key):** `src/app/api/public/orchestrations/[id]/run/route.ts` — auth
  `authenticateApiKey(getApiKeyFromRequest(request))` (`@/lib/api-key`, header `X-API-Key: sk_...`, retorna `user.id`).
  Body `{ input | message }`. Cria `OrchestrationExecution` `pending`, retorna `202 { success, data:{ executionId, ... } }`.
  Lista em `public/orchestrations/route.ts`.
- **Dois mecanismos de API key distintos** (Bearer `getAuthFromApiKey`→`.userId` vs X-API-Key
  `authenticateApiKey`→`.id`). O SP4 **espelha os dois** (a copy de Zapier/Make/n8n já referencia ambos os estilos).

## Decisões (brainstorming, aprovadas)

1. **Escopo:** espelhar as duas rotas de disparo (v1 Bearer + public X-API-Key) **e** as duas de listagem.
2. **Body:** aceitar `{ mission }` com aliases `input`/`message` → `mission` (precedência `mission > input > message`);
   `mode` `'chat'|'code'` default `'chat'`. Compat com templates Zapier/Make/n8n existentes.
3. **Auth:** reusar os helpers existentes **sem modificá-los** — `getAuthFromApiKey` (Bearer, `.userId`) na v1,
   `authenticateApiKey`/`getApiKeyFromRequest` (X-API-Key, `.id`) na public.
4. **Resposta:** `202 { success, data: { runId, status: 'pending', mode } }` nas duas rotas (espelha a rota de sessão).
5. **Executor:** chamar `startTeamRun` **direto** (sem o hack de fetch interno da orchestration v1).
6. **Resultados via webhook, não polling:** o SP2 já entregou output webhooks no Team → o disparo é fire-and-forget
   e o resultado chega por webhook configurado no time. **Sem endpoint público de status/poll**
   (o `executions/{id}` de orchestration era pull e morre no SP6).
7. **Sem checagem de scope:** espelha o comportamento atual da v1 de orchestration (não quebra keys existentes). YAGNI.
8. **Docs/copy: completo nesta sessão** — openapi + api-reference + copy Zapier/Make/n8n (público e dashboard).
9. **Sem migração, sem dep nova** (reusa `startTeamRun`/`TeamRun`).

## Arquitetura

### Helper compartilhado novo (lógica pura, testável) — `src/lib/orchestration/team/team-run-api.ts`

Boundary nova justificada: concentra a tradução HTTP↔domínio que as 3 rotas de disparo precisam,
mantendo as rotas finas e dando um ponto puro testável por `tsx`.

```ts
import type { TeamRunMode, TeamRunErrorCode } from './start-team-run'

export interface ParsedTeamRunBody {
  mission: string          // já trimado; '' se ausente (startTeamRun lança missing_mission)
  mode: TeamRunMode        // normalizado: 'code' só se body.mode === 'code', senão 'chat'
  repoUrl: string | null
  base: string | null
}

// Aliasing p/ compat Zapier/Make/n8n: mission > input > message.
export function parseTeamRunBody(body: unknown): ParsedTeamRunBody

// Fonte única do mapa código→HTTP (a rota de sessão passa a importar isto).
export const TEAM_RUN_STATUS_BY_CODE: Record<TeamRunErrorCode, number> = {
  not_found: 404,
  invalid_roster: 400,
  missing_mission: 400,
  queue_unavailable: 503,
}
```

`parseTeamRunBody` é defensivo (body pode não ser objeto): lê `mission`/`input`/`message` como strings,
aplica precedência, trima; `mode` normaliza só `'code'`; `repoUrl`/`base` opcionais (override do `Team.config`).

### Rotas de disparo (finas)

Cada `POST` faz: autentica → resolve `userId` → `parseTeamRunBody(body)` → `startTeamRun(id, { ...parsed, userId })`
→ na falha, `TeamRunError` vira HTTP via `TEAM_RUN_STATUS_BY_CODE[code] ?? 400` → `202 { success, data }`.

- `src/app/api/v1/teams/[id]/run/route.ts` (Bearer):
  ```ts
  const auth = await getAuthFromApiKey(request)        // → auth.userId
  if (!auth) return 401 { success:false, error:'Unauthorized. Provide a valid API key via Authorization: Bearer sk-...' }
  const result = await startTeamRun(id, { ...parseTeamRunBody(body), userId: auth.userId })
  ```
- `src/app/api/public/teams/[id]/run/route.ts` (X-API-Key):
  ```ts
  const user = await authenticateApiKey(getApiKeyFromRequest(request))   // → user.id
  if (!user) return 401 { success:false, error:'Invalid or missing API key. Pass your key in the X-API-Key header.' }
  const result = await startTeamRun(id, { ...parseTeamRunBody(body), userId: user.id })
  ```

Ambas: `export const maxDuration = 300` (chat-run roda em background via `after()`); `try/catch` com
`TeamRunError` → status mapeado, erro genérico → `500 { success:false, error }`.

### Rotas de listagem (finas)

Permitem a integração descobrir o `teamId`. `findMany` por dono, `select` enxuto.

- `src/app/api/v1/teams/route.ts` (Bearer) — `GET` → `{ data, total }`.
- `src/app/api/public/teams/route.ts` (X-API-Key) — `GET` → `{ success, data, meta:{ count } }`.

`where: { createdBy: <userId> }`, `select: { id, name, description, createdAt, updatedAt, _count:{ members } }`,
`orderBy: { createdAt: 'desc' }`. (Campos confirmados contra o modelo `Team` no schema na implementação.)

### Refator mínimo da rota de sessão

`src/app/api/teams/[id]/run/route.ts` passa a **importar `TEAM_RUN_STATUS_BY_CODE`** em vez do `STATUS_BY_CODE`
inline (fonte única). Body parsing da rota de sessão fica como está (UI sempre manda `mission`); coordinator intacto.

## Docs / copy (completo nesta sessão)

1. **`src/app/api/docs/openapi.json/route.ts`** — substituir orchestration por Teams:
   - `info.description`: "orchestrations, agents and executions" → "teams, agents and runs".
   - schemas: `Orchestration`→`Team` (`id`, `name`, `description`, `memberCount`, `createdAt`),
     `Execution`→`TeamRun` (`id`, `teamId`, `status`, `mode`, `mission`, `createdAt`).
   - paths: `/api/public/orchestrations`→`/api/public/teams` (List teams),
     `/api/public/orchestrations/{id}/run`→`/api/public/teams/{id}/run` (Run team; body `mission`,
     resposta `202 { success, data:{ runId, status, mode } }`; descrição menciona "resultado via output webhook do time").
   - manter `/api/public/agents`; **remover** `/api/public/executions/{id}` (poll, substituído por webhook).
2. **`src/app/(public)/api-reference/page.tsx`** — tabela de endpoints (`/api/orchestrations*` → `/api/teams*`)
   e o exemplo SSE/uso → Teams run.
3. **Copy de integrações (6 páginas):** `(public)/integrations/{zapier,make,n8n}/page.tsx` +
   `dashboard/integrations/{zapier,make,n8n}/page.tsx` — URL `/api/public/orchestrations/{id}/run` →
   `/api/public/teams/{id}/run`; body `orchestrationId`/`input` → `teamId`/`mission`; CTAs
   `/dashboard/orchestrations` → `/dashboard/teams`. (`threads` em dashboard/integrations sai do escopo — não é Team API.)

## Testes (SP4)

`scripts/sp4-verify.ts` (tsx, `node:assert`, imports **relativos**), testando a lógica pura:
- `parseTeamRunBody`: `{ mission:'x' }`→`mission:'x'`,`mode:'chat'`; `{ input:'y' }`→`'y'`; `{ message:'z' }`→`'z'`;
  precedência `mission > input > message`; trim de espaços; `{}`→`mission:''`; `{ mode:'code' }`→`'code'`;
  `{ mode:'weird' }`→`'chat'`; body não-objeto (`null`/`'str'`)→`mission:''`.
- `TEAM_RUN_STATUS_BY_CODE`: 4 códigos mapeiam 404/400/400/503.

Gate local: `npx tsc --noEmit` (aceitar só ruído de módulo não instalado / client Prisma stale, padrão da máquina)
+ `npx tsx scripts/sp4-verify.ts`. **Gate real = deploy EasyPanel** (push na `main` redeploya app+worker).
E2E (com o usuário): criar API key em `/dashboard/api-keys`, `curl` nas 2 rotas com a key (Bearer e X-API-Key),
confirmar `TeamRun` disparado; conferir `/api/docs/openapi.json` e `/api-reference` atualizados.

## Fora de escopo

- Endpoint público de status/poll de TeamRun (resultado vem por webhook — SP2).
- Checagem de scope nas API keys (mantém comportamento atual).
- Deletar as rotas/modelos de orchestration (SP6).
- Migração de dados / schema novo (não há).
- `dashboard/integrations/threads` (não é API de Team; repontado no SP6).

## Riscos / gotchas

- **Caminhos com `[id]`** no git: usar pathspec `:(literal)` ou aspas ao commitar.
- **Commitar só os arquivos da fatia** (a árvore tem mudanças não relacionadas — logos/docs).
- **Sem migração** confirmado → não há `migrate deploy` manual nesta sessão (lição SP2/SP3 não se aplica).
- Conferir os campos reais do modelo `Team` (`description`?) no schema antes de finalizar o `select` da listagem.
