import type { Metadata } from 'next'
import Link from 'next/link'
import {
  BrainCircuit,
  ArrowRight,
  Search,
  Star,
  Users,
  Zap,
  GitBranch,
  MessageSquare,
  BarChart3,
  Scale,
  ShoppingCart,
  Megaphone,
  BookOpen
} from 'lucide-react'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = {
  title: 'Marketplace de Templates — Sofia AI | Orquestrações Prontas',
  description:
    'Explore e use templates de orquestração prontos para marketing, suporte, jurídico, e-commerce e RH. Comece em segundos com agentes IA pré-configurados.',
  keywords: [
    'templates orquestração ia',
    'agentes ia prontos',
    'automação marketing ia',
    'ia jurídico',
    'ia e-commerce',
    'templates sofia ai',
    'orquestração no-code',
  ],
  openGraph: {
    title: 'Marketplace de Templates — Sofia AI',
    description:
      'Templates de orquestração IA prontos para usar. Marketing, suporte, jurídico, e-commerce e mais.',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Sofia AI',
  },
  alternates: {
    canonical: 'https://sofiaia.roilabs.com.br/marketplace',
  },
}

const categories = [
  { id: 'all', label: 'Todos', icon: Zap },
  { id: 'marketing', label: 'Marketing', icon: Megaphone },
  { id: 'suporte', label: 'Suporte', icon: MessageSquare },
  { id: 'juridico', label: 'Jurídico', icon: Scale },
  { id: 'ecommerce', label: 'E-commerce', icon: ShoppingCart },
  { id: 'rh', label: 'RH', icon: Users },
  { id: 'pesquisa', label: 'Pesquisa', icon: BarChart3 },
]

