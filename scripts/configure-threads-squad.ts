/**
 * Configura Skills e Delegações do Squad Threads.
 * Execute com: npx tsx scripts/configure-threads-squad.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── IDs dos Agentes ────────────────────────────────────────────────────────
const AGENTS = {
  estrategista: '8b41f3f9-944f-420b-8800-6b7961b14aed',
  copywriter:   '87245dd3-76b3-4776-bdf0-2c38896e74c0',
  editor:       '43d8df70-4f66-4407-9aca-a37a2bfc6299',
  analista:     '1f3811da-f92f-4cd6-a66f-05a6ff17ab94',
  gestor:       '8d03ebc6-6dcb-447b-9f41-5a78e6f7987f',
};

// ─── IDs das Skills ─────────────────────────────────────────────────────────
const SKILLS = {
  buscaWeb:           '855f6711-ca02-4714-9aa6-9ae9fd33b77d',
  requisicaoHttp:     '68218f68-591b-488c-80a3-12673094a8bf',
  threadsSpecialist:  'd8e49130-25d8-4a80-90e3-824bf79bf91e',
  expertVendas:       '5d2ca41e-3ec1-45d3-8be6-6d5bf43f1de0',
  analistaDados:      '59f6bbef-e20b-4082-9a8e-1570e2f25944',
  redatorDigital:     'f8babf30-4ff8-44d0-9b24-a12e83d73c42',
};

// ─── Mapa de Skills por Agente ───────────────────────────────────────────────
const AGENT_SKILLS: Record<string, string[]> = {
  [AGENTS.estrategista]: [
    SKILLS.threadsSpecialist,
    SKILLS.analistaDados,
    SKILLS.buscaWeb,
  ],
  [AGENTS.copywriter]: [
    SKILLS.threadsSpecialist,
    SKILLS.redatorDigital,
  ],
  [AGENTS.editor]: [
    SKILLS.threadsSpecialist,
    SKILLS.redatorDigital,
  ],
  [AGENTS.analista]: [
    SKILLS.threadsSpecialist,
    SKILLS.analistaDados,
    SKILLS.buscaWeb,
    SKILLS.requisicaoHttp,
  ],
  [AGENTS.gestor]: [
    SKILLS.threadsSpecialist,
    SKILLS.expertVendas,
    SKILLS.requisicaoHttp,
  ],
};

// ─── System Prompts com Delegação ────────────────────────────────────────────
const DELEGATION_BLOCKS: Record<string, string> = {
  [AGENTS.estrategista]: `

## Agentes do Squad Threads — Delegação
Você é o líder estratégico. Delega execução para especialistas quando necessário.

| Agente | ID | Usar quando |
|--------|-----|------------|
| Copywriter de Threads | ${AGENTS.copywriter} | Criar posts, copies, threads |
| Analista de Threads | ${AGENTS.analista} | Obter métricas, benchmarks, análises de performance |

Use: delegate_to_agent(toAgentId, mensagem_detalhada)`,

  [AGENTS.copywriter]: `

## Agentes do Squad Threads — Delegação
Você cria conteúdo. Após criar, envie para revisão do Editor.

| Agente | ID | Usar quando |
|--------|-----|------------|
| Editor de Threads | ${AGENTS.editor} | Revisar e aprovar o conteúdo criado |

Use: delegate_to_agent(toAgentId, conteudo_para_revisao)`,

  [AGENTS.editor]: `

## Agentes do Squad Threads — Delegação
Você revisa e aprova conteúdo. Não precisa delegar — é o ponto final do pipeline.`,

  [AGENTS.analista]: `

## Agentes do Squad Threads — Delegação
Você analisa dados e reporta insights ao Estrategista.

| Agente | ID | Usar quando |
|--------|-----|------------|
| Estrategista de Threads | ${AGENTS.estrategista} | Reportar análises e insights estratégicos |

Use: delegate_to_agent(toAgentId, relatorio_de_insights)`,

  [AGENTS.gestor]: `

## Agentes do Squad Threads — Delegação
Você gerencia a comunidade. Delega para o Copywriter quando a resposta exigir conteúdo elaborado.

| Agente | ID | Usar quando |
|--------|-----|------------|
| Copywriter de Threads | ${AGENTS.copywriter} | Criar respostas elaboradas ou templates de engajamento |

Use: delegate_to_agent(toAgentId, contexto_da_interacao)`,
};

async function main() {
  console.log('⚙️  Configurando Squad Threads...\n');

  // ── 1. Skills ──────────────────────────────────────────────────────────────
  console.log('📌 Vinculando Skills...');

  for (const [agentId, skillIds] of Object.entries(AGENT_SKILLS)) {
    const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { name: true } });
    console.log(`\n  🤖 ${agent?.name}`);

    for (const skillId of skillIds) {
      const skill = await prisma.skill.findUnique({ where: { id: skillId }, select: { name: true } });
      await prisma.agentSkill.upsert({
        where: { agentId_skillId: { agentId, skillId } },
        update: { enabled: true },
        create: { agentId, skillId, enabled: true, config: {} },
      });
      console.log(`     ✅ ${skill?.name}`);
    }
  }

  // ── 2. System Prompts + Delegação ─────────────────────────────────────────
  console.log('\n\n📝 Adicionando blocos de delegação nos System Prompts...');

  for (const [agentId, block] of Object.entries(DELEGATION_BLOCKS)) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { name: true, systemPrompt: true },
    });
    if (!agent) continue;

    // Evita duplicar o bloco se já existir
    if (agent.systemPrompt.includes('Agentes do Squad Threads')) {
      console.log(`  ⏭️  ${agent.name} — bloco já existe`);
      continue;
    }

    await prisma.agent.update({
      where: { id: agentId },
      data: { systemPrompt: agent.systemPrompt + block },
    });
    console.log(`  ✅ ${agent.name}`);
  }

  console.log('\n\n🎉 Squad configurado!\n');
  console.log('Resumo:');
  console.log('  Estrategista  → Skills: Threads + Dados + Busca Web | Delega para: Copywriter, Analista');
  console.log('  Copywriter    → Skills: Threads + Redator           | Delega para: Editor');
  console.log('  Editor        → Skills: Threads + Redator           | Ponto final do pipeline');
  console.log('  Analista      → Skills: Threads + Dados + Busca + HTTP | Delega para: Estrategista');
  console.log('  Gestor        → Skills: Threads + Vendas + HTTP     | Delega para: Copywriter');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
