# Sessão 6 — Refatoração sofia-next → **fechar item 1 do Sprint 4 (drop de modelos órfãos)** e depois **Sprint 5 (Testes)**

> **Cole este arquivo inteiro como primeiro prompt no chat novo.** Carrega o contexto e manda executar. Trabalhe em **português**, **1 entrega por sessão**, **não encadeie** automaticamente.

---

## Contexto do projeto
- **Projeto:** `sofia-next` (marca "Polaris IA") — SaaS multi-tenant de IA p/ atendimento WhatsApp, **em produção**.
- **Path:** `c:\Users\jeanz\OneDrive\Desktop\ROI Labs\Imob\sofia-next`
- **Stack:** Next.js 16 App Router (RSC-first) + Prisma 5 + PostgreSQL + Groq SDK. ~522 arquivos TS, 219 rotas de API, 60 modelos Prisma.
- **Deploy:** push na `main` (`github.com/JeanZorzetti/sofia-ia`) → auto-deploy EasyPanel/Docker em `polarisia.com.br`.
- **Roadmap completo:** `docs/Refatoração/rafatoração.md` (mesma pasta). Memória: `sofia_next_refactor_roadmap.md`.

## O que já foi feito (Sprints 0-4)
- **Sprint 0 (Segurança P0):** `36e91a6` — authz.ts, JWT/cron fail-closed, IDOR em ~25 rotas.
- **Sprint 1 (Arquitetura):** `198f4c7` — withAuth HOF, apiOk/apiError, zod, rate-limit/api-key consolidados.
- **Sprint 2 (Performance DB):** migração de índices `20260616140000_add_performance_indexes` (aplicada manual no host de prod).
- **Sprint 3 (Bundle/rendering):** optimizePackageImports, code-split, framer-motion cortado das públicas. SEM migração.
- **Sprint 4 (Hardening) — itens 2-5 DONE + pushed (2026-06-17):** security headers + CSP + remotePatterns restritos; helper `safeErrorMessage` anti-vazamento em 24 rotas; JWTPayload.orgId + middleware sem `as any`; gate husky pre-commit (typecheck bloqueante + lint advisory). **Item 1 (drop de órfãos) FOI DIAGNOSTICADO mas NÃO executado** — é a 1ª tarefa desta sessão.

---

## TAREFA 1 DESTA SESSÃO — **fechar Sprint 4 item 1: drop dos 4 modelos órfãos** ⚠️ TEM migração de PROD (irreversível)

### Diagnóstico já feito (NÃO repetir do zero — só validar)
Verificação um-a-um já concluída na Sessão 5. **4 órfãos REAIS** (zero `prisma.<model>`/`tx.<model>`, zero raw SQL, zero include):

| Modelo | Tabela (`@@map`) | Por que é órfão | Observação p/ o drop |
|---|---|---|---|
| `Campaign` | `campaigns` | Legado (→ `ThreadsCampaign`). Refs no código são interface local de frontend. | **É relação `User.campaigns Campaign[]`** (schema linha ~30) → remover a relação do model `User` também. |
| `WhatsappInstance` | `whatsapp_instances` | Legado. Instâncias vêm da **Evolution API** (`/api/instances` → `evolution-service`) + `AgentChannel.config`. | Sem relação de outro model. |
| `Workspace` | `workspaces` | Legado (→ `Organization`). Refs no código são texto de UI "workspace". | Sem relação de outro model. |
| `ComplianceLog` | `compliance_logs` | UI LGPD existe (`dashboard/settings/compliance/page.tsx`) mas as rotas `/api/settings/compliance/*` **NUNCA foram criadas** (404). | Sem relação. **Decisão do usuário: dívida morta, dropar** (NÃO preservar). Remover a UI órfã também (a página + o link no Sidebar/menu, se houver). |

**3 falsos-positivos JÁ descartados (NÃO dropar — são usados):** `DocumentEmbedding` (raw SQL pgvector, `document_embeddings`), `ABTestInteraction` (`include: { interactions }` em `ab-tests/[id]`), `ThreadsCampaignPost` (`include: { posts }` em `threads/campaigns`).

⚠️ **`ScheduledTeamRun` está EM USO** (não confundir).

