# Feature Specification: Resiliência a Esgotamento + Observabilidade de Consumo (CompanyRun)

**Feature Branch**: `007-company-run-resilience`

**Created**: 2026-06-24

**Status**: Draft

**Input**: User description: "Robustez de esgotamento de tokens + observabilidade de consumo nas execuções de Empresa (CompanyRun). (1) Detectar esgotamento do pool Claude numa fase, marcar a fase como blocked (não completed), parar a run, expor o reset; permitir retomar de onde parou reusando os artefatos. (2) Ferramenta de relatório de consumo por run + instrumentar consumo real (TeamMemberUsage subconta o claude-cli). Coordinator intocado; claude-cli only."

---

## Visão Geral

A Feature 005 deu à empresa agêntica a capacidade de **executar** (percorrer as 7 fases do SDLC, uma
execução de Time por fase). A 006 a preencheu com os 13 agentes. A primeira execução real (encurtador de
URLs) expôs **duas lacunas operacionais**:

1. **Esgotamento silencioso**: o pool de contas Claude (claude-cli) esgotou após a fase de implementação.
   As 3 fases seguintes (testing, deployment, maintenance) foram marcadas como **"completed"** — porém o
   conteúdo era a mensagem de erro *"Todas as 3 contas Claude no limite · resets HH:MM UTC"*. O usuário
   foi levado a crer que a empresa entregou o projeto inteiro, quando na verdade **metade das fases nunca
   rodou**. Pior: as 79 minutos gastos na implementação foram desperdiçados, pois não há como **retomar**
   de onde parou — uma nova execução recomeça do zero.

2. **Consumo invisível/não-confiável**: não há uma forma fácil de ver **quanto** uma execução consumiu,
   por fase, por modelo e por cargo — nem de saber **onde e por que** parou. E a contagem interna de
   tokens **subconta** o consumo real do claude-cli (as 3 fases esgotadas registraram 0 tokens), o que
   inviabiliza qualquer base de planejamento de capacidade.

Esta feature resolve as duas lacunas no **meta-orquestrador de Empresas** (`company-run.ts`), **sem tocar
o coordinator de Times** (`runTeam`, Princípio II) e **sem migrar para API/chat pago** (claude-cli only):
torna o esgotamento um estado **explícito e recuperável**, e dá **observabilidade de consumo** confiável
o bastante para virar base de planejamento.

---

## Clarifications

### Session 2026-06-24

- Q: A retomada de uma execução bloqueada deve ser automática ou manual? → A: **Ambas** — retomada
  **manual sob-demanda** (o usuário religa quando quiser) **e** **automática no reset** (o sistema religa
  sozinho quando a janela de 5h informada pelo CLI reseta, via varredura periódica de execuções
  bloqueadas cujo reset já passou).
- Q: A instrumentação de consumo deve só relatar dados existentes ou também capturar/persistir consumo
  real? → A: **Persistir um proxy de consumo** — além do relatório (que lê os dados existentes), gravar um
  **proxy de consumo calculado** (turns × modelo × duração) por fase numa **base própria**, como
  estimativa consistente para planejamento, mesmo que aproximada (o `stats-cache.json` fica como
  investigação no plano, dado o pool de várias contas no worker; não é pré-requisito).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Esgotamento vira estado explícito (não "completed" falso) (Priority: P1)

Quando o pool de contas Claude esgota no meio de uma execução de empresa, a fase em que isso acontece é
marcada como **bloqueada por limite** (não "concluída"), a execução **para imediatamente** (não desperdiça
chamadas nas fases seguintes que também falhariam), e o sistema mostra **quando a janela reseta** (horário
UTC reportado pelo CLI). O usuário enxerga, sem ambiguidade, que a empresa parou por falta de cota — e em
qual fase.

**Why this priority**: É a correção do dano real já observado — o usuário perdeu uma run achando que tinha
concluído. Sozinha, esta história já elimina a perda silenciosa e o desperdício de chamadas, mesmo sem
retomada nem relatório.

