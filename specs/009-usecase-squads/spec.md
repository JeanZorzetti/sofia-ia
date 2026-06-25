# Feature Specification: Squads por Case de Uso sobre Empresas

**Feature Branch**: `009-usecase-squads`

**Created**: 2026-06-24

**Status**: Clarified

**Input**: User description: "Granularizar a empresa generalista (ROI Labs, 13 agentes) em unidades menores por case de uso, porque manter 13 agentes IA rodando via claude-cli com poucas assinaturas no pool é insustentável de custo. Criar uma camada `/empresas` (separada de `/agentes`): Empresa > Cases de uso (squads especialistas por tarefa). Squad é a unidade de execução; a empresa vira guarda-chuva."

## Contexto e Decisões de Brainstorm *(âncora)*

- **Premissa corrigida**: o custo não vem de *quantos agentes existem* (definição é config parada), mas de *quantos rodam ao mesmo tempo* e do *tamanho do contexto por chamada*. O gargalo é o rate limit do pool de contas Claude (claude-cli), não a contagem de agentes.
- **Decisão 1 — Reusar Company/Team**: "Empresa" = `Company` existente (Feature 005); "Squad / case de uso" = `Team internal` existente. Sem entidade nova; o trabalho é repaginar a UI e mudar o *modo de execução*.
- **Decisão 2 — Pool compartilhado**: agentes são definidos uma única vez em `/agentes` (catálogo, 1 fonte de verdade por papel); squads *referenciam* agentes do pool, sem duplicar definições.
- **Coordinator intocado** (Princípio II, NON-NEGOTIABLE): nada disto edita `runTeam`; extensões por injeção / read-side / UI.

## Clarifications

### Session 2026-06-24

- Q: Qual o escopo do limite de concorrência (WIP) que protege o pool? → A: **Global** — no máximo 1 squad em execução por vez em toda a plataforma, com fila única compartilhada entre todas as empresas. É o que de fato protege o rate limit do pool compartilhado.
- Q: O que fazer com a execução por fases SDLC da empresa (`runCompany`, Feature 005)? → A: **Manter opcional** — o squad passa a ser o modo padrão de operar; a execução por fases continua disponível, sem forçar migração das empresas existentes (Features 005/006/007 seguem válidas).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Rodar um squad enxuto por case de uso (Priority: P1)

O operador, em vez de acionar a empresa inteira (13 agentes), seleciona um **squad** especializado num case de uso (ex.: "Feature nova", "Hotfix", "Auditoria de segurança") e dispara uma tarefa. Apenas os 2-4 agentes daquele squad participam da execução.

**Why this priority**: É o coração da feature e a única coisa que de fato reduz o custo — menos agentes ativos por execução e contexto menor por chamada. Entrega valor mesmo sem a navegação nova: já dá para resolver uma tarefa consumindo uma fração do pool.

**Independent Test**: Disparar um case de uso composto por ≤4 agentes do pool e confirmar que (a) só esses agentes executam e (b) a tarefa é concluída de ponta a ponta, sem acionar os demais agentes da empresa.

**Acceptance Scenarios**:

1. **Given** uma empresa com vários squads e um pool de agentes, **When** o operador dispara uma tarefa num squad de 3 membros, **Then** apenas esses 3 agentes são ativados e a execução conclui com o resultado da tarefa.
2. **Given** um squad cujos membros referenciam agentes do pool, **When** um agente do pool é editado, **Then** a mudança reflete em todos os squads que o referenciam (sem duplicação).
3. **Given** uma tarefa que não exige todos os papéis do squad, **When** o squad executa, **Then** apenas os papéis necessários ao passo corrente consomem o pool (staffing sob demanda; sem ativar membros ociosos).

---

### User Story 2 - Empresa como guarda-chuva navegável em `/empresas` (Priority: P2)

O operador acessa `/empresas`, vê cada empresa como um agrupador leve e seus squads como **cards clicáveis de "rodar"**. `/agentes` permanece como o catálogo (pool) de definições. A empresa em si não é mais uma entidade que executa fases — ela agrupa e fornece contexto/defaults.

**Why this priority**: Estabelece o modelo mental correto (a unidade de operação diária é o *squad*, não a empresa) e separa "biblioteca de agentes" de "organização operacional". Sem isto, recria-se o peso do organograma da Feature 005 numa página nova.

