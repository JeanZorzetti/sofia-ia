# Arquitetura — Polaris IA

## Visão Geral

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                            │
│  Next.js App Router (React 19) + Electron (Desktop)     │
│                                                          │
│  ┌──────────┐ ┌───────────┐ ┌────────────┐ ┌─────────┐ │
│  │Dashboard │ │ IDE       │ │ Orchestr.  │ │ Flows   │ │
│  │(analytics│ │(Monaco    │ │(XY Flow    │ │(Visual  │ │
│  │ overview)│ │ AI Panel) │ │ editor)    │ │ editor) │ │
│  └──────────┘ └───────────┘ └────────────┘ └─────────┘ │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP/REST
┌─────────────────────▼───────────────────────────────────┐
│                    API LAYER                              │
│              Next.js API Routes (27 domínios)            │
│                                                          │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Auth (JWT)     │  │ Rate Limit   │  │ Middleware    │ │
│  └────────────────┘  └──────────────┘  └──────────────┘ │
└───────┬──────────────────┬───────────────────┬──────────┘
        │                  │                   │
┌───────▼──────┐  ┌────────▼───────┐  ┌───────▼──────────┐
│   DATABASE   │  │   AI LAYER     │  │   INTEGRATIONS   │
│              │  │                │  │                   │
│ PostgreSQL   │  │ Groq (Llama)   │  │ Evolution API    │
│ + pgvector   │  │ OpenRouter     │  │ (WhatsApp)       │
│ + Prisma ORM │  │ (Claude, GPT,  │  │                   │
│              │  │  Gemini, etc.) │  │ Telegram Bot     │
│ Redis/       │  │                │  │                   │
│ Upstash      │  │ HuggingFace   │  │ Claude CLI       │
│ (cache)      │  │ (embeddings)   │  │ Opencode CLI     │
└──────────────┘  └────────────────┘  └───────────────────┘
```

## Camadas

### 1. Frontend (`src/app/`, `src/components/`)

- **App Router** com layouts aninhados e server components
- **Dashboard** — Analytics, gerenciamento de agentes, conversas
- **IDE** — Editor Monaco com AI Panel (22 modelos), file tree, terminal
- **Orquestrações** — Editor visual de multi-agentes com XY Flow
- **Flows** — Automações visuais com nós condicionais

### 2. API Layer (`src/app/api/`)

27 domínios separados. Autenticação via JWT em cookie httpOnly.

Domínios principais:
- `agents/` — CRUD de agentes IA
- `conversations/` — Chat, mensagens, tags, takeover
- `orchestrations/` — Criação, execução, streaming
- `flows/` — Editor visual, cron jobs
- `knowledge/` — Knowledge base, upload de docs, RAG
- `webhook/` — Evolution API, Telegram, Instagram

### 3. AI Layer (`src/lib/ai/`)

- **Groq** — Provider principal para modelos rápidos (Llama, DeepSeek Distill, Qwen, Gemma, Mixtral)
- **OpenRouter** — Provider para modelos premium (Claude, GPT, Gemini, DeepSeek V3/R1)
- **Embeddings** — pgvector com HuggingFace ou OpenAI
- **Knowledge Context** — RAG com busca híbrida (vetorial + keyword)
- **ReAct Loop** — Tool calling para agentes coder (filesystem tools)

### 4. Data Layer (`src/lib/`, `prisma/`)

- **Prisma ORM** sobre PostgreSQL
- **pgvector** para embeddings e busca semântica
- **Redis/Upstash** para cache e rate limiting
- **Connection pooling** configurável via env vars

### 5. Integrations (`src/services/`, `src/lib/evolution-service.ts`)

- **Evolution API** — WhatsApp Business (send/receive, instâncias, QR code)
- **Claude CLI** — Execução local do Claude Code
- **Opencode CLI** — Execução local do Opencode (multi-provider)

### 6. Desktop (`src/electron/`)

- **Electron** wrapping da app Next.js
- **Filesystem** — IPC handlers para operações de arquivo
- **Preload** — Bridge seguro entre renderer e main process

## Decisões Técnicas

| Decisão | Motivo |
|---|---|
| Next.js App Router | SSR + API routes no mesmo projeto |
| Groq + OpenRouter | Groq para velocidade, OpenRouter para modelo diversidade |
| pgvector | Busca semântica nativa no PostgreSQL |
| Barrel re-exports em `lib/` | Reorganização sem quebrar 100+ imports |
| Electron + Next.js | Desktop app com toda a stack web |
| XY Flow | Editor visual de grafos React-native |
