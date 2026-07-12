# Polaris IA — Mapa de Features

> Gerado em: 2026-05-03  
> Versão do projeto: pós V2 (UI/UX), pré V3 (Growth & Revenue)

---

## 1. Autenticação & Controle de Acesso

| # | Feature | Descrição |
|---|---------|-----------|
| 1.1 | Login email/senha | Autenticação com JWT armazenado em cookie `sofia_token` |
| 1.2 | Google OAuth | Login via Google com fluxo de finalização de conta |
| 1.3 | SSO por organização | Google / Microsoft SSO configurável por domínio da empresa |
| 1.4 | Forçar SSO | Bloqueia login por senha quando SSO está ativo na org |
| 1.5 | Convite de usuários | Token de convite com expiração para novos membros |
| 1.6 | RBAC | Papéis: Admin, Member, Viewer |
| 1.7 | Beta tester | Flag de acesso antecipado e identificação de early adopters |
| 1.8 | Impersonação | Admin pode logar como qualquer usuário (suporte) |

---

## 2. Workspace & Organização

| # | Feature | Descrição |
|---|---------|-----------|
| 2.1 | Criação de workspace | Setup inicial com nome, domínio e configurações |
| 2.2 | Membros da equipe | Listagem, adição, remoção e troca de papel |
| 2.3 | Onboarding wizard | Checklist guiado de primeiros passos com tracking |
| 2.4 | Perfil de usuário | Edição de nome, e-mail e preferências |
| 2.5 | Audit log | Registro de todas as ações com IP, user agent e timestamp |
| 2.6 | Criptografia de settings | Dados sensíveis de configuração armazenados com criptografia |

---

## 3. Agentes de IA

| # | Feature | Descrição |
|---|---------|-----------|
| 3.1 | CRUD de agentes | Criar, editar, duplicar e excluir agentes |
| 3.2 | Pastas de agentes | Organização em pastas com cor personalizável |
| 3.3 | System prompt | Configuração do prompt de sistema por agente |
| 3.4 | Seleção de modelo | Escolha do modelo de IA (Llama 3.3-70b, etc.) |
| 3.5 | Temperature | Controle de criatividade/variabilidade das respostas |
| 3.6 | Knowledge base | Associação de bases de conhecimento ao agente |
| 3.7 | Memória do agente | Contexto persistente entre conversas |
| 3.8 | Plugins JavaScript | Extensões customizadas com código JS |
| 3.9 | Delegação entre agentes | Agente pode delegar subtarefas a outros agentes |
| 3.10 | Modo cognitivo | Configuração de raciocínio avançado (chain-of-thought, etc.) |
| 3.11 | Skills por agente | Habilitação e configuração de habilidades por agente |
| 3.12 | MCP por agente | Atribuição de servidores MCP por agente |
| 3.13 | Status ativo/inativo | Ativação e desativação do agente |
| 3.14 | Geração de prompt por IA | Geração automática de system prompt via IA |
| 3.15 | Testador de chat | Interface de debug para testar o agente em dev sessions |

---

## 4. Skills & Extensibilidade

| # | Feature | Descrição |
|---|---------|-----------|
| 4.1 | Criação de skills | Definição de ferramentas com código e schema |
| 4.2 | Categorização | Organização por tipo (geral, produtividade, etc.) |
| 4.3 | Biblioteca oficial | Skills pré-prontas disponíveis como templates |
| 4.4 | Configuração por agente | Parâmetros customizados de skill por agente |
| 4.5 | Execução e teste | Execução isolada para validação da skill |

---

## 5. MCP — Model Context Protocol

| # | Feature | Descrição |
|---|---------|-----------|
| 5.1 | CRUD de servidores MCP | Criação e gerenciamento de servidores MCP |
| 5.2 | Cache de tools | Cache das ferramentas disponíveis por servidor |
| 5.3 | Transport HTTP/custom | Suporte a transporte HTTP e custom |
| 5.4 | Health check | Monitoramento de status do servidor MCP |
| 5.5 | Atribuição por agente | Servidor MCP vinculado a agentes específicos |

---

## 6. Conversas & Leads

