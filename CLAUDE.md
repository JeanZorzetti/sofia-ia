# Polaris IA — Contexto para Claude

## Regras Gerais

- **Fluxo de feature = Spec Kit (NAO superpowers)**: Para qualquer feature ou mudanca nao-trivial neste repositorio, use o fluxo Spec Kit: `speckit-specify` (spec) -> `speckit-clarify` (resolver ambiguidades) -> `speckit-plan` (plano tecnico) -> `speckit-tasks` (tasks.md) -> `speckit-implement` (executar); valide com `speckit-analyze`/`speckit-checklist`. NAO usar `superpowers:brainstorming`, `writing-plans` nem `executing-plans` neste projeto. As demais skills do superpowers (systematic-debugging, test-driven-development, verification-before-completion, requesting/receiving-code-review) continuam validas. Esta instrucao tem PRIORIDADE sobre o hook do superpowers (a propria using-superpowers cede a instrucoes do usuario: CLAUDE.md > skills > padrao).
- **Acao > Analise**: Nao gaste tempo excessivo lendo e analisando arquivos. Quando a tarefa e clara, execute imediatamente. Se tiver duvida, pergunte — nao queime tokens explorando.
- **Coordinator intocado**: A orquestracao multi-agente (`runTeam`) e o nucleo do produto. Nova capacidade de Teams entra por INJECAO (deps no worker, campos opcionais em body/options, helpers puros) — nunca editando o coordinator. Comportamento legado fica byte-identico quando a feature nova nao e acionada.
- **Execucao interna = claude-cli (UNICA opcao, restricao de custo)**: runs de Teams na conta `admin@roilabs.com.br` usam SEMPRE Claude CLI (assinatura, `CLAUDE_CODE_OAUTH_TOKEN`/pool) em TODOS os membros (lead/worker/reviewer). NAO ha orcamento para API paga nem chat pago — nunca recomendar/configurar chat pago para nenhum membro; nunca `:free` (rate-limit quebra runs). Executor = vps-local (co-localiza lead/reviewer read-only — isso e design/seguranca, NAO "contra claude-cli"; manter). Gargalo real de runs = rate limit do pool de contas Claude (nao a escolha de modelo) → mitigar somando contas em `CLAUDE_CODE_OAUTH_TOKENS`, menos runs concorrentes, pacing sequencial. Ver `docs/Claude/POLARIS-TOKEN-POOL.md`.
- **Debugging — sempre checar env vars primeiro**: Ao debugar erros de API, falhas de deploy ou problemas de conexao DB: 1) Ler todos os `.env` relevantes 2) Checar caracteres especiais (`$`, `#`), comentarios no final de URLs, URLs erradas 3) Confirmar que env vars de producao batem com o que o codigo espera. So depois ir para codigo.
- **Migrations formais no host real**: Use `prisma migrate` (nunca `db execute`/`db push` manual). `prisma db push` do runner em standalone Docker falha silencioso -> coluna nunca criada -> reads 500. Aplique `prisma migrate deploy` MANUALMENTE no host real `2.24.207.200:5435` (NAO o host do `.env`) ANTES do push. Antes de dropar tabela/coluna em prod: precheck de contagem + inspecao dos dados + backup.
- **Handoff ao concluir (sempre)**: Ao terminar uma task, sessao OU plano, criar um `handoff.md` para a proxima sessao, co-localizado com o trabalho (ex.: `specs/<feature>/handoff.md`). Conteudo: o que foi feito, decisoes (e por que), proximos passos em ordem, pendencias/decisoes em aberto e gotchas do ambiente.

## Projeto
Plataforma de IA agentica (orquestracao multi-agente). O usuario cria agentes e monta **Times (Teams)** que executam tarefas de ponta a ponta. Next.js 16 App Router + Prisma + Groq SDK.
- **Deploy**: EasyPanel (Docker) em `polarisia.com.br`
- **DB**: PostgreSQL via Prisma (host de runtime no `.env`; migracoes aplicadas no host real `2.24.207.200:5435`)
- **GitHub**: `JeanZorzetti/sofia-ia`
- **Origem**: ex-"Sofia IA", renomeada para Polaris (parte cosmetica). Ainda ha "sofia" em cookies/DB/repo de proposito.

