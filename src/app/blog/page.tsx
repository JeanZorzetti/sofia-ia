import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllPosts, formatDate } from '@/lib/blog'
import { BrainCircuit, ArrowRight, Clock, Tag } from 'lucide-react'
import NewsletterForm from '@/components/NewsletterForm'

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
  },
  alternates: {
    canonical: 'https://sofiaia.roilabs.com.br/blog',
  },
}

export default function BlogPage() {
  const posts = getAllPosts()

  return (
    <div className="min-h-screen bg-background text-foreground">
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
            <Link href="/#features" className="text-foreground-secondary hover:text-white transition-colors text-sm">
              Features
            </Link>
            <Link href="/features/orchestrations" className="text-foreground-secondary hover:text-white transition-colors text-sm">
              Orquestrações
            </Link>
            <Link href="/templates" className="text-foreground-secondary hover:text-white transition-colors text-sm">
              Templates
            </Link>
            <Link href="/blog" className="text-white transition-colors text-sm font-medium">
              Blog
            </Link>
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

      {/* Header */}
      <section className="relative px-6 pt-20 pb-16 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-500/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-sm text-blue-300 mb-6">
            <BrainCircuit className="w-4 h-4" />
            Blog & Guias
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Aprenda a Orquestrar
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Agentes IA
            </span>
          </h1>
          <p className="text-lg text-foreground-tertiary max-w-2xl mx-auto">
            Guias completos e artigos técnicos sobre orquestração de agentes, Knowledge Base com
            RAG e automação inteligente para empresas.
          </p>
        </div>
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

      {/* CTA */}
      <section className="px-6 py-16 bg-background-secondary border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">Pronto para criar sua primeira orquestração?</h2>
          <p className="text-foreground-tertiary mb-6 text-sm">
            Coloque em prática o que aprendeu. Crie sua conta grátis no Sofia IA — sem cartão,
            sem configuração complexa.
          </p>
          <Link href="/login" className="button-luxury px-8 py-3 text-sm inline-flex items-center gap-2">
            Criar Conta Grátis <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer minimal */}
      <footer className="px-6 py-8 border-t border-white/5">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <BrainCircuit className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white text-sm">Sofia AI</span>
          </Link>
          <p className="text-foreground-tertiary text-xs">
            &copy; 2026 ROI Labs. Plataforma de Orquestração de Agentes IA.
          </p>
          <div className="flex gap-4 text-xs text-foreground-tertiary">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/features/orchestrations" className="hover:text-white transition-colors">Orquestrações</Link>
            <Link href="/templates" className="hover:text-white transition-colors">Templates</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
