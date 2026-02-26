import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowLeft,
  BrainCircuit,
  Zap,
  Bot,
  GitBranch,
  Database,
  Play,
  BarChart3,
  CheckCircle,
  ChevronRight,
  Users,
  FileText,
  Search,
  Cpu,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Como Funciona o Sofia AI — Orquestração de Agentes IA',
  description: 'Entenda como o Sofia AI funciona: crie agentes com papéis específicos, monte orquestrações visuais, conecte Knowledge Bases e execute pipelines com streaming em tempo real.',
  keywords: [
    'como funciona sofia ai',
    'como funciona orquestração agentes ia',
    'tutorial sofia ai',
    'passo a passo agentes ia',
    'criar agentes ia sem código',
    'pipeline agentes ia como usar',
  ],
  openGraph: {
    title: 'Como Funciona o Sofia AI',
    description: 'Do zero à primeira orquestração em 5 minutos. Guia passo a passo.',
    type: 'website',
    locale: 'pt_BR',
    images: [{ url: 'https://sofiaia.roilabs.com.br/opengraph-image', width: 1200, height: 630, alt: 'Sofia AI — Orquestração de Agentes IA' }],

  },
  alternates: { canonical: 'https://sofiaia.roilabs.com.br/como-funciona' },
}

const steps = [
  {
    number: '01',
    icon: Bot,
    title: 'Crie seus Agentes',
    description: 'Defina o papel de cada agente: Pesquisador, Analista, Copywriter, Revisor — o que você precisar. Escolha o modelo IA (Groq, OpenAI, Anthropic) e configure o system prompt com as instruções do papel.',
    details: [
      'Escolha entre 50+ modelos IA',
      'System prompt personalizado por papel',
      'Conecte uma Knowledge Base para contexto real',
      'Configure temperatura e parâmetros avançados',
    ],
    color: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    demo: {
      label: 'Exemplo de agente',
      content: 'Nome: Pesquisador de Mercado\nModelo: llama-3.3-70b (Groq)\nPapel: Você é um analista de mercado especializado em SaaS...',
    },
  },
  {
    number: '02',
    icon: GitBranch,
    title: 'Monte a Orquestração',
    description: 'No editor visual, encadeie os agentes em um pipeline. Escolha a estratégia: sequencial (saída de um vira entrada do próximo), paralela (executam ao mesmo tempo) ou consenso (todos respondem e a melhor resposta é selecionada).',
    details: [
      'Editor drag-and-drop intuitivo',
      'Estratégia sequencial, paralela ou consenso',
      'Visualização do fluxo em tempo real',
      'Templates prontos para começar rápido',
    ],
    color: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
    demo: {
      label: 'Pipeline de Marketing',
      content: 'Pesquisador → Copywriter → Revisor\nEstratégia: Sequencial\nTempo estimado: ~45s',
    },
  },
  {
    number: '03',
    icon: Database,
    title: 'Conecte sua Knowledge Base',
    description: 'Faça upload de documentos PDF, DOCX, CSV ou TXT. O Sofia vetoriza automaticamente com embeddings e indexa no pgvector. Seus agentes passam a responder com contexto real do seu negócio.',
    details: [
      'Upload drag-and-drop de documentos',
      'Vetorização automática com embeddings',
      'Busca semântica por similaridade',
      'Preview dos chunks vetorizados',
    ],
    color: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30',
    demo: {
      label: 'Knowledge Base conectada',
      content: 'manual-produto-v2.pdf → 247 chunks\ncatalogo-2026.docx → 89 chunks\nScore de similaridade: 0.94',
    },
  },
  {
    number: '04',
    icon: Play,
    title: 'Execute e Monitore',
    description: 'Envie a tarefa e veja a execução acontecer em tempo real. Streaming SSE mostra a resposta de cada agente conforme é gerada. Ao final, veja o resultado consolidado, métricas de custo e tokens.',
    details: [
      'Streaming SSE por agente em tempo real',
      'Status visual de cada etapa',
      'Métricas: custo, tokens, tempo',
      'Resultado final consolidado',
    ],
    color: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30',
    demo: {
      label: 'Execução em andamento',
      content: '✅ Pesquisador: concluído (3.2s)\n⚡ Copywriter: processando...\n⏳ Revisor: aguardando\nCusto estimado: R$0,012',
    },
  },
  {
    number: '05',
    icon: BarChart3,
    title: 'Analise e Replaye',
    description: 'Acesse o histórico completo de execuções com métricas detalhadas. Replaye qualquer execução passada, compare resultados e exporte em PDF, Markdown ou CSV para relatórios.',
    details: [
      'Histórico completo de execuções',
      'Replay de qualquer execução passada',
      'Export em PDF, Markdown e CSV',
      'Dashboard com custo acumulado',
    ],
    color: 'from-pink-500/20 to-pink-600/20 border-pink-500/30',
    demo: {
      label: 'Analytics',
      content: '47 execuções este mês\nCusto total: R$0,84\nTaxa de sucesso: 97.8%\nTempo médio: 42s',
    },
  },
]

