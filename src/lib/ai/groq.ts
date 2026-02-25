import Groq from 'groq-sdk'

let _groq: Groq | null = null

export function getGroqClient(): Groq {
  if (!_groq) {
    _groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })
  }
  return _groq
}

const DEFAULT_SYSTEM_PROMPT = `Você é Sofia, uma assistente de IA inteligente e versátil.

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
export async function chatWithSofia(
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
  options?: { useVectorSearch?: boolean }
) {
  const { prisma } = await import('@/lib/prisma')

  // Buscar agente do banco
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { channels: true }
  })

  if (!agent) {
    throw new Error('Agent not found')
  }

  // Construir prompt do sistema
  let systemPrompt = agent.systemPrompt

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

  // ── Injetar tool delegate_to_agent no system prompt ───────
  const delegationDepth = leadContext?.delegationDepth ?? 0
  if (delegationDepth < 3) {
    systemPrompt += `\n\n## Delegação de Tarefas\nVocê pode delegar tarefas para outros agentes usando a tool delegate_to_agent(toAgentId, message). Profundidade atual: ${delegationDepth}/3.`
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
    // Map model ID to the actual Claude CLI model name
    // 'claude-code-cli' uses the CLI default model (no --model flag)
    const claudeModelMap: Record<string, string | undefined> = {
      'claude-code-cli': undefined,              // CLI default
      'claude-opus-4-6': 'claude-opus-4-6',
      'claude-sonnet-4-6': 'claude-sonnet-4-6',
      'claude-opus-4-5': 'claude-opus-4-5-20251101',
      'claude-sonnet-4-5-thinking': 'claude-sonnet-4-5-20250929',
      'claude-sonnet-4': 'claude-sonnet-4-20250514',
      'claude-haiku-4-5': 'claude-haiku-4-5-20251001',
      'claude-haiku-3-5': 'claude-3-5-haiku-20241022',
    }
    const cliModelId = claudeModelMap[agent.model] ?? agent.model;
    try {
      const { ClaudeCliService } = await import('@/services/claude-cli-service');

      // Capture working directory from config, defaulting to process.cwd()
      const workingDirectory = (agent.config as any)?.workingDirectory || process.cwd();

      // Build the full prompt including system prompt and history
      // Since CLI is one-shot with -p, we need to pass context.
      // MVP Decision: Pass the User's Message + System Prompt Instructions.

      const lastMessage = messages[messages.length - 1]; // Only user message for now

      // We now pass system prompt separately to handle large prompts via file
      const response = await ClaudeCliService.generate(
        lastMessage.content,
        workingDirectory,
        systemPrompt,
        cliModelId || undefined  // Pass model ID (undefined = CLI default)
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
    // Map Sofia model IDs to opencode provider/model format
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

  // Check if model is OpenRouter (e.g. arcee-ai/trinity or deepseek/deepseek-r1)
  // Heuristic: models with '/' (vendor/model) are treated as OpenRouter, unless specific exceptions exist.
  if (agent.model.includes('/')) {
    try {
      const { getOpenRouterClient } = await import('@/lib/openrouter')

      // Feature Flag: Enable Tools for Coder models (Qwen, DeepSeek Coder, etc)
      const isCoderModel = agent.model.includes('coder') || agent.model.includes('qwen')
      let toolsEnabled = isCoderModel

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
      const apiTools = toolsEnabled ? readOnlyToolDefinitions : undefined

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
            const result = await filesystemTools.execute(fnName, fnArgs)

            currentMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: typeof result === 'string' ? result : JSON.stringify(result),
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
      return {
        message: `Erro ao gerar resposta com OpenRouter: ${error instanceof Error ? error.message : 'Desconhecido'}. Verifique a chave API.`,
        model: agent.model,
        usage: { total_tokens: 0 },
        confidence: 0,
      }
    }
  }

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
