# Strategy V2 — Visao Geral

> **Foco:** Organizacao, UI/UX, Design, Estetica
> **Premissa:** A V1 entregou *features*. A V2 entrega *qualidade*.

---

## Contexto

A Strategy V1 completou 19 sprints com foco em funcionalidade: orquestracoes, KB, monetizacao, SEO, white-label, enterprise. O produto tem **todas as features planejadas**, mas acumulou debito tecnico de UI/UX:

- Navbar e Footer copiados em 15+ paginas
- Zero componentes reutilizaveis para landing pages
- Design system parcial (tokens em CSS, sem Tailwind config)
- Inconsistencias visuais entre paginas
- Paginas com 700-1200 linhas de codigo inline
- Animacoes basicas, sem micro-interacoes
- Sem light mode, sem auditoria de acessibilidade

## Objetivo da V2

**Transformar Sofia de "funciona" para "encanta".**

| Dimensao | De (V1) | Para (V2) |
|----------|---------|-----------|
| Organizacao | Componentes inline, copy-paste | Component library, DRY, < 200 LOC/page |
| UI/UX | Funcional, inconsistente | Consistente, previsivel, acessivel |
| Design | Tokens em CSS, cores hardcoded | Design system completo, Figma-synced |
| Estetica | Dark mode basico, animacoes sutis | Polish premium, micro-interacoes, scroll animations |

## Principios

1. **DRY acima de tudo** — Componente reutilizavel > codigo inline
2. **Design tokens primeiro** — Toda cor, espacamento e tipografia vem de tokens
3. **Mobile-first, always** — Nenhum breakpoint hardcoded
4. **Acessibilidade nao e opcional** — WCAG AA minimo
5. **Performance e UX** — Core Web Vitals verdes em todas as paginas
6. **Estetica premium** — Cada interacao deve ter feedback visual

## Estrutura dos Documentos

| Doc | Conteudo |
|-----|----------|
| 01-visao.md | Este documento — visao geral e principios |
| 02-diagnostico.md | Auditoria detalhada do estado atual |
| 03-design-system.md | Tokens, cores, tipografia, espacamento, sombras |
| 04-componentes.md | Component library — o que extrair, como organizar |
| 05-ui-ux.md | Melhorias de UX, navegacao, fluxos, acessibilidade |
| 06-estetica.md | Visual polish, animacoes, micro-interacoes |
| 07-roadmap.md | Sprints priorizados com tarefas especificas |
| 08-ferramentas.md | MCPs, tools e bibliotecas recomendadas |

## Metricas de Sucesso

| Metrica | Alvo |
|---------|------|
| Lighthouse Performance | > 90 |
| Lighthouse Accessibility | > 95 |
| Lighthouse Best Practices | > 90 |
| Core Web Vitals (LCP) | < 2.5s |
| Core Web Vitals (CLS) | < 0.1 |
| LOC medio por page.tsx publica | < 50 (importa componentes) |
| Componentes landing reutilizaveis | > 10 |
| Duplicacao de codigo (Navbar/Footer) | Zero |
| Cobertura de design tokens | 100% cores, 100% espacamentos |
