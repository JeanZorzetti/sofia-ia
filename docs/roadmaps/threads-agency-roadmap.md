# Threads Agency — Roadmap da Agência de Marketing da Sofia

> **Premissa**: A pasta "Threads" é uma agência de marketing contratada para cuidar do
> marketing da própria Sofia dentro do Threads. Não é um experimento — é infraestrutura
> de negócio com ROI mensurável e crescimento autônomo como objetivo final.

**Data de criação**: 2026-03-03
**Última atualização**: 2026-03-03
**Estado atual**: ~55% de uma agência real

---

## Diagnóstico — Onde Estamos Hoje

### O que existe e funciona

| Componente | Status | Descrição |
|---|---|---|
| 5 agentes especializados | ✅ | Estrategista, Copywriter, Editor, Analista, Gestor |
| Skills injetadas | ✅ | `threads_specialist`, `data_analyst`, `web_search`, `content_writer`, `sales_expert`, `http_request` |
| Plugin de validação | ✅ | Copywriter + Editor validam ≤500 chars, ≤10 posts |
| MCP Threads API | ✅ | `threads_publish_post`, `threads_get_profile`, `threads_validate_format`, `threads_get_recent_posts`, `threads_get_post_insights`, `threads_get_profile_insights` |
| Publicação real | ✅ | Gestor publica via Threads Graph API |
| Delegação configurada | ✅ | Estrategista → Copywriter+Analista → Editor → Gestor |
| Flow engine (DAG) | ✅ | Topological sort, branching, cron trigger, context passing |
| Orchestrations engine | ✅ | Sequential + parallel + consensus com acúmulo de contexto |

### O que está quebrado ou incompleto

| Gap | Impacto | Causa raiz |
|---|---|---|
| ~~Analista sem dados reais~~ | ~~**Crítico**~~ | ✅ **RESOLVIDO** — 3 tools de insights no MCP |
| Delegação estocástica | **Alto** | Depende do LLM decidir chamar `delegate_to_agent` — inconsistente |
| Sem pipeline automático | **Alto** | Nenhum Flow ou Orchestration conectando os 5 agentes |
| ~~Gestor sem posts recentes~~ | ~~**Médio**~~ | ✅ **RESOLVIDO** — `threads_get_recent_posts` no MCP |
| Sem agendamento de posts | **Médio** | Só publica em tempo real — nenhuma fila ou calendário |
| Sem imagem/mídia | **Médio** | Só texto — Threads tem alcance maior com imagem |
| Sem gestão de replies | **Baixo** | Gestor não consegue responder comentários programaticamente |

### Arquitetura atual (real)

```
Usuário → Chat com Gestor
              ↓
         Gestor decide (LLM)
              ↓
     delegate_to_agent() ← estocástico
              ↓
         Copywriter escreve
              ↓
     delegate_to_agent() ← estocástico
              ↓
         Editor revisa
              ↓
     Gestor publica (MCP → Threads API)
```

**Problema**: cada flecha "estocástica" tem ~20% de chance de não acontecer.
O pipeline existe em teoria mas não em execução garantida.

---

## Curto Prazo — Fundação Sólida
**Horizonte: 4 semanas | Sprints 1–2**
**Objetivo: tornar a agência funcional e determinística**

---

### ✅ C1 — Fechar o Loop de Dados: Threads Insights no MCP
> **CONCLUÍDO em 2026-03-03**

**Por que é prioridade 1**: O Analista de Métricas hoje é cego. Sem dados reais,
qualquer "análise" que ele faz é ficção. Uma agência que não lê seus resultados não aprende.

**O que a Threads Graph API v1.0 expõe** (disponível com scopes padrão):

```
GET /{threads-user-id}/threads
  → Lista posts publicados (id, text, timestamp, media_type, permalink)

GET /{threads-media-id}/insights
  → Métricas por post: likes, replies, reposts, quotes, reach, views

GET /{threads-user-id}/insights
  → Métricas do perfil: followers_count, reach, views (período selecionável)
```

