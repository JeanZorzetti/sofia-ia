/**
 * Cria a Orquestração "Produção de Post Threads" — pipeline sequential determinístico.
 *
 * Pipeline: Estrategista → Analista → Copywriter → Editor → Gestor
 * Substitui a delegação estocástica por execução garantida e rastreável.
 *
 * Execute: npx tsx scripts/create-threads-production-orchestration.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_ID = '46212883-7220-41bf-bd8b-e676bfd1baaf';

const AGENTS = {
  estrategista: '8b41f3f9-944f-420b-8800-6b7961b14aed',
  analista:     '1f3811da-f92f-4cd6-a66f-05a6ff17ab94',
  copywriter:   '87245dd3-76b3-4776-bdf0-2c38896e74c0',
  editor:       '43d8df70-4f66-4407-9aca-a37a2bfc6299',
  gestor:       '8d03ebc6-6dcb-447b-9f41-5a78e6f7987f',
};

async function main() {
  console.log('🎭 Criando Orquestração "Produção de Post Threads"...\n');

  // Verificar que todos os agentes existem
  const agentIds = Object.values(AGENTS);
  const agents = await prisma.agent.findMany({
    where: { id: { in: agentIds } },
    select: { id: true, name: true },
  });

  if (agents.length !== agentIds.length) {
    const found = agents.map(a => a.id);
    const missing = agentIds.filter(id => !found.includes(id));
    console.error('❌ Agentes não encontrados:', missing);
    process.exit(1);
  }

  const nameOf = Object.fromEntries(agents.map(a => [a.id, a.name]));
  console.log('✅ Agentes verificados:');
  for (const [key, id] of Object.entries(AGENTS)) {
    console.log(`  ${key}: ${nameOf[id]}`);
  }

  // Verificar se já existe
  const existing = await prisma.agentOrchestration.findFirst({
    where: { name: 'Produção de Post Threads', createdBy: ADMIN_ID },
  });

  if (existing) {
    console.log('\n⏭️  Orquestração já existe — atualizando...');
    const updated = await prisma.agentOrchestration.update({
      where: { id: existing.id },
      data: {
        agents: buildAgentSteps(),
        status: 'active',
      },
    });
    console.log(`✅ Atualizada: ${updated.id}`);
    return;
  }

  const orchestration = await prisma.agentOrchestration.create({
    data: {
      name: 'Produção de Post Threads',
      description: 'Pipeline determinístico de produção de conteúdo: briefing → estratégia → análise → redação → revisão → publicação. Substitui a delegação estocástica por execução sequencial garantida.',
      createdBy: ADMIN_ID,
      strategy: 'sequential',
      status: 'active',
      agents: buildAgentSteps(),
      config: {
        inputLabel: 'Tema ou briefing do post (ex: "Como a IA está mudando o marketing digital")',
        showCost: true,
        allowFeedbackLoop: true,
      },
    },
  });

  console.log(`\n✅ Orquestração criada: ${orchestration.id}`);
  console.log('\nPipeline:');
  console.log('  1. Estrategista de Conteúdo — plano e ângulo');
  console.log('  2. Analista de Métricas     — contexto de dados + validação');
  console.log('  3. Copywriter               — rascunho do post (≤500 chars)');
  console.log('  4. Editor Sênior            — revisão + aprovação com [REJECT] se necessário');
  console.log('  5. Gestor de Comunidade     — publicação via MCP + próximos temas');
  console.log(`\n🔗 Acesse em: /dashboard/orchestrations/${orchestration.id}`);
}

function buildAgentSteps() {
  return [
    {
      agentId: AGENTS.estrategista,
      role: 'Diretor de Estratégia',
      prompt: `Com base no tema/briefing fornecido, crie um plano detalhado para 1 post no Threads.

Entregue:
1. **Ângulo principal** — perspectiva única que diferencia este post
2. **Público-alvo** — quem vai se identificar e por quê
3. **Gancho sugerido** — primeira linha impactante (dato, provocação ou pergunta)
4. **Estrutura do post** — 2-3 pontos principais em sequência lógica
5. **Tom de voz** — inspiracional / educacional / provocativo / baseado em dados
6. **Contexto de mercado** — por que este tema é relevante agora?

Seja específico e orientado a resultados. Evite generalidades.`,
    },
    {
      agentId: AGENTS.analista,
      role: 'Analista de Performance',
      prompt: `Com base no plano estratégico do Diretor, adicione contexto analítico real.

Use as tools do MCP Threads API:
1. **threads_get_profile_insights** — veja o que performou nos últimos 7 dias
2. **threads_get_recent_posts** — verifique os últimos 10 posts (evitar repetição de temas)
3. Se houver posts recentes relevantes, use **threads_get_post_insights** nos top 2-3

Com base nos dados, entregue:
- Validação do tema proposto (já foi publicado? performou bem temas similares?)
- Melhor horário de publicação com base em dados históricos
- Formato recomendado (post único vs thread)
- Taxa de engajamento de referência para comparação
- Ajustes sugeridos no ângulo baseado em performance histórica

Se não houver dados suficientes, indique isso claramente e prossiga com estimativas.`,
    },
    {
      agentId: AGENTS.copywriter,
      role: 'Redator de Conteúdo',
      prompt: `Com base na estratégia do Diretor e no parecer analítico, escreva o post para o Threads.

REGRAS INEGOCIÁVEIS:
- Máximo 500 caracteres (use o Plugin "Validador de Formato Threads" antes de entregar)
- Gancho impactante na primeira linha — deve parar o scroll
- Sem links externos no texto
- Tom autêntico — sem jargão corporativo ou frases clichê
- Termine com uma pergunta ou provocação que convide resposta

Processo:
1. Escreva o rascunho
2. Valide com o Plugin (verifique chars)
3. Se necessário, edite até ficar dentro do limite
4. Entregue APENAS o texto final do post, sem comentários ou explicações extras`,
    },
    {
      agentId: AGENTS.editor,
      role: 'Editor Sênior',
      prompt: `Revise o post do Copywriter com critério editorial rigoroso.

Avalie em ordem:
1. **Força do gancho** — a primeira linha faz parar o scroll?
2. **Autenticidade** — soa humano ou parece gerado por IA?
3. **Fluidez** — a leitura é natural e o ritmo funciona?
4. **Potencial de engajamento** — vai gerar resposta, compartilhamento ou salvamento?
5. **Adequação ao tom da Sofia** — inteligente, direto, sem arrogância
6. **Formato** — valide com o Plugin "Validador de Formato Threads"

Se o post não atingir o padrão, responda com:
[REJECT] + feedback específico e acionável para o Copywriter

Se aprovado, responda com:
✅ POST APROVADO

[texto exato do post]

---
Editor: [seu comentário breve sobre o que funcionou]`,
    },
    {
      agentId: AGENTS.gestor,
      role: 'Gestor de Publicação',
      prompt: `Post revisado e aprovado pelo Editor. Execute a publicação.

1. Extraia o texto aprovado (após "✅ POST APROVADO")
2. Publique usando **threads_publish_post** com o texto
3. Confirme o Post ID retornado pela API
4. Registre o tema na sua memória como "publicado hoje"
5. Com base no tema desta publicação e no padrão da semana, sugira os próximos 2 temas para produção

Formato de resposta:
✅ Publicado com sucesso!
Post ID: [id]
Permalink: [link se disponível]

Próximos temas sugeridos:
1. [tema A] — [justificativa em 1 linha]
2. [tema B] — [justificativa em 1 linha]`,
    },
  ];
}

main()
  .catch((e) => { console.error('❌ Erro:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
