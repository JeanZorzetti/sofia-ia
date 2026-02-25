import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, GitBranch, AlertTriangle, Network, BookOpen } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Agent-to-Agent Protocol — Sofia AI Docs',
  description: 'Como agentes Sofia AI se comunicam e delegam tarefas entre si. Entenda o protocolo de delegação, limites de profundidade e como configurar.',
  alternates: { canonical: 'https://sofiaia.roilabs.com.br/docs/agent-to-agent' },
}

export default function DocsAgentToAgentPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">


      <div className="max-w-3xl mx-auto px-6 py-12 space-y-12">
        <div>
          <h1 className="text-3xl font-bold text-white mb-3">Agent-to-Agent Protocol</h1>
          <p className="text-foreground-tertiary leading-relaxed">
            O protocolo agent-to-agent permite que um agente chame outro agente como especialista durante uma conversa. É o mecanismo que transforma agentes individuais em uma rede colaborativa.
          </p>
        </div>

        {/* Como funciona */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Network className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Como Funciona</h2>
          </div>
          <div className="space-y-4 text-foreground-tertiary text-sm">
            <p>
              Todos os agentes Sofia AI têm acesso à tool <code className="bg-white/10 px-1.5 py-0.5 rounded text-white text-xs">delegate_to_agent</code>. Quando o agente considera que uma tarefa exige expertise específica de outro agente, ele pode chamar essa tool com o ID do agente alvo e a mensagem a ser processada.
            </p>
            <div className="p-4 glass-card rounded-xl">
              <div className="text-xs text-white/40 mb-2 font-mono">Fluxo de uma delegação:</div>
              <div className="flex flex-col gap-2 text-sm">
                {[
                  { step: '1', label: 'Usuário', msg: 'Analise este contrato jurídico e resuma os riscos financeiros', color: 'bg-blue-500/20 text-blue-300' },
                  { step: '2', label: 'Agente Principal', msg: 'delegate_to_agent("agente-juridico", "Identifique cláusulas de risco")', color: 'bg-purple-500/20 text-purple-300' },
                  { step: '3', label: 'Agente Jurídico', msg: 'Cláusulas 4.2 e 7.1 apresentam riscos de multa acima de 20%...', color: 'bg-green-500/20 text-green-300' },
                  { step: '4', label: 'Agente Principal', msg: 'Resposta final combinando análise jurídica + financeira', color: 'bg-orange-500/20 text-orange-300' },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold flex-shrink-0 mt-0.5 ${item.color}`}>
                      {item.step}. {item.label}
                    </span>
                    <span className="text-white/60 text-xs">{item.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Tool delegate_to_agent */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <GitBranch className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Tool: delegate_to_agent</h2>
          </div>
          <p className="text-foreground-tertiary text-sm mb-4">
            A tool está disponível automaticamente em todos os agentes. O modelo decide quando usá-la com base no system prompt e no contexto da conversa.
          </p>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-white/40 mb-2">Definição da tool:</p>
              <pre className="bg-black/60 border border-white/10 rounded-xl p-4 text-xs text-green-300 overflow-x-auto">{`{
  "name": "delegate_to_agent",
  "description": "Delega uma tarefa para outro agente especialista.",
  "parameters": {
    "type": "object",
    "properties": {
      "toAgentId": {
        "type": "string",
        "description": "ID do agente para delegar a tarefa"
      },
      "message": {
        "type": "string",
        "description": "A tarefa ou pergunta a ser delegada"
      }
    },
    "required": ["toAgentId", "message"]
  }
}`}</pre>
            </div>
            <div>
              <p className="text-xs text-white/40 mb-2">Como instruir o agente no System Prompt:</p>
              <pre className="bg-black/60 border border-white/10 rounded-xl p-4 text-xs text-blue-300 overflow-x-auto whitespace-pre-wrap">{`Você é um assistente generalista. Quando precisar de análise jurídica,
delegate para o agente "AGENT_ID_JURIDICO". Para análise financeira,
delegate para "AGENT_ID_FINANCEIRO".

Sempre delegate tarefas especializadas para os agentes certos antes
de formular sua resposta final.`}</pre>
            </div>
          </div>
        </section>

        {/* Limitações */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <h2 className="text-xl font-bold text-white">Limitações e Segurança</h2>
          </div>
          <div className="space-y-4 text-foreground-tertiary text-sm">
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <p className="font-medium text-yellow-300 mb-2">Limite de 3 níveis de profundidade</p>
              <p className="text-white/60 text-xs">
                Para evitar loops infinitos, o sistema limita delegações a 3 níveis de aninhamento.
                Se um agente A delega para B, que delega para C, qualquer tentativa de C delegar
                será bloqueada e retornará um erro explicativo.
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-white/40 font-mono">
                <span className="text-green-400">A → B → C</span>
                <span className="text-white/20">→</span>
                <span className="text-red-400">Bloqueado (nível 4)</span>
              </div>
            </div>
            <div className="p-4 glass-card rounded-xl">
              <p className="font-medium text-white mb-2">Outras limitações importantes:</p>
              <ul className="space-y-1.5 text-xs text-foreground-tertiary">
                <li className="flex gap-2"><span className="text-yellow-400">→</span> O agente delegado deve pertencer ao mesmo usuário/workspace</li>
                <li className="flex gap-2"><span className="text-yellow-400">→</span> Agentes inativos não podem receber delegações</li>
                <li className="flex gap-2"><span className="text-yellow-400">→</span> A memória do agente delegado é carregada normalmente (se habilitada)</li>
                <li className="flex gap-2"><span className="text-yellow-400">→</span> Cada delegação conta como mensagens no consumo do plano</li>
                <li className="flex gap-2"><span className="text-yellow-400">→</span> Todas as delegações são registradas no banco (AgentDelegation)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Histórico */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-green-400" />
            <h2 className="text-xl font-bold text-white">Histórico de Delegações</h2>
          </div>
          <p className="text-foreground-tertiary text-sm mb-4">
            Todas as delegações são registradas e podem ser consultadas na página do agente ou via API.
          </p>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-white/40 mb-2">Ver histórico via UI:</p>
              <p className="text-foreground-tertiary text-sm">
                Acesse <Link href="/dashboard/agents" className="text-blue-400 hover:underline">Dashboard &rarr; Agentes</Link>, abra um agente e clique em <strong className="text-white">Delegações</strong>.
                Você verá as delegações enviadas (onde este agente delegou) e recebidas (onde este agente foi chamado).
              </p>
            </div>
            <div>
              <p className="text-xs text-white/40 mb-2">Via API:</p>
              <pre className="bg-black/60 border border-white/10 rounded-xl p-4 text-xs text-green-300 overflow-x-auto">{`GET /api/agents/:id/delegations?direction=both
Authorization: Bearer SEU_JWT_TOKEN

// direction: "sent" | "received" | "both"`}</pre>
            </div>
          </div>
        </section>

        {/* Casos de uso */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">Casos de Uso</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                title: 'Assistente Generalista + Especialistas',
                desc: 'Um agente principal atende qualquer pergunta e delega para especialistas (jurídico, financeiro, técnico) conforme necessário.',
              },
              {
                title: 'Pipeline de Análise',
                desc: 'Agente Coletor de dados delega para Analista, que delega para Escritor para gerar o relatório final.',
              },
              {
                title: 'Triagem de Suporte',
                desc: 'Agente de triagem categoriza o problema e delega para o agente de suporte técnico, financeiro ou comercial correto.',
              },
              {
                title: 'Tradução + Revisão',
                desc: 'Agente Tradutor recebe o texto, delega para Revisor de qualidade antes de retornar ao usuário.',
              },
            ].map((uc) => (
              <div key={uc.title} className="glass-card p-4 rounded-xl">
                <div className="font-medium text-white text-sm mb-2">{uc.title}</div>
                <div className="text-xs text-foreground-tertiary">{uc.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Navegação */}
        <div className="flex gap-4 pt-4 border-t border-white/10">
          <Link href="/docs/plugins" className="flex-1 glass-card p-4 rounded-xl hover:border-blue-500/30 transition-colors group">
            <div className="text-xs text-foreground-tertiary mb-1">Anterior</div>
            <div className="font-medium text-white group-hover:text-blue-400 transition-colors text-sm flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Plugins
            </div>
          </Link>
          <Link href="/docs" className="flex-1 glass-card p-4 rounded-xl hover:border-blue-500/30 transition-colors group text-right">
            <div className="text-xs text-foreground-tertiary mb-1">Ver tudo</div>
            <div className="font-medium text-white group-hover:text-blue-400 transition-colors text-sm flex items-center justify-end gap-1">
              API Reference <ArrowRight className="w-3 h-3" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
