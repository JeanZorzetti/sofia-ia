# Design — SP2: Output webhooks → Teams

**Data:** 2026-06-15
**Programa:** Migração Orquestrações → Teams (ver `2026-06-15-orchestrations-to-teams-migration-design.md`)
**Status:** aprovado (brainstorming) — pronto para writing-plans
**Antecessor:** SP1 — Magic Create → Teams (entregue)

## Objetivo

Quando um **Team run** termina com sucesso, disparar os mesmos outputs que a engine de Orquestrações disparava — webhook HTTP assinado por HMAC, email via Resend, Slack incoming webhook — configurados na sala do time. Aposenta a capacidade de output webhooks da orquestração (a engine só é deletada no SP6).

## Decisões confirmadas (brainstorming desta sessão)

1. **Onde disparar:** no **caller** (run route p/ chat-runs + worker p/ code-runs), depois que `runTeam` resolve, lendo o `TeamRun` final. Preserva o invariante do programa "coordinator (`runTeam`) INTACTO".
2. **Só em sucesso:** disparar apenas quando `status === 'completed'` (não em `failed`/`cancelled`/`rate_limited`).
3. **Config:** em `Team.config.outputWebhooks` (campo Json que já existe), editada via `PATCH /api/teams/[id]`.
4. **Copy/payload:** **generalizar** a função compartilhada para a marca "Team" (label "Time", `event: 'team.completed'`) — é o que o cliente vê. Default da função preserva os valores de orquestração (caller antigo byte-idêntico).
5. **finalOutput:** mapear `TeamRun.output` (consolidação do Lead) → 3º arg; `execution = { id: runId, durationMs, tokensUsed }` do `TeamRun`.
6. **UI:** painel "Outputs / Webhooks" na sala do time, expondo os **3 tipos** (webhook/email/slack) — paridade com o antigo `OutputWebhooksManager`.
7. **Persistência:** gravar `DispatchRecord[]` em `TeamRun.outputDispatches` (campo Json novo) para dar visibilidade de entrega.

## Achados do código que moldam o plano (não óbvios)

- **`PATCH /api/teams/[id]` SUBSTITUI o config inteiro** (`route.ts:70` — `config: config as object`), **não faz merge** como o prompt da sessão presumia. Salvar `outputWebhooks` com PATCH ingênuo apagaria `repoUrl`/`defaultBranch`/`maxTurns`/`retryCap`. → **Corrigir o PATCH para merge raso de `config`.**
- **O deploy aplica schema via `prisma db push --skip-generate`** (Dockerfile `CMD`, linha 57), **não `migrate deploy`**. Logo, **adicionar um campo nullable ao schema é auto-sincronizado no deploy, sem migração manual**. Persistir `DispatchRecord[]` fica barato (decisão 7).
- **`dispatchOutputWebhooks()` já é genérica** (`src/lib/orchestration/output-webhooks.ts`): recebe `{id,name,config}` + `{id,durationMs,tokensUsed}` + finalOutput, lê `config.outputWebhooks[]`, dispara só os `enabled`, trata erro por-output (`Promise.allSettled`, nunca quebra o run) e devolve `DispatchRecord[]`. **Reuso quase total — não reimplementar.**
- **Bug a corrigir no porte:** o header HMAC é `X-Polaris IA-Signature` (com espaço, inválido) em `output-webhooks.ts:83`. Normalizar para `X-Polaris-Signature`. Sem receivers reais em prod → seguro mudar para ambos os callers.
- **`TeamRun` não tem campo Json livre** (`output` é `String`, `changedFiles` é específico de git) → o campo `outputDispatches Json?` é novo.

## Arquitetura

Invariante do programa: o coordinator (`runTeam`, `team-coordinator.ts`) fica **INTACTO**. Toda a extensão do SP2 vive na **função compartilhada**, num **módulo novo de disparo** e nos **callers**.

### 1. Generalizar `src/lib/orchestration/output-webhooks.ts` (reuso)

Adicionar um 4º parâmetro **opcional** `opts` com defaults que preservam o comportamento atual:

```ts
export interface DispatchOpts {
  /** Frase de conclusão (email/slack): default 'Orquestração concluída'.
   *  Usar a frase inteira evita problema de concordância de gênero
   *  (ex.: 'Time concluído' vs 'Orquestração concluída'). */
  completedLabel?: string
  /** Nome do evento no payload do webhook: default 'orchestration.completed'. */
  event?: string
}

export async function dispatchOutputWebhooks(
  entity: { id: string; name: string; config: any },
  execution: ExecutionSummary,
  finalOutput: any,
  opts: DispatchOpts = {},
): Promise<DispatchRecord[]>
```

