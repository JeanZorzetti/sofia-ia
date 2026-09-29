# Quickstart: validar a cobrança via Stripe (013)

Guia de validação ponta a ponta. Detalhes de rota em [contracts/billing-api.md](contracts/billing-api.md) e de dados em [data-model.md](data-model.md).

## Pré-requisitos

- Um **sandbox** Stripe dedicado à Polaris (não o test mode compartilhado), com os produtos Pro e Business e o Portal configurados como em [research.md](research.md) R8, R9 e R16.
- Stripe CLI logada no sandbox (`stripe whoami --format json`).
- `.env.local` com `STRIPE_SECRET_KEY` (restricted key do sandbox), `STRIPE_WEBHOOK_SECRET` (o que o `stripe listen` imprime), `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS`, e `DATABASE_URL` de um banco de teste (**nunca** o `bot@31.97.23.166:5499` do `.env`, que está morto, nem o de produção).
- Migração aplicada no banco de teste.

## Rodar

```bash
npm run dev
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Cenários

| # | Passos | Esperado | Cobre |
|---|---|---|---|
| 1 | Conta nova → `/dashboard/billing` | plano Pro em trial, com a data de fim (criada há < 7 dias); cadastro pelo Google igual | FR-017 |
| 2 | "Assinar Pro" | resumo com preço, renovação em destaque, como cancelar, CPF/CNPJ, caixa desmarcada | FR-003, FR-004 |
| 3 | CPF inválido / caixa desmarcada | erro na tela, nenhum Customer criado no Stripe | FR-004, FR-005 |
| 4 | CPF válido, aceitar, pagar com `4242 4242 4242 4242` | página mostra "Polaris IA"; volta com "pagamento em confirmação"; plano Pro pago em até 1 min; `terms_acceptances` tem 1 linha; o Customer tem o `br_cpf` | US1, SC-001, SC-002 |
| 5 | Repetir o evento: `stripe events resend <evt_id>` | nenhuma mudança, nenhum e-mail novo | FR-009, SC-005 |
| 6 | Fechar a aba antes do retorno | plano vira Pro mesmo assim | US1 cenário 3 |
| 7 | "Desistir e receber de volta" no mesmo dia | reembolso integral no Stripe, assinatura cancelada, conta Free, e-mail | FR-015, SC-004 |
| 8 | Nova assinatura → "Gerenciar assinatura" → cancelar | Portal sem cupom; `cancel_at` gravado; e-mail; plano segue até o fim do ciclo | FR-014, SC-003 |
| 9 | Test clock: avançar 1 mês com cartão `4000 0000 0000 0341` | `past_due`, plano mantido, e-mail de falha do Stripe; avançar 7 dias → `canceled`, conta Free, dados intactos | FR-013, US3 |
| 10 | Pro → Business no Portal | Business na hora, fatura de proration; Business → Pro na hora com crédito | FR-012 |
| 11 | Chamar `/api/billing/portal` e `/withdraw` sem sessão | 401 | constituição V |
| 12 | POST no webhook sem `stripe-signature` | 400, nada gravado | R6 |
| 13 | `/admin`: distribuição e receita | 1 pagante; receita = soma no Stripe menos reembolsos | FR-019, SC-006 |
| 14 | `grep -ri mercadopago src/app src/lib src/middleware.ts` | só o item do catálogo MCP | FR-018, SC-007 |

## Produção (depois do deploy)

1. Migração aplicada no host real antes do push (constituição III).
2. Variáveis de live no EasyPanel; endpoint de webhook live apontando para `https://polarisia.com.br/api/webhooks/stripe`.
3. Abrir o checkout com uma conta de teste e **parar no formulário do cartão**: screenshot mostrando "Polaris IA" (SC-001).
4. Um pagamento real de R$ 297 com cartão próprio seguido de "Desistir" no mesmo dia prova o ciclo inteiro em live, com estorno integral.
