# Threads Agency — Roadmap da Agência de Marketing da Sofia

> **Premissa**: A pasta "Threads" é uma agência de marketing contratada para cuidar do
> marketing da própria Sofia dentro do Threads. Não é um experimento — é infraestrutura
> de negócio com ROI mensurável e crescimento autônomo como objetivo final.

**Data de criação**: 2026-03-03
**Última atualização**: 2026-03-03
**Estado atual**: ~100% — Agência Operacional Completa

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
| ~~Sem agendamento de posts~~ | ~~**Médio**~~ | ✅ **RESOLVIDO** — `ThreadsScheduledPost`, Flow CRON horário, dashboard `/dashboard/threads/calendar` |
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

### ✅ M1 — Calendário de Conteúdo com Agendamento
> **CONCLUÍDO em 2026-03-03**

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

### ✅ M3 — Gestão de Engajamento (Replies)
> **CONCLUÍDO em 2026-03-03**

- ThreadsService: `getReplies(postId)` + `replyToPost(postId, text)`
- MCP: `threads_get_replies` + `threads_reply_to_post` (scopes `threads_read_replies` + `threads_manage_replies`)
- Flow "Monitoramento de Engajamento Threads" (CRON `0 */6 * * *`): Analista mapeia → Gestor classifica e responde leads quentes
- Flow ID: `7ab40d7b-ed94-48ea-8722-73f96fc14639`

---

### ✅ M5 — Dashboard de Performance da Agência
> **CONCLUÍDO em 2026-03-03**

- API: `GET /api/threads/insights?days=7|30` — agrega perfil + insights + top posts com métricas
- Dashboard `/dashboard/threads/analytics`: stats grid (views/likes/replies/reposts/quotes/engajamento), mini bar charts, tabela top posts rankeada por interações, lista de posts recentes
- Sidebar: link "Analytics Threads"

---

### ✅ M6 — Campanha Estruturada
> **CONCLUÍDO em 2026-03-03**

- Prisma: `ThreadsCampaign` + `ThreadsCampaignPost` (planning → approved → active → completed)
- API: `GET/POST /api/threads/campaigns` + `GET/PUT/DELETE /api/threads/campaigns/[id]`
- Orchestration "Planejamento de Campanha Threads" (`acd45aad`) — 5 etapas: Estrategista (arco narrativo) → Analista (validação com dados reais) → Copywriter (todos os posts) → Editor (revisão) → Gestor (agendamento automático)
- Dashboard `/dashboard/threads/campaigns`: CRUD de campanhas, progress bar, lista de posts por posição, filtros por status
- Sidebar: links Campanhas + Analytics Threads

---

### ✅ M2 — Posts com Imagem (AI-Generated)
> **CONCLUÍDO em 2026-03-03**

- Agente "Designer Visual de Threads" (`7f3e834c`) — transforma copy em brief visual (conceito, estilo, paleta, texto na imagem ≤8 palavras) e chama `threads_generate_image`; estilos: photorealistic / minimalist / illustration / text-overlay / data-visualization; formatos: 1:1, 4:5, 9:16
- MCP: `threads_generate_image` — integração com Together AI FLUX.1-schnell (requer `TOGETHER_API_KEY`); fallback graceful se chave não configurada
- MCP: `threads_publish_image_post` — publica post com imagem via Threads Graph API (container IMAGE + publicação)
- Orchestration "Produção de Post Threads com Imagem" (`47ca8503`) — pipeline de 6 etapas: Estrategista → Analista (dados reais) → Copywriter (texto ≤500 chars) → Designer Visual (gera imagem) → Editor (aprova conjunto texto+imagem) → Gestor (publica com imagem; fallback: só texto se imagem rejeitada)

---

### ✅ M3 — Gestão de Engajamento (Replies)
> **CONCLUÍDO em 2026-03-03** — ver detalhes na seção concluída acima

---

### ✅ M4 — A/B Testing de Ganchos
> **CONCLUÍDO em 2026-03-03**

- Orchestration "A/B Test de Ganchos Threads" (`45e458f9`) — 5 etapas: Estrategista (hipóteses de ganchos opostos) → Analista (benchmark + threshold de engajamento) → Copywriter (variante A + B, mesmo corpo, ganchos diferentes) → Editor (valida distinção real entre A e B) → Gestor (publica A, agenda B para 48h via `/api/threads/schedule` com metadata `{ abTestId, variant, threshold_engagement, check_at }`)
- Flow "A/B Test — Leitura de Resultados Threads" (`59fa6970`) — CRON `0 10 * * *` (diário 10h): Analista lê engajamento da variante A via `threads_get_post_insights`, compara com threshold, salva padrão vencedor na memória; Gestor cancela B se A ganhou, ou confirma B se A perdeu
- Rastreamento via campo `metadata: Json` do `ThreadsScheduledPost` (sem nova migration)

---

### ✅ M5 — Dashboard de Performance da Agência
> **CONCLUÍDO em 2026-03-03** — ver detalhes na seção concluída acima

---

### ✅ M6 — Campanha Estruturada
> **CONCLUÍDO em 2026-03-03** — ver detalhes na seção concluída acima

---

### Métricas de Sucesso — Médio Prazo

| Métrica | Meta | Status |
|---|---|---|
| Posts publicados/semana (automático) | 5+ | ✅ Flow Semanal + Mensal automatizam |
| Taxa de engajamento média | >5% | ✅ Monitorável via Analytics |
| Crescimento de seguidores/mês | +100 | ✅ Rastreável via profile insights |
| Tempo do briefing ao post publicado | <15 min | ✅ Pipeline ~5min |
| Replies respondidas/semana | 80% das recebidas | ✅ Flow 6h automatiza |
| Campanhas ativas simultâneas | 1-2 | ✅ Dashboard de campanhas |
| Leads identificados e respondidos/semana | 5+ | ✅ Radar de Leads 4h automatiza |
| Posts com imagem | 30%+ da produção | ✅ Designer Visual + TOGETHER_API_KEY |
| A/B tests por mês | 2+ | ✅ Orquestração A/B + Flow de análise |
| Threads (carrossel) por mês | 2-4 | ✅ Orquestração Thread de Posts |

