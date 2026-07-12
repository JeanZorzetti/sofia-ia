# Feature Specification: Desacoplar Atendimento — Polaris como cérebro, canais como BYO

**Feature Branch**: `004-decouple-support-channels`

**Created**: 2026-06-23

**Status**: Draft

**Input**: Design aprovado em `docs/superpowers/specs/2026-06-23-desacoplar-atendimento-design.md` (brainstorming concluído). Esta spec é a versão Spec Kit desse design.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Polaris deixa de ser uma central de atendimento (Priority: P1)

Como dono do produto, quero que a Polaris pare de **ser** uma central de atendimento
WhatsApp — removendo a gestão de números, o inbox de help-desk e os canais pesados
herdados da Sofia SDR — para que o produto seja posicionado, mantido e percebido como
uma plataforma de orquestração de agentes (Teams), sem o fardo de hospedar/atender.

**Why this priority**: É a motivação central. Sem isso, a Polaris continua carregando
um produto inteiro (atendimento) que não é o cerne — superfície de bug/segurança,
suporte e posicionamento confuso.

**Independent Test**: Após a remoção, não há nenhuma entrada de navegação nem página de
WhatsApp ou de inbox de conversas no dashboard; o build passa limpo; as features que
ficam (Teams, agentes, Telegram, webchat, analytics) seguem funcionando.

**Acceptance Scenarios**:

1. **Given** o dashboard autenticado, **When** o usuário procura por "WhatsApp" ou
   "Conversas" na navegação (Sidebar e command-palette), **Then** nenhuma das duas
   aparece e suas rotas não existem mais.
2. **Given** o código-fonte, **When** se busca por referências a `WhatsAppAccount`,
   `@/lib/crypto`, `@/lib/whatsapp-*`, `@/lib/integrations/instagram`, **Then** o
   resultado em `src/` é zero e `tsc --noEmit` passa.
3. **Given** a página de Integrations, **When** o usuário a abre, **Then** WhatsApp
   (Evolution) e Instagram não aparecem; Telegram, webchat, Google Calendar/Sheets e
   demais integrações continuam presentes.

---

### User Story 2 - A porta aberta: conectar qualquer canal via BYO (Priority: P1)

Como pessoa que quer usar a Polaris com WhatsApp (ou qualquer canal), quero plugar o
**meu próprio** canal à Polaris via a API pública de Teams, para que a Polaris seja o
cérebro que responde sem nunca tocar no meu número, token ou janela de 24h.

**Why this priority**: É a contrapartida explícita da remoção — "manter a porta aberta".
Sem ela, remover o WhatsApp fecharia a possibilidade em vez de transferi-la ao cliente.

**Independent Test**: Seguindo um guia, um usuário liga uma mensagem recebida do canal
dele ao endpoint público de execução de Team e devolve a resposta ao canal, sem que a
Polaris hospede a conexão.

**Acceptance Scenarios**:

1. **Given** um Team existente e uma API key, **When** uma mensagem externa é enviada
   ao endpoint público de execução de Team, **Then** o Team processa e a resposta é
   entregue via output webhook.
2. **Given** o guia BYO publicado, **When** o usuário segue o exemplo de connector
   (Make/n8n/Zapier), **Then** consegue conectar um canal WhatsApp de terceiro a um
   Team sem nenhuma credencial de canal armazenada na Polaris.

---

### User Story 3 - Canais mantidos seguem intactos (Priority: P2)

Como usuário de Telegram ou do webchat embarcável, quero que esses canais continuem
respondendo normalmente após a remoção, para que a limpeza do atendimento não derrube
o que tem valor de distribuição.

**Why this priority**: Telegram e webchat compartilham os modelos de dados com os canais
removidos; a remoção precisa preservá-los. É um critério de não-regressão.

**Independent Test**: Enviar mensagens de teste ao bot do Telegram e ao widget de
webchat após cada fase e confirmar que ambos respondem via IA.

**Acceptance Scenarios**:

1. **Given** o bot do Telegram ativo, **When** um usuário envia uma mensagem, **Then**
   o agente responde via IA e a conversa é registrada.
