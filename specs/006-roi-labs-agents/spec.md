# Feature Specification: ROI Labs — Roster dos 13 Agentes (Staffing da Empresa Agêntica)

**Feature Branch**: `006-roi-labs-agents`

**Created**: 2026-06-24

**Status**: Draft

**Input**: User description: "Criar os 13 agentes dentro de uma pasta específica em /dashboard/agents para ocupar os cargos da empresa ROI Labs, com todo o harness em volta de cada um: Nome, Descrição, System Prompt, Modelo (CEO = Opus 4.8 via Claude CLI; restante = Sonnet 4.6 via Claude CLI), Knowledge base, Plugins, Skills, MCPs; orquestração com paralelização horizontal por camada + linearização vertical por hierarquia."

---

## Visão Geral

A Feature 005 (Empresas Agênticas) entregou a **estrutura** de uma empresa agêntica — o organograma de
3 camadas, a matriz RACI, o SDLC de 7 fases e a execução por fase reusando o engine de Teams. Mas ela
entregou os cargos **vagos**: a empresa ROI Labs existe como organograma, porém sem ninguém nas vagas.
Uma empresa sem staff é um diagrama bonito e inoperável.

Esta feature **preenche o staff**: cria os **13 agentes** que ocupam os 13 cargos do nicho *software
house* e os encaixa 1:1 na empresa ROI Labs já existente. Cada agente nasce com um **harness completo**
— não apenas um nome e um prompt, mas a configuração de comportamento, capacidade e relação que faz o
agente *agir como o profissional daquele cargo*: identidade (nome/descrição), instrução normativa
(system prompt fiel ao Role/Goal/Backstory do blueprint), motor (modelo via Claude CLI), determinismo
(temperature por perfil), conhecimento (knowledge base), ferramentas (skills, plugins, servidores MCP),
continuidade (memória) e **relação hierárquica (delegação)**.

O resultado é a empresa ROI Labs deixando de ser um organograma de vagas vazias e passando a ser uma
**equipe operável de ponta a ponta**: ao disparar uma execução, cada fase do SDLC seleciona os agentes
ocupantes dos cargos atuantes (via RACI) e os orquestra com **paralelização horizontal por camada**
(agentes de uma mesma camada/fase trabalham em paralelo como *workers* de um Team) e **linearização
vertical por hierarquia** (encadeamento sequencial fase→fase e delegação top-down).

Esta é uma feature de **seeding/configuração de dados** (cria agentes + pasta + encaixe) — ela **não
altera o engine de orquestração** (coordinator `runTeam` intocado, Princípio II) nem reimplementa
agentes/MCP/RAG, apenas instancia e conecta o que já existe.

---

## Clarifications

### Session 2026-06-24

- Q: Onde os 13 agentes vivem e como se ligam à empresa? → A: **Pasta (AgentFolder) "ROI Labs" + encaixe
  1:1 na Company existente** (a empresa ROI Labs criada pela Feature 005, id `0e7d636a-...`). A pasta
  organiza visualmente os 13 agentes em `/dashboard/agents`; o encaixe os aloca nos cargos.
- Q: Até onde vai o ciclo? → A: **Spec + plano + implementação** — criar de fato os 13 agentes, a pasta
  e o encaixe nesta entrega (não apenas documentar).
- Q: Quão específicos da ROI Labs os agentes devem ser? → A: **Genéricos de software house, fiéis ao
  blueprint** — system prompts derivados do Role/Goal/Backstory do CSV/Organograma
  (`docs/empresa_agentica_notebook_lm`), reutilizáveis em qualquer projeto, sem amarrar aos produtos
  específicos da ROI Labs.
- Q: Como os modelos são atribuídos? → A: **CEO = Opus 4.8 (`claude-opus-4-8`) via Claude CLI; os outros
  12 = Sonnet 4.6 (`claude-sonnet-4-6`) via Claude CLI.** Restrição de custo: execução interna é claude-cli
  em todos os membros, nunca API/chat pago, nunca `:free`.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Empresa ROI Labs totalmente preenchida (staffing 1:1) (Priority: P1)

