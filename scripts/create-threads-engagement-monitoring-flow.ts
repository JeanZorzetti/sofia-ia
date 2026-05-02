/**
 * Cria o Flow "Monitoramento de Engajamento Threads" — trigger CRON a cada 6 horas.
 *
 * Pipeline:
 *   [CRON: a cada 6h]
 *       → Analista: busca posts das últimas 24h + identifica os mais engajados
 *       → Gestor: lê replies dos top posts + classifica + responde leads quentes
 *
 * Execute: npx tsx scripts/create-threads-engagement-monitoring-flow.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_ID = '46212883-7220-41bf-bd8b-e676bfd1baaf';

const AGENTS = {
  analista: '1f3811da-f92f-4cd6-a66f-05a6ff17ab94',
  gestor:   '8d03ebc6-6dcb-447b-9f41-5a78e6f7987f',
};

const NODES = [
  {
    id: 'trigger-engagement',
    type: 'trigger_cron',
    position: { x: 400, y: 80 },
    data: {
      label: 'A cada 6 horas (monitoramento)',
      config: {
        cronExpression: '0 */6 * * *',
        inputLabel: 'Monitoramento automático de engajamento do Threads',
      },
    },
  },
  {
    id: 'agent-analista-engagement',
    type: 'action_ai_agent',
    position: { x: 400, y: 260 },
    data: {
      label: 'Analista — Mapeamento de Engajamento',
      config: {
        agentId: AGENTS.analista,
        prompt: `Você é o Analista de Métricas. Faça o mapeamento de engajamento das últimas 24h.

**Processo:**

1. Use **threads_get_recent_posts** (limit: 10) para listar os posts recentes
2. Para os 3-5 posts mais recentes (últimas 24h), use **threads_get_post_insights** em cada um
3. Identifique os posts com mais replies (engajamento de conversa)

**Entregue um RELATÓRIO DE ENGAJAMENTO:**

## Posts Ativos (últimas 24h)
- [lista dos posts com métricas básicas]

## Top Posts por Replies
- Post ID: [id] | Replies: [N] | Views: [N] | Engajamento: [%]
- (listar os 3 com mais replies)

## Ação Recomendada
- IDs dos posts que merecem monitoramento de replies agora
- Urgência: [alta/média/baixa] baseado no volume de interação

Seja objetivo. O Gestor vai usar esses IDs para buscar as replies.`,
      },
    },
  },
  {
    id: 'agent-gestor-replies',
    type: 'action_ai_agent',
    position: { x: 400, y: 480 },
    data: {
      label: 'Gestor — Gestão de Replies',
      config: {
        agentId: AGENTS.gestor,
        prompt: `Relatório do Analista:
{{response}}

Você é o Gestor de Comunidade. Com base nos IDs identificados, gerencie o engajamento.

**Para cada post com replies pendentes:**

1. Use **threads_get_replies(post_id)** para listar as replies
2. Classifique cada reply em:
   - 🔥 **Lead Quente**: palavras como "como funciona", "quero usar", "preço", "plano", "contratar", "quanto custa" → RESPONDER
   - 💬 **Engajamento Valioso**: perguntas técnicas, elogios construtivos, compartilhamentos de experiência → RESPONDER
   - 👍 **Interação Simples**: "top", "👏", "ótimo" → NÃO RESPONDER (a menos que seja de conta com >1K seguidores)
   - ❌ **Spam/Off-topic** → NÃO RESPONDER

3. Para cada reply classificada como Responder:
   - Use **threads_reply_to_post(reply_id, text)** com uma resposta personalizada
   - Tom: direto, humano, sem jargão corporativo
   - Para leads: mencionar a Polaris IA naturalmente, oferecer ajuda, sugerir teste grátis
   - Para engajamento: resposta que aprofunda a conversa
   - **Limite: máximo 5 respostas por execução** (evitar shadowban)

**Relatório Final:**

## Respostas Publicadas
- [lista de replies publicadas com contexto]

## Leads Identificados
- [lista de leads quentes com username e contexto da conversa]

## Métricas da Sessão
- Posts monitorados: [N]
- Replies lidas: [N]
- Respostas publicadas: [N]
- Leads identificados: [N]`,
      },
    },
  },
];

const EDGES = [
  { id: 'e1', source: 'trigger-engagement',        target: 'agent-analista-engagement' },
  { id: 'e2', source: 'agent-analista-engagement',  target: 'agent-gestor-replies' },
];

async function main() {
  console.log('💬 Criando Flow "Monitoramento de Engajamento Threads"...\n');

  const agentIds = Object.values(AGENTS);
  const agents = await prisma.agent.findMany({
    where: { id: { in: agentIds } },
    select: { id: true, name: true },
  });

  if (agents.length !== agentIds.length) {
    console.error('❌ Alguns agentes não encontrados');
    process.exit(1);
  }

  const nameOf = Object.fromEntries(agents.map(a => [a.id, a.name]));
  console.log('✅ Agentes verificados:');
  for (const [key, id] of Object.entries(AGENTS)) {
    console.log(`  ${key}: ${nameOf[id]}`);
  }

  const existing = await prisma.flow.findFirst({
    where: { name: 'Monitoramento de Engajamento Threads', createdBy: ADMIN_ID },
  });

  if (existing) {
    console.log('\n⏭️  Flow já existe — atualizando nodes e edges...');
    const updated = await prisma.flow.update({
      where: { id: existing.id },
      data: { nodes: NODES, edges: EDGES, status: 'active' },
    });
    console.log(`✅ Atualizado: ${updated.id}`);
    return;
  }

  const flow = await prisma.flow.create({
    data: {
      name: 'Monitoramento de Engajamento Threads',
      description: 'A cada 6h: Analista mapeia posts com mais engajamento → Gestor lê replies, classifica leads e responde mensagens prioritárias.',
      createdBy: ADMIN_ID,
      triggerType: 'cron',
      cronExpression: '0 */6 * * *',
      status: 'active',
      nodes: NODES,
      edges: EDGES,
      settings: {
        timezone: 'America/Sao_Paulo',
        errorHandling: 'continue',
        retryPolicy: { maxRetries: 1, delay: 60 },
      },
      variables: {
        ANALISTA_ID: AGENTS.analista,
        GESTOR_ID: AGENTS.gestor,
        MAX_REPLIES_PER_RUN: 5,
      },
      icon: 'MessageSquare',
      color: 'green',
      tags: ['threads', 'engagement', 'replies', 'leads', 'automated'],
    },
  });

  console.log(`\n✅ Flow criado: ${flow.id}`);
  console.log('\nPipeline (CRON: a cada 6h):');
  console.log('  [CRON] → Analista (mapeia engajamento) → Gestor (lê replies + classifica + responde)');
  console.log('\nCronExpression: "0 */6 * * *" (0h, 6h, 12h, 18h — America/Sao_Paulo)');
  console.log(`\n🔗 Acesse em: /dashboard/flows/${flow.id}`);
}

main()
  .catch((e) => { console.error('❌ Erro:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
