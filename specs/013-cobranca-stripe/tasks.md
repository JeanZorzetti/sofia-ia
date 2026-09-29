---
description: "Task list for 013 — cobrança recorrente via Stripe"
---

# Tasks: Cobrança recorrente via Stripe (sai o Mercado Pago)

**Input**: Design documents from `specs/013-cobranca-stripe/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/billing-api.md, quickstart.md

**Tests**: incluídos. A constituição exige testes de auth/IDOR em rota sensível; o plano lista três arquivos de teste. jest roda no CI (não local, por causa do OneDrive); local roda `npx tsc --noEmit`.

**Organization**: por user story. US1 e US2 são P1 e formam juntas o MVP: não se cobra consumidor sem o arrependimento de 7 dias no ar.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivo diferente, sem dependência pendente)
- **[Story]**: US1–US4 conforme spec.md
- **[Dono]**: passo manual de quem tem acesso ao Stripe, ao EasyPanel ou ao contador

---

## Phase 1: Setup

- [X] T001 Instalar `stripe` (stripe-node 22.x) e remover `mercadopago` em `package.json`/`package-lock.json` (`npm install stripe@^22 && npm uninstall mercadopago`)
- [X] T002 [P] Acrescentar `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS` (sem valores) em `.env.example`, com comentário "restricted key rk_…, ver specs/013 research R15"
- [X] T003 [P] Criar `src/lib/company.ts` com `COMPANY = { legalName: '57.493.675 MARIA EDUARDA ROCHA ZORZETTI', cnpj: '57.493.675/0001-37', address: 'Av. Marechal Rondon, Qd. 256, Lt. 17, Jardim Buriti Sereno, Aparecida de Goiânia/GO, CEP 74943-510', email: 'contato@roilabs.com.br' }`

---

## Phase 2: Foundational (bloqueia todas as stories)

- [X] T004 Criar `src/lib/plans.ts` (client-safe, sem SDK e sem env): mover `PlanId` e `PLANS` de `src/lib/mercadopago.ts` sem alterar valores
- [X] T005 Trocar os imports de `PLANS`/`PlanId` para `@/lib/plans` em `src/lib/plan-limits.ts` e `src/app/dashboard/billing/page.tsx`
- [X] T006 Em `prisma/schema.prisma`: adicionar a `Subscription` os campos `stripeCustomerId` (`stripe_customer_id`, único), `stripeSubscriptionId` (`stripe_subscription_id`, único), `stripePriceId`, `startedAt`, `cancelAt`; criar os models `StripeEvent` (`stripe_events`) e `TermsAcceptance` (`terms_acceptances`, FK para `users` com cascade, índice em `user_id`) conforme data-model.md; nada é removido
- [X] T007 Escrever à mão a migração formal `prisma/migrations/20260929120000_stripe_billing/migration.sql` (ALTER TABLE + CREATE TABLE + índices únicos), porque o `migrate dev` aponta para o host errado do `.env`; rodar `npx prisma generate`
- [X] T008 Criar `src/lib/stripe.ts`: `getStripe()` lazy (`new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-08-26.dahlia' })`, erro claro se a variável faltar); `priceIdFor(plan)` e `planFromPriceId(priceId)` lendo `STRIPE_PRICE_*`; `syncSubscription(subscriptionId)` que faz `subscriptions.retrieve`, localiza a linha por `stripe_customer_id` e grava `status`, `plan`, `stripePriceId`, `currentPeriodStart/End` de `items.data[0]`, `startedAt` de `start_date`, `cancelAt` (de `cancel_at`, ou do fim do período se `cancel_at_period_end`), `canceledAt`, e devolve o estado anterior e o novo
- [X] T009 Reescrever `getUserPlan()` em `src/lib/plan-limits.ts` sobre uma função pura exportada `resolvePlan({ sub, userCreatedAt, now })`: pagante (`stripeSubscriptionId` + status `active`/`past_due`) → plano da linha; `now < userCreatedAt + 7d` → `pro`; senão `free`. Remover a escrita preguiçosa de downgrade; em `getUsageSummary` tirar `mercadoPagoPaymentId` e expor `trialEndsAt` calculado
- [X] T010 [P] Teste `src/__tests__/lib/plan-rule.test.ts` para `resolvePlan`: pagante ativo, `past_due` mantém, `canceled` cai para trial/free, janela de 7 dias, linha antiga `pro/trialing` do MP ignorada
- [X] T011 Em `src/app/api/auth/register/route.ts` parar de criar a linha `pro/trialing` (o trial vem de `created_at`)

