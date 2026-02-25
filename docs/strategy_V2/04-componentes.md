# Componentizacao e Organizacao

> Objetivo: Extrair todo codigo duplicado em componentes reutilizaveis. Nenhuma pagina landing deve ter mais de 80 LOC.

---

## 1. Estrutura de Diretorios Proposta

```
src/components/
├── ui/                          # shadcn/ui (ja existe, manter)
│   ├── button.tsx
│   ├── card.tsx
│   └── ...
├── landing/                     # NOVO — componentes de landing pages
│   ├── LandingNavbar.tsx        # Navbar publica reutilizavel
│   ├── Footer.tsx               # Footer reutilizavel
│   ├── HeroSection.tsx          # Hero generico com props
│   ├── FeatureCard.tsx          # Card de feature com icon + cor
│   ├── FeatureGrid.tsx          # Grid de FeatureCards
│   ├── PricingCard.tsx          # Card de pricing com highlight
│   ├── PricingGrid.tsx          # Grid de PricingCards
│   ├── CTASection.tsx           # Call to action reutilizavel
│   ├── NewsletterSection.tsx    # Newsletter form wrapper
│   ├── FAQSection.tsx           # Accordion FAQ com schema JSON
│   ├── ComparisonTable.tsx      # Tabela comparativa
│   ├── TestimonialCard.tsx      # Card de depoimento
│   ├── TrustSignals.tsx         # Logos/badges de confianca
│   ├── SectionWrapper.tsx       # Container padrao de secao
│   └── MobileMenu.tsx           # Menu hamburguer mobile
├── sofia/                       # Dashboard (ja existe, manter)
│   ├── Navbar.tsx
│   ├── Sidebar.tsx
│   └── ...
├── dashboard/                   # NOVO — sub-componentes de pages grandes
│   ├── orchestrations/
│   │   ├── OrchestrationList.tsx
│   │   ├── CreateDialog.tsx
│   │   ├── TemplateDialog.tsx
│   │   └── FlowCanvas.tsx
│   ├── agents/
│   │   ├── AgentList.tsx
│   │   ├── AgentForm.tsx
│   │   └── AgentCard.tsx
│   └── kb/
│       ├── KBList.tsx
│       ├── UploadDialog.tsx
│       └── ChunkPreview.tsx
└── shared/                      # NOVO — componentes compartilhados
    ├── Logo.tsx                 # Logo SVG com props de tamanho
    ├── GradientText.tsx         # Texto com gradiente brand
    ├── AnimatedSection.tsx      # Wrapper com scroll animation
    └── PageHead.tsx             # Metadata wrapper
```

---

## 2. Componentes Landing — Especificacao

### 2.1 LandingNavbar

```typescript
// Props
interface LandingNavbarProps {
  transparent?: boolean  // fundo transparente (hero) vs solido (scroll)
}

// Funcionalidades
- Logo + nome
- Links: Features, Marketplace, Preco, Templates, Blog, Docs, Integracoes
- Mobile: MobileMenu (Sheet/Drawer com todos os links)
- Sticky com glassmorphism
- Scroll detection: fundo muda ao scrollar
```

**Elimina:** ~375 linhas duplicadas em 15 arquivos

### 2.2 Footer

```typescript
// Props
interface FooterProps {
  variant?: 'full' | 'minimal'  // full = 3 colunas + bottom bar, minimal = so bottom bar
}

// Colunas
- Produto: Features, Marketplace, Templates, Preco, Enterprise, White-label, Changelog
- Recursos: Documentacao, API Reference, Integracoes, Self-hosted, Status
- Comunidade: Comunidade, Blog, Afiliados, Early Access, Beta, White-label, GitHub, English
- Bottom bar: Sobre, Termos, Privacidade, Contato, idiomas
```

**Elimina:** ~900 linhas duplicadas em 10 arquivos

### 2.3 HeroSection

```typescript
interface HeroSectionProps {
  badge?: { icon: LucideIcon; text: string }
  title: React.ReactNode        // suporta <GradientText>
  subtitle: string
  secondaryText?: string
  cta?: { label: string; href: string }
  secondaryCta?: { label: string; href: string }
}
```

**Elimina:** ~300 linhas duplicadas em 10 arquivos

### 2.4 FeatureCard

```typescript
interface FeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
  badge?: string
  color: keyof typeof FEATURE_COLORS  // 'orchestration' | 'kb' | 'ide' | ...
  href?: string
}
```

### 2.5 PricingCard

