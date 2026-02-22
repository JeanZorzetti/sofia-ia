import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  BrainCircuit,
  Zap,
  Star,
  Shield,
  HelpCircle,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Preços — Planos Sofia AI | Free, Pro, Business e Enterprise',
  description: 'Conheça os planos do Sofia AI. Free para começar, Pro por R$297/mês, Business por R$997/mês e Enterprise custom para grandes empresas. Sem surpresas na fatura.',
  keywords: [
    'preço sofia ai',
    'planos sofia ai',
    'quanto custa sofia ai',
    'plataforma agentes ia preço',
    'orquestração ia gratis',
    'sofia pro business enterprise',
  ],
  openGraph: {
    title: 'Preços — Sofia AI | Free, Pro e Business',
    description: 'Comece grátis. Escale conforme cresce. Planos a partir de R$0/mês.',
    type: 'website',
    locale: 'pt_BR',
  },
  alternates: { canonical: 'https://sofiaia.roilabs.com.br/preco' },
}

const plans = [
  {
    name: 'Free',
    price: 'R$0',
    period: '/mês',
    description: 'Para experimentar e explorar',
    highlight: false,
    badge: null,
    features: [
      '3 orquestrações',
      '5 agentes',
      '1 Knowledge Base',
      '100 execuções/mês',
      'IDE multi-modelo',
      'Templates prontos',
      'Suporte por email',
    ],
    cta: 'Começar Grátis',
    ctaHref: '/login',
    ctaVariant: 'outline' as const,
  },
  {
    name: 'Pro',
    price: 'R$297',
    period: '/mês',
    description: 'Para times e pequenas empresas',
    highlight: true,
    badge: 'Mais Popular',
    features: [
      'Orquestrações ilimitadas',
      '20 agentes',
      '10 Knowledge Bases',
      '2.000 execuções/mês',
      'WhatsApp integrado',
      'Analytics avançado',
      'Replay de execuções',
      'Export PDF, Markdown, CSV',
      'Suporte prioritário',
    ],
    cta: 'Assinar Pro',
    ctaHref: '/dashboard/billing',
    ctaVariant: 'primary' as const,
  },
  {
    name: 'Business',
    price: 'R$997',
    period: '/mês',
    description: 'Para empresas com alta demanda',
    highlight: false,
    badge: null,
    features: [
      'Tudo do Pro',
      'Agentes ilimitados',
      'KBs ilimitadas',
      'Execuções ilimitadas',
      'Multi-canal completo',
      'API pública',
      'SLA 99.9%',
      'Onboarding personalizado',
      'Suporte dedicado',
    ],
    cta: 'Assinar Business',
    ctaHref: '/dashboard/billing',
    ctaVariant: 'outline' as const,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'Para grandes organizações',
    highlight: false,
    badge: null,
    features: [
      'Tudo do Business',
      'Self-hosted (LGPD)',
      'SSO / SAML 2.0',
      'SLA personalizado',
      'Compliance e auditoria',
      'Treinamento da equipe',
      'Gerente de conta dedicado',
      'Contrato e NDA',
    ],
    cta: 'Falar com Vendas',
    ctaHref: '/contato',
    ctaVariant: 'outline' as const,
  },
]

const faqs = [
  {
    q: 'Preciso de cartão de crédito para o plano Free?',
    a: 'Não. O plano Free é gratuito e não exige cartão de crédito. Crie sua conta e comece agora.',
  },
  {
    q: 'Como funciona o billing?',
    a: 'O pagamento é processado via Mercado Pago (PIX ou cartão de crédito). A cobrança é mensal recorrente e você pode cancelar a qualquer momento.',
  },
  {
    q: 'Posso mudar de plano a qualquer momento?',
    a: 'Sim. Você pode fazer upgrade ou downgrade do seu plano a qualquer momento pelo painel de billing.',
  },
  {
    q: 'O que acontece se eu atingir os limites do plano Free?',
    a: 'Você receberá uma notificação e poderá fazer upgrade para o plano Pro. Não bloqueamos sua conta sem aviso.',
  },
  {
    q: 'Há desconto para pagamento anual?',
    a: 'Entre em contato com nossa equipe em contato@roilabs.com.br para condições especiais de contratos anuais.',
  },
  {
    q: 'O Sofia AI oferece self-hosted?',
    a: 'Sim. Todos os planos incluem acesso ao Docker Compose para instalação self-hosted na sua infraestrutura.',
  },
]

