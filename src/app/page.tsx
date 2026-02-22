import type { Metadata } from 'next'
import Link from 'next/link'
import {
  BookOpen,
  ArrowRight,
  Bot,
  GitBranch,
  Database,
  MessageSquare,
  Zap,
  Shield,
  CheckCircle,
  Star,
  Play,
  ChevronRight,
  Users,
  BarChart3,
  BrainCircuit,
  Code2,
  Layers,
  Globe,
  Lock
} from 'lucide-react'
import NewsletterForm from '@/components/NewsletterForm'

export const metadata: Metadata = {
  title: 'Sofia — Plataforma de Orquestração de Agentes IA | ROI Labs',
  description: 'Crie equipes de agentes IA que trabalham juntos para resolver tarefas complexas. Orquestrações multi-agente, Knowledge Base com RAG semântico, IDE multi-modelo e canais de atendimento integrados. Free para começar.',
  keywords: [
    'orquestração de agentes ia',
    'multi-agent ai',
    'agentes ia para empresas',
    'knowledge base rag',
    'ia generativa',
    'crewai alternativa',
    'autogen alternativa',
    'plataforma ia no-code',
    'sofia ia'
  ],
  openGraph: {
    title: 'Sofia — Plataforma de Orquestração de Agentes IA',
    description: 'Crie equipes de agentes IA que colaboram para resolver qualquer tarefa. Mais poderoso que CrewAI. Mais simples que AutoGen.',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Sofia AI'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sofia — Multi-Agent AI Orchestration Platform',
    description: 'Build AI agent teams that collaborate on complex tasks. Knowledge Base with RAG, multi-model IDE, WhatsApp integration. Free to start.'
  },
  alternates: {
    canonical: 'https://sofiaia.roilabs.com.br'
  }
}

const features = [
  {
    icon: GitBranch,
    title: 'Orquestração Multi-Agente',
    description: 'Monte pipelines visuais onde cada agente tem um papel: Pesquisador, Analista, Revisor. Estratégias sequencial, paralela e consenso.',
    badge: 'Core',
    color: 'from-blue-500/20 to-blue-600/20 border-blue-500/30'
  },
  {
    icon: Database,
    title: 'Knowledge Base com RAG',
    description: 'Vetorize documentos PDF, DOCX e CSV. Busca semântica pgvector com score de similaridade. Agentes com contexto real do seu negócio.',
    badge: 'P1',
    color: 'from-purple-500/20 to-purple-600/20 border-purple-500/30'
  },
  {
    icon: BrainCircuit,
    title: 'IDE Multi-Modelo',
    description: 'Teste e compare Groq, OpenAI, Anthropic e 50+ modelos lado a lado. Streaming em tempo real com métricas de custo e tokens.',
    badge: 'Dev',
    color: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30'
  },
  {
    icon: MessageSquare,
    title: 'Inbox Unificado',
    description: 'WhatsApp, chat web e múltiplos canais em uma tela. Agentes IA respondem automaticamente com escalada inteligente para humanos.',
    badge: 'Canais',
    color: 'from-green-500/20 to-green-600/20 border-green-500/30'
  },
  {
    icon: BarChart3,
    title: 'Analytics de Orquestrações',
    description: 'Dashboard com custo por execução, tokens utilizados, taxa de sucesso e tempo médio. Histórico completo com replay de execuções.',
    badge: 'BI',
    color: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30'
  },
  {
    icon: Code2,
    title: 'Templates Prontos',
    description: 'Comece em segundos com templates de Marketing (Pesquisador → Copywriter → Revisor), Suporte, Pesquisa e muito mais.',
    badge: 'Templates',
    color: 'from-pink-500/20 to-pink-600/20 border-pink-500/30'
  }
]

