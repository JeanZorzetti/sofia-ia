# Design System — Especificacao

> Objetivo: Centralizar todos os tokens visuais em um sistema coeso, auditavel e sincronizavel com Figma.

---

## 1. Paleta de Cores

### Estado Atual
Cores definidas em `globals.css` via variaveis CSS HSL. Funcional, mas paginas usam cores Tailwind hardcoded (`blue-500`, `purple-400`, `emerald-500`) fora dos tokens.

### Proposta: Semantic Color Tokens

```css
/* globals.css — tokens semanticos */
:root {
  /* Brand */
  --brand-primary: 217 91% 60%;        /* blue-500 */
  --brand-secondary: 271 91% 65%;      /* purple-500 */
  --brand-accent: 160 84% 39%;         /* emerald-500 */

  /* Feature Colors (usados em cards, badges) */
  --feature-orchestration: 217 91% 60%;  /* blue */
  --feature-kb: 271 91% 65%;            /* purple */
  --feature-ide: 160 84% 39%;           /* emerald */
  --feature-flows: 142 71% 45%;         /* green */
  --feature-channels: 48 96% 53%;       /* yellow */
  --feature-analytics: 330 81% 60%;     /* pink */

  /* Surfaces */
  --surface-glass: 0 0% 100% / 0.05;
  --surface-glass-hover: 0 0% 100% / 0.08;
  --surface-elevated: 0 0% 8%;

  /* Text */
  --text-primary: 0 0% 100%;
  --text-secondary: 0 0% 100% / 0.7;
  --text-tertiary: 0 0% 100% / 0.5;
  --text-muted: 0 0% 100% / 0.3;

  /* Status */
  --status-success: 142 71% 45%;
  --status-warning: 48 96% 53%;
  --status-error: 0 84% 60%;
  --status-info: 217 91% 60%;
}
```

### Regras
1. **NUNCA** usar `blue-500`, `purple-400` etc diretamente em componentes
2. **SEMPRE** usar tokens semanticos: `bg-brand-primary`, `text-feature-orchestration`
3. Feature colors devem ser usados via constante TypeScript, nao inline

```typescript
// src/lib/design-tokens.ts
export const FEATURE_COLORS = {
  orchestration: { bg: 'bg-feature-orchestration/20', border: 'border-feature-orchestration/30', text: 'text-feature-orchestration' },
  kb:            { bg: 'bg-feature-kb/20',            border: 'border-feature-kb/30',            text: 'text-feature-kb' },
  ide:           { bg: 'bg-feature-ide/20',           border: 'border-feature-ide/30',           text: 'text-feature-ide' },
  flows:         { bg: 'bg-feature-flows/20',         border: 'border-feature-flows/30',         text: 'text-feature-flows' },
  channels:      { bg: 'bg-feature-channels/20',      border: 'border-feature-channels/30',      text: 'text-feature-channels' },
  analytics:     { bg: 'bg-feature-analytics/20',     border: 'border-feature-analytics/30',     text: 'text-feature-analytics' },
} as const
```

---

## 2. Tipografia

### Estado Atual
Inter 100-700 importada do Google Fonts. Tamanhos variam sem padrao entre paginas.

### Proposta: Type Scale

| Token | Tamanho | Uso |
|-------|---------|-----|
| `text-display` | `text-5xl md:text-7xl font-bold tracking-tight` | Hero titles |
| `text-heading-1` | `text-3xl md:text-5xl font-bold tracking-tight` | Section titles |
| `text-heading-2` | `text-2xl md:text-3xl font-semibold` | Sub-sections |
| `text-heading-3` | `text-xl font-semibold` | Card titles |
| `text-body-lg` | `text-lg md:text-xl text-text-secondary` | Hero subtitles |
| `text-body` | `text-base text-text-secondary` | Body text |
| `text-body-sm` | `text-sm text-text-secondary` | Nav links, labels |
| `text-caption` | `text-xs text-text-tertiary` | Metadata, badges |

### Implementacao

```typescript
// src/lib/typography.ts
export const typography = {
  display: 'text-5xl md:text-7xl font-bold tracking-tight',
  h1: 'text-3xl md:text-5xl font-bold tracking-tight',
  h2: 'text-2xl md:text-3xl font-semibold',
  h3: 'text-xl font-semibold',
  bodyLg: 'text-lg md:text-xl',
  body: 'text-base',
  bodySm: 'text-sm',
  caption: 'text-xs',
} as const
```

---

## 3. Espacamento

### Estado Atual
Defaults do Tailwind. Inconsistente entre paginas: hero padding varia entre `pt-20 pb-28`, `pt-16 pb-20`, `pt-24 pb-32`.

### Proposta: Section Spacing Tokens

```typescript
// src/lib/spacing.ts
export const spacing = {
  page: 'px-6 max-w-7xl mx-auto',           // Container padrao
  sectionY: 'py-20 md:py-28',                // Espacamento vertical entre secoes
  sectionFirst: 'pt-20 pb-28',               // Primeira secao apos navbar
  heroGap: 'mb-6',                            // Gap entre titulo e subtitulo
  cardGrid: 'gap-6 md:gap-8',                // Gap entre cards
  navHeight: 'h-16',                          // Altura da navbar
} as const
```

---

## 4. Sombras e Efeitos

### Estado Atual
Definidos em CSS: `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-glow`. OK.

### Adicionar

```css
/* Elevation system */
--elevation-1: 0 1px 3px rgb(0 0 0 / 0.2);          /* Cards */
--elevation-2: 0 4px 12px rgb(0 0 0 / 0.3);          /* Dropdowns, modals */
--elevation-3: 0 8px 30px rgb(0 0 0 / 0.4);          /* Popovers */
--elevation-glow: 0 0 20px rgb(59 130 246 / 0.15);    /* Glow effect */
```

---

## 5. Border Radius

### Estado Atual
Tokens existem: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-card`, `--radius-button`.

### Manter
Ja esta bom. Apenas garantir que TODOS os componentes usem esses tokens em vez de `rounded-lg` hardcoded.

---

## 6. Motion Tokens

### Proposta

```css
/* Transitions */
--transition-fast: 150ms ease;
--transition-base: 200ms ease;
--transition-slow: 300ms ease;
--transition-spring: 500ms cubic-bezier(0.34, 1.56, 0.64, 1);

/* Durations */
--duration-fast: 150ms;
--duration-base: 200ms;
--duration-slow: 300ms;
--duration-enter: 200ms;
--duration-exit: 150ms;
```

---

## 7. Light Mode (Futuro)

### Proposta

```css
@media (prefers-color-scheme: light) {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 9%;
    --text-primary: 0 0% 9%;
    --text-secondary: 0 0% 9% / 0.7;
    --text-tertiary: 0 0% 9% / 0.5;
    --surface-glass: 0 0% 0% / 0.05;
    --surface-elevated: 0 0% 96%;
    /* ... */
  }
}
```

**Nota:** Light mode e P2 (nice-to-have). Dark-first e a identidade visual da Sofia.

---

## 8. Figma Sync

### Workflow proposto
1. Design tokens definidos em `globals.css` + `src/lib/design-tokens.ts`
2. Figma MCP conectado ao Claude Code
3. Qualquer mudanca de token: atualizar CSS + Figma simultaneamente
4. Componentes no Figma espelham os de `src/components/landing/`

### Setup
```bash
claude mcp add --transport http figma https://mcp.figma.com/mcp
```
