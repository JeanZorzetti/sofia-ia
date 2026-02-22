import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, BrainCircuit, Terminal, CheckCircle, AlertTriangle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Self-hosted — Rode o Sofia AI na sua Infraestrutura',
  description: 'Guia completo para instalar e rodar o Sofia AI na sua própria infraestrutura com Docker Compose. Requisitos, variáveis de ambiente e configuração.',
  alternates: { canonical: 'https://sofiaia.roilabs.com.br/self-hosted' },
}

const requirements = [
  { item: 'Docker 24+', ok: true },
  { item: 'Docker Compose v2+', ok: true },
  { item: 'PostgreSQL 15+ com extensão pgvector', ok: true },
  { item: 'Node.js 20+ (para dev local)', ok: true },
  { item: 'Mínimo 2 vCPU / 4 GB RAM', ok: true },
]

const envVars = [
  { key: 'DATABASE_URL', desc: 'URL do PostgreSQL (com pgvector)', example: 'postgresql://user:pass@host:5432/sofia' },
  { key: 'NEXTAUTH_SECRET', desc: 'Secret para NextAuth (JWT)', example: 'openssl rand -base64 32' },
  { key: 'NEXTAUTH_URL', desc: 'URL pública da aplicação', example: 'https://seu-dominio.com' },
  { key: 'GROQ_API_KEY', desc: 'Chave da API Groq (modelos rápidos)', example: 'gsk_...' },
  { key: 'OPENAI_API_KEY', desc: 'Chave OpenAI (opcional)', example: 'sk-...' },
  { key: 'OPENROUTER_API_KEY', desc: 'OpenRouter para 50+ modelos (opcional)', example: 'sk-or-...' },
  { key: 'MERCADOPAGO_ACCESS_TOKEN', desc: 'Token Mercado Pago para billing', example: 'APP_USR-...' },
  { key: 'RESEND_API_KEY', desc: 'API Resend para emails (opcional)', example: 're_...' },
]

export default function SelfHostedPage() {
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
            <Link href="/documentacao" className="text-foreground-secondary hover:text-white transition-colors text-sm">Docs</Link>
            <Link href="/api-reference" className="text-foreground-secondary hover:text-white transition-colors text-sm">API</Link>
            <Link href="/self-hosted" className="text-white text-sm font-medium">Self-hosted</Link>
          </div>
          <Link href="/login" className="button-luxury px-5 py-2 text-sm flex items-center gap-1.5">
            Versão Cloud <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      <section className="px-6 pt-20 pb-10">
        <div className="max-w-3xl mx-auto">
          <Link href="/documentacao" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Documentação
          </Link>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-sm text-emerald-300 mb-6">
            <Terminal className="w-4 h-4" /> Docker Compose disponível
          </div>
          <h1 className="text-4xl font-bold mb-4">Self-hosted</h1>
          <p className="text-foreground-tertiary">Rode o Sofia AI na sua própria infraestrutura com controle total.</p>
        </div>
      </section>

      <section className="px-6 pb-10">
        <div className="max-w-3xl mx-auto space-y-8">

          {/* Requisitos */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Requisitos</h2>
            <div className="glass-card p-5 rounded-xl">
              <ul className="space-y-2">
                {requirements.map((r) => (
                  <li key={r.item} className="flex items-center gap-2 text-sm text-white/80">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    {r.item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Quick start */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Quick Start</h2>
            <div className="space-y-3">
              {[
                { step: '1. Clone o repositório', code: 'git clone https://github.com/JeanZorzetti/sofia-ia.git\ncd sofia-ia' },
                { step: '2. Configure variáveis de ambiente', code: 'cp .env.example .env\n# Edite .env com suas credenciais' },
                { step: '3. Suba com Docker Compose', code: 'docker-compose up -d' },
                { step: '4. Execute as migrations', code: 'docker-compose exec app npx prisma db push\ndocker-compose exec app npx tsx prisma/seed.ts' },
              ].map((item) => (
                <div key={item.step} className="glass-card rounded-xl overflow-hidden">
                  <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-white/30" />
                    <span className="text-xs text-white/50">{item.step}</span>
                  </div>
                  <pre className="p-4 text-xs text-green-300 font-mono">{item.code}</pre>
                </div>
              ))}
            </div>
          </div>

          {/* Variáveis */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Variáveis de Ambiente</h2>
            <div className="glass-card rounded-xl overflow-hidden">
              {envVars.map((env, i) => (
                <div key={env.key} className={`p-4 ${i < envVars.length - 1 ? 'border-b border-white/5' : ''}`}>
                  <div className="flex items-start gap-3">
                    <code className="text-xs font-mono text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded flex-shrink-0">{env.key}</code>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground-tertiary mb-1">{env.desc}</p>
                      <p className="text-xs text-white/30 font-mono truncate">{env.example}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Aviso */}
          <div className="glass-card p-5 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-white text-sm mb-1">PostgreSQL com pgvector</p>
                <p className="text-xs text-foreground-tertiary">O Docker Compose inclui PostgreSQL 15 com a extensão pgvector já configurada. Para usar seu próprio PostgreSQL, instale a extensão manualmente: <code className="bg-white/10 px-1 rounded">CREATE EXTENSION vector;</code></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="px-6 py-8 border-t border-white/5 text-center">
        <p className="text-foreground-tertiary text-sm">
          &copy; 2026 ROI Labs.{' '}
          <Link href="/documentacao" className="hover:text-white transition-colors">Documentação</Link>
          {' · '}
          <Link href="https://github.com/JeanZorzetti/sofia-ia" className="hover:text-white transition-colors">GitHub</Link>
        </p>
      </footer>
    </div>
  )
}