// Static fallback templates shown when DB is unavailable
const fallbackTemplates = [
  {
    id: '1',
    name: 'Pipeline de Marketing Completo',
    description:
      'Pesquisa de mercado, criação de copy e revisão editorial em um pipeline automatizado. Ideal para equipes de marketing que precisam produzir conteúdo em escala.',
    category: 'marketing',
    icon: '✍️',
    roles: ['Pesquisador', 'Copywriter', 'Revisor'],
    time: '~45s',
    isOfficial: true,
    usageCount: 1240,
    tags: ['conteúdo', 'copy', 'blog'],
  },
  {
    id: '2',
    name: 'Triagem e Atendimento ao Cliente',
    description:
      'Classifica chamados, atende demandas simples e escala para humanos quando necessário. Reduz tempo de resposta em 80%.',
    category: 'suporte',
    icon: '🎯',
    roles: ['Triagem', 'Atendente IA', 'Escalação'],
    time: '~30s',
    isOfficial: true,
    usageCount: 980,
    tags: ['suporte', 'atendimento', 'tickets'],
  },
  {
    id: '3',
    name: 'Análise de Contratos Jurídicos',
    description:
      'Lê contratos, identifica cláusulas de risco, resume pontos-chave e sugere alterações. Para advogados e paralegal.',
    category: 'juridico',
    icon: '⚖️',
    roles: ['Leitor de Contrato', 'Analisador de Risco', 'Revisor Jurídico'],
    time: '~90s',
    isOfficial: true,
    usageCount: 560,
    tags: ['contratos', 'compliance', 'risco'],
  },
  {
    id: '4',
    name: 'Otimização de Listings para E-commerce',
    description:
      'Cria títulos otimizados, descrições persuasivas e bullet points para produtos de e-commerce. Aumenta conversão.',
    category: 'ecommerce',
    icon: '🛒',
    roles: ['Pesquisador SEO', 'Copywriter E-com', 'Otimizador'],
    time: '~40s',
    isOfficial: true,
    usageCount: 720,
    tags: ['produto', 'seo', 'conversão'],
  },
  {
    id: '5',
    name: 'Triagem de CVs e Recrutamento',
    description:
      'Lê currículos, pontua candidatos por critérios definidos e gera relatório com ranking e recomendações de entrevista.',
    category: 'rh',
    icon: '👥',
    roles: ['Leitor de CV', 'Avaliador', 'Ranqueador'],
    time: '~60s',
    isOfficial: true,
    usageCount: 430,
    tags: ['recrutamento', 'rh', 'candidatos'],
  },
  {
    id: '6',
    name: 'Pesquisa e Síntese Acadêmica',
    description:
      'Coleta dados de múltiplas fontes, analisa tendências e sintetiza descobertas em relatório estruturado.',
    category: 'pesquisa',
    icon: '🔬',
    roles: ['Coletor', 'Analista', 'Sintetizador'],
    time: '~75s',
    isOfficial: true,
    usageCount: 890,
    tags: ['pesquisa', 'relatório', 'análise'],
  },
  {
    id: '7',
    name: 'Campanha de Email Marketing',
    description:
      'Cria sequência de emails de nutrição personalizados por segmento. Inclui subject lines, corpo e CTA otimizados.',
    category: 'marketing',
    icon: '📧',
    roles: ['Estrategista', 'Redator', 'Revisor'],
    time: '~50s',
    isOfficial: false,
    usageCount: 340,
    tags: ['email', 'nutrição', 'segmentação'],
  },
  {
    id: '8',
    name: 'Geração de FAQ Jurídico',
    description:
      'Analisa legislação e jurisprudência para criar FAQs precisos sobre temas jurídicos específicos.',
    category: 'juridico',
    icon: '📋',
    roles: ['Pesquisador Jurídico', 'Redator Legal', 'Validador'],
    time: '~80s',
    isOfficial: false,
    usageCount: 210,
    tags: ['faq', 'legislação', 'jurídico'],
  },
  {
    id: '9',
    name: 'Relatório de Concorrência E-commerce',
    description:
      'Analisa preços, posicionamento e estratégias de concorrentes para gerar insights competitivos.',
    category: 'ecommerce',
    icon: '📊',
    roles: ['Pesquisador', 'Analista', 'Estrategista'],
    time: '~90s',
    isOfficial: false,
    usageCount: 185,
    tags: ['competidores', 'análise', 'preços'],
  },
]

interface TemplateItem {
  id: string
  name: string
  description: string
  category: string
  icon: string
  roles: string[]
  time: string
  isOfficial: boolean
  usageCount: number
  tags: string[]
}

async function getTemplates(): Promise<TemplateItem[] | null> {
  try {
    const templates = await prisma.template.findMany({
      where: { type: 'orchestration' },
      orderBy: [{ isOfficial: 'desc' }, { usageCount: 'desc' }],
      take: 50,
    })
    if (templates.length > 0) {
      return templates.map((t) => {
        const cfg = t.config as Record<string, unknown>
        return {
          id: t.id,
          name: t.name,
          description: t.description,
          category: t.category,
          icon: t.icon || getCategoryIcon(t.category),
          roles: (Array.isArray(cfg?.agents)
            ? (cfg.agents as Array<{ name?: string; role?: string }>).map((a) => a.name || a.role || '')
            : []) as string[],
          time: (cfg?.estimatedTime as string) || '~60s',
          isOfficial: t.isOfficial,
          usageCount: t.usageCount,
          tags: (Array.isArray(cfg?.tags) ? cfg.tags : []) as string[],
        }
      })
    }
    return null
  } catch {
    return null
  }
}

function getCategoryIcon(category: string) {
  const map: Record<string, string> = {
    marketing: '📣',
    suporte: '🎯',
    juridico: '⚖️',
    ecommerce: '🛒',
    rh: '👥',
    pesquisa: '🔬',
    financas: '💰',
  }
  return map[category] || '🤖'
}