const comparisons = [
  { feature: 'Interface visual no-code', sofia: true, crewai: false, autogen: false, langflow: true },
  { feature: 'Knowledge Base com RAG embutido', sofia: true, crewai: false, autogen: false, langflow: false },
  { feature: 'Streaming SSE por agente', sofia: true, crewai: false, autogen: false, langflow: false },
  { feature: 'WhatsApp/multi-canal integrado', sofia: true, crewai: false, autogen: false, langflow: false },
  { feature: 'Analytics de custo por execução', sofia: true, crewai: false, autogen: false, langflow: false },
  { feature: 'Replay de execuções', sofia: true, crewai: false, autogen: false, langflow: false },
  { feature: 'Self-hosted (Docker)', sofia: true, crewai: true, autogen: true, langflow: true },
  { feature: 'Modelos múltiplos (Groq, OpenAI...)', sofia: true, crewai: true, autogen: true, langflow: true },
]

const plans = [
  {
    name: 'Free',
    price: 'R$0',
    period: '/mês',
    description: 'Para experimentar e explorar',
    highlight: false,
    features: [
      '3 orquestrações',
      '5 agentes',
      '1 Knowledge Base',
      '100 execuções/mês',
      'IDE multi-modelo',
      'Suporte por email'
    ],
    cta: 'Começar Grátis',
    ctaHref: '/login'
  },
  {
    name: 'Pro',
    price: 'R$297',
    period: '/mês',
    description: 'Para times e pequenas empresas',
    highlight: true,
    features: [
      'Orquestrações ilimitadas',
      '20 agentes',
      '10 Knowledge Bases',
      '2.000 execuções/mês',
      'WhatsApp integrado',
      'Analytics avançado',
      'Replay de execuções',
      'Suporte prioritário'
    ],
    cta: 'Assinar Pro',
    ctaHref: '/login'
  },
  {
    name: 'Business',
    price: 'R$997',
    period: '/mês',
    description: 'Para empresas com alta demanda',
    highlight: false,
    features: [
      'Tudo do Pro',
      'Agentes ilimitados',
      'KBs ilimitadas',
      'Execuções ilimitadas',
      'Multi-canal completo',
      'API pública',
      'SLA 99.9%',
      'Suporte dedicado'
    ],
    cta: 'Falar com Vendas',
    ctaHref: 'mailto:contato@roilabs.com.br'
  }
]

