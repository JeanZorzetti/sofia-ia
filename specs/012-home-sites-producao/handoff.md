# Handoff — 012 Home V4 ("Sites de produção, não protótipos")

**Data:** 2026-08-10 · **Branch:** `main` (commit `8b7ee43`) · **Status:** implementado e no ar em produção. **1 bloqueio real: `SIRIUS_CRM_API_KEY` não configurada no EasyPanel** — o brief não vira lead até isso ser setado.

## O que foi feito nesta sessão (`speckit-implement`, T001–T017)

Executado o `tasks.md` completo (17 tasks, MVP = Phases 1–3). Commit único `8b7ee43` em `main`, deploy automático no EasyPanel confirmado no ar.

- **T001** `src/data/home-v4.ts` — copy tipada: `heroCopy`, `painCards`, `howItWorksSteps`, `comparisonRows` (6 linhas, `source` obrigatório), `includedItems`, `pricingModel`, `intakeFaq`.
- **T002** Home atual migrada 1:1 para `/plataforma` (metadata própria, JSON-LD `SoftwareApplication` mantido).
- **T003/T004** Nav (`Plataforma` em `navLinks` + footer "Produto") e `sitemap.ts` (`/plataforma` 0.8, `/peca-seu-site` 0.9).
- **T005** `/api/crm/lead` estendido: honeypot server-side, `siteType`/`currentSite`/`goal` → `notes`, `subject: 'site-intake'`. Retrocompat validada por teste (payload idêntico ao ContactForm quando só campos legados são enviados).
- **T006/T007** `IntakeForm.tsx` + `/peca-seu-site/page.tsx`.
- **T008/T009/T010** Home nova reescrita — 9 seções + metadata + JSON-LD `Service` (provider Organization, `sameAs` canônicos ROI Labs).
- **T012** `src/__tests__/integration/crm-lead-intake.test.ts` — honeypot, notes, retrocompat.
- **T013** Funil íntegro por construção: nenhum link removido de nav/footer; `git diff` restrito a `src/app/(public)/`, `src/data/`, `src/app/api/crm/lead/`, `src/app/sitemap.ts`.
- **T014** As 6 fontes da comparativa verificadas com `curl` retornando 200 (uma delas, G2, bloqueava bots — trocada por `eesel.ai`, mesma alegação, verificável).
- **T016** `tsc --noEmit` limpo; `npm ci` + `npm run build` (Turbopack, igual ao Dockerfile) verde localmente antes do push.

## 🚨 Achado crítico: `/api/crm/lead` nunca esteve realmente em produção

O `research.md`/`plan.md`/handoff anterior desta spec assumiam que `/api/crm/lead` "já está em produção servindo o `ContactForm` de `/contato`". **Isso era falso** — descoberto só agora, testando de ponta a ponta:

- `ContactForm.tsx` (o componente que posta em `/api/crm/lead`) **não é importado em lugar nenhum do app** (`grep` confirma zero usos fora do próprio arquivo).
- `/contato/page.tsx` usa um form **próprio**, que posta em `/api/contact` (rota diferente, grava direto no Postgres via `prisma.salesLead.create` — não usa o Sirius CRM).
- Ou seja: `/api/crm/lead` era código morto até esta feature ligá-lo pela primeira vez via `/peca-seu-site`.
- Teste E2E real em produção (Playwright, brief completo preenchido e enviado) retornou **500 "Configuração interna ausente. Tente novamente em breve."** — `SIRIUS_CRM_API_KEY` não está setada no serviço EasyPanel. Não existe em nenhum `.env`/`.env.local` do repo tampouco (nunca foi configurada, nem localmente).
- `sirius.roilabs.com.br` está no ar (301 confirmado) — não é o CRM que está fora, é a env var que falta.

**Isso não é um bug do código desta feature** — validado que o restante da rota funciona corretamente em produção:
```
POST honeypot preenchido → 200 {"success":true}, sem tocar o CRM ✓
POST sem nome → 400 "Nome obrigatório..." ✓
POST válido → 500 "Configuração interna ausente" (exatamente o comportamento esperado quando a env var falta) ✓
```

**Ação necessária (fora do meu escopo/acesso):** configurar `SIRIUS_CRM_API_KEY` (e confirmar `SIRIUS_CRM_URL` se diferente do default) no serviço EasyPanel do sofia-next, e então repetir o Cenário 2 do quickstart pra confirmar o lead aparecendo no Sirius CRM.

## Evidências E2E (Playwright, produção, 2026-08-10)

| Cenário (quickstart.md) | Resultado |
|---|---|
| 1 — Home nova no ar | ✅ H1, sub, CTAs, 9 seções, zero concorrente antes da comparativa (confirmado por snapshot + grep) |
| 2 — Intake cria lead no CRM | ⚠️ Bloqueado por `SIRIUS_CRM_API_KEY` ausente (ver acima). Honeypot e validação confirmados OK |
| 3 — `/plataforma` herda home antiga | ✅ Title "Plataforma Polaris IA...", JSON-LD `SoftwareApplication`, nav/footer OK |
| 4 — Comparativa factual com fontes | ✅ 6 fontes, todas 200, nomes de concorrentes só dentro da seção |
| 5 — SEO/GEO | ✅ JSON-LD `Service` presente na home; sitemap.xml inclui `/plataforma` e `/peca-seu-site` |

## Pendências

- **Bloqueio de produção:** setar `SIRIUS_CRM_API_KEY` no EasyPanel (ver acima) — sem isso FR-004 (lead no CRM) não funciona de verdade, apesar do código estar correto e no ar.
- **T011 — screenshot real do TeamRun**: não capturado (sem acesso a um run real ao vivo nesta sessão). A seção "como funciona" no ar usa cards numerados com ícones (não é placeholder — é o conteúdo real dos 4 passos), mas o visual de screenshot/replay do research.md R6 continua pendente.
- **Baseline PSI (SC-005):** bloqueado por cota da API pública do PageSpeed Insights (429, sem API key configurada). Recomenda-se rodar manualmente via https://pagespeed.web.dev/ comparando home nova vs. o que já foi documentado historicamente, ou configurar uma API key.
- **Tabela de preços com valores:** decisão pendente do Jean (§5 da estratégia), não bloqueia — seção já comunica o modelo sem números.
- **Rich Results Test formal:** não rodado (validação visual do JSON-LD feita por inspeção do HTML; recomenda-se rodar https://search.google.com/test/rich-results na home e em `/plataforma`).
- **Lead de teste no CRM ("TESTE E2E Spec012" / teste-spec012@roilabs.com.br)**: NÃO foi criado (bloqueado pela env var ausente) — nada a limpar no Sirius CRM.

## Gotchas de ambiente descobertos nesta sessão

- `next build` local (Turbopack) falha sob OneDrive com `TurbopackInternalError` lendo arquivos de `node_modules` corrompidos pelo OneDrive Files-on-Demand (`os error 389`) — não é do código. Fix: `npm ci` completo (reinstala tudo do zero, resolve os placeholders corrompidos).
- `jest` local continua não confiável sob OneDrive (BOM/encoding error em `packages/sofia-ai/package.json` durante o haste-map scan) — confirma a nota já existente no `tasks.md` ("jest NÃO roda local").
- `git stash -u` neste repo falhou parcialmente (permission denied ao remover diretórios vazios pré-existentes sob OneDrive) — restaurável via `git stash pop` sem perda de dados, mas evitar `-u` aqui; preferir `git stash push -- <arquivo>` para mudanças pontuais.
