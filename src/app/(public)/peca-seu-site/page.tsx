import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Clock, FileCheck, MessageCircle } from 'lucide-react'
import { IntakeForm } from './IntakeForm'

export const metadata: Metadata = {
  title: 'Peça seu site — brief de 5 minutos | Polaris IA',
  description: 'Conte o que você precisa e receba uma proposta de escopo e preço fechado. Sites de produção construídos por um time de agentes de IA que revisa o próprio trabalho.',
  alternates: { canonical: 'https://polarisia.com.br/peca-seu-site' },
  openGraph: {
    title: 'Peça seu site — brief de 5 minutos',
    description: 'Conte o que você precisa e receba uma proposta de escopo e preço fechado.',
    type: 'website',
    locale: 'pt_BR',
  },
}

const nextSteps = [
  { icon: Clock, text: 'Brief de 5 minutos, sem compromisso' },
  { icon: FileCheck, text: 'Você recebe uma proposta com escopo e preço fechado' },
  { icon: MessageCircle, text: 'Aprovou? O time começa e você acompanha a entrega' },
]

export default function PecaSeuSitePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="px-6 pt-16 pb-24">
        <div className="max-w-2xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>

          <h1 className="text-4xl font-bold text-white mb-3">Peça seu site</h1>
          <p className="text-foreground-tertiary mb-10 text-lg">
            Conte o que você precisa. Um time de agentes de IA — desenvolvedor, revisor e líder técnico — constrói o site, revisa cada mudança e publica no seu domínio.
          </p>

          <div className="space-y-3 mb-10">
            {nextSteps.map((step) => (
              <div key={step.text} className="flex items-center gap-3 text-sm text-foreground-tertiary">
                <step.icon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                {step.text}
              </div>
            ))}
          </div>

          <IntakeForm />
        </div>
      </section>
    </div>
  )
}
