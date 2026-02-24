import type { Metadata } from 'next'
import Link from 'next/link'
import { Zap, Key, Terminal, Code, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'API Reference — Sofia AI',
  description: 'Documentação completa da API REST do Sofia AI. Autentique com API key e integre agentes e orquestrações de IA em qualquer aplicação.',
  alternates: { canonical: 'https://sofiaia.roilabs.com.br/docs/api' },
}

const BASE_URL = 'https://sofiaia.roilabs.com.br'

export default function ApiDocsPage() {
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
            <span className="text-white/30 text-sm ml-1">/ Docs / API</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/docs" className="text-sm text-white/50 hover:text-white transition-colors">Docs</Link>
            <Link href="/dashboard/api-keys" className="button-luxury px-4 py-2 text-sm">Gerar API Key</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-6">
            <Terminal className="w-3.5 h-3.5" />
            API v1 — Referência Completa
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            API REST do Sofia AI
          </h1>
          <p className="text-xl text-white/50 max-w-2xl">
            Integre agentes e orquestrações de IA em qualquer aplicação usando nossa API REST. Autentique com uma API key e comece em minutos.
          </p>
        </div>

        {/* Autenticação */}
        <Section id="auth" title="Autenticação" icon={<Key className="w-5 h-5 text-blue-400" />}>
          <p className="text-white/60 mb-4">
            Todas as requisições à API v1 requerem autenticação via Bearer token. Gere sua API key no{' '}
            <Link href="/dashboard/api-keys" className="text-blue-400 hover:text-blue-300 transition-colors">
              dashboard
            </Link>.
          </p>
          <CodeBlock lang="bash" code={`# Adicione o header Authorization em todas as requisições
curl -H "Authorization: Bearer sk_live_sua_api_key_aqui" \\
  ${BASE_URL}/api/v1/agents`} />

          <h3 className="text-white font-semibold mt-6 mb-3">Rate Limits</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { plan: 'Free', limit: '100 req/dia' },
              { plan: 'Pro', limit: '10.000 req/dia' },
              { plan: 'Business', limit: 'Ilimitado' },
            ].map((p) => (
              <div key={p.plan} className="glass-card p-3 rounded-xl text-center">
                <div className="text-white font-semibold text-sm">{p.plan}</div>
                <div className="text-white/50 text-xs mt-0.5">{p.limit}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Agentes */}
        <Section id="agents" title="Agentes" icon={<Code className="w-5 h-5 text-purple-400" />}>
          <Endpoint method="GET" path="/api/v1/agents" description="Lista todos os agentes ativos do seu tenant." />
          <CodeBlock lang="bash" code={`curl -H "Authorization: Bearer sk_live_..." \\
  ${BASE_URL}/api/v1/agents`} />
          <CodeBlock lang="json" code={`{
  "data": [
    {
      "id": "agent-uuid",
      "name": "Atendimento ao Cliente",
      "description": "Agente de suporte",
      "model": "llama-3.3-70b-versatile",
      "status": "active",
      "memoryEnabled": true,
      "createdAt": "2026-02-24T10:00:00Z"
    }
  ],
  "total": 1
}`} />

          <Endpoint method="POST" path="/api/v1/agents/[id]/chat" description="Envia uma mensagem para um agente e recebe a resposta." />
          <CodeBlock lang="bash" code={`curl -X POST ${BASE_URL}/api/v1/agents/AGENT_ID/chat \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Olá, preciso de ajuda", "conversationId": "conv_123"}'`} />
          <CodeBlock lang="json" code={`{
  "reply": "Olá! Estou aqui para ajudar. Qual é a sua dúvida?",
  "conversationId": "conv_123",
  "tokens": 156,
  "model": "llama-3.3-70b-versatile"
}`} />

          <h4 className="text-white/80 font-medium text-sm mt-6 mb-2">Exemplo com JavaScript</h4>
          <CodeBlock lang="javascript" code={`const response = await fetch('${BASE_URL}/api/v1/agents/AGENT_ID/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_live_...',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: 'Quais são os planos disponíveis?',
    conversationId: 'minha-sessao-123',
  }),
});

const { reply, conversationId, tokens } = await response.json();
console.log(reply);`} />
        </Section>

        {/* Orquestrações */}
        <Section id="orchestrations" title="Orquestrações" icon={<Code className="w-5 h-5 text-green-400" />}>
          <Endpoint method="GET" path="/api/v1/orchestrations" description="Lista todas as orquestrações ativas do seu tenant." />
          <CodeBlock lang="bash" code={`curl -H "Authorization: Bearer sk_live_..." \\
  ${BASE_URL}/api/v1/orchestrations`} />

          <Endpoint method="POST" path="/api/v1/orchestrations/[id]/execute" description="Executa uma orquestração de forma assíncrona. Retorna um executionId para consultar o status." />
          <CodeBlock lang="bash" code={`curl -X POST ${BASE_URL}/api/v1/orchestrations/ORCH_ID/execute \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"input": "Crie um relatório de vendas do mês", "variables": {"mes": "fevereiro"}}'`} />
          <CodeBlock lang="json" code={`{
  "executionId": "exec-uuid",
  "status": "pending",
  "orchestrationId": "ORCH_ID"
}`} />
        </Section>

        {/* Execuções */}
        <Section id="executions" title="Execuções" icon={<Code className="w-5 h-5 text-yellow-400" />}>
          <Endpoint method="GET" path="/api/v1/executions/[id]" description="Consulta o status e resultado de uma execução." />
          <CodeBlock lang="bash" code={`curl -H "Authorization: Bearer sk_live_..." \\
  ${BASE_URL}/api/v1/executions/EXECUTION_ID`} />
          <CodeBlock lang="json" code={`{
  "id": "exec-uuid",
  "orchestrationId": "ORCH_ID",
  "status": "completed",
  "output": "Relatório de vendas de fevereiro 2026...",
  "tokensUsed": 2847,
  "durationMs": 8432,
  "createdAt": "2026-02-24T10:00:00Z",
  "completedAt": "2026-02-24T10:00:08Z"
}`} />

          <div className="mt-4 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
            <h4 className="text-blue-400 font-medium text-sm mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Polling para execuções
            </h4>
            <p className="text-white/50 text-sm">
              Como as execuções são assíncronas, use polling para verificar quando concluem. Recomendamos intervalos de 2-5 segundos com timeout de 5 minutos.
            </p>
          </div>

          <h4 className="text-white/80 font-medium text-sm mt-6 mb-2">Polling com JavaScript</h4>
          <CodeBlock lang="javascript" code={`async function executeAndWait(orchestrationId, input) {
  const API_KEY = 'sk_live_...';
  const BASE = '${BASE_URL}';

  // Iniciar execução
  const { executionId } = await fetch(\`\${BASE}/api/v1/orchestrations/\${orchestrationId}/execute\`, {
    method: 'POST',
    headers: { 'Authorization': \`Bearer \${API_KEY}\`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
  }).then(r => r.json());

  // Aguardar conclusão via polling
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000)); // 5s

    const execution = await fetch(\`\${BASE}/api/v1/executions/\${executionId}\`, {
      headers: { 'Authorization': \`Bearer \${API_KEY}\` },
    }).then(r => r.json());

    if (execution.status === 'completed') return execution.output;
    if (execution.status === 'failed') throw new Error(execution.error);
  }

  throw new Error('Timeout: execução demorou mais de 5 minutos');
}

const output = await executeAndWait('orch-id', 'Relatório do mês');
console.log(output);`} />
        </Section>

        {/* Códigos de erro */}
        <Section id="errors" title="Códigos de Resposta" icon={<AlertCircle className="w-5 h-5 text-red-400" />}>
          <div className="space-y-2">
            {[
              { code: '200', label: 'OK', desc: 'Requisição bem-sucedida' },
              { code: '201', label: 'Created', desc: 'Recurso criado com sucesso' },
              { code: '202', label: 'Accepted', desc: 'Execução iniciada (assíncrono)' },
              { code: '400', label: 'Bad Request', desc: 'Parâmetros inválidos ou ausentes' },
              { code: '401', label: 'Unauthorized', desc: 'API key ausente ou inválida' },
              { code: '403', label: 'Forbidden', desc: 'Sem permissão para acessar o recurso' },
              { code: '404', label: 'Not Found', desc: 'Recurso não encontrado' },
              { code: '429', label: 'Too Many Requests', desc: 'Limite de requisições atingido' },
              { code: '500', label: 'Internal Server Error', desc: 'Erro interno do servidor' },
            ].map((e) => (
              <div key={e.code} className="flex items-center gap-3 glass-card p-3 rounded-xl">
                <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${
                  e.code.startsWith('2') ? 'bg-green-500/10 text-green-400' :
                  e.code.startsWith('4') ? 'bg-red-500/10 text-red-400' :
                  'bg-red-500/10 text-red-400'
                }`}>{e.code}</span>
                <span className="text-white/60 text-sm font-medium">{e.label}</span>
                <span className="text-white/40 text-sm">{e.desc}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* CTA */}
        <div className="mt-16 glass-card p-8 rounded-2xl text-center border border-blue-500/20">
          <CheckCircle className="w-10 h-10 text-blue-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Pronto para integrar?</h2>
          <p className="text-white/50 mb-6">Gere sua API key gratuitamente e comece a integrar em minutos.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard/api-keys" className="button-luxury px-6 py-3 text-sm flex items-center gap-2">
              Gerar API Key <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/docs" className="px-6 py-3 text-sm border border-white/10 rounded-xl hover:bg-white/5 text-white/70 transition-colors">
              Ver mais docs
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({
  id,
  title,
  icon,
  children,
}: {
  id: string
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section id={id} className="mb-16">
      <div className="flex items-center gap-3 mb-6">
        {icon}
        <h2 className="text-2xl font-bold text-white">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Endpoint({ method, path, description }: { method: string; path: string; description: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-green-500/10 text-green-400',
    POST: 'bg-blue-500/10 text-blue-400',
    PUT: 'bg-yellow-500/10 text-yellow-400',
    PATCH: 'bg-orange-500/10 text-orange-400',
    DELETE: 'bg-red-500/10 text-red-400',
  }

  return (
    <div className="flex items-start gap-3 mb-4 p-4 glass-card rounded-xl border border-white/5">
      <span className={`text-xs font-bold px-2 py-1 rounded font-mono flex-shrink-0 mt-0.5 ${colors[method] || 'bg-white/10 text-white/60'}`}>
        {method}
      </span>
      <div>
        <code className="text-white font-mono text-sm">{path}</code>
        <p className="text-white/50 text-sm mt-0.5">{description}</p>
      </div>
    </div>
  )
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  return (
    <div className="glass-card rounded-xl overflow-hidden mb-4 border border-white/5">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <span className="text-xs text-white/30 font-mono">{lang}</span>
      </div>
      <pre className="p-4 overflow-x-auto text-sm">
        <code className="text-green-300 font-mono">{code}</code>
      </pre>
    </div>
  )
}
