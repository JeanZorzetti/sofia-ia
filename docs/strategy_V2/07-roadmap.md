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

## Sprint 2 — Component Library Landing

**Objetivo:** Extrair componentes reutilizaveis de landing pages.

| # | Tarefa | Prioridade | Estimativa |
|---|--------|------------|------------|
| 2.1 | Criar `SectionWrapper.tsx` (container padrao) | P0 | 30min |
| 2.2 | Criar `HeroSection.tsx` com props para badge, title, subtitle, CTAs | P0 | 1h |
| 2.3 | Criar `FeatureCard.tsx` com design tokens de cor | P0 | 1h |
| 2.4 | Criar `FeatureGrid.tsx` wrapper | P0 | 30min |
| 2.5 | Criar `PricingCard.tsx` com highlight e badge | P0 | 1h |
| 2.6 | Criar `PricingGrid.tsx` wrapper | P0 | 30min |
| 2.7 | Criar `CTASection.tsx` reutilizavel | P1 | 30min |
| 2.8 | Criar `FAQSection.tsx` com Accordion + schema JSON-LD | P1 | 1h |
| 2.9 | Criar `NewsletterSection.tsx` wrapper | P1 | 30min |
| 2.10 | Criar `GradientText.tsx` | P2 | 15min |
| 2.11 | Criar `src/data/home.ts`, `features.ts`, `pricing.ts`, `faq.ts` | P0 | 1h |
| 2.12 | Refatorar `page.tsx` (home) usando componentes — alvo < 80 LOC | P0 | 2h |
| 2.13 | Refatorar `features/page.tsx` usando componentes | P1 | 1h |
| 2.14 | Refatorar `preco/page.tsx` usando componentes | P1 | 1h |

**Entrega:** Home de 742 LOC para ~70 LOC. Component library com 10+ componentes.

---

## Sprint 3 — Design System Formal

**Objetivo:** Centralizar tokens e eliminar cores hardcoded.

| # | Tarefa | Prioridade | Estimativa |
|---|--------|------------|------------|
| 3.1 | Criar `src/lib/design-tokens.ts` com FEATURE_COLORS, STATUS_COLORS | P0 | 1h |
| 3.2 | Criar `src/lib/typography.ts` com type scale | P1 | 30min |
| 3.3 | Criar `src/lib/spacing.ts` com section spacing tokens | P1 | 30min |
| 3.4 | Adicionar semantic color tokens em `globals.css` (brand, feature, surface) | P0 | 1h |
| 3.5 | Adicionar motion tokens em `globals.css` (transitions, durations) | P1 | 30min |
| 3.6 | Substituir todas as cores hardcoded (`blue-500/20` etc) por tokens | P0 | 2h |
| 3.7 | Padronizar naming de arquivos: tudo PascalCase em components/ | P2 | 30min |
| 3.8 | Migrar Inter para `next/font/google` | P2 | 30min |

**Entrega:** Design system centralizado. Zero cores hardcoded.

---

## Sprint 4 — Animacoes e Estetica

**Objetivo:** Adicionar scroll animations, hover effects premium e micro-interacoes.

| # | Tarefa | Prioridade | Estimativa |
|---|--------|------------|------------|
| 4.1 | Criar `AnimatedSection.tsx` com framer-motion whileInView | P0 | 1h |
| 4.2 | Aplicar AnimatedSection em todas as secoes da home | P0 | 1h |
| 4.3 | Adicionar staggered animation no FeatureGrid | P0 | 30min |
| 4.4 | Adicionar staggered animation no PricingGrid | P0 | 30min |
| 4.5 | Melhorar hover effect dos glass-cards (translateY + glow) | P1 | 30min |
| 4.6 | Adicionar shimmer effect no button-luxury | P1 | 30min |
| 4.7 | Adicionar underline animada nos nav-links | P1 | 30min |
| 4.8 | Adicionar background glow orbs animados no hero | P1 | 1h |
| 4.9 | Instalar `tailwindcss-motion` para animacoes CSS-only | P2 | 30min |
| 4.10 | Adicionar skeleton shimmer animation em CSS | P2 | 30min |
| 4.11 | Adicionar progress bar global (NProgress estilo) | P2 | 1h |

