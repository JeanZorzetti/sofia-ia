# Research — Squads por Case de Uso (Phase 0)

Decisões técnicas resolvidas antes do design. Cada item: **Decisão · Razão · Alternativas rejeitadas**.

## R1 — Squad = `Team` persistente vinculado a uma `Company`

- **Decisão**: Não criar entidade nova. Um squad é um `Team` com `companyId` setado e `status='active'`,
  cujos `TeamMember` referenciam agentes do **pool** (`Agent`). O case de uso (texto "quando usar") vai em
  `Team.config.useCase`; nome/descrição reusam `Team.name`/`Team.description`.
- **Razão**: `TeamMember.agentId` já é uma referência ao pool (FK `Agent`, `onDelete: Cascade`), e o engine
  de Times já executa `lead → workers → reviewer`. Reuso quase total = menor superfície, sem duplicar
  definição de agente (Decisão 2 do brainstorm: pool compartilhado).
- **Alternativas rejeitadas**: (a) entidade `Squad` dedicada → duplica o que `Team` já faz, exige novo
  engine; (b) só `Team.config` Json sem coluna → read-path de "squads por empresa" fica sem índice.

## R2 — Distinguir squad de Time avulso e de Time de fase (`internal`)

- **Decisão**: `Team.companyId` nullable. **`null` = Time avulso legado** (a UI de Times e o comportamento
  atual ficam byte-idênticos). **setado + `status='active'` = squad** (aparece em `/empresas`). Os Times de
  **fase** da 005 continuam `status='internal'` (efêmeros, fora da UI) — não são squads.
- **Razão**: Um único discriminador (coluna + status) cobre os três casos sem ambiguidade e sem tocar o
  fluxo legado.
- **Alternativas rejeitadas**: enum `kind` novo → mais migração para o mesmo resultado; inferir por
  `config.companyId` → os Times de fase já usam isso, colidiria.

## R3 — Execução do squad: caller direto, coordinator intocado

- **Decisão**: Rodar um squad = `runTeamAndWait(squadTeamId, { mission })` **diretamente** (o squad já é um
  Team persistente). Nenhum meta-orquestrador novo (diferente da 005, que monta um Time por fase).
- **Razão**: Princípio II. O squad não tem "fases"; é uma única passada do time. O caller já existe e é
  usado pela 005.
- **Alternativas rejeitadas**: orquestrador próprio de squad → complexidade desnecessária; o engine de Times
  já entrega lead/worker/reviewer.

## R4 — WIP=1 **global**: gate single-flight com advisory lock Postgres

- **Decisão**: A fila é o próprio `TeamRun.status='pending'` (squad-runs) ordenado por `createdAt`. Um
  dispatcher `dispatchSquadQueue()` serializa o início: dentro de uma transação, adquire
  `pg_advisory_xact_lock(<chave fixa de squads>)`, conta squad-runs `running` **em toda a plataforma**; se
  `0`, faz o *claim* atômico do `pending` mais antigo (marca `running`) e dispara `runTeamAndWait` via
  `after()`; se `≥1`, não faz nada (fica na fila). Ao concluir um run, o dispatcher é chamado de novo para
  puxar o próximo; um cron `drain-squad-queue` é a rede de segurança.
- **Razão**: O escopo é global (clarificação) porque o pool de contas Claude é compartilhado por todas as
  empresas. O advisory lock dá atomicidade entre requests/instâncias sem tabela de lock dedicada. Espelha o
  padrão dos crons de resiliência (007/008) que varrem por `status`.
- **Alternativas rejeitadas**: (a) `runWithConcurrency` → é fan-out **em memória, per-processo**; não
  serializa entre requisições nem entre instâncias do EasyPanel; (b) flag em memória/módulo → idem, e morre
  no restart; (c) tabela `SquadRunQueue` → `TeamRun.status='pending'` já é a fila; só faltava o claim atômico.
- **Definição de "squad-run" para o gate**: `TeamRun` cujo `Team.companyId IS NOT NULL` e `Team.status='active'`.

## R5 — "Só os membros do squad rodam" + lazy staffing (FR-003/FR-004)

- **Decisão**: Satisfeitos **por construção** — um squad tem só 2-4 `TeamMember`, então `runTeamAndWait`
  ativa apenas eles; o engine já delega `lead → worker → reviewer` sob demanda (membros fora do passo
  corrente não emitem chamadas). Nada novo a implementar; apenas documentar/validar.
- **Razão**: O comportamento desejado é o comportamento nativo do engine quando o time é pequeno.
- **Alternativas rejeitadas**: lógica de ativação seletiva nova → redundante com o engine.

## R6 — Integração com resiliência 008 (pool esgotado)

- **Decisão**: Squad-runs são `TeamRun` normais → herdam 008 (`rate_limited` + `resetAt` + cron
  `resume-blocked-teams`). O dispatcher trata `rate_limited`/`blocked` como **não-`running`** mas **não
  inicia o próximo** enquanto houver run aguardando reset (pool esgotado afeta todos) — o resume cron da 008
  é quem retoma. 
- **Razão**: Evita queimar a fila inteira contra um pool já esgotado; reusa o mecanismo existente.
- **Alternativas rejeitadas**: tratamento próprio de rate limit no squad → duplicaria 008.

## R7 — Templates de squad (decomposição da ROI Labs, US4)

- **Decisão**: `squad-blueprint.ts` define, por nicho, uma lista de squads `{ key, label, useCase,
  members: [{ roleKey, role: 'lead'|'worker'|'reviewer' }] }`. `buildSquadRoster(template, staffing)` resolve
  `roleKey → CompanyRole.agentId` (staffing da empresa) → `RosterInput[]`, análogo a `buildPhaseRoster`.
  Seed `seed-roi-labs-squads.ts` é **idempotente** (upsert por `companyId + squad key`).
- **Razão**: Aproveita o roster de 13 agentes já encaixado (006) sem recriar agentes; squads viram
  composições por referência.
- **Squads-semente propostos** (nicho `software_house`, derivados do roster/`delegatesTo`):
  | key | useCase | lead | workers | reviewer |
  |-----|---------|------|---------|----------|
  | `feature` | Implementar uma feature nova | `architect` | `backend`, `frontend` | `qa` |
  | `hotfix` | Corrigir bug/incidente rápido | `backend` | — | `qa` |
  | `discovery` | Descoberta de produto / PRD | `pm` | `ba`, `po` | `architect` |
  | `security_audit` | Auditoria de segurança | `ciso` | `backend` | `qa` |
  | `data_pipeline` | ETL / análise de dados | `data` | `backend` | `qa` |
- **Alternativas rejeitadas**: só composição manual na UI → não materializa o caso real (SC-006); templates
  + seed cobrem US4 e dão exemplos para a UI.

## R8 — Métrica de consumo (SC-002)

- **Decisão**: Reusar o proxy de consumo já existente (`TeamMemberUsage` / `turnsUsed` por run) para comparar
  squad-run vs run da empresa inteira. Baseline = média de `tokensUsed`/`turnsUsed` de um `CompanyRun`
  (fases SDLC) sobre a mesma classe de tarefa.
- **Razão**: Não inventar telemetria nova; os campos já existem em `TeamRun`/`TeamMemberUsage`.
- **Alternativas rejeitadas**: instrumentação nova → desnecessária para validar a meta.