**Checkpoint**: app funciona igual, trial vale para todos os cadastros, nenhuma cobrança ativa.

---

## Phase 3: User Story 1 — Assinar e ver o plano liberado (P1) 🎯 MVP

**Goal**: conta Free paga o Pro numa página "Polaris IA" e o plano muda sozinho.
**Independent Test**: quickstart cenários 2–6.

- [X] T012 [P] [US1] Criar `src/lib/tax-id.ts`: normalizar, validar dígitos verificadores de CPF e CNPJ, devolver `{ type: 'br_cpf' | 'br_cnpj', value }` ou erro
- [X] T013 [P] [US1] Teste `src/__tests__/lib/tax-id.test.ts` (CPF e CNPJ válidos, com e sem máscara; dígito errado; sequência repetida; tamanho errado)
- [X] T014 [P] [US1] Criar `src/lib/terms.ts`: `TERMS.v1` = seções atuais de `src/app/(public)/termos/page.tsx` sem mudar uma vírgula; `TERMS.v2` = v1 com §4, §8 e §10 reescritas conforme FR-004a e identificação da empresa (de `company.ts`) em §1 e §12; `CURRENT_TERMS_VERSION = 'v2'`; `termsHash(version)` = SHA-256 do JSON da versão
- [X] T015 [US1] `src/app/(public)/termos/page.tsx` passa a renderizar `TERMS.v2` com data, versão e o aviso "Minuta, pendente de revisão jurídica"; criar `src/app/(public)/termos/v1/page.tsx` com `TERMS.v1` (permanente, `robots: noindex`)
- [X] T016 [US1] Reescrever `src/app/api/billing/checkout/route.ts` conforme contracts/billing-api.md: validar `plan`, `taxId` e `acceptedTermsVersion`; 409 se já pagante; gravar `TermsAcceptance` (IP do primeiro `x-forwarded-for`, user agent, versão, hash); criar ou reaproveitar o Customer com `tax_id_data` e gravar `stripe_customer_id` (upsert da linha); criar a Checkout Session `mode: 'subscription'` com `client_reference_id`, `integration_identifier` `polaris-checkout-` + 8 letras aleatórias, `success_url`/`cancel_url`, **sem** `payment_method_types` e sem `automatic_tax`
- [X] T017 [US1] Criar `src/app/api/webhooks/stripe/route.ts`: `await req.text()` + `constructEvent` com `STRIPE_WEBHOOK_SECRET` (400 se falhar); inserir em `stripe_events` antes de processar (violação de unicidade → 200 sem efeito); tratar `checkout.session.completed`, `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed` com `syncSubscription`; em erro, apagar a linha do evento e responder 500
- [X] T018 [US1] Estender `GET` em `src/app/api/billing/route.ts` com o bloco `billing` do contrato (`paid`, `status`, `trialEndsAt`, `currentPeriodEnd`, `cancelAt`, `canWithdraw`, `withdrawUntil`)
- [X] T019 [US1] Invocar as skills `ux-writing` e `accessibility`; depois, em `src/app/dashboard/billing/page.tsx`, trocar o `window.open` do MP por: resumo (plano, preço mensal, "renova todo mês automaticamente" em destaque, como cancelar, campo CPF/CNPJ, caixa de aceite desmarcada com link para `/termos`) → POST checkout → redirecionar **na mesma aba**; `?checkout=success` mostra "pagamento em confirmação" e consulta `GET /api/billing` até o plano mudar (limite de 60 s); `?checkout=canceled` explica como tentar de novo; trial mostra a data de fim
- [X] T020 [US1] Em `src/components/dashboard/upgrade-modal.tsx`, o botão de assinar leva a `/dashboard/billing?plan=<id>` e a página abre o resumo desse plano — *sem mudança: o modal já leva a `/dashboard/billing`, onde o cliente escolhe o plano; a página aceita `?plan=`*
- [X] T021 [P] [US1] Teste `src/__tests__/integration/billing-auth.test.ts`: checkout sem sessão → 401; checkout com CPF inválido → 400 sem chamar o Stripe; webhook sem assinatura → 400; mesmo `evt_id` duas vezes → `syncSubscription` chamado uma vez

