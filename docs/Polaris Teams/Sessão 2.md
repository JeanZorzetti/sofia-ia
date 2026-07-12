# Polaris Teams — Prompt inicial da Sessão 2

> Cole o bloco abaixo (ou o essencial) ao abrir a nova conversa. Ele dá ao Claude todo o contexto pra continuar sem reexplorar.

---

## Contexto pra continuar (Polaris Teams)

Estamos no programa **"Polaris Teams"** (importar conceito/UX/protocolo da Agent Teams AI pra Polaris = `sofia-next`, deploy EasyPanel em `polarisia.com.br`, GitHub `JeanZorzetti/sofia-ia`). Roadmap geral em `docs/Polaris Teams/ROADMAP.md` (3 sub-projetos sequenciados: **A — Teams Core**, **B — Teams UX**, **C — Code Factory**). Cadência: **um sprint por sessão**.

### O que já foi feito (Sub-projeto A — Teams Core) ✅ — sessão anterior
Spec: `docs/superpowers/specs/2026-06-13-teams-core-polaris-design.md` · Plano: `docs/superpowers/plans/2026-06-13-teams-core-polaris.md`. Tudo na `main` (mergeado, deployado).

- **Modelo (decisão-chave):** A virou **entidade dedicada**, NÃO a strategy `'team'` no execute route de orchestrations. 5 tabelas Prisma: `Team`, `TeamMember`, `TeamRun`, `TeamTask`, `TeamMessage` (back-relations em `User`/`Agent`). Migração **já aplicada** no banco de prod.
- **Engine** em `src/lib/orchestration/team/`: `team-coordinator.ts` (`runTeam` — loop **Lead-orquestrado** síncrono), `team-protocol.ts` (parser de diretivas `@TASK/@MESSAGE/@DONE/@APPROVE/@REJECT`), `team-prompts.ts`, `team-board.ts`, `team-roster.ts`, `team-store.ts` (`TeamStore` = porta injetada → coordinator testável sem DB), `team-types.ts`. Reviewer **automático** (reusa protocolo `[REJECT]`+retry). Guard-rails: `maxTurns` (default 6), `retryCap` (2), rate-limit graceful, cancelamento entre passos.
- **Rotas** `/api/teams/*`: CRUD; `POST /[id]/run` (executa o coordinator síncrono, `maxDuration=300`, injeta `createPrismaTeamStore()` + adapter `chatWithAgent`); `GET/DELETE /[id]/runs/[runId]`; SSE em `/[id]/runs/[runId]/stream`.
- **UI mínima** em `src/app/dashboard/teams/` (lista/criar time + detalhe com board todo→doing→review→done + mensagens + output).
- **Testes:** arquivos jest commitados em `src/__tests__/lib/team/` (protocol, board, prompts, roster, coordinator + helper in-memory store). Verificados por **tsc + tsx** (ver gotcha abaixo).

### ⚠️ PENDÊNCIA — verificar A funcionando em prod ANTES de ir pro B
O último commit (`fix(teams): allow any existing agent...`) corrigiu um **400 ao criar time**: o `GET /api/agents` lista agentes globais, mas eu exigia `createdBy===auth.id` → agora valida só existência. Esse fix estava deployando ao fim da sessão.
**Primeiro passo da Sessão 2:** confirmar end-to-end em `polarisia.com.br/dashboard/teams` → criar time (Lead + ≥1 Worker [+ Reviewer]) e disparar uma missão; ver o board transitar e o output consolidado. Se ainda der 400, o motivo exato aparece **em vermelho abaixo do botão** (provável: roster precisa de 1 Lead + ≥1 Worker — a UI faz o 1º agente = Lead, demais = Worker).

### ⚠️ Gotcha de ambiente desta máquina (crítico)
O projeto está no **OneDrive**, que corrompe `node_modules` intermitentemente (errno -4094). Consequência: **`jest`, `next build` e `require('pg')` TRAVAM/crasham localmente** (jest = 7min até crashar; build pendura). NÃO tente rodá-los aqui. Verificação confiável:
- **`npx tsc --noEmit`** (rápido, ~6s) pra type-safety.
- **`npx tsx <script>.ts`** com `node:assert` + **imports relativos** (tsx não resolve o alias `@/`) pra lógica pura — roda em segundos.
- **Prisma migrate funciona** (binário schema-engine, não o pg JS): `prisma migrate status/deploy` com `DATABASE_URL` inline.
- **Gate real de jest + `next build`** = no **deploy do EasyPanel** (Linux limpo) ou num **CI** (workflow GitHub Actions já discutido: Postgres `pgvector/pgvector:pg16` + `npm ci` → `prisma generate` → `prisma migrate deploy` → `jest src/__tests__/lib` → `next build`). O `.github/workflows/ci.yml` ainda **não foi adicionado** — posso criar se quiser.

### Banco de produção
- Real e alcançável: **`sofia_db@2.24.207.200:5435/sofia_db`** (mesmo VPS do Compass). O `.env` aponta pra `bot@31.97.23.166:5499` que **dá timeout** — usar o de cima pra migrate.
- 🔐 **A senha do Postgres foi exposta no chat — ROTACIONAR** (entra na lista de segredos a rotacionar).

---

## O que fazer nesta sessão (escolha um — cadência = 1 sprint por sessão)

**Opção 1 (recomendada): fechar o A + começar o B.**
1. Confirmar A no ar (criar time + rodar missão em prod). Corrigir qualquer bug residual.
2. Então **brainstorm + spec + execução do Sub-projeto B (Teams UX)** — só o B. B = a "sala do time" completa no dashboard: kanban de verdade (drag-drop opcional), activity timeline, painel de mensagens entre agentes, grafo do time (`packages/agent-graph` vs XY Flow), e — a peça nova mais importante — tornar o **SSE realmente ao vivo**. Hoje o `POST /run` é **síncrono** (retorna só no fim), então a UI renderiza o board final direto e o SSE fica wired mas não-crítico. Decidir no spec do B se o run vira assíncrono (job/queue) pra UX em tempo real, ou se mantém síncrono e o B é só polish visual do resultado. O B informa o schema/board reais; não detalhar C ainda.

**Opção 2: só validar/estabilizar o A** (se preferir não abrir o B agora): rodar o fluxo em prod, adicionar o `.github/workflows/ci.yml` pra fechar o gate de jest+build, e parar aí.

**Comece confirmando comigo qual opção** (regra global: confirmar abordagem em tarefa de estratégia antes de executar). Use as skills superpowers (brainstorming → writing-plans → subagent-driven-development) como na Sessão 1.
