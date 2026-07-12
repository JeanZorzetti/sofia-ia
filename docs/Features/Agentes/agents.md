# Polaris IA — Sistema de Agentes de IA

> Referência completa do sistema de agentes: arquitetura, capacidades, configuração e integrações.  
> Atualizado em: 2026-05-03

---

## O que é um Agente

Um agente é uma entidade de IA com identidade própria — nome, personalidade definida por system prompt, modelo de linguagem, base de conhecimento e um conjunto de habilidades. Ele responde em canais (WhatsApp, Web, Instagram) e pode ser encadeado com outros agentes em orquestrações.

---

## Propriedades de um Agente

| Campo | Tipo | Descrição |
|---|---|---|
| `name` | string | Nome do agente |
| `description` | string | Finalidade resumida |
| `systemPrompt` | text | Instrução de comportamento e personalidade |
| `model` | string | Modelo de IA (default: `llama-3.3-70b-versatile`) |
| `temperature` | float 0–2 | Criatividade das respostas (default: 0.7) |
| `status` | active / inactive | Liga/desliga o agente |
| `knowledgeBaseId` | uuid? | Base de conhecimento vinculada |
| `folderId` | uuid? | Pasta de organização |
| `memoryEnabled` | boolean | Ativa memória persistente por usuário |
| `config` | JSON | Configurações avançadas (modo cognitivo, etc.) |
| `createdBy` | uuid | Usuário criador |

---

## Tabs de Configuração do Agente

Cada agente tem páginas dedicadas de configuração acessíveis em `/dashboard/agents/[id]/`:

| Tab | Rota | O que configura |
|---|---|---|
| **Geral** | `/[id]` | Nome, descrição, model, temperature, system prompt, status |
| **Skills** | `/[id]/skills` | Habilidades habilitadas e config por agente |
| **MCP** | `/[id]/mcp` | Servidores MCP conectados e ferramentas disponíveis |
| **Memória** | `/[id]/memory` | Memórias persistentes do agente por usuário |
| **Delegações** | `/[id]/delegations` | Regras de handoff para outros agentes |
| **Plugins** | `/[id]/plugins` | Plugins JavaScript customizados |

---

## Modos Cognitivos

O agente pode operar em modo padrão ou com pipeline cognitivo avançado.

### Modo Padrão
Resposta direta via o modelo configurado.

### Modo Cognitivo (chain-of-thought)
Pipeline interno de 3 agentes em cadeia:

```
Input do usuário
    ↓
[Orchestrator]  — decompõe a pergunta em subtarefas
    ↓
[Optimizer]     — refina a abordagem e filtra ruído
    ↓
[Synthesizer]   — produz a resposta final consolidada
    ↓
Output para o usuário
```

Ativado via `POST /api/agents/[id]/cognitive-mode`.

---

## Skills — Habilidades dos Agentes

Skills estendem o que o agente pode fazer. Existem dois tipos:

### Tipo: Tool
Código JavaScript executado quando o agente decide acionar a ferramenta. Segue o schema de tool calling da OpenAI.

```json
{
  "type": "tool",
  "toolDefinition": {
    "name": "search_property",
    "description": "Busca imóveis por filtros",
    "parameters": {
      "type": "object",
      "properties": {
        "city": { "type": "string" },
        "maxPrice": { "type": "number" }
      }
    }
  },
  "toolCode": "// JavaScript executado server-side"
}
```

### Tipo: Prompt Block
Texto injetado no contexto do agente antes de cada resposta. Útil para adicionar regras, personas ou informações contextuais sem modificar o system prompt principal.

### Categorias de Skills

| Categoria | Exemplos de uso |
|---|---|
| `research` | Busca na web, consulta de APIs externas |
| `integration` | Chamar sistemas externos (CRM, ERP) |
| `development` | Execução de código, parsing de dados |
| `social-media` | Publicação e consulta de redes sociais |
| `sales` | Qualificação de leads, scripts de venda |
| `analytics` | Consulta de métricas, relatórios |
| `content` | Geração e formatação de conteúdo |
| `productivity` | Calendário, tarefas, notas |
| `custom` | Uso livre |

