# Phase 0 — Research: Sidebar Colapsável por Hover + Barra de Rolagem

Decisões técnicas que resolvem os pontos em aberto do Technical Context. Cada item: Decisão / Justificativa / Alternativas consideradas.

## R1 — Modelo de expansão: overlay vs empurrar conteúdo

- **Decisão**: Rail com footprint fixo no fluxo flex; painel interno **absoluto** que cresce e **sobrepõe** o conteúdo no hover (sem reflow). No modo **fixado**, o footprint do `<aside>` passa a `w-64` (in-flow, empurra o conteúdo, idêntico ao expandido atual).
- **Justificativa**: Atende FR-003/SC-003 (zero layout shift no hover). É o padrão moderno (VS Code, Linear, Vercel) e foi a opção escolhida pelo usuário no brainstorming.
- **Alternativas**: (a) Hover empurrando conteúdo — rejeitada por causar layout shift a cada hover; (b) Hover puro sem fixar — rejeitada por remover o controle de quem prefere a sidebar sempre aberta.

## R2 — Quem dirige a expansão: CSS vs estado React

- **Decisão**: Largura/visibilidade dirigidas por **CSS** via `group` + `group-hover` + `focus-within` + atributos `data-pinned` / `data-menu-open` no `<aside>`. React mantém apenas `pinned` (persistido) e o flag de menu aberto. O conteúdo (rótulos, footer, workspace selector) é **sempre renderizado no DOM** e mostrado/ocultado por CSS conforme `expanded` — substituindo o atual `{!collapsed && ...}`.
- **Justificativa**: Resposta instantânea (sem re-render), expansão por teclado de graça (`focus-within`, FR-013), e acessibilidade (conteúdo no DOM). Mantém o componente simples.
- **Alternativas**: (a) Estado `hovering` em React com `onMouseEnter/Leave` — rejeitado como driver principal por re-render e por não cobrir `focus-within` nativamente; usado apenas onde JS é inevitável (guarda de menu aberto). (b) Biblioteca de sidebar (shadcn `sidebar`) — rejeitada para não reescrever o componente existente nem introduzir dependência; reaproveitamos a estrutura atual.

## R3 — Persistência da preferência (pinned) e hidratação SSR

- **Decisão**: Persistir em `localStorage` na chave `sofia_sidebar_pinned` (`'1'`/`'0'`), no mesmo padrão de `sofia_active_workspace`. Ler no client após mount (`useEffect`) e aplicar via estado. Default = não-fixado (rail), que coincide com o render do servidor → sem mismatch de hidratação.
- **Justificativa**: Atende FR-009/SC-005 sem backend. Como o default (rail) é igual no servidor e no cliente, usuários não-fixados não veem flash; usuários fixados veem o rail por um instante antes de expandir (aceitável e discreto).
- **Alternativas**: (a) Cookie lido no servidor para evitar qualquer flash — rejeitado por custo/complexidade desproporcional a um detalhe de UI; (b) `useState` com inicializador lendo `localStorage` — rejeitado por causar hydration mismatch (servidor não tem `window`).

## R4 — Barra de rolagem fina auto-hide (overlay) cross-browser

- **Decisão**: Nova utility `.sidebar-scroll` substitui `scrollbar-none` no `<nav>`:
  - **WebKit/Blink**: `::-webkit-scrollbar { width: 6px }`, thumb `background: transparent` em repouso, recebendo cor (reuso das cores de `.custom-scrollbar`: `hsl(var(--border))` → `hsl(var(--foreground-tertiary))` no hover) quando o `<nav>` está em `:hover`/`:focus-within`.
  - **Firefox**: `scrollbar-width: thin; scrollbar-color: transparent transparent;` passando a `var(--border) transparent` no `:hover`/`:focus-within`.
  - Sobreposto, sem reservar largura (sem `scrollbar-gutter`), atendendo FR-011 (sem layout shift dos itens).
- **Justificativa**: "Aparece ao interagir, some fora de uso" é entregue aproximando auto-hide por `:hover`/`:focus-within` puro CSS, sem JS. Reusa cores existentes → consistência visual.
- **Alternativas**: (a) Auto-hide por inatividade real (timer) — exige JS de scroll; rejeitado por complexidade vs ganho marginal; (b) `scrollbar-none` mantido + fade nas bordas — era a Opção C, rejeitada pelo usuário; (c) Sempre visível — rejeitada por ser menos limpa.

## R5 — Edge case: menu suspenso aberto não deve recolher a sidebar

- **Decisão**: O `DropdownMenu` (workspace) expõe `onOpenChange`; ao abrir, setar `data-menu-open` no `<aside>` (e/ou estado React) que força `expanded` enquanto o menu estiver aberto, independentemente do hover. Opcional: pequeno `transition-delay` no recolhimento para suavizar saídas rápidas.
- **Justificativa**: Atende FR-015 — o popover é ancorado na sidebar; se ela recolhesse ao mover o mouse para o menu, o popover "fugiria".
- **Alternativas**: Apenas `transition-delay` sem guarda de estado — insuficiente para menus que exigem leitura/scroll demorados.

## R6 — Movimento reduzido e dispositivos sem hover

- **Decisão**: Envolver as transições de largura/opacidade em `@media (prefers-reduced-motion: no-preference)` (ou anular sob `reduce`), atendendo FR-014. Condicionar a expansão por hover a `@media (hover: hover)`; onde não há hover, o estado fixado/recolhido prevalece (FR edge case). A sidebar já é `lg+` only.
- **Justificativa**: Acessibilidade (SC-007 e conforto visual) com custo mínimo (media queries).
- **Alternativas**: Ignorar reduced-motion — rejeitado por acessibilidade.

## Resumo

Nenhum NEEDS CLARIFICATION remanescente. Stack confirmada (React/Next 16 + Tailwind/shadcn + CSS), sem novas dependências, sem backend, sem schema. Pronto para Fase 1.
