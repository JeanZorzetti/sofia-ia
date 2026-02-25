import {
  GitBranch,
  Database,
  BrainCircuit,
  MessageSquare,
  BarChart3,
  Code2,
} from 'lucide-react'
import { FeatureCardData } from '@/components/landing/FeatureCard'
import { FAQItem } from '@/components/landing/FAQSection'

export const homeFeatures: FeatureCardData[] = [
  {
    icon: GitBranch,
    title: 'Orquestração Multi-Agente',
    description:
      'Monte pipelines visuais onde cada agente tem um papel: Pesquisador, Analista, Revisor. Estratégias sequencial, paralela e consenso.',
    badge: 'Core',
    color: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
  },
  {
    icon: Database,
    title: 'Knowledge Base com RAG',
    description:
      'Vetorize documentos PDF, DOCX e CSV. Busca semântica pgvector com score de similaridade. Agentes com contexto real do seu negócio.',
    badge: 'P1',
    color: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
  },
  {
    icon: BrainCircuit,
    title: 'IDE Multi-Modelo',
    description:
      'Teste e compare Groq, OpenAI, Anthropic e 50+ modelos lado a lado. Streaming em tempo real com métricas de custo e tokens.',
    badge: 'Dev',
    color: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30',
  },
  {
    icon: MessageSquare,
    title: 'Inbox Unificado',
    description:
      'WhatsApp, chat web e múltiplos canais em uma tela. Agentes IA respondem automaticamente com escalada inteligente para humanos.',
    badge: 'Canais',
    color: 'from-green-500/20 to-green-600/20 border-green-500/30',
  },
  {
    icon: BarChart3,
    title: 'Analytics de Orquestrações',
    description:
      'Dashboard com custo por execução, tokens utilizados, taxa de sucesso e tempo médio. Histórico completo com replay de execuções.',
    badge: 'BI',
    color: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30',
  },
  {
    icon: Code2,
    title: 'Templates Prontos',
    description:
      'Comece em segundos com templates de Marketing (Pesquisador → Copywriter → Revisor), Suporte, Pesquisa e muito mais.',
    badge: 'Templates',
    color: 'from-pink-500/20 to-pink-600/20 border-pink-500/30',
  },
]

export const homeComparisons = [
  { feature: 'Interface visual no-code', sofia: true, crewai: false, autogen: false, langflow: true },
  { feature: 'Knowledge Base com RAG embutido', sofia: true, crewai: false, autogen: false, langflow: false },
  { feature: 'Streaming SSE por agente', sofia: true, crewai: false, autogen: false, langflow: false },
  { feature: 'WhatsApp/multi-canal integrado', sofia: true, crewai: false, autogen: false, langflow: false },
  { feature: 'Analytics de custo por execução', sofia: true, crewai: false, autogen: false, langflow: false },
  { feature: 'Replay de execuções', sofia: true, crewai: false, autogen: false, langflow: false },
  { feature: 'Self-hosted (Docker)', sofia: true, crewai: true, autogen: true, langflow: true },
  { feature: 'Modelos múltiplos (Groq, OpenAI...)', sofia: true, crewai: true, autogen: true, langflow: true },
]

export const homeOrchestrationTemplates = [
  {
    icon: '✍️',
    name: 'Pipeline de Marketing',
    roles: ['Pesquisador', 'Copywriter', 'Revisor'],
    time: '~45s',
    category: 'marketing',
  },
  {
    icon: '🎯',
    name: 'Triagem de Suporte',
    roles: ['Triagem', 'Atendente', 'Escalação'],
    time: '~30s',
    category: 'suporte',
  },
  {
    icon: '🔬',
    name: 'Pesquisa & Síntese',
    roles: ['Coletor', 'Analista', 'Sintetizador'],
    time: '~60s',
    category: 'pesquisa',
  },
]

export const homeFAQ: FAQItem[] = [
  {
    question: 'O que é orquestração de agentes IA?',
    answer:
      'Orquestração de agentes IA é a coordenação de múltiplos agentes de inteligência artificial para trabalhar juntos em tarefas complexas. Cada agente tem um papel específico (ex: Pesquisador, Analista, Revisor) e a saída de um alimenta o próximo, criando um pipeline inteligente.',
  },
  {
    question: 'Sofia é alternativa ao CrewAI?',
    answer:
      'Sim. Sofia oferece tudo que o CrewAI oferece (orquestração multi-agente) mais interface visual no-code, Knowledge Base com RAG embutido, canais de atendimento integrados (WhatsApp), analytics detalhado e replay de execuções. É mais completo e acessível.',
  },
  {
    question: 'Posso usar o Sofia de graça?',
    answer:
      'Sim. O plano Free inclui 3 orquestrações, 5 agentes, 1 Knowledge Base e 100 execuções por mês. Não requer cartão de crédito para começar.',
  },
]