O usuário abre a empresa ROI Labs e encontra **todos os 13 cargos ocupados** por agentes nomeados,
agrupados numa pasta "ROI Labs" na seção de agentes. Cada agente carrega a identidade do cargo (nome,
descrição), a instrução normativa (system prompt fiel ao blueprint), o motor correto (CEO em Opus 4.8;
os demais em Sonnet 4.6, ambos via Claude CLI) e o perfil de determinismo (temperature) adequado ao
papel. O organograma deixa de ter vagas vazias.

**Why this priority**: É o coração da feature e o que torna a empresa operável. Entregando só isto, a
empresa ROI Labs sai de "diagrama vazio" para "equipe instanciada e navegável" — um MVP demonstrável,
suficiente para a empresa poder ser executada (mesmo sem as capacidades avançadas das stories
seguintes).

**Independent Test**: Abrir a empresa ROI Labs e verificar que os 13 cargos estão ocupados; abrir a
pasta "ROI Labs" e ver os 13 agentes; confirmar que o agente do cargo CEO usa Opus 4.8 e que os demais
12 usam Sonnet 4.6; ler o system prompt de qualquer agente e confirmar que reflete o Role/Goal/Backstory
daquele cargo.

**Acceptance Scenarios**:

1. **Given** a empresa ROI Labs com 13 cargos vagos, **When** o staffing é aplicado, **Then** os 13
   cargos exibem cada um o seu agente ocupante e nenhuma vaga aparece como vazia.
2. **Given** a seção de agentes, **When** o usuário abre a pasta "ROI Labs", **Then** os 13 agentes
   estão listados ali, e cada um corresponde a exatamente um cargo da empresa.
3. **Given** os agentes criados, **When** o usuário inspeciona o agente do cargo CEO, **Then** o modelo
   é Opus 4.8 (via Claude CLI); **And** ao inspecionar qualquer um dos outros 12, o modelo é Sonnet 4.6
   (via Claude CLI).
4. **Given** o encaixe 1:1, **When** o sistema tenta alocar dois agentes ao mesmo cargo ou o mesmo
   agente a dois cargos, **Then** a operação é impedida (um cargo ↔ um agente).
5. **Given** o staffing concluído, **When** o usuário consulta os agentes/Times pré-existentes da conta,
   **Then** eles continuam intactos (nenhuma regressão).

---

### User Story 2 - Cada cargo equipado com suas capacidades (conhecimento + ferramentas) (Priority: P2)

Cada agente recebe as **capacidades** que o seu cargo exige, mapeadas a partir do blueprint: uma
**knowledge base** com o material normativo do papel (Role/Goal/Backstory, SOP, recortes do organograma
e da RACI), e o conjunto de **skills, plugins e servidores MCP** apropriados ao escopo do cargo — por
exemplo, o DevOps recebe ferramentas de infraestrutura/CI-CD e sandbox; o Scrum Master, ferramentas de
gestão de tarefas/tickets; o QA, ferramentas de teste; o Arquiteto, ferramentas de modelagem/repositório.
Cargos sem necessidade de uma dada ferramenta **não** a recebem (princípio do menor privilégio).

**Why this priority**: Sem capacidades, os agentes "sabem quem são" mas não "conseguem agir". As
ferramentas por cargo são o que dá ao agente a mão concreta para executar o seu escopo, e a knowledge
base é o que mantém o agente fiel à norma sob janelas de contexto longas. Depende de US1 (os agentes
precisam existir) e entrega valor incremental claro.

**Independent Test**: Inspecionar o agente DevOps e confirmar que ele tem as ferramentas/MCP de infra e
**não** as de gestão de tickets; inspecionar o Scrum Master e confirmar o oposto; abrir a knowledge base
de qualquer agente e ver o material normativo do seu cargo.

**Acceptance Scenarios**:

1. **Given** os 13 agentes, **When** o usuário inspeciona qualquer um, **Then** ele possui uma knowledge
   base contendo o material normativo do seu cargo.
2. **Given** o mapeamento de capacidades, **When** o usuário inspeciona um cargo, **Then** as skills,
   plugins e servidores MCP vinculados correspondem ao escopo daquele cargo conforme o blueprint, e
   ferramentas fora do escopo não estão vinculadas.
