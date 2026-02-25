import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight, CheckCircle, BrainCircuit, Shield, Lock, Globe,
  Users, Server, FileCheck, Headphones, ArrowLeft, Building2
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Enterprise — Sofia AI para Grandes Organizações',
  description: 'Sofia AI Enterprise: self-hosted (LGPD), SSO/SAML 2.0, SLA personalizado, compliance e gerente de conta dedicado. Fale com nossa equipe.',
  openGraph: {
    title: 'Sofia AI Enterprise — IA em Escala para Grandes Empresas',
    description: 'Self-hosted, SSO/SAML, SLA garantido, auditoria completa e suporte dedicado.',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Sofia AI',
    url: 'https://sofiaia.roilabs.com.br/enterprise',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sofia AI Enterprise — IA em Escala para Grandes Empresas',
    description: 'Self-hosted, SSO/SAML, SLA garantido e suporte dedicado.',
  },
  alternates: { canonical: 'https://sofiaia.roilabs.com.br/enterprise' },
}

const features = [
  {
    icon: Server,
    title: 'Self-hosted completo',
    description: 'Rode na sua infraestrutura via Docker Compose. Dados nunca saem do seu ambiente. LGPD e GDPR nativos.',
  },
  {
    icon: Lock,
    title: 'SSO / SAML 2.0',
    description: 'Integre com seu IdP existente (Okta, Azure AD, Google Workspace). Login único para toda a organização.',
  },
  {
    icon: FileCheck,
    title: 'Compliance e auditoria',
    description: 'Logs completos de auditoria, relatórios de compliance, controle de acesso granular por função.',
  },
  {
    icon: Shield,
    title: 'SLA personalizado',
    description: 'Uptime garantido por contrato. Suporte com tempo de resposta definido em SLA dedicado.',
  },
  {
    icon: Users,
    title: 'Treinamento da equipe',
    description: 'Sessões de onboarding técnico e treinamento para times de engenharia e negócio.',
  },
  {
    icon: Headphones,
    title: 'Gerente de conta dedicado',
    description: 'Ponto de contato único para suporte técnico, roadmap e escalações.',
  },
]

const trustedFeatures = [
  'Contrato e NDA',
  'Deploy assistido',
  'Revisão de segurança',
  'Integrações customizadas',
  'Treinamento de LLMs privados',
  'Co-desenvolvimento de features',
]

