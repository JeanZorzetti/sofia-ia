# Handoff — Sidebar UX (001-sidebar-ux)

**Sessão**: 2026-06-22 (impl US4) · **Status**: ✅ US1 (rail+hover) + ✅ US2 (scrollbar) + ✅ US3 (fixar+persistência) + ✅ US4 (a11y/robustez) implementadas e commitadas na `main` · **Próximo passo**: Polish (T014–T017) — não-regressão, quickstart 1–4 em dev e E2E autenticado em prod

## O que foi feito nesta sessão

Implementei a **User Story 4 (robustez & acessibilidade)** seguindo `tasks.md` (T011→T013) e **parei no checkpoint da US4**. Polish (T014–T017) **NÃO** foi tocado. Feature 100% frontend — sem rota/migração; coordinator (`runTeam`) intocado.

- **T011 [US4] — expansão por foco de teclado (`focus-within`)**: em [src/components/polaris/Sidebar.tsx](../../src/components/polaris/Sidebar.tsx). Adicionei a variante `group-focus-within/sb:` **ao lado de cada** `group-hover/sb:` existente, espelhando o gatilho de hover (FR-013). Pontos tocados: o objeto `EXPAND` (`block`/`flex`/`inline` agora têm `group-hover/sb:X group-focus-within/sb:X`), a largura do painel (`group-focus-within/sb:w-64`), a sombra do overlay (`group-focus-within/sb:shadow-2xl …`), o esconder do divisor (`group-focus-within/sb:hidden`) e o `justify-start px-3` dos links. Quando qualquer item interno recebe foco de teclado, o painel cresce em overlay — **sem estado React** (puro CSS, mantém o esquema da fundação). **CSS de suporte já existia**: o `:focus-visible` global (`globals.css:154`, ring WCAG 2.4.7) e o `.sidebar-scroll:focus-within` (US2) cobrem a afordância de teclado — nada novo de CSS foi necessário para o T011 além das variantes Tailwind.
- **T012 [P] [US4] — `prefers-reduced-motion`**: em [src/app/globals.css](../../src/app/globals.css), após o bloco `.sidebar-scroll`. Guard `@media (prefers-reduced-motion: reduce)` **escopado a `.sidebar-root`** (classe nova no `<aside>`) que zera `transition-duration`/`animation-duration` (0.01ms) de `.sidebar-root` e descendentes. Anula a animação de largura (grow rail↔expandida), o fade dos rótulos e a transição de cor do scrollbar — **estado final idêntico**, só sem movimento (FR-014). Escopado para não afetar o resto da UI.
- **T013 [US4] — manter expandida com o menu de workspace aberto**: em `Sidebar.tsx`. Novo estado `const [menuOpen, setMenuOpen] = useState(false)` + `<DropdownMenu onOpenChange={setMenuOpen}>`. O dropdown é **portaled** (foco sai do `<aside>`), então `focus-within` **não** o cobre — daí o estado React. Derivei `const forceExpanded = pinned || menuOpen` e **substituí todos os reveals `pinned && 'X'` por `forceExpanded && 'X'`** (rótulos, badges, seletor, eyebrow, divisor, rodapé). O painel ganha overlay (`w-64` + sombra) quando `!pinned && menuOpen` — **sem virar in-flow** (só `pinned` empurra o `<main>`; menu aberto é overlay, conforme contrato §2). Também setei `data-menu-open={menuOpen}` no `<aside>` (paridade com `data-pinned`, hook de debug/CSS).

### Gate de build (T015 parcial) — resultado
`npm run db:generate` ✅ · `npm run typecheck` ✅ (`typecheck passed`) · `npm run build`: **✓ Compiled successfully in 41s + TypeScript OK + 319/319 páginas estáticas geradas** ✅. Única falha = passo final de cópia do `output: standalone` (`copyfile … source-map-support … errno -4094`) = **problema conhecido do OneDrive** (MEMORY `onedrive_node_modules_corruption`), **ambiental, não-código**. Os 62 warnings `Unknown at rule: @property` são **pré-existentes** (lib de motion). Gate real = CI/EasyPanel (constituição V).

## Decisões / desvios em relação ao plano

1. **`focus-within` via Tailwind, não via CSS novo em `globals.css`.** O T011 previa "+ CSS de suporte em `globals.css`", mas o ring de foco de teclado **já existe** globalmente (`:focus-visible`, `globals.css:154`) e o `.sidebar-scroll:focus-within` já veio da US2. A expansão em si é idiomática como variante `group-focus-within/sb:` literal (mesmo padrão do `group-hover/sb:` da fundação). Adicionar CSS redundante seria cargo-cult — evitei.
2. **`menuOpen` por estado React, não por `focus-within`.** O `DropdownMenuContent` usa portal: ao abrir, o foco vai para fora do `<aside>`, então `:focus-within` não dispara. Por isso o "menu aberto" (FR-015) precisa de estado (`onOpenChange`), seguindo o mesmo padrão React do `pinned` já existente.
3. **`forceExpanded = pinned || menuOpen` substituiu `pinned && …` nos reveals.** Para não espalhar `(pinned || menuOpen)` repetido, derivei um único booleano. **Cuidado preservado**: footprint do `<aside>` (`pinned && 'w-64'`) e overlay do painel (`!pinned && menuOpen && …`) continuam distinguindo `pinned` (in-flow, empurra) de `menuOpen` (overlay, não empurra). Só os reveals de visibilidade pura migraram para `forceExpanded`.
4. **Classe `.sidebar-root` no `<aside>`** apenas para dar ao `globals.css` um seletor estável (evita escapar `.group\/sb` à mão). Não muda layout.

