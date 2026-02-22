# Sofia AI — Multi-Agent Orchestration Platform

> Build AI agent teams that collaborate to solve complex tasks. More powerful than CrewAI. Simpler than AutoGen.

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.1-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://typescriptlang.org)
[![PostgreSQL + pgvector](https://img.shields.io/badge/PostgreSQL-pgvector-336791)](https://github.com/pgvector/pgvector)
[![Deploy on Vercel](https://img.shields.io/badge/Deploy-Vercel-black)](https://vercel.com)

**[Live Demo](https://sofiaia.roilabs.com.br)** | **[Documentation](#quick-start)** | **[Discord](#community)**

---

## What is Sofia AI?

Sofia is an open-source platform for orchestrating multiple AI agents to work together on complex tasks. Think of it as a visual workflow builder where each "step" is an intelligent agent with a specific role.

**Example pipeline:**
```
User Input → [Researcher Agent] → [Analyst Agent] → [Writer Agent] → Final Output
```

Each agent receives the accumulated context from all previous agents, creating a powerful collaborative intelligence.

---

## Key Features

### Multi-Agent Orchestration
- **Visual pipeline editor** — drag & drop agents, set roles and prompts
- **3 execution strategies**: Sequential (pipeline), Parallel (fan-out), Consensus (voting)
- **Rejection protocol** — agents can reject previous outputs and trigger retries
- **Real-time streaming** with per-agent progress events (SSE)
- **Execution history** with full replay and re-execute from any step

### Knowledge Base with RAG
- **Semantic search** powered by pgvector (real vector similarity, not keyword matching)
- **Hybrid search** — vector similarity + BM25 text ranking combined
- **Multi-format upload**: PDF (pdf-parse), DOCX (mammoth), CSV, TXT, MD, JSON
- **Chunk preview** with semantic search testing UI
- Background vectorization (non-blocking)

### Multi-Model IDE
- Test and compare 50+ models: Groq (Llama), OpenAI, Anthropic, Gemini, DeepSeek
- Real-time streaming with token usage and cost metrics
- Prompt history and session management
- Monaco editor with syntax highlighting

### Unified Inbox
- WhatsApp integration via Evolution API
- Multi-channel: web chat widget, WhatsApp, email (planned)
- AI agents auto-respond with intelligent human escalation
- Conversation history and CRM-like contact management

### Analytics & Observability
- Cost per execution (estimated in USD)
- Token usage per agent step
- Success rate, average duration, execution trends
- Gantt timeline view per execution
- Compare two executions side by side

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16.1 (App Router), React 19 |
| **Language** | TypeScript 5 |
| **Styling** | TailwindCSS 4, Radix UI, shadcn/ui |
| **Database** | PostgreSQL + pgvector (semantic search) |
| **ORM** | Prisma 5 |
| **AI Providers** | Groq SDK, OpenRouter (50+ models), Hugging Face (embeddings) |
| **Messaging** | Evolution API (WhatsApp) |
| **Cache** | Redis / Upstash Redis |
| **Auth** | JWT + bcrypt (custom, no NextAuth) |
| **Deploy** | Vercel (cloud) or Docker (self-hosted) |
| **Visuals** | XY Flow (graph editor), Recharts, Monaco Editor |

---

## Quick Start

### Option 1: Cloud (Vercel)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/JeanZorzetti/sofia-ia)

### Option 2: Self-hosted (Docker)

```bash
# Clone the repository
git clone https://github.com/JeanZorzetti/sofia-ia.git
cd sofia-ia

# Copy environment variables
cp .env.example .env

# Edit .env with your API keys (see Environment Variables section)
nano .env

# Start with Docker Compose
docker compose up -d
```

Open http://localhost:3000

### Option 3: Local Development

```bash
# Prerequisites: Node.js 20+, PostgreSQL 15+ with pgvector, Redis

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Set up database
npx prisma generate
npx prisma db push

# Install pgvector extension (if not already installed)
# In PostgreSQL: CREATE EXTENSION IF NOT EXISTS vector;

# Seed initial data
npx prisma db seed

# Start development server
npm run dev
```

Open http://localhost:3000

---

## Environment Variables

```env
# Database (PostgreSQL + pgvector)
DATABASE_URL=postgresql://user:password@localhost:5432/sofia

# Authentication
JWT_SECRET=your-random-secret-here

# AI Providers (at least one required)
GROQ_API_KEY=gsk_...          # https://console.groq.com
OPENROUTER_API_KEY=sk-or-...  # https://openrouter.ai (50+ models)

# Embeddings (for Knowledge Base RAG)
HUGGINGFACE_API_KEY=hf_...    # https://huggingface.co (free tier available)

# Cache (optional but recommended)
REDIS_URL=redis://localhost:6379
# OR Upstash Redis:
# UPSTASH_REDIS_REST_URL=...
# UPSTASH_REDIS_REST_TOKEN=...

# WhatsApp (optional)
EVOLUTION_API_URL=https://your-evolution-instance.com
EVOLUTION_API_KEY=your-key

# Public URL (for webhooks)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Database Setup

Sofia requires PostgreSQL 15+ with the `pgvector` extension for semantic search.

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- The Prisma schema handles the rest
```

For cloud PostgreSQL, we recommend:
- **Neon** (free tier, supports pgvector)
- **Supabase** (free tier, supports pgvector)
- **Railway** (supports pgvector)

---

## Orchestration Strategies

| Strategy | Description | Best For |
|----------|-------------|----------|
| **Sequential** | Agents run in order; each receives all previous outputs | Writing pipelines, research workflows |
| **Parallel** | All agents run simultaneously with the same input | Getting multiple perspectives, fact-checking |
| **Consensus** | Agents vote; most common answer wins | Classification, decision-making |

---

## Pre-built Templates

| Template | Pipeline | Time |
|----------|----------|------|
| **Marketing Pipeline** | Researcher → Copywriter → Reviewer | ~45s |
| **Support Triage** | Triage → Agent → Escalation | ~30s |
| **Research & Synthesis** | Collector → Analyst → Synthesizer | ~60s |

---

## Architecture

```
sofia-next/
├── src/
│   ├── app/
│   │   ├── api/              # REST API routes
│   │   │   ├── agents/       # Agent CRUD + chat
│   │   │   ├── orchestrations/ # Orchestration CRUD + execute + stream
│   │   │   ├── knowledge/    # Knowledge Base + RAG
│   │   │   ├── conversations/ # Inbox conversations
│   │   │   └── auth/         # Authentication
│   │   ├── dashboard/        # Main app UI
│   │   └── page.tsx          # Landing page
│   ├── components/           # React components
│   │   └── orchestrations/   # Execution live view, history, flow canvas
│   ├── lib/
│   │   ├── ai/               # AI providers (groq, openrouter, embeddings)
│   │   ├── prisma.ts         # Prisma singleton
│   │   └── auth.ts           # JWT auth
│   └── hooks/                # Custom React hooks
├── prisma/
│   └── schema.prisma         # Database schema
├── docker-compose.yml        # Self-hosted setup
└── docs/                     # Architecture docs
```

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Ways to contribute:**
- Bug reports and feature requests via [GitHub Issues](https://github.com/JeanZorzetti/sofia-ia/issues)
- Pull requests for bug fixes and features
- Documentation improvements
- Share your orchestration templates

---

## Roadmap

- [x] Multi-agent orchestration (sequential, parallel, consensus)
- [x] Knowledge Base with pgvector RAG
- [x] Multi-model IDE (Groq, OpenRouter)
- [x] WhatsApp integration
- [x] Execution history with replay
- [x] Analytics dashboard
- [x] PDF/DOCX/CSV support in KB
- [x] Landing page with SEO
- [ ] Stripe billing (Free/Pro/Business)
- [ ] Onboarding wizard
- [ ] API public access
- [ ] Marketplace of community templates
- [ ] Multi-language (EN)

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Made by ROI Labs

Sofia AI is built and maintained by [ROI Labs](https://roilabs.com.br), a Brazilian AI consulting firm.

**Need help deploying or customizing?** [Contact us](mailto:contato@roilabs.com.br)
