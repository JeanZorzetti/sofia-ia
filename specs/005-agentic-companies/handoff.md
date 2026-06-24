# Handoff — Empresas Agênticas (005-agentic-companies)

**Data:** 2026-06-23 · **Fase atual:** planejamento Spec Kit COMPLETO (specify → clarify → plan →
tasks → analyze). **Próxima fase:** implementação (43 tarefas, ver [tasks.md](./tasks.md)).

Este documento orienta quem for implementar (humano ou Polaris Teams). Leia os artefatos da spec na
ordem antes de codar: [spec.md](./spec.md) → [plan.md](./plan.md) → [research.md](./research.md) →
[data-model.md](./data-model.md) → [contracts/api.md](./contracts/api.md) → [tasks.md](./tasks.md).

---

## 1. O que foi feito (planejamento)

- **Estudo do blueprint** em `docs/empresa_agentica_notebook_lm/` (organograma agêntico, cargos,
  RACI, SDLC de 7 fases, MCP/sandboxes).
- **Spec** com 4 user stories priorizadas (US1 organograma/staffing · US2 governança/SDLC · US3
  execução · US4 tipologia/infra/clonagem), 21 FRs, 11 entidades, 7 critérios mensuráveis.
- **Clarify** (4 decisões — ver §2). **Plan** (8 decisões técnicas R1–R8, Constitution Check ✅).
  **Tasks** (43 tarefas por dependência). **Analyze** (0 CRITICAL; 1 HIGH + 4 menores remediados nos
  artefatos).

## 2. Decisões tomadas (e por quê) — NÃO reabrir

| Decisão | Valor | Por quê |
|---------|-------|---------|
| Escopo do ciclo | **P1+P2+P3** (execução incluída) + refino P4 | Usuário pediu navegável **e** operável |
| Granularidade da execução | **1 Time por fase do SDLC, sequencial** | Artefatos por fase + loop de QA distinto; reusa `runTeamAndWait` (coordinator intocado) |
| Materializar Times de fase | `createTeamWithRoster({ status:'internal' })` | `/api/teams` filtra `active` → `internal` fica invisível, **zero read-side change** |
| Armazenar RACI | **Json tipado** em `Company.raci` | Matriz pequena (~13×7); padrão do repo; validação é app-level de qualquer jeito |
| Seed "Software House" | **RACI pré-preenchida** do blueprint, normalizada | Empresa nasce operável; mas a matriz do doc tem 1 linha com **2 "A"** → normalizar p/ 1 A/fase |
| Cardinalidade cargo↔agente | **Estrito 1:1** (`@unique` em `agentId`) | Decisão do usuário (Q4); generalista = cargos amplos, não agente compartilhado |
| Rota | `/dashboard/agents` vira galeria de Empresas; detalhe em `…/empresa/[id]` | Honra "transformar a página"; `empresa` (estático) não colide com `[id]` (agente, intocado) |
| Loop de QA | QA→`reviewer` (review nativo do engine) | Desalucinação Comunicativa de graça; não reimplementar loop |

## 3. Próximos passos (ordem)

1. **Setup** (T001–T004): schema (4 tabelas) → migração no host real → `sdlc.ts` + `company-blueprint.ts`.
2. **Foundational** (T005–T006): `company-store` (seeding/escopo) + schemas zod. **Bloqueia todas as US.**
3. **US1 / MVP** (T007–T017): galeria de Empresas + organograma + staffing 1:1. → commit+push+E2E.
4. **US2** (T018–T024): `validateRaci` + RACI matrix + SOP editor + SDLC views.
5. **US3** (T025–T032, **T028a antes de T028**): `buildPhaseRoster` + meta-orquestrador + run + timeline.
6. **US4** (T033–T038): clonagem + infra + tipologia.
7. **Polish** (T039–T042): nav, **diff vazio do coordinator**, E2E em prod, atualizar este handoff.

Regra: **1 user story = 1 fatia**; `tsc --noEmit` limpo + jest verde no CI, depois commit+push, então
a próxima.

## 4. Pendências / decisões em aberto

- **T002 (migração no host real) é MANUAL** — ver §5; provavelmente fora do loop dos agentes.
- **U1 (loop de QA):** confirmar que o reviewer nativo do engine **já tem teto de iterações**; se não
  tiver, expor/configurar o limiar e mapear "teto atingido" para o status terminal de `CompanyPhaseRun`
  (já anotado em T028).
- **C2:** na faceta Infra, o vínculo de **MCP é leitura+deep-link** para a config MCP do próprio
  agente; só a flag `sandbox` é escrita in-company. Confirmar se isso atende a expectativa de UX.
- **A1:** fases "essenciais" (vaga → `blocked`) vs não-essenciais (vaga → `skipped`) definidas em
  `sdlc.ts` (default essenciais: requirements/design/implementation/testing) — ajustar se necessário.

## 5. Gotchas do ambiente (CRÍTICOS)

- **Coordinator INTOCADO (Princípio II):** não tocar `team-coordinator.ts`/`team-executor.ts`/
  `team-graph-coordinator.ts`. `git diff` deles = vazio no fim. A execução é só `runTeamAndWait` caller.
- **A feature mexe no engine que a própria Polaris usa.** O fix I1 (`createTeamWithRoster` + `status?`)
  e os Times `internal` tocam `create-team.ts`. **Rode `tsc` antes de cada push** — um erro de tipo aí
  derruba runs futuros da plataforma. Feche o gate de build local ANTES de paralelizar agentes.
- **Migração só no host real `2.24.207.200:5435`** (NÃO o host do `.env`). `prisma db push` do runner
  em standalone Docker falha silencioso → coluna nunca criada → reads 500. Use `migrate deploy` manual.
  Um agente em sandbox não aplica sozinho — esse passo fica com o operador humano ou exige acesso
  explícito ao host.
- **Execução dos Times de fase:** **Claude CLI no worker, nunca provider `:free`** (Groq/OpenRouter
  `:free` = rate-limit sob rajada → quebra runs). Caveat code-mode: só o worker pode ser claude-cli.
- **jest não roda local** (OneDrive errno -4094 corrompe node_modules) → testes só no CI.
- **Next.js 16:** params `Promise` + `await`; `auth.id` (não `userId`); prisma singleton; Groq lazy.

## 6. Definition of Done (gate real)

Validar os 4 cenários do [quickstart.md](./quickstart.md) **E2E autenticado em produção** (EasyPanel +
login), com **zero regressão** em Agents/Teams existentes e `git diff` do coordinator vazio.
