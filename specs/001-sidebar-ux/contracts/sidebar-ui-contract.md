# Phase 1 — UI Contract: Sidebar (`src/components/polaris/Sidebar.tsx`)

A sidebar não expõe API de rede; seu "contrato" é o comportamento observável (estados, DOM/ARIA, CSS) e o contrato de armazenamento. Implementação deve satisfazer este contrato sem alterar a estrutura de navegação existente.

## 1. Contrato de armazenamento

| Chave | Valores | Semântica |
|-------|---------|-----------|
| `localStorage["sofia_sidebar_pinned"]` | `'1'` \| `'0'` \| ausente | `'1'` = fixada; `'0'`/ausente = rail (hover). Escrita ao alternar "fixar". Leitura após mount. |

## 2. Contrato de estados visuais

| Estado | Footprint (fluxo) | Painel visual | Rótulos/Footer/Workspace | Tooltips de ícone |
|--------|-------------------|---------------|--------------------------|-------------------|
| Rail (não-fixado, sem hover/focus/menu) | `w-20` | `w-20` | ocultos | visíveis no hover do ícone |
| Overlay (não-fixado, hover/focus/menu) | `w-20` (inalterado) | `w-64` absoluto, `z-40`, sombra, sobre o `<main>` | visíveis | suprimidos (rótulo já visível) |
| Fixado | `w-64` | `w-64` in-flow | visíveis | suprimidos |

**Invariante crítico (FR-003/SC-003):** transição Rail→Overlay **não** altera o footprint `w-20` → o `<main>` não desloca.

## 3. Contrato de interação

- **Hover**: ponteiro sobre o `<aside>` → `expanded`. Sair → recolhe (somente se não-fixado, sem foco interno e sem menu aberto). Apenas sob `@media (hover: hover)`.
- **Foco de teclado**: foco em qualquer item dentro do `<aside>` → `expanded` (`focus-within`). (FR-013)
- **Fixar/Soltar**: controle dedicado (substitui o toggle Chevron atual). Alterna `pinned`, persiste, atualiza tooltip ("Fixar menu" / "Soltar menu"). (FR-007/FR-008)
- **Menu de workspace aberto**: enquanto aberto, mantém `expanded` mesmo sem hover. (FR-015)
- **Navegação**: clicar um item navega para a rota (comportamento atual preservado). Item da rota ativa destacado em qualquer estado. (FR-006/FR-016)

## 4. Contrato de rolagem (`<nav>` → utility `.sidebar-scroll`)

- Conteúdo transborda → indicador fino (~6px) aparece em `:hover`/`:focus-within`/scroll; some fora de uso. (FR-010)
- Indicador é overlay: **não** reserva largura nem desloca itens. (FR-011)
- Sem transbordamento → nenhum indicador. (FR-012)
- Funciona tanto no rail (sobre ícones) quanto expandido (sobre rótulos).

## 5. Contrato de acessibilidade / movimento

- `prefers-reduced-motion: reduce` → sem animação de largura/opacidade. (FR-014)
- Toda navegação alcançável por teclado; foco expande a sidebar. (SC-007)
- O controle "fixar" tem rótulo acessível (tooltip + `aria-label`/`title`).

## 6. Contrato de não-regressão (o que NÃO muda)

- Conjunto, ordem e rotas dos itens/seções do menu.
- Seletor de workspace e suas opções; cartões do rodapé (uso/plano, indicação, fundador) e seus links.
- Sidebar permanece `hidden lg:flex` (desktop-only).
- Nenhuma rota de API, nenhum dado de servidor, nenhum acesso a Prisma é introduzido.