---

## Longo Prazo — Agência Autônoma
**Horizonte: 6-12 meses | Sprints 7–12**
**Objetivo: agência que opera com mínima intervenção humana, gera leads reais**

---

### ✅ L1 — Modo Autopilot Total
> **CONCLUÍDO em 2026-03-03**

- Flow "Ciclo Mensal Threads" (`151b8a24`) — CRON `0 9 1 * *` (dia 1 de cada mês, 9h BRT): 6 nós em sequência: trigger → Analista (consolida 30d de métricas, identifica padrões, salva relatório mensal na memória) → Estrategista (plano de 20+ posts para o mês com arco narrativo por semana, mix de formatos, A/B tests sugeridos) → Copywriter (escreve os 5 posts da Semana 1) → Editor (revisa, corrige, aprova) → Gestor (agenda via `/api/threads/schedule`, cria campanha mensal via `/api/threads/campaigns`, salva contexto de ciclo na memória)
- Guardrails: Editor em todas as execuções, limite de 5 posts/semana, semanas 2-4 produzidas pela Orquestração Produção conforme necessário
- Variables: `{ POSTS_POR_SEMANA: 5, POSTS_POR_MES: 20, ENGAGEMENT_ALVO: 5% }`

---

### ✅ L2 — Geração de Leads via Threads
> **CONCLUÍDO em 2026-03-03**

- Flow "Radar de Leads Threads" (`63d13a46`) — CRON a cada 4h: Analista varre replies dos últimos 5 posts e classifica leads em 🔥 Quente (preço, como funciona, como testar, dor implícita, conta +500 seguidores) / 🟡 Morno / ⬜ Normal; Gestor do Response Engine gera respostas personalizadas de 80-150 chars por tipo de sinal (nunca vende diretamente — abre conversa) e publica via `threads_reply_to_post`, limite de 5 respostas/ciclo (anti-shadowban)
- Leads qualificados salvos na memória do Gestor para follow-up futuro
- Funil: Post de valor → Analista detecta sinal → Gestor responde → conversa → link na bio

---

### ✅ L3 — Multi-Formato Avançado (Thread de Posts)
> **CONCLUÍDO em 2026-03-03**

- Orchestration "Thread de Posts Threads" (`28ed4795`) — cria e publica threads encadeadas de 3-10 posts, maximizando watch time (sinal mais pesado do algoritmo): Estrategista (arco narrativo: gancho → tensão → núcleo → fechamento, ≤300 chars/post) → Copywriter (todos os posts com ganchos de continuidade entre eles) → Editor (coerência da thread como um todo + fluência narrativa) → Gestor (publica Post 1 âncora via `threads_publish_post`, posts 2-N como replies encadeadas via `threads_reply_to_post`)
- Input: "tema — N posts — objetivo"

---

### ✅ L4 — Inteligência Competitiva
> **CONCLUÍDO em 2026-03-03**

- Flow "Inteligência Competitiva Threads" (`04aae007`) — CRON `0 8 * * 2` (toda terça às 8h): Analista executa 4 queries de `web_search` (tendências virais IA/automação, melhores posts semana, trending content Brasil, viral hooks), verifica `threads_get_profile_insights` + `threads_get_recent_posts`, produz relatório com tendências detectadas, formatos quentes, termos em alta, oportunidades e temas a evitar; Estrategista incorpora os insights ao plano, ajusta ganchos dos posts da semana seguinte e sugere novos posts
- Salva na memória do Analista: `"INTEL [semana/mês]: tendências [top 3], oportunidades [top 2], formatos quentes [top 2]"`

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

### ✅ L6 — Sofia Comenta sobre Si Mesma
> **CONCLUÍDO em 2026-03-03**

- Orchestration "Meta Content — Sofia em Ação" (`dc2f7ec0`) — 4 etapas: Estrategista (escolhe ângulo narrativo autêntico: "nos bastidores" / "aprendi que..." / "falha e recuperação" / "número surpreendente" / "o que ninguém te conta") → Copywriter (post em 1ª pessoa da Sofia, ≤500 chars, autenticidade acima de perfeição) → Editor (critério: autenticidade > perfeição editorial; reescreve se soar artificial) → Gestor (publica agora ou agenda no melhor horário com `metadata: { tipo: "meta_content", angulo }`)
- Input: evento/feature/aprendizado da semana (ex: "Flow Mensal rodou pela 1ª vez e agendou 5 posts sem intervenção humana")
- Exemplos de uso: A/B test results, novo flow criado, flow que rodou automaticamente, dados surpreendentes do Analista

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
│  │            │  │ Visual ✅    │  │ (Validação + Qualidade)  │ │
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
│  │ [CRON Seg 9h]    Análise Semanal ✅                         │ │
│  │ [CRON Ter 8h]    Inteligência Competitiva ✅               │ │
│  │ [CRON Dia 1 9h]  Ciclo Mensal Autopilot ✅                 │ │
│  │ [CRON 1h]        Publicação Agendada da Fila ✅            │ │
│  │ [CRON 4h]        Radar de Leads ✅                         │ │
│  │ [CRON 6h]        Monitoramento de Engajamento ✅           │ │
│  │ [CRON diário 10h] A/B Test Leitura de Resultados ✅        │ │
│  │ [WEBHOOK]        Publicação On-Demand ✅                   │ │
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
