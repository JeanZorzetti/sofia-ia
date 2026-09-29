# Feature Specification: Cobrança recorrente via Stripe (sai o Mercado Pago)

**Feature Branch**: `013-cobranca-stripe`

**Created**: 2026-09-29

**Status**: Draft

**Input**: User description: "Vamos mudar pra Stripe." Contexto (leitura de 29/09/2026 no banco de produção e no checkout): 0 pagamentos em toda a história; o checkout do Mercado Pago abre o formulário de cartão com R$ 297, mas mostra o vendedor como **"Atma Aligner"** (conta de outra empresa do mesmo dono); a única assinatura "business" é teste interno; nenhum registro de aceite de termos; o site não exibe razão social nem CNPJ; quem se cadastra pelo Google não recebe trial.

## Clarifications

### Session 2026-09-29

- Q: Qual empresa vende a Polaris e em qual conta Stripe? → A: ROI Labs (CNPJ da ROI Labs), conta Stripe nova e exclusiva da Polaris, nome público "Polaris IA".
- Q: Como fica o trial? → A: 7 dias de Pro sem cartão para cadastro por e-mail e pelo Google; depois Free, sem cobrança automática.
- Q: Os termos de uso entram nesta feature? → A: Sim. Reescrever só §4 (planos e pagamentos), §8 (limitação de responsabilidade) e §10 (modificações), com ressalva para consumidor, em nova versão datada marcada como minuta até revisão de advogado.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Assinar um plano pago e ver o plano liberado (Priority: P1)

Um dono de pequeno negócio já cadastrado clica em "Assinar Pro", vê um resumo com o plano, o valor mensal, a renovação automática em destaque e como cancelar, aceita os termos, paga com cartão numa página que mostra **Polaris IA** como vendedor e volta ao painel com o plano Pro ativo.

**Why this priority**: sem isso a Polaris não consegue receber nenhum real. É o piso de qualquer posicionamento.

**Independent Test**: em ambiente de teste do provedor, uma conta Free assina o Pro com cartão de teste e, sem ação manual, passa a ter os limites do Pro e recebe o recibo por e-mail.

**Acceptance Scenarios**:

1. **Given** uma conta Free logada, **When** ela clica em "Assinar Pro", **Then** vê antes de pagar: plano, preço total mensal, "renova todo mês automaticamente" em destaque, como cancelar e a caixa de aceite dos termos desmarcada.
2. **Given** a página de pagamento aberta, **When** o cliente olha o vendedor, **Then** vê "Polaris IA" (e a razão social da empresa que vende), nunca outra marca.
3. **Given** o pagamento aprovado pelo provedor, **When** a confirmação chega, **Then** o plano vira Pro em até 1 minuto, mesmo que o cliente tenha fechado a aba antes de voltar.
4. **Given** o cliente voltou do pagamento mas a confirmação ainda não chegou, **When** o painel abre, **Then** mostra "pagamento em confirmação", não "Pro ativo" nem erro.
5. **Given** o pagamento recusado, **When** o cliente volta, **Then** continua no Free e vê o motivo em linguagem simples e como tentar de novo.

---

### User Story 2 - Cancelar ou desistir sem falar com ninguém (Priority: P1)

O assinante cancela pelo próprio painel, com no máximo uma tela de oferta de retenção. O acesso pago vai até o fim do ciclo já pago. Se cancelar em até 7 dias da primeira cobrança, recebe o dinheiro de volta integralmente e automaticamente.

**Why this priority**: é exigência do CDC para o público-alvo (autônomo, MEI e pequena empresa no self-service são tratados como consumidores [JURISP finalismo mitigado, STJ]) e defesa contra chargeback e Procon. Sem saída fácil, cobrar vira risco.

**Independent Test**: uma assinatura de teste é cancelada pelo painel e o sistema registra o fim no ciclo; outra, cancelada no dia 2, recebe estorno integral sem intervenção humana.

**Acceptance Scenarios**:

1. **Given** uma assinatura ativa há mais de 7 dias, **When** o cliente clica em "Cancelar assinatura" e confirma, **Then** vê a data em que o acesso pago termina, recebe e-mail de confirmação e não é cobrado de novo.
2. **Given** uma assinatura cuja primeira cobrança foi há 7 dias ou menos, **When** o cliente abre o painel de cobrança, **Then** vê a opção "Desistir e receber o valor de volta" [LEI CDC art. 49].
3. **Given** o cliente desistiu dentro dos 7 dias, **When** confirma, **Then** o valor integral é estornado no mesmo meio de pagamento, sem desconto de taxa, o plano volta a Free na hora e ele recebe e-mail do estorno [LEI Decreto 7.962/2013 art. 5º].
4. **Given** um cliente que cancelou, **When** o ciclo pago termina, **Then** a conta vira Free e todos os dados continuam acessíveis para exportar [LEI CDC art. 39 V].

