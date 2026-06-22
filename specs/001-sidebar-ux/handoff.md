# Handoff — Sidebar UX (001-sidebar-ux)

**Sessão**: 2026-06-22 (impl US3) · **Status**: ✅ US1 (rail+hover) + ✅ US2 (scrollbar) + ✅ US3 (fixar+persistência) implementadas e commitadas na `main` · **Próximo passo**: validar US1+US2+US3 em dev/prod, depois US4 (T011–T013)

## O que foi feito nesta sessão

Implementei a **User Story 3 (fixar a sidebar aberta + persistência)** seguindo `tasks.md` (T008→T010) e **parei no checkpoint da US3**. US4 e Polish (T011–T017) **NÃO** foram tocados.

- **T008 [US3]**: adicionei o **controle de fixar/soltar** em [src/components/polaris/Sidebar.tsx](../../src/components/polaris/Sidebar.tsx). Não havia "toggle Chevron" no componente (a fundação T002/T003 já tinha removido o boolean `collapsed`), então o controle foi **adicionado** na linha do eyebrow "Menu": a `<div>` virou um flex `justify-between` ("Menu" à esquerda, botão à direita). O botão alterna `pinned`, troca ícone `Pin`↔`PinOff`, com `aria-label`/`title`/tooltip **"Fixar menu"** (não-fixado) / **"Soltar menu"** (fixado) + `aria-pressed`. Visível só quando expandida (`EXPAND.flex` + `pinned && 'flex'`) — em rail puro fica oculto; para fixar, hover expande → botão aparece → clique.
- **T009 [US3]**: persistência. Troquei `useState(false)` (sem setter) por `[pinned, setPinned]`; adicionei `useEffect` que **lê após mount** `localStorage["sofia_sidebar_pinned"]` (`'1'`=fixada, `'0'`/ausente=rail) → default `false` no SSR/primeiro paint, **sem hydration mismatch** (data-model: "leitura após mount"); e `togglePinned()` que **escreve** `'1'`/`'0'` ao alternar. Só `pinned` é persistido — hover/foco/menu seguem transitórios (invariante do data-model).
- **T010 [US3]**: **já satisfeito pela fundação** (T002/T003). O `<aside>` já tinha footprint `w-20` + `pinned && 'w-64'` (in-flow, empurra `<main>`) e o painel interno absoluto já crescia `group-hover/sb:w-64` quando `!pinned` (overlay com sombra) vs `w-64` fixo quando `pinned`. Com `pinned` agora realmente alternável (T008/T009), esse comportamento ficou ativo. Nenhuma mudança nova de footprint foi necessária — só conferi a fiação.

### Gate de build (T015) — resultado
`npm run db:generate` ✅ · `npm run typecheck` ✅ (`typecheck passed`) · `npm run build`: **✓ Compiled successfully in 42s + TypeScript OK + 319/319 páginas estáticas geradas** ✅. Única falha = passo final de cópia do `output: standalone` (`copyfile … source-map-support … errno -4094`) = **problema conhecido do OneDrive** (MEMORY `onedrive_node_modules_corruption`), **ambiental, não-código**. Os 62 warnings `Unknown at rule: @property` são **pré-existentes** (lib de motion). Gate real = CI/EasyPanel (constituição V).

## Decisões / desvios em relação ao plano

1. **"Substituir o toggle Chevron" → na prática foi ADICIONAR.** O contrato (§3) e T008 falam em "substituir o toggle Chevron atual", mas esse toggle **não existia mais** no componente (removido na fundação). Adicionei o controle do zero. O único `ChevronDown` no arquivo é o do seletor de workspace (parte do dropdown) — **intocado**.
2. **Posição do controle: na linha do eyebrow "Menu".** Local discreto, já visível só quando expandida, sem competir com o seletor de workspace. Ícone `Pin`/`PinOff` (lucide) comunica o estado-alvo da ação (Pin=vai fixar; PinOff=vai soltar). Alternativa considerada (botão no topo absoluto / perto do workspace) descartada por poluição visual.
3. **Sem flicker de fixação no carregamento.** Como `pinned` inicia `false` e só vira `true` após o `useEffect` pós-mount, um usuário com preferência "fixada" verá um instante de rail antes de expandir. É o trade-off aceito para **evitar hydration mismatch** (decisão do data-model). Não há como ler `localStorage` no servidor; alternativa (cookie + SSR) seria fora de escopo desta feature client-side.

