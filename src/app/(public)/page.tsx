import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Zap, Shield, CheckCircle, Play, ChevronRight, Users, BrainCircuit, Globe, Lock } from 'lucide-react'
import { GlowingFeaturesGrid } from '@/components/landing/GlowingFeaturesGrid'
import { PipelineSimulator } from '@/components/landing/PipelineSimulator'
import { FloatingPaths } from '@/components/ui/background-paths'
import { PricingGrid } from '@/components/landing/PricingGrid'
import { CTASection } from '@/components/landing/CTASection'
import { FAQSection } from '@/components/landing/FAQSection'
import { NewsletterSection } from '@/components/landing/NewsletterSection'
import { SectionWrapper, SectionHeader } from '@/components/landing/SectionWrapper'
import { GradientText } from '@/components/landing/GradientText'
import { AnimatedSection } from '@/components/landing/AnimatedSection'
import { AnimatedCounter } from '@/components/landing/AnimatedCounter'
import { TemplateTestDriveCard } from '@/components/landing/TemplateTestDriveCard'
import { homeComparisons, homeOrchestrationTemplates, homeFAQ } from '@/data/home'
import { plans } from '@/data/pricing'
import { prisma } from '@/lib/prisma'

interface AgentStep { agentId: string; role: string }

function dbToTemplateCard(o: {
  id: string
  name: string
  agents: unknown
  strategy: string
  config: unknown
}) {
  const steps = (o.agents as AgentStep[]) ?? []
  const cfg = (o.config as Record<string, string>) ?? {}
  return {
    orchestrationId: o.id,
    name: o.name,
    icon: cfg.landingIcon ?? '🤖',
    roles: steps.map((s) => s.role).filter(Boolean),
    time: cfg.landingTime ?? '~45s',
    category: o.strategy,
  }
}

export const metadata: Metadata = {
  title: 'Sofia — Plataforma de Orquestração de Agentes IA | ROI Labs',
  description: 'Crie equipes de agentes IA que trabalham juntos para resolver tarefas complexas. Orquestrações multi-agente, Knowledge Base com RAG semântico, IDE multi-modelo e canais de atendimento integrados. Free para começar.',
  keywords: ['orquestração de agentes ia', 'multi-agent ai', 'agentes ia para empresas', 'knowledge base rag', 'ia generativa', 'crewai alternativa', 'autogen alternativa', 'plataforma ia no-code', 'sofia ia'],
  openGraph: { title: 'Sofia — Plataforma de Orquestração de Agentes IA', description: 'Crie equipes de agentes IA que colaboram para resolver qualquer tarefa. Mais poderoso que CrewAI. Mais simples que AutoGen.', type: 'website', locale: 'pt_BR', siteName: 'Sofia AI' },
  twitter: { card: 'summary_large_image', title: 'Sofia — Multi-Agent AI Orchestration Platform', description: 'Build AI agent teams that collaborate on complex tasks. Knowledge Base with RAG, multi-model IDE, WhatsApp integration. Free to start.' },
  alternates: { canonical: 'https://sofiaia.roilabs.com.br' },
}

