# ROI Labs Platform - API Documentation

## Overview

A ROI Labs Platform oferece uma API RESTful completa para integração com sistemas externos, permitindo automação de processos, gerenciamento de agentes de IA, e análise de dados.

## Base URL

```
Production: https://sofiaia.roilabs.com.br/api
Development: http://localhost:3000/api
```

## Autenticação

Todas as requisições à API requerem autenticação via API Key no header Authorization:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://sofiaia.roilabs.com.br/api/agents
```

### Obtendo uma API Key

1. Acesse o dashboard em `/dashboard/settings/api-keys`
2. Clique em "Nova API Key"
3. Nomeie sua chave e copie o valor gerado
4. Armazene a chave de forma segura (ela não será exibida novamente)

## Rate Limiting

- **1000 requests/hora** por API key
- **100 requests/minuto** por API key

Headers de resposta:
- `X-RateLimit-Limit`: Limite total
- `X-RateLimit-Remaining`: Requisições restantes
- `X-RateLimit-Reset`: Timestamp de reset

## Formato de Resposta

Todas as respostas seguem o formato:

```json
{
  "success": true,
  "data": { ... }
}
```

Em caso de erro:

```json
{
  "success": false,
  "error": "Mensagem de erro descritiva"
}
```

## Principais Endpoints

### Agentes de IA

#### Listar Agentes
```bash
GET /api/agents
```

#### Criar Agente
```bash
POST /api/agents
Content-Type: application/json

{
  "name": "Agente Vendas",
  "description": "Agente especializado em vendas",
  "systemPrompt": "Você é um assistente de vendas...",
  "model": "llama-3.3-70b-versatile",
  "temperature": 0.7,
  "channels": ["whatsapp", "webchat"]
}
```

#### Buscar Agente
```bash
GET /api/agents/{id}
```

#### Atualizar Agente
```bash
PUT /api/agents/{id}
```

#### Deletar Agente
```bash
DELETE /api/agents/{id}
```

### Conversas

#### Listar Conversas
```bash
GET /api/conversations?status=active&limit=50
```

Parâmetros opcionais:
- `status`: active, waiting, closed
- `channel`: whatsapp, webchat, email
- `limit`: número de resultados (padrão: 50)
- `offset`: paginação

#### Buscar Mensagens
```bash
GET /api/conversations/{id}/messages?limit=100
```

#### Enviar Mensagem
```bash
POST /api/conversations/{id}/messages
Content-Type: application/json

{
  "content": "Olá, como posso ajudar?",
  "messageType": "text"
}
```

#### Takeover Humano
```bash
POST /api/conversations/{id}/takeover
```

Pausa o agente IA e permite intervenção humana.

#### Fechar Conversa
```bash
POST /api/conversations/{id}/close
```

### Workflows

#### Listar Workflows
```bash
GET /api/workflows
```

#### Criar Workflow
```bash
POST /api/workflows
Content-Type: application/json

{
  "name": "Qualificação de Leads",
  "description": "Workflow de qualificação automática",
  "trigger": {
    "type": "message.received"
  },
  "actions": [
    {
      "type": "call_agent",
      "config": { "agentId": "..." }
    }
  ],
  "status": "active"
}
```

#### Executar Workflow
```bash
POST /api/workflows/{id}/run
Content-Type: application/json

{
  "context": {
    "leadId": "...",
    "message": "..."
  }
}
```

### Orquestrações Multi-Agent

#### Listar Orquestrações
```bash
GET /api/orchestrations
```

#### Criar Orquestração
```bash
POST /api/orchestrations
Content-Type: application/json

{
  "name": "Análise Completa de Lead",
  "description": "Pipeline de análise com múltiplos agentes",
  "strategy": "sequential",
  "agents": [
    {
      "agentId": "agent-1-id",
      "role": "qualifier"
    },
    {
      "agentId": "agent-2-id",
      "role": "analyzer"
    }
  ]
}
```

Estratégias disponíveis:
- `sequential`: Agentes executam em sequência, cada um recebe o output do anterior
- `parallel`: Todos agentes executam simultaneamente
- `consensus`: Agentes votam, resposta mais comum é escolhida

#### Executar Orquestração
```bash
POST /api/orchestrations/{id}/execute
Content-Type: application/json

