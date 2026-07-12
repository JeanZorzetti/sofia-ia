# Sessão 7 — Refatoração sofia-next → **Sprint 5 (Testes de rota)** 🟢 — ÚLTIMO sprint do roadmap

> **Cole este arquivo inteiro como primeiro prompt no chat novo.** Carrega o contexto e manda executar. Trabalhe em **português**, **1 entrega por sessão**, **não encadeie** automaticamente.
>
> **Comando para começar:** "Use as superpowers. Leia este arquivo e execute o Sprint 5 (Testes de rota) do sofia-next."

---

## Contexto do projeto
- **Projeto:** `sofia-next` (marca "Polaris IA") — SaaS multi-tenant de IA p/ atendimento WhatsApp, **em produção**.
- **Path:** `c:\Users\jeanz\OneDrive\Desktop\ROI Labs\Imob\sofia-next`
- **Stack:** Next.js 16 App Router (RSC-first) + Prisma 5 + PostgreSQL + Groq SDK. ~522 arquivos TS, 219 rotas de API, **56 modelos Prisma** (eram 60; 4 órfãos dropados na Sessão 6).
- **Deploy:** push na `main` (`github.com/JeanZorzetti/sofia-ia`) → auto-deploy EasyPanel/Docker em `polarisia.com.br`.
- **Roadmap completo:** `docs/Refatoração/rafatoração.md` (mesma pasta). Memória: `sofia_next_refactor_roadmap.md`.

## O que já foi feito (Sprints 0-4 — TODOS COMPLETOS)
- **Sprint 0 (Segurança P0):** `36e91a6` — `authz.ts` (`ownerId(auth)`→undefined p/ admin), JWT/cron fail-closed, IDOR fechado em ~25 rotas.
- **Sprint 1 (Arquitetura):** `198f4c7` — `withAuth` HOF, `apiOk/apiError`, zod (`validation.ts`), rate-limit/api-key consolidados.
- **Sprint 2 (Performance DB):** `3f92fa4` — N+1 analytics em lote, streaming team-run, índices (migração `20260616140000`).
- **Sprint 3 (Bundle/rendering):** `655eb69` — optimizePackageImports, code-split, framer-motion cortado das públicas. SEM migração.
- **Sprint 4 (Hardening) — itens 2-5:** `8b321f8` — security headers + CSP; `safeErrorMessage` anti-vazamento em 24 rotas; `JWTPayload.orgId`; gate husky pre-commit.
- **Sprint 4 (Hardening) — item 1 (drop de 4 órfãos):** `1430191` (Sessão 6, 2026-06-17) — `Campaign`/`WhatsappInstance`/`Workspace`/`ComplianceLog` + coluna `users.workspace_id` dropados em prod (migração `20260617120000`, tabelas vazias, backup feito). **Lição registrada:** drop de COLUNA de tabela viva exige o **push/deploy do código junto ou ANTES** (o client Prisma deployado faz `SELECT` de todas as colunas em reads sem `select` → coluna removida quebrou TODAS as leituras de `users`, login mascarado como 401 até o redeploy). Para *adicionar* coluna a ordem é a inversa (migrate antes). Sprint 5 **não tem schema**, então isso não se aplica aqui — mas fica de aviso.

---

## TAREFA DESTA SESSÃO — **Sprint 5: Testes de rota** 🟢 (SEM migração, NÃO toca o DB de prod)

### Estado atual dos testes (já investigado — só confirmar)
- **Framework:** jest 29 + `next/jest` (`jest.config.js`), `testEnvironment: jsdom`, alias `@/`→`src/`, **`coverageThreshold` global = 50%**.
- **18 arquivos de teste hoje:** libs (`authz`, `with-auth`, `validation`, `api-response`, `rate-limit`, `groq`, `embeddings`, `analytics/aggregate`, `team/*`) + integration de ROTA (`agents`, `agents-ownership`, `knowledge`, `crm-lead`) + `api/health`. → cobertura de rota ainda baixíssima (4 rotas testadas de 219).
- ⚠️ **DESCOBERTA CRÍTICA (Sessão 7):** **os testes não rodam em lugar nenhum hoje.** jest **não roda local** (corrupção do `node_modules` pelo OneDrive, `errno -4094`) **E o CI não roda jest** — `.github/workflows/ci.yml` só faz typecheck + lint + build. Escrever testes sem ligar o gate é teatro.