export default async function LandingPage() {
  // Try to pull real orchestrations marked as landing templates
  let liveTemplates: ReturnType<typeof dbToTemplateCard>[] = []
  try {
    const rows = await prisma.agentOrchestration.findMany({
      where: { isLandingTemplate: true, status: 'active' },
      orderBy: { updatedAt: 'desc' },
      take: 3,
      select: { id: true, name: true, agents: true, strategy: true, config: true },
    })
    liveTemplates = rows.map(dbToTemplateCard)
  } catch {
    // Silently fall back to static templates if DB is unavailable
  }

  // Fall back to hardcoded static templates when none configured in DB
  const templateCards = liveTemplates.length > 0 ? liveTemplates : homeOrchestrationTemplates.map((t) => ({
    orchestrationId: null,
    name: t.name,
    icon: t.icon,
    roles: t.roles,
    time: t.time,
    category: t.category,
  }))

  return (
    <div className="bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Sofia AI', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' }, description: 'Plataforma de orquestração de agentes IA com Knowledge Base RAG, IDE multi-modelo e canais integrados.' }) }} />

      {/* Hero */}
      <section className="relative px-6 pt-20 pb-28 overflow-hidden bg-dot-grid">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
          <div className="glow-orb absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-500/6 rounded-full blur-3xl" />
          <div className="glow-orb-slow absolute top-40 left-1/3 w-[400px] h-[300px] bg-purple-500/6 rounded-full blur-3xl" />
          <div className="glow-orb-reverse absolute bottom-10 right-1/4 w-[300px] h-[300px] bg-cyan-500/4 rounded-full blur-3xl" />
        </div>
        <AnimatedSection direction="fade" delay={0.1}>
        <div className="max-w-7xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-sm text-blue-300 mb-8">
            <Zap className="w-4 h-4" />
            Novo: Replay de execuções + Export PDF + Suporte a PDF/DOCX na KB
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-6 animate-fade-in-up leading-[1.1]">
            Orquestrações de<br />
            <GradientText>Agentes IA</GradientText>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">que funcionam.</span>
          </h1>
          <p className="text-lg md:text-xl text-foreground-tertiary max-w-2xl mx-auto mb-4">
            Monte pipelines visuais de agentes que colaboram para resolver tarefas complexas. Knowledge Base com RAG semântico. IDE multi-modelo. Canais integrados.
          </p>
          <p className="text-sm text-foreground-tertiary/60 mb-12">Mais simples que CrewAI. Mais completo que AutoGen. Self-hosted ou cloud.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/login" className="button-luxury px-8 py-3.5 text-base inline-flex items-center gap-2 justify-center">
              <Play className="w-4 h-4" /> Começar Grátis — sem cartão
            </Link>
            <Link href="/como-funciona" className="px-8 py-3.5 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-base text-center flex items-center gap-2 justify-center">
              Ver como funciona <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto mb-16">
            {[
              { n: 50, s: '+', d: '', label: 'Modelos IA suportados' },
              { n: 0, s: '', d: 'pgvector', label: 'Busca semântica real' },
              { n: 3, s: '', d: '', label: 'Estratégias de orquestração' },
              { n: 0, s: '', d: 'Free', label: 'Para começar' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
                  {stat.d ? stat.d : <AnimatedCounter value={stat.n} suffix={stat.s} />}
                </div>
                <div className="text-xs text-foreground-tertiary mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
          {/* Pipeline Simulator — interativo */}
          <div className="max-w-3xl mx-auto">
            <PipelineSimulator />
          </div>
        </div>
        </AnimatedSection>
      </section>

      {/* Features — Bento grid com GlowingEffect */}
      <SectionWrapper id="features" className="border-t border-white/5">
        <AnimatedSection>
          <SectionHeader title="Tudo que você precisa para orquestrar agentes IA" description="Da criação do agente à execução em produção — com analytics, replay e Knowledge Base integrados." />
        </AnimatedSection>
        <GlowingFeaturesGrid />
      </SectionWrapper>

      {/* Templates */}
      <SectionWrapper id="templates" alt>
        <div className="max-w-5xl mx-auto">
          <AnimatedSection>
            <SectionHeader title="Comece em Segundos com Templates" description="Orquestrações pré-configuradas para os casos de uso mais comuns. Um clique para criar." className="mb-12" />
          </AnimatedSection>
          <div className="grid md:grid-cols-3 gap-6">
            {templateCards.map((template) => (
              <TemplateTestDriveCard key={template.name} template={template} />
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/templates" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
              Ver todos os templates <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </SectionWrapper>

      {/* Comparativo */}
      <SectionWrapper id="comparativo">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection>
            <SectionHeader title="Sofia vs. Concorrentes" description="Por que times escolhem Sofia em vez de CrewAI, AutoGen ou LangFlow?" className="mb-12" />
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-white/60 font-medium">Funcionalidade</th>
                    <th className="p-4 text-center"><div className="flex flex-col items-center gap-1"><span className="font-bold text-white">Sofia</span><span className="text-[10px] text-blue-400">Recomendado</span></div></th>
                    <th className="p-4 text-center text-white/40 font-medium">CrewAI</th>
                    <th className="p-4 text-center text-white/40 font-medium">AutoGen</th>
                    <th className="p-4 text-center text-white/40 font-medium">LangFlow</th>
                  </tr>
                </thead>
                <tbody>
                  {homeComparisons.map((row, i) => (
                    <tr key={row.feature} className={i % 2 === 0 ? 'bg-white/2' : ''}>
                      <td className="p-4 text-white/70">{row.feature}</td>
                      {(['sofia', 'crewai', 'autogen', 'langflow'] as const).map((k) => (
                        <td key={k} className="p-4 text-center">
                          {row[k] ? <CheckCircle className={`w-5 h-5 mx-auto ${k === 'sofia' ? 'text-green-400' : 'text-white/30'}`} /> : <span className="text-white/20">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </AnimatedSection>
        </div>
      </SectionWrapper>

      {/* Pricing */}
      <SectionWrapper id="pricing" alt>
        <AnimatedSection>
          <SectionHeader title="Pricing Transparente" description="Comece grátis. Escale conforme cresce. Sem surpresas na fatura." />
        </AnimatedSection>
        <PricingGrid plans={plans} />
      </SectionWrapper>

      {/* Trust */}
      <section className="px-6 py-16 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {[{ icon: Shield, title: 'Dados seguros', desc: 'HTTPS, dados isolados por tenant, backups automáticos.' }, { icon: Lock, title: 'Self-hosted disponível', desc: 'Rode na sua infra com Docker Compose. Controle total.' }, { icon: Globe, title: 'Multi-modelo', desc: 'Groq, OpenAI, Anthropic, e 50+ modelos via OpenRouter.' }].map((item) => (
              <div key={item.title} className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-white/60" />
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">{item.title}</h4>
                  <p className="text-sm text-foreground-tertiary">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          </AnimatedSection>
        </div>
      </section>

      <CTASection
        icon={BrainCircuit}
        title="Comece a orquestrar agentes IA hoje"
        description="Grátis para começar. Sem configuração complexa. Primeira orquestração em menos de 5 minutos."
        secondaryCta={{ label: 'Falar com Especialista', href: '/contato', icon: Users }}
      />

      <FAQSection items={homeFAQ} />
      <NewsletterSection source="landing" />
    </div>
  )
}
