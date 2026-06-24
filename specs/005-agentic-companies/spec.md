# Feature Specification: Empresas Agênticas (Agentic Companies)

**Feature Branch**: `005-agentic-companies`

**Created**: 2026-06-23

**Status**: Draft

**Input**: User description: "Empresas Agênticas — transformar a página /dashboard/agents numa visão de organização. Nova entidade Empresa (Company) de primeira classe, clonável por nicho (começando com Software House / desenvolvimento de software). Organograma como visão herói (camadas C-level → tático-gerencial → operacional, cada cargo encaixa um Agente existente); Tipologia (generalista|especialista|híbrida); Governança via Matriz RACI editável (cargo × fase do SDLC) + SOPs; SDLC de 7 fases; Infraestrutura (MCP + sandbox). As 4 últimas são facetas/abas, não níveis aninhados. Execução reusa o engine de Teams (coordinator runTeam INTOCADO): rodar a Empresa = instanciar um Team por fase do SDLC selecionando agentes conforme a RACI."

---

## Visão Geral

Hoje a seção de agentes da plataforma é uma **lista chapada**: o usuário cria agentes soltos, sem
estrutura que diga quem responde por quê, em que ordem o trabalho flui, ou quem aprova o quê. Esta
feature introduz a **Empresa Agêntica** — uma organização virtual de primeira classe que dá
*estrutura*, *política*, *processo* e *capacidade* aos agentes que o usuário já cria.

O modelo separa quatro coisas que hoje não existem ou estão implícitas, em **facetas ortogonais** (não
em níveis aninhados):

- **Estrutura** — o organograma (quem existe e onde se encaixa);
- **Política** — tipologia + matriz RACI (as regras de responsabilidade);
- **Processo** — o ciclo de vida de 7 fases (como o trabalho flui);
- **Capacidade** — infraestrutura (que ferramentas cada cargo/agente possui).

A primeira empresa entregue é uma **Software House** (desenvolvimento de software), e o modelo é
**clonável por nicho** para que outros tipos de empresa surjam depois.

---

## Clarifications

### Session 2026-06-23

- Q: Escopo deste ciclo — P1+P2 só, P1+P2+P3 (com execução), ou P1 só? → A: **P1+P2+P3** — incluir a execução (rodar a empresa instanciando Times por fase do SDLC) já neste ciclo.
- Q: Granularidade da execução — 1 Time por fase (sequencial), 1 Time único, ou híbrido? → A: **1 Time por fase do SDLC, sequencial** — a Empresa atua como meta-orquestrador acima do coordenador, chamando o `runTeam` existente uma vez por fase; o artefato de cada fase alimenta a próxima; coordenador intocado.
- Q: RACI inicial do nicho "Software House" — pré-preenchida, vazia, ou sugestão automática? → A: **Pré-preenchida a partir do blueprint** (seção 7 do `Organograma de Empresa Agêntica.md`), editável — a empresa nasce operável e fiel ao documento.
- Q: Cardinalidade cargo↔agente — cargo≤1/agente reutilizável, estrito 1:1, ou muitos-para-muitos? → A: **Estrito 1:1** — cada cargo comporta no máximo 1 agente e cada agente ocupa no máximo 1 cargo. A tipologia generalista passa a ser expressa pela **largura dos cargos** (poucos cargos amplos, um agente cada), não pelo compartilhamento de um agente entre vagas.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Criar empresa e montar o organograma (Priority: P1)

O usuário cria uma **Empresa** a partir de um nicho pré-definido (ex.: "Software House"). A empresa
abre numa **visão de organograma herói** com três camadas verticais — Estratégica (C-level),
Tático-Gerencial e Operacional — e os cargos padrão daquele nicho já posicionados. O usuário
**encaixa agentes existentes** nas vagas de cargo (CEO, CTO, Arquiteto, Backend, QA, DevOps, …),
deixando vagas vazias onde ainda não há agente. A antiga lista chapada de agentes deixa de ser o ponto
de entrada principal — agora os agentes são o *staff* de empresas.

