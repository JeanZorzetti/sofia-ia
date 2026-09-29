# Data Model: Cobrança recorrente via Stripe (013)

Uma migração formal (`prisma migrate`), aplicada à mão no host real `sofia_db@2.24.207.200:5435` **antes** do push (constituição III). Nenhuma coluna ou tabela é apagada nesta entrega.

## Subscription (tabela `subscriptions`, existente)

Uma por usuário (`user_id` único, já existe).

| Campo | Tipo | Novo? | Regra |
|---|---|---|---|
| `stripe_customer_id` | varchar(255), único, nulo | **novo** | gravado antes de abrir o Checkout (research R3) |
| `stripe_subscription_id` | varchar(255), único, nulo | **novo** | gravado pelo `syncSubscription` |
| `stripe_price_id` | varchar(255), nulo | **novo** | preço atual; define `plan` |
| `started_at` | timestamptz, nulo | **novo** | `subscription.start_date`; base da janela de 7 dias do arrependimento |
| `cancel_at` | timestamptz, nulo | **novo** | preenchido quando o cancelamento no fim do ciclo foi pedido |
| `plan` | varchar(50) | existe | `free` \| `pro` \| `business`; derivado de `stripe_price_id` |
| `status` | varchar(50) | existe | espelha o status do Stripe: `active`, `past_due`, `canceled`, `unpaid`, `incomplete`, `incomplete_expired`, `paused` |
| `current_period_start` / `current_period_end` | timestamptz | existe | de `items.data[0].current_period_*` (API basil+) |
| `canceled_at` | timestamptz | existe | de `subscription.canceled_at` |
| `messages_used_month`, `usage_period_start` | — | existe | sem mudança |
| `mercadopago_payment_id`, `mercadopago_subscription_id`, `trial_ends_at` | — | existe | **deixam de ser lidos e escritos**; drop fica para outra entrega |

**Pagante** = `stripe_subscription_id IS NOT NULL AND status IN ('active','past_due')`.

**Transições** (todas vindas do Stripe via `syncSubscription`):

```text
(sem assinatura) --checkout pago--> active
active --renovação recusada--> past_due --pago--> active
past_due --retries esgotados--> canceled            (Dashboard: cancelar)
active --cancelar no Portal--> active + cancel_at --fim do ciclo--> canceled
active --arrependimento (≤7 dias)--> canceled        (estorno integral antes)
active --troca Pro<->Business--> active (novo stripe_price_id)
```

## Plano efetivo (não é tabela)

Calculado por `getUserPlan(userId)` (research R4):

1. pagante → `plan` da linha;
2. `now() < users.created_at + 7 dias` → `pro` (trial, sem cartão, sem cobrança);
3. senão → `free`.

## StripeEvent (tabela nova `stripe_events`)

| Campo | Tipo | Regra |
|---|---|---|
| `id` | varchar(255), PK | `evt_…`; inserir antes de processar; conflito = já processado |
| `type` | varchar(100) | tipo do evento, para auditoria |
| `created_at` | timestamptz, default now | quando foi recebido |

Sem dado pessoal. Pode ser limpa depois de 90 dias (Stripe reenvia por até 3 dias).

## TermsAcceptance (tabela nova `terms_acceptances`)

| Campo | Tipo | Regra |
|---|---|---|
| `id` | uuid, PK | — |
| `user_id` | uuid, FK `users.id`, cascade | quem aceitou |
| `version` | varchar(20) | ex.: `v2` |
| `content_hash` | char(64) | SHA-256 do texto daquela versão |
| `ip` | varchar(64), nulo | primeiro IP de `x-forwarded-for` |
| `user_agent` | text, nulo | — |
| `accepted_at` | timestamptz, default now | — |

Índice em `user_id`. Uma linha por aceite (o mesmo usuário pode aceitar versões diferentes ao longo do tempo).

## Dados que ficam **só no Stripe** (não entram no banco)

- CPF/CNPJ do pagador: `tax_ids` do Customer (`br_cpf` / `br_cnpj`).
- Pagamentos, faturas, reembolsos e disputas: o Stripe é o registro (FR-020). O painel admin lê de lá (research R14).