## Commit desta sessão

- **Commit focado**: só `src/components/polaris/Sidebar.tsx` + este `specs/001-sidebar-ux/handoff.md`. Pushed direto na **`main`** (US1=`2f6977b`, US2=`e70223b` já estavam lá).
- **FORA do commit (de propósito, idem sessões anteriores)**: `.specify/`, `.claude/skills/`, mudanças no `CLAUDE.md`, notas de sessão em `docs/**`, `public/logos/kit/**` e as deleções `public/logo*.svg` (scaffolding spec-kit / pré-existentes de outra sessão). Tratar separadamente se quiser versioná-los.

## Próximos passos (em ordem)

1. **Validar US1+US2+US3** (quickstart cenários 1–3): `next dev --webpack` (Turbopack quebra no Windows+OneDrive) → `/dashboard`. **US3**: hover para expandir → clicar no botão de fixar (ícone Pin, à direita do "Menu") → sidebar trava aberta **e empurra o `<main>`** (footprint vira w-64, sem overlay); recarregar a página → continua fixada; clicar soltar (ícone PinOff) → volta ao rail com hover; recarregar → continua solta. Conferir `localStorage["sofia_sidebar_pinned"]` = `'1'`/`'0'` no DevTools.
2. **US4 — a11y/robustez (T011–T013)**: `focus-within` (expandir por teclado, +CSS em `globals.css`), guarda `prefers-reduced-motion` (T012, `globals.css` — englobaria sidebar e a transição de cor do scroll), manter expandida com o `DropdownMenu` de workspace aberto (`onOpenChange` → estado/`data-menu-open`). Reavaliar: (a) gate explícito `@media (hover:hover)` se o do Tailwind v4 não bastar; (b) suprimir tooltip de item quando expandido.
3. **Polish (T014–T017)**: não-regressão; **revalidar stacking do overlay vs navbar/modais** (T014, dado o desvio z-index da US1); rodar quickstart 1–4 em dev; **E2E autenticado em prod** `polarisia.com.br` (gate constituição V).

## Pendências / fora do escopo

- **E2E real da US3** depende do browser (dev ou prod): persistência via `localStorage` e o empurrão do `<main>` só se validam ao vivo. Local nesta máquina (Win+OneDrive) é indicativo.
- **E2E real da US2** depende de viewport com transbordo de menu — só no browser.
- Branch: trabalho indo direto na `main` (US1, US2 e US3 já lá).

## Gotchas para a próxima sessão

- **OneDrive errno -4094 no `next build`**: o build COMPILA e gera as 319 páginas; só a cópia do `standalone` falha local. Não é regressão — validar de verdade no EasyPanel.
- **PowerShell perde cwd** entre chamadas → `Set-Location` para `Imob\sofia-next` é necessário em cada comando (working dir default do harness é a raiz `ROI Labs`, não o subprojeto). `npm run` falha com "Missing script" se rodar da raiz.
- **Hook agent-context QUEBRADO** neste ambiente (ConvertFrom-Yaml ausente + path com espaços). Atualizações do bloco SPECKIT no `CLAUDE.md` são manuais.
- Coordinator (`runTeam`) e schema: **intocados** — feature 100% frontend (sem rota/migração).
- Sidebar é `hidden lg:block` (desktop-only); hover sob `@media (hover: hover)`.
- Tailwind v4: classes precisam ser **literais** no source. `EXPAND.{block,flex,inline}` e `.sidebar-scroll`/`.custom-scrollbar` são literais/CSS custom — sem risco de scanner.
- **US3 está acoplada à fundação**: `pinned` controla footprint (`<aside>`) E visibilidade (via `pinned && 'block/flex/inline'` espalhado pelo JSX). Ao mexer em US4, lembrar que `expanded` derivado (hover|focus|menu|pinned) hoje é CSS-driven + `pinned` React; US4 (focus-within/menuOpen) precisa somar a esse esquema sem quebrar o `pinned`.
