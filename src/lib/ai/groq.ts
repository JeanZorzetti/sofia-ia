import Groq from 'groq-sdk'
import { withClaudeTokenFailover, isClaudeRateLimit } from '@/lib/ai/claude-token-pool'
// type-only: Teams V2 (S1.1) per-member capability policy. A pure type import — no
// runtime dependency on the orchestration layer (team-types.ts has none of its own).
import type { CapabilityPolicy } from '@/lib/orchestration/team/team-types'
// Teams V2 (S1.2): pure helpers that resolve the per-member tool gate + scope the tool
// defs by policy. Extracted so the decision is unit-testable without DB/network.
import { modelSupportsTools, resolveToolGate, selectApiTools } from '@/lib/ai/model-capabilities'
// Teams V2.1 (S3.1): pure concat of a member's per-team `workflow` onto the system
// prompt. Absent/empty → prompt unchanged (regression). Testable without DB/network.
import { appendMemberWorkflow } from '@/lib/orchestration/team/member-workflow'
import { appendTeamSystemPrompt } from '@/lib/orchestration/team/team-system-prompt'
// Teams V2.2 (S2.2): translate the member's effort to the value OpenRouter accepts
// (low/medium/high — xhigh/max clamp to high). Pure; the CLI path keeps the raw tier.
import { openRouterReasoningEffort } from '@/lib/ai/model-efforts'

let _groq: Groq | null = null

export function getGroqClient(): Groq {
  if (!_groq) {
    _groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })
  }
  return _groq
}

const DEFAULT_SYSTEM_PROMPT = `Você é Polaris IA, uma assistente de IA inteligente e versátil.

Seu objetivo é ajudar de forma empática e profissional. Você deve:

1. **Cumprimentar** o usuário de forma calorosa e profissional
2. **Identificar necessidades**: entender o que o usuário precisa
3. **Qualificar o contato**: avaliar urgência e prioridade
4. **Oferecer valor**: destacar soluções e enviar informações relevantes
5. **Direcionar ação**: quando apropriado, sugerir próximos passos

Regras:
- Sempre responda em português brasileiro
- Seja empática e nunca agressiva
- Faça no máximo 2 perguntas por mensagem
- Use linguagem profissional mas acessível
- Nunca invente dados
- Se não souber algo, diga que vai verificar com a equipe
- Mantenha respostas concisas (máximo 3 parágrafos)`

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface LeadContext {
  nome?: string
  interesse?: string
  regiao?: string
  segmento?: string
  valorMin?: number
  valorMax?: number
  score?: number
}

/**
 * Parse markdown code blocks with filepath: prefix from model response.
 * Supports formats like:
 *   ```filepath:src/app/api/route.ts  
 *   ```typescript filepath:src/app/api/route.ts
 *   ```ts filepath:src/app/api/route.ts
 */
function parseCodeBlocksFromResponse(content: string): { path: string; content: string }[] {
  const blocks: { path: string; content: string }[] = []

  // Match ```[optional_lang] filepath:path\n...content...\n```
  const regex = /```(?:[a-zA-Z]*\s+)?filepath:([^\n]+)\n([\s\S]*?)```/g
  let match

  while ((match = regex.exec(content)) !== null) {
    const filePath = match[1].trim()
    const fileContent = match[2].trimEnd()

    if (filePath && fileContent && fileContent.length > 10) {
      blocks.push({ path: filePath, content: fileContent })
    }
  }

  return blocks
}
export async function chatWithPolaris(
  messages: ChatMessage[],
  leadContext?: LeadContext,
  customPrompt?: string
) {
  let systemPrompt = customPrompt || DEFAULT_SYSTEM_PROMPT

  if (leadContext) {
    systemPrompt += `\n\nContexto do lead:
- Nome: ${leadContext.nome || 'Não informado'}
- Interesse: ${leadContext.interesse || 'Não informado'}
- Região: ${leadContext.regiao || 'Não informada'}
- Segmento: ${leadContext.segmento || 'Não informado'}
- Faixa de preço: ${leadContext.valorMin ? `R$ ${leadContext.valorMin}` : '?'} a ${leadContext.valorMax ? `R$ ${leadContext.valorMax}` : '?'}
- Score de qualificação: ${leadContext.score ?? 'Não calculado'}/100`
  }

  const completion = await getGroqClient().chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    temperature: 0.7,
    max_tokens: 1024,
  })

  return {
    content: completion.choices[0]?.message?.content || '',
    model: completion.model,
    usage: completion.usage,
  }
}

