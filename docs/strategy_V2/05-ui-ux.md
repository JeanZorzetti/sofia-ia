# UI/UX — Melhorias de Experiencia

> Objetivo: Tornar cada interacao previsivel, acessivel e fluida.

---

## 1. Navegacao

### 1.1 Menu Mobile (P0 — Critico)
**Problema:** Navbar publica nao tem menu mobile. Em telas < 768px, os links desaparecem completamente.

**Solucao:**
- Botao hamburguer visivel em `md:hidden`
- Usar shadcn `Sheet` (side drawer) com todos os links
- Fechar ao navegar

### 1.2 Active State nos Links (P1)
**Problema:** Links da navbar nao indicam pagina atual.

**Solucao:**
```tsx
const pathname = usePathname()
const isActive = pathname === href
// Active: text-white font-medium
// Inactive: text-foreground-secondary
```

### 1.3 Breadcrumbs em Landing (P2)
**Problema:** Paginas como `/features/orchestrations` nao tem breadcrumb.

**Solucao:** Ja existe breadcrumb no dashboard. Adaptar para landing com estilo diferente.

---

## 2. Loading States

### 2.1 Skeleton Loading (P1)
**Problema:** Paginas do dashboard carregam com tela branca/preta ate os dados chegarem.

**Solucao:**
- `loading.tsx` em cada rota do dashboard com skeleton layout
- Skeleton para: listas de agentes, orchestrations, KB docs
- Usar `<Skeleton />` do shadcn ja instalado

### 2.2 Suspense Boundaries (P1)
**Problema:** Sem Suspense boundaries. Toda a pagina espera o dado mais lento.

**Solucao:**
- Wrapping de componentes async com `<Suspense fallback={<Skeleton />}>`
- Streaming SSR para dashboard pages

### 2.3 Optimistic Updates (P2)
- Ao criar agente/orchestration, mostrar imediatamente na lista
- Ao deletar, remover da UI antes da confirmacao do server

---

## 3. Feedback Visual

### 3.1 Toast Notifications (P0)
**Status:** Toaster ja esta no layout do dashboard. Verificar uso consistente.

**Garantir:**
- Toda acao CRUD mostra toast de sucesso/erro
- Padroes: `toast.success()`, `toast.error()`, `toast.loading()`

### 3.2 Button Loading States (P1)
**Problema:** Botoes de submit nao mostram loading durante requests.

**Solucao:**
```tsx
<Button disabled={isPending}>
  {isPending ? <Loader2 className="animate-spin" /> : null}
  {isPending ? 'Salvando...' : 'Salvar'}
</Button>
```

### 3.3 Empty States (P1)
**Problema:** Listas vazias mostram area em branco.

**Solucao:**
- Componente `EmptyState` com icone, titulo, descricao e CTA
- Exemplos: "Nenhum agente criado. Crie seu primeiro agente."
- Ilustracao SVG ou Lottie opcional

### 3.4 Error States (P1)
**Problema:** Erros de API mostram mensagem generica ou nada.

**Solucao:**
- Componente `ErrorState` com retry button
- `error.tsx` em rotas criticas do dashboard

---

## 4. Formularios

### 4.1 Validacao Inline (P1)
**Problema:** Formularios validam apenas no submit.

**Solucao:**
- Validacao em tempo real com `react-hook-form` + `zod`
- Mensagens de erro abaixo de cada campo
- Borda vermelha em campos invalidos

### 4.2 Autofocus (P2)
- Primeiro campo focado automaticamente ao abrir dialog/form
- Focus trap em modals (shadcn Dialog ja faz isso)

---

## 5. Acessibilidade

### 5.1 Contraste de Cores (P0)
**Acao:** Rodar auditoria com A11y MCP em todas as paginas publicas.

**Suspeitos:**
- `text-foreground-tertiary` (50% opacity) sobre `bg-background` (preto)
- Badges com cores claras sobre fundo escuro

### 5.2 Focus Styles (P1)
**Problema:** Varios elementos tem `focus:outline-none` sem alternativa visivel.

**Solucao:**
- `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`
- Aplicar globalmente via CSS ou em cada componente interativo

### 5.3 Skip Navigation (P1)
```tsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute ...">
  Pular para conteudo principal
</a>
```

### 5.4 ARIA Labels (P1)
- Todos os icon-only buttons precisam de `aria-label`
- Imagens decorativas: `alt=""`
- Imagens informativas: `alt` descritivo

### 5.5 Keyboard Navigation (P2)
- Todas as interacoes possiveis via teclado
- Tab order logico
- Escape fecha modals/drawers

---

## 6. Performance UX

### 6.1 Image Optimization (P1)
- Todas as imagens via `next/image` com `width`, `height` e `priority` no above-the-fold
- Lazy loading para imagens below-the-fold
- Formato WebP/AVIF automatico

### 6.2 Font Loading (P2)
- Mover Inter para `next/font/google` em vez de `<link>` no CSS
- Previne FOUT (Flash of Unstyled Text)

### 6.3 Prefetch (P2)
- `<Link prefetch>` para rotas mais navegadas
- Prefetch do dashboard ao clicar "Entrar"

---

## 7. Fluxos Criticos — UX Review

### 7.1 Onboarding (ja existe — wizard 4 steps)
**Status:** OK. Usa framer-motion, steps claros.
**Melhoria:** Adicionar progress bar no topo.

### 7.2 Criar Orchestration
**Status:** Funcional mas complexo.
**Melhorias:**
- Template gallery como primeiro passo (nao dialog separado)
- Preview do template antes de selecionar
- Guided first-run com tooltips

### 7.3 Knowledge Base Upload
**Status:** Funcional.
**Melhorias:**
- Drag-and-drop visual com area de drop highlighted
- Progress bar de upload + processamento
- Preview de chunks inline apos processamento
