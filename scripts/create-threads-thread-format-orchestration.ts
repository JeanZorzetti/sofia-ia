/**
 * Cria a Orquestração "Thread de Posts Threads" — L3.
 *
 * Formato carrossel/sequência: série de posts encadeados sobre um tema,
 * publicados em sequência onde cada reply ao anterior cria a "thread".
 *
 * Diferente do post único: Thread funciona como mini-artigo no feed,
 * maximiza watch time (o sinal mais pesado do algoritmo do Threads).
 *
 * Pipeline:
 *   Input: { tema, numero_posts (3-10), objetivo }
 *   Estrategista → Copywriter → Editor → Gestor (publica sequência encadeada)
 *
 * Execute: npx tsx scripts/create-threads-thread-format-orchestration.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_ID = '46212883-7220-41bf-bd8b-e676bfd1baaf';

const AGENTS = {
  estrategista: '8b41f3f9-944f-420b-8800-6b7961b14aed',
  copywriter:   '87245dd3-76b3-4776-bdf0-2c38896e74c0',
  editor:       '43d8df70-4f66-4407-9aca-a37a2bfc6299',
  gestor:       '8d03ebc6-6dcb-447b-9f41-5a78e6f7987f',
};

function buildAgentSteps() {
  return [
    {
      agentId: AGENTS.estrategista,
      role: 'Arquiteto da Thread',
      prompt: `Você é o Arquiteto de Threads. Recebeu um tema para criar uma thread (sequência encadeada de posts).

## O que é uma Thread no Threads
Uma thread é uma série de posts onde cada um é uma reply ao anterior, formando uma conversa longa. É como um mini-artigo dividido em pedaços. O algoritmo favorece porque:
- Aumenta drasticamente o watch time
- Replies encadeadas são o segundo sinal mais forte
- Usuários que chegam ao post 3, 4, 5 são altamente qualificados

## Estrutura de uma Thread que performa

**Gancho (Post 1)**: Para o scroll. Promete algo que vale continuar lendo.
**Tensão (Posts 2-3)**: Desenvolve o problema ou contexto. Cria curiosidade para o que vem.
**Núcleo (Posts 4-N-1)**: O valor real — dados, framework, insights. Cada post é autocontido.
**Fechamento (Último post)**: Síntese + CTA natural que provoca reply.

## Entregue o PLANO DA THREAD

### Metadados
- Tema: [tema]
- Objetivo: [awareness / educação / lead / viral]
- Número de posts: [N]
- Estimativa de watch time: [N minutos de leitura]

### Estrutura da Thread

Para cada post, defina:

**Post [N] — [Papel na thread: Gancho / Tensão / Núcleo / Fechamento]**
- Ângulo: [o que este post específico vai dizer]
- Primeira linha (gancho do post): [ideia — o que vai parar o scroll DENTRO da thread]
- Ideia central: [1 frase com a substância]
- Tom: [direto / dado / pergunta / revelação]
- Por que vai segurar o leitor para o próximo: [mecanismo de continuidade]

### Regras da Thread
- Post 1: gancho mais forte de todos — 70% das pessoas param aqui
- Posts intermediários: cada um deve poder ser lido sozinho mas ganhar sentido no conjunto
- Último post: CTA suave — "Qual parte você achou mais surpreendente?" funciona melhor que "Siga para mais"
- Limite: 300 caracteres por post (menor que post único — leitura mais fluida)`,
    },
    {
      agentId: AGENTS.copywriter,
      role: 'Redator da Thread',
      prompt: `Plano da thread do Estrategista:
{{response}}

Você é o Copywriter. Escreva todos os posts da thread em sequência.

## Regras específicas para Thread

**Por post:**
- **Máximo 300 caracteres** (validar com Plugin "Validador de Formato Threads" — use posts=[...])
- Primeira linha: gancho específico para aquele post (não apenas continuação do anterior)
- Final de cada post (exceto o último): deixe uma frase que cria expectativa para o próximo
  Ex: "E aí é onde fica interessante..."  /  "O dado seguinte vai te surpreender"  /  "Mas tem um porém."
- Último post: CTA que gera reply — pergunta direta, provocação, ou convite à reflexão

**Tom da thread:**
- Mais conversacional que post único — você está conversando, não transmitindo
- Use "você" (aproxima)
- Números e dados: ótimos em posts intermediários
- Opinião forte: salve para o fechamento

## Entregue

Para cada post, numerado:

---
**POST [N] — [Papel: Gancho/Tensão/Núcleo/Fechamento]**
[TEXTO COMPLETO — máx 300 chars]

Validação: [X/300 chars]
Gancho deste post: [a primeira linha em itálico]
Gancho para o próximo: [última frase ou elemento de suspense — N/A para o último]
---

Escreva TODOS os posts. Não pule nenhum.`,
    },
    {
      agentId: AGENTS.editor,
      role: 'Editor da Thread',
      prompt: `Posts da thread escritos pelo Copywriter:
{{response}}

Você é o Editor. Avalie a thread como um todo — não apenas post a post.

## Critérios de edição para Thread

### Por post:
1. Limite de caracteres (≤300) — valide com Plugin
2. Gancho do post — para o scroll DENTRO da thread?
3. Fluidez — faz sentido ler em sequência?
4. Elemento de continuidade — o leitor vai querer o próximo?

### Pela thread toda:
1. Coerência narrativa — conta uma história completa?
2. Escalada — fica mais interessante post a post?
3. Fechamento — o último post gera reply?
4. Equilíbrio — nenhum post é desnecessário?

## Formato de resposta

Para cada post:
---
**POST [N] ✅ / ✏️ AJUSTADO / ❌ REJEITADO**
[Texto final aprovado — se ajustado, mostre a versão corrigida]
Chars: [X/300]
---

## Avaliação da Thread como um todo

- Fluidez geral: [1-10]
- Gancho do Post 1: [1-10] — [vai parar o scroll?]
- Fechamento: [1-10] — [vai gerar reply?]
- Post mais fraco: Post [N] — [por quê e como melhorar]
- Recomendação: [publicar / reescrever post X antes]

Entregue os textos finais numerados e prontos para o Gestor publicar em sequência.`,
    },
    {
      agentId: AGENTS.gestor,
      role: 'Gestor de Publicação da Thread',
      prompt: `Thread aprovada pelo Editor:
{{response}}

Você é o Gestor. Publique a thread em sequência encadeada.

## Como publicar uma Thread no Threads

Uma thread é criada assim:
1. Publique o Post 1 normalmente → obtenha o post_id
2. Publique o Post 2 como REPLY ao Post 1 → via threads_reply_to_post(post_id_do_1, texto_2)
3. Publique o Post 3 como reply ao Post 2 → via threads_reply_to_post(post_id_do_2, texto_3)
4. Continue até o último post

## Processo

**Passo 1 — Publicar Post 1:**
Chame **threads_publish_post** com o texto do Post 1.
Salve o post_id retornado como "id_post_1".

**Passo 2 — Publicar Posts 2, 3, ..., N em sequência:**
Para cada post subsequente:
- Chame **threads_reply_to_post** com:
  - post_id: o ID do post ANTERIOR (não o primeiro sempre — reply em cadeia)
  - text: o texto do post atual
- Salve o reply_id retornado para usar como post_id do próximo

**Passo 3 — Confirmar publicação:**
Liste todos os IDs publicados em ordem.

**Passo 4 — Salvar na memória:**
"THREAD [data]: [tema]. [N] posts encadeados. Post âncora ID: [id_post_1]. Monitorar em 2h."

## Relatório Final

---
## Thread Publicada ✅ — [data/hora]

**Estrutura publicada:**
Post 1 (âncora): [texto truncado] → ID: [id]
Post 2 (reply ao 1): [texto truncado] → ID: [id]
Post 3 (reply ao 2): [texto truncado] → ID: [id]
[...]

**Total:** [N] posts encadeados
**Link do post âncora:** [permalink se disponível]

**Próximos passos:**
- Monitorar engajamento do Post 1 (âncora) em 2h via threads_get_post_insights
- Replies no Post 1 são o sinal mais importante — o Gestor deve responder as primeiras
---`,
    },
  ];
}

async function main() {
  console.log('🧵 Criando Orquestração "Thread de Posts Threads"...\n');

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
    where: { name: 'Thread de Posts Threads', createdBy: ADMIN_ID },
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
      name: 'Thread de Posts Threads',
      description: 'Cria e publica uma thread (sequência encadeada de 3-10 posts) no Threads. Maximiza watch time (sinal mais pesado do algoritmo). Pipeline: Estrategista (arco narrativo da thread, ≤300 chars/post) → Copywriter (escreve todos os posts com ganchos de continuidade) → Editor (coerência narrativa + fluidez) → Gestor (publica em cadeia: post 1 âncora, posts 2-N como replies em sequência).',
      createdBy: ADMIN_ID,
      strategy: 'sequential',
      status: 'active',
      agents: buildAgentSteps(),
      config: {
        inputLabel: 'Tema + número de posts + objetivo (ex: "Como a IA está mudando o marketing de conteúdo — 5 posts, objetivo: educação + leads")',
        showCost: true,
        allowFeedbackLoop: false,
      },
    },
  });

  console.log(`\n✅ Orquestração criada: ${orchestration.id}`);
  console.log('\nPipeline (4 etapas):');
  console.log('  1. Estrategista — arco narrativo (gancho → tensão → núcleo → fechamento)');
  console.log('  2. Copywriter   — todos os posts (≤300 chars, ganchos de continuidade)');
  console.log('  3. Editor       — coerência da thread como um todo');
  console.log('  4. Gestor       — publica em cadeia (post 1 âncora + replies encadeadas)');
  console.log(`\n🔗 Acesse em: /dashboard/orchestrations/${orchestration.id}`);
  console.log('\nInput esperado:');
  console.log('  "Tema — N posts — objetivo"');
  console.log('  Exemplos:');
  console.log('  - "5 sinais que sua empresa está pronta para automação de marketing — 6 posts — educação"');
  console.log('  - "Como a Polaris IA funciona por dentro — 4 posts — awareness + curiosidade"');
  console.log('  - "Os erros mais comuns em marketing de conteúdo — 5 posts — engajamento + leads"');
}

main()
  .catch((e) => { console.error('❌ Erro:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
