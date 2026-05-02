/**
 * Seed: Cria a Knowledge Base "Algoritmo do Threads" com documento completo.
 * Execute com: npx ts-node --project tsconfig.json scripts/seed-threads-knowledge.ts
 * Ou: npx tsx scripts/seed-threads-knowledge.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const THREADS_CONTENT = `
# Algoritmo do Threads (Meta) — Knowledge Base Completo

## 1. Visão Geral da Plataforma

O Threads é a rede social de texto da Meta, lançada em julho de 2023, integrada ao Instagram.
- **320 milhões** de usuários ativos mensais (início de 2025)
- **350 milhões+** de MAU (meados de 2025)
- Público majoritariamente criadores de conteúdo, marcas e conversas em tempo real

---

## 2. Como Funciona o Algoritmo

O sistema oficial é chamado de **"Threads Feed AI System"** e opera em três etapas instantâneas:

### Etapa 1 — Coleta de Inventário
O sistema reúne todo o conteúdo público disponível + conteúdo de contas que o usuário segue. Posts devem passar por critérios de qualidade e não violar as diretrizes da comunidade para entrar no ranking.

### Etapa 2 — Análise de Sinais
O sistema analisa centenas de sinais para prever o que será mais valioso para cada usuário específico:
- **Engajamento passado**: o que o usuário curtiu, comentou, repostou antes
- **Relação com o criador**: quem ele segue, visita com frequência, com quem interage
- **Atributos do conteúdo**: tipo (texto, imagem, vídeo, poll), tema, freshness
- **Predição de ação**: probabilidade de curtir, responder, seguir, visitar perfil

### Etapa 3 — Ranking e Entrega
Posts com maior score de valor previsto aparecem no topo do feed.

---

## 3. Os Dois Tipos de Feed

| Feed | Comportamento | Indicado para |
|------|--------------|---------------|
| **"Para Você" (For You)** | Curado por IA — mistura contas seguidas + recomendações | Descoberta, novos públicos |
| **"Seguindo" (Following)** | Cronológico puro, só contas seguidas | Fãs fiéis da conta |

**Estratégia**: o For You é onde a maioria do crescimento acontece. Conteúdo que vai para o For You de não-seguidores é o que gera crescimento real.

---

## 4. Sinais de Ranking — Ordem de Peso

Com base nas declarações de Adam Mosseri (CEO do Instagram/Threads) e dados de plataformas:

### Sinais Positivos (do mais pesado ao mais leve)

1. **Compartilhamentos via DM** ⭐⭐⭐⭐⭐
   - O sinal MAIS pesado confirmado por Mosseri
   - Indica que o conteúdo foi valioso o suficiente para alguém encaminhar pessoalmente

2. **Replies (respostas)** ⭐⭐⭐⭐⭐
   - Segundo sinal mais forte — indica conversa genuína
   - Uma thread com respostas em cadeia tem amplificação significativa
   - Criadores originais respondendo também amplifica

3. **Watch time / tempo de leitura** ⭐⭐⭐⭐
   - Quanto tempo o usuário passa lendo/assistindo o post
   - Vídeos com alta taxa de conclusão sobem no ranking

4. **Visitas ao perfil** ⭐⭐⭐⭐
   - Sinal de alta intenção — o usuário quis saber mais sobre o criador
   - Atividade do Instagram também conta aqui

5. **Reposts** ⭐⭐⭐
   - Redistribuição do conteúdo na rede

6. **Curtidas (likes)** ⭐⭐
   - Menor peso entre os sinais positivos — fácil demais de dar

### Sinais Negativos (penalizam o alcance)

- Scroll rápido sem interação
- "Not interested" / "Ver menos"
- Denúncias
- Conteúdo repetitivo / spam
- Compra de engajamento

---

## 5. Tipos de Conteúdo — Performance

### Alta performance
- **Posts de texto com gancho forte** na primeira linha (o algoritmo usa o início como sinal de retenção)
- **Imagens + texto**: ~25% dos posts contêm visuais; posts com imagem têm engajamento 40-60% maior
- **Vídeos curtos** (até 5 min): taxa de conclusão é sinal poderoso
- **Polls**: interação de um clique — muito fácil para o usuário engajar
- **Perguntas abertas**: geram replies em cadeia
- **Opiniões e posicionamentos** (nem todo mundo concorda = mais replies)
- **Bastidores e autenticidade**: plataforma valoriza tom pessoal vs corporativo

### Performance média
- Carrosséis de imagens
- GIFs (via GIPHY)
- Notas de voz (voice notes): conexão pessoal, ainda pouco usado = diferencial

### Baixa performance
- Posts puramente promocionais ("Compre agora")
- Conteúdo sem personalidade
- Repostagem de conteúdo idêntico de outras redes
- Posts sem chamada à ação ou gancho

---

## 6. Topic Tags (≠ Hashtags)

O Threads usa **topic tags**, não hashtags tradicionais. Diferenças críticas:

| | Hashtags (Instagram) | Topic Tags (Threads) |
|-|---------------------|---------------------|
| Quantidade por post | Vários | **Apenas 1** |
| Usuários podem seguir | Sim | Não |
| Função | Categorização | Categorização + Comunidade |
| Mais de 50M topic tags criados |

**Regra de ouro**: use 1 topic tag relevante por post. Posts com topic tag têm mais views do que sem.
**Não funciona**: spam de múltiplas tags ou tags genéricas sem relação com o conteúdo.

---

## 7. Frequência e Horários

### Frequência ideal
- **Mínimo**: 3-5x por semana para manter presença no algoritmo
- **Ideal para crescimento**: 1x por dia
- **Avançado**: 2-3x por dia (contas já estabelecidas)
- O algoritmo aprende o estilo do criador com consistência; consistência supera frequência excessiva esporádica

### Melhores horários (Brasil, horário de Brasília)
Os horários gerais com maior engajamento para audiência brasileira:
- **Manhã**: 7h–9h (commute, antes do trabalho)
- **Almoço**: 12h–13h
- **Tarde/Noite**: 18h–21h ⭐ (maior pico)
- **Noite**: 21h–23h (segundo pico)

**Importante**: use os próprios insights da conta para validar. O comportamento específico do seu público pode ser diferente das médias.

### Dias de maior engajamento
Terça a quinta tendem a performar melhor. Fins de semana têm volume maior mas engajamento per capita menor.

---

## 8. Estratégia: Relacionamento vs. Vendas

O Threads não é uma plataforma de vendas diretas — é uma plataforma de **relacionamento e conversa**.

### O que funciona
- Construir autoridade mostrando processo, bastidores, opiniões
- Responder comentários genuinamente (amplifica o próprio post)
- Iniciar conversas sobre temas relevantes para seu nicho
- Ser ativo em posts de outros criadores do mesmo nicho
- Parcerias e menções (marketing de influência está em alta no Threads)

### O que não funciona
- CTAs agressivas ("clique no link", "compre agora") frequentes
- Conteúdo idêntico ao que você posta em outras redes
- Foco em seguidores — foque em engajamento primeiro

---

## 9. Benchmarks de Engajamento

| Métrica | Benchmark 2025 |
|---------|---------------|
| Taxa de engajamento boa | 4–5% |
| Taxa de engajamento média | 3.6% |
| Taxa de engajamento excepcional | 7%+ |
| Comparativo vs X (Twitter) | Threads 4.51% vs X 2.31% |

O engajamento do Threads é consistentemente **mais alto** que o X, tornando a plataforma atraente para construção de audiência.

---

## 10. Funcionalidades Avançadas do Algoritmo

### "Dear Algo"
Recurso onde o usuário pode postar "#DearAlgo, quero ver mais sobre [tema]" — o sistema ajusta as recomendações por ~3 dias. Útil para entender como o algoritmo interpreta preferências.

### Controle de feed do usuário
- Filtros de palavras ocultas
- Opção de ver mais/menos de determinado tipo de conteúdo
- Meta está desenvolvendo ferramenta para o usuário "taguear" o algoritmo diretamente (2025)

### Integração com o ecossistema Meta
- Perfis públicos no Threads podem ser sugeridos no Instagram e Facebook
- Atividade no Instagram (visitar perfil) influencia o Threads
- Posts de Threads podem aparecer no feed do Instagram (em teste)

---

## 11. O Que Evitar (Penalizações Confirmadas)

1. **Engagement bait**: "curta se você concorda", "marque um amigo" — penalizado diretamente
2. **Conteúdo repetitivo**: postar o mesmo texto múltiplas vezes
3. **Spam de tags**: usar topic tags irrelevantes
4. **Compra de seguidores/curtidas**: detectado e penaliza o alcance orgânico
5. **Links sem contexto**: o Threads reduz alcance de posts que só têm link externo sem texto valioso
6. **Violar community guidelines**: as mesmas do Instagram se aplicam

---

## 12. Integração com Agentes de IA (Polaris IA)

Para usar esta knowledge base com agentes de IA gerando posts para Threads:

**Endpoint disponível:**
\`\`\`
POST /api/threads/orchestrate
{ "prompt": "...", "context": "...", "systemPrompt": "..." }
\`\`\`

**O agente deve ser instruído a:**
- Gerar textos com gancho forte na primeira linha
- Incluir uma pergunta ou opinião para gerar replies
- Máximo 500 caracteres
- Tom autêntico, não corporativo
- Usar no máximo 1 topic tag relevante
- Evitar CTAs diretas de venda

---

## Fontes

- Meta / Adam Mosseri (declarações oficiais sobre ranking)
- mLabs — Algoritmo do Threads (mlabs.com.br/blog/algoritmo-threads)
- RecurPost — Meta Threads Algorithm Explained 2026
- Metricool — How the Threads Algorithm Works 2026
- ContentStudio — Instagram Threads Algorithm
- Buffer — Average Engagement Rate Study 2025
- WebFX — Threads Marketing Benchmarks 2024–2025
`;

async function main() {
  console.log('🧵 Criando Knowledge Base: Algoritmo do Threads...');

  // Verificar se já existe
  const existing = await prisma.knowledgeBase.findFirst({
    where: { name: 'Algoritmo do Threads' },
  });

  if (existing) {
    console.log(`⚠️  Knowledge Base já existe (id: ${existing.id}). Pulando criação.`);
    console.log('   Para recriar, delete manualmente e rode o script novamente.');
    return;
  }

  // Criar knowledge base
  const kb = await prisma.knowledgeBase.create({
    data: {
      name: 'Algoritmo do Threads',
      type: 'general',
      config: {
        description: 'Guia completo sobre o algoritmo do Threads (Meta): sinais de ranking, boas práticas, benchmarks e estratégias de conteúdo.',
        tags: ['threads', 'social-media', 'algoritmo', 'meta'],
      },
    },
  });

  console.log(`✅ Knowledge Base criada: ${kb.id}`);

  // Criar documento principal
  const doc = await prisma.knowledgeDocument.create({
    data: {
      knowledgeBaseId: kb.id,
      title: 'Algoritmo do Threads — Guia Completo 2025/2026',
      content: THREADS_CONTENT.trim(),
      fileType: 'text',
      status: 'completed',
      chunks: [],
    },
  });

  console.log(`✅ Documento criado: ${doc.id}`);
  console.log('');
  console.log('🎉 Knowledge Base "Algoritmo do Threads" pronta!');
  console.log(`   Acesse: /dashboard/knowledge/${kb.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
