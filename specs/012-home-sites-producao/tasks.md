# Tasks: Home V4 — "Sites de produção, não protótipos"

**Input**: Design documents from `/specs/012-home-sites-producao/`

**Prerequisites**: plan.md, spec.md, research.md, contracts/intake-lead.md, quickstart.md + `docs/strategy_V4/02-criticas-concorrentes.md` e `03-home-sites.md` (fonte da copy)

**Tests**: rota pública estendida ganha teste jest (CI; jest NÃO roda local — OneDrive errno -4094). Páginas são validadas por tsc + quickstart E2E em produção.

**Organization**: agrupado por user story (US1–US4 da spec).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup (copy tipada)

- [ ] T001 Criar `src/data/home-v4.ts`: tipos + copy estruturada da home nova a partir de `docs/strategy_V4/03-home-sites.md` §2–§3 — `heroCopy`, `painCards` (3), `howItWorksSteps` (lead→workers→reviewer→deploy), `comparisonRows` (tipo com `source: {label, url}` OBRIGATÓRIO — fontes em `02-criticas-concorrentes.md`), `includedItems`, `pricingModel` (sem números — FR-010), `intakeFaq` (perguntas espelhando críticas). Copy rica, sem placeholder (regra "no lazy features")

---

## Phase 2: Foundational (migração sem perda)

- [ ] T002 Migrar o conteúdo ATUAL de `src/app/(public)/page.tsx` para `src/app/(public)/plataforma/page.tsx` (move de JSX/imports, não reescrita): metadata própria (title "Plataforma Polaris IA...", canonical `/plataforma`), JSON-LD `SoftwareApplication` mantido; `/` continua com o conteúdo antigo até T008 (nunca há home quebrada)
- [ ] T003 [P] Navegação: adicionar entrada "Plataforma" → `/plataforma` em `src/data/navigation.ts` (e/ou `LandingNavbar.tsx`/`Footer.tsx` se itens hardcoded); conferir que Docs/Enterprise/Whitelabel/Login continuam a 1 clique (FR-006)
- [ ] T004 [P] `src/app/sitemap.ts`: incluir `/plataforma` (priority 0.8) e `/peca-seu-site` (priority 0.9); home mantém 1.0

**Checkpoint**: `/plataforma` no ar com o conteúdo atual; nada removido; tsc limpo

---

## Phase 3: User Story 1 — Visitante com a dor pede um site (P1) 🎯 MVP

**Goal**: home nova vendendo sites de produção + brief funcionando de ponta a ponta (lead no Sirius CRM).

**Independent Test**: quickstart cenários 1 e 2.

- [ ] T005 [US1] Estender `src/app/api/crm/lead/route.ts` conforme `contracts/intake-lead.md`: honeypot server-side (`website` preenchido → 200 sem forward), campos opcionais `siteType`/`currentSite`/`goal` concatenados em `notes`, `subject` aceita `site-intake`; requests atuais (ContactForm) byte-idênticos
- [ ] T006 [P] [US1] Criar `src/app/(public)/peca-seu-site/IntakeForm.tsx` (client, padrão do `ContactForm.tsx` de contato): campos nome, email, WhatsApp (opcional), negócio, tipo de site (select: landing/institucional/site+blog), URL atual (opcional), objetivo (textarea); honeypot oculto; estados idle/loading/success/error; botão desabilitado durante envio; erro NÃO limpa os campos
- [ ] T007 [US1] Criar `src/app/(public)/peca-seu-site/page.tsx` (RSC): metadata própria, promessa do "brief de 5 minutos" (o que acontece depois: proposta com escopo e preço fechado), `IntakeForm`
- [ ] T008 [US1] Reescrever `src/app/(public)/page.tsx` — seções 1–3 do doc §3: hero problema-primeiro (H1 "Sites de produção, não protótipos.", sub do time dev/reviewer/líder, CTA primário → `/peca-seu-site`, CTA secundário → case), 3 cartões de dor, "como funciona" com visual do run; consome `home-v4.ts`, reusa `SectionWrapper`/`AnimatedSection`/`GradientText`; NENHUM concorrente citado nessas seções (FR-007)
- [ ] T009 [US1] Home — seções 4–9: comparativa única (tabela crítica×resposta com fonte linkada em toda linha), "o que está incluso" (SEO técnico + GEO/AEO, performance, design system próprio, repo seu, deploy no seu domínio), prova (case estetia + dogfooding), preço (modelo por entrega, "sem créditos, sem API paga", CTA → intake), FAQ anti-objeção, CTA final
- [ ] T010 [US1] Metadata + JSON-LD da home: title/description/OG/keywords do posicionamento novo; schema `Service` (provider Organization com sameAs canônicos ROI Labs — linkedin `roi-labs-curadoria`, instagram `roilabs.curadoria`); canonical mantido `https://polarisia.com.br`
- [ ] T011 [P] [US1] Asset de prova: capturar screenshot real da UI de TeamRun (lead→workers→reviewer) → `public/` otimizado (WebP/PNG < 200KB) e usar na seção "como funciona"
- [ ] T012 [P] [US1] Teste jest da rota (CI): `src/__tests__/integration/crm-lead-intake.test.ts` — retrocompat (body do ContactForm atual → payload CRM idêntico), honeypot → 200 sem fetch ao CRM, notes com `site-intake`+tipo+objetivo, 400 nome/email

