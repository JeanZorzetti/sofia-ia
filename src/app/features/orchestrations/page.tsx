import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Bot,
  GitBranch,
  Zap,
  CheckCircle,
  ChevronRight,
  BrainCircuit,
  ArrowLeft,
  Play,
  Layers,
  Timer,
  BarChart3,
  RefreshCw,
  Shield,
  Code2,
  Users,
  TrendingUp
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Orquestração de Agentes IA — Como Funciona | Sofia AI',
  description: 'Entenda como a orquestração multi-agente da Sofia funciona. Pipelines sequenciais, paralelos e de consenso. Cada agente com papel específico, streaming em tempo real e analytics completo.',
  keywords: [
    'orquestração de agentes ia',
    'multi-agent orchestration',
    'pipeline de agentes ia',
    'como funciona orquestração ia',
    'agentes sequenciais',
    'agentes paralelos',
    'streaming sse agentes',
    'sofia ai features'
  ],
  openGraph: {
    title: 'Orquestração de Agentes IA — Como Funciona | Sofia AI',
    description: 'Pipelines visuais de agentes que colaboram. Sequencial, paralelo ou consenso. Streaming em tempo real. Analytics por execução.',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Sofia AI'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Multi-Agent Orchestration — How It Works | Sofia AI',
    description: 'Visual pipelines where each AI agent has a specific role. Sequential, parallel or consensus strategies. Real-time streaming.'
  },
  alternates: {
    canonical: 'https://sofiaia.roilabs.com.br/features/orchestrations'
  }
}

const strategies = [
  {
    icon: GitBranch,
    name: 'Sequencial',
    description: 'A saída de cada agente alimenta o próximo. Ideal para pipelines de produção de conteúdo: Pesquisador → Copywriter → Revisor.',
    color: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    iconColor: 'text-blue-400',
    bestFor: 'Conteúdo, relatórios, análises em cadeia'
  },
  {
    icon: Layers,
    name: 'Paralelo',
    description: 'Múltiplos agentes processam dados simultaneamente. Perfeito para análises que precisam de velocidade sem dependência entre agentes.',
    color: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
    iconColor: 'text-purple-400',
    bestFor: 'Análises multi-perspectiva, pesquisa ampla'
  },
  {
    icon: Users,
    name: 'Consenso',
    description: 'Agentes analisam o mesmo problema de ângulos diferentes e um agente sintetizador consolida as visões em uma resposta final.',
    color: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    bestFor: 'Decisões críticas, avaliações, due diligence'
  }
]

const executionSteps = [
  {
    step: '01',
    title: 'Você define o pipeline',
    description: 'Escolha os agentes, defina os papéis (Pesquisador, Analista, Revisor) e a estratégia de execução. Interface visual, sem código.',
    icon: Code2
  },
  {
    step: '02',
    title: 'Envie a tarefa',
    description: 'Uma mensagem ou prompt inicia a orquestração. O coordenador distribui para o primeiro agente com o contexto correto.',
    icon: Play
  },
  {
    step: '03',
    title: 'Agentes trabalham em cadeia',
    description: 'Cada agente recebe o output do anterior, adiciona sua análise e passa adiante. Streaming SSE mostra o progresso em tempo real.',
    icon: GitBranch
  },
  {
    step: '04',
    title: 'Resultado consolidado',
    description: 'O output final é exibido, com o histórico de cada agente, tokens consumidos, custo e tempo de cada etapa.',
    icon: BarChart3
  }
]

const useCases = [
  {
    title: 'Pipeline de Marketing',
    description: 'Pesquisador mapeia tendências do mercado → Copywriter cria conteúdo persuasivo → Revisor ajusta tom e garante qualidade. Artigos de blog em ~45 segundos.',
    roles: ['Pesquisador', 'Copywriter', 'Revisor'],
    time: '~45s',
    category: 'marketing',
    icon: TrendingUp,
    color: 'text-pink-400'
  },
  {
    title: 'Triagem de Suporte',
    description: 'Agente de Triagem classifica o ticket → Atendente busca na Knowledge Base e responde → Agente de Escalação decide se é necessário encaminhar para humano.',
    roles: ['Triagem', 'Atendente', 'Escalação'],
    time: '~30s',
    category: 'suporte',
    icon: Shield,
    color: 'text-green-400'
  },
  {
    title: 'Pesquisa e Síntese',
    description: 'Coletor agrega dados de múltiplas fontes → Analista identifica padrões e insights → Sintetizador produz um relatório executivo estruturado.',
    roles: ['Coletor', 'Analista', 'Sintetizador'],
    time: '~60s',
    category: 'pesquisa',
    icon: BrainCircuit,
    color: 'text-blue-400'
  },
  {
    title: 'Revisão Jurídica',
    description: 'Agente lê o contrato → Identificador marca cláusulas de risco → Recomendador sugere alterações baseadas em legislação vigente.',
    roles: ['Leitor', 'Identificador', 'Recomendador'],
    time: '~90s',
    category: 'jurídico',
    icon: CheckCircle,
    color: 'text-yellow-400'
  }
]

