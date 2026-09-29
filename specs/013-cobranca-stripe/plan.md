# Implementation Plan: Cobrança recorrente via Stripe (sai o Mercado Pago)

**Branch**: `013-cobranca-stripe` | **Date**: 2026-09-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/013-cobranca-stripe/spec.md`

## Summary

Trocar o Mercado Pago pelo Stripe numa conta nova da ROI Labs com nome público "Polaris IA". O primeiro pagamento sai pelo Checkout hospedado; troca de cartão, cancelamento e troca de plano, pelo Customer Portal; o estado da assinatura, por webhook idempotente que relê a assinatura na API. A Polaris só constrói o que o Stripe não faz:
- a tela de resumo com CPF/CNPJ e aceite versionado dos termos;
- o arrependimento de 7 dias com estorno integral;
- o plano efetivo numa função só, com trial derivado da data de cadastro;
- o rodapé com a identificação da empresa;
- os termos v2;
- o painel admin lendo só pagantes.

Decisões e fontes em [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5, Node 22, Next.js 16.1.6 (App Router)
**Primary Dependencies**: `stripe` (stripe-node 22.x, API `2026-08-26.dahlia`) **entra**; `mercadopago` **sai**; Prisma 5.22; Resend (`src/lib/email.ts`) para os e-mails próprios
**Storage**: PostgreSQL `sofia_db@2.24.207.200:5435`. Mudanças: 5 colunas novas em `subscriptions`, tabelas `stripe_events` e `terms_acceptances`
**Testing**: jest no CI (não local: OneDrive corrompe `node_modules`); `npx tsc --noEmit` local; validação ponta a ponta pelo [quickstart.md](quickstart.md) com sandbox + Stripe CLI + test clocks
**Target Platform**: EasyPanel (Docker) em `polarisia.com.br`
**Project Type**: web app Next.js monolítico (UI + rotas de API no mesmo `src/`)
**Performance Goals**: plano liberado em até 1 min após o pagamento (SC-002); webhook responde em < 10 s
**Constraints**: CDC no fluxo de compra; webhook fail-closed; nenhuma chave no código; restricted key; sem `payment_method_types`; sem `automatic_tax`
**Scale/Scope**: dezenas de assinaturas no primeiro ano; 2 planos pagos mensais; 1 moeda (BRL)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Como o plano cumpre | Status |
|---|---|---|
| I. Ação > Análise | escopo fechado na spec + clarify; decisões registradas em research | ✅ |
| II. Coordinator intocado | nada de Teams/`runTeam` é tocado | ✅ |
| III. Migração formal no host real | 1 migração `prisma migrate`, aplicada à mão em `2.24.207.200:5435` antes do push; **nenhum drop** (colunas MP ficam sem uso) | ✅ |
| IV. Next 16 + type safety | sem params dinâmicos novos; `getAuthFromRequest()` → `auth.id`; Prisma via singleton; cliente Stripe lazy (como a regra do Groq) | ✅ |
| V. Segurança e isolamento | rotas sem id no body (zero IDOR); webhook com assinatura, resposta rápida e dedupe por `evt_id`; chaves no EasyPanel; CPF/CNPJ só no Stripe | ✅ |
| Workflow: testes de IDOR/auth em rota sensível | testes para checkout/portal/withdraw sem sessão e webhook sem assinatura | ✅ |

**Re-check pós-design**: sem violações; Complexity Tracking vazio.

## Project Structure

### Documentation (this feature)

```text
specs/013-cobranca-stripe/
├── spec.md
├── plan.md              # este arquivo
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── billing-api.md
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                                  # Subscription +5 colunas; StripeEvent; TermsAcceptance
└── migrations/2026092900000x_stripe_billing/      # migração formal

src/lib/
├── plans.ts                  # NOVO: PlanId, PLANS (saem de mercadopago.ts), priceId <-> plano
├── stripe.ts                 # NOVO: cliente lazy, syncSubscription(), ensureCustomer()
├── tax-id.ts                 # NOVO: validar CPF/CNPJ (dígito verificador) + tipo br_cpf/br_cnpj
├── terms.ts                  # NOVO: versões dos termos (v1 = texto atual, v2) + hash SHA-256
├── company.ts                # NOVO: razão social, CNPJ, endereço, e-mail (valores do dono)
├── plan-limits.ts            # getUserPlan() com a regra única (research R4); sem mercadoPagoPaymentId
├── email.ts                  # + e-mails: cancelamento agendado, desistência, encerramento, alerta de disputa
└── mercadopago.ts            # APAGADO

src/app/api/
├── billing/route.ts          # GET estendido (bloco `billing`)
├── billing/checkout/route.ts # reescrito para Stripe
├── billing/portal/route.ts   # NOVO
├── billing/withdraw/route.ts # NOVO
├── webhooks/stripe/route.ts  # NOVO
├── webhooks/mercadopago/     # APAGADO
├── auth/register/route.ts    # para de gravar linha de trial
└── admin/{analytics,metrics}/route.ts  # pagante = Stripe ativo; receita do mês do Stripe

src/app/
├── dashboard/billing/page.tsx          # resumo pré-checkout, Portal, desistir, "em confirmação"
├── (public)/termos/page.tsx            # renderiza v2 a partir de src/lib/terms.ts
└── (public)/termos/v1/page.tsx         # NOVO: texto antigo, permanente

src/components/
├── landing/Footer.tsx                  # identificação da empresa
└── dashboard/upgrade-modal.tsx         # PLANS de src/lib/plans.ts; CTA leva ao resumo

src/middleware.ts                        # remove a exceção /api/mercadopago
src/app/(public)/api-reference/page.tsx  # troca a linha do webhook MP pela do Stripe

src/__tests__/
├── unit/tax-id.test.ts                 # CPF/CNPJ válidos e inválidos
├── unit/plan-rule.test.ts              # pagante / trial / free / past_due
└── integration/billing-auth.test.ts    # 401 sem sessão; webhook sem assinatura = 400; evento repetido = sem efeito
```

**Structure Decision**: projeto único Next.js, como o resto do repo. A lógica do Stripe fica em `src/lib/stripe.ts`, e as rotas continuam finas.

## Ordem de entrega (vira fases no tasks.md)

1. **Fundação**: `plans.ts` (move PLANS), `stripe.ts`, migração, `getUserPlan` novo com teste. O app continua funcionando sem cobrança.
2. **US1 (P1)**: `tax-id.ts`, `terms.ts` + termos v2 + `/termos/v1`, checkout, webhook, UI de resumo e "em confirmação".
3. **US2 (P1)**: Portal (cancelar) e `withdraw` + e-mails.
4. **US3 (P2)**: configuração de retries/carência (Dashboard) + e-mail de encerramento + troca de plano pelo Portal.
5. **US4 (P3)**: painel admin.
6. **Saída do MP + rodapé**: apagar MP, middleware, api-reference, dependência; `company.ts` no rodapé (bloqueado pelos dados do dono).
7. **Validação**: quickstart no sandbox; migração no host real; deploy; screenshot do checkout live (SC-001).

Ao escrever texto de interface e o componente de resumo: skills `ux-writing` e `accessibility` (CLAUDE.md global §5). Depois do deploy: `ui-verification`.

## Complexity Tracking

Nenhuma violação da constituição.