### Binding de Skills ao Agente

Cada skill habilitada em um agente é uma entrada em `AgentSkill` com:
- `enabled` — ativa/desativa sem remover o vínculo
- `config` — JSON com parâmetros específicos para este agente

---

## MCP — Model Context Protocol

O agente pode se conectar a servidores MCP externos. Cada servidor expõe ferramentas que o agente usa como se fossem skills nativas.

### Catálogo de Servidores MCP disponíveis

| Categoria | Servidores |
|---|---|
| **Desenvolvimento** | GitHub, Filesystem, Playwright, Sequential Thinking, E2B Sandbox |
| **Dados & Bancos** | PostgreSQL, SQLite, Supabase, MongoDB, Redis |
| **Produtividade** | Notion, Linear, Slack, Zapier, Google Calendar |
| **Busca & Web** | Brave Search, Exa, Puppeteer, Google Maps, Tavily |
| **Monitoramento** | Sentry, Cloudflare, Datadog, Grafana, Axiom |
| **Pagamentos** | Stripe, Mercado Pago, PayPal, Shopify, PagSeguro |

### Polaris IA como servidor MCP

A própria plataforma expõe ferramentas MCP para sistemas externos via `GET /api/mcp`:

| Tool | O que faz |
|---|---|
| `list_agents` | Lista agentes disponíveis |
| `call_agent` | Envia mensagem para um agente |
| `search_knowledge` | Busca semântica nas knowledge bases |
| `publish_threads` | Publica post no Threads |

Autenticação: `X-API-Key` header com chave gerada no painel.

---

## Memória Persistente

Quando `memoryEnabled = true`, o agente mantém um banco de memórias por usuário (`AgentMemory`):

```
agentId + userId + key → value
```

O agente lê e escreve memórias durante as conversas, permitindo lembrar preferências, histórico de compra, estágio no funil e qualquer contexto relevante entre sessões.

---

## Delegação entre Agentes

Um agente pode transferir a conversa para outro agente especialista com base em regras configuradas em `/dashboard/agents/[id]/delegations`.

**Casos de uso:**
- Agente generalista → Agente de vendas quando lead demonstra intenção
- Agente de triagem → Agente especialista por tipo de imóvel
- Agente de atendimento → Agente de suporte técnico

O handoff é registrado em `AgentDelegation` com contexto da conversa preservado.

---

## Plugins JavaScript

Plugins são código JavaScript executado pelo agente fora do sistema de skills — úteis para lógica proprietária que não se encaixa no schema de tool calling.

Criados e gerenciados em `/dashboard/agents/[id]/plugins`.  
Executados via `POST /api/agents/[id]/plugins`.

---

## Base de Conhecimento (RAG)

Cada agente pode ter uma knowledge base vinculada. Durante a resposta, o agente busca trechos relevantes via similaridade vetorial e os injeta como contexto.

### Pipeline de indexação

```
Upload de documento
    ↓
Chunking automático (divisão em trechos)
    ↓
Geração de embeddings (1536 dimensões, OpenAI)
    ↓
Armazenamento em pgvector (PostgreSQL)
    ↓
Busca semântica em tempo de resposta
```

### Status de documentos

| Status | Significado |
|---|---|
| `processing` | Indexação em andamento |
| `completed` | Pronto para uso |
| `error` | Falha na indexação |

**Fontes suportadas:** upload direto, sincronização com Google Drive.

---

## Orquestrações — Pipelines Multi-Agente

Orquestrações encadeiam múltiplos agentes em um pipeline. O output de cada agente alimenta o próximo.

### Estratégias de execução

