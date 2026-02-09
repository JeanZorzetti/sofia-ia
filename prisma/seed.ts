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

  // Criar usuário Sofia (agente)
  const sofiaUser = await prisma.user.upsert({
    where: { email: 'sofia@roilabs.com.br' },
    update: {},
    create: {
      email: 'sofia@roilabs.com.br',
      passwordHash,
      name: 'Sofia IA',
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
  console.log('✅ Sofia user criado:', sofiaUser.email)

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
        systemPrompt: `Você é Sofia, uma assistente virtual especializada em atendimento imobiliário.

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

  // Criar Sofia SDR como agente default
  const sofiaAgent = await prisma.agent.upsert({
    where: {
      id: '00000000-0000-0000-0000-000000000001' // ID fixo para Sofia
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Sofia SDR',
      description: 'Assistente virtual especializada em atendimento e qualificação de leads imobiliários',
      systemPrompt: `Você é Sofia, uma assistente virtual especializada em atendimento imobiliário.

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
  console.log('✅ Sofia SDR Agent criado:', sofiaAgent.name)

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