**Checkpoint**: US1 completa — home nova + brief → lead no CRM

---

## Phase 4: User Story 2 — Nada é removido (P1)

**Goal**: zero regressão de funil (FR-006/FR-009).

**Independent Test**: quickstart cenário 3.

- [ ] T013 [US2] Verificação de funil: a partir da home nova, navegar (ou grep de hrefs) até dashboard/login, `/plataforma`, docs, enterprise, whitelabel, preço de planos — tudo 200 e a 1 clique; conferir que NADA fora de `src/app/(public)/`, `src/data/` e `api/crm/lead` foi tocado (git diff)

**Checkpoint**: funil íntegro

---

## Phase 5: User Story 3 + 4 — Prova cética e SEO/GEO (P2/P3)

**Goal**: comparativa auditável; buscadores/LLMs entendem a categoria nova.

**Independent Test**: quickstart cenários 4 e 5.

- [ ] T014 [US3] Auditoria de conteúdo da comparativa: cada linha com fonte pública abrindo 200 (Wiz/The Register/G2 conforme doc 02); tom factual sem adjetivos; concorrentes AUSENTES fora da seção (grep pelos nomes no restante da home)
- [ ] T015 [P] [US4] Validar JSON-LD `Service` (home) e `SoftwareApplication` (/plataforma) no Rich Results Test; conferir sitemap com as rotas novas; registrar baseline PSI da home ATUAL (antes do deploy) para comparação pós-deploy (SC-005)

**Checkpoint**: todas as stories prontas para deploy

---

## Phase 6: Polish & Deploy

- [ ] T016 `npx tsc --noEmit` limpo + build local (`prisma generate` antes de `next build`); commit + push `main` (deploy automático EasyPanel); smoke `/`, `/plataforma`, `/peca-seu-site` 200
- [ ] T017 E2E em produção: quickstart cenários 1–5, incluindo lead real de teste no Sirius CRM; PSI pós-deploy vs. baseline; registrar evidências em `specs/012-home-sites-producao/handoff.md`

---

## Dependencies & Execution Order

- **Phase 1 → 2**: T001 independe; T002 antes de T008 (a home antiga precisa existir em `/plataforma` antes de `/` ser reescrita). T003/T004 [P] após T002.
- **US1 interno**: T005 → T006 → T007 (form depende do contrato); T008 → T009 → T010 (mesmo arquivo, sequencial) dependem de T001; T011/T012 [P] a qualquer momento após T005.
- **US2 (T013)**: após T008/T009. **US3/US4 (T014/T015)**: após T009/T010.
- **Phase 6**: T016 → T017 estritamente nesta ordem; baseline PSI (T015) ANTES do push do T016.

## Implementation Strategy

**MVP = Phases 1–3** (home nova + intake + /plataforma) → T013 é gate de não-regressão antes do deploy → T014/T015 podem ser paralelos ao gate → deploy (T016/T017). Sem migração de banco: NÃO há gate de `prisma migrate deploy` nesta feature. Commits por grupo lógico.