**Why this priority**: É o coração da feature e o que muda a experiência imediatamente. Entregando só
isto, o usuário já obtém uma organização navegável por cima dos agentes que ele já tem — um MVP
viável e demonstrável sem nenhuma das demais facetas.

**Independent Test**: Criar uma empresa "Software House", verificar que as três camadas e os cargos
padrão aparecem no organograma, encaixar um agente existente num cargo e ver a atribuição refletida,
e deixar outro cargo vago e ver a vaga sinalizada.

**Acceptance Scenarios**:

1. **Given** um usuário com agentes já criados, **When** ele cria uma empresa a partir do nicho
   "Software House", **Then** o organograma exibe as três camadas e todos os cargos padrão do nicho,
   inicialmente vagos.
2. **Given** uma empresa com organograma, **When** o usuário encaixa um agente existente no cargo
   "Engenheiro de Software Backend", **Then** o cargo passa a exibir aquele agente como ocupante e a
   vaga deixa de aparecer como vazia.
3. **Given** um cargo ocupado, **When** o usuário substitui o agente ou desencaixa, **Then** o cargo
   reflete o novo ocupante (ou volta a vago) sem afetar o agente em si.
4. **Given** uma empresa, **When** o usuário adiciona ou remove um cargo do organograma, **Then** a
   estrutura é atualizada além do que o template do nicho trouxe.
5. **Given** vários agentes do mesmo dono, **When** o usuário abre a seção de agentes, **Then** o
   ponto de entrada principal é a visão de empresas/organização, e os agentes individuais continuam
   acessíveis a partir dali.

---

### User Story 2 - Governança (RACI) e processo (SDLC) (Priority: P2)

O usuário define **como a empresa se governa**. Na faceta **Governança**, edita uma **Matriz RACI**
(cargo × fase do SDLC), atribuindo a cada cargo o papel R (Responsável), A (Autoridade/Aprovador), C
(Consultado) ou I (Informado) em cada fase. O sistema impõe a **regra de ouro**: exatamente um "A" por
fase. Na faceta **SDLC**, o usuário vê o pipeline das **7 fases** (Planeamento, Análise de Requisitos,
Design, Implementação, Teste/QA, Implantação, Manutenção), cada fase mostrando seu objetivo, artefatos
de saída esperados e quais cargos atuam (derivado da RACI). A RACI é a **ponte** que liga o
organograma (quem existe) ao processo (como o trabalho flui).

**Why this priority**: Sem governança, o organograma é um diagrama bonito mas inoperável. A RACI é o
que torna a empresa um sistema com responsabilidades inequívocas e previne o caos (Role Drift). É
pré-requisito conceitual para a execução (US3), mas entrega valor por si só como documento normativo
navegável.

**Independent Test**: Abrir a faceta Governança, preencher a RACI de uma fase, tentar salvar uma fase
com zero ou dois "A" e ver o sistema bloquear, salvar uma RACI válida, e então abrir a faceta SDLC e
confirmar que cada fase lista os cargos atuantes conforme a RACI.

**Acceptance Scenarios**:

1. **Given** uma empresa com cargos, **When** o usuário abre a faceta Governança, **Then** vê uma
   matriz com cargos nas linhas e as 7 fases do SDLC nas colunas, editável célula a célula.
2. **Given** uma matriz em edição, **When** o usuário tenta salvar uma fase sem nenhum "A" ou com
   mais de um "A", **Then** o sistema impede o salvamento e sinaliza a violação da regra de ouro.
3. **Given** uma RACI salva, **When** o usuário abre a faceta SDLC, **Then** cada uma das 7 fases
   mostra objetivo, artefatos de saída e os cargos que atuam (R/A/C) naquela fase.
4. **Given** a faceta Governança, **When** o usuário define um SOP (formato de saída esperado) para um
   cargo, **Then** o SOP fica associado àquele cargo e visível como norma.

---

### User Story 3 - Operar a empresa (executar) (Priority: P3)

