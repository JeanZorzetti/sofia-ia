# Feature Specification: Resiliência a Esgotamento nos Teams (TeamRun)

**Feature Branch**: `008-team-run-resilience`

**Created**: 2026-06-24

**Status**: Draft

**Input**: User description: "Levar o 'esgotamento não perde mais trabalho' da Feature 007 (Empresas) para os Teams diretos (/dashboard/teams): marcar rate_limited em vez de 'completed' falso no modo chat; retomar um TeamRun esgotado reusando as tasks já concluídas (manual + automática); UI mostrando bloqueado-por-limite + reset + retomar. Coordinator runTeam INTOCADO."

---

## Visão Geral

A Feature 007 deu às **Empresas** (CompanyRun) resiliência a esgotamento (esgotou → `blocked` → retomável,
sem perder trabalho). Mas o usuário também roda **Teams diretamente** em `/dashboard/teams`, e ali o
mesmo problema persiste: quando o pool de contas Claude esgota no meio de um run em **modo chat**, o run
termina como **`completed` falso** — o agente "entrega" a mensagem de limite (*"Todas as contas no limite ·
resets HH:MM UTC"*) como se fosse a resposta, e o trabalho restante é perdido.

O diagnóstico no código mostra três fatos que delimitam a feature:

1. **Code-runs já estão protegidos** — o agente de sandbox lança o sinal tipado de rate-limit (inclusive
   quando o limite chega como saída de sucesso, exit 0), e o coordenador finaliza o run como
   `rate_limited`.
2. **Chat-runs têm o buraco** — o caminho de chat **detecta** o limite mas o propaga como erro
   **genérico** (não o sinal tipado), e o classificador de rate-limit do coordenador usa um teste
   restrito que **não reconhece "session limit"** → o run não é marcado como esgotamento e o erro vira a
   "resposta".
3. **O coordenador é retomável por natureza** — a cada turno ele **relê o quadro de tarefas** e só executa
   as pendentes (`todo`); ele **não recria** o que já está `done`. Logo, re-disparar o run faz o líder
   continuar de onde parou.

Esta feature fecha o buraco do modo chat (marcação correta) e adiciona **retomada** de TeamRun — tudo por
**injeção**, com o **coordenador `runTeam` INTOCADO** (Princípio II).

---

## Clarifications

### Session 2026-06-24

- Q: A retomada de um TeamRun esgotado deve ser automática além de manual? → A: **Manual + automática**
  (paridade total com a Feature 007): botão "retomar" na UI **e** uma varredura periódica (cron) que
  religa runs esgotados cujo horário de reset já passou. Implica um campo de **reset indexado** no TeamRun
  (migração formal) e um cron novo.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Esgotamento não vira "resposta" falsa (marcação correta) (Priority: P1)

Quando o pool esgota durante um run de Team em modo chat, o run termina como **bloqueado por limite**
(estado de esgotamento, distinto de "concluído" e de "falha genérica") e **não** entrega a mensagem de
erro do CLI como se fosse a resposta do agente. O horário de reset (UTC) é capturado.

**Why this priority**: É a correção do dano direto — hoje o usuário recebe a mensagem de limite como
"entrega" do Team e acha que concluiu. Sozinha, esta história elimina a resposta falsa, sem depender de
retomada nem UI nova.

**Independent Test**: Rodar um Team em modo chat com o pool esgotado (ou simulado) e verificar que o run
termina marcado como esgotamento (não "concluído"), sem a banner de limite no lugar da resposta.

**Acceptance Scenarios**:

1. **Given** um run de Team em modo chat, **When** o pool esgota (limite vindo como erro **ou** como saída
   de sucesso/exit 0), **Then** o run termina marcado como **esgotamento** (rate-limit), não "concluído".
2. **Given** o esgotamento, **When** o run finaliza, **Then** a mensagem de limite do CLI **não** é
   gravada como a resposta/saída do agente.
3. **Given** o esgotamento, **When** o run finaliza, **Then** o horário de **reset** (UTC) é capturado
   quando o CLI o reporta.
4. **Given** um erro **não** relacionado a limite, **When** ocorre, **Then** o run continua sendo tratado
   como **falha** (distinto de esgotamento).
5. **Given** um run de Team que conclui sem esgotar, **When** roda, **Then** o comportamento permanece
   **idêntico** (sem regressão).
6. **Given** code-runs (sandbox), **When** esgotam, **Then** continuam funcionando como hoje (já marcam
   esgotamento) — sem regressão.

---

### User Story 2 - Retomar um TeamRun esgotado (sem refazer o que já foi feito) (Priority: P2)

O usuário consegue **retomar** um TeamRun esgotado reaproveitando as tarefas já **concluídas**: o run é
re-disparado e o líder, ao reler o quadro, continua das tarefas **pendentes** — as concluídas não são
refeitas. Tarefas que ficaram "em execução" quando o limite bateu voltam a "a fazer" para serem
reexecutadas.

**Why this priority**: Transforma o esgotamento de "perda do run" em "pausa recuperável", paridade com as
Empresas. Depende de US1 (precisa do estado de esgotamento bem definido).

**Independent Test**: Esgotar um Team com 5 tarefas (3 concluídas, 1 em execução, 1 a fazer), retomar, e
verificar que as 3 concluídas **não** rodam de novo, a "em execução" é reexecutada e a "a fazer" roda.

**Acceptance Scenarios**:

1. **Given** um TeamRun esgotado, **When** o usuário o retoma, **Then** as tarefas **concluídas** não são
   reexecutadas (seus resultados são preservados).
2. **Given** a retomada, **When** o run reinicia, **Then** as tarefas que estavam "em execução" no momento
   do esgotamento voltam a "a fazer" e são reexecutadas.
3. **Given** uma retomada bem-sucedida, **When** o run conclui o restante, **Then** o run fica
   **concluído** com a saída consolidada correta.
4. **Given** uma retomada que esgota de novo, **When** o pool acaba outra vez, **Then** o run volta a
   ficar **esgotado** (ciclo repetível).
5. **Given** um run que **não** está esgotado (concluído/falha/em andamento), **When** o usuário tenta
   retomar, **Then** é impedido/sinalizado, sem duplicar/recriar trabalho.

---

### User Story 3 - Visibilidade e ação em /dashboard/teams (Priority: P3)

Na lista e no detalhe de runs em `/dashboard/teams`, o usuário vê claramente quando um run está
**bloqueado por limite**, com o **horário de reset**, e dispõe de uma **ação de retomar**.

**Why this priority**: Sem visibilidade, o estado de esgotamento e a retomada existem mas o usuário não os
alcança. Depende de US1 (estado) e US2 (ação de retomar).

**Independent Test**: Abrir um run esgotado em `/dashboard/teams` e ver o selo "bloqueado por limite" + o
reset + o botão de retomar; acionar a retomada dali.

**Acceptance Scenarios**:

1. **Given** um run esgotado, **When** o usuário abre a lista/detalhe de runs, **Then** vê o estado
   "bloqueado por limite" distinto de concluído/falha.
2. **Given** um run esgotado com reset conhecido, **When** exibido, **Then** mostra o horário de reset.
3. **Given** um run esgotado, **When** o usuário aciona "retomar", **Then** a retomada é disparada (US2).

---

### Edge Cases

- **Esgotar antes de qualquer tarefa concluída**: a retomada recomeça o run do início (nada a preservar).
- **Esgotar na consolidação final**: o run fica esgotado; a retomada deve conseguir reconsolidar a partir
  das tarefas concluídas.
- **Reset desconhecido**: marca esgotamento sem horário (sem erro); retomada automática (se houver) não
  age sem reset.
- **Retomada concorrente**: dois "retomar" do mesmo run não devem duplicar trabalho nem rodar a mesma
  tarefa duas vezes.
- **Falso positivo**: uma resposta legítima do agente que mencione "limite" não deve ser confundida com
  esgotamento (a detecção usa a assinatura específica do pool, não a palavra solta).
- **Run de Empresa (fase) que esgota**: continua coberto pela Feature 007 (não regredir) — a fase já é
  marcada bloqueada e a empresa é retomável.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Marcação correta (modo chat)

- **FR-001**: Quando o pool esgota num run de Team em **modo chat**, o sistema MUST finalizar o run como
  **esgotamento (rate-limit)** — estado distinto de "concluído" e de "falha genérica".
- **FR-002**: O sistema MUST detectar o esgotamento tanto quando o limite chega como **erro** quanto
  quando chega como **saída de sucesso (exit 0)** com a assinatura de limite, reusando o detector único de
  rate-limit (que reconhece "session/usage limit", "resets … (UTC)", etc.).
- **FR-003**: A mensagem de limite do CLI MUST **NÃO** ser entregue/gravada como a resposta/saída do
  agente.
- **FR-004**: O sistema MUST capturar e expor o **horário de reset** (UTC) quando reportado (reusando o
  utilitário de parsing da Feature 007).
- **FR-005**: Erros **não** relacionados a limite MUST continuar tratados como **falha** (sem regressão).
- **FR-006**: A correção MUST ser feita no caminho de **CLI/serviço** (sinal tipado de rate-limit), **sem
  editar** o coordenador (`runTeam`/`team-coordinator`/`team-board`) — Princípio II.
- **FR-007**: Code-runs (sandbox), que já marcam esgotamento, MUST permanecer sem regressão.

#### Retomada

- **FR-008**: O sistema MUST permitir **retomar** um TeamRun esgotado, re-disparando a orquestração no
  **mesmo run**, de modo que o coordenador releia o quadro e execute apenas as tarefas pendentes.
- **FR-009**: Na retomada, as tarefas **concluídas** MUST ser preservadas (não reexecutadas) e as que
  estavam **em execução** no esgotamento MUST voltar a "a fazer" para reexecução.
- **FR-010**: O sistema MUST **impedir/sinalizar** retomar um run que **não** esteja esgotado, sem
  duplicar/recriar trabalho; retomadas concorrentes MUST não duplicar execução.
- **FR-011**: O ciclo **esgotar → retomar** MUST ser **repetível**.
- **FR-012**: A retomada MUST oferecer modo **manual** (ação do usuário).
- **FR-012a**: A retomada MUST oferecer modo **automático**: uma **varredura periódica** religa TeamRuns
  esgotados cujo **horário de reset já passou**; runs sem reset conhecido (ou ainda no futuro) **não** são
  religados automaticamente.

#### Visibilidade

- **FR-013**: A lista/detalhe de runs em `/dashboard/teams` MUST exibir o estado **bloqueado por limite**
  (distinto de concluído/falha) e o **horário de reset** quando conhecido.
- **FR-014**: A UI MUST oferecer a **ação de retomar** um run esgotado.

#### Restrições transversais

- **FR-015**: Coordenador `runTeam`/`team-coordinator`/`team-board` **INTOCADO**; extensões por injeção
  (sinal tipado no serviço CLI, helpers puros, campos opcionais, read-side, re-enfileiramento) —
  Princípio II (NON-NEGOTIABLE).
- **FR-016**: claude-cli only (sem API/chat pago, sem `:free`).
- **FR-017**: Se houver mudança de schema, MUST ser **migração formal** aplicada no **host real** antes do
  deploy (Princípio III).
- **FR-018**: A resiliência das **Empresas** (Feature 007) MUST permanecer sem regressão.

### Key Entities *(include if feature involves data)*

- **Execução de Time (TeamRun)**: ganha (ou consolida) o estado **bloqueado por limite** e a informação de
  **reset**; passa a ser **retomável**.
- **Tarefa de Time (TeamTask)**: na retomada, as `concluídas` são preservadas e as `em execução` voltam a
  `a fazer`.
- **Sinal de Rate-limit (tipado)**: o sinal que o caminho de CLI emite para o esgotamento ser classificado
  corretamente pelo coordenador (sem editá-lo).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos runs de Team em modo chat que esgotam, o run termina marcado como esgotamento —
  **0%** "concluído" falso e **0** respostas onde a banner de limite aparece como saída do agente.
- **SC-002**: Um run esgotado pode ser **retomado** executando **apenas** as tarefas pendentes — **0**
  reexecuções de tarefas concluídas.
- **SC-003**: O usuário identifica um run bloqueado por limite e o retoma a partir de `/dashboard/teams`
  em **1 ação**.
- **SC-004**: Comportamento legado preservado — runs que concluem sem esgotar e code-runs permanecem
  idênticos (zero regressão); Empresas (007) intactas.
- **SC-005**: O coordenador (`runTeam`) permanece **byte-idêntico** (diff vazio) — toda a mudança é por
  injeção.

---

## Assumptions

- **Detector e parser reutilizados**: `isClaudeRateLimit` (assinatura abrangente, fonte única) e
  `parseResetAt` (Feature 007) são reusados; o gap do modo chat é o caminho de CLI propagar um erro
  **genérico** em vez do sinal **tipado** que o coordenador já sabe classificar.
- **Retomada via re-disparo do mesmo run**: o coordenador relê o quadro e executa só o pendente — a
  retomada é re-enfileirar/re-chamar o coordenador no mesmo run (read-side: resetar `em execução`→`a
  fazer` e o status do run), sem editar o coordenador.
- **Retomada (decidido)**: **manual + automática** — botão na UI + cron de varredura (reusa o padrão do
  cron de Empresas da 007). Implica um campo de reset indexado no TeamRun (migração formal).
- **Estado de esgotamento**: o status terminal `rate_limited` já existe nos runs; a UI passa a exibi-lo
  como "bloqueado por limite". Um campo de **reset** pode ser necessário (decidir no plano; se exigir
  schema, migração formal).
- **Coordinator intocado**: a constituição exige; o design cabe por injeção (confirmado: o coordenador é
  retomável por natureza).

---

## Dependencies

- **Feature 007** — `isClaudeRateLimit`, `parseResetAt`, e o padrão de cron/resume (se a automática for
  escolhida).
- **Coordenador de Teams (`runTeam`)** — reusado, intocado; a retomada depende de ele reler o quadro.
- **Caminho de CLI/serviço de chat** — onde a correção de marcação (sinal tipado) é feita.
- **UI de `/dashboard/teams`** — lista/detalhe de runs (exibição + ação de retomar).
- **Pool de contas Claude (claude-cli)** — origem do esgotamento e do horário de reset.
