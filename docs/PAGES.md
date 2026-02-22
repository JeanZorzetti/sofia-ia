# Sofia AI — Mapa de Páginas

> Documentação de todas as rotas públicas e internas da aplicação.
> Atualizado: Fevereiro 2026

---

## Marketing (público, SSG)

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/` | `src/app/page.tsx` | Landing page principal com hero, features, comparativo, pricing, templates |
| `/features` | `src/app/features/page.tsx` | Hub de funcionalidades com grid de 6 features + 6 extras |
| `/features/orchestrations` | `src/app/features/orchestrations/page.tsx` | Deep dive em orquestração multi-agente |
| `/comparativo` | `src/app/comparativo/page.tsx` | Sofia AI vs CrewAI vs AutoGen vs LangFlow |
| `/preco` | `src/app/preco/page.tsx` | Planos Free / Pro / Business com FAQ |
| `/como-funciona` | `src/app/como-funciona/page.tsx` | Guia passo a passo (5 passos + schema HowTo) |
| `/templates` | `src/app/templates/page.tsx` | Galeria de 9 templates de orquestração |

---

## Blog (SSG via MDX)

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/blog` | `src/app/blog/page.tsx` | Listagem de todos os posts |
| `/blog/[slug]` | `src/app/blog/[slug]/page.tsx` | Post individual com TOC, OG e schema Article |

### Posts disponíveis (`content/blog/`)

| Arquivo | Título |
|---------|--------|
| `o-que-e-orquestracao-de-agentes-ia.mdx` | O que é Orquestração de Agentes IA: Guia Completo |
| `sofia-vs-crewai-vs-autogen-vs-langflow.mdx` | Sofia AI vs CrewAI vs AutoGen vs LangFlow |
| `como-criar-equipe-agentes-ia-sem-codigo.mdx` | Como Criar uma Equipe de Agentes IA sem Código |
| `knowledge-base-com-rag.mdx` | Knowledge Base com RAG: O que é e Como Usar |
| `5-orquestracoes-prontas-para-sua-empresa.mdx` | 5 Orquestrações Prontas para sua Empresa |

---

## Documentação & Recursos

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/documentacao` | `src/app/documentacao/page.tsx` | Hub de documentação com links para todas as seções |
| `/api-reference` | `src/app/api-reference/page.tsx` | Referência da REST API (endpoints, auth, SSE) |
| `/self-hosted` | `src/app/self-hosted/page.tsx` | Guia de instalação com Docker Compose |
| `/changelog` | `src/app/changelog/page.tsx` | Histórico de versões e novidades |
| `/status` | `src/app/status/page.tsx` | Status operacional dos serviços |

---

## Empresa & Legal

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/contato` | `src/app/contato/page.tsx` | Emails de contato, suporte e vendas |
| `/termos` | `src/app/termos/page.tsx` | Termos de Uso (12 seções, LGPD) |
| `/privacidade` | `src/app/privacidade/page.tsx` | Política de Privacidade (LGPD) |

---

## Aplicação (autenticado)

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/login` | `src/app/login/page.tsx` | Tela de login / cadastro |
| `/onboarding` | `src/app/onboarding/page.tsx` | Wizard 4 passos (primeiro acesso) |
| `/dashboard` | `src/app/dashboard/page.tsx` | Dashboard principal |
| `/dashboard/agents` | `src/app/dashboard/agents/` | CRUD de agentes IA |
| `/dashboard/orchestrations` | `src/app/dashboard/orchestrations/` | Editor e execução de orquestrações |
| `/dashboard/orchestrations/history` | `src/app/dashboard/orchestrations/history/` | Histórico de execuções com replay |
| `/dashboard/knowledge` | `src/app/dashboard/knowledge/` | Knowledge Bases e upload |
| `/dashboard/conversations` | `src/app/dashboard/conversations/` | Inbox unificado |
| `/dashboard/billing` | `src/app/dashboard/billing/page.tsx` | Plano, uso e upgrade |
| `/api-docs` | `src/app/api-docs/page.tsx` | Swagger/OpenAPI interno |

---

## API Routes

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/auth/*` | POST | NextAuth — login, registro, logout |
| `/api/agents` | GET/POST | CRUD de agentes |
| `/api/agents/[id]` | GET/PUT/DELETE | Agente individual |
| `/api/orchestrations` | GET/POST | CRUD de orquestrações |
| `/api/orchestrations/[id]/execute` | POST (SSE) | Execução com streaming |
| `/api/orchestrations/executions` | GET | Histórico de execuções |
| `/api/knowledge` | GET/POST | CRUD de KBs |
| `/api/knowledge/[id]/upload` | POST | Upload de documento |
| `/api/knowledge/[id]/chunks` | GET | Chunks vetorizados |
| `/api/billing/checkout` | POST | Criar assinatura Mercado Pago |
| `/api/webhooks/mercadopago` | POST | Webhook de pagamento |
| `/api/onboarding/complete` | POST | Finalizar onboarding |

---

## Arquivos de Sistema

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/sitemap.xml` | `src/app/sitemap.ts` | Sitemap dinâmico (todas as rotas + blog) |
| `/robots.txt` | `src/app/robots.ts` | Configuração de crawlers |

---

## Infraestrutura de Dados

| Lib | Arquivo | Descrição |
|-----|---------|-----------|
| Blog helpers | `src/lib/blog.ts` | `getAllPosts`, `getPostBySlug`, TOC extractor |
| Mercado Pago | `src/lib/mercadopago.ts` | PreApproval, HMAC webhook, mappers |
| Plan limits | `src/lib/plan-limits.ts` | `checkPlanLimit`, `getUsageSummary` |
| Prisma | `src/lib/prisma.ts` | Singleton do PrismaClient |
| Auth | `src/lib/auth.ts` | `getAuthFromRequest` helper |
| Email | `src/lib/email.ts` | Resend REST + template HTML |
