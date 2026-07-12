# Implementation Plan: Home V4 — "Sites de produção, não protótipos"

**Branch**: `012-home-sites-producao` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-home-sites-producao/spec.md` + `docs/strategy_V4/*.md`

## Summary

Trocar a narrativa da home de "plataforma de orquestração de agentes" para "sites de produção feitos por um time de agentes que revisa o próprio trabalho". Três movimentos, todos em páginas públicas: (1) o conteúdo atual de `/` migra 1:1 para `/plataforma`; (2) `/` ganha a home nova com as 9 seções do doc `03-home-sites.md`; (3) nova página `/peca-seu-site` com o formulário de intake que cria lead no Sirius CRM pelo proxy público **já existente** `/api/crm/lead` (estendido de forma retrocompatível). Zero mudança em dashboard, coordinator ou fluxos autenticados.

## Technical Context

**Language/Version**: TypeScript, Next.js 16 App Router (RSC-first)

**Primary Dependencies**: Tailwind CSS + componentes de landing existentes (`src/components/landing/*`: SectionWrapper, AnimatedSection, GradientText, FAQSection, CTASection, LandingNavbar, Footer); lucide-react; dados de página em `src/data/*` (padrão da casa)

**Storage**: N/A — o brief NÃO persiste na Polaris; vira contato no Sirius CRM via proxy `/api/crm/lead` (env `SIRIUS_CRM_API_KEY`/`SIRIUS_CRM_URL`, já em produção)

**Testing**: `npx tsc --noEmit` local (jest só no CI — OneDrive errno -4094); validação E2E via quickstart.md em produção

**Target Platform**: Web (EasyPanel Docker, `polarisia.com.br`), deploy automático por push na `main`

**Project Type**: Web app — mudança restrita a `src/app/(public)/` + `src/data/` + 1 extensão retrocompatível de route handler público

**Performance Goals**: não regredir vs. home atual (mesmos padrões de componente, seções estáticas RSC; medição só em produção — Lighthouse local não confiável)

**Constraints**: nenhum concorrente fora da seção comparativa; toda crítica com fonte pública linkada; preço sem números (decisão pendente do Jean); pt-BR only

**Scale/Scope**: 3 páginas (1 nova home, 1 migrada, 1 intake) + nav/rodapé + sitemap + extensão de 1 rota

## Constitution Check

*GATE: passa — re-checado após o design.*

- **I. Ação > Análise**: PASS — insumo estratégico pronto e validado (strategy_V4); plano vai direto à implementação.
- **II. Coordinator Intocado**: PASS por construção — nada em `src/lib/orchestration/` é tocado (FR-009).
- **III. Migrations Formais**: N/A — zero mudança de schema/banco.
- **IV. Padrões Next.js 16**: PASS — rotas novas sem params dinâmicos; metadata estática; nada de `new PrismaClient()`; client component só no formulário (`'use client'`).
- **V. Segurança multi-tenant**: PASS — nenhuma rota autenticada tocada. A rota pública `/api/crm/lead` já valida nome/email server-side; a extensão adiciona honeypot server-side (bot → 200 sem forward) e mantém validação. Sem dados sensíveis persistidos na Polaris.

## Project Structure

### Documentation (this feature)

```text
specs/012-home-sites-producao/
├── spec.md              # Especificação (+ Clarifications 2026-07-12)
├── plan.md              # Este arquivo
├── research.md          # Decisões R1–R6
├── quickstart.md        # Cenários de validação E2E (produção)
├── contracts/
│   └── intake-lead.md   # Payload estendido do POST /api/crm/lead
└── tasks.md             # /speckit-tasks
```

*Sem `data-model.md`*: a feature não persiste nada na Polaris (brief → CRM externo). O "modelo" é o contrato do proxy.

### Source Code (repository root)

```text
src/app/(public)/
├── page.tsx                      # REESCRITA: home nova (9 seções, RSC, metadata Service)
├── plataforma/
│   └── page.tsx                  # NOVA: recebe o conteúdo atual de page.tsx (metadata/canonical próprios)
└── peca-seu-site/
    ├── page.tsx                  # NOVA: página do brief (RSC, metadata)
    └── IntakeForm.tsx            # NOVO: client component (padrão do ContactForm existente)

src/components/landing/           # REUSO; novos componentes APENAS se uma seção não couber nos existentes
src/data/
├── home-v4.ts                    # NOVO: copy estruturada da home nova (dor, comparativa+fontes, incluso, FAQ)
└── navigation.ts                 # EDIT: entrada "Plataforma" na nav + rodapé

src/app/
├── sitemap.ts                    # EDIT: + /plataforma, /peca-seu-site
└── api/crm/lead/route.ts         # EDIT retrocompatível: campos do brief (siteType/currentSite/goal→notes),
                                  #   subject "site-intake", honeypot server-side
```

**Structure Decision**: tudo dentro de `src/app/(public)/` + `src/data/` seguindo o padrão existente (página RSC importa copy de `src/data/`, form é client component isolado que POSTa no proxy). A migração da home atual é um **move** de conteúdo (imports/JSX), não reescrita — minimiza risco de regressão em `/plataforma`.

## Decisões técnicas (amarradas ao research.md)

1. **R1 — Intake reusa `/api/crm/lead`**: já em produção, já resolve CRM/env/erros. Extensão apenas concatena os campos novos em `notes` e marca `subject: 'site-intake'`. Formulário de contato continua byte-idêntico (campos novos são opcionais).
2. **R2 — `/peca-seu-site` como página própria**: URL rastreável/comunicável; CTA do hero e da seção de preço apontam pra ela.
3. **R3 — Copy vem de `docs/strategy_V4/03-home-sites.md` §2–§3** (mapa crítica→mensagem e estrutura seção a seção); fontes da comparativa em `02-criticas-concorrentes.md`. Copy fica em `src/data/home-v4.ts` tipada.
4. **R4 — Schema**: home nova = `Service` (+ `Organization` provider); `/plataforma` herda o `SoftwareApplication` atual.
5. **R5 — Sem redirects/âncoras legadas**: `/` continua existindo; âncoras antigas não são preservadas (aceito na spec).
6. **R6 — Prova visual**: screenshot estático da UI de TeamRun em `public/` (asset a capturar do dashboard real); case linka `https://estetia.estetiacrm.com.br`.

## Complexity Tracking

Sem violações — não aplicável.
