import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getAllSlugs, getPostBySlug, extractToc, formatDate } from '@/lib/blog'
import { BrainCircuit, ArrowRight, Clock, Calendar, User, Tag, ChevronRight } from 'lucide-react'

export const dynamic = 'force-static'

export async function generateStaticParams() {
  const slugs = getAllSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post) return { title: 'Post não encontrado' }

  const url = `https://sofiaia.roilabs.com.br/blog/${post.slug}`

  return {
    title: `${post.title} | Sofia AI Blog`,
    description: post.description,
    keywords: post.tags,
    authors: [{ name: post.author }],
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      locale: 'pt_BR',
      siteName: 'Sofia AI',
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
      url,
      images: [{ url: 'https://sofiaia.roilabs.com.br/opengraph-image', width: 1200, height: 630, alt: 'Sofia AI — Orquestração de Agentes IA' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
    alternates: {
      canonical: url,
    },
  }
}

const mdxComponents = {
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1
      className="text-3xl font-bold text-white mt-8 mb-4 leading-tight"
      {...props}
    />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => {
    const text = typeof props.children === 'string' ? props.children : ''
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
    return (
      <h2
        id={id}
        className="text-2xl font-semibold text-white mt-10 mb-4 leading-tight scroll-mt-20"
        {...props}
      />
    )
  },
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3
      className="text-xl font-semibold text-white mt-8 mb-3"
      {...props}
    />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="text-foreground-secondary leading-relaxed mb-5 text-base" {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="list-disc list-outside pl-5 mb-5 space-y-2 text-foreground-secondary" {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="list-decimal list-outside pl-5 mb-5 space-y-2 text-foreground-secondary" {...props} />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="leading-relaxed" {...props} />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-white" {...props} />
  ),
  em: (props: React.HTMLAttributes<HTMLElement>) => (
    <em className="italic text-white/80" {...props} />
  ),
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="border-l-4 border-blue-500/50 pl-4 py-1 my-6 text-foreground-tertiary italic bg-blue-500/5 rounded-r-lg"
      {...props}
    />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code
      className="bg-white/10 text-blue-300 px-1.5 py-0.5 rounded text-sm font-mono"
      {...props}
    />
  ),
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
    <pre
      className="bg-white/5 border border-white/10 rounded-xl p-4 overflow-x-auto text-sm font-mono text-white/80 my-6"
      {...props}
    />
  ),
  table: (props: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="overflow-x-auto my-8 rounded-xl border border-white/10">
      <table className="w-full text-sm" {...props} />
    </div>
  ),
  thead: (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="bg-white/5 border-b border-white/10" {...props} />
  ),
  th: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th className="p-3 text-left text-white font-semibold" {...props} />
  ),
  td: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="p-3 text-foreground-secondary border-t border-white/5" {...props} />
  ),
  tr: (props: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr className="hover:bg-white/3 transition-colors" {...props} />
  ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
      {...props}
    />
  ),
  hr: () => <hr className="border-white/10 my-8" />,
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post) notFound()

  const toc = extractToc(post.content)

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    author: {
      '@type': 'Organization',
      name: post.author,
      url: 'https://sofiaia.roilabs.com.br',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Sofia AI — ROI Labs',
      logo: {
        '@type': 'ImageObject',
        url: 'https://sofiaia.roilabs.com.br/favicon.ico',
      },
    },
    datePublished: post.date,
    dateModified: post.date,
    keywords: post.tags.join(', '),
    url: `https://sofiaia.roilabs.com.br/blog/${post.slug}`,
    inLanguage: 'pt-BR',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://sofiaia.roilabs.com.br/blog/${post.slug}`,
    },
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Article JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />



      {/* Breadcrumb */}
      <div className="px-6 pt-6 pb-2">
        <div className="max-w-5xl mx-auto flex items-center gap-2 text-xs text-white/40">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-white/60 truncate max-w-xs">{post.title}</span>
        </div>
      </div>

      {/* Article Layout */}
      <div className="px-6 py-8">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-[1fr_260px] gap-12">
          {/* Main Content */}
          <main>
            {/* Post Header */}
            <header className="mb-10">
              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20"
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {tag}
                  </span>
                ))}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
                {post.title}
              </h1>
              <p className="text-lg text-foreground-tertiary leading-relaxed mb-6">
                {post.description}
              </p>
              <div className="flex flex-wrap items-center gap-5 text-sm text-white/40 pb-6 border-b border-white/10">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  {post.author}
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formatDate(post.date)}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {post.readTime} de leitura
                </div>
              </div>
            </header>

            {/* MDX Content */}
            <article className="prose-blog">
              <MDXRemote source={post.content} components={mdxComponents} />
            </article>

            {/* CTA at end of post */}
            <div className="mt-14 p-8 rounded-2xl bg-gradient-to-br from-blue-500/15 to-purple-500/15 border border-blue-500/25 text-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center mx-auto mb-4">
                <BrainCircuit className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Crie sua conta grátis no Sofia IA
              </h3>
              <p className="text-foreground-tertiary text-sm mb-5 max-w-md mx-auto">
                Coloque em prática o que aprendeu. Primeira orquestração em menos de 5 minutos.
                Sem cartão de crédito.
              </p>
              <Link
                href="/login"
                className="button-luxury px-8 py-3 text-sm inline-flex items-center gap-2"
              >
                Começar Grátis <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Internal links */}
            <div className="mt-10 p-6 rounded-xl glass-card">
              <h4 className="text-sm font-semibold text-white mb-4">Continue aprendendo</h4>
              <div className="grid sm:grid-cols-2 gap-3">
                <Link
                  href="/features/orchestrations"
                  className="flex items-center gap-2 text-sm text-foreground-secondary hover:text-white transition-colors group"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-blue-400 group-hover:translate-x-1 transition-transform" />
                  Como funcionam as Orquestrações
                </Link>
                <Link
                  href="/templates"
                  className="flex items-center gap-2 text-sm text-foreground-secondary hover:text-white transition-colors group"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-blue-400 group-hover:translate-x-1 transition-transform" />
                  Templates prontos para usar
                </Link>
                <Link
                  href="/blog"
                  className="flex items-center gap-2 text-sm text-foreground-secondary hover:text-white transition-colors group"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-blue-400 group-hover:translate-x-1 transition-transform" />
                  Ver todos os artigos
                </Link>
                <Link
                  href="/login"
                  className="flex items-center gap-2 text-sm text-foreground-secondary hover:text-white transition-colors group"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-blue-400 group-hover:translate-x-1 transition-transform" />
                  Criar conta grátis
                </Link>
              </div>
            </div>
          </main>

          {/* Sidebar — TOC */}
          {toc.length > 0 && (
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <div className="glass-card p-5 rounded-xl">
                  <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">
                    Neste artigo
                  </h3>
                  <nav>
                    <ul className="space-y-2">
                      {toc.map((item) => (
                        <li key={item.id}>
                          <a
                            href={`#${item.id}`}
                            className="block text-sm text-foreground-secondary hover:text-white transition-colors leading-snug py-1"
                          >
                            {item.text}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </div>

                {/* Quick CTA */}
                <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-blue-500/15 to-purple-500/15 border border-blue-500/25">
                  <p className="text-xs text-white/70 mb-3">
                    Pronto para experimentar?
                  </p>
                  <Link
                    href="/login"
                    className="block text-center py-2 px-4 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-medium transition-colors"
                  >
                    Criar conta grátis
                  </Link>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Footer minimal */}

    </div>
  )
}