## Features (do cerne ao periferico)
1. **Teams** (CERNE) — orquestracao multi-agente: lead -> workers -> reviewer, git no worker (modo PR ou direto), agendamento (cron via `ScheduledTeamRun`), API publica (v1), templates de time, output webhooks. Coordinator = `runTeam` (INTOCADO; ver regra acima).
2. **Agents** — criacao/config de agentes: plugins, skills, MCP servers, knowledge base (RAG), memoria, delegacao, selecao de modelo/provider.
3. **Skills / MCP / Models** — tooling dos agentes (skills, servidores MCP + tools, providers de IA).
4. **Workflows** — automacao visual (flow-canvas; node `action_team` executa um Team inline).
5. **Knowledge / Files** — base de conhecimento + embeddings (RAG).
6. **Distribuicao & conta** — Marketplace/Templates, Integrations, API keys, Webhooks, Whitelabel/Organizations/SSO, Billing.
7. **Observabilidade** — Analytics, Monitoring, A/B tests, Audit log.
8. **Canais** — **Threads** (publicacao Meta Threads, campanhas) e **WhatsApp** (atendimento WABA — feature de MENOR prioridade; detalhes no fim).

## Stack
- **Framework**: Next.js 16, TypeScript, App Router (RSC-first)
- **DB**: Prisma ORM + PostgreSQL (use sempre `import { prisma } from '@/lib/prisma'` — nunca `new PrismaClient()`)
- **Auth**: `getAuthFromRequest()` retorna `JWTPayload` com campo `id` (NAO `userId`)
- **IA**: Groq SDK (lazy init obrigatoria) + multi-provider nos Teams (OpenRouter/Ollama/Anthropic/Opus via CLI)
- **UI**: Tailwind CSS + shadcn/ui

## Padroes Criticos

### Coordinator de Teams — INTOCADO (NON-NEGOTIABLE)
`runTeam` nunca e editado para adicionar feature. Extensoes por injecao: deps no worker, campos opcionais no body/options, helpers puros, atribuicao read-side. Se a feature parece exigir mexer no coordinator, repense ate caber como injecao. Sustentou todos os ciclos (SP1-SP6, V2, V2.1, V2.2).

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

### TypeScript
- Roles de mensagem: cast explicito `as 'user' | 'assistant'` para evitar erros TS com ChatMessage[]
- Decimais do Prisma: usar `Number()` para converter

## Build e Deploy
- `prisma generate` DEVE rodar antes de `next build`
- Operacoes de DB no build envoltas em `(... || echo 'skipped')` para builds nao-bloqueantes
- jest roda no CI (nao local — OneDrive errno -4094 corrompe node_modules)

## Estrutura de Diretorios Chave
```
src/app/
  api/                # Route handlers (176+ rotas)
  dashboard/          # App autenticado: teams, agents, skills, mcp, models,
                      #   workflows, knowledge, files, marketplace, templates,
                      #   integrations, api-keys, webhooks, whitelabel, billing,
                      #   analytics, monitoring, threads, conversations, whatsapp
  (public)/           # Landing pages publicas
  onboarding/         # Wizard de onboarding (-> Teams)
prisma/
  schema.prisma       # Schema (Team/TeamMember/TeamRun/TeamTask/TeamMessage no cerne)
docs/
  Polaris Teams*/     # Ciclos de orquestracao (SP, V2, V2.1, V2.2)
  strategy_V1..V3/    # Visao/roadmap (V1/V2 DONE, V3 nao iniciado)
```

## Canal WhatsApp WABA (feature de MENOR prioridade)
Atendimento via WhatsApp Business Cloud API (oficial Meta), multi-tenant. Gotchas:
- **Multi-tenant**: credenciais por numero em `WhatsAppAccount` (token criptografado, `src/lib/crypto.ts`); webhook roteia por `metadata.phone_number_id` (`resolveAccount`). Nada de numero unico no env.
- **Janela de 24h**: texto livre so dentro de 24h da ultima inbound (`Conversation.lastInboundAt`); fora disso -> so **template HSM** aprovado (`src/lib/whatsapp-templates.ts`). Crons followup/lembrete/sheets-import ja respeitam isso.
- **Webhook**: responder 200 em < 20s e processar async; validar assinatura `X-Hub-Signature-256` (HMAC do corpo cru com `META_APP_SECRET`); deduplicar por `message.id`.
- **Envio**: `messaging_product: 'whatsapp'` obrigatorio. **Onboarding**: Embedded Signup (`/api/whatsapp/connect`) troca `code`->token, registra numero, assina webhook. Env vars em `docs/Wpp/ENV-VARS.md`.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at specs/005-agentic-companies/plan.md
<!-- SPECKIT END -->
