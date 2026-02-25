import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  ChevronRight,
  TrendingUp,
  Headphones,
  Search,
  Scale,
  Building,
  Globe,
  Users,
  FileText,
  BarChart3,
  GitBranch,
  Zap,
  Shield,
  Database,
  CheckCircle,
  Tag,
  Clock
} from 'lucide-react'

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

type StrategyType = 'sequential' | 'parallel' | 'consensus'

interface Template {
  id: string
  icon: React.ComponentType<{ className?: string }>
  name: string
  description: string
  category: string
  agents: string[]
  strategy: StrategyType
  estimatedTime: string
  difficulty: string
  useCases: string[]
  color: string
  iconColor: string
  popular?: boolean
  isNew?: boolean
}

const templates: Template[] = [
  {
    id: 'marketing-pipeline',
    icon: TrendingUp,
    name: 'Pipeline de Marketing de Conteudo',
    description: 'Pesquisador mapeia tendencias e dados do mercado, Copywriter cria conteudo otimizado para SEO, Revisor ajusta tom, clareza e call-to-action. Artigos de blog prontos em menos de 1 minuto.',
    category: 'Marketing',
    agents: ['Pesquisador de Mercado', 'Copywriter Senior', 'Editor e Revisor'],
    strategy: 'sequential',
    estimatedTime: '~45s',
    difficulty: 'Facil',
    useCases: ['Artigos de blog', 'Posts para redes sociais', 'Newsletters', 'Copies de anuncio'],
    color: 'from-pink-500/15 to-rose-600/15 border-pink-500/25',
    iconColor: 'text-pink-400',
    popular: true
  },
  {
    id: 'support-triage',
    icon: Headphones,
    name: 'Triagem e Suporte Inteligente',
    description: 'Agente de Triagem classifica e prioriza o ticket, Atendente busca na Knowledge Base e responde com precisao, Agente de Escalacao decide se e necessario encaminhar para humano com contexto completo.',
    category: 'Suporte',
    agents: ['Classificador de Tickets', 'Agente de Atendimento', 'Analisador de Escalacao'],
    strategy: 'sequential',
    estimatedTime: '~30s',
    difficulty: 'Facil',
    useCases: ['Suporte ao cliente', 'Help desk', 'SAC automatizado', 'Triagem de chamados'],
    color: 'from-green-500/15 to-emerald-600/15 border-green-500/25',
    iconColor: 'text-green-400',
    popular: true
  },
  {
    id: 'research-synthesis',
    icon: Search,
    name: 'Pesquisa e Sintese de Dados',
    description: 'Coletor agrega informacoes de multiplas perspectivas, Analista identifica padroes, correlacoes e insights, Sintetizador produz um relatorio executivo estruturado com recomendacoes acionaveis.',
    category: 'Pesquisa',
    agents: ['Coletor de Dados', 'Analista de Padroes', 'Sintetizador Executivo'],
    strategy: 'sequential',
    estimatedTime: '~60s',
    difficulty: 'Intermediario',
    useCases: ['Relatorios de mercado', 'Analise competitiva', 'Due diligence', 'Pesquisa academica'],
    color: 'from-blue-500/15 to-cyan-600/15 border-blue-500/25',
    iconColor: 'text-blue-400',
    popular: true
  },
  {
    id: 'legal-review',
    icon: Scale,
    name: 'Revisao de Contratos e Documentos',
    description: 'Leitor extrai clausulas e termos, Analisador Juridico identifica riscos, ambiguidades e clausulas desfavoraveis, Recomendador sugere alteracoes com base em legislacao e boas praticas.',
    category: 'Juridico',
    agents: ['Extrator de Clausulas', 'Analisador Juridico', 'Consultor de Riscos'],
    strategy: 'sequential',
    estimatedTime: '~90s',
    difficulty: 'Avancado',
    useCases: ['Analise de contratos', 'Revisao de termos', 'Compliance', 'Due diligence juridica'],
    color: 'from-yellow-500/15 to-amber-600/15 border-yellow-500/25',
    iconColor: 'text-yellow-400'
  },
  {
    id: 'competitive-analysis',
    icon: Building,
    name: 'Analise Competitiva 360',
    description: 'Tres analistas trabalham em paralelo: um mapeia o site e produtos do concorrente, outro analisa reviews e sentimento, terceiro avalia precos e posicionamento. Sintetizador consolida tudo.',
    category: 'Business Intelligence',
    agents: ['Analista de Produto', 'Analista de Sentimento', 'Analista de Preco', 'Sintetizador'],
    strategy: 'parallel',
    estimatedTime: '~40s',
    difficulty: 'Intermediario',
    useCases: ['Inteligencia competitiva', 'Benchmarking', 'Estrategia de produto', 'Posicionamento'],
    color: 'from-purple-500/15 to-violet-600/15 border-purple-500/25',
    iconColor: 'text-purple-400',
    isNew: true
  },
  {
    id: 'seo-content',
    icon: Globe,
    name: 'Producao de Conteudo SEO',
    description: 'Especialista em SEO define palavras-chave, estrutura e intent, Redator cria o conteudo com otimizacoes on-page, Revisor garante qualidade editorial e verifica density de keywords.',
    category: 'Marketing',
    agents: ['Estrategista de SEO', 'Redator Especialista', 'Editor de Qualidade'],
    strategy: 'sequential',
    estimatedTime: '~50s',
    difficulty: 'Facil',
    useCases: ['Artigos SEO', 'Landing pages', 'Meta descriptions', 'Conteudo para blog'],
    color: 'from-orange-500/15 to-amber-600/15 border-orange-500/25',
    iconColor: 'text-orange-400'
  },
  {
    id: 'hr-screening',
    icon: Users,
    name: 'Triagem de Candidatos RH',
    description: 'Analisador le o curriculo e extrai competencias, Matcher compara com os requisitos da vaga e calcula fit cultural, Ranker ordena candidatos e gera relatorio com justificativas para cada posicao.',
    category: 'RH',
    agents: ['Analisador de Curriculo', 'Avaliador de Fit', 'Gerador de Ranking'],
    strategy: 'sequential',
    estimatedTime: '~35s',
    difficulty: 'Intermediario',
    useCases: ['Triagem de curriculos', 'Selecao de candidatos', 'Fit cultural', 'Analise de competencias'],
    color: 'from-teal-500/15 to-cyan-600/15 border-teal-500/25',
    iconColor: 'text-teal-400'
  },
  {
    id: 'financial-analysis',
    icon: BarChart3,
    name: 'Analise Financeira e DRE',
    description: 'Extrator interpreta os dados financeiros brutos, Analista Financeiro calcula KPIs, tendencias e variancas, Consultor produz um resumo executivo com alertas, oportunidades e recomendacoes.',
    category: 'Financeiro',
    agents: ['Extrator Financeiro', 'Analista de KPIs', 'Consultor Estrategico'],
    strategy: 'sequential',
    estimatedTime: '~75s',
    difficulty: 'Avancado',
    useCases: ['Analise de DRE', 'Budget review', 'Relatorios financeiros', 'KPI tracking'],
    color: 'from-emerald-500/15 to-green-600/15 border-emerald-500/25',
    iconColor: 'text-emerald-400'
  },
  {
    id: 'product-brief',
    icon: FileText,
    name: 'Criacao de Product Brief',
    description: 'Pesquisador de Usuario mapeia as dores e necessidades do cliente-alvo, Estrategista de Produto define a proposta de valor e posicionamento, Redator estrutura o brief completo com user stories.',
    category: 'Produto',
    agents: ['Pesquisador de Usuario', 'Estrategista de Produto', 'Escritor Tecnico'],
    strategy: 'sequential',
    estimatedTime: '~55s',
    difficulty: 'Intermediario',
    useCases: ['Product briefs', 'PRDs', 'User stories', 'Roadmap estrategico'],
    color: 'from-indigo-500/15 to-blue-600/15 border-indigo-500/25',
    iconColor: 'text-indigo-400',
    isNew: true
  }
]