---

### User Story 3 - Renovação, cartão recusado e troca de plano (Priority: P2)

Todo mês a assinatura renova sozinha e o cliente recebe o recibo. Se o cartão falha, ele é avisado, pode trocar o cartão no painel e tem um prazo antes de perder o plano. O cliente também troca entre Pro e Business sem cancelar.

**Why this priority**: sem isso o primeiro cliente pagante vira problema no segundo mês. Vem depois de P1 porque só existe quando há alguém pagando.

**Independent Test**: no ambiente de teste do provedor, simular a renovação com cartão recusado; o cliente recebe o aviso, troca o cartão pelo painel e a assinatura volta a ativa sem ação manual da equipe.

**Acceptance Scenarios**:

1. **Given** uma assinatura ativa, **When** o ciclo vira, **Then** o valor é cobrado automaticamente e o cliente recebe o recibo por e-mail.
2. **Given** a cobrança da renovação recusada, **When** a recusa é confirmada, **Then** o cliente recebe e-mail com o link para trocar o cartão e mantém o plano durante o prazo de carência.
3. **Given** o prazo de carência vencido sem pagamento, **When** ele termina, **Then** a conta vira Free, com aviso por e-mail, e os dados continuam exportáveis.
4. **Given** um assinante Pro, **When** escolhe Business, **Then** passa a Business na hora, pagando só a diferença proporcional do ciclo.
5. **Given** um assinante Business, **When** escolhe Pro, **Then** passa a Pro na hora, e o tempo não usado do Business vira crédito nas próximas faturas.

---

### User Story 4 - O dono vê a receita de verdade (Priority: P3)

No painel administrativo, receita e distribuição de planos contam só assinaturas pagas e ativas. Trial vencido, checkout abandonado e conta de teste não aparecem como cliente pagante.

**Why this priority**: hoje a tela de planos conta trial vencido como Pro enquanto o MRR mostra R$ 0, e as duas discordam por construção. Não impede vender, por isso é P3.

**Independent Test**: com uma assinatura de teste paga, um trial vencido e um checkout abandonado, o painel mostra exatamente 1 assinatura paga e a receita igual ao valor pago.

**Acceptance Scenarios**:

1. **Given** contas em trial, trial vencido e paga ativa, **When** o admin abre a distribuição de planos, **Then** trial e pagante aparecem separados, e trial vencido conta como Free.
2. **Given** pagamentos confirmados no mês, **When** o admin abre a receita, **Then** o total bate com a soma dos pagamentos confirmados no provedor, descontados os estornos.

---

### Edge Cases

- **Confirmação do provedor chega duas vezes**: o plano é ativado uma vez, o e-mail sai uma vez e nada é cobrado em dobro. Cobrança indevida recebida se devolve em dobro [LEI CDC art. 42 p.ú.].
- **Confirmação chega antes de o cliente voltar**, ou ele nunca volta: o plano é ativado mesmo assim.
- **Assinante clica em "Assinar" de novo**: ele vai para a gestão da assinatura atual, sem abrir uma segunda assinatura.
- **Conta sem plano pago que abre uma URL de pagamento antiga do Mercado Pago**: nada é ativado. O fluxo antigo deixou de existir.
- **Estorno manual pela equipe**: a equipe estorna e cancela a assinatura no painel do provedor; o plano do cliente acompanha o cancelamento (volta a Free). Estorno sem cancelamento não muda o plano.
- **Chargeback aberto pelo cliente**: fica registrado e a equipe é avisada. O plano não muda sozinho antes da decisão.
- **Cadastro pelo Google**: recebe a mesma regra de trial do cadastro por e-mail. Hoje não recebe nenhuma.

## Requirements *(mandatory)*

### Functional Requirements

**Checkout e identificação**

