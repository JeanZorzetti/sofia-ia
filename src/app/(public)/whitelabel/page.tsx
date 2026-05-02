import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Paintbrush,
  Globe,
  Building2,
  CheckCircle,
  Zap,
  Shield,
  Users,
  Code2,
  Star,
} from 'lucide-react'
import { SectionWrapper, SectionHeader } from '@/components/landing/SectionWrapper'
import { CTASection } from '@/components/landing/CTASection'
import { AnimatedSection } from '@/components/landing/AnimatedSection'
import { GradientText } from '@/components/landing/GradientText'

export const metadata: Metadata = {
  title: 'White-label Polaris IA — Plataforma de IA com Sua Marca',
  description: 'Ofereça uma plataforma de agentes IA completa com a sua marca. Polaris IA White-label para agências, consultorias e empresas que querem revender ou incorporar IA ao seu produto.',
  alternates: { canonical: 'https://polarisia.com.br/whitelabel' },
  openGraph: {
    title: 'Polaris IA White-label — IA com Sua Marca',
    description: 'Plataforma multi-agente completa sob sua marca. Para agências, consultorias e ISVs.',
    type: 'website',
    locale: 'pt_BR',
    images: [{ url: 'https://polarisia.com.br/opengraph-image', width: 1200, height: 630, alt: 'Polaris IA — Orquestração de Agentes IA' }],

  },
}

const features = [
  {
    icon: Paintbrush,
    title: 'Identidade visual própria',
    description: 'Logo, favicon, cores primárias e secundárias configuráveis. Seus clientes veem sua marca, não a nossa.',
  },
  {
    icon: Globe,
    title: 'Domínio customizado',
    description: 'Publique em app.suaempresa.com.br. Simples configuração de CNAME no seu DNS.',
  },
  {
    icon: Shield,
    title: 'Self-hosted disponível',
    description: 'Instale na sua infraestrutura via Docker Compose. Dados dos seus clientes nunca saem do seu servidor.',
  },
  {
    icon: Code2,
    title: 'API pública completa',
    description: 'Integre com seus sistemas existentes. REST API documentada para automações e integrações.',
  },
  {
    icon: Users,
    title: 'Multi-tenant nativo',
    description: 'Gerencie múltiplos clientes em uma única instalação, com isolamento total de dados entre contas.',
  },
  {
    icon: Zap,
    title: 'Revenda com margem',
    description: 'Precifique como quiser para seus clientes. O custo de base é o plano Enterprise — o restante é sua margem.',
  },
]

const useCases = [
  {
    title: 'Agências Digitais',
    description: 'Ofereça automação com IA como serviço para seus clientes. Pipeline de conteúdo, atendimento via WhatsApp e qualificação de leads sob sua marca.',
    icon: '🎨',
  },
  {
    title: 'Consultorias de IA',
    description: 'Entregue projetos de automação para empresas usando sua própria plataforma. Mostre valor imediato sem construir do zero.',
    icon: '🧠',
  },
  {
    title: 'ISVs e SaaS',
    description: 'Incorpore agentes IA no seu produto existente. Adicione uma camada de inteligência sem meses de desenvolvimento.',
    icon: '⚡',
  },
  {
    title: 'Integradoras',
    description: 'Implante a plataforma para grandes clientes com SSO, LGPD e SLA personalizados. Tudo sob seu nome.',
    icon: '🏢',
  },
]

const steps = [
  { step: '01', title: 'Entre em contato', description: 'Fale com nosso time e descreva seu caso de uso.' },
  { step: '02', title: 'Personalize a marca', description: 'Configure logo, cores e domínio no painel de white-label.' },
  { step: '03', title: 'Configure os clientes', description: 'Crie contas para seus clientes com limites e planos customizados.' },
  { step: '04', title: 'Entregue valor', description: 'Seus clientes usam a plataforma — você fica com a margem e o relacionamento.' },
]

export default function WhitelabelPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Hero */}
      <section className="px-6 pt-20 pb-16 text-center bg-dot-grid">
        <AnimatedSection className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-sm text-purple-300 mb-6">
            <Building2 className="w-4 h-4" /> Para agências, consultorias e ISVs
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Plataforma de IA <GradientText>com a sua marca</GradientText>
          </h1>
          <p className="text-lg text-foreground-tertiary max-w-2xl mx-auto mb-10">
            Ofereça uma plataforma completa de orquestração de agentes IA para seus clientes — com seu logo, seu
            domínio e seus preços. Infraestrutura nossa, valor seu.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/contato"
              className="button-luxury px-8 py-3.5 text-sm flex items-center gap-2 justify-center"
            >
              Falar com Vendas <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/preco"
              className="px-8 py-3.5 rounded-xl border border-white/20 text-sm text-white/80 hover:bg-white/5 transition-colors flex items-center gap-2 justify-center"
            >
              Ver Planos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </AnimatedSection>
      </section>

      {/* Use cases */}
      <SectionWrapper>
        <SectionHeader title="Quem usa white-label Polaris IA" />
        <AnimatedSection>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((uc) => (
              <div key={uc.title} className="glass-card rounded-2xl p-6">
                <div className="text-3xl mb-4">{uc.icon}</div>
                <h3 className="font-semibold text-white mb-2">{uc.title}</h3>
                <p className="text-foreground-tertiary text-sm">{uc.description}</p>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </SectionWrapper>

      {/* Features */}
      <SectionWrapper alt>
        <SectionHeader
          title="Tudo que você precisa para revender IA"
          description="Recursos enterprise disponíveis no plano White-label, prontos para personalização e entrega."
        />
        <AnimatedSection direction="up" delay={0.1}>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="glass-card rounded-2xl p-6 flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{title}</h3>
                  <p className="text-foreground-tertiary text-sm">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </SectionWrapper>

      {/* How it works */}
      <SectionWrapper>
        <SectionHeader title="Como funciona" />
        <AnimatedSection direction="up" delay={0.1}>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {steps.map(({ step, title, description }) => (
              <div key={step} className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-white/60 text-xs font-bold">{step}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{title}</h3>
                  <p className="text-foreground-tertiary text-sm">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </SectionWrapper>

      {/* Pricing highlight */}
      <SectionWrapper alt>
        <div className="max-w-2xl mx-auto glass-card rounded-2xl p-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-5">
            <Star className="w-6 h-6 text-purple-400" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Plano Enterprise White-label</h2>
          <p className="text-foreground-tertiary mb-6">
            Preço customizado conforme volume de clientes e funcionalidades necessárias. Inclui onboarding dedicado,
            SLA personalizado e suporte comercial para revenda.
          </p>
          <ul className="space-y-2 text-sm text-foreground-secondary mb-8 text-left max-w-sm mx-auto">
            {[
              'Tudo do plano Business',
              'Marca e domínio customizados',
              'Multi-tenant gerenciado',
              'Self-hosted opcional',
              'SSO / SAML 2.0',
              'Contrato de revenda',
              'Suporte técnico e comercial dedicado',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/contato"
            className="button-luxury px-10 py-4 text-base inline-flex items-center gap-2 justify-center"
          >
            Falar com Vendas <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </SectionWrapper>
    </div>
  )
}