**Independent Test**: Disparar uma execução com o pool esgotado (ou simulado) e verificar que a fase
afetada fica "bloqueada por limite", a execução para naquela fase, as fases seguintes **não** são
tentadas, e o horário de reset aparece.

**Acceptance Scenarios**:

1. **Given** uma execução em andamento, **When** uma fase retorna a assinatura de esgotamento do pool
   ("todas as contas no limite / session limit / resets … UTC"), **Then** a fase é marcada como
   **bloqueada** (estado distinto de concluída e de falha genérica) e a execução fica **bloqueada**.
2. **Given** uma fase bloqueada por limite, **When** o sistema atualiza a execução, **Then** **nenhuma**
   fase posterior é iniciada (a execução para na fase bloqueada).
3. **Given** uma execução bloqueada por limite, **When** o usuário a inspeciona, **Then** vê o **horário de
   reset** (UTC) e a fase exata em que parou.
4. **Given** uma fase que terminou com erro **não** relacionado a limite, **When** o sistema avalia,
   **Then** ela continua sendo tratada como **falha** (não como bloqueio por limite) — os dois casos são
   distinguíveis.
5. **Given** o comportamento legado (execução que conclui as 7 fases sem esgotar), **When** roda,
   **Then** permanece **idêntico** (nenhuma regressão; o caminho feliz não muda).

---

### User Story 2 - Retomar de onde parou: manual e automática (Priority: P2)

Quando a janela de cota volta, a execução bloqueada é **retomada a partir da fase bloqueada**,
reaproveitando os artefatos das fases já concluídas (encadeamento fase N → N+1 preservado). As 79 minutos
de implementação não são jogados fora: a execução continua de testing em diante. A retomada acontece de
duas formas: **manual** (o usuário religa quando quiser) e **automática** (o sistema religa sozinho assim
que o horário de reset informado pelo CLI passa, por varredura periódica das execuções bloqueadas).

**Why this priority**: Transforma o bloqueio de "perda total" em "pausa recuperável" — o valor já
produzido (planning→implementation) é preservado, e a automática elimina a necessidade de o usuário ficar
vigiando o relógio do reset. Depende de US1 (precisa do estado bloqueado bem definido).

**Independent Test**: A partir de uma execução bloqueada na fase de testing, (a) retomar manualmente e
verificar que planning–implementation **não** são reexecutadas, que testing recebe o artefato da
implementação, e a execução prossegue; (b) simular que o reset passou e ver a varredura periódica retomar
a execução sozinha.

**Acceptance Scenarios**:

1. **Given** uma execução bloqueada na fase X, **When** o usuário a retoma manualmente, **Then** as fases
   anteriores a X (concluídas) **não** são reexecutadas e seus artefatos são preservados.
2. **Given** a retomada, **When** a fase X reinicia, **Then** ela recebe como entrada o artefato da última
   fase concluída (encadeamento preservado).
3. **Given** uma execução bloqueada cujo horário de reset já passou, **When** a varredura periódica roda,
   **Then** a execução é **retomada automaticamente** (sem ação do usuário).
4. **Given** uma execução bloqueada cujo reset ainda **não** passou, **When** a varredura periódica roda,
   **Then** a execução **não** é retomada ainda (aguarda o reset).
5. **Given** uma retomada bem-sucedida, **When** todas as fases restantes concluem, **Then** a execução
   fica **concluída** com o artefato final correto.
6. **Given** uma retomada que esgota novamente, **When** o pool acaba de novo, **Then** a execução volta a
   ficar **bloqueada** na nova fase (o ciclo bloquear→retomar é repetível).

---

### User Story 3 - Relatório de consumo de uma execução (Priority: P3)

O usuário roda uma ferramenta que, dada uma execução (ou a última de uma empresa), imprime um **relatório
de consumo** legível: status **real** de cada fase (distinguindo concluída de bloqueada-por-limite),
tokens/custo/turnos/duração por fase, agregados **por modelo** (Opus vs Sonnet) e **por agente/cargo**, e
**onde/por que** a execução parou.

