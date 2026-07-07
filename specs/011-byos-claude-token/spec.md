# Feature Specification: BYOS — Token de Assinatura Claude por Usuário

**Feature Branch**: `011-byos-claude-token`

**Created**: 2026-07-07

**Status**: Draft

**Input**: User description: "BYOS — Bring Your Own Subscription: permitir que cada usuário da Polaris use a própria assinatura mensal do Claude em vez de tokens de API paga. O usuário adiciona o token OAuth da assinatura (gerado com `claude setup-token`, caminho oficial do Claude CLI) em um campo exclusivo da SUA conta de usuário, armazenado criptografado; a UI mostra instruções passo a passo de como gerar o token. Quando um Team/Squad run daquele usuário executa, o executor usa o token do usuário em vez do pool da plataforma (CLAUDE_CODE_OAUTH_TOKENS); se o usuário não tiver token cadastrado, comportamento atual (pool) permanece byte-idêntico. Restrições: coordinator runTeam INTOCADO; token nunca exposto em logs nem retornado em GET (write-only, mostrar só prefixo/últimos dígitos); suportar remover/rotacionar o token."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastrar o token da própria assinatura e rodar com ela (Priority: P1)

Um usuário da Polaris que já paga a assinatura mensal do Claude abre as configurações da conta, segue instruções passo a passo na tela (como gerar o token com `claude setup-token` no próprio computador), cola o token em um campo exclusivo da sua conta e salva. A partir daí, todos os runs de Teams/Squads/Companies que **ele** disparar executam usando a assinatura dele — sem precisar de token de API paga e sem consumir o pool da plataforma.

**Why this priority**: É a proposta inteira da feature — remove a barreira de custo de API paga para o usuário e dissolve o gargalo do pool da plataforma no self-service (Strategy V4 §4 Fase 2). Sem esta história, nada mais existe.

**Independent Test**: Cadastrar um token válido em uma conta de teste, disparar um run de Team e verificar que a execução usou a credencial do usuário (e não o pool), com o run concluindo normalmente.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado sem token cadastrado, **When** ele acessa a página de configurações da conta, **Then** vê o campo de token com instruções passo a passo de como gerá-lo (incluindo o comando oficial `claude setup-token` e o aviso de tratar o token como senha).
2. **Given** o usuário colou um token com formato válido, **When** salva, **Then** o sistema confirma o cadastro e passa a exibir apenas a forma mascarada (prefixo + últimos 4 caracteres) com a data de cadastro.
3. **Given** um usuário com token cadastrado, **When** dispara um run de Team ou Squad, **Then** todos os membros do run que executam via Claude CLI usam o token daquele usuário.
4. **Given** um usuário com token cadastrado, **When** consulta qualquer tela ou endpoint da plataforma, **Then** o valor completo do token nunca é retornado (write-only).

---

### User Story 2 - Usuário sem token continua exatamente como hoje (Priority: P1)

Um usuário que não cadastrou token não percebe nenhuma mudança: seus runs continuam usando o pool da plataforma, com o mesmo comportamento de hoje.

**Why this priority**: É a garantia de não-regressão exigida pela Constituição (Princípio II — comportamento legado byte-idêntico quando a feature não é acionada). A feature só pode ir a produção se isso for verdade.

**Independent Test**: Disparar runs com uma conta sem token antes e depois do deploy da feature e comparar comportamento (mesma origem de credencial, mesmos estados de run).

**Acceptance Scenarios**:

1. **Given** um usuário sem token cadastrado, **When** dispara qualquer run, **Then** a execução usa o pool da plataforma exatamente como antes da feature.
2. **Given** a feature publicada, **When** nenhum usuário cadastra token, **Then** nenhum fluxo existente (Teams, Squads, Companies, agendamentos, API pública) muda de comportamento.

---

### User Story 3 - Rotacionar e remover o token (Priority: P2)

O usuário pode substituir o token por um novo (rotação) ou removê-lo. Após remover, seus runs voltam ao pool da plataforma.

**Why this priority**: Higiene de credencial básica — tokens expiram, vazam ou são revogados; sem rotação/remoção a feature vira passivo de segurança.

**Independent Test**: Cadastrar, rotacionar e remover o token em sequência, verificando a máscara atualizada após rotação e o retorno ao pool após remoção.

**Acceptance Scenarios**:

1. **Given** um usuário com token cadastrado, **When** cola um novo token e salva, **Then** o novo substitui o antigo (a máscara exibida muda) e os próximos runs usam o novo.
2. **Given** um usuário com token cadastrado, **When** remove o token, **Then** o valor é apagado definitivamente e os próximos runs voltam ao pool da plataforma.
3. **Given** cadastro, rotação ou remoção de token, **When** a ação é concluída, **Then** um registro de auditoria é criado (quem, quando, qual ação — nunca o valor).

---

### User Story 4 - Token inválido ou esgotado comunicado com clareza (Priority: P2)

Quando o token do usuário falha (inválido, revogado, expirado) ou atinge o rate limit da assinatura dele, o usuário entende o que aconteceu e o que fazer — o run não falha silenciosamente nem consome o pool da plataforma sem ele saber.

**Why this priority**: A queixa nº 1 documentada contra os concorrentes é gasto invisível e falha sem explicação (Strategy V4 doc 02); a Polaris não pode reproduzir o mesmo padrão.

**Independent Test**: Cadastrar um token inválido/revogado, disparar um run e verificar que ele termina em estado de erro com mensagem acionável apontando para as configurações do token.

**Acceptance Scenarios**:

