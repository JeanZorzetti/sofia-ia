# Divida Tecnica & Infraestrutura — V3

> Corrigir o que pode quebrar antes de escalar. Nao refatorar por refatorar.

---

## Prioridade de correcao: apenas o que bloqueia crescimento ou gera risco.

---

## 1. Security (P0 — corrigir imediatamente)

### 1.1 Credenciais Hardcoded em auth.ts
**Arquivo:** `src/lib/auth.ts`
**Problema:** Fallback users com senha visivel no codigo:
```typescript
// admin@sofia.ai / SofiaAI2024#Admin
// sofia@sofia.ai / SofiaAI2024#Admin
```
**Risco:** Qualquer pessoa que leia o repo publico tem acesso admin.
**Fix:** Remover fallback users completamente. Usar seed script para criar admin inicial via env var.

### 1.2 JWT Secret
**Arquivo:** `src/lib/auth.ts`
**Verificar:** JWT_SECRET vem de env var? Tem rotacao?
**Fix:** Confirmar que JWT_SECRET e forte (32+ chars), documentar processo de rotacao.

### 1.3 API Keys em Plaintext
**Verificar:** API keys dos usuarios sao armazenadas em hash ou plaintext?
**Fix:** Se plaintext → migrar para bcrypt hash (mostrar key apenas na criacao).

---

## 2. Testing (P1 — antes de escalar)

### Estado Atual
- 6 testes unitarios (health, agents, crm-lead, knowledge, embeddings, groq)
- 3 specs E2E (dashboard, landing, login)
- Cobertura estimada: < 5%

### Testes Criticos Faltando
| Area | Arquivo(s) | Prioridade | Justificativa |
|------|-----------|------------|---------------|
| Billing flow | `/api/billing/checkout`, `/api/webhooks/mercadopago` | P0 | Dinheiro real |
| Auth flow | `/api/auth/login`, `/api/auth/register`, `middleware.ts` | P0 | Seguranca |
| Plan limits | `lib/plan-limits.ts` | P0 | Enforcement de limites |
| Orchestration execution | `/api/orchestrations/[id]/execute` | P1 | Core feature |
| API v1 | `/api/v1/*` | P1 | Contratos com integradores |
| Knowledge RAG | `lib/ai/knowledge-context.ts` | P1 | Qualidade da IA |
| Webhooks dispatch | `lib/webhooks.ts` | P2 | Confiabilidade |
| SSO flow | `/api/auth/sso/*` | P2 | Enterprise feature |

### Estrategia de Testes V3
- **Nao** buscar cobertura 100% — buscar cobertura nos **fluxos de dinheiro e seguranca**
- Testes de integracao > testes unitarios (testar fluxos reais)
- E2E para os 5 happy paths mais criticos:
  1. Signup → Login → Create Agent → Execute Orchestration
  2. Signup → Upgrade to Pro → Verify limits expanded
  3. Create KB → Upload PDF → Query RAG
  4. API key → Execute orchestration via API v1
  5. Invite team member → Accept → Access org resources

---

## 3. Observability (P1 — essencial para growth)

### Estado Atual
- Sentry configurado (client, server, edge)
- `/admin/metrics` basico (signups, planos, MRR estimado)
- `analytics-collector.ts` basico
- Sem alertas automatizados

### O que Falta

#### 3.1 Alertas Sentry
```
- Alert: Error rate > 5% em 5 min → Slack/Email
- Alert: API p95 > 2s em 10 min → Slack/Email
- Alert: Zero signups em 24h → Email (canary)
- Alert: Billing webhook failed → Email imediato
```

#### 3.2 Health Dashboard Expandido
O `/admin/metrics` precisa de:
- Grafico de signups (diario, ultimos 30 dias)
- Grafico de MRR (mensal, ultimos 6 meses)
- Funil de conversao (visit → signup → active → paid)
- Tabela de usuarios recentes (nome, plano, ultimo login, orquestracoes)
- Uptime e error rate das ultimas 24h

#### 3.3 Database Monitoring
- Query time p95 (Prisma query events)
- Connection pool usage
- Tabela de tamanho das maiores tabelas
- pgvector index performance

