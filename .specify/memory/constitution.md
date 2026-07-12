# Polaris IA Constitution
<!-- Plataforma de IA agentica (orquestracao multi-agente / Teams) — Next.js 16 + Prisma + Groq -->

## Core Principles

### I. Ação > Análise (Bias for Execution)
Quando a tarefa é clara, executar imediatamente — sem gastar tempo excessivo lendo/explorando
arquivos. Diante de dúvida genuína sobre o output esperado (formato, escopo, abordagem), perguntar
em 1 linha em vez de queimar tokens explorando. Para tarefas ambíguas (estratégia, criação de
conteúdo, sistemas desconhecidos), descrever a abordagem em 1-2 frases e aguardar confirmação antes
de executar. Debugging começa SEMPRE pelas env vars (ler `.env` relevantes, checar caracteres
especiais `$`/`#`, comentários inline em URLs, host de banco errado) — só depois ir ao código.

### II. Coordinator Intocado — Extensões por Injeção (NON-NEGOTIABLE)
O coordenador de orquestração multi-agente (`runTeam`) é a peça mais crítica e estável do sistema.
Toda nova capacidade de Teams é adicionada por **injeção** — deps no worker, campos opcionais no
body/options, helpers puros e read-side — NUNCA editando o coordinator. O comportamento legado deve
permanecer byte-idêntico quando a nova feature não é acionada. Este princípio sustentou todos os
ciclos (SP1–SP6, V2, V2.1, V2.2) e não é negociável: se uma feature parece exigir mexer no
coordinator, repense o design até caber como injeção.

### III. Migrations Formais Aplicadas no Host Real (NON-NEGOTIABLE)
Toda mudança de schema usa `prisma migrate` (migração formal versionada), nunca `db execute` manual
nem apenas `db push`. O `prisma db push` do runner em standalone Docker falha silenciosamente → a
coluna nova nunca é criada → o client regenerado quebra TODAS as reads da tabela (500). Portanto:
aplicar `prisma migrate deploy` MANUALMENTE no host real do banco ANTES do push — e o host real não
é o do `.env`. Antes de dropar qualquer tabela/coluna em produção: precheck de contagem + inspeção
dos dados reais + backup JSON. Drop de coluna exige o push do schema junto/antes.

### IV. Padrões Não-Negociáveis do Next.js 16 + Type Safety
Bugs recorrentes que travam o build e DEVEM ser verificados, sobretudo após runs de agentes:
(a) route params são `Promise` — `{ params }: { params: Promise<{ id: string }> }` + `await params`;
(b) `getAuthFromRequest()` retorna `JWTPayload` com campo `id`, nunca `userId`;
(c) Prisma somente via singleton `import { prisma } from '@/lib/prisma'` — nunca `new PrismaClient()`;
(d) Groq SDK com lazy init — nunca instanciar no top-level (quebra o build por env var ausente);
(e) `prisma generate` roda antes de `next build`; ops de DB no build envoltas em `(... || echo 'skipped')`.

### V. Segurança e Isolamento Multi-tenant por Padrão
A Polaris é uma plataforma onde clientes criam agentes, montam times e conectam credenciais de
terceiros — isolamento por tenant é a fundação. Toda rota autenticada valida ownership (zero IDOR),
escopada por usuário/Organização/Whitelabel. Credenciais de integrações (providers de IA, MCP
servers, canais, OAuth) são criptografadas em repouso (`src/lib/crypto.ts`) e isoladas por conta.
Webhooks de entrada são fail-closed: validar assinatura, responder rápido + processar async,
deduplicar por id. Segredos nunca em código ou chat; expostos são rotacionados. Exemplo de canal: o
WhatsApp WABA roteia por `metadata.phone_number_id` (`resolveAccount`), valida `X-Hub-Signature-256`
(HMAC com `META_APP_SECRET`) e respeita a janela de 24h (template HSM fora dela) — o mesmo rigor
vale para qualquer canal ou integração.

## Security & Operational Constraints

- **Stack fixa**: Next.js 16 (App Router, RSC-first) + TypeScript + Prisma/PostgreSQL + Groq SDK
  (e multi-provider nos Teams: OpenRouter/Ollama/Anthropic) + Tailwind/shadcn.
- **Núcleo é orquestração multi-agente (Teams)**; agentes (skills/MCP/RAG), workflows, distribuição
  (API/webhooks/marketplace/whitelabel) e canais (Threads, WhatsApp) orbitam em volta.
- **Deploy**: EasyPanel (Docker) em `polarisia.com.br`; `prisma generate` obrigatório antes do build.
- **Dados de cliente / LGPD**: nenhuma operação destrutiva em produção sem precheck + backup.

## Development Workflow

- **Um sprint/feature por sessão**: implementar uma feature por sessão; não avançar automaticamente
  para o próximo item sem instrução explícita. Commits limpos por feature evitam esgotar rate limits
  com contexto acumulado.
- **Push após concluir**: ao fechar uma entrega, commit + push antes de prosseguir.
- **Loop de feedback antes de paralelizar**: feche o gate de build (pre-commit/CI) ANTES de soltar
  agentes em paralelo; 1 task = 1 verde; não paralelizar deploy; não force-approve para fugir de bloqueio.
- **CI gate de testes**: jest roda no CI (não local — OneDrive errno -4094 corrompe node_modules).
  Rotas sensíveis exigem testes de IDOR/auth.
- **Verificação antes de concluir**: nunca alegar conclusão sem evidência; o gate real é E2E
  autenticado em produção (EasyPanel + login).
- **Idioma**: respostas e docs em português; comentários de código e mensagens de commit em inglês.

## Governance

Esta constituição supersede práticas ad-hoc. Os princípios NON-NEGOTIABLE (II — coordinator por
injeção; III — migração formal aplicada no host real) não podem ser violados por conveniência. Toda
spec/plan/PR deve verificar conformidade com estes princípios; complexidade adicional precisa ser
justificada explicitamente. Emendas exigem registro da mudança, justificativa e bump de versão
(semver: MAJOR para remoção/redefinição de princípio, MINOR para novo princípio/seção, PATCH para
ajustes editoriais). Para guia operacional de runtime, o `CLAUDE.md` do projeto é a fonte de verdade.

**Version**: 1.0.0 | **Ratified**: 2026-06-22 | **Last Amended**: 2026-06-22
