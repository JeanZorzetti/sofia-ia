/**
 * Cria a Orquestração "Produção de Post Threads com Imagem" — M2.
 *
 * Pipeline expandido (6 etapas):
 *   Estrategista → Analista → Copywriter → Designer Visual → Editor → Gestor
 *
 * Execute: npx tsx scripts/create-threads-visual-production-orchestration.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_ID = '46212883-7220-41bf-bd8b-e676bfd1baaf';

const AGENTS = {
  estrategista: '8b41f3f9-944f-420b-8800-6b7961b14aed',
  analista:     '1f3811da-f92f-4cd6-a66f-05a6ff17ab94',
  copywriter:   '87245dd3-76b3-4776-bdf0-2c38896e74c0',
  designer:     '7f3e834c-3261-4050-bc09-8cc20a20a69c',
  editor:       '43d8df70-4f66-4407-9aca-a37a2bfc6299',
  gestor:       '8d03ebc6-6dcb-447b-9f41-5a78e6f7987f',
};

function buildAgentSteps() {
  return [
    {
      agentId: AGENTS.estrategista,
      role: 'Diretor de Estratégia',
      prompt: `Você é o Diretor de Estratégia. Recebeu um tema para criar um post com imagem no Threads.

**Entregue o BRIEFING completo:**

1. **Ângulo editorial**: qual perspectiva vai gerar mais replies?
2. **Formato do post**: texto puro com imagem de suporte / texto + dado visual / texto + bastidor
3. **Gancho sugerido**: ideia para a primeira linha (o que para o scroll)
4. **Conceito visual**: em 1 frase, o que a imagem deveria mostrar para amplificar o texto
5. **Horário ideal**: quando publicar (considere picos 7-9h, 12-13h, 18-21h)
6. **Tom**: inspiracional / educacional / provocativo / dado concreto / bastidores
7. **CTA implícito**: como provocar reply sem pedir explicitamente`,
    },
    {
      agentId: AGENTS.analista,
      role: 'Analista de Performance',
      prompt: `Briefing estratégico:
{{response}}

Você é o Analista de Performance. Enriqueça o briefing com dados reais.

1. Use **threads_get_profile_insights** — contexto atual do perfil
2. Use **threads_get_recent_posts** (limit: 10) — verificar temas recentes (evitar repetição)
3. Para 2-3 posts recentes relevantes, use **threads_get_post_insights**

**Entregue:**
- Validação do ângulo (já foi publicado algo similar?)
- Engajamento histórico de temas similares
- Horário de publicação confirmado por dados
- Estimativa de views (baseada em histórico)
- Ajustes recomendados ao briefing`,
    },
    {
      agentId: AGENTS.copywriter,
      role: 'Redator',
      prompt: `Briefing validado:
{{response}}

Você é o Copywriter. Escreva o texto do post.

**Regras:**
- Máximo 500 caracteres (valide com o Plugin "Validador de Formato Threads")
- Gancho impactante na primeira linha
- Tom autêntico, sem jargão corporativo
- O texto deve funcionar MESMO SEM a imagem — a imagem amplifica, não explica
- Termine com pergunta ou provocação que gera reply

**Entregue:**
---
TEXTO DO POST:
[texto completo — máx 500 chars]

Validação: [X/500 chars]

NOTA PARA O DESIGNER:
[o que o texto comunica e como a imagem pode amplificar — uma frase]
---`,
    },
    {
      agentId: AGENTS.designer,
      role: 'Designer Visual',
      prompt: `Texto do post e nota para o Designer:
{{response}}

Você é o Designer Visual. Gere a imagem que vai acompanhar este post.

**Processo:**
1. Analise o texto e a nota do Copywriter
2. Crie o BRIEF VISUAL (conceito, estilo, paleta, texto na imagem se houver)
3. Chame **threads_generate_image** com o prompt elaborado
4. Se a imagem for gerada com sucesso, avalie o resultado

**Entregue:**
---
BRIEF VISUAL:
Conceito: [uma frase]
Estilo: [photorealistic / minimalist / illustration / text-overlay / data-visualization]
Paleta: [2-3 cores]
Texto na imagem: [se houver — máx 8 palavras]
Prompt usado: [prompt enviado ao threads_generate_image]

RESULTADO:
[URL da imagem OU mensagem de erro]

Avaliação: [para o scroll? complementa sem redundar? 1-10]
---`,
    },
    {
      agentId: AGENTS.editor,
      role: 'Editor Sênior',
      prompt: `Texto do Copywriter + imagem do Designer:
{{response}}

Você é o Editor Sênior. Avalie o conjunto texto + imagem.

**Critérios de avaliação:**
1. Força do gancho do texto — para o scroll?
2. Coerência texto + imagem — a imagem amplifica ou distrai?
3. Autenticidade — soa humano?
4. Formato — dentro de 500 chars? (valide com Plugin se necessário)
5. Potencial de reply — vai gerar conversa?

**Para cada elemento:**
---
TEXTO ✅ APROVADO / ❌ REJEITADO
[Se rejeitado: correção + motivo]

IMAGEM ✅ APROVADA / ❌ REJEITADA / ⚠️ SEM IMAGEM (publicar só texto)
[Se rejeitada: motivo — o Gestor vai publicar só texto]

CONJUNTO: [como texto + imagem funcionam juntos — pontuação 1-10]
---

Se o texto for rejeitado com correção simples, você mesmo corrige e aprova.`,
    },
    {
      agentId: AGENTS.gestor,
      role: 'Gestor de Publicação',
      prompt: `Texto e imagem aprovados pelo Editor:
{{response}}

Você é o Gestor de Publicação. Publique o post.

**Processo de decisão:**

1. **Se há imagem aprovada com URL**: chame **threads_publish_image_post** com { text, image_url }
2. **Se a imagem foi rejeitada ou não gerada**: chame **threads_publish_post** com { text } (só texto)

**Após publicar:**
- Confirme o Post ID retornado
- Registre na sua memória: "POST [data]: [tema] — publicado com imagem: [sim/não]. ID: [postId]"

**Relatório final:**
---
✅ Post publicado com [IMAGEM / TEXTO PURO]
Post ID: [id]
Tema: [tema]
Data/hora: [agora]

Próximos passos: monitorar engajamento em 2h e 24h via threads_get_post_insights
---`,
    },
  ];
}

async function main() {
  console.log('🖼️  Criando Orquestração "Produção de Post Threads com Imagem"...\n');

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

  const existing = await prisma.agentOrchestration.findFirst({
    where: { name: 'Produção de Post Threads com Imagem', createdBy: ADMIN_ID },
  });

  if (existing) {
    console.log('\n⏭️  Orquestração já existe — atualizando...');
    const updated = await prisma.agentOrchestration.update({
      where: { id: existing.id },
      data: { agents: buildAgentSteps(), status: 'active' },
    });
    console.log(`✅ Atualizada: ${updated.id}`);
    return;
  }

  const orchestration = await prisma.agentOrchestration.create({
    data: {
      name: 'Produção de Post Threads com Imagem',
      description: 'Pipeline completo com geração de imagem: Estrategista (ângulo) → Analista (dados reais) → Copywriter (texto ≤500 chars) → Designer Visual (gera imagem via Together AI) → Editor (aprova conjunto) → Gestor (publica com ou sem imagem).',
      createdBy: ADMIN_ID,
      strategy: 'sequential',
      status: 'active',
      agents: buildAgentSteps(),
      config: {
        inputLabel: 'Tema e objetivo do post (ex: "Automação de marketing — mostrar que a Polaris IA executa 5 posts/semana sem intervenção humana, objetivo: curiosidade + replies")',
        showCost: true,
        allowFeedbackLoop: false,
      },
    },
  });

  console.log(`\n✅ Orquestração criada: ${orchestration.id}`);
  console.log('\nPipeline (6 etapas):');
  console.log('  1. Estrategista  — ângulo + conceito visual');
  console.log('  2. Analista      — validação com dados reais do Threads');
  console.log('  3. Copywriter    — texto (≤500 chars)');
  console.log('  4. Designer      — gera imagem via threads_generate_image');
  console.log('  5. Editor        — aprova texto + imagem');
  console.log('  6. Gestor        — publica post com imagem (fallback: só texto)');
  console.log(`\n🔗 Acesse em: /dashboard/orchestrations/${orchestration.id}`);
  console.log('\n⚠️  Geração de imagem requer TOGETHER_API_KEY no .env');
}

main()
  .catch((e) => { console.error('❌ Erro:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
