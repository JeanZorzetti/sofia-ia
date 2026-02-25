import type { Metadata } from 'next'
import Link from 'next/link'
import {
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
  Globe,
  Lock,
  BookOpen
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Sofia AI — Multi-Agent AI Orchestration Platform',
  description:
    'Build teams of AI agents that collaborate to solve complex tasks. Multi-agent orchestration, semantic Knowledge Base with RAG, multi-model IDE, and integrated channels. Free to start.',
  keywords: [
    'ai agent orchestration',
    'multi-agent ai platform',
    'ai agents for business',
    'knowledge base rag',
    'generative ai',
    'crewai alternative',
    'autogen alternative',
    'no-code ai platform',
    'sofia ai',
    'ai workflow automation',
  ],
  openGraph: {
    title: 'Sofia AI — Multi-Agent AI Orchestration Platform',
    description:
      'Build AI agent teams that collaborate to solve any task. More powerful than CrewAI. Simpler than AutoGen.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Sofia AI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sofia AI — Multi-Agent AI Orchestration Platform',
    description:
      'Build AI agent teams that collaborate on complex tasks. Knowledge Base with RAG, multi-model IDE, WhatsApp integration. Free to start.',
  },
  alternates: {
    canonical: 'https://sofiaia.roilabs.com.br/en',
    languages: {
      'pt-BR': 'https://sofiaia.roilabs.com.br',
      'en-US': 'https://sofiaia.roilabs.com.br/en',
    },
  },
}

const features = [
  {
    icon: GitBranch,
    title: 'Multi-Agent Orchestration',
    description:
      'Build visual pipelines where each agent has a role: Researcher, Analyst, Reviewer. Sequential, parallel, and consensus strategies.',
    badge: 'Core',
    color: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
  },
  {
    icon: Database,
    title: 'Knowledge Base with RAG',
    description:
      'Vectorize PDF, DOCX, and CSV documents. Semantic search with pgvector similarity scores. Agents with real business context.',
    badge: 'RAG',
    color: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
  },
  {
    icon: BrainCircuit,
    title: 'Multi-Model IDE',
    description:
      'Test and compare Groq, OpenAI, Anthropic, and 50+ models side by side. Real-time streaming with cost and token metrics.',
    badge: 'Dev',
    color: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30',
  },
  {
    icon: MessageSquare,
    title: 'Unified Inbox',
    description:
      'WhatsApp, web chat, and multiple channels in one screen. AI agents respond automatically with intelligent escalation to humans.',
    badge: 'Channels',
    color: 'from-green-500/20 to-green-600/20 border-green-500/30',
  },
  {
    icon: BarChart3,
    title: 'Orchestration Analytics',
    description:
      'Dashboard with cost per execution, tokens used, success rate, and average time. Full history with execution replay.',
    badge: 'BI',
    color: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30',
  },
  {
    icon: Code2,
    title: 'Ready-Made Templates',
    description:
      'Start in seconds with templates for Marketing (Researcher → Copywriter → Reviewer), Support, Research, and more.',
    badge: 'Templates',
    color: 'from-pink-500/20 to-pink-600/20 border-pink-500/30',
  },
]

const comparisons = [
  { feature: 'Visual no-code interface', sofia: true, crewai: false, autogen: false, langflow: true },
  { feature: 'Built-in Knowledge Base with RAG', sofia: true, crewai: false, autogen: false, langflow: false },
  { feature: 'Per-agent SSE streaming', sofia: true, crewai: false, autogen: false, langflow: false },
  { feature: 'WhatsApp / multi-channel integration', sofia: true, crewai: false, autogen: false, langflow: false },
  { feature: 'Per-execution cost analytics', sofia: true, crewai: false, autogen: false, langflow: false },
  { feature: 'Execution replay', sofia: true, crewai: false, autogen: false, langflow: false },
  { feature: 'Self-hosted (Docker)', sofia: true, crewai: true, autogen: true, langflow: true },
  { feature: 'Multiple models (Groq, OpenAI...)', sofia: true, crewai: true, autogen: true, langflow: true },
]

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'For experimenting and exploring',
    highlight: false,
    features: [
      '3 orchestrations',
      '5 agents',
      '1 Knowledge Base',
      '100 executions/month',
      'Multi-model IDE',
      'Email support',
    ],
    cta: 'Start Free',
    ctaHref: '/login',
  },
  {
    name: 'Pro',
    price: '$59',
    period: '/month',
    description: 'For teams and small businesses',
    highlight: true,
    features: [
      'Unlimited orchestrations',
      '20 agents',
      '10 Knowledge Bases',
      '2,000 executions/month',
      'WhatsApp integration',
      'Advanced analytics',
      'Execution replay',
      'Priority support',
    ],
    cta: 'Subscribe Pro',
    ctaHref: '/login',
  },
  {
    name: 'Business',
    price: '$199',
    period: '/month',
    description: 'For high-demand enterprises',
    highlight: false,
    features: [
      'Everything in Pro',
      'Unlimited agents',
      'Unlimited KBs',
      'Unlimited executions',
      'Full multi-channel',
      'Public API',
      '99.9% SLA',
      'Dedicated support',
    ],
    cta: 'Talk to Sales',
    ctaHref: 'mailto:contato@roilabs.com.br',
  },
]

