Refatoração faseada — sofia-next (Polaris IA)
Context
sofia-next é um SaaS multi-tenant de IA para atendimento WhatsApp em produção (EasyPanel/Docker, polarisia.com.br), com ~522 arquivos TS, 219 rotas de API e 60 modelos Prisma. Acabou de concluir uma migração grande ("Orquestrações → Teams") e acumulou dívida nas quatro dimensões: segurança, arquitetura, performance e qualidade.

Uma auditoria com 3 agentes + verificação manual dos arquivos críticos encontrou vulnerabilidades CRÍTICAS exploráveis agora (IDOR entre contas, JWT_SECRET com fallback público, cron secret fraco). Como é multi-tenant em produção, isso é o item de maior impacto e abre o roadmap.

Objetivo: refatorar de forma faseada e priorizada por impacto, executando 1 sprint por sessão (regra do usuário) com commit+push limpo por sprint. Decisão de produto confirmada: autorização por dono (createdBy/userId === auth.id), com role === 'admin' contornando.

⚠️ Disciplina de migração (lição registrada): o standalone do Next não aplica prisma db push/migrações no deploy. Toda alteração de schema (índices, remoção de modelo) exige migração formal prisma migrate + migrate deploy manual no host real de produção ANTES do push. Confirmar o host correto antes de aplicar (CLAUDE.md do projeto cita 31.97.23.166:5499; migrações recentes de Teams usaram 2.24.207.200:5435 — verificar qual é o de produção atual).

Sprint 0 — Segurança P0 (URGENTE, primeiro) 🔴 ✅ DONE + pushed main (commit 36e91a6, 2026-06-16)
Fechar o que é explorável hoje. Sem mudança de schema (não bloqueia em migração).
[STATUS] Entregue: src/lib/authz.ts (ownerId/isAdmin/verifyCronAuth), JWT_SECRET fail-closed, IDOR fechado em ~25 rotas, users/templates admin-only, listagens agents/ab-tests filtradas, 8 crons migrados, 2 testes de regressão. Precondição de deploy: JWT_SECRET/CRON_SECRET setados no EasyPanel. E2E autenticado pendente. Próximo: Sprint 1 (ver docs/Refatoração/Sessão 2.md).

0.1 — Corrigir IDOR (autorização por dono) — núcleo do sprint
As rotas [id] buscam recursos só por where: { id }, sem filtro de dono. Confirmado em:

src/app/api/agents/[id]/route.ts — GET/PUT/DELETE (campo dono: createdBy)
src/app/api/integrations/[id]/route.ts — GET/PUT/DELETE (campo dono: userId); DELETE nem checa existência
src/app/api/knowledge/[id]/route.ts — GET/PUT/DELETE (campo dono: createdBy)
src/app/api/knowledge/[id]/documents/[documentId]/route.ts — atualiza/deleta por documentId sem validar dono da KB
Abordagem (reutilizável): criar src/lib/authz.ts com um helper único, ex.:

// retorna o recurso se o usuário for dono OU admin; senão null (→ 404, não 403, para não vazar existência)
async function authorizeOwnership<T>(opts: { model, id, ownerField, auth })
Aplicar o filtro de dono na própria query (where: { id, [ownerField]: auth.id }) quando auth.role !== 'admin', em vez de buscar e comparar depois (evita TOCTOU e simplifica). Admin (role === 'admin') pula o filtro.