### Passos
1. **Ligar o gate de testes no CI (FAZER PRIMEIRO).** Adicionar um step `npm test -- --ci` ao `.github/workflows/ci.yml` (depois do "Type check", pode ser antes do build), com as **mesmas env vars dummy** já usadas nos steps de typecheck/build (DATABASE_URL/JWT_SECRET/GROQ_API_KEY/EVOLUTION_*/NEXT_PUBLIC_APP_URL). Sem isso os testes não viram gate. (Opcional: gerar coverage no CI; o threshold de 50% já está no `jest.config.js` — decidir se o step falha por coverage agora ou só por teste quebrado, p/ não travar o PR enquanto a cobertura sobe.)
2. **Escrever testes de rota p/ caminhos críticos**, priorizando a **regressão de segurança do Sprint 0 (IDOR/ownership)** — é o maior risco e o mais fácil de regredir:
   - **ownership (IDOR):** não-dono → **404** (o `where` inclui `createdBy` e o Prisma retorna null), dono → 200, **admin → vê tudo** (`createdBy: undefined`), não-autenticado → 401. Replicar o padrão de `agents-ownership.test.ts` para outras rotas `[id]` escopadas por dono: **`teams/[id]`**, `flows/[id]`, `knowledge`/docs, `integrations/[id]`, `conversations/[id]`, `ab-tests/[id]`, `mcp/servers`, `dev-sessions`, `skills/[id]` (cobrir as que o Sprint 0 fechou).
   - **auth:** `login` (401 cred inválida, 429 rate-limit, 400 zod com campo `username`), `register` (409 email existente, 201 cria user + trial).
   - **agents/teams:** CRUD + escopo de dono (POST cria com `createdBy = auth.id`; listagem filtra por dono).
3. **Subir a cobertura** rumo aos 50% configurados nas áreas core (rotas + libs já existentes).

### Padrão de teste de rota — COPIAR de `src/__tests__/integration/agents-ownership.test.ts`
```ts
jest.mock('@/lib/auth', () => ({ getAuthFromRequest: jest.fn() }))
jest.mock('@/lib/prisma', () => ({ prisma: { agent: { findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() } } }))
jest.mock('@/lib/audit', () => ({ logAudit: jest.fn(), getIpFromRequest: jest.fn(), getUserAgentFromRequest: jest.fn() }))

import { GET, DELETE } from '@/app/api/agents/[id]/route'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
// ... mockGetAuth / mockFindFirst ...
const ctx = { params: Promise.resolve({ id: 'agent-1' }) }   // params são Promise no Next 16
// assertar: res.status + que o where inclui { createdBy: 'owner-1' } (dono) ou { createdBy: undefined } (admin)
```
- Fixtures `OWNER`/`OTHER`/`ADMIN` (role `'user'` vs `'admin'`); `beforeEach(() => jest.clearAllMocks())`.
- Mockar `@/lib/audit` só quando a rota loga auditoria. Mockar `@/lib/prisma` declarando só os models/métodos que a rota usa.
- Rotas migradas p/ **`withAuth`** (`src/lib/with-auth.ts`) chamam `getAuthFromRequest` por baixo → mockar `getAuthFromRequest` basta.
- A lógica de dono real está em `src/lib/authz.ts` (`ownerId(auth)` → `auth.id` p/ user, `undefined` p/ admin). Os asserts batem nisso.

---

## Padrões e armadilhas (NÃO tropeçar)
- **`JWTPayload`** = `{ id, email, name, role, orgId? }`. Use `auth.id` (NÃO `auth.userId`).
- **Params do Next 16 são Promise:** `{ params }: { params: Promise<{ id: string }> }` + `await params`. Nos testes: `ctx = { params: Promise.resolve({ id }) }`.
- **Prisma singleton:** `import { prisma } from '@/lib/prisma'`. **Groq:** lazy init. Decimais Prisma: `Number()`.
- `testEnvironment` é **jsdom** (config atual) — os testes de rota existentes rodam assim mesmo importando `NextRequest`; seguir igual.

## Verificação (realidade desta máquina)
- ⛔ **jest NÃO roda local** (OneDrive `errno -4094`). **Escreva os testes mesmo assim** — o gate real passa a ser o CI (depois do passo 1). NÃO perca tempo tentando rodar `npm test` local; se quiser, só confirme que CADA `.test.ts` **compila** via typecheck.
- ✅ **typecheck:** `npm run typecheck` (= `node scripts/typecheck.mjs`) — tolera os 7 erros de deps opcionais (bullmq/e2b/@xterm/diff2html), falha em erro novo. Pega erros de tipo nos próprios `.test.ts`.
- ✅ **pre-commit gate (husky)** já ativo: typecheck bloqueia o commit; lint só reporta.
- Build Turbopack quebra no Windows+OneDrive (use `--webpack` se precisar buildar — provavelmente não precisa).

## Fechamento
- `git add` **só os arquivos da entrega** (o working tree tem deleções de logos `public/logo*.svg` e arquivos `??` em `docs/` que **NÃO são seus** — não commitar). Commit em inglês com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. **Sprint 5 não tem migração e não toca o DB de prod**, mas **pergunte antes de push** (push dispara deploy).
- Atualizar `docs/Refatoração/rafatoração.md` + memória `sofia_next_refactor_roadmap.md`. **Sprint 5 fecha o roadmap de refatoração** — marcar como concluído.
- **Parar no fim da entrega.** Não encadear.

## Pendências herdadas (NÃO bloqueiam o Sprint 5 — só registrar/validar se sobrar tempo)
- E2E autenticado em prod dos Sprints 0-4 com o usuário (gate real = login + fluxo afetado).
- **Validar a CSP do Sprint 4 em prod** (não testável local; ajustar allowlist se alguma página externa quebrar).
- Precondição de deploy ainda válida: `JWT_SECRET`/`CRON_SECRET` setados no EasyPanel (fail-closed desde o Sprint 0).
