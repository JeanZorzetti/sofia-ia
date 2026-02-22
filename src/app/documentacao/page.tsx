import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, BrainCircuit, BookOpen, Code2, GitBranch, Database, MessageSquare, Settings, Zap, ExternalLink } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Documentação — Sofia AI',
  description: 'Documentação completa do Sofia AI. Guias de início rápido, referência de API, configuração de agentes, orquestrações, Knowledge Base e muito mais.',
  alternates: { canonical: 'https://sofiaia.roilabs.com.br/documentacao' },
}

const sections = [
  {
    icon: Zap,
    title: 'Início Rápido',
    desc: 'Configure sua conta e crie sua primeira orquestração em 5 minutos.',
    links: [
      { label: 'Criar conta gratuita', href: '/login' },
      { label: 'Como funciona', href: '/como-funciona' },
      { label: 'Templates prontos', href: '/templates' },
    ],
  },
  {
    icon: GitBranch,
    title: 'Orquestrações',
    desc: 'Crie e gerencie pipelines de agentes IA.',
    links: [
      { label: 'O que é orquestração', href: '/features/orchestrations' },
      { label: 'Estratégias: sequencial, paralela, consenso', href: '/features/orchestrations' },
      { label: 'Histórico e replay', href: '/features/orchestrations' },
    ],
  },
  {
    icon: Database,
    title: 'Knowledge Base',
    desc: 'Vetorize documentos e conecte contexto real aos seus agentes.',
    links: [
      { label: 'Formatos suportados (PDF, DOCX, CSV)', href: '/features' },
      { label: 'Busca semântica e pgvector', href: '/features' },
      { label: 'Preview de chunks', href: '/features' },
    ],
  },
  {
    icon: Code2,
    title: 'API Reference',
    desc: 'Integre o Sofia AI com suas aplicações via REST API.',
    links: [
      { label: 'Autenticação', href: '/api-reference' },
      { label: 'Endpoints de agentes', href: '/api-reference' },
      { label: 'Webhooks', href: '/api-reference' },
    ],
  },
  {
    icon: MessageSquare,
    title: 'Canais & Integrações',
    desc: 'Conecte WhatsApp, chat web e outras integrações.',
    links: [
      { label: 'WhatsApp via Evolution API', href: '/features' },
      { label: 'Chat widget embeddable', href: '/features' },
      { label: 'Webhooks de output', href: '/api-reference' },
    ],
  },
  {
    icon: Settings,
    title: 'Self-hosted',
    desc: 'Rode o Sofia AI na sua própria infraestrutura.',
    links: [
      { label: 'Requisitos de sistema', href: '/self-hosted' },
      { label: 'Docker Compose', href: '/self-hosted' },
      { label: 'Variáveis de ambiente', href: '/self-hosted' },
    ],
  },
]

export default function DocumentacaoPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="navbar-glass sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="https://sofiaia.roilabs.com.br/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <BrainCircuit className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">Sofia AI</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/documentacao" className="text-white text-sm font-medium flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" /> Docs
            </Link>
            <Link href="/api-reference" className="text-foreground-secondary hover:text-white transition-colors text-sm">API</Link>
            <Link href="/self-hosted" className="text-foreground-secondary hover:text-white transition-colors text-sm">Self-hosted</Link>
            <Link href="/blog" className="text-foreground-secondary hover:text-white transition-colors text-sm">Blog</Link>
          </div>
          <Link href="/login" className="button-luxury px-5 py-2 text-sm flex items-center gap-1.5">
            Acessar Plataforma <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      <section className="px-6 pt-20 pb-10 text-center">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Voltar para home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Documentação</span>
          </h1>
          <p className="text-lg text-foreground-tertiary">Tudo que você precisa para usar e integrar o Sofia AI.</p>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section) => (
            <div key={section.title} className="glass-card p-6 rounded-xl flex flex-col">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                <section.icon className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="font-semibold text-white mb-2">{section.title}</h2>
              <p className="text-xs text-foreground-tertiary mb-4 flex-1">{section.desc}</p>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" /> {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="max-w-5xl mx-auto mt-10">
          <div className="glass-card p-6 rounded-xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ExternalLink className="w-5 h-5 text-white/40" />
              <div>
                <h3 className="font-medium text-white text-sm">Repositório Open Source</h3>
                <p className="text-xs text-foreground-tertiary">Código-fonte, issues e contribuições no GitHub.</p>
              </div>
            </div>
            <a
              href="https://github.com/JeanZorzetti/sofia-ia"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2 rounded-lg border border-white/20 hover:bg-white/5 transition-colors text-sm text-white flex-shrink-0"
            >
              Ver no GitHub
            </a>
          </div>
        </div>
      </section>

      <footer className="px-6 py-8 border-t border-white/5 text-center">
        <p className="text-foreground-tertiary text-sm">
          &copy; 2026 ROI Labs.{' '}
          <Link href="/" className="hover:text-white transition-colors">Sofia AI</Link>
          {' · '}
          <Link href="/api-reference" className="hover:text-white transition-colors">API Reference</Link>
          {' · '}
          <Link href="/self-hosted" className="hover:text-white transition-colors">Self-hosted</Link>
        </p>
      </footer>
    </div>
  )
}