| # | Feature | Descrição |
|---|---------|-----------|
| 6.1 | Inbox multicanal | Gerenciamento unificado (WhatsApp, Instagram, Telegram, etc.) |
| 6.2 | Criação de lead | Criação manual ou automática a partir de contato |
| 6.3 | Score de qualificação | Pontuação de qualificação do lead |
| 6.4 | Atribuição de lead | Atribuição a membros da equipe |
| 6.5 | Propriedades do lead | Nome, telefone, e-mail, tipo de imóvel, faixa de preço, etc. |
| 6.6 | Status da conversa | Ativa, fechada, aguardando |
| 6.7 | Tags e notas | Marcação e anotações manuais por conversa |
| 6.8 | Handoff humano | Transferência de IA para atendente humano |
| 6.9 | Takeover humano | Atendente assume a conversa sem notificar o lead |
| 6.10 | Reset de conversa | Reiniciar histórico e contexto da conversa |
| 6.11 | Contador de não lidas | Badge de mensagens não lidas por conversa |
| 6.12 | Status de entrega | Rastreamento de envio e leitura de mensagens |
| 6.13 | Atribuição de fonte | Origem do lead (WhatsApp, formulário, etc.) |

---

## 7. Knowledge Base (RAG)

| # | Feature | Descrição |
|---|---------|-----------|
| 7.1 | Múltiplas KBs por agente | Cada agente pode ter N bases de conhecimento |
| 7.2 | Upload de documentos | Upload e indexação de documentos |
| 7.3 | Chunking & embeddings | Divisão em chunks com embeddings 1536-dim (pgvector) |
| 7.4 | Busca semântica | Recuperação por similaridade vetorial |
| 7.5 | Sincronização Google Drive | Importação e sync de documentos do Drive |
| 7.6 | Reset da KB | Limpeza de todos os embeddings da base |
| 7.7 | Status de documentos | Tracking de indexação (pending, processing, done, error) |

---

## 8. Workflows (Automação Visual)

| # | Feature | Descrição |
|---|---------|-----------|
| 8.1 | Flow builder visual | Editor drag-and-drop estilo N8N (React Flow) |
| 8.2 | Tipos de nós | Trigger, ação, condição, webhook, agente, etc. |
| 8.3 | Execução manual | Disparo manual de flows para teste |
| 8.4 | Trigger cron | Agendamento via expressão cron |
| 8.5 | Trigger webhook | Disparo por chamada HTTP externa |
| 8.6 | Variáveis de flow | Definição e uso de variáveis entre nós |
| 8.7 | Histórico de execuções | Log de todas as execuções com status e resultados por nó |
| 8.8 | Versionamento | Versões do flow com rollback |
| 8.9 | Duplicar flow | Cópia de flows existentes |
| 8.10 | Templates de flow | Geração e uso de templates |
| 8.11 | Retry com backoff | Política de retry configurável com backoff exponencial |
| 8.12 | Resultado por nó | Captura de saída e erro por nó individualmente |
| 8.13 | Status de execução | pending, running, success, failed, cancelled |

---

## 9. Orchestrations (Multi-Agente)

| # | Feature | Descrição |
|---|---------|-----------|
| 9.1 | CRUD de orchestrations | Criar, editar, excluir orquestrações |
| 9.2 | Sequenciamento de agentes | Execução sequencial ou paralela de agentes |
| 9.3 | Magic create | Geração automática de orquestração via prompt de IA |
| 9.4 | Execução em tempo real | Acompanhamento ao vivo do status de execução |
| 9.5 | Histórico de execuções | Log filtrado por status, data e agente |
| 9.6 | Analytics de execuções | Gráficos de tempo de execução e performance |
| 9.7 | Task splitter | Nó para roteamento multi-branch |
| 9.8 | Sugestão preditiva | IA sugere próximos nós durante a criação |
| 9.9 | Comparação de execuções | Ferramenta de comparação entre múltiplas execuções |
| 9.10 | Compartilhamento | Link público com token para compartilhar resultados |
| 9.11 | Agendamento cron | Execução automática agendada |
| 9.12 | Output webhooks | Notificações para Slack, Discord, e-mail, HTTP genérico |
| 9.13 | Custo de execução | Estimativa de tokens e custo por execução |
| 9.14 | API pública | Endpoint REST público para disparar orquestrações |

---

## 10. Analytics & Relatórios

