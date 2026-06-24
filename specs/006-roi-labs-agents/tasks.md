---
description: "Task list — ROI Labs Roster (staffing dos 13 agentes)"
---

# Tasks: ROI Labs — Roster dos 13 Agentes

**Input**: Design documents from `specs/006-roi-labs-agents/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: incluído 1 teste puro do roster (barato, valida invariantes INV-1..8). Demais validação = E2E.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizável (arquivo diferente, sem dependência)
- **[Story]**: US1..US4 conforme spec
- Arquivos: `src/lib/companies/roi-labs-roster.ts`, `scripts/seed-roi-labs-agents.ts`, `src/__tests__/lib/roi-labs-roster.test.ts`

---

## Phase 1: Setup

- [ ] T001 Criar esqueleto `src/lib/companies/roi-labs-roster.ts`: `interface RoiLabsAgentDef`, import dos keys de `company-blueprint.ts` (`getNicheBlueprint('software_house')`), `export const ROI_LABS_ROSTER: RoiLabsAgentDef[] = []` (a preencher).
- [ ] T002 Criar esqueleto `scripts/seed-roi-labs-agents.ts`: `new PrismaClient()`, parse de `ROI_LABS_COMPANY_ID`/`--company`, `main()` com `try/catch/finally ($disconnect)`, descoberta da company (por id; fallback niche `software_house`) + resolução do dono (`company.createdBy`).

---

## Phase 2: Foundational (bloqueia todas as stories)

**⚠️ CRITICAL**: helpers puros que tudo consome.

- [ ] T003 Implementar `BLUEPRINT_ROLE_KEYS` (derivado do blueprint) e `validateRoster(roster, keys)` em `roi-labs-roster.ts` (INV-1..8 do contract).
- [ ] T004 Implementar `buildSystemPrompt(def)` em `roi-labs-roster.ts` — template de 7 blocos (Identidade/Objetivo/Responsabilidades/Backstory/Hierarquia&Delegação/SOP/Restrições), texto derivado do CSV/Organograma.

**Checkpoint**: roster compila e `validateRoster([])` reporta as 13 keys faltando (gate pronto).

---

## Phase 3: User Story 1 — Staffing 1:1 (Priority: P1) 🎯 MVP

**Goal**: empresa ROI Labs com os 13 cargos ocupados; pasta "ROI Labs" com 13 agentes; modelos corretos.

**Independent Test**: rodar o seed → Company sem vagas + pasta com 13 + CEO em Opus, demais em Sonnet.

- [ ] T005 [US1] Preencher as **13** `RoiLabsAgentDef` em `roi-labs-roster.ts` com `roleKey`, `name`, `description`, `layer`, `model` (ceo=`claude-opus-4-8`; 12=`claude-sonnet-4-6`), `temperature` (data-model.md).
- [ ] T006 [US1] No seed: criar/reusar `AgentFolder` "ROI Labs" idempotente por `name+userId` (cor padrão).
- [ ] T007 [US1] No seed: para cada def, `agent.findFirst({ config.roiLabsRole })` → `create`/`update` com `name`, `description`, `systemPrompt=buildSystemPrompt(def)`, `model`, `temperature`, `status='active'`, `folderId`, `createdBy=owner`, `config={ roiLabsRole, companyId, layer }`.
- [ ] T008 [US1] No seed: encaixar via `companyRole.update({ where: { companyId_key:{companyId, key:roleKey} }, data:{ agentId } })`, respeitando 1:1 (checar `companyRole.findUnique({ agentId })`).
- [ ] T009 [US1] No seed: erros fatais com mensagem clara — company inexistente, keys da company ≠ 13 do blueprint, dono não resolvido, `DATABASE_URL` ausente. `validateRoster` roda antes de qualquer escrita.

**Checkpoint**: US1 entregue — POST-1..5 do contract satisfeitos. MVP demonstrável.

---

## Phase 4: User Story 2 — Capacidades por cargo (Priority: P2)

**Goal**: cada agente com knowledge base + skills/MCP do seu escopo (menor privilégio).

**Independent Test**: DevOps tem `run_code`/`http_request` e NÃO tickets; Scrum Master o oposto; KB presente.

- [ ] T010 [US2] No roster: preencher `skills[]` e `intendedMcp[]` por cargo (data-model.md), respeitando menor privilégio.
- [ ] T011 [US2] No seed: vincular skills — `skill.findFirst({ name, isBuiltin:true })` → `agentSkill.create` (idempotente via `@@unique[agentId,skillId]`); skill ausente → log de aviso, sem abortar.
- [ ] T012 [US2] No seed: vincular MCP do dono que casem com `intendedMcp` (lookup por nome/heurística) → `agentMcpServer.create`; se ausente, registrar em `config.intendedTools` + log (FR-013b). **Não** criar MCP/plugins fake.
- [ ] T013 [US2] No seed: knowledge base por agente — criar/associar `KnowledgeBase` (`agentId`, `type`) com o material normativo do cargo como `KnowledgeDocument` (Role/Goal/Backstory/SOP). Embeddings ficam a cargo do pipeline RAG existente; se exigir custo, persistir o normativo em `config` e marcar KB como `pending`.

**Checkpoint**: US1+US2 — POST-6 satisfeito; ferramentas alinhadas ao escopo.

---

## Phase 5: User Story 3 — Delegação + memória (Priority: P3)

**Goal**: hierarquia (linearização vertical) e paralelização horizontal expressas; memória onde há continuidade.

**Independent Test**: CEO delega para a camada tática; operacional não delega para cima; PM/PO/Scrum com memória ON.

- [ ] T014 [US3] No roster: preencher `delegatesTo`/`receivesFrom`/`peers` + `memoryEnabled` por cargo (data-model.md); `validateRoster` garante INV-5 (sem aresta invertida) e INV-6 (memória ⟺ camada).
- [ ] T015 [US3] Em `buildSystemPrompt`: emitir o bloco "Hierarquia & Delegação" a partir de `delegatesTo`/`receivesFrom`/`peers` (por nome de cargo), declarando top-down e pares; mencionar a tool `delegate_to_agent`.
- [ ] T016 [US3] No seed: setar `Agent.memoryEnabled` conforme o roster; persistir `delegatesTo/receivesFrom/peers` em `config` (data-model.md).

**Checkpoint**: US1–US3 — malha de delegação coerente; SC-005 verificável.

---

## Phase 6: User Story 4 — Operabilidade comprovada (Priority: P4)

**Goal**: a empresa preenchida executa o SDLC de ponta a ponta (reusa engine 005).

- [ ] T017 [US4] Executar o seed contra o **host real** (`DATABASE_URL` do host real + `ROI_LABS_COMPANY_ID`); registrar a saída (13/13, 0 vagas).
- [ ] T018 [US4] E2E (quickstart 1–3): Company sem vagas; pasta "ROI Labs" com 13; CEO=Opus, demais=Sonnet; capacidades por cargo conferem.
- [ ] T019 [US4] E2E (quickstart 4): disparar 1 execução da empresa com missão simples; observar progressão pelas 7 fases + loop de QA. **Coordinator intocado** (verificar diff vazio do engine).

**Checkpoint**: SC-008 — operabilidade comprovada.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T020 [P] Teste puro `src/__tests__/lib/roi-labs-roster.test.ts` — asserta INV-1..8 (sem DB).
- [ ] T021 Gate de build: `npx tsc --noEmit` + lint limpos antes do push (pre-commit). Verificar diff vazio do coordinator (`team-coordinator`/`executor`).
- [ ] T022 `specs/006-roi-labs-agents/handoff.md` (feito/decisões/próximos passos/gotchas) + commit + push na `main` (regra "push após concluir").

---

## Dependencies & Execution Order

- **Setup (T001–T002)** → sem dependência.
- **Foundational (T003–T004)** → BLOQUEIA todas as stories (roster/prompt são consumidos por todas).
- **US1 (T005–T009)** → MVP; depende de Foundational.
- **US2 (T010–T013)** → depende de US1 (agentes precisam existir para receber vínculos).
- **US3 (T014–T016)** → depende de US1 (campos no roster + seed). Independente de US2.
- **US4 (T017–T019)** → depende de US1–US3 estarem no código + seed rodado.
- **Polish (T020–T022)** → após o código das stories.

### Within roster.ts / seed (mesmo arquivo → sequencial)

- `roi-labs-roster.ts` é construído incrementalmente (T001→T003→T004→T005→T010→T014→T015): **não** paralelizar entre si.
- `seed-roi-labs-agents.ts` idem (T002→T006→T007→T008→T009→T011→T012→T013→T016).
- T020 (teste) é **[P]** — arquivo separado, depois do roster pronto.

### Parallel Opportunities

- T020 (teste do roster) ‖ qualquer task de seed após o roster estar completo.
- US2 e US3 podem ser desenvolvidas em paralelo **se** em arquivos/seções distintas — mas como ambas tocam roster.ts + seed, na prática rodam sequenciais nesta sessão (1 dev).

---

## Implementation Strategy

### MVP First (US1)

1. Setup (T001–T002) → Foundational (T003–T004) → US1 (T005–T009).
2. **STOP & VALIDATE**: rodar o seed → 13/13 ocupados (POST-1..5). É um MVP entregável.

### Incremental

US1 (staffing) → US2 (capacidades) → US3 (delegação/memória) → US4 (operabilidade E2E). Cada incremento
não quebra o anterior. Gate de build + push ao fim (T021–T022).

---

## Notes

- **Princípio II (NON-NEGOTIABLE)**: nenhuma task toca o coordinator — só dados/vínculos. T021 verifica diff vazio.
- **Princípio III**: sem migração (zero schema novo). T017 roda no host real.
- **Idempotência**: chave `config.roiLabsRole` + dono; re-rodar converge (POST-7).
- Commit ao fim de cada grupo lógico; handoff + push ao concluir (T022).