O usuário dispara uma **execução** da empresa contra um objetivo/missão. A empresa percorre as fases do
SDLC; **cada fase instancia uma execução usando o engine de orquestração de Times já existente**,
selecionando os agentes que ocupam os cargos marcados como atuantes (R/A/C) naquela fase conforme a
RACI. O usuário acompanha status, artefatos de saída e progressão fase a fase. A fase de Teste/QA
suporta o **loop de revisão iterativa** (Desalucinação Comunicativa): o cargo de QA revisa e pode
devolver o trabalho ao cargo executor até convergir ou atingir um limiar de iterações.

**Why this priority**: Transforma a empresa de estrutura/documento em sistema operável. É a fatia de
maior esforço e depende de US1 + US2; por isso vem por último, mas está especificada aqui para guiar a
arquitetura desde já (a execução **reusa** o coordenador de Times, sem modificá-lo).

**Independent Test**: Com uma empresa montada e RACI válida, disparar uma execução com um objetivo
simples e observar a progressão pelas 7 fases, com cada fase produzindo saída e a fase de QA exercendo
o loop de revisão.

**Acceptance Scenarios**:

1. **Given** uma empresa com cargos ocupados e RACI válida, **When** o usuário dispara uma execução
   com um objetivo, **Then** uma Execução de Empresa é criada e progride pelas fases do SDLC.
2. **Given** uma fase em andamento, **When** ela é executada, **Then** apenas os agentes dos cargos
   atuantes naquela fase (conforme a RACI) participam, e o resultado é registrado como artefato da
   fase.
3. **Given** a fase de Teste/QA, **When** o QA identifica anomalia, **Then** o trabalho é devolvido ao
   cargo executor e o ciclo se repete até convergência ou limiar de iterações.
4. **Given** uma execução concluída, **When** o usuário a inspeciona, **Then** vê os artefatos de
   saída de cada fase e o status final.

---

### User Story 4 - Tipologia, infraestrutura e clonagem por nicho (Priority: P4)

O usuário define a **Tipologia** da empresa (generalista | especialista | híbrida) como propriedade, e
na faceta **Infraestrutura** associa servidores MCP e opção de sandbox por agente/cargo (capacidade).
O usuário pode **clonar** a empresa como um **novo nicho**, reaproveitando a estrutura para criar
outros tipos de empresa além de software.

**Why this priority**: Refinamentos que aumentam fidelidade ao blueprint e abrem a generalização para
outros nichos, mas não são necessários para o valor central das histórias P1–P3.

**Independent Test**: Alterar a tipologia e ver a propriedade refletida; vincular um MCP a um cargo na
faceta Infraestrutura; clonar a empresa como novo nicho e confirmar que a estrutura é reproduzida sem
re-entrada manual.

**Acceptance Scenarios**:

1. **Given** uma empresa, **When** o usuário altera a tipologia para "especialista", **Then** a
   propriedade é persistida e exibida como faceta (não como nível do organograma).
2. **Given** a faceta Infraestrutura, **When** o usuário vincula um servidor MCP a um cargo/agente,
   **Then** o vínculo de capacidade fica registrado para aquele cargo/agente.
3. **Given** uma empresa existente, **When** o usuário a clona como novo nicho, **Then** uma nova
   empresa é criada com a mesma estrutura de organograma e RACI, pronta para ser ajustada.

---

### Edge Cases

- **Cargo vago numa fase ativa**: ao executar uma fase cujo cargo Responsável (R) está vago, o sistema
  deve sinalizar e bloquear/avisar (não falhar silenciosamente).
- **Fase sem cargo atuante**: uma fase do SDLC sem nenhum cargo marcado R/A na RACI deve ser sinalizada
  como inválida para execução.
- **Agente ocupante deletado**: se um agente encaixado num cargo é removido, o cargo volta a vago sem
  quebrar a empresa.