- **FR-001**: A página de pagamento MUST exibir "Polaris IA" como vendedor, com o nome e a identidade visual da Polaris, e nenhuma outra marca.
- **FR-002**: A cobrança MUST aparecer na fatura do cartão com um descritor que identifique a Polaris.
- **FR-003**: Antes de pagar, o cliente MUST ver o plano, o preço total mensal, a renovação automática em destaque e como cancelar [LEI CDC art. 54 §4º; Decreto 7.962/2013 art. 4º].
- **FR-004**: O pagamento MUST exigir o aceite dos termos por caixa desmarcada. O sistema MUST gravar a versão dos termos, o hash do texto, data e hora, IP e navegador de cada aceite.
- **FR-004a**: Os termos aceitos no checkout MUST ganhar nova versão datada, que reescreve só três seções:
  - **§4 Planos e Pagamentos**: provedor atual, renovação mensal automática em destaque [LEI CDC art. 54 §4º], como cancelar, arrependimento de 7 dias com reembolso integral [LEI CDC art. 49], carência de 7 dias por cartão recusado e trial de 7 dias sem cobrança.
  - **§8 Limitação de Responsabilidade**: ressalva de que o limite não se aplica a quem é consumidor [LEI CDC arts. 25 e 51 I].
  - **§10 Modificações**: mudança de conteúdo exige aviso prévio e dá ao cliente o direito de sair; o uso continuado deixa de valer como aceite para consumidor [LEI CDC art. 51 XIII].
  - A versão fica marcada como **minuta** até revisão de advogado, e a versão anterior continua publicada numa URL permanente.
- **FR-005**: O checkout MUST coletar o CPF ou CNPJ do pagador, necessário para a nota fiscal.
- **FR-006**: O rodapé do site MUST exibir razão social, CNPJ, endereço e e-mail de contato da empresa que vende a Polaris [LEI Decreto 7.962/2013 art. 2º].
- **FR-007**: A empresa que vende MUST ser a mesma nas quatro telas: página de pagamento, fatura do cartão, rodapé e termos. É a empresa de **CNPJ 57.493.675/0001-37** (razão social "57.493.675 MARIA EDUARDA ROCHA ZORZETTI"), numa **conta Stripe nova e exclusiva da Polaris**, já verificada, com nome público "Polaris IA". Não reaproveita a conta do Compass nem de outro produto.

**Ativação e ciclo**

- **FR-008**: O plano MUST mudar só depois da confirmação vinda do provedor, nunca pelo simples retorno do navegador.
- **FR-009**: Cada confirmação do provedor MUST ser processada uma única vez. Repetições não ativam de novo, não cobram de novo e não reenviam e-mail.
- **FR-010**: A assinatura MUST renovar automaticamente a cada mês e enviar recibo por e-mail a cada cobrança.
- **FR-011**: O cliente MUST poder trocar o cartão pelo painel.
- **FR-012**: O cliente MUST poder subir de Pro para Business (efeito imediato, cobrança proporcional) e descer de Business para Pro (efeito imediato, crédito proporcional). *Ajustado no plan: o provedor só agenda downgrade para o fim do ciclo entre preços do mesmo produto, e cada plano é um produto (research R9).*
- **FR-013**: Cobrança de renovação recusada MUST gerar aviso por e-mail com link para trocar o cartão e manter o plano por 7 dias de carência. Depois disso, a conta vira Free.

**Saída**

- **FR-014**: O cliente MUST poder cancelar pelo painel com no máximo 1 tela de oferta de retenção. O cancelamento vale no fim do ciclo pago e gera e-mail de confirmação.
- **FR-015**: Até 7 dias após a primeira cobrança, o painel MUST oferecer "desistir" com estorno integral automático no mesmo meio de pagamento e volta imediata ao Free [LEI CDC art. 49; Decreto 7.962/2013 art. 5º].
- **FR-016**: Ao voltar ao Free por qualquer motivo, os dados do cliente MUST continuar acessíveis e exportáveis. O cliente MUST ser avisado antes do que deixa de funcionar.

**Trial**

- **FR-017**: Cadastro por e-mail e cadastro pelo Google MUST seguir a mesma regra de trial: **7 dias de Pro sem cartão**; depois a conta vira Free, sem nenhuma cobrança automática. Para pagar, o cliente assina por ação própria (User Story 1).

**Mercado Pago e painel**

