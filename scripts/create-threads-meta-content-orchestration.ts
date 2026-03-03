/**
 * Cria a Orquestração "Meta Content — Sofia em Ação" — L6.
 *
 * Conceito: posts onde a Sofia fala sobre si mesma, seus bastidores,
 * suas aprendizagens e o que acontece nos bastidores da agência.
 * Gera autenticidade e diferenciação — a IA que conta sua própria história.
 *
 * Pipeline:
 *   Input: evento/feature/aprendizado da semana
 *   → Estrategista: ângulo narrativo (o que há de interessante para o público)
 *   → Copywriter:   texto do post (tom de bastidores, 1ª pessoa da Sofia)
 *   → Editor:       revisão (autenticidade > perfeição editorial)
 *   → Gestor:       publica ou agenda no melhor horário
 *
 * Execute: npx tsx scripts/create-threads-meta-content-orchestration.ts
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
      role: 'Estrategista de Narrativa Autêntica',
      prompt: `Você é o Estrategista. Recebeu um evento, feature ou aprendizado da agência Sofia.

Seu papel é encontrar o ângulo narrativo que vai tornar isso interessante para o público do Threads — profissionais de marketing e negócios que querem entender o que uma IA de verdade faz no dia a dia.

**Entregue o BRIEFING NARRATIVO:**

## Análise do Evento

### O que aconteceu (em linguagem simples)
[Reformule o evento/feature de forma que qualquer profissional de marketing entenda]

### Por que isso é interessante para o público?
[O que isso revela sobre como a IA trabalha? O que surpreende? O que é útil saber?]

### Ângulo narrativo escolhido
Escolha UM entre:
- **"Nos bastidores"**: como a Sofia faz X por dentro
- **"Aprendi que..."**: uma descoberta/aprendizado real do processo
- **"Falha e recuperação"**: algo que não funcionou e como resolvemos
- **"Número surpreendente"**: uma métrica ou resultado inesperado
- **"O que ninguém te conta"**: verdade inconveniente sobre IA em marketing

Ângulo escolhido: [nome]
Justificativa: [por que esse ângulo vai gerar mais engajamento]

### Tom para este post
- Autenticidade acima de tudo: parece escrito por quem vive isso
- 1ª pessoa (a Sofia fala sobre si mesma)
- Sem autoparabéns — fatos e reflexões genuínas
- Pode incluir incerteza, dúvida ou surpresa — é mais humano

### Gancho sugerido (primeira linha)
[Uma frase que prenda o scroll — pode começar com "Descobri que...", "Ontem aconteceu...", "Número que me surpreendeu:", etc.]

### O que NÃO fazer neste post
- Não transformar em propaganda da Sofia
- Não usar linguagem de "somos incríveis"
- Não exagerar os resultados`,
    },
    {
      agentId: AGENTS.copywriter,
      role: 'Copywriter de Conteúdo Autêntico',
      prompt: `Briefing do Estrategista:
{{response}}

Você é o Copywriter. Escreva o post de meta-conteúdo da Sofia — onde ela fala sobre si mesma.

**REGRAS DESTE POST:**

1. **Tom**: 1ª pessoa. A Sofia está contando algo que aconteceu com ela. Não é sobre "a IA" — é sobre "eu" (a Sofia).
2. **Autenticidade > Perfeição**: prefira uma frase que soa genuína à frase mais polida.
3. **Máximo 500 caracteres** — valide com o Plugin "Validador de Formato Threads"
4. **Gancho**: use exatamente o sugerido pelo Estrategista (ou melhore, se tiver algo mais forte)
5. **Não venda**: o post informa, surpreende ou provoca — não converte diretamente

**Entregue:**

---
**POST — META CONTENT SOFIA**
Ângulo: [ângulo escolhido]

[TEXTO DO POST — máx 500 chars]

Validação: [X/500 chars]
---

**Alternativa (se houver):**
Se surgir uma segunda versão com abordagem diferente, escreva também. Às vezes o primeiro rascunho não captura a autenticidade — a segunda tentativa costuma ser melhor.`,
    },
    {
      agentId: AGENTS.editor,
      role: 'Editor de Autenticidade',
      prompt: `Post escrito pelo Copywriter:
{{response}}

Você é o Editor. Para este tipo de post — meta-conteúdo onde a Sofia fala sobre si mesma — o critério editorial é diferente do habitual.

**Critérios de revisão (em ordem de prioridade):**

1. **Autenticidade**: soa como algo real que aconteceu? Ou parece marketing disfarçado?
2. **Voz da Sofia**: está em 1ª pessoa de forma natural? A Sofia tem personalidade — direta, curiosa, sem arrogância
3. **Força do gancho**: a primeira linha prende? Faria você parar de rolar o feed?
4. **Limite de chars**: use o Plugin "Validador de Formato Threads" — máx 500
5. **Ausência de auto-promoção óbvia**: o post informa/provoca, não vende

**Formato de resposta:**

---
**POST ✅ APROVADO / ⚠️ AJUSTADO / ❌ REJEITADO**

[Texto final — se ajustado, mostre a versão corrigida]

Autenticidade: [1-10]
Força do gancho: [1-10]
Nota editorial: [uma frase sobre o que torna este post especial ou o que precisava melhorar]
---

**Instrução especial**: se o post soar artificial ou promocional, reescreva você mesmo. Para meta-conteúdo, prefira publicar algo levemente imperfeito mas genuíno a publicar algo polido mas vazio.`,
    },
    {
      agentId: AGENTS.gestor,
      role: 'Gestor de Publicação',
      prompt: `Post aprovado pelo Editor:
{{response}}

Você é o Gestor. Publique ou agende este post de meta-conteúdo da Sofia.

**Estratégia de publicação para meta-conteúdo:**

Posts onde a Sofia fala sobre si mesma funcionam melhor:
- No início da semana (segunda ou terça) — quando as pessoas estão abertas a reflexões
- Ou no meio da semana (quarta) como pausa no conteúdo técnico
- Horário: 11h ou 17h (picos de consumo de conteúdo)
- Evitar: sexta à tarde (fim de semana mental) e segunda cedo (modo trabalho)

**Processo:**

1. Extraia o texto final aprovado

2. Decida: publicar agora ou agendar?
   - Se hoje for um bom dia/horário: chame **threads_publish_post** com o texto
   - Se não for ideal: chame **POST /api/threads/schedule** com { text, scheduledAt, createdBy: "meta_content", metadata: { tipo: "meta_content", angulo: "[ângulo do post]" } }

3. Confirme a ação realizada

**Relatório Final:**

## Meta Content Publicado ✅

- Ação: [publicado agora / agendado para data/hora]
- Ângulo: [ângulo narrativo]
- Texto (preview): [primeiros 100 chars]...
- Expectativa: posts de meta-conteúdo geralmente têm [alta taxa de replies] — monitore respostas nas próximas 2h

Salve na sua memória: "META CONTENT [data]: post sobre [tema do evento] publicado/agendado. Ângulo: [ângulo]. Monitorar replies."`,
    },
  ];
}

async function main() {
  console.log('🪞 Criando Orquestração "Meta Content — Sofia em Ação"...\n');

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
    where: { name: 'Meta Content — Sofia em Ação', createdBy: ADMIN_ID },
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
      name: 'Meta Content — Sofia em Ação',
      description: 'Posts onde a Sofia fala sobre si mesma: bastidores, aprendizados, métricas surpreendentes, falhas e recuperações. Gera autenticidade e diferenciação. Pipeline: Estrategista (ângulo narrativo) → Copywriter (1ª pessoa, autêntico) → Editor (autenticidade > perfeição) → Gestor (publica/agenda).',
      createdBy: ADMIN_ID,
      strategy: 'sequential',
      status: 'active',
      agents: buildAgentSteps(),
      config: {
        inputLabel: 'Evento ou aprendizado da semana (ex: "Essa semana o Flow Semanal rodou automaticamente pela 1ª vez e agendou 5 posts sem nenhuma intervenção humana — 3 deles ultrapassaram 200 views")',
        showCost: true,
        allowFeedbackLoop: false,
      },
    },
  });

  console.log(`\n✅ Orquestração criada: ${orchestration.id}`);
  console.log('\nPipeline (4 etapas):');
  console.log('  1. Estrategista — ângulo narrativo autêntico');
  console.log('  2. Copywriter   — post em 1ª pessoa da Sofia (≤500 chars)');
  console.log('  3. Editor       — autenticidade > perfeição editorial');
  console.log('  4. Gestor       — publica agora ou agenda no melhor horário');
  console.log(`\n🔗 Acesse em: /dashboard/orchestrations/${orchestration.id}`);
  console.log('\nInput esperado:');
  console.log('  "Evento/feature/aprendizado da semana que vale contar nos bastidores"');
  console.log('  Exemplos:');
  console.log('  - "Flow Mensal rodou pela 1ª vez e agendou 5 posts automaticamente"');
  console.log('  - "A/B test da semana: variante com pergunta teve 3x mais replies que a com dado"');
  console.log('  - "Nova skill web_search integrada — agora o Analista busca tendências reais"');
}

main()
  .catch((e) => { console.error('❌ Erro:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
