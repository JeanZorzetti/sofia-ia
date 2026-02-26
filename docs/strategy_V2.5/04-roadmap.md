# Roadmap V2.5 — Sprint de Posicionamento & Messaging

> Sprint unico de 1-2 semanas. Objetivo: reescrever a landing page com ICP definido.
> Pre-requisito para V3: nao adianta distribuir trafego para copy confuso.

---

## Contexto

A V2 entregou uma landing tecnicamente polida (animacoes, acessibilidade, componentes reutilizaveis).
A V2.5 entrega uma landing que **converte** — porque fala para a pessoa certa, sobre o problema certo.

Sequencia correta:
```
V2 (UI/UX polido) → V2.5 (Messaging correto) → V3 (Distribuicao + Revenue)
```

---

## Objetivos

| Objetivo | Metrica de sucesso |
|----------|-------------------|
| Reescrever hero com ICP de agencias | Tempo na pagina > 2min (antes de medir signup) |
| Substituir jargao tecnico por beneficios | Taxa de scroll ate features > 50% |
| CTA especifico com trial Pro 7 dias | Signup rate > 3% (vs estimado < 1% atual) |
| Demo visual que mostra valor em 5 segundos | Click no CTA secundario > 2% |
| Features em linguagem de beneficio | Nao medir isoladamente |

---

## Sprint Unico — Tarefas

### Bloco 1: Copy (2-3 dias)
| # | Tarefa | Arquivo | Esforco |
|---|--------|---------|---------|
| 1.1 | Reescrever hero section (headline, sub, CTA) — usar Versao A ou B de 03-messaging | `src/app/(public)/page.tsx` | 1h |
| 1.2 | Adicionar badge "Para agencias de marketing" + filtro de audiencia | `src/app/(public)/page.tsx` | 30min |
| 1.3 | Reescrever 6 features como beneficios (nao features tecnicas) | `src/data/home.ts` | 2h |
| 1.4 | Substituir tabela CrewAI/AutoGen por tabela "vs ChatGPT" | `src/data/home.ts` | 1h |
| 1.5 | Reescrever CTA section final (com trial 7 dias, micro-copy) | `src/components/landing/CTASection.tsx` | 1h |
| 1.6 | Adicionar counter real de pipelines executados no hero (DB query) | `src/app/(public)/page.tsx` | 2h |

### Bloco 2: Hero Visual (1-2 dias)
| # | Tarefa | Arquivo | Esforco |
|---|--------|---------|---------|
| 2.1 | Substituir FloatingPaths (decorativo, pouca informacao) por demo animado de pipeline | `src/app/(public)/page.tsx` | 4h |
| 2.2 | Pipeline demo: 3 agentes circulando com mensagens de "trabalhando..." → output em 3s | Novo componente `HeroPipelineDemo.tsx` | 4h |
| 2.3 | Adicionar badge "Made in Brazil" + "MercadoPago" para diferenciar do produto gringoR | `src/app/(public)/page.tsx` | 30min |

### Bloco 3: Secoes Novas (1 dia)
| # | Tarefa | Arquivo | Esforco |
|---|--------|---------|---------|
| 3.1 | Secao "Como funciona" com 3 passos (Configura → Treina → Automatiza) | `src/app/(public)/page.tsx` | 2h |
| 3.2 | Secao de vertical: "Para agencias de marketing" com caso de uso especifico | `src/app/(public)/page.tsx` | 2h |
| 3.3 | Secao de prova social: counter de execucoes + logos de integracoes | `src/app/(public)/page.tsx` | 1h |

### Bloco 4: SEO & Meta (meio dia)
| # | Tarefa | Arquivo | Esforco |
|---|--------|---------|---------|
| 4.1 | Reescrever meta title e description (foco em agencias, nao orquestracao) | `src/app/(public)/page.tsx` | 30min |
| 4.2 | Reescrever OG title/description para social share | `src/app/(public)/page.tsx` | 30min |
| 4.3 | Testar taglines alternativas no AB test basico (feature flag no cookie) | `src/app/(public)/page.tsx` | 1h |

