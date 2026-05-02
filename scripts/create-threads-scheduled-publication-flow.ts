/**
 * Cria o Flow "Publicação Agendada Threads" — trigger CRON a cada hora.
 *
 * Pipeline:
 *   [CRON: todo hora]
 *       → Gestor: verifica fila + publica posts pendentes + marca como publicados
 *
 * Execute: npx tsx scripts/create-threads-scheduled-publication-flow.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_ID = '46212883-7220-41bf-bd8b-e676bfd1baaf';

const AGENTS = {
  gestor: '8d03ebc6-6dcb-447b-9f41-5a78e6f7987f',
};

const NODES = [
  {
    id: 'trigger-schedule',
    type: 'trigger_cron',
    position: { x: 400, y: 80 },
    data: {
      label: 'A cada hora (verificador de fila)',
      config: {
        cronExpression: '0 * * * *',
        inputLabel: 'Verificação horária da fila de posts agendados',
      },
    },
  },
  {
    id: 'agent-gestor-publish',
    type: 'action_ai_agent',
    position: { x: 400, y: 260 },
    data: {
      label: 'Gestor — Publicação da Fila',
      config: {
        agentId: AGENTS.gestor,
        prompt: `Você é o Gestor de Comunidade da Polaris IA. É hora de verificar e publicar os posts agendados.

**Processo obrigatório:**

1. Use **threads_check_scheduled_posts** para verificar se há posts prontos para publicação
   - Se não houver posts pendentes, responda: "✅ Fila vazia — nenhum post para publicar agora."
   - Se houver posts, continue para o passo 2

2. Para cada post da fila (processe todos):
   a. Leia o texto do post
   b. Use **threads_validate_format** para validar o texto antes de publicar
   c. Se válido: use **threads_publish_post** com o texto do post
   d. Se publicado com sucesso: use **threads_mark_post_published** com o ID agendado e o Post ID retornado
   e. Se houve erro na validação ou publicação: registre o erro mas continue com o próximo post

3. Ao final, produza um relatório:

**Relatório de Publicação — [data/hora]**
- Posts publicados: [N]
- Posts com erro: [N]
- Fila restante: [N]

Para cada post publicado:
✅ [texto truncado] → Post ID: [id]

Para cada erro:
❌ [texto truncado] → Motivo: [erro]

Se publicou com sucesso, sugira 1 novo tema para adicionar à fila com base nos temas publicados hoje.`,
      },
    },
  },
];

const EDGES = [
  { id: 'e1', source: 'trigger-schedule', target: 'agent-gestor-publish' },
];

async function main() {
  console.log('⏰ Criando Flow "Publicação Agendada Threads"...\n');

  // Verificar agente
  const gestor = await prisma.agent.findUnique({
    where: { id: AGENTS.gestor },
    select: { id: true, name: true },
  });

  if (!gestor) {
    console.error('❌ Gestor não encontrado:', AGENTS.gestor);
    process.exit(1);
  }

  console.log(`✅ Agente verificado: ${gestor.name}`);

  // Verificar se já existe
  const existing = await prisma.flow.findFirst({
    where: { name: 'Publicação Agendada Threads', createdBy: ADMIN_ID },
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
      name: 'Publicação Agendada Threads',
      description: 'A cada hora: Gestor verifica a fila de posts agendados → publica os pendentes via Threads API → marca como publicados no banco.',
      createdBy: ADMIN_ID,
      triggerType: 'cron',
      cronExpression: '0 * * * *',
      status: 'active',
      nodes: NODES,
      edges: EDGES,
      settings: {
        timezone: 'America/Sao_Paulo',
        errorHandling: 'continue',
        retryPolicy: { maxRetries: 2, delay: 30 },
      },
      variables: {
        GESTOR_ID: AGENTS.gestor,
      },
      icon: 'Clock',
      color: 'blue',
      tags: ['threads', 'publishing', 'scheduled', 'automated'],
    },
  });

  console.log(`\n✅ Flow criado: ${flow.id}`);
  console.log('\nPipeline (CRON: toda hora):');
  console.log('  [CRON] → Gestor (verifica fila → publica pendentes → marca publicados)');
  console.log('\nCronExpression: "0 * * * *" (todo hora cheia, America/Sao_Paulo)');
  console.log(`\n🔗 Acesse em: /dashboard/flows/${flow.id}`);
}

main()
  .catch((e) => { console.error('❌ Erro:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
