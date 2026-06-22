# Handoff — Sidebar UX (001-sidebar-ux)

**Sessão**: 2026-06-22 (Polish / Phase 7) · **Status**: ✅ US1+US2+US3+US4 implementadas e commitadas na `main` · ✅ **Polish T014 (não-regressão) + T015 (gate de build) concluídos** · ⏳ **T016 (quickstart dev) e T017 (E2E prod) PENDENTES — só validam ao vivo** · **Próximo passo**: validação ao vivo (dev `next dev --webpack` + E2E autenticado em `polarisia.com.br` após deploy)

## O que foi feito nesta sessão (Polish — Phase 7)

Implementei a **Phase 7 (Polish)** seguindo `tasks.md` e **parei no checkpoint da Polish**. A fase de Polish é majoritariamente verificação — **nenhuma mudança de código foi necessária** (a não-regressão se confirmou e `layout.tsx` é NO-OP). Feature segue 100% frontend; coordinator (`runTeam`)/schema intocados.

- **T014 — não-regressão (verificação, sem mudança de código)** em [src/components/polaris/Sidebar.tsx](../../src/components/polaris/Sidebar.tsx):
  - **Links/rotas**: ✅ todos os itens de `menuSections` usam `Link href={item.href}`; conjunto, ordem e rotas idênticos ao legado (Overview, Teams/Conversas/Workflows/Campanhas, Capacidades, Threads, Crescimento, Distribuição, Sistema).
  - **Destaque de ativo**: ✅ lógica `isActive` (`/dashboard` exato; demais `pathname === href || startsWith(href + '/')`) aplica `bg-sidebar-accent text-white` no `<Link>` — funciona igual no rail e no expandido (independe do estado de expansão).
  - **Troca de workspace**: ✅ `DropdownMenu` + `handleWorkspaceChange` intactos (grava `sofia_active_workspace` no localStorage + `router.refresh()`).
  - **Links do rodapé**: ✅ Plano/Upgrade (`/dashboard/billing`), barras de uso, "Indique e Ganhe" (`/afiliados?ref=`), "Falar com o Fundador" (wa.me) — todos presentes.
  - **`hidden lg:flex`**: o `<aside>` agora é `hidden … lg:block` (era `lg:flex` no legado). **Não é regressão**: o único filho do `<aside>` é o painel `absolute`, então `block` vs `flex` é irrelevante — o comportamento desktop-only (`hidden` + `lg:`) é idêntico.
  - **`src/app/dashboard/layout.tsx` = NO-OP confirmado**: ✅ nenhuma mudança. Renderiza `<Sidebar />` como coluna flex; o footprint `w-64` quando `pinned` empurra o `<main>` naturalmente pelo flex. Stacking não exigiu ajuste no layout.
  - **Stacking z-index (revalidado)**: navbar `sticky z-50`; painel da sidebar `z-[60]` (acima da navbar — **desvio intencional da US1**, para o painel-overlay crescer sobre a faixa da navbar sem esconder o workspace selector do topo); dropdown de workspace `z-[70]` (acima do painel); `UpgradeModal` `z-[9999]` (acima de tudo). **Achado**: modais shadcn compartilhados (`Dialog`/`Sheet`/`CommandDialog`/command-palette) são `z-50` → ficam **abaixo** do painel `z-[60]`. Decisão: **NÃO corrigir nesta Polish** (ver Decisões §1).

- **T015 — gate de build** (rodado da pasta do subprojeto): `npm run db:generate` ✅ · `npm run typecheck` ✅ (`typecheck passed`) · `npm run build`: **✓ Compiled successfully in 39.9s + TypeScript OK + 319/319 páginas estáticas geradas** ✅. Única falha = passo final de cópia do `output: standalone` (`copyfile … source-map-support/register.js … errno -4094`) = **problema conhecido do OneDrive** (MEMORY `onedrive_node_modules_corruption` / gotcha `sofia_next_db_push_runner_fails`), **ambiental, não-código**. Os 62 warnings `Unknown at rule: @property` são **pré-existentes** (lib de motion). Gate real = CI/EasyPanel (constituição V).

