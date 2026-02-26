import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Github,
  MessageSquare,
  Users,
  Star,
  Zap,
  BookOpen,
  Heart,
  ExternalLink,
  Mail,
} from 'lucide-react'
import NewsletterForm from '@/components/NewsletterForm'
import { AnimatedSection } from '@/components/landing/AnimatedSection'
import { GradientText } from '@/components/landing/GradientText'
import { SectionWrapper } from '@/components/landing/SectionWrapper'

export const metadata: Metadata = {
  title: 'Comunidade Sofia AI — Discord, GitHub e Early Access',
  description: 'Junte-se à comunidade Sofia AI. Participe do Discord, contribua no GitHub, acesse o programa Early Adopter e fique por dentro de tudo sobre orquestração de agentes IA.',
  alternates: { canonical: 'https://sofiaia.roilabs.com.br/comunidade' },
  openGraph: {
    title: 'Comunidade Sofia AI',
    description: 'Discord, GitHub, Early Access e newsletter para quem constrói com agentes IA.',
    type: 'website',
    locale: 'pt_BR',
    images: [{ url: 'https://sofiaia.roilabs.com.br/opengraph-image', width: 1200, height: 630, alt: 'Sofia AI — Orquestração de Agentes IA' }],

  },
}

const channels = [
  { name: '#geral', description: 'Apresentações e conversa geral sobre IA' },
  { name: '#ajuda', description: 'Tire dúvidas sobre a plataforma' },
  { name: '#showcase', description: 'Mostre suas orquestrações e resultados' },
  { name: '#feedback', description: 'Sugestões e bugs para o time' },
  { name: '#artigos', description: 'Artigos, pesquisas e notícias de IA' },
  { name: '#oportunidades', description: 'Jobs e projetos relacionados a IA' },
]

const earlyAdopterBenefits = [
  '3 meses grátis no plano Pro (R$297/mês de valor)',
  'Acesso antecipado a todas as novas features',
  'Sessão de onboarding 1:1 com o time',
  'Badge exclusivo de Early Adopter',
  'Voto direto no roadmap do produto',
  'Grupo exclusivo no Discord com acesso ao fundador',
]

export default function ComunidadePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Hero */}
      <section className="px-6 pt-20 pb-16 text-center">
        <AnimatedSection className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-sm text-purple-300 mb-6">
            <Users className="w-4 h-4" /> Comunidade aberta e em crescimento
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Construa o futuro da{' '}
            <GradientText>IA junto com a gente</GradientText>
          </h1>
          <p className="text-lg text-foreground-tertiary max-w-2xl mx-auto mb-10">
            Uma comunidade de empresários, desenvolvedores e profissionais que usam orquestração multi-agente para
            automatizar e crescer. Aprenda, compartilhe e influencie o produto.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://discord.gg/sofiaia"
              target="_blank"
              rel="noopener noreferrer"
              className="button-luxury px-8 py-3.5 text-sm flex items-center gap-2 justify-center"
            >
              <MessageSquare className="w-4 h-4" /> Entrar no Discord
            </a>
            <a
              href="https://github.com/JeanZorzetti/sofia-ia"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3.5 rounded-xl border border-white/20 text-sm text-white/80 hover:bg-white/5 transition-colors flex items-center gap-2 justify-center"
            >
              <Github className="w-4 h-4" /> Ver no GitHub
            </a>
          </div>
        </AnimatedSection>
      </section>

      {/* Community hubs */}
      <SectionWrapper>
        <AnimatedSection>
        <div className="grid md:grid-cols-3 gap-6">

          {/* Discord */}
          <div className="glass-card rounded-2xl p-8 flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mb-5">
              <MessageSquare className="w-6 h-6 text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Discord</h2>
            <p className="text-white/50 text-sm mb-5 flex-1">
              O hub central da comunidade. Tire dúvidas, compartilhe suas automações, dê feedback e interaja diretamente
              com o time da Sofia AI.
            </p>
            <div className="space-y-2 mb-6">
              {channels.map((ch) => (
                <div key={ch.name} className="flex items-start gap-2 text-sm">
                  <span className="text-purple-400 font-mono text-xs mt-0.5 min-w-fit">{ch.name}</span>
                  <span className="text-white/40 text-xs">{ch.description}</span>
                </div>
              ))}
            </div>
            <a
              href="https://discord.gg/sofiaia"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              Entrar no Discord <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* GitHub */}
          <div className="glass-card rounded-2xl p-8 flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center mb-5">
              <Github className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">GitHub Open Source</h2>
            <p className="text-white/50 text-sm mb-5 flex-1">
              O Sofia AI é open source. Contribua com código, abra issues, sugira features e ajude a construir a melhor
              plataforma de orquestração multi-agente do Brasil.
            </p>
            <div className="space-y-3 mb-6">
              {[
                { icon: Star, label: 'Dê uma estrela no repositório', color: 'text-yellow-400' },
                { icon: BookOpen, label: 'Leia o CONTRIBUTING.md', color: 'text-blue-400' },
                { icon: Zap, label: 'Abra sua primeira issue ou PR', color: 'text-green-400' },
                { icon: Heart, label: 'Ajude a responder issues da comunidade', color: 'text-red-400' },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className="flex items-center gap-2 text-sm text-white/50">
                  <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
                  {label}
                </div>
              ))}
            </div>
            <a
              href="https://github.com/JeanZorzetti/sofia-ia"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl border border-white/20 hover:bg-white/5 text-white text-sm font-medium transition-colors"
            >
              <Github className="w-4 h-4" /> sofia-ia no GitHub <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Early Access */}
          <div className="rounded-2xl p-8 bg-gradient-to-b from-blue-500/15 to-purple-500/15 border border-blue-500/30 flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mb-5">
              <Zap className="w-6 h-6 text-blue-400" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-medium mb-3 w-fit">
              Vagas limitadas
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Early Adopter Program</h2>
            <p className="text-white/50 text-sm mb-5 flex-1">
              Para quem quer fazer parte da história do Sofia AI desde o início. Benefícios exclusivos para os primeiros
              adotantes.
            </p>
            <ul className="space-y-2 mb-6">
              {earlyAdopterBenefits.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-white/60">
                  <span className="text-blue-400 mt-0.5">✓</span>
                  {b}
                </li>
              ))}
            </ul>
            <Link
              href="/early-access"
              className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
            >
              Candidatar-se <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        </AnimatedSection>
      </SectionWrapper>

      {/* Newsletter */}
      <SectionWrapper alt>
        <div className="max-w-xl mx-auto text-center">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-5">
            <Mail className="w-6 h-6 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Newsletter semanal</h2>
          <p className="text-foreground-tertiary text-sm mb-8">
            Toda semana: novidades do produto, artigos sobre IA para empresas, tutoriais e cases de uso reais.
            Sem spam — só conteúdo que vale o seu tempo.
          </p>
          <NewsletterForm source="comunidade" />
        </div>
      </SectionWrapper>

      {/* Stats */}
      <section className="px-6 py-16 border-t border-white/5">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: 'Open Source', label: 'Repositório público no GitHub' },
            { value: 'PT-BR', label: 'Comunidade em português' },
            { value: '24h', label: 'Suporte via Discord' },
            { value: '1:1', label: 'Onboarding para Early Adopters' },
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="text-2xl font-bold text-white mb-1">{value}</div>
              <div className="text-sm text-foreground-tertiary">{label}</div>
            </div>
          ))}
        </div>
      </section>


    </div>
  )
}