export async function chatWithAgent(
  agentId: string,
  messages: ChatMessage[],
  leadContext?: Record<string, any>,
  options?: { useVectorSearch?: boolean; model?: string | null; effort?: string | null; rawText?: boolean; capabilities?: CapabilityPolicy | null; workflow?: string | null; teamSystemPrompt?: string | null; attachmentDir?: string | null; claudeCliCwd?: string | null }
) {
  const { prisma } = await import('@/lib/prisma')

  // S1.1 (Teams V2 — Tema A): a team member may carry a capability policy that scopes
  // *which* tools it can execute. This slice only PLUMBS it end-to-end (member →
  // ChatOptions → here); reading it is intentionally INERT so a member without a
  // policy keeps the exact legacy behavior. S1.2 re-wires the `toolsEnabled` gate
  // (groq.ts) to honor `tools`/`mcpAllowlist`/`toolSkills`/`filesystem`.
  const capabilityPolicy: CapabilityPolicy | null = options?.capabilities ?? null
  if (capabilityPolicy && process.env.DEBUG_TEAM_CAPABILITIES === '1') {
    console.log(`[chatWithAgent] capability policy received for agent ${agentId} (S1.1 — not yet enforced):`, capabilityPolicy)
  }

  // Buscar agente do banco
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { channels: true }
  })

  if (!agent) {
    throw new Error('Agent not found')
  }

  // Per-call overrides (Polaris Teams sets model/effort per member). Mutating the
  // in-memory agent record makes every downstream provider branch (Claude CLI,
  // Opencode, OpenRouter, Groq) honor the chosen model without touching each one.
  if (options?.model) {
    agent.model = options.model
  }
  // `effort` maps to reasoning_effort on reasoning-capable models (applied on the
  // OpenRouter path below); ignored by providers that don't support it.
  const reasoningEffort = options?.effort || null
  // S6: per-run image attachment dir → Claude CLI `--add-dir` (vision). Null on runs
  // without attachments (command byte-identical to legacy); ignored by non-CLI providers.
  const attachmentDir = options?.attachmentDir || null

  // Construir prompt do sistema
  let systemPrompt = agent.systemPrompt

  // S3 (Teams V2.2 — item 3): a TEAM may carry a shared system prompt (culture /
  // guard-rails / tone) applied to EVERY member, injected by the run caller
  // (start-team-run.ts) via options. It sits BETWEEN the Agent's own prompt and the
  // per-member workflow (agente → time → workflow), so the team is common culture and
  // the workflow (most specific) colors last. Absent/empty → unchanged (legacy).
  systemPrompt = appendTeamSystemPrompt(systemPrompt, options?.teamSystemPrompt)

  // S3.1 (Teams V2.1 — Tema F1): concatenate the member's per-team `workflow` right
  // after the Agent's own prompt, so the team-scoped instruction colors every later
  // augmentation (memory/lead/plugins/skills/knowledge). Absent/empty workflow →
  // appendMemberWorkflow returns systemPrompt unchanged (byte-identical to legacy).
  systemPrompt = appendMemberWorkflow(systemPrompt, options?.workflow)

  // Injetar memória do agente se memoryEnabled (busca userId do contexto do lead ou da primeira mensagem)
  if ((agent as any).memoryEnabled) {
    const userId = leadContext?.userId || leadContext?.leadId || null
    if (userId) {
      try {
        const { buildMemorySystemPromptBlock } = await import('@/lib/tools/memory')
        const memoryBlock = await buildMemorySystemPromptBlock(agentId, userId)
        if (memoryBlock) {
          systemPrompt = memoryBlock + systemPrompt
        }
      } catch {
        // Silently skip memory injection on error
      }
    }
  }

  if (leadContext && agent.model !== 'claude-code-cli') {
    systemPrompt += `\n\nContexto do lead:
- Nome: ${leadContext.leadName || 'Não informado'}
- Telefone: ${leadContext.leadPhone || 'Não informado'}
- Status: ${leadContext.leadStatus || 'Não informado'}`
  }

  // ── Injetar plugins habilitados no system prompt ───────────
  try {
    const enabledPlugins = await prisma.agentPlugin.findMany({
      where: { agentId, enabled: true },
      select: { name: true, description: true, inputSchema: true },
    })
    if (enabledPlugins.length > 0) {
      const pluginList = enabledPlugins
        .map(p => `- **${p.name}**: ${p.description || 'Plugin customizado'}. Input schema: ${p.inputSchema}`)
        .join('\n')
      systemPrompt += `\n\n## Plugins Disponíveis\nVocê tem acesso aos seguintes plugins customizados (use a tool run_plugin para executá-los):\n${pluginList}`
    }
  } catch {
    // Silently skip plugin injection on error
  }

  // === SKILLS INJECTION ===
  let agentSkills: any[] = []
  let agentMcpServers: any[] = []
  try {
    agentSkills = await prisma.agentSkill.findMany({
      where: { agentId, enabled: true },
      include: { skill: true },
    })

    // Prompt skills — inject into system prompt
    const promptSkills = agentSkills.filter((as: typeof agentSkills[0]) => (as.skill as any).type === 'prompt')
    for (const { skill } of promptSkills) {
      if ((skill as any).promptBlock) {
        systemPrompt += `\n\n${(skill as any).promptBlock}`
      }
    }
  } catch {
    // Silently skip skills injection on error
  }

  // === MCP INJECTION ===
  try {
    agentMcpServers = await prisma.agentMcpServer.findMany({
      where: { agentId, enabled: true },
      include: { mcpServer: { include: { tools: true } } },
    })
  } catch {
    // Silently skip MCP injection on error
  }

  // ── Protocolo de delegação em modo conversa (Fase 3 — Teams) ──────────────
  // Injetado SÓ quando o caller (answerConversationWithTeam) passa o roster do
  // time. A delegação é por TEXTO (provider-agnostic): o líder emite uma linha
  // `DELEGATE: <agentId> | <msg>` que o orquestrador parseia/executa, escopada ao
  // roster. Funciona em qualquer provider — inclusive a rota Claude CLI one-shot,
  // que não suporta function-calling nativo. (O antigo bloco prometia uma tool
  // `delegate_to_agent` que nunca foi registrada em nenhum branch — removido.)
  const teamDelegation = leadContext?.teamDelegation as
    | { roster: Array<{ agentId: string; name: string; role: string; description?: string }>; depth: number }
    | undefined
  if (teamDelegation && teamDelegation.roster.length > 0 && teamDelegation.depth < 3) {
    const rosterList = teamDelegation.roster
      .map(m => `- ${m.name} (${m.role}) — id: ${m.agentId}${m.description ? `: ${m.description}` : ''}`)
      .join('\n')
    systemPrompt += `\n\n## Time de especialistas (delegação interna)
Você é o LÍDER deste atendimento e pode consultar especialistas do seu time ANTES de responder ao cliente. Especialistas disponíveis:
${rosterList}

Para consultar um especialista, escreva em uma linha isolada, exatamente neste formato:
DELEGATE: <agentId> | <pergunta objetiva ao especialista>
Regras:
- Use SOMENTE os IDs listados acima. Pode emitir várias linhas DELEGATE (uma por especialista).
- As respostas dos especialistas voltarão para você e então você escreve a resposta final ao cliente.
- NUNCA mostre a linha DELEGATE, os IDs ou a existência do time ao cliente — é interno.
- Se você já consegue responder bem sozinho, responda direto, sem delegar.`
  }

  // Buscar contexto da knowledge base se o agente tiver uma associada
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
  if (lastUserMessage && agent.knowledgeBaseId) {
    // Tenta usar o novo sistema de embeddings vetoriais primeiro
    let knowledgeContext = ''

    if (options?.useVectorSearch !== false) {
      try {
        const { getKnowledgeContextV2 } = await import('@/lib/knowledge-context-v2')
        knowledgeContext = await getKnowledgeContextV2(agentId, lastUserMessage.content, {
          topK: 3,
          threshold: 0.7,
          useHybridSearch: true,
          vectorWeight: 0.7,
        })
      } catch (vectorError) {
        console.warn('Vector search failed, falling back to legacy search:', vectorError)
      }
    }

    // Fallback para sistema legado se vetorial falhar
    if (!knowledgeContext) {
      const { getKnowledgeContext } = await import('@/lib/knowledge-context')
      knowledgeContext = await getKnowledgeContext(agentId, lastUserMessage.content)
    }

    if (knowledgeContext) {
      systemPrompt += knowledgeContext
      systemPrompt += `\n\nIMPORTANTE: Use o contexto acima para responder de forma mais precisa e informada. Se a informação estiver no contexto, use-a. Se não estiver, responda com base no seu conhecimento geral.`
    }
  }

  // Guardrail removed: User wants full control over the system prompt.
  // The global rules (scheduling, prices, etc) should be part of the Agent's specific prompt if needed, not hardcoded here.


  // Check if model is Claude — route through local CLI
  if (agent.model.startsWith('claude-')) {
    // Map model ID to the actual Claude CLI model name (shared with the in-sandbox
    // path). 'claude-code-cli' → undefined → CLI default (no --model flag).
    const { resolveClaudeCliModel } = await import('@/lib/ai/claude-models');
    const cliModelId = resolveClaudeCliModel(agent.model);
    try {
      const { ClaudeCliService } = await import('@/services/claude-cli-service');

      // Capture working directory from config, defaulting to process.cwd().
      // 003 follow-up: a co-located NON-worker turn (vps-local) passes the run dir via
      // `claudeCliCwd` so lead/reviewer run IN the real repo (not /app). When set, FORCE
      // read-only (chat-run posture: a `{}` policy already demotes the CLI to Read/Grep +
      // `--permission-mode plan`, blocking Write/Edit/Bash) so the review never taints the
      // worker's diff. Unset → legacy cwd + the member's own (possibly null) policy.
      const claudeCliCwd = options?.claudeCliCwd || null;
      const workingDirectory = claudeCliCwd || (agent.config as any)?.workingDirectory || process.cwd();
      const cliCapabilities = claudeCliCwd ? (capabilityPolicy ?? {}) : capabilityPolicy;

      // Build the full prompt including system prompt and history
      // Since CLI is one-shot with -p, we need to pass context.
      // MVP Decision: Pass the User's Message + System Prompt Instructions.

      // The CLI is one-shot (`--print`), so there's no multi-turn session: fold the
      // whole conversation history into the prompt, otherwise the lead loses context
      // (this matters in WhatsApp/Team conversation mode — Fase 3). System prompt is
      // still passed separately via --system-prompt-file.
      const history = messages.filter(m => m.role !== 'system');
      let cliPrompt: string;
      if (history.length <= 1) {
        cliPrompt = history[history.length - 1]?.content ?? '';
      } else {
        const transcript = history
          .map(m => `${m.role === 'user' ? 'Cliente' : 'Você'}: ${m.content}`)
          .join('\n');
        cliPrompt = `Histórico da conversa até agora:\n${transcript}\n\nResponda à última mensagem do Cliente.`;
      }

      // S1.3 (Teams V2.1 — Tema A'): forward the member capability policy + its agent's
      // MCP servers so a policy-carrying member runs read-only on the host FS (no Write/
      // Bash) and honors mcpAllowlist. Built from the already-loaded `agentMcpServers`;
      // no policy → descriptors unused (generate emits the legacy command verbatim).
      const { toCliMcpDescriptor } = await import('@/lib/ai/cli-tool-flags');
      const cliMcpServers = (agentMcpServers ?? []).map((ams: typeof agentMcpServers[0]) => toCliMcpDescriptor({
        amsId: ams.id,
        name: ams.mcpServer.name,
        url: ams.mcpServer.url,
        transport: ams.mcpServer.transport,
        headers: (ams.mcpServer.headers as Record<string, unknown>) ?? null,
      }));

      // We now pass system prompt separately to handle large prompts via file.
      // Token-pool failover: if a subscription hits its limit, retry the SAME call
      // with the next available account. Pool empty → one ambient attempt (back-compat).
      const response = await withClaudeTokenFailover(
        (token) => ClaudeCliService.generate(
          cliPrompt,
          workingDirectory,
          systemPrompt,
          cliModelId || undefined,  // Pass model ID (undefined = CLI default)
          token,
          { capabilities: cliCapabilities, mcpServers: cliMcpServers },
          reasoningEffort,  // S2.2: per-member effort → CLI --effort flag (null = no flag)
          attachmentDir,    // S6: per-run image dir → CLI --add-dir flag (null = no flag)
        ),
        { isLimited: (e) => isClaudeRateLimit(String((e as Error)?.message ?? e)) },
      );

      return {
        message: response.content,
        model: agent.model,
        usage: response.usage,
        confidence: 1.0
      };
    } catch (error) {
      console.error('Claude CLI error:', error);
      return {
        message: `Erro na execução do Claude CLI: ${error instanceof Error ? error.message : 'Desconhecido'}`,
        model: agent.model,
        usage: { total_tokens: 0 },
        confidence: 0,
      }
    }
  }

  // Check if model is Opencode CLI (e.g. opencode-gemini-2.5-pro, opencode-gpt-4o)
  if (agent.model.startsWith('opencode-')) {
    // Map Polaris IA model IDs to opencode provider/model format
    const opencodeModelMap: Record<string, string> = {
      'opencode-gemini-2.5-pro': 'google/gemini-2.5-pro',
      'opencode-gemini-2.5-flash': 'google/gemini-2.5-flash',
      'opencode-gpt-4o': 'openai/gpt-4o',
      'opencode-gpt-4.1': 'openai/gpt-4.1',
      'opencode-claude-sonnet-4': 'anthropic/claude-sonnet-4-20250514',
      'opencode-claude-sonnet-4-5': 'anthropic/claude-sonnet-4-5',
      'opencode-claude-opus-4': 'anthropic/claude-opus-4',
    }
    const opencodeModelId = opencodeModelMap[agent.model] ?? agent.model.replace('opencode-', '');

    try {
      const { OpencodeCliService } = await import('@/services/opencode-cli-service');

      const workingDirectory = (agent.config as any)?.workingDirectory || process.cwd();
      const lastMessage = messages[messages.length - 1];

      const response = await OpencodeCliService.generate(
        lastMessage.content,
        workingDirectory,
        systemPrompt,
        opencodeModelId
      );

      return {
        message: response.content,
        model: agent.model,
        usage: response.usage,
        confidence: 1.0
      };
    } catch (error) {
      console.error('Opencode CLI error:', error);
      return {
        message: `Erro na execução do Opencode CLI: ${error instanceof Error ? error.message : 'Desconhecido'}`,
        model: agent.model,
        usage: { total_tokens: 0 },
        confidence: 0,
      }
    }
  }

  // Check if model is Ollama (e.g. ollama/qwen2.5:7b-instruct) — route to the
  // self-hosted OpenAI-compatible endpoint. MUST come before the '/' OpenRouter
  // check below (ollama ids contain '/').
  if (agent.model.startsWith('ollama/')) {
    const { getOllamaClient } = await import('@/lib/ai/ollama')
    const ollamaModel = agent.model.slice('ollama/'.length)

    // ── Ollama com tools por política de capacidade (Teams V2.1 — S1.2, Tema A') ──
    // Mesmo gate (resolveToolGate) + filtragem (selectApiTools) + dispatch
    // (executeAgentToolCall) dos paths Groq/OpenRouter, agora no endpoint Ollama
    // (OpenAI-compatible). Sem política / modelo sem suporte / rawText → cai na completion
    // plana abaixo (byte-idêntica ao legado). rawText (code-runs que parseiam @RUN/@DONE do
    // texto) força gate off via resolveToolGate. modelSupportsTools recebe o id COMPLETO
    // (com `ollama/`); o create usa o id bare (ollamaModel). Best-effort: se o endpoint não
    // devolver tool_calls, o loop encerra em texto.
    const isCoderModel = agent.model.includes('coder') || agent.model.includes('qwen')
    const ollamaToolsEnabled = resolveToolGate({
      capabilities: capabilityPolicy,
      isCoderModel,
      rawText: !!options?.rawText,
      modelSupportsTools: modelSupportsTools(agent.model),
    })

    if (ollamaToolsEnabled) {
      const { readOnlyToolDefinitions } = await import('@/lib/tools/filesystem')
      const { buildAgentToolDefs, executeAgentToolCall } = await import('@/lib/ai/agent-tools')
      const { toolSkillDefinitions, mcpDefsTagged } = buildAgentToolDefs({ agentSkills, agentMcpServers })

      // Same policy scoping as the Groq/OpenRouter paths. Empty selection → no `tools` sent.
      const selectedTools = selectApiTools({
        capabilities: capabilityPolicy,
        readOnlyDefs: readOnlyToolDefinitions,
        toolSkillDefs: toolSkillDefinitions,
        mcpDefs: mcpDefsTagged,
      })
      const apiTools = selectedTools.length > 0 ? selectedTools : undefined

      if (apiTools) {
        const toolSystemPrompt = `${systemPrompt}\n\nVocê tem acesso a ferramentas (via function calling): use-as para explorar arquivos (list_files, read_file), executar skills e servidores MCP habilitados, e então responda em texto.`
        const loopMessages: any[] = [{ role: 'system', content: toolSystemPrompt }, ...messages]
        const MAX_OLLAMA_TOOL_LOOPS = 8
        let finalMessage = ''
        let finalUsage: any = { total_tokens: 0 }

        for (let i = 0; i < MAX_OLLAMA_TOOL_LOOPS; i++) {
          const toolCompletion = await getOllamaClient().chat.completions.create({
            model: ollamaModel,
            messages: loopMessages,
            tools: apiTools as any,
            tool_choice: 'auto',
            temperature: agent.temperature,
            max_tokens: 4096,
          })

          const responseMsg = toolCompletion.choices[0]?.message
          const toolCalls = responseMsg?.tool_calls
          finalUsage = toolCompletion.usage || finalUsage

          console.log(`[Ollama ${ollamaModel}] Tool loop ${i + 1}/${MAX_OLLAMA_TOOL_LOOPS} content_len=${(responseMsg?.content || '').length} tool_calls=${toolCalls?.length || 0}`)

          if (toolCalls && toolCalls.length > 0) {
            loopMessages.push(responseMsg as any)
            for (const tc of toolCalls as any[]) {
              let fnArgs: any
              try {
                fnArgs = JSON.parse(tc.function.arguments)
              } catch {
                loopMessages.push({ role: 'tool', tool_call_id: tc.id, content: 'Erro: argumentos JSON inválidos.' })
                continue
              }
              const toolResult = await executeAgentToolCall({
                fnName: tc.function.name,
                fnArgs,
                agentMcpServers,
                agentSkills,
                toolSkillDefinitions,
              })
              loopMessages.push({ role: 'tool', tool_call_id: tc.id, content: toolResult })
            }
            continue
          }

          finalMessage = responseMsg?.content || ''
          break
        }

        return {
          message: finalMessage || 'O agente executou ações mas não gerou uma resposta textual.',
          model: agent.model,
          usage: finalUsage,
          confidence: 0.9,
        }
      }
    }

    // ── Ollama padrão (completion plana — gate off / sem tools / rawText) ──
    // Byte-idêntica ao legado: o code-team parseia @RUN/@DONE do texto, sem tool-calling.
    const completion = await getOllamaClient().chat.completions.create({
      model: ollamaModel,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: agent.temperature,
      max_tokens: 4096,
    })
    return {
      message: completion.choices[0]?.message?.content || '',
      model: agent.model,
      usage: completion.usage,
      confidence: 0.85,
    }
  }

  // Check if model is OpenRouter (e.g. arcee-ai/trinity or deepseek/deepseek-r1)
  // Heuristic: models with '/' (vendor/model) are treated as OpenRouter, unless specific exceptions exist.
  if (agent.model.includes('/')) {
    try {
      const { getOpenRouterClient } = await import('@/lib/openrouter')

      // Tool gate (Teams V2 — S1.2). The legacy gate enabled tools only for coder models;
      // now a per-member capability policy can enable them on any tool-capable model (or
      // disable them entirely). PRESERVED: rawText (code-runs) still forces a plain
      // completion — the code-team executes in the sandbox via @RUN, so provider-side FS
      // tools / code-block writes would be wrong. A member WITHOUT a policy → legacy gate.
      const isCoderModel = agent.model.includes('coder') || agent.model.includes('qwen')
      const toolsEnabled = resolveToolGate({
        capabilities: capabilityPolicy,
        isCoderModel,
        rawText: !!options?.rawText,
        modelSupportsTools: modelSupportsTools(agent.model),
      })

      // HYBRID APPROACH: read-only native tools + code via markdown blocks in text
      let currentSystemPrompt = systemPrompt
      if (toolsEnabled) {
        currentSystemPrompt += `\n\nVocê tem acesso a ferramentas de sistema de arquivos para explorar o projeto.

FERRAMENTAS DISPONÍVEIS (via function calling):
- list_files: listar arquivos/pastas de um diretório
- read_file: ler o conteúdo de um arquivo

FLUXO DE TRABALHO:
1. Use list_files para entender a estrutura (máximo 2-3x)
2. Use read_file para ler arquivos relevantes
3. Para CRIAR ou MODIFICAR arquivos, escreva o código na sua RESPOSTA usando blocos de código com o caminho do arquivo:

\`\`\`filepath:src/app/api/example/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ ok: true });
}
\`\`\`

REGRAS PARA ESCREVER CÓDIGO:
- Use \`\`\`filepath:caminho/do/arquivo.ts para indicar o arquivo
- Escreva o CÓDIGO COMPLETO do arquivo, não resumos
- Inclua TODOS os imports, funções, e exports
- Você pode escrever múltiplos arquivos usando múltiplos blocos
- Após os blocos de código, adicione um resumo do que foi implementado`
      }

      // Build native OpenAI tools array (READ-ONLY: list_files, read_file only)
      // write_file is NOT included — code is extracted from markdown blocks to avoid garbled args
      const { readOnlyToolDefinitions, filesystemTools } = await import('@/lib/tools/filesystem')

      // S1.1: tool defs (tool-skills + tagged MCP) are now built by the shared helper,
      // which the Groq-native path also uses. Same shape as the former inline build.
      const { buildAgentToolDefs } = await import('@/lib/ai/agent-tools')
      const { toolSkillDefinitions, mcpDefsTagged } = buildAgentToolDefs({ agentSkills, agentMcpServers })

      // S1.2: scope the tool defs by the member's capability policy. A member WITHOUT a
      // policy yields the legacy `[...readOnly, ...toolSkills, ...mcp]` array verbatim.
      // An empty selection (everything scoped out) → no `tools` sent (undefined).
      const selectedTools = toolsEnabled
        ? selectApiTools({
            capabilities: capabilityPolicy,
            readOnlyDefs: readOnlyToolDefinitions,
            toolSkillDefs: toolSkillDefinitions,
            mcpDefs: mcpDefsTagged,
          })
        : []
      const apiTools = selectedTools.length > 0 ? selectedTools : undefined

      // ReAct Loop with hybrid approach
      let loopCount = 0
      const MAX_LOOPS = toolsEnabled ? 15 : 5
      let currentMessages: any[] = [{ role: 'system', content: currentSystemPrompt }, ...messages]
      let finalContent = ''
      let finalUsage: any = { input_tokens: 0, output_tokens: 0 }

      while (loopCount < MAX_LOOPS) {
        const completion = await getOpenRouterClient().chat.completions.create({
          model: agent.model,
          messages: currentMessages,
          temperature: agent.temperature,
          max_tokens: 8192,
          ...(apiTools ? { tools: apiTools } : {}),
          // S2.2: clamp xhigh/max → high (the cast hid that OpenRouter only takes 3 tiers);
          // null/unknown → no key (byte-identical to legacy).
          ...((() => { const e = openRouterReasoningEffort(reasoningEffort); return e ? { reasoning_effort: e } : {} })()),
        })

        const responseMessage = completion.choices[0]?.message
        const rawContent = responseMessage?.content || ''
        const reasoning = (responseMessage as any)?.reasoning || (responseMessage as any)?.reasoning_content || ''
        const toolCalls = responseMessage?.tool_calls

        console.log(`[OpenRouter ${agent.model}] Loop ${loopCount + 1}/${MAX_LOOPS} content_len=${rawContent.length} reasoning_len=${reasoning.length} tool_calls=${toolCalls?.length || 0}`)

        // PHASE 1: NATIVE FUNCTION CALLING (read-only: list_files, read_file)
        if (toolCalls && toolCalls.length > 0 && toolsEnabled) {
          currentMessages.push(responseMessage)

          for (const toolCall of toolCalls as any[]) {
            const fnName = toolCall.function.name
            let fnArgs: any
            try {
              fnArgs = JSON.parse(toolCall.function.arguments)
            } catch (e) {
              console.error(`[Agent Tool] Failed to parse args for ${fnName}:`, toolCall.function.arguments)
              currentMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: `Erro: argumentos JSON inválidos.`,
              })
              continue
            }

            console.log(`[Agent Tool] Loop ${loopCount + 1}: ${fnName}`, fnArgs)

            // S1.1: dispatch (MCP → tool-skill → filesystem) is now the shared helper,
            // also used by the Groq-native path. Logic is byte-faithful to the former inline.
            const { executeAgentToolCall } = await import('@/lib/ai/agent-tools')
            const toolResult = await executeAgentToolCall({
              fnName,
              fnArgs,
              agentMcpServers,
              agentSkills,
              toolSkillDefinitions,
            })

            currentMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: toolResult,
            })
          }

          // Nudge toward writing code at loop 8
          if (loopCount === 8) {
            currentMessages.push({
              role: 'user',
              content: 'AVISO: Restam poucas iterações. Agora escreva o código usando blocos ```filepath:caminho/arquivo.ts na sua resposta.',
            })
          }

          loopCount++
          continue
        }

        // PHASE 2: TEXT RESPONSE — parse markdown code blocks for file writes
        const content = rawContent || reasoning

        if (content && toolsEnabled) {
          const fileBlocks = parseCodeBlocksFromResponse(content)

          if (fileBlocks.length > 0) {
            console.log(`[Agent CodeBlocks] Found ${fileBlocks.length} file(s) to write in response`)

            for (const block of fileBlocks) {
              console.log(`[Agent CodeBlocks] Writing: ${block.path} (${block.content.length} chars)`)
              try {
                const result = await filesystemTools.execute('write_file', {
                  path: block.path,
                  content: block.content,
                })
                console.log(`[Agent CodeBlocks] ${result}`)
              } catch (e) {
                console.error(`[Agent CodeBlocks] Failed to write ${block.path}:`, e)
              }
            }
          }
        }

        // FINAL ANSWER
        if (rawContent && reasoning) {
          finalContent = `_*Pensamento:*\n${reasoning}_\n\n---\n\n${rawContent}`
        } else {
          finalContent = content || 'Modelo retornou resposta vazia.'
        }
        finalUsage = completion.usage || finalUsage
        break
      }

      // If the model exhausted MAX_LOOPS, force a final answer
      if (!finalContent && loopCount >= MAX_LOOPS) {
        console.log(`[OpenRouter ${agent.model}] Exhausted ${MAX_LOOPS} tool loops. Forcing final answer.`)
        currentMessages.push({
          role: 'user',
          content: 'ATENÇÃO: Limite de ferramentas atingido. Forneça sua resposta final em texto agora. NÃO use mais ferramentas.',
        })

        try {
          const finalCompletion = await getOpenRouterClient().chat.completions.create({
            model: agent.model,
            messages: currentMessages,
            temperature: agent.temperature,
            max_tokens: 8192,
          })
          const finalMsg = finalCompletion.choices[0]?.message
          finalContent = finalMsg?.content || (finalMsg as any)?.reasoning || (finalMsg as any)?.reasoning_content || ''
          finalUsage = finalCompletion.usage || finalUsage
          console.log(`[OpenRouter ${agent.model}] Forced final answer: content_len=${finalContent.length}`)
        } catch (e) {
          console.error(`[OpenRouter ${agent.model}] Failed to get forced final answer:`, e)
        }
      }

      return {
        message: finalContent || 'O agente executou ações mas não gerou uma resposta textual.',
        model: agent.model,
        usage: finalUsage,
        confidence: 0.9,
      }
    } catch (error) {
      console.error('OpenRouter generation error:', error)
      // Code-runs (rawText) must FAIL on provider errors, not "succeed" with the
      // error text as the deliverable — let the coordinator mark rate_limited/failed
      // (e.g. a 429 from a free model) instead of a false "completed" with no work.
      if (options?.rawText) throw error
      return {
        message: `Erro ao gerar resposta com OpenRouter: ${error instanceof Error ? error.message : 'Desconhecido'}. Verifique a chave API.`,
        model: agent.model,
        usage: { total_tokens: 0 },
        confidence: 0,
      }
    }
  }

  // ── Groq com Calendar Tools (function calling) ──────────────────────────────
  const agentConfig = (agent.config || {}) as Record<string, unknown>
  const calendarEnabled = !!agentConfig.calendarEnabled
  const calendarUserId = agentConfig.calendarUserId as string | undefined

  if (calendarEnabled && calendarUserId) {
    const { calendarToolDefinitions, executeCalendarTool } = await import('@/lib/ai/calendar-tools')
    const remoteJid = leadContext?.leadPhone ? `${String(leadContext.leadPhone)}@s.whatsapp.net` : undefined

    let loopMessages: Array<Record<string, unknown>> = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ]
    const MAX_TOOL_LOOPS = 6

    for (let i = 0; i < MAX_TOOL_LOOPS; i++) {
      const completion = await getGroqClient().chat.completions.create({
        model: agent.model,
        messages: loopMessages as any,
        tools: calendarToolDefinitions as unknown as any[],
        tool_choice: 'auto',
        temperature: agent.temperature,
        max_tokens: 1024,
      })

      const responseMsg = completion.choices[0]?.message
      const toolCalls = responseMsg?.tool_calls

      if (toolCalls && toolCalls.length > 0) {
        loopMessages.push(responseMsg as any)

        for (const tc of toolCalls) {
          let fnArgs: Record<string, string>
          try {
            fnArgs = JSON.parse(tc.function.arguments)
          } catch {
            fnArgs = {}
          }

          console.log(`[CalendarTool] ${tc.function.name}`, fnArgs)
          const result = await executeCalendarTool(tc.function.name, fnArgs, calendarUserId, remoteJid)

          loopMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: result,
          })
        }
        continue
      }

      return {
        message: responseMsg?.content || '',
        model: completion.model,
        usage: completion.usage,
        confidence: 0.9,
      }
    }

    return {
      message: 'Desculpe, não consegui completar a operação no calendário. Tente novamente.',
      model: agent.model,
      usage: { total_tokens: 0 },
      confidence: 0.5,
    }
  }

  // ── Cognitive Pipeline (3-stage: Orchestrator → Optimizer → Synthesizer) ─────
  const cognitiveMode = !!agentConfig.cognitiveMode
  if (cognitiveMode) {
    try {
      const { runCognitivePipeline } = await import('@/lib/ai/cognitive-pipeline')
      // Extract knowledge context already injected into systemPrompt as a string block
      // Pass it separately so the orchestrator can reason about it independently
      const knowledgeContext = systemPrompt.includes('## Contexto da Base de Conhecimento')
        ? systemPrompt.split('## Contexto da Base de Conhecimento')[1]?.split('IMPORTANTE')[0]?.trim() ?? ''
        : ''
      return await runCognitivePipeline({
        agentModel: agent.model,
        systemPrompt,
        messages,
        leadContext: leadContext ?? {},
        knowledgeContext,
      })
    } catch (err) {
      console.error('[CognitivePipeline] Error, falling through to standard Groq:', err)
    }
  }

  // ── Groq com tools por política de capacidade (Teams V2.1 — S1.1, Tema A') ──
  // O V2 S1 entregou a política de capacidade por membro, mas a EXECUÇÃO de tools só
  // rodava no path OpenRouter. Aqui o path Groq nativo (OpenAI-compatible) honra o MESMO
  // gate (resolveToolGate) e a MESMA filtragem (selectApiTools), reusando o dispatch
  // compartilhado (executeAgentToolCall). Sem política / modelo sem suporte → cai na
  // completion plana abaixo (byte-idêntico ao legado). rawText (code-runs) força gate off.
  {
    const isCoderModel = agent.model.includes('coder') || agent.model.includes('qwen')
    const groqToolsEnabled = resolveToolGate({
      capabilities: capabilityPolicy,
      isCoderModel,
      rawText: !!options?.rawText,
      modelSupportsTools: modelSupportsTools(agent.model),
    })

    if (groqToolsEnabled) {
      const { readOnlyToolDefinitions } = await import('@/lib/tools/filesystem')
      const { buildAgentToolDefs, executeAgentToolCall } = await import('@/lib/ai/agent-tools')
      const { toolSkillDefinitions, mcpDefsTagged } = buildAgentToolDefs({ agentSkills, agentMcpServers })

      // Same policy scoping as the OpenRouter path. Empty selection → no `tools` sent.
      const selectedTools = selectApiTools({
        capabilities: capabilityPolicy,
        readOnlyDefs: readOnlyToolDefinitions,
        toolSkillDefs: toolSkillDefinitions,
        mcpDefs: mcpDefsTagged,
      })
      const apiTools = selectedTools.length > 0 ? selectedTools : undefined

      if (apiTools) {
        const toolSystemPrompt = `${systemPrompt}\n\nVocê tem acesso a ferramentas (via function calling): use-as para explorar arquivos (list_files, read_file), executar skills e servidores MCP habilitados, e então responda em texto.`
        const loopMessages: any[] = [{ role: 'system', content: toolSystemPrompt }, ...messages]
        const MAX_GROQ_TOOL_LOOPS = 8
        let finalMessage = ''
        let finalUsage: any = { total_tokens: 0 }

        for (let i = 0; i < MAX_GROQ_TOOL_LOOPS; i++) {
          const toolCompletion = await getGroqClient().chat.completions.create({
            model: agent.model,
            messages: loopMessages,
            tools: apiTools as any,
            tool_choice: 'auto',
            temperature: agent.temperature,
            max_tokens: 4096,
          })

          const responseMsg = toolCompletion.choices[0]?.message
          const toolCalls = responseMsg?.tool_calls
          finalUsage = toolCompletion.usage || finalUsage

          console.log(`[Groq ${agent.model}] Tool loop ${i + 1}/${MAX_GROQ_TOOL_LOOPS} content_len=${(responseMsg?.content || '').length} tool_calls=${toolCalls?.length || 0}`)

          if (toolCalls && toolCalls.length > 0) {
            loopMessages.push(responseMsg as any)
            for (const tc of toolCalls as any[]) {
              let fnArgs: any
              try {
                fnArgs = JSON.parse(tc.function.arguments)
              } catch {
                loopMessages.push({ role: 'tool', tool_call_id: tc.id, content: 'Erro: argumentos JSON inválidos.' })
                continue
              }
              const toolResult = await executeAgentToolCall({
                fnName: tc.function.name,
                fnArgs,
                agentMcpServers,
                agentSkills,
                toolSkillDefinitions,
              })
              loopMessages.push({ role: 'tool', tool_call_id: tc.id, content: toolResult })
            }
            continue
          }

          finalMessage = responseMsg?.content || ''
          break
        }

        return {
          message: finalMessage || 'O agente executou ações mas não gerou uma resposta textual.',
          model: agent.model,
          usage: finalUsage,
          confidence: 0.9,
        }
      }
    }
  }

  // ── Groq padrão (sem tools) ───────────────────────────────────────────────
  const completion = await getGroqClient().chat.completions.create({
    model: agent.model,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    temperature: agent.temperature,
    max_tokens: 1024,
  })

  const content = completion.choices[0]?.message?.content || ''

  return {
    message: content,
    model: completion.model,
    usage: completion.usage,
    confidence: 0.85,
  }
}