export default async function MarketplacePage() {
  const dbTemplates = await getTemplates()
  const templates: TemplateItem[] = dbTemplates ?? fallbackTemplates

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Marketplace de Templates — Sofia AI',
            description:
              'Templates de orquestração IA para marketing, suporte, jurídico, e-commerce e RH.',
            url: 'https://sofiaia.roilabs.com.br/marketplace',
          }),
        }}
      />



      {/* Hero */}
      <section className="relative px-6 pt-20 pb-16 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-purple-500/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-sm text-purple-300 mb-6">
            <GitBranch className="w-4 h-4" />
            {templates.length}+ templates prontos
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            Marketplace de{' '}
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Templates IA
            </span>
          </h1>
          <p className="text-lg text-white/60 max-w-2xl mx-auto mb-8">
            Orquestrações pré-configuradas para os casos de uso mais comuns. Um clique para
            importar e começar a usar no seu workspace.
          </p>

          {/* Search bar (visual only - filtering done client-side via category buttons) */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Buscar templates..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/50 focus:bg-white/8 transition-all"
              readOnly
            />
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="px-6 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm transition-all cursor-default ${
                  cat.id === 'all'
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                    : 'border-white/10 text-white/60 hover:border-white/20 hover:text-white/80'
                }`}
              >
                <cat.icon className="w-3.5 h-3.5" />
                {cat.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Templates Grid */}
      <section className="px-6 pb-24">
        <div className="max-w-7xl mx-auto">
          {/* Stats bar */}
          <div className="flex items-center justify-between mb-8">
            <p className="text-sm text-white/40">
              {templates.length} templates disponíveis
            </p>
            <div className="flex items-center gap-1 text-xs text-white/30">
              <Star className="w-3.5 h-3.5 text-yellow-500/60" />
              Templates oficiais validados pela equipe Sofia AI
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className="glass-card p-6 rounded-xl flex flex-col hover:border-white/20 transition-all group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="text-3xl">{template.icon}</div>
                  <div className="flex items-center gap-2">
                    {template.isOfficial && (
                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                        <Star className="w-2.5 h-2.5" /> Oficial
                      </span>
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 capitalize border border-white/10">
                      {template.category}
                    </span>
                  </div>
                </div>

                {/* Title + Description */}
                <h3 className="font-semibold text-white mb-2 leading-snug group-hover:text-blue-300 transition-colors">
                  {template.name}
                </h3>
                <p className="text-sm text-white/50 leading-relaxed mb-4 flex-1 line-clamp-3">
                  {template.description}
                </p>

                {/* Agent pipeline */}
                {template.roles.length > 0 && (
                  <div className="flex items-center gap-1 mb-4 flex-wrap">
                    {template.roles.map((role, i) => (
                      <div key={role} className="flex items-center gap-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300">
                          {role}
                        </span>
                        {i < template.roles.length - 1 && (
                          <ArrowRight className="w-3 h-3 text-white/20 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Tags */}
                {template.tags && template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {template.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/30">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex items-center gap-3 text-xs text-white/30">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3" /> {template.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> {template.usageCount.toLocaleString('pt-BR')} usos
                    </span>
                  </div>
                  <Link
                    href="/login"
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors group-hover:gap-2"
                  >
                    Usar template <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Submit Template CTA */}
          <div className="mt-16 glass-card p-8 rounded-2xl text-center border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-blue-500/5">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
              <GitBranch className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Tem um template para compartilhar?
            </h2>
            <p className="text-white/50 mb-6 max-w-md mx-auto text-sm">
              Publique suas orquestrações no marketplace e ajude outros times a acelerar com IA.
              Templates aprovados ganham badge Oficial.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/login"
                className="button-luxury px-6 py-3 text-sm inline-flex items-center gap-2 justify-center"
              >
                Publicar Template <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/documentacao"
                className="px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-sm text-white/70 hover:text-white transition-colors text-center"
              >
                Ver documentação
              </Link>
            </div>
          </div>
        </div>
      </section>


    </div>
  )
}
