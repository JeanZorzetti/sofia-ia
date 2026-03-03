/**
 * Cria a Orquestração "A/B Test de Ganchos Threads".
 *
 * Conceito: o Copywriter gera 2 variações de gancho para o mesmo tema.
 * Gestor publica A imediatamente e agenda B para 48h depois.
 * Analista mede A após 24h e decide se B deve ir ao ar.
 *
 * Pipeline: Estrategista → Analista → Copywriter (A+B) → Editor → Gestor
 *
 * Execute: npx tsx scripts/create-threads-ab-test-orchestration.ts
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
      role: 'Diretor de Estratégia',
      prompt: `Você é o Diretor de Estratégia. Vai planejar um A/B test de ganchos para este tema.

Um A/B test de gancho funciona assim:
- Mesmo tema central, mesmo conteúdo core
- 2 primeiras linhas diferentes (ganchos) que ativam psicologias diferentes
- Variante A vai ao ar primeiro. Variante B vai 48h depois, SOMENTE se A tiver engajamento <3%

Entregue:

## Análise do Tema
- Público-alvo principal: [quem vai ler]
- Emoção-alvo: [o que deve sentir ao ver o gancho]
- Contexto atual: [por que este tema é relevante agora]

## Estrutura do Post (válida para A e B)
- Corpo do post (as 3-4 frases centrais, sem a primeira linha)
- CTA final (pergunta ou provocação)
- Tom: [inspiracional / educacional / provocativo / dado concreto]

## Hipóteses dos Ganchos

**Gancho A — [Tipo: ex: Dado Concreto / Pergunta Direta / Provocação / Afirmação Ousada]**
- Primeira linha sugerida: "[texto]"
- Hipótese: por que vai funcionar?
- Psicologia ativada: [ex: curiosidade / FOMO / validação / identidade]
- Risco: [o que pode não funcionar]

**Gancho B — [Tipo diferente do A]**
- Primeira linha sugerida: "[texto]"
- Hipótese: por que vai funcionar?
- Psicologia ativada: [diferente de A]
- Risco: [o que pode não funcionar]

Escolha tipos de gancho OPOSTOS para maximizar o aprendizado do teste.`,
    },
    {
      agentId: AGENTS.analista,
      role: 'Analista de Performance',
      prompt: `Plano estratégico:
{{response}}

Você é o Analista. Valide o A/B test com dados históricos reais.

1. Use **threads_get_profile_insights** para verificar engajamento geral das últimas 2 semanas
2. Use **threads_get_recent_posts** (limit: 15) para verificar posts recentes
3. Para os 3-5 posts mais recentes, use **threads_get_post_insights** para benchmark

**Entregue:**

## Contexto de Dados
- Engajamento médio atual: [%]
- Benchmark de referência para este teste: [%] (o que seria "A ganhou" vs "A perdeu")
- Posts recentes com ganchos similares ao tipo A: [resultado]
- Posts recentes com ganchos similares ao tipo B: [resultado]

## Hipótese de Vitória
- Com base nos dados: [Gancho A / Gancho B] tem maior probabilidade de ganhar
- Razão: [dado específico que suporta]

## Critérios de Sucesso do Teste
- Variante A "vence": engajamento >[benchmark]% após 24h → B NÃO vai ao ar
- Variante A "perde": engajamento <[threshold]% após 24h → B VAI ao ar automaticamente
- Threshold sugerido: [%] (baseado no histórico)

## Horário Ideal de Publicação
- Melhor horário para A: [hora] (dia recomendado: [dia])
- Horário de B: +48h após A`,
    },
    {
      agentId: AGENTS.copywriter,
      role: 'Redator — Variantes A e B',
      prompt: `Plano do Estrategista + análise do Analista:
{{response}}

Você é o Copywriter. Escreva as 2 variantes do post.

**VARIANTE A:**

---
[GANCHO A — primeira linha impactante]

[Corpo do post — 3-4 frases, mesmo para A e B]

[CTA final]
---
Contagem: [X/500 chars]

**VARIANTE B:**

---
[GANCHO B — primeira linha diferente, mesmo corpo]

[Corpo do post — IDÊNTICO à variante A]

[CTA final — IDÊNTICO à variante A]
---
Contagem: [X/500 chars]

**REGRAS:**
- O corpo e o CTA devem ser IDÊNTICOS em A e B — só o gancho muda
- Ambas: máximo 500 caracteres (valide com o Plugin "Validador de Formato Threads")
- Ganchos: devem ser psicologicamente distintos (não apenas palavras diferentes)
- A primeira palavra de A e B devem ser diferentes

Entregue os textos completos prontos para publicação.`,
    },
    {
      agentId: AGENTS.editor,
      role: 'Editor Sênior',
      prompt: `Variantes A e B escritas pelo Copywriter:
{{response}}

Você é o Editor. Revise AMBAS as variantes.

**Para cada variante, avalie:**
1. O gancho realmente faz parar o scroll?
2. O gancho A e B são genuinamente DIFERENTES na psicologia que ativam?
3. O corpo é autêntico ao tom da Sofia?
4. O CTA é natural?
5. Limite de 500 chars? (valide com o Plugin)
6. A e B são realmente comparáveis (mesmo corpo)?

**Formato:**

---
✅ VARIANTE A — APROVADA / ❌ REJEITADA
[Texto exato aprovado]
Gancho tipo: [Dado / Pergunta / Provocação / Afirmação]
Psicologia: [ex: curiosidade, FOMO]
[Se rejeitada: motivo + correção sugerida]

---
✅ VARIANTE B — APROVADA / ❌ REJEITADA
[Texto exato aprovado]
Gancho tipo: [diferente de A]
Psicologia: [diferente de A]
[Se rejeitada: motivo + correção sugerida]

---
**Veredicto do Editor:**
- Qual variante você apostaria que vence? [A / B] — Razão: [...]
- Qualidade geral do teste: [Alta / Média / Baixa]
- O teste é válido? (ganchos suficientemente diferentes?) [Sim / Não]`,
    },
    {
      agentId: AGENTS.gestor,
      role: 'Gestor — Publicação do A/B Test',
      prompt: `Variantes aprovadas pelo Editor:
{{response}}

Você é o Gestor. Execute o A/B test.

**Processo:**

1. **Gere um ID único para este teste** (use timestamp + tema, ex: "ab_automacao_20260310")

2. **Publique a VARIANTE A agora** usando **threads_publish_post**
   Após publicar, guarde o Post ID retornado

3. **Agende a VARIANTE B para 48h a partir de agora** usando a API:
   POST /api/threads/schedule
   Body: {
     "text": "[texto da variante B]",
     "scheduledAt": "[data/hora de agora + 48h em ISO 8601]",
     "createdBy": "ab_test",
     "metadata": {
       "abTestId": "[id único gerado no passo 1]",
       "variant": "B",
       "postA_id": "[Post ID da variante A publicada]",
       "tema": "[tema do post]",
       "threshold_engagement": "[threshold % definido pelo Analista]",
       "check_at": "[agora + 24h em ISO 8601]"
     }
   }

4. **Salve na sua memória** o registro do teste:
   "A/B Test [id]: Variante A publicada em [data/hora]. Variante B agendada para [data/hora 48h]. Threshold: [%]%. Tema: [tema]."

5. **Relatório Final:**

## A/B Test Iniciado ✅
- Test ID: [id único]
- Variante A: publicada agora
  - Post ID: [id]
  - Gancho tipo: [tipo]
- Variante B: agendada para [data/hora]
  - Scheduled Post ID: [uuid do banco]
  - Gancho tipo: [tipo]
- Threshold de engajamento: [%]%
- Leitura de resultados: [data/hora de agora + 24h]
- Decisão automática: se A < threshold → B vai ao ar; se A ≥ threshold → B é cancelada

O Analista vai medir A às [hora +24h] e registrar o resultado na memória do squad.`,
    },
  ];
}

async function main() {
  console.log('🧪 Criando Orquestração "A/B Test de Ganchos Threads"...\n');

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
    where: { name: 'A/B Test de Ganchos Threads', createdBy: ADMIN_ID },
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
      name: 'A/B Test de Ganchos Threads',
      description: 'Testa 2 variações de gancho para o mesmo tema. Estrategista planeja hipóteses → Analista valida com dados → Copywriter escreve A+B → Editor aprova → Gestor publica A e agenda B (48h). Analista mede resultado em 24h.',
      createdBy: ADMIN_ID,
      strategy: 'sequential',
      status: 'active',
      agents: buildAgentSteps(),
      config: {
        inputLabel: 'Tema para A/B test (ex: "Como reduzir o tempo de resposta ao cliente usando IA")',
        showCost: true,
        allowFeedbackLoop: false,
      },
    },
  });

  console.log(`\n✅ Orquestração criada: ${orchestration.id}`);
  console.log('\nPipeline:');
  console.log('  1. Estrategista — hipóteses de ganchos opostos (A: dado/B: pergunta, etc.)');
  console.log('  2. Analista     — benchmark histórico + threshold de engajamento');
  console.log('  3. Copywriter   — variante A + variante B (mesmo corpo, gancho diferente)');
  console.log('  4. Editor       — valida que A e B são genuinamente distintos');
  console.log('  5. Gestor       — publica A, agenda B para 48h, salva test ID na memória');
  console.log(`\n🔗 Acesse em: /dashboard/orchestrations/${orchestration.id}`);
}

main()
  .catch((e) => { console.error('❌ Erro:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