Varredura obrigatória: os 3 arquivos acima são os confirmados, mas o padrão se repete. Fazer grep por findUnique({ where: { id } / .update({ where: { id } / .delete({ where: { id } em todo src/app/api/**/[id]/** e auditar cada um: flows, teams, agent-folders, ab-tests, schedules, conversations, etc. Corrigir todos os que têm campo de dono.

0.2 — Filtrar listagens por dono
src/app/api/agents/route.ts (GET) retorna agentes de todos os usuários. Adicionar where: { createdBy: auth.id } (admin vê tudo). Auditar as outras rotas de listagem (/api/flows, /api/knowledge, /api/integrations, etc.) com o mesmo critério.

0.3 — JWT_SECRET fail-closed
src/lib/auth.ts:11-13: hoje cai num segredo público hardcoded se a env var faltar (só loga warning em prod). Mudar para lançar erro / recusar assinar quando JWT_SECRET ausente em produção. Manter fallback só em NODE_ENV !== 'production'.

0.4 — Cron secret timing-safe + fail-closed
Rotas src/app/api/cron/** usam authHeader !== \Bearer ${CRON_SECRET}`(não timing-safe) com fallback'sofia-cron-secret-2026'. Criar helper verifyCronAuth(req)emsrc/lib/authz.tsusandocrypto.timingSafeEqual`, exigindo a env var (sem fallback em prod). Aplicar em todas as rotas de cron.

0.5 — Rotação de segredos (ação do usuário + checklist)
Confirmar .env/.env.local fora do git (estão), e rotacionar os segredos expostos em chat/docs: JWT_SECRET, CRON_SECRET, DATABASE_URL (senha), GROQ_API_KEY, OPENROUTER_API_KEY, chaves API sk_live_*. Entregar como checklist no fim do sprint (parte é ação manual no EasyPanel).

Verificação Sprint 0: escrever 1 teste de regressão por padrão de IDOR (usuário A não acessa recurso de B → 404; admin acessa); npm run build + tsc limpos; revisar diff de cada rota tocada (não pode haver auth.userId, params devem ser Promise + await).

Sprint 1 — Arquitetura: consistência de auth, resposta e validação 🟠 ✅ DONE (2026-06-16)
[STATUS] Entregue (sem schema/migração): withAuth() HOF (src/lib/with-auth.ts) com onUnauthorized opcional p/ preservar envelopes; helpers apiOk/apiError (src/lib/api-response.ts, criados mas SEM migrar rotas — escolha do usuário); zod (src/lib/validation.ts: parseJson + schemas) aplicado em auth(login/register), agents(POST/PUT), teams(POST/PATCH); rate-limit consolidado num módulo único com interface RateLimitStore (CacheStore/MemoryStore), rate-limit-redis.ts deletado; api-key consolidado em api-key-auth.ts (api-key.ts deletado), backfill lazy de keyHash + criação popula keyHash. 8 rotas migradas p/ withAuth (agents/teams/flows/knowledge, route+[id]). 4 arquivos de teste novos. tsc limpo (só 7 erros pré-existentes de deps opcionais). ⚠️ Fallback plaintext de api-key NÃO removido (quebraria chaves legadas sem keyHash) — remoção diferida p/ pós-backfill (ver Sessão 3). E2E autenticado em prod pendente. Próximo: Sprint 2 (Performance DB, TEM migração — ver docs/Refatoração/Sessão 3.md).

Tirar boilerplate e padronizar. Reaproveita o authz.ts do Sprint 0.

withAuth() HOF: wrapper que injeta auth e devolve 401 automático, eliminando o bloco getAuthFromRequest + null-check repetido em ~155 rotas. Migrar incrementalmente (grupos mais usados primeiro: agents, teams, flows, knowledge).
Envelope de resposta único: padronizar em { success, data, error } (já é maioria — 134 rotas; 45 usam { data, error }). Criar helpers apiOk(data)/apiError(msg, status). Não reescrever as 219 de uma vez — definir o padrão + helpers + converter por grupo.
Validação de input (zod): introduzir schemas nas rotas mutadoras (começar por auth, agents, teams). Hoje a maioria confia em request.json() cru.
Consolidar rate-limit: src/lib/rate-limit.ts (in-memory, 134 usos) vs src/lib/rate-limit-redis.ts (Redis, 1 uso). Unificar numa interface com adapter; remover a duplicata.
Consolidar auth de API-key: duas funções (api-key-auth.ts e api-key.ts) + fallback de comparação de chave em plaintext (legado). Unificar e remover o fallback plaintext.
Sprint 2 — Performance: banco de dados 🟡 ✅ DONE (2026-06-16) — código commitado; migração de índices aplicada manual no host de prod ANTES do push (ver disciplina).
Maior ganho confirmado por agente; exige migração (ver disciplina acima).

[STATUS] Entregue:
- N+1 em analytics: agents/workflows reescritos com queries em lote (groupBy/findMany distinct/_avg). Helper puro novo src/lib/analytics/aggregate.ts (countByKey/nestedCount/responseTimeByAgent/rate/round2) + testes (src/__tests__/lib/analytics/aggregate.test.ts). Forma de resposta e números preservados byte-a-byte. ~6N/~5N queries → fixo (≈7/≈4) independente de N.
- Streaming team run: poll passou a buscar run+tasks com select estreito e SÓ mensagens novas (findMany teamMessage skip:lastMsgCount, ordem estável createdAt+id) em vez de incluir TODAS as mensagens por tick. Coordinator/SSE intocados.
- Batch lookups ab-tests GET: 3 queries/teste → 1 findMany agents in[...] + Map de nomes.
- ISR: src/app/(public)/marketplace/page.tsx ganhou revalidate=3600 (catálogo público, sem dado por-usuário; antes era estática implícita congelada no fallback de build). Rotas de analytics NÃO viraram ISR (autenticadas/por-usuário).
- Índices (migração 20260616140000_add_performance_indexes): leads(assigned_to), agents(knowledge_base_id), team_tasks(assignee_id), conversations(agent_id,status), messages(conversation_id,sent_at). Verificado contra o schema (nenhum já existia) e nomes batem com o que o Prisma gera (migrate diff from-empty). Índices NÃO alteram o client → push sem aplicar não quebra (só fica sem o ganho).
tsc limpo (só os 7 erros pré-existentes de deps opcionais). jest não roda local (OneDrive). E2E autenticado em prod pendente.
Sprint 3 — Performance: bundle e rendering 🟡
next.config: adicionar optimizePackageImports (recharts, framer-motion, react-syntax-highlighter) + alias de polyfill-module para vazio (problema conhecido da org: Next embute core-js ignorando browserslist).
Code-split libs pesadas client-only via dynamic(import()): @monaco-editor/react, @xterm/xterm, diff2html, recharts.
Avaliar remoção do framer-motion (13 usos) → CSS/tailwindcss-motion já instalado.
RSC: mover data-fetching de páginas de dashboard de useEffect+fetch para server components + Suspense nos casos de maior valor (página inicial do dashboard).
Sprint 4 — Dívida técnica e hardening 🟢
Modelos órfãos: verificar um a um (não a lista do agente — ScheduledTeamRun está em uso). Para cada modelo sem nenhum prisma.<model> em src/, fazer backup JSON + checar dados em prod (lição 6g: "precheck de contagem antes de dropar") + migração de drop.
Security headers em next.config: CSP, X-Frame-Options, X-Content-Type-Options, HSTS. Restringir images.remotePatterns (hoje hostname: "**").
Vazamento de erro: parar de retornar error.message ao cliente em prod (dezenas de rotas).
Limpeza "Orchestration"→"Teams": copy/i18n/eventos (first_orchestration_*), chave interna orchestrationsExecuted (follow-up deferido do programa SP6) — sem find-replace cego (SEO-sensível).
Type safety: reduzir clusters de as any (middleware.ts orgId inexistente; mcp/threads-api com 33 ocorrências).
Pre-commit hook (husky): tsc --noEmit + lint como gate antes de cada commit.
Sprint 5 — Testes 🟢
Testes de rota de API para caminhos críticos: auth, ownership (regressão do Sprint 0), agents, teams. Hoje: 11 arquivos de teste para 219 rotas (0 de rota).
Subir a barra de coverage acima dos 50% atuais nas áreas core.
Como verificar (geral, por sprint)
npm run build e tsc --noEmit limpos (verificar bugs recorrentes: params Promise+await, auth.id ≠ auth.userId).
npm test (e adicionar testes do escopo do sprint).
Para sprints com schema: migração formal + migrate deploy manual no host de produção antes do push; verificar a coluna/tabela existe no DB real.
Smoke E2E autenticado no ambiente de prod (EasyPanel) — gate real é login + fluxo afetado.
Commit + push ao concluir cada sprint (regra do usuário), um sprint por sessão.
Ordem recomendada
Sprint 0 (segurança) primeiro — explorável em produção. Depois 1 → 2 → 3 → 4 → 5. Executar um por sessão; não encadear automaticamente.