import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, BrainCircuit, Clock, MapPin, MessageSquare, Users, Zap } from 'lucide-react'
import { ContactForm } from './ContactForm'

export const metadata: Metadata = {
  title: 'Contato — Sofia AI | Fale com nossa equipe',
  description: 'Entre em contato com a equipe Sofia AI para vendas, demonstrações, suporte técnico ou parcerias. Respondemos em até 24 horas úteis.',
  alternates: { canonical: 'https://sofiaia.roilabs.com.br/contato' },
}

const reasons = [
  {
    icon: Zap,
    title: 'Contratar um plano',
    desc: 'Quer começar com Pro ou Business? Nossa equipe te ajuda a escolher o melhor plano.',
  },
  {
    icon: Users,
    title: 'Demo personalizada',
    desc: 'Agende uma demonstração da plataforma com um especialista em 30 minutos.',
  },
  {
    icon: MessageSquare,
    title: 'Suporte técnico',
    desc: 'Problemas com integração, webhooks ou configuração? Resolveremos juntos.',
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

      <section className="px-6 pt-20 pb-6">
        <div className="max-w-5xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Voltar para home
          </Link>
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Fale com a{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                equipe Sofia
              </span>
            </h1>
            <p className="text-lg text-foreground-tertiary max-w-xl mx-auto">
              Preencha o formulário e nossa equipe entrará em contato em até 24 horas úteis.
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-5 gap-10">

          {/* Sidebar esquerda */}
          <div className="lg:col-span-2 space-y-6">
            {/* Motivos de contato */}
            <div className="space-y-4">
              {reasons.map((r) => (
                <div key={r.title} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <r.icon className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white text-sm mb-0.5">{r.title}</h3>
                    <p className="text-xs text-foreground-tertiary leading-relaxed">{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Info adicional */}
            <div className="glass-card p-5 rounded-xl space-y-4">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-white/30 flex-shrink-0" />
                <div>
                  <p className="text-sm text-white font-medium">Tempo de resposta</p>
                  <p className="text-xs text-foreground-tertiary">Até 24h úteis (Seg–Sex, 9h–18h BRT)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-white/30 flex-shrink-0" />
                <div>
                  <p className="text-sm text-white font-medium">ROI Labs</p>
                  <p className="text-xs text-foreground-tertiary">Brasil — Atendimento 100% remoto</p>
                </div>
              </div>
            </div>

            {/* Link para docs */}
            <div className="glass-card p-5 rounded-xl border border-white/5">
              <p className="text-sm text-white font-medium mb-1">Prefere se virar?</p>
              <p className="text-xs text-foreground-tertiary mb-3">Nossa documentação cobre a maioria das dúvidas técnicas.</p>
              <Link href="/documentacao" className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
                Acessar documentação <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Formulário */}
          <div className="lg:col-span-3">
            <ContactForm />
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
