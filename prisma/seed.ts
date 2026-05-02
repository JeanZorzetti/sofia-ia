import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // Hash da senha: SofiaAI2024#Admin
  const passwordHash = await bcrypt.hash('SofiaAI2024#Admin', 10)

  // Criar usuário Admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@roilabs.com.br' },
    update: {},
    create: {
      email: 'admin@roilabs.com.br',
      passwordHash,
      name: 'Admin ROI Labs',
      role: 'admin',
      status: 'active',
      permissions: {
        canManageUsers: true,
        canManageSettings: true,
        canManageInstances: true,
        canViewAnalytics: true,
        canManageLeads: true,
      },
    },
  })
  console.log('✅ Admin user criado:', adminUser.email)

  // Criar usuário Polaris IA (agente)
  const sofiaUser = await prisma.user.upsert({
    where: { email: 'sofia@roilabs.com.br' },
    update: {},
    create: {
      email: 'sofia@roilabs.com.br',
      passwordHash,
      name: 'Polaris IA',
      role: 'agent',
      status: 'active',
      permissions: {
        canManageUsers: false,
        canManageSettings: false,
        canManageInstances: false,
        canViewAnalytics: true,
        canManageLeads: true,
      },
    },
  })
  console.log('✅ Polaris IA user criado:', sofiaUser.email)

  // Criar configurações padrão para IA
  const aiSettings = await prisma.setting.upsert({
    where: {
      category_key: {
        category: 'ai',
        key: 'model_config'
      }
    },
    update: {},
    create: {
      category: 'ai',
      key: 'model_config',
      value: {
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 1024,
      },
      description: 'Configuração do modelo de IA Groq',
    },
  })
  console.log('✅ AI Settings criado:', aiSettings.key)

  // Criar configuração de prompt customizado para SDR
  const sdrPrompt = await prisma.setting.upsert({
    where: {
      category_key: {
        category: 'sdr',
        key: 'custom_prompt'
      }
    },
    update: {},
    create: {
      category: 'sdr',
      key: 'custom_prompt',
      value: {
        systemPrompt: `Você é Polaris IA, uma assistente virtual especializada em atendimento imobiliário.

Seu objetivo é qualificar leads interessados em imóveis através de conversas naturais e amigáveis pelo WhatsApp.

DIRETRIZES:
1. Seja cordial, profissional e empática
2. Faça perguntas abertas para entender as necessidades do cliente
3. Colete informações importantes: tipo de imóvel, localização preferida, faixa de preço, urgência
4. Mantenha as respostas concisas e objetivas
5. Use emojis de forma moderada para humanizar a conversa
6. Quando o lead estiver qualificado (score > 70), ofereça agendar uma visita ou falar com um corretor

INFORMAÇÕES A COLETAR:
- Nome completo
- Tipo de imóvel desejado (casa, apartamento, comercial)
- Região/bairro de interesse
- Faixa de preço (valor mínimo e máximo)
- Número de quartos/suítes
- Necessidades especiais (garagem, área de lazer, etc)
- Urgência da compra/locação
- Forma de pagamento preferida

Lembre-se: você está aqui para ajudar e facilitar a busca do imóvel ideal!`,
        enabled: true,
      },
      description: 'Prompt customizado para o SDR imobiliário',
    },
  })
  console.log('✅ SDR Prompt criado:', sdrPrompt.key)

  // Criar configurações de rate limiting
  const rateLimitSettings = await prisma.setting.upsert({
    where: {
      category_key: {
        category: 'system',
        key: 'rate_limit'
      }
    },
    update: {},
    create: {
      category: 'system',
      key: 'rate_limit',
      value: {
        messagesPerMinute: 10,
        conversationsPerHour: 100,
        enabled: true,
      },
      description: 'Configuração de rate limiting do sistema',
    },
  })
  console.log('✅ Rate Limit Settings criado:', rateLimitSettings.key)

  // Criar configurações de notificações
  const notificationSettings = await prisma.setting.upsert({
    where: {
      category_key: {
        category: 'notifications',
        key: 'config'
      }
    },
    update: {},
    create: {
      category: 'notifications',
      key: 'config',
      value: {
        emailOnNewLead: true,
        emailOnQualifiedLead: true,
        webhookUrl: null,
        slackWebhook: null,
      },
      description: 'Configuração de notificações do sistema',
    },
  })
  console.log('✅ Notification Settings criado:', notificationSettings.key)

  // Criar Polaris SDR como agente default
  const sofiaAgent = await prisma.agent.upsert({
    where: {
      id: '00000000-0000-0000-0000-000000000001' // ID fixo para Polaris IA
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Polaris SDR',
      description: 'Assistente virtual especializada em atendimento e qualificação de leads imobiliários',
      systemPrompt: `Você é Polaris IA, uma assistente virtual especializada em atendimento imobiliário.

Seu objetivo é qualificar leads interessados em imóveis através de conversas naturais e amigáveis pelo WhatsApp.

DIRETRIZES:
1. Seja cordial, profissional e empática
2. Faça perguntas abertas para entender as necessidades do cliente
3. Colete informações importantes: tipo de imóvel, localização preferida, faixa de preço, urgência
4. Mantenha as respostas concisas e objetivas
5. Use emojis de forma moderada para humanizar a conversa
6. Quando o lead estiver qualificado (score > 70), ofereça agendar uma visita ou falar com um corretor

INFORMAÇÕES A COLETAR:
- Nome completo
- Tipo de imóvel desejado (casa, apartamento, comercial)
- Região/bairro de interesse
- Faixa de preço (valor mínimo e máximo)
- Número de quartos/suítes
- Necessidades especiais (garagem, área de lazer, etc)
- Urgência da compra/locação
- Forma de pagamento preferida

Lembre-se: você está aqui para ajudar e facilitar a busca do imóvel ideal!`,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      status: 'active',
      createdBy: adminUser.id,
      config: {
        maxTokens: 1024,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0
      },
      channels: {
        create: [
          {
            channel: 'whatsapp',
            config: {
              instanceName: 'default',
              autoRespond: true,
              businessHours: {
                enabled: false,
                timezone: 'America/Sao_Paulo',
                schedule: {
                  monday: { start: '09:00', end: '18:00' },
                  tuesday: { start: '09:00', end: '18:00' },
                  wednesday: { start: '09:00', end: '18:00' },
                  thursday: { start: '09:00', end: '18:00' },
                  friday: { start: '09:00', end: '18:00' }
                }
              }
            },
            isActive: true
          }
        ]
      }
    }
  })
  console.log('✅ Polaris SDR Agent criado:', sofiaAgent.name)

  // Criar integração WhatsApp default
  const whatsappIntegration = await prisma.integration.upsert({
    where: {
      id: '00000000-0000-0000-0000-000000000101'
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000101',
      name: 'WhatsApp Evolution API',
      type: 'whatsapp',
      config: {
        evolutionApiUrl: process.env.EVOLUTION_API_URL || 'https://api.evolution.roilabs.com.br',
        instanceName: 'default',
        autoRespond: true,
        businessHours: {
          enabled: false,
          timezone: 'America/Sao_Paulo'
        }
      },
      credentials: {
        apiKey: process.env.EVOLUTION_API_KEY || ''
      },
      status: process.env.EVOLUTION_API_KEY ? 'active' : 'inactive'
    }
  })
  console.log('✅ WhatsApp Integration criado:', whatsappIntegration.name)

  // Criar integração Webhook genérico
  const webhookIntegration = await prisma.integration.upsert({
    where: {
      id: '00000000-0000-0000-0000-000000000102'
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000102',
      name: 'Webhook Genérico',
      type: 'webhook',
      config: {
        webhookUrl: '',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        events: ['lead.created', 'lead.qualified', 'message.received']
      },
      credentials: {},
      status: 'inactive'
    }
  })
  console.log('✅ Webhook Integration criado:', webhookIntegration.name)

  // Criar integração API REST genérico
  const apiRestIntegration = await prisma.integration.upsert({
    where: {
      id: '00000000-0000-0000-0000-000000000103'
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000103',
      name: 'API REST Genérica',
      type: 'api_rest',
      config: {
        baseUrl: '',
        testEndpoint: '/health',
        timeout: 30000,
        retries: 3
      },
      credentials: {
        apiKey: '',
        customHeaders: {}
      },
      status: 'inactive'
    }
  })
  console.log('✅ API REST Integration criado:', apiRestIntegration.name)

  // Criar integração Email SMTP
  const emailSmtpIntegration = await prisma.integration.upsert({
    where: {
      id: '00000000-0000-0000-0000-000000000104'
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000104',
      name: 'Email SMTP',
      type: 'email_smtp',
      config: {
        fromName: 'ROI Labs',
        fromEmail: 'noreply@roilabs.com.br',
        replyTo: 'contato@roilabs.com.br'
      },
      credentials: {
        host: '',
        port: 587,
        user: '',
        pass: '',
        secure: false
      },
      status: 'inactive'
    }
  })
  console.log('✅ Email SMTP Integration criado:', emailSmtpIntegration.name)

  // Criar Templates por vertical

  // IMOBILIÁRIO
  const templateImobSdr = await prisma.template.upsert({
    where: { id: '00000000-0000-0000-0001-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0001-000000000001',
      name: 'SDR Imobiliário',
      description: 'Assistente especializado em qualificação de leads para imóveis. Coleta informações sobre tipo de imóvel, localização, preço e urgência.',
      category: 'Imobiliário',
      type: 'agent',
      icon: 'Building',
      isOfficial: true,
      config: {
        name: 'SDR Imobiliário',
        description: 'Qualifica leads interessados em compra/locação de imóveis',
        systemPrompt: `Você é um assistente virtual especializado em atendimento imobiliário. Qualifique leads através de conversas naturais, coletando: tipo de imóvel, localização, faixa de preço, número de quartos, urgência e forma de pagamento. Seja cordial e objetivo.`,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        channels: [{ name: 'whatsapp', config: { autoRespond: true } }]
      }
    }
  })
  console.log('✅ Template criado:', templateImobSdr.name)

  const templateImobAgendamento = await prisma.template.upsert({
    where: { id: '00000000-0000-0000-0001-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0001-000000000002',
      name: 'Agendamento de Visitas',
      description: 'Workflow que agenda visitas automaticamente para leads qualificados com score acima de 70.',
      category: 'Imobiliário',
      type: 'workflow',
      icon: 'Calendar',
      isOfficial: true,
      config: {
        name: 'Agendamento de Visitas',
        description: 'Agenda visitas para leads qualificados',
        trigger: { type: 'lead_qualified', conditions: { scoreMin: 70 } },
        conditions: [{ field: 'score', operator: 'gt', value: 70 }],
        actions: [
          { type: 'send_whatsapp', template: 'Olá! Vi que você está interessado. Gostaria de agendar uma visita?' },
          { type: 'notify_webhook', url: '{{WEBHOOK_URL}}' }
        ]
      }
    }
  })
  console.log('✅ Template criado:', templateImobAgendamento.name)

  // ATENDIMENTO
  const templateAtendimentoSac = await prisma.template.upsert({
    where: { id: '00000000-0000-0000-0002-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0002-000000000001',
      name: 'SAC Inteligente',
      description: 'Agente de atendimento ao cliente com base de conhecimento integrada. Resolve dúvidas comuns e escala para humano quando necessário.',
      category: 'Atendimento',
      type: 'agent',
      icon: 'Headphones',
      isOfficial: true,
      config: {
        name: 'SAC Inteligente',
        description: 'Atendimento ao cliente 24/7',
        systemPrompt: `Você é um assistente de atendimento ao cliente. Responda dúvidas com base na base de conhecimento. Se não souber ou o cliente pedir atendimento humano, escale imediatamente. Seja empático, claro e resolva o problema rapidamente.`,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.5,
        channels: [{ name: 'whatsapp', config: { autoRespond: true } }, { name: 'webchat', config: {} }]
      }
    }
  })
  console.log('✅ Template criado:', templateAtendimentoSac.name)

  const templateAtendimentoFollowup = await prisma.template.upsert({
    where: { id: '00000000-0000-0000-0002-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0002-000000000002',
      name: 'Follow-up Automático',
      description: 'Envia mensagem de follow-up para conversas inativas há mais de 24 horas.',
      category: 'Atendimento',
      type: 'workflow',
      icon: 'Clock',
      isOfficial: true,
      config: {
        name: 'Follow-up Automático',
        description: 'Reativa conversas inativas',
        trigger: { type: 'schedule', cron: '0 */6 * * *' },
        conditions: [
          { field: 'conversation.lastMessageAt', operator: 'lt', value: '24h' },
          { field: 'conversation.status', operator: 'eq', value: 'active' }
        ],
        actions: [
          { type: 'send_whatsapp', template: 'Oi! Ainda posso ajudar com algo?' }
        ]
      }
    }
  })
  console.log('✅ Template criado:', templateAtendimentoFollowup.name)

  // VENDAS
  const templateVendasBdr = await prisma.template.upsert({
    where: { id: '00000000-0000-0000-0003-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0003-000000000001',
      name: 'BDR de Vendas',
      description: 'Business Development Representative que qualifica leads B2B, identifica dores e agenda demos.',
      category: 'Vendas',
      type: 'agent',
      icon: 'TrendingUp',
      isOfficial: true,
      config: {
        name: 'BDR de Vendas',
        description: 'Qualifica leads B2B e agenda demos',
        systemPrompt: `Você é um BDR (Business Development Representative). Qualifique leads B2B identificando: empresa, setor, número de funcionários, dores principais, orçamento disponível e urgência. Seu objetivo é agendar uma demo com o time de vendas. Use metodologia BANT (Budget, Authority, Need, Timeline).`,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.6,
        channels: [{ name: 'whatsapp', config: { autoRespond: true } }, { name: 'email', config: {} }]
      }
    }
  })
  console.log('✅ Template criado:', templateVendasBdr.name)

  const templateVendasAlertaQuente = await prisma.template.upsert({
    where: { id: '00000000-0000-0000-0003-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0003-000000000002',
      name: 'Alerta Lead Quente',
      description: 'Notifica time comercial via webhook quando lead atinge score acima de 80.',
      category: 'Vendas',
      type: 'workflow',
      icon: 'Zap',
      isOfficial: true,
      config: {
        name: 'Alerta Lead Quente',
        description: 'Notifica vendedores sobre leads quentes',
        trigger: { type: 'lead_updated', conditions: { scoreMin: 80 } },
        conditions: [{ field: 'score', operator: 'gte', value: 80 }],
        actions: [
          { type: 'notify_webhook', url: '{{WEBHOOK_URL}}', payload: { leadId: '{{lead.id}}', score: '{{lead.score}}' } },
          { type: 'update_lead', field: 'status', value: 'hot' }
        ]
      }
    }
  })
  console.log('✅ Template criado:', templateVendasAlertaQuente.name)

  // RH
  const templateRhRecrutador = await prisma.template.upsert({
    where: { id: '00000000-0000-0000-0004-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0004-000000000001',
      name: 'Recrutador Virtual',
      description: 'Realiza triagem inicial de candidatos, coleta informações de currículo e agenda entrevistas.',
      category: 'RH',
      type: 'agent',
      icon: 'Users',
      isOfficial: true,
      config: {
        name: 'Recrutador Virtual',
        description: 'Triagem e agendamento de candidatos',
        systemPrompt: `Você é um recrutador virtual. Faça triagem inicial de candidatos coletando: cargo de interesse, experiência anterior, formação, pretensão salarial, disponibilidade. Seja profissional, respeitoso e transparente sobre o processo seletivo.`,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.6,
        channels: [{ name: 'whatsapp', config: { autoRespond: true } }]
      }
    }
  })
  console.log('✅ Template criado:', templateRhRecrutador.name)

  const templateRhOnboarding = await prisma.template.upsert({
    where: { id: '00000000-0000-0000-0004-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0004-000000000002',
      name: 'Onboarding Automático',
      description: 'Envia sequência de mensagens de boas-vindas para novos funcionários.',
      category: 'RH',
      type: 'workflow',
      icon: 'UserPlus',
      isOfficial: true,
      config: {
        name: 'Onboarding Automático',
        description: 'Onboarding de novos colaboradores',
        trigger: { type: 'webhook', event: 'employee.hired' },
        conditions: [],
        actions: [
          { type: 'send_whatsapp', template: 'Bem-vindo(a) à equipe! 🎉', delay: 0 },
          { type: 'send_whatsapp', template: 'Aqui está seu guia de onboarding: {{LINK}}', delay: 3600 },
          { type: 'send_whatsapp', template: 'Como está sendo sua primeira semana?', delay: 604800 }
        ]
      }
    }
  })
  console.log('✅ Template criado:', templateRhOnboarding.name)

  // FINANCEIRO
  const templateFinanceiroCobranca = await prisma.template.upsert({
    where: { id: '00000000-0000-0000-0005-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0005-000000000001',
      name: 'Assistente de Cobrança',
      description: 'Envia lembretes de pagamento e negocia acordos de forma educada e profissional.',
      category: 'Financeiro',
      type: 'agent',
      icon: 'DollarSign',
      isOfficial: true,
      config: {
        name: 'Assistente de Cobrança',
        description: 'Cobrança humanizada e negociação',
        systemPrompt: `Você é um assistente de cobrança. Lembre clientes sobre pagamentos pendentes de forma educada e profissional. Ofereça opções de renegociação quando possível. Nunca seja agressivo ou constrangedor. Mantenha empatia e foco na solução.`,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.5,
        channels: [{ name: 'whatsapp', config: { autoRespond: true } }, { name: 'email', config: {} }]
      }
    }
  })
  console.log('✅ Template criado:', templateFinanceiroCobranca.name)

  const templateFinanceiroLembrete = await prisma.template.upsert({
    where: { id: '00000000-0000-0000-0005-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0005-000000000002',
      name: 'Lembrete de Vencimento',
      description: 'Envia lembretes automáticos 3 dias antes do vencimento de faturas.',
      category: 'Financeiro',
      type: 'workflow',
      icon: 'Bell',
      isOfficial: true,
      config: {
        name: 'Lembrete de Vencimento',
        description: 'Notifica clientes sobre vencimentos',
        trigger: { type: 'schedule', cron: '0 9 * * *' },
        conditions: [
          { field: 'invoice.dueDate', operator: 'eq', value: '+3d' },
          { field: 'invoice.status', operator: 'eq', value: 'pending' }
        ],
        actions: [
          { type: 'send_whatsapp', template: 'Olá! Sua fatura vence em 3 dias. Valor: R$ {{invoice.amount}}' }
        ]
      }
    }
  })
  console.log('✅ Template criado:', templateFinanceiroLembrete.name)

  // JURÍDICO
  const templateJuridicoConsulta = await prisma.template.upsert({
    where: { id: '00000000-0000-0000-0006-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0006-000000000001',
      name: 'Consultor Jurídico Virtual',
      description: 'Responde dúvidas jurídicas básicas e agenda consultas com advogados.',
      category: 'Jurídico',
      type: 'agent',
      icon: 'Scale',
      isOfficial: true,
      config: {
        name: 'Consultor Jurídico Virtual',
        description: 'Atendimento jurídico inicial',
        systemPrompt: `Você é um assistente jurídico virtual. Responda dúvidas jurídicas básicas com base na base de conhecimento. IMPORTANTE: Sempre deixe claro que não substitui consulta com advogado. Para casos complexos, agende uma consulta. Seja claro, preciso e use linguagem acessível.`,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        channels: [{ name: 'whatsapp', config: { autoRespond: true } }, { name: 'webchat', config: {} }]
      }
    }
  })
  console.log('✅ Template criado:', templateJuridicoConsulta.name)

  const templateJuridicoAcompanhamento = await prisma.template.upsert({
    where: { id: '00000000-0000-0000-0006-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0006-000000000002',
      name: 'Acompanhamento de Processos',
      description: 'Notifica clientes sobre atualizações em processos jurídicos.',
      category: 'Jurídico',
      type: 'workflow',
      icon: 'FileText',
      isOfficial: true,
      config: {
        name: 'Acompanhamento de Processos',
        description: 'Atualiza clientes sobre processos',
        trigger: { type: 'webhook', event: 'case.updated' },
        conditions: [],
        actions: [
          { type: 'send_whatsapp', template: 'Seu processo {{case.number}} foi atualizado: {{case.update}}' },
          { type: 'send_email', template: 'Detalhes completos da atualização em anexo' }
        ]
      }
    }
  })
  console.log('✅ Template criado:', templateJuridicoAcompanhamento.name)

  console.log('🎉 Seed concluído com sucesso!')
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
