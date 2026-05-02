# Debug Runbook — Polaris IA

Use este runbook com a skill `/debug [sintoma]`. Seguir as etapas em ordem. Parar ao encontrar o problema.

---

## Env Vars críticas (checar primeiro)

| Variável | Gotcha conhecido |
|----------|-----------------|
| `DATABASE_URL` | Deve apontar para `31.97.23.166:5499` em produção — **não** para localhost ou homologação |
| `GROQ_API_KEY` | Começa com `gsk_` — checar se não foi truncada ou tem `$` não escapado |
| `EVOLUTION_API_URL` | Sem barra no final (`/`). Checar se a instância Evolution está rodando |
| `EVOLUTION_API_KEY` | Checar caracteres especiais |
| `JWT_SECRET` | Se alterado em produção sem recriar sessões, todos os JWTs existentes invalidam |
| `REDIS_URL` / `UPSTASH_*` | Se Redis estiver down, sessões e cache falham silenciosamente |
| `NEXT_PUBLIC_APP_URL` | Deve ser `https://polarisia.com.br` em produção |
| `SIRIUS_API_URL` / `SIRIUS_API_KEY` | Necessários para integração AgaaS com CRM |

**Checar no `.env.production` ou nas variáveis de ambiente do Vercel.**

---

## Endpoints críticos para health check

```bash
# Health geral
curl -s https://polarisia.com.br/api/health

# Auth
curl -s -o /dev/null -w "%{http_code}" https://polarisia.com.br/api/auth/me

# WhatsApp / Evolution
curl -s -o /dev/null -w "%{http_code}" https://polarisia.com.br/api/instances

# Webhook receiver
curl -s -o /dev/null -w "%{http_code}" https://polarisia.com.br/api/webhooks
```

---

## Sequência de diagnóstico

### Etapa 1 — Env vars
- Ler vars acima e checar gotchas da tabela
- **Se DATABASE_URL errada: corrigir no Vercel → redeploy → parar aqui**

### Etapa 2 — Banco de dados
```bash
npx prisma migrate status          # Ver migrations pendentes
npx prisma db pull                 # Comparar schema real vs schema.prisma
```
- Se houver migration pendente: `npx prisma migrate deploy`
- **Se schema diverge: rodar migration → parar aqui**

### Etapa 3 — Commits recentes
```bash
git log --oneline -10
```
- Identificar o commit que pode ter introduzido o bug
- Checar diff: `git show <hash>`

### Etapa 4 — Padrões de bug recorrentes

**Bug: params não resolvido / erro de build**
```ts
// Checar route handlers — devem usar await params:
const { id } = await params  // CORRETO para Next.js 16
```

**Bug: auth retorna undefined**
```ts
// getAuthFromRequest() retorna JWTPayload com campo 'id', não 'userId'
auth.id      // CORRETO
auth.userId  // ERRADO — não existe
```

**Bug: Groq lança erro no build (não em runtime)**
```ts
// Verificar se há instância Groq no top-level de algum arquivo
// Deve ser lazy init — ver src/lib/ai/ para o padrão correto
```

**Bug: Evolution API retorna shape inesperado**
```ts
// API retorna { success, data: [...] } — não { instances: [...] }
// Status: 'open' = connected, 'close' = disconnected
```

### Etapa 5 — Propor fix
Só aqui, após descartar etapas 1-4, propor correção de código com nível de confiança.

---

## Estrutura de rotas API (para referência rápida)

```
/api/health          → status do sistema
/api/auth/*          → autenticação JWT
/api/instances/*     → instâncias WhatsApp (Evolution API)
/api/agents/*        → agentes IA
/api/conversations/* → histórico de conversas
/api/whatsapp/*      → mensagens WhatsApp
/api/billing/*       → planos e pagamentos
/api/webhooks/*      → recebimento de eventos externos
/api/cron/*          → jobs agendados (protegidos por CRON_SECRET)
/api/admin/*         → painel administrativo
```
