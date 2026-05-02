/**
 * Cria o Flow "Radar de Leads Threads" — L2.
 *
 * Estende o monitoramento de engajamento com detecção ativa de leads quentes
 * e engine de resposta personalizada para potenciais clientes.
 *
 * CRON: a cada 4 horas ("0 *-slash-4 * * *")
 *
 * Pipeline:
 *   [CRON: 4h]
 *       → Analista:  varre replies dos últimos 5 posts
 *                    classifica por potencial de lead (keywords, conta, contexto)
 *                    prioriza top 5 leads quentes
 *       → Gestor:    gera resposta personalizada para cada lead
 *                    publica via threads_reply_to_post
 *                    salva leads qualificados na memória
 *
 * Execute: npx tsx scripts/create-threads-lead-radar-flow.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_ID = '46212883-7220-41bf-bd8b-e676bfd1baaf';

const AGENTS = {
  analista: '1f3811da-f92f-4cd6-a66f-05a6ff17ab94',
  gestor:   '8d03ebc6-6dcb-447b-9f41-5a78e6f7987f',
};

const NODES = [
  {
    id: 'trigger-lead-radar',
    type: 'trigger_cron',
    position: { x: 400, y: 80 },
    data: {
      label: 'Radar de Leads — a cada 4 horas',
      config: {
        cronExpression: '0 */4 * * *',
        inputLabel: 'Varredura automática de leads quentes nos posts do Threads',
      },
    },
  },
  {
    id: 'agent-analista-leads',
    type: 'action_ai_agent',
    position: { x: 400, y: 280 },
    data: {
      label: 'Analista — Classificação de Leads',
      config: {
        agentId: AGENTS.analista,
        prompt: `Você é o Analista de Leads. Seu trabalho é identificar potenciais clientes nos comentários dos posts do Threads.

**Processo:**

1. Use **threads_get_recent_posts** (limit: 5) para listar os últimos 5 posts

2. Para cada post, use **threads_get_replies** para listar os comentários recentes

3. Analise cada reply e classifique como:

**🔥 LEAD QUENTE** (prioridade máxima — responder agora):
- Menciona preço, custo, planos, assinar, contratar
- Pergunta como funciona, como começar, como testar
- Demonstra dor/problema que a Polaris IA resolve
- Conta com +500 seguidores (maior amplificação)
- Pergunta específica sobre funcionalidades

**🟡 LEAD MORNO** (responder se sobrar tempo):
- Elogio com curiosidade implícita
- Pedido de mais informações genérico
- Compartilhou experiência similar

**⬜ ENGAJAMENTO NORMAL** (não precisa de resposta de lead):
- Só concordância ("exato!", "verdade")
- Emoji
- Comentário sem intenção comercial clara

**Entregue o RELATÓRIO DE LEADS:**

## Radar de Leads — [data/hora atual]

### Posts Analisados: [N]
### Replies Lidas: [N total]

### 🔥 Leads Quentes (máx. 5 — priorizar estes)

Para cada lead quente:
**Lead [N]**
- Post: [ID do post / tema truncado]
- Reply ID: [ID]
- @usuário: [username]
- Texto: "[texto da reply]"
- Sinal de lead: [por que é um lead quente]
- Contexto do post: [do que tratava o post]

### 🟡 Leads Mornos (listar apenas, não priorizar)
- [lista simples com @usuário + sinal]

### Resumo
- Leads quentes encontrados: [N]
- Leads mornos: [N]
- Posts sem leads: [N]

Se não houver leads nesta varredura, indique claramente: "✅ Nenhum lead qualificado nesta varredura."

Salve na memória: "RADAR [data/hora]: [N] leads quentes detectados. Posts analisados: [N]."`,
      },
    },
  },
  {
    id: 'agent-gestor-leads',
    type: 'action_ai_agent',
    position: { x: 400, y: 540 },
    data: {
      label: 'Gestor — Response Engine de Leads',
      config: {
        agentId: AGENTS.gestor,
        prompt: `Relatório de leads do Analista:
{{response}}

Você é o Gestor de Leads. Sua missão é responder os leads quentes de forma que abra conversa — sem vender diretamente.

**Princípios do Response Engine:**

1. **Resposta genuína, não de vendas**: a primeira mensagem deve entregar valor, não fechar venda
2. **Personalizar para o contexto**: use o que o lead escreveu para criar uma resposta relevante
3. **Brevidade**: 80-150 caracteres — respostas curtas geram mais replies
4. **Abrir próximo passo naturalmente**: deixe uma porta aberta (pergunta de volta, sugestão de experimentar)

**Tom por tipo de sinal:**
- "Quanto custa?" → Não dar preço direto. Ex: "Depende do uso! Você faz marketing de conteúdo atualmente?"
- "Como funciona?" → Dar 1 exemplo concreto + pergunta. Ex: "A Polaris IA escreve e agenda posts automaticamente. Qual parte do marketing te consome mais tempo?"
- "Quero testar" → Facilitar. Ex: "Ótimo! Posso te explicar como funciona o trial em 2 minutos. O que você mais quer automatizar?"
- Dor implícita → Validar + oferecer direção. Ex: "Entendo demais essa dor. Você já tentou alguma ferramenta de automação antes?"

**Processo:**

Para cada lead quente do relatório:

1. Leia o contexto (post + reply do lead)
2. Crie a resposta personalizada (80-150 chars)
3. Chame **threads_reply_to_post** com { post_id: [reply_id], text: [resposta] }
   ⚠️ Responda ao ID da REPLY, não ao post principal
4. Confirme a resposta enviada

**Limite: máximo 5 respostas por ciclo** (evitar shadowban)

**Se não houver leads quentes:**
- Verifique se há leads mornos que valem uma resposta rápida (prioridade mais baixa)
- Se não houver nenhum, confirme: "✅ Nenhum lead para responder nesta varredura."

**Relatório final:**

## Response Engine — [data/hora]

### Respostas Enviadas
Para cada resposta:
✅ @[username] — "[texto da resposta]" (reply ID: [id])

### Leads Qualificados (para acompanhamento)
[Leads que demonstraram interesse real — salve na memória para follow-up futuro]

### Resumo
- Respostas enviadas: [N/5 máx]
- Leads salvos para acompanhamento: [N]

Salve na memória: "LEADS RESPONDIDOS [data]: [N] respostas enviadas. Leads quentes: [@usuário1 (contexto), @usuário2 (contexto)]. Follow-up recomendado em 24h."`,
      },
    },
  },
];

