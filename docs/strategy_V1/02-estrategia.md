# Polaris IA — Estratégia de Produto e Go-to-Market

> Última atualização: 21/02/2026

## Posicionamento Estratégico

### Frase de posicionamento
> "Crie equipes de agentes IA que trabalham juntos. Visualmente. Sem código."

### O que NÃO somos
- ❌ Chatbot para WhatsApp
- ❌ Automação genérica (Zapier clone)
- ❌ IDE com IA (Cursor clone)
- ❌ Ferramenta no-code genérica

### O que SOMOS
- ✅ Plataforma de orquestração multi-agente com interface visual
- ✅ Hub de soluções IA com módulos integrados (IDE, KB, Flows, Canais)
- ✅ Ferramenta para criar workflows de agentes especializados que colaboram

---

## Análise Competitiva

### Concorrentes diretos em orquestração multi-agente

| Player | Abordagem | Público | Preço | Fraqueza |
|---|---|---|---|---|
| **CrewAI** | Python SDK | Developers | Open-source + Cloud | Sem visual, Python-only |
| **AutoGen** | Python SDK | Enterprise/Research | Gratuito (Microsoft) | Ultra-complexo |
| **LangFlow** | Visual (Langchain) | Developers | Open-source | Foca em chains, não multi-agente |
| **Relevance AI** | Visual + API | PMEs EN | $199-999/m | Caro, sem self-hosted, EN-only |
| **Dify** | Visual | Developers | Open-source + Cloud | Single-agent focused |

### Concorrentes indiretos (sobreposição parcial)

| Player | Sobreposição | O que faz diferente |
|---|---|---|
| **Blip** | Canais + Atendimento | Enterprise BR, R$5K+/mês, sem multi-agente real |
| **Typebot** | Flows visuais | Open-source, sem IA nativa robusta |
| **N8N** | Automação | Dev-first, sem orquestração nativa |
| **Cursor/Windsurf** | IDE com IA | Foco em code, sem orquestração |

### Vantagem competitiva sustentável

1. **Visual + Multi-agente + KB integrada** — Ninguém junta os 3
2. **Português/Brasil-first** — Concorrentes globais ignoram o mercado BR
3. **Self-hosted** — Compliance e privacidade (LGPD)
4. **Hub** — Reduz stack do cliente (em vez de CrewAI + N8N + Typebot + Dify)

---

## ICP (Perfil de Cliente Ideal)

### Primário: Empresas que querem automatizar processos com IA
- 10-200 funcionários
- Processos manuais que envolvem múltiplas etapas (pesquisa → redação → análise)
- Time técnico limitado (1-3 devs ou zero)
- Dispostas a pagar R$ 297-997/mês por automação inteligente

### Secundário: Desenvolvedores e times técnicos
- Buscam IDE com multi-modelo
- Querem self-hosted (dados internos)
- Precisam de prototipagem rápida de agentes

### Verticais prioritárias (templates prontos)

| Vertical | Caso de uso principal | Template |
|---|---|---|
| **Agências de Marketing** | Pipeline de conteúdo (pesquisa → copy → revisão) | `marketing-pipeline` |
| **E-commerce** | Atendimento inteligente (triagem → venda → suporte) | `ecommerce-agents` |
| **Jurídico** | Pesquisa + redação de peças | `legal-research` |
| **SaaS/Startups** | Onboarding + suporte + feedback | `saas-support` |
| **RH/Recrutamento** | Triagem + qualificação de candidatos | `recruitment-pipeline` |

---

## Estratégia de Penetração: SEO + GEO

### Por que só SEO + GEO

- Zero budget para paid ads
- Produto técnico — audiência busca no Google/ChatGPT/Perplexity
- CAC orgânico é sustentável a longo prazo
- Conteúdo educacional cria a categoria no Brasil

### Estratégia SEO — 3 Camadas

**Camada 1 — Captura de demanda existente** (tráfego em 1-3 meses)

| Cluster | Keywords | Vol BR/mês |
|---|---|---|
| IA para empresas | "como usar ia na empresa", "ia para negócios", "ferramentas ia" | ~12K |
| Automação com IA | "automatizar com ia", "ia para produtividade" | ~8K |
| Agentes IA | "o que são agentes ia", "como criar agente ia" | ~4K |

**Camada 2 — Criação de demanda** (3-6 meses)

| Conteúdo pilar | Target |
|---|---|
| "O que é Orquestração de Agentes IA" | Definir a categoria |
| "Polaris IA vs CrewAI vs AutoGen" | Comparativo SEO |
| "Como criar equipe de agentes IA sem código" | Tutorial prático |
| "Knowledge Base com RAG: Guia completo" | Educacional |
| "5 Orquestrações prontas para sua empresa" | Prático/Templates |

**Camada 3 — Domínio de nicho** (6-12 meses)

Keywords de nicho com concorrência baixa:
- "orquestração agentes ia" (210/mês, concorrência quase zero)
- "plataforma multi agente" (170/mês, low)
- "crewai alternativa" (crescente)
- "agente ia sem código" (crescente)

### Estratégia GEO (Generative Engine Optimization)

**Objetivo**: Quando alguém perguntar ao ChatGPT/Perplexity/Gemini "qual a melhor plataforma de orquestração multi-agente?", a Polaris IA aparecer na resposta.

| Ação | Plataforma | Impacto GEO |
|---|---|---|
| Open-source no GitHub | GitHub | 🔴 Altíssimo |
| README técnico detalhado | GitHub | Alto |
| Launch no ProductHunt | ProductHunt | Alto |
| Registro em diretórios IA | TAAFT, Futurepedia | Alto |
| Artigos no Dev.to / Medium | Dev.to | Médio |
| Comparativos "Polaris IA vs X" | Blog próprio | Alto |

**Táticas GEO no conteúdo:**
- Schema markup (FAQ, SoftwareApplication, HowTo)
- Respostas diretas nos primeiros parágrafos
- Tabelas de comparação estruturadas
- Dados específicos e citáveis (não genéricos)
- Formato "answer-first" em todos os H2s

---

## Modelo de Monetização

### Pricing (a definir, sugestão)

| Plano | Preço | Inclui |
|---|---|---|
| **Free** | R$ 0 | 1 agente, 100 msgs/mês, 1 KB (10MB) |
| **Pro** | R$ 297/mês | 5 agentes, 5K msgs, 5 KBs, orquestrações, flows |
| **Business** | R$ 997/mês | Agentes ilimitados, 50K msgs, KBs ilimitadas, IDE, prioridade |
| **Enterprise** | Custom | Self-hosted, SLA, suporte dedicado |

### Unit economics (estimativa)

- **Custo por agente/mês**: ~R$ 5-15 (API costs Groq/OpenRouter)
- **Margem bruta**: 70-85% (dependendo do consumo de API)
- **LTV médio estimado**: R$ 3.500-8.000 (12 meses × R$ 297-697)
- **CAC orgânico**: R$ 50-150 (SEO/GEO, sem ads)
