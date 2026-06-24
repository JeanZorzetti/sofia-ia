# Handoff — Empresas Agênticas (005-agentic-companies)

**Data:** 2026-06-23 · **Fase:** implementação COMPLETA no código (43 tarefas T001–T042),
`tsc --noEmit` limpo. **Migração aplicada no host real `2.24.207.200:5435`** (`migrate deploy` ✅,
"Database schema is up to date") e **commit+push na `main`** feitos. **Gate restante: T041 — E2E
autenticado em produção.**

Artefatos da spec: [spec.md](./spec.md) → [plan.md](./plan.md) → [research.md](./research.md) →
[data-model.md](./data-model.md) → [contracts/api.md](./contracts/api.md) → [tasks.md](./tasks.md).

---

## 1. O que foi implementado (todas as fases)

- **Setup (T001–T004):** 4 models no `prisma/schema.prisma` (`Company`, `CompanyRole`,
  `CompanyRun`, `CompanyPhaseRun`) + back-relations `User.companies` e `Agent.companyRole`;
  migração formal `prisma/migrations/20260623120000_add_agentic_companies/`; `prisma generate` rodado;
  `src/lib/companies/sdlc.ts` (7 fases) + `company-blueprint.ts` (Software House + RACI semente
  normalizada — 1 A/fase; a linha de 2 "A" do blueprint foi normalizada: `scrum_master` detém o A em
  `testing`, QA fica R→reviewer).
- **Foundational (T005–T006):** `src/lib/companies/company-store.ts` (`listCompanies`,
  `getCompanyForOwner`, `createCompanyFromNiche`, `cloneCompany`) + schemas zod em
  `src/lib/validation.ts` (`createCompanySchema`, `patchCompanySchema`, `putRolesSchema`,
  `staffRoleSchema`, `putRaciSchema`, `putSopsSchema`, `putInfrastructureSchema`, `runCompanySchema`,
  `cloneCompanySchema`).
- **US1 (T007–T017):** rotas `/api/companies` (GET/POST), `/api/companies/niches`,
  `/api/companies/[id]` (GET/PATCH/DELETE), `…/roles` (GET/PUT), `…/roles/[roleKey]/staff` (POST/DELETE,
  1:1). UI: `CompaniesGallery` (galeria + dialog de criação), `CompanyCard`, `OrgChart`,
  `AllAgentsView` (move fiel da antiga página). Página `/dashboard/agents` virou Tabs **Empresas
  (default) | Todos os agentes**; detalhe em `/dashboard/agents/empresa/[companyId]` (server wrapper +
  `CompanyDetailView`). Testes: `tests/routes/companies.list-create.test.ts`, `…/companies.staff.test.ts`.
- **US2 (T018–T024):** helper puro `src/lib/companies/raci.ts` (`validateRaci` — regra de ouro) +
  rotas `…/raci` (GET/PUT, 409) e `…/sops` (PUT). UI: `RaciMatrix` (célula ciclável, destaca violação),
  `SdlcPipeline`, `SopEditor`; abas **Governança** + **SDLC** no detalhe. Teste: `tests/unit/raci.test.ts`.
- **US3 (T025–T032):** helpers `phase-roster.ts` (`buildPhaseRoster`, `phaseMission`); **fix I1** —
  `createTeamWithRoster` ganhou `status?` opcional (caller-only, **coordinator intocado**);
  meta-orquestrador `company-run.ts` (`runCompany` — loop sequencial das 7 fases, cria Time `internal`
  por fase, chama `runTeamAndWait`, encadeia N→N+1, QA=reviewer no loop nativo); rotas `…/run` (POST,
  pré-valida → 409 `blocked`), `…/runs` (GET), `/api/company-runs/[id]` (GET). UI: `RunTimeline`
  (polling), `RunsPanel` + aba **Execuções**. Testes: `tests/unit/phase-roster.test.ts`,
  `tests/routes/companies.run.test.ts`.
