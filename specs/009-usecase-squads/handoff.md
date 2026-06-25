# Handoff — F009 Squads por Case de Uso

**Data**: 2026-06-25  
**Status**: SHIPPED — TypeScript limpo, migração pendente de aplicação manual no host.

---

## O que foi feito

### Fase 1-2: Schema + Migração
- `prisma/schema.prisma`: campo `companyId String?` adicionado ao model `Team` + back-relation `teams Team[]` em `Company`.
- `prisma/migrations/20260625000000_add_team_company_id/migration.sql`: DDL gerado (ADD COLUMN + FK + INDEX).
- **PENDENTE CRÍTICO**: `prisma migrate deploy` NÃO foi aplicado no host real `2.24.207.200:5435`. Deve ser executado ANTES do próximo push.

### Fase 3-4: Validação + Domínio
- `src/lib/validation.ts`: schemas Zod `createSquadSchema`, `patchSquadSchema`, `runSquadSchema`.
- `src/lib/companies/squad-store.ts`: CRUD completo de squads (`listSquadsByCompany`, `getSquadForOwner`, `createSquad`, `patchSquad`, `deleteSquad`) + `resolveCompanyForOwner`.

### Fase 5: Queue WIP=1 + Hardening
- `src/lib/companies/squad-queue.ts`: `enqueueSquadRun`, `dispatchSquadQueue` (com `pg_advisory_xact_lock` atômico via `claimNextRun`), `getSquadQueueState`.
- `src/app/api/companies/[id]/squads/route.ts`: GET + POST.
- `src/app/api/companies/[id]/squads/[squadId]/route.ts`: GET + PATCH + DELETE.
- `src/app/api/companies/[id]/squads/[squadId]/run/route.ts`: POST enqueue + `after(dispatchSquadQueue)`.
- `src/app/api/squad-runs/queue/route.ts`: GET estado global da fila.
- `src/app/api/cron/drain-squad-queue/route.ts`: POST cron drain (CRON_SECRET).

### Fase 6: UI + Rotas
- `src/components/dashboard/squads/`: `SquadCard`, `SquadRunButton`, `SquadComposer`, `QueuePanel`, `EmpresaDetailView`.
- `src/app/dashboard/empresas/page.tsx` + `src/app/dashboard/empresas/[companyId]/page.tsx`: novas páginas.
- `src/app/dashboard/agents/page.tsx`: refatorado para catálogo de pool (sem Empresas).
- `src/components/polaris/Sidebar.tsx`: `/empresas` (Empresas) + `/agents` (Agentes) separados.
- `src/components/dashboard/companies/CompaniesGallery.tsx`: prop `empresasBasePath` para backward compat.

### US4 Blueprints + Seed
- `src/lib/companies/squad-blueprint.ts`: 5 blueprints `software_house` (feature, hotfix, discovery, security_audit, data_pipeline).
- `src/lib/companies/squad-roster.ts`: `validateSquadBlueprint` + `buildSquadRoster` (puro, testável).
- `src/app/api/companies/[id]/squads/seed/route.ts`: POST idempotente por `squadKey`.
- `scripts/seed-roi-labs-squads.ts`: script de seed da ROI Labs.

### Testes
- `tests/unit/squad-store.test.ts`: predicado + schemas Zod.
- `tests/unit/squad-create.test.ts`: validateSquadComposition regras de domínio.
- `tests/unit/squad-queue.test.ts`: WIP=1 invariantes (mockam `$transaction`).
- `tests/unit/squad-roster.test.ts`: validateSquadBlueprint + buildSquadRoster.
- `tests/integration/squads-create-run.route.test.ts`: IDOR/auth POST /squads + POST /run.
- `tests/integration/squads-list.route.test.ts`: IDOR/auth GET /squads.
- `tests/integration/squad-queue-wip.route.test.ts`: 2º run retorna `queued:true`.
- **Todos passam no CI** (jest não roda local — OneDrive errno -4094).

---

## Decisões importantes

| Decisão | Por quê |
|---------|---------|
| Squad = Team com `companyId != null` | Zero tabela nova; reutiliza coordinator (Princípio II) |
| WIP=1 via `pg_advisory_xact_lock` | Atomicidade real entre instâncias sem coluna de lock |
| `after()` do Next.js para dispatch | Resposta 202 imediata; execução async no background |
| `squadKey` em `Team.config JSON` | Sem coluna extra; idempotência pelo campo flexível |
| Sidebar separada: `/empresas` + `/agents` | Clareza de purpose: squads vs pool catalog |

---

## Próximos passos (em ordem)

1. **CRÍTICO — aplicar migração**: no host real (`2.24.207.200:5435`):
   ```bash
   DATABASE_URL='postgresql://...' npx prisma migrate deploy
   ```
2. **Seed da ROI Labs**: após migração:
   ```bash
   ROI_LABS_COMPANY_ID='<uuid>' DATABASE_URL='...' npx tsx scripts/seed-roi-labs-squads.ts
   ```
3. **Cron de drain**: registrar `POST /api/cron/drain-squad-queue` no cron-job.org (a cada 5 min, header `x-cron-secret`).
4. **E2E prod** (T036): login → `/dashboard/empresas` → selecionar ROI Labs → aba Squads → "Rodar" → verificar 202 → aba Fila → confirmar status.
5. **SC-002 baseline** (T034): medir `tokensUsed`/`turnsUsed` de squad-run vs CompanyRun na mesma tarefa.

---

## Pendências / Gotchas

- **Rotacionar senha PG**: senha do host `2.24.207.200:5435` está exposta. Rotacionar antes do próximo ciclo.
- `CompaniesGallery` legada (`/dashboard/agents`): ainda navega para `/dashboard/agents/empresa/[id]` — a rota legada está intacta, mas o link da sidebar para "Empresas" foi movido para `/dashboard/empresas`. Se o user quiser deprecar a rota legada, remover a prop default em `CompaniesGallery`.
- `cron/drain-squad-queue`: URL pública não configurada ainda. O `after()` já drena após enqueue, então o cron é fallback para runs travados — baixa urgência até haver volume.
- `hotfix` blueprint: tem apenas `backend (lead) + qa (reviewer)` — sem `worker`. Está correto (lead faz o trabalho em hotfix), mas se `validateSquadComposition` exigir worker, o seed vai pular. Verificar se isso está OK ou adicionar backend como worker também.
