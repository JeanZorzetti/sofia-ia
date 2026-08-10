import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, ExternalLink, CheckCircle2, Sparkles } from 'lucide-react'
import { FloatingPaths } from '@/components/ui/background-paths'
import { CTASection } from '@/components/landing/CTASection'
import { FAQSection } from '@/components/landing/FAQSection'
import { SectionWrapper, SectionHeader } from '@/components/landing/SectionWrapper'
import { GradientText } from '@/components/landing/GradientText'
import { AnimatedSection } from '@/components/landing/AnimatedSection'
import {
  heroCopy,
  painCards,
  howItWorksSteps,
  comparisonRows,
  includedItems,
  pricingModel,
  proofCopy,
  intakeFaq,
} from '@/data/home-v4'

export const metadata: Metadata = {
  title: 'Sites de produção, não protótipos | Polaris IA',
  description: 'Um time de agentes de IA constrói seu site, revisa cada mudança e publica no seu domínio. Código seu, em git, desde o primeiro commit. Preço fechado por entrega.',
  keywords: ['site feito por ia', 'criação de sites com ia', 'agentes ia para sites', 'alternativa lovable', 'alternativa base44', 'site de produção', 'seo técnico', 'geo aeo', 'Polaris IA'],
  openGraph: {
    title: 'Sites de produção, não protótipos',
    description: 'Um time de agentes de IA constrói seu site, revisa cada mudança e publica no seu domínio. Código seu, em git, desde o primeiro commit.',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Polaris IA',
    images: [{ url: '/logos/kit/og-image.png', width: 1200, height: 630, alt: 'Polaris IA — Sites de produção, não protótipos' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sites de produção, não protótipos',
    description: 'Um time de agentes de IA constrói seu site, revisa cada mudança e publica no seu domínio.',
  },
  alternates: { canonical: 'https://polarisia.com.br' },
}

const serviceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Criação de sites de produção com agentes de IA',
  name: 'Polaris IA — Sites de produção',
  description: 'Sites de produção construídos por um time de agentes de IA (desenvolvedor, revisor, líder técnico) com deploy no domínio do cliente e código próprio desde o primeiro commit.',
  areaServed: 'BR',
  provider: {
    '@type': 'Organization',
    name: 'ROI Labs',
    url: 'https://polarisia.com.br',
    sameAs: [
      'https://www.linkedin.com/company/roi-labs-curadoria/',
      'https://www.instagram.com/roilabs.curadoria/',
    ],
  },
}

export default function LandingPage() {
  return (
    <div className="bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />

      {/* 1. Hero — problema primeiro */}
      <section className="relative px-6 pt-20 pb-28 overflow-hidden bg-dot-grid">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
          <div className="glow-orb absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-500/6 rounded-full blur-3xl" />
          <div className="glow-orb-slow absolute top-40 left-1/3 w-[400px] h-[300px] bg-purple-500/6 rounded-full blur-3xl" />
        </div>
        <AnimatedSection direction="fade" delay={0.1}>
          <div className="max-w-4xl mx-auto text-center relative">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-[1.1]">
              <GradientText>Sites de produção</GradientText>,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">não protótipos.</span>
            </h1>
            <p className="text-lg md:text-xl text-foreground-tertiary max-w-2xl mx-auto mb-10">
              {heroCopy.sub}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={heroCopy.ctaPrimary.href} className="button-luxury px-8 py-3.5 text-base inline-flex items-center gap-2 justify-center">
                {heroCopy.ctaPrimary.label} <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href={heroCopy.ctaSecondary.href}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3.5 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-base text-center flex items-center gap-2 justify-center"
              >
                {heroCopy.ctaSecondary.label} <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* 2. A dor */}
      <SectionWrapper id="dor" className="border-t border-white/5">
        <AnimatedSection>
          <SectionHeader title="A dor que você já conhece" description="Se você já tentou (ou ouviu falar de) um builder de IA, isso não é novidade." />
        </AnimatedSection>
        <div className="grid md:grid-cols-3 gap-6">
          {painCards.map((card, i) => (
            <AnimatedSection key={card.title} delay={i * 0.08}>
              <div className="glass-card p-6 rounded-2xl h-full">
                <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <card.icon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">{card.title}</h3>
                <p className="text-sm text-foreground-tertiary leading-relaxed">{card.description}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </SectionWrapper>

      {/* 3. Como funciona */}
      <SectionWrapper id="como-funciona" alt>
        <AnimatedSection>
          <SectionHeader title="Como funciona" description="O time em ação: do brief ao deploy, com revisão em cada etapa." />
        </AnimatedSection>
        <div className="grid md:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {howItWorksSteps.map((step, i) => (
            <AnimatedSection key={step.title} delay={i * 0.08}>
              <div className="relative glass-card p-5 rounded-2xl h-full">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-400">
                    {i + 1}
                  </div>
                  <step.icon className="w-4 h-4 text-white/40" />
                </div>
                <h3 className="font-semibold text-white text-sm mb-1.5">{step.title}</h3>
                <p className="text-xs text-foreground-tertiary leading-relaxed">{step.description}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </SectionWrapper>

      {/* 4. Comparativa — única seção onde concorrentes aparecem */}
      <SectionWrapper id="comparativa">
        <AnimatedSection>
          <SectionHeader
            title="Por que não um app builder de prompt?"
            description="Fatos publicados, com fonte pública. Cada linha compara uma crítica documentada com a resposta estrutural da Polaris."
          />
        </AnimatedSection>
        <div className="max-w-4xl mx-auto space-y-4">
          {comparisonRows.map((row, i) => (
            <AnimatedSection key={row.source.url} delay={i * 0.05}>
              <div className="glass-card p-5 md:p-6 rounded-xl grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/40 mb-1.5">Crítica documentada</p>
                  <p className="text-sm text-foreground-tertiary leading-relaxed mb-2">{row.critique}</p>
                  <a
                    href={row.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                  >
                    Fonte: {row.source.label} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-blue-400/70 mb-1.5">Resposta da Polaris</p>
                  <p className="text-sm text-white leading-relaxed">{row.response}</p>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </SectionWrapper>

      {/* 5. O que está incluso */}
      <SectionWrapper id="incluso" alt>
        <AnimatedSection>
          <SectionHeader title="O que está incluso" description="Não é só código — é o que faz o site funcionar em produção." />
        </AnimatedSection>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {includedItems.map((item, i) => (
            <AnimatedSection key={item.title} delay={i * 0.06}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-foreground-tertiary leading-relaxed">{item.description}</p>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </SectionWrapper>

      {/* 6. Prova */}
      <SectionWrapper id="prova">
        <AnimatedSection>
          <SectionHeader title="Prova, não promessa" />
        </AnimatedSection>
        <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-6">
          <a
            href={proofCopy.caseHref}
            target="_blank"
            rel="noopener noreferrer"
            className="glass-card p-6 rounded-2xl block hover:border-blue-500/30 transition-colors border border-transparent"
          >
            <Sparkles className="w-5 h-5 text-blue-400 mb-3" />
            <h3 className="font-semibold text-white mb-1.5">{proofCopy.caseTitle}</h3>
            <p className="text-sm text-foreground-tertiary mb-3">{proofCopy.caseDescription}</p>
            <span className="text-xs text-blue-400 inline-flex items-center gap-1">
              Ver site no ar <ExternalLink className="w-3 h-3" />
            </span>
          </a>
          <div className="glass-card p-6 rounded-2xl">
            <CheckCircle2 className="w-5 h-5 text-blue-400 mb-3" />
            <h3 className="font-semibold text-white mb-1.5">Dogfooding</h3>
            <p className="text-sm text-foreground-tertiary">{proofCopy.dogfooding}</p>
          </div>
        </div>
      </SectionWrapper>

      {/* 7. Preço */}
      <SectionWrapper id="preco" alt>
        <div className="max-w-2xl mx-auto text-center">
          <AnimatedSection>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{pricingModel.title}</h2>
            <ul className="space-y-3 mb-8 text-left max-w-md mx-auto">
              {pricingModel.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3 text-sm text-foreground-tertiary">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  {bullet}
                </li>
              ))}
            </ul>
            <Link href={pricingModel.cta.href} className="button-luxury px-8 py-3.5 text-base inline-flex items-center gap-2 justify-center">
              {pricingModel.cta.label} <ArrowRight className="w-4 h-4" />
            </Link>
          </AnimatedSection>
        </div>
      </SectionWrapper>

      {/* 8. FAQ anti-objeção */}
      <FAQSection items={intakeFaq} title="Perguntas antes de pedir o seu" />

      {/* 9. CTA final */}
      <CTASection
        icon={Sparkles}
        title="Peça seu site de produção"
        description="Brief de 5 minutos. Proposta com escopo e preço fechado em até 1 dia útil."
        primaryCta={{ label: heroCopy.ctaPrimary.label, href: heroCopy.ctaPrimary.href }}
        secondaryCta={{ label: 'Conhecer a plataforma', href: '/plataforma' }}
      />
    </div>
  )
}
