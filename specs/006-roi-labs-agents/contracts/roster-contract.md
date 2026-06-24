# Contract — Roster & Seed (Phase 1)

Esta feature **não adiciona endpoint HTTP**. O "contrato" é (a) a forma dos dados estáticos do roster e
(b) as invariantes que o seed garante. Ambos são verificáveis sem rede (teste puro + queries de
contagem). Encaixe reusa o contrato HTTP existente da 005.

## C1 — Roster estático (`src/lib/companies/roi-labs-roster.ts`)

**Export**: `ROI_LABS_ROSTER: RoiLabsAgentDef[]` (13 itens) + helper puro `validateRoster(roster, blueprintKeys): { ok: boolean; errors: string[] }`.

**Invariantes (testáveis sem DB)**:

| # | Invariante | Falha se |
|---|---|---|
| INV-1 | `roster.length === 13` | ≠ 13 |
| INV-2 | `roster.map(r => r.roleKey)` === conjunto de keys do blueprint software_house | qualquer key faltando/sobrando |
| INV-3 | exatamente 1 def com `model==='claude-opus-4-8'` e `roleKey==='ceo'` | 0 ou >1 opus, ou opus em outro cargo |
| INV-4 | os outros 12 `model==='claude-sonnet-4-6'` | qualquer um divergente |
| INV-5 | nenhum def `layer==='operational'` tem em `delegatesTo` um roleKey de camada strategic/tactical | aresta invertida |
| INV-6 | `memoryEnabled === true` ⟺ `layer ∈ {strategic, tactical}` | divergência |
| INV-7 | toda skill ∈ `BUILTIN_SKILLS.map(s => s.toolDefinition.name)` | skill inexistente |
| INV-8 | `temperature ∈ [0, 1]` para todos | fora da faixa |

## C2 — Seed (`scripts/seed-roi-labs-agents.ts`)

**Entrada**: `ROI_LABS_COMPANY_ID` (env) ou `--company <id>`; fallback: descobre por
`niche='software_house'` (erro se 0 ou >1 candidata). `DATABASE_URL` → host real.

**Pós-condições garantidas (verificáveis por query)**:

| # | Pós-condição | Query de verificação |
|---|---|---|
| POST-1 | 1 `AgentFolder name='ROI Labs'` do dono | `count(agent_folders WHERE name='ROI Labs' AND user_id=:owner) == 1` |
| POST-2 | 13 `Agent` com `config.roiLabsRole` setado, `folderId` = a folder, `createdBy` = dono | `count == 13` |
| POST-3 | os 13 `CompanyRole` da company têm `agentId != null` (0 vagos) | `count(company_roles WHERE company_id=:id AND agent_id IS NULL) == 0` |
| POST-4 | encaixe correto: `CompanyRole.key` ⟷ `Agent.config.roiLabsRole` batem 1:1 | join coerente nos 13 |
| POST-5 | 1 agente (ceo) `model='claude-opus-4-8'`, 12 `model='claude-sonnet-4-6'` | contagem por model |
| POST-6 | cada agente tem ≥1 `AgentSkill` (ou ausência logada) | `count(agent_skills per agent) >= 1` |
| POST-7 | idempotência: 2ª execução não muda as contagens (13/1/0) | re-rodar + re-checar POST-1..3 |

**Degradação graciosa (FR-013b)**: skill/MCP/plugin inexistente → log de aviso + registro em
`config.intendedTools`, **sem abortar** o restante.

**Erros fatais (abortam com mensagem clara)**: company inexistente; keys da company ≠ 13 do blueprint;
dono não resolvido; `DATABASE_URL` ausente.

## C3 — Encaixe (reusa contrato existente da 005)

`POST /api/companies/[id]/roles/[roleKey]/staff` body `{ agentId }` — **não modificado** por esta
feature. O seed replica sua lógica via Prisma (`companyRole.update`), com as mesmas regras (1:1 global,
ownership). Sem mudança no endpoint.
