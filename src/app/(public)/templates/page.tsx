import type { Metadata } from 'next'
import Link from 'next/link'
import { BrainCircuit, ChevronRight, GitBranch, Bot, Zap } from 'lucide-react'
import { SectionWrapper, SectionHeader } from '@/components/landing/SectionWrapper'
import { CTASection } from '@/components/landing/CTASection'
import { FAQSection, type FAQItem } from '@/components/landing/FAQSection'
import { AnimatedSection } from '@/components/landing/AnimatedSection'
import { GradientText } from '@/components/landing/GradientText'
import { TemplateCard } from '@/components/landing/TemplateCard'
import { templates, categories } from '@/data/templates'

export const metadata: Metadata = {
  title: 'Templates de Orquestração de Agentes IA | Sofia AI',
  description: 'Galeria de templates prontos de orquestração multi-agente. Marketing, Suporte, Pesquisa, Jurídico e mais. Comece em segundos com pipelines de IA pré-configurados.',
  keywords: [
    'templates orquestração ia',
    'pipelines de agentes ia prontos',
    'template multi-agente',
    'template marketing ia',
    'template suporte ia',
    'template pesquisa ia',
    'sofia ai templates',
    'agentes ia no-code templates'
  ],
  openGraph: {
    title: 'Templates de Orquestração de Agentes IA | Sofia AI',
    description: 'Galeria de pipelines prontos: Marketing, Suporte, Pesquisa, Jurídico e mais. Comece em segundos.',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Sofia AI'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Orchestration Templates | Sofia AI',
    description: 'Ready-to-use multi-agent pipelines: Marketing, Support, Research, Legal and more. Start in seconds.'
  },
  alternates: {
    canonical: 'https://sofiaia.roilabs.com.br/templates'
  }
}

const faqItems: FAQItem[] = [
  {
    question: 'Posso modificar os templates depois de criar?',
    answer: 'Sim. Após criar uma orquestração a partir de um template, você pode editar os prompts de cada agente, trocar o modelo de IA, adicionar ou remover agentes, e alterar a estratégia de execução.'
  },
  {
    question: 'Os templates funcionam com minha Knowledge Base?',
    answer: 'Sim. Em qualquer template, você pode vincular uma ou mais Knowledge Bases a cada agente. O agente usará RAG semântico para buscar contexto relevante dos seus documentos antes de responder.'
  },
  {
    question: 'Quantos templates posso criar a partir de cada modelo?',
    answer: 'Ilimitado. Um template é apenas o ponto de partida — cada orquestração criada é independente e você pode ter quantas quiser dentro do limite do seu plano.'
  },
  {
    question: 'Vou receber novos templates?',
    answer: 'Sim. Novos templates são adicionados semanalmente com base nos casos de uso mais solicitados pela comunidade. Todos os templates novos ficam disponíveis automaticamente para todos os planos.'
  }
]

const steps = [
  {
    step: '1',
    icon: GitBranch,
    title: 'Escolha o template',
    description: 'Selecione o template que melhor se encaixa no seu caso de uso. Cada um vem com agentes pré-configurados e estratégia definida.'
  },
  {
    step: '2',
    icon: Bot,
    title: 'Personalize (opcional)',
    description: 'Ajuste os prompts de cada agente, vincule sua Knowledge Base, escolha os modelos de IA e defina o contexto do seu negócio.'
  },
  {
    step: '3',
    icon: Zap,
    title: 'Execute e veja o resultado',
    description: 'Envie a tarefa e acompanhe cada agente trabalhando em tempo real. Receba o resultado consolidado em segundos.'
  }
]