```typescript
interface PricingCardProps {
  name: string
  price: string
  period?: string
  description: string
  features: string[]
  cta: { label: string; href: string }
  highlight?: boolean            // borda glow + badge "Popular"
  badge?: string
}
```

### 2.6 SectionWrapper

```typescript
interface SectionWrapperProps {
  children: React.ReactNode
  className?: string
  id?: string
}

// Implementacao
export function SectionWrapper({ children, className, id }: SectionWrapperProps) {
  return (
    <section id={id} className={cn('px-6 py-20 md:py-28', className)}>
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </section>
  )
}
```

### 2.7 MobileMenu

```typescript
// Usa shadcn Sheet
// Trigger: icone hamburguer visivel em < md
// Conteudo: todos os links da navbar + CTA
// Fecha ao clicar em link
```

**Resolve:** Navegacao mobile ausente em landing pages

---

## 3. Layout Publico

### Proposta: Layout wrapper para todas as paginas publicas

```typescript
// src/app/(public)/layout.tsx
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNavbar />
      <main>{children}</main>
      <Footer />
    </div>
  )
}
```

### Migracao de rotas
Mover todas as paginas publicas para route group `(public)`:
```
src/app/(public)/
├── page.tsx              # Home
├── features/page.tsx
├── preco/page.tsx
├── blog/page.tsx
├── blog/[slug]/page.tsx
├── templates/page.tsx
├── marketplace/page.tsx
├── integrations/page.tsx
├── comunidade/page.tsx
├── whitelabel/page.tsx
├── enterprise/page.tsx
├── sobre/page.tsx
├── beta/page.tsx
├── changelog/page.tsx
├── comparativo/page.tsx
├── como-funciona/page.tsx
├── afiliados/page.tsx
├── contato/page.tsx
├── docs/page.tsx
├── status/page.tsx
├── termos/page.tsx
├── privacidade/page.tsx
├── en/page.tsx
├── es/page.tsx
└── early-access/page.tsx
```

**Beneficio:** Navbar e Footer automaticamente aplicados a TODAS as paginas publicas via layout.

---

## 4. Resultado Esperado: Home Refatorada

### Antes (742 linhas)
```tsx
// page.tsx — 742 LOC
export default function LandingPage() {
  return (
    <div>
      {/* Navbar — 25 linhas inline */}
      {/* Hero — 60 linhas inline */}
      {/* Features — 80 linhas inline */}
      {/* Demo — 40 linhas inline */}
      {/* Comparison — 100 linhas inline */}
      {/* Pricing — 120 linhas inline */}
      {/* Trust — 50 linhas inline */}
      {/* CTA — 30 linhas inline */}
      {/* FAQ — 60 linhas inline */}
      {/* Newsletter — 20 linhas inline */}
      {/* Footer — 90 linhas inline */}
    </div>
  )
}
```

### Depois (~70 linhas)
```tsx
// page.tsx — ~70 LOC
import { HeroSection } from '@/components/landing/HeroSection'
import { FeatureGrid } from '@/components/landing/FeatureGrid'
import { PricingGrid } from '@/components/landing/PricingGrid'
import { ComparisonTable } from '@/components/landing/ComparisonTable'
import { CTASection } from '@/components/landing/CTASection'
import { FAQSection } from '@/components/landing/FAQSection'
import { homeFeatures, homePricing, homeFAQ } from '@/data/home'

export default function HomePage() {
  return (
    <>
      <HeroSection
        badge={{ icon: Zap, text: 'Novo: Replay + Export PDF + KB DOCX' }}
        title={<>Orquestracoes de <GradientText>Agentes IA</GradientText> que Funcionam</>}
        subtitle="Monte pipelines visuais de agentes que colaboram para resolver tarefas complexas."
        cta={{ label: 'Comecar Gratis', href: '/login' }}
      />
      <FeatureGrid features={homeFeatures} />
      <ComparisonTable />
      <PricingGrid plans={homePricing} />
      <CTASection />
      <FAQSection items={homeFAQ} />
    </>
  )
}
```

---

## 5. Dados Separados do Layout

### Proposta: `/src/data/` para dados estaticos

```
src/data/
├── home.ts          # features, pricing, FAQ da home
├── features.ts      # dados da pagina /features
├── pricing.ts       # planos e features
├── faq.ts           # perguntas frequentes
├── navigation.ts    # links de navbar e footer
├── testimonials.ts  # depoimentos
└── comparisons.ts   # tabela comparativa
```

**Beneficio:** Separacao clara entre dados e apresentacao. Facilita manutencao e i18n futuro.