3. **Given** servidores MCP/skills/plugins já existentes na plataforma, **When** o staffing os vincula a
   um agente, **Then** o vínculo é registrado sem duplicar/recriar a ferramenta subjacente.
4. **Given** uma ferramenta exigida pelo blueprint que ainda não exista na plataforma, **When** o
   staffing roda, **Then** a ausência é sinalizada explicitamente (o cargo fica sem aquela ferramenta,
   sem falhar o staffing inteiro).

---

### User Story 3 - Malha de relação: delegação (hierarquia) + memória (Priority: P3)

O usuário vê materializada a **hierarquia vertical** e a **paralelização horizontal**. Cada agente tem
uma **malha de delegação** que reflete o organograma: o CEO delega para a camada tática (PM, Arquiteto,
Scrum Master…), que delega para a camada operacional (Backend, Frontend, QA, DevOps, Data). A delegação
top-down é a *linearização vertical*; agentes irmãos numa mesma camada são *paralelizáveis
horizontalmente*. Agentes que precisam de continuidade entre interações (ex.: PM acompanhando escopo,
Scrum Master acompanhando dependências) têm **memória** habilitada.

**Why this priority**: É o que transforma 13 agentes isolados numa **organização**: a delegação codifica
quem aciona quem e em que direção, prevenindo Role Drift e tornando explícita a topologia de orquestração
pedida (paralelização por camada / linearização por hierarquia). Depende de US1.

**Independent Test**: Inspecionar a delegação do CEO e confirmar que ele pode delegar para os cargos
táticos; inspecionar um cargo operacional e confirmar que ele recebe delegação da camada tática e não
delega "para cima"; confirmar que os agentes marcados para continuidade têm memória habilitada.

**Acceptance Scenarios**:

1. **Given** os 13 agentes, **When** o usuário inspeciona a malha de delegação, **Then** ela segue o
   organograma (estratégica → tática → operacional), sem ciclos invertidos (operacional não delega para
   estratégica).
2. **Given** uma mesma camada com vários cargos, **When** a empresa executa uma fase, **Then** os cargos
   irmãos atuantes naquela fase podem trabalhar em paralelo (não há serialização imposta entre eles pela
   estrutura).
3. **Given** o encadeamento de fases do SDLC, **When** uma execução roda, **Then** as fases progridem em
   sequência (fase N → N+1), refletindo a linearização vertical.
4. **Given** cargos que exigem continuidade, **When** o usuário os inspeciona, **Then** a memória está
   habilitada para eles.

---

### User Story 4 - Operabilidade comprovada de ponta a ponta (Priority: P4)

Com a empresa ROI Labs totalmente preenchida e equipada, o usuário **dispara uma execução** com uma
missão simples e observa a empresa percorrer as 7 fases do SDLC, cada fase orquestrando os agentes dos
cargos atuantes (via RACI) e produzindo artefatos, com a fase de QA exercendo o loop de revisão. Isto
**reusa** a execução por fase entregue pela Feature 005, agora com cargos de fato ocupados.

**Why this priority**: É a prova viva de que o harness funciona — não adiciona engine, apenas valida que
os agentes criados produzem uma execução coerente. Vem por último porque depende de todo o staffing
(US1–US3) e do engine já existente.

**Independent Test**: Disparar uma execução da empresa ROI Labs com um objetivo simples e observar a
progressão pelas 7 fases, com cada fase usando os agentes ocupantes e produzindo saída.

**Acceptance Scenarios**:

1. **Given** a empresa ROI Labs preenchida e com RACI válida, **When** o usuário dispara uma execução,
   **Then** uma Execução de Empresa é criada e progride pelas fases do SDLC usando os agentes ocupantes.
2. **Given** uma fase em andamento, **When** ela executa, **Then** apenas os agentes dos cargos atuantes
   (R/A/C) naquela fase participam, conforme a RACI.
3. **Given** a fase de Teste/QA, **When** o QA identifica anomalia, **Then** o trabalho retorna ao cargo
   executor até convergência ou limiar de iterações.

---

### Edge Cases

