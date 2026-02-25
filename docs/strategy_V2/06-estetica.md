# Estetica — Visual Polish e Micro-Interacoes

> Objetivo: Elevar cada pixel de "funciona" para "encanta". A diferenca entre um produto e um produto premium esta nos detalhes.

---

## 1. Filosofia Visual

Sofia e uma plataforma de IA. A estetica deve comunicar:
- **Inteligencia** — glassmorphism, gradientes sutis, profundidade
- **Confianca** — espacamento generoso, tipografia limpa, alinhamento perfeito
- **Premium** — micro-interacoes polidas, transicoes suaves, atencao ao detalhe
- **Modernidade** — dark-first, glow effects, motion design

---

## 2. Scroll Animations (P0)

### Estado Atual
Zero animacoes de scroll. Conteudo aparece estaticamente ao scrollar.

### Proposta: AnimatedSection Component

```typescript
// src/components/shared/AnimatedSection.tsx
'use client'
import { motion } from 'framer-motion'

interface AnimatedSectionProps {
  children: React.ReactNode
  delay?: number
  className?: string
}

export function AnimatedSection({ children, delay = 0, className }: AnimatedSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
```

### Onde aplicar
- Cada secao da home page
- Cards de features (staggered — delay incremental)
- Cards de pricing (staggered)
- Titulos de secao
- FAQ items

---

## 3. Staggered Grid Animations (P0)

### Para FeatureGrid e PricingGrid

```typescript
// Stagger delay calculado por index
{features.map((feature, i) => (
  <AnimatedSection key={feature.title} delay={i * 0.1}>
    <FeatureCard {...feature} />
  </AnimatedSection>
))}
```

**Efeito:** Cards aparecem sequencialmente da esquerda para direita, de cima para baixo.

---

## 4. Hover Effects Premium (P1)

### 4.1 Cards

```css
/* Hover state para glass-card */
.glass-card {
  transition: all 0.3s cubic-bezier(0.21, 0.47, 0.32, 0.98);
}

.glass-card:hover {
  transform: translateY(-4px);
  border-color: hsl(var(--primary) / 0.3);
  box-shadow: 0 8px 30px rgb(0 0 0 / 0.3), 0 0 20px hsl(var(--primary) / 0.1);
}
```

### 4.2 Botoes

```css
.button-luxury {
  position: relative;
  overflow: hidden;
}

/* Shimmer effect no hover */
.button-luxury::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255,255,255,0.1) 50%,
    transparent 100%
  );
  transform: translateX(-100%);
  transition: transform 0.6s;
}

.button-luxury:hover::after {
  transform: translateX(100%);
}
```

### 4.3 Links de Navegacao

```css
/* Underline animada da esquerda para direita */
.nav-link {
  position: relative;
}

.nav-link::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 1px;
  background: hsl(var(--primary));
  transition: width 0.3s ease;
}

.nav-link:hover::after {
  width: 100%;
}
```

---

## 5. Background Effects (P1)

### 5.1 Gradient Orbs (ja existem parcialmente)

```css
/* Hero background — glow orbs animados */
.hero-glow-1 {
  position: absolute;
  width: 600px;
  height: 400px;
  background: radial-gradient(circle, hsl(var(--primary) / 0.08), transparent 70%);
  animation: float 20s ease-in-out infinite;
}

.hero-glow-2 {
  position: absolute;
  width: 400px;
  height: 300px;
  background: radial-gradient(circle, hsl(var(--brand-secondary) / 0.06), transparent 70%);
  animation: float 25s ease-in-out infinite reverse;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0); }
  33% { transform: translate(30px, -20px); }
  66% { transform: translate(-20px, 15px); }
}
```

### 5.2 Dot Grid Pattern

```css
.dot-grid {
  background-image: radial-gradient(circle, hsl(var(--foreground) / 0.05) 1px, transparent 1px);
  background-size: 24px 24px;
}
```

Pode ser aplicado como fundo sutil em secoes alternadas.

### 5.3 Noise Texture

```css
.noise {
  position: relative;
}

.noise::before {
  content: '';
  position: absolute;
  inset: 0;
  background: url('/noise.svg');
  opacity: 0.03;
  pointer-events: none;
}
```

Textura granulada sutil que adiciona "peso" visual ao fundo escuro.

---

## 6. Micro-Interacoes (P1)

### 6.1 Checkbox/Switch Toggle
- Bounce suave ao ativar/desativar
- Cor muda com transicao suave

### 6.2 Input Focus
- Borda muda de `border-border` para `border-primary` com transicao
- Glow sutil ao redor do input focado

### 6.3 Badge Pulse
- Badge "Novo" ou "Beta" com pulse animation sutil
```css
.badge-pulse {
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

### 6.4 Counter Animation
- Numeros em metricas/stats animam de 0 ate o valor final
- Usar `framer-motion` `useInView` + `animate`

### 6.5 Copy Button Feedback
- Ao copiar, icone muda de "Copy" para "Check" com transicao
- Volta ao original apos 2s

---

## 7. Typography Enhancements (P2)

### 7.1 Gradient Text

```typescript
// src/components/shared/GradientText.tsx
export function GradientText({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
      {children}
    </span>
  )
}
```

### 7.2 Text Reveal Animation
- Titulos de secao aparecem palavra por palavra
- Sutil, sem exagero — apenas em titulos principais

---

## 8. Loading Aesthetics (P2)

### 8.1 Logo Loader
- Logo Sofia com animacao de breathing/pulse durante carregamento
- Substitui spinner generico

### 8.2 Skeleton com Shimmer
```css
.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    hsl(var(--surface-elevated)) 0%,
    hsl(var(--surface-glass)) 50%,
    hsl(var(--surface-elevated)) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### 8.3 Progress Bar Global
- Barra fina no topo da pagina durante navegacao (estilo YouTube/NProgress)
- Pode usar `next-nprogress-bar` ou implementar com `next/navigation` events

---

## 9. Interacao com Dados (P2)

### 9.1 Charts Animados
- Graficos de analytics com animacao de entrada
- Barras crescem de baixo para cima
- Linhas se desenham da esquerda para direita

### 9.2 Table Row Hover
- Highlight sutil na linha ao passar o mouse
- Acoes aparecem on-hover (edit, delete)

### 9.3 Drag and Drop Feedback
- Ghost element semi-transparente durante drag
- Drop zone highlighted com borda pontilhada
- Snap animation ao soltar

---

## 10. Bibliotecas Recomendadas

| Necessidade | Biblioteca | Motivo |
|-------------|-----------|--------|
| Scroll animations | `motion` (framer-motion) | Ja em uso, API declarativa |
| CSS-only animations | `tailwindcss-motion` | Zero JS, 5KB, classes Tailwind |
| Componentes animados | Magic UI | Open-source, shadcn-compatible |
| Loading animations | `lottie-react` | Animacoes vetoriais premium |
| Progress bar | `next-nprogress-bar` | Integra com App Router |
| Number counter | `motion` useInView + animate | Ja disponivel |
