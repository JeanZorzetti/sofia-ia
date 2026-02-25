import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, BrainCircuit } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Termos de Uso — Sofia AI',
  description: 'Termos de uso da plataforma Sofia AI. Leia antes de utilizar nossos serviços.',
  alternates: { canonical: 'https://sofiaia.roilabs.com.br/termos' },
}

const sections = [
  {
    title: '1. Aceitação dos Termos',
    content: 'Ao acessar ou usar a plataforma Sofia AI, você concorda em cumprir e ficar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não poderá acessar o serviço. Estes termos se aplicam a todos os visitantes, usuários e outras pessoas que acessam ou usam o serviço.',
  },
  {
    title: '2. Descrição do Serviço',
    content: 'O Sofia AI é uma plataforma de orquestração de agentes de inteligência artificial desenvolvida pela ROI Labs. O serviço inclui ferramentas para criação de agentes IA, orquestração de pipelines, Knowledge Base com RAG semântico, IDE multi-modelo e canais de atendimento integrados.',
  },
  {
    title: '3. Conta de Usuário',
    content: 'Para usar determinadas funcionalidades do serviço, você deve criar uma conta fornecendo informações precisas e completas. Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades realizadas em sua conta. Notifique-nos imediatamente sobre qualquer uso não autorizado da sua conta.',
  },
  {
    title: '4. Planos e Pagamentos',
    content: 'O Sofia AI oferece planos gratuitos e pagos. Os planos pagos são cobrados mensalmente via Mercado Pago (PIX ou cartão de crédito). Você pode cancelar sua assinatura a qualquer momento. O cancelamento será efetivo ao final do período de faturamento vigente. Não realizamos reembolsos proporcionais por cancelamentos antecipados.',
  },
  {
    title: '5. Uso Aceitável',
    content: 'Você concorda em não usar o serviço para: (a) violar qualquer lei ou regulamento aplicável; (b) transmitir conteúdo ilegal, difamatório, obsceno ou prejudicial; (c) tentar acessar sistemas não autorizados; (d) distribuir malware ou código malicioso; (e) infringir direitos de propriedade intelectual de terceiros; (f) gerar spam ou conteúdo enganoso em massa.',
  },
  {
    title: '6. Propriedade Intelectual',
    content: 'O Sofia AI e seu conteúdo original, funcionalidades e recursos são propriedade da ROI Labs e estão protegidos por leis de direitos autorais, marcas registradas e outras leis de propriedade intelectual. O código-fonte está disponível sob licença MIT no GitHub. Você retém todos os direitos sobre o conteúdo que você cria e processa através da plataforma.',
  },
  {
    title: '7. Privacidade',
    content: 'O uso do serviço está sujeito à nossa Política de Privacidade, que descreve como coletamos, usamos e protegemos suas informações pessoais. Ao usar o serviço, você consente com a coleta e uso das informações conforme descrito em nossa Política de Privacidade.',
  },
  {
    title: '8. Limitação de Responsabilidade',
    content: 'Na máxima extensão permitida por lei, a ROI Labs não será responsável por danos indiretos, incidentais, especiais, consequenciais ou punitivos, incluindo perda de lucros, dados ou goodwill, decorrentes do uso ou incapacidade de usar o serviço. Nossa responsabilidade total não excederá o valor pago por você nos últimos 12 meses.',
  },
  {
    title: '9. Disponibilidade do Serviço',
    content: 'Não garantimos disponibilidade ininterrupta do serviço. Podemos realizar manutenções programadas com aviso prévio. Não nos responsabilizamos por indisponibilidades causadas por fatores fora do nosso controle razoável, incluindo falhas de provedores de nuvem, ataques cibernéticos ou desastres naturais.',
  },
  {
    title: '10. Modificações dos Termos',
    content: 'Reservamos o direito de modificar estes termos a qualquer momento. Notificaremos os usuários sobre mudanças materiais por email ou aviso na plataforma. O uso continuado do serviço após as modificações constitui aceitação dos novos termos.',
  },
  {
    title: '11. Lei Aplicável',
    content: 'Estes termos são regidos pelas leis do Brasil. Qualquer disputa será submetida à jurisdição exclusiva dos tribunais do Brasil. Em caso de conflito entre versões em diferentes idiomas, prevalecerá a versão em português.',
  },
  {
    title: '12. Contato',
    content: 'Para dúvidas sobre estes Termos de Uso, entre em contato conosco em contato@roilabs.com.br ou visite nossa página de contato.',
  },
]

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">


      <section className="px-6 pt-16 pb-20">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <h1 className="text-4xl font-bold mb-2">Termos de Uso</h1>
          <p className="text-foreground-tertiary text-sm mb-10">Última atualização: Fevereiro de 2026</p>

          <div className="space-y-8">
            {sections.map((section) => (
              <div key={section.title}>
                <h2 className="text-lg font-semibold text-white mb-3">{section.title}</h2>
                <p className="text-foreground-secondary leading-relaxed text-sm">{section.content}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 p-5 glass-card rounded-xl border border-white/10">
            <p className="text-sm text-foreground-tertiary">
              Dúvidas?{' '}
              <Link href="/contato" className="text-blue-400 hover:text-blue-300 transition-colors">Entre em contato</Link>
              {' '}ou leia nossa{' '}
              <Link href="/privacidade" className="text-blue-400 hover:text-blue-300 transition-colors">Política de Privacidade</Link>.
            </p>
          </div>
        </div>
      </section>


    </div>
  )
}
