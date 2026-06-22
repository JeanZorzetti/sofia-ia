# Implementation Plan: Sidebar Colapsável por Hover + Barra de Rolagem Melhorada

**Branch**: `001-sidebar-ux` | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-sidebar-ux/spec.md`

## Summary

Transformar a sidebar do dashboard de um colapso manual (botão que empurra o conteúdo) para um **rail de ícones que expande por hover sobrepondo o conteúdo** (sem layout shift), com um controle de **fixar** que trava a sidebar aberta (modo in-flow) e **persiste a preferência** entre sessões. Em paralelo, substituir a rolagem "cega" (`scrollbar-none`) do menu por uma **barra de rolagem fina, discreta e em overlay** que aparece ao interagir e some fora de uso.

Abordagem técnica: estado mínimo em React (`pinned`, persistido em `localStorage`), com expansão dirigida por CSS (`group-hover` + `focus-within` + `data-pinned`) para resposta instantânea e acessível; o `<aside>` mantém footprint fixo do rail no fluxo flex e um painel interno absoluto cresce sobre o conteúdo quando não-fixado. Nova utility CSS `.sidebar-scroll` para a barra de rolagem. Mudança isolada em 2 arquivos (componente + globals.css); zero backend, zero schema, zero impacto no coordinator.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19 (Next.js 16, App Router)

**Primary Dependencies**: Next.js 16, Tailwind CSS, shadcn/ui (Tooltip, Button, DropdownMenu, Progress), lucide-react, `cn` util (`@/lib/utils`)

**Storage**: `localStorage` (chave `sofia_sidebar_pinned`) — preferência por navegador, mesmo padrão de `sofia_active_workspace`. Sem persistência de servidor, sem schema.

**Testing**: Verificação manual/E2E no browser (estados rail/hover/pinned, persistência, scrollbar, teclado, reduced-motion). Jest do projeto roda no CI; esta feature é puramente de apresentação client-side (sem rota/handler novos para teste de IDOR/auth).

**Target Platform**: Navegadores desktop (a sidebar é `hidden lg:flex` — exibida apenas em ≥ lg).

**Project Type**: Web application (Next.js App Router, componente client-side).

**Performance Goals**: Expansão por hover responde < 150 ms (SC-002); zero layout shift no conteúdo durante hover (SC-003); transições suaves a 60 fps (desligadas sob `prefers-reduced-motion`).

**Constraints**: Não tocar o coordinator (`runTeam`) — N/A aqui (frontend puro). Sem migração de schema. Manter navegação/links/destaque de ativo byte-equivalentes. Overlay não pode capturar cliques do conteúdo quando recolhido.

**Scale/Scope**: 1 componente (`Sidebar.tsx`, ~440 linhas hoje) + 1 folha de estilo (`globals.css`). ~6 seções de menu, ~25 itens. Sem novos endpoints (176+ rotas inalteradas).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação | Status |
|-----------|-----------|--------|
| I. Ação > Análise | Tarefa de UI clara; decisões de design confirmadas com o usuário antes de planejar. | ✅ PASS |
| II. Coordinator Intocado (NON-NEGOTIABLE) | Feature 100% frontend; não toca `runTeam`, worker, options ou body de orquestração. | ✅ PASS (N/A) |
| III. Migrations Formais no Host Real (NON-NEGOTIABLE) | Nenhuma mudança de schema; persistência via `localStorage`. Nada de Prisma/DB. | ✅ PASS (N/A) |
| IV. Padrões Next.js 16 + Type Safety | Sem route handlers/params, sem Groq, sem `new PrismaClient()`. Componente mantém `'use client'`. Nada que dispare os bugs recorrentes. | ✅ PASS |
| V. Segurança e Isolamento Multi-tenant | Sem novos dados, credenciais ou rotas. `localStorage` é por-navegador e não expõe dados de tenant. | ✅ PASS (N/A) |

**Resultado**: Sem violações. Nenhuma entrada em Complexity Tracking.

**Re-check pós-Fase 1**: Design mantém-se em frontend puro (CSS + estado local); nenhum princípio é acionado. ✅ PASS.

## Project Structure

### Documentation (this feature)

```text
specs/001-sidebar-ux/
├── plan.md              # This file (/speckit-plan command output)
├── spec.md              # Feature specification (/speckit-specify output)
├── research.md          # Phase 0 output (decisões técnicas)
├── data-model.md        # Phase 1 output (preferência de sidebar — estado de UI)
├── quickstart.md        # Phase 1 output (roteiro de validação manual/E2E)
├── contracts/
│   └── sidebar-ui-contract.md   # Phase 1 output (contrato de estados/comportamento da UI)
├── checklists/
│   └── requirements.md  # Spec quality checklist (/speckit-specify output)
└── tasks.md             # Phase 2 output (/speckit-tasks — NÃO criado por /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── components/
│   └── polaris/
│       └── Sidebar.tsx          # ALVO PRINCIPAL — estado pinned+persistência, hover/focus,
│                                #   rail (footprint) + painel overlay, render de labels/footer
│                                #   condicionado a `expanded`, botão "fixar" no lugar do toggle
├── app/
│   ├── globals.css              # ALVO — nova utility `.sidebar-scroll` (thin auto-hide overlay);
│   │                            #   ajustes de z-index/overlay/reduced-motion da sidebar
│   └── dashboard/
│       └── layout.tsx           # Provável NO-OP — verificar stacking do painel overlay sobre <main>
└── lib/
    └── utils.ts                 # `cn` já existente (reuso, sem mudança)
```

**Structure Decision**: Aplicação web Next.js (App Router). A mudança é cirúrgica e isolada: o componente client `src/components/polaris/Sidebar.tsx` concentra a lógica de estado/interação, e `src/app/globals.css` recebe a utility de scrollbar e os ajustes de overlay/movimento reduzido. `dashboard/layout.tsx` só é tocado se o overlay exigir ajuste de stacking context (a verificar na Fase 1 — expectativa: NO-OP, pois `<aside>` `relative` com painel `absolute z-40` sobrepõe o `<main>` irmão).

## Complexity Tracking

> Sem violações de constituição. Nenhuma justificativa de complexidade necessária.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
