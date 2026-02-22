import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  XCircle,
  BrainCircuit,
  Zap,
  Star,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Sofia AI vs CrewAI vs AutoGen vs LangFlow — Comparativo Completo',
  description: 'Compare Sofia AI com CrewAI, AutoGen e LangFlow em usabilidade, preço, features e suporte. Veja por que times brasileiros escolhem Sofia para orquestração de agentes IA.',
  keywords: [
    'sofia vs crewai',
    'sofia vs autogen',
    'sofia vs langflow',
    'alternativa crewai',
    'alternativa autogen',
    'orquestração agentes ia comparativo',
    'melhor plataforma agentes ia',
  ],
  openGraph: {
    title: 'Sofia AI vs CrewAI vs AutoGen vs LangFlow',
    description: 'Comparativo completo entre as principais plataformas de orquestração de agentes IA. Interface visual, RAG, multi-canal e preço.',
    type: 'website',
    locale: 'pt_BR',
  },
  alternates: { canonical: 'https://sofiaia.roilabs.com.br/comparativo' },
}

const comparisons = [
  { feature: 'Interface visual no-code', sofia: true, crewai: false, autogen: false, langflow: true },
  { feature: 'Knowledge Base com RAG embutido', sofia: true, crewai: false, autogen: false, langflow: false },
  { feature: 'Streaming SSE por agente', sofia: true, crewai: false, autogen: false, langflow: false },
  { feature: 'WhatsApp / multi-canal integrado', sofia: true, crewai: false, autogen: false, langflow: false },
  { feature: 'Analytics de custo por execução', sofia: true, crewai: false, autogen: false, langflow: false },
  { feature: 'Replay de execuções', sofia: true, crewai: false, autogen: false, langflow: false },
  { feature: 'Templates prontos de orquestração', sofia: true, crewai: false, autogen: false, langflow: true },
  { feature: 'Self-hosted (Docker)', sofia: true, crewai: true, autogen: true, langflow: true },
  { feature: 'Multi-modelo (Groq, OpenAI…)', sofia: true, crewai: true, autogen: true, langflow: true },
  { feature: 'Suporte em português', sofia: true, crewai: false, autogen: false, langflow: false },
  { feature: 'Plano gratuito', sofia: true, crewai: true, autogen: true, langflow: true },
  { feature: 'SaaS gerenciado (sem infra)', sofia: true, crewai: false, autogen: false, langflow: true },
]

const tools = [
  {
    name: 'Sofia AI',
    tagline: 'Orquestração visual com RAG e multi-canal',
    pros: [
      'Interface visual no-code completa',
      'Knowledge Base com RAG semântico embutido',
      'WhatsApp e canais integrados',
      'Analytics detalhado por execução',
      'Suporte em português',
      'Onboarding em 5 minutos',
    ],
    cons: [
      'Plataforma mais recente',
      'Comunidade em crescimento',
    ],
    bestFor: 'Times brasileiros que precisam de orquestração visual, RAG e atendimento multi-canal sem código.',
    highlight: true,
  },
  {
    name: 'CrewAI',
    tagline: 'Orquestração Python para devs',
    pros: [
      'Framework Python maduro',
      'Grande comunidade open-source',
      'Flexibilidade total via código',
    ],
    cons: [
      'Requer Python e conhecimento técnico',
      'Sem interface visual',
      'Sem RAG embutido',
      'Sem canais de atendimento',
    ],
    bestFor: 'Desenvolvedores Python que querem controle total via código.',
    highlight: false,
  },
  {
    name: 'AutoGen',
    tagline: 'Framework multi-agente da Microsoft',
    pros: [
      'Pesquisa avançada em multi-agent',
      'Integração com Azure OpenAI',
      'Open-source da Microsoft',
    ],
    cons: [
      'Curva de aprendizado alta',
      'Foco em pesquisa, não produção',
      'Sem interface visual',
      'Sem RAG ou canais integrados',
    ],
    bestFor: 'Pesquisadores e equipes técnicas avançadas da Microsoft.',
    highlight: false,
  },
  {
    name: 'LangFlow',
    tagline: 'Builder visual de fluxos LangChain',
    pros: [
      'Interface visual drag-and-drop',
      'Ecossistema LangChain',
      'Bom para prototipagem',
    ],
    cons: [
      'Baseado em LangChain (complexidade)',
      'Sem RAG nativo simplificado',
      'Sem canais (WhatsApp, etc.)',
      'Analytics limitado',
    ],
    bestFor: 'Prototipagem rápida com fluxos LangChain.',
    highlight: false,
  },
]

