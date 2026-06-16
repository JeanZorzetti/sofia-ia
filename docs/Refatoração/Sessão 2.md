# Sessão 2 — Refatoração sofia-next → executar **Sprint 1 (Arquitetura)**

> **Cole este arquivo inteiro como primeiro prompt no chat novo.** Ele carrega o contexto e manda executar o Sprint 1. Trabalhe em **português**, **1 sprint por sessão**, **não encadeie** automaticamente pro Sprint 2.

---

## Contexto do projeto
- **Projeto:** `sofia-next` (marca "Polaris IA") — SaaS multi-tenant de IA p/ atendimento WhatsApp, **em produção**.
- **Path:** `c:\Users\jeanz\OneDrive\Desktop\ROI Labs\Imob\sofia-next`
- **Stack:** Next.js 16 App Router (RSC-first) + Prisma + PostgreSQL + Groq SDK. ~522 arquivos TS, 219 rotas de API, 60 modelos Prisma.
- **Deploy:** push na `main` (`github.com/JeanZorzetti/sofia-ia`) → auto-deploy EasyPanel/Docker em `polarisia.com.br`.
- **Roadmap completo:** `docs/Refatoração/rafatoração.md` (mesma pasta). Plano espelho: `~/.claude/plans/c-users-jeanz-onedrive-desktop-roi-labs-rosy-ember.md`. Memória: `sofia_next_refactor_roadmap.md`.

## O que já foi feito — **Sprint 0 (Segurança P0) DONE + pushed main (commit `36e91a6`)**
Não refazer. Reusar.
- **`src/lib/authz.ts`** criado (REUSE no Sprint 1):
  - `ownerId(auth)` → `auth.id` p/ não-admin, `undefined` p/ admin (Prisma ignora → admin vê tudo). Type-safe, sem cast. Use em `where: { id, createdBy: ownerId(auth) }`.
  - `isAdmin(auth)` → `auth.role === 'admin'`.
  - `verifyCronAuth(req)` → timing-safe, fail-closed, aceita `Bearer` / `x-cron-secret` / `?secret`.
- **`src/lib/auth.ts`**: `JWT_SECRET` agora **fail-closed** em prod (lazy getter `getJwtSecret()`, sem fallback público).
- **IDOR fechado** em ~25 rotas (filtro de dono na query): agents/[id] (+cognitive-mode, enable-calendar, sheets-import, skills, mcp e sub-recursos), integrations/[id] (+test), knowledge/[id] (+documents, docs/[documentId], reset, sync-drive, chunks, upload), ab-tests/[id] (+start/stop), mcp/servers/[id], conversations/[id] (+messages/close/takeover/tags/reset), api-keys/[id], dev-sessions. **users/[id]** → admin-only; **templates/[id]** PUT/DELETE → admin; **templates/[id]/deploy** usa `auth.id` (não `body.userId`). Listagens agents/ab-tests filtradas por dono. 8 crons migrados p/ `verifyCronAuth`.
- **Já-seguras (NÃO mexer, já checam dono):** teams, flows(+sub), workflows(+sub), skills/[id], agent-folders, threads/campaigns, threads/schedule, webhooks/config, user/api-keys, agents/[id]/plugins+delegations.
- Testes: `src/__tests__/lib/authz.test.ts` + `src/__tests__/integration/agents-ownership.test.ts`.
- ⚠️ **Precondição de deploy já comunicada ao usuário:** `JWT_SECRET` e `CRON_SECRET` DEVEM estar no EasyPanel (fail-closed). E2E autenticado do Sprint 0 ainda **pendente**.

---

## TAREFA DESTA SESSÃO — **Sprint 1: Arquitetura (consistência de auth, resposta e validação)**
Sem mudança de schema (sem migração → menor risco). Tirar boilerplate e padronizar, **incrementalmente**.

