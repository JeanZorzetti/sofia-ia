# Handoff 013 — Cobrança via Stripe

## NO AR em 30/09/2026 (deploy `159b54c` + `9bc06bf`)

Verificação em produção (playwright-core, conta de teste depois apagada):
- `/termos` v2 (minuta, renovação em destaque, art. 49, CNPJ), `/termos/v1` noindex, rodapé com razão social/CNPJ/endereço, `/preco` e `/privacidade` sem Mercado Pago.
- Rotas: billing/checkout/withdraw 401 sem sessão; webhook sem assinatura 400; webhook antigo do MP 404.
- `/dashboard/billing` 1440 e 360 sem estouro; resumo com labels, erros de CPF/termos; console sem erro.
- Checkout live mostra **"Polaris IA" · "Assinar Polaris IA Pro" · R$ 297,00**, sem Atma, sem marca de teste (SC-001). Parado antes do cartão; sessão expirada e cliente apagado.
- Achado e corrigido (`9bc06bf`): ESC no resumo jogava o foco no `<body>`; agora volta ao botão que abriu.
- Live: produtos `price_1ULX3J5OsolR8EbsxIHuMDVT` (Pro) e `price_1ULX3L5OsolR8EbsDWojLTtp` (Business), Portal `bpc_1ULX3W5OsolR8EbscqKpo7Kv`, webhook `we_1ULX3l5OsolR8EbsPn05WUgt`.

Não verificado: pagamento real em live (exige cartão de verdade; recomendado um R$ 297 + "Desistir" no mesmo dia pelo dono), leitor de tela real, dispositivo móvel real.

Estado em 2026-09-29. Código commitado localmente em `a26fac4` (**não pushado**: push = deploy; a
migração precisa ir antes no host real).

## Validação no sandbox (T038)

Ambiente: sandbox Stripe **Polaris dev** (`acct_1UL56X7QsSJUXdmD`), app local `next dev -p 3013`
com `.env.development.local` (descartável, fora do git), Postgres 16 + pgvector em Docker
(`polaris-013-test`, `localhost:55432`), `stripe listen` encaminhando para `/api/webhooks/stripe`.

| # | Cenário | Resultado |
|---|---|---|
| 1 | Conta nova → trial | ✅ `plan pro`, `trialEndsAt` = cadastro + 7 dias, `paid false` |
| 2 | Resumo antes do pagamento | ✅ UI (revisão de código; sem passagem visual autenticada) |
| 3 | CPF inválido / termos não aceitos | ✅ 400 `invalid_tax_id` / `terms_not_accepted`; 0 customers no Stripe |
| 4 | Pagar com 4242 | ✅ página "Assinar Polaris IA Pro R$ 297,00 por mês"; 3 webhooks 200; `pro/active`; aceite v2 gravado (hash, IP, UA); customer com `br_cpf` |
| 5 | Reenviar evento | ✅ 200, `stripe_events` continua 3 (dedupe) |
| 6 | Fechar a aba antes do retorno | ✅ plano ativado só pelo webhook (o navegador do teste nem tinha sessão) |
| 7 | Desistir em 7 dias | ✅ (30/09, depois de o dono remover as regras de aprovação "Refund created" e "Subscription canceled" do sandbox) 200; R$ 297,00 + R$ 699,95 estornados; assinatura `canceled` com `comment=withdrawal`; e-mail "Desistência confirmada"; sem e-mail de "terminou". A repetição pulou os estornos já feitos — confirma a correção `696b600` |
| 8 | Cancelar no fim do ciclo | ✅ `cancel_at` 29/10 gravado, plano segue Pro, e-mail "foi cancelada" 1× (evento seguinte não repetiu) |
| 9 | Renovação recusada (test clock) | ✅ `past_due` com plano mantido; com Retries = 1 semana → cancelar (T029), cancelada em ~8 dias, conta paga → Free e e-mail "terminou" |
| 10 | Pro → Business → Pro | ✅ upgrade na hora com fatura de R$ 699,95 paga; downgrade na hora com crédito de R$ 699,94 |
| 11 | Rotas sem sessão | ✅ 401 em GET billing, POST checkout/portal/withdraw |
| 12 | Webhook sem/inválida assinatura | ✅ 400, nada gravado |
| 13 | Admin | ✅ 2 pagantes, MRR R$ 594, recebido no mês R$ 996,95 = soma das faturas pagas no Stripe |
| 14 | `grep mercadopago` | ✅ só changelog (histórico), termos v1 (cópia fiel), catálogo MCP e um comentário |

Portal (sessão aberta pelo endpoint): mostra plano, "Atualizar assinatura", "Cancelar assinatura",
cartão e histórico. Configuração `bpc_1UL5967QsSJUXdmDWDMBojqe` (padrão da conta, criada por API).

## Pendências antes do live

Sandbox: 14/14 ✅ (30/09). Itens 1 e 2 abaixo resolvidos no sandbox; repetir no live.

1. **Regra de aprovação de reembolso**: a chave usada pelo app não pode cair na regra "Refund
   created", senão a desistência (CDC art. 49) nunca é automática. Rejeitar o pedido pendente
   `apreq_test_61VUTHr3…` (vence 30/09 18h) e refazer o cenário 7.
2. **T029 — Manage failed payments** (sandbox e live): tentativas dentro de 1 semana e depois
   cancelar a assinatura.
3. **Marca na página do Stripe**: o logo da conta é o da ROI Labs (aparece no Portal). FR-001 pede
   identidade da Polaris; trocar em Branding se for o caso. No live o nome público é "Polaris IA".
4. T039–T042: migração no host real → push → produtos/Portal/webhook/chave live → captura.

## Limpeza depois da validação

`docker rm -f polaris-013-test`, apagar `.env.development.local`, parar `next dev` e `stripe listen`.
