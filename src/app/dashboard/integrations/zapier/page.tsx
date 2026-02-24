'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Copy, CheckCircle, Zap, ExternalLink, Key, AlertCircle } from 'lucide-react'

interface ApiKey {
  id: string
  name: string
  keyPreview: string
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="ml-2 p-1 rounded hover:bg-white/10 transition-colors" title="Copiar">
      {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/50" />}
    </button>
  )
}

function CodeBlock({ code, language = 'json' }: { code: string; language?: string }) {
  return (
    <div className="relative bg-black/40 border border-white/10 rounded-lg p-4 font-mono text-sm overflow-x-auto">
      <CopyButton text={code} />
      <pre className="text-green-400 whitespace-pre-wrap">{code}</pre>
    </div>
  )
}

export default function ZapierIntegrationPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/user/api-keys')
      .then(r => r.json())
      .then(d => { if (d.success) setApiKeys(d.data) })
      .finally(() => setLoading(false))
  }, [])

  const firstKey = apiKeys[0]
  const baseUrl = 'https://sofiaia.roilabs.com.br'
  const authHeader = firstKey ? `Bearer ${firstKey.keyPreview}` : 'Bearer sk-xxxxxxxxxxxxxxxx'

  const pollExample = JSON.stringify([
    { id: "exec_123", timestamp: "2026-02-24T08:00:00Z", orchestrationId: "orch_abc", orchestrationName: "Relatório Semanal", status: "done", output: "Relatório gerado com sucesso..." }
  ], null, 2)

  const executeExample = JSON.stringify({ orchestrationId: "SEU_ORCHESTRATION_ID", input: "Parâmetro de entrada opcional" }, null, 2)

  const curlPoll = `curl -X GET "${baseUrl}/api/v1/integrations/zapier/poll" \\
  -H "Authorization: ${authHeader}"`

  const curlExecute = `curl -X POST "${baseUrl}/api/v1/integrations/zapier/execute" \\
  -H "Authorization: ${authHeader}" \\
  -H "Content-Type: application/json" \\
  -d '{"orchestrationId": "SEU_ORCHESTRATION_ID"}'`

  return (
    <div className="max-w-3xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/integrations">
          <button className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <Zap className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Integração com Zapier</h1>
            <p className="text-white/60 text-sm">Conecte Sofia AI a 6.000+ apps sem código</p>
          </div>
        </div>
      </div>

      {/* API Key warning */}
      {!loading && apiKeys.length === 0 && (
        <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-300 font-medium">Você ainda não tem uma API Key</p>
            <p className="text-white/60 text-sm mt-1">Crie uma API Key para usar nos exemplos abaixo.</p>
            <Link href="/dashboard/api-keys" className="inline-flex items-center gap-1 text-sm text-orange-400 hover:underline mt-2">
              <Key className="w-3 h-3" /> Criar API Key
            </Link>
          </div>
        </div>
      )}

      {!loading && apiKeys.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-green-300 font-medium">API Key detectada: {firstKey.name}</p>
            <p className="text-white/60 text-sm mt-1">Os exemplos abaixo já estão preenchidos com sua key (<code className="text-green-400">{firstKey.keyPreview}</code>).</p>
          </div>
        </div>
      )}

      {/* Conceito */}
      <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
        <h3 className="text-white font-medium mb-2">Como funciona</h3>
        <ul className="text-white/70 text-sm space-y-1">
          <li><span className="text-orange-400 font-mono">Trigger</span> — Zapier detecta novas execuções via polling (<code>/api/v1/integrations/zapier/poll</code>)</li>
          <li><span className="text-blue-400 font-mono">Action</span> — Zapier dispara uma orquestração via POST (<code>/api/v1/integrations/zapier/execute</code>)</li>
        </ul>
      </div>

      {/* Passo 1 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-orange-500/20 text-orange-400 text-sm font-bold flex items-center justify-center">1</span>
          <h2 className="text-lg font-semibold text-white">Criar API Key no Sofia AI</h2>
        </div>
        <p className="text-white/60 text-sm ml-10">Acesse <Link href="/dashboard/api-keys" className="text-orange-400 hover:underline">Dashboard → API Keys</Link> e crie uma key com escopo <code className="text-green-400">read,execute</code>.</p>
      </div>

      {/* Passo 2 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-orange-500/20 text-orange-400 text-sm font-bold flex items-center justify-center">2</span>
          <h2 className="text-lg font-semibold text-white">Configurar Trigger no Zapier (Polling)</h2>
        </div>
        <p className="text-white/60 text-sm ml-10">Crie um novo Zap. Escolha "Webhook by Zapier" → Polling. Use a URL e header abaixo:</p>
        <div className="ml-10 space-y-2">
          <p className="text-white/50 text-xs font-mono">URL:</p>
          <CodeBlock code={`${baseUrl}/api/v1/integrations/zapier/poll`} />
          <p className="text-white/50 text-xs font-mono mt-3">Header de autenticação:</p>
          <CodeBlock code={`Authorization: ${authHeader}`} />
          <p className="text-white/50 text-xs font-mono mt-3">Exemplo de resposta do trigger:</p>
          <CodeBlock code={pollExample} />
        </div>
      </div>

      {/* Passo 3 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-orange-500/20 text-orange-400 text-sm font-bold flex items-center justify-center">3</span>
          <h2 className="text-lg font-semibold text-white">Configurar Action no Zapier (Executar Orquestração)</h2>
        </div>
        <p className="text-white/60 text-sm ml-10">Na etapa de Action, escolha "Webhooks by Zapier" → POST. Configure assim:</p>
        <div className="ml-10 space-y-2">
          <p className="text-white/50 text-xs font-mono">URL da action:</p>
          <CodeBlock code={`${baseUrl}/api/v1/integrations/zapier/execute`} />
          <p className="text-white/50 text-xs font-mono mt-3">Body (JSON):</p>
          <CodeBlock code={executeExample} />
          <p className="text-white/50 text-xs font-mono mt-3">Teste via cURL:</p>
          <CodeBlock code={curlExecute} language="bash" />
        </div>
      </div>

      {/* Passo 4 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-orange-500/20 text-orange-400 text-sm font-bold flex items-center justify-center">4</span>
          <h2 className="text-lg font-semibold text-white">Testar e ativar o Zap</h2>
        </div>
        <p className="text-white/60 text-sm ml-10">Use o botão "Test" do Zapier para validar a conexão. Se retornar dados, o Zap está pronto.</p>
        <div className="ml-10">
          <CodeBlock code={curlPoll} language="bash" />
        </div>
      </div>

      {/* Casos de uso */}
      <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
        <h3 className="text-white font-medium mb-3">Casos de uso populares</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-white/70">
          <div className="flex items-start gap-2"><span className="text-orange-400">→</span> Novo lead no CRM → Executar agente de qualificação</div>
          <div className="flex items-start gap-2"><span className="text-orange-400">→</span> Email recebido → Gerar resposta com IA</div>
          <div className="flex items-start gap-2"><span className="text-orange-400">→</span> Form submetido → Criar relatório automático</div>
          <div className="flex items-start gap-2"><span className="text-orange-400">→</span> Planilha atualizada → Disparar orquestração de análise</div>
        </div>
      </div>

      {/* Links */}
      <div className="flex gap-3">
        <Link href="/dashboard/api-keys" className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-sm transition-colors">
          <Key className="w-4 h-4" /> Gerenciar API Keys
        </Link>
        <a href="https://zapier.com/app/zaps/new" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
          <ExternalLink className="w-4 h-4" /> Abrir Zapier
        </a>
      </div>
    </div>
  )
}