**Entrega:** Scroll animations em toda a home. Hover effects premium. Micro-interacoes.

---

## Sprint 5 — UX: Loading, Feedback e Acessibilidade

**Objetivo:** Melhorar feedback visual e garantir acessibilidade WCAG AA.

| # | Tarefa | Prioridade | Estimativa |
|---|--------|------------|------------|
| 5.1 | Instalar e configurar A11y MCP | P0 | 30min |
| 5.2 | Rodar auditoria de acessibilidade em 5 paginas principais | P0 | 1h |
| 5.3 | Corrigir problemas de contraste identificados | P0 | 1h |
| 5.4 | Adicionar focus-visible styles globais | P0 | 30min |
| 5.5 | Adicionar skip navigation link | P1 | 15min |
| 5.6 | Revisar e adicionar aria-labels em icon buttons | P1 | 1h |
| 5.7 | Criar `loading.tsx` com skeleton para rotas do dashboard | P1 | 1h |
| 5.8 | Criar `EmptyState.tsx` componente reutilizavel | P1 | 30min |
| 5.9 | Criar `ErrorState.tsx` componente reutilizavel | P1 | 30min |
| 5.10 | Adicionar loading state em todos os botoes de submit | P1 | 1h |
| 5.11 | Configurar Lighthouse CI no GitHub Actions | P2 | 1h |

**Entrega:** WCAG AA compliance. Loading states. Empty/Error states.

---

## Sprint 6 — Dashboard Decomposition

**Objetivo:** Quebrar paginas enormes do dashboard em sub-componentes.

| # | Tarefa | Prioridade | Estimativa |
|---|--------|------------|------------|
| 6.1 | Decompor `orchestrations/page.tsx` (924 LOC) em sub-componentes | P1 | 2h |
| 6.2 | Decompor `orchestrations/[id]/page.tsx` (1213 LOC) em sub-componentes | P1 | 2h |
| 6.3 | Decompor `agents/page.tsx` (594 LOC) em sub-componentes | P1 | 1h |
| 6.4 | Criar diretorio `src/components/dashboard/` com sub-componentes | P1 | 30min |
| 6.5 | Adicionar Suspense boundaries em paginas com fetch | P1 | 1h |
| 6.6 | Adicionar table row hover effects no dashboard | P2 | 30min |

**Entrega:** Nenhuma pagina do dashboard > 200 LOC. Melhor manutenibilidade.

---

## Sprint 7 — Polish Final e Refatoracao de Paginas Landing Restantes

**Objetivo:** Aplicar componentes reutilizaveis nas landing pages restantes.

| # | Tarefa | Prioridade | Estimativa |
|---|--------|------------|------------|
| 7.1 | Refatorar `blog/page.tsx` usando componentes | P1 | 1h |
| 7.2 | Refatorar `marketplace/page.tsx` usando componentes | P1 | 1h |
| 7.3 | Refatorar `templates/page.tsx` usando componentes | P1 | 1h |
| 7.4 | Refatorar `integrations/page.tsx` usando componentes | P1 | 1h |
| 7.5 | Refatorar `comunidade/page.tsx` usando componentes | P1 | 1h |
| 7.6 | Refatorar `whitelabel/page.tsx` usando componentes | P1 | 1h |
| 7.7 | Refatorar `enterprise/page.tsx` usando componentes | P1 | 1h |
| 7.8 | Refatorar paginas restantes (sobre, beta, changelog, etc) | P2 | 2h |
| 7.9 | Dot grid / noise texture como fundo alternado em secoes | P2 | 30min |
| 7.10 | Revisao final: rodar Lighthouse em todas as paginas | P1 | 1h |

**Entrega:** Todas as landing pages usando componentes. Consistencia visual total.

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
