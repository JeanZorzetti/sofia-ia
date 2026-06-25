# Quickstart — Validação E2E dos Squads por Case de Uso

Gate real do projeto: **E2E autenticado em produção** (EasyPanel + login). Roteiro mínimo para validar as
user stories da spec. Pré-requisito: a migração `add_team_company_id` aplicada **manualmente no host real**
`2.24.207.200:5435` (Princípio III) ANTES do deploy.

## Pré-flight
1. `prisma migrate deploy` no host real → confirmar coluna `teams.company_id` + índice criados.
2. Deploy no EasyPanel; `prisma generate` rodou antes do `next build`.
3. Login em `polarisia.com.br` como `admin@roilabs.com.br`.

## US4 — Decompor a ROI Labs em squads (seed)
1. Abrir a empresa **ROI Labs** em `/dashboard/empresas/[companyId]` → aba **Squads**.
2. Clicar **"Gerar squads do nicho"** (chama `POST …/squads/seed`).
3. **Esperado**: ≥3 squads criados (`feature`, `hotfix`, `discovery`, …), cada um referenciando agentes do
   roster existente (verificar que **nenhum agente foi duplicado** no pool em `/agentes`). Reexecutar o seed
   → **0 novos** (idempotente). ✅ SC-006.

## US1 — Rodar um squad enxuto (o coração)
1. No squad **"Feature nova"**, clicar **"Rodar"** e informar uma `mission` (ex.: "criar endpoint /health").
2. **Esperado**: inicia um `TeamRun` ativando **apenas** os membros do squad (≤4 agentes) — confirmar no
   timeline do run que nenhum outro cargo da empresa participou. ✅ SC-001, FR-003.
3. Editar um agente do pool (ex.: nome) em `/agentes` → reabrir o squad → a mudança reflete (referência, não
   cópia). ✅ FR-001.

## US2 — `/empresas` separada de `/agentes`
1. `/dashboard/empresas` lista empresas como guarda-chuva; entrar numa mostra os squads como **cards de
   "Rodar"** com nome + useCase. ✅ FR-005.
2. `/dashboard/agents` mostra o **pool** de definições (catálogo), não os squads. ✅ FR-006.
3. Disparar um case de uso a partir do card em **≤3 cliques**. ✅ SC-004.

## US3 — WIP=1 e fila (proteção do pool)
1. Com um squad já `running`, disparar **outro** squad imediatamente.
2. **Esperado**: o 2º run fica **`pending` (na fila)** — `POST …/run` responde `queued:true`; o painel de
   fila (`GET /api/squad-runs/queue`) mostra `running` (1) + `queue` (o 2º). **Nunca** 2 `running`. ✅ SC-003.
3. Quando o 1º conclui, o dispatcher promove o 2º automaticamente (ou via cron `drain-squad-queue`). ✅ FR-009.
4. **Resiliência (008)**: forçar/aguardar esgotamento de pool num run → status `rate_limited` + `resetAt`; a
   fila **não** dispara o próximo até o reset; o cron `resume-blocked-teams` retoma. ✅ FR-010.

## Regressão — coordinator intocado (Princípio II)
1. Rodar um **Time avulso** existente (sem `companyId`) em `/dashboard/teams` → comportamento **idêntico** ao
   de antes (não entra na fila de squads, não sofre o gate). ✅ FR-011, SC-005.
2. Rodar a empresa pelas **fases SDLC** (`runCompany`, ação opcional) → continua funcionando. ✅ runCompany
   preservado.

## Critério de pronto
- [ ] Migração aplicada no host real + deploy verde.
- [ ] US1–US4 validadas em produção (autenticado).
- [ ] Gate de fila: teste de concorrência prova `count(running squad-runs) ≤ 1`.
- [ ] `handoff.md` criado em `specs/009-usecase-squads/`.
