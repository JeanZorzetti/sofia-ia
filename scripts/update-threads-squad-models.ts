/**
 * Atualiza os modelos dos agentes do Squad Threads para os mais eficazes.
 * Execute com: npx tsx scripts/update-threads-squad-models.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const USER_ID = '71e638e8-5922-4396-99e9-732dfc009729';

const MODEL_UPDATES: Record<string, string> = {
  'Estrategista de Threads': 'deepseek-r1-distill-llama-70b',   // Groq — raciocínio estratégico
  'Copywriter de Threads':   'anthropic/claude-sonnet-4-5',     // OpenRouter — melhor escrita criativa
  'Editor de Threads':       'anthropic/claude-sonnet-4-5',     // OpenRouter — avaliação refinada
  'Gestor de Comunidade':    'anthropic/claude-haiku-4-5',      // OpenRouter — rápido e autêntico
  'Analista de Threads':     'deepseek-r1-distill-llama-70b',   // Groq — análise de dados estruturada
};

async function main() {
  console.log('🔄 Atualizando modelos do Squad Threads...\n');

  const folder = await prisma.agentFolder.findFirst({
    where: { name: 'Threads', userId: USER_ID },
    include: { agents: true },
  });

  if (!folder) {
    console.error('❌ Pasta "Threads" não encontrada. Execute seed-threads-squad.ts primeiro.');
    process.exit(1);
  }

  console.log(`📁 Pasta: "${folder.name}" — ${folder.agents.length} agentes\n`);

  for (const agent of folder.agents) {
    const newModel = MODEL_UPDATES[agent.name];
    if (!newModel) {
      console.log(`  ⏭️  ${agent.name} — sem atualização definida`);
      continue;
    }

    if (agent.model === newModel) {
      console.log(`  ✅ ${agent.name} — já usa ${newModel}`);
      continue;
    }

    await prisma.agent.update({
      where: { id: agent.id },
      data: { model: newModel },
    });

    console.log(`  ✅ ${agent.name}`);
    console.log(`     ${agent.model}  →  ${newModel}`);
  }

  console.log('\n🎉 Modelos atualizados!');
  console.log('\nResumo:');
  console.log('  Estrategista  → deepseek-r1-distill-llama-70b  (Groq)');
  console.log('  Copywriter    → anthropic/claude-sonnet-4-5    (OpenRouter)');
  console.log('  Editor        → anthropic/claude-sonnet-4-5    (OpenRouter)');
  console.log('  Gestor        → anthropic/claude-haiku-4-5     (OpenRouter)');
  console.log('  Analista      → deepseek-r1-distill-llama-70b  (Groq)');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