1. **Given** um usuário com token inválido ou revogado, **When** dispara um run, **Then** o run falha com mensagem clara indicando que o token da assinatura não foi aceito e onde corrigi-lo — sem fallback silencioso para o pool.
2. **Given** um run em execução com o token do usuário, **When** a assinatura dele atinge rate limit, **Then** o run entra no fluxo de resiliência já existente (estado de bloqueio/rate-limited com retomada), atribuído ao token do usuário e comunicado como tal.

---

### Edge Cases

- Usuário remove ou rotaciona o token enquanto um run dele está em andamento → o run em curso conclui com a credencial capturada no início; a mudança vale para runs novos.
- Runs agendados (cron) e disparos via API pública pertencem a um usuário → usam o token do dono do agendamento/da API key, com as mesmas regras.
- Admin impersonando um usuário → não consegue ver o valor do token (a máscara sim); ações de cadastro/remoção durante impersonação ficam auditadas como impersonação.
- Token colado com espaços/quebras de linha acidentais → sistema normaliza ou rejeita com mensagem clara de formato.
- Usuário pertence a uma Organização → o token continua sendo pessoal (por conta de usuário), não da organização; membros não herdam token de outros membros.
- Exports, backups e payloads de webhook → nunca incluem o valor do token.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE oferecer a cada usuário um campo exclusivo da sua conta para cadastrar o token da própria assinatura Claude, armazenado criptografado em repouso.
- **FR-002**: A tela de cadastro DEVE exibir instruções passo a passo de como gerar o token pelo caminho oficial do Claude CLI (`claude setup-token`), incluindo aviso para tratá-lo como senha.
- **FR-003**: O token DEVE ser write-only: nenhuma tela, endpoint, export ou log retorna o valor após o cadastro; apenas metadados (máscara com prefixo + últimos 4 caracteres, data de cadastro, última utilização).
- **FR-004**: O usuário DEVE poder rotacionar (substituir) e remover o token; a remoção apaga o valor definitivamente.
- **FR-005**: Runs de Teams, Squads e Companies disparados por um usuário com token cadastrado DEVEM executar todos os membros que usam Claude CLI com o token desse usuário (inclusive runs agendados e via API pública, atribuídos ao dono).
- **FR-006**: Usuários sem token cadastrado DEVEM manter o comportamento atual (pool da plataforma) byte-idêntico; a feature desligada não altera nenhum fluxo existente.
- **FR-007**: O valor do token NUNCA pode aparecer em logs, mensagens de run, diffs, payloads de webhook ou respostas de erro.
- **FR-008**: Falha de autenticação do token do usuário DEVE falhar o run com mensagem acionável (o que houve + onde corrigir), sem fallback silencioso para o pool da plataforma.
- **FR-009**: Rate limit da assinatura do usuário DEVE reaproveitar o fluxo de resiliência existente (bloqueio/rate-limited com retomada), identificando que a limitação é da credencial do usuário.
- **FR-010**: Cadastro, rotação e remoção do token DEVEM gerar registro de auditoria (usuário, ação, timestamp — nunca o valor).
- **FR-011**: O token de um usuário NUNCA pode ser usado em runs de outro usuário (isolamento por conta, mesmo dentro da mesma Organização/Whitelabel).
- **FR-012**: O sistema DEVE validar o formato do token no cadastro e rejeitar entradas malformadas com mensagem clara.

### Key Entities

- **Credencial de assinatura do usuário**: o token da assinatura Claude de um usuário. Atributos: dono (conta de usuário), valor (criptografado, write-only), máscara de exibição, data de cadastro, data de última utilização. Relacionamentos: pertence a exatamente 1 usuário; consumida pelos runs disparados por esse usuário.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário com assinatura Claude ativa consegue, seguindo apenas as instruções da tela, cadastrar o token e concluir um run com a própria assinatura em menos de 5 minutos, sem abrir ticket de suporte.
- **SC-002**: Zero regressão para quem não usa a feature: 100% dos runs de usuários sem token se comportam exatamente como antes do deploy.
- **SC-003**: O valor do token é irrecuperável pela plataforma após o cadastro: nenhuma tela, endpoint, log ou export o expõe (verificado por revisão dos pontos de saída).
- **SC-004**: Em caso de token inválido, 100% dos runs afetados terminam com mensagem que aponta a causa e o local de correção (nada de falha silenciosa).
- **SC-005**: Runs de usuários BYOS não consomem o pool da plataforma — custo marginal de IA desses runs para a Polaris = zero.

## Assumptions

- O usuário que **dispara** o run define qual credencial é usada (não o dono do Team/Company); agendamentos e API keys herdam o dono que os criou.
- Um token por usuário (não há múltiplos tokens/pool pessoal nesta versão).
- Sem fallback automático para o pool quando o token do usuário falha — decisão de custo: o pool é pago pela plataforma e não deve ser consumido silenciosamente (o usuário é informado e pode remover o token para voltar ao pool).
- Disponível para qualquer usuário autenticado, em todos os planos (restrição por plano, se desejada, é decisão comercial futura).
- O caminho `claude setup-token` é o mecanismo oficial e permitido de uso da assinatura via CLI (referência interna: docs/Claude/POLARIS-TOKEN-POOL.md); a responsabilidade pelos limites e termos da assinatura é do titular da conta Claude, o que deve ficar claro nas instruções da tela.
- A infraestrutura existente de criptografia de credenciais em repouso e de auditoria será reutilizada (Constituição, Princípio V).
- O coordinator de orquestração permanece intocado; a seleção de credencial entra por injeção no caminho já existente que hoje resolve o pool (Constituição, Princípio II).