**Implementação**: adicionar 3 tools no `/api/mcp/threads-api/route.ts`

```typescript
// Tool 1: threads_get_recent_posts
// Retorna os últimos N posts com texto + ID + timestamp
{
  name: 'threads_get_recent_posts',
  description: 'Lista os posts mais recentes da conta Threads conectada com ID e data',
  inputSchema: {
    properties: {
      limit: { type: 'number', description: 'Número de posts (padrão: 10, máx: 25)' }
    }
  }
}

// Tool 2: threads_get_post_insights
// Retorna métricas de um post específico
{
  name: 'threads_get_post_insights',
  description: 'Retorna métricas de um post (likes, replies, reposts, reach, views)',
  inputSchema: {
    properties: {
      post_id: { type: 'string', description: 'ID do post a ser analisado' }
    },
    required: ['post_id']
  }
}

// Tool 3: threads_get_profile_insights
// Retorna métricas do perfil no período
{
  name: 'threads_get_profile_insights',
  description: 'Retorna métricas do perfil: alcance, visualizações, novos seguidores',
  inputSchema: {
    properties: {
      since: { type: 'string', description: 'Data início ISO 8601 (default: 7 dias atrás)' },
      until: { type: 'string', description: 'Data fim ISO 8601 (default: hoje)' }
    }
  }
}
```

**Registrar no banco**: atualizar o script `setup-threads-squad-plugins-mcp.ts` para criar
as 3 novas `McpServerTool` e vincular ao Gestor + Analista.

---

### ✅ C2 — Orquestração "Produção de Post Threads"
> **CONCLUÍDO em 2026-03-03**

**Objetivo**: substituir a delegação estocástica por um pipeline determinístico
usando o sistema de Orchestrations já existente (Sequential strategy).

**Usar a infraestrutura existente**:
- `AgentOrchestration` (schema já existe)
- `strategy: 'sequential'` com acúmulo de contexto
- Feedback loop nativo (agente pode `[REJECT]` output do anterior)

**Pipeline da Orquestração**:

```
Input: { tema, objetivo, tom, contexto_extra? }

Step 1 — Estrategista de Conteúdo
  role: "Diretor de Estratégia"
  prompt: "Com base no tema fornecido, crie um plano detalhado para 1 post no Threads.
           Inclua: ângulo principal, público-alvo, gancho de abertura, estrutura,
           CTA implícito e referências a dados/tendências se relevantes."

Step 2 — Analista de Métricas (paralelo ao Copywriter, mas feedback ao Estrategista)
  role: "Analista de Performance"
  prompt: "Revise a estratégia e adicione contexto baseado em dados:
           verifique tendências relevantes, sugira melhor horário de publicação,
           compare com posts anteriores de alto desempenho."

Step 3 — Copywriter
  role: "Redator de Conteúdo"
  prompt: "Baseado na estratégia aprovada, escreva o post para o Threads.
           Regras: ≤500 chars, gancho na primeira linha, sem links, sem hashtags em excesso,
           termine com pergunta ou provocação. Use o Plugin de Validação antes de entregar."

Step 4 — Editor
  role: "Editor Sênior"
  prompt: "Revise o post. Critérios: autenticidade, impacto do gancho, clareza, ritmo,
           adequação ao tom da Sofia. Retorne [REJECT] + feedback se precisar de reescrita.
           Valide o formato com o plugin antes de aprovar."

Step 5 — Gestor de Comunidade
  role: "Gestor de Publicação"
  prompt: "Post aprovado. Publique via MCP (threads_publish_post). Confirme o ID do post
           publicado e sugira os próximos 2 temas baseado na estratégia."
```

**Criar via script** `scripts/create-threads-production-orchestration.ts`:
- Upsert no banco com os 5 agentIds reais
- Configurar strategy, nome, description
- Output: ID da orquestração para uso nos Workflows

---

### ✅ C3 — Flow "Análise Semanal Automática"
> **CONCLUÍDO em 2026-03-03**

