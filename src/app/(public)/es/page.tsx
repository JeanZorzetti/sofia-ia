import type { Metadata } from 'next'
import Link from 'next/link'
import {
  GitBranch,
  Database,
  MessageSquare,
  Zap,
  Shield,
  CheckCircle,
  ArrowRight,
  BrainCircuit,
  Code2,
  Globe,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Sofia AI — Plataforma de Orquestación de Agentes IA | Latinoamérica',
  description:
    'Crea equipos de agentes IA que trabajan juntos para resolver tareas complejas. Orquestaciones multi-agente, Base de Conocimiento con RAG semántico e IDE multi-modelo. Gratis para empezar.',
  keywords: [
    'orquestación de agentes ia',
    'plataforma ia latinoamerica',
    'multi-agent ai',
    'agentes ia para empresas',
    'knowledge base rag',
    'ia generativa',
    'alternativa crewai en español',
    'automatizacion ia',
    'sofia ia espanol',
    'inteligencia artificial empresas latam',
  ],
  openGraph: {
    title: 'Sofia AI — Plataforma de Orquestación de Agentes IA',
    description:
      'Crea equipos de agentes IA que colaboran para resolver cualquier tarea. Más poderoso que CrewAI. Más simple que AutoGen.',
    type: 'website',
    locale: 'es_LA',
    siteName: 'Sofia AI',
    url: 'https://sofiaia.roilabs.com.br/es',
    images: [{ url: 'https://sofiaia.roilabs.com.br/opengraph-image', width: 1200, height: 630, alt: 'Sofia AI — Orquestração de Agentes IA' }],

  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sofia AI — Multi-Agent AI Orchestration Platform (Español)',
    description:
      'Crea equipos de agentes IA que colaboran. Base de Conocimiento RAG, IDE multi-modelo, WhatsApp. Gratis para empezar.',
  },
  alternates: {
    canonical: 'https://sofiaia.roilabs.com.br/es',
    languages: {
      'pt-BR': 'https://sofiaia.roilabs.com.br/',
      'es': 'https://sofiaia.roilabs.com.br/es',
      'en': 'https://sofiaia.roilabs.com.br/en',
    },
  },
}

const features = [
  {
    icon: GitBranch,
    title: 'Orquestación Multi-Agente',
    description:
      'Crea pipelines visuales con múltiples agentes colaborando en secuencia, en paralelo o por consenso. Sin código.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  {
    icon: Database,
    title: 'Base de Conocimiento + RAG',
    description:
      'Sube PDFs, DOCXs y CSVs. Búsqueda semántica vectorial para que tus agentes respondan con precisión.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    icon: MessageSquare,
    title: 'Integración WhatsApp',
    description:
      'Conecta tus agentes a WhatsApp Business vía Evolution API. Atención automatizada 24/7 en español.',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
  },
  {
    icon: BrainCircuit,
    title: 'IDE Multi-Modelo',
    description:
      'Prueba y compara agentes con GPT-4, Claude, Llama, Mistral y más de 100 modelos en una sola interfaz.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
  {
    icon: Code2,
    title: 'API REST Completa',
    description:
      'Integra Sofia AI en tus sistemas existentes con nuestra API REST documentada y SDKs en múltiples lenguajes.',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
  },
  {
    icon: Shield,
    title: 'Enterprise Ready',
    description:
      'SSO, RBAC, audit logs, LGPD/compliance y despliegue self-hosted para empresas que exigen seguridad.',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
]

export default function EsLandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Navigation */}
      <nav className="border-b border-white/10 sticky top-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/es" className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Sofia AI
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
            <Link href="/es#funcionalidades" className="hover:text-white transition-colors">Funcionalidades</Link>
            <Link href="/es/precios" className="hover:text-white transition-colors">Precios</Link>
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

      {/* Hero */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm mb-8">
            <Zap className="h-3.5 w-3.5" />
            Plataforma de IA para Empresas Latinoamericanas
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Crea Equipos de{' '}
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Agentes IA
            </span>{' '}
            que Trabajan Juntos
          </h1>

          <p className="text-xl text-white/60 max-w-3xl mx-auto mb-10 leading-relaxed">
            Orquestaciones multi-agente visuales, Base de Conocimiento con RAG semántico,
            IDE multi-modelo y canales de atención integrados. Automatiza cualquier proceso
            empresarial con IA en minutos.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link
              href="/register"
              className="group flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold text-lg hover:from-purple-500 hover:to-blue-500 transition-all shadow-lg shadow-purple-500/25"
            >
              Comenzar Gratis
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/es/precios"
              className="px-8 py-4 rounded-xl border border-white/20 text-white/80 hover:text-white hover:border-white/40 transition-all font-medium text-lg"
            >
              Ver Precios
            </Link>
          </div>

          <div className="flex items-center justify-center gap-6 text-sm text-white/40">
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              Sin tarjeta de crédito
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              Plan Free para siempre
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              Self-hosted disponible
            </span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="funcionalidades" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Todo lo que necesitas para escalar con IA
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Una plataforma completa para crear, orquestar y monitorear tus agentes IA en Latinoamérica
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className={`p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group`}
              >
                <div className={`w-12 h-12 rounded-xl ${feature.bg} border ${feature.border} flex items-center justify-center mb-4`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="p-12 rounded-3xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
            <h2 className="text-4xl font-bold text-white mb-4">
              Listo para automatizar con IA?
            </h2>
            <p className="text-white/60 text-xl mb-8">
              Únete a más de 500 empresas que ya utilizan Sofia AI para orquestar sus procesos con inteligencia artificial.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold text-lg hover:from-purple-500 hover:to-blue-500 transition-all"
            >
              Crear cuenta gratis
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>


    </div>
  )
}