export default function PrecosPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'Sofia AI',
            description: 'Plataforma de orquestração de agentes IA com Knowledge Base RAG, IDE multi-modelo e canais integrados.',
            offers: [
              { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'BRL', availability: 'https://schema.org/InStock' },
              { '@type': 'Offer', name: 'Pro', price: '297', priceCurrency: 'BRL', availability: 'https://schema.org/InStock' },
              { '@type': 'Offer', name: 'Business', price: '997', priceCurrency: 'BRL', availability: 'https://schema.org/InStock' },
              { '@type': 'Offer', name: 'Enterprise', priceCurrency: 'BRL', availability: 'https://schema.org/InStock', description: 'Plano Enterprise com preço customizado para grandes empresas — self-hosted, SLA e suporte dedicado.' },
            ],
          }),
        }}
      />

      {/* Navbar */}
      <nav className="navbar-glass sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <BrainCircuit className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">Sofia AI</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/features" className="text-foreground-secondary hover:text-white transition-colors text-sm">Features</Link>
            <Link href="/comparativo" className="text-foreground-secondary hover:text-white transition-colors text-sm">Comparativo</Link>
            <Link href="/preco" className="text-white text-sm font-medium">Preço</Link>
            <Link href="/templates" className="text-foreground-secondary hover:text-white transition-colors text-sm">Templates</Link>
            <Link href="/blog" className="text-foreground-secondary hover:text-white transition-colors text-sm">Blog</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-foreground-secondary hover:text-white transition-colors">Entrar</Link>
            <Link href="/login" className="button-luxury px-5 py-2 text-sm flex items-center gap-1.5">
              Começar Grátis <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-20 pb-16 text-center">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Voltar para home
          </Link>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-green-500/30 bg-green-500/10 text-sm text-green-300 mb-6">
            <Zap className="w-4 h-4" /> Comece grátis — sem cartão de crédito
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Preços{' '}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              transparentes
            </span>
          </h1>
          <p className="text-lg text-foreground-tertiary max-w-xl mx-auto">
            Comece grátis. Escale conforme cresce. Sem surpresas na fatura.
          </p>
        </div>
      </section>

      {/* Planos */}
      <section className="px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-7 relative flex flex-col ${plan.highlight
                  ? 'bg-gradient-to-b from-blue-500/20 to-purple-500/20 border-2 border-blue-500/40'
                  : 'glass-card'}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 bg-blue-500 rounded-full text-xs font-medium text-white whitespace-nowrap">
                    <Star className="w-3 h-3" /> {plan.badge}
                  </div>
                )}
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-white mb-1">{plan.name}</h2>
                  <p className="text-white/50 text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className={`font-bold text-white ${plan.price === 'Custom' ? 'text-3xl' : 'text-4xl'}`}>{plan.price}</span>
                    {plan.period && <span className="text-white/40 text-sm">{plan.period}</span>}
                  </div>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-foreground-secondary">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.ctaHref}
                  className={`block text-center py-3 px-6 rounded-xl font-medium transition-all ${plan.highlight
                    ? 'bg-blue-500 hover:bg-blue-400 text-white'
                    : 'border border-white/20 hover:bg-white/5 text-white'}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-6 mt-10 text-sm text-white/40">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" /> SSL e dados seguros
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Cancele quando quiser
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" /> Pagamento via Mercado Pago
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-16 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 justify-center mb-10">
            <HelpCircle className="w-5 h-5 text-white/40" />
            <h2 className="text-2xl font-bold">Perguntas Frequentes</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.q} className="glass-card p-5 rounded-xl">
                <h3 className="font-medium text-white mb-2 text-sm">{faq.q}</h3>
                <p className="text-sm text-foreground-tertiary leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 bg-background-secondary">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Comece agora, de graça</h2>
          <p className="text-foreground-tertiary mb-8">Sem cartão. Sem compromisso. Primeira orquestração em 5 minutos.</p>
          <Link href="/login" className="button-luxury px-10 py-4 text-base inline-flex items-center gap-2 justify-center">
            Criar Conta Grátis <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <footer className="px-6 py-8 border-t border-white/5 text-center">
        <p className="text-foreground-tertiary text-sm">
          &copy; 2026 ROI Labs.{' '}
          <Link href="/" className="hover:text-white transition-colors">Sofia AI</Link>
          {' · '}
          <Link href="/features" className="hover:text-white transition-colors">Features</Link>
          {' · '}
          <Link href="/comparativo" className="hover:text-white transition-colors">Comparativo</Link>
        </p>
      </footer>
    </div>
  )
}