- **Encaixe 1:1**: tentar encaixar um agente já alocado a outro cargo deve ser impedido/sinalizado
  (um agente ocupa no máximo um cargo); tentar pôr um segundo agente num cargo ocupado exige
  substituir o ocupante atual.
- **Loop de QA sem convergência**: ao atingir o limiar máximo de iterações de revisão, a fase encerra
  com status que torna o impasse explícito (não loop infinito).
- **Clonagem entre donos**: ao clonar, os cargos referenciam agentes do dono atual; vínculos a agentes
  de outro dono não vazam entre tenants (cargos ficam vagos quando o agente original não pertence ao
  novo dono).
- **Empresa sem nenhum agente encaixado**: deve ser criável e navegável (estrutura existe), apenas não
  executável até ter ocupantes nos cargos essenciais.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Estrutura (Organograma)

- **FR-001**: O sistema MUST permitir criar uma Empresa a partir de um **nicho** pré-definido,
  semeando as camadas, departamentos e cargos padrão daquele nicho.
- **FR-002**: O sistema MUST exibir a Empresa como uma **visão de organograma navegável** organizada em
  três camadas verticais: Estratégica (C-level), Tático-Gerencial e Operacional.
- **FR-003**: O sistema MUST permitir **encaixar** um Agente existente numa vaga de cargo, bem como
  **desencaixar** ou **substituir** o ocupante, sem alterar o agente em si.
- **FR-003a**: O sistema MUST impor a relação **1:1 cargo↔agente**: um cargo comporta no máximo um
  agente e um agente ocupa no máximo um cargo; tentar encaixar um agente já alocado a outro cargo MUST
  ser impedido/sinalizado.
- **FR-004**: O sistema MUST permitir que vagas de cargo permaneçam **vagas** e MUST sinalizar
  visualmente as vagas vazias.
- **FR-005**: O sistema MUST permitir **adicionar e remover cargos** do organograma de uma Empresa,
  para além dos cargos trazidos pelo template do nicho.
- **FR-006**: A visão de Empresa MUST substituir a antiga listagem chapada de agentes como **ponto de
  entrada principal** da seção de agentes, mantendo os agentes individuais acessíveis.

#### Facetas ortogonais

- **FR-007**: O sistema MUST expor as quatro facetas — **Tipologia**, **Governança**, **SDLC** e
  **Infraestrutura** — como abas ortogonais da Empresa, **nunca** como níveis aninhados abaixo de
  departamentos/cargos.
- **FR-008**: O sistema MUST expor a **Tipologia** (generalista | especialista | híbrida) como
  propriedade editável da Empresa.
- **FR-009**: O sistema MUST apresentar a **Governança** como uma **Matriz RACI** editável (Cargo ×
  Fase do SDLC), com valores R/A/C/I por célula.
- **FR-010**: O sistema MUST impor a **regra de ouro** da RACI: exatamente um Accountable (A) por fase
  do SDLC; MUST impedir salvar uma matriz com zero ou múltiplos "A" numa mesma fase.
- **FR-011**: O sistema MUST permitir definir **SOPs** (formato de saída estruturado esperado) por
  cargo, dentro da faceta Governança.
- **FR-012**: O sistema MUST apresentar o **SDLC** como pipeline de **7 fases** (Planeamento, Análise
  de Requisitos, Design, Implementação, Teste/QA, Implantação, Manutenção), cada fase mostrando seu
  objetivo, artefatos de saída esperados e os cargos atuantes derivados da RACI.
- **FR-013**: O sistema MUST apresentar a **Infraestrutura** como faceta onde servidores MCP e uma
  opção de sandbox podem ser **associados por agente/cargo** (vínculo de capacidade).

#### Execução (operabilidade)

- **FR-014**: O sistema MUST permitir **executar** uma Empresa contra um objetivo/missão, produzindo
  uma **Execução de Empresa** que progride pelas fases do SDLC.
