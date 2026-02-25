import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Zap, Key, BookOpen, Code, Globe, Terminal, Puzzle, GitBranch, Rocket } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Documentação — Sofia AI',
  description: 'Guia de início rápido, referência da API REST e exemplos de integração da Sofia AI.',
  alternates: { canonical: 'https://sofiaia.roilabs.com.br/docs' },
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="navbar-glass sticky top-0 z-50 px-6 py-4 border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">Sofia AI</span>
            <span className="text-white/30 text-sm ml-1">/ Docs</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-foreground-secondary hover:text-white transition-colors">Dashboard</Link>
            <Link href="/register" className="button-luxury px-4 py-2 text-sm">Começar grátis</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12 flex gap-10">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <nav className="sticky top-24 space-y-1 text-sm">
            {[
              { label: 'Introdução', href: '#intro' },
              { label: 'Quick Start', href: '#quickstart' },
              { label: 'Autenticação', href: '#auth' },
              { label: 'Orquestrações', href: '#orchestrations' },
              { label: 'Agentes', href: '#agents' },
              { label: 'Execuções', href: '#executions' },
              { label: 'Erros', href: '#errors' },
              { label: 'SDKs & Exemplos', href: '#examples' },
            ].map(item => (
              <a
                key={item.href}
                href={item.href}
                className="block px-3 py-1.5 rounded-lg text-foreground-secondary hover:text-white hover:bg-white/5 transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 space-y-16">

          {/* Introdução */}
          <section id="intro">
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="w-6 h-6 text-blue-400" />
              <h1 className="text-3xl font-bold text-white">Documentação Sofia AI</h1>
            </div>
            <p className="text-foreground-tertiary leading-relaxed mb-6">
              A Sofia AI fornece uma API REST para gerenciar e executar orquestrações de agentes programaticamente.
              Use a API para integrar IA multi-agente diretamente nos seus sistemas, pipelines e aplicações.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              {[
                { icon: Key, title: 'API Key auth', desc: 'Autenticação simples via header X-API-Key' },
                { icon: Globe, title: 'REST JSON', desc: 'Endpoints REST padrão com resposta JSON' },
                { icon: Terminal, title: 'Qualquer linguagem', desc: 'Funciona com curl, Python, JS, Go, etc.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="glass-card p-4 rounded-xl">
                  <Icon className="w-5 h-5 text-blue-400 mb-2" />
                  <div className="font-medium text-white text-sm mb-1">{title}</div>
                  <div className="text-xs text-foreground-tertiary">{desc}</div>
                </div>
              ))}
            </div>
            {/* Cards de navegação de docs */}
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { icon: Rocket, href: '/docs/getting-started', title: 'Getting Started', desc: 'Crie agente, orquestração e execute via API em 10min', color: 'text-green-400' },
                { icon: Puzzle, href: '/docs/plugins', title: 'Plugins', desc: 'Funções JavaScript customizadas para agentes', color: 'text-purple-400' },
                { icon: GitBranch, href: '/docs/agent-to-agent', title: 'Agent-to-Agent', desc: 'Protocolo de delegação entre agentes', color: 'text-orange-400' },
                { icon: Code, href: '#orchestrations', title: 'API Reference', desc: 'Todos os endpoints REST com exemplos', color: 'text-blue-400' },
              ].map(({ icon: Icon, href, title, desc, color }) => (
                <Link key={href} href={href} className="glass-card p-4 rounded-xl hover:border-white/20 transition-colors group flex items-start gap-3">
                  <Icon className={`w-5 h-5 ${color} flex-shrink-0 mt-0.5`} />
                  <div>
                    <div className="font-medium text-white text-sm group-hover:text-blue-400 transition-colors">{title}</div>
                    <div className="text-xs text-foreground-tertiary mt-0.5">{desc}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-blue-400 transition-colors ml-auto flex-shrink-0 mt-0.5" />
                </Link>
              ))}
            </div>
          </section>

          {/* Quick Start */}
          <section id="quickstart">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" /> Quick Start
            </h2>
            <p className="text-foreground-tertiary text-sm mb-5">Em menos de 5 minutos você executa sua primeira orquestração via API.</p>
            <ol className="space-y-5 text-sm">
              <li>
                <div className="text-white font-medium mb-1">1. Crie sua conta e acesse o dashboard</div>
                <div className="text-foreground-tertiary mb-2">Registre-se em <Link href="/register" className="text-blue-400 hover:underline">sofiaia.roilabs.com.br/register</Link> e crie sua primeira orquestração.</div>
              </li>
              <li>
                <div className="text-white font-medium mb-1">2. Gere uma API Key</div>
                <div className="text-foreground-tertiary mb-2">Acesse <Link href="/dashboard/settings" className="text-blue-400 hover:underline">Dashboard → Settings → API Keys</Link> e crie uma chave.</div>
              </li>
              <li>
                <div className="text-white font-medium mb-1">3. Liste suas orquestrações</div>
                <pre className="bg-black/60 border border-white/10 rounded-xl p-4 text-xs text-green-300 overflow-x-auto">{`curl https://sofiaia.roilabs.com.br/api/public/orchestrations \\
  -H "X-API-Key: SUA_API_KEY"`}</pre>
              </li>
              <li>
                <div className="text-white font-medium mb-1">4. Execute uma orquestração</div>
                <pre className="bg-black/60 border border-white/10 rounded-xl p-4 text-xs text-green-300 overflow-x-auto">{`curl -X POST https://sofiaia.roilabs.com.br/api/public/orchestrations/ID/run \\
  -H "X-API-Key: SUA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"input": "Crie um relatório de mercado sobre IA no Brasil"}'`}</pre>
              </li>
            </ol>
          </section>

          {/* Autenticação */}
          <section id="auth">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-purple-400" /> Autenticação
            </h2>
            <p className="text-foreground-tertiary text-sm mb-4">
              Todas as requisições à API pública requerem um header <code className="bg-white/10 px-1.5 py-0.5 rounded text-white text-xs">X-API-Key</code> com sua chave de API.
            </p>
            <pre className="bg-black/60 border border-white/10 rounded-xl p-4 text-xs text-green-300 overflow-x-auto mb-4">{`X-API-Key: sk_live_xxxxxxxxxxxxxxxx`}</pre>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-sm text-yellow-300">
              <strong>Importante:</strong> Nunca exponha sua API key em código client-side ou repositórios públicos. Use variáveis de ambiente.
            </div>
          </section>

          {/* Orquestrações */}
          <section id="orchestrations">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Code className="w-5 h-5 text-green-400" /> Orquestrações
            </h2>
            <div className="space-y-6">
              <div className="glass-card rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
                  <span className="text-xs font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">GET</span>
                  <code className="text-sm text-white">/api/public/orchestrations</code>
                </div>
                <div className="p-4">
                  <p className="text-sm text-foreground-tertiary mb-3">Lista todas as orquestrações ativas da sua conta.</p>
                  <p className="text-xs text-white/40 mb-2">Resposta:</p>
                  <pre className="bg-black/60 rounded-lg p-3 text-xs text-green-300 overflow-x-auto">{`{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Pipeline de Marketing",
      "description": "Pesquisador → Copywriter → Revisor",
      "strategy": "sequential",
      "agents": [...],
      "createdAt": "2026-02-23T..."
    }
  ],
  "meta": { "count": 1 }
}`}</pre>
                </div>
              </div>

              <div className="glass-card rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
                  <span className="text-xs font-mono bg-green-500/20 text-green-300 px-2 py-0.5 rounded">POST</span>
                  <code className="text-sm text-white">/api/public/orchestrations/:id/run</code>
                </div>
                <div className="p-4">
                  <p className="text-sm text-foreground-tertiary mb-3">Executa uma orquestração com o input fornecido. Retorna um execution ID para polling.</p>
                  <p className="text-xs text-white/40 mb-2">Body:</p>
                  <pre className="bg-black/60 rounded-lg p-3 text-xs text-green-300 overflow-x-auto mb-3">{`{ "input": "Sua mensagem ou contexto aqui" }`}</pre>
                  <p className="text-xs text-white/40 mb-2">Resposta (202 Accepted):</p>
                  <pre className="bg-black/60 rounded-lg p-3 text-xs text-green-300 overflow-x-auto">{`{
  "success": true,
  "data": {
    "executionId": "uuid",
    "orchestrationId": "uuid",
    "status": "pending",
    "message": "Execution queued. Poll /api/public/executions/:id"
  }
}`}</pre>
                </div>
              </div>
            </div>
          </section>

          {/* Agentes */}
          <section id="agents">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Code className="w-5 h-5 text-orange-400" /> Agentes
            </h2>
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
                <span className="text-xs font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">GET</span>
                <code className="text-sm text-white">/api/public/agents</code>
              </div>
              <div className="p-4">
                <p className="text-sm text-foreground-tertiary mb-3">Lista todos os agentes ativos da sua conta.</p>
                <pre className="bg-black/60 rounded-lg p-3 text-xs text-green-300 overflow-x-auto">{`{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Copywriter",
      "description": "Especialista em copy persuasivo",
      "model": "llama-3.3-70b-versatile",
      "temperature": 0.7
    }
  ],
  "meta": { "count": 1 }
}`}</pre>
              </div>
            </div>
          </section>

          {/* Execuções */}
          <section id="executions">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyan-400" /> Execuções
            </h2>
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
                <span className="text-xs font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">GET</span>
                <code className="text-sm text-white">/api/public/executions/:id</code>
              </div>
              <div className="p-4">
                <p className="text-sm text-foreground-tertiary mb-3">Retorna status e resultado de uma execução. Faça polling até <code className="bg-white/10 px-1 rounded text-white text-xs">status</code> ser <code className="bg-white/10 px-1 rounded text-white text-xs">completed</code> ou <code className="bg-white/10 px-1 rounded text-white text-xs">failed</code>.</p>
                <pre className="bg-black/60 rounded-lg p-3 text-xs text-green-300 overflow-x-auto">{`{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "completed",  // pending | running | completed | failed
    "output": { "result": "Texto final gerado pela orquestração" },
    "durationMs": 4200,
    "tokensUsed": 1850,
    "completedAt": "2026-02-23T12:01:00Z"
  }
}`}</pre>
              </div>
            </div>
          </section>

          {/* Erros */}
          <section id="errors">
            <h2 className="text-xl font-bold text-white mb-4">Códigos de Erro</h2>
            <div className="glass-card rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-white/40 font-medium">Status</th>
                    <th className="text-left p-4 text-white/40 font-medium">Significado</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { code: '401', msg: 'API key inválida ou ausente' },
                    { code: '404', msg: 'Recurso não encontrado ou não pertence à sua conta' },
                    { code: '400', msg: 'Parâmetros inválidos ou ausentes no body' },
                    { code: '429', msg: 'Rate limit atingido — aguarde antes de tentar novamente' },
                    { code: '500', msg: 'Erro interno — tente novamente ou contate o suporte' },
                  ].map(row => (
                    <tr key={row.code} className="border-b border-white/5 last:border-0">
                      <td className="p-4">
                        <code className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-xs">{row.code}</code>
                      </td>
                      <td className="p-4 text-foreground-tertiary">{row.msg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* SDKs & Exemplos */}
          <section id="examples">
            <h2 className="text-xl font-bold text-white mb-4">SDKs & Exemplos</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-white/40 mb-2">Python</p>
                <pre className="bg-black/60 border border-white/10 rounded-xl p-4 text-xs text-green-300 overflow-x-auto">{`import requests

API_KEY = "SUA_API_KEY"
BASE = "https://sofiaia.roilabs.com.br/api/public"
headers = {"X-API-Key": API_KEY}

# Listar orquestrações
r = requests.get(f"{BASE}/orchestrations", headers=headers)
orchestrations = r.json()["data"]

# Executar a primeira
orch_id = orchestrations[0]["id"]
r = requests.post(f"{BASE}/orchestrations/{orch_id}/run",
    headers={**headers, "Content-Type": "application/json"},
    json={"input": "Analise o mercado de SaaS no Brasil"})
execution_id = r.json()["data"]["executionId"]

# Fazer polling
import time
while True:
    r = requests.get(f"{BASE}/executions/{execution_id}", headers=headers)
    data = r.json()["data"]
    if data["status"] in ("completed", "failed"):
        print(data["output"])
        break
    time.sleep(2)`}</pre>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-2">JavaScript / Node.js</p>
                <pre className="bg-black/60 border border-white/10 rounded-xl p-4 text-xs text-green-300 overflow-x-auto">{`const API_KEY = process.env.SOFIA_API_KEY;
const BASE = "https://sofiaia.roilabs.com.br/api/public";
const h = { "X-API-Key": API_KEY, "Content-Type": "application/json" };

// Executar orquestração
const run = await fetch(\`\${BASE}/orchestrations/ORCH_ID/run\`, {
  method: "POST",
  headers: h,
  body: JSON.stringify({ input: "Sua mensagem aqui" }),
}).then(r => r.json());

const execId = run.data.executionId;

// Polling
let result;
while (true) {
  result = await fetch(\`\${BASE}/executions/\${execId}\`, { headers: h }).then(r => r.json());
  if (["completed","failed"].includes(result.data.status)) break;
  await new Promise(r => setTimeout(r, 2000));
}
console.log(result.data.output);`}</pre>
              </div>
            </div>

            <div className="mt-8 p-5 glass-card rounded-xl flex items-start gap-4">
              <ArrowRight className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-white mb-1">Precisa de ajuda?</div>
                <p className="text-sm text-foreground-tertiary">
                  Abra uma issue no{' '}
                  <a href="https://github.com/JeanZorzetti/sofia-ia/issues" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">GitHub</a>
                  {' '}ou entre em contato pelo{' '}
                  <Link href="/contato" className="text-blue-400 hover:underline">formulário de suporte</Link>.
                </p>
              </div>
            </div>
          </section>

        </main>
      </div>
    </div>
  )
}