{
  "input": "Analisar lead com interesse em apartamento 2 quartos",
  "conversationId": "optional-conversation-id"
}
```

### Analytics

#### Métricas Gerais
```bash
GET /api/analytics/overview?startDate=2026-01-01&endDate=2026-01-31
```

#### Métricas por Agente
```bash
GET /api/analytics/agents?period=7d
```

#### Métricas por Workflow
```bash
GET /api/analytics/workflows?period=30d
```

#### Funil de Leads
```bash
GET /api/analytics/leads?startDate=2026-01-01
```

### Monitoramento

#### Health Check
```bash
GET /api/monitoring
```

Retorna status de todos os serviços (database, monitoring, memory).

#### Registrar Erro
```bash
POST /api/monitoring
Content-Type: application/json

{
  "level": "error",
  "message": "Erro ao processar requisição",
  "context": {
    "route": "/api/agents",
    "userId": "..."
  }
}
```

## Webhooks

Configure webhooks para receber notificações em tempo real de eventos:

### Eventos Disponíveis

- `conversation.created`: Nova conversa iniciada
- `message.received`: Mensagem recebida
- `message.sent`: Mensagem enviada
- `lead.qualified`: Lead qualificado
- `workflow.completed`: Workflow finalizado
- `orchestration.completed`: Orquestração finalizada

### Configurar Webhook

```bash
POST /api/webhooks
Content-Type: application/json

{
  "url": "https://seu-servidor.com/webhook",
  "events": ["conversation.created", "message.received"],
  "secret": "seu-secret-para-validacao"
}
```

### Payload do Webhook

```json
{
  "event": "conversation.created",
  "timestamp": "2026-02-09T12:00:00Z",
  "data": {
    "conversationId": "...",
    "leadId": "...",
    "channel": "whatsapp"
  },
  "signature": "sha256=..."
}
```

## Erros Comuns

| Código | Descrição | Solução |
|--------|-----------|---------|
| 401 | Unauthorized | Verifique se a API key está correta |
| 403 | Forbidden | Verifique permissões da API key |
| 404 | Not Found | Recurso não existe |
| 429 | Too Many Requests | Rate limit excedido, aguarde |
| 500 | Internal Server Error | Erro no servidor, contate suporte |

## SDKs e Bibliotecas

### JavaScript/TypeScript

```bash
npm install @roilabs/api-client
```

```typescript
import { ROILabsClient } from '@roilabs/api-client'

const client = new ROILabsClient({
  apiKey: 'YOUR_API_KEY',
  baseUrl: 'https://sofiaia.roilabs.com.br/api'
})

// Listar agentes
const agents = await client.agents.list()

// Criar conversa
const conversation = await client.conversations.create({
  leadId: '...',
  channel: 'whatsapp'
})
```

### Python

```bash
pip install roilabs-sdk
```

```python
from roilabs import Client

client = Client(api_key='YOUR_API_KEY')

# Listar workflows
workflows = client.workflows.list()

# Executar orquestração
result = client.orchestrations.execute(
    orchestration_id='...',
    input='Analisar este lead'
)
```

## Documentação Interativa

Acesse a documentação interativa com Swagger UI:

```
https://sofiaia.roilabs.com.br/api-docs
```

Ou localmente:

```
http://localhost:3000/api-docs
```

## Suporte

- Email: suporte@roilabs.com.br
- Documentação: https://docs.roilabs.com.br
- Status: https://status.roilabs.com.br

## Changelog

### v1.0.0 (2026-02-09)
- Lançamento inicial da API pública
- Endpoints de agentes, conversas, workflows e orquestrações
- Sistema de analytics e monitoramento
- Documentação OpenAPI 3.0
- Rate limiting e autenticação via API keys
