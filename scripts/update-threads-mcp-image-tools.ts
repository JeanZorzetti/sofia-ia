/**
 * Registra as 2 novas tools de imagem no McpServerTool do servidor "Threads API".
 * Vincula o agente Designer Visual ao MCP.
 *
 * Execute: npx tsx scripts/update-threads-mcp-image-tools.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_ID = '46212883-7220-41bf-bd8b-e676bfd1baaf';
const DESIGNER_ID = '7f3e834c-3261-4050-bc09-8cc20a20a69c';

async function main() {
  console.log('🖼️  Registrando tools de imagem no MCP Threads API...\n');

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
      name: 'threads_generate_image',
      description: 'Gera uma imagem para acompanhar o post no Threads usando Together AI (FLUX.1). Retorna URL da imagem gerada. Requer TOGETHER_API_KEY configurada.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Descrição detalhada da imagem (em inglês para melhores resultados)' },
          style: {
            type: 'string',
            enum: ['photorealistic', 'minimalist', 'illustration', 'text-overlay', 'data-visualization'],
            description: 'Estilo visual. Padrão: minimalist',
          },
          aspect_ratio: {
            type: 'string',
            enum: ['1:1', '4:5', '9:16'],
            description: 'Proporção da imagem. Padrão: 1:1',
          },
        },
        required: ['prompt'],
      },
    },
    {
      name: 'threads_publish_image_post',
      description: 'Publica um post com imagem na conta Threads. A imagem deve ser URL pública (obtida via threads_generate_image).',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto do post (máx 500 chars)' },
          image_url: { type: 'string', description: 'URL pública da imagem' },
          reply_control: {
            type: 'string',
            enum: ['everyone', 'accounts_you_follow', 'mentioned_only'],
            description: 'Quem pode responder. Padrão: everyone',
          },
        },
        required: ['text', 'image_url'],
      },
    },
  ];

  let created = 0;
  for (const tool of newTools) {
    const existing = await prisma.mcpServerTool.findFirst({
      where: { mcpServerId: mcpServer.id, name: tool.name },
    });
    if (existing) {
      console.log(`  ⏭️  ${tool.name} — já existe`);
      continue;
    }
    await prisma.mcpServerTool.create({
      data: { mcpServerId: mcpServer.id, ...tool },
    });
    console.log(`  ✅ ${tool.name} — criado`);
    created++;
  }

  // Vincular MCP ao Designer Visual
  const designer = await prisma.agent.findUnique({ where: { id: DESIGNER_ID } });
  if (designer) {
    const existingLink = await prisma.agentMcpServer.findFirst({
      where: { agentId: DESIGNER_ID, mcpServerId: mcpServer.id },
    });
    if (!existingLink) {
      await prisma.agentMcpServer.create({
        data: { agentId: DESIGNER_ID, mcpServerId: mcpServer.id, enabled: true },
      });
      console.log(`\n✅ MCP vinculado ao Designer Visual`);
    } else {
      console.log(`\n⏭️  MCP já vinculado ao Designer Visual`);
    }
  }

  console.log(`\n✅ ${created} tool(s) criada(s).`);
  console.log('\n⚠️  Para ativar geração real de imagens, configure TOGETHER_API_KEY no .env');
}

main()
  .catch((e) => { console.error('❌ Erro:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
