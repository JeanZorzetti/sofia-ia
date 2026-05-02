/**
 * Configura Plugins e MCP para o Squad Threads.
 *
 * Plugin: Validador de Formato Threads → Copywriter + Editor
 * MCP:    Threads API MCP Server        → Gestor de Comunidade
 *
 * Execute com: npx tsx scripts/setup-threads-squad-plugins-mcp.ts
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const ADMIN_ID = '46212883-7220-41bf-bd8b-e676bfd1baaf'; // admin@roilabs.com.br

const AGENTS = {
  copywriter: '87245dd3-76b3-4776-bdf0-2c38896e74c0',
  editor:     '43d8df70-4f66-4407-9aca-a37a2bfc6299',
  gestor:     '8d03ebc6-6dcb-447b-9f41-5a78e6f7987f',
};

const THREADS_MCP_URL = 'https://polarisia.com.br/api/mcp/threads-api';

// ─── Plugin Code ────────────────────────────────────────────────────────────

const PLUGIN_CODE = `
// Validador de Formato Threads
// Input esperado: { posts: string[] }
// Retorna relatório de validação com erros e estatísticas

const posts = input.posts;

if (!Array.isArray(posts) || posts.length === 0) {
  return { valid: false, errors: ['posts deve ser um array não vazio'] };
}

const errors = [];
const stats = [];
const MAX_CHARS = 500;
const MAX_POSTS = 10;

if (posts.length > MAX_POSTS) {
  errors.push('Thread tem ' + posts.length + ' posts — máximo é ' + MAX_POSTS);
}

posts.forEach(function(post, i) {
  const len = post.length;
  stats.push('Post ' + (i + 1) + ': ' + len + '/' + MAX_CHARS + ' chars');
  if (len > MAX_CHARS) {
    errors.push('Post ' + (i + 1) + ' excede ' + MAX_CHARS + ' chars (' + len + ' chars)');
  }
  if (!post.trim()) {
    errors.push('Post ' + (i + 1) + ' está vazio');
  }
});

if (errors.length > 0) {
  return {
    valid: false,
    errors: errors,
    stats: stats,
    summary: '❌ FORMATO INVÁLIDO: ' + errors.join('; ')
  };
}

return {
  valid: true,
  errors: [],
  stats: stats,
  summary: '✅ ' + posts.length + ' post(s) válidos para publicação'
};
`.trim();

const PLUGIN_INPUT_SCHEMA = JSON.stringify({
  type: 'object',
  properties: {
    posts: {
      type: 'array',
      description: 'Array de strings, cada uma sendo um post do thread (máx 500 chars cada)',
      items: { type: 'string' },
    },
  },
  required: ['posts'],
});

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔧 Configurando Plugins e MCP do Squad Threads...\n');

  // ── 1. Plugin: Validador de Formato ────────────────────────────────────────
  console.log('📦 Criando plugin "Validador de Formato Threads"...');

  for (const [agentKey, agentId] of [['copywriter', AGENTS.copywriter], ['editor', AGENTS.editor]]) {
    const agent = await prisma.agent.findUnique({ where: { id: agentId as string }, select: { name: true } });

    // Verifica se já existe
    const existing = await prisma.agentPlugin.findFirst({
      where: { agentId: agentId as string, name: 'Validador de Formato Threads' },
    });

    if (existing) {
      console.log(`  ⏭️  ${agent?.name} — plugin já existe`);
      continue;
    }

    await prisma.agentPlugin.create({
      data: {
        agentId: agentId as string,
        name: 'Validador de Formato Threads',
        description: 'Valida posts do thread: máx 500 chars/post e máx 10 posts. Retorna erros e estatísticas.',
        code: PLUGIN_CODE,
        inputSchema: PLUGIN_INPUT_SCHEMA,
        enabled: true,
      },
    });

    console.log(`  ✅ ${agent?.name} — plugin criado`);
  }

  // ── 2. API Key do Admin ─────────────────────────────────────────────────────
  console.log('\n🔑 Verificando API Key do admin...');

  let apiKey = await prisma.apiKey.findFirst({
    where: { userId: ADMIN_ID, status: 'active', revokedAt: null },
  });

  let rawKey: string;

  if (apiKey) {
    // Usa a chave existente — mas não temos o valor original, precisamos criar uma nova
    console.log('  ℹ️  API Key encontrada (usando existente)');
    // Se tiver key field (chaves antigas), usa ela; senão cria nova
    if (apiKey.key) {
      rawKey = apiKey.key;
      console.log('  ✅ Reutilizando chave existente');
    } else {
      // Cria nova key já que não temos o valor original
      rawKey = 'sk-threads-mcp-' + crypto.randomBytes(24).toString('hex');
      const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
      apiKey = await prisma.apiKey.create({
        data: {
          userId: ADMIN_ID,
          name: 'Threads Squad MCP Key',
          key: rawKey,
          keyHash: hash,
          status: 'active',
          scopes: 'read,execute',
        },
      });
      console.log('  ✅ Nova API Key criada:', rawKey);
    }
  } else {
    rawKey = 'sk-threads-mcp-' + crypto.randomBytes(24).toString('hex');
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
    apiKey = await prisma.apiKey.create({
      data: {
        userId: ADMIN_ID,
        name: 'Threads Squad MCP Key',
        key: rawKey,
        keyHash: hash,
        status: 'active',
        scopes: 'read,execute',
      },
    });
    console.log('  ✅ API Key criada:', rawKey);
  }

  // ── 3. MCP Server — Threads API ─────────────────────────────────────────────
  console.log('\n🌐 Criando MCP Server "Threads API"...');

  let mcpServer = await prisma.mcpServer.findFirst({
    where: { name: 'Threads API', createdBy: ADMIN_ID },
  });

  if (mcpServer) {
    console.log('  ⏭️  MCP Server já existe — atualizando headers...');
    mcpServer = await prisma.mcpServer.update({
      where: { id: mcpServer.id },
      data: { headers: { Authorization: `Bearer ${rawKey}` } },
    });
  } else {
    mcpServer = await prisma.mcpServer.create({
      data: {
        name: 'Threads API',
        description: 'Publica posts e valida conteúdo via Threads Graph API da conta conectada',
        url: THREADS_MCP_URL,
        transport: 'http',
        headers: { Authorization: `Bearer ${rawKey}` },
        status: 'active',
        createdBy: ADMIN_ID,
      },
    });
    console.log('  ✅ MCP Server criado:', mcpServer.id);
  }

  // Sincronizar tools do MCP server (adicionar manualmente pois está em produção)
  const existingTools = await prisma.mcpServerTool.count({ where: { mcpServerId: mcpServer.id } });
  if (existingTools === 0) {
    await prisma.mcpServerTool.createMany({
      data: [
        {
          mcpServerId: mcpServer.id,
          name: 'threads_validate_format',
          description: 'Valida posts do thread (500 chars/post, máx 10 posts)',
          inputSchema: { type: 'object', properties: { posts: { type: 'array', items: { type: 'string' } } }, required: ['posts'] },
        },
        {
          mcpServerId: mcpServer.id,
          name: 'threads_publish_post',
          description: 'Publica um post de texto na conta Threads conectada',
          inputSchema: { type: 'object', properties: { text: { type: 'string' }, reply_control: { type: 'string' } }, required: ['text'] },
        },
        {
          mcpServerId: mcpServer.id,
          name: 'threads_get_profile',
          description: 'Retorna dados do perfil Threads conectado',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
    });
    console.log('  ✅ 3 tools registradas');
  } else {
    console.log(`  ⏭️  ${existingTools} tools já registradas`);
  }

  // ── 4. Vincular MCP ao Gestor ───────────────────────────────────────────────
  console.log('\n🔗 Vinculando MCP Server ao Gestor de Comunidade...');

  const gestorAgent = await prisma.agent.findUnique({ where: { id: AGENTS.gestor }, select: { name: true } });

  await prisma.agentMcpServer.upsert({
    where: { agentId_mcpServerId: { agentId: AGENTS.gestor, mcpServerId: mcpServer.id } },
    update: { enabled: true },
    create: { agentId: AGENTS.gestor, mcpServerId: mcpServer.id, enabled: true },
  });

  console.log(`  ✅ ${gestorAgent?.name} → Threads API MCP`);

  // ── Resumo ─────────────────────────────────────────────────────────────────
  console.log('\n\n🎉 Configuração concluída!\n');
  console.log('Plugins:');
  console.log('  Copywriter → Validador de Formato Threads');
  console.log('  Editor     → Validador de Formato Threads');
  console.log('\nMCP Server:');
  console.log('  URL:', THREADS_MCP_URL);
  console.log('  Tools: threads_validate_format, threads_publish_post, threads_get_profile');
  console.log('  Vinculado a: Gestor de Comunidade');
}

main()
  .catch((e) => { console.error('❌ Erro:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
