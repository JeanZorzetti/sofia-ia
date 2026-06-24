# Implementation Plan: ROI Labs — Roster dos 13 Agentes (Staffing da Empresa Agêntica)

**Branch**: `006-roi-labs-agents` | **Date**: 2026-06-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/006-roi-labs-agents/spec.md`

## Summary

Preencher a empresa ROI Labs (entidade `Company` da Feature 005, id `0e7d636a-...`, nicho
`software_house`) criando os **13 agentes** que ocupam seus cargos, cada um com **harness completo**, e
encaixando-os **1:1** nas vagas do organograma. A entrega é um **seed idempotente** que não altera
schema nem o engine de orquestração: dados estáticos do roster (`src/lib/companies/roi-labs-roster.ts`)
+ um script de seeding (`scripts/seed-roi-labs-agents.ts`) que cria a `AgentFolder` "ROI Labs", os 13
`Agent`, vincula as capacidades existentes (skills/MCP/plugins) e faz o encaixe nos `CompanyRole`. O
provider Claude CLI é derivado do **prefixo do model** (`claude-` → `claude-cli`): CEO em
`claude-opus-4-8`, os outros 12 em `claude-sonnet-4-6`. A operabilidade ("paralelização horizontal por
camada + linearização vertical por hierarquia") **reusa a execução por fase do SDLC já entregue pela
005** — nada no coordinator `runTeam` é tocado.

## Technical Context

**Language/Version**: TypeScript 5 / Node (Next.js 16, App Router, RSC-first)

**Primary Dependencies**: Prisma ORM + PostgreSQL; Claude CLI (pool `CLAUDE_CODE_OAUTH_TOKEN(S)`);
módulos existentes — `src/lib/companies/*` (005), `src/lib/ai/groq.ts` (`chatWithAgent` + provider
routing), `src/lib/ai/claude-models.ts` (catálogo CLI), `src/lib/skills/registry.ts` (`BUILTIN_SKILLS`),
`src/lib/ai/delegation.ts` (`delegate_to_agent`).

**Storage**: PostgreSQL via Prisma. **Nenhuma tabela/coluna nova** — só *inserts/updates* em tabelas
existentes (`agents`, `agent_folders`, `agent_skills`, `agent_mcp_servers`, `agent_plugins`,
`company_roles`).

**Testing**: jest no CI (não roda local — OneDrive errno -4094). Teste unitário puro do roster (sem DB).
Gate real = E2E autenticado em produção (abrir a Company, ver 13 cargos ocupados, disparar 1 execução).

**Target Platform**: EasyPanel (Docker) em `polarisia.com.br`. DB de produção no host real
`2.24.207.200:5435` (NÃO o host do `.env`).

**Project Type**: Web service (Next.js single project) — esta feature é um **seed/data-config**, não uma
rota/UI nova.

**Performance Goals**: N/A (operação única de seeding de 13 agentes; idempotente).

**Constraints**: Coordinator `runTeam` **intocado** (Princípio II); claude-cli em todos os agentes, sem
API/chat pago, sem `:free` (restrição de custo); ownership = dono da Company (multi-tenant, zero IDOR).

**Scale/Scope**: 1 pasta + 13 agentes + 13 encaixes + N vínculos de capacidade. Nicho único
(software_house); RACI/SDLC já semeados pela 005.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Conformidade |
|---|---|
| **I. Ação > Análise** | Abordagem confirmada com o usuário (3 decisões) antes de escrever. Seed segue padrão existente (`seed-sirius-agents.ts`). ✅ |
| **II. Coordinator Intocado (NON-NEGOTIABLE)** | Esta feature **não toca** `runTeam` nem qualquer arquivo de orquestração. Só cria dados (agentes/folder/encaixe) e vincula capacidades. A operabilidade reusa a execução por fase da 005 (que já envolve o coordinator sem editá-lo). ✅ |
| **III. Migrations Formais no Host Real (NON-NEGOTIABLE)** | **Nenhuma mudança de schema** → nenhuma migração. O seed roda contra o host real de produção (mesmo host das migrações 005). ✅ (sem risco do `db push` silencioso). |
| **IV. Next.js 16 + Type Safety** | Seed é script `tsx` puro (sem route handlers novos) → sem armadilha de async params. Prisma via client do script (padrão dos seeds). `tsc` limpo é gate. ✅ |
| **V. Segurança/Isolamento Multi-tenant** | Agentes/folder/encaixe pertencem ao **dono da Company**; o encaixe respeita 1:1 e ownership (espelha `staff/route.ts`). Modelos via claude-cli (sem credencial paga nova). ✅ |

**Resultado**: PASS — sem violações. Nenhuma entrada em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/006-roi-labs-agents/
├── spec.md              # /speckit-specify (feito)
├── plan.md              # Este arquivo (/speckit-plan)
├── research.md          # Phase 0 — decisões técnicas
├── data-model.md        # Phase 1 — entidades tocadas + o roster de 13
├── quickstart.md        # Phase 1 — como rodar o seed + validar E2E
├── contracts/
│   └── roster-contract.md  # Phase 1 — shape de RoiLabsAgentDef + invariantes do seed
├── checklists/
│   └── requirements.md  # /speckit-specify (feito)
└── tasks.md             # /speckit-tasks (próxima fase)
```

### Source Code (repository root)

```text
src/lib/companies/
├── company-blueprint.ts     # (existe) 13 roleKeys + RACI software_house — FONTE dos keys
├── roi-labs-roster.ts       # NOVO — 13 RoiLabsAgentDef (harness por cargo) + helpers puros
└── ...                      # (005, intocados)

src/lib/skills/registry.ts   # (existe) BUILTIN_SKILLS — fonte das skills a vincular

scripts/
└── seed-roi-labs-agents.ts  # NOVO — orquestra folder + 13 agentes + vínculos + encaixe (idempotente)

src/__tests__/lib/
└── roi-labs-roster.test.ts  # NOVO — teste puro do roster (sem DB)
```

**Structure Decision**: Single project (Next.js). A feature adiciona **2 arquivos de produção**
(`roi-labs-roster.ts` puro + `seed-roi-labs-agents.ts`) e **1 de teste**, espelhando o padrão de seed já
existente no repo. Zero rota nova, zero componente novo, zero mudança de schema, zero toque no engine.

## Phase 0 — Research

Ver [research.md](./research.md). Decisões-chave:

- **R1 — Provider via prefixo do model**: `providerOf()` roteia `claude-*` → `claude-cli`. Logo basta
  `model: 'claude-opus-4-8'` (CEO) / `'claude-sonnet-4-6'` (demais); ambos existem em `claude-models.ts`.
  Sem campo de provider extra.
- **R2 — Seed script (não API, não migração)**: replica o padrão `seed-sirius-agents.ts` (Prisma direto,
  idempotente por chave estável). Encaixe via `companyRole.update` (mesma lógica do `staff/route.ts`).
- **R3 — Delegação ≠ tabela estática**: `AgentDelegation` é log de runtime. A hierarquia (FR-014) é
  expressa **no system prompt** (cada cargo declara para quem delega, por nome de cargo) + a tool
  `delegate_to_agent`. A orquestração real (paralelo por camada / sequencial por fase) é a execução por
  fase da 005.
- **R4 — Mapeamento de capacidades por cargo (menor privilégio)**: skills built-in mapeadas por
  categoria↔cargo; MCP/plugins vinculados se existirem no tenant, senão ausência sinalizada (FR-013b) e o
  mapeamento *desejado* persistido em `Agent.config.intendedTools`.
- **R5 — Idempotência**: agente identificado por `Agent.config.roiLabsRole = <roleKey>` + dono. Re-rodar
  faz update, nunca duplica. Folder idempotente por `name + userId`.
- **R6 — Onde rodar**: contra o host real de produção (`DATABASE_URL` do host real). Decisão operacional
  documentada no quickstart; confirmada na fase implement.

## Phase 1 — Design

- **Data model**: ver [data-model.md](./data-model.md) — entidades tocadas (todas existentes) + a
  estrutura `RoiLabsAgentDef` e o mapa cargo→harness dos 13.
- **Contracts**: ver [contracts/roster-contract.md](./contracts/roster-contract.md) — shape do roster e
  as invariantes verificáveis do seed (13/13 ocupados, 1 opus/12 sonnet, sem aresta de delegação
  invertida, idempotência).
- **Quickstart**: ver [quickstart.md](./quickstart.md) — execução do seed e os 4 cenários de validação
  E2E.

### System prompt — template por cargo (genérico de software house)

Cada agente recebe um system prompt derivado do CSV/Organograma com esta estrutura fixa:

1. **Identidade & Papel (Role)** — o arquétipo do cargo (ex.: "Você é o CTO, Diretor de Arquitetura
   Tecnológica da empresa agêntica.").
2. **Objetivo (Goal)** — a coluna *Objetivo Principal* do blueprint.
3. **Responsabilidades & Escopo** — *Responsabilidades e Escopo* do blueprint, com fronteiras explícitas
   (anti Role Drift: "você NÃO escreve código" para o Arquiteto/CTO, etc.).
4. **Backstory / Especialização** — *Contexto e Especialização* do blueprint.
5. **Hierarquia & Delegação** — a posição na camada e para quais cargos delega/recebe (linearização
   vertical), e os pares de mesma camada (paralelização horizontal). Top-down apenas.
6. **SOP / Formato de saída** — quando o cargo tem artefato normativo (PM→PRD, Arquiteto→SDD, QA→laudo),
   exigir saída estruturada (Markdown/JSON), não prosa livre.
7. **Restrições** — desalucinação (não inventar), menor privilégio (usar só as ferramentas do cargo).

### Re-check Constitution após design

Sem novas violações. Continua PASS (sem schema, sem engine, sem API nova; multi-tenant preservado).

## Complexity Tracking

> Nenhuma violação de constituição a justificar — seção vazia por design.