**Objetivo**: toda segunda-feira, o Analista coleta dados da semana anterior
e o Estrategista gera um briefing de conteúdo para os próximos 7 dias.

**Usar o Flow engine** (trigger_cron + action_ai_agent):

```
Trigger: cron "0 9 * * 1" (toda segunda às 9h, timezone: America/Sao_Paulo)

Node 1 — action_ai_agent → Analista de Métricas
  prompt: "Analise os posts da semana passada usando os dados do MCP Threads API.
           Busque os últimos 7 posts com threads_get_recent_posts, então use
           threads_get_post_insights para cada um. Calcule: taxa de engajamento média,
           post de maior alcance, formato que funcionou melhor, assunto mais engajado.
           Produza um relatório estruturado em JSON."

Node 2 — action_ai_agent → Estrategista de Conteúdo
  input: output do Node 1
  prompt: "Com base no relatório de performance, crie o plano de conteúdo para esta semana.
           Sugira 5 temas com: ângulo, tom esperado, melhor horário, formato (thread ou post único).
           Priorize temas que se conectam com o que já funcionou."

Node 3 — action_ai_agent → Gestor de Comunidade
  input: output do Node 2
  prompt: "Receba o plano semanal. Salve os 5 temas como contexto de memória.
           Escreva um resumo executivo: o que a agência vai publicar essa semana e por quê."
```

**Ativação**: criar via UI de Flows + configurar o endpoint de cron no Vercel.

---

### ✅ C4 — Atualizar System Prompts com Capabilities Reais
> **CONCLUÍDO em 2026-03-03** — scripts configure-threads-squad.ts já injeta capabilities no system prompt

O Analista e o Gestor têm skills de `http_request` e `threads_specialist` mas os system
prompts não mencionam as tools MCP disponíveis (insights, posts recentes).

**Ação**: atualizar via script as instruções de cada agente para incluir:

```
# Tools Disponíveis via MCP (Threads API)
- threads_get_recent_posts: busca posts recentes com IDs
- threads_get_post_insights(post_id): métricas de engajamento
- threads_get_profile_insights: visão geral do perfil
- threads_publish_post(text): publica post
- threads_validate_format(posts): valida antes de publicar
```

---

### Métricas de Sucesso — Curto Prazo

| Métrica | Meta |
|---|---|
| Analista lê dados reais do Threads | ✅ **DONE** |
| Pipeline Estrategista→Gestor executa sem falha | ✅ **DONE** — Orquestração Sequential |
| Relatório semanal gerado automaticamente | ✅ **DONE** — Flow CRON toda segunda 9h |
| Tempo de produção de 1 post end-to-end | <5 minutos |

---

## Médio Prazo — Agência Operacional
**Horizonte: 3 meses | Sprints 3–6**
**Objetivo: automação real, feedback loop de dados, múltiplos formatos**

---

### M1 — Calendário de Conteúdo com Agendamento

**Problema atual**: publicação é apenas em tempo real. Uma agência de verdade trabalha
com antecedência e tem uma fila de aprovação.

**O que construir**:

```prisma
model ThreadsScheduledPost {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  text        String   @db.Text
  scheduledAt DateTime @map("scheduled_at") @db.Timestamptz()
  status      String   @default("pending") // pending | published | failed | cancelled
  postId      String?  @map("post_id")     // ID retornado pelo Threads após publicação
  createdBy   String   @map("created_by")  // agentId que criou
  approvedBy  String?  @map("approved_by") // userId que aprovou (null = auto)
  metadata    Json     @default("{}")       // tema, estratégia, campanha
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz()
}
```

**Flow "Publicação Agendada"**:
- trigger_cron: a cada hora, verificar `ThreadsScheduledPost` com `scheduledAt <= now()` e `status = pending`
- action_ai_agent: Gestor lê o post da fila e publica via MCP
- action_database: atualiza status para `published` com `postId`