export default function ComparativoPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'Sofia AI é melhor que CrewAI?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Depende do uso. Sofia AI oferece interface visual no-code, Knowledge Base com RAG embutido, WhatsApp integrado e analytics detalhado — tudo sem código. CrewAI é mais flexível para desenvolvedores Python avançados, mas exige programação e não tem interface visual nem RAG nativo.',
                },
              },
              {
                '@type': 'Question',
                name: 'Qual a diferença entre Sofia AI e LangFlow?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Ambos têm interface visual, mas Sofia AI é focada em orquestração de agentes com RAG semântico, streaming SSE, replay de execuções e canais de atendimento (WhatsApp). LangFlow é um builder de fluxos baseado em LangChain, sem RAG simplificado nem canais integrados.',
                },
              },
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
            <Link href="/comparativo" className="text-white text-sm font-medium">Comparativo</Link>
            <Link href="/preco" className="text-foreground-secondary hover:text-white transition-colors text-sm">Preço</Link>
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
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Voltar para home
          </Link>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-sm text-blue-300 mb-6">
            <Zap className="w-4 h-4" /> Comparativo atualizado — Fevereiro 2026
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Sofia AI vs{' '}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              CrewAI, AutoGen e LangFlow
            </span>
          </h1>
          <p className="text-lg text-foreground-tertiary max-w-2xl mx-auto">
            Compare as principais plataformas de orquestração de agentes IA. Quais critérios realmente importam para o seu time?
          </p>
        </div>
      </section>

      {/* TL;DR */}
      <section className="px-6 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="glass-card p-6 rounded-xl border border-blue-500/20 bg-blue-500/5">
            <p className="text-blue-300 font-semibold text-sm mb-2">⚡ TL;DR</p>
            <p className="text-white/80 text-sm leading-relaxed">
              <strong className="text-white">Sofia AI</strong> é a única plataforma com interface visual no-code, Knowledge Base RAG embutido, streaming SSE por agente, multi-canal (WhatsApp) e analytics detalhado — tudo sem escrever código.
              CrewAI e AutoGen são frameworks Python para devs. LangFlow tem UI, mas sem RAG nem canais integrados.
            </p>
          </div>
        </div>
      </section>

      {/* Tabela Comparativa */}
      <section className="px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">Comparativo de Funcionalidades</h2>
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-white/60 font-medium w-2/5">Funcionalidade</th>
                    <th className="p-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-bold text-white">Sofia AI</span>
                        <span className="text-[10px] text-blue-400 flex items-center gap-0.5"><Star className="w-2.5 h-2.5" /> Recomendado</span>
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
                        {row.sofia
                          ? <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                          : <XCircle className="w-5 h-5 text-white/20 mx-auto" />}
                      </td>
                      <td className="p-4 text-center">
                        {row.crewai
                          ? <CheckCircle className="w-5 h-5 text-white/40 mx-auto" />
                          : <XCircle className="w-5 h-5 text-white/15 mx-auto" />}
                      </td>
                      <td className="p-4 text-center">
                        {row.autogen
                          ? <CheckCircle className="w-5 h-5 text-white/40 mx-auto" />
                          : <XCircle className="w-5 h-5 text-white/15 mx-auto" />}
                      </td>
                      <td className="p-4 text-center">
                        {row.langflow
                          ? <CheckCircle className="w-5 h-5 text-white/40 mx-auto" />
                          : <XCircle className="w-5 h-5 text-white/15 mx-auto" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Cards por ferramenta */}
      <section className="px-6 py-12 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">Análise Individual</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {tools.map((tool) => (
              <div
                key={tool.name}
                className={`rounded-xl p-6 ${tool.highlight
                  ? 'bg-gradient-to-br from-blue-500/15 to-purple-500/15 border border-blue-500/30'
                  : 'glass-card'}`}
              >
                {tool.highlight && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 rounded-full text-[10px] text-blue-300 font-medium mb-3">
                    <Star className="w-2.5 h-2.5" /> Nossa recomendação
                  </div>
                )}
                <h3 className="text-lg font-bold text-white mb-1">{tool.name}</h3>
                <p className="text-sm text-foreground-tertiary mb-4">{tool.tagline}</p>

                <div className="mb-4">
                  <p className="text-xs text-green-400 font-medium mb-2">Pontos fortes</p>
                  <ul className="space-y-1">
                    {tool.pros.map((p) => (
                      <li key={p} className="flex items-center gap-2 text-xs text-white/70">
                        <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> {p}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-red-400 font-medium mb-2">Limitações</p>
                  <ul className="space-y-1">
                    {tool.cons.map((c) => (
                      <li key={c} className="flex items-center gap-2 text-xs text-white/50">
                        <XCircle className="w-3.5 h-3.5 text-red-400/50 flex-shrink-0" /> {c}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                  <p className="text-xs text-white/50 font-medium mb-1">Ideal para</p>
                  <p className="text-xs text-white/70">{tool.bestFor}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 bg-background-secondary">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Convencido? Experimente grátis.</h2>
          <p className="text-foreground-tertiary mb-8">Sem cartão de crédito. Primeira orquestração em 5 minutos.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" className="button-luxury px-10 py-4 text-base inline-flex items-center gap-2 justify-center">
              Criar Conta Grátis <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/preco" className="px-10 py-4 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-base text-center">
              Ver Planos e Preços
            </Link>
          </div>
        </div>
      </section>

      <footer className="px-6 py-8 border-t border-white/5 text-center">
        <p className="text-foreground-tertiary text-sm">
          &copy; 2026 ROI Labs.{' '}
          <Link href="/" className="hover:text-white transition-colors">Sofia AI</Link>
          {' · '}
          <Link href="/features" className="hover:text-white transition-colors">Features</Link>
          {' · '}
          <Link href="/blog/sofia-vs-crewai-vs-autogen-vs-langflow" className="hover:text-white transition-colors">Artigo completo no blog</Link>
        </p>
      </footer>
    </div>
  )
}
