import type { Metadata } from 'next'
import Link from 'next/link'
import { GitBranch, Database, BrainCircuit, MessageSquare, BarChart3, Code2, ArrowRight, ArrowLeft, CheckCircle, Zap, Globe, Shield, RefreshCw, FileText, Bot, Layers } from 'lucide-react'
import { CTASection } from '@/components/landing/CTASection'
import { SectionWrapper } from '@/components/landing/SectionWrapper'
import { GradientText } from '@/components/landing/GradientText'

export const metadata: Metadata = {
  title: 'Features — Tudo que o Sofia AI oferece | ROI Labs',
  description: 'Conheça todas as funcionalidades do Sofia AI: orquestração multi-agente, Knowledge Base com RAG semântico, IDE multi-modelo, inbox unificado, analytics e muito mais.',
  keywords: ['features sofia ai', 'funcionalidades orquestração agentes ia', 'knowledge base rag', 'ide multi-modelo ia', 'inbox whatsapp ia', 'analytics agentes ia'],
  openGraph: { title: 'Features — Tudo que o Sofia AI oferece', description: 'Orquestração multi-agente, Knowledge Base RAG, IDE multi-modelo, inbox unificado e analytics. Tudo em uma plataforma.', type: 'website', locale: 'pt_BR' , images: [{ url: 'https://sofiaia.roilabs.com.br/opengraph-image', width: 1200, height: 630, alt: 'Sofia AI — Orquestração de Agentes IA' }]},
  alternates: { canonical: 'https://sofiaia.roilabs.com.br/features' },
}

const features = [
  { icon: GitBranch, title: 'Orquestração Multi-Agente', description: 'Monte pipelines visuais onde cada agente tem um papel específico. Estratégias sequencial, paralela e consenso. Streaming SSE em tempo real por agente.', href: '/features/orchestrations', badge: 'Core', color: 'from-blue-500/20 to-blue-600/20 border-blue-500/30', highlights: ['Editor visual drag-and-drop', 'Execução sequencial, paralela e consenso', 'Streaming SSE por agente', 'Histórico com replay de execuções'] },
  { icon: Database, title: 'Knowledge Base com RAG', description: 'Vetorize documentos PDF, DOCX, CSV e TXT. Busca semântica com pgvector. Agentes com contexto real do seu negócio.', href: '/features/orchestrations', badge: 'RAG', color: 'from-purple-500/20 to-purple-600/20 border-purple-500/30', highlights: ['Upload drag-and-drop', 'PDF, DOCX, CSV suportados', 'Busca semântica pgvector', 'Preview de chunks vetorizados'] },
  { icon: BrainCircuit, title: 'IDE Multi-Modelo', description: 'Teste e compare Groq, OpenAI, Anthropic e 50+ modelos lado a lado. Streaming em tempo real com métricas de custo e tokens por execução.', href: null, badge: 'Dev', color: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30', highlights: ['50+ modelos via OpenRouter', 'Comparação lado a lado', 'Métricas de custo por token', 'Streaming em tempo real'] },
  { icon: MessageSquare, title: 'Inbox Unificado', description: 'WhatsApp via Evolution API, chat web e múltiplos canais em uma tela. Agentes IA respondem automaticamente com escalada inteligente para humanos.', href: null, badge: 'Canais', color: 'from-green-500/20 to-green-600/20 border-green-500/30', highlights: ['WhatsApp Business integrado', 'Chat widget embeddable', 'Escalada automática para humanos', 'Histórico unificado de conversas'] },
  { icon: BarChart3, title: 'Analytics de Orquestrações', description: 'Dashboard com custo por execução, tokens utilizados, taxa de sucesso e tempo médio. Histórico completo com replay de execuções anteriores.', href: null, badge: 'BI', color: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30', highlights: ['Custo por execução em R$', 'Tokens e tempo por agente', 'Taxa de sucesso e erros', 'Replay de execuções passadas'] },
  { icon: Code2, title: 'Templates Prontos', description: '9+ templates de orquestração para Marketing, Suporte, Pesquisa, Jurídico, BI e mais. Pronto para usar em um clique.', href: '/templates', badge: 'Templates', color: 'from-pink-500/20 to-pink-600/20 border-pink-500/30', highlights: ['9 templates prontos', 'Marketing, Suporte, Pesquisa', 'Jurídico, BI, RH, Financeiro', 'Personalizável após criação'] },
]

const extras = [
  { icon: Shield, title: 'Dados Seguros', desc: 'HTTPS, isolamento por tenant, backups automáticos.' },
  { icon: Globe, title: 'Self-hosted', desc: 'Docker Compose disponível. Rode na sua infra.' },
  { icon: RefreshCw, title: 'Export de Resultados', desc: 'Exporte em PDF, Markdown, JSON ou CSV.' },
  { icon: FileText, title: 'Blog & Documentação', desc: 'Guias, tutoriais e referência de API completos.' },
  { icon: Layers, title: 'Multi-tenant Ready', desc: 'Arquitetura preparada para múltiplos workspaces.' },
  { icon: Bot, title: '50+ Modelos IA', desc: 'Groq, OpenAI, Anthropic, Mistral e OpenRouter.' },
]

export default function FeaturesPage() {
  return (
    <div className="bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Features — Sofia AI', description: 'Todas as funcionalidades da plataforma Sofia AI de orquestração de agentes IA.', url: 'https://sofiaia.roilabs.com.br/features' }) }} />

      {/* Hero */}
      <section className="px-6 pt-20 pb-16 text-center">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Voltar para home
          </Link>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-sm text-blue-300 mb-6">
            <Zap className="w-4 h-4" /> Plataforma completa de agentes IA
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Tudo que você precisa para<br />
            <GradientText>orquestrar agentes IA</GradientText>
          </h1>
          <p className="text-lg text-foreground-tertiary max-w-2xl mx-auto mb-10">
            Da criação do agente à execução em produção — com analytics, replay, Knowledge Base e canais integrados.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" className="button-luxury px-8 py-3.5 text-base inline-flex items-center gap-2 justify-center">
              Começar Grátis <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/templates" className="px-8 py-3.5 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-base text-center">
              Ver Templates
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid com highlights */}
      <SectionWrapper>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div key={feature.title} className={`glass-card p-6 rounded-xl border bg-gradient-to-br ${feature.color} flex flex-col`}>
              <div className="flex items-start justify-between mb-4">
                <feature.icon className="w-8 h-8 text-white" />
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">{feature.badge}</span>
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">{feature.title}</h2>
              <p className="text-sm text-foreground-tertiary leading-relaxed mb-4">{feature.description}</p>
              <ul className="space-y-1.5 mb-6 flex-1">
                {feature.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2 text-xs text-white/60">
                    <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />{h}
                  </li>
                ))}
              </ul>
              {feature.href ? (
                <Link href={feature.href} className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors mt-auto">
                  Saber mais <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <Link href="/login" className="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white/70 transition-colors mt-auto">
                  Experimentar grátis <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* Extras */}
      <SectionWrapper className="border-t border-white/5 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">E muito mais incluído</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {extras.map((item) => (
              <div key={item.title} className="glass-card p-5 rounded-xl flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-white/60" />
                </div>
                <div>
                  <h3 className="font-medium text-white text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-foreground-tertiary leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionWrapper>

      <CTASection
        title="Pronto para começar?"
        description="Grátis para sempre. Sem cartão de crédito. Primeira orquestração em 5 minutos."
        secondaryCta={{ label: 'Ver Planos e Preços', href: '/preco' }}
      />
    </div>
  )
}
