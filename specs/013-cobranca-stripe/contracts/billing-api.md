# Contracts: rotas de cobrança (013)

Todas as rotas do usuário exigem sessão (`getAuthFromRequest()` → `auth.id`) e **não recebem id de usuário, cliente ou assinatura no corpo**: atuam só sobre a linha do próprio usuário (zero IDOR). Respostas no padrão do repo: `{ success, data? , error? }`.

## GET /api/billing (existente, estendida)

200:
```json
{
  "success": true,
  "data": {
    "summary": { "plan": "pro", "planData": {}, "usage": {} },
    "billing": {
      "paid": true,
      "status": "active",
      "trialEndsAt": null,
      "currentPeriodEnd": "2026-10-29T00:00:00Z",
      "cancelAt": null,
      "canWithdraw": true,
      "withdrawUntil": "2026-10-06T00:00:00Z"
    }
  }
}
```
- `trialEndsAt` = `users.created_at + 7d` enquanto o trial vale e não há pagante; senão `null`.
- `canWithdraw` = pagante e `started_at` há 7 dias ou menos.

## POST /api/billing/checkout (existente, reescrita)

Body:
```json
{ "plan": "pro", "taxId": "123.456.789-09", "acceptedTermsVersion": "v2" }
```
- 400 `invalid_plan` se `plan` não for `pro` ou `business`.
- 400 `invalid_tax_id` se CPF/CNPJ falhar no dígito verificador.
- 400 `terms_not_accepted` se `acceptedTermsVersion` ≠ versão atual.
- 409 `already_subscribed` se o usuário já é pagante (a UI manda para o Portal).
- Efeitos, nesta ordem: grava `TermsAcceptance`; cria ou reaproveita o Customer (com `tax_id_data`) e grava `stripe_customer_id`; cria a Checkout Session (`mode: subscription`, o preço do plano, `client_reference_id`, `integration_identifier`, sem `payment_method_types`).
- 200: `{ "success": true, "data": { "url": "https://checkout.stripe.com/..." } }`. A UI redireciona **na mesma aba**.
- `success_url`: `/dashboard/billing?checkout=success`; `cancel_url`: `/dashboard/billing?checkout=canceled`.

## POST /api/billing/portal (nova)

Sem body.
- 404 `no_customer` se o usuário nunca abriu checkout.
- 200: `{ "success": true, "data": { "url": "https://billing.stripe.com/..." } }` com `return_url` = `/dashboard/billing`.

## POST /api/billing/withdraw (nova)

Sem body. Arrependimento (CDC art. 49).
- 409 `not_eligible` se não é pagante ou `started_at` passou de 7 dias.
- Efeitos: estorna o saldo de cada cobrança paga da assinatura (repetir é seguro: o que já foi estornado é pulado); cancela a assinatura na hora; envia e-mail de confirmação. O plano muda pelo webhook.
- 200: `{ "success": true, "data": { "refunded": 29700, "currency": "brl" } }`.

## POST /api/webhooks/stripe (nova, pública)

- Já coberta pela exceção `/api/webhooks` do `src/middleware.ts`.
- Corpo bruto + cabeçalho `stripe-signature`; assinatura inválida ou ausente → 400 e nada é processado.
- Evento já visto (`stripe_events.id`) → 200 sem efeito.
- Eventos tratados e efeito:

| Evento | Efeito |
|---|---|
| `checkout.session.completed` | `syncSubscription(session.subscription)` |
| `customer.subscription.created` / `.updated` / `.deleted` | `syncSubscription(sub.id)`; e-mail quando `cancel_at` passa a existir; e-mail de encerramento no `.deleted` |
| `invoice.paid` / `invoice.payment_failed` | `syncSubscription(invoice.parent.subscription_details.subscription)` |
| `charge.dispute.created`, `radar.early_fraud_warning.created` | e-mail para a equipe com o id do cliente e o valor; plano não muda |

- Qualquer outro tipo → 200 sem efeito. Erro inesperado no processamento → 500 (o Stripe reenvia) **e** a linha de `stripe_events` é removida para permitir o reprocesso.

## Páginas

- `/dashboard/billing`: cartões de plano; "Assinar" abre o **resumo** (plano, preço mensal, "renova todo mês automaticamente" em destaque, como cancelar, campo CPF/CNPJ, caixa de aceite desmarcada com link para `/termos`); pagante vê "Gerenciar assinatura" (Portal) e, na janela, "Desistir e receber o valor de volta"; `?checkout=success` mostra "pagamento em confirmação" até o plano mudar.
- `/termos` (v2) e `/termos/v1` (texto de hoje, permanente).
- Rodapé público: razão social, CNPJ, endereço, e-mail.