**Why this priority**: Dá visibilidade imediata de custo e de ponto de parada — o que faltou para
entender a run do encurtador. Independente das demais (só lê dados). Entrega valor mesmo sem US4.

**Independent Test**: Rodar a ferramenta apontando para a execução do encurtador e conferir que ela mostra
as 4 fases reais + as 3 bloqueadas, os totais por modelo/cargo e o motivo de parada.

**Acceptance Scenarios**:

1. **Given** uma execução existente, **When** o usuário roda a ferramenta, **Then** vê uma linha por fase
   com status real, tokens, custo, turnos e duração.
2. **Given** a execução, **When** o relatório agrega, **Then** mostra o total por **modelo** e por
   **agente/cargo**, além do total geral.
3. **Given** uma execução bloqueada, **When** o relatório roda, **Then** indica claramente a fase de
   parada e o motivo (limite / reset).
4. **Given** nenhuma execução para a empresa, **When** a ferramenta roda, **Then** informa isso sem
   quebrar.

---

### User Story 4 - Base de dados de consumo real (para planejamento futuro) (Priority: P4)

O sistema registra o consumo de forma **mais confiável** do que a contagem interna atual (que subconta o
claude-cli), formando uma **base de dados de consumo por fase/missão**. Essa base permite, no futuro,
**estimar** quanto uma missão vai consumir da janela de 5h **antes** de rodar — sem construir modelos de
ML agora (dados insuficientes: poucas execuções).

**Why this priority**: É a fundação para planejar capacidade ("esta missão cabe na janela atual?"), mas
exige decidir a fonte/forma de captura e acumular execuções; por isso vem por último.

**Independent Test**: Após uma execução, verificar que existe um registro de consumo por fase
distinguível da contagem interna antiga, e que ele reflete melhor o esgotamento real (ex.: a fase que
esgotou não fica com "0").

**Acceptance Scenarios**:

1. **Given** uma execução concluída ou bloqueada, **When** o consumo é registrado, **Then** há um dado de
   consumo por fase que não depende exclusivamente da contagem interna que subconta o claude-cli.
2. **Given** várias execuções acumuladas, **When** o usuário consulta a base, **Then** consegue ver
   consumo por fase e por missão ao longo do tempo (base para estimativa futura).
3. **Given** a base de consumo, **When** for usada para previsão, **Then** o escopo desta feature é
   **coletar/expor** os dados — **não** treinar um modelo (explicitamente fora de escopo agora).

---

### Edge Cases

- **Esgotamento na 1ª fase**: a execução fica bloqueada já em planning, sem nenhuma fase concluída — a
  retomada deve recomeçar da 1ª fase.
- **Esgotamento parcial dentro de uma fase**: se uma fase produziu artefato parcial antes de esgotar, o
  artefato parcial não deve ser tratado como entrega válida da fase (a fase fica bloqueada, não
  concluída).
- **Reset desconhecido**: se o CLI não reportar horário de reset, o bloqueio ainda ocorre, apenas sem o
  horário (campo "reset" vazio, não erro).
- **Retomar uma execução não-bloqueada** (já concluída/falha/em andamento): deve ser impedido/sinalizado,
  não criar fases duplicadas.
- **Retomada concorrente**: disparar duas retomadas da mesma execução não deve duplicar fases nem rodar a
  mesma fase duas vezes.
- **Falsos positivos de detecção**: uma resposta legítima do agente que mencione a palavra "limite" não
  deve ser confundida com esgotamento de cota (a detecção precisa ser específica da assinatura do pool).
- **Relatório de execução muito antiga / sem dados de uso**: a ferramenta degrada com "—" em vez de
  quebrar.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Robustez (esgotamento)

