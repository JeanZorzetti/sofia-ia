# Phase 1 — Data Model: Empresas Agênticas

4 tabelas novas. RACI e infra como Json tipado na `Company`. Fases do SDLC e taxonomia de cargos são
**constantes de código** (não dados por empresa). Convenções do repo: PK `uuid @db.Uuid`, `@@map`
snake_case plural, `createdBy @db.Uuid` + relação `creator User`, índices em `createdBy`/`status`.

---

## Constantes de código (não-DB)

### Fases do SDLC (`src/lib/companies/sdlc.ts`)

Array ordenado de 7 fases canônicas, cada uma com `key`, `label`, `objective`, `outputArtifacts[]`:

| key | label | Objetivo (resumo) | Artefato de saída |
|-----|-------|-------------------|-------------------|
| `planning` | Planeamento | Viabilidade + escopo de negócio | Plano inicial / estudo de viabilidade |
| `requirements` | Análise de Requisitos | Traduzir premissas em casos de uso | PRD / histórias de utilizador |
| `design` | Design do Sistema | Infra técnica, modelo de dados, APIs | SDD / diagramas / modelos |
| `implementation` | Implementação | Código-fonte funcional | Módulos executáveis |
| `testing` | Teste / QA | Detetar anomalias vs PRD (loop revisor) | Relatórios de teste / código refatorado |
| `deployment` | Implantação | Empacotar + promover a produção | Containers / pipelines / logs |
| `maintenance` | Manutenção | Correção proativa pós-lançamento | Bug fixes / telemetria |

### Taxonomia de cargos do nicho (`src/lib/companies/company-blueprint.ts`)

Camadas (`layer`): `strategic` | `tactical` | `operational`. Cargos semente do nicho "Software House"
(cada um com `key`, `title`, `layer`, `department`):

- **strategic**: `ceo` (Executivo), `cto` (Executivo), `ciso` (QA & Segurança)
- **tactical**: `pm`, `ba`, `po` (Produto & Negócios), `architect` (Arquitetura & Engenharia),
  `scrum_master` (Orquestração)
- **operational**: `backend`, `frontend` (Arquitetura & Engenharia), `qa` (QA & Segurança),
  `devops` (Operações & Infra), `data` (Especializada)

A **RACI semente** (Json) é derivada/normalizada da seção 7 do blueprint (ver `research.md` R5 — atenção
à linha com 2 "A" que deve ser normalizada para 1 A/fase).

---

## Tabela: `Company` → `@@map("companies")`

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | `String @id @default(uuid()) @db.Uuid` | |
| `name` | `String @db.VarChar(255)` | |
| `niche` | `String @db.VarChar(100)` | ex.: `software_house` (chave do blueprint semente) |
| `typology` | `String @db.VarChar(20)` | `generalist` \| `specialist` \| `hybrid` (default `hybrid`) |
| `description` | `String? @db.Text` | |
| `raci` | `Json @default("{}")` | `{ [phaseKey]: { [roleKey]: 'R'|'A'|'C'|'I' } }` — validado por `validateRaci` |
| `config` | `Json @default("{}")` | SOPs por cargo, `infrastructure: { [roleKey]: { sandbox?: boolean } }` |
| `createdBy` | `String @db.Uuid @map("created_by")` | dono (escopo multi-tenant) |
| `createdAt`/`updatedAt` | `DateTime @db.Timestamptz()` | |

**Relações**: `creator User`, `roles CompanyRole[]`, `runs CompanyRun[]`.
**Índices**: `@@index([createdBy])`, `@@index([niche])`.

---

## Tabela: `CompanyRole` → `@@map("company_roles")`

A vaga do organograma. Encaixe 1:1 via `@unique` em `agentId`.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | `String @id @default(uuid()) @db.Uuid` | |
| `companyId` | `String @db.Uuid @map("company_id")` | |
| `key` | `String @db.VarChar(50)` | ex.: `backend` (chave estável p/ a RACI) |
| `title` | `String @db.VarChar(255)` | rótulo exibido |
| `layer` | `String @db.VarChar(20)` | `strategic`\|`tactical`\|`operational` |
| `department` | `String? @db.VarChar(100)` | |
| `agentId` | `String? @db.Uuid @map("agent_id")` | **nullable** = vaga vazia; **`@unique`** = 1:1 (FR-003a) |
| `position` | `Int @default(0)` | ordenação no organograma |
| `createdAt` | `DateTime @db.Timestamptz()` | |