**Checkpoint**: US1 validada no sandbox (quickstart 2–6).

---

## Phase 4: User Story 2 — Cancelar ou desistir (P1) 🎯 MVP

**Goal**: cancelar pelo Portal no fim do ciclo; desistir em 7 dias com estorno integral.
**Independent Test**: quickstart cenários 7, 8 e 11.

- [X] T022 [P] [US2] Criar `src/app/api/billing/portal/route.ts` (404 `no_customer`; sessão do Portal com `return_url` `/dashboard/billing`)
- [X] T023 [P] [US2] Em `src/lib/email.ts`, acrescentar e-mails: cancelamento agendado (com a data), desistência confirmada (com o valor), assinatura encerrada (dados preservados e exportáveis), alerta à equipe (disputa ou fraude, com id do cliente e valor)
- [X] T024 [US2] Criar `src/app/api/billing/withdraw/route.ts` (research R10): 409 `not_eligible` fora da janela; para cada fatura paga da assinatura, obter o PaymentIntent em `invoice.payments` e `refunds.create` com `idempotencyKey` `withdraw-<invoice.id>`; `subscriptions.cancel` com `cancellation_details.comment = 'withdrawal'`; e-mail de desistência
- [X] T025 [US2] No webhook `src/app/api/webhooks/stripe/route.ts`: e-mail de cancelamento quando `cancelAt` passa de vazio a preenchido; e-mail de encerramento em `customer.subscription.deleted`, exceto se `cancellation_details.comment === 'withdrawal'`; `charge.dispute.created` e `radar.early_fraud_warning.created` mandam o alerta para `COMPANY.email` sem mexer no plano
- [X] T026 [US2] Em `src/app/dashboard/billing/page.tsx`: pagante vê "Gerenciar assinatura" (Portal) e a data de fim se houver cancelamento agendado; com `canWithdraw`, "Desistir e receber o valor de volta" com confirmação que mostra o valor e o efeito
- [X] T027 [P] [US2] Em `src/__tests__/integration/billing-auth.test.ts`: portal e withdraw sem sessão → 401; withdraw fora da janela → 409

**Checkpoint**: MVP completo (US1 + US2) no sandbox.

---

## Phase 5: User Story 3 — Renovação, cartão recusado e troca de plano (P2)

**Goal**: carência de 7 dias, troca de cartão e de plano sem a equipe.
**Independent Test**: quickstart cenários 9 e 10 (test clocks).

- [X] T028 [US3] Em `src/app/dashboard/billing/page.tsx`, com status `past_due`: aviso "pagamento recusado", prazo da carência e botão para o Portal atualizar o cartão
- [ ] T029 [US3] [Dono] No Dashboard do Stripe: Smart Retries dentro de 1 semana e depois **cancelar a assinatura**; e-mails ao cliente ligados (pagamento bem-sucedido, falha com link, reembolso); Portal com troca entre os produtos Pro e Business, proration imediata, cancelamento no fim do período, motivo ligado, sem cupom de retenção

---

## Phase 6: User Story 4 — Receita de verdade no admin (P3)

**Goal**: admin conta só quem pagou.
**Independent Test**: quickstart cenário 13.

