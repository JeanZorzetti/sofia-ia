# Phase 1 — Data Model: Sidebar UX

Esta feature é de apresentação client-side. Não há entidade de banco, schema Prisma ou migração. O único "modelo" é o **estado de UI** da sidebar.

## Entidade: Preferência de Sidebar (estado de UI client-side)

| Campo | Tipo | Origem | Descrição |
|-------|------|--------|-----------|
| `pinned` | boolean | `localStorage["sofia_sidebar_pinned"]` (`'1'`/`'0'`) | Preferência persistida: sidebar fixada aberta (`true`) ou em modo rail com hover (`false`). Default: `false`. |
| `hovering` | boolean | DOM/CSS (`:hover` / `group-hover`) | Transitório: ponteiro sobre a sidebar. Não persistido. |
| `focusWithin` | boolean | DOM/CSS (`:focus-within`) | Transitório: foco de teclado dentro da sidebar. Não persistido. |
| `menuOpen` | boolean | `onOpenChange` do DropdownMenu de workspace | Transitório: menu suspenso ancorado aberto. Não persistido. |

### Valor derivado

```
expanded = pinned || hovering || focusWithin || menuOpen
```

- `expanded === true`  → painel mostra rótulos, workspace selector e cartões do rodapé.
- `expanded === false` → rail: apenas ícones + tooltips.
- `pinned === true`    → footprint in-flow `w-64` (empurra conteúdo).
- `pinned === false`   → footprint rail `w-20`; expansão (se houver) é overlay absoluto.

### Máquina de estados (informal)

```
                 hover / focus / menuOpen
   RAIL (w-20)  ───────────────────────────▶  OVERLAY EXPANDIDO (absoluto, w-64, z-40)
      ▲   │                                          │
      │   └──────────── sair hover/focus/menu ◀──────┘
      │
      │ clicar "fixar"            clicar "soltar"
      ▼                                  ▲
   FIXADO (w-64 in-flow, empurra conteúdo) ───────────┘
```

### Regras de validação / invariantes

- Persistir **apenas** `pinned`. Estados transitórios nunca vão ao `localStorage`.
- Leitura do `localStorage` ocorre após mount (evita hydration mismatch); default seguro = `false`.
- `expanded` nunca deve recolher enquanto `menuOpen === true` (FR-015).
- O destaque de rota ativa independe de `expanded`/`pinned` (FR-006).