**Independent Test**: Abrir `/empresas`, navegar até uma empresa, ver a lista de squads com seus cases de uso e iniciar a execução de um squad diretamente do card — tudo sem passar por `/agentes`.

**Acceptance Scenarios**:

1. **Given** empresas com squads cadastrados, **When** o operador abre `/empresas`, **Then** vê empresas como agrupadores e, dentro de cada uma, os squads com nome + descrição do case de uso.
2. **Given** a página de uma empresa, **When** o operador clica num squad, **Then** consegue disparar uma tarefa para aquele squad sem navegar para outra área.
3. **Given** a separação de áreas, **When** o operador abre `/agentes`, **Then** vê o pool de definições reutilizáveis, não as composições operacionais.

---

### User Story 3 - WIP=1 e fila para proteger o pool (Priority: P2)

Quando um squad está executando, novos disparos não rodam em paralelo: entram numa **fila** e são processados um de cada vez. Isto evita estourar o rate limit do pool de contas Claude por concorrência indevida.

**Why this priority**: É a proteção operacional que torna a economia previsível. O usuário já opera "1 ativo por vez" na prática; tornar isto explícito impede regressões de custo. Depende de existir execução de squad (US1), por isso vem depois.

**Independent Test**: Disparar dois squads em sequência rápida e confirmar que o segundo aguarda na fila até o primeiro concluir, sem execução simultânea e sem falha por rate limit de concorrência.

**Acceptance Scenarios**:

1. **Given** um squad em execução, **When** o operador dispara um segundo squad, **Then** o segundo fica "na fila" e inicia automaticamente quando o primeiro termina.
2. **Given** uma fila com itens pendentes, **When** o operador consulta o estado, **Then** vê claramente o que está rodando e o que aguarda (com posição/ordem).
3. **Given** o pool de contas esgotado durante um run, **When** ocorre o esgotamento, **Then** o comportamento de resiliência já existente (Features 007/008: `blocked` + `resetAt` + retomada) é preservado, sem marcar `completed` falso.

---

### User Story 4 - Decompor a empresa ROI Labs (13 agentes) em squads (Priority: P3)

A empresa generalista "ROI Labs" existente é reorganizada: os 13 cargos permanecem no pool, e são criados squads por case de uso que referenciam subconjuntos (padrão lead → worker → reviewer).

**Why this priority**: Aproveita o roster já semeado (Feature 006) e materializa o ganho no caso real, mas é uma aplicação da capacidade (US1–US3), não a capacidade em si.

**Independent Test**: A partir do roster existente, compor ao menos um squad por case de uso prioritário e rodá-lo, confirmando reuso (sem recriar agentes) e execução enxuta.

**Acceptance Scenarios**:

1. **Given** o roster de 13 agentes da ROI Labs, **When** os squads são criados, **Then** cada squad referencia agentes do pool existente sem duplicá-los.
2. **Given** os squads criados, **When** um case de uso prioritário é disparado, **Then** roda apenas o subconjunto correspondente.

---

### Edge Cases