- **Empresa ROI Labs não existe / cargos divergem**: se a empresa alvo não existir, ou seus cargos não
  baterem com os 13 do blueprint, o staffing deve sinalizar explicitamente (não criar agentes órfãos sem
  encaixe nem assumir silenciosamente uma empresa errada).
- **Cargo já ocupado**: se um cargo da empresa já tiver um agente encaixado (idempotência), o staffing
  não deve criar um duplicado nem sobrescrever cegamente — deve reusar/atualizar de forma determinística.
- **Re-execução do staffing (idempotência)**: rodar o seed duas vezes não deve gerar 26 agentes nem 2
  pastas "ROI Labs" — o resultado final é sempre 13 agentes encaixados numa pasta.
- **Modelo/provider indisponível**: se o identificador de modelo Claude CLI não estiver configurado, o
  agente deve ser criado com o modelo declarado e a indisponibilidade sinalizada, sem inventar um
  provider pago.
- **Ferramenta (skill/MCP/plugin) inexistente**: vínculo a uma ferramenta ausente é sinalizado; o cargo
  fica sem ela, mas o staffing dos demais não falha.
- **Ownership/tenant**: os agentes, a pasta e o encaixe pertencem ao mesmo dono da empresa ROI Labs; nada
  vaza para outros tenants.
- **Agente ocupante removido depois**: se um dos 13 agentes for deletado, o cargo volta a vago sem
  quebrar a empresa (comportamento herdado da Feature 005).

---

## Requirements *(mandatory)*

### Functional Requirements

#### Estrutura e identidade (staffing)

- **FR-001**: O sistema MUST criar uma **pasta (AgentFolder) "ROI Labs"** na seção de agentes, de
  propriedade do dono da empresa ROI Labs, agrupando os 13 agentes desta feature.
- **FR-002**: O sistema MUST criar **exatamente 13 agentes**, um por cargo do nicho *software house*:
  CEO, CTO, CISO (estratégica); Gerente de Produto (PM), Analista de Negócios (BA), Dono do Produto (PO),
  Arquiteto de Software, Gerente de Projetos/Scrum Master (tática); Eng. Backend, Eng. Frontend, QA,
  DevOps, Eng./Cientista de Dados (operacional).
- **FR-003**: Cada agente MUST ter **nome** e **descrição** que identifiquem o cargo de forma legível.
- **FR-004**: Cada agente MUST ter um **system prompt** derivado do **Role/Goal/Backstory** daquele cargo
  no blueprint (`docs/empresa_agentica_notebook_lm`), incluindo o escopo/responsabilidades e o formato de
  saída esperado (SOP) quando o cargo o tiver.
- **FR-005**: O sistema MUST **encaixar 1:1** cada agente no `CompanyRole` correspondente da empresa ROI
  Labs **já existente**, respeitando a regra um cargo ↔ um agente.
- **FR-006**: Ao final, a empresa ROI Labs MUST ter **todos os 13 cargos ocupados** (nenhuma vaga vazia).

#### Motor (modelo) e determinismo

- **FR-007**: O agente do cargo **CEO** MUST usar o modelo **Opus 4.8 (`claude-opus-4-8`) via Claude CLI**.
- **FR-008**: Os **outros 12 agentes** MUST usar o modelo **Sonnet 4.6 (`claude-sonnet-4-6`) via Claude
  CLI**.
- **FR-008a**: O sistema MUST configurar todos os agentes para execução via **Claude CLI** (assinatura),
  nunca via API/chat pago e nunca via tier `:free` (restrição de custo e estabilidade de runs).
- **FR-009**: Cada agente MUST ter uma **temperature** condizente com o perfil do cargo (papéis de rigor
  — QA, Arquiteto, CISO, DevOps — mais determinísticos; papéis de exploração — CEO, PM — menos), seguindo
  uma faixa padronizada e documentada.

#### Capacidade (conhecimento + ferramentas)

- **FR-010**: Cada agente MUST ter uma **knowledge base** contendo o material normativo do seu cargo
  (Role/Goal/Backstory, SOP, recortes pertinentes do organograma e da RACI).
- **FR-011**: Cada agente MUST ter vinculadas as **skills** apropriadas ao escopo do seu cargo; cargos
  sem necessidade de uma skill não a recebem.