- **US4 (T033–T038):** rotas `…/clone` (POST) e `…/infrastructure` (GET/PUT — MCP leitura+deep-link,
  flag sandbox in-company). UI: `InfraPanel`, `TypologyControl` + abas **Tipologia** + **Infraestrutura**
  + ação **Clonar**. Teste: `tests/routes/companies.clone.test.ts`.
- **Polish:** T039 nav "Agentes de IA"→**"Empresas"** (ícone `Building2`) no `Sidebar.tsx`; T040
  **diff do coordinator VAZIO** (`team-coordinator/executor/graph-coordinator` intactos; só
  `create-team.ts` caller mudou +9) e `tsc --noEmit` LIMPO; T042 este handoff. **T041 (E2E prod) é o
  gate manual restante.**

## 2. ✅ Já feito + gate restante

1. **Migração no host real (Princípio III):** ✅ `prisma migrate deploy` aplicado em
   **`2.24.207.200:5435`** ("All migrations have been successfully applied" / "Database schema is up to
   date"). As 4 tabelas existem. (24 migrações anteriores já estavam aplicadas; só a nova foi rodada.)
2. **Commit + push na `main`:** ✅ feito (add seletivo só dos arquivos da feature — as mudanças
   não-relacionadas no working tree, `e2b/`/`ralph/`/logos/docs, foram preservadas fora do commit).
   O push dispara o deploy EasyPanel (build roda `prisma generate` + `next build`).
3. **T041 — E2E autenticado em produção (DoD, RESTANTE):** rodar os 4 cenários do
   [quickstart.md](./quickstart.md) logado em prod, com **zero regressão** em Agents/Teams e diff do
   coordinator vazio. Confirmar também o **CI verde** (5 arquivos de teste novos — jest não roda local).

## 3. Arquivos da feature (commitados)

`prisma/schema.prisma`,
`prisma/migrations/20260623120000_add_agentic_companies/`, `src/lib/companies/**`,
`src/lib/validation.ts`, `src/lib/orchestration/team/create-team.ts`,
`src/app/api/companies/**`, `src/app/api/company-runs/**`,
`src/app/dashboard/agents/page.tsx`, `src/app/dashboard/agents/empresa/**`,
`src/components/dashboard/companies/**`, `src/components/dashboard/agents/AllAgentsView.tsx`,
`src/components/polaris/Sidebar.tsx`, `tests/**`.

## 4. Decisões mantidas (NÃO reabrir) — ver tabela em git history / spec §Clarifications

P1+P2+P3+P4 no ciclo · 1 Time/fase sequencial · Times de fase `status:'internal'` ·
RACI Json tipado · seed RACI normalizada (1 A/fase) · 1:1 `@unique(agentId)` · rota
`/dashboard/agents`→galeria, detalhe em `…/empresa/[id]` · QA→reviewer (loop nativo).

## 5. Gotchas do ambiente (CRÍTICOS)

- **Coordinator INTOCADO (Princípio II):** verificado diff vazio de
  `team-coordinator.ts`/`team-executor.ts`/`team-graph-coordinator.ts`. A execução é só caller de
  `runTeamAndWait`. A extensão I1 está em `create-team.ts` (caller), não no coordinator.
- **`tsc` antes de cada push** — `create-team.ts` é usado pela própria Polaris; um erro de tipo aí
  derrubaria runs. (Já validado limpo nesta sessão.)
- **Execução dos Times de fase:** Claude CLI no worker, nunca provider `:free`.
- **jest não roda local** (OneDrive errno -4094) → os 5 arquivos de teste rodam só no **CI**. **Não
  foram executados localmente** — confirmar verde no CI.
- **Next.js 16:** rotas usam `params: Promise` + `await`, `auth.id`, prisma singleton, Groq lazy.

## 6. Definition of Done (gate real)

4 cenários do [quickstart.md](./quickstart.md) **E2E autenticado em produção**, zero regressão em
Agents/Teams, `git diff` do coordinator vazio. **Pendente:** depende dos passos da §2.
