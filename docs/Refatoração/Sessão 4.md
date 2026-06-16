# Sessão 4 — Refatoração sofia-next → executar **Sprint 3 (Performance: bundle e rendering)**

> **Cole este arquivo inteiro como primeiro prompt no chat novo.** Ele carrega o contexto e manda executar o Sprint 3. Trabalhe em **português**, **1 sprint por sessão**, **não encadeie** automaticamente pro Sprint 4.

---

## Contexto do projeto
- **Projeto:** `sofia-next` (marca "Polaris IA") — SaaS multi-tenant de IA p/ atendimento WhatsApp, **em produção**.
- **Path:** `c:\Users\jeanz\OneDrive\Desktop\ROI Labs\Imob\sofia-next`
- **Stack:** Next.js 16 App Router (RSC-first) + Prisma + PostgreSQL + Groq SDK. ~522 arquivos TS, 219 rotas de API, 60 modelos Prisma.
- **Deploy:** push na `main` (`github.com/JeanZorzetti/sofia-ia`) → auto-deploy EasyPanel/Docker em `polarisia.com.br`.
- **Roadmap completo:** `docs/Refatoração/rafatoração.md` (mesma pasta). Memória: `sofia_next_refactor_roadmap.md`.

## O que já foi feito
- **Sprint 0 (Segurança P0) DONE + pushed main (commit `36e91a6`)** — `src/lib/authz.ts`, JWT/cron fail-closed, IDOR fechado em ~25 rotas.
- **Sprint 1 (Arquitetura) DONE (commit `198f4c7`)** — `with-auth.ts` (HOF), `api-response.ts` (helpers, rotas não migradas), `validation.ts` (zod), `rate-limit.ts` e `api-key-auth.ts` consolidados.
- **Sprint 2 (Performance DB) DONE (2026-06-16)** — **TINHA migração de índices.**
  - **N+1 analytics:** `analytics/agents` e `analytics/workflows` reescritos com queries em lote (`groupBy`/`findMany distinct`/`_avg`). Novo helper puro **`src/lib/analytics/aggregate.ts`** (`countByKey`, `nestedCount`, `responseTimeByAgent`, `avgOrZero`, `rate`, `round2`) com testes — **reusar** se mexer em analytics. Forma de resposta e números preservados.
  - **Streaming team-run** (`teams/[id]/runs/[runId]/stream`): tick agora busca run+tasks com `select` estreito + SÓ mensagens novas (`teamMessage.findMany skip:lastMsgCount`, ordem estável `createdAt`+`id`). Coordinator/SSE intocados.
  - **Batch lookups** em `ab-tests` GET (Map de nomes).
  - **ISR:** `src/app/(public)/marketplace/page.tsx` ganhou `revalidate=3600` (catálogo público). Analytics ficou dynamic (autenticado/por-usuário — NÃO pode ISR).
  - **Índices** (migração `20260616140000_add_performance_indexes`): `leads(assigned_to)`, `agents(knowledge_base_id)`, `team_tasks(assignee_id)`, `conversations(agent_id,status)`, `messages(conversation_id,sent_at)`. **Lição confirmada:** índice NÃO altera o Prisma client → push antes de aplicar não quebra (só não dá o ganho). Mesmo assim, a disciplina foi seguida (aplicar no host de prod).

---

## TAREFA DESTA SESSÃO — **Sprint 3: Performance de bundle e rendering** 🟡
✅ **SEM migração de schema neste sprint.** Trabalho de client/build, não de banco.

1. **`next.config`** — adicionar `experimental.optimizePackageImports` para libs grandes (`recharts`, `framer-motion`, `react-syntax-highlighter`, `lucide-react` se ainda não estiver) + **alias de `polyfill-module` para vazio** (problema conhecido da org: Next embute core-js ignorando browserslist → PageSpeed acusa "legacy JS"). Ver lição `nextjs_unconditional_polyfills` (alias precisa valer p/ **turbopack E webpack**).
2. **Code-split client-only de libs pesadas** via `dynamic(() => import(...), { ssr: false })`: `@monaco-editor/react`, `@xterm/xterm` + `@xterm/addon-fit`, `diff2html`, `recharts`. **Cuidado:** essas 4 são exatamente as deps opcionais não instaladas que geram os 7 erros de `tsc` pré-existentes — confirmar que o code-split não quebra o build quando a dep existe em prod.
3. **Avaliar remoção do `framer-motion`** (~13 usos) → CSS / `tailwindcss-motion` (já instalado) / padrão `Reveal` (IntersectionObserver+CSS) usado no Estetia. Não é obrigatório fechar tudo; medir o ganho de bundle e cortar onde for barato.
4. Conferir mais candidatos a **ISR/RSC** em páginas públicas de marketing que ainda fazem trabalho client à toa.

**Sugestão de ordem:** comece pelo `next.config` (1) — é o de maior ganho e menor risco — depois code-split (2), depois framer-motion (3). Se ficar grande, feche um subconjunto e deixe o resto pra Sessão 5.

---

## Padrões e armadilhas (NÃO tropeçar)
- **`JWTPayload`** = `{ id, email, name, role }`. Use `auth.id` (não `auth.userId`).
- **Params do Next 16 são Promise:** `{ params }: { params: Promise<{ id: string }> }` + `await params`.
- **Prisma singleton:** `import { prisma } from '@/lib/prisma'`. **Groq:** lazy init. Decimais Prisma: `Number()`.
- Ao tocar uma rota que ainda tem o bloco de auth manual, **aproveite e migre pro `withAuth`** (incremental).
- **Lighthouse local NÃO é confiável** nesta máquina (Win+OneDrive, ±30%) — medir bytes/visual local, score real só na prod VPS. Ver lição `lighthouse_local_windows_onedrive_unreliable`.

## Verificação (realidade desta máquina)
- ✅ **`tsc --noEmit`** funciona — mas **rode antes** `node node_modules/prisma/build/index.js generate` (o `npx prisma` não resolve aqui). Sobram **7 erros pré-existentes** (deps opcionais: `bullmq`, `e2b`, `@xterm/xterm`/`@xterm/addon-fit`, `diff2html`) — **ignore, mas garanta que o code-split não adicione erros novos**.
- ⛔ **`jest` local NÃO roda** — corrupção do `node_modules` pelo OneDrive (`errno -4094`). Escreva testes mesmo assim (rodam em CI). **Gate real = build EasyPanel + E2E em prod.**
- Build local com Turbopack quebra no Windows+OneDrive em outros projetos da org — se precisar buildar, considere `--webpack`.

## Follow-ups deferidos (não obrigatórios neste sprint)
- **Remover fallback plaintext de api-key** (Sprint 1) — só após backfill de `keyHash` cobrir as chaves ativas.
- **Continuar migração pro `withAuth`** nas ~147 rotas restantes (incremental).
- **Migrar envelopes pro `apiOk`/`apiError`** por grupo, conferindo o front.

## Fechamento
- `git add` **só os arquivos do sprint** (pode haver mudanças não relacionadas no working tree — deleções de logos/docs que NÃO são suas). Commit em inglês com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. **Pergunte antes de push** (é produção).
- Atualizar `docs/Refatoração/rafatoração.md` (Sprint 3 → DONE) e a memória `sofia_next_refactor_roadmap.md`.
- Criar `docs/Refatoração/Sessão 5.md` (handoff p/ Sprint 4 — Dívida técnica e hardening).
- **Parar no fim do Sprint 3.** Não começar o Sprint 4.

---
**Comando para começar:** "Use as superpowers. Leia este arquivo e execute o Sprint 3 da refatoração do sofia-next."
