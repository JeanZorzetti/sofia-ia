/**
 * Cria o Flow "A/B Test — Leitura de Resultados Threads"
 * CRON: todo dia às 10h
 *
 * Pipeline:
 *   [CRON: todo dia 10h]
 *       → Analista: verifica A/B tests em aberto (A publicado >24h atrás)
 *                   mede engajamento de A, compara com threshold
 *                   registra padrão vencedor na memória
 *       → Gestor:   se A perdeu → mantém B agendada
 *                   se A ganhou → cancela B do calendário
 *                   reporta resultado
 *
 * Execute: npx tsx scripts/create-threads-ab-test-analysis-flow.ts
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
    id: 'trigger-ab-analysis',
    type: 'trigger_cron',
    position: { x: 400, y: 80 },
    data: {
      label: 'Todo dia às 10h (leitura de A/B tests)',
      config: {
        cronExpression: '0 10 * * *',
        inputLabel: 'Leitura diária dos resultados de A/B tests ativos',
      },
    },
  },
  {
    id: 'agent-analista-ab',
    type: 'action_ai_agent',
    position: { x: 400, y: 260 },
    data: {
      label: 'Analista — Leitura de Resultados',
      config: {
        agentId: AGENTS.analista,
        prompt: `Você é o Analista. É hora de verificar os A/B tests em andamento.

**Processo:**

1. Consulte sua memória para encontrar A/B tests registrados nos últimos 3 dias
   (formato: "A/B Test [id]: Variante A publicada em [data]...")

2. Para cada teste com A publicado há mais de 24h:
   a. Use **threads_get_post_insights(postA_id)** para medir o engajamento de A
   b. Calcule: engajamento = (likes + replies + reposts + quotes) / views * 100

3. Compare com o threshold definido para cada teste

4. **Entregue o RELATÓRIO DE A/B TESTS:**

## Testes Analisados Hoje

### Teste [id] — Tema: [tema]
- Variante A publicada em: [data/hora]
- Views: [N] | Likes: [N] | Replies: [N] | Reposts: [N]
- Engajamento: [%]%
- Threshold: [%]%
- **Resultado: A VENCEU / A PERDEU**
- Razão: [análise do por que ganhou ou perdeu]
- Padrão identificado: [ex: "ganchos baseados em dados > perguntas abertas neste nicho"]

## Insights Acumulados (A/B Tests)
- Padrão mais forte até agora: [tipo de gancho que mais vence]
- Taxa de vitória de A (histórico): [X de Y testes]
- Recomendação para próximos testes: [sugestão baseada em dados]

5. **Salve na sua memória** o resultado de cada teste no formato:
   "A/B Test [id] RESULTADO: [A VENCEU / A PERDEU] com [%]% de engajamento (threshold: [%]%). Gancho vencedor: [tipo]. Insight: [padrão identificado]."

Se não houver testes pendentes, responda: "✅ Nenhum A/B test ativo para analisar hoje."`,
      },
    },
  },
  {
    id: 'agent-gestor-ab-decision',
    type: 'action_ai_agent',
    position: { x: 400, y: 480 },
    data: {
      label: 'Gestor — Decisão sobre Variante B',
      config: {
        agentId: AGENTS.gestor,
        prompt: `Análise do Analista:
{{response}}

Você é o Gestor. Com base nos resultados, tome as decisões sobre as variantes B.

**Para cada teste analisado:**

**Se A VENCEU** (engajamento ≥ threshold):
1. Consulte o calendário para encontrar a Variante B agendada deste teste:
   GET /api/threads/schedule?status=pending
   Filtre pelo abTestId correspondente nos metadata
2. Cancel a Variante B:
   DELETE /api/threads/schedule/[id]
3. Registre: "Variante B do teste [id] cancelada. A ganhou com [%]%."

**Se A PERDEU** (engajamento < threshold):
1. Verifique se a Variante B está agendada e com status "pending"
2. Se ainda está pendente: deixe ir ao ar no horário programado (não faça nada)
3. Se foi cancelada por engano: recrie com POST /api/threads/schedule
4. Registre: "Variante B do teste [id] será publicada em [horário]."

**Relatório Final:**

## Decisões de A/B Tests — [data de hoje]

| Teste ID | Tema | Resultado A | Decisão B |
|---|---|---|---|
| [id] | [tema] | [%]% — [VENCEU/PERDEU] | [Cancelada / Vai ao ar em X] |

## Insights do Squad (para o Estrategista)
Com base nos A/B tests desta semana, os seguintes padrões de gancho devem ser priorizados nas próximas produções:
- [padrão 1 baseado nos resultados]
- [padrão 2]

Salve estes insights na sua memória como: "Preferência de gancho confirmada em [data]: [padrão]."`,
      },
    },
  },
];

const EDGES = [
  { id: 'e1', source: 'trigger-ab-analysis',  target: 'agent-analista-ab' },
  { id: 'e2', source: 'agent-analista-ab',     target: 'agent-gestor-ab-decision' },
];

async function main() {
  console.log('📊 Criando Flow "A/B Test — Leitura de Resultados Threads"...\n');

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
    where: { name: 'A/B Test — Leitura de Resultados Threads', createdBy: ADMIN_ID },
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
      name: 'A/B Test — Leitura de Resultados Threads',
      description: 'Todo dia às 10h: Analista lê engajamento das variantes A (>24h) e compara com threshold → Gestor cancela B se A venceu, ou confirma publicação de B se A perdeu. Salva padrões na memória.',
      createdBy: ADMIN_ID,
      triggerType: 'cron',
      cronExpression: '0 10 * * *',
      status: 'active',
      nodes: NODES,
      edges: EDGES,
      settings: {
        timezone: 'America/Sao_Paulo',
        errorHandling: 'continue',
        retryPolicy: { maxRetries: 1, delay: 30 },
      },
      icon: 'FlaskConical',
      color: 'amber',
      tags: ['threads', 'ab-test', 'analytics', 'automated'],
    },
  });

  console.log(`\n✅ Flow criado: ${flow.id}`);
  console.log('\nCronExpression: "0 10 * * *" (todo dia às 10h, America/Sao_Paulo)');
  console.log(`\n🔗 Acesse em: /dashboard/flows/${flow.id}`);
}

main()
  .catch((e) => { console.error('❌ Erro:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
