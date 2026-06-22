# Tasks: Sidebar Colapsável por Hover + Barra de Rolagem Melhorada

**Input**: Design documents from `specs/001-sidebar-ux/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/sidebar-ui-contract.md](./contracts/sidebar-ui-contract.md)

**Tests**: NÃO solicitados. Feature de apresentação client-side; jest do projeto roda só no CI (OneDrive corrompe node_modules local). Validação via [quickstart.md](./quickstart.md) (manual/E2E).

**Organization**: Tarefas agrupadas por user story para implementação/validação independentes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivo diferente, sem dependência pendente)
- **[Story]**: User story a que a tarefa pertence (US1–US4)
- Caminhos de arquivo exatos incluídos nas descrições

## Path Conventions

Web app (Next.js App Router). Arquivos-alvo reais:
- `src/components/polaris/Sidebar.tsx` (componente principal)
- `src/app/globals.css` (utility de scrollbar + overlay/reduced-motion)
- `src/app/dashboard/layout.tsx` (provável NO-OP; só se o overlay exigir stacking)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Ancorar o refactor no comportamento atual.

- [ ] T001 Revisar baseline: estado `collapsed`/gating de footer em `src/components/polaris/Sidebar.tsx` e utilities de scrollbar (`.custom-scrollbar`, `scrollbar-none`) em `src/app/globals.css` (sem mudança de código; documentar pontos de alteração).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Esqueleto rail+overlay e modelo de estado, compartilhado por US1, US3 e US4.

**⚠️ CRITICAL**: US1/US3/US4 não começam antes desta fase. (US2 é independente — ver Dependencies.)

- [ ] T002 Substituir o boolean `collapsed` por estado `pinned` + valor derivado `expanded` em `src/components/polaris/Sidebar.tsx` (default = rail; todas as seções/itens/footer permanecem montados no DOM).
- [ ] T003 Reestruturar o `<aside>` em rail de footprint fixo + painel interno absoluto em `src/components/polaris/Sidebar.tsx` (footprint `w-20` quando não-fixado / `w-64` quando fixado; painel interno cresce `w-20`→`w-64` com `z-40` + sombra ao sobrepor o conteúdo — sem alterar o footprint no hover).

**Checkpoint**: Estrutura pronta — o conteúdo principal não desloca quando o painel cresce.

---

## Phase 3: User Story 1 - Recolher/expandir por hover (Priority: P1) 🎯 MVP

**Goal**: Sidebar inicia como rail de ícones e expande ao passar o mouse, sobrepondo o conteúdo sem layout shift.

**Independent Test**: Carregar `/dashboard`, confirmar rail; hover expande rótulos sem mover o `<main>`; sair recolhe; rota ativa destacada + tooltips nos ícones.

- [ ] T004 [US1] Adicionar expansão por hover via CSS `group`/`group-hover` dentro de `@media (hover: hover)` em `src/components/polaris/Sidebar.tsx`, de modo que o painel cresça ao passar o ponteiro sem deslocar o `<main>`.
- [ ] T005 [US1] Condicionar rótulos, badges, seletor de workspace e cartões do rodapé a `expanded` (CSS-driven, substituindo `{!collapsed && …}`) em `src/components/polaris/Sidebar.tsx`; manter rail só-ícones com tooltip por ícone e destaque de rota ativa em ambos os estados.

**Checkpoint**: US1 funcional e testável de forma independente (MVP).

---

## Phase 4: User Story 2 - Barra de rolagem fina auto-hide (Priority: P2)

**Goal**: Menu que transborda ganha indicador de rolagem fino, discreto e em overlay.

**Independent Test**: Em viewport baixa, o menu transborda; indicador surge ao rolar/hover, some fora de uso, não desloca itens; sem transbordo → sem indicador.

- [ ] T006 [P] [US2] Criar utility `.sidebar-scroll` em `src/app/globals.css` (WebKit `::-webkit-scrollbar` 6px + Firefox `scrollbar-width: thin`/`scrollbar-color`; thumb transparente em repouso → `hsl(var(--border))`/`hsl(var(--foreground-tertiary))` em `:hover`/`:focus-within`; overlay, sem reservar largura).
- [ ] T007 [US2] Trocar `scrollbar-none` por `sidebar-scroll` no `<nav>` em `src/components/polaris/Sidebar.tsx`.

**Checkpoint**: US1 e US2 funcionam de forma independente.

---

## Phase 5: User Story 3 - Fixar + persistência (Priority: P2)

**Goal**: Controle de fixar trava a sidebar aberta (in-flow, empurra conteúdo) e a preferência persiste entre sessões.

**Independent Test**: Fixar → trava expandida e empurra `<main>`; `localStorage` grava; recarregar mantém fixada; soltar volta ao rail e persiste.

- [ ] T008 [US3] Substituir o toggle Chevron por um controle de fixar/soltar (alterna `pinned`, tooltip "Fixar menu"/"Soltar menu", `aria-label`) em `src/components/polaris/Sidebar.tsx`.
- [ ] T009 [US3] Persistir `pinned` em `localStorage["sofia_sidebar_pinned"]` e ler após mount via `useEffect` (default `false` → sem hydration mismatch) em `src/components/polaris/Sidebar.tsx`.
- [ ] T010 [US3] Ligar `pinned` ao footprint in-flow `w-64` (empurra `<main>`) e `!pinned` ao rail com overlay no hover, em `src/components/polaris/Sidebar.tsx`.

**Checkpoint**: US1, US2 e US3 funcionam de forma independente.

---

## Phase 6: User Story 4 - Robustez & acessibilidade (Priority: P3)

**Goal**: Expansão por teclado, respeito a movimento reduzido e menu suspenso que não recolhe a sidebar.

**Independent Test**: Tab para a sidebar expande (focus-within); navegação só por teclado alcança tudo; reduced-motion sem animação; dropdown de workspace aberto mantém expandido.

- [ ] T011 [US4] Adicionar expansão por `focus-within` (teclado) em `src/components/polaris/Sidebar.tsx` (+ CSS de suporte em `src/app/globals.css`).
- [ ] T012 [P] [US4] Envolver as transições de largura/opacidade em guarda `prefers-reduced-motion` (sem animação sob `reduce`) em `src/app/globals.css`.
- [ ] T013 [US4] Manter a sidebar expandida enquanto o `DropdownMenu` de workspace estiver aberto, via `onOpenChange` → estado/`data-menu-open`, em `src/components/polaris/Sidebar.tsx`.

**Checkpoint**: Todas as user stories independentemente funcionais.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Não-regressão, build e validação ponta a ponta.

- [ ] T014 Verificar não-regressão (links/rotas, destaque de ativo, troca de workspace, links do footer, `hidden lg:flex`) em `src/components/polaris/Sidebar.tsx`; confirmar `src/app/dashboard/layout.tsx` como NO-OP (ajustar stacking só se necessário).
- [ ] T015 Gate de build a partir da raiz do repo: `prisma generate` seguido de `next build` (ops de DB não-bloqueantes) — confirmar zero erro de tipo/build.
- [ ] T016 Executar os cenários 1–4 de `specs/001-sidebar-ux/quickstart.md` em dev (`next dev --webpack`).
- [ ] T017 Validação E2E autenticada em produção (`polarisia.com.br`) após deploy — gate da constituição (V).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup; **bloqueia US1, US3, US4**.
- **US1 (Phase 3)**: depende da Foundational.
- **US2 (Phase 4)**: **independente** — só `globals.css` (T006) + 1 troca de className (T007). Pode rodar em paralelo à Foundational/US1.
- **US3 (Phase 5)**: depende da Foundational (usa `pinned`/footprint).
- **US4 (Phase 6)**: depende da Foundational (usa `expanded`/painel).
- **Polish (Phase 7)**: depende das stories desejadas concluídas.

### User Story Dependencies

- US1 (P1): após Foundational. Sem dependência de outra story.
- US2 (P2): independente de todas (apenas CSS + className).
- US3 (P2): após Foundational; ortogonal a US1/US2.
- US4 (P3): após Foundational; refina US1 (hover/foco) e US3 (menu aberto).

### Parallel Opportunities

- T006 [P] (`globals.css`) pode rodar a qualquer momento, em paralelo a tarefas de `Sidebar.tsx`.
- T012 [P] (`globals.css`, reduced-motion) idem.
- Como quase tudo toca o mesmo arquivo (`Sidebar.tsx`), o paralelismo real é limitado; priorize ordem sequencial por story para evitar conflito no mesmo arquivo.

---

## Parallel Example: tarefas de CSS isoladas

```bash
# globals.css é independente do componente — pode ser feito junto:
Task: "T006 Criar utility .sidebar-scroll em src/app/globals.css"
Task: "T012 Guarda prefers-reduced-motion em src/app/globals.css"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (US1).
2. **PARAR e VALIDAR** US1 isolada (rail + hover sem layout shift).
3. Deploy/demo do MVP se desejado.

### Incremental Delivery

1. Setup + Foundational → base pronta.
2. + US1 → validar → MVP.
3. + US2 (scrollbar) → validar.
4. + US3 (fixar/persistência) → validar.
5. + US4 (a11y/robustez) → validar.
6. Polish (build + quickstart + E2E prod).

### Notas

- Sem tarefas de teste (não solicitadas); validação = `quickstart.md` + E2E prod.
- Coordinator (`runTeam`) intocado; sem schema/migração; sem rota nova.
- Commit por tarefa ou grupo lógico; parar em qualquer checkpoint para validar a story.
