# Polaris IA — Visão Geral do Produto

> Última atualização: 21/02/2026

## O que é a Polaris IA

Polaris IA é uma **plataforma de orquestração de agentes IA** que permite criar equipes de agentes inteligentes que trabalham juntos, visualmente, sem código.

Diferente de chatbots tradicionais ou ferramentas de automação simples, a Polaris IA permite que empresas criem **workflows multi-agente** onde cada agente tem um papel especializado (pesquisador, redator, analista, atendente), sua própria base de conhecimento, e colabora com outros agentes para executar processos complexos.

## Produto Estrela

**Orquestrações Multi-Agente** — Editor visual (drag-and-drop) onde o usuário:
1. Cria agentes especializados com roles definidos
2. Conecta agentes em um fluxo de trabalho colaborativo
3. Atribui knowledge bases específicas por agente
4. Executa a orquestração com streaming em tempo real
5. Acompanha métricas e analytics por orquestração

## Módulos do Hub

| Módulo | Função | Status |
|---|---|---|
| **⭐ Orquestrações** | Multi-agente visual com XY Flow, streaming SSE | 🟡 70% |
| **💻 IDE** | Monaco Editor, 22 modelos IA (Claude/GPT/Gemini/Llama), AI Panel | 🟢 80% |
| **📚 Knowledge Base** | Upload de docs, RAG com pgvector, busca híbrida | 🟡 75% |
| **🔄 Flows** | Automações visuais, nós condicionais, cron, webhooks | 🟡 65% |
| **📡 Canais** | WhatsApp (Evolution API), Widget Web, API, Telegram | 🟢 80% |
| **📊 Analytics** | Dashboard, queries em linguagem natural | 🟡 60% |

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind 4, Radix UI |
| Backend | Next.js API Routes (27 domínios), Prisma 5 |
| Database | PostgreSQL + pgvector (embeddings vetoriais) |
| Desktop | Electron 40 |
| AI Providers | Groq (Llama 3.3, DeepSeek, Qwen), OpenRouter (Claude, GPT, Gemini) |
| Cache | Redis / Upstash Redis |
| Messaging | Evolution API (WhatsApp), Telegram Bot API |

## Diferenciais Competitivos

1. **Multi-agente visual** — Nenhum concorrente BR oferece orquestração drag-and-drop
2. **22 modelos de IA** — De Llama gratuito a Claude Opus premium
3. **Knowledge Base integrada** — RAG vetorial (pgvector) + busca híbrida por agente
4. **Self-hosted** — Dados nunca saem da infraestrutura do cliente
5. **Hub completo** — IDE + Orquestrações + KB + Flows + Canais num único produto
6. **Desktop app** — App nativo via Electron com acesso ao filesystem

## Posicionamento de Mercado

```
          Simples              Complexo
             │                    │
   Alto ─────┼────────────────────┼───── Alto
   Preço     │     ┌─────┐       │     Preço
             │     │ Blip│       │
             │     └─────┘       │
             │                   │
             │    ┌──────────┐   │
             │    │ ★ SOFIA  │   │
             │    └──────────┘   │
             │                   │
   Baixo ────┼────────────────────┼───── Baixo
   Preço     │ ┌────────┐       │     Preço
             │ │Typebot  │  ┌────┤
             │ └────────┘  │N8N │
             │ ┌────────┐  └────┘
             │ │ManyChat│       │
             │ └────────┘       │
             │                   │
         Chatbot/Bot      Orquestração IA
```

**Polaris IA ocupa o quadrante "Orquestração IA + Preço acessível"** — onde não há player dominante no Brasil.
