import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, BrainCircuit, Code2, Lock, Zap } from 'lucide-react'

export const metadata: Metadata = {
  title: 'API Reference — Sofia AI',
  description: 'Referência completa da API REST do Sofia AI. Autenticação, endpoints de agentes, orquestrações, Knowledge Base e webhooks.',
  alternates: { canonical: 'https://sofiaia.roilabs.com.br/api-reference' },
}

const endpoints = [
  {
    group: 'Autenticação',
    color: 'border-yellow-500/30',
    routes: [
      { method: 'POST', path: '/api/auth/register', desc: 'Criar nova conta' },
      { method: 'POST', path: '/api/auth/login', desc: 'Autenticar e obter token' },
      { method: 'POST', path: '/api/auth/logout', desc: 'Encerrar sessão' },
    ],
  },
  {
    group: 'Agentes',
    color: 'border-blue-500/30',
    routes: [
      { method: 'GET', path: '/api/agents', desc: 'Listar todos os agentes' },
      { method: 'POST', path: '/api/agents', desc: 'Criar novo agente' },
      { method: 'GET', path: '/api/agents/:id', desc: 'Obter agente por ID' },
      { method: 'PUT', path: '/api/agents/:id', desc: 'Atualizar agente' },
      { method: 'DELETE', path: '/api/agents/:id', desc: 'Remover agente' },
    ],
  },
  {
    group: 'Orquestrações',
    color: 'border-purple-500/30',
    routes: [
      { method: 'GET', path: '/api/orchestrations', desc: 'Listar orquestrações' },
      { method: 'POST', path: '/api/orchestrations', desc: 'Criar orquestração' },
      { method: 'POST', path: '/api/orchestrations/:id/execute', desc: 'Executar orquestração (SSE)' },
      { method: 'GET', path: '/api/orchestrations/executions', desc: 'Histórico de execuções' },
    ],
  },
  {
    group: 'Knowledge Base',
    color: 'border-emerald-500/30',
    routes: [
      { method: 'GET', path: '/api/knowledge', desc: 'Listar bases de conhecimento' },
      { method: 'POST', path: '/api/knowledge', desc: 'Criar nova KB' },
      { method: 'POST', path: '/api/knowledge/:id/upload', desc: 'Upload de documento' },
      { method: 'GET', path: '/api/knowledge/:id/chunks', desc: 'Listar chunks vetorizados' },
    ],
  },
  {
    group: 'Webhooks',
    color: 'border-pink-500/30',
    routes: [
      { method: 'POST', path: '/api/webhooks/mercadopago', desc: 'Webhook Mercado Pago (pagamentos)' },
    ],
  },
]

const methodColor: Record<string, string> = {
  GET: 'bg-blue-500/20 text-blue-300',
  POST: 'bg-green-500/20 text-green-300',
  PUT: 'bg-yellow-500/20 text-yellow-300',
  DELETE: 'bg-red-500/20 text-red-300',
  PATCH: 'bg-purple-500/20 text-purple-300',
}

export default function ApiReferencePage() {
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
            <Link href="/api-reference" className="text-white text-sm font-medium">API</Link>
            <Link href="/self-hosted" className="text-foreground-secondary hover:text-white transition-colors text-sm">Self-hosted</Link>
          </div>
          <Link href="/login" className="button-luxury px-5 py-2 text-sm flex items-center gap-1.5">
            Acessar Plataforma <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      <section className="px-6 pt-20 pb-10">
        <div className="max-w-4xl mx-auto">
          <Link href="/documentacao" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Documentação
          </Link>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-sm text-blue-300 mb-6">
            <Code2 className="w-4 h-4" /> REST API — Base URL: https://sofiaia.roilabs.com.br
          </div>
          <h1 className="text-4xl font-bold mb-4">API Reference</h1>
          <p className="text-foreground-tertiary mb-8">Integre o Sofia AI diretamente nas suas aplicações via REST API.</p>

          <div className="glass-card p-5 rounded-xl border border-yellow-500/20 bg-yellow-500/5 mb-10">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-white text-sm mb-1">Autenticação</p>
                <p className="text-xs text-foreground-tertiary mb-2">Todas as rotas autenticadas exigem cookie de sessão via NextAuth ou header <code className="bg-white/10 px-1 rounded">Authorization: Bearer TOKEN</code>.</p>
                <pre className="text-xs text-green-300 font-mono bg-black/30 p-3 rounded-lg">
{`POST /api/auth/login
Content-Type: application/json

{ "email": "seu@email.com", "password": "senha" }`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto space-y-8">
          {endpoints.map((group) => (
            <div key={group.group}>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full border ${group.color} bg-current`} />
                {group.group}
              </h2>
              <div className="glass-card rounded-xl overflow-hidden">
                {group.routes.map((route, i) => (
                  <div key={route.path} className={`flex items-center gap-4 p-4 ${i < group.routes.length - 1 ? 'border-b border-white/5' : ''}`}>
                    <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${methodColor[route.method] ?? 'bg-white/10 text-white/60'} flex-shrink-0 w-14 text-center`}>
                      {route.method}
                    </span>
                    <code className="text-sm text-white/80 font-mono flex-1">{route.path}</code>
                    <span className="text-xs text-foreground-tertiary hidden md:block">{route.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="max-w-4xl mx-auto mt-10 glass-card p-6 rounded-xl">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-white mb-2">Streaming SSE — Execução de Orquestrações</h3>
              <p className="text-xs text-foreground-tertiary mb-3">Execuções retornam Server-Sent Events (SSE) com updates em tempo real por agente.</p>
              <pre className="text-xs text-green-300 font-mono bg-black/30 p-3 rounded-lg overflow-x-auto">
{`const es = new EventSource('/api/orchestrations/ID/execute?input=...')
es.onmessage = (e) => {
  const data = JSON.parse(e.data)
  // data.type: 'agent_start' | 'agent_chunk' | 'agent_complete' | 'done'
  // data.agentName, data.content, data.metrics
}`}
              </pre>
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
