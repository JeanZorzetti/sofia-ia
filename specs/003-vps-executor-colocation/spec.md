# Feature Specification: Executor self-hosted na VPS + co-localização de lead/reviewer

**Feature Branch**: `003-vps-executor-colocation`

**Created**: 2026-06-22

**Status**: Draft

**Input**: User description: "Self-hosted VPS executor for Polaris Teams code-mode replacing E2B, co-locating lead and reviewer with the worker so they see the real repository state."

## User Scenarios & Testing *(mandatory)*

Atores: o **operador da Polaris** (quem dispara missões de Teams em code-mode) e os **membros do time** (lead, worker, reviewer) que colaboram para entregar código num repositório real.

Hoje, em code-mode, cada missão cria UM ambiente de execução efêmero e **só o worker entra nele** e edita o repositório. Dois efeitos limitam o produto: (a) o ambiente é destruído ao bater um teto fixo de ~1 hora, matando missões longas no meio; e (b) lead e reviewer ficam fora desse ambiente — o lead planeja só pelo texto da missão e o reviewer recebe apenas um diff textual, sem conseguir navegar o repositório vivo nem verificar por execução.

### User Story 1 - Missão longa não é morta por teto de tempo (Priority: P1)

Como operador, disparo uma missão de code-mode que leva mais de uma hora e ela **conclui** (entrega commit/diff), em vez de ser interrompida no meio quando o ambiente de execução é destruído.

**Why this priority**: É a causa direta de missões reais falharem hoje ("muitas missões duraram mais de 1 hora"). Sem isso, nenhuma missão não-trivial é confiável, e a tarefa de dogfooding (002-teams-dashboard) não fecha de ponta a ponta.

**Independent Test**: Disparar uma missão cuja execução ultrapasse 60 minutos e confirmar que ela chega a `completed` com entrega (commit/diff), sem erro de "ambiente não está mais ativo". Testável sozinha mesmo sem a US2.

**Acceptance Scenarios**:

1. **Given** uma missão de code-mode em um repositório, **When** a execução ultrapassa 60 minutos contínuos, **Then** o ambiente de execução continua vivo e a missão conclui normalmente.
2. **Given** uma missão curta (poucos minutos), **When** ela termina, **Then** o comportamento de entrega (commit, push, PR ou commit direto) é idêntico ao anterior — nenhuma regressão.
3. **Given** o backend de execução anterior (E2B) ainda configurado, **When** o operador seleciona explicitamente esse backend, **Then** a missão roda como antes — o novo executor é uma opção, não uma remoção.

---

### User Story 2 - Lead e reviewer enxergam o repositório real (Priority: P2)

Como operador, quero que o **lead** planeje com base no estado real do repositório e que o **reviewer** aprove/rejeite com base no que o worker realmente produziu (inclusive rodando verificação), e não num diff de texto isolado — para acabar com planos desalinhados e com rejeições falsas em loop.

**Why this priority**: É o segundo problema relatado (lead/reviewer não veem o trabalho do worker). Resolve a causa-raiz da "regra de ouro" (reviewer que lê um diretório intocado e rejeita tudo em loop infinito). Depende de existir um diretório de trabalho compartilhado, então vem depois da US1.

**Independent Test**: Numa missão com mudanças reais, confirmar que (a) o plano do lead referencia arquivos/estado que existem no repositório e (b) o veredito do reviewer reflete o resultado de uma verificação executada (teste/build/leitura) sobre as mudanças do worker — não apenas o diff textual.

**Acceptance Scenarios**:

1. **Given** um worker que editou arquivos do repositório, **When** chega o turno do reviewer, **Then** o reviewer pode verificar as mudanças contra o repositório vivo (estado e/ou resultado de verificação executada), além de receber o diff.
2. **Given** o turno do lead antes de decompor a missão, **When** ele planeja, **Then** ele recebe um retrato real do repositório (estrutura e arquivos-chave), de modo que as tarefas que escreve correspondem a arquivos que existem.
3. **Given** um time cujo lead/reviewer NÃO usa o modelo CLI premium, **When** a missão roda, **Then** o comportamento e o custo permanecem equivalentes ao atual (o enriquecimento de contexto não obriga a usar o modelo caro).
4. **Given** uma missão sem repositório vinculado (sem diretório de trabalho), **When** ela roda, **Then** lead e reviewer se comportam exatamente como hoje — nenhuma mudança quando não há repo para enxergar.

---

### User Story 3 - Trocar o backend de execução sem mexer no motor do time (Priority: P3)

