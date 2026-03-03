/**
 * Cria o Flow "Inteligência Competitiva Threads" — L4.
 *
 * Pipeline:
 *   [CRON: toda terça às 8h]
 *       → Analista:     busca tendências virais (web_search)
 *                       analisa padrões de conteúdo de alto engajamento
 *       → Estrategista: incorpora insights ao plano da semana seguinte
 *                       sugere adaptações e ângulos únicos para a Sofia
 *
 * Execute: npx tsx scripts/create-threads-competitive-intel-flow.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_ID = '46212883-7220-41bf-bd8b-e676bfd1baaf';

const AGENTS = {
  analista:     '1f3811da-f92f-4cd6-a66f-05a6ff17ab94',
  estrategista: '8b41f3f9-944f-420b-8800-6b7961b14aed',
};

const NODES = [
  {
    id: 'trigger-competitive-intel',
    type: 'trigger_cron',
    position: { x: 400, y: 80 },
    data: {
      label: 'Toda terça às 8h',
      config: {
        cronExpression: '0 8 * * 2',
        inputLabel: 'Varredura semanal de inteligência competitiva e tendências Threads',
      },
    },
  },
  {
    id: 'agent-analista-intel',
    type: 'action_ai_agent',
    position: { x: 400, y: 280 },
    data: {
      label: 'Analista — Radar de Tendências',
      config: {
        agentId: AGENTS.analista,
        prompt: `Você é o Analista de Inteligência Competitiva. Toda terça-feira, você faz a varredura do ecossistema Threads para identificar o que está viralizando e o que podemos aprender.

**Processo de varredura:**

1. Use **web_search** com as queries abaixo (execute TODAS):
   - "threads app viral posts AI automation this week"
   - "threads melhores posts semana inteligência artificial automação"
   - "threads trending content marketing digital Brasil"
   - "viral hooks threads app [semana atual]"

2. Use **threads_get_profile_insights** para comparar nosso crescimento com o benchmark da semana

3. Use **threads_get_recent_posts** (limit: 10) para ver quais nossos posts recentes tiveram mais tração esta semana

**Produza o RELATÓRIO DE INTELIGÊNCIA:**

## Radar da Semana — [data atual]

### Tendências Detectadas no Ecossistema

**Tema 1:** [nome do tema]
- O que está viralizando: [descrição]
- Por que funciona: [análise do mecanismo]
- Exemplo de gancho: [primeira linha de um post viral]
- Relevância para a Sofia: [alta/média/baixa] — [justificativa]

**Tema 2:** [repetir estrutura]

**Tema 3:** [repetir estrutura]

### Formatos com Mais Tração Esta Semana
- Formato 1: [ex: "thread com lista numerada"] — [nível de engajamento observado]
- Formato 2: [ex: "pergunta polarizante"] — [nível de engajamento]
- Formato 3: [ex: "dado chocante na primeira linha"] — [nível de engajamento]

### Palavras/Termos em Alta
- [lista de 5-8 palavras ou expressões que aparecem em posts de alto engajamento]

### Nossa Performance vs. Benchmark
- Engajamento médio nosso esta semana: [métrica do profile insights]
- Benchmark estimado para o nicho: [estimativa baseada nos posts pesquisados]
- Gap: [+/-X%]

### Oportunidades Identificadas
1. [oportunidade concreta baseada nas tendências]
2. [oportunidade concreta]
3. [oportunidade concreta]

### Temas a Evitar Esta Semana
- [tema saturado ou que virou ruído]

Salve na sua memória: "INTEL [semana/mês]: tendências [top 3 temas], oportunidades [top 2], formatos quentes [top 2]"`,
      },
    },
  },
  {
    id: 'agent-estrategista-intel',
    type: 'action_ai_agent',
    position: { x: 400, y: 520 },
    data: {
      label: 'Estrategista — Incorpora Insights ao Plano',
      config: {
        agentId: AGENTS.estrategista,
        prompt: `Relatório de Inteligência do Analista:
{{response}}

Você é o Estrategista. Com base nesta inteligência competitiva, atualize e enriqueça o plano de conteúdo da semana seguinte.

**Entregue o BRIEFING DE ADAPTAÇÃO:**

## Briefing: Adaptações para a Semana Que Vem

### Tendências que Vamos Surfar
Para cada tendência relevante identificada pelo Analista:

**Tendência: [nome]**
- Nossa ângulo único: [como a Sofia aborda isso de forma diferente dos demais]
- Post sugerido: [tema + gancho em primeira linha]
- Posição na semana: [ex: "publicar na quarta às 11h — pico da tendência"]
- Risco de saturação: [já/quase/ainda não]

### Adaptações ao Plano Existente
[Consulte sua memória para ver o plano atual da semana]
- Post [N]: manter como está / ajustar gancho para: [novo gancho inspirado na tendência X]
- Post [N]: substituir por post sobre [nova oportunidade]
- Novo post a incluir: [tema que surgiu do radar]

### Formatos para Testar Esta Semana
Baseado nos formatos com mais tração:
1. [formato 1] → aplicar em post [N]: [como]
2. [formato 2] → aplicar em post [N]: [como]

### Palavras/Termos para Usar nos Ganchos
[lista de 3-5 termos em alta que se encaixam no nosso tom]

### O Que NÃO Fazer Esta Semana
- [tema/formato saturado a evitar]

### Resumo Executivo para o Time
Em 3 linhas: o que mudou no ecossistema, o que vamos surfar, e qual o post mais estratégico da semana baseado no radar.

Salve na sua memória: "AJUSTE SEMANAL [data]: incorporei inteligência sobre [top 2 tendências]. Posts ajustados: [N]. Novo post adicionado: [tema]."`,
      },
    },
  },
];

const EDGES = [
  { id: 'e1', source: 'trigger-competitive-intel', target: 'agent-analista-intel' },
  { id: 'e2', source: 'agent-analista-intel',       target: 'agent-estrategista-intel' },
];

async function main() {
  console.log('🔍 Criando Flow "Inteligência Competitiva Threads"...\n');

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
    where: { name: 'Inteligência Competitiva Threads', createdBy: ADMIN_ID },
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
      name: 'Inteligência Competitiva Threads',
      description: 'Toda terça às 8h: Analista faz varredura de tendências virais (web_search + insights) → Estrategista incorpora oportunidades ao plano da semana seguinte, sugerindo adaptações de ganchos e novos posts.',
      createdBy: ADMIN_ID,
      triggerType: 'cron',
      cronExpression: '0 8 * * 2',
      status: 'active',
      nodes: NODES,
      edges: EDGES,
      settings: {
        timezone: 'America/Sao_Paulo',
        errorHandling: 'continue',
        retryPolicy: { maxRetries: 1, delay: 60 },
      },
      variables: {
        QUERIES_WEB_SEARCH: 4,
        TENDENCIAS_ALVO: 3,
      },
      icon: 'Radar',
      color: 'cyan',
      tags: ['threads', 'competitive-intel', 'weekly', 'web-search', 'trends'],
    },
  });

  console.log(`\n✅ Flow criado: ${flow.id}`);
  console.log('\nPipeline (CRON: toda terça, 8h):');
  console.log('  [CRON] → Analista (web_search + tendências) → Estrategista (adapta plano da semana)');
  console.log('\nCronExpression: "0 8 * * 2" (terças às 8h, America/Sao_Paulo)');
  console.log(`\n🔗 Acesse em: /dashboard/flows/${flow.id}`);
}

main()
  .catch((e) => { console.error('❌ Erro:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
