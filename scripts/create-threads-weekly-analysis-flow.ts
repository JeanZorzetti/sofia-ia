/**
 * Cria o Flow "Análise Semanal Threads" — trigger CRON toda segunda às 9h.
 *
 * Pipeline:
 *   [CRON: toda segunda 9h]
 *       → Analista: coleta dados da semana anterior + relatório
 *       → Estrategista: plano de 5 posts para a semana
 *       → Gestor: resumo executivo + salva contexto
 *
 * Execute: npx tsx scripts/create-threads-weekly-analysis-flow.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_ID = '46212883-7220-41bf-bd8b-e676bfd1baaf';

const AGENTS = {
  estrategista: '8b41f3f9-944f-420b-8800-6b7961b14aed',
  analista:     '1f3811da-f92f-4cd6-a66f-05a6ff17ab94',
  gestor:       '8d03ebc6-6dcb-447b-9f41-5a78e6f7987f',
};

// ─── Node positions (visual layout vertical) ────────────────────────────────

const NODES = [
  {
    id: 'trigger-1',
    type: 'trigger_cron',
    position: { x: 400, y: 80 },
    data: {
      label: 'Toda Segunda-feira às 9h',
      config: {
        cronExpression: '0 9 * * 1',
        inputLabel: 'Análise semanal automática do Threads',
      },
    },
  },
  {
    id: 'agent-analista',
    type: 'action_ai_agent',
    position: { x: 400, y: 260 },
    data: {
      label: 'Analista — Relatório Semanal',
      config: {
        agentId: AGENTS.analista,
        prompt: `Hoje é segunda-feira. Faça a análise de performance do Threads da semana passada.

Passos obrigatórios:
1. Use **threads_get_profile_insights** para obter métricas dos últimos 7 dias
2. Use **threads_get_recent_posts** para listar os posts da semana (limit: 15)
3. Para os 3 posts com maior destaque, use **threads_get_post_insights** para métricas individuais

Produza um RELATÓRIO SEMANAL estruturado:

## Resumo da Semana
- Total de views, likes, replies, reposts no período
- Comparação com semana anterior (se disponível na memória)

## Top Posts
- Post #1: [texto truncado] — [views] views, [engajamento]% engajamento
- Post #2: [...]
- Post #3: [...]

## Análise de Padrões
- Melhor dia/horário de publicação
- Formato que gerou mais engajamento (pergunta, dado, provocação, lista)
- Temas que ressoaram vs. temas que caíram

## Recomendações para Esta Semana
- 3 temas com alto potencial baseado nos dados
- 1 experimento sugerido (formato diferente, horário alternativo, etc.)

Seja preciso com os números. Se não houver dados suficientes, indique claramente.`,
      },
    },
  },
  {
    id: 'agent-estrategista',
    type: 'action_ai_agent',
    position: { x: 400, y: 480 },
    data: {
      label: 'Estrategista — Plano Semanal',
      config: {
        agentId: AGENTS.estrategista,
        prompt: `Relatório do Analista:
{{response}}

Com base neste relatório de performance, crie o PLANO DE CONTEÚDO para esta semana.

Para cada um dos 5 posts planejados, defina:

**Post [N]: [Título do tema]**
- Ângulo: [perspectiva única]
- Gancho sugerido: [primeira linha]
- Tom: [inspiracional / educacional / provocativo / baseado em dados]
- Dia e horário: [ex: terça, 11h]
- Formato: [post único / thread de X partes]
- Objetivo: [awareness / engajamento / leads / educação]
- Métrica de sucesso: [X% engajamento / Y views]

Priorize temas que:
1. Se conectam com o que já funcionou (dados do Analista)
2. São relevantes para o público da Sofia (empreendedores, marketing, IA)
3. Têm variação de formato em relação à semana anterior

Termine com: **Tema de destaque da semana** (o post que deve ter mais atenção na produção).`,
      },
    },
  },
  {
    id: 'agent-gestor',
    type: 'action_ai_agent',
    position: { x: 400, y: 700 },
    data: {
      label: 'Gestor — Resumo Executivo',
      config: {
        agentId: AGENTS.gestor,
        prompt: `Plano semanal aprovado:
{{response}}

Suas ações:

1. **Salve na memória** os 5 temas da semana no formato:
   "Semana [data]: [tema1] | [tema2] | [tema3] | [tema4] | [tema5]"

2. **Escreva um RESUMO EXECUTIVO** em 3 bullet points:
   • O que será publicado esta semana e por quê
   • Principal aposta estratégica da semana
   • Métrica de sucesso que definirá se a semana foi boa

3. **Identifique o tema de destaque** — o post que receberá prioridade na produção desta semana

Mantenha o resumo conciso e acionável. Quem ler deve saber exatamente o que fazer.`,
      },
    },
  },
];

const EDGES = [
  { id: 'e1', source: 'trigger-1',       target: 'agent-analista' },
  { id: 'e2', source: 'agent-analista',   target: 'agent-estrategista' },
  { id: 'e3', source: 'agent-estrategista', target: 'agent-gestor' },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('📅 Criando Flow "Análise Semanal Threads"...\n');

  // Verificar agentes
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

  // Verificar se já existe
  const existing = await prisma.flow.findFirst({
    where: { name: 'Análise Semanal Threads', createdBy: ADMIN_ID },
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
      name: 'Análise Semanal Threads',
      description: 'Toda segunda às 9h: Analista coleta dados da semana anterior → Estrategista planeja 5 posts → Gestor salva resumo executivo.',
      createdBy: ADMIN_ID,
      triggerType: 'cron',
      cronExpression: '0 9 * * 1',
      status: 'active',
      nodes: NODES,
      edges: EDGES,
      settings: {
        timezone: 'America/Sao_Paulo',
        errorHandling: 'stop',
        retryPolicy: { maxRetries: 1, delay: 60 },
      },
      variables: {
        ANALISTA_ID: AGENTS.analista,
        ESTRATEGISTA_ID: AGENTS.estrategista,
        GESTOR_ID: AGENTS.gestor,
      },
      icon: 'BarChart2',
      color: 'purple',
      tags: ['threads', 'analytics', 'weekly', 'automated'],
    },
  });

  console.log(`\n✅ Flow criado: ${flow.id}`);
  console.log('\nPipeline (CRON: toda segunda 9h):');
  console.log('  [CRON] → Analista (métricas 7d) → Estrategista (plano 5 posts) → Gestor (resumo)');
  console.log('\nCronExpression: "0 9 * * 1" (segunda-feira, 9h, America/Sao_Paulo)');
  console.log(`\n🔗 Acesse em: /dashboard/flows/${flow.id}`);
}

main()
  .catch((e) => { console.error('❌ Erro:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