- `completedLabel` (default `'Orquestração concluída'`) e `event` (default `'orchestration.completed'`) descem para `dispatchWebhook`/`dispatchSlack`/`dispatchEmail`.
  - webhook: payload **neutro** `{ event, id, name, executionId, durationMs, tokensUsed, output, timestamp }` (`id`/`name` = entidade; `event` carrega o tipo). Sem consumidores em prod → seguro neutralizar as chaves legadas `orchestrationId`/`orchestrationName`.
  - slack: `✅ *${completedLabel}:* ${name}` (headline + bloco de resultado, como hoje).
  - email: `<h2>✅ ${completedLabel}</h2>` e subject default `${completedLabel}: ${name}` (continua sobrescrevível por `cfg.subject`).
- **Renomear o tipo** `OrchestrationSummary` → `EntitySummary` (alias mantido se necessário p/ não quebrar o import do caller de orchestration, que vive até o SP6).
- **Fix do header:** `headers['X-Polaris-Signature'] = ...` (era `'X-Polaris IA-Signature'`). Atualizar também o comentário/docstring do topo do arquivo.
- O caller de orchestration (`orchestrations/[id]/execute/route.ts:734`) continua chamando **sem `opts`** → comportamento idêntico (exceto o nome do header, intencional).

### 2. Módulo de disparo do Team — `src/lib/orchestration/team/team-outputs.ts` (novo)

Duas peças, separando o **puro/testável** da **borda de DB**:

```ts
// PURA (testável no sp2-verify): decide se dispara e monta os args.
export function buildTeamDispatchArgs(run: {
  id: string; status: string; output: string | null
  durationMs: number | null; tokensUsed: number | null
}, team: { id: string; name: string; config: any }):
  | { dispatch: true; entity: {...}; execution: {...}; finalOutput: any; opts: DispatchOpts }
  | { dispatch: false }            // status !== 'completed' OU sem outputWebhooks enabled

// BORDA (DB + rede): carrega run+team, chama buildTeamDispatchArgs,
// dispatchOutputWebhooks, persiste outputDispatches. Best-effort, nunca lança.
export async function dispatchTeamOutputs(runId: string): Promise<void>
```

- `buildTeamDispatchArgs`: gate `status === 'completed'`; lê `team.config.outputWebhooks`, retorna `{dispatch:false}` se vazio/sem `enabled`; senão monta `entity={id:team.id,name:team.name,config:team.config}`, `execution={id:run.id, durationMs:run.durationMs??0, tokensUsed:run.tokensUsed??0}`, `finalOutput=run.output`, `opts={completedLabel:'Time concluído', event:'team.completed'}`.
- `dispatchTeamOutputs`: `prisma.teamRun.findUnique({include:{team:true}})`; se `buildTeamDispatchArgs` disser `dispatch:false`, retorna; senão `await dispatchOutputWebhooks(...)` e `prisma.teamRun.update({ data: { outputDispatches: records } }).catch(()=>{})`. Todo o corpo em try/catch com `console.error` — **nunca propaga** (o run já terminou com sucesso).

### 3. Callers (disparo após `runTeam` resolver)

- **Chat-runs** — `src/app/api/teams/[id]/run/route.ts`, dentro do `after(async () => { ... })`, logo após `await runTeam(...)`:
  ```ts
  await runTeam(run.id, { ... })
  const { dispatchTeamOutputs } = await import('@/lib/orchestration/team/team-outputs')
  await dispatchTeamOutputs(run.id)   // best-effort; lê o status final do run
  ```
  (import **dinâmico** dentro do try existente, igual ao `runTeam`/`createPrismaTeamStore` já importados ali; `dispatchTeamOutputs` é no-throw, o try cobre o import.)
- **Code-runs** — `src/worker/index.ts`:
  - caminho **C0** (sem repo): após `await runTeam(runId, {...})`.
  - caminho **`runWithRepo`**: após o bloco de teardown/PR (o `output` final já está persistido). Chamar `await dispatchTeamOutputs(runId)` no fim de `runWithRepo` (gate interno garante que só dispara se `status==='completed'`).
  - import estático no topo do worker (`import { dispatchTeamOutputs } from '@/lib/orchestration/team/team-outputs'`).

### 4. Config + correção do PATCH — `src/app/api/teams/[id]/route.ts`

- Storage: `Team.config.outputWebhooks: OutputWebhookConfig[]` (tipo reusado de `output-webhooks.ts`).
- **Corrigir o PATCH para merge raso** de `config` (protege `repoUrl`/`defaultBranch`/`maxTurns`/`retryCap`):
  ```ts
  // antes: config: config as object   (replace — apaga chaves não enviadas)
  // depois: ler o config atual e espalhar
  const current = (existing.config && typeof existing.config === 'object' ? existing.config : {}) as Record<string, unknown>
  ...(config !== undefined ? { config: { ...current, ...config } } : {})
  ```
  - `ownTeam()` passa a retornar (ou refetch) o `config` atual para o merge. Backward-compat: quem envia config completo (UI de settings atual) continua igual; quem envia parcial (painel de outputs) não apaga o resto.