**Dashboard de Calendário** (`/dashboard/threads/calendar`):
- Visualização semanal dos posts agendados
- Arrastar para reagendar
- Botão "Aprovar / Rejeitar" por post
- Status visual (pending / scheduled / published / failed)

**Integração na Orquestração**:
- Step 5 (Gestor) passa a ter 2 modos: `publish_now` e `schedule_for`
- Input da orquestração inclui campo `publishMode: 'now' | 'schedule'` e `scheduledAt?`

---

### M2 — Posts com Imagem (AI-Generated)

**Por que importa**: posts com imagem têm alcance organicamente maior no Threads.
Uma agência sem capacidade visual está operando em desvantagem.

**Integração**: Stability AI ou Together AI (image gen) como nova tool MCP ou Skill

```typescript
// Tool: threads_generate_image
{
  name: 'threads_generate_image',
  description: 'Gera uma imagem para acompanhar o post no Threads usando IA',
  inputSchema: {
    properties: {
      prompt: { type: 'string', description: 'Descrição visual da imagem' },
      style: {
        type: 'string',
        enum: ['photorealistic', 'illustration', 'minimalist', 'brand'],
        description: 'Estilo visual'
      },
      aspectRatio: {
        type: 'string',
        enum: ['1:1', '4:5', '9:16'],
        description: 'Proporção da imagem'
      }
    },
    required: ['prompt']
  }
}
```

**Novo agente**: **Designer Visual**
- Especialidade: transformar copy em brief visual
- Skill: `content_writer` (para escrever prompts de imagem)
- MCP: `threads_generate_image`
- Posição no pipeline: entre Copywriter e Editor

**Pipeline expandido**:
```
Estrategista → Analista (paralelo) → Copywriter → Designer Visual → Editor → Gestor
```

---

### M3 — Gestão de Engajamento (Replies)

**Objetivo**: o Gestor passa a monitorar e responder comentários nos posts da Sofia,
criando diálogos reais com a audiência.

**Threads API endpoints necessários**:
```
GET /{threads-media-id}/replies
  → Lista replies de um post específico

GET /{threads-media-id}/conversation
  → Thread completa (post + todas as replies)

POST /{threads-user-id}/threads
  com reply_to_id = {threads-media-id}
  → Publica reply a um post ou comentário
```

**Novas tools MCP**:
- `threads_get_replies(post_id)` → retorna array de replies com texto + username + timestamp
- `threads_reply_to_post(post_id, text)` → publica reply

**Flow "Monitoramento de Engajamento"**:
- trigger_cron: a cada 6 horas
- Node 1: buscar posts das últimas 24h com threads_get_recent_posts
- Node 2: para cada post, buscar replies com threads_get_replies
- Node 3: Gestor filtra replies que merecem resposta (perguntas, elogios, críticas relevantes)
- Node 4: Gestor escreve + publica replies

**Sistema de priorização**: replies com palavras-chave como "preço", "como funciona",
"assinar" → alta prioridade (potencial lead).

---

### M4 — A/B Testing de Ganchos

**Problema**: o Copywriter escreve 1 post. Mas qual gancho performa melhor?
Não sabemos sem testar.

**Conceito**: para cada tema, o Copywriter gera 2 variações com ganchos diferentes.
Publicar a variação A. Comparar após 24h. Informar o Analista.

**Implementação**:
- Novo modo na Orquestração: `abTest: true`
- Copywriter gera variação A e B
- Gestor publica A às Xh, agenda B para Xh + 48h (se A tiver baixo engajamento)
- Analista compara após 24h e registra o padrão vencedor na memória

**Memória de padrões** (AgentMemory do Analista):
```json
{
  "ab_tests": [
    {
      "date": "2026-03-10",
      "tema": "automação de marketing",
      "variante_a": { "gancho": "pergunta direta", "views": 1200, "engajamento": 4.8 },
      "variante_b": { "gancho": "dado surpreendente", "views": 2100, "engajamento": 7.2 },
      "vencedor": "b",
      "insight": "dados concretos performam melhor que perguntas abertas neste nicho"
    }
  ]
}
```