const orchestrationTemplates = [
  {
    icon: '✍️',
    name: 'Pipeline de Marketing',
    roles: ['Pesquisador', 'Copywriter', 'Revisor'],
    time: '~45s',
    category: 'marketing'
  },
  {
    icon: '🎯',
    name: 'Triagem de Suporte',
    roles: ['Triagem', 'Atendente', 'Escalação'],
    time: '~30s',
    category: 'suporte'
  },
  {
    icon: '🔬',
    name: 'Pesquisa & Síntese',
    roles: ['Coletor', 'Analista', 'Sintetizador'],
    time: '~60s',
    category: 'pesquisa'
  }
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* SEO Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Sofia AI',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'BRL'
            },
            description: 'Plataforma de orquestração de agentes IA com Knowledge Base RAG, IDE multi-modelo e canais integrados.'
          })
        }}
      />

      {/* Navbar */}
      <nav className="navbar-glass sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="https://sofiaia.roilabs.com.br/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <BrainCircuit className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">Sofia AI</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/features" className="text-foreground-secondary hover:text-white transition-colors text-sm">Features</Link>
            <Link href="/marketplace" className="text-foreground-secondary hover:text-white transition-colors text-sm">Marketplace</Link>
            <Link href="/preco" className="text-foreground-secondary hover:text-white transition-colors text-sm">Preço</Link>
            <Link href="/templates" className="text-foreground-secondary hover:text-white transition-colors text-sm">Templates</Link>
            <Link href="/blog" className="text-foreground-secondary hover:text-white transition-colors text-sm flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              Blog
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-foreground-secondary hover:text-white transition-colors">
              Entrar
            </Link>
            <Link href="/login" className="button-luxury px-5 py-2 text-sm flex items-center gap-1.5">
              Começar Grátis <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 pt-20 pb-28 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute top-40 left-1/3 w-[400px] h-[300px] bg-purple-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-sm text-blue-300 mb-8">
            <Zap className="w-4 h-4" />
            Novo: Replay de execuções + Export PDF + Suporte a PDF/DOCX na KB
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 animate-fade-in-up">
            Orquestrações de<br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Agentes IA
            </span>
            {' '}que Funcionam
          </h1>

          <p className="text-lg md:text-xl text-foreground-tertiary max-w-2xl mx-auto mb-4">
            Monte pipelines visuais de agentes que colaboram para resolver tarefas complexas.
            Knowledge Base com RAG semântico. IDE multi-modelo. Canais integrados.
          </p>

          <p className="text-sm text-foreground-tertiary/60 mb-12">
            Mais simples que CrewAI. Mais completo que AutoGen. Self-hosted ou cloud.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/login" className="button-luxury px-8 py-3.5 text-base inline-flex items-center gap-2 justify-center">
              <Play className="w-4 h-4" />
              Começar Grátis — sem cartão
            </Link>
            <Link href="/como-funciona" className="px-8 py-3.5 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-base text-center flex items-center gap-2 justify-center">
              Ver como funciona <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto mb-16">
            {[
              { value: '50+', label: 'Modelos IA suportados' },
              { value: 'pgvector', label: 'Busca semântica real' },
              { value: '3', label: 'Estratégias de orquestração' },
              { value: 'Free', label: 'Para começar' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-foreground-tertiary mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Pipeline Demo */}
          <div className="max-w-3xl mx-auto">
            <div className="glass-card p-6 rounded-2xl">
              <p className="text-xs text-white/40 mb-4 text-left">Pipeline de Marketing em execução</p>
              <div className="flex items-center gap-2 md:gap-4 justify-center flex-wrap">
                {['Pesquisador', 'Copywriter', 'Revisor'].map((role, i) => (
                  <div key={role} className="flex items-center gap-2 md:gap-4">
                    <div className={`flex flex-col items-center ${i === 1 ? 'opacity-100' : i === 0 ? 'opacity-60' : 'opacity-30'}`}>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border text-xs font-medium ${i === 0 ? 'bg-green-500/20 border-green-500/40 text-green-300' : i === 1 ? 'bg-blue-500/20 border-blue-500/40 text-blue-300 animate-pulse' : 'bg-white/5 border-white/10 text-white/40'}`}>
                        <Bot className="w-5 h-5" />
                      </div>
                      <span className="text-xs text-white/60 mt-2">{role}</span>
                      {i === 0 && <span className="text-[10px] text-green-400 mt-1">Concluido</span>}
                      {i === 1 && <span className="text-[10px] text-blue-400 mt-1 animate-pulse">Processando...</span>}
                      {i === 2 && <span className="text-[10px] text-white/30 mt-1">Aguardando</span>}
                    </div>
                    {i < 2 && <ArrowRight className="w-4 h-4 text-white/20 flex-shrink-0" />}
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-left">
                <p className="text-xs text-green-300 font-mono">
                  Pesquisador: &ldquo;Encontrei 5 tendências no mercado de SaaS para 2026. A principal é...&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Tudo que você precisa para orquestrar agentes IA</h2>
            <p className="text-foreground-tertiary max-w-xl mx-auto">
              Da criação do agente à execução em produção — com analytics, replay e Knowledge Base integrados.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className={`glass-card p-6 rounded-xl border bg-gradient-to-br ${feature.color} hover-scale`}>
                <div className="flex items-start justify-between mb-4">
                  <feature.icon className="w-8 h-8 text-white" />
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                    {feature.badge}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-foreground-tertiary leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Templates */}
      <section id="templates" className="px-6 py-24 bg-background-secondary">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Comece em Segundos com Templates</h2>
            <p className="text-foreground-tertiary max-w-xl mx-auto">
              Orquestrações pré-configuradas para os casos de uso mais comuns. Um clique para criar.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {orchestrationTemplates.map((template) => (
              <div key={template.name} className="glass-card p-6 rounded-xl hover-scale">
                <div className="text-3xl mb-4">{template.icon}</div>
                <h3 className="font-semibold text-white mb-3">{template.name}</h3>
                <div className="flex items-center gap-1 mb-4 flex-wrap">
                  {template.roles.map((role, i) => (
                    <div key={role} className="flex items-center gap-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                        {role}
                      </span>
                      {i < template.roles.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-white/20" />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-white/40">
                  <span>Tempo estimado: {template.time}</span>
                  <span className="capitalize">{template.category}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link
              href="/templates"
              className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
            >
              Ver todos os templates <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Comparativo */}
      <section id="comparativo" className="px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Sofia vs. Concorrentes</h2>
            <p className="text-foreground-tertiary max-w-xl mx-auto">
              Por que times escolhem Sofia em vez de CrewAI, AutoGen ou LangFlow?
            </p>
          </div>

          <div className="glass-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-white/60 font-medium">Funcionalidade</th>
                    <th className="p-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-bold text-white">Sofia</span>
                        <span className="text-[10px] text-blue-400">Recomendado</span>
                      </div>
                    </th>
                    <th className="p-4 text-center text-white/40 font-medium">CrewAI</th>
                    <th className="p-4 text-center text-white/40 font-medium">AutoGen</th>
                    <th className="p-4 text-center text-white/40 font-medium">LangFlow</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((row, i) => (
                    <tr key={row.feature} className={i % 2 === 0 ? 'bg-white/2' : ''}>
                      <td className="p-4 text-white/70">{row.feature}</td>
                      <td className="p-4 text-center">
                        {row.sofia ? <CheckCircle className="w-5 h-5 text-green-400 mx-auto" /> : <span className="text-white/20">—</span>}
                      </td>
                      <td className="p-4 text-center">
                        {row.crewai ? <CheckCircle className="w-5 h-5 text-white/30 mx-auto" /> : <span className="text-white/20">—</span>}
                      </td>
                      <td className="p-4 text-center">
                        {row.autogen ? <CheckCircle className="w-5 h-5 text-white/30 mx-auto" /> : <span className="text-white/20">—</span>}
                      </td>
                      <td className="p-4 text-center">
                        {row.langflow ? <CheckCircle className="w-5 h-5 text-white/30 mx-auto" /> : <span className="text-white/20">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-24 bg-background-secondary">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Pricing Transparente</h2>
            <p className="text-foreground-tertiary max-w-xl mx-auto">
              Comece grátis. Escale conforme cresce. Sem surpresas na fatura.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 relative ${plan.highlight
                  ? 'bg-gradient-to-b from-blue-500/20 to-purple-500/20 border-2 border-blue-500/40'
                  : 'glass-card'
                  }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 bg-blue-500 rounded-full text-xs font-medium text-white">
                    <Star className="w-3 h-3" />
                    Mais Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
                  <p className="text-white/50 text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-white/40 text-sm">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
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
                    : 'border border-white/20 hover:bg-white/5 text-white'
                    }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-white/30 text-sm mt-8">
            Todos os planos incluem SSL, backups automáticos e atualizações gratuitas.
          </p>
        </div>
      </section>

      {/* Trust signals */}
      <section className="px-6 py-16 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {[
              { icon: Shield, title: 'Dados seguros', desc: 'HTTPS, dados isolados por tenant, backups automáticos.' },
              { icon: Lock, title: 'Self-hosted disponível', desc: 'Rode na sua infra com Docker Compose. Controle total.' },
              { icon: Globe, title: 'Multi-modelo', desc: 'Groq, OpenAI, Anthropic, e 50+ modelos via OpenRouter.' }
            ].map((item) => (
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
        </div>
      </section>

      {/* CTA Final */}
      <section className="px-6 py-24 bg-background-secondary">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
            <BrainCircuit className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Comece a orquestrar agentes IA hoje
          </h2>
          <p className="text-foreground-tertiary mb-8 text-lg max-w-xl mx-auto">
            Grátis para começar. Sem configuração complexa.
            Primeira orquestração em menos de 5 minutos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" className="button-luxury px-10 py-4 text-base inline-flex items-center gap-2 justify-center">
              Criar Conta Grátis <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/contato" className="px-10 py-4 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-base inline-flex items-center gap-2 justify-center">
              <Users className="w-5 h-5" />
              Falar com Especialista
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'O que é orquestração de agentes IA?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Orquestração de agentes IA é a coordenação de múltiplos agentes de inteligência artificial para trabalhar juntos em tarefas complexas. Cada agente tem um papel específico (ex: Pesquisador, Analista, Revisor) e a saída de um alimenta o próximo, criando um pipeline inteligente.'
                }
              },
              {
                '@type': 'Question',
                name: 'Sofia é alternativa ao CrewAI?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Sim. Sofia oferece tudo que o CrewAI oferece (orquestração multi-agente) mais interface visual no-code, Knowledge Base com RAG embutido, canais de atendimento integrados (WhatsApp), analytics detalhado e replay de execuções. É mais completo e acessível.'
                }
              },
              {
                '@type': 'Question',
                name: 'Posso usar o Sofia de graça?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Sim. O plano Free inclui 3 orquestrações, 5 agentes, 1 Knowledge Base e 100 execuções por mês. Não requer cartão de crédito para começar.'
                }
              }
            ]
          })
        }}
      />

      {/* Newsletter */}
      <section className="px-6 py-16 border-t border-white/5">
        <div className="max-w-xl mx-auto">
          <NewsletterForm
            source="landing"
            title="Newsletter de IA toda semana"
            description="Templates prontos, casos de uso reais e novidades sobre orquestração de agentes IA. Sem spam."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <BrainCircuit className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-white">Sofia AI</span>
              </div>
              <p className="text-foreground-tertiary text-sm max-w-xs">
                Plataforma de orquestração de agentes IA com Knowledge Base, IDE multi-modelo e canais integrados.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div>
                <h4 className="text-white font-medium text-sm mb-3">Produto</h4>
                <ul className="space-y-2">
                  {[
                    { label: 'Features', href: '/features' },
                    { label: 'Marketplace', href: '/marketplace' },
                    { label: 'Templates', href: '/templates' },
                    { label: 'Preço', href: '/preco' },
                    { label: 'Changelog', href: '/changelog' },
                  ].map(item => (
                    <li key={item.label}>
                      <Link href={item.href} className="text-foreground-tertiary hover:text-white text-sm transition-colors">
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-white font-medium text-sm mb-3">Recursos</h4>
                <ul className="space-y-2">
                  {[
                    { label: 'Documentação', href: '/documentacao' },
                    { label: 'API Reference', href: '/api-reference' },
                    { label: 'Self-hosted', href: '/self-hosted' },
                    { label: 'Status', href: '/status' },
                  ].map(item => (
                    <li key={item.label}>
                      <Link href={item.href} className="text-foreground-tertiary hover:text-white text-sm transition-colors">
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-white font-medium text-sm mb-3">Empresa</h4>
                <ul className="space-y-2">
                  {[
                    { label: 'ROI Labs', href: 'https://roilabs.com.br' },
                    { label: 'Blog', href: '/blog' },
                    { label: 'Early Access', href: '/early-access' },
                    { label: 'Contato', href: 'mailto:contato@roilabs.com.br' },
                    { label: 'GitHub', href: 'https://github.com/JeanZorzetti/sofia-ia' },
                    { label: 'English', href: '/en' }
                  ].map(item => (
                    <li key={item.label}>
                      <a href={item.href} className="text-foreground-tertiary hover:text-white text-sm transition-colors">
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-foreground-tertiary text-sm">
              &copy; 2026 ROI Labs. Sofia AI — Plataforma de Orquestração de Agentes IA.
            </p>
            <div className="flex gap-6">
              <Link href="/termos" className="text-foreground-tertiary hover:text-white text-sm transition-colors">Termos</Link>
              <Link href="/privacidade" className="text-foreground-tertiary hover:text-white text-sm transition-colors">Privacidade</Link>
              <Link href="/contato" className="text-foreground-tertiary hover:text-white text-sm transition-colors">Contato</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