export default function EnterprisePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Schema Markup — SoftwareApplication */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Sofia AI Enterprise',
            applicationCategory: 'BusinessApplication',
            description: 'Plataforma enterprise de orquestração de agentes IA com self-hosted, SSO/SAML, SLA garantido e compliance completo.',
            operatingSystem: 'Web, Linux (self-hosted)',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'BRL',
              description: 'Preço customizado — contate vendas'
            },
            creator: {
              '@type': 'Organization',
              name: 'ROI Labs',
              url: 'https://roilabs.com.br'
            }
          })
        }}
      />
      {/* Schema Markup — FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'O que inclui o plano Enterprise da Sofia AI?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'O plano Enterprise inclui deploy self-hosted na infraestrutura do cliente, SSO/SAML 2.0 (Google Workspace, Azure AD), SLA garantido em contrato, compliance LGPD completo, gerente de conta dedicado, treinamento da equipe e suporte 24/7.'
                }
              },
              {
                '@type': 'Question',
                name: 'A Sofia AI suporta SSO com Azure AD e Google Workspace?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Sim. O plano Enterprise suporta SSO via OAuth 2.0 / SAML 2.0 com Microsoft Entra ID (Azure AD) e Google Workspace. É possível forçar SSO para todos os membros da organização e bloquear login por email/senha.'
                }
              },
              {
                '@type': 'Question',
                name: 'É possível fazer self-hosted da Sofia AI?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Sim. A Sofia AI é open-source (MIT) e pode ser implantada na infraestrutura do cliente via Docker Compose. O plano Enterprise inclui assistência técnica no deploy, atualizações gerenciadas e suporte de infraestrutura.'
                }
              },
              {
                '@type': 'Question',
                name: 'Qual o SLA do plano Enterprise?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'O SLA do Enterprise é 99.9% de uptime, com tempo de resposta garantido em contrato. Inclui janela de manutenção programada, alertas proativos e canal prioritário de suporte.'
                }
              }
            ]
          })
        }}
      />
      <nav className="navbar-glass sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <BrainCircuit className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">Sofia AI</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-foreground-secondary hover:text-white transition-colors">Entrar</Link>
            <Link href="/contato" className="button-luxury px-5 py-2 text-sm flex items-center gap-1.5">
              Falar com Vendas <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-20 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-500/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-5xl mx-auto text-center relative">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-sm text-blue-300 mb-8">
            <Building2 className="w-4 h-4" />
            Sofia AI Enterprise
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            IA para grandes<br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              organizações
            </span>
          </h1>
          <p className="text-xl text-foreground-tertiary max-w-2xl mx-auto mb-10">
            Self-hosted na sua infra. SSO corporativo. SLA garantido em contrato.
            Compliance e auditoria para empresas que não abrem mão de controle e segurança.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contato?type=enterprise" className="button-luxury px-10 py-4 text-base inline-flex items-center gap-2 justify-center">
              Falar com Vendas <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/preco" className="px-10 py-4 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-base text-center">
              Ver todos os planos
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-24 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Tudo que grandes empresas precisam</h2>
            <p className="text-foreground-tertiary max-w-xl mx-auto">
              Segurança, compliance e controle sem abrir mão da velocidade de inovação com IA.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="glass-card p-6 rounded-xl">
                <f.icon className="w-8 h-8 text-blue-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-foreground-tertiary leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* O que está incluído */}
      <section className="px-6 py-24 bg-background-secondary">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Além do software</h2>
              <p className="text-foreground-tertiary mb-8">
                Enterprise não é só um plano — é uma parceria. Trabalhamos junto com seu time técnico
                para garantir uma implantação segura, bem-sucedida e escalável.
              </p>
              <ul className="space-y-3">
                {trustedFeatures.map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-foreground-secondary">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass-card p-8 rounded-2xl">
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-white mb-1">Custom</div>
                <p className="text-white/50 text-sm">Precificado conforme volume e requisitos</p>
              </div>
              <ul className="space-y-3 mb-8">
                {['Tudo do Business', 'Self-hosted (LGPD)', 'SSO / SAML 2.0', 'SLA personalizado', 'Compliance e auditoria', 'Treinamento da equipe', 'Gerente de conta dedicado', 'Contrato e NDA'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground-secondary">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/contato?type=enterprise"
                className="block text-center py-3 px-6 rounded-xl font-medium bg-blue-500 hover:bg-blue-400 text-white transition-colors"
              >
                Solicitar proposta
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-6 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <Globe className="w-12 h-12 text-blue-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Pronto para começar?</h2>
          <p className="text-foreground-tertiary mb-8 text-lg">
            Agende uma call de 30 minutos com nossa equipe para entender seu caso de uso e montar uma proposta.
          </p>
          <Link href="/contato?type=enterprise" className="button-luxury px-12 py-4 text-base inline-flex items-center gap-2 justify-center">
            Agendar call <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <footer className="px-6 py-8 border-t border-white/5 text-center">
        <p className="text-foreground-tertiary text-sm">
          &copy; 2026 ROI Labs.{' '}
          <Link href="/" className="hover:text-white transition-colors">Sofia AI</Link>
          {' · '}
          <Link href="/preco" className="hover:text-white transition-colors">Planos</Link>
          {' · '}
          <Link href="/whitelabel" className="hover:text-white transition-colors">White-label</Link>
        </p>
      </footer>
    </div>
  )
}
