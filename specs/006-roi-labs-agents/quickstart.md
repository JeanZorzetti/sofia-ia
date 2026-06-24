# Quickstart — ROI Labs Roster

## Pré-requisitos

- A Company ROI Labs já existe (Feature 005, nicho `software_house`) com os 13 cargos vagos.
  Id de referência: `0e7d636a-...` (ver `https://polarisia.com.br/dashboard/agents/empresa/0e7d636a-...`).
- Acesso ao **host real** do banco de produção (`2.24.207.200:5435`) via `DATABASE_URL`.
- Claude CLI configurado no host de runtime (pool `CLAUDE_CODE_OAUTH_TOKEN(S)`) — necessário só para
  *executar* a empresa depois, não para o seed.

## Rodar o seed

```bash
# a partir de Imob/sofia-next
ROI_LABS_COMPANY_ID='0e7d636a-...' \
DATABASE_URL='postgresql://<user>:<pass>@2.24.207.200:5435/<db>' \
npx tsx scripts/seed-roi-labs-agents.ts
```

Saída esperada (resumida):

```
ROI Labs roster — company 0e7d636a (dono: <email>)
  Folder "ROI Labs" .......... created
  ceo  → Agent created  (claude-opus-4-8)   staffed ✓  skills: 4   mcp: 0 (intended: research)
  cto  → Agent created  (claude-sonnet-4-6) staffed ✓  skills: 4   mcp: 0 (intended: repository,research)
  ...
  data → Agent created  (claude-sonnet-4-6) staffed ✓  skills: 5   mcp: 0 (intended: filesystem)
Done: 13/13 roles staffed · 0 vagas · idempotente.
```

Re-rodar deve imprimir `updated`/`already staffed` e manter **13/1/0** (idempotência, SC-006).

## Validação E2E (gate real — autenticado em produção)

1. **Staffing visível** (US1/SC-001/002): abrir `…/dashboard/agents/empresa/0e7d636a-...` → organograma
   com os 13 cargos **ocupados** (0 vagas). Abrir a pasta "ROI Labs" em `/dashboard/agents` → 13 agentes.
2. **Modelos** (SC-003): inspecionar o agente do CEO → `claude-opus-4-8`; qualquer outro → `claude-sonnet-4-6`.
3. **Capacidades** (US2/SC-004): inspecionar DevOps → tem `run_code`/`http_request`, e ferramentas de
   tickets **não**; inspecionar Scrum Master → o oposto; abrir a knowledge base/`config` de qualquer um
   → material normativo do cargo + `intendedTools`.
4. **Operabilidade** (US4/SC-008): disparar uma execução da empresa com uma missão simples → progressão
   pelas 7 fases do SDLC, cada fase usando os agentes ocupantes; fase de QA exercendo o loop de revisão.

## Rollback

Sem schema novo → rollback é remover os dados:
- `DELETE FROM company_roles SET agent_id=NULL WHERE company_id=:id` (desencaixa) — ou via UI (DELETE staff).
- `DELETE FROM agents WHERE config->>'roiLabsRole' IS NOT NULL AND created_by=:owner` (remove os 13; casca
  vínculos por `onDelete: Cascade`).
- `DELETE FROM agent_folders WHERE name='ROI Labs' AND user_id=:owner`.

Nada disso toca o engine, a Company ou os agentes/Times pré-existentes.
