# Research: Cobrança recorrente via Stripe (013)

Leitura de 2026-09-29. Fontes: skill `stripe:stripe-best-practices` (API `2026-08-26.dahlia`, stripe-node 22.x), docs.stripe.com (páginas citadas abaixo), skill `saas-legal` (conferida em 26/09/2026) e o código atual do repo.

## R1. Forma da integração

- **Decision**: Stripe Checkout hospedado (`mode: 'subscription'`) para o primeiro pagamento, Customer Portal do Stripe para trocar cartão, cancelar e trocar de plano, e um endpoint de webhook para todo o ciclo de vida. Nada de PaymentIntent manual nem loop de renovação próprio.
- **Rationale**: é o caminho que a Stripe recomenda para assinatura (billing.md). A página hospedada exibe o nome público da conta, que resolve o defeito do "Atma Aligner". O Portal cobre FR-011, FR-012 e FR-014 sem tela própria.
- **Alternatives**: Payment Element embutido (mais código, mesmo resultado); Mercado Pago com conta nova (rejeitado pelo dono em 29/09).

## R2. CPF/CNPJ do pagador

- **Decision**: a Polaris coleta CPF ou CNPJ na própria tela de resumo, valida os dígitos verificadores, e grava no **Customer** do Stripe como `tax_id_data` (`br_cpf` ou `br_cnpj`). O documento **não** é gravado no banco da Polaris.
- **Rationale**: `tax_id_collection` do Checkout **não suporta Brasil** (a lista de tipos do Checkout não tem BR; confirmado em docs.stripe.com/tax/checkout/tax-ids). O Customer aceita `br_cpf` e `br_cnpj` (docs.stripe.com/billing/customer/tax-ids), e o ID fiscal aparece nas faturas e no Dashboard, que viram a fonte para a NFS-e manual. Guardar só no provedor é minimização (LGPD).
- **Alternatives**: `custom_fields` do Checkout (sem validação de dígito e sem ir para a fatura); gravar no nosso banco (dado pessoal duplicado sem uso).

## R3. Como um evento vira "qual usuário"

- **Decision**: antes de abrir o Checkout, a Polaris cria (ou reaproveita) o Customer do Stripe e grava `stripe_customer_id` na `subscriptions` do usuário. Todo evento é resolvido por `customer` → linha da `subscriptions`. `client_reference_id = userId` fica só como conferência.
- **Rationale**: billing.md proíbe mapear por metadata como padrão; o Customer é a fronteira de posse. Criar o Customer antes garante o vínculo mesmo se o webhook chegar antes do retorno do navegador.

## R4. Uma regra só para o plano do usuário

- **Decision**: `getUserPlan()` passa a ser a única fonte:
  1. se a linha tem `stripe_subscription_id` e status `active` ou `past_due` → o plano do preço contratado;
  2. senão, se `agora < user.created_at + 7 dias` → `pro` (trial);
  3. senão → `free`.
  O cadastro deixa de gravar linha de trial.
- **Rationale**: há 5 caminhos que criam usuário (e-mail, SSO Google, SSO Microsoft, NextAuth Google, admin) e só o de e-mail dava trial. Derivar o trial de `created_at` conserta todos numa função, sem tocar nos 5 (FR-017). Também some a escrita preguiçosa de downgrade e o "PRO" falso das linhas `trialing` vencidas (FR-019).
- **Alternatives**: helper `startTrial()` chamado nos 5 caminhos (5 pontos de esquecimento); cron de expiração (mais uma peça).

## R5. Estado vindo do Stripe, sem depender da ordem dos eventos

- **Decision**: para qualquer evento que toque uma assinatura, o handler **busca a assinatura na API** (`subscriptions.retrieve`) e sobrescreve o estado local (`syncSubscription`). Período vem de `items.data[0].current_period_start/end`. Início vem de `start_date`.
- **Rationale**: eventos chegam fora de ordem e repetidos; reler a fonte torna o handler idempotente por natureza. Na API basil+ `current_period_*` **saiu da Subscription** e foi para o SubscriptionItem (changelog 2025-03-31.basil).

## R6. Idempotência do webhook

- **Decision**: tabela `stripe_events` com o `id` do evento como chave primária. O handler insere primeiro; se a chave já existe, responde 200 e não faz nada. Assinatura verificada com `stripe.webhooks.constructEvent` sobre o corpo bruto (`await req.text()`), sem assinatura válida → 400.
- **Rationale**: FR-009 e SC-005; cobrança ou e-mail em dobro por bug de webhook é risco jurídico (CDC art. 42 p.ú.). A constituição V exige fail-closed e deduplicação por id.

## R7. Eventos assinados

`checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `charge.dispute.created`, `radar.early_fraud_warning.created`. Os dois últimos só mandam e-mail para a equipe com o id do cliente; não mexem no plano (edge case "chargeback").

## R8. Carência de 7 dias

- **Decision**: configuração do Dashboard em "Manage failed payments": Smart Retries dentro de 1 semana e, esgotadas as tentativas, **cancelar a assinatura**. Enquanto `past_due`, o plano continua (R4). Cancelada → Free. E-mail de falha com link para trocar o cartão: o do próprio Stripe (Dashboard → e-mails ao cliente). E-mail de "sua assinatura terminou, seus dados continuam aqui": nosso, no `customer.subscription.deleted`.
- **Rationale**: a Stripe já faz retry e dunning; construir de novo é o anti-padrão citado em billing.md.

## R9. Cancelar e trocar de plano (Portal)

- **Decision**: Portal com: trocar cartão; cancelar **no fim do período**, com motivo e **sem** cupom de retenção (0 telas de retenção ≤ 1); trocar entre os produtos Pro e Business com proration imediata.
- **Mudança na spec**: o Portal só agenda downgrade para o fim do ciclo **entre preços do mesmo produto** (docs.stripe.com/customer-management/configure-portal). Como Pro e Business são produtos separados (billing.md: um Product por plano), o downgrade vira **imediato com crédito proporcional** do tempo não usado. FR-012 e o cenário 5 da US3 foram ajustados.
- **Cancelamento agendado**: tratar `cancel_at_period_end = true` **ou** `cancel_at` preenchido como "cancela no fim do ciclo"; gravar a data em `cancel_at`. Nosso e-mail de confirmação sai quando esse valor passa de vazio para preenchido.

## R10. Arrependimento (7 dias, CDC art. 49)

- **Decision**: endpoint próprio `POST /api/billing/withdraw`. Condição: assinatura do próprio usuário, `started_at` há 7 dias ou menos. Ação: estorna **todas** as faturas pagas da assinatura desde o início (a primeira e eventual proration de upgrade), buscando o PaymentIntent de cada uma em `invoice.payments` (API basil+: `invoice.payment_intent` não existe mais), com `idempotencyKey` por fatura; depois cancela a assinatura na hora. Plano volta a Free pelo webhook `customer.subscription.deleted`. E-mail nosso de confirmação; recibo de reembolso do Stripe.
- **Rationale**: o Portal não faz reembolso. O estorno é integral, sem desconto de taxa (saas-legal: consumidor-cobranca.md).

## R11. Aceite dos termos

- **Decision**: tabela `terms_acceptances`. O texto dos termos sai do `page.tsx` para um módulo versionado (`v1` = texto atual, `v2` = com as três seções reescritas). O hash é SHA-256 do conteúdo da versão. `POST /api/billing/checkout` exige a versão atual aceita e grava versão, hash, IP (`x-forwarded-for`), user agent e data **antes** de criar a sessão. `/termos` mostra a v2; `/termos/v1` fica publicada para sempre.
- **Rationale**: FR-004 e FR-004a; saas-legal item 1 (aceite versionado; browsewrap não prova).

## R12. Identificação da empresa

- **Decision**: constantes em `src/lib/company.ts` (razão social, CNPJ, endereço, e-mail) usadas no rodapé público e nos termos. Os valores vêm do dono; sem eles o rodapé não vai ao ar (tarefa bloqueada, não placeholder falso).
- **Rationale**: Decreto 7.962/2013 art. 2º; a página de pagamento, a fatura, o rodapé e os termos precisam dizer a mesma empresa (FR-007).

## R13. Saída do Mercado Pago

- **Decision**: apagar `src/lib/mercadopago.ts` (os tipos `PlanId` e `PLANS` vão para `src/lib/plans.ts`), a rota `src/app/api/webhooks/mercadopago`, a exceção `/api/mercadopago` do middleware, a linha da `api-reference` e a dependência `mercadopago`. As colunas `mercadopago_*` e `trial_ends_at` **ficam no banco sem uso**; drop é outra entrega (constituição III exige precheck + backup para drop).
- **Mantém**: o item "Mercado Pago MCP" em `dashboard/mcp` é catálogo de MCP para o usuário, não cobrança.

## R14. Painel administrativo

- **Decision**: pagante = linha com `stripe_subscription_id` e status `active`/`past_due`. A distribuição de planos passa a mostrar pagantes por plano, trial (usuários criados há até 7 dias sem assinatura paga) e Free. A receita do mês vem **do Stripe** (soma de faturas pagas no mês menos reembolsos do mês), o que satisfaz o SC-006 por construção.

## R15. Chaves, ambientes e imposto

- **Chave**: restricted key (`rk_…`), não secret key, com permissão mínima: Checkout Sessions, Customers, Tax IDs, Subscriptions, Customer Portal (escrita), Refunds (escrita), Invoices e Charges (leitura). Variáveis no EasyPanel: `STRIPE_SECRET_KEY` (recebe a `rk_`), `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS`.
- **Ambientes**: desenvolvimento num sandbox dedicado (não o test mode compartilhado); `stripe listen --forward-to localhost:3000/api/webhooks/stripe`. Renovação e carência testadas com test clocks.
- **Cliente Stripe**: instância `new Stripe(key, { apiVersion })` criada sob demanda (lazy), como a constituição IV-d exige do Groq, para não quebrar o build sem a variável.
- **Métodos de pagamento**: não passar `payment_method_types` (métodos dinâmicos pelo Dashboard). `integration_identifier` com sufixo de 8 letras na criação da sessão.
- **Imposto**: sem `automatic_tax`. O preço já é o valor final; o ISS é recolhido pela ROI Labs no seu regime, e a NFS-e sai manualmente pelo Emissor Nacional a partir das faturas do Stripe (spec, Assumptions).

## R16. Passos manuais do dono (fora do código)

1. Criar a conta Stripe nova no CNPJ da ROI Labs e concluir a verificação.
2. Dados públicos: nome "Polaris IA", descritor de fatura "POLARIS IA", e-mail de suporte, URL dos termos, logo e cores.
3. Criar os produtos **Polaris IA Pro** (R$ 297/mês) e **Polaris IA Business** (R$ 997/mês).
4. Configurar o Portal (R9), "Manage failed payments" (R8) e os e-mails ao cliente (recibo, falha, reembolso).
5. Criar o endpoint de webhook com os eventos da R7 e a restricted key da R15; colar as 4 variáveis no EasyPanel.
6. Informar razão social, CNPJ e endereço (R12).