2. **Given** o widget de webchat embarcado, **When** um visitante conversa, **Then** o
   agente responde via IA normalmente.
3. **Given** o Telegram sem inbox de atendimento humano, **When** o usuário toca um
   controle que antes prometia "falar com humano", **Then** não há promessa de
   atendimento humano sem destino (o controle foi neutralizado).

---

### User Story 4 - Remoção segura da tabela órfã (Priority: P3)

Como responsável pela operação, quero dropar a tabela exclusiva do WhatsApp
(`whatsapp_accounts`) com precheck e backup, para que a limpeza de banco em produção
seja segura e reversível.

**Why this priority**: É o único drop de tabela do projeto; precisa do rigor da
constituição (precheck + backup + migração formal no host real). Vem por último.

**Independent Test**: Rodar o precheck de contagem, gerar backup JSON, aplicar a
migração no host real e confirmar que `whatsapp_accounts` não existe mais e que as
tabelas preservadas seguem intactas.

**Acceptance Scenarios**:

1. **Given** a tabela `whatsapp_accounts`, **When** o precheck roda, **Then** a
   contagem e uma amostra dos dados são registradas e um backup JSON é salvo em
   `docs/superpowers/backups/` antes de qualquer drop.
2. **Given** a migração formal aplicada no host real, **When** se inspeciona o banco,
   **Then** `whatsapp_accounts` não existe e `conversations`/`leads`/`messages`/
   `integrations`/`agent_channels` permanecem.

---

### Edge Cases

- **Telegram "Falar com humano" sem inbox**: o botão `human_handoff` setava
  `handledBy: 'human'` esperando um humano assumir pelo inbox; sem inbox vira beco sem
  saída → deve ser neutralizado (removido ou trocado por mensagem que não promete
  atendimento humano).
- **`whatsappChatId` é nome legado compartilhado**: o campo é reusado por
  Telegram/Instagram/webchat para guardar chat/session id → **permanece como está**
  (renomear é cosmético e arriscado).
- **Dados inesperados no drop**: se o precheck encontrar dados de cliente real (não
  seed/demo), abortar o drop e avisar — a premissa "zero dados" já falhou antes.
- **Imports órfãos**: remover `lib/crypto`/`lib/whatsapp-*` pode deixar imports órfãos;
  o build (`tsc`) deve acusar e cada fase termina com build limpo.
- **Crons que liam Google Sheets/Calendar**: ao remover os 3 crons SDR, as integrações
  `google-calendar`/`google-sheets` NÃO devem ser removidas (têm uso próprio).

## Requirements *(mandatory)*

### Functional Requirements

**Remoção (canais pesados + inbox):**

- **FR-001**: O sistema MUST remover a superfície de gestão de WhatsApp WABA (página de
  dashboard, rotas de API de conexão/contas/templates e o webhook de entrada).
- **FR-002**: O sistema MUST remover o caminho de WhatsApp via Evolution API e o canal
  Instagram da área de Integrações (cards/tipos, subpágina de Instagram, webhook e lib
  de Instagram).
- **FR-003**: O sistema MUST remover o inbox de atendimento humano (página de conversas,
  rotas de API de conversas e a rota de envio manual de mensagem).
- **FR-004**: O sistema MUST remover os três crons SDR que enviavam template de WhatsApp
  (followup, lembretes de calendário, importação de planilha) e o agendamento externo
  correspondente deve ser desativado.
- **FR-005**: O sistema MUST remover as entradas de navegação de "WhatsApp" e "Conversas"
  (Sidebar e command-palette) e quaisquer hooks/utilitários que ficarem órfãos.
- **FR-006**: O sistema MUST remover o modelo de dados exclusivo do WhatsApp
  (`WhatsAppAccount`) e suas relações reversas, e dropar a tabela correspondente em
  produção com precheck + backup + migração formal aplicada manualmente no host real.

**Retenção (não-regressão):**

- **FR-007**: O sistema MUST manter o canal Telegram funcional, ajustando apenas o
  controle de "falar com humano" para não prometer atendimento humano sem destino.
