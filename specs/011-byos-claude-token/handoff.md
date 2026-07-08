# Handoff — 011 BYOS (Token de Assinatura Claude por Usuário)

**Data:** 2026-07-08 · **Branch:** `011-byos-claude-token` · **Status:** implementação COMPLETA em código (T001–T022); falta o gate de deploy (T023–T025).

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

## Próximos passos (gate de deploy — em ordem, NÃO executados)

1. **T023 ⚠️ (Constituição III):** aplicar a migração MANUALMENTE no host real
   `2.24.207.200:5435` (NÃO o host do `.env`): `prisma migrate deploy`. **Antes de qualquer push.**
2. **T024:** commit + push `main` (deploy automático app + worker no EasyPanel); smoke `/api/health` 200 + login.
3. **T025:** E2E em produção conforme `quickstart.md` (cenários 1–4; o 5 já coberto por unit no script). Registrar evidência aqui.

## Pendências / decisões em aberto

- Migração ainda **não aplicada** (gate T023) — a tabela `user_claude_tokens` não existe em prod até isso.
- jest **não roda local** (OneDrive errno -4094 — confirmado nesta sessão); os testes T005/T014/T019 são validados no **CI**. Localmente: tsc limpo + `claude-override-verify.ts` verde.
- E2E de produção (cenário 2: run sem `[claude-pool]` no log + `last_used_at`) pendente até o deploy.

## Gotchas de ambiente

- `ENCRYPTION_KEY` deve existir nos **2 serviços** (app + worker) — mesma da WABA; já presente.
- O container do app tem o Claude CLI (o local-spawn do pool roda nos dois serviços) → `verifyClaudeToken` funciona no PUT.
- ALS **não cruza `after()`**: em `startTeamRun` o wrap é feito DENTRO do callback do `after()`, não em volta dele.
