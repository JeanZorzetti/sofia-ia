# Ferramentas, MCPs e Bibliotecas

> Ferramentas recomendadas para executar a Strategy V2 com qualidade e velocidade.

---

## 1. MCPs para Claude Code

### 1.1 Figma MCP Server (Prioridade: ALTA)
**O que faz:** Acessa designs, componentes e tokens diretamente do Figma. Suporta "Code to Canvas" — converte codigo em frames editaveis.
```bash
claude mcp add --transport http figma https://mcp.figma.com/mcp
```
**Quando usar:** Sync de design tokens, referencia visual, criar componentes a partir de designs.
**Preco:** Gratuito (requer conta Figma free)

### 1.2 shadcn/ui MCP Server (Prioridade: ALTA)
**O que faz:** Consulta o registry completo do shadcn/ui — componentes, props, exemplos. Instala via linguagem natural.
```json
// .mcp.json
{
  "mcpServers": {
    "shadcn": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://www.shadcn.io/api/mcp"]
    }
  }
}
```
**Quando usar:** Adicionar novos componentes shadcn, consultar API de componentes existentes.
**Preco:** Gratuito

### 1.3 Playwright MCP Server (Prioridade: ALTA)
**O que faz:** Automacao de browser — screenshots, navegacao, testes visuais. Usa accessibility tree.
```bash
claude mcp add playwright npx @playwright/mcp@latest
```
**Quando usar:** Capturar screenshots para comparacao visual, testar responsividade, validar mudancas.
**Preco:** Gratuito (open-source)

### 1.4 A11y MCP Server (Prioridade: MEDIA)
**O que faz:** Testes de acessibilidade WCAG (A/AA/AAA) usando axe-core + Puppeteer. Analisa URLs ou HTML.
```bash
claude mcp add a11y npx a11ymcp
```
**Quando usar:** Sprint 5 — auditoria de acessibilidade, contraste, ARIA.
**Preco:** Gratuito (open-source)

### 1.5 Storybook MCP Server (Prioridade: BAIXA — futuro)
**O que faz:** Conecta ao Storybook — metadados de componentes, props, variantes, testes visuais.
```bash
npm install @storybook/addon-mcp
```
**Quando usar:** Se/quando implementar Storybook para a component library.
**Preco:** Gratuito (open-source)

---

## 2. Bibliotecas de Animacao

### 2.1 Motion (Framer Motion) — JA INSTALADA
**Status:** Ja em uso no onboarding e MagicCreateModal.
**Expandir para:** Scroll animations (whileInView), staggered grids, page transitions.
**Bundle:** ~85KB
**URL:** https://motion.dev

### 2.2 tailwindcss-motion (Prioridade: MEDIA)
**O que faz:** Plugin Tailwind CSS-only para animacoes. Zero JS. 20+ presets.
```bash
npm install tailwindcss-motion
```
**Quando usar:** Animacoes simples que nao precisam de JS (fade, slide, bounce, shake).
**Bundle:** ~5KB (CSS puro)
**URL:** https://github.com/romboHQ/tailwindcss-motion

### 2.3 Lottie React (Prioridade: BAIXA)
**O que faz:** Renderiza animacoes vetoriais do After Effects. Ideal para loading e empty states.
```bash
npm install lottie-react
```
**Fonte de animacoes:** https://lottiefiles.com (milhares gratuitas)
**Quando usar:** Logo loader, empty states, ilustracoes animadas.

---

## 3. Componentes Animados (Copy-Paste)

### 3.1 Magic UI (Prioridade: MEDIA)
**O que faz:** 50+ componentes animados open-source, construido sobre shadcn/ui.
**URL:** https://magicui.design
**Quando usar:** Componentes prontos como animated counters, text effects, card animations.
**Preco:** Gratuito (open-source). Templates premium pagos.

### 3.2 Aceternity UI (Prioridade: BAIXA)
**O que faz:** 100+ blocos animados — spotlight, parallax, 3D cards, text effects.
**URL:** https://ui.aceternity.com
**Quando usar:** Efeitos visuais mais elaborados (hero spotlight, card 3D).
**Preco:** Base gratuito. Pro pago.

---

## 4. Auditoria e CI

### 4.1 Lighthouse CI (Prioridade: ALTA)
**O que faz:** Roda Lighthouse em cada commit via GitHub Actions. Mede Performance, Accessibility, SEO.
```bash
npm install --save-dev @lhci/cli
```
**Configuracao:** `.lighthouserc.js` + workflow em `.github/workflows/lighthouse.yml`
**URL:** https://github.com/GoogleChrome/lighthouse-ci
**Preco:** Gratuito

### 4.2 Chromatic (Prioridade: BAIXA — futuro)
**O que faz:** Visual regression testing integrado ao Storybook. Detecta mudancas visuais em PRs.
**URL:** https://chromatic.com
**Preco:** Free tier: 5.000 snapshots/mes

---

## 5. Utilidades Ja Instaladas (Manter)

| Pacote | Uso | Status |
|--------|-----|--------|
| `tailwind-merge` | Resolve conflitos de classes | OK |
| `clsx` | Classnames condicionais | OK |
| `class-variance-authority` | Variantes tipadas (CVA) | OK |
| `@radix-ui/*` | Primitives acessiveis (via shadcn) | OK |
| `next/image` | Otimizacao de imagens | OK |
| `framer-motion` / `motion` | Animacoes React | OK — expandir uso |

---

## 6. Setup Recomendado Imediato

### MCPs para instalar agora (Sprint 1)
```bash
# 1. Figma MCP — sync de design tokens
claude mcp add --transport http figma https://mcp.figma.com/mcp

# 2. Playwright — screenshots e testes visuais
claude mcp add playwright npx @playwright/mcp@latest

# 3. shadcn/ui — consulta de componentes
claude mcp add-json "shadcn" '{"command":"npx","args":["-y","mcp-remote","https://www.shadcn.io/api/mcp"]}'
```

### MCPs para instalar no Sprint 5
```bash
# 4. A11y — auditoria de acessibilidade
claude mcp add a11y npx a11ymcp
```

### Pacotes npm para instalar no Sprint 4
```bash
# Animacoes CSS-only
npm install tailwindcss-motion

# Progress bar global (opcional)
npm install next-nprogress-bar
```

---

## 7. Fontes e Referencias

- Figma MCP: https://help.figma.com/hc/en-us/articles/32132100833559
- Playwright MCP: https://www.pulsemcp.com/servers/microsoft-playwright-browser-automation
- shadcn MCP: https://ui.shadcn.com/docs/mcp
- shadcn CLI 3.0: https://ui.shadcn.com/docs/changelog/2025-08-cli-3-mcp
- A11y MCP: https://github.com/ronantakizawa/a11ymcp
- Storybook MCP: https://storybook.js.org/blog/storybook-mcp-sneak-peek/
- tailwindcss-motion: https://github.com/romboHQ/tailwindcss-motion
- Magic UI: https://magicui.design
- Aceternity UI: https://ui.aceternity.com
- Lighthouse CI: https://github.com/GoogleChrome/lighthouse-ci
- Motion: https://motion.dev
- 14 MCP Servers for UI/UX: https://snyk.io/articles/14-mcp-servers-for-ui-ux-engineers/
