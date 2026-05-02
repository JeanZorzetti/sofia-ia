/**
 * Cria a Orquestração "Planejamento de Campanha Threads".
 *
 * Pipeline:
 *   Estrategista → Analista → Copywriter (N posts) → Editor → Gestor (agenda)
 *
 * Input esperado:
 *   { nome, objetivo, tema_central, duracao_dias, posts_por_semana }
 *
 * Execute: npx tsx scripts/create-threads-campaign-orchestration.ts
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

function buildAgentSteps() {
  return [
    {
      agentId: AGENTS.estrategista,
      role: 'Diretor de Estratégia de Campanha',
      prompt: `Você é o Diretor de Estratégia. Recebeu um briefing de campanha para o Threads da Polaris IA.

**Seu entregável — Plano de Campanha Completo:**

1. **Arco Narrativo**: qual é a história que esta campanha vai contar ao longo dos dias?
   - Semana 1: Contexto + Problema (gerar identificação)
   - Semana 2+: Solução + Prova + CTA (gerar conversão)

2. **Para cada post da campanha**, defina:
   - Posição: [1, 2, 3, ...]
   - Tema: [título do tema]
   - Ângulo: [perspectiva única deste post dentro do arco]
   - Tom: [inspiracional / educacional / provocativo / baseado em dados / social proof]
   - Dia sugerido: [ex: Dia 1 = terça-feira da semana 1]
   - Horário ideal: [ex: 11h]
   - Conexão com o arco: [como este post prepara o seguinte]

3. **Tema âncora da campanha**: o post central que carrega toda a mensagem. Deve ser o mais poderoso.

4. **Métricas de sucesso da campanha**:
   - Taxa de engajamento alvo: [%]
   - Objetivo principal: [views / replies / seguidores / leads]

Seja específico. Cada post deve ser distinto e necessário para o arco.`,
    },
    {
      agentId: AGENTS.analista,
      role: 'Analista de Performance e Validação',
      prompt: `Plano estratégico da campanha:
{{response}}

Você é o Analista de Performance. Valide e enriqueça o plano com dados reais.

**Ações obrigatórias:**

1. Use **threads_get_profile_insights** para entender o contexto atual do perfil
2. Use **threads_get_recent_posts** (limit: 15) para verificar temas publicados recentemente
3. Para os 3 posts mais recentes relevantes, use **threads_get_post_insights**

**Com base nos dados, entregue:**

## Validação do Plano
- Algum tema da campanha já foi publicado recentemente? (evitar repetição)
- Qual o engajamento histórico de temas similares?
- Os horários sugeridos batem com os horários de maior performance?

## Ajustes Recomendados
- [lista de ajustes baseados em dados, se necessário]

## Benchmarks da Campanha
- Taxa de engajamento de referência (baseada nos últimos posts): [%]
- Melhor dia/horário histórico para este tipo de conteúdo: [dado]
- Estimativa de views por post (baseada em histórico): [N]

## Ordem de Prioridade dos Posts
- Post âncora recomendado: [posição]
- Posts de maior risco (temas não testados): [posições]
- Posts com maior probabilidade de engajamento: [posições]

Se não houver dados suficientes, indique claramente e prossiga com estimativas do setor.`,
    },
    {
      agentId: AGENTS.copywriter,
      role: 'Redator da Campanha',
      prompt: `Plano validado pelo Analista:
{{response}}

Você é o Copywriter da campanha. Escreva TODOS os posts do plano, em sequência.

**Para cada post:**

---
**POST [N] — [TEMA]**
Ângulo: [ângulo do Estrategista]
Tom: [tom definido]
Data sugerida: [data/dia]

[TEXTO DO POST — máx 500 caracteres]

Validação: [X/500 chars]
---

**REGRAS INEGOCIÁVEIS:**
- Cada post: máximo 500 caracteres (use o Plugin "Validador de Formato Threads")
- Gancho impactante na primeira linha de cada post
- Tom autêntico — sem jargão corporativo
- Cada post deve funcionar sozinho E também fazer sentido no arco da campanha
- Posts finais (últimos 30% da campanha) devem ter CTA implícito ou explícito

**Processo para cada post:**
1. Escreva o rascunho
2. Valide com o Plugin (verifique chars)
3. Se exceder, edite
4. Entregue APENAS o texto final de cada post

Escreva todos os posts em sequência. Não pule nenhum.`,
    },
    {
      agentId: AGENTS.editor,
      role: 'Editor Sênior da Campanha',
      prompt: `Posts escritos pelo Copywriter:
{{response}}

Você é o Editor Sênior. Revise TODOS os posts da campanha com critério editorial rigoroso.

**Para cada post, avalie:**
1. Força do gancho — faz parar o scroll?
2. Autenticidade — soa humano?
3. Coerência com o arco — encaixa na narrativa da campanha?
4. Adequação ao tom da Polaris IA — inteligente, direto, sem arrogância
5. Limite de caracteres — valide com o Plugin "Validador de Formato Threads"
6. CTA (para posts finais) — é natural e não invasivo?

**Formato de resposta para cada post:**

---
**POST [N] ✅ APROVADO / ❌ REJEITADO**
[Se aprovado]: [texto exato do post]
[Se rejeitado]: Motivo: [feedback específico + sugestão de correção]
---

**Resumo Editorial ao Final:**
- Posts aprovados: [N/total]
- Posts rejeitados: [lista com motivos]
- Coerência do arco: [avaliação geral]
- Post mais forte: [N] — [por quê]
- Post mais fraco: [N] — [como melhorar]

Para posts rejeitados, se for uma correção simples (<50 chars), você mesmo pode corrigir e aprovar.`,
    },
    {
      agentId: AGENTS.gestor,
      role: 'Gestor de Publicação e Agendamento',
      prompt: `Posts revisados pelo Editor:
{{response}}

Você é o Gestor de Publicação. Finalize e agende a campanha.

**Processo:**

1. **Extraia apenas os posts APROVADOS** (ignore os rejeitados sem correção)

2. **Para cada post aprovado, crie um agendamento** usando a API:
   POST /api/threads/schedule
   Body: { text, scheduledAt, createdBy: "campanha", metadata: { campanha, posicao, tema } }

   Calcule as datas/horários baseado no plano do Estrategista + ajustes do Analista.
   Regra: mínimo 24h entre posts da mesma campanha.

3. **Confirme o agendamento** listando:
   ✅ Post [N] — "[texto truncado]" → [data] às [hora]

4. **Crie a campanha no banco** se possível:
   POST /api/threads/campaigns
   Body: { name, objective, theme, startDate, endDate }

5. **Salve na sua memória** o nome da campanha e as datas de publicação.

**Relatório Final da Campanha:**

## Campanha Agendada ✅
- Nome: [nome]
- Total de posts: [N] ([N aprovados / N agendados])
- Período: [data início] → [data fim]
- Post âncora: [N] — [data de publicação]

## Agenda de Publicação
[lista com todos os posts e horários]

## Próximos Passos
- Monitor: verificar engajamento 24h após cada post
- Ajuste: o Analista será acionado se algum post tiver <3% de engajamento`,
    },
  ];
}

async function main() {
  console.log('🎯 Criando Orquestração "Planejamento de Campanha Threads"...\n');

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
    where: { name: 'Planejamento de Campanha Threads', createdBy: ADMIN_ID },
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
      name: 'Planejamento de Campanha Threads',
      description: 'Pipeline completo de planejamento de campanha: briefing → arco narrativo → validação de dados → redação de todos os posts → revisão editorial → agendamento automático no calendário.',
      createdBy: ADMIN_ID,
      strategy: 'sequential',
      status: 'active',
      agents: buildAgentSteps(),
      config: {
        inputLabel: 'Briefing da campanha (ex: "Campanha de lançamento do Plano Pro — 10 posts em 2 semanas, foco em conversão, tema: como a Polaris IA multiplica resultados de marketing")',
        showCost: true,
        allowFeedbackLoop: false,
      },
    },
  });

  console.log(`\n✅ Orquestração criada: ${orchestration.id}`);
  console.log('\nPipeline (5 etapas):');
  console.log('  1. Estrategista — arco narrativo + plano de N posts');
  console.log('  2. Analista     — validação com dados reais do Threads');
  console.log('  3. Copywriter   — redação de todos os posts (≤500 chars cada)');
  console.log('  4. Editor       — revisão editorial + aprovação');
  console.log('  5. Gestor       — agendamento automático no calendário');
  console.log(`\n🔗 Acesse em: /dashboard/orchestrations/${orchestration.id}`);
  console.log('\nInput esperado:');
  console.log('  "Campanha [nome] — [N] posts em [X] semanas, objetivo [objetivo], tema: [tema central]"');
}

main()
  .catch((e) => { console.error('❌ Erro:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