### Bloco 5: Paginas Secundarias (opcional, Sprint seguinte)
| # | Tarefa | Arquivo | Esforco |
|---|--------|---------|---------|
| 5.1 | Landing especifica para agencias: `/para-agencias` | Nova pagina | 4h |
| 5.2 | Landing especifica para consultores/white-label: `/para-consultores` | Nova pagina | 4h |
| 5.3 | Reescrever `/sobre` com narrativa de fundador (humaniza o produto) | `src/app/(public)/sobre/page.tsx` | 2h |

---

## HeroPipelineDemo — Spec Tecnica

O componente mais importante do V2.5. Substitui FloatingPaths decorativo.

```
Estado: idle → running → output

IDLE:
┌─────────────────────────────────────────┐
│  [Pesquisador]  →  [Copywriter]  →  [Revisor]  │
│     ⬜                ⬜               ⬜          │
│                                                  │
│  Input: "Post sobre produto X para Instagram"   │
│  [▶ Executar] ← CTA demo                        │
└─────────────────────────────────────────┘

RUNNING (animado):
┌─────────────────────────────────────────┐
│  [Pesquisador]  →  [Copywriter]  →  [Revisor]  │
│   🔵 buscando...   ⬜               ⬜          │
│                                                  │
│  "Pesquisando tendencias em Instagram..."        │
└─────────────────────────────────────────┘

OUTPUT:
┌─────────────────────────────────────────┐
│  [Pesquisador]  →  [Copywriter]  →  [Revisor]  │
│      ✅              ✅              ✅          │
│                                                  │
│  Revisor: "Post aprovado. Hook forte,           │
│  3 beneficios claros, CTA direto. ✓"            │
│                                                  │
│  [Criar minha propria automacao →]              │
└─────────────────────────────────────────┘
```

**Nota:** O `TemplateTestDriveCard` ja implementa esse padrao com IA real (Sprint anterior).
O HeroPipelineDemo e uma versao maior, mais visual, no hero — pode reutilizar a mesma logica.

---

## AB Test — Como implementar (simples)

Sem framework de AB test externo. Solucao simples com cookie:

```typescript
// Em page.tsx (server component)
// Ler cookie de variante ou sortear
const variant = cookies().get('hero-variant')?.value ??
  (Math.random() > 0.5 ? 'A' : 'B')

// Variant A: Foco em agencias
// Variant B: Foco em automacao geral

// Track no analytics:
// track('hero_variant_viewed', { variant })
// track('signup_from_variant', { variant })
```

---

## Ordem de Execucao

```
Dia 1: Bloco 1 (copy) — tudo no mesmo arquivo, rapido de mudar
Dia 2: Bloco 2 (HeroPipelineDemo) — novo componente, mais trabalhoso
Dia 3: Bloco 3 (secoes) + Bloco 4 (SEO)
Dia 4: Deploy + verificacao + analytics
Dia 5-7: Observar metricas, ajustar copy se necessario
```

---

## O que NAO fazer no V2.5

- Nao redesenhar o design system (ja esta otimo)
- Nao criar novas paginas de produto
- Nao mudar pricing (isso e V3)
- Nao criar novos componentes complexos que nao sejam o HeroPipelineDemo
- Nao reescrever paginas internas do dashboard

---

## Metricas de Sucesso (medir 2 semanas apos deploy)

| Metrica | Baseline (antes) | Target |
|---------|-----------------|--------|
| Tempo medio na pagina | Desconhecido | > 2 min |
| Scroll depth (ate features) | Desconhecido | > 60% |
| Signup rate (visitante → cadastro) | Desconhecido | > 3% |
| Bounce rate | Desconhecido | < 70% |
| Sessoes de "demo test-drive" | Desconhecido | > 10%/dia |

**Pre-requisito:** GA4 configurado (Sprint 1 V3) para medir essas metricas.

---

## Sequencia Completa

```
V2.5 (esta semana) → Sprint 1 V3 (analytics + security) → Sprint 2 V3 (trial + emails) → ...

Logica: Copy certo primeiro. Analytics para medir. Trial para converter.
        Nao adianta medir uma landing com copy errado.
```
