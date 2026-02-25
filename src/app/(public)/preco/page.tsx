import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Zap, Shield, CheckCircle } from 'lucide-react'
import { PricingGrid } from '@/components/landing/PricingGrid'
import { FAQSection } from '@/components/landing/FAQSection'
import { CTASection } from '@/components/landing/CTASection'
import { GradientText } from '@/components/landing/GradientText'
import { plans, pricingFAQ } from '@/data/pricing'

export const metadata: Metadata = {
  title: 'Preços — Planos Sofia AI | Free, Pro, Business e Enterprise',
  description: 'Conheça os planos do Sofia AI. Free para começar, Pro por R$297/mês, Business por R$997/mês e Enterprise custom para grandes empresas. Sem surpresas na fatura.',
  keywords: ['preço sofia ai', 'planos sofia ai', 'quanto custa sofia ai', 'plataforma agentes ia preço', 'orquestração ia gratis', 'sofia pro business enterprise'],
  openGraph: { title: 'Preços — Sofia AI | Free, Pro e Business', description: 'Comece grátis. Escale conforme cresce. Planos a partir de R$0/mês.', type: 'website', locale: 'pt_BR' },
  alternates: { canonical: 'https://sofiaia.roilabs.com.br/preco' },
}

const productSchema = {
  '@context': 'https://schema.org', '@type': 'Product', name: 'Sofia AI',
  description: 'Plataforma de orquestração de agentes IA com Knowledge Base RAG, IDE multi-modelo e canais integrados.',
  offers: [
    { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'BRL', availability: 'https://schema.org/InStock' },
    { '@type': 'Offer', name: 'Pro', price: '297', priceCurrency: 'BRL', availability: 'https://schema.org/InStock' },
    { '@type': 'Offer', name: 'Business', price: '997', priceCurrency: 'BRL', availability: 'https://schema.org/InStock' },
    { '@type': 'Offer', name: 'Enterprise', priceCurrency: 'BRL', availability: 'https://schema.org/InStock', description: 'Plano Enterprise com preço customizado.' },
  ],
}

export default function PrecosPage() {
  return (
    <div className="bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />

      {/* Hero */}
      <section className="px-6 pt-20 pb-16 text-center">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Voltar para home
          </Link>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-green-500/30 bg-green-500/10 text-sm text-green-300 mb-6">
            <Zap className="w-4 h-4" /> Comece grátis — sem cartão de crédito
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Preços <GradientText>transparentes</GradientText>
          </h1>
          <p className="text-lg text-foreground-tertiary max-w-xl mx-auto">
            Comece grátis. Escale conforme cresce. Sem surpresas na fatura.
          </p>
        </div>
      </section>

      {/* Planos */}
      <section className="px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          <PricingGrid plans={plans} />
          <div className="flex flex-wrap items-center justify-center gap-6 mt-6 text-sm text-white/40">
            <div className="flex items-center gap-2"><Shield className="w-4 h-4" /> SSL e dados seguros</div>
            <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Cancele quando quiser</div>
            <div className="flex items-center gap-2"><Zap className="w-4 h-4" /> Pagamento via Mercado Pago</div>
          </div>
          <p className="text-center mt-3">
            <Link href="/enterprise" className="text-xs text-white/40 hover:text-white/70 transition-colors">
              Saber mais sobre Enterprise →
            </Link>
          </p>
        </div>
      </section>

      <FAQSection items={pricingFAQ} title="Perguntas Frequentes sobre Preços" />

      <CTASection
        title="Comece agora, de graça"
        description="Sem cartão. Sem compromisso. Primeira orquestração em 5 minutos."
        secondaryCta={undefined}
      />
    </div>
  )
}