1. **`withAuth()` HOF** — wrapper que injeta `auth` e devolve 401 automático, eliminando o bloco `getAuthFromRequest` + null-check repetido em ~155 rotas. Criar em `src/lib/authz.ts` (ou `src/lib/with-auth.ts`). Migrar **por grupo**, começando pelos mais usados (agents, teams, flows, knowledge). Preservar o envelope de resposta de cada grupo.
2. **Envelope de resposta único** — padrão `{ success, data, error }` (já é maioria: 134 rotas; 45 usam `{ data, error }`). Criar helpers `apiOk(data, status?)` / `apiError(msg, status)` em `src/lib/api-response.ts`. **⚠️ RISCO CLIENTE:** mudar shape de resposta quebra o frontend que consome. NÃO faça big-bang nas 219 rotas — defina helpers + converta só por grupo, conferindo o consumidor no front. **Confirme com o usuário a largura da migração de envelope antes de varrer** (regra: confirmar abordagem em tarefa ampla).
3. **Validação de input (zod)** — `zod` já é dependência. Adicionar schemas nas rotas **mutadoras** (POST/PUT/PATCH), começando por auth, agents, teams. Hoje a maioria confia em `request.json()` cru.
4. **Consolidar rate-limit** — `src/lib/rate-limit.ts` (in-memory, 134 usos) vs `src/lib/rate-limit-redis.ts` (Redis, 1 uso). Unificar numa interface com adapter; remover a duplicata.
5. **Consolidar auth de API-key** — duas funções (`src/lib/api-key-auth.ts` e `src/lib/api-key.ts`) + fallback de comparação de chave em **plaintext** (legado). Unificar e remover o fallback plaintext.

**Sugestão de ordem/escopo (confirmar com o usuário no início):** itens 1, 4 e 5 são internos/baixo-risco → bons p/ começar. Itens 2 e 3 tocam contrato com o cliente → escopar conservador. Se o sprint ficar grande, combine de fechar um subconjunto coeso e deixar o resto pra Sessão 3.

---

## Padrões e armadilhas (NÃO tropeçar)
- **`JWTPayload`** tem só `{ id, email, name, role }` — **não** existe `userId`/`orgId`/`workspaceId`. Use `auth.id` (bug recorrente: `auth.userId` não existe → erro TS).
- **Params do Next 16 são Promise:** `{ params }: { params: Promise<{ id: string }> }` + `const { id } = await params`. (Bug recorrente.)
- **Prisma:** sempre `import { prisma } from '@/lib/prisma'` (singleton) — nunca `new PrismaClient()`.
- **Groq:** lazy init obrigatória (`getGroqClient()`), nunca instanciar no top-level (quebra build).
- **Middleware já autentica** todas as `/api/*` (injeta `x-user-id`); por isso o Sprint 0 foi de **autorização** (dono), não autenticação. O `withAuth` é p/ tipagem/DRY do handler, não substitui o middleware.
- **Roles de mensagem:** cast `as 'user' | 'assistant'`. Decimais Prisma: `Number()`.

## Verificação (realidade desta máquina)
- ✅ **`tsc --noEmit`** funciona — mas **rode antes** `node node_modules/prisma/build/index.js generate` (o `npx prisma` não resolve aqui; client desatualizado gera ~30 falsos erros). Após gerar, sobram **7 erros pré-existentes** (deps opcionais não instaladas: `bullmq`, `e2b`, `@xterm/xterm`, `diff2html`) — **ignore, não são seus**. Garanta que nenhum erro novo cite seus arquivos.
- ⛔ **`jest` local NÃO roda** — corrupção do `node_modules` pelo OneDrive (`errno -4094`, `UNKNOWN read`, até no `--clearCache`). Não é o seu código. **Escreva os testes mesmo assim** (rodam em CI/ambiente limpo). **Gate real = build EasyPanel + E2E autenticado em prod.**
- Sprint 1 **não** tem schema → sem migração. (Se algum sprint tiver: migração formal + `migrate deploy` MANUAL no host de produção ANTES do push.)

## Fechamento
- Ao concluir: `git add` **só os arquivos do sprint** (deixar mudanças não relacionadas de fora — há deleções de logos/docs no working tree que NÃO são suas), commit em inglês com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`, **push na main** (usuário autoriza push direto; ele confirma antes só se você perguntar — pergunte por ser produção).
- Atualizar `docs/Refatoração/rafatoração.md` marcando Sprint 1 como DONE e a memória `sofia_next_refactor_roadmap.md`.
- Criar `docs/Refatoração/Sessão 3.md` (handoff p/ Sprint 2 — Performance DB, que **tem** migração).
- **Parar no fim do Sprint 1.** Não começar o Sprint 2.

---
**Comando para começar:** "Use as superpowers. Leia este arquivo e execute o Sprint 1 da refatoração do sofia-next."
