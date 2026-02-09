import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding workflow templates...');

  // Get admin user
  const admin = await prisma.user.findFirst({
    where: {
      email: 'admin@roilabs.com.br'
    }
  });

  if (!admin) {
    console.error('Admin user not found. Please run the main seed script first.');
    return;
  }

  // Template 1: Qualificação de Leads
  const leadQualification = await prisma.workflow.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Qualificação Automática de Leads',
      description: 'Quando uma nova mensagem é recebida, a IA analisa o interesse do lead e atualiza seu score automaticamente.',
      trigger: {
        type: 'event',
        config: {
          event: 'message.received'
        }
      },
      conditions: [
        {
          type: 'if',
          field: 'message.sender',
          operator: 'eq',
          value: 'user',
          actions: [
            {
              type: 'call_agent',
              config: {
                agentId: '{{conversation.agentId}}',
                message: 'Analise o nível de interesse deste lead com base na mensagem: "{{message.content}}". Retorne apenas um número de 0 a 100 representando o score de qualificação.'
              }
            },
            {
              type: 'update_lead',
              config: {
                leadId: '{{lead.id}}',
                score: '{{agent.response}}'
              }
            }
          ]
        }
      ],
      actions: [],
      status: 'inactive',
      createdBy: admin.id
    }
  });

  // Template 2: Follow-up Automático
  const autoFollowup = await prisma.workflow.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Follow-up Automático 24h',
      description: 'Envia uma mensagem de follow-up automática quando um lead fica inativo por 24 horas.',
      trigger: {
        type: 'event',
        config: {
          event: 'lead.inactive_24h'
        }
      },
      conditions: [
        {
          type: 'if',
          field: 'lead.status',
          operator: 'neq',
          value: 'convertido',
          actions: [
            {
              type: 'send_whatsapp',
              config: {
                instance: 'sofia',
                to: '{{lead.telefone}}',
                message: 'Olá {{lead.nome}}! Notei que não conversamos há algum tempo. Ainda está interessado(a) em encontrar o imóvel ideal? Estou aqui para ajudar! 😊'
              }
            }
          ]
        }
      ],
      actions: [],
      status: 'inactive',
      createdBy: admin.id
    }
  });

  // Template 3: Alerta Lead Quente
  const hotLeadAlert = await prisma.workflow.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'Alerta de Lead Quente',
      description: 'Notifica via webhook quando um lead atinge score acima de 80 pontos.',
      trigger: {
        type: 'event',
        config: {
          event: 'lead.score_updated',
          condition: {
            score: { $gt: 80 }
          }
        }
      },
      conditions: [],
      actions: [
        {
          type: 'notify_webhook',
          config: {
            url: 'https://hooks.slack.com/services/YOUR_WEBHOOK_URL',
            payload: {
              text: '🔥 Lead Quente Detectado!',
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: '*Lead Quente Detectado!*\n\nNome: {{lead.nome}}\nTelefone: {{lead.telefone}}\nScore: {{lead.score}}\nInteresse: {{lead.interesse}}'
                  }
                }
              ]
            }
          }
        },
        {
          type: 'update_lead',
          config: {
            leadId: '{{lead.id}}',
            status: 'quente'
          }
        }
      ],
      status: 'inactive',
      createdBy: admin.id
    }
  });

  // Template 4: Resposta Automática com Contexto
  const autoResponse = await prisma.workflow.upsert({
    where: { id: '00000000-0000-0000-0000-000000000004' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000004',
      name: 'Resposta Automática Inteligente',
      description: 'Quando uma mensagem é recebida fora do horário comercial, a IA responde automaticamente com contexto da conversa.',
      trigger: {
        type: 'event',
        config: {
          event: 'message.received'
        }
      },
      conditions: [
        {
          type: 'if',
          field: 'trigger.hour',
          operator: 'lt',
          value: 8,
          actions: [
            {
              type: 'call_agent',
              config: {
                agentId: '{{conversation.agentId}}',
                message: '{{message.content}}'
              }
            },
            {
              type: 'send_whatsapp',
              config: {
                instance: 'sofia',
                to: '{{lead.telefone}}',
                message: '{{agent.response}}'
              }
            }
          ]
        },
        {
          type: 'if',
          field: 'trigger.hour',
          operator: 'gt',
          value: 18,
          actions: [
            {
              type: 'call_agent',
              config: {
                agentId: '{{conversation.agentId}}',
                message: '{{message.content}}'
              }
            },
            {
              type: 'send_whatsapp',
              config: {
                instance: 'sofia',
                to: '{{lead.telefone}}',
                message: '{{agent.response}}'
              }
            }
          ]
        }
      ],
      actions: [],
      status: 'inactive',
      createdBy: admin.id
    }
  });

  console.log('✓ Workflow templates created:');
  console.log(`  - ${leadQualification.name}`);
  console.log(`  - ${autoFollowup.name}`);
  console.log(`  - ${hotLeadAlert.name}`);
  console.log(`  - ${autoResponse.name}`);
}

main()
  .catch((e) => {
    console.error('Error seeding workflows:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
