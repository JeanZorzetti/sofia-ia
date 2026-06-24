# Phase 1 — API Contracts: Empresas Agênticas

Todas as rotas: `withAuth` + escopo `ownerId(auth)` (admin vê todas — FR-018). Next.js 16: params são
`Promise<…>` + `await`. Respostas no padrão do repo `{ success: boolean, data?|error? }`. Mutações com
zod via `parseJson`. Verbo de erro: 400 (validação), 403 (limite/ownership), 404 (não-dono), 409
(conflito 1:1 / regra de ouro), 500.

---

## Empresa (CRUD + nichos + clonagem)

### `GET /api/companies/niches`
Lista os nichos semente disponíveis (estáticos do blueprint).
→ `200 { success, data: [{ niche, label, layers, roleCount }] }`

### `GET /api/companies`
Lista empresas do dono.
→ `200 { success, data: Company[] }` (inclui contagem de cargos ocupados/vagos)

### `POST /api/companies`
Cria empresa a partir de um nicho — semeia cargos + RACI pré-preenchida.
Body: `{ name: string, niche: string, typology?: 'generalist'|'specialist'|'hybrid', description? }`
→ `201 { success, data: Company }` · erros: 400 (nome/niche inválido)

### `GET /api/companies/[id]`
Detalhe completo: empresa + cargos (com agente encaixado) + RACI + infra.
→ `200 { success, data: { company, roles, raci, sdlc } }` · `404` se não-dono

### `PATCH /api/companies/[id]`
Atualiza nome / **tipologia** / descrição.
Body: `{ name?, typology?, description? }` → `200 { success, data }`

### `DELETE /api/companies/[id]`
Remove a empresa (cascade em cargos/runs; agentes **não** são deletados).
→ `200 { success }`

### `POST /api/companies/[id]/clone`
Clona como novo nicho/instância (reproduz organograma + RACI; cargos nascem **vagos** — agentes não são
re-encaixados, respeitando 1:1 e isolamento de tenant). FR-019.
Body: `{ name: string }` → `201 { success, data: Company }`

---

## Organograma (cargos + staffing 1:1)

### `GET /api/companies/[id]/roles`
→ `200 { success, data: CompanyRole[] }` (agrupáveis por `layer`)

### `PUT /api/companies/[id]/roles`
Adiciona/remove cargos além do template (FR-005).
Body: `{ add?: [{ key, title, layer, department? }], removeKeys?: string[] }`
→ `200 { success, data: CompanyRole[] }` · `409` se remover cargo referenciado pela RACI sem limpá-la

### `POST /api/companies/[id]/roles/[roleKey]/staff`
Encaixa um agente existente no cargo (FR-003). Valida: agente é do dono; agente não está em outro cargo
(1:1).
Body: `{ agentId: string }`
→ `200 { success, data: CompanyRole }` · `409 { error: 'Agente já ocupa outro cargo' }` (FR-003a) ·
`404` agente inexistente/não-dono

### `DELETE /api/companies/[id]/roles/[roleKey]/staff`
Desencaixa (cargo volta a vago). → `200 { success }`

---

## Governança (RACI + SOPs)

### `GET /api/companies/[id]/raci`
→ `200 { success, data: { raci, phases, roles } }`

### `PUT /api/companies/[id]/raci`
Substitui a matriz. **Valida a regra de ouro (1 A/fase) com `validateRaci`** antes de persistir.
Body: `{ raci: { [phaseKey]: { [roleKey]: 'R'|'A'|'C'|'I' } } }`
→ `200 { success, data }` · `409 { error: 'Fase X precisa de exatamente 1 Accountable' }` (FR-010)

### `PUT /api/companies/[id]/sops` *(ou via PATCH config)*
Define SOP (formato de saída) por cargo. Body: `{ sops: { [roleKey]: string } }` → `200 { success }`

---

## Infraestrutura

### `GET /api/companies/[id]/infrastructure`
Vínculos MCP (reuso de `AgentMcpServer`) + flag de sandbox por cargo/agente.
→ `200 { success, data: { [roleKey]: { agentId?, mcpServers: [...], sandbox: boolean } } }`

### `PUT /api/companies/[id]/infrastructure`
Body: `{ [roleKey]: { sandbox?: boolean } }` (vínculos MCP gerenciados pelo mecanismo existente do
agente). → `200 { success }`

---

## Execução (meta-orquestrador)

### `POST /api/companies/[id]/run`
Inicia uma `CompanyRun`. Pré-valida: RACI válida + cargos R/A das fases preenchidos (senão `409
blocked`). Dispara o meta-orquestrador sequencial (assíncrono via `after()`; cada fase chama
`runTeamAndWait`).
Body: `{ mission: string }`
→ `202 { success, data: { companyRunId } }` · `409 { error: 'Cargo R vago na fase X' }` (edge case)

### `GET /api/companies/[id]/runs`
Lista execuções da empresa. → `200 { success, data: CompanyRun[] }`

### `GET /api/company-runs/[id]`
Status fase-a-fase de uma execução (FR-016): cada `CompanyPhaseRun` com `status`, `outputArtifact`,
`teamRunId` (link para o `TeamRun` real e suas tasks/messages).
→ `200 { success, data: { run, phaseRuns: CompanyPhaseRun[] } }` · `404` se não-dono

---

## Notas de conformidade

- **Coordinator intocado**: `POST .../run` → meta-orquestrador → `runTeamAndWait` (caller). Nenhuma rota
  importa/edita `team-coordinator`/`team-executor`.
- **Multi-tenant**: toda rota resolve `where: { id, createdBy: ownerId(auth) }` antes de mutar (padrão
  anti-IDOR do repo). Staffing valida ownership do **agente** também.
- **Times de fase** nascem `status:'internal'` → fora da listagem `/api/teams` (filtra `active`).