- **FR-001**: O sistema MUST detectar, no resultado de uma fase, a **assinatura de esgotamento do pool**
  Claude (ex.: "todas as contas no limite", "session limit", "resets … UTC"), reusando o detector já
  existente, de forma específica o bastante para **não** disparar com menções legítimas da palavra
  "limite".
- **FR-002**: Ao detectar esgotamento numa fase, o sistema MUST marcar **a fase** como **bloqueada por
  limite** — um estado **distinto** de "concluída" e de "falha genérica".
- **FR-003**: Ao bloquear uma fase por limite, o sistema MUST marcar a **execução** como **bloqueada** e
  **interromper** o ciclo — **nenhuma** fase posterior pode ser iniciada.
- **FR-004**: O sistema MUST extrair e **expor o horário de reset** (UTC) quando o CLI o reportar; quando
  não reportar, o bloqueio ocorre sem o horário (sem erro).
- **FR-005**: O sistema MUST continuar tratando erros **não** relacionados a limite como **falha**
  (comportamento atual), distinguindo-os do bloqueio por limite.
- **FR-006**: O caminho feliz (execução que conclui sem esgotar) MUST permanecer **inalterado** (sem
  regressão de comportamento).

#### Retomada

- **FR-007**: O sistema MUST permitir **retomar manualmente** uma execução **bloqueada** a partir da
  **primeira fase bloqueada/pendente**, **sem reexecutar** as fases já concluídas.
- **FR-008**: Na retomada, a fase reiniciada MUST receber como entrada o **artefato da última fase
  concluída** (encadeamento preservado).
- **FR-009**: O sistema MUST **impedir/sinalizar** retomar uma execução que **não** esteja bloqueada
  (concluída, em falha ou em andamento), sem criar fases duplicadas; retomadas concorrentes da mesma
  execução MUST não duplicar fases.
- **FR-010**: O ciclo **bloquear → retomar** MUST ser **repetível** (uma retomada que esgota de novo volta
  a bloquear).
- **FR-010a**: O sistema MUST oferecer **retomada automática**: uma **varredura periódica** identifica
  execuções bloqueadas cujo **horário de reset já passou** e as retoma sem ação do usuário; execuções
  cujo reset ainda não passou (ou sem reset conhecido) **não** são retomadas automaticamente.

#### Observabilidade / consumo

- **FR-011**: O sistema MUST fornecer uma **ferramenta de relatório** (versionada, reutilizável) que, dada
  uma execução (ou a última de uma empresa), imprime: status **real** por fase, tokens/custo/turnos/
  duração por fase, agregados **por modelo** e **por agente/cargo**, total geral, e a **fase/motivo de
  parada**.
- **FR-012**: O relatório MUST distinguir visivelmente fases **concluídas** de fases **bloqueadas por
  limite** (não exibir bloqueada como concluída).
- **FR-013**: O sistema MUST **persistir um proxy de consumo** por fase (calculado a partir de sinais
  confiáveis disponíveis — ex.: turns × modelo × duração) numa **base própria**, independente da contagem
  interna de tokens que subconta o claude-cli, registrando também o **evento de esgotamento + reset**.
- **FR-014**: A base de consumo (proxy) MUST permitir consulta por **fase** e por **missão** ao longo de
  múltiplas execuções (fundação para estimativa futura).
- **FR-015**: Treinar/implementar um modelo preditivo (ML) está **fora de escopo** desta feature — apenas
  coletar/expor/persistir os dados de consumo (proxy).

#### Restrições transversais

- **FR-016**: Nenhuma mudança pode tocar o **coordinator** de Times (`runTeam`/executor) — toda lógica fica
  no **meta-orquestrador** (`company-run.ts`) e em ferramentas/helpers auxiliares (Princípio II).
- **FR-017**: A solução MUST operar **somente com claude-cli** (sem API/chat pago, sem `:free`).
- **FR-018**: Se houver mudança de schema, ela MUST ser uma **migração formal** aplicada no **host real**
  antes do deploy (Princípio III).

### Key Entities *(include if feature involves data)*

