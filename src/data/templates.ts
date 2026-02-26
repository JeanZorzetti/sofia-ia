import {
  TrendingUp, Headphones, Search, Scale, Building, Globe,
  Users, FileText, BarChart3
} from 'lucide-react'

export type StrategyType = 'sequential' | 'parallel' | 'consensus'

export interface Template {
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

export const templates: Template[] = [
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

export const categories = [
  'Todos', 'Marketing', 'Suporte', 'Pesquisa', 'Juridico',
  'Business Intelligence', 'RH', 'Financeiro', 'Produto'
]

export const strategyLabels: Record<StrategyType, { label: string; color: string }> = {
  sequential: { label: 'Sequencial', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  parallel: { label: 'Paralelo', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  consensus: { label: 'Consenso', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
}

export const difficultyColors: Record<string, string> = {
  'Facil': 'text-green-400',
  'Intermediario': 'text-yellow-400',
  'Avancado': 'text-orange-400'
}
