/**
 * Versioned Terms of Use (spec 013, FR-004/FR-004a). Client-safe data only: the SHA-256 recorded
 * with each acceptance is computed server-side in /api/billing/checkout.
 * v1 = text published until 2026-09-29, kept verbatim at /termos/v1 forever.
 * v2 = rewrites only §4, §8 and §10 for consumer law (CDC) and identifies the seller in §1 and §12.
 */
import { COMPANY } from '@/lib/company'

export type TermsSection = { title: string; content: string; highlight?: string }
export type TermsVersion = {
  version: 'v1' | 'v2'
  updatedAt: string
  draft: boolean
  sections: TermsSection[]
}

const SELLER = `${COMPANY.legalName}, CNPJ ${COMPANY.cnpj}, com endereço em ${COMPANY.address}`

const common = {
  s2: {
    title: '2. Descrição do Serviço',
    content: 'O Polaris IA é uma plataforma de orquestração de agentes de inteligência artificial desenvolvida pela ROI Labs. O serviço inclui ferramentas para criação de agentes IA, orquestração de pipelines, Knowledge Base com RAG semântico, IDE multi-modelo e canais de atendimento integrados.',
  },
  s3: {
    title: '3. Conta de Usuário',
    content: 'Para usar determinadas funcionalidades do serviço, você deve criar uma conta fornecendo informações precisas e completas. Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades realizadas em sua conta. Notifique-nos imediatamente sobre qualquer uso não autorizado da sua conta.',
  },
  s5: {
    title: '5. Uso Aceitável',
    content: 'Você concorda em não usar o serviço para: (a) violar qualquer lei ou regulamento aplicável; (b) transmitir conteúdo ilegal, difamatório, obsceno ou prejudicial; (c) tentar acessar sistemas não autorizados; (d) distribuir malware ou código malicioso; (e) infringir direitos de propriedade intelectual de terceiros; (f) gerar spam ou conteúdo enganoso em massa.',
  },
  s6: {
    title: '6. Propriedade Intelectual',
    content: 'O Polaris IA e seu conteúdo original, funcionalidades e recursos são propriedade da ROI Labs e estão protegidos por leis de direitos autorais, marcas registradas e outras leis de propriedade intelectual. O código-fonte está disponível sob licença MIT no GitHub. Você retém todos os direitos sobre o conteúdo que você cria e processa através da plataforma.',
  },
  s7: {
    title: '7. Privacidade',
    content: 'O uso do serviço está sujeito à nossa Política de Privacidade, que descreve como coletamos, usamos e protegemos suas informações pessoais. Ao usar o serviço, você consente com a coleta e uso das informações conforme descrito em nossa Política de Privacidade.',
  },
  s9: {
    title: '9. Disponibilidade do Serviço',
    content: 'Não garantimos disponibilidade ininterrupta do serviço. Podemos realizar manutenções programadas com aviso prévio. Não nos responsabilizamos por indisponibilidades causadas por fatores fora do nosso controle razoável, incluindo falhas de provedores de nuvem, ataques cibernéticos ou desastres naturais.',
  },
  s11: {
    title: '11. Lei Aplicável',
    content: 'Estes termos são regidos pelas leis do Brasil. Qualquer disputa será submetida à jurisdição exclusiva dos tribunais do Brasil. Em caso de conflito entre versões em diferentes idiomas, prevalecerá a versão em português.',
  },
}

