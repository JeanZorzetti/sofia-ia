# Feature Specification: Sidebar Colapsável por Hover + Barra de Rolagem Melhorada

**Feature Branch**: `001-sidebar-ux`

**Created**: 2026-06-22

**Status**: Draft

**Input**: User description: "Melhorar a sidebar do dashboard. Faço questão de duas melhorias: (1) sidebar colapsável via hover; (2) melhorar a barra de rolagem."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recolher a sidebar e expandi-la ao passar o mouse (Priority: P1)

Como usuário do dashboard, quero que a barra lateral fique recolhida como um trilho de ícones por padrão e se expanda automaticamente quando eu passo o mouse sobre ela, para ganhar área útil de tela sem perder acesso rápido à navegação.

**Why this priority**: É a melhoria principal pedida. Sozinha já entrega valor — mais espaço para o conteúdo de trabalho mantendo toda a navegação a um gesto de distância. É o coração da feature.

**Independent Test**: Pode ser totalmente testada carregando o dashboard, confirmando que a sidebar inicia recolhida (somente ícones), passando o mouse sobre ela e verificando que ela expande mostrando os rótulos; ao tirar o mouse, ela recolhe novamente. Entrega valor mesmo sem as demais histórias.

**Acceptance Scenarios**:

1. **Given** o usuário está no dashboard com a sidebar não-fixada, **When** a página carrega, **Then** a sidebar aparece recolhida exibindo apenas os ícones de cada item.
2. **Given** a sidebar está recolhida, **When** o usuário move o ponteiro sobre a sidebar, **Then** ela expande revelando os rótulos, o seletor de workspace e os cartões do rodapé.
3. **Given** a sidebar está expandida por hover, **When** o usuário tira o ponteiro de cima dela, **Then** ela recolhe de volta ao trilho de ícones.
4. **Given** a sidebar expande por hover, **When** ela expande, **Then** o conteúdo principal da página não é deslocado nem sofre reposicionamento (a expansão ocorre sobreposta ao conteúdo).
5. **Given** a sidebar está recolhida, **When** o usuário olha para um ícone, **Then** o item da rota ativa permanece visualmente destacado e cada ícone oferece uma dica (tooltip) com o nome do item.

---

### User Story 2 - Barra de rolagem do menu legível e discreta (Priority: P2)

Como usuário com muitos itens de menu, quero uma barra de rolagem fina e discreta que indique que há mais conteúdo e me permita rolar com precisão, em vez de uma área que rola "às cegas" sem indicador visual.

**Why this priority**: Segunda melhoria explicitamente exigida. Hoje a rolagem do menu não tem indicador algum, prejudicando a descoberta e a precisão. Refinamento de alto impacto na usabilidade, independente do comportamento de hover.

**Independent Test**: Pode ser testada em uma viewport baixa o suficiente para que a lista do menu transborde, confirmando que existe um indicador de rolagem fino que surge ao rolar/passar o mouse, que rolar funciona e que o indicador não desloca o conteúdo do menu.

**Acceptance Scenarios**:

1. **Given** a lista de itens do menu é maior que a altura disponível, **When** o usuário passa o mouse sobre a área do menu ou rola, **Then** um indicador de rolagem fino e discreto aparece.
2. **Given** o indicador de rolagem está visível, **When** o usuário para de interagir, **Then** o indicador desaparece de forma discreta, mantendo a interface limpa.
3. **Given** o indicador de rolagem surge, **When** ele aparece, **Then** os itens do menu não são deslocados horizontalmente (o indicador é sobreposto, sem ocupar largura útil).
4. **Given** o conteúdo do menu cabe inteiro na tela, **When** não há transbordamento, **Then** nenhum indicador de rolagem é exibido.

---

### User Story 3 - Fixar a sidebar e lembrar a preferência (Priority: P2)

Como usuário que prefere manter a navegação sempre visível, quero poder fixar a sidebar aberta e ter essa escolha lembrada nas próximas visitas, para não precisar reconfigurar a cada acesso.

