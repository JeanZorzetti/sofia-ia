# Referência de API — Sofia

## Autenticação

Todas as rotas (exceto `/api/auth/*`, `/api/health`, `/api/webhook/*`) requerem autenticação via cookie JWT.

```
Cookie: token=<jwt_token>
```

Login: `POST /api/auth/login` → seta cookie automaticamente.

---

## Domínios

### Auth

| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/api/auth/login` | Login com email/senha |
| `POST` | `/api/auth/register` | Cadastro |
| `POST` | `/api/auth/logout` | Logout (limpa cookie) |
| `GET` | `/api/auth/me` | Retorna usuário autenticado |

### Agents

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/agents` | Lista agentes |
| `POST` | `/api/agents` | Cria agente |
| `GET` | `/api/agents/[id]` | Detalhes do agente |
| `PUT` | `/api/agents/[id]` | Atualiza agente |
| `DELETE` | `/api/agents/[id]` | Deleta agente |

### Conversations

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/conversations/recent` | Conversas recentes |
| `GET` | `/api/conversations/[id]` | Detalhes da conversa |
| `GET` | `/api/conversations/[id]/messages` | Mensagens da conversa |
| `POST` | `/api/conversations/[id]/close` | Fecha conversa |
| `POST` | `/api/conversations/[id]/takeover` | Takeover humano |
| `POST` | `/api/conversations/[id]/reset` | Reset da conversa |
| `PUT` | `/api/conversations/[id]/tags` | Atualiza tags |

### Orchestrations

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/orchestrations` | Lista orquestrações |
| `POST` | `/api/orchestrations` | Cria orquestração |
| `GET` | `/api/orchestrations/[id]` | Detalhes |
| `PUT` | `/api/orchestrations/[id]` | Atualiza |
| `DELETE` | `/api/orchestrations/[id]` | Deleta |
| `POST` | `/api/orchestrations/[id]/execute` | Executa |
| `GET` | `/api/orchestrations/[id]/stream` | Stream SSE |
| `GET` | `/api/orchestrations/[id]/analytics` | Analytics |

### Flows

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/flows` | Lista flows |
| `POST` | `/api/flows` | Cria flow |
| `POST` | `/api/flows/cron` | Executa flows agendados |

### Knowledge Base

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/knowledge` | Lista knowledge bases |
| `POST` | `/api/knowledge` | Cria knowledge base |
| `GET` | `/api/knowledge/[id]` | Detalhes |
| `DELETE` | `/api/knowledge/[id]` | Deleta |
| `GET` | `/api/knowledge/[id]/documents` | Lista documentos |
| `POST` | `/api/knowledge/[id]/documents` | Upload de documento |
| `POST` | `/api/knowledge/[id]/documents/upload` | Upload com vectorização |
| `DELETE` | `/api/knowledge/[id]/documents/[documentId]` | Deleta documento |

### WhatsApp Instances

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/instances` | Lista instâncias |
| `POST` | `/api/instances` | Cria instância |
| `DELETE` | `/api/instances/[name]` | Deleta instância |
| `POST` | `/api/instances/[name]/connect` | Conecta instância |
| `GET` | `/api/instances/[name]/qrcode` | QR code para conexão |
| `GET` | `/api/instances/[name]/state` | Estado da conexão |
| `POST` | `/api/instances/[name]/logout` | Desconecta |
| `POST` | `/api/instances/[name]/restart` | Reinicia |
| `POST` | `/api/instances/[name]/presence` | Define presença |

### Templates

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/templates` | Lista templates |
| `GET` | `/api/templates/[id]` | Detalhes do template |
| `PUT` | `/api/templates/[id]` | Atualiza template |
| `POST` | `/api/templates/[id]/deploy` | Deploy do template |

### Workflows

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/workflows` | Lista workflows |
| `POST` | `/api/workflows` | Cria workflow |
| `GET` | `/api/workflows/[id]` | Detalhes |
| `PUT` | `/api/workflows/[id]` | Atualiza |
| `DELETE` | `/api/workflows/[id]` | Deleta |
| `POST` | `/api/workflows/[id]/run` | Executa |
| `POST` | `/api/workflows/[id]/duplicate` | Duplica |
| `GET` | `/api/workflows/[id]/executions` | Histórico |

### Outros

| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/api/messages/send` | Envia mensagem WhatsApp |
| `POST` | `/api/ai/chat` | Chat geral com Sofia |
| `POST` | `/api/ide/chat` | Chat da IDE (multi-model) |
| `POST` | `/api/chat/widget` | Chat widget embed |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/monitoring` | Status do sistema |
| `GET` | `/api/models` | Lista modelos disponíveis |
| `GET` | `/api/analytics/overview` | Analytics geral |
| `POST` | `/api/analytics/collect` | Coleta analytics (cron) |
| `POST` | `/api/analytics/nl-query` | Query em linguagem natural |
| `GET/POST` | `/api/settings` | Configurações |
| `GET/PUT` | `/api/settings/company` | Dados da empresa |
| `GET/POST` | `/api/users` | CRUD de usuários |
| `GET/POST` | `/api/integrations` | CRUD de integrações |
| `GET` | `/api/whatsapp/stats` | Estatísticas WhatsApp |

### Webhooks (sem autenticação)

| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/api/webhook/evolution` | Webhook da Evolution API |
| `POST` | `/api/webhook/telegram` | Webhook do Telegram |
| `POST` | `/api/webhook/instagram` | Webhook do Instagram |
