import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Code2, Play, Shield, Layers } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Plugins — Sofia AI Docs',
  description: 'Como criar e usar plugins JavaScript customizados nos agentes Sofia AI. Estenda os agentes com funções locais, sem chamadas externas.',
  alternates: { canonical: 'https://sofiaia.roilabs.com.br/docs/plugins' },
}

const PLAN_LIMITS = [
  { plan: 'Free', limit: '2 plugins por agente', color: 'text-white/60' },
  { plan: 'Pro', limit: '10 plugins por agente', color: 'text-blue-400' },
  { plan: 'Business', limit: 'Ilimitado', color: 'text-purple-400' },
]

export default function DocsPluginsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">


      <div className="max-w-3xl mx-auto px-6 py-12 space-y-12">
        <div>
          <h1 className="text-3xl font-bold text-white mb-3">Plugins de Agente</h1>
          <p className="text-foreground-tertiary leading-relaxed">
            Plugins permitem adicionar funções JavaScript customizadas aos agentes. O agente pode chamar esses plugins como tools durante conversas, executando lógica local (formatação, cálculos, transformações de dados) sem chamadas externas.
          </p>
        </div>

        {/* O que são */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-bold text-white">O que são Plugins?</h2>
          </div>
          <div className="space-y-3 text-foreground-tertiary text-sm leading-relaxed">
            <p>
              Um plugin é uma função JavaScript que você escreve e associa a um agente. Quando o agente precisar executar essa função durante uma conversa, ele a chama como uma tool — e o resultado é injetado na resposta.
            </p>
            <p>
              Diferente de integrações OAuth (HubSpot, Salesforce), plugins são executados <strong className="text-white">localmente no servidor</strong>, sem chamadas externas. São ideais para transformações de dados, formatações, cálculos e validações.
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              {[
                { icon: '✅', title: 'Use para', items: ['Cálculos matemáticos', 'Formatação de dados (CPF, CEP, datas)', 'Geração de slugs, hashes', 'Validações locais', 'Transformação de strings'] },
                { icon: '❌', title: 'Não use para', items: ['Chamadas fetch/HTTP externas', 'Acesso ao sistema de arquivos', 'Operações com banco de dados', 'Processamento longo (> 5s)', 'Acesso a process.env'] },
              ].map((col) => (
                <div key={col.title} className="p-4 glass-card rounded-xl">
                  <div className="font-medium text-white mb-2">{col.icon} {col.title}</div>
                  <ul className="space-y-1">
                    {col.items.map((item) => (
                      <li key={item} className="text-xs text-foreground-tertiary flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-white/20 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sandbox de segurança */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-green-400" />
            <h2 className="text-xl font-bold text-white">Segurança (Sandbox)</h2>
          </div>
          <p className="text-foreground-tertiary text-sm mb-3">
            Todo código de plugin é executado em um ambiente restrito. As seguintes APIs globais são bloqueadas:
          </p>
          <pre className="bg-black/60 border border-white/10 rounded-xl p-4 text-xs text-red-400 overflow-x-auto">{`// BLOQUEADOS no ambiente de plugin:
fetch        // sem chamadas HTTP
require      // sem imports Node.js
process      // sem acesso ao processo
eval         // sem eval dinâmico
Function     // sem new Function() aninhado
XMLHttpRequest
WebSocket`}</pre>
          <p className="text-foreground-tertiary text-sm mt-3">
            Além disso, existe um <strong className="text-white">timeout de 5 segundos</strong>. Se o plugin demorar mais que isso, ele é interrompido com erro.
          </p>
        </section>

        {/* Como criar */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Code2 className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Como Criar um Plugin</h2>
          </div>
          <ol className="space-y-4 text-sm text-foreground-tertiary">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              <div>
                Acesse <Link href="/dashboard/agents" className="text-blue-400 hover:underline">Dashboard &rarr; Agentes</Link>, abra um agente e clique em <strong className="text-white">Plugins</strong>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              <div>Clique em <strong className="text-white">Novo Plugin</strong> e preencha: nome, descrição, input schema (JSON Schema) e código JS</div>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              <div>Use o botão <strong className="text-white">Testar</strong> para validar com um input JSON antes de salvar</div>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
              <div>O plugin fica disponível automaticamente no agente como uma tool</div>
            </li>
          </ol>
        </section>

        {/* Exemplos de código */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Play className="w-5 h-5 text-orange-400" />
            <h2 className="text-xl font-bold text-white">Exemplos de Código</h2>
          </div>
          <div className="space-y-6">
            {[
              {
                title: 'Calculadora Simples',
                desc: 'Executa operações matemáticas básicas',
                schema: `{
  "type": "object",
  "properties": {
    "operacao": { "type": "string", "enum": ["soma", "subtracao", "multiplicacao", "divisao"] },
    "a": { "type": "number" },
    "b": { "type": "number" }
  },
  "required": ["operacao", "a", "b"]
}`,
                code: `const { operacao, a, b } = input;
switch (operacao) {
  case 'soma': return a + b;
  case 'subtracao': return a - b;
  case 'multiplicacao': return a * b;
  case 'divisao':
    if (b === 0) throw new Error('Divisão por zero');
    return a / b;
  default: throw new Error('Operação desconhecida: ' + operacao);
}`,
              },
              {
                title: 'Formatador de CEP',
                desc: 'Formata CEP no padrão XXXXX-XXX',
                schema: `{
  "type": "object",
  "properties": {
    "cep": { "type": "string" }
  },
  "required": ["cep"]
}`,
                code: `const cep = String(input.cep).replace(/\\D/g, '');
if (cep.length !== 8) throw new Error('CEP deve ter 8 dígitos');
return cep.slice(0, 5) + '-' + cep.slice(5);`,
              },
              {
                title: 'Gerador de Slug',
                desc: 'Converte texto em slug para URLs',
                schema: `{
  "type": "object",
  "properties": {
    "texto": { "type": "string" }
  },
  "required": ["texto"]
}`,
                code: `const texto = String(input.texto);
return texto
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\\u0300-\\u036f]/g, '')
  .replace(/[^a-z0-9\\s-]/g, '')
  .replace(/\\s+/g, '-')
  .replace(/-+/g, '-')
  .trim();`,
              },
            ].map((example) => (
              <div key={example.title} className="glass-card rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5">
                  <div className="font-medium text-white text-sm">{example.title}</div>
                  <div className="text-xs text-foreground-tertiary mt-0.5">{example.desc}</div>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-xs text-white/40 mb-1.5">Input Schema:</p>
                    <pre className="bg-black/60 rounded-lg p-3 text-xs text-blue-300 overflow-x-auto">{example.schema}</pre>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-1.5">Código JavaScript:</p>
                    <pre className="bg-black/60 rounded-lg p-3 text-xs text-green-300 overflow-x-auto">{example.code}</pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Limites por plano */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">Limites por Plano</h2>
          <div className="glass-card rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-white/40 font-medium">Plano</th>
                  <th className="text-left p-4 text-white/40 font-medium">Plugins por agente</th>
                </tr>
              </thead>
              <tbody>
                {PLAN_LIMITS.map((row) => (
                  <tr key={row.plan} className="border-b border-white/5 last:border-0">
                    <td className="p-4 text-white font-medium">{row.plan}</td>
                    <td className={`p-4 font-medium ${row.color}`}>{row.limit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-foreground-tertiary mt-2">
            O limite é por agente. Um agente Pro pode ter até 10 plugins ativos simultaneamente.{' '}
            <Link href="/dashboard/billing" className="text-blue-400 hover:underline">Ver planos</Link>
          </p>
        </section>

        {/* API de plugins */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">API de Plugins</h2>
          <div className="space-y-3">
            {[
              { method: 'GET', path: '/api/agents/:id/plugins', desc: 'Lista plugins do agente' },
              { method: 'POST', path: '/api/agents/:id/plugins', desc: 'Cria novo plugin (valida sintaxe JS)' },
              { method: 'PATCH', path: '/api/agents/:id/plugins/:pluginId', desc: 'Edita plugin (nome, código, enabled)' },
              { method: 'DELETE', path: '/api/agents/:id/plugins/:pluginId', desc: 'Remove plugin' },
              { method: 'POST', path: '/api/agents/:id/plugins/:pluginId/test', desc: 'Testa plugin com { input: {...} }' },
            ].map((ep) => (
              <div key={ep.path} className="flex items-center gap-3 p-3 glass-card rounded-lg text-sm">
                <span className={`text-xs font-mono px-2 py-0.5 rounded font-bold ${ep.method === 'GET' ? 'bg-blue-500/20 text-blue-300' : ep.method === 'POST' ? 'bg-green-500/20 text-green-300' : ep.method === 'PATCH' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'}`}>
                  {ep.method}
                </span>
                <code className="text-white/80 flex-1">{ep.path}</code>
                <span className="text-foreground-tertiary text-xs hidden sm:block">{ep.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Navegação */}
        <div className="flex gap-4 pt-4 border-t border-white/10">
          <Link href="/docs/getting-started" className="flex-1 glass-card p-4 rounded-xl hover:border-blue-500/30 transition-colors group">
            <div className="text-xs text-foreground-tertiary mb-1">Anterior</div>
            <div className="font-medium text-white group-hover:text-blue-400 transition-colors text-sm flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Getting Started
            </div>
          </Link>
          <Link href="/docs/agent-to-agent" className="flex-1 glass-card p-4 rounded-xl hover:border-blue-500/30 transition-colors group text-right">
            <div className="text-xs text-foreground-tertiary mb-1">Próximo</div>
            <div className="font-medium text-white group-hover:text-blue-400 transition-colors text-sm flex items-center justify-end gap-1">
              Agent-to-Agent <ArrowRight className="w-3 h-3" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