const useCases = [
  {
    icon: FileText,
    title: 'Pipeline de Marketing',
    description: 'Pesquisador analisa o mercado → Copywriter cria o copy → Revisor garante qualidade.',
    time: '~45s',
  },
  {
    icon: Users,
    title: 'Suporte Inteligente',
    description: 'Triagem classifica a solicitação → Atendente responde → Escalação decide se precisa de humano.',
    time: '~30s',
  },
  {
    icon: Search,
    title: 'Pesquisa & Síntese',
    description: 'Coletor reúne dados → Analista processa → Sintetizador gera relatório executivo.',
    time: '~60s',
  },
  {
    icon: Cpu,
    title: 'Análise de Documentos',
    description: 'Upload de contratos ou relatórios → Agente com KB analisa com contexto → Resultado estruturado.',
    time: '~20s',
  },
]

export default function ComoFuncionaPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'HowTo',
            name: 'Como usar o Sofia AI para orquestração de agentes IA',
            description: 'Guia passo a passo para criar e executar orquestrações de agentes IA no Sofia AI.',
            step: steps.map((s, i) => ({
              '@type': 'HowToStep',
              position: i + 1,
              name: s.title,
              text: s.description,
            })),
          }),
        }}
      />



      {/* Hero */}
      <section className="px-6 pt-20 pb-16 text-center">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Voltar para home
          </Link>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-sm text-blue-300 mb-6">
            <Zap className="w-4 h-4" /> Do zero à primeira orquestração em 5 minutos
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Como funciona o{' '}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Sofia AI
            </span>
          </h1>
          <p className="text-lg text-foreground-tertiary max-w-2xl mx-auto mb-10">
            Cinco passos para criar pipelines de agentes IA que colaboram, pesquisam e entregam resultados reais — sem escrever código.
          </p>
          <Link href="/login" className="button-luxury px-8 py-3.5 text-base inline-flex items-center gap-2 justify-center">
            <Play className="w-4 h-4" /> Começar Agora — Grátis
          </Link>
        </div>
      </section>

      {/* Steps */}
      <section className="px-6 py-12">
        <div className="max-w-5xl mx-auto space-y-8">
          {steps.map((step, index) => (
            <div key={step.number} className={`glass-card rounded-2xl p-8 border bg-gradient-to-br ${step.color}`}>
              <div className="flex flex-col md:flex-row gap-8">
                {/* Left */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-4xl font-black text-white/10">{step.number}</span>
                    <step.icon className="w-7 h-7 text-white/70" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3">{step.title}</h2>
                  <p className="text-foreground-tertiary leading-relaxed mb-6">{step.description}</p>
                  <ul className="space-y-2">
                    {step.details.map((d) => (
                      <li key={d} className="flex items-center gap-2 text-sm text-white/70">
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Right — demo */}
                <div className="md:w-64 flex-shrink-0">
                  <div className="glass-card rounded-xl p-4 bg-black/20">
                    <p className="text-xs text-white/30 mb-3 font-mono">{step.demo.label}</p>
                    <pre className="text-xs text-green-300 font-mono whitespace-pre-wrap leading-relaxed">
                      {step.demo.content}
                    </pre>
                  </div>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className="flex justify-center mt-6">
                  <ChevronRight className="w-5 h-5 text-white/20 rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Casos de uso */}
      <section className="px-6 py-16 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Exemplos Prontos para Usar</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {useCases.map((uc) => (
              <div key={uc.title} className="glass-card p-6 rounded-xl flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <uc.icon className="w-5 h-5 text-white/60" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-white text-sm">{uc.title}</h3>
                    <span className="text-xs text-white/30">{uc.time}</span>
                  </div>
                  <p className="text-xs text-foreground-tertiary leading-relaxed">{uc.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/templates" className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors">
              Ver todos os templates prontos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 bg-background-secondary">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Pronto para criar sua primeira orquestração?</h2>
          <p className="text-foreground-tertiary mb-8">
            Grátis para começar. Sem cartão. Templates prontos para não partir do zero.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" className="button-luxury px-10 py-4 text-base inline-flex items-center gap-2 justify-center">
              Criar Conta Grátis <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/templates" className="px-10 py-4 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-base text-center">
              Ver Templates
            </Link>
          </div>
        </div>
      </section>


    </div>
  )
}