- **Execução de Empresa (CompanyRun)**: ganha o estado **bloqueada por limite** (distinto de falha), o
  **horário de reset** (UTC) e a **fase de parada**; passa a ser **retomável** (manual e automática).
- **Fase da Execução (CompanyPhaseRun)**: ganha o estado **bloqueada por limite** e, na retomada, é
  reiniciada preservando o artefato de entrada.
- **Registro de Consumo (proxy persistido)**: dado de consumo por fase/execução gravado numa base própria,
  calculado de sinais confiáveis (turns × modelo × duração) + evento de esgotamento/reset — independente
  da contagem interna que subconta o claude-cli; consultável por fase e por missão.
- **Relatório de Consumo**: visão derivada (não persistida) que agrega consumo por fase/modelo/agente e o
  ponto de parada de uma execução.
- **Varredura de retomada (scheduler)**: processo periódico que detecta execuções bloqueadas cujo reset já
  passou e as retoma automaticamente.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das execuções que esgotam o pool, a fase afetada aparece como **bloqueada por
  limite** (0% marcadas como "concluída" falsamente).
- **SC-002**: Ao esgotar, **0** fases posteriores são iniciadas (a execução para na fase bloqueada) —
  eliminando o desperdício de chamadas observado (3 fases queimadas na run do encurtador → 0).
- **SC-003**: Uma execução bloqueada pode ser **retomada** e concluída reexecutando **apenas** as fases
  pendentes — **0** reexecuções de fases já concluídas.
- **SC-004**: O usuário consegue obter um **relatório de consumo** completo de qualquer execução em **1
  comando**, distinguindo fases concluídas de bloqueadas.
- **SC-005**: O registro de consumo reflete o esgotamento real — a fase que esgotou **não** aparece com
  "0" como se nada tivesse acontecido.
- **SC-006**: Comportamento legado preservado — execuções que concluem sem esgotar permanecem idênticas
  (zero regressão).

---

## Assumptions

- **Estado "blocked" já é um valor válido** de status em CompanyRun/CompanyPhaseRun (a Feature 005 já o
  prevê para fase essencial vaga) — esta feature **reusa** esse estado para o caso de esgotamento, sem
  inventar um novo vocabulário se não for necessário.
- **Detector de rate-limit reutilizável**: já existe um detector da assinatura de esgotamento (no pool de
  contas Claude); esta feature o **reusa**, não cria um novo do zero.
- **Retomada (decidido)**: **manual + automática**. Manual sob-demanda + uma **varredura periódica**
  (reusando a infra de cron já existente no projeto) que retoma execuções bloqueadas cujo reset passou.
  Preferiu-se varredura periódica a agendar um job no horário exato (mais simples e resiliente).
- **Instrumentação de consumo (decidido)**: **proxy persistido**. Grava-se um proxy calculado
  (turns × modelo × duração) por fase numa base própria + o evento de esgotamento/reset. O
  `stats-cache.json` (que vive no worker, com pool de várias contas) **não** é pré-requisito — fica como
  investigação no plano; se for viável e fiel, pode refinar o proxy depois.
- **Coordinator intocado**: toda a lógica de detecção/bloqueio/retomada vive no `company-run.ts` e em
  helpers puros; o `runTeam` não é editado.
- **claude-cli only**: nenhuma proposta depende de API/chat pago; o gargalo é o rate limit do pool (somar
  contas mitiga, não muda o design).

---

## Dependencies

- **Feature 005 (Empresas Agênticas)** — o meta-orquestrador `runCompany` e os modelos CompanyRun/
  CompanyPhaseRun; é onde a feature atua.
- **Feature 006 (Roster ROI Labs)** — fornece os agentes que tornaram a execução real possível (contexto
  do bug observado).
- **Pool de contas Claude (claude-cli)** — a origem da assinatura de esgotamento e do horário de reset.
- **Dados de execução existentes** (CompanyRun/CompanyPhaseRun/TeamRun/TeamMemberUsage) — base do
  relatório.