| Estratégia | Comportamento |
|---|---|
| **Sequential** | Agentes executam em ordem; cada um recebe o output do anterior + input original |
| **Parallel** | Todos os agentes recebem o mesmo input e executam simultaneamente |
| **Consensus** | Múltiplos agentes respondem; a resposta mais frequente vence |

### Nó Task Splitter

Nó especial que divide um input em múltiplas tarefas e distribui entre agentes:

```json
{
  "type": "task_splitter",
  "splitterConfig": {
    "taskPattern": "string de extração",
    "confirmationMode": "auto | manual",
    "contextMode": "isolated | accumulated",
    "maxTasksPerRun": 10
  }
}
```

### Estrutura de um Step de Orquestração

```json
{
  "agentId": "uuid",
  "role": "Analisador de Leads",
  "prompt": "Instruções específicas para este step (opcional)",
  "condition": "Condição para executar este step (opcional)",
  "type": "agent | task_splitter"
}
```

### Execução e rastreamento

Cada execução (`OrchestrationExecution`) registra:
- `status` — pending / running / success / failed
- `currentAgentId` — qual agente está rodando agora
- `agentResults` — array com output de cada step
- `durationMs` — tempo total de execução
- `tokensUsed` — tokens consumidos
- `estimatedCost` — custo estimado em USD
- `shareToken` — token para compartilhar resultado publicamente

### Output Webhooks

Ao concluir, a orquestração pode notificar automaticamente:

| Destino | Config |
|---|---|
| Slack | URL do webhook do canal |
| Discord | URL do webhook do servidor |
| E-mail | Endereço de destino |
| HTTP genérico | Qualquer endpoint REST |

### Agendamento

Orquestrações podem rodar em horários programados via cron (`ScheduledExecution`).  
Exemplo: toda segunda às 08h, gerar relatório semanal de leads.

### Criação por IA (Magic Create)

Via `POST /api/orchestrations/magic-create`, descreva o objetivo em texto e a IA monta a orquestração com agentes e steps automaticamente.

---

## A/B Testing de Agentes

Compare dois agentes em produção com divisão de tráfego real.

### Ciclo de vida de um teste

```
Draft → Running → Completed
         ↑
    (start/stop manual)
```

### Propriedades

| Campo | Descrição |
|---|---|
| `agentAId` | Agente variante A |
| `agentBId` | Agente variante B |
| `trafficSplit` | % do tráfego para A (1–99) |
| `totalInteractions` | Interações registradas |
| `winnerAgentId` | Agente vencedor (após conclusão) |

Cada interação (`ABTestInteraction`) registra variante (A ou B), `conversationId` e métricas de outcome em JSON.

---

## Canais de Distribuição

Agentes podem operar em múltiplos canais simultaneamente:

| Canal | Config necessária |
|---|---|
| **WhatsApp** | Instância Evolution API vinculada |
| **Web Chat** | Widget embutível (script tag) |
| **Instagram DM** | Integração OAuth Instagram |
| **Telegram** | Bot token configurado |
| **E-mail** | Integração de e-mail |

A configuração de canais é feita no próprio agente — sem criar integrações separadas por canal.

---

## Calendário & Google Sheets

Dois dados externos que o agente pode consumir diretamente:

- **Google Calendar** — o agente consulta e cria eventos (`POST /api/agents/[id]/enable-calendar`)
- **Google Sheets** — importa dados tabulares para contexto (`POST /api/agents/[id]/sheets-import`)

---

## Arquitetura do Sistema de Agentes

```
Usuário / Canal externo
        ↓
   [ Agente ]
   ├── System Prompt (personalidade)
   ├── Modelo de IA (llama-3.3-70b-versatile)
   ├── Knowledge Base (pgvector RAG)
   ├── Skills (tool calling + prompt blocks)
   ├── MCP Servers (ferramentas externas)
   ├── Memória (contexto persistente por usuário)
   └── Plugins (código custom)
        ↓
  [ Orquestração ] (opcional)
   ├── Sequential / Parallel / Consensus
   ├── Task Splitter
   ├── Output Webhooks
   └── Agendamento cron
        ↓
  [ A/B Testing ] (opcional)
   ├── Split de tráfego
   └── Métricas por variante
```

