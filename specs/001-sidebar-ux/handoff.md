# Handoff — Sidebar UX (001-sidebar-ux)

**Sessão**: 2026-06-22 (impl) · **Status**: ✅ MVP (US1) implementado, branch + commit feitos · **Próximo passo**: validar US1 em dev/prod, depois US2 (T006–T007)

## O que foi feito nesta sessão

Implementei o **MVP da feature = User Story 1** seguindo `tasks.md` (T001→T005) e **parei no checkpoint da US1**. US2/US3/US4 **NÃO** foram tocadas.

- **T001 (Setup)**: baseline revisado (sem código). Pontos de alteração confirmados: estado `collapsed` + gating `{!collapsed && …}` em `Sidebar.tsx`; utilities `scrollbar-none`/`.custom-scrollbar` em `globals.css` (esta NÃO mexida — é US2).
- **T002 (Foundational)**: removido o boolean `collapsed`/`setCollapsed`; entrou `pinned` (`const [pinned] = useState(false)`) + `expanded` derivado **via CSS**. Todo o conteúdo (workspace, seções, itens, badges, footer) agora fica **sempre montado** no DOM; só a visibilidade muda.
- **T003 (Foundational)**: `<aside>` virou **footprint do rail** (`w-20`, `relative`, `shrink-0`, `hidden lg:block`) contendo um **painel interno absoluto** (`inset-y-0 left-0`, `bg-sidebar`, `border-r`, `overflow-hidden`) que cresce `w-20`→`w-64`. Footprint só muda para `w-64` quando `pinned` (inerte no MVP). Bg/borda migraram do `<aside>` para o painel.
- **T004 (US1)**: expansão por **hover via `group/sb` + `group-hover/sb:w-64`** (Tailwind v4 já restringe variantes hover a `@media (hover: hover)`). Footprint não muda no hover → **zero layout shift** no `<main>` (FR-003/SC-003). Painel ganha sombra no hover (`group-hover/sb:shadow-2xl`).
- **T005 (US1)**: rótulos, eyebrow "Menu", labels de seção, badges, workspace selector e cartões do rodapé condicionados a `expanded` por CSS (constante `EXPAND` + ramo `pinned && …`), substituindo `{!collapsed && …}`. Rail = só ícones centralizados + **tooltip por ícone** (Radix, `side="right"`) + **destaque de rota ativa** em ambos os estados. Dividers entre seções aparecem só no rail.

### Gate de build (T015) — resultado
`npm run db:generate` ✅ · `npm run typecheck` ✅ · `npm run build`: **compilou em 47s + TypeScript OK + 319/319 páginas estáticas geradas** ✅. A única falha é o passo final de cópia do `output: standalone` (`copyfile … errno -4094`) = **problema conhecido do OneDrive** (ver MEMORY `onedrive_node_modules_corruption`), **ambiental, não-código**. Gate real = CI/EasyPanel (constituição V).

## Decisões / desvios em relação ao plano (importante)

1. **Empilhamento (z-index) — DESVIO do plano.** O plano previa o painel em `z-40` assumindo que ele só sobrepõe o `<main>`. Mas a **Navbar é `sticky top-0 z-50`**: com `z-40`, o topo do painel expandido (workspace selector) ficaria ATRÁS dela. Corrigido: **painel `z-[60]`** (sobrepõe a navbar no hover — cobre transitoriamente o logo "POLARIS", comportamento padrão de sidebar overlay) e **`DropdownMenuContent` do workspace em `z-[70]`** (fica acima do painel). Sem conflito com modais/command-palette: o overlay só extrapola o footprint durante o hover (mouse na sidebar → modal não está aberto); quando `pinned` (US3), footprint vira `w-64` in-flow e o painel não invade a área central.
2. **Toggle Chevron removido.** O botão antigo alternava `collapsed` (que deixou de existir). No MVP a expansão é 100% hover, então o botão saiu. **US3/T008 vai ADICIONAR** o controle de fixar/soltar (o texto da T008 diz "substituir o Chevron" — agora é "adicionar"; sem impacto funcional).
3. **`pinned` inerte no MVP.** `const [pinned] = useState(false)` sem setter (evita warning de var não usada). Toda a fiação `pinned` (footprint `w-64`, `pinned && 'block/flex/inline/…'`) já está pronta e correta, só **inativa** até US3 ligar o controle (T008) + persistência localStorage (T009).
4. **Tooltip "Powered by Teams" removido** dos badges `teams`. Motivo: agora cada item é envolto por um Radix Tooltip (rótulo no rail, FR-005); aninhar outro Tooltip dentro do trigger quebraria. O ícone do badge permanece; só a dica foi descartada. (Reavaliar em polish se desejado.)
5. **Tailwind dinâmico evitado.** Classes hover/expand são **literais completas** (constante `EXPAND` = `'hidden group-hover/sb:block'` etc.). NUNCA montar classe por template (`group-hover/sb:${x}`) — o scanner do Tailwind v4 não detecta e a utility não é gerada.

