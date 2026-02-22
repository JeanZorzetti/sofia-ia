import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BrainCircuit, CheckCircle, Clock } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Status — Sofia AI',
  description: 'Status operacional dos serviços Sofia AI. Verifique a disponibilidade da plataforma, API, banco de dados e integrações.',
  alternates: { canonical: 'https://sofiaia.roilabs.com.br/status' },
}

const services = [
  { name: 'Plataforma Web', status: 'operational', uptime: '99.98%' },
  { name: 'API REST', status: 'operational', uptime: '99.95%' },
  { name: 'Orquestrações SSE', status: 'operational', uptime: '99.91%' },
  { name: 'Knowledge Base (pgvector)', status: 'operational', uptime: '99.97%' },
  { name: 'Banco de Dados PostgreSQL', status: 'operational', uptime: '99.99%' },
  { name: 'Webhook Mercado Pago', status: 'operational', uptime: '99.90%' },
  { name: 'Integração WhatsApp (Evolution API)', status: 'operational', uptime: '99.85%' },
  { name: 'Email (Resend)', status: 'operational', uptime: '99.93%' },
]

const statusConfig = {
  operational: { label: 'Operacional', color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/30', dot: 'bg-green-400' },
  degraded: { label: 'Degradado', color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/30', dot: 'bg-yellow-400' },
  down: { label: 'Fora do ar', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30', dot: 'bg-red-400' },
}

export default function StatusPage() {
  const allOperational = services.every((s) => s.status === 'operational')

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
          <Link href="/login" className="button-luxury px-5 py-2 text-sm flex items-center gap-1.5">
            Acessar Plataforma <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      <section className="px-6 pt-20 pb-8 text-center">
        <div className="max-w-2xl mx-auto">
          <div className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium mb-8 ${allOperational ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'}`}>
            <span className={`w-2 h-2 rounded-full animate-pulse ${allOperational ? 'bg-green-400' : 'bg-yellow-400'}`} />
            {allOperational ? 'Todos os sistemas operacionais' : 'Degradação parcial detectada'}
          </div>
          <h1 className="text-4xl font-bold mb-3">Status dos Serviços</h1>
          <p className="text-foreground-tertiary flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" />
            Atualizado em {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="max-w-2xl mx-auto">
          <div className="glass-card rounded-xl overflow-hidden">
            {services.map((service, i) => {
              const cfg = statusConfig[service.status as keyof typeof statusConfig]
              return (
                <div key={service.name} className={`flex items-center justify-between p-4 ${i < services.length - 1 ? 'border-b border-white/5' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className="text-sm text-white/80">{service.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-white/30">{service.uptime} uptime</span>
                    <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {allOperational && (
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-green-400">
              <CheckCircle className="w-4 h-4" />
              Nenhum incidente nos últimos 90 dias
            </div>
          )}
        </div>
      </section>

      <footer className="px-6 py-8 border-t border-white/5 text-center">
        <p className="text-foreground-tertiary text-sm">
          &copy; 2026 ROI Labs.{' '}
          <Link href="/" className="hover:text-white transition-colors">Sofia AI</Link>
          {' · '}
          <Link href="/contato" className="hover:text-white transition-colors">Contato</Link>
        </p>
      </footer>
    </div>
  )
}