export const TERMS: Record<'v1' | 'v2', TermsVersion> = {
  v1: {
    version: 'v1',
    updatedAt: 'Fevereiro de 2026',
    draft: false,
    sections: [
      {
        title: '1. Aceitação dos Termos',
        content: 'Ao acessar ou usar a plataforma Polaris IA, você concorda em cumprir e ficar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não poderá acessar o serviço. Estes termos se aplicam a todos os visitantes, usuários e outras pessoas que acessam ou usam o serviço.',
      },
      common.s2,
      common.s3,
      {
        title: '4. Planos e Pagamentos',
        content: 'O Polaris IA oferece planos gratuitos e pagos. Os planos pagos são cobrados mensalmente via Mercado Pago (PIX ou cartão de crédito). Você pode cancelar sua assinatura a qualquer momento. O cancelamento será efetivo ao final do período de faturamento vigente. Não realizamos reembolsos proporcionais por cancelamentos antecipados.',
      },
      common.s5,
      common.s6,
      common.s7,
      {
        title: '8. Limitação de Responsabilidade',
        content: 'Na máxima extensão permitida por lei, a ROI Labs não será responsável por danos indiretos, incidentais, especiais, consequenciais ou punitivos, incluindo perda de lucros, dados ou goodwill, decorrentes do uso ou incapacidade de usar o serviço. Nossa responsabilidade total não excederá o valor pago por você nos últimos 12 meses.',
      },
      common.s9,
      {
        title: '10. Modificações dos Termos',
        content: 'Reservamos o direito de modificar estes termos a qualquer momento. Notificaremos os usuários sobre mudanças materiais por email ou aviso na plataforma. O uso continuado do serviço após as modificações constitui aceitação dos novos termos.',
      },
      common.s11,
      {
        title: '12. Contato',
        content: 'Para dúvidas sobre estes Termos de Uso, entre em contato conosco em contato@roilabs.com.br ou visite nossa página de contato.',
      },
    ],
  },
  v2: {
    version: 'v2',
    updatedAt: '29 de setembro de 2026',
    draft: true,
    sections: [
      {
        title: '1. Aceitação dos Termos',
        content: `Estes Termos de Uso são celebrados entre você e ${SELLER}, que comercializa a plataforma Polaris IA. Ao acessar ou usar a plataforma, você concorda em cumprir e ficar vinculado a estes Termos. Se você não concordar com qualquer parte deles, não poderá acessar o serviço. Estes termos se aplicam a todos os visitantes, usuários e outras pessoas que acessam ou usam o serviço.`,
      },
      common.s2,
      common.s3,
      {
        title: '4. Planos e Pagamentos',
        content: [
          '4.1 O Polaris IA oferece um plano gratuito e planos pagos mensais (Pro e Business). Os preços aparecem na página de preços e na tela de assinatura, antes do pagamento.',
          '4.2 Teste grátis: toda conta nova recebe 7 dias do plano Pro, sem cadastrar cartão e sem cobrança. Ao fim do teste, a conta passa ao plano gratuito, a menos que você assine um plano pago.',
          '4.3 Pagamento: a assinatura é paga com cartão de crédito e processada pela Stripe. O CPF ou CNPJ informado na assinatura é usado para a emissão da nota fiscal.',
          '4.4 Cancelamento: você pode cancelar a qualquer momento pelo painel da conta, em Assinatura → Gerenciar assinatura, sem precisar falar com o atendimento. O cancelamento vale ao fim do período já pago; até lá o plano continua ativo e não há nova cobrança. Não há reembolso proporcional dos dias restantes, exceto no caso do item 4.5.',
          '4.5 Direito de arrependimento: em até 7 dias da primeira cobrança, você pode desistir pelo painel, em "Desistir e receber o valor de volta", e receber a devolução integral do valor pago no mesmo meio de pagamento, conforme o art. 49 do Código de Defesa do Consumidor.',
          '4.6 Pagamento recusado: se a cobrança da renovação for recusada, avisaremos por e-mail e o plano continuará ativo por até 7 dias para você atualizar o cartão. Sem pagamento nesse prazo, a assinatura é encerrada e a conta passa ao plano gratuito.',
          '4.7 Troca de plano: ao mudar entre Pro e Business, a mudança vale na hora, e a diferença é cobrada ou creditada de forma proporcional ao tempo restante do mês.',
          '4.8 Seus dados: ao voltar ao plano gratuito, por qualquer motivo, seus dados continuam na sua conta.',
        ].join('\n'),
        highlight: 'A ASSINATURA SE RENOVA AUTOMATICAMENTE A CADA MÊS, COM COBRANÇA DO VALOR DO PLANO NO MESMO CARTÃO, ATÉ QUE VOCÊ CANCELE.',
      },
      common.s5,
      common.s6,
      common.s7,
      {
        title: '8. Limitação de Responsabilidade',
        content: 'Na máxima extensão permitida por lei, não seremos responsáveis por danos indiretos, incidentais, especiais, consequenciais ou punitivos, incluindo perda de lucros, dados ou goodwill, decorrentes do uso ou incapacidade de usar o serviço, e nossa responsabilidade total não excederá o valor pago por você nos últimos 12 meses. Esta limitação não se aplica a quem contrata como consumidor, cujos direitos previstos no Código de Defesa do Consumidor (Lei 8.078/1990) não podem ser afastados por contrato.',
      },
      common.s9,
      {
        title: '10. Modificações dos Termos',
        content: 'Podemos atualizar estes termos. Mudanças que alterem seus direitos ou obrigações serão avisadas por e-mail com pelo menos 30 dias de antecedência e só passam a valer depois desse prazo. Se não concordar, você pode cancelar a assinatura antes da vigência, sem multa. Para quem contrata como consumidor, continuar usando o serviço não equivale a aceitar a nova versão. As versões anteriores ficam publicadas, como a versão 1 em polarisia.com.br/termos/v1.',
      },
      common.s11,
      {
        title: '12. Contato',
        content: `Para dúvidas sobre estes Termos de Uso, entre em contato em ${COMPANY.email} ou pela nossa página de contato. Fornecedor: ${SELLER}.`,
      },
    ],
  },
}

export const CURRENT_TERMS_VERSION = 'v2' as const
