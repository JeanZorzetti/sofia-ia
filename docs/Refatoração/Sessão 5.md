# Sessão 5 — Refatoração sofia-next → executar **Sprint 4 (Dívida técnica e hardening)**

> **Cole este arquivo inteiro como primeiro prompt no chat novo.** Ele carrega o contexto e manda executar o Sprint 4. Trabalhe em **português**, **1 sprint por sessão**, **não encadeie** automaticamente pro Sprint 5.

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
- **Sprint 2 (Performance DB) DONE (2026-06-16)** — N+1 analytics em lote (`src/lib/analytics/aggregate.ts`), streaming team-run estreito, batch ab-tests, ISR no marketplace, **migração de índices** `20260616140000_add_performance_indexes` (aplicada manual no host de prod).
- **Sprint 3 (Performance bundle/rendering) DONE (2026-06-16)** — **SEM migração.**
  - `next.config`: `optimizePackageImports` (recharts/framer-motion/react-syntax-highlighter/lucide-react) + alias `polyfill-module`→`src/lib/empty-polyfills.js` (turbopack **e** webpack).
  - Code-split `dynamic(ssr:false)`: monaco (`CodeEditor` em dashboard/files; `EditorEmptyState` extraído p/ `editor-empty-state.tsx`), recharts (4 componentes co-localizados: `DashboardActivityChart`, `SignupsSparkline`, `ABTestComparisonChart`, `AnalyticsCharts`). xterm/diff2html já eram dynamic.
  - framer-motion: `AnimatedSection`/`AnimatedCounter` → hook `src/hooks/use-in-view.ts` (IntersectionObserver) + CSS, API idêntica. Remove framer-motion de 8 das 9 páginas públicas.
  - **Deferido p/ ESTE sprint (ou Sessão posterior):** converter `ui/background-paths.tsx` + `ui/glowing-effect.tsx` (home) e os 9 componentes `orchestrations/flow-nodes/**` p/ remover framer-motion de vez; mover data-fetching de dashboards de `useEffect+fetch` → RSC+Suspense.

---

## TAREFA DESTA SESSÃO — **Sprint 4: Dívida técnica e hardening** 🟢
⚠️ **TEM migração de schema** (drop de modelos órfãos). Vale a disciplina de migração: `prisma migrate` formal + `migrate deploy` **manual no host real de produção ANTES do push**. Confirmar o host correto (CLAUDE.md cita `31.97.23.166:5499`; migrações recentes de Teams usaram `2.24.207.200:5435` — **verificar qual é o de produção atual antes de aplicar**).

1. **Modelos órfãos** — verificar **um a um** (NÃO confiar em lista de agente; `ScheduledTeamRun` está EM USO). Para cada modelo sem nenhum `prisma.<model>` em `src/`: **precheck de contagem + olhar os dados em prod** (lição `6g`: achamos seed/demo onde se supunha "zero dados") → backup JSON em `docs/superpowers/backups/` → migração formal de drop.
2. **Security headers no `next.config`** — CSP, `X-Frame-Options`, `X-Content-Type-Options`, HSTS (via `headers()`). **Restringir `images.remotePatterns`** (hoje `hostname: "**"` — aberto demais).
3. **Vazamento de erro** — parar de retornar `error.message` cru ao cliente em produção (dezenas de rotas). Padronizar mensagem genérica + log server-side.
4. **Type safety** — reduzir clusters de `as any` (ex.: `middleware.ts` `orgId` inexistente; `mcp`/`threads-api` ~33 ocorrências).
5. **Pre-commit hook (husky)** — `tsc --noEmit` + `lint` como gate antes de cada commit (fecha o loop de feedback local que hoje falta; lição `agent_teams_operating_playbook`).

**Sugestão de ordem:** comece pelos itens SEM migração e de menor risco (2 → 5 → 3 → 4) e deixe **modelos órfãos (1)** por último, com toda a disciplina de migração + backup. Se ficar grande, feche um subconjunto e deixe o resto pra Sessão 6.

> **Não-obrigatório, mas se sobrar tempo barato:** os follow-ups deferidos do Sprint 3 (framer-motion em background-paths/glowing-effect/flow-nodes; RSC+Suspense no dashboard inicial). NÃO é o foco do Sprint 4.

> **Limpeza "Orchestration"→"Teams" (copy/i18n/eventos `first_orchestration_*`/chave `orchestrationsExecuted`)** é **SEO-sensível** — sem find-replace cego. Pode ficar pra um sprint dedicado de conteúdo; só faça aqui se for trivial e seguro.

---

## Padrões e armadilhas (NÃO tropeçar)
- **`JWTPayload`** = `{ id, email, name, role }`. Use `auth.id` (não `auth.userId`).
- **Params do Next 16 são Promise:** `{ params }: { params: Promise<{ id: string }> }` + `await params`.
- **Prisma singleton:** `import { prisma } from '@/lib/prisma'`. **Groq:** lazy init. Decimais Prisma: `Number()`.
- **Standalone do Next NÃO aplica `db push`/migração no deploy** (lição `sofia_next_db_push_runner_fails`) → migração formal + `migrate deploy` manual no host real. Coluna/tabela nova faltando quebra TODAS as reads da tabela (500).
- **Drop de tabela em prod:** SEMPRE precheck de contagem + olhar os dados antes (lição `6g`). FK: dropar filhos→pai.

## Verificação (realidade desta máquina)
- ✅ **`tsc --noEmit`** funciona — mas **rode antes** `node node_modules/prisma/build/index.js generate` (o `npx prisma` não resolve aqui). Sobram **7 erros pré-existentes** (deps opcionais: `bullmq`, `e2b`, `@xterm/xterm`/`@xterm/addon-fit`, `diff2html`) — **ignore, mas garanta que não adicione erros novos**.
- ⛔ **`jest` local NÃO roda** — corrupção do `node_modules` pelo OneDrive (`errno -4094`). Escreva testes mesmo assim (rodam em CI). **Gate real = build EasyPanel + E2E em prod.**
- Build local com Turbopack quebra no Windows+OneDrive — se precisar buildar, considere `--webpack`.

## Fechamento
- `git add` **só os arquivos do sprint** (pode haver mudanças não relacionadas no working tree — deleções de logos/docs que NÃO são suas). Commit em inglês com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. **Pergunte antes de push** (é produção). Se houver migração, **aplicar no host de prod ANTES do push**.
- Atualizar `docs/Refatoração/rafatoração.md` (Sprint 4 → DONE) e a memória `sofia_next_refactor_roadmap.md`.
- Criar `docs/Refatoração/Sessão 6.md` (handoff p/ Sprint 5 — Testes).
- **Parar no fim do Sprint 4.** Não começar o Sprint 5.

---
**Comando para começar:** "Use as superpowers. Leia este arquivo e execute o Sprint 4 da refatoração do sofia-next."