const popularTemplates = templates.filter(t => t.popular)

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Templates de Orquestração de Agentes IA — Sofia AI',
            description: 'Galeria de pipelines prontos de orquestração multi-agente para Marketing, Suporte, Pesquisa, Jurídico e mais.',
            url: 'https://sofiaia.roilabs.com.br/templates',
            publisher: { '@type': 'Organization', name: 'ROI Labs', url: 'https://roilabs.com.br' },
            hasPart: templates.map(t => ({
              '@type': 'SoftwareSourceCode',
              name: t.name,
              description: t.description,
              applicationCategory: t.category
            }))
          })
        }}
      />

      {/* Breadcrumb */}
      <div className="px-6 py-4 border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-foreground-tertiary">
          <Link href="/" className="hover:text-white transition-colors">Início</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-white">Templates</span>
        </div>
      </div>

      {/* Hero */}
      <section className="relative px-6 pt-16 pb-20 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-blue-500/5 rounded-full blur-3xl" />
        </div>
        <AnimatedSection className="max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-xs text-blue-300 mb-6">
            <GitBranch className="w-3.5 h-3.5" />
            {templates.length} templates prontos — atualizados semanalmente
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Templates de <GradientText>Orquestração</GradientText> Prontos
          </h1>
          <p className="text-lg md:text-xl text-foreground-tertiary max-w-2xl mx-auto mb-10">
            Pipelines de agentes IA pré-configurados para os casos de uso mais comuns.
            Marketing, Suporte, Pesquisa, Jurídico e mais.
            Um clique para criar e personalizar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" className="button-luxury px-8 py-3.5 text-base inline-flex items-center gap-2 justify-center">
              <Zap className="w-4 h-4" /> Usar Templates Grátis
            </Link>
            <Link href="/features/orchestrations" className="px-8 py-3.5 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-base text-center flex items-center gap-2 justify-center">
              Como funcionam <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </AnimatedSection>
      </section>

      {/* Stats */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="glass-card rounded-2xl p-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '9', label: 'Templates disponíveis' },
              { value: '3', label: 'Estratégias de execução' },
              { value: '~30s', label: 'Tempo médio de execução' },
              { value: 'Free', label: 'Para começar' }
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl md:text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-xs text-foreground-tertiary">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Templates */}
      <SectionWrapper>
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Mais Populares</h2>
            <p className="text-sm text-foreground-tertiary">Os templates mais usados pela comunidade Sofia</p>
          </div>
        </div>
        <AnimatedSection>
          <div className="grid md:grid-cols-3 gap-6">
            {popularTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} featured />
            ))}
          </div>
        </AnimatedSection>
      </SectionWrapper>

      {/* All Templates */}
      <SectionWrapper alt>
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Todos os Templates</h2>
            <p className="text-sm text-foreground-tertiary">{templates.length} pipelines prontos para usar</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-10">
          {categories.map((cat) => (
            <span
              key={cat}
              className={`px-4 py-1.5 rounded-full text-sm border transition-colors cursor-default ${
                cat === 'Todos'
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'border-white/10 text-foreground-secondary hover:bg-white/5'
              }`}
            >
              {cat}
            </span>
          ))}
        </div>
        <AnimatedSection>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        </AnimatedSection>
      </SectionWrapper>

      {/* How to use */}
      <SectionWrapper>
        <SectionHeader
          title="Como Usar um Template"
          description="Do template ao primeiro resultado em menos de 5 minutos."
        />
        <AnimatedSection direction="up" delay={0.1}>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((item) => (
              <div key={item.step} className="glass-card p-6 rounded-xl text-center">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-blue-400" />
                </div>
                <div className="text-xs text-white/30 font-mono mb-2">Passo {item.step}</div>
                <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-foreground-tertiary leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </SectionWrapper>

      <FAQSection items={faqItems} title="Perguntas sobre Templates" />

      <CTASection
        icon={BrainCircuit}
        title="Comece com um template agora"
        description="Grátis para começar. Sem cartão de crédito. Primeiro resultado em menos de 5 minutos."
        primaryCta={{ label: 'Criar Conta Grátis', href: '/login' }}
        secondaryCta={{ label: 'Como funcionam as orquestrações', href: '/features/orchestrations' }}
      />
    </div>
  )
}