---

### M5 — Dashboard de Performance da Agência

**Localização**: `/dashboard/threads/analytics`

**O que mostrar**:

```
┌─────────────────────────────────────────────────────────┐
│  Sofia no Threads — Performance da Agência              │
├──────────┬──────────┬──────────┬────────────────────────┤
│ Seguidores│  Posts   │  Alcance │  Engajamento Médio     │
│   +127    │  5/semana│  12.4K   │       5.8%             │
│  ↑23%     │  ↑25%   │  ↑41%    │       ↑0.7pp           │
└──────────┴──────────┴──────────┴────────────────────────┘

[Gráfico de alcance por post — últimas 4 semanas]

[Top 3 posts da semana]
  1. "5 maneiras de usar IA no..." — 2.1K views, 8.3% engajamento
  2. "O erro que 90% das empresas..." — 1.8K views, 6.1% engajamento
  3. "Automatizei meu marketing e..." — 1.6K views, 5.4% engajamento

[Insights gerados pelo Analista]
  • Posts com perguntas finais têm 2x mais replies
  • Melhor horário: terças e quintas entre 11h-13h
  • Tema "automação" tem 40% mais alcance que "IA generativa"
```

**Fonte de dados**: Threads Insights API + AgentMemory do Analista.

---

### M6 — Campanha Estruturada

**Conceito**: ao invés de posts individuais, a agência passa a operar em campanhas:
série temática com arco narrativo, publicada ao longo de 1-2 semanas.

**Modelo de Campanha**:
```typescript
interface ThreadsCampaign {
  id: string
  name: string            // "Lançamento Plano Pro", "Semana de Automação"
  objective: string       // awareness | leads | activation | retention
  theme: string           // tema central da campanha
  posts: CampaignPost[]   // posts planejados (ordenados)
  startDate: Date
  endDate: Date
  status: 'planning' | 'approved' | 'active' | 'completed'
  metrics: CampaignMetrics
}

interface CampaignPost {
  position: number
  tema: string
  angle: string           // ângulo único deste post dentro da campanha
  scheduledAt: Date
  status: 'draft' | 'approved' | 'scheduled' | 'published'
  postId?: string
  insights?: PostInsights
}
```

**Orquestração "Planejamento de Campanha"**:
- Input: `{ nome, objetivo, tema_central, duracao_dias, posts_por_semana }`
- Estrategista: cria arco narrativo com N posts
- Analista: valida timing e identifica temas que já performaram
- Copywriter: escreve todos os posts em sequência
- Editor: revisa todos
- Gestor: agenda no calendário

---

### Métricas de Sucesso — Médio Prazo

| Métrica | Meta |
|---|---|
| Posts publicados/semana (automático) | 5+ |
| Taxa de engajamento média | >5% |
| Crescimento de seguidores/mês | +100 |
| Tempo do briefing ao post publicado | <15 min |
| Replies respondidas/semana | 80% das recebidas |
| Campanhas ativas simultâneas | 1-2 |

---

## Longo Prazo — Agência Autônoma
**Horizonte: 6-12 meses | Sprints 7–12**
**Objetivo: agência que opera com mínima intervenção humana, gera leads reais**

---

### L1 — Modo Autopilot Total

**Visão**: o usuário aprova uma estratégia mensal. A agência executa sozinha,
publica diariamente, monitora, aprende e ajusta — sem interação manual.

**Componentes**:

**Orchestration "Ciclo Mensal"** (trigger_cron: dia 1 de cada mês):
1. Analista consolida métricas do mês anterior
2. Estrategista revisa o que funcionou + o que não funcionou
3. Estrategista gera plano de 20+ posts para o mês
4. Gestor agenda todos os posts no calendário
5. Loop diário: publicar post agendado do dia + monitorar replies

**Autonomia com guardrails**:
- Todo post passa pelo Editor antes de ser agendado
- Posts sobre preço, concorrentes ou temas sensíveis → sempre aprovação humana
- Se engajamento de um post cair abaixo de 2% → Analista é chamado para diagnóstico
- Limite diário de publicações: 1-2 (evitar spam)