const categories = ['Todos', 'Marketing', 'Suporte', 'Pesquisa', 'Juridico', 'Business Intelligence', 'RH', 'Financeiro', 'Produto']

const strategyLabels: Record<StrategyType, { label: string; color: string }> = {
  sequential: { label: 'Sequencial', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  parallel: { label: 'Paralelo', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  consensus: { label: 'Consenso', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
}

const difficultyColors: Record<string, string> = {
  'Facil': 'text-green-400',
  'Intermediario': 'text-yellow-400',
  'Avancado': 'text-orange-400'
}

export default function TemplatesPage() {
  const popularTemplates = templates.filter(t => t.popular)
  const allTemplates = templates

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Templates de Orquestração de Agentes IA — Sofia AI',
            description: 'Galeria de pipelines prontos de orquestração multi-agente para Marketing, Suporte, Pesquisa, Jurídico e mais.',
            url: 'https://sofiaia.roilabs.com.br/templates',
            publisher: {
              '@type': 'Organization',
              name: 'ROI Labs',
              url: 'https://roilabs.com.br'
            },
            hasPart: templates.map(t => ({
              '@type': 'SoftwareSourceCode',
              name: t.name,
              description: t.description,
              applicationCategory: t.category
            }))
          })
        }}
      />
      {/* Schema Markup — FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'O que são templates de orquestração de agentes IA?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Templates de orquestração são pipelines de agentes IA pré-configurados para casos de uso específicos, como geração de conteúdo de marketing, suporte ao cliente, análise jurídica e pesquisa de mercado. Você importa o template com um clique e personaliza conforme sua necessidade.'
                }
              },
              {
                '@type': 'Question',
                name: 'Posso criar meu próprio template de orquestração?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Sim. Na Sofia AI você cria orquestrações personalizadas com qualquer número de agentes. Você também pode usar o recurso "Criar com IA" (AI Magic Create) — basta descrever o processo em linguagem natural e a plataforma gera a orquestração automaticamente.'
                }
              },
              {
                '@type': 'Question',
                name: 'Os templates funcionam com qualquer modelo de IA?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Sim. Cada agente em um template pode usar modelos diferentes — GPT-4o, Claude, Llama, Mistral. Você escolhe o modelo mais adequado para cada papel dentro do pipeline: modelos mais rápidos para triagem, mais potentes para análise crítica.'
                }
              }
            ]
          })
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
            <Link href="/#features" className="text-foreground-secondary hover:text-white transition-colors text-sm">Features</Link>
            <Link href="/features/orchestrations" className="text-foreground-secondary hover:text-white transition-colors text-sm">Orquestrações</Link>
            <Link href="/#pricing" className="text-foreground-secondary hover:text-white transition-colors text-sm">Pricing</Link>
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

        <div className="max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-xs text-blue-300 mb-6">
            <GitBranch className="w-3.5 h-3.5" />
            {templates.length} templates prontos — atualizados semanalmente
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Templates de{' '}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Orquestração
            </span>
            {' '}Prontos
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
        </div>
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
      <section className="px-6 py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Mais Populares</h2>
              <p className="text-sm text-foreground-tertiary">Os templates mais usados pela comunidade Sofia</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {popularTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} featured />
            ))}
          </div>
        </div>
      </section>

      {/* All Templates */}
      <section className="px-6 py-16 bg-background-secondary">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Todos os Templates</h2>
              <p className="text-sm text-foreground-tertiary">{templates.length} pipelines prontos para usar</p>
            </div>
          </div>

          {/* Category pills — static for SSG */}
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

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        </div>
      </section>

      {/* How to use */}
      <section className="px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Como Usar um Template</h2>
            <p className="text-foreground-tertiary max-w-xl mx-auto">
              Do template ao primeiro resultado em menos de 5 minutos.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
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
            ].map((item) => (
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
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-16 bg-background-secondary">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Perguntas sobre Templates</h2>
          <div className="space-y-4">
            {[
              {
                q: 'Posso modificar os templates depois de criar?',
                a: 'Sim. Após criar uma orquestração a partir de um template, você pode editar os prompts de cada agente, trocar o modelo de IA, adicionar ou remover agentes, e alterar a estratégia de execução.'
              },
              {
                q: 'Os templates funcionam com minha Knowledge Base?',
                a: 'Sim. Em qualquer template, você pode vincular uma ou mais Knowledge Bases a cada agente. O agente usará RAG semântico para buscar contexto relevante dos seus documentos antes de responder.'
              },
              {
                q: 'Quantos templates posso criar a partir de cada modelo?',
                a: 'Ilimitado. Um template é apenas o ponto de partida — cada orquestração criada é independente e você pode ter quantas quiser dentro do limite do seu plano.'
              },
              {
                q: 'Vou receber novos templates?',
                a: 'Sim. Novos templates são adicionados semanalmente com base nos casos de uso mais solicitados pela comunidade. Todos os templates novos ficam disponíveis automaticamente para todos os planos.'
              }
            ].map((faq) => (
              <div key={faq.q} className="glass-card p-6 rounded-xl">
                <h3 className="font-semibold text-white mb-3 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  {faq.q}
                </h3>
                <p className="text-sm text-foreground-tertiary leading-relaxed pl-6">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
            <BrainCircuit className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Comece com um template agora
          </h2>
          <p className="text-foreground-tertiary mb-8 text-lg max-w-xl mx-auto">
            Grátis para começar. Sem cartão de crédito.
            Primeiro resultado em menos de 5 minutos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" className="button-luxury px-10 py-4 text-base inline-flex items-center gap-2 justify-center">
              Criar Conta Grátis <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/features/orchestrations"
              className="px-10 py-4 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-base inline-flex items-center gap-2 justify-center"
            >
              Como funcionam as orquestrações <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <BrainCircuit className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white text-sm">Sofia AI</span>
          </div>
          <div className="flex gap-6 text-sm text-foreground-tertiary">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/features/orchestrations" className="hover:text-white transition-colors">Orquestrações</Link>
            <Link href="/#pricing" className="hover:text-white transition-colors">Pricing</Link>
            <a href="mailto:contato@roilabs.com.br" className="hover:text-white transition-colors">Contato</a>
          </div>
          <p className="text-foreground-tertiary text-xs">
            &copy; 2026 ROI Labs
          </p>
        </div>
      </footer>
    </div>
  )
}

function TemplateCard({ template, featured = false }: { template: Template; featured?: boolean }) {
  const strategy = strategyLabels[template.strategy]

  return (
    <div className={`glass-card p-6 rounded-xl border bg-gradient-to-br ${template.color} hover-scale flex flex-col`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
            <template.icon className={`w-5 h-5 ${template.iconColor}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">{template.category}</span>
              {template.popular && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/20">
                  Popular
                </span>
              )}
              {template.isNew && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/20">
                  Novo
                </span>
              )}
            </div>
          </div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${strategy.color}`}>
          {strategy.label}
        </span>
      </div>

      {/* Title & Description */}
      <h3 className="font-semibold text-white mb-2 leading-snug">{template.name}</h3>
      <p className="text-sm text-foreground-tertiary leading-relaxed mb-4 flex-1">{template.description}</p>

      {/* Agents flow */}
      <div className="mb-4">
        <p className="text-xs text-white/30 mb-2">Agentes</p>
        <div className="flex flex-wrap gap-1.5">
          {template.agents.map((agent, i) => (
            <div key={agent} className="flex items-center gap-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/8 border border-white/10 text-white/70">
                {agent}
              </span>
              {i < template.agents.length - 1 && (
                <ArrowRight className="w-2.5 h-2.5 text-white/20 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Use cases */}
      <div className="mb-5">
        <p className="text-xs text-white/30 mb-2">Casos de uso</p>
        <div className="flex flex-wrap gap-1.5">
          {template.useCases.slice(0, 3).map((uc) => (
            <span key={uc} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/50">
              {uc}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <div className="flex items-center gap-4 text-xs text-white/40">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {template.estimatedTime}
          </span>
          <span className={`flex items-center gap-1 ${difficultyColors[template.difficulty] || 'text-white/40'}`}>
            <Tag className="w-3 h-3" />
            {template.difficulty}
          </span>
        </div>
        <Link
          href="/login"
          className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white transition-colors inline-flex items-center gap-1"
        >
          Usar template <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  )
}
