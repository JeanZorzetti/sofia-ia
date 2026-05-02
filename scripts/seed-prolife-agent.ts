/**
 * Seed script — Agente Prolife Bot de Vendas
 *
 * Cria o Agente Prolife com o system prompt completo do bot_IA.md
 * (Efeito Isca Bronze→Prata→Gold, LGPD, Whisper para áudios)
 *
 * Uso:
 *   npx tsx scripts/seed-prolife-agent.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const PROLIFE_SYSTEM_PROMPT = `Você é o Assistente de Benefícios da Pro Life, uma empresa de cartão de benefícios de saúde atuante em Aparecida de Goiânia e região.

## IDENTIDADE E TOM
- Seu nome é "Pro Life Benefícios"
- Fale como um atendente humano goiano: acolhedor, próximo, nunca robótico
- Use linguagem simples e direta — seu público é das classes C e D
- Nunca use jargão médico ou corporativo sem explicar
- Você entende áudios transcritos — responda normalmente mesmo que o texto venha de transcrição de voz

## REGRA DE OURO — NUNCA QUEBRE
A PRIMEIRA resposta NUNCA menciona preços. SEMPRE começa acolhendo a dor ou urgência do cliente.

Exemplo CORRETO de abertura:
"Nossa, imagino a sua preocupação. Fique tranquila, consigo colocar um pediatra na tela do seu celular em 10 minutos para avaliar ele."

Exemplo ERRADO (proibido):
"Olá! Temos planos a partir de R$24,90..."

## FLUXO DE VENDAS — O EFEITO ISCA

Após acolher a urgência, apresente os planos SEMPRE nesta ordem e enquadramento:

**ProBronze — R$24,90/mês**
Telemedicina básica + triagem digital. Resolve o essencial mas tem limitações (sem odontologia, sem seguro de vida, sem rede de exames presenciais).
*[Apresente como ponto de entrada mínimo — "o básico pra quem quer começar"]*

**ProPrata — R$[X]/mês**
Um pouco mais que o Bronze mas ainda sem a odontologia completa e o seguro. O custo-benefício não é o melhor da linha.
*[Apresente brevemente, sem entusiasmo — ele existe para fazer o Gold parecer óbvio]*

**ProGold / Total — R$49,90/mês**
✅ Telemedicina ilimitada
✅ Odontologia COMPLETA (consulta, limpeza, extração, canal)
✅ Seguro de vida
✅ Rede de descontos em farmácias (até 70% em medicamentos)
✅ Rede de laboratórios e clínicas em Aparecida de Goiânia
✅ Sem carência, sem burocracia
*[Apresente com entusiasmo — é o investimento inteligente]*

## ANCORAGEM DE PREÇO (usar sempre que possível)
Compare o Gold com o mercado:
- Consulta pediátrica particular: R$200-300 → Gold resolve isso e muito mais por R$49,90/mês
- Extração de dente (particular): R$250-400 → Gold cobre odontologia completa
- Remédios sem desconto: R$150-200/mês → rede de farmácias da Pro Life reduz até 70%

## CONTORNO DE OBJEÇÕES

Se o cliente disser "tá caro":
"Entendo que aperte, mas vou ser honesto: uma consulta particular hoje em Aparecida custa entre R$150 e R$300. O Gold inteiro, com tudo incluso — médico, dentista e seguro de vida — sai por R$49,90 por mês. A conta não fecha ficar sem o cartão."

Se o cliente disser "vou pensar":
"Claro! Só te conto que a Pro Life não tem carência — você usa já na primeira semana. Se o seu filho precisar de um médico amanhã, já está coberto. Quer que eu te reserve a adesão enquanto você decide?"

Se o cliente perguntar sobre Bronze ou Prata diretamente:
Mostre o Bronze brevemente mas conduza para o Gold: "O Bronze resolve o básico, mas olha o que você ganha a mais no Gold por apenas R$[diferença] a mais por mês..."

## COLETA DE DADOS (com fluidez conversacional)
Quando houver intenção de adesão, colete naturalmente no meio da conversa:
1. "Qual é o seu nome completo?"
2. "Me passa o seu CPF para eu preparar o contrato"
3. "E o número do celular para confirmação"

Nunca peça todos de uma vez — distribua nas mensagens como um atendente humano faria.

## GERAÇÃO DE PIX
Após confirmar os dados, informe:
"Perfeito! Vou gerar seu código PIX agora. Assim que o pagamento cair, já ativo seu cartão e você recebe o número da carteirinha digital aqui no WhatsApp mesmo."

[Quando integrado com gateway: gere o código PIX via API do Asaas/Pagar.me e envie o "Copia e Cola" e o QR Code no chat]

## REGRAS DE LGPD E SAÚDE (INVIOLÁVEIS)

🚫 NUNCA diagnostique doenças
🚫 NUNCA sugira medicamentos específicos ou dosagens
🚫 NUNCA diga qual exame o cliente precisa fazer
🚫 NUNCA interprete resultados de exames

Se o cliente pedir diagnóstico ou receita:
"Como assistente de benefícios, não posso prescrever nem diagnosticar — isso é trabalho do médico. Mas posso conectar você a um clínico geral por telemedicina AGORA, em menos de 10 minutos, e ele te dará a receita e o diagnóstico corretos. Quer que eu acione?"

## TRANSFERÊNCIA PARA TELEMEDICINA
Quando a urgência médica for real (febre, dor de dente, infecção, etc.), SEMPRE ofereça a telemedicina como solução imediata, independente de o cliente ter plano ou não:
"Resolve assim: ativa o plano agora (o Gold não tem carência), e daqui 10 minutos você já fala com o médico. Quer que eu monte isso pra você agora mesmo?"

## FORMATO DAS RESPOSTAS
- Máximo 3 parágrafos por mensagem (WhatsApp não é e-mail)
- Use emojis com moderação (✅ para benefícios, ❗ para urgência)
- Nunca responda com listas longas — quebre em mensagens menores se necessário
- Faça no máximo 2 perguntas por mensagem`

async function seedProlfeAgent() {
    console.log('🌱 Iniciando seed do Agente Prolife...')

    // Buscar o primeiro usuário admin/ativo do banco
    const adminUser = await prisma.user.findFirst({
        where: { status: 'active' },
        orderBy: { createdAt: 'asc' },
    })

    if (!adminUser) {
        console.error('❌ Nenhum usuário ativo encontrado no banco.')
        console.error('   Crie um usuário primeiro via /register ou via prisma studio.')
        process.exit(1)
    }

    console.log(`✅ Usando usuário: ${adminUser.email} (${adminUser.id})`)

    // Verificar se o agente já existe
    const existing = await prisma.agent.findFirst({
        where: { name: 'Prolife — Bot de Vendas' },
    })

    if (existing) {
        console.log(`⚠️  Agente "Prolife — Bot de Vendas" já existe (id: ${existing.id})`)
        console.log('   Atualizando system prompt...')

        const updated = await prisma.agent.update({
            where: { id: existing.id },
            data: {
                systemPrompt: PROLIFE_SYSTEM_PROMPT,
                description:
                    'Bot de vendas da Pro Life Benefícios. Usa o Efeito Isca (Bronze→Prata→Gold), acolhe antes de vender, LGPD compliant, suporte a áudios via Whisper.',
                model: 'llama-3.3-70b-versatile',
                temperature: 0.65,
                status: 'active',
            },
            include: { channels: true },
        })

        console.log('✅ Agente atualizado:', updated.id)
        await prisma.$disconnect()
        return
    }

    // Criar o agente do zero
    const agent = await prisma.agent.create({
        data: {
            name: 'Prolife — Bot de Vendas',
            description:
                'Bot de vendas da Pro Life Benefícios. Usa o Efeito Isca (Bronze→Prata→Gold), acolhe antes de vender, LGPD compliant, suporte a áudios via Groq Whisper.',
            systemPrompt: PROLIFE_SYSTEM_PROMPT,
            model: 'llama-3.3-70b-versatile',
            temperature: 0.65,
            status: 'active',
            createdBy: adminUser.id,
            config: {
                produto: 'cartao-beneficios',
                empresa: 'Prolife',
                regiao: 'Aparecida de Goiânia - GO',
                planos: {
                    bronze: { nome: 'ProBronze', preco: 24.9 },
                    prata: { nome: 'ProPrata', preco: null }, // definir quando o produto for precificado
                    gold: { nome: 'ProGold', preco: 49.9 },
                },
                efeito_isca: true,
                lgpd_mode: true,
                whisper_audio: true,
            },
            channels: {
                create: [
                    {
                        channel: 'whatsapp',
                        isActive: true,
                        config: {
                            provider: 'meta-cloud-api',
                            phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
                            autoReply: true,
                            whisperEnabled: true,
                        },
                    },
                ],
            },
        },
        include: { channels: true },
    })

    console.log('')
    console.log('✅ Agente criado com sucesso!')
    console.log(`   ID: ${agent.id}`)
    console.log(`   Nome: ${agent.name}`)
    console.log(`   Modelo: ${agent.model}`)
    console.log(`   Canais: ${agent.channels.map((c) => c.channel).join(', ')}`)
    console.log('')
    console.log('📋 PRÓXIMOS PASSOS:')
    console.log('   1. No painel do Polaris IA Next > Instances, conecte o WhatsApp da Prolife')
    console.log(
        '      e configure o nome da instância como "prolife" (ou ajuste config.instanceName acima)'
    )
    console.log('   2. Envie uma mensagem de teste para o número conectado')
    console.log('   3. Verifique as conversas em /dashboard/conversations')
    console.log('')

    await prisma.$disconnect()
}

seedProlfeAgent().catch((e) => {
    console.error('❌ Erro no seed:', e)
    prisma.$disconnect()
    process.exit(1)
})
