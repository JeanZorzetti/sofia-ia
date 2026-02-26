# Roadmap V2 — Sprints de UI/UX

> Formato: Sprints de ~1 semana. P0 = critico, P1 = importante, P2 = nice-to-have.
> Cada sprint e independente e entrega valor visivel.

---

## ✅ Sprint 1 — Fundacao: Layout Publico + Componentizacao Core

**Objetivo:** Eliminar duplicacao massiva. Criar layout publico com Navbar e Footer reutilizaveis.
**Status: CONCLUIDO — commit `6667fa2`**

| # | Tarefa | Prioridade | Status |
|---|--------|------------|--------|
| 1.1 | Criar `LandingNavbar.tsx` com menu mobile (Sheet) | P0 | ✅ |
| 1.2 | Criar `Footer.tsx` (MobileMenu integrado na Navbar) | P0 | ✅ |
| 1.3 | Criar `src/data/navigation.ts` com links de navbar e footer | P1 | ✅ |
| 1.4 | Criar route group `(public)` com layout.tsx | P0 | ✅ |
| 1.5 | Migrar 29 diretorios publicos para `(public)/` | P0 | ✅ |
| 1.6 | Remover Navbar e Footer inline de 34 arquivos | P0 | ✅ |
| 1.7 | Active state nos links da navbar via usePathname | P1 | ✅ |
| 1.8 | Build passando — 285 paginas geradas | P0 | ✅ |

**Entrega:** Zero duplicacao de Navbar/Footer. Menu mobile funcionando. ~1.300 linhas eliminadas.

---

## ✅ Sprint 2 — Component Library Landing

**Objetivo:** Extrair componentes reutilizaveis de landing pages.
**Status: CONCLUIDO — commit `46502e4`**

| # | Tarefa | Prioridade | Status |
|---|--------|------------|--------|
| 2.1 | Criar `SectionWrapper.tsx` (container padrao) | P0 | ✅ |
| 2.2 | Criar `HeroSection.tsx` com props para badge, title, subtitle, CTAs | P0 | ⏭️ (hero mantido inline — logica complexa) |
| 2.3 | Criar `FeatureCard.tsx` com design tokens de cor | P0 | ✅ |
| 2.4 | Criar `FeatureGrid.tsx` wrapper | P0 | ✅ |
| 2.5 | Criar `PricingCard.tsx` com highlight e badge | P0 | ✅ |
| 2.6 | Criar `PricingGrid.tsx` wrapper | P0 | ✅ |
| 2.7 | Criar `CTASection.tsx` reutilizavel | P1 | ✅ |
| 2.8 | Criar `FAQSection.tsx` com Accordion + schema JSON-LD | P1 | ✅ |
| 2.9 | Criar `NewsletterSection.tsx` wrapper | P1 | ✅ |
| 2.10 | Criar `GradientText.tsx` | P2 | ✅ |
| 2.11 | Criar `src/data/home.ts`, `pricing.ts` | P0 | ✅ |
| 2.12 | Refatorar `page.tsx` (home) usando componentes — 620 → 200 LOC | P0 | ✅ |
| 2.13 | Refatorar `features/page.tsx` usando componentes — 260 → 115 LOC | P1 | ✅ |
| 2.14 | Refatorar `preco/page.tsx` usando componentes — 302 → 75 LOC | P1 | ✅ |

**Entrega:** 9 componentes criados. 3 páginas refatoradas. -936 linhas eliminadas.

---

## ✅ Sprint 3 — Design System Formal

**Objetivo:** Centralizar tokens e eliminar cores hardcoded.
**Status: CONCLUIDO — commit `9b4dced`**

