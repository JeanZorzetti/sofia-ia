# 🤖 Sofia — Plataforma de Agentes IA

Plataforma multi-agente para automação de atendimento via WhatsApp, com IDE integrada, orquestrações visuais e knowledge base vetorial.

## Stack

| Camada | Tecnologia |
|---|---|
| **Frontend** | Next.js 16.1 (App Router), React 19, TailwindCSS 4, Radix UI |
| **Backend** | Next.js API Routes, Prisma 5, PostgreSQL + pgvector |
| **Desktop** | Electron 40 |
| **AI** | Groq (Llama 3.3), OpenRouter (Claude, GPT, Gemini, DeepSeek) |
| **Messaging** | Evolution API (WhatsApp), Telegram Bot API |
| **Cache** | Redis / Upstash Redis |
| **Visual** | XY Flow (graph editor), Recharts, Monaco Editor |

## Quick Start

```bash
# 1. Instalar dependências
npm install

# 2. Copiar variáveis de ambiente
cp .env.example .env.local

# 3. Configurar o banco de dados
npx prisma generate
npx prisma db push

# 4. Seed (dados iniciais)
npm run db:seed

# 5. Rodar em modo web
npm run dev

# 6. Rodar em modo desktop (Electron)
npm run dev:desktop
```

Acesse [http://localhost:3000](http://localhost:3000)

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor Next.js (web) |
| `npm run dev:desktop` | Inicia web + Electron |
| `npm run build` | Build de produção (web) |
| `npm run build:desktop` | Build de produção (Electron) |
| `npm run db:seed` | Seed do banco de dados |
| `npm run lint` | Lint com ESLint |
| `npm test` | Testes unitários (Jest) |
| `npm run test:e2e` | Testes E2E (Playwright) |

## Estrutura do Projeto

```
sofia-next/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # 27 domínios de API
│   │   │   ├── agents/         # CRUD de agentes IA
│   │   │   ├── conversations/  # Gerenciamento de conversas
│   │   │   ├── flows/          # Flows visuais
│   │   │   ├── orchestrations/ # Orquestrações multi-agente
│   │   │   ├── knowledge/      # Knowledge base + RAG
│   │   │   ├── templates/      # Templates de agentes
│   │   │   ├── webhook/        # Webhooks (Evolution, Telegram)
│   │   │   └── ...
│   │   └── dashboard/          # 16 páginas do dashboard
│   ├── components/
│   │   ├── ui/                 # Primitivos (shadcn/ui)
│   │   ├── ide/                # IDE integrada
│   │   ├── flows/              # Editor visual de flows
│   │   ├── orchestrations/     # Orquestrações
│   │   ├── dashboard/          # Componentes do dashboard
│   │   └── sofia/              # Navbar, Sidebar
│   ├── lib/
│   │   ├── ai/                 # Providers de IA (Groq, OpenRouter, embeddings)
│   │   ├── flow-engine/        # Motor de execução de flows
│   │   ├── auth.ts             # Autenticação JWT
│   │   ├── prisma.ts           # Cliente Prisma
│   │   └── ...
│   ├── hooks/                  # React hooks customizados
│   ├── services/               # Integrações externas (Claude CLI, APIs)
│   └── electron/               # Electron main/preload
├── prisma/
│   ├── schema.prisma           # Schema do banco
│   └── seed.ts                 # Dados iniciais
├── docs/                       # Documentação técnica
└── public/                     # Assets estáticos
```

## Documentação

- [Arquitetura](docs/architecture.md) — Visão geral da arquitetura e decisões técnicas
- [Referência de API](docs/api-reference.md) — Endpoints, autenticação, payloads
- [Modelos de IA](docs/ai-models.md) — Providers e modelos disponíveis
- [Roadmap de Orquestrações](docs/orchestrations-roadmap.md) — Plano de desenvolvimento

## Variáveis de Ambiente

Veja [`.env.example`](.env.example) para todas as variáveis necessárias.

As essenciais são:
- `DATABASE_URL` — PostgreSQL com pgvector
- `GROQ_API_KEY` — Para modelos Llama/DeepSeek
- `OPENROUTER_API_KEY` — Para Claude/GPT/Gemini
- `JWT_SECRET` — Segredo para tokens JWT