## Decisões / desvios em relação ao plano

1. **Stacking modal vs painel (`z-[60]`) — NÃO corrigido nesta Polish (deferido, decisão do usuário).** O painel `z-[60]` fica acima dos modais shadcn `z-50`. **Por que deferi:**
   - **Severidade baixa/cosmética**: ao abrir um modal, o foco vai para o portal do modal (fora do `<aside>`), então `focus-within` **não** expande a sidebar → ela fica em rail (`w-20`). O conteúdo do modal é centralizado (não é coberto); só a **faixa esquerda do backdrop escurecido** (80px no rail, ou 256px se `pinned`) mostra a sidebar clara em vez do dim. Não bloqueia função.
   - **Fix "correto" tem blast radius app-wide e foge do escopo de arquivos da spec.** O conflito é estrutural: navbar `z-50` **e** modais `z-50` são o mesmo nível. Para ter `navbar < painel < modais` precisaria **ou** baixar a navbar app-wide (`z-40`), **ou** subir os primitivos shadcn (`Dialog`/`Sheet`) acima de `z-[70]` — o que **quebraria dropdowns/selects/tooltips aninhados dentro de modais** (shadcn assume um "mundo plano" `z-50` + ordem de portal no DOM). A spec lista só `Sidebar.tsx`/`globals.css`/`layout.tsx`.
   - **Histórico**: o `<aside>` legado (pré-US1) **não tinha z-index** → ficava no fluxo, sempre abaixo dos modais. O `z-[60]` nasceu na US1 (necessário p/ o painel passar acima da navbar). `UpgradeModal` (`z-[9999]`) já está acima e é o padrão do projeto quando um modal precisa ficar garantidamente no topo.
   - **Opções para a próxima sessão** (se o usuário decidir corrigir): (a) baixar navbar → `z-40` (app-wide, simples mas amplo); (b) subir `Dialog`/`Sheet` overlay+content → `z-[80]` **e** auditar dropdowns/tooltips usados dentro de modais; (c) reordenar o DOM no `layout.tsx` (sidebar depois da coluna direita + `order` CSS) p/ o painel `z-50` ganhar da navbar por ordem de DOM e os modais (ainda depois) ganharem do painel. **Recomendado: confirmar com o usuário antes** (mudança de UI/sistema → regra global #2).
2. **Polish sem mudança de código.** T014 é verificação; tudo passou. Marquei os checkboxes em `tasks.md` (T001–T015 ✅; T016/T017 com nota de pendência ao vivo). Commit desta sessão = só docs (`tasks.md` + este `handoff.md`).

## Commit desta sessão

- **Commit focado (docs)**: `specs/001-sidebar-ux/tasks.md` (checkboxes T001–T015 marcados) + este `specs/001-sidebar-ux/handoff.md`. Pushed direto na **`main`**.
- **FORA do commit (de propósito, idem sessões anteriores)**: `.specify/`, `.claude/skills/`, mudanças no `CLAUDE.md`, notas de sessão em `docs/**`, `public/logos/kit/**` e as deleções `public/logo*.svg` (scaffolding spec-kit / pré-existentes de outra sessão). Tratar separadamente se quiser versioná-los.

## Próximos passos (em ordem) — só validação ao vivo resta

1. **T016 — quickstart 1–4 em dev**: `next dev --webpack` (Turbopack quebra no Windows+OneDrive) → login → `/dashboard` (viewport ≥ `lg`). Rodar os 4 cenários de [quickstart.md](./quickstart.md):
   - **US1 (hover)**: rail → hover expande sem mover o `<main>` (conferir bounding box em DevTools → Elements); tooltips no rail; rota ativa destacada.
   - **US2 (scrollbar)**: reduzir altura até o menu transbordar → indicador fino aparece no hover/scroll, some fora de uso, não desloca itens.
   - **US3 (fixar/persistência)**: fixar → trava + empurra `<main>`; `localStorage["sofia_sidebar_pinned"]="1"`; reload mantém; soltar → rail + `"0"`.
   - **US4 (a11y)**: `Tab`/`Shift+Tab` do `<main>` para dentro da sidebar → expande por `focus-within` + ring `:focus-visible`; DevTools → Rendering → "Emulate prefers-reduced-motion: reduce" → sem animação de largura; abrir seletor de workspace + tirar o mouse → continua expandida enquanto o dropdown está aberto (`data-menu-open="true"` no `<aside>`), recolhe ao fechar.
   - **Não-regressão (T014 ao vivo)**: confirmar que abrir um modal/Dialog do dashboard **não** fica visualmente quebrado pela sidebar (ver Decisões §1 — esperado: faixa esquerda do backdrop mostrando a sidebar; decidir se incomoda).
2. **T017 — E2E autenticado em produção** (`polarisia.com.br`) após deploy — **gate da constituição (V)**. Validar US1–US4 ao vivo (local nesta máquina Win+OneDrive é só indicativo).

## Pendências / fora do escopo

- **T016/T017 (validação ao vivo)** dependem de dev server/browser e de deploy+login — não dá para fechar autonomamente nesta máquina.
- **E2E real de US1–US4** (todas as sessões) ainda pendente ao vivo: hover/overlay sem layout shift, transbordo do scrollbar, persistência `localStorage` + empurrão do `<main>`, foco de teclado, emulação reduced-motion, portal do dropdown.
- **Decisão de stacking (modal vs `z-[60]`)** — ver Decisões §1; aguarda escolha do usuário se for corrigir.
- Branch: trabalho indo direto na `main`.

## Gotchas para a próxima sessão

- **OneDrive errno -4094 no `next build`**: o build COMPILA e gera as 319 páginas; só a cópia do `standalone` falha local. Não é regressão — validar de verdade no EasyPanel.
- **PowerShell perde cwd** entre chamadas no harness → `Set-Location` para `Imob\sofia-next` em cada comando (working dir default = raiz `ROI Labs`). `npm run` falha com "Missing script" se rodar da raiz.
- **Warning "multiple lockfiles"** no build: Next detecta `C:\Users\jeanz\package-lock.json` além do local — inofensivo (só infere workspace root); o build usa o correto.
- **Hook agent-context QUEBRADO** neste ambiente (ConvertFrom-Yaml ausente + path com espaços). Atualizações do bloco SPECKIT no `CLAUDE.md` são manuais.
- Coordinator (`runTeam`) e schema: **intocados** — feature 100% frontend (sem rota/migração).
- Sidebar é `hidden lg:block` (desktop-only). O contrato fala "`hidden lg:flex`" — é só descrição de "desktop-only"; `lg:block` é equivalente aqui (filho único `absolute`).
- **Z-index consolidado**: main `auto` < navbar `z-50` < painel sidebar `z-[60]` < dropdown workspace `z-[70]` < `UpgradeModal` `z-[9999]`. Modais shadcn compartilhados (`Dialog`/`Sheet`/command-palette) = `z-50` (abaixo do painel — ver Decisões §1).
- **Esquema de expansão (consolidado, US1–US4):**
  - **CSS-driven (overlay, não empurra)**: `group-hover/sb:` (mouse) + `group-focus-within/sb:` (teclado).
  - **React-driven**: `pinned` (persistido → footprint in-flow `w-64`, empurra o `<main>`) e `menuOpen` (workspace aberto → overlay, NÃO empurra). Somam em `forceExpanded` **só para reveals de visibilidade**; footprint/overlay continuam distinguindo `pinned` vs `menuOpen`.
  - **Tailwind v4**: classes precisam ser literais no source. `EXPAND.{block,flex,inline}` carregam `group-hover/sb:X group-focus-within/sb:X` literais; reveals React (`forceExpanded && 'block'`) e overlays (`'w-64 shadow-2xl shadow-black/50'`) também literais — sem risco de scanner.
  - Ao mexer aqui: novo gatilho de "expandir" overlay entra como variante CSS (hover/foco) **ou** soma a `forceExpanded` (React) — nunca tocar `pinned && 'w-64'` do `<aside>` sem querer empurrar o conteúdo.