- **FR-008**: O sistema MUST manter o webchat embarcável funcional.
- **FR-009**: O sistema MUST preservar os modelos compartilhados (Lead, Conversation,
  Message, Integration, AgentChannel), pois Telegram e webchat dependem deles; analytics
  e overview que os leem MUST continuar funcionando.
- **FR-010**: O sistema MUST preservar as integrações Google Calendar e Google Sheets.
- **FR-011**: O coordinator de orquestração (`runTeam`) MUST permanecer intocado
  (princípio constitucional II).

**Porta aberta (BYO):**

- **FR-012**: O sistema MUST oferecer um caminho documentado para conectar um canal
  externo (BYO) a um Team usando a API pública de Teams já existente como entrada e os
  output webhooks já existentes como saída — sem armazenar credenciais de canal na
  Polaris.
- **FR-013**: O entregável da porta MUST incluir um guia e um connector de referência
  ancorado nas páginas de integração já existentes (Make/n8n/Zapier).

**Posicionamento (deferido):**

- **FR-014**: A reescrita da copy pública que vende WhatsApp (páginas públicas de
  features e documentação) MUST ser tratada em fase separada e final, com cuidado de
  SEO (sem substituição cega de termos).

### Key Entities *(include if feature involves data)*

- **WhatsAppAccount** (REMOVER): número WABA conectado por usuário, com token
  criptografado; exclusivo do WhatsApp → tabela dropada.
- **Lead / Conversation / Message** (MANTER): entidades de conversa compartilhadas por
  Telegram e webchat; alimentam analytics/overview.
- **Integration / AgentChannel** (MANTER): configuração de canais por integração/agente;
  Telegram usa. Registros de tipo `whatsapp`/`instagram` deixam de ser criados, mas os
  modelos permanecem.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero superfícies de WhatsApp/atendimento no dashboard — 0 itens de
  navegação e 0 páginas de "WhatsApp" e "Conversas".
- **SC-002**: 100% das mensagens de teste enviadas ao Telegram e ao webchat recebem
  resposta do agente após a remoção (não-regressão).
- **SC-003**: Analytics e Overview carregam sem erro após a remoção (0 falhas nas telas
  que liam os modelos compartilhados).
- **SC-004**: Um usuário consegue conectar um canal externo (ex.: WhatsApp de terceiro
  via Make/n8n) a um Team seguindo o guia, sem que nenhuma credencial de canal seja
  armazenada na Polaris.
- **SC-005**: Build limpo e zero referências órfãs — `tsc --noEmit` passa e a busca por
  símbolos/imports removidos em `src/` retorna 0.
- **SC-006**: Após o drop, a tabela `whatsapp_accounts` não existe no host real e as
  tabelas preservadas permanecem intactas, com backup JSON arquivado.

## Assumptions

- A tabela `whatsapp_accounts` é herança morta (sem clientes ativos), confirmado pelo
  dono do produto; ainda assim, precheck + inspeção + backup antes do drop (constituição
  III), pois a premissa "zero dados" já falhou antes (caso SP6 6g).
- O Telegram permanece **hospedado** pela Polaris por decisão do dono (canal leve: bot
  token, sem janela de 24h / HSM / Embedded Signup / token multi-tenant criptografado),
  apesar do objetivo geral de "não hospedar conexão".
- A porta BYO reusa a API pública de Teams e os output webhooks já existentes; nenhuma
  nova superfície hospedada é construída.
- A copy pública (features/documentação) é deferida para a fase final (F7), por ser
  SEO-sensível.
- A constituição (princípio V) cita o WhatsApp WABA como **exemplo ilustrativo** de
  rigor de canal; a remoção não viola o princípio e não exige emenda agora — o exemplo
  passa a ser histórico.
- Entrega faseada (1 fatia/sessão, repoint-first), conforme o design: F1 nav/UI +
  neutralizar handoff do Telegram; F2 WhatsApp WABA; F3 Instagram + crons; F4 inbox;
  F5 drop da tabela; F6 guia/connector BYO; F7 copy pública. O sequenciamento detalhado
  é responsabilidade de `/speckit-plan` e `/speckit-tasks`.