const EDGES = [
  { id: 'e1', source: 'trigger-lead-radar',   target: 'agent-analista-leads' },
  { id: 'e2', source: 'agent-analista-leads',  target: 'agent-gestor-leads' },
];

async function main() {
  console.log('🎯 Criando Flow "Radar de Leads Threads"...\n');

  const agentIds = Object.values(AGENTS);
  const agents = await prisma.agent.findMany({
    where: { id: { in: agentIds } },
    select: { id: true, name: true },
  });

  if (agents.length !== agentIds.length) {
    console.error('❌ Alguns agentes não encontrados');
    process.exit(1);
  }

  const nameOf = Object.fromEntries(agents.map(a => [a.id, a.name]));
  console.log('✅ Agentes:');
  for (const [k, id] of Object.entries(AGENTS)) console.log(`  ${k}: ${nameOf[id]}`);

  const existing = await prisma.flow.findFirst({
    where: { name: 'Radar de Leads Threads', createdBy: ADMIN_ID },
  });

  if (existing) {
    const updated = await prisma.flow.update({
      where: { id: existing.id },
      data: { nodes: NODES, edges: EDGES, status: 'active' },
    });
    console.log(`\n⏭️  Atualizado: ${updated.id}`);
    return;
  }

  const flow = await prisma.flow.create({
    data: {
      name: 'Radar de Leads Threads',
      description: 'A cada 4h: Analista varre replies dos últimos 5 posts e classifica leads quentes (por keywords, tamanho da conta, intenção) → Gestor responde top 5 leads com mensagens personalizadas (80-150 chars) via threads_reply_to_post, sem vender diretamente, abrindo conversa.',
      createdBy: ADMIN_ID,
      triggerType: 'cron',
      cronExpression: '0 */4 * * *',
      status: 'active',
      nodes: NODES,
      edges: EDGES,
      settings: {
        timezone: 'America/Sao_Paulo',
        errorHandling: 'continue',
        retryPolicy: { maxRetries: 1, delay: 60 },
      },
      variables: {
        MAX_RESPOSTAS_POR_CICLO: 5,
        POSTS_ANALISADOS: 5,
        MIN_CHARS_RESPOSTA: 80,
        MAX_CHARS_RESPOSTA: 150,
      },
      icon: 'Target',
      color: 'rose',
      tags: ['threads', 'leads', 'engagement', 'sales', 'automated'],
    },
  });

  console.log(`\n✅ Flow criado: ${flow.id}`);
  console.log('\nPipeline (CRON: a cada 4 horas):');
  console.log('  [CRON] → Analista (classifica leads) → Gestor (responde até 5 leads)');
  console.log('\nCronExpression: "0 */4 * * *" (a cada 4h, America/Sao_Paulo)');
  console.log('\nSinais de lead quente: preço, como funciona, como testar, dor implícita, conta +500 seguidores');
  console.log(`\n🔗 Acesse em: /dashboard/flows/${flow.id}`);
}

main()
  .catch((e) => { console.error('❌ Erro:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
