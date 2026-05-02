/**
 * Cria o Flow "Ciclo Mensal Threads" — Autopilot total.
 * CRON: dia 1 de cada mês às 9h.
 *
 * Pipeline:
 *   [CRON: dia 1 às 9h]
 *       → Analista:     consolida métricas dos últimos 30 dias
 *                       identifica o que funcionou e o que não funcionou
 *       → Estrategista: plano de 20+ posts para o mês
 *                       baseado em dados do Analista + tendências
 *       → Copywriter:   redação dos primeiros 5 posts (semana 1)
 *       → Editor:       revisão dos 5 posts
 *       → Gestor:       agenda os 5 posts da semana 1
 *                       cria a campanha mensal
 *                       summary executivo do plano
 *
 * Execute: npx tsx scripts/create-threads-monthly-cycle-flow.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_ID = '46212883-7220-41bf-bd8b-e676bfd1baaf';

const AGENTS = {
  analista:     '1f3811da-f92f-4cd6-a66f-05a6ff17ab94',
  estrategista: '8b41f3f9-944f-420b-8800-6b7961b14aed',
  copywriter:   '87245dd3-76b3-4776-bdf0-2c38896e74c0',
  editor:       '43d8df70-4f66-4407-9aca-a37a2bfc6299',
  gestor:       '8d03ebc6-6dcb-447b-9f41-5a78e6f7987f',
};

const NODES = [
  {
    id: 'trigger-monthly',
    type: 'trigger_cron',
    position: { x: 400, y: 80 },
    data: {
      label: 'Dia 1 de cada mês às 9h',
      config: {
        cronExpression: '0 9 1 * *',
        inputLabel: 'Início do ciclo mensal automático da agência Threads',
      },
    },
  },
  {
    id: 'agent-analista-monthly',
    type: 'action_ai_agent',
    position: { x: 400, y: 260 },
    data: {
      label: 'Analista — Consolidação do Mês Anterior',
      config: {
        agentId: AGENTS.analista,
        prompt: `Hoje é dia 1. Você é o Analista de Métricas. Consolide a performance do mês anterior.

**Processo obrigatório:**

1. Use **threads_get_profile_insights** (since: [30 dias atrás], until: [ontem]) para métricas do mês
2. Use **threads_get_recent_posts** (limit: 25) para listar todos os posts do mês
3. Para os 5 posts com mais tempo publicado (ou os mais relevantes), use **threads_get_post_insights**

**Produza o RELATÓRIO MENSAL:**

## Performance do Mês Anterior

### Métricas Gerais
- Views totais: [N]
- Likes totais: [N]
- Replies totais: [N]
- Reposts + Quotes: [N]
- Taxa de engajamento geral: [%]%
- Variação vs mês anterior: [+/-X%] (se disponível na memória)

### Top 5 Posts do Mês
| Pos | Data | Tema (snippet) | Views | Eng.% |
|---|---|---|---|---|
| 1 | [data] | [texto truncado] | [N] | [%] |
...

### Análise de Padrões

**O que funcionou:**
- Formato: [ex: posts com pergunta no final tiveram 2x mais replies]
- Horário: [ex: terças às 11h consistentemente melhor]
- Temas: [ex: "automação" teve 40% mais alcance que "IA generativa"]
- Tom: [ex: posts com dado concreto na 1ª linha tiveram mais views]

**O que não funcionou:**
- [padrão 1 que underperformou]
- [padrão 2]

**Insights dos A/B tests (da memória):**
- [resultado acumulado dos testes do mês]

### Recomendações para o Próximo Mês
1. [recomendação baseada em dado]
2. [recomendação baseada em dado]
3. [experimento sugerido para o mês]

### Meta para o Próximo Mês
- Taxa de engajamento alvo: [atual + 0.5%] = [%]%
- Volume de posts: [N] (baseado na capacidade da equipe)
- Tema prioritário: [baseado em dados]

Salve este relatório na sua memória como: "MENSAL [mês/ano]: [métricas-chave resumidas]"`,
      },
    },
  },
  {
    id: 'agent-estrategista-monthly',
    type: 'action_ai_agent',
    position: { x: 400, y: 480 },
    data: {
      label: 'Estrategista — Plano Mensal (20+ posts)',
      config: {
        agentId: AGENTS.estrategista,
        prompt: `Relatório do Analista:
{{response}}

Você é o Estrategista. Com base na análise, crie o plano de conteúdo para o mês inteiro.

**Entregue o PLANO MENSAL COMPLETO:**

## Estratégia do Mês

### Tema Central do Mês
[Um tema guarda-chuva que une todos os posts: ex: "Automação que libera tempo para o que importa"]

### Arco Narrativo
- Semana 1: [Contexto / Problema] — abre o mês estabelecendo relevância
- Semana 2: [Solução / Método] — aprofunda o valor
- Semana 3: [Prova / Cases] — valida com evidência
- Semana 4: [Síntese / CTA] — fecha o mês com call to action natural

### Mix de Formatos
- [X]% posts únicos (educacional, dado, provocação)
- [X]% perguntas que geram replies
- [X]% posts de social proof / bastidores
- [X]% A/B tests

## Posts do Mês (mínimo 20)

Para cada post:

**Post [N] — Semana [X] — [Dia sugerido] às [hora]**
- Tema: [título do tema]
- Ângulo: [perspectiva única]
- Tipo: [Educacional / Provocativo / Dado Concreto / Pergunta / Social Proof / Bastidores / A/B Test]
- Gancho sugerido: [primeira linha]
- Conexão com arco: [como se encaixa na narrativa do mês]
- CTA esperado: [o que queremos que aconteça]

---

## Posts Prioritários para Esta Semana (Semana 1 — 5 posts)
[Destacar os primeiros 5 posts que o Copywriter vai escrever agora]

## Posts de A/B Test Sugeridos
[Indicar quais posts do mês devem ser A/B testados — mínimo 2]

## Guardrails do Mês
- Temas a evitar: [ex: não falar de concorrentes, não fazer promessas específicas]
- Tom obrigatório: [consistência com mês anterior]
- Frequência máxima: 1 post/dia útil (5/semana)

Salve o plano na sua memória como: "PLANO [mês/ano]: [lista de 20+ temas com datas]"`,
      },
    },
  },
  {
    id: 'agent-copywriter-week1',
    type: 'action_ai_agent',
    position: { x: 400, y: 700 },
    data: {
      label: 'Copywriter — Semana 1 (5 posts)',
      config: {
        agentId: AGENTS.copywriter,
        prompt: `Plano mensal do Estrategista:
{{response}}

Você é o Copywriter. Escreva os 5 posts da Semana 1 agora.

Para cada um dos 5 posts prioritários da Semana 1:

---
**POST [N] — [TEMA]**
Tipo: [tipo]
Data/hora: [conforme plano]

[TEXTO COMPLETO DO POST — máx 500 chars]

Validação: [X/500 chars]
---

**REGRAS:**
- Máximo 500 caracteres por post (valide com o Plugin "Validador de Formato Threads")
- Gancho impactante na primeira linha de cada post
- Tom da Polaris IA: direto, inteligente, sem jargão corporativo
- Posts de perguntas: a pergunta deve ser específica e fácil de responder
- Posts de A/B test (se houver na semana 1): escreva as 2 variantes

Escreva todos os 5 posts completos, prontos para o Editor revisar.`,
      },
    },
  },
  {
    id: 'agent-editor-week1',
    type: 'action_ai_agent',
    position: { x: 400, y: 920 },
    data: {
      label: 'Editor — Revisão Semana 1',
      config: {
        agentId: AGENTS.editor,
        prompt: `Posts da Semana 1 escritos pelo Copywriter:
{{response}}

Você é o Editor. Revise todos os 5 posts da semana 1.

Para cada post:

---
**POST [N] ✅ APROVADO / ❌ REJEITADO**
[Se aprovado: texto exato final]
[Se rejeitado: correção feita pelo Editor — se simples, você mesmo corrige e aprova]
Força do gancho: [1-10]
Tom: [✅ correto / ❌ ajustado]
---

**Resumo da Semana 1:**
- Posts aprovados sem mudança: [N/5]
- Posts corrigidos e aprovados: [N/5]
- Posts rejeitados (precisam de reescrita): [N/5]
- Post mais forte da semana: Post [N]
- Comentário geral: [avaliação editorial da coerência com o arco mensal]

Entregue os textos finais aprovados numerados e prontos para agendamento.`,
      },
    },
  },
  {
    id: 'agent-gestor-monthly',
    type: 'action_ai_agent',
    position: { x: 400, y: 1140 },
    data: {
      label: 'Gestor — Agenda Semana 1 + Cria Campanha Mensal',
      config: {
        agentId: AGENTS.gestor,
        prompt: `Posts aprovados pelo Editor:
{{response}}

Você é o Gestor. Execute a configuração do mês.

**Passo 1 — Agendar os 5 posts da Semana 1:**
Para cada post aprovado, chame:
POST /api/threads/schedule
Body: {
  "text": "[texto aprovado]",
  "scheduledAt": "[data/hora ISO 8601 conforme plano]",
  "createdBy": "ciclo_mensal",
  "metadata": { "semana": 1, "mes": "[mês/ano]", "tipo": "[tipo do post]" }
}

**Passo 2 — Criar a campanha mensal:**
POST /api/threads/campaigns
Body: {
  "name": "Campanha Mensal [mês/ano]",
  "objective": "awareness",
  "theme": "[tema central do mês]",
  "startDate": "[hoje]",
  "endDate": "[último dia do mês]"
}

**Passo 3 — Salvar contexto na memória:**
"CICLO MENSAL INICIADO [mês/ano]: Semana 1 agendada (5 posts). Plano completo de [N] posts salvo pelo Estrategista. Tema central: [tema]. Próximas semanas: semanas 2, 3, 4 serão agendadas pela Orquestração Produção de Post conforme necessário."

**Relatório Final do Ciclo Mensal:**

## Ciclo Mensal Iniciado ✅ — [mês/ano]

### Semana 1 Agendada
[Lista dos 5 posts com data/hora]

### Plano Completo do Mês
- Total de posts planejados: [N]
- Semana 1: 5 posts agendados ✅
- Semanas 2-4: serão produzidos conforme Orquestração Produção
- A/B tests planejados: [N]

### Métricas a Monitorar
- Engajamento alvo: [%]%
- Post âncora do mês: [tema] — publicado em [data]

A agência está operacional para [mês/ano]. O Flow Semanal (toda segunda) e o Monitoramento de Engajamento (6h) continuam rodando em paralelo.`,
      },
    },
  },
];

const EDGES = [
  { id: 'e1', source: 'trigger-monthly',              target: 'agent-analista-monthly' },
  { id: 'e2', source: 'agent-analista-monthly',       target: 'agent-estrategista-monthly' },
  { id: 'e3', source: 'agent-estrategista-monthly',   target: 'agent-copywriter-week1' },
  { id: 'e4', source: 'agent-copywriter-week1',       target: 'agent-editor-week1' },
  { id: 'e5', source: 'agent-editor-week1',           target: 'agent-gestor-monthly' },
];

async function main() {
  console.log('🗓️  Criando Flow "Ciclo Mensal Threads" (Autopilot)...\n');

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
    where: { name: 'Ciclo Mensal Threads', createdBy: ADMIN_ID },
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
      name: 'Ciclo Mensal Threads',
      description: 'Dia 1 de cada mês às 9h: Analista consolida mês anterior → Estrategista planeja 20+ posts para o mês → Copywriter escreve Semana 1 (5 posts) → Editor revisa → Gestor agenda + cria campanha mensal. Autopilot total.',
      createdBy: ADMIN_ID,
      triggerType: 'cron',
      cronExpression: '0 9 1 * *',
      status: 'active',
      nodes: NODES,
      edges: EDGES,
      settings: {
        timezone: 'America/Sao_Paulo',
        errorHandling: 'continue',
        retryPolicy: { maxRetries: 1, delay: 120 },
      },
      variables: {
        POSTS_POR_SEMANA: 5,
        POSTS_POR_MES: 20,
        ENGAGEMENT_ALVO: 5,
      },
      icon: 'Rocket',
      color: 'violet',
      tags: ['threads', 'monthly', 'autopilot', 'planning', 'automated'],
    },
  });

  console.log(`\n✅ Flow criado: ${flow.id}`);
  console.log('\nPipeline (CRON: dia 1 de cada mês, 9h):');
  console.log('  [CRON] → Analista (30d) → Estrategista (20+ posts) → Copywriter (semana 1) → Editor → Gestor');
  console.log('\nCronExpression: "0 9 1 * *" (dia 1, 9h, America/Sao_Paulo)');
  console.log(`\n🔗 Acesse em: /dashboard/flows/${flow.id}`);
}

main()
  .catch((e) => { console.error('❌ Erro:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