---

## Rotas de API

### Agentes

| Método | Rota | Ação |
|---|---|---|
| GET | `/api/agents` | Listar agentes |
| POST | `/api/agents` | Criar agente |
| GET | `/api/agents/[id]` | Detalhe do agente |
| PUT | `/api/agents/[id]` | Atualizar agente |
| DELETE | `/api/agents/[id]` | Excluir agente |
| POST | `/api/agents/[id]/cognitive-mode` | Alternar modo cognitivo |
| POST | `/api/agents/[id]/enable-calendar` | Habilitar Google Calendar |
| POST | `/api/agents/[id]/sheets-import` | Importar Google Sheets |

### Skills

| Método | Rota | Ação |
|---|---|---|
| GET | `/api/agents/[id]/skills` | Skills vinculadas ao agente |
| POST | `/api/agents/[id]/skills` | Vincular skill ao agente |
| DELETE | `/api/agents/[id]/skills/[skillId]` | Desvincular skill |
| GET | `/api/skills` | Listar skills disponíveis |
| POST | `/api/skills` | Criar skill |
| DELETE | `/api/skills/[id]` | Excluir skill |

### MCP

| Método | Rota | Ação |
|---|---|---|
| GET | `/api/agents/[id]/mcp` | Servidores MCP do agente |
| POST | `/api/agents/[id]/mcp` | Conectar servidor MCP |
| GET | `/api/mcp/servers` | Listar servidores MCP |
| POST | `/api/mcp/servers` | Criar servidor MCP |
| PUT | `/api/mcp/servers/[id]` | Atualizar servidor |
| DELETE | `/api/mcp/servers/[id]` | Remover servidor |
| POST | `/api/mcp/servers/[id]/tools` | Sincronizar ferramentas |
| GET | `/api/mcp` | Polaris IA como servidor MCP |

### Orquestrações

| Método | Rota | Ação |
|---|---|---|
| GET | `/api/orchestrations` | Listar orquestrações |
| POST | `/api/orchestrations` | Criar orquestração |
| PUT | `/api/orchestrations/[id]` | Atualizar |
| DELETE | `/api/orchestrations/[id]` | Excluir |
| POST | `/api/orchestrations/[id]/execute` | Executar |
| POST | `/api/orchestrations/[id]/stream` | Executar com streaming |
| POST | `/api/orchestrations/[id]/continue` | Retomar de um step |
| GET | `/api/orchestrations/[id]/analytics` | Analytics da orquestração |
| GET | `/api/orchestrations/executions` | Histórico de execuções |
| POST | `/api/orchestrations/generate` | Gerar via IA |
| POST | `/api/orchestrations/magic-create` | Magic create |

### A/B Testing

| Método | Rota | Ação |
|---|---|---|
| GET | `/api/ab-tests` | Listar testes |
| POST | `/api/ab-tests` | Criar teste |
| POST | `/api/ab-tests/[id]/start` | Iniciar teste |
| POST | `/api/ab-tests/[id]/stop` | Encerrar e analisar |

---

## Limites por Plano

Os limites de agentes e features são verificados em tempo de execução via `checkPlanLimit`:

| Recurso | Free | Pro | Business |
|---|---|---|---|
| Agentes ativos | 1 | Ilimitado | Ilimitado |
| Orquestrações | — | Sim | Sim |
| A/B Testing | — | Sim | Sim |
| MCP Servers | — | Sim | Sim |
| Skills customizadas | — | Sim | Sim |
| API pública | — | Sim | Irrestrita |
| Modo cognitivo | — | Sim | Sim |
