/**
 * Registra as 2 novas tools de engajamento no McpServerTool do servidor "Threads API".
 *
 * Execute: npx tsx scripts/update-threads-mcp-engagement-tools.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_ID = '46212883-7220-41bf-bd8b-e676bfd1baaf';

const AGENTS = {
  gestor:  '8d03ebc6-6dcb-447b-9f41-5a78e6f7987f',
};

async function main() {
  console.log('🔧 Registrando tools de engajamento no MCP Threads API...\n');

  const mcpServer = await prisma.mcpServer.findFirst({
    where: { name: 'Threads API', createdBy: ADMIN_ID },
  });

  if (!mcpServer) {
    console.error('❌ MCP Server "Threads API" não encontrado.');
    process.exit(1);
  }

  console.log(`✅ MCP Server encontrado: ${mcpServer.id}`);

  const newTools = [
    {
      name: 'threads_get_replies',
      description: 'Lista replies (comentários) de um post específico do Threads. Retorna texto, username e timestamp de cada reply. Requer threads_read_replies scope.',
      inputSchema: {
        type: 'object',
        properties: {
          post_id: { type: 'string', description: 'ID do post Threads' },
          limit: { type: 'number', description: 'Quantidade de replies (padrão: 20, máx: 50)' },
        },
        required: ['post_id'],
      },
    },
    {
      name: 'threads_reply_to_post',
      description: 'Publica uma reply (resposta) a um post ou comentário no Threads. Use para responder perguntas, leads quentes e engajamento. Requer threads_manage_replies scope.',
      inputSchema: {
        type: 'object',
        properties: {
          post_id: { type: 'string', description: 'ID do post ou reply ao qual responder' },
          text: { type: 'string', description: 'Texto da resposta (máx 500 caracteres)' },
        },
        required: ['post_id', 'text'],
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

  // Garantir que o Gestor está vinculado ao MCP
  console.log('\n🔗 Verificando vínculo do Gestor com o MCP Server...');
  await prisma.agentMcpServer.upsert({
    where: { agentId_mcpServerId: { agentId: AGENTS.gestor, mcpServerId: mcpServer.id } },
    update: { enabled: true },
    create: { agentId: AGENTS.gestor, mcpServerId: mcpServer.id, enabled: true },
  });
  console.log('  ✅ Gestor → Threads API MCP (vinculado)');

  console.log(`\n🎉 Concluído! ${created} tools criadas, ${skipped} já existentes.`);
  console.log('\nNovas tools de engajamento:');
  console.log('  • threads_get_replies');
  console.log('  • threads_reply_to_post');
  console.log('\n⚠️  Nota: threads_get_replies requer threads_read_replies scope.');
  console.log('   threads_reply_to_post requer threads_manage_replies scope.');
  console.log('   Reconecte o Threads em /dashboard/integrations se necessário.');
}

main()
  .catch((e) => { console.error('❌ Erro:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
