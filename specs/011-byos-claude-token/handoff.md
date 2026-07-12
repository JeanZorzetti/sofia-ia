# Handoff — 011 BYOS (Token de Assinatura Claude por Usuário)

**Data:** 2026-07-08 (atualizado 2026-07-12) · **Branch:** `main` · **Status:** ✅ FEATURE COMPLETA E VALIDADA EM PRODUÇÃO (T001–T025, 25/25).

## O que foi feito (T001–T022)

| Task | Entrega |
|------|---------|
| T001–T002 | Model `UserClaudeToken` (`user_claude_tokens`, 1:1 User cascade) em `prisma/schema.prisma` + `prisma generate`; migração formal em `prisma/migrations/20260708120000_user_claude_tokens/migration.sql` (**não aplicada** — gate T023) |
| T003 | `src/lib/ai/claude-token-override.ts` — ALS puro (`runWithClaudeToken` / `currentClaudeTokenOverride`), zero deps, não toca o pool |
| T004/T006/T009 | `src/lib/settings/claude-token-service.ts` — normalize/format/mask (puros), `verifyClaudeToken`, encrypt/upsert/getMetadata/delete, `resolveOwnerClaudeToken`, `runWithOwnerClaudeToken` |
| T005 | `src/__tests__/lib/claude-token-override.test.ts` + `claude-token-service.test.ts` |
| T007 | `src/app/api/settings/claude-token/route.ts` — GET/PUT/DELETE (auth.id, zod, verify→encrypt→upsert, audit) |
| T008/T018 | `src/app/dashboard/settings/claude/page.tsx` (instruções, campo password, status, rotacionar/remover) + card na hub `settings/page.tsx` |
| T010/T011 | Wrap `runWithOwnerClaudeToken` em `src/worker/index.ts` (code-runs), `startTeamRun` (chat), `executeTeamRunInline` (Companies/Squads/Workflows) e `team-dispatch.ts` (retomada 007/008 de chat-run). Cobre TODOS os call sites de `runTeamByTopology` (grep) |
| T012/T013/T020 | Override nos 2 call sites: `code-agent.ts` (~L189/L202) e `groq.ts` (~L361); mensagens de auth/rate-limit identificando a assinatura do usuário |
| T014/T019 | `src/__tests__/integration/claude-token-ownership.test.ts` — 401, write-only, escopo por auth.id, formato, rotação, delete, audit |
| T015/T021 | `scripts/claude-override-verify.ts` — **3/3 passam** (sem override→failover; override→1 tentativa; override+limite→`ClaudeRateLimitError`) |
| T016 | `npx tsc --noEmit` **limpo (EXIT=0)**; caminho default byte-idêntico (comprovado pelo script) |
| T022 | Nota BYOS em `docs/Claude/POLARIS-TOKEN-POOL.md` + este handoff |

## Decisões (e por quê)

- **Owner = `Team.createdBy`** (não `TeamRun.userId`, que não existe): a validação de ownership atual já garante que só o dono dispara seus Teams (research R1). Sem migração em `TeamRun`.
- **ALS (AsyncLocalStorage)** para injetar o token: propaga pela árvore async do run sem tocar o coordinator (Constituição II). Descartado threading por options (parte montada no coordinator) e env var por processo (race entre runs).
- **Gate do path nativo** em `code-agent.ts` agora inclui `|| tokenOverride` — senão um usuário com token numa plataforma **sem pool** cairia no @RUN proxy (quebrado p/ CLI). Byte-idêntico quando override ausente.
- **`verifyClaudeToken`** reusa `ClaudeCliService.generate` (adicionei param opcional `timeoutMs`, default 20 min = byte-idêntico p/ callers atuais). Heurística: conteúdo vazio = `token_rejected` (o CLI não tem exit "auth failed" distinto — ver `ponytail:` no service).
- **Sem fallback ao pool** com override (FR-008): rate limit → `ClaudeRateLimitError` (007/008); auth → run falha apontando settings.

## Gate de deploy — EXECUTADO (07-08)

1. **T023 ✅:** migração `20260708120000_user_claude_tokens` aplicada no host real `2.24.207.200:5435` via `prisma migrate deploy` ("All migrations have been successfully applied.").
2. **T024 ✅:** commit `690f00a` + push `main`; deploy automático app + worker no EasyPanel.
3. **T025 ✅:** E2E em produção VALIDADO pelo Jean (07-08): login Google OK após fix `7996714` (redirect via `NEXT_PUBLIC_APP_URL`, não `request.url`); cadastro/verificação do token OK; run com a assinatura própria editou e deu push no `repo-de-teste` (confirmado via `git pull`).

## Pendências / decisões em aberto

- **NÃO-BYOS:** o preview (dev server Lovable-style pós-run) não subiu no E2E — fix lazy porta-fixa em `bea383d`; falta setar `VPS_PREVIEW_URL`/`VPS_PREVIEW_PORT` + subdomínio EasyPanel→worker (manual, Jean).
- jest **não roda local** (OneDrive errno -4094); os testes T005/T014/T019 são validados no **CI**. Localmente: tsc limpo + `claude-override-verify.ts` verde.

## Gotchas de ambiente

- `ENCRYPTION_KEY` deve existir nos **2 serviços** (app + worker) — mesma da WABA; já presente.
- O container do app tem o Claude CLI (o local-spawn do pool roda nos dois serviços) → `verifyClaudeToken` funciona no PUT.
- ALS **não cruza `after()`**: em `startTeamRun` o wrap é feito DENTRO do callback do `after()`, não em volta dele.
