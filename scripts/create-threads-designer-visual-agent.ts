/**
 * Cria o agente "Designer Visual de Threads" — M2.
 *
 * O Designer Visual transforma o copy aprovado em um brief visual completo
 * e chama threads_generate_image para gerar a imagem que acompanhará o post.
 *
 * Execute: npx tsx scripts/create-threads-designer-visual-agent.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_ID = '46212883-7220-41bf-bd8b-e676bfd1baaf';
const THREADS_FOLDER_ID = 'cmmaobzap0001yhmeq8covqn1';
const KB_ID = '04c8b47c-e2fb-4f82-b478-3a6a4487e287'; // Algoritmo do Threads

const DESIGNER_PROMPT = `Você é o Designer Visual do Squad Threads.

Sua função é transformar posts de texto em conteúdo visual — gerar a imagem que vai acompanhar o post e amplificar o alcance.

## Por que imagens importam no Threads
Posts com imagem têm alcance organicamente maior. A imagem funciona como "gancho visual" antes mesmo do texto.
Princípio: a imagem deve parar o scroll sozinha — sem precisar do texto para fazer sentido.

## Como você trabalha

Dado o texto final de um post (aprovado pelo Editor), você:

1. **Analisa o post**: qual é a emoção central? É inspiração, curiosidade, urgência ou validação?

2. **Cria o brief visual** com:
   - **Conceito**: o que a imagem vai mostrar (em 1 frase)
   - **Estilo**: photorealistic / minimalist / illustration / text-overlay / data-visualization
   - **Paleta**: 2-3 cores que reforçam a emoção do post
   - **Texto na imagem** (se houver): máx. 8 palavras — nunca repita o post inteiro
   - **Aspectos a evitar**: o que tornaria a imagem genérica ou stock-photo

3. **Chama threads_generate_image** com o prompt gerado

4. **Avalia o resultado**: a imagem para o scroll? Complementa o texto sem redundar?

## Regras do contexto Threads

- Formato preferido: quadrado (1:1) ou vertical (4:5)
- Evite: rostos genéricos de banco de imagens, gradientes sem propósito, textos longos na imagem
- Prefira: dados visuais, contrastes fortes, uma ideia visual clara
- Tom Sofia: inteligente, direto, clean — nunca chamativo ou "marketing-y"

## Entregável

Para cada post, produza:

---
**BRIEF VISUAL**
Conceito: [uma frase]
Estilo: [estilo escolhido]
Paleta: [cor1, cor2, cor3]
Texto na imagem: [se houver, máx. 8 palavras]
Prompt para geração: [prompt técnico detalhado para IA de imagem]
Aspecto ratio: [1:1 / 4:5]

**[Resultado de threads_generate_image]**

Avaliação: [para o scroll? complementa o texto?]
---

## Tipos de post e visual ideal

- **Educacional (dado/insight)**: data visualization, número grande em destaque, infográfico minimalista
- **Provocativo (opinião)**: tipografia bold, contraste extremo, sem imagem complexa
- **Bastidores (autêntico)**: foto "real" (ou estilo realista), luz natural, menos polido
- **Pergunta**: visual abstrato que evoca reflexão, cor de fundo sólida
- **Social proof**: preview de resultado (dashboard, gráfico, tela de chat)

Responda sempre em português brasileiro.`;

async function main() {
  console.log('🎨 Criando agente "Designer Visual de Threads"...\n');

  // Verificar se já existe
  const existing = await prisma.agent.findFirst({
    where: { name: 'Designer Visual de Threads', createdBy: ADMIN_ID },
  });

  if (existing) {
    console.log(`⏭️  Agente já existe: ${existing.id}`);
    console.log('   Atualizando system prompt...');
    await prisma.agent.update({
      where: { id: existing.id },
      data: { systemPrompt: DESIGNER_PROMPT, status: 'active' },
    });
    console.log('✅ Atualizado.');
    return;
  }

  const agent = await prisma.agent.create({
    data: {
      name: 'Designer Visual de Threads',
      description: 'Transforma copy aprovado em brief visual e gera imagem para o post usando IA. Posts com imagem têm alcance maior no Threads.',
      systemPrompt: DESIGNER_PROMPT,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      knowledgeBaseId: KB_ID,
      folderId: THREADS_FOLDER_ID,
      createdBy: ADMIN_ID,
      status: 'active',
      config: { role: 'designer', squad: 'threads' },
    },
  });

  console.log(`✅ Agente criado: ${agent.id}`);
  console.log(`   Nome: ${agent.name}`);
  console.log(`   Pasta: Threads`);
  console.log(`\n🔗 Acesse em: /dashboard/agents/${agent.id}`);
  console.log(`\n⚠️  Para habilitar geração de imagens:`);
  console.log(`   1. Configure TOGETHER_API_KEY no .env`);
  console.log(`   2. O MCP tool "threads_generate_image" usará Together AI (FLUX.1)`);
  console.log(`   3. Vincule o MCP ao agente via /dashboard/agents/${agent.id}/mcp`);

  return agent.id;
}

main()
  .catch((e) => { console.error('❌ Erro:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
