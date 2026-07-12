# Feature Specification: Diff de review isolado por task

**Feature Branch**: `010-isolate-reviewer-diff`

**Created**: 2026-06-27

**Status**: Draft

**Input**: User description: "Isolar o diff que o reviewer recebe por tarefa em code-runs de Teams. Hoje o review pass captura UM único diff global do working tree e o entrega a TODAS as tasks em review, gerando rejeições em cascata mesmo quando cada worker fez exatamente o escopo da sua task."

## Contexto do Problema

Em code-runs de Teams (modo `code`, com repositório clonado), os workers editam um **working tree compartilhado** dentro do sandbox e, ao final, um reviewer julga o trabalho. Hoje o reviewer recebe **um único diff do working tree inteiro contra a base** (o mesmo diff para todas as tasks da passada de review). Como os workers rodam acumulando mudanças no mesmo diretório, cada task é avaliada contra a **soma de todas as mudanças** de todas as outras tasks/fases.

O efeito observado na run real `bb7b8414` (time "Squad Feature", feature 004): cada worker entregou exatamente o escopo da sua task, mas o reviewer rejeitou em cascata acusando "destruição massiva não autorizada" — porque enxergava no diff as deleções legítimas feitas por *outras* tasks. Resultado: loop de rejeições, 8/14 tasks travadas em retry, nenhum PR utilizável, ~147k tokens gastos.

A causa não é alucinação dos workers; é **falta de atribuição do diff por task**. Esta feature corrige isso: cada reviewer deve ver **somente** as mudanças produzidas pela task que está revisando.

## Clarifications

### Session 2026-06-27

- Q: A serialização de workers deve ser sempre ativada quando há reviewer + repo, ou configurável? → A: Sempre ativa (sem flag); runs sem reviewer ou sem repo não serializam.
- Q: Onde gravar o diff isolado por task, dado que o coordinator (intocado) continua gravando o diff global em `reviewDiff`? → A: Campo próprio por task (ex.: `artifacts.scopedDiff`); reviewer e UI o priorizam, com fallback ao `reviewDiff` global legado quando ausente.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reviewer julga apenas o trabalho da própria task (Priority: P1)

Um worker conclui sua task editando um conjunto de arquivos no repositório do sandbox. O reviewer recebe, para aquela task, apenas o diff correspondente às mudanças daquele worker — sem as mudanças das demais tasks da mesma run.

**Why this priority**: É o núcleo da feature. Sem isso, o loop de rejeição em cascata persiste e nenhuma feature multi-fase consegue ser entregue por um squad de code-run.

**Independent Test**: Em uma run de code com reviewer e duas tasks que tocam arquivos distintos, verificar que o diff entregue ao reviewer da Task A contém apenas os arquivos de A (e o da Task B, apenas os de B). Entregável e testável isoladamente.

**Acceptance Scenarios**:

1. **Given** uma run de code com repositório e reviewer, com a Task A editando `arquivo1` e a Task B editando `arquivo2`, **When** o reviewer avalia a Task A, **Then** o diff que ele recebe inclui apenas as mudanças em `arquivo1` e não menciona `arquivo2`.
2. **Given** a mesma run, **When** o reviewer avalia a Task B, **Then** o diff inclui apenas `arquivo2`.
3. **Given** um worker que extrapola o escopo e altera arquivos além dos pedidos na sua task, **When** o reviewer avalia essa task, **Then** o diff inclui **todas** as alterações feitas por aquele worker no seu turno (inclusive as fora de escopo), permitindo a rejeição legítima — mas **não** inclui mudanças de outras tasks.

### User Story 2 - Comportamento legado preservado para runs sem repositório (Priority: P1)

Runs que não têm um repositório isolável (chat-runs e code-runs sem repo clonado) continuam funcionando exatamente como hoje, sem diff e em modo texto.

**Why this priority**: A constituição exige que o comportamento legado permaneça byte-idêntico quando a nova capacidade não é acionada (Princípio II). Qualquer regressão aqui quebra runs existentes.

**Independent Test**: Rodar um chat-run e um code-run sem repo; confirmar que o conteúdo entregue ao reviewer e o resultado são idênticos ao comportamento anterior à feature.

**Acceptance Scenarios**:

1. **Given** um chat-run com reviewer, **When** a passada de review ocorre, **Then** o reviewer recebe o mesmo conteúdo de antes (sem diff) e o resultado é inalterado.
2. **Given** um code-run **sem** repositório clonado, **When** a passada de review ocorre, **Then** o comportamento é idêntico ao legado (text-only).

### User Story 3 - Re-execução (retry) é avaliada apenas pela nova tentativa (Priority: P2)

Quando o reviewer rejeita uma task e o worker a re-executa, o reviewer da nova tentativa recebe o diff correspondente apenas à re-execução mais recente.

**Why this priority**: Sem isso, o retry herdaria o diff antigo (já rejeitado) ou um diff acumulado, perpetuando a confusão. Importante, mas depende da US1 já estar em pé.

**Independent Test**: Forçar uma rejeição seguida de correção; verificar que o diff da segunda avaliação reflete somente o estado produzido pela correção.

**Acceptance Scenarios**:

1. **Given** uma task rejeitada e re-executada pelo worker, **When** o reviewer avalia novamente, **Then** o diff reflete o resultado da nova tentativa, não o da tentativa anterior.

### Edge Cases

