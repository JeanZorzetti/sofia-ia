# Data Model — ROI Labs Roster (Phase 1)

## Entidades tocadas (todas EXISTEM — nenhuma nova)

| Entidade | Operação desta feature | Campos relevantes |
|---|---|---|
| `AgentFolder` | create/reuse "ROI Labs" | `id` (cuid), `name`, `color`, `userId` |
| `Agent` | create/update ×13 | `name`, `description`, `systemPrompt`, `model`, `temperature`, `memoryEnabled`, `folderId`, `status='active'`, `createdBy`, `config` |
| `AgentSkill` | create (vínculo) | `@@unique([agentId, skillId])` |
| `AgentMcpServer` | create (vínculo, se existir) | `@@unique([agentId, mcpServerId])` |
| `AgentPlugin` | create (vínculo, se existir) | `agentId`, `name`, `code` |
| `CompanyRole` | update `agentId` (encaixe 1:1) | `@@unique([companyId, key])`, `agentId @unique` |

**Sem alteração de schema → sem migração.** Vínculos reusam os `@@unique` existentes (idempotência grátis).

### `Agent.config` (Json) — convenção desta feature

```jsonc
{
  "roiLabsRole": "architect",        // chave de idempotência (∈ os 13 roleKeys do blueprint)
  "companyId": "0e7d636a-...",        // empresa-alvo
  "layer": "tactical",                // strategic | tactical | operational
  "delegatesTo": ["backend","frontend","data"],   // hierarquia top-down (nomes de cargo)
  "receivesFrom": ["cto","pm","ceo"],
  "peers": ["pm","ba","po","scrum_master"],
  "intendedTools": {                  // mapeamento DESEJADO (vinculado se existir; senão sinalizado)
    "mcp": ["repository","filesystem"],
    "plugins": []
  }
}
```

## `RoiLabsAgentDef` (shape do roster — `src/lib/companies/roi-labs-roster.ts`)

```ts
export interface RoiLabsAgentDef {
  roleKey: string          // ∈ blueprint software_house keys
  name: string
  description: string
  model: 'claude-opus-4-8' | 'claude-sonnet-4-6'
  temperature: number
  memoryEnabled: boolean
  layer: 'strategic' | 'tactical' | 'operational'
  delegatesTo: string[]    // roleKeys (top-down apenas)
  receivesFrom: string[]
  peers: string[]
  skills: string[]         // BUILTIN_SKILLS tool names (vinculados por lookup)
  intendedMcp: string[]    // categorias de MCP desejadas (vinculadas se existirem)
  buildSystemPrompt(): string   // template de 7 blocos (ver plan.md)
}
```

## Mapa cargo → harness (os 13)

Modelo: **CEO = `claude-opus-4-8`**; os outros 12 = **`claude-sonnet-4-6`** (todos claude-cli).

### Camada Estratégica (C-level)

| roleKey | Nome do agente | Temp | Mem | delegatesTo | skills | intendedMcp |
|---|---|---|---|---|---|---|
| `ceo` | CEO — Chefe Executivo de Visão | 0.6 | ✅ | cto, pm, po, architect, scrum_master | calculate_roi, percentage_change, web_search, summarize_text | research |
| `cto` | CTO — Diretor de Arquitetura Tecnológica | 0.4 | ✅ | architect, devops, data | estimate_tokens, web_search, run_code, generate_uuid | repository, research |
| `ciso` | CISO — Diretor de Segurança da Informação | 0.2 | ✅ | qa, devops, backend | check_password_strength, validate_email, validate_cpf, validate_cnpj | security-scan |

### Camada Tático-Gerencial

| roleKey | Nome do agente | Temp | Mem | delegatesTo | skills | intendedMcp |
|---|---|---|---|---|---|---|
| `pm` | PM — Guardião da Visão do Produto | 0.6 | ✅ | ba, po, architect | web_search, extract_keywords, summarize_text, calculate_roi | research |
| `ba` | BA — Dissecador de Processos de Negócio | 0.4 | ✅ | — (pares) | parse_csv, calculate_stats, summarize_text, detect_sentiment | research |
| `po` | PO — Gestor de Backlog | 0.4 | ✅ | scrum_master | count_words, date_diff, format_date, truncate_text | task-management |
| `architect` | Arquiteto de Software — Mestre em Design | 0.3 | ✅ | backend, frontend, data | generate_uuid, generate_slug, estimate_tokens, run_code | repository, filesystem |
| `scrum_master` | Scrum Master — Orquestrador de Execução | 0.4 | ✅ | backend, frontend, qa, devops | date_diff, format_date, calculate_stats, percentage_change | task-management |

### Camada Operacional

| roleKey | Nome do agente | Temp | Mem | delegatesTo | skills | intendedMcp |
|---|---|---|---|---|---|---|
| `backend` | Engenheiro de Software Backend | 0.3 | ❌ | data (lateral) | run_code, http_request, generate_uuid, validate_email | repository, filesystem |
| `frontend` | Engenheiro de Software Frontend | 0.5 | ❌ | — | run_code, generate_slug, truncate_text, readability_score | repository, filesystem |
| `qa` | QA — Inquisidor de Integridade | 0.2 | ❌ | backend, frontend (devolução) | run_code, check_password_strength, validate_email, detect_sentiment | test-runner, sandbox |
| `devops` | DevOps — Arquiteto de Operações Contínuas | 0.3 | ❌ | — | run_code, http_request, generate_uuid, estimate_tokens | ci-cd, sandbox, filesystem |
| `data` | Engenheiro / Cientista de Dados | 0.3 | ❌ | — | parse_csv, calculate_stats, percentage_change, format_number, detect_sentiment | filesystem |

## Invariantes verificáveis (alimentam o contract + o teste do roster)

1. **13 defs**, com `roleKey` = exatamente o conjunto de keys do `company-blueprint.ts` software_house
   (`ceo, cto, ciso, pm, ba, po, architect, scrum_master, backend, frontend, qa, devops, data`).
2. **1 def com `claude-opus-4-8`** (ceo) e **12 com `claude-sonnet-4-6`**.
3. **Nenhuma aresta de delegação invertida**: para todo def operacional, `delegatesTo` não contém nenhum
   roleKey de camada `strategic`/`tactical` (lateral dentro de operacional é permitido).
4. **Memória**: ON nas camadas strategic+tactical (8), OFF na operacional (5).
5. **Temperature** ∈ [0.2, 0.6]; papéis de rigor (ciso, qa) nos menores valores.
6. **Skills** todas pertencem a `BUILTIN_SKILLS` (resolvíveis por `name`).

## Lifecycle / Estados

- Agente nasce `status='active'`. O encaixe muda apenas `CompanyRole.agentId` (não toca o agente).
- Deletar um agente → `CompanyRole.agentId` volta a `null` (cargo vago) via `onDelete: SetNull` (005).
- Re-seed → `update` por `config.roiLabsRole` (reconciliação), nunca duplicação.
