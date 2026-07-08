# Tasks: BYOS — Token de Assinatura Claude por Usuário

**Input**: Design documents from `/specs/011-byos-claude-token/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/claude-token-api.md, quickstart.md

**Tests**: INCLUÍDOS — a constituição exige testes de auth/IDOR em rotas sensíveis (CI gate jest; jest NÃO roda local — OneDrive errno -4094).

**Organization**: agrupado por user story (US1–US4 da spec), independentes e testáveis por fase.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup (schema)

- [X] T001 Add `UserClaudeToken` model (tabela `user_claude_tokens`, 1:1 User, cascade — ver data-model.md) + relação `claudeToken UserClaudeToken?` no model User em `prisma/schema.prisma`; rodar `npx prisma generate`
- [X] T002 Criar migração formal versionada (padrão da casa: `npx prisma migrate dev --create-only --name user_claude_tokens` ou SQL manual consistente) em `prisma/migrations/` — NÃO aplicar em produção agora (gate T023)

---

## Phase 2: Foundational (bloqueia todas as stories)

- [X] T003 [P] Criar helper ALS puro `src/lib/ai/claude-token-override.ts`: `runWithClaudeToken<T>(token, fn)` + `currentClaudeTokenOverride(): string | undefined` (AsyncLocalStorage; zero deps; NÃO tocar `claude-token-pool.ts`)
- [X] T004 [P] Criar service `src/lib/settings/claude-token-service.ts`: normalização (trim/newlines), validação de formato (`sk-ant-oat`, sem whitespace interno, len > 20), máscara (10 primeiros + "..." + 4 últimos), `encrypt/decrypt` via `src/lib/crypto.ts`, upsert/getMetadata/delete via `import { prisma } from '@/lib/prisma'` (select explícito NUNCA retorna `encryptedToken` no metadata)
- [X] T005 [P] Testes unitários dos módulos puros: `src/__tests__/lib/claude-token-override.test.ts` (propagação ALS pela árvore async; fora de contexto → undefined; contextos aninhados/concorrentes isolados) e `src/__tests__/lib/claude-token-service.test.ts` (normalização, formato, máscara)

**Checkpoint**: `npx tsc --noEmit` limpo; base pronta para as stories

---

## Phase 3: User Story 1 — Cadastrar token e rodar com a própria assinatura (P1) 🎯 MVP

**Goal**: usuário cadastra o token (verificado ativamente) e seus runs passam a usar a assinatura dele.

**Independent Test**: quickstart cenários 1 e 2 (cadastro com verificação; run sem `[claude-pool]` no log e `last_used_at` atualizado).

- [X] T006 [US1] Implementar `verifyClaudeToken(token)` em `src/lib/settings/claude-token-service.ts`: chamada mínima via `ClaudeCliService.generate` (prompt "responda OK", timeout curto, 1 turno) mapeando resultados → `ok | token_rejected | token_rate_limited | verification_unavailable` (usar `isClaudeRateLimit` do pool p/ distinguir limite; contrato R4)
- [X] T007 [US1] Criar rota `src/app/api/settings/claude-token/route.ts` — GET (metadata/máscara, contrato) e PUT (zod body `{token}`; normaliza → valida formato (400) → verifica (422/503) → criptografa → upsert → audit `claude_token.created|rotated`); `getAuthFromRequest()` → `auth.id` (padrões da constituição IV)
- [X] T008 [P] [US1] Criar página `src/app/dashboard/settings/claude/page.tsx`: instruções numeradas (`claude setup-token` + aviso "trate como senha"), campo tipo password, card de status (máscara, `createdAt`, `lastVerifiedAt`, `lastUsedAt`), estados de erro do contrato (400/422/503); registrar entrada na navegação de settings existente
- [X] T009 [US1] Implementar `resolveOwnerClaudeToken(userId)` no service (SELECT do ciphertext → decrypt → string | null; erro de decrypt → null + `console.warn` sem o valor)
- [X] T010 [US1] Worker: em `src/worker/index.ts`, no handler do job de run, resolver dono via `run.team.userId` → se houver token, envolver a execução com `runWithClaudeToken(token, ...)` + update fire-and-forget de `last_used_at` (1× por run)
- [X] T011 [US1] Demais entrypoints de execução: `grep` por callers de `runTeam`/`runTeamGraph`/`runTeamAndWait` (companies executor em `src/lib/companies/`, dispatch de squads, scheduled runs, API pública v1, dev-chat) e aplicar o MESMO wrap de T010 onde a execução inicia — dono conforme research R1 (Team.userId; Company.userId)
- [X] T012 [US1] Override no call site do sandbox: `src/lib/orchestration/team/code-agent.ts` (~L202) — `currentClaudeTokenOverride()` presente → chamar `runClaudeInSandbox` DIRETO com o token do usuário (tentativa única, sem `withClaudeTokenFailover`), preservando o throw de `ClaudeRateLimitError`; ausente → código atual byte-idêntico
- [X] T013 [US1] Override no call site local-spawn: `src/lib/ai/groq.ts` (~L361) — mesma semântica de T012 no caminho `ClaudeCliService.generate`
- [X] T014 [P] [US1] Testes de rota (constituição V): `src/__tests__/integration/claude-token-ownership.test.ts` — 401 sem auth; GET nunca contém o valor/ciphertext; PUT 400 formato; escopo por `auth.id` (usuário A não afeta B); audit chamado

**Checkpoint**: US1 funcional — cadastro verificado + run com assinatura própria

---

## Phase 4: User Story 2 — Sem token, comportamento byte-idêntico (P1)

**Goal**: garantia de não-regressão (constituição II) — sem token cadastrado, nada muda.

**Independent Test**: quickstart cenário 3 + script de verificação sem rede/DB.

- [X] T015 [P] [US2] Criar `scripts/claude-override-verify.ts` (padrão `scripts/claude-pool-verify.ts`): sem override → `withClaudeTokenFailover` com a MESMA sequência de tentativas/cooldowns de hoje; com override → exatamente 1 tentativa com o token do usuário e pool/cooldown INTOCADOS; override + saída de limite → `ClaudeRateLimitError`
- [X] T016 [US2] Revisão de regressão: diff de `code-agent.ts` e `groq.ts` prova caminho default inalterado (override ausente = fluxo antigo); rodar `npx tsc --noEmit` + suite jest no CI verde

**Checkpoint**: regressão zero comprovada por script + CI

---

## Phase 5: User Story 3 — Rotacionar e remover (P2)

**Goal**: higiene de credencial — substituir e apagar com auditoria.

**Independent Test**: quickstart cenário 4 (rotação atômica; remoção volta ao pool).

- [X] T017 [US3] DELETE em `src/app/api/settings/claude-token/route.ts`: apaga a linha (valor irrecuperável), 200 `{configured:false}` / 404 sem token; audit `claude_token.deleted`; confirmar PUT-rotação atômico (verify ANTES do write; falha → token antigo intacto)
- [X] T018 [US3] UI em `src/app/dashboard/settings/claude/page.tsx`: ações rotacionar (reusa campo+PUT) e remover (confirmação explícita); máscara/estado atualizam sem reload
- [X] T019 [P] [US3] Estender `src/__tests__/integration/claude-token-ownership.test.ts`: rotação com token rejeitado mantém o antigo; DELETE → GET `configured:false`; DELETE sem token → 404

**Checkpoint**: ciclo de vida completo do token

---

## Phase 6: User Story 4 — Falha do token comunicada com clareza (P2)

**Goal**: token que morre DEPOIS do cadastro falha o run com mensagem acionável; rate limit cai na resiliência 007/008 identificando a credencial do usuário.

**Independent Test**: quickstart cenário 5.

- [X] T020 [US4] Mensagens de runtime: quando override presente e o CLI falha por auth (não rate limit), o erro do run deve apontar "token da sua assinatura Claude não foi aceito — atualize em /dashboard/settings/claude" (mapear no ponto onde `code-agent.ts`/`groq.ts` formatam o erro; rate_limited existente ganha sufixo identificando "assinatura do usuário" — read-side, sem tocar coordinator/resiliência)
- [X] T021 [P] [US4] Cenário no `scripts/claude-override-verify.ts`: override + rate limit → `ClaudeRateLimitError` propaga intacto (caminho 007/008 `rate_limited`+`resetAt` preservado)

**Checkpoint**: todas as stories funcionais

---

## Phase 7: Polish & Deploy

- [X] T022 [P] Docs: nota BYOS em `docs/Claude/POLARIS-TOKEN-POOL.md` (override por usuário tem precedência sobre o pool; sem fallback) e criar `specs/011-byos-claude-token/handoff.md` (feito/decisões/pendências/gotchas)
- [ ] T023 ⚠️ GATE (Constituição III): aplicar a migração MANUALMENTE no host real — `prisma migrate deploy` contra `2.24.207.200:5435` (NÃO o host do `.env`) — ANTES de qualquer push
- [ ] T024 Commit + push `main` (deploy automático app + worker no EasyPanel); smoke: `/api/health` 200 e login ok
- [ ] T025 Validação E2E em produção conforme `quickstart.md` (cenários 1–4 no mínimo; 5 por unit no script) e registrar evidência no handoff (constituição: verificação antes de concluir)

---

## Dependencies & Execution Order

- **Phase 1 → 2 → 3**: T001–T002 primeiro (schema/client); T003–T005 paralelos entre si; US1 depende de todos.
- **US1 interno**: T006 → T007 → (T008 ∥ T014); T009 → T010 → T011; T012 ∥ T013 após T003; checkpoint precisa de tudo.
- **US2 (T015–T016)**: depende de T012/T013 existirem. **US3 (T017–T019)**: depende de T007/T008. **US4 (T020–T021)**: depende de T012/T013.
- **Phase 7**: T022 [P] a qualquer momento após US1; T023 → T024 → T025 estritamente nesta ordem.
- US2/US3/US4 são independentes entre si (arquivos distintos, exceto route.ts/page.tsx compartilhados entre US1/US3 — sequenciar).

## Parallel Example: após Phase 2

```text
Dev A: T006–T007 (service verify + rota)     | Dev B: T008 (UI) + T014 (testes rota)
Dev C: T009–T011 (entrypoints)               | Dev D: T012–T013 (call sites) → T015 (script)
```

## Implementation Strategy

**MVP = Phase 1 + 2 + 3 (US1) + T015/T016 (US2 é gate de deploy, não opcional na prática)** → validar quickstart 1–3 → só então US3/US4 → Phase 7. Commits por grupo lógico; deploy exige o gate T023 ANTES do push.