- **Squad sem membros ou com agente removido do pool**: o que acontece ao disparar um squad cujo agente referenciado foi excluído do pool? (degradar com aviso vs bloquear o disparo).
- **Empresa legada com `runCompany` (Feature 005)** (resolvido): a execução por fases SDLC **permanece disponível como modo opcional**; o squad passa a ser o modo padrão. Nenhuma empresa existente é forçada a migrar.
- **Escopo da fila WIP=1** (resolvido): o limite é **global no pool** — no máximo 1 squad rodando em toda a plataforma, fila única compartilhada entre empresas. É o que protege o rate limit do pool compartilhado.
- **Mesmo agente em dois squads que tentam rodar** (resolvido): com WIP global de 1, nunca há dois squads em execução simultânea — logo, não há conflito de execução nem de consumo concorrente.
- **Squad muito grande**: operador compõe um squad com muitos membros, anulando a economia — há um teto sugerido/avisado?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST permitir compor um squad (case de uso) **referenciando** agentes existentes do pool, sem criar cópias das definições de agente.
- **FR-002**: Cada squad MUST ter nome e descrição do case de uso (para quê serve / quando usar), exibidos na navegação.
- **FR-003**: Ao disparar uma tarefa num squad, o sistema MUST ativar **apenas** os agentes membros daquele squad — nunca os demais agentes da empresa.
- **FR-004**: O sistema MUST executar os membros de um squad sob demanda no fluxo lead → worker(s) → reviewer, de modo que membros não envolvidos no passo corrente não consumam o pool (staffing sob demanda).
- **FR-005**: A página `/empresas` MUST listar empresas como agrupadores e, dentro de cada empresa, seus squads como itens acionáveis (disparar execução a partir do card do squad).
- **FR-006**: A área `/agentes` MUST permanecer como o catálogo do pool de definições reutilizáveis, distinta de `/empresas`.
- **FR-007**: A empresa MUST funcionar como guarda-chuva leve (identidade, contexto e defaults aplicáveis aos seus squads) e NÃO deve exigir o preenchimento de um organograma completo para operar.
- **FR-008**: O sistema MUST impor concorrência máxima de **1 squad em execução por vez em toda a plataforma** (WIP global no pool), enfileirando todos os disparos adicionais numa fila única — independentemente da empresa de origem.
- **FR-009**: O sistema MUST expor o estado da fila (o que está rodando, o que aguarda e em que ordem) ao operador.
- **FR-010**: O comportamento de resiliência ao esgotamento do pool (estado `blocked` + `resetAt` + retomada manual/cron) das Features 007/008 MUST ser preservado para execuções de squad.
- **FR-011**: Toda capacidade nova MUST ser adicionada sem editar o coordinator (`runTeam`): comportamento legado byte-idêntico quando a feature não é acionada (Princípio II).
- **FR-012**: Execuções de squad MUST usar exclusivamente claude-cli em todos os membros (sem API/chat pago), conforme restrição de custo do projeto.
- **FR-013**: O sistema MUST permitir reorganizar a empresa ROI Labs existente em squads por case de uso reutilizando o roster atual (FR-001), sem recriar agentes.

### Key Entities *(include if feature involves data)*

- **Empresa** (reusa `Company`, Feature 005): guarda-chuva que agrupa squads e fornece identidade/contexto/defaults. Não é unidade de execução.
- **Squad / Case de uso** (reusa `Team internal`): unidade operacional e de execução; atributos novos relevantes: descrição do case de uso e marcação de "quando usar". Composto por membros que referenciam agentes do pool, com papéis (lead/worker/reviewer).
- **Agente** (reusa `Agent`, pool): definição reutilizável; referenciada por N squads; 1 fonte de verdade por papel.
- **Execução de Squad** (reusa `TeamRun`): instância de rodar um squad numa tarefa; carrega estado de resiliência (`blocked`/`resetAt`).
- **Fila / Controle de WIP**: mecanismo que garante no máximo 1 squad em execução no escopo definido e ordena os disparos pendentes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Rodar um case de uso ativa **≤ 4 agentes** por execução (vs 13 da empresa generalista hoje).
- **SC-002**: O consumo do pool por tarefa resolvida (proxy: tokens/chamadas por tarefa) é medido contra um baseline (execução da empresa inteira) e cai **≥ 60%** para um case de uso típico (squad de ≤4 vs 13 agentes).
- **SC-003**: **Zero** falhas de run causadas por concorrência indevida no pool (dois ou mais squads rodando em paralelo no escopo protegido).
- **SC-004**: A partir de `/empresas`, o operador dispara um case de uso em **≤ 3 cliques**.
- **SC-005**: **Nenhuma regressão** no coordinator: execuções que não acionam a feature nova permanecem byte-idênticas em comportamento.
- **SC-006**: A empresa ROI Labs passa a ter **≥ 3 squads** por case de uso operáveis, todos reutilizando o roster existente (0 agentes duplicados).

## Assumptions

- Reusa `Company`/`Team`/`Agent` existentes (decisão de brainstorm); nenhuma entidade nova é estritamente necessária além de campos/estado para case de uso e fila.
- Agentes são um pool compartilhado; squads são composições por referência.
- Execução interna é exclusivamente claude-cli; escalar vazão = somar contas ao pool, não migrar para API paga.
- O coordinator (`runTeam`) não é editado; extensões entram por injeção / read-side / UI.
- A resiliência das Features 007/008 (esgotamento do pool) continua válida e é herdada pelas execuções de squad.
- Migrações de schema, se necessárias (ex.: campos de case de uso, estado de fila), seguem o Princípio III: migração formal aplicada manualmente no host real `2.24.207.200:5435` antes do push.
- O modo legado de execução por fases SDLC da empresa (`runCompany`, Feature 005) permanece disponível como **modo opcional**; o squad é o modo padrão de operar a empresa.