- **FR-012**: Cada agente MUST ter vinculados os **plugins** apropriados ao escopo do seu cargo.
- **FR-013**: Cada agente MUST ter vinculados os **servidores MCP** apropriados ao escopo do seu cargo
  (ex.: DevOps→infra/CI-CD; Scrum Master→gestão de tarefas; QA→teste; Arquiteto→repositório/modelagem),
  reusando os servidores MCP já existentes na plataforma, sem recriá-los.
- **FR-013a**: O vínculo de capacidades MUST seguir o **menor privilégio**: cada cargo recebe apenas as
  ferramentas do seu escopo, espelhando a separação de responsabilidades do organograma.
- **FR-013b**: Quando uma ferramenta exigida pelo blueprint **não existir** na plataforma, o sistema MUST
  sinalizar a ausência sem abortar o staffing dos demais (degradação graciosa).

#### Relação (delegação + memória)

- **FR-014**: O sistema MUST configurar a **malha de delegação** entre os agentes refletindo o
  organograma (estratégica → tática → operacional), de forma que a delegação top-down (linearização
  vertical) seja explícita e não haja delegação invertida (operacional → estratégica).
- **FR-015**: O sistema MUST habilitar **memória** nos agentes cujos cargos exigem continuidade entre
  interações (ex.: PM, Scrum Master, PO), conforme perfil documentado.

#### Orquestração (reuso, sem alterar o engine)

- **FR-016**: A empresa ROI Labs preenchida MUST ser **executável** reusando a execução por fase do SDLC
  entregue pela Feature 005 — **um run de Time por fase**, selecionando os agentes ocupantes dos cargos
  atuantes (R/A/C) conforme a RACI, com **paralelização horizontal por camada** (workers paralelos dentro
  de um Team) e **linearização vertical por hierarquia** (fases sequenciais + delegação top-down).
- **FR-017**: Esta feature MUST **NÃO modificar** o coordinator de Teams (`runTeam`) nem reimplementar
  agentes/MCP/RAG/execução — apenas instancia agentes e cria vínculos (Princípio II, NON-NEGOTIABLE).

#### Idempotência, integridade e tenancy

- **FR-018**: O staffing MUST ser **idempotente**: re-execução não duplica agentes, pastas nem vínculos —
  o estado final é sempre 13 agentes encaixados numa única pasta "ROI Labs".
- **FR-019**: Agentes, pasta e encaixe MUST pertencer ao **mesmo dono** da empresa ROI Labs, sem
  vazamento entre tenants.
- **FR-020**: O sistema MUST **preservar** o funcionamento de agentes e Times pré-existentes, sem
  regressão (zero quebras nos fluxos atuais).
- **FR-021**: Se a empresa ROI Labs alvo **não existir** ou seus cargos **não baterem** com os 13 do
  blueprint, o staffing MUST sinalizar explicitamente em vez de criar agentes órfãos ou encaixar em
  empresa errada.

### Key Entities *(include if feature involves data)*

- **Pasta de Agentes (AgentFolder) "ROI Labs"**: agrupamento visual dos 13 agentes na seção de agentes,
  escopado ao dono.
- **Agente (Agent)**: o profissional que ocupa um cargo. Atributos do harness: nome, descrição, system
  prompt, modelo (+ provider Claude CLI), temperature, knowledge base, status, memória; relações de
  skills, plugins, servidores MCP e delegação. **Criado por esta feature** (ao contrário da Feature 005,
  que assumia agentes pré-existentes).
- **Cargo (CompanyRole)**: vaga do organograma da empresa ROI Labs (entidade da Feature 005). Cada um
  passa a referenciar 1 agente (encaixe 1:1 via `agentId @unique`).
- **Knowledge base**: base de conhecimento por agente, com o material normativo do cargo.
- **Skill / Plugin / Servidor MCP**: ferramentas existentes na plataforma, **vinculadas** (não recriadas)
  a cada agente conforme o escopo do cargo.
- **Delegação (AgentDelegation)**: aresta direcionada agente→agente que codifica a hierarquia (quem aciona
  quem). O conjunto de arestas forma a malha que materializa paralelização horizontal / linearização
  vertical.
