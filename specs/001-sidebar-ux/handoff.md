# Handoff — Sidebar UX (001-sidebar-ux)

**Sessão**: 2026-06-22 (impl US2) · **Status**: ✅ US1 (rail+hover) + ✅ US2 (scrollbar) implementadas e commitadas na `main` · **Próximo passo**: validar US1+US2 em dev/prod, depois US3 (T008–T010)

## O que foi feito nesta sessão

Implementei a **User Story 2 (barra de rolagem fina auto-hide)** seguindo `tasks.md` (T006→T007) e **parei no checkpoint da US2**. US3/US4 **NÃO** foram tocadas. US2 é independente (só `globals.css` + 1 troca de className), então não dependeu da Foundational.

- **T006 [US2]**: criei a utility `.sidebar-scroll` em [src/app/globals.css](../../src/app/globals.css) (logo após `.custom-scrollbar`). Comportamento conforme o contrato (`contracts/sidebar-ui-contract.md` §4):
  - **WebKit**: `::-webkit-scrollbar { width: 6px }`, track **transparente** (overlay, sem gutter visível), thumb **transparente em repouso** → `hsl(var(--border))` em `:hover`/`:focus-within` do `<nav>` → `hsl(var(--foreground-tertiary))` ao passar o mouse **sobre o próprio thumb** (mesma escala do `.custom-scrollbar` legado).
  - **Firefox**: `scrollbar-width: thin` + `scrollbar-color: transparent transparent` em repouso → `hsl(var(--border)) transparent` em `:hover`/`:focus-within`.
- **T007 [US2]**: troquei `scrollbar-none` → `sidebar-scroll` no `<nav>` (área rolável do menu) em [src/components/polaris/Sidebar.tsx:292](../../src/components/polaris/Sidebar.tsx#L292). Nenhuma outra mudança no componente.

### Gate de build (T015) — resultado
`npm run db:generate` ✅ · `npm run typecheck` ✅ (`typecheck passed`) · `npm run build`: **✓ Compiled successfully in 37.1s + TypeScript OK + 319/319 páginas estáticas geradas** ✅. A única falha é o passo final de cópia do `output: standalone` (`copyfile … source-map-support/register.js … errno -4094`) = **problema conhecido do OneDrive** (MEMORY `onedrive_node_modules_corruption`), **ambiental, não-código**. Os 62 warnings `Unknown at rule: @property` no CSS são **pré-existentes** (lib de motion), não vêm da minha utility. Gate real = CI/EasyPanel (constituição V).

## Decisões / desvios em relação ao plano

1. **Overlay sem reservar largura — interpretação pragmática.** `overflow: overlay` é não-padrão/removido do Chrome, então "overlay" foi obtido com **track transparente + thumb transparente em repouso**: quando NÃO há transbordo, o browser não desenha scrollbar nenhuma (FR-012 ✓); quando HÁ transbordo, o WebKit reserva 6px **constantes** (track invisível) e só a **cor do thumb** muda no hover/focus — logo o indicador "aparece/some" **sem deslocar itens horizontalmente** (FR-011 ✓, o invariante testável do quickstart cenário 2 passo 3). 6px é negligível e consistente entre rail e expandido.
2. **Sem `transition` no thumb.** `::-webkit-scrollbar-thumb` não anima `background` de forma confiável entre browsers (e o Chrome ignora); mantive sem transição, igual ao `.custom-scrollbar` legado, pra não prometer animação que não acontece. O auto-hide é por troca de cor em `:hover`/`:focus-within`. (Reduced-motion = T012/US4, fora deste escopo.)
3. **Classes literais (Tailwind v4).** `sidebar-scroll` é classe CSS custom em `globals.css` (não utility Tailwind dinâmica) — sem risco de scanner não detectar.

## Commit desta sessão

- **Commit focado**: incluí só `src/app/globals.css` + `src/components/polaris/Sidebar.tsx` + este `specs/001-sidebar-ux/handoff.md`. Pushed direto na **`main`** (US1 já estava na main, commit `2f6977b`).
- **FORA do commit (de propósito, idem sessão anterior)**: `.specify/`, `.claude/skills/`, bloco SPECKIT do `CLAUDE.md`, notas de sessão em `docs/**`, `public/logos/kit/**` e as deleções `public/logo*.svg` (scaffolding spec-kit / pré-existentes de outra sessão). Tratar separadamente se quiser versioná-los.

## Próximos passos (em ordem)

1. **Validar US1+US2** (quickstart cenários 1 e 2): `next dev --webpack` (Turbopack quebra no Windows+OneDrive) → `/dashboard`. **US2**: reduzir altura da janela até o menu transbordar; conferir indicador fino discreto aparecendo no hover/scroll e sumindo fora de uso; **itens NÃO deslocam** quando o indicador surge; janela alta → sem indicador. Testar no rail E expandido.
2. **US3 — Fixar + persistência (T008–T010)**: ADICIONAR controle de pin (alterna `pinned`, `aria-label`, tooltip "Fixar/Soltar menu"), persistir em `localStorage["sofia_sidebar_pinned"]` (ler após mount → sem hydration mismatch), ligar footprint in-flow `w-64` (empurra `<main>`). **A fiação `pinned` no componente JÁ EXISTE** (só trocar `useState(false)` por `[pinned, setPinned]` + plugar o botão + `useEffect` de persistência).
3. **US4 — a11y/robustez (T011–T013)**: `focus-within` (teclado), guarda `prefers-reduced-motion` (T012, `globals.css` — englobaria também a sidebar e, se quiser, a transição de cor do scroll), manter expandida com workspace dropdown aberto (`onOpenChange` → `data-menu-open`). Reavaliar: (a) gate explícito `@media (hover:hover)` se o do Tailwind v4 não bastar; (b) suprimir tooltip de item quando expandido.
4. **Polish (T014–T017)**: não-regressão; **revalidar stacking do overlay vs navbar/modais** (T014, dado o desvio z-index da US1); rodar quickstart 1–4 em dev; **E2E autenticado em prod** `polarisia.com.br` (gate constituição V).

## Pendências / fora do escopo

- **E2E real da US2** depende de viewport com transbordo de menu — só dá pra validar de verdade no browser (dev ou prod). Local nesta máquina (Win+OneDrive) é indicativo.
- Branch: trabalho indo direto na `main` (US1 e US2 já lá).

## Gotchas para a próxima sessão

- **OneDrive errno -4094 no `next build`**: o build COMPILA e gera as 319 páginas; só a cópia do `standalone` falha local. Não é regressão — validar de verdade no EasyPanel.
- **PowerShell perde cwd** entre chamadas → o `Set-Location` para `Imob\sofia-next` é necessário em cada comando (a working dir default do harness é a raiz `ROI Labs`, não o subprojeto). `npm run` falha com "Missing script" se rodar da raiz.
- **Hook agent-context QUEBRADO** neste ambiente (ConvertFrom-Yaml ausente + path com espaços). Atualizações do bloco SPECKIT no `CLAUDE.md` são manuais.
- Coordinator (`runTeam`) e schema: **intocados** — feature 100% frontend (sem rota/migração).
- Sidebar é `hidden lg:block` (desktop-only); hover sob `@media (hover: hover)`.
- Tailwind v4: classes precisam ser **literais** no source. `.sidebar-scroll`/`.custom-scrollbar` são CSS custom em `globals.css`, fora do scanner — sem esse risco.