### 5. Persistência — schema

Adicionar ao model `TeamRun` (`prisma/schema.prisma`):
```prisma
outputDispatches Json? @map("output_dispatches")  // [{type,destination,status,error?,sentAt}]
```
- Aplicado no deploy via `db push` (Dockerfile). **Sem migração manual.**
- Local: o client Prisma fica stale (OneDrive) → `tsc` acusa o campo; **erro tolerado** (some no build do EasyPanel), conforme gotchas do programa.

### 6. UI — `src/app/dashboard/teams/[id]/`

- **`TeamOutputsPanel.tsx`** (novo), renderizado em `TeamRunView.tsx`:
  - Lê `team.config.outputWebhooks` (já vem no GET `/api/teams/[id]`).
  - CRUD + toggle `enabled` dos 3 tipos:
    - `webhook`: `url` + `secret?` (opcional; senão usa `WEBHOOK_SIGNING_SECRET`).
    - `email`: `to` + `subject?`.
    - `slack`: `webhookUrl`.
  - Salvar → `PATCH /api/teams/[id]` com `{ config: { outputWebhooks } }` (merge no server preserva o resto).
  - Mostrar **status de entrega** do último run: ler `run.outputDispatches` (✓ enviado / ✗ falhou + erro). Reaproveitar o `loadTeam()`/run-detail já existentes em `TeamRunView`.

## Testes (padrão SP1)

- **`scripts/sp2-verify.ts`** (tsx puro, `node:assert`, imports **relativos** `../src/...`, fake `fetch` global):
  1. `dispatchOutputWebhooks` filtra só os `enabled`.
  2. Header HMAC = **`X-Polaris-Signature`** e valor = `sha256=` + HMAC correto do body (com secret conhecido).
  3. Com `opts={completedLabel:'Time concluído',event:'team.completed'}`: payload do webhook tem `event:'team.completed'`; headline do slack/email usa "Time concluído".
  4. **Sem `opts`** (caller de orchestration): `event:'orchestration.completed'` e headline "Orquestração concluída" (não-regressão).
  5. `buildTeamDispatchArgs`: gate de status (`completed` → dispatch; `failed`/`cancelled`/`rate_limited` → `{dispatch:false}`); sem `outputWebhooks`/sem `enabled` → `{dispatch:false}`; mapeamento de `execution`/`finalOutput` correto.
- **`npx tsc --noEmit`**: limpo, exceto erro esperado do campo `outputDispatches` (client Prisma stale local).
- **E2E manual (com o usuário, em prod EasyPanel):** criar um receiver (webhook.site), configurar um webhook `enabled` no painel da sala, rodar um Team chat, confirmar **POST assinado** chegando com `X-Polaris-Signature` e `event:'team.completed'`. Opcional: testar email (Resend) e Slack.

## Gate / deploy

- Gate real = deploy no EasyPanel (Linux limpo); push na `main` redeploya **app + worker** (2 serviços).
- Commit **só dos arquivos da fatia** (a árvore tem mudanças não relacionadas — logos/docs — que NÃO entram). Caminhos com `[id]`: pathspec `:(literal)`.
- E2E autenticado fica com o usuário.

## Fora de escopo (SP2)

- Scheduling/cron (SP3), API pública/v1 (SP4), templates (SP5), teardown da engine (SP6).
- Migração de dados (não há orquestrações reais em prod).
- Retry/backoff de entrega, fila dedicada de webhooks, assinatura de email/slack (YAGNI).

## Arquivos tocados (resumo)

| Arquivo | Mudança |
|---|---|
| `src/lib/orchestration/output-webhooks.ts` | 4º param `opts` (noun/event, defaults legados); fix header `X-Polaris-Signature`; rename `OrchestrationSummary`→`EntitySummary` |
| `src/lib/orchestration/team/team-outputs.ts` | **novo** — `buildTeamDispatchArgs` (pura) + `dispatchTeamOutputs` (borda) |
| `src/app/api/teams/[id]/run/route.ts` | chamar `dispatchTeamOutputs` no `after()` após `runTeam` |
| `src/worker/index.ts` | chamar `dispatchTeamOutputs` nos 2 caminhos (C0 + `runWithRepo`) |
| `src/app/api/teams/[id]/route.ts` | PATCH: **merge raso** de `config` |
| `prisma/schema.prisma` | `TeamRun.outputDispatches Json?` |
| `src/app/dashboard/teams/[id]/TeamOutputsPanel.tsx` | **novo** — painel de config + status de entrega |
| `src/app/dashboard/teams/[id]/TeamRunView.tsx` | renderizar o painel; expor `outputDispatches` do run |
| `scripts/sp2-verify.ts` | **novo** — verificação (fake fetch, node:assert) |