| # | Feature | Descrição |
|---|---------|-----------|
| 10.1 | Dashboard overview | Métricas chave: conversas, leads, mensagens, taxa de conversão |
| 10.2 | Agregação diária | Histórico de analytics agregado por dia |
| 10.3 | Visualização temporal | Filtros por 7d, 30d e 90d |
| 10.4 | Analytics por agente | Performance individual de cada agente |
| 10.5 | Analytics de leads | Tendências de qualificação e conversão |
| 10.6 | Analytics de flows | Execuções e taxa de sucesso de workflows |
| 10.7 | Query em linguagem natural | Consultas de analytics via linguagem natural |
| 10.8 | Rastreamento de eventos | Eventos customizados de produto |
| 10.9 | NPS | Coleta e visualização de Net Promoter Score |

---

## 11. Integrações

| # | Feature | Descrição |
|---|---------|-----------|
| 11.1 | HubSpot CRM | OAuth + sincronização de leads |
| 11.2 | Salesforce CRM | OAuth + sincronização de leads |
| 11.3 | Google Drive | Sync de documentos para Knowledge Base |
| 11.4 | Google Calendar | Agendamento integrado por agente |
| 11.5 | Google Sheets | Importação de dados tabulares |
| 11.6 | Zapier | Automações via Zapier |
| 11.7 | Make (Integromat) | Automações via Make |
| 11.8 | n8n | Workflows via n8n auto-hospedado |
| 11.9 | Notion | Sincronização de bases de dados Notion |
| 11.10 | TOTVS ERP | Integração com ERP TOTVS |
| 11.11 | ElevenLabs | Text-to-speech para respostas de voz |
| 11.12 | Gerenciamento OAuth | Conexão genérica de integrações via OAuth |

---

## 12. WhatsApp

| # | Feature | Descrição |
|---|---------|-----------|
| 12.1 | Criação de instância | Instância WhatsApp via Evolution API |
| 12.2 | QR Code | Geração de QR para vinculação de número |
| 12.3 | Status da instância | Monitoramento em tempo real (conectado/desconectado) |
| 12.4 | Múltiplas instâncias | Suporte a N números por workspace |
| 12.5 | Webhook Evolution API | Configuração de webhooks para receber mensagens |
| 12.6 | Restart / logout | Reinicialização e desvinculação de instância |
| 12.7 | Estatísticas diárias | Mensagens enviadas/recebidas por instância por dia |
| 12.8 | Verificação de número | Verificação do telefone vinculado à instância |

---

## 13. Threads (Redes Sociais)

| # | Feature | Descrição |
|---|---------|-----------|
| 13.1 | Conexão OAuth | Vinculação de conta Threads |
| 13.2 | Agendamento de posts | Criação e agendamento de publicações |
| 13.3 | Publicação | Publicação direta no Threads |
| 13.4 | Campanhas | Organização de posts em campanhas (awareness, engajamento, conversão) |
| 13.5 | Sequenciamento | Ordem de publicação dos posts dentro da campanha |
| 13.6 | Aprovação | Fluxo de aprovação antes de publicar |
| 13.7 | Status de publicação | Tracking de publicado, agendado, pendente |
| 13.8 | Calendário de posts | Visualização em calendário |
| 13.9 | Insights | Analytics de engajamento |

---

## 14. Canais de Mensagem

| # | Feature | Descrição |
|---|---------|-----------|
| 14.1 | WhatsApp | Via Evolution API |
| 14.2 | Instagram DM | Mensagens diretas do Instagram |
| 14.3 | Telegram | Bot Telegram |
| 14.4 | Voz / VoIP | Integração de voz |
| 14.5 | Canal Web (widget) | Chat widget embutível em sites externos |

---

## 15. Billing & Planos

| # | Feature | Descrição |
|---|---------|-----------|
| 15.1 | Modelo freemium | Planos Free, Pro e Business |
| 15.2 | Mercado Pago | Processamento de pagamentos recorrentes |
| 15.3 | Status de assinatura | active, canceled, past_due, trialing |
| 15.4 | Período de trial | Gestão de trial com grace period |
| 15.5 | Limite de uso mensal | Cota de mensagens por plano |
| 15.6 | Enforcement de limites | Bloqueio quando cota esgotada |
| 15.7 | API de uso | Endpoint para consulta de consumo em tempo real |

---

## 16. A/B Testing

| # | Feature | Descrição |
|---|---------|-----------|
| 16.1 | Criação de teste | Teste A/B entre dois agentes |
| 16.2 | Split de tráfego | Distribuição percentual configurável |
| 16.3 | Status do teste | draft, running, completed |
| 16.4 | Rastreamento por variante | Métricas separadas por variante A e B |
| 16.5 | Determinação de vencedor | Análise e seleção do agente vencedor |

---

## 17. API Pública & Developer Platform

