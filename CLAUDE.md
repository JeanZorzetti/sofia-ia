# Polaris IA — Contexto para Claude

## Regras Gerais

- **Acao > Analise**: Nao gaste tempo excessivo lendo e analisando arquivos. Quando a tarefa e clara, execute imediatamente. Se tiver duvida, pergunte — nao queime tokens explorando.
- **Debugging — sempre checar env vars primeiro**: Ao debugar erros de API, falhas de deploy ou problemas de conexao DB: 1) Ler todos os `.env` relevantes 2) Checar caracteres especiais (`$`, `#`), comentarios no final de URLs, URLs erradas 3) Confirmar que env vars de producao batem com o que o codigo espera. So depois ir para codigo.
- **Migrations formais**: Sempre use `prisma migrate` em vez de `db execute` manual. Alteracoes manuais causam bugs em producao quando campos ficam faltando.

## Projeto
SaaS de IA para atendimento WhatsApp. Next.js 16 App Router + Prisma + Groq SDK.
- **Deploy**: EasyPanel (Docker) em `polarisia.com.br`
- **DB**: PostgreSQL via Prisma (host: `31.97.23.166:5499`)
- **GitHub**: `JeanZorzetti/sofia-ia`

## Stack
- **Framework**: Next.js 16, TypeScript, App Router (RSC-first)
- **DB**: Prisma ORM + PostgreSQL (use sempre `import { prisma } from '@/lib/prisma'` — nunca `new PrismaClient()`)
- **Auth**: `getAuthFromRequest()` retorna `JWTPayload` com campo `id` (NAO `userId`)
- **IA**: Groq SDK (lazy init obrigatoria — nao instanciar no top-level para evitar erro de env var no build)
- **WhatsApp**: Evolution API
- **UI**: Tailwind CSS + shadcn/ui

## Padroes Criticos

### Next.js 16 — Params assincronos (BUG RECORRENTE)
```ts
// CORRETO — params sao Promise no Next.js 16
{ params }: { params: Promise<{ id: string }> }
const { id } = await params;

// ERRADO — causa erro de build
{ params }: { params: { id: string } }
```
Background agents (Sonnet) erram isso consistentemente. Sempre verificar apos agent runs.

### Auth — JWTPayload (BUG RECORRENTE)
```ts
const auth = await getAuthFromRequest(request)
auth.id      // CORRETO
auth.userId  // ERRADO — nao existe, causa erro TS
```

### Groq SDK — Lazy Init
```ts
// CORRETO — lazy init
let groqClient: Groq | null = null;
function getGroq() {
  if (!groqClient) groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groqClient;
}

// ERRADO — quebra no build (env var nao disponivel)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
```

### Evolution API — Shape dos dados
- API retorna `{ success, data: [...] }` e NAO `{ instances: [...] }`
- Mapeamento de status: `open` -> `connected`, `close` -> `disconnected`
- Criacao de instancia: enviar `{ instanceName }` e NAO `{ name }`

### TypeScript
- Roles de mensagem: cast explicito `as 'user' | 'assistant'` para evitar erros TS com ChatMessage[]
- Decimais do Prisma: usar `Number()` para converter

## Build e Deploy (Vercel)

- `prisma generate` DEVE rodar antes de `next build`
- Operacoes de DB no build envoltas em `(... || echo 'skipped')` para builds nao-bloqueantes
- Verificar `vercel.json` para configuracoes de regiao (`gru1`) e crons

## Estrutura de Diretorios Chave
```
src/app/
  api/                # Route handlers (176+ rotas)
  dashboard/          # App autenticado
  (marketing)/        # Landing pages publicas
prisma/
  schema.prisma       # Schema do banco
  seed.ts             # Seed data
docs/
  strategy_V1/        # Visao de produto, roadmap 19 sprints (DONE)
  strategy_V2/        # UI/UX overhaul, 8 sprints (DONE)
  strategy_V3/        # Growth & Revenue, 8 sprints (NAO INICIADO)
```