- **FR-018**: O fluxo do Mercado Pago MUST sair do produto: nenhum botão, rota ou confirmação dele pode ativar plano. Os registros antigos pendentes deixam de contar como assinatura.
- **FR-019**: O painel administrativo MUST contar como pagante só assinatura ativa com pagamento confirmado. Trial vencido conta como Free.
- **FR-020**: Cada pagamento confirmado MUST ficar registrado com valor, data, cliente e CPF/CNPJ, o suficiente para emitir a NFS-e. O registro é o do próprio provedor (faturas com o documento do cliente); a Polaris não duplica o CPF/CNPJ no seu banco.

### Key Entities

- **Assinatura**: o vínculo de uma conta com um plano pago. Guarda plano, estado (em trial, ativa, em carência, cancelada no fim do ciclo, encerrada), início e fim do ciclo atual e a referência no provedor. Uma por conta.
- **Pagamento**: cada cobrança feita. Guarda valor, data, estado (confirmado, recusado, estornado, em disputa), a referência no provedor e o CPF/CNPJ do pagador.
- **Evento do provedor**: cada aviso recebido do provedor, guardado pela sua identificação única para garantir processamento uma única vez.
- **Aceite de termos**: quem aceitou, qual versão, o hash do texto, data e hora, IP e navegador.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das páginas de pagamento abertas, o vendedor exibido é "Polaris IA" (conferido por captura de tela em ambiente de teste e em produção).
- **SC-002**: Um pagamento aprovado leva a conta de Free ao plano pago em até 1 minuto, sem ação da equipe, inclusive quando o cliente fecha a aba antes de voltar.
- **SC-003**: Um cliente cancela a assinatura em até 1 minuto, passando por no máximo 1 tela de retenção.
- **SC-004**: Uma desistência dentro de 7 dias resulta em estorno integral e e-mail de confirmação no mesmo dia, sem intervenção humana.
- **SC-005**: A mesma confirmação enviada 2 vezes pelo provedor produz 0 ativações duplicadas, 0 cobranças duplicadas e 0 e-mails duplicados.
- **SC-006**: A receita do mês no painel administrativo tem diferença zero em relação à soma dos pagamentos confirmados, menos os estornos, no provedor.
- **SC-007**: Nenhum caminho do produto abre mais o Mercado Pago (0 ocorrências nas telas e rotas públicas).

## Assumptions

- O fluxo de compra é desenhado pelo CDC: autônomo, MEI e pequena empresa que assinam no self-service são tratados como consumidores [JURISP finalismo mitigado, STJ].
- Os preços atuais continuam (Pro R$ 297/mês, Business R$ 997/mês). Mudar preço ou o que cada plano libera é decisão separada e não bloqueia esta feature.
- O limite de agentes e demais travas de plano não mudam aqui. O que o plano pago libera é assunto da spec 014 (atendente no WhatsApp) e da tabela de preços.
- A v1 aceita cartão de crédito recorrente. PIX Automático e boleto ficam para depois de conferir a oferta do provedor no Brasil.
- Sem plano anual na v1. Por isso não há aviso de renovação anual.
- Não existe nenhum cliente pagante no Mercado Pago (0 pagamentos, conferido em 29/09/2026), então não há assinatura a migrar. A única pendente é teste interno.
- NFS-e: na v1 a equipe emite manualmente pelo Emissor Nacional a partir do registro de pagamentos (FR-020). Automatizar só quando o volume justificar. Obrigatoriedade do Emissor Nacional para empresa do Simples desde 01/09/2026 [LEI Res. CGSN 189/2026] ⏳ (conferido pela skill `saas-legal` em 26/09/2026).
- Dados da empresa (recebidos em 2026-09-29): razão social "57.493.675 MARIA EDUARDA ROCHA ZORZETTI", CNPJ 57.493.675/0001-37, Av. Marechal Rondon, Quadra 256, Lote 17, Jardim Buriti Sereno, Aparecida de Goiânia/GO, CEP 74943-510.
- **Enquadramento fiscal — risco aceito pelo dono em 2026-09-29:** o CNPJ é **MEI** (optante desde 30/09/2024, CNAE principal 7319-0/02, nenhum CNAE de software) e SaaS (CNAE 6311-9/00) não está entre as ocupações do MEI [LEI Res. CGSN 140/2018 Anexo XI] ⏳. O dono decidiu vender a Polaris como MEI assim mesmo, assumindo o risco. Não bloqueia código nem go-live.
- Dependência externa: a conta no provedor precisa estar com verificação de empresa concluída antes do primeiro pagamento real. Isso é passo manual do dono.
- Contas de teste da equipe continuam existindo em produção e não contam como cliente (FR-019).
