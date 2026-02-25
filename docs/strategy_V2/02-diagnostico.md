# Diagnostico — Estado Atual da UI/UX

> Auditoria realizada em 25/02/2026. Base: branch `main`.

---

## Resumo Executivo

| Area | Nota | Status |
|------|------|--------|
| Design System | 7/10 | Tokens em CSS, sem tailwind.config.ts |
| Componentes UI (shadcn) | 8/10 | 19 componentes bem implementados |
| Componentes Landing | 2/10 | Tudo inline, zero reutilizacao |
| Navbar Publica | 2/10 | Duplicada em 15+ arquivos |
| Footer | 2/10 | Duplicado em 10+ arquivos |
| Responsividade | 8/10 | Mobile-first, poucos hardcodes |
| Dark Mode | 7/10 | Consistente, sem light mode |
| Animacoes | 6/10 | Basicas, sem scroll animations |
| Dashboard | 7/10 | Layout bom, pages muito longas |
| Acessibilidade | ?/10 | Nunca auditado |

---

## 1. Design System

### O que funciona
- `globals.css` define 65+ variaveis CSS (HSL) para cores, sombras, radius
- Classes utilitarias premium: `.glass-card`, `.button-luxury`, `.navbar-glass`, `.hover-scale`
- Font system: Inter 100-700

### Problemas
- **Sem `tailwind.config.ts`** — tokens definidos via `@theme inline` em CSS, sem autocomplete no editor
- **Cores hardcoded em paginas**: `bg-blue-500/20`, `text-purple-400`, `border-emerald-500/30`
- Nao passa por design tokens — viola DRY
- Spacing usa defaults do Tailwind sem customizacao

### Impacto
Qualquer mudanca na paleta de cores exige buscar e substituir em dezenas de arquivos.

---

## 2. Componentes shadcn/ui

### Presentes (19 componentes)
`button`, `card`, `input`, `badge`, `label`, `switch`, `progress`, `textarea`,
`dialog`, `dropdown-menu`, `slider`, `select`, `scroll-area`, `tabs`, `skeleton`,
`tooltip`, `alert-dialog`, `table`, `sheet`

### Ausentes (necessarios)
`accordion` (FAQ inline), `navigation-menu`, `avatar`, `command` (existe customizado),
`separator`, `breadcrumb` (existe customizado)

---

## 3. Componentes Landing — O Maior Problema

### Navbar Publica
```
Repetida em: page.tsx, features/page.tsx, preco/page.tsx, blog/page.tsx,
changelog/page.tsx, templates/page.tsx, marketplace/page.tsx, integrations/page.tsx,
comunidade/page.tsx, whitelabel/page.tsx, enterprise/page.tsx, sobre/page.tsx,
comparativo/page.tsx, como-funciona/page.tsx, afiliados/page.tsx
```
**15 copias** de ~25 linhas cada = ~375 linhas duplicadas.

### Footer
```
Repetido em ~10 paginas publicas
```
**10 copias** de ~90 linhas cada = ~900 linhas duplicadas.

### Outros componentes inline repetidos
| Componente | Onde aparece | Linhas por copia |
|------------|-------------|-----------------|
| HeroSection | 10+ pages | ~30 linhas |
| FeatureCard | page.tsx, features/, preco/ | ~15 linhas |
| PricingCard | page.tsx, preco/ | ~40 linhas |
| CTASection | 8+ pages | ~20 linhas |
| NewsletterSection | 8+ pages | ~15 linhas |
| FAQSection | page.tsx, preco/ | ~30 linhas |

**Estimativa de codigo duplicado: ~3.000-4.000 linhas** que poderiam ser reduzidas a ~500.

---

## 4. Paginas Longas Demais

| Pagina | Linhas | Deveria ser |
|--------|--------|-------------|
| `app/page.tsx` (home) | 742 | ~80 (composicao de componentes) |
| `app/features/page.tsx` | 648 | ~60 |
| `dashboard/orchestrations/[id]/page.tsx` | 1213 | ~200 + sub-componentes |
| `dashboard/orchestrations/page.tsx` | 924 | ~150 + sub-componentes |
| `dashboard/agents/page.tsx` | 594 | ~100 + sub-componentes |

---

## 5. Inconsistencias Visuais

### Entre paginas landing
- **FeatureCard**: `page.tsx` usa array de `color` com gradientes. `features/page.tsx` usa estilo diferente.
- **PricingCard**: highlight logica diferente entre `page.tsx` e `preco/page.tsx`
- **Espacamento hero**: varia entre `pt-20 pb-28`, `pt-16 pb-20`, `pt-24 pb-32`

### Naming inconsistente
- `Navbar.tsx` (PascalCase) vs `breadcrumb.tsx` (lowercase) no mesmo diretorio

### Cores sem padrao
Cores de feature cards usam 6 combinacoes diferentes hardcoded:
```
blue-500/20, purple-500/20, emerald-500/20, green-500/20, yellow-500/20, pink-500/20
```
Nenhuma dessas vem de tokens.

---

## 6. Responsividade

### Funciona bem
- Breakpoints `md:` e `lg:` usados consistentemente
- Padrao mobile-first aplicado
- `hidden md:flex` para menus desktop

### Problemas
- Tamanhos hardcoded nao responsivos: `w-[600px]`, `w-[800px]`, `h-[300px]`
- Navbar mobile: menu hamburguer ausente em varias paginas

---

## 7. Animacoes

### Existentes
- `fadeInUp` (keyframe CSS) — hero sections
- `glow` (keyframe CSS) — hover em botoes
- `.hover-scale` (transform) — cards
- `framer-motion` — apenas no onboarding wizard e MagicCreateModal

### Ausentes
- Scroll-triggered animations (Intersection Observer)
- Page transitions
- Loading skeletons animados (skeleton existe mas sem pulse customizado)
- Micro-interacoes em botoes/inputs
- Staggered animations em listas/grids

---

## 8. Acessibilidade (Estimativa)

### Provavel OK
- shadcn/ui componentes sao acessiveis por padrao (Radix primitives)
- Botoes tem `aria-label` em alguns lugares

### Provaveis problemas
- Contraste de texto `text-foreground-tertiary` sobre `bg-background` — nao verificado
- Links sem `aria-label` descritivo
- Imagens sem `alt` descritivo em alguns lugares
- Focus styles possivelmente removidos por `focus:outline-none`
- Skip navigation inexistente
- Sem `aria-live` para conteudo dinamico

### Necessario
Rodar auditoria com A11y MCP + Lighthouse para ter dados reais.

---

## Arvore de Problemas (Prioridade)

```
CRITICO (bloqueia escala)
├── Navbar duplicada 15x → Extrair LandingNavbar
├── Footer duplicado 10x → Extrair Footer
└── Paginas 700+ LOC → Decompor em componentes

ALTO (afeta qualidade)
├── Cores hardcoded → Migrar para design tokens
├── FeatureCard inline → Extrair componente
├── PricingCard inline → Extrair componente
├── HeroSection inline → Extrair componente
└── CTASection inline → Extrair componente

MEDIO (melhora experiencia)
├── Zero scroll animations → Adicionar com Motion
├── Sem menu mobile em landing → Implementar Sheet/drawer
├── Acessibilidade nao auditada → Rodar A11y MCP
└── Sem light mode → Implementar toggle

BAIXO (polish)
├── Micro-interacoes → Botoes, inputs, toggles
├── Page transitions → framer-motion layout
├── Loading states → Skeleton animations
└── Staggered grid animations → FeatureCards, PricingCards
```
