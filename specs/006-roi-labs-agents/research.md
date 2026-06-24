# Research — ROI Labs Roster (Phase 0)

Decisões técnicas que destravam o plano. Cada item: Decisão · Racional · Alternativas rejeitadas.

## R1 — Atribuição de modelo/provider via prefixo do `model`

**Decisão**: O campo `Agent.model` define o provider implicitamente. `providerOf()` em
`src/lib/ai/model-availability.ts` roteia `modelId.startsWith('claude-')` → `claude-cli`. Portanto:
- CEO → `model: 'claude-opus-4-8'`
- demais 12 → `model: 'claude-sonnet-4-6'`

Ambos os IDs existem em `src/lib/ai/claude-models.ts` (`CLAUDE_CLI_MODELS`) e aparecem em
`/api/models` como provider "Claude Code". Nenhum campo de provider extra é necessário.

**Racional**: Bate com o branching real de `chatWithAgent()`; evita modelo "morto"; honra a restrição
de custo (claude-cli, nunca API/chat pago, nunca `:free`).

**Rejeitado**: gravar `config.provider`/`config.modelProvider` → redundante e divergiria do roteamento
real. Usar IDs com sufixo de data → desnecessário (o alias curto já resolve via `claude-models.ts`).

## R2 — Seed script idempotente (não API, não migração)

**Decisão**: Criar `scripts/seed-roi-labs-agents.ts` replicando `scripts/seed-sirius-agents.ts`: Prisma
client direto, `findFirst`→`update` ou `create`. O encaixe usa a mesma lógica de `staff/route.ts`
(`companyRole.update({ where: { companyId_key }, data: { agentId } })`, respeitando 1:1).

**Racional**: É o padrão estabelecido do repo para popular agentes; sem schema novo, dispensa migração
e o risco do `db push` silencioso (Princípio III). Mantém a feature como pura configuração de dados.

**Rejeitado**: (a) chamar `POST /api/agents` + `POST .../staff` via HTTP → exigiria token de produção e
orquestração de rede para 13×N chamadas; o seed direto é mais simples e atômico. (b) `prisma/seed.ts`
(seed global) → não deve rodar a cada deploy; este seed é pontual/parametrizado.

## R3 — Delegação e hierarquia: prompt + execução por fase (não tabela estática)

**Decisão**: `AgentDelegation` é um **log de runtime** (`message`/`response`/`status`/`executionId`),
não uma config de "quem pode delegar para quem". A malha de delegação (FR-014) é materializada por:
1. **System prompt** — cada cargo declara sua camada, para quais cargos delega (top-down) e seus pares
   de mesma camada. Por **nome de cargo** (estável), não por agentId (frágil/efêmero).
2. **Tool `delegate_to_agent`** (`src/lib/ai/delegation.ts`) — capacidade de runtime, com guarda
   anti-loop (depth ≤ 3) já existente.
3. **Execução por fase da 005** — o paralelo-por-camada e o sequencial-por-fase reais acontecem quando a
   Company roda (1 Team por fase do SDLC, lead→workers paralelos→reviewer). O coordinator faz isso; nós
   só fornecemos os ocupantes.

**Racional**: Inserir arestas em `AgentDelegation` poluiria um log de execução com dados de config e não
seria lido por ninguém. O prompt + a topologia de fase já expressam a hierarquia de forma fiel e
verificável (sem aresta invertida operacional→estratégica).

**Rejeitado**: criar tabela/JSON de "delegação permitida" → schema novo (viola "sem migração") e
redundante com a RACI/execução por fase que já governa quem atua em cada etapa.

## R4 — Capacidades por cargo (menor privilégio)

**Decisão**: Mapear ferramentas por cargo a partir do blueprint (seção 8) e do que **existe** no tenant:
- **Skills**: vincular `BUILTIN_SKILLS` por afinidade categoria↔cargo via
  `prisma.skill.findFirst({ where: { name, isBuiltin: true } })` → `agentSkill.create`. Catálogo
  disponível: research (`web_search`, `extract_keywords`, `summarize_text`), development (`run_code`,
  `generate_uuid`, `generate_slug`, `estimate_tokens`, `check_password_strength`), integration
  (`http_request`, `validate_email`, `validate_cpf`, `validate_cnpj`), analytics (`calculate_roi`,
  `percentage_change`, `calculate_stats`, `parse_csv`, `format_number`, `detect_sentiment`, `build_utm`),
  content (`count_words`, `extract_urls`, `truncate_text`, `readability_score`), productivity
  (`date_diff`, `format_date`).
- **MCP servers**: vincular (`agentMcpServer.create`) os servidores **do dono** que casem com o escopo do
  cargo (lookup por nome/heurística). Se não houver, **não criar** servidores fake.
- **Plugins**: `AgentPlugin` exige `code` (JS custom). Não inventar plugins; vincular só se já existirem
  para o dono.

Para toda ferramenta **desejada porém ausente**, registrar em `Agent.config.intendedTools` (lista por
categoria) e logar a ausência (FR-013b) — o staffing dos demais não falha (degradação graciosa).

**Racional**: Honra menor privilégio (FR-013a) e a separação de responsabilidades do organograma;
mantém o seed honesto (não fabrica capacidades inexistentes) e auditável (`intendedTools` documenta a
intenção).

**Rejeitado**: criar MCP/plugins genéricos fake só para "preencher" → ferramentas que não funcionam
quebrariam runs e violariam a fidelidade.

## R5 — Idempotência

**Decisão**: Chave estável = `Agent.config.roiLabsRole === <roleKey>` (∈ os 13 keys do blueprint) **+**
`createdBy === ownerDaCompany`. O seed: para cada cargo, `findFirst` por essa chave → `update` (harness
+ folder + vínculos reconciliados) ou `create`. Folder idempotente por `name='ROI Labs' + userId`.
Vínculos idempotentes pelos `@@unique` já existentes (`[agentId, skillId]`, `[agentId, mcpServerId]`).

**Racional**: Re-rodar o seed converge sempre para 13 agentes / 1 pasta / 13 encaixes (SC-006), sem
depender de nome (que o usuário pode editar). `config` é Json livre no `Agent`, sem schema novo.

**Rejeitado**: idempotência por `name` → frágil (nome é editável/colidível). Por encaixe no cargo →
circular (o encaixe é resultado do seed, não pré-condição).

## R6 — Onde e como executar o seed

**Decisão**: O seed roda contra o **host real de produção** (`2.24.207.200:5435`), pois é onde vive a
Company `0e7d636a` (mesmo host das migrações 005). Forma de execução:
`DATABASE_URL='<conn do host real>' npx tsx scripts/seed-roi-labs-agents.ts --company 0e7d636a-...`
(ou `ROI_LABS_COMPANY_ID` via env). O script também aceita descobrir a company por
`niche=software_house` + nome quando o id não é passado.

Na sessão de implementação: escrever + `tsc`/lint limpos + commit/push são o entregável de código;
a **execução real contra produção** depende do `DATABASE_URL` do host real — confirmada com o usuário no
momento do implement (não há segredo de produção em código/chat). O gate final é E2E autenticado
(quickstart).

**Racional**: Alinha com o Princípio III (operações no host real são deliberadas) e com a regra de não
expor segredos.

**Rejeitado**: rodar contra o host do `.env` (`bot@31.97...`) → não é o banco que serve a produção; os
agentes não apareceriam na Company real.