Como mantenedor, quero poder trocar o ambiente de execução (E2B ↔ executor self-hosted ↔, no futuro, container isolado por missão) por **configuração**, sem alterar o coordenador de orquestração nem o agente de código — para evoluir a infraestrutura sem risco ao núcleo estável.

**Why this priority**: Garante a sustentação de longo prazo (modelo de confiança "meus repos agora, terceiros depois") e protege o princípio do coordinator intocado. É uma propriedade de operabilidade; não é pré-condição para US1/US2 entregarem valor.

**Independent Test**: Alternar o backend por configuração e confirmar que o mesmo fluxo de missão roda em qualquer um dos backends disponíveis, sem alteração no coordenador.

**Acceptance Scenarios**:

1. **Given** os backends disponíveis, **When** o operador define qual usar por configuração, **Then** a missão roda no backend escolhido sem mudança de código.
2. **Given** um backend desconhecido configurado, **When** uma missão é disparada, **Then** o sistema falha de forma clara e explícita (erro acionável), sem comportamento indefinido.

---

### Edge Cases

- **Continuação (iteração tipo Lovable)**: uma missão-filha reusa o ambiente de uma missão-pai ainda viva. Se o diretório de trabalho do pai não existir mais (foi limpo), a continuação deve falhar de forma clara pedindo nova missão, em vez de travar.
- **Execuções concorrentes**: com mais de uma missão simultânea no mesmo executor, cada missão deve operar em diretório próprio, sem que uma enxergue/edite os arquivos da outra.
- **Limpeza e disco**: ao terminar (sem preview), o diretório da missão é removido; diretórios órfãos (de missões com preview mantido vivo) precisam de uma rotina de varredura para não esgotar o disco da VPS.
- **Pré-requisito de infra ausente**: se o serviço executor (worker) não estiver no ar, ou faltarem os segredos exigidos (token de repositório, token do CLI de assinatura), a missão deve sinalizar pendência/erro acionável em vez de ficar presa indefinidamente.
- **Falha na entrega git** após a missão concluir: o trabalho continua marcado como concluído e o erro de entrega é registrado (não derruba a missão).
- **Preview solicitado nesta fase**: enquanto o proxy de preview não existir, uma missão com preview ligado deve degradar de forma clara (preview indisponível), sem quebrar a entrega da missão.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST oferecer um backend de execução self-hosted (rodando na infraestrutura própria do projeto) capaz de executar uma missão de code-mode de ponta a ponta: preparar o repositório, executar comandos/edições do worker e capturar o diff resultante.
- **FR-002**: O sistema MUST NOT impor um teto fixo de tempo de vida ao ambiente de execução no backend self-hosted; uma missão MUST poder ultrapassar 60 minutos contínuos e ainda concluir.
- **FR-003**: O sistema MUST permitir selecionar o backend de execução por configuração, mantendo o backend E2B disponível como opção; trocar de backend MUST NOT exigir mudança no coordenador de orquestração nem no agente de código.
- **FR-004**: Um backend de execução desconhecido/indisponível MUST produzir um erro explícito e acionável, sem comportamento silencioso ou indefinido.
- **FR-005**: Cada missão MUST executar em um diretório de trabalho isolado; missões concorrentes MUST NOT compartilhar nem interferir nos arquivos umas das outras.
- **FR-006**: O reviewer MUST poder avaliar as mudanças contra o repositório vivo que o worker acabou de editar — incluindo a possibilidade de executar verificação somente-leitura (testes/build/inspeção) — além de continuar recebendo o diff textual.
- **FR-007**: O lead MUST receber um retrato real do repositório (estrutura e arquivos-chave) ao planejar, de modo que as tarefas que escreve correspondam ao estado real do código.
- **FR-008**: O enriquecimento de contexto de lead/reviewer MUST funcionar independentemente do modelo do membro (não pode exigir o modelo CLI premium); o comportamento e o custo padrão MUST permanecer equivalentes ao atual quando o time usa modelos de chat baratos.
- **FR-009**: Quando uma missão NÃO tiver repositório/diretório de trabalho, lead e reviewer MUST se comportar exatamente como hoje (sem enriquecimento), preservando o comportamento legado byte-a-byte.
- **FR-010**: O coordenador de orquestração (runTeam) MUST permanecer intocado; toda nova capacidade MUST ser adicionada por injeção (no worker e no agente de código). Com a feature não acionada, o comportamento legado MUST ser idêntico (Constituição, Princípio II).
- **FR-011**: A feature MUST NOT introduzir mudança de schema/migração (é infra/read-side) (Constituição, Princípio III não acionado).
- **FR-012**: Ao concluir uma missão sem preview, o diretório de trabalho MUST ser removido; o sistema MUST oferecer uma rotina de varredura para remover diretórios órfãos de missões com ambiente mantido vivo, evitando esgotamento de disco.
- **FR-013**: Uma continuação que reusa o ambiente de uma missão anterior MUST reconectar ao diretório existente; se ele não existir mais, MUST falhar de forma clara orientando a disparar nova missão.
- **FR-014**: O isolamento multi-tenant existente MUST ser preservado (toda agregação/consulta escopada por dono; zero IDOR) (Constituição, Princípio V).
- **FR-015**: A feature MUST documentar o pré-requisito operacional de que o serviço executor (worker) precisa estar deployado com os segredos exigidos; sem isso, missões MUST sinalizar pendência/erro acionável, não ficar presas.