- [X] T030 [P] [US4] `src/app/api/admin/analytics/route.ts`: distribuição = pagantes por plano + trial (usuários com até 7 dias sem assinatura paga) + Free
- [X] T031 [P] [US4] `src/app/api/admin/metrics/route.ts`: assinaturas ativas e MRR só de pagantes; `revenueMonth` = soma de `amount_paid` das faturas pagas no mês menos reembolsos do mês, lidos do Stripe (null se o Stripe não estiver configurado)
- [X] T032 [US4] Ajustar rótulos e o novo campo em `src/app/admin/analytics/page.tsx` e `src/app/admin/metrics/page.tsx`

---

## Phase 7: Saída do Mercado Pago e identificação da empresa (FR-006, FR-018)

- [X] T033 Apagar `src/lib/mercadopago.ts` e `src/app/api/webhooks/mercadopago/`; tirar a exceção `/api/mercadopago` de `src/middleware.ts`; trocar a linha do webhook MP pela do Stripe em `src/app/(public)/api-reference/page.tsx`
- [X] T034 [P] Em `src/components/landing/Footer.tsx`, mostrar razão social, CNPJ, endereço e e-mail de `COMPANY`
- [X] T035 Conferir `grep -ri mercadopago src` → só o item do catálogo MCP em `src/app/dashboard/mcp/page.tsx` (SC-007)

---

## Phase 8: Validação e deploy

- [X] T036 `npx tsc --noEmit` limpo; `npm run lint` (informativo)
- [X] T037 [Dono] Criar sandbox Stripe da Polaris com os dois produtos e uma restricted key; instalar a Stripe CLI (`npm i -g @stripe/cli`, `stripe login`)
- [ ] T038 (13/14 ok; cenário 7 bloqueado por regra de aprovação de reembolso na conta — ver handoff.md) Rodar quickstart.md cenários 1–14 no sandbox, com banco de teste; registrar o resultado em `specs/013-cobranca-stripe/handoff.md`
- [ ] T039 Aplicar a migração no host real antes do push: `DATABASE_URL=<sofia_db@2.24.207.200:5435> npx prisma migrate deploy` e conferir as colunas em `information_schema.columns` (constituição III)
- [ ] T040 [Dono] Live: produtos Pro (R$ 297/mês) e Business (R$ 997/mês), restricted key, endpoint de webhook `https://polarisia.com.br/api/webhooks/stripe` com os eventos da research R7; as 4 variáveis no EasyPanel
- [ ] T041 Commit e push; conferir o deploy no EasyPanel
- [ ] T042 Com a skill `ui-verification`: abrir o checkout em produção com conta de teste, parar no formulário do cartão e registrar a captura com "Polaris IA" (SC-001); `/termos`, `/termos/v1` e o rodapé no ar
- [X] T043 [Dono] Enquadramento fiscal decidido: vender como MEI, risco aceito pelo dono em 2026-09-29 (spec, Assumptions)

---

## Dependencies & Execution Order

- **Setup (1)** → **Foundational (2)** → **US1 (3)** → **US2 (4)**. US2 usa o webhook e o checkout da US1.
- **US3 (5)** depende de US1; **US4 (6)** depende só da Foundational.
- **Fase 7** depende de T004/T005 (os imports saíram do MP) e pode correr junto com US1.
- **Fase 8** no fim. T039 antes de T041.

### Parallel Opportunities

- Fase 1: T002 e T003.
- Fase 2: T010 depois de T009.
- US1: T012, T013 e T014 juntos; T021 junto com T019.
- US2: T022 e T023 juntos.
- US4: T030 e T031 juntos.
- Fase 7: T034 a qualquer momento depois de T003.

## Implementation Strategy

1. **MVP = Fases 1, 2, 3, 4 e 7 + T036–T038** no sandbox. Só então migração no host real e deploy (T039–T042).
2. US3 e US4 entram no mesmo deploy se ficarem prontas; senão, num segundo.
3. T043 resolvido: risco fiscal aceito pelo dono.
