import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllPosts, formatDate } from '@/lib/blog'
import { BrainCircuit, ArrowRight, Clock, Tag } from 'lucide-react'
import NewsletterForm from '@/components/NewsletterForm'
import { AnimatedSection } from '@/components/landing/AnimatedSection'
import { CTASection } from '@/components/landing/CTASection'
import { GradientText } from '@/components/landing/GradientText'

export const metadata: Metadata = {
  title: 'Blog — Sofia AI | Orquestração de Agentes IA, RAG e Automação',
  description:
    'Artigos aprofundados sobre orquestração de agentes IA, Knowledge Base com RAG, automação inteligente e como implementar IA na sua empresa. Conteúdo técnico e prático em português.',
  keywords: [
    'blog ia',
    'orquestração agentes ia',
    'rag knowledge base',
    'automação inteligente',
    'inteligência artificial empresas',
    'multi-agent ai',
    'sofia ia blog',
  ],
  openGraph: {
    title: 'Blog Sofia AI — Orquestração de Agentes, RAG e Automação',
    description:
      'Guias completos sobre orquestração de agentes IA, Knowledge Base com RAG e automação inteligente para empresas brasileiras.',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Sofia AI',
    images: [{ url: 'https://sofiaia.roilabs.com.br/opengraph-image', width: 1200, height: 630, alt: 'Sofia AI — Orquestração de Agentes IA' }],

  },
  alternates: {
    canonical: 'https://sofiaia.roilabs.com.br/blog',
  },
}

export default function BlogPage() {
  const posts = getAllPosts()

  return (
    <div className="min-h-screen bg-background text-foreground">


      {/* Header */}
      <section className="relative px-6 pt-20 pb-16 overflow-hidden bg-dot-grid">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-500/5 rounded-full blur-3xl" />
        </div>
        <AnimatedSection className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-sm text-blue-300 mb-6">
            <BrainCircuit className="w-4 h-4" />
            Blog & Guias
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Aprenda a Orquestrar <GradientText>Agentes IA</GradientText>
          </h1>
          <p className="text-lg text-foreground-tertiary max-w-2xl mx-auto">
            Guias completos e artigos técnicos sobre orquestração de agentes, Knowledge Base com
            RAG e automação inteligente para empresas.
          </p>
        </AnimatedSection>
      </section>

      {/* Posts Grid */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          {posts.length === 0 ? (
            <div className="glass-card p-12 rounded-2xl text-center">
              <p className="text-foreground-tertiary">Nenhum artigo publicado ainda.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="glass-card p-6 rounded-xl hover-scale block group"
                >
                  {/* Tag highlight */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {post.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20"
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>

                  <h2 className="text-base font-semibold text-white mb-2 leading-snug group-hover:text-blue-300 transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-sm text-foreground-tertiary leading-relaxed mb-4 line-clamp-3">
                    {post.description}
                  </p>

                  <div className="flex items-center justify-between text-xs text-white/40 mt-auto">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {post.readTime}
                    </div>
                    <span>{formatDate(post.date)}</span>
                  </div>

                  <div className="flex items-center gap-1 mt-4 text-xs text-blue-400 font-medium group-hover:gap-2 transition-all">
                    Ler artigo <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter */}
      <section className="px-6 py-12 border-t border-white/5">
        <div className="max-w-md mx-auto">
          <NewsletterForm
            source="blog"
            title="Receba novos artigos por email"
            description="Todo novo artigo sobre IA, automação e orquestração direto na sua caixa de entrada."
          />
        </div>
      </section>

      <CTASection
        title="Pronto para criar sua primeira orquestração?"
        description="Coloque em prática o que aprendeu. Crie sua conta grátis no Sofia IA — sem cartão, sem configuração complexa."
        primaryCta={{ label: 'Criar Conta Grátis', href: '/login' }}
      />

      {/* Footer minimal */}

    </div>
  )
}