- **FR-015**: A Execução de Empresa MUST processar as fases do SDLC **sequencialmente**, instanciando
  **um run de Time por fase** que **reusa o engine de orquestração de Times existente**. A Empresa atua
  como **meta-orquestrador acima do coordenador**: para cada fase, monta o roster com os agentes que
  ocupam os cargos atuantes (R/A/C) daquela fase conforme a RACI e invoca o `runTeam` existente **sem
  modificá-lo** (princípio NON-NEGOTIABLE II da constituição — o coordenador é envolvido, nunca
  editado).
- **FR-015a**: O artefato de saída de cada fase MUST poder alimentar a fase seguinte como entrada
  (encadeamento fase N → fase N+1), preservando o contexto produzido ao longo do ciclo.
- **FR-016**: O sistema MUST expor status, artefatos de saída e progressão de uma Execução de Empresa
  ao longo das fases (visão fase a fase).
- **FR-017**: A fase de Teste/QA MUST suportar o **loop de revisão iterativa** (Desalucinação
  Comunicativa): o cargo de QA revisa e pode devolver o trabalho ao cargo executor até convergência ou
  um limiar máximo de iterações.

#### Multi-tenancy, nicho e clonagem

- **FR-018**: As Empresas MUST ser **escopadas ao seu dono** (com admin enxergando todas, consistente
  com o comportamento atual da seção de agentes), sem vazamento entre tenants.
- **FR-019**: O sistema MUST permitir **clonar** uma Empresa como **novo nicho/instância**,
  reproduzindo a estrutura de organograma e a RACI sem re-entrada manual.
- **FR-020**: O sistema MUST entregar ao menos o nicho **"Software House"**, semeando os cargos do
  blueprint (CEO; CTO, CISO; PM, BA, PO, Arquiteto de Software, Gerente de Projetos/Scrum Master;
  Backend, Frontend, QA, DevOps, Data Eng/Scientist) distribuídos nas três camadas, **com a Matriz
  RACI já pré-preenchida** a partir do blueprint (seção 7 do `Organograma de Empresa Agêntica.md`) e
  editável — a empresa nasce operável.
- **FR-021**: O sistema MUST preservar o funcionamento existente de **Agentes e Times** sem regressão
  após a introdução da camada de Empresa.

### Key Entities *(include if feature involves data)*

- **Empresa (Company)**: organização agêntica de primeira classe, instanciável por nicho. Atributos:
  nome, nicho, tipologia, descrição, dono. Contém um organograma, uma matriz de governança (RACI), uma
  definição de processo (SDLC) e vínculos de infraestrutura.
- **Nicho / Template de Empresa**: modelo pré-definido que semeia camadas, departamentos, cargos e RACI
  padrão de um tipo de empresa (ex.: Software House). Ponto de partida editável, não rígido.
- **Camada (Layer)**: agrupamento vertical do organograma — Estratégica (C-level), Tático-Gerencial,
  Operacional.
- **Departamento**: agrupamento funcional (Executivo; Produto & Negócios; Arquitetura & Engenharia; QA
  & Segurança; Operações & Infraestrutura).
- **Cargo (Role / vaga)**: posição no organograma, pertencente a uma camada/departamento, que pode
  encaixar zero ou um Agente existente. Ex.: CEO, CTO, CISO, PM, Arquiteto, Backend, QA, DevOps.
- **Agente (Agent)**: entidade **já existente** reusada — o "profissional" que ocupa um cargo. Não é
  recriado por esta feature. **Ocupa no máximo um cargo** (relação 1:1 com Cargo).
- **Matriz RACI**: mapeamento Cargo × Fase do SDLC com papel R/A/C/I. Regra de ouro: exatamente um "A"
  por fase. É a ponte entre estrutura e processo.
- **Fase do SDLC**: uma das 7 fases, com objetivo e artefatos de saída; os cargos atuantes são
  derivados da RACI.
- **SOP (Procedimento Operacional Padrão)**: norma de formato de saída associada a um cargo (e/ou
  fase), forçando saída estruturada/validável em vez de prosa livre.
- **Vínculo de Infraestrutura**: associação de servidores MCP e/ou sandbox a um agente/cargo
  (capacidade).