**Why this priority**: Contraparte necessária do modo hover: dá controle a quem prefere a sidebar sempre aberta e respeita a preferência ao longo do tempo. Sem ela, usuários que querem a sidebar fixa ficariam presos ao trilho.

**Independent Test**: Pode ser testada acionando o controle de "fixar", confirmando que a sidebar passa a ficar permanentemente expandida (empurrando o conteúdo), recarregando a página e verificando que ela continua fixada; depois "soltando" e confirmando que volta ao modo trilho/hover e que essa escolha também persiste.

**Acceptance Scenarios**:

1. **Given** a sidebar está em modo trilho, **When** o usuário aciona o controle de fixar, **Then** a sidebar fica permanentemente expandida e o conteúdo principal acomoda-se ao lado dela.
2. **Given** a sidebar está fixada, **When** o usuário aciona o controle de soltar, **Then** a sidebar volta ao modo trilho com expansão por hover.
3. **Given** o usuário fixou (ou soltou) a sidebar, **When** ele recarrega ou retorna ao dashboard depois, **Then** a sidebar reabre no mesmo estado escolhido.

---

### User Story 4 - Robustez e acessibilidade (Priority: P3)

Como usuário que navega por teclado ou tem preferências de movimento reduzido, quero que a sidebar se comporte de forma previsível e acessível, para usar a navegação sem depender exclusivamente do mouse e sem desconforto visual.

**Why this priority**: Polimento que torna a feature sólida e inclusiva, mas não bloqueia a entrega de valor das histórias anteriores.

**Independent Test**: Pode ser testada navegando por teclado (foco entrando na sidebar deve expandi-la), ativando a preferência de movimento reduzido do sistema (a expansão não deve animar), e abrindo o seletor de workspace e movendo o mouse para o menu suspenso (a sidebar não deve recolher e "fugir" do menu).

**Acceptance Scenarios**:

1. **Given** a sidebar está recolhida, **When** o foco do teclado entra em um item da sidebar, **Then** a sidebar expande para que o item focado seja legível.
2. **Given** o sistema do usuário sinaliza preferência por movimento reduzido, **When** a sidebar expande ou recolhe, **Then** a mudança ocorre sem animação de transição.
3. **Given** o usuário abre o seletor de workspace e move o ponteiro até o menu suspenso, **When** o ponteiro sai da área da sidebar mas o menu está aberto, **Then** a sidebar permanece expandida até o menu fechar.

---

### Edge Cases