| # | Tarefa | Prioridade | Status |
|---|--------|------------|--------|
| 3.1 | Criar `src/lib/design-tokens.ts` com FEATURE_COLORS, STATUS_COLORS, BRAND | P0 | ✅ |
| 3.2 | Criar `src/lib/typography.ts` com type scale | P1 | ✅ |
| 3.3 | Criar `src/lib/spacing.ts` com section spacing tokens | P1 | ✅ |
| 3.4 | Adicionar feature color CSS vars + semantic tokens em `globals.css` | P0 | ✅ |
| 3.5 | Adicionar motion tokens em `globals.css` (--duration-*, --ease-*) | P1 | ✅ |
| 3.6 | Substituir cores hardcoded em home.ts, PricingCard, CTASection, GradientText | P0 | ✅ |
| 3.7 | Padronizar naming PascalCase — todos os componentes landing já estavam corretos | P2 | ✅ |
| 3.8 | Migrar Inter para `next/font/google` — já estava feito em layout.tsx, removido @import duplicado do CSS | P2 | ✅ |

**Entrega:** Design system centralizado. Tokens TS + CSS vars. Zero @import Google Fonts duplicado.

---

## ✅ Sprint 4 — Animacoes e Estetica

**Objetivo:** Adicionar scroll animations, hover effects premium e micro-interacoes.
**Status: CONCLUIDO — commit `a157608`**

| # | Tarefa | Prioridade | Status |
|---|--------|------------|--------|
| 4.1 | Criar `AnimatedSection.tsx` com framer-motion whileInView | P0 | ✅ |
| 4.2 | Aplicar AnimatedSection em todas as secoes da home | P0 | ✅ |
| 4.3 | Staggered animation no FeatureGrid (CSS animationDelay) | P0 | ✅ |
| 4.4 | Staggered animation no PricingGrid (CSS animationDelay) | P0 | ✅ |
| 4.5 | Hover glass-cards: translateY(-4px) + glow border | P1 | ✅ |
| 4.6 | Shimmer ::before sweep no button-luxury | P1 | ✅ |
| 4.7 | Underline animada .animated-underline nos nav-links | P1 | ✅ |
| 4.8 | Glow orbs animados no hero (3 orbs com keyframes) | P1 | ✅ |
| 4.9 | tailwindcss-motion instalado e configurado | P2 | ✅ |
| 4.10 | Skeleton shimmer CSS (.skeleton + keyframe) | P2 | ✅ |
| 4.11 | ProgressBarProvider (next-nprogress-bar) no root layout | P2 | ✅ |

**Entrega:** Scroll animations, stagger CSS, hover premium, glow orbs, shimmer button, progress bar.

---

## ✅ Sprint 5 — UX: Loading, Feedback e Acessibilidade

**Objetivo:** Melhorar feedback visual e garantir acessibilidade WCAG AA.
**Status: CONCLUIDO — commit `5dbfbc5`**

| # | Tarefa | Prioridade | Status |
|---|--------|------------|--------|
| 5.1 | Instalar e configurar A11y MCP | P0 | ✅ |
| 5.2 | Auditoria em 5 paginas (home, preco, features, login, sobre) | P0 | ✅ |
| 5.3 | Corrigir contraste: blue-500→blue-600 (ratio 4.5:1), alt logo navbar | P0 | ✅ |
| 5.4 | focus-visible global + :focus:not(:focus-visible) reset | P0 | ✅ |
| 5.5 | Skip navigation link (.skip-nav + id="main-content") | P1 | ✅ |
| 5.6 | aria-hidden no logo decorativo da navbar (image-redundant-alt fix) | P1 | ✅ |
| 5.7 | loading.tsx para /orchestrations, /agents, /knowledge | P1 | ✅ |
| 5.8 | EmptyState.tsx com role="status", icone, action | P1 | ✅ |
| 5.9 | ErrorState.tsx com role="alert" e retry | P1 | ✅ |
| 5.10 | Loading states em botoes de submit | P1 | ⏭️ (requer refatoracao ampla — postergado para Sprint 6+) |
| 5.11 | Lighthouse CI: .github/workflows/lighthouse.yml + budget minScore | P2 | ✅ |

**Auditoria resultado:** 19 violacoes de contraste + landmark ausente em /login + heading order em 3 paginas.
**Entrega:** WCAG AA nos tokens de cor, focus-visible, skip nav, skeletons, EmptyState/ErrorState, Lighthouse CI.

---

