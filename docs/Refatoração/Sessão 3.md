# Sessão 3 — Refatoração sofia-next → executar **Sprint 2 (Performance: banco de dados)**

> **Cole este arquivo inteiro como primeiro prompt no chat novo.** Ele carrega o contexto e manda executar o Sprint 2. Trabalhe em **português**, **1 sprint por sessão**, **não encadeie** automaticamente pro Sprint 3.

---

## Contexto do projeto
- **Projeto:** `sofia-next` (marca "Polaris IA") — SaaS multi-tenant de IA p/ atendimento WhatsApp, **em produção**.
- **Path:** `c:\Users\jeanz\OneDrive\Desktop\ROI Labs\Imob\sofia-next`
- **Stack:** Next.js 16 App Router (RSC-first) + Prisma + PostgreSQL + Groq SDK. ~522 arquivos TS, 219 rotas de API, 60 modelos Prisma.
- **Deploy:** push na `main` (`github.com/JeanZorzetti/sofia-ia`) → auto-deploy EasyPanel/Docker em `polarisia.com.br`.
- **Roadmap completo:** `docs/Refatoração/rafatoração.md` (mesma pasta). Memória: `sofia_next_refactor_roadmap.md`.

## O que já foi feito
- **Sprint 0 (Segurança P0) DONE + pushed main (commit `36e91a6`)** — `src/lib/authz.ts` (`ownerId`/`isAdmin`/`verifyCronAuth`), JWT_SECRET fail-closed, IDOR fechado em ~25 rotas, listagens filtradas, 8 crons migrados.
- **Sprint 1 (Arquitetura) DONE (2026-06-16)** — sem schema. **Reusar:**
  - **`src/lib/with-auth.ts`** — `withAuth(handler, { onUnauthorized? })` HOF que injeta `auth` e devolve 401. `onUnauthorized` opcional preserva o envelope do grupo (flows usa `{data,error}`, knowledge usa `{error}`). **Já migrados:** agents, teams, flows, knowledge (route + [id]). Os outros ~147 handlers ainda usam o bloco `getAuthFromRequest` + null-check — **migrar incrementalmente** quando tocar a rota.
  - **`src/lib/api-response.ts`** — `apiOk(data,{status,meta,message})` / `apiError(msg,status,extra)` / `apiUnauthorized|apiForbidden|apiNotFound`. **Helpers criados mas as rotas NÃO foram migradas** (escolha do usuário: mudar shape quebra o front). Ao converter, fazer **por grupo conferindo o consumidor**.
  - **`src/lib/validation.ts`** — `parseJson(request, schema)` (resultado discriminado `ok`) + schemas `loginSchema/registerSchema/createAgentSchema/updateAgentSchema/createTeamSchema/updateTeamSchema`. Aplicado em auth, agents, teams. Schemas espelham as validações antigas (sem mudar contrato; `z.object` remove chaves desconhecidas, não rejeita).
  - **`src/lib/rate-limit.ts`** — módulo único. `rateLimit()` sync in-memory (134 callers intactos) + classe `RateLimiter` (async, adapter `RateLimitStore`: `CacheStore` default = Redis/Upstash/memory via `cache`, ou `MemoryStore`). `rate-limit-redis.ts` **deletado**.
  - **`src/lib/api-key-auth.ts`** — módulo único de API key. `getAuthFromApiKey(req)` → `{userId,keyId,scopes}` (v1/mcp); `getUserFromApiKey(req)` → usuário ativo (public/*); `getApiKeyFromRequest`, `sha256`, `hasScope`. `api-key.ts` **deletado**. **Criação popula `keyHash`** + **backfill lazy** no auth. ⚠️ **Fallback plaintext MANTIDO** (chaves legadas só existem em plaintext; removê-lo as quebraria) — ver follow-up abaixo.

---

## TAREFA DESTA SESSÃO — **Sprint 2: Performance de banco de dados** 🟡
⚠️ **ESTE SPRINT TEM MIGRAÇÃO DE SCHEMA.** Leia a disciplina de migração abaixo ANTES de mexer no schema.

1. **N+1 em analytics** — `src/app/api/analytics/agents/route.ts` (6 queries/agente) e `src/app/api/analytics/workflows/route.ts` (5 queries/flow): reescrever com `groupBy`/queries em lote (`where: { id: { in: [...] } }`). **Sem schema.**
2. **Streaming de team run** — `src/app/api/teams/[id]/runs/[runId]/stream/route.ts`: o polling busca o run inteiro + todas as mensagens a cada ~1s (600+ queries/run). Trocar por queries delta (só o que mudou desde o último cursor). **Sem schema.**
3. **Índices faltantes** em `prisma/schema.prisma` — ⚠️ **verificar cada candidato contra o schema atual ANTES** (o agente da auditoria errou em pontos parecidos; alguns já podem existir). Candidatos: `Lead.assignedTo`, `Agent.knowledgeBaseId`, `TeamTask.assigneeId`, + compostos `Conversation[agentId,status]`, `Message[conversationId,sentAt]`. **TEM migração** (ver disciplina).
4. **Batch lookups** em `src/app/api/ab-tests/route.ts`. **Sem schema.**
5. **ISR onde for seguro** — trocar `force-dynamic` por `revalidate` em rotas de analytics/catálogo público (cuidado: rotas autenticadas/por-usuário NÃO podem ser ISR; ver lição `ssg_db_query_build_time_gotcha`).

**Sugestão de ordem:** comece pelos itens sem schema (1, 2, 4, 5) que são baixo-risco; deixe os índices (3) por último e isolados, pois exigem migração manual no host de prod. Se o sprint ficar grande, combine fechar um subconjunto e deixar o resto pra Sessão 4.

---

## ⚠️ Disciplina de migração (lição registrada — `sofia_next_db_push_runner_fails.md`)
- O **standalone do Next NÃO aplica `prisma db push`/migrações no deploy**. Toda alteração de schema exige **migração formal `prisma migrate` + `migrate deploy` MANUAL no host real de produção ANTES do push**.
- **Confirmar o host de produção primeiro.** O `CLAUDE.md` do projeto cita `31.97.23.166:5499`; migrações recentes de Teams usaram **`sofia_db@2.24.207.200:5435`** (este foi o host real usado no SP3/6g). **Verificar qual é o de prod atual antes de aplicar** (ler `.env`/EasyPanel — regra: env vars primeiro).
- Antes de dropar/alterar dados: **precheck de contagem + olhar os dados** (lição 6g).

## Padrões e armadilhas (NÃO tropeçar)
- **`JWTPayload`** = `{ id, email, name, role }`. Use `auth.id` (não existe `auth.userId`).
- **Params do Next 16 são Promise:** `{ params }: { params: Promise<{ id: string }> }` + `await params`.
- **Prisma singleton:** `import { prisma } from '@/lib/prisma'`. **Groq:** lazy init. Decimais Prisma: `Number()`.
- Ao tocar uma rota que ainda tem o bloco de auth manual, **aproveite e migre pro `withAuth`** (incremental).

## Verificação (realidade desta máquina)
- ✅ **`tsc --noEmit`** funciona — mas **rode antes** `node node_modules/prisma/build/index.js generate` (o `npx prisma` não resolve aqui). Após gerar, sobram **7 erros pré-existentes** (deps opcionais não instaladas: `bullmq`, `e2b`, `@xterm/xterm`/`@xterm/addon-fit`, `diff2html`) — **ignore**. Garanta que nenhum erro novo cite seus arquivos.
- ⛔ **`jest` local NÃO roda** — corrupção do `node_modules` pelo OneDrive (`errno -4094`). **Escreva os testes mesmo assim** (rodam em CI). **Gate real = build EasyPanel + E2E autenticado em prod.**

## Follow-ups deferidos do Sprint 1 (não obrigatórios neste sprint)
- **Remover fallback plaintext de api-key** — só depois que o backfill de `keyHash` tiver coberto as chaves ativas (ou rodar um backfill em massa: `UPDATE api_keys SET key_hash = sha256(key) WHERE key_hash IS NULL`, com cuidado de fazer o sha256 no app, não no SQL). Depois apagar o ramo plaintext de `findActiveApiKey`.
- **Continuar migração pro `withAuth`** nas rotas restantes (incremental).
- **Migrar envelopes pro `apiOk`/`apiError`** por grupo, conferindo o front (item 2 do Sprint 1 ficou só nos helpers).

## Fechamento
- `git add` **só os arquivos do sprint** (há mudanças não relacionadas no working tree — deleções de logos/docs que NÃO são suas). Commit em inglês com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. **Pergunte antes de push** (é produção).
- Atualizar `docs/Refatoração/rafatoração.md` (Sprint 2 → DONE) e a memória `sofia_next_refactor_roadmap.md`.
- Criar `docs/Refatoração/Sessão 4.md` (handoff p/ Sprint 3 — Performance bundle/rendering, **sem** migração).
- **Parar no fim do Sprint 2.** Não começar o Sprint 3.

---
**Comando para começar:** "Use as superpowers. Leia este arquivo e execute o Sprint 2 da refatoração do sofia-next."
