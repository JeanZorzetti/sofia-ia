# Feature Specification: Dashboard Teams-first (Analytics de Teams)

**Feature Branch**: `002-teams-dashboard` (trabalho direto na `main`, conforme convenção do projeto)

**Created**: 2026-06-22

**Status**: Draft

**Input**: User description: "Reescrever a home do dashboard (/dashboard) para ser Teams-first; remover widgets de atendimento/WhatsApp da overview; adicionar analytics completo de Teams (KPIs, execuções recentes, métricas ricas) derivado de TeamRun/TeamTask, multi-tenant, sem migração, coordinator intocado; entregar em 2+ fatias."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Overview Teams-first (Priority: P1)

Ao abrir o dashboard, o operador da plataforma vê imediatamente o estado da sua operação de **Teams** (orquestração multi-agente) — não mais métricas de atendimento por WhatsApp. Os widgets de atendimento (conversas, mensagens, conversão, leads) saem da home; entram KPIs essenciais de Teams e um caminho claro para criar/rodar um Team.

**Why this priority**: É a mudança de posicionamento — alinhar a primeira tela ao cerne atual do produto. Sem ela, a home contradiz o produto ("ainda muito Sofia"). Entrega valor sozinha: a home deixa de ser de atendimento e passa a ser de Teams.

**Independent Test**: Carregar `/dashboard` com uma conta que tem Teams/execuções → ver KPIs de Teams (não de atendimento) e o CTA "Criar Team"; nenhum widget de conversas/mensagens/leads presente.

**Acceptance Scenarios**:

1. **Given** conta com ao menos 1 Team e execuções, **When** abro `/dashboard`, **Then** vejo KPIs de Teams (ex.: Teams, Execuções no período, Taxa de sucesso, Tasks executadas) e **nenhum** KPI de atendimento/WhatsApp.
2. **Given** conta sem nenhum Team, **When** abro `/dashboard`, **Then** vejo um estado vazio que convida a criar o primeiro Team (CTA primário).
3. **Given** o seletor de período (7d/30d/90d), **When** troco o período, **Then** os KPIs sensíveis a período recalculam.
4. **Given** qualquer estado, **When** abro `/dashboard`, **Then** o badge de saúde do sistema e o fluxo de onboarding continuam funcionando como antes.

---

### User Story 2 - Execuções Recentes de Teams (Priority: P2)

O operador vê as execuções (TeamRuns) mais recentes na home, com time, status, quando começou e duração, e consegue clicar para abrir o detalhe da execução.

**Why this priority**: Dá "pulso" operacional imediato e atalho para a ação mais comum (acompanhar execuções), substituindo a antiga lista "Conversas Recentes". Depende da estrutura entregue na US1.

**Independent Test**: Com execuções existentes, `/dashboard` mostra as N execuções mais recentes do usuário/organização com status e duração; clicar leva ao detalhe; sem execuções → estado vazio coerente.

**Acceptance Scenarios**:

1. **Given** execuções recentes, **When** abro `/dashboard`, **Then** vejo a lista das mais recentes (time, status, início, duração).
2. **Given** clico em uma execução, **When** seleciono, **Then** navego para o detalhe daquela execução.
3. **Given** nenhuma execução, **When** abro `/dashboard`, **Then** vejo um estado vazio coerente (sem erro).

---

### User Story 3 - Métricas ricas de Teams (Priority: P3)

Além dos KPIs essenciais, o operador vê métricas mais profundas no período: duração média de execução, distribuição de sucesso/falha, e custo/tokens (por execução e, quando disponível, por membro), além de um gráfico de atividade de Teams ao longo do período (execuções/tasks/custo por dia).

**Why this priority**: Aprofunda a observabilidade reaproveitando o que os ciclos V2/V2.1 já instrumentaram (custo/obs por membro). Valor incremental; depende da US1.

**Independent Test**: No período selecionado, `/dashboard` mostra duração média, taxa de sucesso/falha e (se os dados existirem) custo/tokens; o gráfico reflete a atividade de Teams do período.

**Acceptance Scenarios**:

1. **Given** execuções no período, **When** abro `/dashboard`, **Then** vejo duração média e taxa de sucesso/falha corretas para aquele período.
2. **Given** dados de custo/tokens disponíveis, **When** abro `/dashboard`, **Then** vejo custo/tokens agregados; caso indisponíveis, a seção se omite sem quebrar.
3. **Given** troco o período, **When** recalcula, **Then** o gráfico e as métricas ricas refletem o novo período.

---

### Edge Cases

