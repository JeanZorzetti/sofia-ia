import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Globe, Zap, Heart, Shield, Target, Rocket } from 'lucide-react'
import { SectionWrapper, SectionHeader } from '@/components/landing/SectionWrapper'
import { CTASection } from '@/components/landing/CTASection'
import { AnimatedSection } from '@/components/landing/AnimatedSection'
import { GradientText } from '@/components/landing/GradientText'
import { AnimatedCounter } from '@/components/landing/AnimatedCounter'

export const metadata: Metadata = {
  title: 'Sobre a Sofia AI — Quem Somos | ROI Labs',
  description: 'Sofia AI e ROI Labs: nossa missao, equipe e historia. Construindo a plataforma de orquestracao de agentes IA mais acessivel do Brasil.',
  openGraph: {
    title: 'Sobre a Sofia AI — Plataforma de Orquestracao de Agentes IA',
    description: 'Conheca a ROI Labs e a historia da Sofia AI, a plataforma brasileira de multi-agent orchestration.',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Sofia AI',
    url: 'https://sofiaia.roilabs.com.br/sobre',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sobre a Sofia AI — ROI Labs',
    description: 'Nossa missao, equipe e historia. Construindo IA para o Brasil.',
  },
  alternates: { canonical: 'https://sofiaia.roilabs.com.br/sobre' },
}

const values = [
  {
    icon: Target,
    title: 'Foco em resultado real',
    description: 'Nao construimos demos. Construimos ferramentas que geram resultado mensuravel para negocios reais.',
  },
  {
    icon: Shield,
    title: 'Confianca e transparencia',
    description: 'Codigo open-source, audit log completo, sem black-boxes. Voce sabe exatamente o que seus agentes estao fazendo.',
  },
  {
    icon: Heart,
    title: 'Acessibilidade democratica',
    description: 'IA de nivel enterprise nao deveria ser exclusividade de grandes corporacoes. Nosso plano Free e permanente.',
  },
  {
    icon: Zap,
    title: 'Velocidade de inovacao',
    description: 'Lanamos novas features todo sprint. Nosso roadmap e publico e a comunidade influencia diretamente o que construimos.',
  },
]

const milestones = [
  { year: '2025 T1', label: 'Fundacao', desc: 'ROI Labs fundada com foco em automacao inteligente para empresas brasileiras' },
  { year: '2025 T2', label: 'MVP Sofia', desc: 'Primeiros agentes e orquestracoes basicas. Validacao com 10 clientes beta' },
  { year: '2025 T3', label: 'Produto Maduro', desc: 'Knowledge Base (RAG), multi-agente, billing integrado, 50+ usuarios' },
  { year: '2025 T4', label: 'Enterprise', desc: 'SSO, Audit Log, Teams, White-label. Primeiros contratos enterprise' },
  { year: '2026', label: 'Expansao', desc: 'API publica, SDK npm, integracao com HubSpot/Salesforce/Google Sheets/Notion, Beta Program' },
]