**Learning loop**:
```
Publicar → Medir (24h) → Aprender (Analista) → Ajustar próximos posts (Estrategista)
```

---

### L2 — Geração de Leads via Threads

**Visão**: transformar o Threads de plataforma de awareness em canal de aquisição.

**Tática de Funil**:

```
Topo: Posts de valor (tips, insights, estatísticas)
       ↓ engajamento via replies
Meio: Gestor responde leads quentes, menciona a Sofia
       ↓ CTA implícito ou link na bio
Fundo: Visitam o site → cadastram Trial
```

**Identificação de Leads Quentes** (Analista):
- Reply com palavras-chave: "como funciona", "quero saber mais", "você usa IA para...", "preço"
- Replies de contas com >1K seguidores (influenciadores)
- Contas que seguiram após um post específico (correlação)

**Response Engine** (Gestor):
- Reply de alta qualidade personalizada para leads quentes
- Template variável por tipo de pergunta
- Limite: 5 respostas elaboradas/dia (evitar shadowban)

**Métrica de sucesso**:
- MQL (Marketing Qualified Lead) gerado via Threads: trackado por UTM na bio

---

### L3 — Multi-Formato Avançado

**Além do texto**:

**Carrossel (Thread de Posts)**:
- Série de até 10 posts sobre um tema, publicados em sequência
- Novo modo na Orquestração: `format: 'thread'`
- Copywriter gera cada post com gancho no primeiro e CTA implícito no último

**Vídeo/Reels Integration**:
- Integração com API de geração de vídeo (Runway, Luma)
- Designer Visual gera brief visual → Gestor sobe via Threads API com `media_type: VIDEO`
- Vídeos de 30-60s com narração baseada no copy do Copywriter

**Stories Pattern** (posts efêmeros de alta frequência):
- 1-2 posts/dia de baixo esforço: citações, perguntas rápidas, polls
- Automatizados pelo Gestor sem passar pelo pipeline completo

---

### L4 — Inteligência Competitiva

**Objetivo**: saber o que está funcionando para contas similares e adaptar.

**Web Search + Análise** (Analista + Estrategista):
- Toda semana, Analista usa `web_search` para buscar posts virais no Threads sobre IA/automação
- Identifica padrões: formatos, ganchos, temas recorrentes
- Estrategista incorpora insights no plano semanal

**Benchmarking Automático**:
- AgentMemory do Analista acumula benchmarks do setor
- Quando engajamento da Sofia está abaixo do benchmark → alert para Estrategista
- Quando um formato específico supera o benchmark → Estrategista dobra a aposta

---

### L5 — Expansão para Multi-Plataforma

**Portas de saída**: a mesma agência, adaptada para outros canais.

**Instagram** (mesmo token Meta):
- Já usa Meta Graph API — extensão natural
- Copywriter aprende regras do Instagram (hashtags, caption, stories)
- Novo agente: **Adaptador de Plataforma** — recebe post do Threads e adapta para Instagram

**LinkedIn** (nova integração):
- Tom mais formal, foco B2B, links permitidos
- Novo agente: **Especialista LinkedIn** com skill customizada
- Orquestração paralela: Threads + LinkedIn a partir do mesmo briefing

**Newsletter** (integração com Resend/Mailchimp):
- Posts de alto desempenho no Threads → adaptados para newsletter mensal
- Analista seleciona os top 4 posts → Copywriter adapta formato long-form

---

### L6 — Sofia Comenta sobre Si Mesma

**Visão**: a agência publica conteúdo que demonstra o produto em uso real.

**"Docs as Content"**: posts que mostram features da Sofia sendo usadas, com screenshots reais.

**Exemplos de posts gerados automaticamente**:
- "Acabei de publicar isso usando uma orquestração de 5 agentes IA. Olha o pipeline..."
- "Meu Analista encontrou que posts às 11h têm 40% mais alcance. Aprendi isso com dados."
- "O Editor rejeitou o primeiro rascunho. A IA revisando a IA. [print do chat]"