**Relações**: `company Company @relation(onDelete: Cascade)`, `agent Agent? @relation(onDelete: SetNull)`
(agente deletado → cargo volta a vago, edge case do spec).
**Constraints**: `@@unique([companyId, key])` (cargo único por empresa), `@@unique([agentId])` (1:1
global — Postgres permite múltiplos NULL).
**Índices**: `@@index([companyId])`.

> **Nota schema**: `Agent` ganha a back-relation `companyRole CompanyRole?` (lado oposto do
> `@unique agentId`). É adição de relação opcional — não altera reads existentes de `Agent`.

---

## Tabela: `CompanyRun` → `@@map("company_runs")`

A execução da empresa (percorre as 7 fases).

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | `String @id @default(uuid()) @db.Uuid` | |
| `companyId` | `String @db.Uuid @map("company_id")` | |
| `mission` | `String @db.Text` | objetivo informado pelo usuário |
| `status` | `String @default("pending") @db.VarChar(20)` | `pending`\|`running`\|`completed`\|`failed`\|`blocked` |
| `currentPhase` | `String? @db.VarChar(30) @map("current_phase")` | fase em andamento (key do SDLC) |
| `output` | `String? @db.Text` | consolidação final |
| `error` | `String? @db.Text` | motivo de `failed`/`blocked` (ex.: cargo R vago) |
| `createdBy` | `String @db.Uuid @map("created_by")` | |
| `startedAt`/`completedAt`/`createdAt` | `DateTime @db.Timestamptz()` | |

**Relações**: `company Company @relation(onDelete: Cascade)`, `phaseRuns CompanyPhaseRun[]`.
**Índices**: `@@index([companyId])`, `@@index([status])`.

---

## Tabela: `CompanyPhaseRun` → `@@map("company_phase_runs")`

Liga cada fase do SDLC ao `TeamRun` subjacente (criado via `runTeamAndWait`).

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | `String @id @default(uuid()) @db.Uuid` | |
| `companyRunId` | `String @db.Uuid @map("company_run_id")` | |
| `phase` | `String @db.VarChar(30)` | key da fase do SDLC |
| `position` | `Int @default(0)` | ordem (0..6) |
| `status` | `String @default("pending") @db.VarChar(20)` | `pending`\|`running`\|`completed`\|`failed`\|`skipped`\|`blocked` |
| `teamRunId` | `String? @db.Uuid @map("team_run_id")` | o `TeamRun` real da fase (sem FK formal p/ não acoplar; lookup read-side) |
| `inputArtifact` | `String? @db.Text @map("input_artifact")` | saída da fase anterior (encadeamento N→N+1, FR-015a) |
| `outputArtifact` | `String? @db.Text @map("output_artifact")` | resultado da fase (= `TeamRun.output`) |
| `error` | `String? @db.Text` | |
| `startedAt`/`completedAt`/`createdAt` | `DateTime @db.Timestamptz()` | |

**Relações**: `companyRun CompanyRun @relation(onDelete: Cascade)`.
**Índices**: `@@index([companyRunId])`.

> `teamRunId` referencia `TeamRun.id` sem FK Prisma formal (evita relação cruzada que acoplaria o
> schema de Times à feature; o `TeamRun` é lido sob demanda). Times de fase nascem com
> `status:'internal'` (R3) → invisíveis na UI de Times.

---

## Helpers puros (validação / derivação) — testáveis sem DB

- **`validateRaci(raci, roleKeys): string | null`** — regra de ouro: cada fase do SDLC tem
  **exatamente 1 `A`**; valores ∈ {R,A,C,I}; roleKeys existem. Retorna msg de erro ou `null`.
- **`buildPhaseRoster(raci, phaseKey, staffing): { ok: true, roster: RosterInput[] } | { ok: false,
  error }`** — A→lead, R→worker(s), QA/C→reviewer (≤1); erro se A ou todos os R da fase estão vagos.
- **`phaseMission(phase, companyMission, prevArtifact): string`** — monta a missão da fase (objetivo +
  artefato anterior + missão global).

---

## Transições de estado (CompanyRun)

```
pending → running → completed
                 ↘ failed       (uma fase falhou no engine)
                 ↘ blocked      (cargo R/A vago numa fase ativa — não executa)
```
Cada `CompanyPhaseRun`: `pending → running → (completed | failed | blocked)`. Fase sem cargos atuantes
válidos = `skipped` ou `blocked` conforme política (default: `blocked` se for fase essencial).

---

## Migração

Migração formal `<timestamp>_add_agentic_companies` criando as 4 tabelas + a relação opcional em
`agents`. **Aplicar com `prisma migrate deploy` MANUAL no host real `2.24.207.200:5435` ANTES do push**
(Princípio III). Sem drops → sem precheck de dados. `prisma generate` antes do `next build`.