## Próximos passos (em ordem)

1. **Validar US1** (quickstart cenário 1): `next dev --webpack` (Turbopack quebra no Windows+OneDrive) → carregar `/dashboard`, conferir rail, hover expandindo SEM mover o `<main>`, recolher ao sair, tooltips + rota ativa no rail. Conferir o overlay sobre a navbar no hover (z-index) visualmente.
2. **US2 — Barra de rolagem (T006–T007)**, independente (só `globals.css` + 1 troca de className): criar `.sidebar-scroll` (6px, auto-hide via `:hover`/`:focus-within`, overlay) e trocar `scrollbar-none`→`sidebar-scroll` no `<nav>`.
3. **US3 — Fixar + persistência (T008–T010)**: ADICIONAR controle de pin (alterna `pinned`, `aria-label`), persistir em `localStorage["sofia_sidebar_pinned"]` (ler após mount → sem hydration mismatch), ligar footprint in-flow. A fiação `pinned` no componente já existe (só trocar `useState(false)` por `[pinned, setPinned]` e plugar o botão + efeito).
4. **US4 — a11y/robustez (T011–T013)**: `focus-within` (teclado), guarda `prefers-reduced-motion` (T012, `globals.css`), manter expandida com workspace dropdown aberto (`onOpenChange` → `data-menu-open`). Reavaliar aqui: (a) gate explícito `@media (hover:hover)` se o do Tailwind v4 não bastar; (b) suprimir tooltip de item quando expandido (hoje aparece redundante após o delay do Radix).
5. **Polish (T014–T017)**: não-regressão; **revalidar stacking do overlay vs navbar/modais** (T014, dado o desvio z-index); rodar quickstart 1–4 em dev; **E2E autenticado em prod** `polarisia.com.br` (gate constituição V).

## Pendências / fora do escopo deste commit

- **Commit focado**: incluí só `src/components/polaris/Sidebar.tsx` + `specs/001-sidebar-ux/**` (spec + este handoff). Ficaram FORA (não relacionados a esta feature / scaffolding a decidir): `.specify/`, `.claude/skills/` (framework spec-kit), bloco SPECKIT do `CLAUDE.md`, notas de sessão em `docs/**`, `public/logos/kit/**` e as deleções `public/logo*.svg` (pré-existentes de outra sessão). Tratar separadamente se quiser versioná-los.
- Branch criada: `001-sidebar-ux` (a partir de `main`).

## Gotchas para a próxima sessão

- **OneDrive errno -4094 no `next build`**: o build COMPILA e gera páginas; só a cópia do `standalone` falha local. Não é regressão — validar de verdade no EasyPanel.
- **Hook agent-context QUEBRADO** neste ambiente (ConvertFrom-Yaml ausente + path com espaços). Atualizações do bloco SPECKIT no `CLAUDE.md` são manuais.
- **PowerShell perde cwd** entre chamadas → usar caminho ABSOLUTO em scripts `.specify/...`.
- Coordinator (`runTeam`) e schema: **intocados** — feature 100% frontend (sem rota/migração).
- Sidebar é `hidden lg:block` (desktop-only); hover sob `@media (hover: hover)`.
- Tailwind v4: classes precisam ser **literais** no source (sem construção dinâmica de nome de classe).