- **Empresa ROI Labs (Company)**: a empresa-alvo já existente (Feature 005); esta feature **não a recria**,
  apenas preenche seus cargos.
- **Blueprint software house**: fonte normativa (`docs/empresa_agentica_notebook_lm`) dos 13 cargos,
  Role/Goal/Backstory, RACI, SDLC e mapeamento de ferramentas por cargo.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Após o staffing, **100% (13/13)** dos cargos da empresa ROI Labs estão ocupados — zero
  vagas vazias.
- **SC-002**: A pasta "ROI Labs" contém **exatamente 13 agentes**, um por cargo, com correspondência 1:1.
- **SC-003**: **1 agente (CEO)** usa Opus 4.8 e **12 agentes** usam Sonnet 4.6, todos via Claude CLI — 0
  agentes em API/chat pago ou `:free`.
- **SC-004**: **100%** dos agentes têm system prompt não-vazio derivado do blueprint, knowledge base
  associada e ao menos o conjunto de ferramentas do seu escopo (ou ausência sinalizada).
- **SC-005**: A malha de delegação não contém **nenhuma** aresta invertida (operacional → estratégica).
- **SC-006**: Re-executar o staffing mantém o estado em **13 agentes / 1 pasta** (idempotência
  verificável: contagem estável).
- **SC-007**: Agentes e Times pré-existentes continuam funcionando sem regressão após o staffing (zero
  quebras nos fluxos atuais).
- **SC-008**: A partir da empresa preenchida, o usuário consegue **disparar uma execução** e observar a
  progressão pelas 7 fases do SDLC, com cada fase usando os agentes ocupantes.

---

## Assumptions

- **Empresa ROI Labs já existe** (Feature 005, nicho software_house) com os 13 cargos semeados e RACI
  pré-preenchida; esta feature a localiza pelo id informado (`0e7d636a-...`) e a preenche — não a recria.
- **Reuso total da Feature 005**: organograma, encaixe 1:1, RACI/SDLC e execução por fase são reusados;
  esta feature só adiciona os agentes e os vínculos.
- **Coordinator `runTeam` intocado** (Princípio II): a operabilidade vem da execução por fase já existente;
  nada no engine é editado.
- **Agentes genéricos de software house** (decisão de clarify): system prompts/knowledge derivam do
  blueprint, sem amarrar aos produtos específicos da ROI Labs.
- **Modelos via Claude CLI** (decisão de clarify + restrição de custo): CEO em `claude-opus-4-8`; demais
  em `claude-sonnet-4-6`; nunca API/chat pago, nunca `:free`.
- **Mapeamento de ferramentas por cargo** deriva do blueprint (seção 8 — Infraestrutura: MCP por papel,
  sandbox por papel) e do conjunto de skills/MCP/plugins **já disponíveis** na plataforma; ferramentas
  ausentes são sinalizadas, não criadas.
- **Idempotência** é requisito de operação (o staffing pode ser re-rodado com segurança), implicando
  identificação estável dos agentes por cargo+empresa.
- **Ownership** espelha a empresa ROI Labs (mesmo dono; admin enxerga tudo, consistente com a seção de
  agentes).
- **Perfis de temperature e de memória por cargo** são padronizados e documentados no plano (faixas e
  quais cargos recebem memória), derivados do grau de rigor/continuidade de cada papel.

---

## Dependencies

- **Feature 005 (Empresas Agênticas)** — fornece a Company ROI Labs, os `CompanyRole`, o encaixe 1:1, a
  RACI/SDLC e a execução por fase. Pré-requisito absoluto.
- **Entidade Agente + harness** existentes — modelo de Agent com system prompt, modelo, temperature,
  knowledge base, skills, plugins, MCP, memória e delegação.
- **Mecanismos de Knowledge base / Skills / MCP / Plugins / Delegação** existentes — reusados (vinculados),
  não reimplementados.
- **Claude CLI / pool de tokens** (`CLAUDE_CODE_OAUTH_TOKEN(S)`) — provedor de execução dos agentes.
- **Blueprint normativo** em `docs/empresa_agentica_notebook_lm/` — fonte dos cargos, Role/Goal/Backstory,
  RACI, SDLC, SOPs e mapeamento de ferramentas por cargo.