export default function EnLandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
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
              priceCurrency: 'USD',
            },
            description:
              'Multi-agent AI orchestration platform with Knowledge Base RAG, multi-model IDE, and integrated channels.',
            inLanguage: 'en',
            availableLanguage: ['en', 'pt-BR'],
          }),
        }}
      />



      {/* Hero */}
      <section className="relative px-6 pt-20 pb-28 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute top-40 left-1/3 w-[400px] h-[300px] bg-purple-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-sm text-blue-300 mb-8">
            <Globe className="w-4 h-4" />
            Now available in English — Marketplace + Public API
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            AI Agent
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Orchestration
            </span>{' '}
            That Works
          </h1>

          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-4">
            Build visual pipelines of collaborating AI agents for complex tasks. Knowledge Base
            with semantic RAG. Multi-model IDE. Integrated channels.
          </p>

          <p className="text-sm text-white/30 mb-12">
            Simpler than CrewAI. More complete than AutoGen. Self-hosted or cloud.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/login"
              className="button-luxury px-8 py-3.5 text-base inline-flex items-center gap-2 justify-center"
            >
              <Play className="w-4 h-4" />
              Start Free — no credit card
            </Link>
            <Link
              href="/como-funciona"
              className="px-8 py-3.5 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-base text-center flex items-center gap-2 justify-center"
            >
              See how it works <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto mb-16">
            {[
              { value: '50+', label: 'AI Models supported' },
              { value: 'pgvector', label: 'Real semantic search' },
              { value: '3', label: 'Orchestration strategies' },
              { value: 'Free', label: 'To get started' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-white/40 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Pipeline Demo */}
          <div className="max-w-3xl mx-auto">
            <div className="glass-card p-6 rounded-2xl">
              <p className="text-xs text-white/30 mb-4 text-left">Marketing Pipeline — live execution</p>
              <div className="flex items-center gap-2 md:gap-4 justify-center flex-wrap">
                {['Researcher', 'Copywriter', 'Reviewer'].map((role, i) => (
                  <div key={role} className="flex items-center gap-2 md:gap-4">
                    <div
                      className={`flex flex-col items-center ${i === 1 ? 'opacity-100' : i === 0 ? 'opacity-60' : 'opacity-30'}`}
                    >
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center border text-xs font-medium ${
                          i === 0
                            ? 'bg-green-500/20 border-green-500/40 text-green-300'
                            : i === 1
                            ? 'bg-blue-500/20 border-blue-500/40 text-blue-300 animate-pulse'
                            : 'bg-white/5 border-white/10 text-white/40'
                        }`}
                      >
                        <Bot className="w-5 h-5" />
                      </div>
                      <span className="text-xs text-white/60 mt-2">{role}</span>
                      {i === 0 && <span className="text-[10px] text-green-400 mt-1">Done</span>}
                      {i === 1 && (
                        <span className="text-[10px] text-blue-400 mt-1 animate-pulse">
                          Processing...
                        </span>
                      )}
                      {i === 2 && <span className="text-[10px] text-white/30 mt-1">Waiting</span>}
                    </div>
                    {i < 2 && <ArrowRight className="w-4 h-4 text-white/20 flex-shrink-0" />}
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-left">
                <p className="text-xs text-green-300 font-mono">
                  Researcher: &ldquo;Found 5 trends in the SaaS market for 2026. The main one is...&rdquo;
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to orchestrate AI agents
            </h2>
            <p className="text-white/40 max-w-xl mx-auto">
              From agent creation to production execution — with analytics, replay, and integrated
              Knowledge Base.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className={`glass-card p-6 rounded-xl border bg-gradient-to-br ${feature.color} hover-scale`}
              >
                <div className="flex items-start justify-between mb-4">
                  <feature.icon className="w-8 h-8 text-white" />
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                    {feature.badge}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section id="comparison" className="px-6 py-24 bg-[#0d0d15]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Sofia AI vs. Competitors</h2>
            <p className="text-white/40 max-w-xl mx-auto">
              Why teams choose Sofia over CrewAI, AutoGen, or LangFlow?
            </p>
          </div>

          <div className="glass-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-white/60 font-medium">Feature</th>
                    <th className="p-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-bold text-white">Sofia AI</span>
                        <span className="text-[10px] text-blue-400">Recommended</span>
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
                        {row.sofia ? (
                          <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {row.crewai ? (
                          <CheckCircle className="w-5 h-5 text-white/30 mx-auto" />
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {row.autogen ? (
                          <CheckCircle className="w-5 h-5 text-white/30 mx-auto" />
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {row.langflow ? (
                          <CheckCircle className="w-5 h-5 text-white/30 mx-auto" />
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
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
      <section id="pricing" className="px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Transparent Pricing</h2>
            <p className="text-white/40 max-w-xl mx-auto">
              Start free. Scale as you grow. No surprises.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 relative ${
                  plan.highlight
                    ? 'bg-gradient-to-b from-blue-500/20 to-purple-500/20 border-2 border-blue-500/40'
                    : 'glass-card'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 bg-blue-500 rounded-full text-xs font-medium text-white">
                    <Star className="w-3 h-3" />
                    Most Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
                  <p className="text-white/40 text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-white/40 text-sm">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-white/60"
                    >
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.ctaHref}
                  className={`block text-center py-3 px-6 rounded-xl font-medium transition-all ${
                    plan.highlight
                      ? 'bg-blue-500 hover:bg-blue-400 text-white'
                      : 'border border-white/20 hover:bg-white/5 text-white'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-white/20 text-sm mt-8">
            All plans include SSL, automatic backups, and free updates.
          </p>
        </div>
      </section>

      {/* Trust signals */}
      <section className="px-6 py-16 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {[
              {
                icon: Shield,
                title: 'Secure Data',
                desc: 'HTTPS, tenant-isolated data, automatic backups.',
              },
              {
                icon: Lock,
                title: 'Self-hosted Available',
                desc: 'Run on your own infra with Docker Compose. Full control.',
              },
              {
                icon: Globe,
                title: 'Multi-model',
                desc: 'Groq, OpenAI, Anthropic, and 50+ models via OpenRouter.',
              },
            ].map((item) => (
              <div key={item.title} className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-white/60" />
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">{item.title}</h4>
                  <p className="text-sm text-white/40">{item.desc}</p>
                </div>
              </div>
            ))}
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
                name: 'What is AI agent orchestration?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'AI agent orchestration is the coordination of multiple AI agents to work together on complex tasks. Each agent has a specific role (e.g., Researcher, Analyst, Reviewer) and the output of one feeds into the next, creating an intelligent pipeline.',
                },
              },
              {
                '@type': 'Question',
                name: 'Is Sofia AI an alternative to CrewAI?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Yes. Sofia AI offers everything CrewAI offers (multi-agent orchestration) plus a visual no-code interface, built-in Knowledge Base with RAG, integrated channels (WhatsApp), detailed analytics, and execution replay. It is more complete and accessible.',
                },
              },
              {
                '@type': 'Question',
                name: 'Can I use Sofia AI for free?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Yes. The Free plan includes 3 orchestrations, 5 agents, 1 Knowledge Base, and 100 executions per month. No credit card required to start.',
                },
              },
            ],
          }),
        }}
      />

      {/* CTA Final */}
      <section className="px-6 py-24 bg-[#0d0d15]">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
            <BrainCircuit className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Start orchestrating AI agents today
          </h2>
          <p className="text-white/40 mb-8 text-lg max-w-xl mx-auto">
            Free to start. No complex setup. First orchestration in under 5 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="button-luxury px-10 py-4 text-base inline-flex items-center gap-2 justify-center"
            >
              Create Free Account <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/contato"
              className="px-10 py-4 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-base inline-flex items-center gap-2 justify-center"
            >
              <Users className="w-5 h-5" />
              Talk to an Expert
            </Link>
          </div>
        </div>
      </section>


    </div>
  )
}
