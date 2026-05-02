import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Zap, Bot, Network, Terminal } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Getting Started — Polaris IA Docs',
  description: 'Guia de início rápido: crie seu primeiro agente, orquestração e execute via API em menos de 10 minutos.',
  alternates: { canonical: 'https://polarisia.com.br/docs/getting-started' },
}

export default function GettingStartedPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">


      <div className="max-w-3xl mx-auto px-6 py-12 space-y-12">
        <div>
          <h1 className="text-3xl font-bold text-white mb-3">Getting Started</h1>
          <p className="text-foreground-tertiary leading-relaxed">
            Em 4 passos, você terá um agente IA criado, uma orquestração executando e acesso via API. Tempo estimado: 10 minutos.
          </p>
        </div>

        {/* Passo 1 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 text-sm font-bold flex items-center justify-center">1</div>
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-bold text-white">Criar um Agente</h2>
            </div>
          </div>
          <div className="ml-11 space-y-3">
            <p className="text-foreground-tertiary text-sm">Acesse o dashboard e crie seu primeiro agente de IA.</p>
            <ol className="space-y-2 text-sm text-foreground-tertiary">
              <li className="flex gap-2"><span className="text-blue-400 font-mono">→</span> Acesse <Link href="/dashboard/agents" className="text-blue-400 hover:underline">Dashboard &rarr; Agentes</Link></li>
              <li className="flex gap-2"><span className="text-blue-400 font-mono">→</span> Clique em &ldquo;Novo Agente&rdquo;</li>
              <li className="flex gap-2"><span className="text-blue-400 font-mono">→</span> Defina um nome e o System Prompt (ex: &ldquo;Você é um analista de mercado especialista em IA&rdquo;)</li>
              <li className="flex gap-2"><span className="text-blue-400 font-mono">→</span> Escolha o modelo (Llama 3.3 70B recomendado para início)</li>
              <li className="flex gap-2"><span className="text-blue-400 font-mono">→</span> Clique em &ldquo;Criar&rdquo;</li>
            </ol>
            <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
              <p className="text-xs text-white/40 mb-2 font-mono">System Prompt de exemplo:</p>
              <pre className="text-xs text-green-400 whitespace-pre-wrap">{`Você é um analista de mercado especialista em IA e tecnologia.
Seu objetivo é fornecer análises precisas, com dados e exemplos concretos.
Sempre cite fontes quando relevante. Responda em português brasileiro.`}</pre>
            </div>
          </div>
        </section>

        {/* Passo 2 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 text-sm font-bold flex items-center justify-center">2</div>
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-bold text-white">Criar uma Orquestração com 2 Agentes</h2>
            </div>
          </div>
          <div className="ml-11 space-y-3">
            <p className="text-foreground-tertiary text-sm">Orquestrações encadeiam múltiplos agentes em sequência. O output de um agente vira o input do próximo.</p>
            <ol className="space-y-2 text-sm text-foreground-tertiary">
              <li className="flex gap-2"><span className="text-purple-400 font-mono">→</span> Acesse <Link href="/dashboard/orchestrations" className="text-blue-400 hover:underline">Dashboard &rarr; Orquestrações</Link></li>
              <li className="flex gap-2"><span className="text-purple-400 font-mono">→</span> Clique em &ldquo;Nova Orquestração&rdquo;</li>
              <li className="flex gap-2"><span className="text-purple-400 font-mono">→</span> Adicione o Agente 1 (ex: &ldquo;Pesquisador&rdquo;) e o Agente 2 (ex: &ldquo;Escritor&rdquo;)</li>
              <li className="flex gap-2"><span className="text-purple-400 font-mono">→</span> Defina a estratégia: &ldquo;Sequential&rdquo; (um após o outro)</li>
              <li className="flex gap-2"><span className="text-purple-400 font-mono">→</span> Salve a orquestração</li>
            </ol>
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-sm">
              <p className="text-white font-medium mb-1">Dica: Use o AI Creator</p>
              <p className="text-white/60 text-xs">Descreva seu processo em texto e o AI Creator gera a orquestração automaticamente. Acesse via botão &ldquo;Criar com IA&rdquo; na lista de orquestrações.</p>
            </div>
          </div>
        </section>

        {/* Passo 3 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 text-sm font-bold flex items-center justify-center">3</div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-400" />
              <h2 className="text-xl font-bold text-white">Executar via Interface</h2>
            </div>
          </div>
          <div className="ml-11 space-y-3">
            <p className="text-foreground-tertiary text-sm">Execute a orquestração pela UI e veja o resultado em tempo real.</p>
            <ol className="space-y-2 text-sm text-foreground-tertiary">
              <li className="flex gap-2"><span className="text-green-400 font-mono">→</span> Abra a orquestração criada no Passo 2</li>
              <li className="flex gap-2"><span className="text-green-400 font-mono">→</span> Clique em &ldquo;Executar&rdquo;</li>
              <li className="flex gap-2"><span className="text-green-400 font-mono">→</span> Digite um input de teste (ex: &ldquo;Analise o mercado de SaaS de IA no Brasil em 2026&rdquo;)</li>
              <li className="flex gap-2"><span className="text-green-400 font-mono">→</span> Acompanhe o streaming em tempo real — cada agente responde em sequência</li>
              <li className="flex gap-2"><span className="text-green-400 font-mono">→</span> O resultado final pode ser exportado como PDF ou Markdown</li>
            </ol>
          </div>
        </section>

        {/* Passo 4 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 text-sm font-bold flex items-center justify-center">4</div>
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-orange-400" />
              <h2 className="text-xl font-bold text-white">Executar via API</h2>
            </div>
          </div>
          <div className="ml-11 space-y-4">
            <p className="text-foreground-tertiary text-sm">Integre Polaris IA em seus sistemas usando a API REST.</p>
            <div>
              <p className="text-xs text-white/40 mb-2">1. Gere uma API Key em <Link href="/dashboard/api-keys" className="text-blue-400 hover:underline">Dashboard &rarr; API Keys</Link></p>
            </div>
            <div>
              <p className="text-xs text-white/40 mb-2">2. Execute a orquestração:</p>
              <pre className="bg-black/60 border border-white/10 rounded-xl p-4 text-xs text-green-300 overflow-x-auto">{`curl -X POST https://polarisia.com.br/api/v1/orchestrations/SEU_ID/execute \\
  -H "Authorization: Bearer SUA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"input": "Analise o mercado de SaaS de IA no Brasil"}'`}</pre>
            </div>
            <div>
              <p className="text-xs text-white/40 mb-2">3. Faça polling para obter o resultado:</p>
              <pre className="bg-black/60 border border-white/10 rounded-xl p-4 text-xs text-green-300 overflow-x-auto">{`curl https://polarisia.com.br/api/v1/executions/EXECUTION_ID \\
  -H "Authorization: Bearer SUA_API_KEY"`}</pre>
            </div>
            <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg text-sm">
              <p className="text-white/80 text-xs">
                Consulte a <Link href="/docs" className="text-orange-400 hover:underline">referência completa da API</Link> para ver todos os endpoints disponíveis.
              </p>
            </div>
          </div>
        </section>

        {/* Próximos passos */}
        <section className="border-t border-white/10 pt-8">
          <h2 className="text-lg font-bold text-white mb-4">Próximos Passos</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { href: '/docs/plugins', title: 'Plugins', desc: 'Adicione funções JavaScript customizadas aos agentes', icon: '🧩' },
              { href: '/docs/agent-to-agent', title: 'Agent-to-Agent', desc: 'Faça agentes delegarem tarefas entre si', icon: '🔄' },
              { href: '/dashboard/integrations/hubspot', title: 'HubSpot', desc: 'Conecte agentes ao seu CRM', icon: '🧡' },
              { href: '/docs', title: 'API Reference', desc: 'Todos os endpoints com exemplos de código', icon: '📚' },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="glass-card p-4 rounded-xl hover:border-blue-500/30 transition-colors group">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="font-medium text-white group-hover:text-blue-400 transition-colors text-sm mb-1">{item.title}</div>
                <div className="text-xs text-foreground-tertiary">{item.desc}</div>
                <div className="mt-2 flex items-center gap-1 text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Ver docs <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