export default function SobrePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Schema Markup — Organization */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'ROI Labs',
            url: 'https://roilabs.com.br',
            logo: 'https://sofiaia.roilabs.com.br/logo.svg',
            description: 'ROI Labs e uma empresa brasileira de tecnologia especializada em automacao inteligente com IA para negocios de todos os tamanhos.',
            foundingDate: '2025',
            founders: [
              {
                '@type': 'Person',
                name: 'Jean Zorzetti',
                jobTitle: 'Founder & CEO',
              }
            ],
            contactPoint: {
              '@type': 'ContactPoint',
              contactType: 'customer service',
              email: 'contact@roilabs.com.br',
              availableLanguage: ['Portuguese', 'English']
            },
            sameAs: [
              'https://github.com/JeanZorzetti/sofia-ia',
              'https://discord.gg/sofiaia'
            ],
            hasOfferCatalog: {
              '@type': 'OfferCatalog',
              name: 'Sofia AI — Plataforma de Orquestracao de Agentes IA',
              itemListElement: [
                {
                  '@type': 'Offer',
                  name: 'Plano Free',
                  description: '3 agentes, 100 mensagens/mes, 1 Knowledge Base',
                  price: '0',
                  priceCurrency: 'BRL'
                },
                {
                  '@type': 'Offer',
                  name: 'Plano Pro',
                  description: '20 agentes, 5.000 mensagens/mes, 10 Knowledge Bases',
                  price: '297',
                  priceCurrency: 'BRL'
                }
              ]
            }
          })
        }}
      />

      {/* Schema Markup — WebSite */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Sofia AI',
            url: 'https://sofiaia.roilabs.com.br',
            description: 'Plataforma brasileira de orquestracao de agentes IA. Automatize processos complexos com pipelines de agentes inteligentes.',
            potentialAction: {
              '@type': 'SearchAction',
              target: {
                '@type': 'EntryPoint',
                urlTemplate: 'https://sofiaia.roilabs.com.br/blog?q={search_term_string}'
              },
              'query-input': 'required name=search_term_string'
            }
          })
        }}
      />



      {/* Hero */}
      <section className="px-6 pt-20 pb-16 text-center bg-dot-grid">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-sm text-blue-300 mb-8">
            <Globe className="w-4 h-4" />
            Sobre a Sofia AI e a ROI Labs
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Democratizando a{' '}
            <GradientText>inteligencia artificial</GradientText>{' '}
            para empresas brasileiras
          </h1>
          <p className="text-xl text-foreground-tertiary max-w-2xl mx-auto">
            Acreditamos que qualquer empresa — de qualquer tamanho — deveria ter acesso ao mesmo poder de automacao inteligente que as maiores corporacoes do mundo.
          </p>
        </div>
      </section>

      {/* Missao */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl border border-white/10 p-8 md:p-12">
            <h2 className="text-3xl font-bold mb-6">Nossa Missao</h2>
            <p className="text-xl text-white/70 leading-relaxed mb-6">
              Tornar a orquestracao de agentes IA acessivel, confiavel e mensuravel para empresas brasileiras — sem exigir expertise em machine learning, sem lock-in de vendor e sem custos proibitivos.
            </p>
            <p className="text-white/60 leading-relaxed">
              A Sofia AI nasceu da frustracao com ferramentas que eram ou muito tecnicas (CrewAI, AutoGen, LangChain) ou muito limitadas (chatbot builders sem raciocinio real). Queríamos algo no meio: poderoso o suficiente para casos de uso enterprise, simples o suficiente para um fundador de startup conseguir configurar em 10 minutos.
            </p>
          </div>
        </div>
      </section>

      {/* Valores */}
      <SectionWrapper alt>
        <SectionHeader title="Nossos valores" />
        <AnimatedSection direction="up" delay={0.1}>
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {values.map((value) => {
              const Icon = value.icon
              return (
                <div key={value.title} className="glass-card rounded-xl p-6">
                  <div className="p-2 rounded-lg bg-blue-500/10 w-fit mb-4">
                    <Icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{value.title}</h3>
                  <p className="text-foreground-tertiary text-sm leading-relaxed">{value.description}</p>
                </div>
              )
            })}
          </div>
        </AnimatedSection>
      </SectionWrapper>

      {/* Timeline */}
      <section className="px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Nossa historia</h2>
          <div className="space-y-6">
            {milestones.map((m, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0">
                    <Rocket className="w-4 h-4 text-white" />
                  </div>
                  {i < milestones.length - 1 && (
                    <div className="w-0.5 h-full bg-white/10 mt-2" />
                  )}
                </div>
                <div className="pb-6 flex-1">
                  <div className="text-blue-400 text-sm font-medium mb-1">{m.year}</div>
                  <div className="font-semibold text-lg mb-1">{m.label}</div>
                  <p className="text-white/60 text-sm">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Numeros */}
      <SectionWrapper alt>
        <SectionHeader title="Sofia AI em numeros" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {[
            { n: 50, s: '+', label: 'Artigos no blog', sub: 'SEO e GEO' },
            { n: 100, s: '+', label: 'Commits', sub: 'open-source' },
            { n: 4, s: '', label: 'Planos', sub: 'Free ate Enterprise' },
            { n: 15, s: '+', label: 'Integracoes', sub: 'Zapier, HubSpot, Notion...' },
          ].map((stat) => (
            <div key={stat.label} className="glass-card rounded-xl p-6 text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                <AnimatedCounter value={stat.n} suffix={stat.s} />
              </div>
              <div className="font-medium text-sm">{stat.label}</div>
              <div className="text-foreground-tertiary text-xs mt-1">{stat.sub}</div>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* Open Source */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Somos open-source</h2>
          <p className="text-white/60 mb-8 max-w-2xl mx-auto">
            O codigo da Sofia AI e publico no GitHub sob licenca MIT. Voce pode auditar, contribuir, fazer self-hosted ou usar como base para seu proprio produto.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="https://github.com/JeanZorzetti/sofia-ia"
              target="_blank"
              rel="noopener noreferrer"
              className="button-luxury px-6 py-3 flex items-center gap-2"
            >
              Ver no GitHub <ArrowRight className="w-4 h-4" />
            </a>
            <Link href="/comunidade" className="text-blue-400 hover:text-blue-300 flex items-center gap-1.5 text-sm">
              Entrar na comunidade <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <CTASection
        title="Pronto para comecar?"
        description="Crie sua conta gratis hoje. Sem cartao de credito, sem compromisso."
        primaryCta={{ label: 'Comecar gratis', href: '/cadastro' }}
        secondaryCta={{ label: 'Falar com nossa equipe', href: '/contato' }}
      />


    </div>
  )
}
