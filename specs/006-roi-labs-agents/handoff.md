# Handoff — 006-roi-labs-agents

**Data**: 2026-06-24 · **Status**: código entregue (spec→plan→tasks→implement), `tsc` 0 erros, **falta executar o seed contra o host real** (gate E2E).

## O que foi feito

Fluxo Spec Kit completo para popular a empresa ROI Labs (Company da Feature 005) com os **13 agentes**:

- **spec.md / plan.md / research.md / data-model.md / contracts/roster-contract.md / quickstart.md / tasks.md** em `specs/006-roi-labs-agents/`.
- **`src/lib/companies/roi-labs-roster.ts`** — dado puro: 13 `RoiLabsAgentDef` (harness por cargo) + `buildSystemPrompt()` (7 blocos) + `validateRoster()` (INV-1..8) + `blueprintRoleKeys()`.
- **`scripts/seed-roi-labs-agents.ts`** — seed idempotente: pasta "ROI Labs" + 13 agentes + skills/MCP/KB + encaixe 1:1 nos cargos.
- **`src/__tests__/lib/roi-labs-roster.test.ts`** — teste puro das invariantes (roda no CI; jest não roda local por OneDrive).

## Decisões (e por quê)

- **Provider via prefixo do model**: `claude-opus-4-8` (CEO) / `claude-sonnet-4-6` (12) → `providerOf()` roteia `claude-*` para claude-cli. Sem campo de provider extra. (claude-models.ts confirma os IDs.)
- **Seed, não API/migração**: replica `seed-sirius-agents.ts`. **Zero schema novo** → sem migração; coordinator **intocado** (Princípio II/III). Só criei arquivos novos — nenhum existente editado.
- **Delegação ≠ tabela**: `AgentDelegation` é log de runtime. A hierarquia (FR-014) vive no **system prompt** (`delegatesTo/receivesFrom/peers` por nome de cargo) + tool `delegate_to_agent` + execução por fase da 005. Sem aresta invertida (operacional não delega "para cima") — validado por `validateRoster`.
- **Capacidades por cargo (menor privilégio)**: skills built-in mapeadas por categoria↔cargo; MCP do dono vinculado por heurística de nome, senão registrado em `config.intendedTools` (FR-013b, degradação graciosa). Não fabrica MCP/plugins fake.
- **Idempotência**: chave `Agent.config.roiLabsRole` + `createdBy` (dono da company). Re-rodar converge para 13/1/0.
- **Memória**: ON nas camadas strategic+tactical (8), OFF na operacional (5) — fiel ao blueprint ("operacionais em foco isolado").

## Próximos passos (em ordem)

1. **Executar o seed no host real** (onde vive a Company `0e7d636a`):
   `ROI_LABS_COMPANY_ID='0e7d636a-...' DATABASE_URL='<host real 2.24.207.200:5435>' npx tsx scripts/seed-roi-labs-agents.ts`
   — precisa do `DATABASE_URL` do host real (NÃO o `bot@31.97` do `.env`). Confirmar credencial com o dono.
2. **E2E autenticado** (quickstart.md, 4 cenários): 13/13 cargos ocupados; pasta "ROI Labs" com 13; CEO=Opus/demais=Sonnet; disparar 1 execução e ver as 7 fases.
3. **CI verde** (teste do roster + tsc).

## Pendências / decisões em aberto

- **Knowledge base sem embeddings**: o seed cria a KB + `KnowledgeDocument` (status `processing`); os embeddings ficam a cargo do pipeline RAG existente (não gerados no seed para evitar custo/OpenRouter). Reprocessar se a busca semântica for necessária.
- **MCP/plugins**: provavelmente o dono não tem servidores MCP cadastrados → vínculos ficam em `intendedTools`. Quando criar MCPs (repository/filesystem/ci-cd/sandbox/test-runner/task-management/security-scan/research), re-rodar o seed vincula automaticamente (idempotente).
- **`0e7d636a` é a Company definitiva?** Se não, passar outro `--company` ou deixar o seed descobrir pelo nicho `software_house` (erro se houver >1).

## Gotchas do ambiente

- `tsc --noEmit` = 0 erros (include `**/*.ts` cobre `scripts/` também). jest **não** roda local (OneDrive errno -4094) → CI.
- Coordinator/engine: diff vazio (verificar antes de merge). Nada em `src/lib/orchestration/**` foi tocado.
- Rodar o seed no host **errado** (`.env` de dev) cria os agentes no banco que não serve produção → não aparecem na Company real.
