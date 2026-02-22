import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, BrainCircuit, Mail, MessageSquare, ArrowRight, MapPin, Clock } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Contato — Sofia AI | ROI Labs',
  description: 'Entre em contato com a equipe Sofia AI. Suporte técnico, vendas, parcerias ou dúvidas gerais. Respondemos em até 24 horas.',
  alternates: { canonical: 'https://sofiaia.roilabs.com.br/contato' },
}

const contacts = [
  {
    icon: Mail,
    title: 'Email Geral',
    desc: 'Para dúvidas, sugestões e parcerias.',
    value: 'contato@roilabs.com.br',
    href: 'mailto:contato@roilabs.com.br',
  },
  {
    icon: MessageSquare,
    title: 'Suporte Técnico',
    desc: 'Problemas com a plataforma ou integração.',
    value: 'suporte@roilabs.com.br',
    href: 'mailto:suporte@roilabs.com.br',
  },
  {
    icon: ArrowRight,
    title: 'Vendas & Plano Business',
    desc: 'Negociação de contratos corporativos e SLA.',
    value: 'vendas@roilabs.com.br',
    href: 'mailto:vendas@roilabs.com.br?subject=Plano Business Sofia AI',
  },
]

export default function ContatoPage() {
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
            <Link href="/features" className="text-foreground-secondary hover:text-white transition-colors text-sm">Features</Link>
            <Link href="/preco" className="text-foreground-secondary hover:text-white transition-colors text-sm">Preço</Link>
            <Link href="/documentacao" className="text-foreground-secondary hover:text-white transition-colors text-sm">Docs</Link>
            <Link href="/blog" className="text-foreground-secondary hover:text-white transition-colors text-sm">Blog</Link>
          </div>
          <Link href="/login" className="button-luxury px-5 py-2 text-sm flex items-center gap-1.5">
            Começar Grátis <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      <section className="px-6 pt-20 pb-16 text-center">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Voltar para home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Fale com a{' '}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">equipe Sofia</span>
          </h1>
          <p className="text-lg text-foreground-tertiary">Respondemos em até 24 horas úteis.</p>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6">
          {contacts.map((c) => (
            <a key={c.title} href={c.href} className="glass-card p-6 rounded-xl hover-scale block">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                <c.icon className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="font-semibold text-white mb-1">{c.title}</h3>
              <p className="text-xs text-foreground-tertiary mb-3">{c.desc}</p>
              <span className="text-sm text-blue-400">{c.value}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="px-6 pb-16 border-t border-white/5 pt-12">
        <div className="max-w-2xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-card p-5 rounded-xl flex items-start gap-3">
              <Clock className="w-5 h-5 text-white/40 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-white text-sm mb-1">Horário de Atendimento</h4>
                <p className="text-xs text-foreground-tertiary">Segunda a Sexta, 9h–18h (BRT)</p>
              </div>
            </div>
            <div className="glass-card p-5 rounded-xl flex items-start gap-3">
              <MapPin className="w-5 h-5 text-white/40 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-white text-sm mb-1">ROI Labs</h4>
                <p className="text-xs text-foreground-tertiary">Brasil — Atendimento remoto</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="px-6 py-8 border-t border-white/5 text-center">
        <p className="text-foreground-tertiary text-sm">
          &copy; 2026 ROI Labs.{' '}
          <Link href="/" className="hover:text-white transition-colors">Sofia AI</Link>
          {' · '}
          <Link href="/termos" className="hover:text-white transition-colors">Termos</Link>
          {' · '}
          <Link href="/privacidade" className="hover:text-white transition-colors">Privacidade</Link>
        </p>
      </footer>
    </div>
  )
}