- **Worker não altera nada**: o diff da task é vazio; o reviewer recebe a indicação de "nenhuma mudança" daquela task (não o diff de outras tasks).
- **Duas tasks tocam o mesmo arquivo (em turnos diferentes)**: como os workers são serializados, o diff de cada task reflete apenas o delta introduzido no turno daquele worker sobre o estado deixado pelo anterior.
- **Falha ao capturar o snapshot/diff de uma task**: o gate de review nunca pode ser bloqueado por uma falha de captura — deve haver degradação segura (a ausência de diff por task não derruba a run).
- **Diff muito grande**: os mesmos limites de tamanho de diff já existentes continuam valendo (truncamento por arquivo e total), agora aplicados ao diff por task.
- **Run órfã/reinício no meio**: a serialização e a captura não podem deixar o working tree ou os snapshots em estado que impeça uma futura retomada.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST entregar a cada reviewer, em code-runs com repositório, apenas o diff correspondente às mudanças produzidas pela task sob revisão.
- **FR-002**: O diff por task MUST conter **todas** as alterações feitas pelo worker durante o turno daquela task — incluindo alterações fora do escopo pedido — para que extrapolações reais possam ser detectadas e rejeitadas.
- **FR-003**: O diff por task MUST excluir as mudanças produzidas por outras tasks da mesma run.
- **FR-004**: Em code-runs com repositório **e** reviewer, a execução dos workers MUST ser serializada (um worker por vez) o suficiente para que cada conjunto de mudanças seja atribuível a uma única task — inclusive quando o grafo de tarefas (dependsOn) estiver ativo. Esta serialização é **sempre ativa** nesse cenário (sem flag de configuração); runs sem reviewer ou sem repositório NÃO são serializadas (comportamento legado).
- **FR-005**: O sistema MUST preservar a ordenação por dependências do grafo (dependsOn) mesmo com a execução serializada (o grafo continua respeitando dependências; apenas não executa dois workers simultaneamente nessas runs).
- **FR-006**: Em chat-runs e em code-runs **sem** repositório, o comportamento MUST permanecer idêntico ao legado (review em modo texto, sem diff por task).
- **FR-007**: Na re-execução (retry) de uma task rejeitada, o reviewer MUST receber o diff correspondente apenas à tentativa mais recente.
- **FR-008**: A captura do diff por task MUST falhar de forma segura: uma falha de captura não pode bloquear nem derrubar a passada de review (degradação graciosa).
- **FR-009**: O sistema MUST aplicar ao diff por task os mesmos limites de tamanho (por arquivo e total) já praticados, evitando estouro de contexto do modelo.
- **FR-010**: O diff isolado por task MUST ser persistido em um campo próprio por task (distinto do `reviewDiff` global que o coordinator intocado continua gravando) e ficar disponível para exibição na interface da run. O reviewer e a UI MUST priorizar o diff por task quando presente e usar como fallback o diff global legado quando ausente (runs antigas / sem snapshot).
- **FR-011** (Restrição de arquitetura — NON-NEGOTIABLE): A solução MUST ser implementada sem editar o coordinator de orquestração (`runTeam` clássico e o coordinator de grafo) — apenas por injeção (dependências do worker, campos opcionais, helpers puros e leitura read-side), conforme o Princípio II da constituição.

### Key Entities *(include if feature involves data)*

- **Task (TeamTask)**: unidade de trabalho atribuída a um worker. Passa a carregar, em um campo de artefato **próprio** (distinto do `reviewDiff` global), o diff isolado das mudanças que aquele worker produziu.
- **Diff por task (scopedDiff)**: o conjunto de mudanças (arquivos e conteúdo) atribuível ao turno de um único worker; é o que o reviewer recebe e o que a UI exibe para aquela task. Quando ausente (run legada / sem snapshot), o sistema cai no diff global (`reviewDiff`).
- **Run (TeamRun)**: a execução do time; agrega as tasks e seus diffs isolados. O diff agregado da run (para PR/commit) continua sendo o estado final do working tree.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em uma run de code com reviewer e múltiplas tasks que tocam arquivos distintos, 100% das tasks recebem um diff que contém apenas os seus próprios arquivos (zero vazamento de arquivos de outras tasks).
- **SC-002**: A taxa de rejeições causadas por "mudanças de outra task" cai a zero (nenhuma review_note acusa alterações que pertencem a outra task da mesma run).
- **SC-003**: Runs legadas (chat-runs e code-runs sem repo) permanecem byte-idênticas no que o reviewer recebe e no resultado — verificável pelos testes de regressão existentes.
- **SC-004**: Uma run multi-fase equivalente à `bb7b8414` (remoção de subsistema em várias fases) consegue ser avaliada fase a fase sem rejeição em cascata, chegando a aprovação quando o trabalho de cada task está correto.
- **SC-005**: Nenhuma passada de review é abortada por falha de captura de diff (degradação segura comprovada por teste).

## Assumptions

- O usuário ativará o grafo (dependsOn) manualmente nas próximas runs; a serialização desta feature convive com o grafo sem desabilitá-lo — apenas remove a concorrência simultânea de workers em code-runs com reviewer.
- "Mudanças produzidas por uma task" são definidas como o delta do repositório entre o início e o fim do turno do worker daquela task (snapshot antes/depois), assumindo execução serializada — escolha confirmada pelo usuário (alternativas: worktree por task; filtrar por arquivos tocados).
- O diff agregado para commit/PR final continua sendo o estado final do working tree (esta feature isola o que o *reviewer* vê por task, não muda a entrega final).
- Os limites de tamanho de diff já existentes são adequados e serão reutilizados.
- A perda de paralelismo de workers em runs com reviewer é aceitável, pois features multi-fase normalmente têm forte dependência entre fases (pouca paralelização real) e a correção do loop de rejeição tem prioridade sobre velocidade.
- Aplica-se tanto ao coordinator clássico quanto ao de grafo, ambos preservados intactos (mudança por injeção).
