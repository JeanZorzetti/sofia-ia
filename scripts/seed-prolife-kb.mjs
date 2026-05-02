import { PrismaClient } from '../node_modules/.prisma/client/index.js'

const prisma = new PrismaClient()

const KB_ID = '049a495f-04c5-4eca-b2ec-fdd9f8045ec7'

const content = `# PORTFÓLIO PRO LIFE MEDICAL 2026
Saúde. Acesso. Impacto.
Soluções em Telemedicina · Saúde Corporativa · Emagrecimento Clínico · TEA · Triagem Clínica
Canais de venda: B2B Empresarial, Sales Pro, White Label

## VISÃO GERAL DO PORTFÓLIO
5 linhas de produto, 3 canais de venda, Recorrência mensal + Alto ticket

## 1. TELEMEDICINA (Recorrente)
Consultas ilimitadas 24h, App próprio, mais de 50 especialidades, Receitas digitais

Planos Pessoa Física:
- Individual: R$ 37 por mês. 1 vida. Consultas ilimitadas, prontuário digital, receitas online.
- Familiar 4v: R$ 127 por mês. Até 4 vidas. Consultas ilimitadas, prontuário digital, receitas online.
- Familiar+ 6v: R$ 247 por mês. Até 6 vidas. Consultas ilimitadas, prontuário digital, receitas online.

Plano Empresarial B2B:
- Empresarial: R$ 26,70 por vida por mês. Consultas ilimitadas, prontuário digital, receitas online.

## 2. NR-1 CORPORATIVO (Obrigatório)
Conformidade legal obrigatória. Saúde mental e psiquiátrica. Equipes de todos os portes.
A NR-1 exige adoção de medidas de prevenção a riscos psicossociais — obrigatório para todas as empresas.

Pacotes disponíveis (preço por colaborador/mês):
- Pct1 Quinzenal CLÍNICO: Clínico + 2 Psicólogos. B2C: R$ 174,33. B2B: R$ 145,28.
- Pct1 Semanal INTENSIVO: Clínico + 4 Psicólogos. B2C: R$ 281,61. B2B: R$ 234,68.
- Pct2 Quinzenal PSIQUIÁTRICO: Psiquiatra + 2 Psicólogos. B2C: R$ 262,26. B2B: R$ 218,55.
- Pct2 Semanal PREMIUM: Psiquiatra + 4 Psicólogos. B2C: R$ 369,54. B2B: R$ 307,95.

## 3. PROGRAMA MOUNJARO (Alto Ticket)
Emagrecimento clínico supervisionado. Alta aderência. Resultados comprovados.

Planos com preço ao paciente, B2B e White Label:
- 2 meses ENTRADA: R$ 899,40 ao paciente. B2B: R$ 749,50. White Label: R$ 599,60. Protocolo inicial, avaliação e consultas.
- 4 meses MAIS VENDIDO: R$ 1.798,80 ao paciente. B2B: R$ 1.499,00. White Label: R$ 1.199,20. Protocolo intermediário, acompanhamento contínuo.
- 6 meses PREMIUM: R$ 2.698,20 ao paciente. B2B: R$ 2.248,50. White Label: R$ 1.798,80. Protocolo completo, maior resultado.

## 4. PROJETO TEA (Especializado)
Transtorno do Espectro Autista. Equipe multidisciplinar. Protocolo clínico validado. 100% online.

Planos por paciente/mês e preço B2B:
- Mensal 5 atendimentos/mês: R$ 1.119,00. B2B: R$ 932,50.
- Quinzenal 8 atendimentos/mês: R$ 1.644,00. B2B: R$ 1.370,00.
- Semanal 14 atendimentos/mês: R$ 2.694,00. B2B: R$ 2.245,00.

Por que o Projeto TEA?
- 1 em 36 crianças no espectro no Brasil.
- Equipe multidisciplinar especializada.
- Protocolo clínico validado.
- Relatórios de evolução mensais.
- Suporte integral à família.
- Alta demanda, baixa oferta.
- Ticket de mercado: R$ 699 a R$ 1.299 por mês.

## 5. ENTREVISTA QUALIFICADA (Âncora B2B)
Triagem clínica. Alta conversão. Produto âncora para B2B corporativo.

Modalidades (por entrevista, preço B2B e White Label):
- Médico CRM Modalidade Padrão: R$ 135,00. B2B: R$ 112,50. White Label: R$ 90,00.
  Avaliação clínica completa. Indicado para planos de saúde corporativos e triagem de novos beneficiários.
- Técnico COREN Modalidade Técnico: R$ 105,00. B2B: R$ 87,50. White Label: R$ 70,00.
  Triagem ágil. Ideal para volumes altos, onboarding em empresas e integração de beneficiários.

## CANAL B2B EMPRESARIAL
Receita recorrente. Margem de aproximadamente 47%. Melhor previsibilidade. Âncora do negócio.
Fluxo: Prospecção Empresarial, Contrato Recorrente, Ativação de Vidas, Cobrança Mensal.
Margem Líquida PLM: aproximadamente 47%. Comissão Sales Pro: 10%. Estoque necessário: zero.

Tabela de Preços B2B:
- Tele Empresarial: R$ 26,70 (margem 67%)
- NR-1 Pct1 Quinzenal: R$ 145,28 (margem 75%)
- NR-1 Pct2 Semanal: R$ 307,95 (margem 75%)
- Entrevista Padrão: R$ 112,50 (margem 69%)

## CANAL SALES PRO (Micro-Franqueado)
Micro-franqueado. Comissão direta PLM. Sem estoque. ROI no primeiro mês.
Investimento inicial: R$ 1.990 taxa única de entrada.
Inclui: treinamento completo, suporte contínuo, CRM fornecido, marca Pro Life, material de apoio.
Comissões: T1 Ativação WL R$ 497 por franqueado por quarter. T2 B2C Recorrente 30% a 15% a 7%. T3 B2B Corporativo 10% a 7% a 5%.

Projeção de renda do consultor:
- Mês 1: R$ 2.057
- Mês 3: R$ 3.500
- Mês 6: R$ 7.071
- Mês 9: R$ 10.200
- Mês 12: R$ 14.420
- Ano 2: R$ 17.000
- Ano 3: R$ 19.500

## CANAL WHITE LABEL (Franqueado)
Operação própria sob a marca PLM. Compra no preço PLM. Define preço ao cliente. Margem de 35% a 54%.
Modelo: paga R$ 497 por mês de licença PLM, compra serviços no preço PLM, define seu próprio preço ao cliente.
Sem comissão Sales Pro — margem total fica com o franqueado.

Margem por volume de vidas:
- 200 a 999 vidas: 35%
- 1.000 a 2.900 vidas: 38%
- 3.000 a 5.900 vidas: 41%
- 6.000 a 8.900 vidas: 44%
- 9.000 a 11.900 vidas: 48%
- 12.000 a 20.000 vidas: 51%
- 20.000 a 30.000 vidas: 54%

## COMPARATIVO DE CANAIS
B2B Direto Empresarial: Investimento nenhum. Margem líquida 47%. Previsibilidade 5 estrelas. Escalabilidade 3 estrelas. Complexidade média. Break-even R$ 61.706 por mês. Recomendação: Âncora.
Sales Pro Micro-Franqueado: Investimento R$ 1.990. Margem de 20% a 50%. Previsibilidade 3 estrelas. Escalabilidade 5 estrelas. Complexidade baixa. Break-even mês 1 a 3. Recomendação: Escala.
White Label Franqueado: Investimento R$ 497 por mês. Margem de 35% a 54%. Previsibilidade 4 estrelas. Escalabilidade 4 estrelas. Complexidade alta. Break-even 200 vidas mínimo. Recomendação: Alavanca.

## CONTATO
Site: www.prolifemed.com.br
Aldo: (62) 98289-0145
Adriano: (41) 98766-3331
`

async function main() {
  const doc = await prisma.knowledgeDocument.create({
    data: {
      knowledgeBaseId: KB_ID,
      title: 'Portfólio ProLife Medical 2026 — Planos, Preços e Canais',
      content,
      fileType: 'md',
      chunks: [],
      status: 'processing',
    }
  })

  console.log('Documento criado:', doc.id)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e.message); prisma.$disconnect(); process.exit(1) })
