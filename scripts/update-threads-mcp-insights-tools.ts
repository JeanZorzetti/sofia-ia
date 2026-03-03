/**
 * Registra as 3 novas tools de insights no McpServerTool do servidor "Threads API".
 *
 * Execute: npx tsx scripts/update-threads-mcp-insights-tools.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_ID = '46212883-7220-41bf-bd8b-e676bfd1baaf';

const ANALISTA_ID = ''; // será preenchido abaixo se necessário

async function main() {
  console.log('🔧 Registrando tools de insights no MCP Threads API...\n');

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
      name: 'threads_get_recent_posts',
      description: 'Lista os posts mais recentes da conta Threads com ID, texto, data e permalink. Use para obter IDs antes de buscar insights.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Quantidade de posts (padrão: 10, máx: 25)' },
        },
        required: [],
      },
    },
    {
      name: 'threads_get_post_insights',
      description: 'Retorna métricas de um post: views, likes, replies, reposts, quotes e taxa de engajamento. Requer threads_manage_insights scope.',
      inputSchema: {
        type: 'object',
        properties: {
          post_id: { type: 'string', description: 'ID do post (obtido via threads_get_recent_posts)' },
        },
        required: ['post_id'],
      },
    },
    {
      name: 'threads_get_profile_insights',
      description: 'Retorna métricas do perfil em um período: views, likes, replies, reposts, quotes. Requer threads_manage_insights scope.',
      inputSchema: {
        type: 'object',
        properties: {
          since: { type: 'string', description: 'Data início ISO 8601 (ex: 2026-02-24). Padrão: 7 dias atrás' },
          until: { type: 'string', description: 'Data fim ISO 8601 (ex: 2026-03-03). Padrão: hoje' },
        },
        required: [],
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

  // Verificar se o Analista está vinculado ao MCP server
  const AGENTS = {
    analista: '87245dd3-76b3-4776-bdf0-2c38896e74c0', // ajuste se necessário
    gestor:   '8d03ebc6-6dcb-447b-9f41-5a78e6f7987f',
  };

  console.log('\n🔗 Verificando vínculo do Analista com o MCP Server...');
  await prisma.agentMcpServer.upsert({
    where: { agentId_mcpServerId: { agentId: AGENTS.analista, mcpServerId: mcpServer.id } },
    update: { enabled: true },
    create: { agentId: AGENTS.analista, mcpServerId: mcpServer.id, enabled: true },
  });
  console.log('  ✅ Analista → Threads API MCP (vinculado)');

  console.log(`\n🎉 Concluído! ${created} tools criadas, ${skipped} já existentes.`);
  console.log('\nNovas tools disponíveis:');
  console.log('  • threads_get_recent_posts');
  console.log('  • threads_get_post_insights');
  console.log('  • threads_get_profile_insights');
  console.log('\n⚠️  Nota: threads_get_post_insights e threads_get_profile_insights');
  console.log('   requerem reconexão do Threads com o scope threads_manage_insights.');
}

main()
  .catch((e) => { console.error('❌ Erro:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