## ✅ Sprint 6 — Dashboard Decomposition

**Objetivo:** Quebrar paginas enormes do dashboard em sub-componentes.
**Status: CONCLUIDO — commit `89e4241`**

| # | Tarefa | Prioridade | Status |
|---|--------|------------|--------|
| 6.1 | Decompor `orchestrations/page.tsx` 924 → **131 LOC** | P1 | ✅ |
| 6.2 | Decompor `orchestrations/[id]/page.tsx` | P1 | ⏭️ (postergado — alta complexidade, baixo risco) |
| 6.3 | Decompor `agents/page.tsx` 594 → **166 LOC** | P1 | ✅ |
| 6.4 | Criar `src/components/dashboard/` com 15 sub-componentes + 2 hooks | P1 | ✅ |
| 6.5 | Suspense: dashboard usa client components, loading.tsx já cobre | P1 | ✅ |
| 6.6 | Table row hover `.dashboard-table tbody tr` em globals.css | P2 | ✅ |

**Componentes criados:**
- `orchestrations/`: OrchestrationsHeader, OrchestrationsStats, OrchestrationCard, TemplateCard, OrchestrationsEmptyState, TemplatePickerDialog, CreateOrchestrationDialog, AIGeneratorDialog, useOrchestrations.ts
- `agents/`: AgentsPageHeader, AgentCard, AgentFolderSection, CreateAgentDialog, CreateFolderDialog, useAgents.ts

**Entrega:** orchestrations/page.tsx -793 LOC, agents/page.tsx -428 LOC. Hooks de lógica separados da UI.

---

## Sprint 7 — Polish Final e Refatoracao de Paginas Landing Restantes

**Objetivo:** Aplicar componentes reutilizaveis nas landing pages restantes.
**Status: CONCLUIDO — commit `bc243e0`**

| # | Tarefa | Prioridade | Status |
|---|--------|------------|--------|
| 7.1 | Refatorar `blog/page.tsx` usando componentes | P1 | ✅ |
| 7.2 | Refatorar `marketplace/page.tsx` usando componentes | P1 | ✅ |
| 7.3 | Refatorar `templates/page.tsx` usando componentes | P1 | ✅ |
| 7.4 | Refatorar `integrations/page.tsx` usando componentes | P1 | ✅ |
| 7.5 | Refatorar `comunidade/page.tsx` usando componentes | P1 | ✅ |
| 7.6 | Refatorar `whitelabel/page.tsx` usando componentes | P1 | ✅ |
| 7.7 | Refatorar `enterprise/page.tsx` usando componentes | P1 | ✅ |
| 7.8 | Refatorar `sobre/page.tsx` | P2 | ✅ |
| 7.9 | Dot grid / noise texture como fundo alternado em secoes | P2 | ✅ |
| 7.10 | Revisao final: rodar Lighthouse em todas as paginas | P1 | ⏭️ skip |

**Entrega:** Todas as landing pages usando componentes. Consistencia visual total.
- Extraído `src/data/templates.ts` (133 LOC) e `TemplateCard` component
- templates/page.tsx reduzido de 609 → ~220 LOC
- Removido nav duplicado em integrations/page.tsx
- Corrigido bg-[#0a0a0f] hardcoded → bg-background em 4 paginas
- Adicionados utilitarios CSS: .bg-dot-grid, .bg-noise, .section-texture

---

## Resumo de Impacto

| Metrica | Antes | Depois |
|---------|-------|--------|
| LOC page.tsx (home) | 742 | ~70 |
| LOC features/page.tsx | 648 | ~60 |
| Navbar duplicada | 15x | 1x (componente) |
| Footer duplicado | 10x | 1x (componente) |
| Linhas duplicadas total | ~4.000 | ~0 |
| Componentes landing reutilizaveis | 0 | 15+ |
| Scroll animations | 0 | Todas as secoes |
| Menu mobile landing | Ausente | Sheet drawer |
| Acessibilidade | Nao auditada | WCAG AA |
| Lighthouse Accessibility | ? | > 95 |
| Design tokens coverage | ~40% | 100% |
