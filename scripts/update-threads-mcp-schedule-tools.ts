/**
 * Registra as 2 novas tools de agendamento no McpServerTool do servidor "Threads API".
 *
 * Execute: npx tsx scripts/update-threads-mcp-schedule-tools.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_ID = '46212883-7220-41bf-bd8b-e676bfd1baaf';

async function main() {
  console.log('🔧 Registrando tools de agendamento no MCP Threads API...\n');

  const mcpServer = await prisma.mcpServer.findFirst({
    where: { name: 'Threads API', createdBy: ADMIN_ID },
  });

  if (!mcpServer) {
    console.error('❌ MCP Server "Threads API" não encontrado. Execute setup-threads-squad-plugins-mcp.ts primeiro.');
    process.exit(1);
  }

  console.log(`✅ MCP Server encontrado: ${mcpServer.id}`);

  const newTools = [
    {
      name: 'threads_check_scheduled_posts',
      description: 'Retorna os posts agendados pendentes que estão prontos para publicação (scheduledAt <= agora). Use para verificar a fila antes de publicar.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Máximo de posts a retornar (padrão: 10)' },
        },
        required: [],
      },
    },
    {
      name: 'threads_mark_post_published',
      description: 'Marca um post agendado como publicado após a publicação bem-sucedida. Atualiza o status no banco de dados.',
      inputSchema: {
        type: 'object',
        properties: {
          scheduled_post_id: { type: 'string', description: 'ID do ThreadsScheduledPost (UUID)' },
          threads_post_id: { type: 'string', description: 'ID do post retornado pela Threads API após publicação' },
        },
        required: ['scheduled_post_id', 'threads_post_id'],
      },
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const tool of newTools) {
    const existing = await prisma.mcpServerTool.findFirst({
      where: { mcpServerId: mcpServer.id, name: tool.name },
    });

    if (existing) {
      console.log(`  ⏭️  ${tool.name} — já existe`);
      skipped++;
      continue;
    }

    await prisma.mcpServerTool.create({
      data: {
        mcpServerId: mcpServer.id,
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
    });

    console.log(`  ✅ ${tool.name} — criada`);
    created++;
  }

  console.log(`\n🎉 Concluído! ${created} tools criadas, ${skipped} já existentes.`);
  console.log('\nNovas tools disponíveis:');
  console.log('  • threads_check_scheduled_posts');
  console.log('  • threads_mark_post_published');
}

main()
  .catch((e) => { console.error('❌ Erro:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