const differentials = [
  {
    icon: Zap,
    title: 'Streaming SSE por agente',
    description: 'Veja cada agente "pensando" em tempo real. Eventos granulares mostram exatamente em qual etapa o pipeline está.'
  },
  {
    icon: BarChart3,
    title: 'Analytics por execução',
    description: 'Custo em USD por execução, tokens de entrada e saída, tempo de cada agente. Tome decisões baseadas em dados reais.'
  },
  {
    icon: RefreshCw,
    title: 'Replay de execuções',
    description: 'Reveja qualquer execução passada passo a passo. Debug fácil, auditoria completa, aprendizado contínuo.'
  },
  {
    icon: Timer,
    title: 'Timeout e retry automáticos',
    description: 'Cada agente tem timeout configurável. Falhas são tratadas com retry automático sem interromper o pipeline.'
  }
]

export default function OrchestrationFeaturePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Schema Markup — TechArticle */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'TechArticle',
            headline: 'Orquestração de Agentes IA — Como Funciona na Sofia',
            description: 'Guia completo sobre como a orquestração multi-agente funciona na plataforma Sofia AI. Estratégias sequencial, paralela e de consenso.',
            author: {
              '@type': 'Organization',
              name: 'ROI Labs'
            },
            publisher: {
              '@type': 'Organization',
              name: 'Sofia AI',
              url: 'https://sofiaia.roilabs.com.br'
            }
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
                name: 'O que é orquestração de agentes IA?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Orquestração de agentes IA é a coordenação de múltiplos agentes de inteligência artificial para executar tarefas complexas em conjunto. Cada agente tem um papel específico (Pesquisador, Analista, Revisor) e a saída de um alimenta o próximo, formando um pipeline de raciocínio automatizado.'
                }
              },
              {
                '@type': 'Question',
                name: 'Qual a diferença entre orquestração sequencial e paralela?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Na orquestração sequencial, os agentes executam um após o outro — a saída do primeiro vira entrada do segundo. Na orquestração paralela, múltiplos agentes processam o mesmo input simultaneamente, ideal para análises multi-perspectiva que precisam de velocidade.'
                }
              },
              {
                '@type': 'Question',
                name: 'Preciso saber programar para usar orquestrações na Sofia AI?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Não. A Sofia AI oferece uma interface visual no-code para criar e executar orquestrações. Você define os agentes, seus papéis e a estratégia de execução sem escrever código. Para casos avançados, existe uma API REST e SDK JavaScript.'
                }
              },
              {
                '@type': 'Question',
                name: 'Quantos agentes posso ter em uma orquestração?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Não há limite fixo de agentes por orquestração. Na prática, pipelines de 3 a 7 agentes são os mais comuns e eficientes. O plano Free inclui até 3 agentes no total; o plano Pro permite 20 e o Business é ilimitado.'
                }
              },
              {
                '@type': 'Question',
                name: 'Como funciona o streaming em tempo real nas orquestrações?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Sofia AI usa Server-Sent Events (SSE) para transmitir o output de cada agente em tempo real, conforme ele é gerado pelo modelo de linguagem. Você vê cada agente "pensando" ao vivo, com feedback visual granular por etapa do pipeline.'
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
            <Link href="/templates" className="text-foreground-secondary hover:text-white transition-colors text-sm">Templates</Link>
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
          <Link href="/" className="hover:text-white transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Início
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span>Features</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-white">Orquestrações</span>
        </div>
      </div>

      {/* Hero */}
      <section className="relative px-6 pt-20 pb-24 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute top-32 left-1/4 w-[300px] h-[200px] bg-purple-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-xs text-blue-300 mb-6">
            <GitBranch className="w-3.5 h-3.5" />
            Feature Core — Orquestração Multi-Agente
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Como Funciona a<br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Orquestração de Agentes
            </span>
          </h1>

          <p className="text-lg md:text-xl text-foreground-tertiary max-w-2xl mb-8">
            Crie pipelines onde cada agente IA tem um papel específico — Pesquisador, Analista, Revisor.
            A saída de um alimenta o próximo, criando uma equipe IA que resolve tarefas complexas de forma autônoma.
          </p>

          <div className="flex flex-wrap gap-4 mb-16">
            <Link href="/login" className="button-luxury px-6 py-3 text-sm inline-flex items-center gap-2">
              <Play className="w-4 h-4" /> Criar minha primeira orquestração
            </Link>
            <Link href="/templates" className="px-6 py-3 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-sm inline-flex items-center gap-2">
              Ver templates prontos <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Pipeline Demo Visual */}
          <div className="glass-card p-8 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm font-medium text-white">Pipeline de Marketing — Execução ao vivo</p>
              <span className="flex items-center gap-1.5 text-xs text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Executando
              </span>
            </div>

            {/* Agents flow */}
            <div className="flex items-center gap-3 md:gap-6 justify-center flex-wrap mb-8">
              {[
                { role: 'Pesquisador', status: 'done', tokens: '1.2k', color: 'green' },
                { role: 'Copywriter', status: 'active', tokens: '...', color: 'blue' },
                { role: 'Revisor', status: 'waiting', tokens: '-', color: 'gray' }
              ].map((agent, i) => (
                <div key={agent.role} className="flex items-center gap-3 md:gap-6">
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center border ${
                      agent.color === 'green'
                        ? 'bg-green-500/20 border-green-500/40'
                        : agent.color === 'blue'
                          ? 'bg-blue-500/20 border-blue-500/40 ring-2 ring-blue-500/30'
                          : 'bg-white/5 border-white/10'
                    }`}>
                      <Bot className={`w-6 h-6 ${
                        agent.color === 'green' ? 'text-green-400' :
                        agent.color === 'blue' ? 'text-blue-400' : 'text-white/20'
                      }`} />
                    </div>
                    <span className="text-sm font-medium text-white/80">{agent.role}</span>
                    <span className={`text-xs ${
                      agent.color === 'green' ? 'text-green-400' :
                      agent.color === 'blue' ? 'text-blue-400 animate-pulse' : 'text-white/25'
                    }`}>
                      {agent.status === 'done' ? 'Concluido' : agent.status === 'active' ? 'Processando...' : 'Aguardando'}
                    </span>
                    <span className="text-[11px] text-white/30">{agent.tokens} tokens</span>
                  </div>
                  {i < 2 && (
                    <div className="flex flex-col items-center gap-1">
                      <ArrowRight className={`w-5 h-5 ${i === 0 ? 'text-green-500/60' : 'text-white/15'}`} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* SSE Output */}
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-green-300/60 mb-1 font-mono">Pesquisador — concluido em 8.2s</p>
                <p className="text-sm text-green-300 font-mono leading-relaxed">
                  Identifiquei 5 tendencias principais no mercado de SaaS para 2026: IA embarcada nos produtos, pricing por uso, verticalizacao por setor, expansao PLG e compliance automatizado...
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-blue-300/60 mb-1 font-mono">Copywriter — processando...</p>
                <p className="text-sm text-blue-300 font-mono leading-relaxed">
                  Com base na pesquisa, estou criando um artigo com titulo &quot;5 Tendencias de SaaS que vao dominar 2026&quot;...
                  <span className="animate-pulse">|</span>
                </p>
              </div>
            </div>

            {/* Stats bar */}
            <div className="mt-6 pt-6 border-t border-white/5 flex items-center gap-6 text-xs text-white/40 flex-wrap">
              <span>Modelo: llama-3.3-70b</span>
              <span>Tokens: 1.200 / ~3.500 estimado</span>
              <span>Custo: $0.0004</span>
              <span>Tempo: 8.2s / ~25s estimado</span>
              <span className="ml-auto text-blue-400">Etapa 2 de 3</span>
            </div>
          </div>
        </div>
      </section>

      {/* Strategies */}
      <section className="px-6 py-24 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">3 Estratégias de Orquestração</h2>
            <p className="text-foreground-tertiary max-w-2xl mx-auto">
              Cada tarefa tem uma estratégia ideal. Sofia suporta as três — você escolhe na hora de montar o pipeline.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {strategies.map((strategy) => (
              <div key={strategy.name} className={`glass-card p-6 rounded-xl border bg-gradient-to-br ${strategy.color} hover-scale`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                    <strategy.icon className={`w-5 h-5 ${strategy.iconColor}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{strategy.name}</h3>
                </div>
                <p className="text-sm text-foreground-tertiary mb-4 leading-relaxed">{strategy.description}</p>
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-white/40 mb-1">Melhor para</p>
                  <p className="text-xs text-white/70">{strategy.bestFor}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-24 bg-background-secondary">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Do Prompt ao Resultado em 4 Etapas</h2>
            <p className="text-foreground-tertiary max-w-xl mx-auto">
              Sem configuração complexa. Sem código. Da criação do pipeline ao resultado em menos de 5 minutos.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {executionSteps.map((step) => (
              <div key={step.step} className="glass-card p-6 rounded-xl flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <step.icon className="w-5 h-5 text-blue-400" />
                  </div>
                </div>
                <div>
                  <div className="text-xs text-white/30 font-mono mb-1">Passo {step.step}</div>
                  <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-foreground-tertiary leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Casos de Uso Reais</h2>
            <p className="text-foreground-tertiary max-w-xl mx-auto">
              Da ideia ao pipeline funcional em minutos. Veja o que outros usuários estao construindo.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {useCases.map((useCase) => (
              <div key={useCase.title} className="glass-card p-6 rounded-xl hover-scale">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <useCase.icon className={`w-5 h-5 ${useCase.color}`} />
                  </div>
                  <div>
                    <div className="text-xs text-white/40 mb-1 capitalize">{useCase.category}</div>
                    <h3 className="font-semibold text-white">{useCase.title}</h3>
                  </div>
                </div>
                <p className="text-sm text-foreground-tertiary leading-relaxed mb-4">{useCase.description}</p>
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {useCase.roles.map((role, i) => (
                    <div key={role} className="flex items-center gap-1.5">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">{role}</span>
                      {i < useCase.roles.length - 1 && <ArrowRight className="w-3 h-3 text-white/20" />}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-white/30">
                  <span>Tempo estimado: {useCase.time}</span>
                  <Link href="/login" className="text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                    Usar este pipeline <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Differentials */}
      <section className="px-6 py-24 bg-background-secondary">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Diferenciais que Importam</h2>
            <p className="text-foreground-tertiary max-w-xl mx-auto">
              O que torna as orquestrações da Sofia diferentes de qualquer outra solução no mercado.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {differentials.map((diff) => (
              <div key={diff.title} className="glass-card p-6 rounded-xl text-center">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
                  <diff.icon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">{diff.title}</h3>
                <p className="text-sm text-foreground-tertiary leading-relaxed">{diff.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-24">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Perguntas Frequentes</h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'Quantos agentes posso ter em um pipeline?',
                a: 'No plano Free, você pode ter pipelines com até 3 agentes. No plano Pro, até 10 agentes por orquestração. No Business, ilimitado. Cada agente é independente e pode usar modelos diferentes.'
              },
              {
                q: 'Os agentes podem acessar minha Knowledge Base?',
                a: 'Sim. Ao configurar um agente, você pode vinculá-lo a uma ou mais Knowledge Bases. O agente fará busca semântica (RAG com pgvector) e usará os chunks relevantes como contexto antes de responder.'
              },
              {
                q: 'Qual a diferença entre orquestração sequencial e paralela?',
                a: 'Na sequencial, agente A termina e passa o resultado para o agente B. Na paralela, A e B rodam ao mesmo tempo e um terceiro agente consolida os resultados. A paralela é mais rápida mas os agentes não se veem mutuamente durante a execução.'
              },
              {
                q: 'Posso usar modelos diferentes em cada agente?',
                a: 'Sim. Você pode ter um agente usando Groq (para velocidade), outro com GPT-4 (para raciocínio profundo) e um terceiro com Claude (para escrita). Cada agente escolhe o modelo mais adequado para seu papel.'
              },
              {
                q: 'Como funciona o histórico de execuções?',
                a: 'Toda execução é salva automaticamente: qual foi o input, o que cada agente respondeu, tokens, custo e tempo. Você pode rever qualquer execução passada passo a passo usando o replay.'
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

      {/* Schema FAQ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'Quantos agentes posso ter em um pipeline de orquestração?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'No plano Free até 3 agentes, no Pro até 10 por orquestração, no Business ilimitado.'
                }
              },
              {
                '@type': 'Question',
                name: 'Os agentes da Sofia podem acessar Knowledge Base?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Sim. Agentes podem ser vinculados a Knowledge Bases e usar RAG com pgvector para busca semântica durante a execução.'
                }
              }
            ]
          })
        }}
      />

      {/* CTA */}
      <section className="px-6 py-24 bg-background-secondary">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
            <GitBranch className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Crie sua primeira orquestração agora
          </h2>
          <p className="text-foreground-tertiary mb-8 text-lg max-w-xl mx-auto">
            Grátis para começar. Sem cartão de crédito. Primeira execução em menos de 5 minutos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" className="button-luxury px-10 py-4 text-base inline-flex items-center gap-2 justify-center">
              Começar Grátis <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/templates"
              className="px-10 py-4 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-base inline-flex items-center gap-2 justify-center"
            >
              Ver Templates <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
          <p className="text-foreground-tertiary/50 text-sm mt-6">
            Ou explore os{' '}
            <Link href="/templates" className="text-blue-400 hover:text-blue-300 transition-colors">
              templates de orquestração prontos
            </Link>
            {' '}para começar mais rapido.
          </p>
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
            <Link href="/templates" className="hover:text-white transition-colors">Templates</Link>
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