- **Execução de Empresa (Company Run)**: instância de operação que percorre as fases do SDLC,
  instanciando Times (engine existente) por fase conforme a RACI; registra status e artefatos por fase.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário consegue criar uma empresa "Software House" e ver o organograma completo (3
  camadas, todos os cargos padrão) em menos de 2 minutos.
- **SC-002**: Um usuário consegue encaixar um agente existente em qualquer cargo e ver a atribuição
  refletida imediatamente na mesma sessão, sem erros.
- **SC-003**: 100% das matrizes RACI salvas têm exatamente um Accountable (A) por fase — matrizes
  inválidas não podem ser salvas.
- **SC-004**: Um usuário consegue navegar entre o organograma e as quatro facetas (Tipologia,
  Governança, SDLC, Infraestrutura) sem sair do contexto da empresa.
- **SC-005**: A partir de uma única empresa, um usuário consegue disparar uma execução e observar a
  progressão pelas 7 fases do SDLC, com artefatos de saída por fase.
- **SC-006**: Um novo nicho pode ser produzido clonando uma empresa existente em menos de 1 minuto, sem
  re-entrada manual do organograma.
- **SC-007**: Agentes e Times existentes continuam funcionando sem regressão após a introdução da
  camada de Empresa (zero quebras nos fluxos atuais).

---

## Assumptions

- **Reuso do Agente existente** como unidade de staffing — não se cria um novo conceito de
  "funcionário"; o cargo apenas referencia um Agente já existente.
- **Execução reusa o coordenador de Times (`runTeam`) intocado**, conforme o princípio NON-NEGOTIABLE
  II da constituição; nova capacidade entra por injeção, não editando o coordenador.
- **Escopo deste ciclo = P1+P2+P3** (decisão de clarify): organograma/staffing + governança/SDLC views
  + **execução** (rodar a empresa instanciando Times por fase). P4 (tipologia/infra/clonagem) entra
  como refinamento — tipologia e infra já são facetas de P1/P2; a clonagem por nicho pode ser a última
  fatia. As fases são entregues incrementalmente, mas todas dentro deste ciclo.
- **Cardinalidade cargo↔agente = estrito 1:1** (decisão de clarify): um cargo comporta no máximo 1
  agente e um agente ocupa no máximo 1 cargo (bijeção parcial — nem todo cargo precisa estar ocupado).
  A tipologia **generalista** é expressa pela **largura dos cargos** (poucos cargos amplos, ex.: um
  "Fullstack Engineer"), e a **especialista** por muitos cargos estreitos — não por compartilhar um
  mesmo agente entre vagas. Paralelismo de vários trabalhadores num papel, quando necessário, é
  resolvido pelo engine de Times em tempo de execução, não pela estrutura do organograma.
- **Visibilidade/ownership** espelha a seção de agentes atual (escopado por dono; admin vê todas as
  empresas).
- **As 7 fases do SDLC e o conjunto de cargos padrão** vêm do blueprint em
  `docs/empresa_agentica_notebook_lm/` (Organograma de Empresa Agêntica.md, CSV de cargos, mind map).
- **Templates de nicho semeiam padrões**, mas o organograma e a RACI permanecem totalmente editáveis
  por empresa.
- **Sandbox/MCP na faceta Infraestrutura** reaproveitam os mecanismos de MCP e execução já existentes
  na plataforma; esta feature apenas os **vincula** por cargo/agente, sem reimplementá-los.

---

## Dependencies

- **Engine de orquestração de Times (Teams)** existente — reusado pela execução (US3), sem modificação
  do coordenador (`runTeam`).
- **Entidade Agente** existente — reusada como ocupante de cargo.
- **Mecanismo de MCP servers** existente — reusado pela faceta Infraestrutura.
- **Blueprint normativo** em `docs/empresa_agentica_notebook_lm/` — fonte dos cargos, camadas, RACI de
  referência, fases do SDLC e SOPs.