**Implementação**:
- Novo tipo de post: `meta_content` (conteúdo sobre o processo da agência)
- Estrategista tem permissão de planejar 1 post/semana sobre bastidores
- Screenshots gerados via Playwright (headless browser captura da UI da Sofia)

---

### L7 — Marketplace de Squads

**Visão de produto de longo prazo**: outros usuários da Sofia podem usar o Squad Threads
como template para suas próprias agências de conteúdo.

**Fluxo**:
1. Squad "Threads Agency" vira um template público na Sofia
2. Novo usuário clona o template → escolhe a conta Threads → configura o tom de voz
3. Agência está operacional em minutos

**Revenue implication**: feature Premium. Acesso ao template Threads Agency = diferencial
do plano Pro vs Starter.

---

## Arquitetura Alvo — Final State

```
┌──────────────────────────────────────────────────────────────────┐
│                    Threads Agency — Sofia                        │
│                                                                  │
│  BRAIN LAYER                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Estrategista│  │  Analista   │  │ Intelligence (web+data) │  │
│  │ Conteúdo    │  │  Métricas   │  │                         │  │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘  │
│         └────────────────┴─────────────────────┘               │
│                          ↓                                       │
│  PRODUCTION LAYER                                                │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ Copywriter │→ │ Designer     │→ │ Editor                   │ │
│  │            │  │ Visual       │  │ (Validação + Qualidade)  │ │
│  └────────────┘  └──────────────┘  └────────────┬─────────────┘ │
│                                                  ↓               │
│  DISTRIBUTION LAYER                                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Gestor de Comunidade                                       │ │
│  │  → Calendário de publicações                               │ │
│  │  → Publicação imediata / agendada                          │ │
│  │  → Monitoramento de replies                                │ │
│  │  → Identificação de leads quentes                          │ │
│  │  → Resposta a engajamento                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                          ↓                                       │
│  DATA LAYER (Threads Graph API)                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ threads_get_recent_posts | threads_get_post_insights        │ │
│  │ threads_get_profile_insights | threads_get_replies          │ │
│  │ threads_reply_to_post | threads_publish_post                │ │
│  │ threads_generate_image | threads_schedule_post              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  AUTOMATION LAYER (Flow Engine)                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ [CRON Seg 9h] Análise Semanal                              │ │
│  │ [CRON Dia 1]  Planejamento Mensal                          │ │
│  │ [CRON 1h]     Publicação Agendada da Fila                  │ │
│  │ [CRON 6h]     Monitoramento de Engajamento                 │ │
│  │ [WEBHOOK]     Publicação On-Demand                         │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## Resumo Executivo

| Fase | Prazo | Investimento | Resultado |
|---|---|---|---|
| **Curto** | 4 semanas | ~40h dev | Pipeline determinístico + dados reais |
| **Médio** | 3 meses | ~120h dev | Agência operacional, 5 posts/semana automatizados |
| **Longo** | 6-12 meses | ~300h dev | Agência autônoma, geração de leads, multi-plataforma |

### O que define cada fase em uma frase:

- **Curto**: dar olhos (dados) e coluna vertebral (pipeline determinístico) à agência
- **Médio**: dar ritmo (calendário), voz visual (imagens) e ouvidos (replies) à agência
- **Longo**: dar autonomia, aprendizado contínuo e capacidade de replicação à agência

### ROI esperado (conservador):

- 5 posts/semana automatizados × 52 semanas = 260 posts/ano
- Crescimento esperado: 100-300 seguidores/mês após mês 3
- 1-5 leads qualificados/mês via engajamento (a partir do mês 4)
- Custo de operação: ~$2-5/mês em tokens de LLM (comparado a $2.000+/mês de agência humana)

---

*Gerado em: 2026-03-03*
*Baseado no estado atual: Threads squad com 5 agentes, MCP Threads API, Flow engine, Orchestrations engine*