### Key Entities

- **Ambiente de execução (sandbox)**: ambiente isolado e efêmero de uma missão; expõe operações de executar comando, escrever arquivo, estender vida, encerrar e reconectar. Hoje é uma micro-VM externa com teto de tempo; passa a poder ser um diretório de trabalho na infraestrutura própria, sem teto de tempo.
- **Missão (run)**: uma execução de time vinculada (ou não) a um repositório; carrega estado (pendente/rodando/concluída/falha), identificador do ambiente, branch/base, diff e entrega resultante.
- **Membro do time**: lead, worker ou reviewer. O worker edita os arquivos no ambiente; lead e reviewer passam a enxergar o estado real desse ambiente.
- **Diretório de trabalho da missão**: a área de arquivos isolada onde o repositório é preparado e editado; criada por missão, removida ao encerrar (salvo preview ativo), reaproveitada em continuações.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das missões que ultrapassam 60 minutos no executor self-hosted concluem sem interrupção por teto de tempo (hoje: tais missões são mortas).
- **SC-002**: Missões curtas (que já funcionavam) mantêm taxa de conclusão e entrega idênticas — zero regressão observável no fluxo de commit/push/PR.
- **SC-003**: A taxa de rejeições falsas em loop do reviewer (rejeitar trabalho correto por não enxergá-lo) cai para zero nas missões em que lead/reviewer estão co-localizados.
- **SC-004**: A missão de dogfooding da feature 002-teams-dashboard roda de ponta a ponta pela própria Polaris e entrega as mudanças esperadas (endpoint + home Teams-first), com o coordenador comprovadamente inalterado.
- **SC-005**: Trocar o backend de execução é feito apenas por configuração (uma variável), sem nenhuma alteração no coordenador nem no agente de código.
- **SC-006**: Nenhuma execução deixa diretórios de trabalho órfãos acumulados após a rotina de varredura rodar (uso de disco volta ao baseline entre missões).
- **SC-007**: Custo por missão de lead/reviewer permanece equivalente ao atual quando se usam modelos de chat baratos (o ganho de visibilidade não obriga a subir custo).

## Assumptions

- **Modelo de confiança (decidido)**: nesta entrega só rodam repositórios próprios e confiáveis; o isolamento é por diretório de trabalho dentro do serviço executor (sem container-por-missão). A porta de execução permanece aberta para, no futuro, plugar um backend de container isolado por missão (limites de CPU/RAM, egress restrito) para repositórios de terceiros, selecionável por configuração e sem reescrita.
- **Faseamento**: esta feature cobre a **Fase 1** — executor self-hosted (sem teto de tempo) + co-localização de lead/reviewer, com **preview desligado** (a missão de dogfooding usa preview off, então o proxy de preview não é necessário agora). **Fora de escopo nesta feature**: o proxy de preview self-hosted (Fase 2) e o backend de container por missão para repos não-confiáveis (Fase 3).
- **Pré-requisito operacional**: forte indício de que o serviço executor (worker) nunca foi deployado em produção. Deployá-lo como serviço dedicado com os segredos exigidos (token de repositório com permissão de push, token do CLI de assinatura, conexão de banco e fila) é o passo 0; sem ele nenhuma missão de code-mode roda, com qualquer backend.
- **Recursos da VPS**: preparar repositório + instalar dependências + build por missão é pesado; assume-se concorrência conservadora de execuções simultâneas e limpeza agressiva dos diretórios de missão para conter pressão de disco/CPU na VPS compartilhada.
- **Reuso do que já existe**: o agente de código já recebe o diff real por tarefa para o reviewer (capacidade atual); o mecanismo de "manter o ambiente vivo durante toda a missão" já existe e passa a não ter teto no novo backend. Esta feature estende esses pontos por injeção, sem reescrevê-los.
- **Compatibilidade**: o backend E2B continua selecionável; nada nesta feature remove a opção anterior — apenas adiciona a self-hosted e a torna padrão quando configurada.