- Conta nova sem Teams nem execuções → estados vazios com CTA, nunca erro nem spinner infinito.
- Execução em andamento (sem fim) → duração mostrada como "em andamento"; não conta como sucesso nem falha.
- Workspace/Organização: métricas escopadas ao workspace ativo; trocar de workspace recalcula (isolamento multi-tenant).
- Período sem nenhuma execução → KPIs em zero e gráfico vazio, sem erro.
- Campos de custo/tokens ausentes em execuções antigas → tratados como 0/indisponível, sem distorcer médias.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A home (`/dashboard`) MUST exibir, como conteúdo primário, o estado da operação de **Teams** do workspace ativo.
- **FR-002**: A home MUST remover os widgets de atendimento/WhatsApp (Conversas Ativas, Taxa de Conversão, Leads Qualificados, Tempo Médio de Resposta, Total de Mensagens, Conversas Recentes). Essas métricas permanecem nas suas páginas dedicadas (WhatsApp/Conversas/Analytics).
- **FR-003**: A home MUST exibir KPIs essenciais de Teams: número de Teams, execuções (TeamRuns) no período, taxa de sucesso e total de tasks executadas (US1).
- **FR-004**: A home MUST oferecer um CTA primário para criar um Team / iniciar uma execução, com estado vazio convidativo quando não há Teams.
- **FR-005**: A home MUST preservar o seletor de período (7/30/90 dias), o indicador de saúde do sistema e o fluxo de onboarding existentes.
- **FR-006**: KPIs sensíveis a tempo MUST respeitar o período selecionado; contagens de inventário (ex.: total de Teams) podem ser absolutas (a documentar no plano).
- **FR-007**: A home MUST listar as execuções recentes (TeamRuns) com time, status, início e duração, com navegação para o detalhe da execução (US2).
- **FR-008**: A home MUST exibir métricas ricas no período — duração média, distribuição sucesso/falha e custo/tokens quando disponíveis; quando os dados de custo não existirem, a seção se omite sem quebrar (US3).
- **FR-009**: A home MUST exibir um gráfico de atividade de Teams no período (US3), substituindo o gráfico de mensagens/conversas/leads.
- **FR-010**: Todos os dados MUST ser escopados ao usuário/Organização ativa (isolamento multi-tenant; nenhuma execução de outro tenant visível).
- **FR-011**: Todos os estados (carregando, vazio, com dados, execução em andamento) MUST ser tratados sem erro nem spinner infinito.
- **FR-012**: A leitura de métricas MUST ser somente-leitura sobre os dados de Teams existentes — sem alterar o comportamento de execução (coordinator `runTeam` intocado) e sem migração de schema.

### Key Entities *(include if feature involves data)*

- **Team**: um time de agentes do workspace (lead → workers → reviewer). Atributos relevantes: dono (usuário/Organização), nome, membros.
- **TeamRun**: uma execução de um Team. Atributos: time, status (ex.: em andamento/concluída/falha), início/fim (→ duração) e, quando instrumentado, custo/tokens.
- **TeamTask**: tarefa dentro de uma execução. Atributos: execução-pai, status; base para "tasks executadas" e métricas por membro.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ao abrir `/dashboard`, **0** widgets de atendimento/WhatsApp aparecem na home (conversas, mensagens, conversão e leads removidos).
- **SC-002**: Um operador identifica o estado da sua operação de Teams (quantos teams, execuções recentes, se estão tendo sucesso) em **menos de 10 segundos**, sem sair da home.
- **SC-003**: **100%** dos KPIs e listas refletem apenas dados do workspace ativo (zero vazamento entre tenants).
- **SC-004**: A home carrega seu conteúdo principal de Teams em **até 2 segundos** em uma conta típica.
- **SC-005**: Contas sem Teams alcançam o fluxo de criação de um Team a partir da home em **1 clique**.
- **SC-006**: Trocar o período (7/30/90) atualiza os números sensíveis a tempo de forma consistente em **todas** as seções.

## Assumptions

- O schema já contém Team/TeamRun/TeamTask com status e timestamps suficientes para derivar execuções, duração e sucesso/falha; **nenhuma migração** é necessária. A existência exata de campos de custo/tokens (por execução/membro) será confirmada no `/speckit-plan`; se ausentes, a seção de custo da US3 é omitida sem quebrar (FR-008).
- "Taxa de sucesso" = execuções concluídas com sucesso ÷ execuções **finalizadas** no período (execuções em andamento não entram no denominador).
- "Teams" exibe o total de Teams do workspace (contagem de inventário, não sensível ao período), salvo decisão contrária no plano.
- As métricas são escopadas ao **workspace ativo** (Pessoal ou Organização) já existente na plataforma, reutilizando o mesmo conceito de isolamento das demais telas.
- A página `/dashboard` permanece desktop-first como hoje; sem nova dependência de UI além da já usada (cards e gráfico já presentes).
- Trabalho **direto na `main`**, seguindo a convenção atual do projeto (sem branch dedicada), com entrega em fatias (US1 → US2 → US3).
- Os endpoints de leitura novos seguem os padrões de auth/isolamento já usados nas demais rotas do dashboard.
