import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, BrainCircuit, BookOpen, Code2, GitBranch, Database, MessageSquare, Settings, Zap, ExternalLink, Github, Users, Star } from 'lucide-react'

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

        {/* Open Source Section */}
        <div className="max-w-5xl mx-auto mt-10 mb-8">
          <div className="glass-card p-6 rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <Github className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Sofia AI e Open Source</h3>
                <p className="text-[10px] text-white/40">MIT License — livre para usar, modificar e distribuir</p>
              </div>
              <span className="ml-auto flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                <Star className="w-3 h-3" /> Open Source
              </span>
            </div>
            <p className="text-sm text-white/50 mb-4">
              O codigo-fonte completo da Sofia AI esta disponivel no GitHub. Contribua com features,
              reporte bugs, ou faca o fork para criar sua propria versao.
            </p>
            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              {[
                { icon: Code2, label: 'Codigo-fonte completo', desc: 'Next.js, Prisma, TypeScript' },
                { icon: GitBranch, label: 'CONTRIBUTING.md', desc: 'Guia para contribuicoes' },
                { icon: Users, label: 'Issues abertas', desc: 'Participe das discussoes' },
              ].map((item) => (
                <a
                  key={item.label}
                  href="https://github.com/JeanZorzetti/sofia-ia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 rounded-lg bg-white/3 border border-white/5 hover:border-white/10 transition-colors group"
                >
                  <item.icon className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-white group-hover:text-green-300 transition-colors">{item.label}</p>
                    <p className="text-[10px] text-white/40">{item.desc}</p>
                  </div>
                </a>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="https://github.com/JeanZorzetti/sofia-ia"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm text-white"
              >
                <Github className="w-4 h-4" /> Ver no GitHub
              </a>
              <a
                href="https://github.com/JeanZorzetti/sofia-ia/blob/main/CONTRIBUTING.md"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-green-500/20 hover:bg-green-500/5 transition-colors text-sm text-green-400"
              >
                <ExternalLink className="w-4 h-4" /> Como Contribuir
              </a>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto">
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


    </div>
  )
}