### Passos do drop (disciplina de migração — lições `6g` + `sofia_next_db_push_runner_fails`)
1. **Revalidar** rapidamente os 4 órfãos com grep `(prisma|tx)\.<accessor>` + nome da tabela em raw SQL (caso algo tenha mudado).
2. **Confirmar o host de PROD atual** antes de qualquer coisa. CLAUDE.md cita `31.97.23.166:5499`; migrações recentes de Teams usaram `sofia_db@2.24.207.200:5435`. **Verificar qual é o real** (olhar `.env`/EasyPanel) — NÃO usar o `bot@31.97...` por engano.
3. **Precheck de contagem + OLHAR os dados** de cada tabela em prod (`SELECT count(*)` + amostra). Lição `6g`: na Sessão do SP6 acharam 10 orch "zero dados" que eram seed/demo — **sempre olhar antes de dropar**. Se houver dados de CLIENTE real, **parar e mostrar ao usuário** antes de prosseguir.
4. **Backup JSON** das 4 tabelas em `docs/superpowers/backups/` (timestamp no nome).
5. **Migração formal** `prisma migrate` (ex.: `20260617xxxxxx_drop_orphan_models`): remover os 4 models do `schema.prisma` + a relação `campaigns Campaign[]` do model `User`. Conferir FKs (dropar filhos→pai se houver).
6. **`migrate deploy` MANUAL no host real de prod ANTES do push** (o standalone do Next NÃO aplica migração no deploy). Verificar que as tabelas sumiram e que `teams`/`team_runs`/etc. continuam intactas.
7. Remover a **UI órfã do ComplianceLog** (página + link de menu).
8. `tsc` limpo (regenerar client antes: `npm run db:generate`). Commit + **perguntar antes de push**.

---

## TAREFA 2 (só depois de fechar a Tarefa 1, e se houver instrução) — **Sprint 5: Testes** 🟢
- **Testes de rota de API** para caminhos críticos: auth, **ownership (regressão do Sprint 0 — IDOR usuário A ≠ B → 404; admin acessa)**, agents, teams. Hoje: 11 arquivos de teste p/ 219 rotas (≈0 de rota).
- Subir coverage acima dos ~50% atuais nas áreas core.
- ⛔ **`jest` local NÃO roda** (corrupção do `node_modules` pelo OneDrive, `errno -4094`). **Escreva testes mesmo assim** — rodam em CI. Gate real = build EasyPanel + E2E em prod.

---

## Padrões e armadilhas (NÃO tropeçar)
- **`JWTPayload`** = `{ id, email, name, role, orgId? }`. Use `auth.id` (não `auth.userId`).
- **Params do Next 16 são Promise:** `{ params }: { params: Promise<{ id: string }> }` + `await params`.
- **Prisma singleton:** `import { prisma } from '@/lib/prisma'`. **Groq:** lazy init. Decimais Prisma: `Number()`.
- **Standalone do Next NÃO aplica migração no deploy** → migração formal + `migrate deploy` manual no host real. Tabela faltando quebra TODAS as reads (500).
- **Drop de tabela em prod:** SEMPRE precheck de contagem + OLHAR os dados antes (lição `6g`). FK: filhos→pai.

## Verificação (realidade desta máquina)
- ✅ **typecheck:** rode `npm run typecheck` (= `node scripts/typecheck.mjs`) — tolera os 7 erros de deps opcionais (bullmq/e2b/@xterm/diff2html), falha em qualquer erro novo. Antes, se mexeu no schema: `npm run db:generate`.
- ✅ **pre-commit gate (husky)** já ativo: typecheck bloqueia o commit; lint só reporta. Se aparecer erro de TS, o commit é barrado (é o objetivo).
- ⛔ **jest** não roda local. Build Turbopack quebra no Windows+OneDrive (use `--webpack` se precisar buildar).

## Fechamento
- `git add` **só os arquivos da entrega** (o working tree pode ter deleções de logos/docs e arquivos `??` que NÃO são seus — não commitar). Commit em inglês com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. **Pergunte antes de push** (é produção). Migração → aplicar no host de prod ANTES do push.
- Atualizar `docs/Refatoração/rafatoração.md` + memória `sofia_next_refactor_roadmap.md`.
- **Parar no fim da entrega.** Não encadear.

---
**Comando para começar:** "Use as superpowers. Leia este arquivo e execute a Tarefa 1 (drop dos modelos órfãos do Sprint 4) do sofia-next."
