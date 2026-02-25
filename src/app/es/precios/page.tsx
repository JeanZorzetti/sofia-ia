import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle, ArrowRight, Zap, Globe } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Precios — Sofia AI | Plataforma de Agentes IA',
  description:
    'Precios simples y transparentes para Sofia AI. Plan Free para siempre, Pro desde USD 39/mes. Orquestaciones multi-agente, Knowledge Base RAG y más.',
  keywords: [
    'sofia ai precios',
    'precio plataforma ia',
    'agentes ia precio',
    'orquestacion ia latinoamerica',
    'software ia empresas precio',
  ],
  openGraph: {
    title: 'Precios — Sofia AI',
    description: 'Planes simples para escalar con IA. Comienza gratis.',
    locale: 'es_LA',
    type: 'website',
    url: 'https://sofiaia.roilabs.com.br/es/precios',
  },
  alternates: {
    canonical: 'https://sofiaia.roilabs.com.br/es/precios',
    languages: {
      'pt-BR': 'https://sofiaia.roilabs.com.br/preco',
      'es': 'https://sofiaia.roilabs.com.br/es/precios',
      'en': 'https://sofiaia.roilabs.com.br/en/pricing',
    },
  },
}

const plans = [
  {
    name: 'Free',
    price: 'USD 0',
    period: '/mes',
    description: 'Para experimentar y proyectos personales',
    cta: 'Comenzar Gratis',
    href: '/register',
    highlight: false,
    features: [
      '3 agentes IA',
      '100 mensajes/mes',
      '1 orquestración activa',
      'Knowledge Base (10 docs)',
      'IDE multi-modelo',
      'Soporte por email',
    ],
    missing: [
      'WhatsApp Integration',
      'SSO Enterprise',
      'API Access',
    ],
  },
  {
    name: 'Pro',
    price: 'USD 39',
    period: '/mes',
    description: 'Para profesionales y equipos pequeños',
    cta: 'Suscribirse Pro',
    href: '/register?plan=pro',
    highlight: true,
    badge: 'Más Popular',
    features: [
      '20 agentes IA',
      '5.000 mensajes/mes',
      '10 orquestraciónes activas',
      'Knowledge Base (100 docs)',
      'WhatsApp Integration',
      'API REST + Webhooks',
      'Analytics avanzado',
      'Soporte prioritario',
    ],
    missing: [
      'SSO Enterprise',
    ],
  },
  {
    name: 'Business',
    price: 'USD 99',
    period: '/mes',
    description: 'Para empresas que escalan',
    cta: 'Suscribirse Business',
    href: '/register?plan=business',
    highlight: false,
    features: [
      'Agentes ilimitados',
      'Mensajes ilimitados',
      'Orquestaciones ilimitadas',
      'Knowledge Base ilimitada',
      'WhatsApp ilimitado',
      'SSO Google + Microsoft',
      'RBAC + Audit Logs',
      'White-label disponible',
      'SLA 99.9%',
      'Soporte dedicado',
    ],
    missing: [],
  },
]

export default function PreciosPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Navigation */}
      <nav className="border-b border-white/10 sticky top-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/es" className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Sofia AI
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
            <Link href="/es" className="hover:text-white transition-colors">Inicio</Link>
            <Link href="/es/precios" className="text-white">Precios</Link>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-white/60 hover:text-white transition-colors">
              Ingresar
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium hover:from-purple-500 hover:to-blue-500 transition-all"
            >
              Comenzar Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="py-20 px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm mb-6">
          <Zap className="h-3.5 w-3.5" />
          Precios para Latinoamérica
        </div>
        <h1 className="text-5xl font-bold mb-4">
          Planes simples y{' '}
          <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            transparentes
          </span>
        </h1>
        <p className="text-xl text-white/60 max-w-2xl mx-auto">
          Comienza gratis. Escala cuando lo necesites. Sin costos ocultos.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 border transition-all ${
                plan.highlight
                  ? 'bg-gradient-to-b from-purple-500/20 to-blue-500/10 border-purple-500/40 shadow-xl shadow-purple-500/20'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-semibold">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                <p className="text-white/50 text-sm mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-white/50 text-sm">{plan.period}</span>
                </div>
              </div>

              <Link
                href={plan.href}
                className={`block w-full text-center py-3 rounded-xl font-semibold mb-8 transition-all ${
                  plan.highlight
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {plan.cta}
              </Link>

              <ul className="space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                    <span className="text-white/80">{feature}</span>
                  </li>
                ))}
                {plan.missing.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm opacity-40">
                    <span className="h-4 w-4 shrink-0 mt-0.5 flex items-center justify-center">—</span>
                    <span className="text-white/50">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Enterprise CTA */}
        <div className="max-w-3xl mx-auto mt-12 p-8 rounded-2xl bg-white/5 border border-white/10 text-center">
          <h3 className="text-2xl font-bold text-white mb-2">¿Necesitas algo más grande?</h3>
          <p className="text-white/60 mb-6">
            Para organizaciones con requisitos específicos, implementación self-hosted o volúmenes de mensajes
            superiores a 1 millón por mes.
          </p>
          <Link
            href="/enterprise"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-purple-500/40 text-purple-300 hover:bg-purple-500/10 transition-all"
          >
            Hablar con ventas Enterprise
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/40">
          <p>© 2025 ROI Labs. Todos los derechos reservados.</p>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-white/60 flex items-center gap-1.5 transition-colors">
              <Globe className="h-3.5 w-3.5" />
              Idioma:
            </Link>
            <Link href="/" className="hover:text-white/60 transition-colors">🇧🇷 Português</Link>
            <Link href="/es/precios" className="text-purple-400">🇪🇸 Español</Link>
            <Link href="/en" className="hover:text-white/60 transition-colors">🇺🇸 English</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
