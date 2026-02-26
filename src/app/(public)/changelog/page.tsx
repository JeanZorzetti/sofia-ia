import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, BrainCircuit, Zap, CheckCircle, Star } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Changelog — Sofia AI | Novidades e Atualizações',
  description: 'Acompanhe todas as novidades, melhorias e correções do Sofia AI. Atualizado regularmente.',
  openGraph: {
    title: 'Changelog Sofia AI — Novidades da Plataforma',
    description: 'Novas features, melhorias e correções do Sofia AI. Orquestração de agentes IA em constante evolução.',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Sofia AI',
    url: 'https://sofiaia.roilabs.com.br/changelog',
    images: [{ url: 'https://sofiaia.roilabs.com.br/opengraph-image', width: 1200, height: 630, alt: 'Sofia AI — Orquestração de Agentes IA' }],

  },
  twitter: {
    card: 'summary_large_image',
    title: 'Changelog Sofia AI — Novidades da Plataforma',
    description: 'Acompanhe todas as novidades, melhorias e correções do Sofia AI.',
  },
  alternates: { canonical: 'https://sofiaia.roilabs.com.br/changelog' },
}

const releases = [
  {
    version: 'v2.6.0',
    date: 'Fevereiro 2026',
    tag: 'Feature',
    tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    changes: [
      { type: 'new', text: 'Google Analytics 4 integrado no site público' },
      { type: 'new', text: 'Barra de uso de plano em tempo real no dashboard (agentes, mensagens, limites)' },
      { type: 'new', text: '5 templates de orquestração: Análise Jurídica, Pipeline de RH, Lançamento E-commerce, Triagem em Saúde, Análise de Investimento' },
      { type: 'new', text: 'Onboarding: step 4 "Experimente agora" — templates de orquestração disponíveis logo após criar o agente' },
      { type: 'new', text: 'Página pública /changelog' },
    ],
  },
  {
    version: 'v2.5.0',
    date: 'Fevereiro 2026',
    tag: 'Major',
    tagColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    changes: [
      { type: 'new', text: 'Integração Mercado Pago — PIX, cartão e assinaturas recorrentes' },
      { type: 'new', text: 'Onboarding wizard 4 passos com templates pré-configurados' },
      { type: 'new', text: 'Email de boas-vindas via Resend com template HTML responsivo' },
      { type: 'new', text: 'Dashboard de billing com uso em tempo real e barras de progresso' },
      { type: 'new', text: 'Limites por plano: Free / Pro / Business com enforcement automático' },
    ],
  },
  {
    version: 'v2.4.0',
    date: 'Janeiro 2026',
    tag: 'Major',
    tagColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    changes: [
      { type: 'new', text: 'Blog com 5 artigos SEO/GEO em MDX (SSG)' },
      { type: 'new', text: 'Páginas /features/orchestrations/ e /templates/ com deep dive' },
      { type: 'new', text: 'GitHub Actions CI — type-check, lint e build automáticos' },
      { type: 'new', text: 'Repositório público com README, CONTRIBUTING, Docker Compose' },
      { type: 'new', text: 'Landing page completa com SEO técnico e schema markup' },
      { type: 'new', text: 'Sitemap dinâmico incluindo posts do blog' },
    ],
  },
  {
    version: 'v2.3.0',
    date: 'Dezembro 2025',
    tag: 'Feature',
    tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    changes: [
      { type: 'new', text: 'Suporte a PDF, DOCX e CSV na Knowledge Base' },
      { type: 'new', text: 'Preview de chunks com busca semântica e score de similaridade' },
      { type: 'new', text: 'Histórico global de execuções com replay e filtros' },
      { type: 'new', text: 'Export de resultados em PDF, Markdown, JSON e CSV' },
    ],
  },
  {
    version: 'v2.2.0',
    date: 'Novembro 2025',
    tag: 'Feature',
    tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    changes: [
      { type: 'new', text: 'Analytics por orquestração — custo, tokens e tempo integrado no live view' },
      { type: 'new', text: 'Templates pré-configurados: Marketing, Suporte e Pesquisa' },
      { type: 'new', text: 'Streaming SSE granular com feedback visual por agente' },
      { type: 'improvement', text: 'UX do editor de orquestrações com badges de execução' },
    ],
  },
  {
    version: 'v2.0.0',
    date: 'Outubro 2025',
    tag: 'Major',
    tagColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    changes: [
      { type: 'new', text: 'Orquestração multi-agente com estratégias sequencial, paralela e consenso' },
      { type: 'new', text: 'Knowledge Base com RAG semântico (pgvector)' },
      { type: 'new', text: 'IDE multi-modelo com 50+ modelos (Groq, OpenAI, Anthropic, OpenRouter)' },
      { type: 'new', text: 'Inbox unificado com WhatsApp via Evolution API' },
      { type: 'new', text: 'Rate limiting e error boundaries em todas as rotas' },
    ],
  },
]

const typeIcon: Record<string, { label: string; color: string }> = {
  new: { label: 'Novo', color: 'text-green-400' },
  improvement: { label: 'Melhoria', color: 'text-blue-400' },
  fix: { label: 'Fix', color: 'text-yellow-400' },
}

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">


      <section className="px-6 pt-20 pb-10 text-center">
        <div className="max-w-2xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-sm text-blue-300 mb-6">
            <Zap className="w-4 h-4" /> Atualizado regularmente
          </div>
          <h1 className="text-4xl font-bold mb-4">Changelog</h1>
          <p className="text-foreground-tertiary">Todas as novidades, melhorias e correções do Sofia AI.</p>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-white/10" />
            <div className="space-y-10">
              {releases.map((release, i) => (
                <div key={release.version} className="relative pl-12">
                  <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center border ${i === 0 ? 'bg-blue-500/20 border-blue-500/40' : 'bg-white/5 border-white/10'}`}>
                    {i === 0 ? <Star className="w-4 h-4 text-blue-400" /> : <CheckCircle className="w-4 h-4 text-white/30" />}
                  </div>
                  <div className="glass-card p-6 rounded-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-lg font-bold text-white">{release.version}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${release.tagColor}`}>{release.tag}</span>
                      <span className="text-xs text-white/30 ml-auto">{release.date}</span>
                    </div>
                    <ul className="space-y-2">
                      {release.changes.map((c, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm">
                          <span className={`text-xs font-medium mt-0.5 ${typeIcon[c.type]?.color ?? 'text-white/40'}`}>
                            {typeIcon[c.type]?.label ?? c.type}
                          </span>
                          <span className="text-foreground-secondary">{c.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


    </div>
  )
}