## Commit desta sessão

- **Commit focado**: só `src/components/polaris/Sidebar.tsx` + `src/app/globals.css` + este `specs/001-sidebar-ux/handoff.md`. Pushed direto na **`main`** (US1=`2f6977b`, US2=`e70223b`, US3 já estavam lá).
- **FORA do commit (de propósito, idem sessões anteriores)**: `.specify/`, `.claude/skills/`, mudanças no `CLAUDE.md`, notas de sessão em `docs/**`, `public/logos/kit/**` e as deleções `public/logo*.svg` (scaffolding spec-kit / pré-existentes de outra sessão). Tratar separadamente se quiser versioná-los.

## Próximos passos (em ordem) — Polish (Phase 7)

1. **T014 — não-regressão** (em `Sidebar.tsx`): conferir links/rotas, destaque de ativo, troca de workspace, links do rodapé, `hidden lg:flex`. **Revalidar stacking do overlay** (z-`[60]`/`z-[70]`) vs navbar (sticky z-50) e modais (dado o desvio z-index da US1). Confirmar `src/app/dashboard/layout.tsx` como NO-OP.
2. **T016 — quickstart 1–4 em dev**: `next dev --webpack` (Turbopack quebra no Windows+OneDrive) → `/dashboard`. **US4 a validar ao vivo**:
   - **Teclado (T011)**: a partir do `<main>`, `Shift+Tab` (ou Tab) até entrar na sidebar → ela expande por `focus-within`; navegar só por teclado alcança todos os itens; o ring de foco aparece (`:focus-visible`).
   - **Reduced-motion (T012)**: DevTools → Rendering → "Emulate prefers-reduced-motion: reduce" → hover/fixar/menu **sem animação** de largura; estado final correto.
   - **Menu aberto (T013)**: hover para expandir → abrir o seletor de workspace → **mover o mouse para fora** da sidebar: continua expandida enquanto o dropdown está aberto; fechar o dropdown → recolhe (se não estiver fixada/hover/foco). Conferir `data-menu-open="true"` no `<aside>` via DevTools.
3. **T017 — E2E autenticado em produção** (`polarisia.com.br`) após deploy — **gate da constituição (V)**. Validar US1–US4 ao vivo (ambiente local é só indicativo aqui).

## Pendências / fora do escopo

- **E2E real da US4** depende do browser (dev ou prod): foco de teclado, emulação de reduced-motion e o portal do dropdown só se validam ao vivo.
- **E2E real de US1/US2/US3** (sessões anteriores) ainda pendente de validação ao vivo (hover/overlay, transbordo do scrollbar, persistência `localStorage` + empurrão do `<main>`).
- Branch: trabalho indo direto na `main` (US1–US4 já lá).

## Gotchas para a próxima sessão

- **OneDrive errno -4094 no `next build`**: o build COMPILA e gera as 319 páginas; só a cópia do `standalone` falha local. Não é regressão — validar de verdade no EasyPanel.
- **PowerShell perde cwd** entre chamadas no harness → `Set-Location` para `Imob\sofia-next` é necessário em cada comando (working dir default = raiz `ROI Labs`, não o subprojeto). `npm run` falha com "Missing script" se rodar da raiz.
- **Hook agent-context QUEBRADO** neste ambiente (ConvertFrom-Yaml ausente + path com espaços). Atualizações do bloco SPECKIT no `CLAUDE.md` são manuais.
- Coordinator (`runTeam`) e schema: **intocados** — feature 100% frontend (sem rota/migração).
- Sidebar é `hidden lg:block` (desktop-only).
- **Tailwind v4: classes precisam ser literais no source.** `EXPAND.{block,flex,inline}` agora carregam `group-hover/sb:X group-focus-within/sb:X` literais; os reveals React (`forceExpanded && 'block'`) e os overlays (`'w-64 shadow-2xl shadow-black/50'`) também são literais — sem risco de scanner.
- **Esquema de expansão (consolidado após US4):**
  - **CSS-driven (overlay, não empurra)**: `group-hover/sb:` (mouse) + `group-focus-within/sb:` (teclado).
  - **React-driven**: `pinned` (preferência persistida → footprint in-flow `w-64`, empurra o `<main>`) e `menuOpen` (workspace aberto → overlay, NÃO empurra). Os dois somam em `forceExpanded` **só para reveals de visibilidade**; footprint/overlay continuam distinguindo `pinned` vs `menuOpen`.
  - Ao mexer aqui: qualquer novo gatilho de "expandir" que seja overlay deve entrar como variante CSS (se baseado em hover/foco) **ou** somar a `forceExpanded` (se React) — nunca tocar `pinned && 'w-64'` do `<aside>` sem querer empurrar o conteúdo.