| # | Feature | Descrição |
|---|---------|-----------|
| 17.1 | REST API v1 — Agentes | Endpoints públicos para interagir com agentes |
| 17.2 | REST API v1 — Orchestrations | Endpoints para disparar e consultar orquestrações |
| 17.3 | Geração de API keys | Criação de chaves com escopos (read, execute) |
| 17.4 | Revogação de keys | Desativação de chaves comprometidas |
| 17.5 | Rate limiting | Controle de taxa de requisições por chave |
| 17.6 | Webhook de execução | Callback HTTP ao concluir execuções de flow |
| 17.7 | Compartilhamento público | Token de compartilhamento para resultados de execução |

---

## 18. Templates & Marketplace

| # | Feature | Descrição |
|---|---------|-----------|
| 18.1 | Biblioteca de templates | Catálogo de templates oficiais |
| 18.2 | Categorização | Organização por tipo e subcategoria |
| 18.3 | Templates de agente | Agentes pré-configurados para casos de uso |
| 18.4 | Templates de orchestration | Orquestrações pré-montadas |
| 18.5 | Templates de flow | Flows de automação prontos |
| 18.6 | Deploy de template | Instantiação de template no workspace do usuário |
| 18.7 | Tracking de uso | Métricas de adoção por template |

---

## 19. Whitelabel & Multi-tenancy

| # | Feature | Descrição |
|---|---------|-----------|
| 19.1 | Conta whitelabel | Setup para integradores e revendedores |
| 19.2 | Sub-tenants | Criação e gerenciamento de sub-clientes |
| 19.3 | Domínio customizado | Domínio próprio por conta whitelabel |
| 19.4 | Branding customizado | Logo, cores, favicon personalizados |
| 19.5 | Planos para revendedores | starter, agency, scale, enterprise |
| 19.6 | Limite de sub-tenants | Cota máxima de clientes por conta |
| 19.7 | Trial para whitelabel | Período de avaliação para resellers |
| 19.8 | Status do tenant | active, suspended, canceled |

---

## 20. Admin Panel

| # | Feature | Descrição |
|---|---------|-----------|
| 20.1 | Analytics global | Visão de analytics de todos os workspaces |
| 20.2 | Gestão de beta testers | Aprovação e gerenciamento do programa beta |
| 20.3 | Aplicações beta | Revisão de candidaturas de acesso antecipado |
| 20.4 | Impersonação de usuário | Login como qualquer usuário para suporte |

---

## 21. Compliance & Segurança

| # | Feature | Descrição |
|---|---------|-----------|
| 21.1 | Compliance logging | Log por categoria de ação |
| 21.2 | Audit trail | Rastreio por recurso com tipo de ação |
| 21.3 | IP & user agent | Registro de contexto de acesso |
| 21.4 | API key hashing | Chaves armazenadas com SHA-256 + prefixo visível |
| 21.5 | Criptografia de settings | Dados sensíveis de integrações criptografados em repouso |

---

## 22. Landing Page & Marketing

| # | Feature | Descrição |
|---|---------|-----------|
| 22.1 | Homepage | Landing page com hero, features, CTA e social proof |
| 22.2 | Pricing | Página de planos com tabela de comparação |
| 22.3 | Blog | Seção de blog/conteúdo |
| 22.4 | Documentação | Seção de docs e referência |
| 22.5 | FAQ | Perguntas frequentes |
| 22.6 | Newsletter | Cadastro de e-mail para newsletter |
| 22.7 | Programa beta | Página de candidatura ao acesso antecipado |
| 22.8 | Whitelabel promo | Página de promoção do modelo whitelabel |
| 22.9 | Enterprise inquiry | Formulário de contato para enterprise |

---

## 23. Monitoramento & Operações

| # | Feature | Descrição |
|---|---------|-----------|
| 23.1 | Health endpoint | `/api/health` com status de DB e serviços |
| 23.2 | Error tracking | Log de erros e exceções |
| 23.3 | Presença de instância | Detecção de instâncias ativas/offline |

---

## Resumo Estatístico

| Categoria | Quantidade |
|-----------|-----------|
| Features totais mapeadas | **180+** |
| Rotas de API | **176+** |
| Páginas do dashboard | **50+** |
| Componentes UI | **100+** |
| Modelos Prisma | **80+** |
| Integrações de terceiros | **15+** |
| Canais de mensagem | **5** |
| Sprints concluídos (V1+V2) | **27** |