- **Sem capacidade de hover** (ex.: dispositivo de toque): a expansão por hover não se aplica; o estado fixado/recolhido é o único determinante. (A sidebar já é exibida apenas em telas grandes.)
- **Lista de menu maior que a viewport mesmo expandida**: a rolagem deve funcionar tanto no modo trilho (sobre os ícones) quanto expandida (sobre os rótulos).
- **Transição rápida de mouse** entrando/saindo repetidamente: o comportamento não deve "piscar"; recolher deve tolerar um pequeno atraso para evitar flicker.
- **Rota ativa fora da área visível** ao recolher: o destaque do item ativo permanece correto independentemente do estado de expansão.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A sidebar MUST iniciar, por padrão, em modo recolhido (trilho de ícones) quando o usuário não tiver uma preferência fixada salva.
- **FR-002**: A sidebar MUST expandir automaticamente quando o ponteiro do usuário estiver sobre ela e recolher quando o ponteiro sair, enquanto não estiver fixada.
- **FR-003**: A expansão por hover MUST ser sobreposta ao conteúdo, sem deslocar nem reposicionar o conteúdo principal da página.
- **FR-004**: Quando expandida (por hover ou fixada), a sidebar MUST exibir os rótulos dos itens, o seletor de workspace e os cartões do rodapé (uso/plano, indicação, falar com o fundador).
- **FR-005**: Quando recolhida, a sidebar MUST exibir apenas os ícones e MUST oferecer uma dica (tooltip) com o nome de cada item ao passar o mouse sobre o ícone.
- **FR-006**: O item correspondente à rota atual MUST permanecer destacado em ambos os estados (recolhido e expandido).
- **FR-007**: Os usuários MUST poder fixar a sidebar em estado expandido por meio de um controle dedicado; quando fixada, o conteúdo principal MUST acomodar-se ao lado da sidebar (sem sobreposição).
- **FR-008**: Os usuários MUST poder soltar a sidebar, retornando-a ao modo trilho com expansão por hover.
- **FR-009**: A preferência de fixado/recolhido MUST persistir entre sessões e recarregamentos de página.
- **FR-010**: A área de menu MUST exibir um indicador de rolagem fino e discreto quando o conteúdo transbordar, surgindo ao rolar ou ao passar o mouse e recolhendo-se discretamente fora de uso.
- **FR-011**: O indicador de rolagem MUST ser sobreposto, sem ocupar largura útil nem deslocar os itens do menu quando aparece.
- **FR-012**: Quando o conteúdo do menu couber inteiramente, o sistema MUST NOT exibir indicador de rolagem.
- **FR-013**: Quando o foco do teclado entrar na sidebar recolhida, ela MUST expandir para tornar o item focado legível.
- **FR-014**: Quando o usuário sinalizar preferência por movimento reduzido, as mudanças de expandir/recolher MUST ocorrer sem animação de transição.
- **FR-015**: Enquanto o seletor de workspace (ou menu suspenso ancorado na sidebar) estiver aberto, a sidebar MUST permanecer expandida até o menu fechar, mesmo que o ponteiro saia da área.
- **FR-016**: O comportamento de navegação existente (links, rotas, destaque de ativo, seletor de workspace, cartões do rodapé) MUST ser preservado; esta feature altera apresentação e interação, não a estrutura de navegação.

### Key Entities

- **Preferência de sidebar**: representa a escolha do usuário entre "fixada (expandida)" e "trilho (recolhida com hover)". Persistida por usuário/navegador. Único atributo relevante: estado fixado (sim/não).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: No estado recolhido, a sidebar ocupa no máximo ~⅓ da largura que ocupa expandida, devolvendo o restante como área útil ao conteúdo principal.
- **SC-002**: A expansão por hover começa a responder em menos de 150 ms após o ponteiro entrar na sidebar.
- **SC-003**: Durante a expansão/recolhimento por hover, o conteúdo principal não sofre nenhum deslocamento visível (zero layout shift na área de conteúdo).
- **SC-004**: 100% dos itens de navegação permanecem alcançáveis e identificáveis no modo recolhido (via ícone + tooltip) e expandido (via rótulo).
- **SC-005**: A preferência de fixado/recolhido é restaurada corretamente em 100% dos recarregamentos de página dentro do mesmo navegador.
- **SC-006**: Quando o menu transborda, existe sempre um indicador de rolagem perceptível ao interagir; quando não transborda, ele nunca aparece.
- **SC-007**: A navegação completa (alcançar qualquer seção) é possível somente por teclado, sem depender do mouse.

## Assumptions

- A sidebar permanece restrita a telas grandes (desktop), como hoje; o comportamento em telas pequenas (drawer/mobile) está fora do escopo desta feature.
- A estrutura atual de seções e itens do menu é mantida; esta feature não reorganiza nem adiciona/remova itens de navegação.
- O conteúdo dos cartões do rodapé (uso/plano, indicação, fundador) permanece o mesmo; apenas sua visibilidade acompanha o estado de expansão.
- A persistência da preferência é por navegador (não sincronizada entre dispositivos), reaproveitando o padrão já usado para a preferência de workspace.
- O padrão inicial para novos usuários (sem preferência salva) é a sidebar recolhida (trilho), maximizando área útil.