#### 3.4 AI Provider Monitoring
- Groq: latency, error rate, token usage
- OpenRouter: latency, error rate, cost per request
- Fallback triggered count (Groq → OpenRouter → fallback)

---

## 4. Performance (P2 — otimizar quando houver usuarios)

### 4.1 Database
- **Verificar indexes:** Todas as queries de listagem usam index?
- **N+1 queries:** Prisma `include` vs `select` — verificar rotas de listagem
- **Connection pooling:** PgBouncer ou Prisma Accelerate quando > 50 concurrent users

### 4.2 Caching
- Redis ja configurado (Upstash)
- **Candidatos a cache:**
  - Lista de templates (cache 1h)
  - Lista de modelos disponíveis (cache 1h)
  - Plan limits do usuario (cache 5 min)
  - Landing page DB queries (ISR revalidate 60s)

### 4.3 Bundle Size
- Verificar com `next/bundle-analyzer`
- Monaco Editor e pesado — lazy load no dashboard
- Framer Motion — tree-shake (importar apenas `motion` components)
- Recharts — lazy load nos graficos

### 4.4 Image Optimization
- OG images ja usam `next/og` (bom)
- Verificar se todas as imagens usam `next/image`
- CDN para assets estaticos (Vercel ja faz)

---

## 5. Code Quality (P2 — quando houver time)

### 5.1 Arquivos Grandes Restantes
| Arquivo | LOC | Acao |
|---------|-----|------|
| `lib/ai/groq.ts` | 500+ | Contem TUDO: chatWithSofia, chatWithAgent, delegation, plugins, memory, RAG. Decomposition em modulos. |
| `prisma/schema.prisma` | 1200+ | OK para Prisma, mas documentar com comentarios por dominio |
| `middleware.ts` | 100+ | OK, limpo |

### 5.2 Dead Code
- `src/electron/` — usado? Se nao, remover
- `src/contexts/DesktopContext.tsx` — usado? Se nao, remover
- `src/services/claude-cli-service.ts` + `opencode-cli-service.ts` — verificar uso

### 5.3 TypeScript Strictness
- `strict: true` no tsconfig?
- Verificar `any` types em rotas de API
- Verificar `unknown` casts (ex: `as unknown as AgentStep[]`)

---

## 6. Infraestrutura (P2 — quando escalar)

### 6.1 Database
- **Atual:** PostgreSQL em easypanel (single instance)
- **Risco:** Single point of failure, sem backup automatizado
- **Fix Mes 3:** Backup diario automatizado (ja tem GitHub Action, verificar se roda)
- **Fix Mes 6:** Considerar managed DB (Supabase, Neon, Railway) para HA

### 6.2 Redis
- **Atual:** Upstash (serverless, bom para escala)
- **Status:** OK, nao precisa de mudanca imediata

### 6.3 AI Providers
- **Atual:** Groq (primary) + OpenRouter (fallback)
- **Risco:** Groq muda pricing ou limita free tier
- **Mitigacao:** Multi-provider ja implementado. Monitorar custos.

### 6.4 Vercel
- **Atual:** Deploy em Vercel (free/hobby?)
- **Verificar:** Limites de serverless function execution time
- **Fix se necessario:** Upgrade para Vercel Pro ($20/mes) quando > 100 users

---

## 7. Prioridade de Execucao

### Sprint 1 V3 (imediato)
1. Remover credenciais hardcoded de auth.ts
2. Verificar API key storage (hash vs plaintext)
3. Configurar alertas Sentry basicos

### Sprint 2 V3
4. Testes de billing flow (checkout + webhook MercadoPago)
5. Testes de auth flow (login, register, middleware)
6. Expandir /admin/metrics com graficos de funil

### Sprint 3-4 V3
7. Testes de orchestration execution
8. AI provider monitoring
9. Database monitoring basico

### Backlog (quando necessario)
10. Bundle analysis + lazy loading
11. groq.ts decomposition
12. Dead code cleanup
13. DB migration para managed service
